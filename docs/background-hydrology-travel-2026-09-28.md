# Background hydrology and travel — 2026-09-28

Live acceptance of rendering release `37f0e89` found a navigation race. The
automatic river-detail selection awaited a surface-worker response, then
unconditionally cleared flight/approach state. A user who started **Find living
habitat** before that response could be stranded back in orbit. No JavaScript
or shader error was involved; the late background completion cancelled the
newer navigation intent.

`selectRiverDestination` now distinguishes a background refresh from an
explicit river selection. Background completion preserves free flight, terrain
approach, autopilot/orbit assistance, playback and pending automatic touchdown
when there is no active walker/contact setup to rebuild. An existing walker or
landing still follows the prior teardown/rearm path because the terrain
renderer is being replaced. Explicit river selection still takes the observer
to inspect the requested region.

The change preserves navigation intent; it does not yet retain all streamed
terrain/life resources through a renderer replacement. That remains a separate
streaming improvement. Deterministic terrain and population addresses are
unchanged.

Source fixes: `cb68144`, `cb03169`. The integrated build passes. Luna 6's
controlled worker-response regression reproduces cancellation on `37f0e89`
and passes on `eb06755` (which contains both fixes). Both **Find living
habitat** and **Land and walk** preserve their approach after the delayed
completion. Explicit river selection then ends that flight as intended.

These behavioral checks use SwiftShader, have no browser errors, and do not
wait for touchdown or establish GPU performance. See the
[regression record](../test-results/background-hydrology-regression/README.md),
[Find Life report](../test-results/background-hydrology-regression/fixed-cb03169-life-report.json)
and [Land approach report](../test-results/background-hydrology-regression/fixed-cb03169-land-report.json).
Deployed hardware acceptance is the next release check.
