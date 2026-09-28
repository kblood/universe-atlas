# Forest coherence milestone — 2026-09-28

- Branch `opus-forest-coherence-20260928`, base `c85349974c423f5da70084c08affa423646e8fff`.
- Implementation commit `d33ea4f`; this report and its logs are in the following commit.
- Model: Claude Opus 5.5 (`claude-opus-5-5`), via Claude Code in an isolated worktree.

**Status:** CPU implementation and tests are complete. **The GPU/browser acceptance run has not been done.** It is waiting for Luna to grant an exclusive slot (see the end of this report). No visual claim is made yet.

## What changed (normal game path)

The same deterministic structure is applied at every distance: near LOD0, mid LOD1, shadows and far crowns.

1. **Bounded structural variants** (`src/tree-structural-variant.ts`, version `forest-structural-variant-1`).
   - Each family has 8 members, stratified per channel:
     - horizontal crown anisotropy (Oak ±16 %, Pine ±8 %);
     - top-weighted lean (≤ 4.5 % / 2.5 % of height, growing as t²);
     - tier twist (35–100 % of 0.55 / 0.8 rad, balanced sign);
     - whole-clump thinning (≤ 14 % / 10 % of reference-space clumps of 1.6 / 1.2 m).
   - The member index is the existing `treeInstanceAppearance(recipe, cellId).variant`, derived from recipe version, species and canonical cell. No new population or catalogue input is involved.
   - Height, root (0,0,0) and yaw are unchanged. The crown scale ramps in over t = 0.05–0.30.
   - The GLSL and CPU oracles are shared. Thinning is decided from the reference pivot, so LOD0, LOD1 and the shadow passes remove the same clumps.
2. **Near/mid geometry** (`src/tree-asset.ts`).
   - A new per-slot `instanceTreeShape` = (member+1, LOD card scale) holds 8 B per slot.
   - Variant uniforms are shared per family, so there are no new textures or materials. The program key is now `atlas-tree-physical-2`.
   - **Area-preserving LOD1:** cards are scaled by √(A_LOD0/A_LOD1), using leaf area measured from the packaged meshes.

     | Family | LOD0 area | LOD1 area | Card scale |
     |---|---|---|---|
     | Oak | 7661 m² | 1915 m² | 2.00 |
     | Pine | 7085 m² | 886 m² | 2.83 |

     This targets the "sparse sticks" mid band.
   - **Distance card growth:** capped at 1.35× when a card falls below 3 px. At 1080p/60° it only starts beyond the current LOD ranges, so it is a low-resolution guard.
3. **Far crowns** (`src/forest-impostor.ts`, key `analytic-impostor-7`).
   - The presentation code now carries the member (`forest-presentation-2`, stride 262144, exact in f32). The far shader applies the same scale, twist and lean at each band centre.
   - **Porosity:** coverage uses Beer–Lambert, 1 − exp(−σL), with σ = LOD0 opaque projected leaf area / band volume. Stable clumps in the tree frame fade out below about 2 px. Without MSAA, coverage becomes a stable hash dither.
   - **Measured trunk:** 14.7 m, r = 0.31 m at the 16 m reference, replacing the legacy 10.2 m, r = 0.50 m.
   - The conservative box is expanded for all members. The GPU quad and CPU `proxyBounds` share the same uniforms.
   - A disabled or failed family resets to identity members, the legacy trunk and solid crowns (explicit fallback).
4. **Handoff:** `canHandoff` already requires exact code equality, so a mismatched member never pairs. Diagnostics now report:
   - `structuralVariantVersion`;
   - per-family `structuralVariants`, `lod1CardScale`, `cardCompensation` and `variantHistogram`;
   - per-sample `structuralVariant`.

## Measurements (CPU)

| Quantity | Oak | Pine |
|---|---|---|
| Max pivot displacement per member at 16 m | 0.68–1.43 m | 0.54–1.15 m |
| Authored culling radius | 23.69 m | 21.71 m |
| Worst deformed vertex (all members, 10/22 m, ±wind, max card scale) | 23.45 m | 25.09 m |
| New conservative radius | 32.92 m | 30.09 m |

