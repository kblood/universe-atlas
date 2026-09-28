# Opus 5.5 census implementation review

Reviewed committed census implementation at 8c5ff7f, supplied at f55023f97880fe45448be860ed49b8589a8bbcea.
Genuine model: claude-opus-5-5 (firstParty; see metadata).
This is the original review, before fixes. Runtime integration remains pending.

# Forest census worker review (8c5ff7f @ f55023f)

Line numbers are counted from the source you supplied.

**Verdict:** The census core is correct for what it claims. The partition, habitat evaluation, record encoding, LRU and transfer ownership all check out. With a plain-JSON `Body`, I found no present bug that gives a wrong present/absent answer. Three protocol and hashing issues should be fixed before a host is wired to it. Everything else is hardening or future integration contract.

---

## Present source issues: fix before integration

### 1. Malformed or unknown messages cancel the live job and blame it
`src/forest-census-worker.ts:37`, `:52`

- An invalid `generation`, an unknown `type`, or a non-integer `requestId` throws into the outer `catch`, which calls `fail()`.
- `fail()` calls `cancel()`, which kills the running job, then posts `{type:'error', generation, requestId:<current>}`.
- The host sees its valid in-flight request fail even though that request did nothing wrong.

Invalid newer `patches` requests behave slightly differently. `:54` bumps `requestId` before validation at `:55–58`, so the older job is killed and the error is attributed to the new id. That is defensible as supersession. The envelope-level failures are not.

**Fix:** validate the envelope before touching `job`/`requestId`. Reply with `requestId:null` (or the offending id) and don't call `cancel()`.

### 2. A patch failure discards completed work and does not name the patch
`src/forest-census-worker.ts:33` → `fail()`

- Up to 7 completed patches in `running.results` are dropped unposted. They are cached, so a resend recovers them.
- The error carries no address or index.
- A deterministic failure (non-finite ground at `src/forest-census.ts:71`) recurs every time that address is requested.

Under your own "pending/missing is never empty" rule, one bad patch keeps an entire 64-patch batch pending. The host can only isolate it by bisecting.

**Fix:** in the failure path, post the accumulated results first. Include `address` and `index` in the error. Choose explicitly between skip-and-report-per-patch and terminate-batch.

### 3. The context hash is content-complete only for plain JSON
`src/forest-census.ts:30–32`

The replacer rewrites every non-array object as `Object.fromEntries(sorted keys)`. The consequences:

- **`Map`, `Set`, `ArrayBuffer`, `DataView` serialize as `{}`.** `structuredClone` preserves them and the sampler may read them, but their content is invisible to the stamp. A same-ID hydrology edit stored in one of these would not change the context.
- **Typed arrays** hash correctly but as `{"0":…,"1":…}`, allocating an object with one key per element. That is very slow for large sample buffers.
- **`NaN` and `±Infinity`** all become `null`.

Whether this bites depends on the `Body`/river-region schema. Your test fixture uses plain arrays only. If the schema is plain JSON today, there is no present bug.

**Fix:** make the replacer fail closed.
- Throw on `Map`/`Set`/`ArrayBuffer`/`DataView` and on non-plain prototypes.
- Serialize typed arrays explicitly, e.g. `[ctorName, Array.from(v)]`.

This is cheap and prevents a silent stale-habitat cache if the schema grows.

---

## Lower-severity present issues

4. **The class wedges after a `step()` throw** (`src/forest-census.ts:71`).
   - `active` stays set, so the next `start()` throws "already has an active patch" until `cancelActive()` is called.
   - The worker's `fail()` masks this; direct callers (tests, any main-thread fallback) wedge.
   - Fix: clear `active` in a `catch`/`finally`.

5. **The offset depends on an unvalidated `cell.id` layout** (`:73`).
   - If `parts[2]`/`[3]` aren't ix/iy, offsets are silently wrong.
   - Fix: check that the offset is an integer in 0..63 and that `parts[0]`/`parts[1]` match face/n. Better still, have `forestPatch` retain ix/iy so the id is never parsed.

6. **The finite guard covers only the centre sample.**
   - In `src/forest-habitat.ts`, a non-finite slope sample makes `NaN<.55` false, so the tree is recorded as a proven absence.
   - This is shared with the near path, so census and production agree. But the "complete patch ⇒ absence proof" contract inherits this blind spot.

7. **The byte estimate ignores per-entry object overhead** (`:82`).
   - Uncounted: the Map entry, `Entry`, the patch object, `address`, and the typed-array and buffer headers.
   - Real retained memory is roughly `maxBytes + maxPatches × (a few hundred bytes to ~1 KB)`, so about 5–16 MB extra at the defaults.
   - Memory is still bounded. Just don't present `estimatedBytes` as heap usage.

8. **Terminal messages are inconsistent.**
   - `cancel` after `done` posts `cancelled` for a finished request (`:49–50`), giving two terminals.
   - A request superseded by a newer request or a new `configure` gets no terminal at all.
   - Document this or normalise it.

