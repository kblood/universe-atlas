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
The follow-up shader-hook unit test and fresh full-game browser run both pass:
`test-results/canopy-runtime-aerial/report.json`. Its timing sample had large
outliers; it establishes functional acceptance, not a performance improvement.

## Remaining acceptance

Moving flight, close fallback counters, precise ownership image comparisons,
game-scale depth and final canvas alpha checks, dated water transitions,
independent Luna acceptance and Opus implementation review remain required.
Selection application currently costs about 7 ms occasionally; steady CPU
forest iteration and terrain/life costs need improvement. No representative
midrange hardware measurement or authored realistic asset acceptance exists.

## Host hardening follow-up

Luna found a full-cache water refresh case where a larger replacement patch
could never reserve space while its obsolete predecessor remained resident.
The host now tries reservation first, then retires that stale whole patch and
retries within the same frame. If it still cannot fit, the whole patch falls
back to the legacy path. No partial patch becomes authoritative.

Fourteen host tests pass, including both replacement outcomes, stale replies
during movement/water changes, bounded retries and close-crown ownership.
`farForcedClose` reports unsuppressed close proxies among the current near
candidate window; it is not a global GPU visibility count. Diagnostics now
separate instance attribute storage, retained double-precision coordinates and
temporary rebase storage. JavaScript object/map and worker memory are additional.

Luna's full suite after this correction: 481/485 pass. The four existing
failures concern time saturation, two version expectations and horizon gating.

## Shader and compositing follow-up

The extended GPU lab checks opaque occlusion at 24, 64, 650 and 4,000 metres,
three camera directions and both metre and 0.001 view units per metre. It also
compiles the game's actual near-tree coverage material and checks six ownership
levels against the far proxy. Accepted cases have no interior mask differences;
edge differences stay within the original threshold.

A separate 0.000001 view-unit stress probe is **not accepted**: adding tiny
view depths to 1 in the installed logarithmic depth convention loses precision.
It reports up to 523 differing edge pixels and two interior pixels in occluded
close views. Regional flight and walking use metre coordinates; this result is
an explicit reason to keep vegetation in that local scale. The test report
retains the failed stress measurements instead of claiming universal scaling.

Luna's first independent flight/walk run settled without worker failures,
population disagreements or uploads after over 600 metres of combined travel.
It found partial final canvas alpha at MSAA2/4 (838/1,093 pixels below 255).
The desktop cloud composite now exports opaque alpha after RGB coverage is
resolved; XR retains its previous alpha semantics. Unit checks pass and a new
full-game alpha/flight run is pending.
