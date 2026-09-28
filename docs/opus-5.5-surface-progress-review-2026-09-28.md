# Opus 5.5 desktop progress review

Independent source and screenshot review of snapshot 8278952aeab43923db85d62444dabe5583cec5df. The local runtime is newer than deployed release 8e16776. The response below is preserved verbatim; reviewer opinions and hypotheses are not test results. See [metadata](opus-5.5-surface-progress-review-2026-09-28.metadata.json) and [assessment](surface-progress-review-assessment-2026-09-28.md).

## Evidence qualifications

The completed revised browser report was supplied to Opus through its Read tool. Its family F screenshots used **basic lighting**: detailed lighting was disabled after the legacy comparison and was not re-enabled before loading the trees. These images therefore do not assess the detailed-tree and new-lighting combination. The legacy detailed capture also still had 111 fauna terrain stencils pending (138 in the earlier failed run), despite lifePending being zero. Repeated packing in that window does not prove an invalidation regression; settled family captures held the counter at 325. The full report is preserved with the review as luna-report-final.json (byte-identical to the supplied luna-report.json). Combined detailed lighting and fully warmed performance need another capture.

## Original reviewer response

I have everything I need: all four screenshots, the whole report, the 390 m image and the relevant source. Here's the review.

# Opus 5.5 progress and direction review (local surface lighting, life packing, canopy cache, foliage mips)

## Summary

The tree method is settled: pinned MIT EZ-Tree Oak (seed 35729) goes through the Atlas adapter, and Pine is being adapted from upstream the same way. Atlas added the runtime integration; it is not a new botanical generator. Stop evaluating tree methods.

What stands between you and a normal-game forest is not the method. It is four things together:
- The frame rate is limited by the CPU at about 20 fps on an RTX 5090.
- The scene mixes legacy and EZ-Tree styles.
- Leaves disappear at medium distance even with the new foliage mips.
- Nobody has seen the EZ-Tree family with the new lighting turned on.

## What the images and report show (observed)

1. **Lighting.** Compared with basic mode, detailed mode clearly improves crown undersides: dark green instead of nearly black. But ground shadows are almost black blobs. Nothing lights shadowed terrain except the sky fill (0.7) and a reduced ambient (0.088). Round legacy crowns cast coin-shaped shadows, which draws attention to how artificial the trees are. Trunks are near-black in all four images.
2. **Both family close-ups were taken with lighting disabled** (`lighting.enabled:false` in both family phases). The EZ-Tree family has therefore never been shown with shadows or sky fill.
3. **Mixed styles and scale.** The family trees read as real branching trees, much better than legacy. However, 13 of the 22 near trees are still legacy (`visible:[9,202]`, `near:22`), including the crown that fills the foreground. Legacy crowns are much wider than EZ crowns at similar heights. This is the mixed look the direction document said to avoid.
4. **Default vs coverage mips at 11.7 m.** Only 0.77% of pixels changed (`mipImageDelta`). This pose can't show a difference. The only 390 m image uses coverage mips, and it has **no A/B comparison**.
5. **The 390 m image (`family-coverage-mips-mid.png`).** Detailed trees at bottom-left show as bare twig skeletons next to fully crowned legacy lollipops. The legacy canopy is regular and looks like a toy. This distance is the "forests before landing" case, and it is currently the weakest view.
6. **The mip report explains point 5.** Levels 9–11 have **zero** leaf coverage and level 8 has too much (0.25 against a 0.19 target). At level 9 each atlas cell is a single texel. `remapAlpha` then picks 0 coverage because 0 is closer to 0.19 than 1 is, so every leaf is discarded. I'm confident this contributes to the bare trees. That LOD1 leaf-card sizes are the whole cause is not proven.
7. **Performance at 11.7 m.** Median frame time is 45.7–49.7 ms. `planetUpdateMs` median is 29.5–32.6 ms, down from about 34, so the caches gained roughly 2–4 ms. GPU pass sum is 8.8–11.1 ms. The limit is the CPU.
8. **Wasted triangles.** The family adds **2,693,328 triangles** to draw 211 trees. That equals 22×13,806 + 491×4,866 almost exactly. So both detailed batches submit every resident slot, and hidden ones are only discarded in the fragment shader (`src/tree-asset.ts:211-214`, called with `mesh.count` from `reconcileBatch`). The legacy batches do the same in reverse. With lighting on, the shadow pass repeats all of this.

## `lifePackBuilds` in detailed mode (hypothesis, not proven)

In the detailed phase the state shows `faunaTerrainPending: 111`. The basic and later phases show 0. The counter climbs to 325 and then stays at 325 through every later phase, and its growth rate (~10 per 750 ms) matches herds finishing their ground-height grids one at a time.

