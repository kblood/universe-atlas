# Desktop rendering, stage C — 2026-09-28

## Shared local aerial perspective

`local-aerial-perspective.ts` extracts the existing terrain approximation and
applies it to the instanced forest, ground flora and fauna materials. View-space
distance supplies the optical path length; planet-relative radius and sun
direction supply height and daylight. Retained instance origins remain intact.
The attachment composes the forest coverage shader and runs before tone mapping.

This is a consistency change, not a physically complete atmosphere solution.
Density has a 14 km height scale, horizontal attenuation uses 65 km, and the
existing fog contribution is capped at 0.92. Airless surfaces disable it. Water,
cloud scattering and the orbital atmosphere keep their existing paths.

## Optional scene antialiasing experiment

On the current body, the diagnostic console API
`window.__atlas.setCloudSceneSamples(0 | 2 | 4)` requests multisampling of the
HDR scene capture used by clouds. Default is zero; this is not a saved quality
setting. XR forces zero. Colour and depth renderbuffer sample capabilities must
intersect; unsupported requests fall back to a lower supported count or zero.
Diagnostics expose requested, supported and effective samples.

The memory estimate includes resolved colour/depth, multisample storage and
the cloud integration buffer. Following Opus review, requests reduce their
sample count before reducing scene resolution: AA cannot make capture resolution
lower than the no-AA baseline. `sampleLimit` explains budget, format or XR
fallback. The existing 160 MiB cap remains. MSAA stays experimental because
resolved depth has one value per pixel while colour averages coverage samples;
cloud/foliage fringes and temporal shimmer need a post-composite AA comparison.

## Checks and remaining work

TypeScript/Vite build and eleven targeted aerial/cloud checks pass. They cover
terrain-formula equivalence, airless/zero-distance response, shader composition,
coordinate transforms, compatible AA capabilities and allocation arithmetic.
The local RTX 5090 browser run recorded in the
[desktop rendering validation](desktop-rendering-validation-2026-09-28.md)
passed shader compilation, all 19 aerial hooks, AA requests and resize checks.
The live `37f0e89` deployment is recorded in
[its deployment report](../test-results/deploy-37f0e89/live-deployment.json).
Its Find-Life browser traversal timed out during asynchronous river readiness;
the page and console error arrays were empty, and the parent investigation
identified a race where background hydrology refresh clears the active journey.
Cloud-edge visual comparison and XR remain unverified. The independent
[Opus 5.5 review](opus-5.5-rendering-review-2026-09-28.md) is preserved verbatim.
Its AA resolution finding is fixed, haze now shares terrain's actual air/eye
uniforms, shader-hook failures are visible in diagnostics, and dynamic material
cache keys are retained. XR captures preserve the supplied camera world matrix.
All current forest/flora/fauna meshes are constructed before attachment and
keep unique materials. Future dynamic batches must attach the hook explicitly.
These changes were published in release `37f0e89`.

Shared lighting, bounded shadows, authored materials, continuous canopy and
species-bound structural variants remain in the
[desktop realism plan](desktop-realism-implementation-plan-2026-09-27.md).
