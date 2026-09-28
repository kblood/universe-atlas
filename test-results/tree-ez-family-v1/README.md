# Actual Atlas/EZ GLB browser check

Final evidence is under [the candidate F report](candidate-f-canvasfinal/report.json). Candidate F is the corrected tangent-sign revision; the earlier D/E runs remain preserved as preliminary diagnostics and are not the final result.

## Inputs and environment

- GLBs: `C:\LLM\IWSDK\Assets\_assetctl\atlas-ez-family-f\atlas-ez-oak.glb` and `atlas-ez-oak.lod1.glb`.
- The browser report records SHA-256 for both GLBs, the family manifest, and the served lab source files.
- Chromium 149.0.7827.55, ANGLE D3D11, NVIDIA GeForce RTX 5090; 1600×1000 canvas.
- Reproduce the main run from `universe-atlas-rendering` with `ATLAS_HARDWARE=1`, `ATLAS_TREE_CANDIDATE=C:\LLM\IWSDK\Assets\_assetctl\atlas-ez-family-f`, `ATLAS_RESULTS=<absolute path to a fresh review directory>`, then `node test-results/tree-ez-family-v1/run.mjs`.
- `gl-check.mjs` repeats LOD, population, and date states and polls `gl.getError()` for each state. Its 18-state result is in [`gl-check.json`](candidate-f-canvasfinal/gl-check.json).

## Results

- Both GLBs loaded with four shared texture objects and two shared PBR materials. Actual index counts were 13,806 triangles at LOD0 and 4,866 at LOD1. The browser matched all 5,320 LOD1 foliage vertices to LOD0 by leaf pivot, UV, wind weight, and position with zero position delta.
- The scalar leaf-wind values were finite, from 0.0494 to 0.8462. A 1.75 s date change changed 81,988 canvas pixels. Resetting to 0 and advancing by 7 s each reproduced the initial canvas exactly (zero changed RGB pixels).
- Six renderer profile states covered both LODs at populations 3, 64, and 192. The separate GL check covered those 18 LOD/population/date combinations; every `gl.getError()` result was clear, and there were no page errors or failed requests.
- `close-lod*-front/back-shadows-off.png` are direct canvas captures at the same close camera with shadow maps disabled. LOD1 preserves the broad tree outline and main branching, while its canopy is visibly more open and its terminal foliage is sparser than LOD0. Backlighting makes both levels very dark under the lab's fixed hemisphere fill. The leaf cards remain stylized foliage; these images do not establish naturalistic appearance.

The LOD change here is explicitly selected through the lab API. This does not test a distance-based transition, full Atlas integration, game performance, or headset rendering. The timing samples describe only this standalone scene and fixed browser/GPU configuration.

See [`report.json`](candidate-f-canvasfinal/report.json), [`date0-a.png`](candidate-f-canvasfinal/date0-a.png), [`date1750000000.png`](candidate-f-canvasfinal/date1750000000.png), [`close-lod0-front-shadows-off.png`](candidate-f-canvasfinal/close-lod0-front-shadows-off.png), [`close-lod1-front-shadows-off.png`](candidate-f-canvasfinal/close-lod1-front-shadows-off.png), and the population comparison screenshots in the same directory.
