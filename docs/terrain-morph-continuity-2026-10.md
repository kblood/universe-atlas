# Terrain morph continuity, first increment of #23 LOD-HORIZON (2026-10)

Branch `presentation/terrain-morph`, from main `7419733`. Rendering only.
Source findings: `docs/transition-audit-2026-10-07.md` F1 (terrain tile LOD) and F4 (shadow-window edge).
Every decision here is **Opus-decided on Kasper's instruction, overrulable.**

## Status, read this first

- **Everything is behind `PlanetRendererOptions.presentationContinuity`.** `main.ts` already turns it on; `?continuity=0` is the A/B.
  With the option off, every output is byte-identical: `terrain-leaf-loop-digest` (reference `5ad62a6`), `life-cpu-digest` (`e6a0b39`) and `planet-forest-frame-digest` are green and unedited.
- **Nothing was rendered.** No browser and no GPU were used; the GPU belonged to R1. Audit renders R1, R2, R3 and R6 are **NOT RUN**.
  The tests below check the drawn geometry and the shader formulas on the CPU. They are not a visual verdict.
- **No timing or cost was measured** (CPU protocol: shared slot only, no benches). See "Deferred".

## What changed

| Step | Audit item | Change | Where |
|---|---|---|---|
| 1 | F1.3 rebuilt tile re-morphs | A replacement patch for a tile already in the leaf set (water-bucket rebuild, retry) inherits the morph clock of the patch it replaces. | `planet-renderer.ts` `install` |
| 2 | F1.2 merge regrows from the grandparent | A merge is a reverse morph (`deferMerges`). The four children stay drawn and morph back to 0, which is the parent's own shape. Then the parent enters at morph 1. The visible sequence is fine → parent, never fine → grandparent → parent. | `planet-renderer.ts` `deferMerges`, `unbalancedMerge` |
| 3 | F1.4 linear ramp | Each patch keeps a linear clock (0..1 over 0.22 s). The `patchMorph` uniform carries `smoothstep(clock)` (`easeTerrainMorph`). | `planet-renderer.ts` leaf loop |
| 3b | F1, edge flips | Fractional edge locks: an edge toward a same-level leaf follows that leaf's morph (`1 - morph`), so it no longer flips its 0/1 lock in one frame. | `planet-renderer.ts` restitch |
| 4 | F1.1 normals/colour | **Not implemented.** Design note below. | — |
| 5 | F4 hard shadow-window edge | The receiver fades the shadow out over the outer 36 m of the ±160 m window (22.5 % of the half-width). The weight is exactly 0 at the frustum edge and exactly 1 inside ±124 m. | `surface-lighting.ts`; installed by `PlanetRenderer` |

### Details and decisions

- **Easing lives in the uniform, not in the GLSL.** The brief asks for the same easing in the shader (`patchMorphVertex` and every material using it) and in the CPU replica of the drawn height.
  The terrain colour, terrain depth and ocean materials all share one `patchMorph` uniform object per patch, and `renderedGroundHeightM` reads the same object.
  So the eased value is written once, on the CPU, and all of them draw `mix(parent, position, eased*(1-lock))`.
  `patchMorphVertex` and the ocean shell are unchanged, which also keeps the option-off shader text identical.
- **The CPU replica now uses the shader's lock rule.** That rule is `lock = max(edge locks through the vertex)`, `blend = morph*(1-lock)`.
  With 0/1 locks this is the former rule exactly, so option-off heights do not move.
- **Merge rules (`deferMerges`).**
  - A merge is deferred only when all four children are current leaves and are resident. Otherwise the selection's merge stands as before.
  - A selection pass that re-chooses a pending merge keeps it pending.
  - The merge is cancelled, and the children morph forward again, when a child is split or leaves the frontier, or when the parent would complete beside a leaf more than one level finer (2:1 rule).
  - Under terrain byte pressure, the children of a pending merge count as freed bytes, so pressure does not merge further parents for the same bytes.
- **No split while morphing.** A non-mandatory leaf whose morph is below 1 is not split. Its children would start from its full shape and pop by the unfinished part of its morph.
  The split's tiles are still requested, so the split happens on the first pass after the morph ends. Mandatory contact support is exempt.
- **Contact hand-off waits for fractional locks.** Contact geometry (`terrain-contact.ts`) mirrors only 0/1 locks, so `contactPatches` treats a patch with a fractional lock as still morphing.
- **Shadow fade installation.** `installShadowWindowFade()` patches `THREE.ShaderChunk.shadowmap_pars_fragment` once per page. It is global, idempotent and one-way.
  - `getShadow` returns `mix(1, shadow, shadowIntensity * atlasShadowWindowFade(shadowCoord.xy))`. Point shadows are untouched.
  - `PlanetRenderer` calls it only when the option is on. That happens before any shadowed program compiles: the sun casts only under `SurfaceLighting`, which needs planet tiles, and `ShadowProgramWarmup` warms those tiles' programs.
  - If three's chunk changes shape, the patch throws instead of silently dropping the fade.
  - Spot-light shadows share `getShadow`. Only labs use them, and those labs construct no `PlanetRenderer`.

