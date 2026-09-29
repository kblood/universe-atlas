# Tree families at every distance (Task 2 receipt, 2026-09-28)

Branch `opus55/tree-families-20260928` (from `743b3f4`).

## Summary

- **Pine recipe/asset mismatch: fixed.** The recipes are right: dated spire species are W/H 0.17–0.35. The asset contract was wrong. Leaf cards (foliage clumps, 1.3 m extent) stayed metric, and the crown codec floor was 0.5. Together those put every drawn spire at 4.8–6.5 m wide, whatever the recipe asked for.
  - Leaf cards now scale with a density-preserving *card scale*, and the codec floor drops to 0.125.
  - On the dated fixture: 0 clamps (previously 1,328/1,333 spire bindings), and width error ≤ 1.06% (previously up to 139%).
- **Under-8 m legacy fallback: fixed, not just documented.** The family envelope is now 4–24 m. The 343/2,688 bindings (12.8%) on 5.6–7.8 m dated Oaks now draw as Oaks. Legacy is kept only for recipes below 4 m or above 24 m, which the fixture never produces.
- **Near/far handoff: width and leaf density matched; one pre-existing aerial defect remains.** The far atlas was stretched by the crown ratio, which is not the detailed crown's width once cards scale. It is now stretched by the detailed drawn width, and its leaf optical depth uses the same card density. Ground-level captures match across the 550 m hand-off. From 160 m altitude, LOD1 Pine foliage is sparse against the dense atlas; this is unchanged from `743b3f4` (see Unresolved).
- **Normal desktop controls: fixed.** Detailed trees were opt-in (`trees=1`), so a normal desktop session only ever showed legacy cones. They are now the desktop default; `trees=0` opts out and XR still skips them.

Canonical IDs, species bindings, placements, dates and visit order are untouched: allometry is a rendering decision made after the binding.

## What changed

### Allometry contract `tree-allometry-2` (`src/tree-allometry.ts`)

The family reference is measured from the packaged LOD0/LOD1 GLBs at 16 m:

| Family | Trunk radius rt | p95 crown radius rc | Card extent ce |
|---|---|---|---|
| Oak (branching) | 0.308 m | 4.252 m | 1.299 m |
| Pine (spire) | 0.312 m | 3.304 m | 1.299 m |

For each canonical individual (dated recipe plus structural variant, H/W/D):

- **Height scale.** s = H/16, with H exact in Float32.
- **Trunk ratio.** tr = D / (2·s·rt), quantised to the 8-bit code.
- **Card scale.** c = clamp(s·u, 0.2, 1), where u solves (rc+ce)·u² − ce·u − A = 0 and A = tr·rt + cr·(rc−rt).
  - This keeps the authored 16 m crown's side-view leaf-area density, c² / (s²·stretch) = 1, over the drawn silhouette, including the card fringe.
  - u = 1 exactly at identity ratios, so the 16 m atlas capture is unchanged.
  - It is derived only from the family reference, the height and the two ratio codes, so no instance channel is added.
- **Drawn half-width.** half(cr) = s·(tr·rt + cr·(rc−rt)) + c·ce. This is monotonic in cr (tested over every code at 4, 10 and 24 m).
- **Crown ratio.** 48-step bisection of half(cr) = W/2, then the nearest of the neighbouring codes. `crown-ratio-clamped` is recorded only when W/2 lies outside [half(0.125), half(1.75)].
- **Codec.** min 0.125, step 1/128, 256 levels. The identity code is now 28784 (112 + 256·112); it was 24672.
- **Family envelope.**
  - Crown ratio [0.125, 1.75]
  - Trunk ratio [0.5, 1.5]
  - Height [4, 24] m (`TREE_CANOPY_HEIGHT_RANGE_M`)

Bounds stay conservative because c ≤ 1 never exceeds the old metric cards.

### Detailed trees (`src/tree-asset.ts`)

The vertex shader multiplies leaf-card offsets by `treeAllometryCardScale(h, ratios, atlasTreeAllometry)`.

