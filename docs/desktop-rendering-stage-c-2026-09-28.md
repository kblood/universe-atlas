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
the cloud integration buffer. Capture resolution can decrease to keep the
existing 160 MiB desktop target cap. This tradeoff is why MSAA is experimental:
at higher resolutions, a cleaner edge may cost fine scene detail. It does not
solve temporal shimmer or establish a final vegetation alpha strategy.

## Checks and remaining work

TypeScript/Vite build and nine targeted aerial/cloud checks pass. They cover
terrain-formula equivalence, airless/zero-distance response, shader composition,
coordinate transforms, compatible AA capabilities and allocation arithmetic.
Browser shader compilation, visual comparison, AA/depth transitions, actual
GPU/memory behavior and XR remain separate acceptance work. Opus 5.5 review is
in progress. These changes have not been published with the forest foundation.

Shared lighting, bounded shadows, authored materials, continuous canopy and
species-bound structural variants remain in the
[desktop realism plan](desktop-realism-implementation-plan-2026-09-27.md).