`processLifeQueue` sets `lifePackingDirty=true` every time a herd's ground-height grid (`faunaGroundQueue`) completes. The stability check looked at `lifePending` and `terrainPending`, not `faunaTerrainPending`. Detailed mode also ran first, so run order is a confound: this is probably arrival settling, not lighting.

To confirm:
- Add `faunaTerrainPending==0` to the stability check.
- Run basic mode first.

If confirmed, it is a harness problem. Coalescing repacks during the herd's ground-height backlog would still be a cheap improvement.

## Source-level risks

- **Mip tail** (`src/tree-foliage-mips.ts`, `buildTreeFoliageMipPixels`/`remapAlpha`). Supply only levels 0–7, where each cell has at least 4×4 texels. With WebGL2 texture storage, sampling then stops at the last supplied level. Check this against your pinned Three version. Leaves beyond that distance belong to the far representation.
- **Premultiplied canvas round-trip (hypothesis).** `drawImage` → `getImageData` → `putImageData` goes through a premultiplied 2D canvas. That loses the colour of fully transparent texels and rounds low-alpha colour. The result could be dark fringes at filtered leaf edges. Passing `ImageData` objects directly as mip images avoids this.
- **Runtime cost.** Building the mips takes 276 ms synchronously on the main thread during load. For normal asset loading, bake the coverage mips offline with assetctl (KTX2 with explicit mips) instead of fixing the runtime path.
- **Shader compile hitch on descent (hypothesis).** `SurfaceLighting.update` switches `castShadow` when shadow strength crosses the 300–700 m fade and at sunset. The first crossing changes the shadow-light count, which recompiles shaders for terrain, trees, flora and fauna during descent. Precompile both variants, or keep the variant stable and set intensity to 0.
- **Shadow darkness is a tuning problem, not a bug.** Reducing ambient to 40% while adding hemisphere fill makes shaded ground too dark. Keep more ambient or raise the ground-colour contribution, and judge it on the family trees, not legacy blobs.

## Challenging the proposed sequence

**Patch-group broadphase: defer or replace.** The frame looks up 5,670 patch keys for about 18.6k candidates, only ~3.3 per patch. Grouping by patch saves a modest constant factor and adds ordering and hysteresis risk. The bigger saving comes from the candidate list itself: `forestPopulationCells(... forestFootprintM+100, canopyFootprintM ...)` returns the dense 750 m disk (~5.5k cells) plus sparse far representatives out to 4.5 km.
- Split `wanted` into a near list and a far list.
- Iterate far representatives only for patches that are not yet current. Keep a small set of those keys; it shrinks once streaming settles.
- This removes about 13k iterations per frame rather than making each one cheaper.
- It keeps the legacy fallback when the canopy isn't ready.
- Take a fresh CPU profile afterwards.

**Compact per-family instance pools: do it, and before the broadphase.** Point 8 above measures the waste directly. It gets worse once Pine is added (spire slots in a third batch) and doubles again in the shadow pass. It's cheap, and it's needed for a mixed oak and pine view with only one style visible per tree.

## Minimum coherent normal-game deliverable before the next publish

One valley reached through the normal controls:
- **Trees:** EZ Oak for branching species and the Pine family for spire species, so no legacy geometry is visible in the accepted views. Legacy remains only the load/error fallback.
- **Lighting:** detailed lighting on, with tuned shadow fill.
- **Mips:** coverage mips built offline and truncated at the tail.
- **Far canopy:** tinted or scaled from the same family data so it matches the near trees' crown width, height and colour. Use the existing far representation; no new impostor system.
- **Loading:** a normal setting plus normal asset loading, not the console hook.
- **Capture set:** identical poses at 11 m, 390 m and 3 km, taken in basic and detailed lighting and with default and coverage mips, including grazing sun.
- **Performance:** full-game frame distribution with the feature on and off, cold and warm loads.

"Coherent" here means consistent style and lighting, not 60 fps. But publishing at 20 fps on a 5090 should come with a stated performance caveat.

## Stop or defer

- Further tree-method comparisons, isolated mip, alpha-to-coverage or hash labs, impostor capture work, atmosphere LUT, WebGPU.
- Structural variants and per-species dimensions beyond what one Oak and one Pine need.
- The broadphase as proposed.
- XR shadow-memory cleanup (note it; don't block on it).

## Next deliverable, in order

1. **Pool compaction.** Separate compact pools for each family so hidden slots aren't submitted.
2. **Pine family in-game.** Load the Pine family into the game and review it visually.
3. **Mip fixes.** Truncate the tail and switch to `ImageData` or an offline bake.
4. **Near/far candidate split.** Iterate far representatives only while their patch isn't current.
5. **Lighting capture.** Fix the stability-check gap, then do a combined family + detailed-lighting capture at 11 m, 390 m and 3 km with on/off profiles.

This review is based on source reading and one report's evidence. None of it is new test execution, visual acceptance or a claim about general performance.