- The new `atlasTreeAllometry` uniform carries (rt, rc, ce) from the measured reference. Zero means authored card size.
- The pixel-size card compensation sees the scaled card.
- The CPU oracle `treeVertexMeters` matches.

### Far path (`src/forest-impostor.ts`, `src/forest-far-atlas.ts`)

- **Atlas stretch.** The atlas member is stretched horizontally by `treeAllometryAtlasStretch` = drawn half-width / (s·(rc+ce)), so the far crown has the detailed crown's width.
  - Before, the stretch was the crown ratio, which is about 22% too narrow at cr = 0.5 with the new cards.
- **Leaf coverage.** `treeAtlasLeafCoverage(coverage, leafFraction, treeAllometryLeafDepthScale)` replaces the old (16/h)² rule. The depth scale is c²/(s²·stretch): exactly 1 unless the card scale clamps (at 0.2 for tiny trees, or at 1 above 16 m on wide Oaks).
- **Analytic band path** (families whose atlas has not baked yet): the card margin is multiplied by c and the leaf density by c².
- **Proxy boxes.** The GPU quad box, the ray-shift box and the CPU `proxyBounds` grow by max(crown ratio, stretch).
- Program key `analytic-impostor-9`. `FOREST_FAR_ATLAS_VERSION` is unchanged: the bake itself is identical.

### Desktop default (`src/main.ts`)

- `detailedForestEnabled = trees !== '0'`, and only `trees=0` is persisted.
- The Surface panel's "Trees: detailed/basic" button still toggles it.
- `forestAssetAttachment.update(..., detailedForestEnabled && !renderer.xr.isPresenting)` keeps immersive sessions on the lightweight path.

## Tolerances (documented; enforced in `tests/tree-allometry.test.mjs`)

| Quantity | Rule | Measured on the fixture |
|---|---|---|
| Height | exact (Float32 of the recipe height) | 0% |
| Trunk diameter | ≤ half a trunk code step (s·rt/128); ≤ 1% relative | ≤ 0.36% |
| Crown width | ≤ half the width change to an adjacent crown code; ≤ 2% relative | ≤ 1.06% (Pine), ≤ 0.37% (Oak) |
| Clamps | none on the dated fixture | 0 of 2,688 |
| Far atlas width | = detailed drawn width (1e-9 m) | exact |
| Far leaf density | depth scale 1 unless the card scale clamps | exact |

## Per-species clamp and error census, before and after

Fixture: `tests/measure-tree-allometry.mjs`. It covers 4 biosphere seeds (temperate, arid, cold, temperate) × every tree birth date plus one late date × 96 cells, which is the same fixture as `tree-allometry.test.mjs`.

Raw output is in `test-results/opus55-trees/allometry-before.json` (`tree-allometry-1`, at `743b3f4`) and `allometry-after.json` (`tree-allometry-2`).

| | Bindings | Family | Legacy | crown-ratio-clamped | height-below-family-envelope |
|---|---|---|---|---|---|
| Before | 2,688 | 2,345 | 343 (12.8%) | 1,349 (1,328 spire + 21 branching) | 343 |
| After | 2,688 | 2,688 | 0 | 0 | 0 |

In this table:

- "fam/leg" is the number of family and legacy draws.
- "clamp %" is the crown-clamp percentage; there are no trunk clamps either before or after.
- "err" is the maximum relative error against the recipe.