**Memory budget:**
- Shape attribute: (192+4096) × 8 B = 34 KB per family, 68 KB total.
- Textures: 0 B added.
- Uniforms added: far fragment +37 vec4 slots; detailed vertex +18 vec4.

## Tests and build

| Check | Result | Log |
|---|---|---|
| `npx tsc --noEmit` | clean | `test-results/opus-forest-coherence/tsc.log` |
| Focused forest set, serial (10 files) | 94 pass, 0 fail, 3 skipped (pre-existing `ATLAS_TREE_CANDIDATE`-gated GLB checks) | `cpu-focused-tests.tap` |
| `tests/tree-structural-variant.test.mjs` (new, added to `npm test`) | 6 pass | `tree-structural-variant.tap` |
| `npm test` (full) | 667 pass, 5 fail, 3 skipped | `cpu-full-suite.log` |
| `npm run build` | tsc + Vite build succeeded (existing >800 kB chunk warning) | — |

**The recorded full-suite run had 5 failures; it was not green.** Four are existing cosmology/time version-pin mismatches (`atlas-cosmology-2-radiation` vs pinned `-1`, `atlas-history-3-remnant-cooling` vs `-2`, and two dependent checks). Their sources are unchanged on this branch. The fifth is `planet-canopy`'s “remaining selection is requested only after the first bounded batch drains” assertion. It failed in the full parallel suite and passed in the isolated/serial run. The test combines deterministic quotas with production's wall-clock 2 ms slice, so suite scheduling can affect its drain expectation. A follow-up test change replaces wall time with a fixed clock for the quota/drain assertion and adds a separate injected-clock test proving that selection work stops after the 2 ms deadline. The historical full-suite failure remains recorded; it has not been rerun after that test-only change.

**New test coverage:**
- Variant determinism, stratification, bounds and frozen pools.
- Every member reachable from canonical identity.
- Root, height and yaw invariance.
- Real Oak/Pine geometry displacement and per-clump thinning.
- Area-preserving scale from the real GLBs.
- Conservative sphere checked against every packaged vertex under all members, heights, wind extremes and card scales.
- Far uniforms, wrong-family rejection (atomic), disabled-family fallback, and far box containment of every member's bands and trunk.
- Near slot member = far code member across date replay, catalogue change, slot reuse and family unload.
- Authored-only fallback.
- Handoff rejects a mismatched member and follows a variant retag without moving roots.

## Known gaps / risks (need the GPU run)

- **Shader compilation is not yet verified on hardware.** This covers the detailed vertex and depth/distance programs and the far fragment program, including the fragment uniform count with the Lambert lights.
- **Visual match is unverified:**
  - Pine LOD1 cards grow 2.83× (up to 3.8× with compensation). They may look blotchy mid-range; if so, cap the LOD scale and accept the leaf-area deficit, or re-author LOD1.
  - The far σ gives a nearly opaque crown core (optical depth ≫ 1) with porous rims. Its tone versus mid LOD1 must be judged in captures.
- **Frame cost** of the far per-band variant transform and Beer–Lambert math has not been measured.
- The captured diffuse-transfer prototype was left untouched (optional per the brief).

## GPU slot request (for Luna)

Requesting one exclusive browser/GPU slot. Nothing has been launched.

**Planned run on the existing real game route**, with the normal Trees path at a fixed date/pose, in low flight and walking:
- close (<110 m), mid (110–600 m) and far (>600 m) screenshots;
- `diagnostics().detailedTrees` dump: nonzero Oak and Pine, species IDs, `structuralVariant`, `variantHistogram` and handoff samples;
- root contact check;
- date away/return equality;
- JS/WebGL error capture;
- frame time and renderer info (programs, textures, geometries).

Artifacts will go to `test-results/opus-forest-coherence/gpu/`.
