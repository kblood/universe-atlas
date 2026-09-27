# Review: continuous canopy and procedural tree integration (Atlas desktop realism, stage E)

**Scope.** This review covers only the source pasted at `eb06755`: `planet-forest.ts`, `planet-population.ts`, `planet-detail.ts`, `tree-species-recipe.ts` and the implementation plan. I did not open the terrain, biome, worker, renderer or hydrology files. I did not run builds, tests or the browser. I use three labels throughout:

- **[E]** Evidence: read directly from the pasted code.
- **[A]** Arithmetic estimate: derived from the constants, not measured.
- **[R]** Recommendation.

Nothing here claims test results, performance results or art acceptance.

---

## 1. Blockers and findings in the current code

Ordered by impact on the goal: continuous forest in flight, stable identity, coverage and scale.

### B1. The far layer has about 6.5% of near crown cover, and a dense disc follows the observer [E]

- Beyond `forestFootprintM âˆ’ 130` (520 m horizontal), non-representative trees fade out through `alphaHash`.
- Only `canopyRepresentative` cells (probability 0.065) remain out to 4 km.
- Those trees use the same crown size as near trees. Nothing represents the other 93.5%.
- `densityFocus: 'observer-ground'` means the 650 m full-density disc is centred under the aircraft. Between about 300 m and 3 km altitude it should appear as a dense patch travelling with you, surrounded by sparse woodland.

I have not seen this rendered. It follows directly from the code. It is the core defect that a continuous canopy must fix.

### B2. The slope test measures only one horizontal axis [E]

`update()` samples `Â±5 m` along `right` only. A slope aligned with the other tangent axis passes regardless of steepness. Any summary built on this rule inherits the hole. Fixing it changes which trees exist, so it needs an explicit habitat version (see Â§7, step 5). It must not be silently repaired inside a refactor.

The same block also allocates about 6 `Vector3`s and 2 arrays per placement sample. This is minor GC pressure in a hot path.

### B3. Selection re-enumerates the full 4.5 km disc every 40 m of ground motion [E]/[A]

- `populationCells` iterates a u/v box of half-width `3 Ã— angular`. For 4.5 km that is about 27 km Ã— 27 km, roughly 2.25M `cubeDirection` + distance evaluations [A].
- About 196k cells inside the disc get 2 string-FNV hashes each.
- About 18k survive (roughly 5.4k near + 12.4k representatives) [A]. They are returned as objects with string IDs through structured clone.
- There is one job in flight, so there is no backlog. However, at 150â€“250 m/s a new request becomes due every 0.16â€“0.27 s, so the worker may be almost continuously busy and selections go stale.
- `selectionMs` exists. Measure it at flight speed before and after the fix.

### B4. Rotation churns slots [E]

Per-instance CPU frustum culling decides membership in `wanted`. Turning in place therefore swap-removes and rewrites slots for up to 8192 representatives plus near trees. The footprint does not move, as the plan requires, but uploads occur.

A new canopy layer must not copy this pattern. It should use static per-chunk buffers with object-level culling.

### B5. Handoff has no readiness signal [E]/[A]

The placement queue drains at most 48 cells per frame within 2 ms. Nothing tells the renderer whether a region's near trees are placed. If aggregate canopy fades out on a distance rule alone, fast flight or teleport will open holes. The handoff must be gated on readiness (Â§5).

### B6. `forestCellM` is an identity input but is documented as a presentation budget [E]

- `populationCells` derives `n = ceil(2R / cellM)` and the IDs `${face}/${n}/${ix}/${iy}` from it.
- `planet-detail.ts` says these values are "never inputs to catalogue identity".

Changing it (for example for larger species) would re-address every tree. [R] Move it next to `POPULATION_VERSION` as a frozen identity constant.

### B7. Physical dimensions are read ad hoc [E]

