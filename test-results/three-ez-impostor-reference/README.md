# Three.ez impostor reference baseline

This is the immutable grid-16 / 2048 baseline, captured before the optional live-include shader repair. `report.json` records GLB and source SHA-256 values, renderer identity, capture metadata, masks, probe results, and per-mode timing distributions. Reproduce with `ATLAS_HARDWARE=1 node test-results/three-ez-impostor-reference/run.mjs` from the rendering project.

Both sides of these initial probes use 2× supersampling. They do **not** measure
native distant mip behavior. The later `native-map-fix/` experiment compares
native representations with a supersampled mesh reference and a mesh-native
noise floor. Capture construction time below is CPU submission/cleanup time,
without a GPU completion fence.

`baseline-source/` preserves the original lab TS and HTML, each verified against
this report's SHA-256. The TS snapshot was extracted from the preserved Opus
input and its readiness-order fix reapplied, then matched exactly to the
browser report. Remaining source files are listed and hashed in the report.
The current lab defaults to the same unmodified reconstruction but adds
audits, an optional repair, middle mesh and native-resolution probes.

## Capture

- Candidate: `C:\LLM\IWSDK\Assets\_assetctl\atlas-ez-family-f` (`atlas-ez-oak.glb`, `atlas-ez-oak.lod1.glb`). The report records both input hashes.
- Chromium 149.0.7827.55 on ANGLE D3D11 / NVIDIA GeForce RTX 5090.
- Pinned unmodified Three.ez hemi reference revision `ca0046a49fef8f8c75745a6e49e52752ef3cf8e3`; grid 16, 2048 atlas, 128 pixels per view.
- 41 silhouette probes: 8 azimuths at elevations 0°, 15°, 45°, and 85°; top; plus 8 below-centre −5° diagnostics. Saved paired binary masks are under `masks/`.
- Near front, back, and top views were captured for both representations with direct canvas PNG readback. Each mode had 120 warm-up frames followed by 180 measured frames at a matched camera.

## Results and limits

- The proxy has 2 triangles versus 13,806 for the full mesh. The recorded two-atlas full-mip RGBA8 estimate is 44,739,243 bytes; one capture target remained retained. Capture construction took about 112 ms in this run.
- At the shared 128-pixel, 2× supersampled probe size, mean silhouette IoU was 0.96 at the horizon, 0.93 at 15°, 0.93 at 45°, 0.95 at 85°, and 0.94 at the top. The below-centre −5° views are outside the hemi reference's support and are only diagnostics.
- The 32-pixel footprint has lower IoU (0.67–0.73); the 64- and 128-pixel footprints were mostly 0.93–0.96. These are silhouette comparisons, not texture-quality scores.
- The direct-color impostor screenshots show a conspicuous repeating atlas-cell/grid artifact from front, back, and top views. The high silhouette scores do not capture that appearance failure. The full mesh does not show the grid.
- The 180-frame timing samples measured approximately 0.07 ms GPU p50 for the mesh and 0.03 ms for the impostor in this isolated lab. They are local pass timings only, not full-game performance claims.

This compares static 16 m geometry. It does not exercise Atlas wind, physical-height deformation, ground, shadows, distance-driven transitions, game integration, or headset rendering. Source materials and the proxy material are not identical; the proxy uses one roughness value.

See [`report.json`](report.json), [`front-mesh.png`](front-mesh.png), [`front-impostor.png`](front-impostor.png), [`back-mesh.png`](back-mesh.png), [`back-impostor.png`](back-impostor.png), [`top-mesh.png`](top-mesh.png), and [`top-impostor.png`](top-impostor.png).
