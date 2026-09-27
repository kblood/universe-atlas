# Review: `ForestSelectionCache` @ d0538c8

**Verdict:** I found no correctness defect in the selection itself. The cache reproduces the legacy selector's arithmetic step for step, so exact output equality holds by construction, not by coincidence. There is one worker-integration blocker. There is also one cap-headroom risk to fix before the canopy range grows.

## Verified correct (no action)

- **Normalization bound.** The Jacobian `1/(1+uÂ²+vÂ²)^1.5` confirms `cubeDirection` is gnomonic, so every face plane lies at distance â‰¥1 from the origin. Radial projection from there equals projection onto the unit ball, which is 1-Lipschitz. The half-diagonal `hypot((x1-x0)/n,(y1-y0)/n)` is correct in cube coordinates, including partial patches. I checked the rounding error: in `d2`, the 1e-14 slack gives margin â‰ˆ 2Â·angularÂ·1e-14, while the error is â‰ˆ angularÂ·1e-16. So a rejected patch cannot contain a cell the legacy selector would accept.
- **Bitwise identity.** These are all identical to the legacy selector:
  - centre expression `(ix+.5)*2/n-1` â†’ `cubeDirection`
  - `d2` operand order
  - `loX/hiX/loY/hiY` box and face skip
  - far-crown hash string (`key+'/far-crown'` â‰¡ `forestRepresentative`)
  - `distanceM` formula
  - sort comparator
  - object key order
- **Partial edges.** Offsets use a fixed stride of 8 with `x0/y0` decode. This is correct when `x1<x0+8`, and 63 fits in a Uint8.
- **Eviction and determinism.**
  - The eviction loop guarantees `sizeâ‰¤maxEntries` and `bytesâ‰¤maxBytes`.
  - Oversized entries are returned but not cached.
  - Evicting a patch mid-select is harmless because the local reference is kept.
  - Output is sorted, so LRU order cannot affect results.
- **Mutation isolation.** Every select allocates fresh objects and `direction` arrays, and the packed arrays are never exposed.
- **Key invalidation.** `[seed, radiusM, cellM]` is sufficient: `n` is per instance, and the version and projection are compile-time.

## Blocker

**1. The worker has no error path; a throw can stall canopy streaming permanently.**
- `select` now rejects inputs the legacy selector accepted:
  - `|direction|` off by more than 1e-10 (e.g. any float32-derived direction)
  - `nearRangeM > farRangeM` (e.g. a preset with `canopyFootprintM < forestFootprintM+100`)
- The constructor can also throw.
- `onmessage` has no try/catch, so no reply is ever posted. With a single request in flight, the main thread waits forever unless it handles `worker.onerror` and falls back. That handling isn't in the supplied sources, so it needs verifying.
- **Fix:**
  - Wrap the handler in try/catch and post `{requestId, error}`.
  - On error, have the main thread run the legacy selector for that request.
  - Keep the strict validation, but make it recoverable.
  - Don't silently renormalize: that would break equality with the fallback.

## Should fix (not blocking at current config)

**2. LRU scan cliff.**
- Every select scans the whole working set in the same order. If the working set ever exceeds the cap, LRU gives 0% hits, and every request pays full cold cost: about 1.4â€“1.6Ã— the old selector, forever.
- The cube corner already uses 19.9 MB of 25.2 MB (~79%).
- The working set scales with (farRange/cellM)Â², so any canopy-range increase or smaller cell size can cross the limit.
- **Fix options:**
  - Derive the cap from an estimated patch count (â‰¥1.5Ã— the corner working set).
  - Or bypass the cache when a select's `misses â‰¥ visited` repeatedly.
- Add a test that fails if the corner working set exceeds ~70% of the cap.

**3. Pin the Lipschitz assumption.**
- The rejection bound is only valid for the gnomonic `cubeDirection`. An equal-area or "spherified" cube change would silently drop edge cells, and the fallback-equality tests would still pass because they compare at only a few centres.
- **Fix:**
  - Add a comment at `cubeDirection`.
  - Add a fuzz test: random Earth-scale centres within ~1 km of seams and corners, with random near/far, compared against `forestPopulationCells`.

**4. Diagnostics semantics.** `hits/misses/visited` are per-query but `evictions` is cumulative. Reset or rename one of them so the browser telemetry isn't misread.

## Performance: tradeoff assessment

- **Cold slowdown.** Cold is +55â€“60% (+200â€“280 ms), but it runs in the worker, so it adds latency to the first working set, not frame hitches.
  - The legacy selector computes only 2 hashes (area, far-crown) for the ~93.5% of far cells that are non-representative.
  - `forestPatch` computes all 7 hashes and allocates a `PopulationCell` and `id` string for every candidate.
- **Warm/moving speedup.** Warm and moving selects are 12â€“20Ã— faster.
- **Crossover.** The newly exposed area fraction per request is â‰ˆ 2d/(Ï€R). The cache loses only when displacement per request is roughly 0.9Â·R â‰ˆ 4 km, which is effectively a teleport. **Net: a good trade for flight.**

To remove most of the cold penalty without changing output:

1. **Lazy jitter.**
   - For every candidate, store only the centre and the representative bit.
   - Fill the jitter doubles (x, y, presence, height, yaw) only when a cell is first emitted (representative or within near range).
   - This needs a split export from `planet-population.ts` (area test vs `cellAt`); the population is unchanged.
   - Expect cold â‰ˆ old, and roughly half the resident memory.
2. **FNV prefix reuse.** `hash` is streaming until the final mix, so the state for `seed/VERSION/id` can be computed once and continued for each suffix. The result is bitwise identical, and it speeds up both selectors.
3. **Cheaper patch building.** Iterate `ix/iy` directly instead of `id.split('/')`. Write values by index instead of `values.set([...spread])`. Skip `JSON.stringify` key construction on the cold path.
4. **Consider not storing the centre direction.** Recomputing it is hash-free and would save 24 B/cell.

## Future (non-blocking)

- **Main-thread cost is now the bottleneck.** Warm select is ~30 ms in the worker, but structured-cloning ~20k objects and deserializing them on the main thread is now likely the dominant render-thread cost. Packed transferable results should be the next step; measure the receive cost in the browser pass.
- **Allocation overhead.** Each entry uses 3 typed arrays, so 3 objects plus a backing store. One `ArrayBuffer` per entry, or packing offset (6 bits) and representative bit into one byte, would cut the object count and make the 256 B allowance more honest.
- **Tiny-body guard.** Inherited from the legacy selector: if `farRangeM > radiusM/4`, `axis` can be â‰¤0 and the u/v box is projected through the antipode. The new API could reject this in `select`, which would make the failure explicit on tiny bodies.
- **Sort tiebreak.** Both paths use `localeCompare` as the tiebreak, which is locale-dependent and slow. An ordinal compare would be better but changes tie ordering, so it has to change in both paths together.