- `cell.heightM` directly drives the scale and the culling bounds.
- Crown width is implicit in `treeGeometry`: crowns span about x âˆˆ [âˆ’0.36, 0.37] Ã— height, and the top sits near 1.03 Ã— height.
- Diagnostics hard-code `heightRangeM: [10, 22]`, `farSamplingFraction: .065` and `canopyStands: 0`. These become false the moment dimensions or canopy change.
- `forestLod()` in `planet-detail.ts` no longer matches the real LOD logic, which has hysteresis and capacity demotion.

### B8. Summaries require worker-safe terrain and habitat sampling [unverified]

I have not seen `terrain.ts` or `surface-biomes.ts`. If `terrainSampler` and `biomeClassifier` cannot run in a worker, summaries would compete for the 48 samples per frame on the main thread. By my estimate that is far too little: about 80 sampler calls per block Ã— about 2.4k blocks [A]. Verify worker safety first.

### B9. Hydrology invalidation [unverified, but important]

- Forest habitat is refreshed only when the `water` bucket changes.
- Recent commits ("background river detail finishes loading") suggest river detail arrives asynchronously.
- If that changes `sample().wet`, cached placements have no invalidation path, and trees could remain in newly resolved rivers.

Summaries must include a hydrology-detail version in their key regardless. Please confirm whether the existing forest cache has the same gap.

### B10. Terrain anchoring at distance [unverified]

Tree bases use analytical sampler heights. I cannot see how far rendered terrain tiles at 1â€“4 km deviate from them. A floating aggregate canopy would be very visible. Measure sampler height against rendered tile height at summary anchors before tuning the canopy.

### B11. Minor issues [E]

- `canopyCellM: 140` is unused.
- `canopyFootprintM` (4.5 km) exceeds `forestRadiusM` (4 km), so about 21% of far selection is discarded [A].
- Tree top height is about 1.03 Ã— `heightM`, not `heightM`. This matters for summary height contracts.

---

## 2. Target representation

[R] This preserves the existing canonical population and avoids a renderer rewrite.

| Band | Representation | Source of truth |
| --- | --- | --- |
| Near, below 110 m | Existing detailed tree, later the species asset at LOD0 | Canonical cell plus exact habitat |
| Footprint, below 650 m | Existing far tree, all present cells | Same |
| Mid/far, 520 m to 4 km | **Representatives (unchanged, 6.5%) plus crown clumps aggregating only non-representative present cells** | Block summaries using the same presence rule |
| Above 3.5 km altitude or beyond 4 km | Terrain colour (later tinted from the same summaries) | Out of scope for this increment |

**Invariant:** representatives + clumps = all present trees, and nothing is counted twice. A representative is continuous from 4 km to touchdown, as it is today. The clumps stand in for exactly the 93.5% that the fade currently discards.

---

## 3. Data contracts

### 3.1 Identity (unchanged values, made explicit)

```ts
// planet-population.ts
export const POPULATION_VERSION='surface-population-2';   // unchanged
export const FOREST_CELL_M=18;                             // moved out of PLANET_DETAIL; identity input
export const FAR_CROWN_PROBABILITY=.065;                   // single source for selection + diagnostics
export type PopulationCell={id:string;direction:V3;roll:number;heightM:number;yaw:number;distanceM:number;
  canopyRepresentative?:boolean;
  sizeQuantile:number};  // = random(key+'/height'); heightM === 10+12*sizeQuantile (legacy)
```

### 3.2 Habitat rule (one pure function shared by near placement and summaries)

```ts
// forest-habitat.ts
export const TREE_HABITAT_VERSION='tree-habitat-1';      // legacy single-axis slope, bit-identical
export type TreeHabitat={present:boolean;groundHeightM:number;wet:boolean;slope:number;forestPotential:boolean};
export function treeHabitat(cell:PopulationCell,sample:Sampler,classify:Classifier,radiusM:number,scratch:HabitatScratch):TreeHabitat;
```

### 3.3 Dimensions (the one place that turns a cell into metres)

