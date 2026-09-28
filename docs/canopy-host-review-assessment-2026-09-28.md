# Live canopy review assessment

The [genuine Opus implementation review](opus-5.5-canopy-host-review-2026-09-28.md)
audited a supplied working-tree snapshot. It supports the core ray intersection,
normal, depth, shared hash and frame ownership transaction. It does not approve
deployment or complete the desktop realism plan.

## Required work before this release

- Defer per-pixel hash discard until after derivative-based edge coverage, and
  make instance-constant varyings flat. Recheck the actual near/far GPU partition.
- Separate descent prefetch from visibility; the 150k-tree fill must start above
  the visible 3.5 km band.
- Disable the new representation after terminal worker failure and add a
  progress watchdog for configuration, selection and census work.
- Bound static attribute uploads for scattered installs/removals. Preserve
  pending ranges across hidden frames; record movement upload percentiles.
- Reduce avoidable near-loop work for complete distant patches. Keep checks
  for stale water and missing patches, and verify with full-game timings.
- Avoid whole-canopy churn on small water changes. A validity interval must
  include every terrain/ocean and biome threshold involved in presence and the
  slope probes. A heuristic derived only from present tree heights is unsafe:
  ocean classification can bypass river geometry and change ground height.
- Move selection application out of the message callback into bounded work.

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
