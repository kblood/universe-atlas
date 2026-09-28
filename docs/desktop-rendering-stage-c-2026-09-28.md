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
The live `37f0e89` traversal exposed an asynchronous hydrology race, fixed in
the integrated release below. Release `114a16ec51f76741b272927b42f19af8ce0b9142`
passed the live RTX 5090 browser fixture: 19/19 aerial hooks attached, 2,034
visible forest instances, 1,624 flora and 128 fauna near ground, zero warm
stationary matrix/color writes, and successful 0/2/4-sample AA plus resize
checks. The turn-in-place kept observer position fixed and wrote no forest
matrices or colors. See the
[deployment record](../test-results/deploy-114a16e/live-deployment.json) and
[full browser report](../test-results/deploy-114a16e/desktop-rendering-acceptance/report.json).
Cloud-edge visual comparison and XR remain unverified. The independent
[Opus 5.5 review](opus-5.5-rendering-review-2026-09-28.md) is preserved verbatim.
Its AA resolution finding is fixed, haze now shares terrain's actual air/eye
uniforms, shader-hook failures are visible in diagnostics, and dynamic material
cache keys are retained. XR captures preserve the supplied camera world matrix.
All current forest/flora/fauna meshes are constructed before attachment and
keep unique materials. Future dynamic batches must attach the hook explicitly.
These changes were published in release `114a16e`; the integrated forest cache
revision was subsequently published in `6f7cb214e1f9c3e7f4865ba2fc8fdcc6fc98e13d`.
Its live RTX 5090 desktop fixture again passed AA, resize, hook, stationary
forest and turn-in-place checks. The full record is in the
[6f7cb21 deployment report](../test-results/deploy-6f7cb21/live-deployment.json).

Shared lighting, bounded shadows, authored materials, continuous canopy and
species-bound structural variants remain in the
[desktop realism plan](desktop-realism-implementation-plan-2026-09-27.md).
