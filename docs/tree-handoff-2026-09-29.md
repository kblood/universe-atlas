# Tree near/far hand-off: coverage and brightness (2026-09-29)

This covers task 2 of `docs/opus-5.5-desktop-realism-handoff-2026-09-28.md`. It resolves the first "Unresolved" item of `docs/tree-families-2026-09-28.md`: sparse, bright LOD1 Pines at 200–550 m set against a dense, dark far atlas.

Branch: `opus55/tree-handoff-20260929`. Commits:

- `edc1aae`: hand-off probes and the per-band capture.
- `045cff2`: mip-aware foliage alpha cutoff.
- `25ecd21`: cos² foliage lobe for far impostors.

## Summary

There were two independent causes. Each would have produced a visible step at the 550 m hand-off on its own.

1. **Coverage: LOD1 lost about two thirds of its Pine needle area to trilinear filtering.**
   - The coverage-preserving foliage mip sidecar (`tree-foliage-coverage-mips-1`) keeps each reduced level's texel coverage right. It does this by parking passing texels just above the 0.5 MASK cutoff.
   - Hardware trilinear filtering blends those texels with failing neighbours and with the adjacent level, so most results land just below 0.5 and are discarded.
   - In CPU emulation of GL_LINEAR_MIPMAP_LINEAR, spire silhouette retention against the base level fell sharply with a fixed 0.5 cutoff: 0.67 at 100 m, 0.39 at 200 m, 0.36 at 300 m, 0.32 at 450 m and 0.34 at 600 m. Branching crowns kept 0.74.
   - The far atlas is captured from the full-resolution LOD1, so it stayed dense. That mismatch is the "sparse versus dense" step.
2. **Brightness: far crowns were lit as one averaged card.**
   - The far impostor uses Lambert with the atlas's averaged normal, max(0, n̄·l).
   - A detailed crown is thousands of cards, and its irradiance is the mean of max(0, n·l) over those cards. Because of Jensen's inequality these differ a lot. When the averaged normal faces away from the sun, the far crown gets almost no direct light, but half the real cards would still be lit.
   - The result: on the same pixels, LOD1 crowns were x1.4–1.7 brighter than the far atlas that replaced them in aerial views.

## Fixes

### 1. Mip-aware alpha cutoff (`src/tree-foliage-cutoff.ts`, contract `tree-foliage-lod-cutoff-1`)

- **Calibration.** Once per family, at load, the code measures the alpha that trilinear filtering actually produces at fractional mip level λ. It does this in steps of 0.5 over the sidecar chain (2048², 7 reduced levels), using a deterministic jittered 256² lattice.
  - At each λ it picks the cutoff that keeps the base level's coverage, the (1 − baseCoverage) quantile.
  - λ = 0 is pinned to the authored 0.5, so full-resolution close-ups are unchanged byte for byte.
  - Setup cost is 73–97 ms per family on the CPU in Node, reported at runtime in `diagnostics.families[].foliageLodCutoff.setupMs`.
- **Shader.** The shader computes λ from `dFdx`/`dFdy` of `vMapUv × textureSize(map, 0)`, the same quantity the hardware uses. It linearly interpolates the table and replaces `#include <alphatest_fragment>`.
  - The replacement is installed on the foliage colour material, its customDepth and customDistance shadow materials (the LOD1 part), and the far-atlas capture material. All passes therefore keep the same leaves.
- **Calibrated tables** (λ = 0, 0.5, … 7):
  - branching (base coverage 0.190): .500 .469 .390 .427 .459 .476 .501 .504 .508 .503 .493 .476 .441 .421 .392
  - spire (base coverage 0.047): .500 .447 .452 .448 .457 .461 .481 .490 .503 .473 .449 .427 .411 .387 .386