| Species (world / lineage) | n | H target m | W target m | before fam/leg | before clamp % | before W drawn m | before max W err % | after fam/leg | after clamp % | after W drawn m | after max W / D err % | after crown ratio | after card scale |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| branching 6d86 / 0 | 219 | 6.99–7.75 | 5.51–6.29 | 0/219 | 0 | 5.52–6.28 | 0.3 | 219/0 | 0 | 5.5–6.28 | 0.23 / 0.16 | 1.15–1.32 | 0.47–0.52 |
| branching 6d86 / 1 | 86 | 6.5–7.31 | 5.29–5.83 | 0/86 | 0 | 5.3–5.83 | 0.28 | 86/0 | 0 | 5.29–5.83 | 0.21 / 0.16 | 1.12–1.26 | 0.44–0.48 |
| branching 6d86 / 2 | 38 | 5.56–6.09 | 3.96–4.84 | 0/38 | 0 | 3.96–4.84 | 0.22 | 38/0 | 0 | 3.97–4.83 | 0.27 / 0.16 | 1.05–1.19 | 0.35–0.41 |
| branching 7be0 / 0 | 203 | 8.79–9.8 | 5.75–7.12 | 203/0 | 0 | 5.74–7.12 | 0.27 | 203/0 | 0 | 5.75–7.12 | 0.22 / 0.16 | 0.94–1.08 | 0.53–0.62 |
| branching 7be0 / 1 | 72 | 8.84–9.2 | 5.97–6.6 | 72/0 | 0 | 5.96–6.61 | 0.24 | 72/0 | 0 | 5.98–6.6 | 0.29 / 0.16 | 0.93–1.09 | 0.56–0.58 |
| branching 7be0 / 2 | 30 | 9.58–10.42 | 6.26–7.13 | 30/0 | 0 | 6.28–7.13 | 0.29 | 30/0 | 0 | 6.26–7.14 | 0.2 / 0.16 | 0.94–1.08 | 0.58–0.63 |
| branching efd8 / 0 | 179 | 12.73–14.2 | 11.03–13.02 | 179/0 | 0 | 11.02–13.04 | 0.17 | 179/0 | 0 | 11.05–13.04 | 0.24 / 0.16 | 1.27–1.46 | 0.9–1 |
| branching efd8 / 1 | 106 | 14.46–15.88 | 13.23–15.27 | 106/0 | 0 | 13.23–15.25 | 0.21 | 106/0 | 0 | 13.23–15.25 | 0.21 / 0.16 | 1.35–1.56 | 1–1 |
| branching efd8 / 2 | 67 | 13.06–14.64 | 12.46–15.65 | 67/0 | 0 | 12.45–15.67 | 0.17 | 67/0 | 0 | 12.43–15.67 | 0.17 / 0.16 | 1.48–1.74 | 0.96–1 |
| branching f8c8 / 0 | 193 | 9.91–10.74 | 5.71–6.58 | 193/0 | 0 | 5.72–6.57 | 0.31 | 193/0 | 0 | 5.7–6.56 | 0.29 / 0.16 | 0.8–0.91 | 0.56–0.63 |
| branching f8c8 / 1 | 124 | 9.21–10.19 | 5.17–5.98 | 124/0 | 8.9 | 5.18–5.96 | 0.32 | 124/0 | 0 | 5.17–5.99 | 0.28 / 0.16 | 0.77–0.9 | 0.52–0.59 |
| branching f8c8 / 2 | 38 | 9.65–10.6 | 5.11–5.97 | 38/0 | 26.3 | 5.31–5.98 | 3.87 | 38/0 | 0 | 5.12–5.99 | 0.37 / 0.16 | 0.71–0.81 | 0.53–0.59 |
| spire 6d86 / 0 | 166 | 10.24–11.43 | 2.83–3.3 | 166/0 | 100 | 4.78–5.03 | 70.07 | 166/0 | 0 | 2.84–3.28 | 0.53 / 0.36 | 0.36–0.42 | 0.45–0.5 |
| spire 6d86 / 1 | 120 | 11.16–12.45 | 2.98–3.57 | 120/0 | 100 | 4.97–5.25 | 70.91 | 120/0 | 0 | 2.98–3.57 | 0.66 / 0.36 | 0.32–0.39 | 0.48–0.55 |
| spire 6d86 / 2 | 43 | 11.23–12.41 | 3.2–3.72 | 43/0 | 100 | 4.99–5.24 | 55.94 | 43/0 | 0 | 3.22–3.71 | 0.62 / 0.36 | 0.38–0.44 | 0.5–0.55 |
| spire 7be0 / 0 | 157 | 12.93–14.28 | 2.72–3.39 | 157/0 | 100 | 5.35–5.64 | 96.9 | 157/0 | 0 | 2.69–3.41 | 0.88 / 0.36 | 0.23–0.29 | 0.49–0.57 |
| spire 7be0 / 1 | 131 | 12.12–13.27 | 2.26–2.77 | 131/0 | 100 | 5.18–5.42 | 129.62 | 131/0 | 0 | 2.26–2.78 | 0.71 / 0.36 | 0.18–0.23 | 0.43–0.5 |
| spire 7be0 / 2 | 79 | 13.55–15.15 | 2.31–2.76 | 79/0 | 100 | 5.48–5.82 | 139.33 | 79/0 | 0 | 2.33–2.77 | 1.06 / 0.36 | 0.15–0.19 | 0.47–0.53 |
| spire efd8 / 0 | 195 | 14.33–15.98 | 4.73–5.56 | 195/0 | 100 | 5.65–6 | 20.06 | 195/0 | 0 | 4.73–5.56 | 0.41 / 0.36 | 0.47–0.55 | 0.68–0.78 |
| spire efd8 / 1 | 81 | 15.06–16.6 | 5.09–6.2 | 81/0 | 93.8 | 5.8–6.19 | 14.63 | 81/0 | 0 | 5.07–6.22 | 0.42 / 0.36 | 0.49–0.6 | 0.72–0.83 |
| spire efd8 / 2 | 44 | 15.67–17.48 | 5.11–6.15 | 44/0 | 100 | 5.94–6.32 | 17.14 | 44/0 | 0 | 5.12–6.14 | 0.43 / 0.36 | 0.45–0.53 | 0.74–0.85 |
| spire f8c8 / 0 | 192 | 16.34–18.3 | 2.95–3.26 | 192/0 | 100 | 6.08–6.49 | 111.6 | 192/0 | 0 | 2.95–3.25 | 0.98 / 0.36 | 0.15–0.19 | 0.57–0.63 |
| spire f8c8 / 1 | 61 | 14.14–15.66 | 2.65–3.13 | 61/0 | 100 | 5.61–5.93 | 116.61 | 61/0 | 0 | 2.62–3.14 | 0.96 / 0.36 | 0.17–0.22 | 0.5–0.58 |
| spire f8c8 / 2 | 64 | 14.91–16.71 | 2.62–3.08 | 64/0 | 100 | 5.77–6.16 | 124.4 | 64/0 | 0 | 2.6–3.09 | 1 / 0.36 | 0.14–0.19 | 0.52–0.59 |

