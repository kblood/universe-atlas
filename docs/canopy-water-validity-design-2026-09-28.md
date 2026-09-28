# Canopy census water validity design

**Status: implemented locally, not deployed.** The census worker and host now reuse complete patches within the proven interval. Independent tests and a targeted Opus 5.5 review accompany this increment; full game date-seek rendering acceptance remains pending.

Core checkpoint: `c02ee95`. The [Opus review assessment](canopy-water-review-assessment-2026-09-28.md) records subsequent configuration, hydrology-refresh, watchdog and selection fixes.

## Why the water level is in the census context

The current forest census context hashes the complete body and hydrology plus the exact `waterLevelM`. That is conservative: any sea-level change causes a different census context, even if it leaves every forest decision in a patch unchanged. Reuse can be allowed only after recording the water thresholds that were actually consulted while making that patch.

Two height values affect forest output:

- `H`: the uncratered, landform-adjusted height used by `terrainSampler` for its global ocean test. When `H < waterLevelM`, terrain sampling returns before testing river regions.
- `G`: the returned `groundHeightM`. `biomeClassifier` compares `G < waterLevelM` when deciding whether a location is ocean. For a slope probe, `G` also contributes to the legacy one-axis slope test.

Holding the `H < waterLevelM` result fixed keeps the global-ocean/river early-return path fixed. Holding each sampled `G < waterLevelM` result fixed keeps the biome ocean result fixed. The same `G` values therefore preserve the existing slope decision as well.

## Exact interval

Let `W0` be the water level when the patch is censused, and let `T` contain every finite threshold compared to water while producing the patch: the `H` threshold before each terrain ocean branch, and the returned `G` from every primary and slope-probe terrain sample. Each comparison is strict: `t < W`.

For a threshold `t < W0`, the comparison is currently true. It remains true only when `W > t`, so it contributes a strict lower bound. For a threshold `t >= W0`, the comparison is currently false. It remains false when `W <= t`, so it contributes an inclusive upper bound. Intersecting these constraints gives:

```text
lowerExclusive = max({ t in T | t < W0 }) or -Infinity
upperInclusive = min({ t in T | t >= W0 }) or +Infinity
patch may be reused iff lowerExclusive < Wnew <= upperInclusive
```

This is the exact interval that preserves every recorded water comparison. The proof follows directly from preserving each comparison’s truth value; no rounding or tolerance is permitted. At `Wnew == lowerExclusive`, the comparison for the threshold that supplied the maximum lower bound flips, so the lower endpoint is excluded. At `Wnew == upperInclusive`, its comparison remains false because equality does not satisfy `<`, so the upper endpoint is included. If `body.water` is false, water does not affect these forest predicates and the interval can be unbounded.

The set of slope probes must include **every probe actually evaluated**, including both probes for a candidate that later fails the `< .55` slope check. Do not collect probes only for final-present trees. The current pre-slope eligibility predicate (`!sample.wet && biome.forestPotential && cell.roll < .76`) remains invariant because all primary `H` and `G` results are held fixed. Thus the set of probe calls is invariant too. The prototype records probes as soon as that pre-slope predicate passes and before deciding whether slope rejects the candidate.

An implementation can avoid duplicating forest logic: add an optional observation callback at the exact `H` ocean comparison in `terrainSampler`, and wrap the census sampler to record the returned `G` for every call. Since `forestHabitat` uses that sampler for primary samples and for both ±5 metre slope probes, this captures the complete evaluated set, including candidates subsequently rejected on slope.

## Reuse and cache identity constraints

An interval is valid only for the exact family of inputs used to produce it. Separate a water-independent family hash from the water-specific context. The family covers the canonical body, complete hydrology and river geometry, population/habitat/terrain/biome/landform versions, grid and patch algorithm versions. The water-specific context hashes that family and the exact water level. Interval metadata is derived from the completed census, not a separate context input.

When sea level changes, a worker may reuse an immutable completed patch only if its family hash equals the newly configured family and the new water level lies within that patch’s recorded interval. It should return the result under the new water-specific context only after that check. The host should retag or retain installed slots only after the new worker reports ready with a matching family hash; configuration by itself is not proof that the body or hydrology still matches. If the body or hydrology can mutate in place, either freeze them for the worker/cache lifetime or compute a new canonical family hash before reuse. Missing interval metadata means no cross-water reuse.

