# Canopy host review assessment

This assessment records the host review findings and their status in the build
including canopy runtime through `98556a7`. The date-seek preview test passes
water changes from −4,500 m to −4,475 m and back with 6,301 patches and 156,309
trees retained, zero stale visible terrain tiles, and no browser errors. See the
[date-seek evidence](../test-results/canopy-water-date-seek-98556a7/report.json)
and [terrain refresh record](terrain-water-refresh-2026-09-28.md). Flight/walk
acceptance is in the [flight report](../test-results/canopy-flight-98556a7/report.json)
and [preview summary](../test-results/acceptance-98556a7/README.md).
The water core is `c02ee95` with review fixes in `a1`; this document does not
claim deployment or completion of the desktop realism plan.

The [genuine Opus implementation review](opus-5.5-canopy-host-review-2026-09-28.md)
audited a supplied working-tree snapshot. It supports the core ray intersection,
normal, depth, shared hash and frame ownership transaction. It does not approve
deployment or complete the desktop realism plan.

## Findings from the reviewed snapshot and follow-up status

- Defer per-pixel hash discard until after derivative-based edge coverage and
  use flat instance-constant varyings. Follow-up shader review fixes are included
  in `4c776b8`; RTX 5090 acceptance passed, while SwiftShader/Vulkan still fails
  the strict edge threshold described below.
- Separate descent prefetch from visibility. `4c776b8` starts prefetch below
  5,500 m altitude and canopy rendering below 3,500 m altitude, with outer fade
  at 3,700–4,000 m and residency to 4,500 m.
- Disable the new representation after terminal worker failure and watchdog
  configuration, selection and census progress. Implemented in `4c776b8`.
- Bound static attribute uploads for scattered installs/removals and preserve
  pending ranges across hidden frames. Static dirty blocks are implemented;
  sampled movement upload counters are in the acceptance record. Comparisons
  are separate runs, not controlled performance gains.
- Reduce avoidable near-loop work for complete distant patches. Implemented in
  `4c776b8`; water interval reuse core is in `c02ee95`, with review fixes in
  `a1` and date-seek acceptance in `98556a7`.
- Avoid whole-canopy churn on small water changes. The validity-interval core
  is implemented in `c02ee95`; follow-up coalescing, immutable body-snapshot
  reuse, hydrology attachment refresh, watchdog queue accounting and phased
  selection fixes are in `a1` and covered by the date-seek preview. See the
  [water design](canopy-water-validity-design-2026-09-28.md),
  [Opus assessment](canopy-water-review-assessment-2026-09-28.md) and
  [terrain refresh record](terrain-water-refresh-2026-09-28.md). A validity interval must
  include every terrain/ocean and biome threshold involved in presence and the
  slope probes. A heuristic derived only from present tree heights is unsafe:
  ocean classification can bypass river geometry and change ground height.
- Move selection application out of the message callback into bounded work.
  The follow-up is included through `98556a7`; broader movement acceptance is
  tracked separately from the date-seek check.

## Findings already addressed or requiring qualification

- Aerial fragment-hit positions are passed by `planet-renderer.ts`; the actual
  game shader compiles and the browser follow-up passes.
- `forestPrepareAltitudeM` is 3,500 in the reviewed source. Prefetch is still
  needed; this was an omitted review input rather than an unknown runtime value.
- The full-cache water replacement bug found by Luna is fixed in `2333966`.
- Close fallback and memory diagnostics now exist. `farForcedClose` is scoped
  to the current near candidate window, explicitly labelled in diagnostics.
- Luna reproduced final canvas partial alpha. The desktop composite fix is in
  `e32d8d7`; post-fix measurements show alpha 255 for all pixels at MSAA0/2/4,
  although the first post-fix harness still had a reporting bug after capture.
- Requests are deliberately serial, with at most 64 patches outstanding. An
  over-limit response is a protocol violation; rejecting it is appropriate.
  Pipelining would require a new queue admission invariant, not removing checks.
- Nonfinite water is already rejected by census creation. The actual caller
  provides a finite snapped level. Do not silently reinterpret NaN as a valid
  time/water state; add an explicit host input guard if necessary.
- Near/census equality needs real-patch parameter tests. Store/check only what
  is necessary; a Float32 roll must not replace the canonical Double roll when
  deriving the integer seed.
- Numeric keys need a proven range for all supported body radii; do not assume
  every `(face*n+y)*n+x` value fits safely merely from the one fixture.
- Mask output is a lab/debug facility. Its ordering relative to aerial haze
  should be explicit before using it for full-game mask comparisons.

Further measured improvements include persistent rebase scratch storage,
allocation-free record validation, upload of active position ranges, and
cheaper per-lobe intersection rejection. Headset support remains separate.