Before the change, the 6d86 branching rows were drawn as legacy cones sized to the recipe, which is why their widths matched while their shape did not.

## Under-8 m decision

Evidence:

- The 343 fallbacks were **entire species**, not outliers. All three branching lineages on world 6d86 (5.56–7.75 m) went to the legacy primitive, so on that world every broadleaf is a cone while its neighbours are full Oaks.
- The 8 m floor existed because metric cards on a skeleton scaled to s = 0.35–0.5 give a leaf clump 2–3× too large relative to the crown: a blob.
- With the density-preserving card scale, a 6 m Oak is the 16 m Oak scaled uniformly (c = s·u, u ≈ 1.1 at these ratios, card scale 0.35–0.52). The silhouette and leaf density are the authored ones.
- The 4 m floor is where c reaches its 0.2 clamp for slender trees. Below it, cards would have to shrink further than the texture's alpha footprint supports, so legacy stays the honest fallback. `height-below-family-envelope` still reports it.

Decision: extend the envelope to 4 m. The fixture now has 0 legacy draws. The 3 m shrub case stays legacy and is regression-tested.

## Reachability through normal desktop controls

Before this change, detailed families loaded only with `?trees=1`, or by pressing "Trees: basic" in the Surface panel. A normal visit (land → walk or low flight) showed only legacy cones out to the horizon, with the far atlas never baked.

They are now on by default below the 6,000 m terrain-clearance prefetch, so a normal landing shows the coherent family forest near, mid and far. `?trees=0` gives the previous behaviour, which is used for the legacy comparison captures.

