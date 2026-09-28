# Thin-leaf lighting checks

Source implementation: commit `32250e5`; source hashes in each browser report
are the precise authority. Default tree loading does not install transmission.
No planetary game adoption or full-scene performance claim is made.

## Independent Luna checks

- [CPU log](node-test.log): five test cases covering the host diffuse/specular
  source contract, zero path, guarded anchors and normal declaration/order,
  input/material validation, shared uniforms, and prior hook/cache composition.
- [Tree regression log](tree-regression.log): eight existing GLB, physical-scale,
  date and impostor-shader tests run with the actual family-F GLBs; no skips.
- TypeScript checking passed (`tsc.log` is empty on success).
- The parent reran all thirteen focused tests against committed source
  `32250e5` and the actual GLBs: [final CPU log](final-cpu.log), no skips.
- [Final synthetic report](browser-final/report.json): 70 float-linear probes,
  RTX 5090/D3D11. Original versus factor zero max error is `7.45e-9` against a
  declared `1e-7` bound. Direct/environment black-base specular output is exact.
  Backlit blockers work for directional/point/spot lights. Zero normal-bias
  self-shadowing matches the non-casting fixture; `0.035` normal bias exposes
  the reviewed self-shadow problem. Auxiliary positive-light branches are
  changed-response checks, not a full conformance comparison.
- [Corrected tree report](actual-tree/family-f-corrected/report.json): both LODs,
  original and `0.35`, custom shadows and wind compile/render without recorded
  errors. At LOD0, original versus installed factor zero has zero RGBA byte
  differences for front and back views. Date 0 and 7 s share a 32-bit frame
  hash; 1.75 s differs. Four page screenshots include the lab controls; the
  numerical readbacks exclude them.

The initial tree run changed camera and sun together, so it did not test
backlighting. It is retained under `actual-tree/family-f/`; the corrected run
keeps the sun fixed and moves the camera. Initial synthetic assertion failures
are also retained: one expected exact floating-point identity and another
reversed the factor-one same-side/opposite-side expectation. They are test
harness corrections, not successful earlier runs.

## Reproduction

Serve this checkout using Vite on port 5197, then run from the project root:

```powershell
$env:ATLAS_HARDWARE = '1'
$env:ATLAS_RESULTS = 'test-results/tree-leaf-transmission/browser-rerun-1'
node test-results/tree-leaf-transmission/browser-check.mjs
$env:ATLAS_RESULTS = 'test-results/tree-leaf-transmission/actual-tree/family-f-rerun-1'
node test-results/tree-leaf-transmission/actual-tree/integration.mjs
```

Use a fresh output directory when retaining a new comparison. The tree runner
defaults to `C:/LLM/IWSDK/Assets/_assetctl/atlas-ez-family-f`; override
`ATLAS_TREE_CANDIDATE` if needed. Serialize these GPU runs.

See the [implementation/results record](../../docs/leaf-diffuse-transmission-2026-09-28.md)
and [two genuine Opus reviews](../../docs/opus-leaf-transmission-review-2026-09-28.md)
for scope, corrections and remaining limits.