This reuse rule covers census content only. Existing near-tree selection, water-height checks, near absence suppression, renderer readiness and dated life eligibility must continue to gate what is shown. In particular, a complete census does not authorize trees for a body/date where the current renderer would not show life. A changed water level outside a patch’s interval requires a fresh complete patch census; incomplete work must continue to mean unknown, never empty.

## Runtime increment and checks

`forest-census-3` changes cache provenance, without changing canonical cell identity or tree dimensions. Worker reconfiguration retains only immutable completed patches with a matching family and containing interval. Returned arrays and interval tuples are copied. Host reuse starts after the worker confirms the family, retags at most 512 patches per frame within the shared soft 2 ms budget, and leaves tree attributes and slots intact. Invalidated patches still require a complete replacement.

Selection replies now queue their packed buffer. Address validation, eviction discovery and retry cleanup run in bounded frame slices, with the new selection committed atomically. Request scanning also has a 512-entry limit. Removing redundant per-slot water storage reduces retained coordinate arrays from 9,175,040 to 7,340,032 bytes at default capacity; this excludes JavaScript maps and the worker cache.

The [browser worker report](../test-results/canopy-water-worker/report.json) verifies all 16 real fixture patches reused from 0 to 25 metres, zero new habitat samples, and exact equality with a fresh census at the new water level. Protocol, cancellation and superseded-context checks also pass.

The [browser host report](../test-results/canopy-water-host/report.json) exercises a 4.5 km inland fixture with 6,684 patches and 156,332 trees. All patches reused at 25 metres, with unchanged slots and positions and no new attribute updates scheduled. This fixture uses the actual host and module worker but no WebGL draw; its counters do not measure GPU transfers. It does not establish a planet-wide reuse rate or acceptance of date-seek visuals.

## Initial CPU prototype

The disposable prototype and outputs are preserved under `test-results/canopy-water-validity-design`:

- [`prototype.mjs`](../test-results/canopy-water-validity-design/prototype.mjs) computes patch thresholds from the existing terrain, biome, habitat, population and landform functions, then compares direct complete-patch signatures at sample water levels.
- [`water-300.json`](../test-results/canopy-water-validity-design/water-300.json) uses the LETHRA-001 planet fixture, water level 300 m, and a real patch with 36 tested cells, 27 candidates passing pre-slope eligibility, 20 slope rejections, and 7 present trees. It records 180 comparisons: 36 primary `H`, 36 primary `G`, 54 slope-probe `H`, and 54 slope-probe `G` thresholds. The interval is `(-Infinity, 1764.8703535738487]` metres. Complete direct census signatures match at 300 m, at 1032.4351767869243 m, and at the inclusive upper endpoint; a value just above the upper endpoint changes at least one recorded predicate.
- [`water-3000.json`](../test-results/canopy-water-validity-design/water-3000.json) exercises the lower-bound case on the same patch: interval `(1847.170982583633, +Infinity)`. The lower endpoint changes a recorded predicate; a value just above it preserves all predicates, and the direct census matches at 2423.5854912918167 m.

The prototype is a CPU source-function experiment on one 8×8 forest patch, not a renderer or GPU performance result. The samples show that nonzero intervals can exist and that both strict/inclusive edges matter; they do not establish a useful hit rate across a full planet. A runtime change should measure interval hit rates, census cost, retained cache bytes, and water-change behavior with the actual dated water timeline before adoption.

An additional actual-hydrology fixture is covered by [`forest-water-validity.test.mjs`](../tests/forest-water-validity.test.mjs). Its helper [`river-probe.mjs`](../test-results/canopy-water-validity-design/river-probe.mjs) builds the catalog body's three canonical river regions and tests the first outlet patch. That patch has 33 population candidates and no present trees, but the terrain query reports river water at two cells and changed ground height at all 33 cells. At `W0 = 0`, its measured interval is `(-0.7286609376226583, 0.053449041485368345]`; the test confirms an in-interval reused census equals a fresh census. The full three-outlet summary is in [`river-water-patches.json`](../test-results/canopy-water-validity-design/river-water-patches.json). This adds real river geometry to the source-function check while retaining the empty-patch limitation; it is still not a game integration or visual test.
