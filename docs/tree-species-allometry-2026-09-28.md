# Tree species allometry (`tree-allometry-1`)

_Development-worktree status, 2026-09-28. CPU tests, TypeScript and the
production build pass. No GPU, browser, device, Quest or visual acceptance was
run; dimensional consistency is not tree realism._

Baseline `a755f1b`. Before this change, rendering used the canonical population
height (`cell.heightM`, a 10–22 m census proxy) and clipped detailed-tree
eligibility to that window. Recipe stature, crown width and trunk diameter were
not drawn.

## Mapping

`src/tree-allometry.ts` makes one frozen `ForestTreeDimensions` decision per
canonical individual. The near, mid, far, legacy, culling, shadow and
diagnostic paths all read that same decision:

1. The dated catalogue binding supplies the recipe. `treeStructuralVariant(recipe, appearance.variant)`
   supplies the individual's height H, crown width W and trunk diameter D.
   The canonical height is read only when no dated species binds
   (`no-dated-species`).
2. The family reference is measured from the loaded LOD0/LOD1 vertices at
   the 16 m skeleton. It records the trunk base radius, the p95 foliage-pivot
   radius, the p75 card extent, the skeleton extents, the structural-variant
   envelope and the maximum card scale.
3. The drawn height is H. The skeleton scales by H/16. Horizontally, a radial
   map scales the trunk core (r ≤ trunk radius) by `trunkRatio` and everything
   outside it by `crownRatio`, offset so that branches stay attached to the trunk.
   Leaf cards stay in metres, so crown width = mapped pivot spread + 2 × card
   extent. This is not a uniform whole-tree stretch.
4. Both ratios are quantized to 8 bits (0.25 + q/128, where 1 is exact). One
   packed code goes to every representation. The legacy stand-in gets its own
   code that reproduces the same physical crown width and trunk diameter.

Canonical IDs, occupancy, positions, yaw, roll, dates, species assignment and
population density are unchanged. Tests check that the binding is untouched
and that the far slot's root, rotation, ground, roll seed and ownership stay the same.
Versions: `FOREST_PRESENTATION_VERSION` 2→3, analytic impostor program 7→8,
detailed program `atlas-tree-physical-3/tree-allometry-1` and legacy
program `/tree-allometry-1`. The far presentation key now includes
`TREE_ALLOMETRY_VERSION`.

## Envelopes and fallbacks

| Representation | Height | Crown ratio | Trunk ratio |
|---|---|---|---|
| Oak/Pine family (detailed + far analytic/atlas) | 8–24 m (was 10–22) | 0.5–1.75 | 0.5–1.5 |
| Legacy primitive (instanced + far analytic) | 0.1–40 m | 0.25–2.24 (codec) | 0.25–2.24 (codec) |

Any species outside the family height envelope, or any family without a
presented or valid reference, falls back to the legacy primitive at its
physical height. Ratios outside the envelope are clamped. Every fallback or
clamp carries one of the reasons in `TREE_ALLOMETRY_REASONS`, and
`detailedTrees.allometry` counts them for both the near (per-frame) and far
(per-retag) paths, along with the rendered height range. No 10–22 m check
remains in the rendering eligibility, bounds or asset paths. The canonical
range now appears only as the diagnostic `canonicalHeightRangeM`.

## Measured range (4 biosphere seeds, 28 dated catalogues, 24 species, 96 cells each)

| | Oak (branching) | Pine (spire) |
|---|---|---|
| Reference trunk radius / p95 crown radius / card extent (m) | 0.308 / 4.25 / 1.30 | 0.312 / 3.30 / 1.30 |
| Drawn height (m) | 8.79–15.88 | 10.24–18.30 |
| Drawn crown width (m) | 5.18–15.67 | 4.78–6.50 |
| Drawn trunk diameter (m) | 0.30–0.54 | 0.27–0.47 |
| Envelope sphere radius (24 m, max ratios, variants, wind, cards) | 31.36 m | 31.19 m |