Cost: the default desktop session now downloads the `desktop-v1` forest bundle (~25.9 MB) on the first approach to a surface.

## Captures

The script is `tests/tree-families-visual.browser.mjs`, run on a real GPU at 1440×1000 against a `vite preview` of each build.

Setup:
- World seed `LETHRA-001`, body `G001/C2128,0,1/0/planet/1`.
- The pose, date and target individuals were searched once, then reused in every run through `ATLAS_POSE=before-detailed/pose.json`, so all runs are matched comparisons.

Targets:
- **pine** `0/577212/85584/181664`: spire/2, H 20.32 m, recipe W 6.485 m.
- **oak** `0/577212/85585/181665`: branching/1, H 9.59 m, recipe W 5.075 m.
- **small0** `0/577212/85578/181663`: branching/2, H 7.95 m, recipe W 4.38 m. This one was below the old 8 m envelope.

Runs, all under `test-results/opus55-trees/`:

| Run | Build | trees param | Result |
|---|---|---|---|
| `before-detailed/` | `743b3f4` (`dist-before/`) | `1` | ok, 47 shots, 0 errors |
| `before-legacy/` | `743b3f4` | `0` | interrupted by the 00:48 PC crash; pine and oak phases complete, small0 partial (31 shots) |
| `after-detailed/` | `cb920ca` (`dist/`) | **omitted** (proves the default) | ok, 47 shots, 0 errors |
| `after-legacy/` | `cb920ca` | `0` | ok, 47 shots, 0 errors |

Each full run contains the following shots:
- `wide.png`: the matched wide view from 160 m altitude.
- `approach-<t>-d300…d008`: 300, 150, 100, 75, 50, 30, 15 and 8 m.
- `retreat-<t>-d015/d050/d150`.
- `date-<t>-d030-plus1d/plus10y/return`.
- `warm-01-warmed`, `warm-02-stationary`, `warm-03-turned-90`, `warm-04-turned-back`.

Side-by-side composites are in `compare/`.

Live runtime samples of the same individuals (`report.json`, `diagnostics.detailed.targetSample`):

| Target | before (tree-allometry-1) | after (tree-allometry-2) |
|---|---|---|
| pine | W 6.92 m, crown ratio 0.5, `crown-ratio-clamped` | W 6.49 m (recipe 6.485), crown ratio 0.461, card scale 0.946, no reasons |
| oak | W 5.29 m, crown ratio 0.5, `crown-ratio-clamped` | W 5.08 m (recipe 5.075), crown ratio 0.719, card scale 0.524, no reasons |
| small0 | never in the family samples; drawn as the legacy lollipop at every distance | branching family in batch 0 at 8, 15 and 50 m; W 4.39 m (recipe 4.38), crown ratio 0.758, card scale 0.443 |

The marked overlays (`*-marked.png`) draw the "drawn crown" bar from the reused pose file. In the `after-*` runs that yellow bar therefore still shows the **before** width. Use the table above for after-change widths.

Observations:

- **Identity and date.** The date round trips (+1 day, +10 years, return) keep id, species, cell direction and ground height unchanged for all three targets in `after-detailed` and `after-legacy`, with a re-landing shift of 0 m.
- **Small Oak.** `compare/approach-small0-d015-before-left-after-right.png` and `approach-pine-d300` (the foreground tree) show the under-8 m individual: a three-sphere legacy lollipop before, a proper Oak after.
- **Near forest.** `compare/approach-oak-d030…` and `approach-pine-d100…` show slimmer recipe-sized Pines and smaller Oaks. Leaf density is unchanged, and the near forest reads as one family set.
- **Warmed stationary and turning.** Detailed trees stay stable (near 80; LOD1 653 → 603 when turned 90°, 654 after turning back). There are 0 matrix or colour writes while stationary, and the rendered height range is 7.92–20.32 m throughout. `compare/warm-03-turned-90…` shows no popping.
- **Ground-level handoff.** Distant ridge Pines past the 550 m atlas hand-off have the same slender silhouette and tone as the LOD1 Pines in front of them (`after-detailed/approach-pine-d300.png`, `retreat-*-d150.png`).
- **Aerial handoff (not fixed).** From 160 m altitude, LOD1 Pines at about 200–550 m render with sparse, pixel-scattered foliage over visible trunks, while the far atlas beyond 550 m is dense and dark. Their shadows are still full. See `compare/wide-mid-band-before-top-after-bottom.png`.
  - This is **identical before and after**, so it predates this branch; see Unresolved.
  - `compare/wide-legacy-left-detailed-right.png` shows that from that aerial pose the legacy (`trees=0`) forest currently reads more uniform than the detailed one.

