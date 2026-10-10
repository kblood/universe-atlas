Runtime attribution candidate
=============================

The moving Anitar30 balanced captures show added CPU/GPU cost with LOD enabled;
this candidate does not claim a speed improvement or enable the production default.
It preserves the pinned Kit0.5 body, dated pose, actual ground callback and coverage.

Use `fauna-lod-prototype=float&fauna-lod-profile=1` on the initial URL. The profile
is cumulative under the runtime adapter diagnostics; subtract two snapshots over
the same moving interval. Counts and milliseconds are recorded for controller
adoption/submission/job scheduling, ground samples, pose solving, palette writing,
pool submission, streaming, ownership accounting and worker dispatch. Pose time
includes ground time; controller time includes its nested phases. Ground timers
add overhead to each sample, so whole-app performance requires a separate capture
without profiling. Profiling disabled never reads its clock.

Ground already comes from a retained per-herd 7×7 bilinear stencil, multiplied by
the current relief. The extra rigs do not construct a terrain sampler or resample
the planet field. Approximate ground, flattened slopes or altered IK are excluded.

Potential exact optimizations to measure after attribution: ownership accounting
currently constructs full diagnostics even during admission checks; per-frame trace
rows allocate; and sparse moving rows currently request full bone/root palette
uploads. `fauna-lod-upload=rows` selects the existing adaptive-row upload mode for
an independent comparison. It retains full initial/dense uploads and identical
palette bytes. Its default remains `full`; no quality policy or population changes.

The e8b9cea browser attribution measured controller mean 0.45–0.50 ms/frame,
pose 0.35–0.39 ms (including ground 0.067 ms), and ownership 0.008–0.010 ms.
Every moving window included workers, so it did not isolate steady rendering.
Adaptive rows showed no median CPU/GPU win. Keep full uploads as the default.

The followup removes report construction from admission ownership/prepared-count
reads, preserving the exact existing byte accounting for current attributes,
palette rings, pending copies and presentation parameters. Tests cover float/raw
packed, retained/atlas-owned cache and all three palette-ring sizes through each
ownership transition. This is allocation cleanup, not an explanation of the
larger whole-app CPU delta. Source definitions, poses and submitted arrays remain
unchanged. A settled-versus-streaming comparison is still required.

Close-slot selection now retains 16 existing visible close owners through 95 m.
A new owner must be strictly more than 20% closer than the farthest retained owner;
equal distances use deterministic ID order. Free slots follow the existing canonical
camera-distance/ID order. Normal distance hysteresis remains 75 m initial, 65 m upgrade,
95 m downshift. Rank-constrained middle choices no longer overwrite the preferred
distance tier. Up to 128 candidates plus 16 retained close owners are inspected in
reused scratch storage; final ownership remains 16 close + 112 middle, in canonical
submission order. Population, frustum tests and near skins remain unchanged.

Context (planet/life/date-version/appearance), hidden and XR clears remove selection
history. Atomic migration already retained initial appearance fade age; its regression
now runs with the real 0.25 s arrival fade and requires full coverage through successful
upgrade and refused downshift. Only first LOD arrival fades from fallback.

`coldJobCauses` counts actual adapter build attempts: `newId` (first observed in
bounded current-context history), `context` (cached ID from the previous context),
`distanceTier`, `rankTier`, and `cacheRebuild`. Recent/previous-context ID histories
are each capped at 128 and cleared on disposal. A forgotten historical ID is classified
as `newId`; these counters do not claim an unbounded lifetime population ledger.
Queued tier reasons persist across frames, so busy workers do not erase rank causes.
Browser churn/performance improvement still requires a new measured receipt.

Finite deterministic input for acceptance only
---------------------------------------------

`__atlas.setExplorationStepNs('1000000',180)` supplies exactly 1 ms per eligible
exploration update and holds after 180 ticks. `__atlas.explorationStep` exposes
step, tick limit/count, actual start/end epoch strings and held state. The setter
validates integer nanoseconds 0..1e9 and a finite tick limit 1..10000 before mutation.
Null resets diagnostics and restores the original `advanceDate(epoch,dt)` path,
preserving user pause. No product UI or per-frame public seeking is introduced.
The existing ready/flight/pause/playback/XR guards, existence-boundary handling
and body-orbit translation remain in `updateExplorationClock`; tests exercise that
actual function with real catalogue orbital positions. Performance, profiling and
flight elapsed time remain real. This 180 ms diagnostic input permits identical
dated cohorts; it does not replace the retained natural three second streaming receipts
or establish natural gameplay performance.