## Step 4: parent normal and colour blend (design note only)

- **Normals: not done.** The brief allows it only without a `planet-tiles.ts` change, and the tile data carries no parent normals. `buildTile` returns `normals` for the tile's own vertices only.
  There are two ways to get them on the main thread, and neither is sound enough:
  - Derive them from the `parents` grid by finite differences. These grid normals differ from the analytic normals that the parent patch draws, so the merge swap would step the shading.
  - Sample the resident parent patch's `normals` at the child vertices. The parent is not guaranteed to be resident (eviction, a rebuild of the child alone), and a merge would then need the grandparent's normals.
  - **Proper fix (LOD-HORIZON):** have `buildTile` emit a `parentNormals` attribute next to `parents`, a `planet-tiles.ts` change. Then add `objectNormal = normalize(mix(parentNormal, normal, patchBlend))` in the terrain colour material.
- **Colour.** Each patch has its own colour `DataTexture`. A blend needs the parent's texels in the child: either a second sampler bound to the parent patch's map (not always resident, same problem as above), or the parent colour baked into the child's map as a second layer by the tile builder.
  The audit's measured figures (cross-level RGB p99 33.8 at L6→7, 5.2 at L8→9) remain the size of this item. Leave it for LOD-HORIZON proper with the per-patch parent textures.

## Tests

- `tests/terrain-morph-continuity.test.mjs` drives the real `PlanetRenderer` leaf loop with an in-process tile builder and a fixed dt of 1/60 s.
  The route is settle → descent from 6000 m to 600 m (splits) → sea-level seek (every resident leaf is rebuilt) → climb to 20 000 m (merges).
  It runs once with the option on and once with it off. Checks, each with its negative case (option off):
  - **Per-frame displacement.** Every vertex of a patch drawn in two consecutive frames moves at most `k·dh·dt/0.22`, where `dh = |position − parentPosition|`.
    k is 1.5 inside a patch (smoothstep's peak slope) and 3 on an edge (two eased morphs multiply).
  - **Rebuilt patches.** A rebuilt resident patch keeps its morph and moves no more than its rebuilt data did.
  - **Sample jumps.** Where the drawn tile under a fixed ground direction changes, the surface jumps by no more than the coarser tile's own morph amplitude (its parent-to-grandparent difference).
    The split allowance is `(1 − morph_P)·amp_P + 1.5·dt/0.22·amp_K`. The merge allowance is the cross-level data mismatch only.
  - **Merge order.** A merge is a reverse morph: the children leave at morph 0 and the parent enters at morph 1.
  - **Easing.** The first and last morph steps are below a quarter of the linear step.
  - **CPU replica.** `renderedGroundHeightM` equals the shader formula, transliterated and pinned to the GLSL text of `patchMorphVertex` and the ocean shell.
    Negative: the former 0/1 lock rule disagrees on fractional edges.
- `tests/shadow-window-edge-fade.test.mjs`:
  - **Edge weight.** A pose sweep of real `SurfaceLighting` frusta (renderer units 1e-6 to 10, rebased origins, low and near-polar suns). The weight is ≤1e-12 at every edge point (exactly 0 at coordinate 0/1), exactly 1 inside ±124 m, and monotone across the band.
  - **Constant.** The GLSL constant equals the CPU mirror.
  - **Chunk patch.** It changes only `getShadow` and is idempotent.
  - **Option gate.** The fade is installed only with the option on.
  - Negatives: three's own chunk, and a constant weight.

Scenario figures from the morph test, option on vs off:

| | on | off |
|---|---|---|
| splits | 376 | 448 |
| merges | 21 | 27 |
| replacements | 69 | 80 |
| max split jump | 10.7 m | 929 m |
| max merge jump | 2e-6 m | 0.71 m |
| violations | 0 | 165 vertex, 130 replace, 217 jump, 27 merge entry, 448 ease |

The sample merges occur at L11–L14, where the morph amplitudes are centimetres to metres. Large-amplitude merges (L6–7, height p99 651 m in the contract) are not exercised by this route. Splits are exercised from L2.

## needs:

- **needs: package.json / tier registration (merger).** Add `tests/terrain-morph-continuity.test.mjs` and `tests/shadow-window-edge-fade.test.mjs` to the `npm test` list and to `tests/tier-sets.json`. `test:affected` reports both as UNREGISTERED.
- **needs: GPU renders (gate lane).** Audit renders R1, R2, R3 and R6 with `?continuity=1` vs `?continuity=0`.

## Deferred (not measured, by protocol)

- The CPU cost of `deferMerges`, the pre-pass that advances morphs and the fractional restitch.
- The extra selection passes while splits wait for a morph (`selectionDirty`).
- The fragment cost of the shadow fade.
- Whether the 0.22 s ramp should become distance-driven (audit F1 proposal). This is left for LOD-HORIZON proper.
