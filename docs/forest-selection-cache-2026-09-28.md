# Forest selection cache — 2026-09-28

The population worker now retains canonical 8×8 patches instead of repeating
all cell hashing on every 40 m observer move. Conservative patch bounds skip
regions outside the selection disc. The final cell-centre distance tests,
6.5% representative mask, full nearby population and sort order stay unchanged.
The main-thread fallback still uses the previous selector.

Packed Float64 records preserve canonical direction, height, yaw and roll.
Cache limits are 32 MiB of accounted arrays/entry allowance and 30,000 patches;
least recently used patches are evicted. This is an estimate, not measured
browser heap usage. It does not consume a texture/GPU allocation. Worker
termination frees the cache. The cache is keyed by body seed/radius/grid;
water, habitat and date do not affect this address-only arithmetic.

Diagnostics expose per-query hits/misses/visited patches, resident patch count,
estimated bytes and explicitly cumulative `evictionsTotal`.
One worker request remains in flight. The response still uses existing cell
objects; packed worker-to-main transfers remain future work.

## Source and CPU checks

Fourteen focused tests pass across shared habitat, patches, retained instance
slots and the cache. Cache results match the old selector at face centres,
seams, cube corners and nearby flight positions. Eviction, zero cache budget,
A→B→A queries and mutation of returned objects do not change the population.

The [Node benchmark](../test-results/forest-selection-cache/benchmark.json)
uses a 6,000 km radius, 750 m full range and 4.5 km total range. It verifies
exact JSON SHA-256 equality for every cold, repeated and moved result.

| Fixture | Old selector | Cold cache | Move 50 m | Accounted resident cache |
| --- | ---: | ---: | ---: | ---: |
| Face centre | 365 ms | 562 ms | 27 ms | 16.2 MB |
| Face seam | 484 ms | 740 ms | 34 ms | 17.9 MB |
| Cube corner | 700 ms | 983 ms | 35 ms | 19.9 MB |

These are single-process CPU selection measurements on the development
workstation, not browser frame or GPU timings. Cold construction is slower
and can delay the first forest working set. Repeated samples include a 92 ms
outlier. Browser streaming, memory and fast-flight acceptance are still needed.
No denser far canopy or new tree assets are enabled by this change.

## Independent review and follow-up

[Opus 5.5 reviewed d0538c8](opus-5.5-selection-cache-review-2026-09-28.md) and
found no selector correctness defect. Its conditional error-handling blocker
is covered by `PlanetForest.startWorker`: `worker.onerror` clears the in-flight
state, allows one restart, then uses the legacy synchronous fallback. That file
was absent from the review bundle; the existing restart/fallback test passes.

The reviewed 24 MiB/20,000-entry limits left limited corner headroom. The next
increment raises the bounded allowance to 32 MiB/30,000 entries; a full-radius
corner test enforces less than 70% occupancy of both limits. It adds twelve
deterministic random Earth-scale seam/corner comparisons and documents the
gnomonic projection assumption beside `cubeDirection`. Sixteen focused tests
now cover cache, habitat, patch and buffer contracts. The benchmark table
above remains the historical 24 MiB run; its actual working sets fit either cap.

Lazy jitter construction and packed transferable worker results remain useful
follow-ups for cold latency and main-thread receive costs. Enlarging the forest
range still requires a new cache/headroom review; a finite cache cannot promise
warm performance for an arbitrarily large working set.

## Luna 6 hardware acceptance

Exact runtime checkpoint `66c7728` passes its build, 57 targeted source tests
and the RTX 5090 desktop fixture. During a measured 110.14 m lateral surface
move, two new selection responses arrived. The latest reused 6,655 patches,
built 32, and accounted for 17.35 MB of its 32 MiB allowance. Trees, flora and
128 animals remained drawn; terrain was ready; browser errors, worker failures
and restarts were all zero.

The stationary 476-sample profile reports frame interval p50/p95 16.6/19.1 ms,
CPU planet update 9.6/13.0 ms, and GPU pass sum 4.11/6.19 ms. This is one
development-machine fixture, not a midrange hardware or fast-travel guarantee.
The revised movement test measures surface displacement: a 60 m 3D move can
be mostly vertical and also need not cross a selector centre's 40 m threshold.

- [Validation record](../test-results/forest-selection-66c7728/README.md)
- [Rendering report](../test-results/forest-selection-66c7728/desktop-rendering-hardware/report.json)
- [Movement/cache report](../test-results/forest-selection-66c7728/browser-movement-lateral-hardware/report.json)
- [After movement](../test-results/forest-selection-66c7728/browser-movement-lateral-hardware/after-move.png)
- [Browser fixture source](../tests/forest-selection-cache.browser.mjs)
