# Nearby animal bodies, vegetation range and forest visits

The six detailed animal slots previously left nearby overflow animals on a
thin primitive fallback. Dense ground cover also ended at 34 m even though
its renderer supports 120 m. Production now uses fuller instanced fallback
bodies and bounded far representatives from the existing canonical plant
grid. Canonical genomes, populations, dates and world versions are unchanged.

The galaxy finder identifies forest-capable worlds. Find forest habitat
confirms actual tree cells alongside local animals and plants. Daunune has
open vegetation; Anitar supports forests. Habitat controls wait for the
finder's planet visit to finish, preventing an earlier readiness race.
Unsupported forest climates skip both tree placement and detailed tree
asset loading, using the classifier's existing body gate.

Validation: 64 focused tests pass. The separate legacy identity and
continuity run has five passes, zero failures and one existing
FAUNA-NEAR-DROP TODO. It preserves the frozen pose/date reference; the new
presentation has its own anatomy, range, cache, capacity and movement tests.
Production build and TypeScript checks pass.

Paired close-flight captures have matching animal IDs, dates and counts,
with position differences under seven micrometres. Anitar reproduces nine
fallback animals alongside six detailed rigs, including idle animals
25-32 m away. Actual camera-frustum grass and flower instances between
55 and 120 m are present in the combined render: 195 on Daunune and 102
on Anitar. Arrival-at-80-m bookmark replays have different residency counts
and are visual evidence only, not whole-frame population parity.

The worst-close-view CPU microbenchmark for 512 animals is about .695 ms
versus .500 ms for the legacy fallback; both use four instanced draw batches.
This is not whole-game or device performance acceptance. Both `067084f` and
the first combined `e7a809f` build show approximately 1.7 s cold shader/program waits. The CPU
profile attributes the long native wait to getProgramInfoLog during cloud
scene capture. A later uncaptured eight-second combined window has p95
17.92 ms, maximum 23.39 ms and no frames above 250 ms. The trace overlaps a
brief CPU test run; timings are descriptive. Skipping rejected forest work
does not establish that all cold shader pauses are cured.

The final route with the readiness guard, resident cap and static forest gate
passes two actual finder visits without walking: Daunune reaches an 80 m
hover with zero forest work and no tree assets loaded; Anitar's forest action
reaches an 80 m hover with 246 trees and main-camera tree draws. Its warm
Daunune window has 240 samples, p95 17.87 ms, maximum 19.89 ms and no frames
above 250 ms. These local timings are descriptive.

Inspect reports and captures under
`Assets/_assetctl/life-presentation-20261009/`, including the benchmark,
paired flight views, combined replay, timing samples and CPU profile.
The final route and deployment receipts are recorded there separately.
