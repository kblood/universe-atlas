# Tree browser prototype — 2026-09-28

This implements the first browser adapter for the [v6 tree](tree-authoring-v6-2026-09-28.md).
It is a development laboratory, not the planetary forest replacement. No GLB
or texture is installed in the game or added to the website by this increment.
The desktop realism goal remains active.

## Run and inspect

Run `npm run dev`, open `/tree-asset-lab.html`, then select
`atlas-branching-v1.glb` and `atlas-branching-v1.lod1.glb` from the retained
`Assets/_assetctl/atlas-tree-smoke-1790570381707` candidate at the tool repository
root. The file inputs read ArrayBuffers locally; there is no upload endpoint.
The lab is deliberately absent from Vite's production entry list while the
assets remain unaccepted. It shows three scale specimens or 64/192 trees,
manual LOD selection, nanosecond date input, and optional leaf animation.

## Implemented

- `src/tree-asset.ts` checks two self-contained, untransformed GLBs against the
  two-material authoring contract. Attribute names, component types, counts and
  alpha-mask mode are explicit requirements. Extra vertex colours or normalized
  branch levels cannot silently change the shared material's shader variant.
- Material descriptors, sampler/texture records and all four embedded PNG byte
  streams must match. LOD0 images are decoded once. LOD1 parses geometry with
  texture-free placeholder materials, then reuses the LOD0 materials. Its unused
  PNG bytes remain in the temporary GLB buffer but never become decoded images.
- Two instanced primitives per LOD share bark/foliage materials. Each batch owns
  its cloned geometry and instance buffers. This bounds ownership for this
  prototype; it is not the eventual multi-species geometry cache.
- Instance matrices carry rotation, translation and a positive uniform
  metres-to-scene scale. Skeleton height is a separate shader parameter. Wood
  and leaf attachment positions scale with it; offsets within a leaf card do
  not. The 10/16/22 m controls specify skeleton scale relative to the 16 m
  reference, not a guarantee that the fixed leaf tips end at exactly that height.
- Leaf flutter is a rigid rotation about each exported attachment pivot, with
  normal and tangent rotation. It uses an exact BigInt seven-second remainder
  and a bounded instance phase. This is local leaf flutter, not coherent wind
  bending the branches. Directional-depth and point-distance materials use the
  same deformation and alpha cutoff.
- Sequential instance initialization prevents uninitialized leaf cards at the
  origin. Explicit count truncation removes trailing slots. Nonuniform, mirrored
  or sheared matrices are rejected. Batches must be disposed before their family.
- Lab loading prepares and attaches the next family before committing the swap;
  failures during preparation leave the previous family available.

## Measurement contract

The lab uses ACES exposure 1.2, a directional sun at intensity 3, hemisphere
light at intensity 1, and PCF shadows. This is a controlled scene, not the full
game's atmospheric lighting. Resource identity does not itself prove a GPU
performance improvement.

Diagnostics distinguish PNG container bytes from an estimated RGBA8 allocation
including mip levels. Four uncompressed source maps occupy about 53.3 MiB with
mips; texture compression is still pending. Renderer texture counts include
shadow targets; geometry counts include only uploaded objects. Two shared PBR
materials and the per-batch shadow materials are counted separately.

The lab explicitly resets renderer counters before each frame with automatic
reset disabled, so reported draws/triangles include both shadow and main passes.
CPU submission timing is separate from nonblocking GPU timer queries. The
existing `RenderProfile` records bounded histories, rejects disjoint queries
and polls completion later. Laboratory cost is not a 1440p/60 FPS game claim.

## Review and validation

[Genuine Opus 5.5 reviewed the initial source](opus-5.5-tree-browser-review-2026-09-28.md);
[metadata](opus-5.5-tree-browser-review-2026-09-28.metadata.json) records the input
hashes and returned model identity. Its gap-slot, attribute-format, alpha-mode,
counter-label and loading-transaction findings led to the changes above.

One review assertion needed correction: the installed `super-three@0.181.0`
renderer resets counters **after** rendering shadows by default. The initial
lab's counters therefore excluded shadows. Explicit reset control now makes
the combined-pass meaning unambiguous. The installed shadow implementation
uses `RGBADepthPacking`, matching the adapter.

Independent Luna validation passed against runtime checkpoint `c7dee40`:

- [Five CPU tests](../test-results/tree-asset-lab-v6/cpu-test.log) with the retained v6 GLBs: texture/material identity, geometry
  descriptor preservation, malformed format rejection, physical leaf transforms
  and exact wind phase at negative and universe-end dates.
- Chromium, RTX 5090, ANGLE D3D11, 2560 × 1440: both LODs at 3, 64 and 192
  trees, no browser/shader/request errors. Four textures and two PBR material
  objects are shared across LODs. The frame also has shadow render targets.
- Actual directional and point-light shadow rendering, batch gap/scale/count
  validation, failed scene-attachment rollback and successful reload passed.
  Hook inspection and CPU reference tests are not GPU transform-feedback proof
  that every transformed vertex is correct.

| Trees | LOD0 GPU p50 / p95 | LOD1 GPU p50 / p95 |
| --- | --- | --- |
| 3 | 0.286 / 0.326 ms | 0.296 / 0.324 ms |
| 64 | 1.518 / 1.578 ms | 1.237 / 1.309 ms |
| 192 | 2.188 / 3.777 ms | 1.747 / 2.961 ms |

Each scenario has 179–180 valid timer samples following 120 warm-up frames;
no disjoint/skipped queries. These are controlled lab rendering costs including
ground and directional shadows, with six draws. CPU submission p50 was about
0.1–0.2 ms. No game, midrange hardware or headset performance follows from this.

The [browser receipt](../test-results/tree-asset-lab-v6/report.json) records the
source revision, actual renderer, individual scenarios and limitations.
[Three scale specimens](../test-results/tree-asset-lab-v6/lod0-population3.png)
show root contact and cast shadows;
[192 trees](../test-results/tree-asset-lab-v6/lod0-population192.png) show the
overlapping crowns at the chosen camera. Visual inspection finds dark foliage
and repeated crown shapes. This is technical prototype acceptance, not final
artistic acceptance. Lighting isolation is the next diagnostic step.

## Next integration gates

The actual browser screenshots, alpha-card appearance and shadow stability need
inspection. Profile both LODs at the three population sizes. A matching LOD2,
alpha-preserving mip coverage, shared-atlas structural variants, species colour
binding, coherent wind, conservative world bounds/culling, explicit cache
budgets, collision, packaging/license resolution and whole-game performance
remain open. Do not substitute the near tree while leaving an unrelated far
canopy silhouette and call the transition finished.