```ts
// tree-dimensions.ts
export type TreeDimensionModel='legacy-fixed-10-22'|'species-envelope-1';
export type TreeDimensions={model:TreeDimensionModel;heightM:number;topM:number;crownWidthM:number;
  crownBaseM:number;speciesId:string|null;variant:number|null};
export function treeDimensions(cell:PopulationCell,model:TreeDimensionModel,ctx?:SpeciesContext):TreeDimensions;
// legacy: heightM=cell.heightM, topMâ‰ˆ1.03h, crownWidthMâ‰ˆ0.73h, crownBaseMâ‰ˆ0.42h (measured from treeGeometry)
```

Scale, culling bounds, the summary crown area and diagnostics must all call this function.

### 3.4 Block addressing (nested exactly in the population grid)

```ts
export const CANOPY_BLOCK_CELLS=8;   // 8Ã—8 Ã— 18 m â‰ˆ 144 m; replaces unused canopyCellM
export const CANOPY_STRATUM_CELLS=2; // 4Ã—4 strata of 2Ã—2 cells â‰ˆ 36 m
// blockKey = `${face}/${n}/b8/${ix>>3}/${iy>>3}`
// Faces with n % 8 â‰  0 have partial edge blocks; members enumerated, never assumed 64.
```

Blocks never cross face seams, because population grids are per face. The `area` Jacobian rejection is inherited automatically.

### 3.5 Summary

```ts
export const CANOPY_SUMMARY_VERSION='canopy-summary-1';
export type CanopySummaryKey={block:string;populationVersion:string;habitatVersion:string;
  dimensionModel:TreeDimensionModel;assetCoverageVersion:string;waterBucket:number;hydrologyVersion:string;
  eligibilityEpoch?:string}; // for species model: dated eligibility, not raw date
export type CanopyClump={
  anchorIx:number;anchorIy:number;  // a present, habitat-verified NON-representative member
  direction:V3;                     // exactly that member's jittered direction, never a centroid
  groundHeightM:number;             // sampled at anchor
  baseDropM:number;                 // |âˆ‡h|Â·radius to bury base on slopes
  crownAreaM2:number;               // Î£ Ï€(w/2)Â²Â·coverageFactor over present non-rep members
  topM:number;crownBaseM:number;    // area-weighted
  tint:number;memberCount:number;exact:boolean;
};
```

### 3.6 Worker transfer (packed, transferable)

```ts
type CanopySummaryRequest={type:'canopy-summary';requestId:number;seed:string;radiusM:number;n:number;
  key:Omit<CanopySummaryKey,'block'>;blocks:Int32Array /* face,bx,by */};
type CanopySummaryResult={type:'canopy-summary';requestId:number;key:Omit<CanopySummaryKey,'block'>;
  header:Int32Array;          // per block: face,bx,by,clumpOffset,clumpCount,samplesUsed
  direction:Float64Array;     // 3 per clump
  scalars:Float32Array;       // 7 per clump: ground,baseDrop,area,top,crownBase,tint,members
  anchor:Uint32Array;         // 2 per clump
  workerMs:number};
```

This is about 60 B per clump and at most about 1 KB per block [A]. The echoed key rejects stale water or hydrology results, extending the existing `requestId` pattern.

### 3.7 Asset to canopy (for later Blender integration)

```ts
type TreeLodCoverage={assetVersion:string;lod:0|1|2;projectedCoverageNadir:number;
  projectedCoverage60deg:number;crownBaseFraction:number;topFraction:number};
```

Measure these offline from the asset's own alpha and geometry. A sparse asset such as the current Blender candidate then yields a lower coverage factor. The clumps stay consistent with it automatically instead of looking denser than the trees they resolve into.

---

## 4. How regional summaries sample occupancy and terrain

[R] Per block, run the following in a worker.

1. **Hash part, exact for all members (no terrain).** For each member cell:
   - area accept
   - `roll < .76`
   - not `canopyRepresentative`
   - `treeDimensions` crown area

   This is the same hashing `populationCells` already does and is cheap.