Recipe targets: H 5.56–18.30 m, W 2.26–15.65 m, D 0.19–0.54 m. Of 2,688
bindings, 2,345 draw as a family. The other 343 (12.8%) fall back to legacy
with `height-below-family-envelope`, because the species is under 8 m. **1,349
family draws (58%) are `crown-ratio-clamped`**, all at the 0.5 floor:
1,328 of 1,333 Pine draws plus 21 Oak draws. The recipe's conifer crowns are narrower than the
packaged Pine skeleton plus metric 1.3 m cards can draw, so in practice every
Pine renders wider than its recipe. The trunk ratio is constant per family (Oak 0.883, Pine
0.664) because the recipe's trunk diameter is proportional to height.

## Bounds, channels and costs

- Culling and shadow spheres are per individual. Family draws use
  `forestFamilyBoundRadius`, which covers the radial map, variant scale/twist/lean,
  both wind extremes and maximum card growth, and also contains the
  same-width legacy stand-in. Legacy draws use `legacyTreeBoundSphere`. The
  family `conservativeBounds` and far bound uniform cover the full envelope.
  The analytic far box uses the same `treeAllometryBox` growth on the CPU
  (`proxyBounds`) and in GLSL. A test checks every real Oak/Pine LOD vertex
  against these bounds for every variant, wind sign and envelope corner.
- Far handoff (`canHandoff`) requires matching rendered height and ratio code.
  An origin rebase copies the drawn height, and a retag during a rebase
  updates slots the rebase has already passed. The worker still emits
  canonical records, and the height it draws comes only from presentation.
- There is still one far atlas per family, captured once at 16 m with authored
  proportions. No per-species texture, atlas or uniform is added. The atlas
  member is stretched horizontally by the crown ratio when drawn.

Added memory (triangle, draw, LOD and atlas caps unchanged):

| Channel | Bytes |
|---|---|
| Legacy `instanceTreeAllometry` f32 × (192 + 4096 + 8192) | 49,920 CPU + GPU |
| Detailed `instanceTree` vec2→vec4 × (192 + 4096) per family | 34,304 per family (68,608 for Oak + Pine) CPU + GPU |
| Far impostor ratios packed into the existing `parameters.x` float | 0 |
| Far canonical-height host copy, f32 × 229,376 | 917,504 CPU |

Shader work grows slightly because of the radial map. No performance claim is
made.

## Evidence

- `node --test` on the 15 focused tree/forest files: 134 tests, 131 passed,
  0 failed, 3 skipped. The skips are the retained-GLB checks that need
  `ATLAS_TREE_CANDIDATE`.
- New `tests/tree-allometry.test.mjs` covers species dimensions across
  dates and families, canonical invariance and determinism, Float32/GLSL codec
  exactness, matching near/mid/far/legacy parameters, maximum culling/shadow
  bounds against real vertices, no atlas or uniform duplication, and
  fallback/error behavior. Existing bounds, profile, presentation, impostor,
  far-atlas and asset tests were updated for the new channel.
- Full `npm test`: 754 tests, 749 passed, 2 failed, 3 skipped. Both failures
  (`version-compat` §6.2 surface-version pin and `terrain-water-refresh`
  `document is not defined`) fail identically on a clean `a755f1b` checkout.
- `tsc --noEmit` and `npm run build` pass.

## Open gates

- Visual: whether the far atlas's crown-ratio stretch (which also stretches
  the captured trunk) matches detailed trees at handoff, and whether the
  radially widened or narrowed skeletons look right.
- Leaf scale: with metric cards and a fixed card extent, narrow conifer
  crowns clamp and small crowns change their leaf-area density. Resolving
  this needs a smaller-card or different Pine asset, not a stretch.
- Species under 8 m draw only as the legacy primitive.
- Material and lighting under changed crown density, Quest/immersive
  performance, and ordinary-game flight/handoff acceptance (Luna).

## Provenance

Opus 5.5 (`claude-opus-5-5`) runs 1–3 wrote the implementation and tests
without verifying them. Run 3 was PID 48260, session `aaf1bda0-ce29-4e52-bcd9-a4498b5a3bbf`,
and exited with code 0. Continuation run 4 (Opus 5.5) ran the verification
above, measured the ranges in this record with a throwaway script, and wrote
this record and the commit. No code changes were needed during verification.
