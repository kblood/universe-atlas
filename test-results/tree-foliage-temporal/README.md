# MASK and HASH temporal browser check

This is a standalone `tree-asset-lab.html` check of family F on ANGLE/NVIDIA GeForce RTX 5090 Direct3D11 with Chromium 149.0.7827.55. Input GLB hashes and the exact lab source snapshot are recorded in [report.json](report.json) and [baseline-source/manifest.json](baseline-source/manifest.json). The browser runner is [run.mjs](run.mjs).

## Results

- `mask` loaded foliage with `alphaTest=0.5`, `alphaHash=false`; `hash` loaded with `alphaTest=0`, `alphaHash=true`. Both modes propagated the same setting to foliage depth and distance materials. Bark stayed at `alphaTest=0`, `alphaHash=false`. Both LODs were inspected.
- At population 3, front and back views were captured for both LODs with shadows on. Wind frames were captured at dates 0, 1.75 seconds, 7 seconds, and −7 seconds with shadows off. The 1.75 second state changed rendered pixels; dates 0, 7 seconds, −7 seconds, and a repeated date 0 capture matched exactly within each mode.
- A 0°/0.35°/0.70°/1.05° camera sequence was captured at the center 16 m tree. Its changed-pixel counts compare whole 1200×900 images, so they include camera and background movement and do not measure isolated leaf noise.
- Each mode/LOD profile used population 192, 120 warm-up frames and 180 sampled frames, default wide camera, and shadows on. GPU pass p95 was 2.651 ms (MASK LOD0), 0.806 ms (MASK LOD1), 3.394 ms (HASH LOD0), and 1.171 ms (HASH LOD1). CPU tree-and-ground submission p95 was 1.0, 0.7, 0.9, and 0.9 ms respectively. These serial samples are descriptive for this lab and do not establish a broad performance difference.
- A same-input reload preserved four logical asset textures; renderer texture count stayed at six. Renderer geometry residency moved from six to four, so those counters do not establish leak-free resource lifetime.

## Limits

This did not test the game, XR, headset output, temporal antialiasing, or full-scene performance. The fixed-camera date replay is exact in this sample, but camera-difference counts are whole-frame comparisons. Small-footprint wind and movement comparison against 512/1024 render-target samples remains outstanding.

The separate [render-target probe report](render-target-probes/report.json) is retained as a failed harness attempt: its isolated setup rendered zero tree pixels in every case. Those zero-coverage numbers are invalid and are not acceptance evidence.

## Captures

The images are direct canvas captures with no diagnostic panel overlaid.

### MASK

- [LOD0 front, shadows on](mask/lod0-front-shadows-on.png)
- [LOD0 back, shadows on](mask/lod0-back-shadows-on.png)
- [LOD1 front, shadows on](mask/lod1-front-shadows-on.png)
- [LOD1 back, shadows on](mask/lod1-back-shadows-on.png)
- [Wind date 0](mask/wind-0-a.png), [1.75 s](mask/wind-1750000000.png), [7 s](mask/wind-7s.png)

### HASH

- [LOD0 front, shadows on](hash/lod0-front-shadows-on.png)
- [LOD0 back, shadows on](hash/lod0-back-shadows-on.png)
- [LOD1 front, shadows on](hash/lod1-front-shadows-on.png)
- [LOD1 back, shadows on](hash/lod1-back-shadows-on.png)
- [Wind date 0](hash/wind-0-a.png), [1.75 s](hash/wind-1750000000.png), [7 s](hash/wind-7s.png)
