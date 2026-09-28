# Desktop canopy: first game integration

The complete canonical census now feeds the desktop planet renderer. This is a
local implementation checkpoint, not a deployment or completion of realism.

## Structure

- A worker selects conservative patches within 4.5 km, then samples the existing
  terrain and habitat rules. One request contains at most 64 complete patches.
- The host installs whole patches within a soft 2 ms / 512-slot frame budget.
  A contiguous allocator caps residency at 229,376 trees; capacity failures keep
  the existing fallback. Empty completed patches are distinct from pending work.
- Near meshes and far ray-intersected proxies share tree identity, physical
  shape, placement and an integer pixel coverage hash. A separate Uint16
  ownership attribute transfers each admitted tree at 550–600 m with hysteresis.
- Static attributes retain a metre-based local origin. Rebases are prepared in
  slices and swap the position buffer and origin together. Water generations
  invalidate pending replies while preserving useful installed patches.
- The new path is desktop only. XR retains the previous representation pending
  dedicated stereo acceptance. Current legacy faceted trees remain placeholders
  for the species asset stage.

## First full-game fixture

LETHRA-001 / G001/C2128,0,1/0/planet/1, dated fixture, 1440×1000,
headless Chromium using D3D11 on an RTX 5090:

- 153,251 trees in 6,690 completed patches; no worker failures, capacity misses,
  or near/census presence disagreements.
- Settled canopy uploads: zero. Turning in place preserved the forest origin.
- GPU instrumented pass sum p50 4.66 ms / p95 6.87 ms.
- CPU planet update p50 14.1 ms / p95 20.0 ms; frame interval p50 19.5 ms /
  p95 27.2 ms. These measurements do not meet the proposed 60 FPS target.
- No browser errors. Visual inspection shows extended populated hills, with
  primitive tree shapes and materials still clearly visible.

Evidence: `test-results/canopy-runtime/report.json` and screenshots. This first
run predates the follow-up that uses analytic hit positions for aerial haze.
The follow-up has a shader-hook unit test and requires a fresh browser check.

## Remaining acceptance

Moving flight, close fallback counters, precise ownership image comparisons,
game-scale depth and final canvas alpha checks, dated water transitions,
independent Luna acceptance and Opus implementation review remain required.
Selection application currently costs about 7 ms occasionally; steady CPU
forest iteration and terrain/life costs need improvement. No representative
midrange hardware measurement or authored realistic asset acceptance exists.
