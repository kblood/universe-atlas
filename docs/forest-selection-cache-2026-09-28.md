# Forest selection cache — 2026-09-28

The population worker now retains canonical 8×8 patches instead of repeating
all cell hashing on every 40 m observer move. Conservative patch bounds skip
regions outside the selection disc. The final cell-centre distance tests,
6.5% representative mask, full nearby population and sort order stay unchanged.
The main-thread fallback still uses the previous selector.

Packed Float64 records preserve canonical direction, height, yaw and roll.
Cache limits are 24 MiB of accounted arrays/entry allowance and 20,000 patches;
least recently used patches are evicted. This is an estimate, not measured
browser heap usage. It does not consume a texture/GPU allocation. Worker
termination frees the cache. The cache is keyed by body seed/radius/grid;
water, habitat and date do not affect this address-only arithmetic.

Diagnostics expose hits, misses, patch count, estimated bytes and evictions.
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