2. **Habitat part, one stratified sample.** In each 2Ã—2 stratum that has hash-present non-representative members:
   - Choose the anchor as the member minimising `random(key+'/canopy-anchor')`. This is stable and independent of order and camera.
   - Evaluate `treeHabitat` at the anchor.
   - If the anchor is present, the stratum contributes the crown area of all its hash-present non-representative members.
3. **Adaptive refinement, which is exact at edges.** Re-evaluate every member of a stratum exactly if any of these holds:
   - Its habitat result differs from any in-block 4-neighbour.
   - The anchor is within `wetMarginM` (for example 3 m) of the water level, or is `wet`.
   - The slope is within 20% of the threshold.
   - It touches the block boundary and its anchor is in doubt.

   Each block is capped at 64 habitat evaluations. Interiors are estimated; shorelines and scarps are exact.
4. **Placement.**
   - Put the clump at a present member's own direction. When refined, choose the present member with the largest crown.
   - Never place it at a centroid, which can land in a creek between dry trees.
   - Radius = `sqrt(area / Ï€)`, clamped to about 1.2 Ã— half the stratum.
   - Base = anchor height âˆ’ `baseDropM`, so clumps are buried rather than floating.

**Avoiding false forest over water and steep slopes follows from this [R]:**

- A clump exists only where a real canonical member passed the same habitat rule.
- Boundaries are refined exactly.
- No aggregate is ever smeared across a block.
- Summaries are keyed on water bucket and hydrology version.

When the bucket changes, anchors far above both levels could be revalidated without resampling. That is only valid if `wet` depends solely on sea level, which I cannot verify from this source. Otherwise, recompute within budget.

**Optional exact upgrade [R].** When a block becomes ready (all members placed in the main-thread cache), recompute its strata exactly from cache using arithmetic only and rewrite its at-most-16 clump instances once. Placement leads the band by about 100 m (selection 750 m, band ending at 650 m), so this should happen before the fade. Measure the pop.

---

## 5. Crossfades without coverage doubling

[R] Four parts.

### 5.1 Complementary intervals, not independent dithers

`alphaHash` hashes object-space coordinates, so a tree at Î± and an overlapping clump at 1âˆ’Î± cover about `1 âˆ’ Î±(1âˆ’Î±)` of the overlap. At Î± = 0.5 that is 75% instead of 50%. Instead, use one screen-space threshold `t = IGN(gl_FragCoord.xy)` for all forest materials:

- `E` = altitude fade Ã— outer 3.7â€“4 km fade, the same function for all layers
- `a` = near-handoff factor: 1 inside 520 m, 0 beyond 650 m, same smoothstep
- non-representative tree kept if `t < EÂ·a`
- clump kept if `EÂ·a â‰¤ t < E`
- representatives kept if `t < E` (unchanged role)

The intervals are disjoint, so their union is exactly `E` wherever both overlap. Pairing is statistical because the tree and its clump are within about 25 m, not identical. Screen-space dither will crawl during motion, but only inside the 130 m band. Without MSAA in the scene capture I would accept that for now. Bump `customProgramCacheKey` to `forest-coverage-2`.

### 5.2 Readiness gates the handoff per block

Track per block: pending non-representative members in `wanted` whose resident is missing or water-stale.

- **Block not ready:** clump instance flag `handoff = 0` (clump at `E`), and near non-representative trees of that block are not drawn.
- **Block ready:** use the complementary rule above.

Coverage is then always present and never doubled. The cost is that the first near trees of a block appear only once its 64 members are placed. Placement is distance-sorted, so this should be brief. Measure it.

### 5.3 Clump fade computed in the shader, not per frame on the CPU

- Each clump stores a static `dirRelChunk = anchorDir âˆ’ chunkAnchorDir` (f32).
- Each chunk has a uniform `groundRelChunk = groundDir âˆ’ chunkAnchorDir`, computed in Float64 on the CPU.
- `horizontal = |dirRelChunk âˆ’ groundRelChunk| Â· r` matches the existing CPU `Math.hypot(...) Â· r` metric without float32 cancellation.
- This gives zero instance writes during stationary views, rotation and ordinary flight.

