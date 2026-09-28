# Canopy proxy prototype validation

Source prototype: detached `75a7d3b337f0ae6659ff6b0943798cbd2371ab29`. Guide/evidence copy: detached `deb9ca8d342308734d63d4fae57a9b4c926dd599` (prototype runtime sources unchanged). Both checkouts remained clean.

## Build and focused tests

- `build.log`: `npm run build` passed at 75a7d3b.
- `focused-tests.log`: 6 tests passed for patch selection, shared tree shape, and impostor allocation/transform behavior.
- `guide-build.log`: production build passed at deb9ca8.
- `guide-link-check.json`: all 110 local hrefs in built `guide/index.html` and `guide/life.html` resolve inside the built site.
- `experiment-doc-link-check.json`: all 7 local links in `docs/forest-impostor-experiment-2026-09-28.md` resolve in the production output.

## RTX 5090 browser labs

Both browser labs ran in Chromium using ANGLE D3D11 and identified `NVIDIA GeForce RTX 5090`; no browser or console errors were reported.

The isolated silhouette lab compared 64 view directions. The accepted faceted proxy uses crown scale 1. The fitted scale 0.86865 belongs to the rejected smooth-ellipsoid experiment, not the accepted proxy. Faceted mean projected-area error was 0.00237%; maximum was 0.00972%. Mask changes stayed at silhouette edges (maximum 4 pixels in orthographic views); perspective/opaque-occlusion checks changed at most 1 pixel. The proxy shader preserved the faceted crown and trunk silhouette in the reviewed lit screenshots. Target MSAA 0/2/4 tests had maximum area errors 0.0097%, 0.2361%, and 0.2691%, below the 1% gate.

The full-field lab used the Maithea forest fixture: 149,479 present trees in 6,684 patches; census worker setup took 1.44s and proxy attributes used 7.17 MB. It renders the same positions with reference meshes and proxies over one coarse terrain surface. Each row has 40 GPU timer samples, 1440×900 resolution, and two draw calls:

| Height | Representation | GPU p50 | GPU p95 | Triangles |
|---:|---|---:|---:|---:|
| 120 m | mesh reference | 2.48 ms | 2.49 ms | 14,382,752 |
| 120 m | impostor proxy | 2.57 ms | 2.63 ms | 331,726 |
| 1,200 m | mesh reference | 4.56 ms | 4.75 ms | 14,382,752 |
| 1,200 m | impostor proxy | 2.59 ms | 2.75 ms | 331,726 |

The near sample did not show a GPU-time improvement; the 1,200 m sample was lower in this run. These measurements describe an isolated lab and do not establish live-game frame time or a general speedup. The screenshots show matching placement and silhouettes at the two tested heights, with a primitive, visibly faceted canopy.

## Preserved images and reports

- `silhouette/report.json`, `reference-lit.png`, `impostor-lit.png`, plus mask and AA diagnostics.
- `field/report.json`, `reference-120m.png`, `impostor-120m.png`, `reference-1200m.png`, `impostor-1200m.png`.

This remains a prototype experiment. It is not connected to live forest streaming. The field lab does not include wind, shadows, aerial perspective, near/far replacement, full scene residency, or temporal subpixel stability. The experiment document lists integration requirements and remaining acceptance work.

