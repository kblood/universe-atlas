# Repaired native impostor comparison

This follow-up uses a fresh page and the optional, audited live map-include repair. The original unmodified grid-16 baseline remains in the parent directory and is unchanged. The full machine-readable results, input/source hashes, renderer identity, shader audits, probes, and profiles are in [`report.json`](report.json).

## Capture and shader audit

- Candidate: `C:\LLM\IWSDK\Assets\_assetctl\atlas-ez-family-f`, with its two GLBs hashed in `report.json`.
- Chromium 149.0.7827.55, ANGLE D3D11 / RTX 5090; 1600×1000 canvas.
- Pinned Three.ez bundle hash was checked against its manifest. Grid 16, 2048 atlas, 128 pixels per view.
- The raw, unchecked page records one live `map_fragment` include and zero applied `blendedColor` multiplications. The repaired page audits one `impostorTransform` declaration and one `blendedColor` declaration; it replaces exactly one live map include, applies `diffuseColor *= blendedColor` once, and leaves zero live map, project, or normal-map includes in the proxy shader. The vendored source bundle is unchanged.
- 49 shared-mask directions cover eight azimuths at elevations 0°, 15°, 45°, and 85°, top, and below-centre −5°/−20° diagnostics. 40 native-size comparison rows sample eight representative directions at 8/16/32/64/128 pixels. There are 27 distance probes through radii 30/300/1000, an 82-sample pixelwise yaw sweep, and paired 128-pixel masks.
- Nine direct canvas images show front, back, and top views for full mesh, middle mesh, and impostor at the same camera. Each mode's profile uses 120 warm-up frames followed by 180 measured frames.

## Findings

- The source/middle/proxy contain 13,806 / 4,866 / 2 triangles. The capture submission took about 112 ms; the two-atlas full-mip RGBA8 estimate is 44,739,243 bytes and one capture target remains retained.
- After repair, average 128-pixel, 2× silhouette IoU against full mesh was 0.95 at the horizon, 0.92 at 15°, 0.92 at 45°, 0.94 at 85°, and 0.94 from above. Middle mesh averages about 0.78–0.80 across supported angles. The below-centre measurements are diagnostic only: proxy IoU falls to about 0.89 at −5° and 0.68 at −20°.
- The 256-pixel full-mesh alpha reference converged across 1×/2×/4×: weighted coverage changed roughly 0.8–1.0% from 1× to 2× and 0.2–0.3% from 2× to 4× across the horizon, diagonal 45°/15°, and top checks. This convergence follow-up is in [`yaw-continuity.json`](yaw-continuity.json).
- Against that downsampled 256/4 mesh reference, native full-mesh alpha coverage averages only about 15%, 13%, 13%, 61%, and 95% at 8/16/32/64/128 pixels. Native impostor coverage averages about 100%, 105%, 103%, 100%, and 99%. At the horizon, 8-pixel coverage is about 2 pixels for native mesh versus 17 for the reference and proxy; at 32 pixels it is 38 versus 279/291. The ordinary native mesh loses much of the fine foliage under minification; the captured proxy retains it.
- The alpha-hash diagnostic is separate in [`alpha-hash-followup.json`](alpha-hash-followup.json). With `alphaTest=0` and `alphaHash=true` on a cloned foliage material, 256/4 reference coverage stayed close to the ordinary mesh (mean absolute alpha difference about 0.28–0.31%). Native alpha-hash mesh coverage also stayed near the 256/4 reference. This does not test temporal stability or TAA and is not a runtime recommendation.
- The repaired proxy no longer shows the former repeated atlas-tile color pattern. The close images still look blocky at near view because there are only 128 capture pixels per view; top/back lighting also differs from the two-material full mesh. This is not a visual acceptance result.
- The isolated GPU pass p50s were about 0.066 ms for mesh, 0.041 ms for middle mesh, and 0.031 ms for proxy, with 179 valid GPU samples per mode. These timings cover this fixed lab canvas only.

The primary run's page/console/request checks and per-probe GL error checks passed. The follow-ups record page errors and use the same per-probe GL checks; they do not separately collect console/request logs. The current probe's 4× samples at each requested small resolution are not treated as ground truth; use the 256-pixel convergence data for the native minification comparison.

This is a static GLB reference lab: no Atlas wind or height scaling, ground, shadows, distance-driven integration, full-game performance, or headset checks. The proxy and both source LODs have different material paths. Below-centre views are outside the hemisphere renderer's supported range.

Images: [`front-mesh.png`](front-mesh.png), [`front-mid.png`](front-mid.png), [`front-impostor.png`](front-impostor.png), [`back-mesh.png`](back-mesh.png), [`back-mid.png`](back-mid.png), [`back-impostor.png`](back-impostor.png), [`top-mesh.png`](top-mesh.png), [`top-mid.png`](top-mid.png), [`top-impostor.png`](top-impostor.png). Example paired binary masks: [mesh](masks/az0-el0-mesh.png), [middle mesh](masks/az0-el0-mid.png), [proxy](masks/az0-el0-impostor.png).
