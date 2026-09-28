# Opus 5.5 near/far family review

Model: claude-opus-5-5
Provider: firstParty
Review run ID: 8d4a1215-0387-4ab7-a99f-65a395062308

# Review: closing the near/far tree family mismatch with the existing analytic proxy

## Evidence notes (observed)

- **Close capture.** Detailed Oak and Pine trees are dark green. Oak crowns are open and Pine is sparse. On the far ridge, lighter rounded masses are visible behind them.
- **390 m capture.** Every tree reads as a uniform yellow-green "lollipop". Nothing in this frame looks like Oak or Pine. It is input evidence of the mismatch, not a measurement of it.
- **The report was captured against different source.** Its hashes for `planet-forest.ts` (`f877…`), `planet-canopy.ts` (`4920…`) and `forest-tree-catalogue.ts` (`b188…`) differ from the snapshots you supplied (`d9fa…`, `9c10…`, `11fe…`). Only `tree-asset.ts` matches. So the capture predates the uncommitted worklist/broadphase code, and nothing in it validates that code.
- **What the report does contain.** `glError: 0`; date replay matched 32 IDs with no mismatches; submitted counts were branching `[28,262]` and spire `[51,411]`; both families used offline sidecars (level 7, 5,592,064 B). Base foliage alpha coverage is **Oak 0.190 and Pine 0.046**. Pine's texture is about 4× sparser, which matters for far density. None of this shows a family match.

## 1. Trace and divergence (observed)

**Species binding (near only).**
- `forestTreeCatalogue` filters branching/spire trees and sorts by ID. `resolve(cellId)` then calls `bindTreeSpecies` (rendezvous hash) and `treeInstanceAppearance` (`src/forest-tree-catalogue.ts:6-16`, `src/tree-species-recipe.ts:~27,~76`).
- `PlanetForest` refreshes the catalogue only while families are loaded (`src/planet-forest.ts:324`). It caches bindings per `Resident` object and bumps `catalogueVersion` when the signature changes (`:198-203`).

**Detailed family and height.**
- `detailEntry` (`src/planet-forest.ts:258-262`) requires three things: `assetDraw`, `cell.heightM` in 10–22, and `recipe.family` having a loaded entry.
- `writeDetailed` (`:263-277`) consumes only the following:
  - canonical `cell.heightM`, uniformly scaled by `/16` in the shader;
  - `yaw`;
  - `windPhase01`;
  - grey `barkBrightness`/`foliageBrightness`.
- These recipe fields are **not** consumed: `crownWidthM`, `treeStructuralVariant`, `appearance.variant`/`textureVariant`, `barkSRGB` and `foliageSRGB`. Near colour is the texture albedo times a grey multiplier. Diagnostics honestly report `heightPolicy:'canonical-population-proxy'`.

**Far proxy.**
- The census worker has no catalogue. `PlanetCanopy.install` rebuilds the same canonical ID string and writes `renderer.write(index,pos,r[5],rot,r[4],r[7])` (`src/planet-canopy.ts:182-189`).
- `write` stores `parameters=(roll, ground, 0, seed)` (`src/forest-impostor.ts:225`). **`parameters.z` is written as 0 and read nowhere.**
- Shape is the fixed `LEGACY_TREE_LOBES`. Colour is a lobe-height yellow-green times a roll tint (`:157-160`, `:188`).
- The billboard quad (`:130-142`), `observeClose` and the `PlanetForest` culling sphere (`:429-433`) all use `LEGACY_TREE_BOUND`.

**Where the paths diverge.**
- Species, family, tint and shape exist only on the near side. The far side shares only ID, yaw, root and height.
- `canHandoff` (`src/planet-canopy.ts:277-282`) compares `heights[index]`, which is **ground height `r[7]`**. Nothing checks that census tree height `r[5]` equals `cell.heightM`, and nothing checks family.
- Legacy canopy representatives (batch 2, `:~450`) are a third legacy representation.

**Heuristics or incomplete facts.**
- Trunk diameter ratio, the structural-variant ranges, and brightness ranges are heuristics.
- The census rejects any `r[5]` outside 10–22 (`src/planet-canopy.ts` record validation). In practice, then, the far population never has an unsupported height. The only real fallbacks are an unbound cell (empty catalogue) or a family that isn't loaded.

## 2. Deriving family parameters (recommendation)

The far proxy should match **what the near path actually renders**, not what the recipe says. If you feed `crownWidthM`, structural variants or `foliageSRGB` into the far proxy while the near ignores them, you create a new mismatch. Change both sides together later.

**Resolve these once per family, at load, inside `loadTreeAssetFamily`.** This extends the existing `maxRadiusM` vertex pass in `src/tree-asset.ts`, which already visits every vertex with `_branch_level`/`_leaf_pivot`.

- **`crownProfile`.** Take foliage pivots (branch level > 3.5), normalised by `TREE_REFERENCE_HEIGHT_M`. From them derive:
  - crown base and top y;
  - the 90th-percentile radius in 4 height bands, plus the 0.6 m metric half-card as a constant margin;
  - trunk height fraction.
  
  This gives a conservative envelope at 4 × vec4, and it is height-proportional because near wood scales by `h/16`.
- **`foliageAlbedo`.** Use the alpha-weighted linear-RGB mean. The sidecar's level 7 is already that mean per atlas cell. Fall back to a decoded mean of the base PNG when no sidecar is present.
- **`barkAlbedo`.** Mean of the bark base-colour texture. The PNG is decoded anyway.

