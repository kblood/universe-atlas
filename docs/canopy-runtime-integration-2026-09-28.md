# Desktop canopy: local integration and acceptance

The complete canonical census now feeds the desktop planet renderer. The current
build includes the canopy runtime through `98556a7`; the dated checkpoints below
preserve earlier implementation evidence. The cited checks are production-preview
evidence, not a deployment claim or completion of the desktop realism plan.

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

## First fixture limitations (213ca95)

At this checkpoint, moving flight, close fallback counters, precise ownership
image comparisons, game-scale depth and final canvas alpha checks, dated water
transitions, independent Luna acceptance and Opus implementation review
remained required.
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
resolved; XR retains its previous alpha semantics. Luna's corrected rerun
[passes](../test-results/canopy-flight-post-alpha-fix-rerun/report.json): 320.60 m
flight and 320.65 m walking, 153,518 trees / 6,689 patches at rest, zero queues,
failures, capacity misses or presence disagreements, and every canvas alpha
byte is 255 at MSAA0/2/4. View units are metres. See the
[snapshot note](../test-results/canopy-flight-post-alpha-fix-rerun/README.md).

## Follow-up implementation at 4c776b8

- Prefetch begins below 5,500 m altitude while canopy rendering begins below
  3,500 m altitude; outer fade is at 3,700–4,000 m and residency reaches
  4,500 m.
- Configuration, selection and patch work have a 10 s progress watchdog.
  One restart is allowed; terminal failure hides the new representation and
  leaves the legacy path in control.
- Shader instance varyings are flat; per-pixel ownership discard follows
  derivative calculations. The D3D11 regression passes. SwiftShader/Vulkan
  preserves ownership/interior coverage but fails the existing strict edge
  threshold: max area difference 0.250%, up to 90 boundary pixels. This backend
  is not accepted by the current test and needs investigation.
- Static updates use separate 64-slot dirty blocks per attribute; retirement
  changes only position/ownership. Two widely separated edits now schedule
  6,144 bytes, verified by a unit test, rather than the intervening full span.
- Complete current patches beyond 650 m bypass near placement/culling work.
  Stale water and missing patches retain the previous fallback path.

## Luna production-preview acceptance (4c776b8)

The clean `4c776b8` build passed the production build and 60 focused canopy,
forest and rendering tests. Luna's RTX 5090 browser run traversed over 320 m in
flight and walking, ended with 153,518 trees in 6,689 patches, and reported no
queued work, failures, capacity misses or near/far disagreements. It skipped
13,954 near-cache candidates already owned by canonical canopy patches. All
framebuffer alpha samples were 255 at MSAA 0, 2 and 4. The full suite still has
four unrelated existing failures. An 8-second profile records CPU planet-update
p50/p95/p99/max of 11.5/17.3/19.2/26.9 ms and GPU pass-sum
4.36/6.46/7.68/8.53 ms; these are diagnostics, not an FPS claim. Separate-run
upload samples were lower at the observed maxima than the `e32d8d7` run, but
system load was not controlled, so they do not establish a performance gain.

See the [immutable acceptance report](../test-results/acceptance-4c776b8/README.md)
and its [flight report](../test-results/acceptance-4c776b8/canopy-flight-final/report.json)
and [profile report](../test-results/acceptance-4c776b8/desktop-rendering-profile/report.json).
This is the dated `4c776b8` acceptance, superseded by the `98556a7` evidence
below. Its earlier deployed baseline was `e8a848d`. Legacy faceted trees remain
in use; no authored realistic tree assets or species-geometry integration have
been accepted. XR, cloud-edge comparison and broader visual realism remain open.

The water-validity interval-reuse core was subsequently committed as `c02ee95`;
it is outside the immutable `4c776b8` acceptance. Follow-up review fixes for
coalesced water configuration, worker body-snapshot reuse, hydrology attachment
refresh, watchdog queue accounting and atomic selection are awaiting acceptance.
See the [water design](canopy-water-validity-design-2026-09-28.md) and its
[Opus review assessment](canopy-water-review-assessment-2026-09-28.md), as well
as the [host review assessment](canopy-host-review-assessment-2026-09-28.md).

## Canopy runtime through 98556a7

The clean production-preview date-seek fixture on `98556a7` returned from
−4,500 m to −4,475 m and back to −4,500 m. All 6,301 forest patches and 156,309
trees were retained across the seeks; terrain reported zero stale visible
water tiles, with zero queued work and browser errors. The test also confirms
stable date replay in the same forest window; counts from separate fixture runs
are not cross-run equality evidence. The GPU was an RTX 5090 at 1440×1000.
See the [terrain refresh record](terrain-water-refresh-2026-09-28.md) and
[immutable date-seek report](../test-results/canopy-water-date-seek-98556a7/report.json).

The RTX 5090 flight/walking acceptance for this build covered 321.5 m of flight
and 323.2 m of walking, with no census disagreements, queued work, capacity
misses or browser errors; MSAA 0/2/4 alpha readback was 255. See the [flight
report](../test-results/canopy-flight-98556a7/report.json). These preview checks
do not establish midrange performance or a general FPS target. The canopy still
uses legacy faceted tree shapes; authored realistic assets, species geometry,
XR and full visual realism acceptance remain open. Historical deployed release
`e8a848d` used sparse distant representatives; that statement describes the
earlier release only.