### 5.4 Chunked static buffers

- 8Ã—8 blocks per chunk (about 1.15 km).
- One `InstancedMesh` per chunk, with instances computed once in the chunk frame and the object position updated on forest-origin rebase.
- Object-level frustum culling with `computeBoundingSphere` after build.
- Dirty ranges only when blocks arrive.
- The clump material must go through the shared aerial-perspective hook, or far clumps will not haze like terrain. The hook count should rise by one; assert it.

---

## 6. Budgets

All values are **proposed starting values** to be replaced by measurements.

| Item | Proposed budget | Basis |
| --- | --- | --- |
| Summary worker | Separate worker; 1 job in flight; â‰¤64 blocks per job; target â‰¤8 ms worker time per job | Keeps selection latency unaffected |
| Habitat evaluations | About 16â€“80 per block (anchors plus refinement), â‰¤64 member evaluations | Estimate; measure the refinement rate on the valley fixture |
| Summary cache | â‰¤4096 blocks packed, about â‰¤4.5 MB; evict farthest first; key per Â§3.5 | [A] |
| Transfer | â‰¤64 KB per job, transferables only | [A] |
| Resident clumps | Desktop â‰¤32k, immersive â‰¤8k; about 38k worst case if the annulus is fully forested | [A] 49 kmÂ² annulus Ã· 144Â² mÂ² Ã— 16 |
| Clump geometry | Dome of 24â€“48 triangles; about 0.5â€“0.7M triangles if about 15k are visible | [A]; measure GPU with existing profiling |
| Draws | About 12â€“20 visible chunks | [A] |
| Main-thread apply | â‰¤1 ms per frame; chunk builds split across frames | Needs a `summaryApplyMs` metric |
| Uploads | 0 B per frame for the clump layer when stationary, rotating, or moving within cached blocks | Testable (Â§8) |
| Block-cached selection (B3) | Enumerate per 8Ã—8 block once and cache; per-move selection only gathers blocks | Should cut worker CPU per move to near zero; verify with `selectionMs` |

---

## 7. Migrating to physical species dimensions without changing world addresses

**World address** = `(seed, POPULATION_VERSION, face, n(R, FOREST_CELL_M), ix, iy)`. This fixes the direction, yaw, roll, representative flag and `sizeQuantile`. None of these may depend on species.

[R] Steps:

1. **Expose the stored quantile.** Add `sizeQuantile` to the cell. Legacy `heightM = 10 + 12Â·q` stays bit-identical, and a test enforces it.
2. **Add the species dimension model.** `species-envelope-1` computes:
   - `species = bindTreeSpecies(cell.id, eligible(region, eligibilityEpoch))`. Binding uses the cell ID only, never roll or height.
   - `variant = treeInstanceAppearance(recipe, cell.id).variant`
   - `h = treeStructuralVariant(recipe, variant).heightM Ã— lerp(0.7, 1.0, q)`

   The age/size mapping is an **art/ecology heuristic** and must be documented as such.
3. **Keep the model a presentation setting.**
   - Default `legacy-fixed-10-22` until the art is accepted.
   - Report it in diagnostics and pixel-baseline keys.
   - Include it in the summary key, so summaries never mix models.
4. **No density coupling in the renderer.** Species larger than the 18 m spacing will interpenetrate. Report a crown-overlap metric. Do not thin or clamp silently: thinning changes presence, so it needs an explicit `TREE_HABITAT_VERSION` or population decision with before/after digests.
5. **Missing eligibility API.** A bounded, worker-safe `eligibleTreeSpecies(body, epoch, biome)` query does not appear in the pasted source. It is a prerequisite for this step.
6. **Small note in `tree-species-recipe.ts`.** `branchSeed` excludes `sourceFingerprint`, while the geometry cache key includes it. That is probably intentional (stable branching under trait tweaks). Document it either way.

---

## 8. Implementation order and focused tests

### Step 1 â€” next small safe increment: no visual change

Scope:

