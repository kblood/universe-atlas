# Retained terrain refresh during date changes

## Failure found by Luna

The real-game water/date fixture on `c02ee95` seeks Maithea between cosmic offsets `435036570624084600000000000` and `434632321855977210000000000` nanoseconds. Both dates retain a solid planet, an available ocean and complex life. Their snapped water levels are −4,500 and −4,475 metres.

Forest reuse succeeded: 6,294 patches and 156,153 trees remained installed, with no census disagreements or browser errors. Terrain failed to catch up. All 180 visible tiles remained stamped with the previous water bucket after four minutes, despite zero pending jobs and zero failures. The same failure reproduced on `a1a4cb2`.

## Cause and correction

Retained terrain leaves were protected from eviction every frame, but freshness requests were made only for roots and children considered during refinement. Once a stationary frontier stopped refining, changing the water level never queued those visible leaves again.

Commit `98556a7` routes every retained leaf through the existing freshness request. A mismatched water bucket schedules a bounded worker replacement while the prior complete tile remains visible. Request deduplication, worker admission, byte limits and the two-completions-per-frame installation limit remain in force. This fixes tile freshness independently of camera movement or LOD refinement.

## Validation status

TypeScript compilation passes. Luna's [clean production-preview date test](../test-results/canopy-water-date-seek-98556a7/report.json) passes on exact `98556a79df4fde1d1c878bfbd1eda5c97413ecef`, with `dirty:false`. Both seeks settle with zero stale visible terrain tiles, zero pending queues/jobs, and no browser errors. All 6,301 forest patches are reused on each seek; 156,309 trees retain the same family, and the observer's position relative to the body is preserved. The GPU is an RTX 5090 through ANGLE/Direct3D11 at 1440×1000.

The [pre-fix failure](../test-results/canopy-water-date-seek-c02ee95/failure.json) records the 180 stale tiles on `c02ee95`. Different runs settle at slightly different forest windows, so their total population counts are not an across-run equality test. The passing test checks stability within its own fixed window and date replay.

The isolated [CPU regression](../tests/terrain-water-refresh.test.mjs) fails on pre-fix `a1a4cb2`: the stationary retained leaf is never re-requested and 133 visible tiles remain stale with an empty queue. It passes on `98556a7`, checks the actual −4,475 m tile build input, holds the worker reply to confirm the old tile stays visible, and then verifies all visible tiles become fresh. See the [baseline failure](../test-results/terrain-water-refresh/baseline-fail.txt) and [fixed pass](../test-results/terrain-water-refresh/fixed-pass.txt).

The [final acceptance record](../test-results/acceptance-98556a7/README.md) also records passing flight, walking, MSAA and an isolated frame profile. This local acceptance does not claim a deployed version, realistic authored trees or midrange hardware performance.