- **Emulated retention after the fix.** Spire: 1.01 / 0.98 / 0.98 / 1.00 / 1.03 at 100 / 200 / 300 / 450 / 600 m. Branching: 1.00 at 200 and 450 m.
- **Version bump.** The far atlas bumped to `forest-far-atlas-2` because its capture material now uses the same cutoff.
- **Scope.** The cutoff is enabled by default only when a mip sidecar is present and coverage is not hashed. `foliageLodCutoff: false` opts out.

### 2. Cos² foliage lobe for far impostors (`src/forest-foliage-lobe.ts`, `forest-foliage-lobe-cos2-1`)

- **Formula.** For foliage, the far impostor now replaces the direct term max(0, c) with E(c) = 3/16 (1 + c)², where c = n̄·l.
  - This is the exact mean of max(0, n·l) over a cos²-distributed normal lobe about n̄. Its mean cosine is 0.75.
- **Fit to the packaged crowns** (`tests/forest-foliage-lobe.test.mjs`, CPU normal raster of the LOD1 crowns):
  - Measured mean-normal lengths: branching 0.73, spire 0.756.
  - Per-card irradiance fit, lobe versus the old mean-normal term: branching rms 0.016 (max 0.029) versus 0.117; spire rms 0.008 (max 0.016) versus 0.111.
- **Bark.** Only the leaf fraction of each impostor pixel uses the lobe. Bark keeps Lambert.
- **Version bump.** The program key moved to `analytic-impostor-10/forest-foliage-lobe-cos2-1`.

## Evidence (browser, RTX 5090 ANGLE/D3D11, 1440×1000)

**Capture setup**

- Pose: `test-results/opus55-tree-handoff/pose.json`, the tree-families aerial pose.
- Views: ground (1.6 m), 50 m, 160 m and 500 m clearance. Each view uses the same camera and sun across variants.
- Builds:
  - `before` = `0071d3c`
  - `cutoff` = fix 1 only
  - `final` = fix 1 + fix 2
- Script: `tests/tree-handoff-visual.browser.mjs`.
- Per view, the script captures:
  - `hidden`: colour write off for trees, which gives the background mask
  - `default`: 550 m hand-off
  - `h450` / `h350` / `h250` / `h150`: middle hand-off forced shorter through `__atlas.forestDebug`
  - `turned-30` / `turned-back`
- Bands are true 3D eye distance from surface rays. Coverage is the fraction of band pixels that differ from `hidden` by more than 10/255.

**Paired luma.** "Paired" is the LOD1/far luma ratio on the *same* pixels: tree pixels in both `default` (LOD1 up to 550 m) and `h150` (far atlas from 150 m). 1.00 means no brightness step at hand-off.

Captures:

- `test-results/opus55-tree-handoff/before/`
- `test-results/opus55-tree-handoff/cutoff/`
- `test-results/opus55-tree-handoff/final/`

Each folder has `report.json` plus `{view}-{variant}.png`. All three runs reported `ok: true` with 0 page errors.

### 160 m clearance (the reported defect)

| Band | LOD1 cov before → final | Far cov (h150) final | Paired luma before | cutoff | final |
|---|---|---|---|---|---|
| 200–300 m | 0.050 → 0.098 | 0.136 | x1.17 | x1.14 | **x0.95** |
| 300–400 m | 0.048 → 0.121 | 0.159 | x1.42 | x1.47 | **x1.08** |
| 400–550 m | 0.073 → 0.184 | 0.235 | x1.58 | x1.59 | **x1.09** |
| 550–700 m | 0.214 → 0.250 | 0.262 | x1.04 | x1.10 | **x1.02** |

Mean tree luma in the 400–550 m band: LOD1 was 0.241 before and 0.214 final. The far atlas at h150 was 0.136 before and 0.195 final.

### 50 m clearance

| Band | LOD1 cov before → final | Far cov (h150) final | Paired luma before | cutoff | final |
|---|---|---|---|---|---|
| 200–300 m | 0.170 → 0.290 | 0.370 | x1.53 | x1.56 | **x1.06** |
| 300–400 m | 0.142 → 0.309 | 0.398 | x1.59 | x1.72 | **x1.15** |
| 400–550 m | 0.187 → 0.413 | 0.512 | x1.63 | x1.74 | **x1.17** |

