# Understory geometry candidate

**Status:** local implementation candidate; browser, GPU and normal-game appearance review remain pending. No deployment or visual-acceptance claim is made.

## Implementation

Opus replaced the cone grass and umbrella/pyramid shrub with deterministic walk-scale geometry in `src/flora-field.ts`. Each shrub has four woody stems with two attached twigs and foliage; near LOD foliage uses 20 varied leaves, while middle/far LODs reduce the foliage to 12/4 leaf sprays. Grass uses 7/3/3 two-sided blades across the three LODs. Placement, recipes, seeds, per-instance position/yaw/scale, wind attribute range, capacities, draw calls, culling, shadow policy and LOD distances remain unchanged. Flower and tree geometry were not edited.

LOD continuity is a CPU geometry proxy, not visual acceptance: grass LODs resample blade counts and arch, so their per-blade positions/lean are not identical across levels. The silhouette tests check broad height/spread and view coverage; camera-crossing appearance must still be checked in the real renderer. Existing flower/tree stem-winding issues are recorded as a follow-up and were not changed here.

## Costs

| Geometry | Near / middle / far triangles per plant | Full-capacity triangles |
|---|---:|---:|
| Grass | 70 / 18 / 6 | 17,920 / 9,216 / 6,144 |
| Shrub | 284 / 60 / 28 | 36,352 / 15,360 / 14,336 |

Across the full capacities of all three LODs, grass plus shrub geometry totals 99,328 triangles. Ordinary-play grass, shrubs and flowers total at most 122,752; tree geometry remains unchanged and is not drawn in ordinary play. Grass and shrub buffers reach 35,916 bytes per planet in the eight tested seeds. Shadow rendering uses the same meshes, so the additional pass also processes the new triangle counts.

## Verification

Genuine first-party Opus 5.5 (`claude-opus-5-5`, session `afb6f577-4739-47b2-a1ac-1d962c4e5bc0`, PID 620) started from clean `c9ba64f98a7112a2ddaba50c05d48a90dbd3d321`. Launch metadata, final response and process receipt are retained locally under `test-results/understory-opus/run-1/` in the implementation worktree; those local job files are not website downloads. Its implementation commit is `3093fe8`.

- Focused flora command: 33/33 passed (`flora-understory-geometry`, `flora-field`, `flora-culling`, `flora-recipe`).
- `npx tsc --noEmit -p .`: passed.
- `npm run build`: passed in 7.34 seconds; existing large-chunk warning only.
- After correcting a stale source-regex assertion, `flora-cache-ownership` plus `flora-understory-geometry`: 13/13 passed. The old assertion expected `faunaGenomes.clear()` to be immediately followed by `faunaGroundQueue=[]`; the unchanged baseline renderer already has `faunaNear.clear()` between them. Its cache-eviction behavior assertions are preserved.