## Tests and build

- `npm test` (full serial) at `cb920ca`: **798 tests, 795 pass, 0 fail, 3 skipped**. The baseline was 797/794/3; the 3 skips need `ATLAS_TREE_CANDIDATE`. The added test is the GLSL/CPU parity test for card scale, stretch and depth scale.
- New or changed assertions in `tests/tree-allometry.test.mjs`:
  - per-individual crown tolerance (half an adjacent-code width step, and ≤ 2%) and trunk ≤ 1%
  - zero clamp or legacy reasons on the dated fixture
  - mean spire W/H < 0.3
  - far-atlas width equals the detailed width
  - leaf depth scale is 1 when the card scale is unclamped
  - proxy boxes include the stretch (a new 8 m / cr 0.5 / tr 0.5 corner where the stretch dominates, plus a 4 m / cr 0.125 corner)
  - the card-scaled leaf oracle
  - the transliterated-GLSL parity sweep (4–24 m × 6 crown × 3 trunk ratios, both families)
  - monotonic drawn width over every code
  - 5 m now family and 3 m legacy
  - identity code 28784
  - detailed-shader wiring
- Other updated test files: `forest-far-atlas`, `tree-canopy-bounds`, `forest-impostor-family` and `planet-forest-tree-assets`. `forest-far-atlas` includes a CPU far-atlas emulation: at 10 m the atlas needs no correction; at 22 m (card scale clamped) the depth rule restores coverage.
- `npm run build` (`tsc --noEmit && vite build`): success. The only warning is the pre-existing >800 kB `rapier-physics` chunk.

## Unresolved

- **Aerial LOD1 Pine foliage is sparse (pre-existing, not fixed).** Seen from roughly 25–50° above at 200–550 m, the alpha-tested needle cards of the LOD1 Pine fall below a pixel and dither to a sparse scatter. The far atlas past 550 m is dense, which gives a visible density and brightness step in the matched wide view (`compare/wide-mid-band-before-top-after-bottom.png`). Ground-level views do not show it.
  - It is byte-for-byte the same failure at `743b3f4`, so this branch neither causes nor fixes it.
  - Because detailed trees are now the default, low aerial flight shows it where the legacy forest previously did not.
  - Suggested next step: make the LOD1 Pine card-coverage compensation view-elevation aware, or hand LOD1 Pines to the atlas earlier when the view is steep. This needs its own browser A/B.
- **Quest and XR are not measured.** Immersive sessions still skip detailed trees, and no headset profile was taken.
- **GPU timings are not evidence.** The RTX 5090 was shared with two other agents, so frame timings in this work mean nothing. Only correctness and visual captures were used.
- **Branch flattening on slender Pines.** At crown ratio 0.14–0.2 the radial map compresses branch cross-sections horizontally about 5×. The branches stay inside the silhouette, but read as a narrow column rather than a true spire at close range.
  - The right long-term fix is a slender Pine asset (a second spire reference) and not a thinner map.
  - Three f8c8/7be0 spire lineages sit at 0.14–0.19, close to the 0.125 floor. A still narrower recipe would clamp again.
- **Broad Oaks above 16 m are sparser than authored.** The card scale is clamped at 1, the old metric behaviour, and their far-atlas density follows the same depth scale.
- **Default download.** The ~25.9 MB bundle now loads by default on desktop.