### Ground (1.6 m)

| Band | LOD1 cov before → final | Far cov (h150) final | Paired luma before | final |
|---|---|---|---|---|
| 200–300 m | 0.503 → 0.557 | 0.607 | x1.02 | **x0.98** |
| 300–400 m | 0.756 → 0.847 | 0.892 | x1.07 | **x0.97** |
| 400–550 m | 0.843 → 0.932 | 0.960 | x1.10 | **x0.99** |

### 500 m clearance

No LOD1 tree lies within the 550 m (+50 retained) radius in view, so there is no hand-off in frame, and paired is x1.00 by construction. The lobe brightens the far forest:

- 1000–1600 m band: luma 0.156 → 0.215
- 1600–4000 m band: luma 0.164 → 0.227

### Hand-off radius sweep (final build)

The table shows coverage and tree luma per band as the middle→far hand-off is shortened. "LOD1 inst" is the number of LOD1 instances submitted.

| View | Hand-off | 300–400 m | 400–550 m | LOD1 inst |
|---|---|---|---|---|
| alt160 | 550 (default) | 0.121 / 0.220 | 0.184 / 0.214 | 755 |
| alt160 | 450 | 0.121 / 0.220 | 0.209 / 0.203 | 585 |
| alt160 | 350 | 0.136 / 0.211 | 0.235 / 0.195 | 445 |
| alt160 | 250 | 0.159 / 0.204 | 0.235 / 0.195 | 282 |
| alt50 | 550 (default) | 0.309 / 0.207 | 0.413 / 0.212 | 654 |
| alt50 | 350 | 0.321 / 0.203 | 0.504 / 0.183 | 379 |
| alt50 | 250 | 0.390 / 0.182 | 0.512 / 0.179 | 286 |

- **Default kept.** Shortening the hand-off to 350 m cuts LOD1 submissions by about 40% (755 → 445 at alt160). After the fixes the visual difference across it is small: coverage +0.05 and luma −0.02 in the 400–550 m band.
- **Why not changed here.** I kept the 550 m default because the change is a perf decision. The perf plan's lever should be decided with the task 4b GPU harness on a quiet GPU, not with these captures, since the 5090 was shared. `forestDebug({middleHandoffM})` (110–650 m, validated and restorable) and this sweep are ready for that decision.

## Pop and turning

- **Hand-off step.** Paired luma at the 550 m boundary is x1.02 at alt160, x1.11 at alt50 (because of the +50 m retained band) and x1.01 at ground. The residual coverage step is shown in the next section.
- **Turning.** Each aimed view is re-captured after a 30° yaw and a return. The per-band comparison is re-aimed at the same body-local point.
  - Final, maximum band delta (coverage / luma): alt50 0.038 / 0.020; alt160 0.053 / 0.016; alt500 0.27 / 0.06.
  - The `before` build shows the same magnitude (alt160 0.059 / 0.024). The alt500 value comes from a 1–3 px re-aim mismatch across a sparse far band with few pixels, not from LOD churn: no LOD1 is in frame there.
  - **Caveat:** this is a re-aim check, not a continuous approach/retreat video. Distance hysteresis at 110 ± 12 m and 550 + 50 m is unchanged from the tree-families branch.

## Unresolved

- **Far-atlas silhouettes remain ~20% wider than LOD1 from above.**
  - At 160 m, LOD1 coverage in the 400–550 m band reaches 0.78 of the far atlas (0.184 versus 0.235), up from 0.32.
  - Edge analysis of `final/alt160-default.png` against `final/alt160-h150.png`:
    - Rows 330–500: 16,433 far-only pixels, of which 14,922 lie within 1 px and 16,179 within 2 px of an LOD1 tree pixel.
    - Rows 500–700: 15,150 far-only pixels, of which 13,383 lie within 1 px and 14,838 within 2 px.
  - So the gap is silhouette dilation of the far atlas (bilinear atlas sampling, the 3-view blend and hashed crown edges), not missing LOD1 foliage.
  - Fixing it means eroding the far-atlas alpha edge by about 1 px at distance. That is a separate far-atlas change needing its own A/B.