9. **Configure failure is posted as `error` with `requestId:0`.** It is distinguishable from a request error only by convention; a `phase:'configure'` field would be clearer.

10. **The stamp omits `FOREST_PATCH_SIDE` and `'forest-patch-1'`**, although the offset encoding depends on them. This doesn't matter while the cache is in memory per build. It matters only if contexts are ever persisted or compared across builds.

---

## Verified correct

- **Partition:** complete and disjoint.
  - x and y range over `[0, ceil(n/8))` and cells are clipped to `n`.
  - Edge and empty patches report as complete.
  - A zero-candidate miss completes on the first `step()`.
- **Work bound per tick:**
  - At most 64 iterations and at most 8 results.
  - The time is checked after every unit of work: ≤8 candidates (≤24 terrain samples, 8 biome classifications), or one `forestPatch` (≤64 `populationCellAt` calls), or one cache-hit copy.
  - Overshoot past `SLICE_MS` is therefore bounded by one unit.
- **Memory:**
  - The active patch holds ≤576 numbers.
  - A job holds ≤64 addresses and ≤8 results of ≤4.6 KB each.
  - The LRU is bounded by both entry count and bytes, and an oversize entry is never cached.
  - The only unbounded transient is the configure-time body clone plus its JSON string, which is proportional to the input.
- **LRU:**
  - A hit refreshes recency.
  - Evicting before insert keeps `size ≤ maxPatches`.
  - No double-insert path exists: a miss happens only when the key is absent, and there is one active patch at a time.
- **Transfer ownership:**
  - Every returned patch is a `slice()`, so cache buffers are never detached.
  - Duplicate addresses in one batch get distinct buffers, so the transfer list never repeats a buffer.
- **Races:**
  - A stale `configure` that resumes after `await` is dropped by `ownGeneration`.
  - Old-generation messages are dropped.
  - `job` always belongs to the current `requestId`, because every `requestId` change either replaces the job or cancels it.
- **Scheduler:**
  - The `scheduled` flag prevents duplicate wakeups.
  - A pending wakeup picks up a replacement job.
  - `tick` is synchronous, so its captured `job`/`census` cannot change mid-tick.
- **Habitat scratch vectors:** shared inside the closure, but safe because evaluation is synchronous and single-threaded.
- **Selection logic:** not duplicated. The census calls the canonical `populationCellAt` and `forestRepresentative`, and its LRU caches patch results, not selection.

---

## Test gaps: what the evidence does not prove

- **The offset oracle is circular.** `reference()` in `tests/forest-census.test.mjs` repeats the same `id.split('/')` parse. The renderer identity contract (address + offset → production cell) is untested.
  - Add: decode each record's offset, call `populationCellAt(seed, face, n, ix, iy)`, and assert that `id`, `direction` and `roll` match.
- **The Luna 4500 m probe** (149478 present in 196306 cells) proves that the candidate set and the habitat agree for one body, one water level and one location. It does not prove identity round-trip unless it decoded ids from address + offset. Please confirm whether it did.
  - Also confirm whether the 4.5 km disk crosses a cube-face edge. All worker fixtures are on face 0.
- **Untested protocol paths:**
  - supersede without cancel (send A then B immediately; A gets no `done`, B's results are exact)
  - `patches` sent before `ready`
  - configure failure, then recovery with a new generation
  - a mid-job `step` failure in the worker, then recovery
  - class-level recovery after a throw
- **The cancel check (request 3)** doesn't assert the absence of `error` or `done` for request 3. It would still pass if the request had been rejected rather than cancelled mid-flight.
- **`maxSliceMs` is reported but never asserted.** Even a loose bound, such as under 50 ms, would catch a slicing regression.
- **The hash test** covers only a top-level key reorder and one plain-array hydrology edit.

---

## Integration requirements (future work, not present bugs)

- **Host protocol:**
  - Wait for `ready` before sending patch requests.
  - Filter replies by generation, requestId and context.
  - Treat a newer request or a new `configure` as an implicit cancel.
  - Keep one request in flight.
- **Supersession discards active patch progress** (`cancel()` calls `cancelActive()`). If the host re-prioritises faster than one patch takes to compute, the head patch can livelock. Either throttle resends or keep the active patch when the new batch contains it.
- **Reply batching holds finished patches** until 8 accumulate or the batch completes. In a priority-ordered batch, the nearest patch waits for up to 7 more. Consider a time-based flush when wiring this up.
- **Any change to hydrology, water level or body requires a new `configure`**, which flushes the whole cache. Streaming river regions will cause cache thrash; plan the reconfigure cadence for that.
- **Renderer-side contracts:**
  - The renderer applies dated eligibility gating (the census deliberately does not).
  - Missing or pending patches must never render as empty.
  - Define a failed-patch policy once issue 2 is fixed.
- **Grid derivation:** `Math.ceil(2*radiusM/FOREST_CELL_M)` (`src/forest-census.ts:36`) duplicates production's grid derivation. If `planet-population.ts` exposes that computation, import it so the two cannot drift.