Expose these on the returned family object. No new catalogue and no date model are involved. **Per tree, reuse only** `catalogue.resolve(id)` → `recipe.family`, `appearance.barkBrightness` and `appearance.foliageBrightness`, called from the same `PlanetForest.catalogue` instance. Pass that instance into `PlanetCanopy`; don't construct a second one.

## 3. Minimal runtime change (recommendation)

**1. Shared predicate.** In `PlanetForest`, add `farPresentation(id, heightM)`. It returns 0 (legacy) unless all of these hold:
- families are loaded;
- `heightM` is in 10–22;
- `catalogue.resolve(id)?.recipe.family` has a loaded entry.

When they hold, it returns the family code (1 branching, 2 spire), packed with quantised brightness: `code + 4*leafQ + 1024*barkQ`, which stays under 2^18 and is exact in f32. Have `detailEntry` call the same predicate, minus `assetDraw`, so the two decisions can't drift. Hand `PlanetCanopy` the resolver and a `presentationVersion`, which is `catalogueVersion` combined with the library replacement serial.

**2. Canopy install and retag.**
- `install` writes the code into `parameters.z` through an extra `write` argument.
- `Installed` gains `presentation:number`.
- When the version changes, start a bounded retag iterator over `installed` using the existing `reuse` pattern (512 trees / 2 ms). It calls a new `renderer.setPresentation(index, code)` that marks `staticDirty[2]`.
- `canHandoff` also requires `patch.presentation === presentationVersion`. Stale patches therefore stay near-owned inside 550–600 m rather than showing a wrong-family partner.

**3. Shader.**
- Decode `treeData.z` in the vertex shader into a `flat` family/tint.
- Family 0 keeps today's lobes and colour exactly.
- **Branching** reuses the legacy lobes, scaled per band by uniform profile ratios.
- **Spire** uses 2–3 stacked cones generated by the existing `convexShader` from `THREE.ConeGeometry`. This is the same generator, not a new system.
- Colour is `familyAlbedo × brightness`. Keep the roll tint only for family 0.
- Store per-family bound centre/extent as uniforms. The quad (`:130-135`) selects by family, and `observeClose` and the CPU culling sphere use the **union** bound.
- Bump `customProgramCacheKey`.

**Unchanged:**
- IDs, positions, `r[5]` height and yaw;
- `parameters.y` water test (`:127`), which is independent of presentation;
- ownership/seed (`.w`);
- `replacePositions`, which touches positions only, so rebase needs no invalidation;
- shadows: the impostor sets no `castShadow` today, so the proxy casts none and near-casters stay the only shadow source.

**Fallback.** Cells with no binding or no loaded family stay on legacy code 0. Their near representation is also legacy, so they stay consistent. A "fitted" proxy for them would create a new mismatch.

**Invalidation triggers:**

| Trigger | Action |
|---|---|
| Catalogue signature change | Bump version, retag |
| Family replace or clear | Bump version, retag |
| Identity/install | Write fresh on install |
| Water | None (shader handles it) |
| Rebase | None |
| Body change | Existing reconfigure/reinstall |

## 4. Budget and tests

**Budget.**
- No new attribute. `parameters.z` is free, and the current one-draw, static-attribute setup is sufficient.
- CPU: one `resolve` per installed tree, costing N species hashes, inside the existing 512-tree install budget.
- A full retag of the observed 155,830 trees runs in 512-tree slices. At 55 ms frames that is about 300 slices, roughly 16 s. Upload is at most `229376×16 B ≈ 3.7 MB` over that window.
- GPU: a flat per-instance branch picks one lobe set. There is divergence only across instance boundaries within a warp. Cone planes are fewer than icosahedron lobes.
- Family profile: under 200 B of uniforms per family. No per-frame GLB work.

**Tests:**
1. Predicate parity. Over random IDs, `farPresentation` equals the `detailEntry` family for these cases: empty catalogue, Oak-only, both families, and a signature change.
2. Install with a fake catalogue. The decoded `parameters.z` matches `resolve(id)` family and quantised brightness, and the recipe `sourceFingerprint` matches `detailedSamples()`.
3. **Height identity.** For shared IDs, census `r[5] === cell.heightM`. Also consider adding a tree-height check to `canHandoff`.
4. Retag. Retag stays bounded per frame. `canHandoff` is false until the patch is retagged, and clearing families returns every code to 0.
5. Rebase. `parameters` are unchanged after `replacePositions`.
6. Water. Codes are unaffected, and the existing submersion tests still pass.
7. Capacity misses. Codes are never read from retired slots.
8. Profile extraction from the real Oak/Pine GLBs is deterministic, and the union bound contains the envelope at 10 m and at 22 m.
9. Browser, matched pose and date, families on vs off. Take per-ID near/far captures across the 550–600 m band and at 390 m, and record `farForcedClose`.

## 5. Still unproven

- A convex envelope is not a realistic silhouette. The Oak's open, lumpy crown and Pine's 4.6 % coverage will read denser as solid facets. Porosity (hashed coverage) is a follow-up that carries shimmer risk.
- Tint means are an approximation; lighting differs between Lambert and textured PBR with transmission.
- Nothing here shows biome breadth, performance (frames are already about 55 ms p50), XR, or whole-game acceptance.
- Mip acceptance records upload and GL success only. The family transition remains pending.
- Batch-2 legacy canopy representatives still need the same code path, or suppression, once paired.

## Highest-risk correctness gap

The far family would be computed by a second caller from a lagging catalogue/library snapshot, while `canHandoff` verifies only ID and **ground** height. That allows wrong-family or wrong-height pairs to cross the ownership boundary silently. The shared predicate, the presentation version check in `canHandoff`, and the `r[5] === cell.heightM` assertion are required, not optional.