- **About x1.15 LOD1/far luma residual at 50 m, 300–550 m.**
  - The ground (x0.97–0.99) and 160 m (x1.08) views are close. The 50 m view looks along the canopy at a grazing angle, where the detailed foliage's physical specular (KHR_materials_specular 0.44, roughness 0.84) adds a sheen the Lambert impostor lacks.
  - Not fixed: matching it needs a view-dependent term in the impostor.
- **The far forest is now brighter everywhere.**
  - This is intended: back-lit far foliage previously got about zero direct light.
  - Aerial far bands rose by about 0.06 luma. For example, alt160 at 700–1000 m went from 0.127 to 0.187, and alt500 at 1000–1600 m from 0.156 to 0.215. This matches the LOD1 crowns in front of them.
  - It changes the look of every far forest and is worth an eye review.
- **Slender Pines at crown ratio 0.14–0.2 still read as a column (documented, not fixed).**
  - `treeAllometryRadial` maps each branch radius beyond the trunk by crownRatio. At 0.14–0.2 the branch skeleton is compressed horizontally by 1/crownRatio ≈ 5–7×. The needle cards keep their card scale, so the crown becomes cards stacked on an almost vertical skeleton.
  - Any other radial map changes `tree-allometry-2` outputs (silhouette widths, proxy bounds, far-atlas stretch) and would still start from a broad Pine.
  - The right fix is a slender-Pine source asset (a second spire reference) selected below a crown ratio of about 0.25. That needs asset generation outside this task.
  - `tree-allometry-2` is unchanged here.
- **Not measured on Quest/XR.** Immersive sessions skip detailed trees. GPU timings from this shared 5090 are not evidence.

## Invariants

- Canonical IDs, species bindings, placements, dates and dated replay are untouched. Both fixes are shading-only, after binding.
- The `tree-allometry-2` contract and its tolerances are unchanged. No contract outputs changed, so there is no version bump there.
- The rendering versions that changed are `forest-far-atlas-2`, `analytic-impostor-10`, `tree-foliage-lod-cutoff-1` (new) and `forest-foliage-lobe-cos2-1` (new).
- Rivers stay disabled.

## Tests

The following are new deterministic tests, all in `package.json`'s test list:

- `tests/tree-foliage-cutoff.test.mjs` (5 tests):
  - the calibration is deterministic
  - λ = 0 is pinned
  - per-level coverage is correct
  - emulated silhouette retention is 0.90–1.12 at 150–600 m for both families
  - the GLSL and JS lookups agree
  - invalid input is rejected
  - the hook is installed on the physical, depth and distance materials
  - the far atlas is at version 2
- `tests/forest-foliage-lobe.test.mjs` (3 tests):
  - the closed form matches numeric integration
  - the lobe fits the packaged crowns
  - the hook swaps only the direct cosine
- `tests/tree-handoff-debug.test.mjs` (2 tests):
  - library option gating
  - `setDebug` validation and restore

Full serial run at `25ecd21`: `node --test --test-concurrency=1` over all 114 files in `package.json`.

| Tests | Pass | Fail | Cancelled | Skipped | Duration |
|---|---|---|---|---|---|
| 818 | 815 | 0 | 0 | 3 | 160 s |

- The 3 skips are the existing `ATLAS_TREE_CANDIDATE` tests. The tree-families baseline was 798 tests, 795 pass, 3 skipped; this branch adds 20 tests.
- `npm run build` (`tsc --noEmit && vite build`) passes. The only warning is the existing chunk-size notice for `rapier-physics` (2,853 kB).
