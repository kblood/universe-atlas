# Assessment of the updated Opus 5.5 progress review

Genuine `claude-opus-5-5` / firstParty reviewed snapshot `8278952`, current
source, four close screenshots, and additional browser evidence through its
read-only tool. The [original review](opus-5.5-surface-progress-review-2026-09-28.md)
and model/input metadata are preserved. This is a direction review, not release
acceptance. Live remains `8e16776`; the lighting changes remain local.

## Decisions

1. **Compact the detailed instance pools first.** `reconcileBatch` currently
   gives the detailed batch the legacy batch's entire count, hiding unsupported
   slots with coverage. This still submits their vertices. Use compact pools
   per family and LOD with stable canonical identity and bounded capacity.
2. **Finish branching and spire together.** Continue the pinned EZ-Tree Oak/Pine
   adapter. Review Pine in the game, then match far crown shape, coverage,
   colour and physical dimensions to the near families. Preserve physical leaf
   dimensions. More generator comparisons and structural variants can wait;
   they remain in the full plan where applicable.
3. **Fix the combined validation.** The latest family captures accidentally
   retained basic lighting. Luna is adding detailed-lighting captures that wait
   for both life placement and fauna terrain stencils. No combined shadow/wind
   acceptance is claimed from the basic-lighting screenshots.
4. **Address distant foliage and loading cost.** The mip report confirms zero
   coverage in levels 9–11, and a synchronous 276 ms setup on this machine.
   Evaluate an offline explicit mip chain through assetctl and a safe last mip
   level, with matching colour/depth sampling. Validate the pinned Three upload
   path and actual mid-distance result before choosing a truncation policy.
5. **Reduce the far candidate work.** Keep the new patch-group helper isolated
   for now. Evaluate a retained near/far work list that omits far representatives
   only when their census is complete and current. Movement, water changes,
   census replacement/failure and hysteresis must restore fallback correctly;
   preserve the canonical order where instance budgets can affect selection.

The next coherent deliverable remains one normal-game forest area with both
families, consistent near/far presentation, readable lighting, ordinary asset
loading/settings and measured cold/warm travel. Ground cover, terrain materials,
fauna, clouds and broader desktop realism remain part of the active goal.

## Qualifications and corrections

- The review's claim that caching gained 2–4 ms is **not established** by these
  sequential runs. Different warm-up states and run conditions prevent a causal
  speedup claim. The current timings still show substantial CPU work; they do
  not establish a hardware floor or sustained performance across the game.
- `lifePackBuilds` growth happened while fauna terrain stencils were pending:
  111 in the revised detailed capture, 138 in the first failed capture. Later
  basic/family captures had zero pending stencils and held at 325. This supports
  the settling explanation; it does not prove a lighting invalidation bug.
- Zero coverage in the smallest mip levels is measured. Whether those exact
  levels caused the bare crowns in the 390 m image is an inference: the capture
  has no matched default-mip image or sampled-mip instrumentation. LOD geometry,
  filtering and the near/far handoff also need consideration.
- The review's suggested truncated mip chain and direct `ImageData` upload are
  implementation proposals. The installed Three source uses explicit mip count
  for texture storage, but renderer completeness, filtering and colour behavior
  still need runtime validation. Do not treat either proposal as a tested fix.
- Shader compilation at the first shadow transition and premultiplied canvas
  fringes are hypotheses, not measured failures. Cold descent should distinguish
  shader compilation, upload and mip generation costs.
- The detailed-family triangle increase is consistent with the confirmed
  shared-slot submission in source. Future savings must be measured after
  compaction with the same view and shadow setting.

The complete report received after prompt submission is preserved as
[luna-report-final.json](../test-results/opus-surface-progress-review/luna-report-final.json).
The review and this assessment will join the next documentation publication;
they have not yet been deployed.
