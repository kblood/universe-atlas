# Forest visual follow-up — attempt 2 receipt

- Model: `claude-opus-5-5` (first party); session `fca86e0d-bd8d-4086-8382-5144d18e39e2`; launched 2026-09-28T18:16:41Z (`launch-metadata.json`, `process.json`).
- Base revision `3cea06046ac2becc8406dbefcb70bde48737bb22` with the uncommitted attempt-1 source state kept as-is (`../attempt-1-interrupted.json`). Nothing was reset, cleaned or stashed.
- Implementation commit: `c7e9205` on `opus-forest-coherence-visual-20260928`. Not merged, not deployed.
- **Hardware acceptance: NOT RUN.** This non-interactive session had no way to reach Luna acceptance/guide, so the slot was never confirmed. No Vite dev server, Playwright, Blender, GPU capture or frame timing was started. **There is no visual acceptance claim.**

## What changed

**Far representation.** The stacked analytic crown bands/discs are replaced by an atlas captured from the real LOD1 meshes (`src/forest-far-atlas.ts`):
- Layout: 9×9 hemi-octahedral views, 64 px tiles, all eight structural members per layer, 9 mips.
- Capture: rest wind, the family's `lod1CardScale`, and the 16 m reference height.
- Bake: three views per frame, before the scene renders, never during XR (`forestAtlas` render-profile pass). About 28.3 MB per family, plus ≤16 MB of scratch that is released when the bake finishes.
- Draw: the far impostor ray-traces the atlas with a fold-aligned three-view blend (`src/tree-impostor-views.ts`) and one parallax step. A leaf optical-depth correction, derived from metric leaf cards (`k = mix(1, 256/h², leafFraction)`), handles canonical heights from 10 to 22 m.
- Fallback: the analytic band only draws before adoption or after a failed bake. `detailedTrees.farRepresentation` reports which one is on screen.
- The eight-member structural variation still reaches the far geometry. Each tree samples its own member's tile. As a control, the own member beats the wrong member: L1 0.118–0.203 vs 0.158–0.294.

**Replay/occupancy.**
- `__atlas.forestPresentationCensus()` is a new whole-population census, called explicitly and never by the HUD. For every retained slot per family and LOD it reports owned/submitted/unbound counts, a variant histogram, and an order-independent digest over id, species, recipe, height, structural variant, appearance variant, wind and tint. It also reports selected/eligible/farOwned for the whole population.
- The corrected route `normal-game-acceptance.mjs` (not run):
  - Pauses time and holds one frozen flight pose, asserting mode and body-relative pose/heading around both seeks.
  - Drains every queue before reading any signature.
  - Compares identity digests, bounded samples and occupancy as separate checks.
  - Fails if any captured frame shows the band fallback.
  - Records render profile and memory for flight and walking.

**Unchanged invariants.** Canonical ids, positions, root contact, heights, yaw, dated species/existence and wind phase are unchanged. There is no new catalogue and no reseeding. The depth-sign formula `(captureDistance - vViewPosition.z)` is unchanged, and the new capture pins it in `tests/forest-far-atlas.test.mjs`.

## Verification (CPU only)

| Check | Result |
|---|---|
| `npx tsc --noEmit` | clean |
| `npm test` (full list) | 696 tests: 693 pass, 0 fail, 3 skipped (env-gated GLB/hardware fixtures) — `cpu/npm-test.log` |
| `npm run build` (tsc + vite build, no server) | success — `cpu/build.log` |
| `tests/forest-far-atlas.test.mjs` | 11/11 |
| `tests/planet-forest-tree-assets.test.mjs` | 26/26 (includes atlas bake/adoption/fallback and whole-population census replay) |

A mid-run fix is included: the first full-suite run failed six forest-retention tests, because diagnostics dereferenced `fullCanopy.renderer` on canopy test doubles. Diagnostics now treat the renderer as optional, like the other host hooks, and the re-run is clean.

**CPU emulation of atlas vs. directly rastered LOD1** (`cpu/far-atlas-emulation.json`, `cpu/far-atlas-vs-lod1.png`): coverage area ratio, members 0/3/6, four held-out directions, 12 and 24 px far footprints.

| Height | Oak raw | Oak corrected | Pine raw | Pine corrected |
|---|---|---|---|---|
| 10 m | 0.65–0.72 | 0.81–0.95 | 0.50–0.61 | 0.74–0.94 |
| 16 m | 0.94–1.00 | 0.94–1.00 | 0.90–1.02 | 0.90–1.02 |
| 22 m | 1.21–1.29 | 0.90–1.03 | 1.32–1.57 | 0.91–1.08 |

These are engineering hypotheses from a CPU raster, not browser evidence.

## Traces requested by the brief

- **walking-close.png bright triangles:** traced to non-tree shrub flora, not tree meshes. Left untouched; no non-tree flora was modified.
- **Pine sparsity:** the dark, sparse LOD0 pine comes from the authored needle-sprig cards. Attempt-1 silhouette/coverage measurements (`../cpu/silhouette-measurement.json`) do not justify an arbitrary density change without GPU comparison, so the geometry is **unchanged and the issue is unresolved**, pending hardware review.

## Open risks for the hardware review

1. **Shader compile:** the atlas capture and far-draw GLSL have not been compiled in a GPU context (no validator was available on CPU). Watch for console/GL errors and for `farAtlas.error` / fallback.
2. **Handoff at 550–600 m:** LOD1 card compensation (max 1.35) vs. the atlas's exact coverage may cause a visible coverage step, mainly for Oak.
3. **Lighting:** the atlas uses Lambert shading from captured normals while LOD1 uses Standard; a brightness/tint mismatch is possible.
4. **Softness:** trilinear filtering of 64 px tiles may look soft at the near edge of the far band.
5. **Bake time:** 27 frames per family, one family at a time. The analytic band is visible for roughly the first second after assets load.

## When the slot opens

Build, serve `dist/` on port 5212, then run `node test-results/forest-visual-followup-opus/resume-2/normal-game-acceptance.mjs`. Review the PNGs by hand:
- close <110 m (walking-close)
- middle 250–500 m and far >600 m (flight-near-ground, flight-lateral)
- changed heading (flight-turned, walking-turned)

Report a rejection if bands/discs, a handoff step, errors, replay/occupancy drift or over-budget memory remain.
