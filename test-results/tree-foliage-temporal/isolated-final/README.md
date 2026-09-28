# Corrected isolated alpha-coverage probe

This run supersedes neither prior artifact: the original [render-target-probes report](../render-target-probes/report.json) is retained as a camera/LOD-default failure, and [isolated-report](../isolated-report/report.json) is retained as a MASK/HASH load-race failure. This report used direct awaited `lab.load(buffers,{foliageCoverage})`, stopped the animation loop after load, and checked the requested color and shadow material settings before each capture.

## Setup and checks

- Family F inputs are pinned by SHA-256 in [report.json](report.json); the rendered app source hashes are recorded there too. Browser: Chromium 149.0.7827.55; renderer: ANGLE, NVIDIA GeForce RTX 5090, Direct3D11.
- Each mode and LOD passed a 128×128 nonzero-alpha smoke before its matrix began. The script rendered one identity-transform 16 m instance at a fixed 20 m camera distance, with transparent clear, ground/grid hidden, and shadows off. The smoke PNGs show the alpha coverage mask in white.
- Native output sizes were 16, 32, and 64 pixels. Each was compared with a same-camera 512 or 1024 render-target sample box-downsampled to that size. Date samples were 0, 1.75 seconds, 7 seconds, and −7 seconds. Camera yaw samples were 0°, 0.5°, and 1°.
- Every capture asserted the requested MASK/HASH settings on the foliage color, depth, and distance materials. The run had no JavaScript, console, failed-request, or WebGL errors.

## Coverage agreement

Mean absolute per-pixel alpha coverage error against the downsampled higher-resolution sample:

| LOD | Coverage | 16 px | 32 px | 64 px |
|---|---|---:|---:|---:|
| 0 | MASK | 0.212 | 0.214 | 0.108 |
| 0 | HASH | 0.055 | 0.049 | 0.031 |
| 1 | MASK | 0.166 | 0.166 | 0.139 |
| 1 | HASH | 0.093 | 0.081 | 0.063 |

In this fixed sample, HASH brought native alpha coverage closer to the downsampled sample for both LODs and all three footprints. At 16/32/64 pixels, LOD0 native coverage-equivalent pixels were 9/35/580 in MASK and 64/266/1055 in HASH. LOD1 counts were 8/36/264 in MASK and 45/204/808 in HASH. This measures alpha coverage only; the reference is not proven converged and the result is not visual acceptance.

## Movement and replay

The HASH alpha map changed more under camera yaw than the downsampled sample. Mean absolute coverage delta for each 0.5° step was 0.0225/0.0215 native versus 0.0026/0.0027 downsampled on LOD0, and 0.0313/0.0342 native versus 0.0045/0.0040 downsampled on LOD1. The MASK deltas were smaller: 0.0029/0.0049 native on LOD0 and 0.0039/0.0059 on LOD1.

At date 1.75 seconds, HASH native alpha changed by 0.0195/0.0293 mean absolute coverage on LOD0 at 16/32 pixels, and 0.0469/0.0566 on LOD1. Corresponding downsampled changes ranged from 0.0020 to 0.0036. MASK native coverage did not change at these output sizes in this sample. At dates 7 seconds and −7 seconds, both HASH and MASK maps replayed date 0 exactly at native and downsampled resolutions.

The movement result shows that HASH preserves more small-footprint coverage here while producing substantially more screen-space coverage variation than the downsampled reference. This lab has no TAA. Whether the HASH pattern looks acceptable in motion remains open.

## Limits

This uses one specimen with shadows, ground, and surrounding trees disabled. It is not full-game, headset, shadow, lighting, or performance acceptance. The 512/1024 samples are comparison references, not validated convergence. Alpha coverage does not describe leaf shading or perceptual quality.
