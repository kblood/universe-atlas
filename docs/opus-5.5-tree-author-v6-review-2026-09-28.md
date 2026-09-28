# Opus 5.5 tree authoring v6 source review — 2026-09-28

# Atlas tree authoring v6 review

This review covers only the supplied source. Nothing was executed. Triangle figures are my arithmetic from the code, not measured output.

## Verified correct in v6
- **Bark seam math holds.** `wrap_span` is a positive multiple of 1/8, and it is constant per tube, so the seam edge samples u≡0 on both sides. Per-ring spans would reintroduce shear on the seam quad, so constant-per-tube is the right choice.
- **The bark tile is exactly periodic.** Horizontally it has 1, 5 and 1 cycles per 128 px. Vertically it has 3, 11, 7 and 5 cycles per metre. `np.roll` wraps inside the true period.
- **The LOD1 worst case of 4988 is reproducible:**

  | Part | Triangles |
  |---|---|
  | Trunk | 236 |
  | Primaries | 1056 |
  | 84 secondaries × 8 | 672 |
  | 84 × 9 twigs × 2 cards × 2 | 3024 |
  | **Total** | **4988** |

  The bound is real because `secondary_counts` always sums to 84.
- **Leaf wind is now card-rigid.** `LEAF_PIVOT` is the pre-offset twig point, and it is transformed before card construction.

## Bugs and blockers

**1. The determinism gate is recorded but not enforced.**
- `executionThreads` records `scene.render.threads`, but nothing rejects values other than 1.
- Render threads are also only a proxy for the TBB/MikkTSpace scheduler.
- Add `if scene.render.threads != 1: raise`, and document the required `-t 1` launch.
- The four matching serial runs were v5 evidence. v6 changed the mesh, bark and skeleton hashes, so repeat runs are needed before claiming v6 determinism.

**2. Bark is visibly mechanical.** This is the main remaining visual issue.
- All eight 128 px tiles are byte-identical, so every ridge around every tube is the same ridge every 12.5 cm.
- The pattern repeats exactly every metre vertically, which reads as a fluted column.
- Every tube starts at V=0, so bark phase lines up at every junction.
- Cheapest seam-safe fix: add a seeded per-tube V offset. V is continuous only within a tube, so offsets cannot open seams.
- Beyond that, you need a longer V period, or a second 1/4-period ridge variant used only on tubes whose span is a multiple of 1/4 (trunk and large primaries).

**3. LOD1 secondaries get thinner.**
- A 3-sided circumradius-r tube has a mean projected width of 1.654r. LOD0's 4-sided tube has 1.80r.
- The result is an 8% thinning pop at the transition.
- Fix: scale the LOD1 secondary radii by about 1.088.

**4. LOD1 correctness depends on switch distance, and that distance is not recorded.**
- Dropped twigs have base diameters up to about 4 cm (`twig_radius*.5*2`, where twig radius is up to ~0.02 m).
- Their cards sit up to 1.1 m from the retained wood.
- Emit `lod1DroppedTwigMaxDiameterM` into the manifest.
- Derive the minimum switch distance ≈ `D·H_px / (2·tan(fov/2))`. At 1440p and 60° that is about 50 m for 4 cm.
- A switch closer than that shows floating sprays. The limitations text should state this boundary rather than just "review required".

**5. Invisible cap triangles are spending the budget.**
- Each of the ~756 LOD0 twigs gets a 0.2 mm tip cap, which is degenerate and gives a poor MikkTSpace input.
- Every level ≥1 tube also gets a base cap buried inside its parent.
- Dropping the base caps for `level>0` and the tip caps below about 1 mm radius saves roughly 1.9k LOD0 triangles (~14%).
- In LOD1 it saves ~264 triangles, lifting headroom from 12 to ~276.
- That LOD1 saving could retain the ~45 thickest twigs, which directly helps finding 4.

**6. Crown density is inverted.**
- The 5s and 6s are shuffled without regard to `envelope`.
- An apex primary with 0.35–0.48 m reach can carry 6 secondaries and ~108 cards, the same as a 4.8 m basal limb.
- Card density per crown volume is therefore highest at the apex. That gives a tufted top and an alpha-overdraw hotspot.
- Fix, keeping the total at 84: assign the four 6s to the four largest-`reach` primaries after a deterministic sort. Alternatively, scale `twig_count` by envelope under a fixed sum.

## Gate gaps (cheap to add)
- **Custom-attribute frame is not checked after export.** It relies on the 5.1 claim that "FLOAT_VECTOR is copied unchanged". Read the `_LEAF_PIVOT` and `_LEAF_CENTER` accessor min/max from the GLB and require pivot Y in [0, 16.02] and within the POSITION bounds. A wrong axis conversion would produce negative Y, which this check catches.
- **LOD silhouette agreement only checks max Y.** The brief requires silhouettes to agree within 0.02 m. Compare all six bound components between LOD0 and LOD1. A dropped twig tip can be an X/Z extreme.
- **Some `measuredAudit` fields are always true.** `appliedTransforms` and `materials` cannot fail for fresh objects, so don't cite them as evidence.

## Minor issues
- **Schema version mismatch:** failure manifests write `schemaVersion: 1`, but success writes 2.
- **Leftover modifier:** `EXPORT_Triangulate` persists on both objects in the saved `.blend`. Either remove it after export or document it as part of the source.
- **Brief notes claim review early:** they say the proposals "have been authored ... and reviewed" while v6 is still under review. Any later wording fix will also change the recorded brief hash.
- **Naming mismatch:** the brief deliverables use `temperate-branching-v1.*`, but the emitted files are `atlas-branching-v1.*`. The rename/packaging mapping is unrecorded.
- **Foliage fringe check (unverified):** confirm the saved foliage PNG keeps the green RGB under alpha=0 and has not been zeroed by the float→byte conversion. Zeroed RGB would cause dark fringes once mips land.

## Runtime-readiness boundaries (not defects)
- **LOD1 does not reduce foliage cost.** It keeps every card, so alpha-test fill and overdraw are unchanged from LOD0. Its savings are vertex and wood only, so claim no fragment or GPU benefit.
- **Constant U span compresses bark heavily toward tips.** Horizontal compression reaches ~25× at the trunk top and ~45× at primary tips. Whenever mips land, this needs anisotropic filtering, not just trilinear.
- **Wind is height-only per vertex.** Long low limbs move exactly like the trunk at the same height. This is already disclosed in the manifest.

The pending items (LOD2, variants/shared atlas, wind binding, transmission, mips, lighting, license) are correctly declared in `limitations`, and I have not treated them as findings.

**Suggested order:** 1, 2 (V offset), 5, 3, 6, 4, then the gates.