- Extract `treeHabitat` in legacy form, bit-identical and allocation-free.
- Add `sizeQuantile`, `FOREST_CELL_M` and `FAR_CROWN_PROBABILITY`.
- Add `treeDimensions` with the legacy model.
- Derive diagnostics from constants and the model.

Tests:

- `presence-digest`: the digest of `(id, present, groundHeight)` over fixture seeds and directions equals the pre-refactor digest, following the flora 960-result pattern.
- `size-quantile-identity`: `heightM === 10 + 12Â·sizeQuantile` for all enumerated cells.
- `legacy-dimensions`: legacy scale and bounds equal the current values bit for bit.

### Step 2 â€” block-cached selection (performance, no visual change)

Tests:

- `block-nesting`: every cell maps to exactly one block; partial edge blocks at a face seam where `n % 8 â‰  0` are correct.
- `selection-equivalence`: gathered cells equal `forestPopulationCells` (IDs, directions bitwise, flags, sort order) for fixture centres, including a cube corner.

### Step 3 â€” summary module and worker; diagnostics only, not rendered

Starts by verifying worker safety of the sampler and classifier (B8).

Tests:

- `summary-determinism`: identical output regardless of block order, cache state, or worker versus in-thread execution.
- `summary-accounting`: with habitat forced true, Î£ clump members + representatives = hash-present count.
- `summary-water`: synthetic water plane. No anchor is wet; a fully wet block has zero clumps; changing the bucket or hydrology version changes the key.
- `summary-slope`: steep synthetic plane gives zero clumps. Under `tree-habitat-1`, a steep slope along the unsampled axis still passes. That records B2 as a known defect rather than hiding it.
- `summary-estimator-bias`: on synthetic noisy terrain, report estimated versus exact crown area per block. Set the tolerance after the first measurement.

### Step 4 â€” clump renderer behind `forestCanopySummaries` flag, default off

Covers chunks, the shader fade, complementary intervals, readiness gating and the aerial-perspective hook.

Tests:

- `handoff-intervals`: a CPU mirror of the shader shows that for every `t` and `(E, a)`, exactly one of tree or clump passes within `[0, E)`.
- `readiness-gating`: a block that is not ready suppresses its near non-representative trees and holds the clump at `E`.
- `clump-zero-upload`: warmed stationary frames and camera rotation give 0 bytes for the clump layer.
- `rebase-invariance`: clump world positions are unchanged across rebases, within 1 mm.
- `aerial-hook-count`: the clump material is registered with the shared aerial-perspective hook.
- **Browser coverage parity** (for Luna): at fixed poses (300 m, 1 km, 3 km altitude, clear midday and grazing sun), compare the foliage pixel fraction per screen tile for representatives + clumps against a brute-force reference that draws all canonical trees. Also run Aâ†’Bâ†’A flight and fast traversal. This is evidence for tuning, not art acceptance.

### Step 5 â€” `tree-habitat-2`: two-axis gradient slope

An explicit version bump in its own commit, with the digest delta recorded.

### Step 6 â€” `species-envelope-1` behind a setting

Test `dimension-model-identity`: switching the model changes no `id`, direction, yaw, roll, representative flag or presence. Only dimensions, and summaries keyed by model, change.

### Step 7 â€” asset integration

Only after the Blender tree family passes brief, provenance, technical and visual review. `TreeLodCoverage` must be measured for each LOD.

---

## 9. Open items I cannot resolve from this source

- Worker safety of `terrainSampler` and `biomeClassifier` (B8).
- Whether asynchronous river detail changes `wet` without forest cache invalidation (B9).
- Rendered terrain tile height error at 1â€“4 km (B10).
- Actual `selectionMs`, `placementMs` per cell, and GPU cost of the added clumps. Every performance number above is arithmetic, not measured.
- The discontinuity from forest to terrain colour at 3.5 km altitude and at the 4 km horizon remains. Tinting terrain from summaries is a later stage.

If useful, I can write this up as `docs/opus-5.5-canopy-review-2026-09-28.md` alongside the earlier review records, or start on step 1.
