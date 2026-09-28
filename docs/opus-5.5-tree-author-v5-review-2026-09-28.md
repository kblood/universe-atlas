# Opus 5.5 tree authoring v5 source review — 2026-09-28

Reviewed by Opus 5.5 (`claude-opus-5-5`), from the supplied source only. Nothing was executed; the triangle figures are hand-derived.

## Bugs / blockers

**1. Bark UVs have a seam and a fan on every tube.** `tree_mesh.py` tube faces: each ring's `u` runs from 0 to `r·τ`. The corner at `a[0]` gets u=0 from face 0 and u=`au` from face `sides-1`. The texture repeats every 1 m, but `au` is almost never a whole number, so every trunk, limb and branch shows a hard seam along its length. `au` also changes from ring to ring, so a ridge at fixed `u` sits at angle `u/au` on one ring and `u/bu` on the next. Ridges therefore slant and bunch up toward the seam. The trunk's last segment has a radius ratio of about 1.6, and primary tips are much worse. The "1 unit/metre around" claim holds per ring, but the result is not usable.
*Fix:* make the bark periodic at 1/9 m in `u`: change grain 47→45 and patches 3→9, since ridges are already 9 per metre. Then use one `u` span per tube, `max(1, round(c_base·9))/9`. Ridges then taper naturally and wrap without a seam.

**2. LOD1 leaves float and save little GPU time.** Dropping secondaries and twigs removes all wood within about 1–3 m of every card. Secondaries reach 2 m, twigs 1.1 m, and secondary roots are up to ~3 cm in radius, which is still visible at typical LOD1 distances. This contradicts the brief's "connected, tapers continuously at … 50 m". The foliage is the main GPU cost, since each 1.2 m² card is only ~20% leaf and the rest is alpha-test overdraw. LOD1 keeps all of it, so it mostly saves cheap triangles. The budget leaves no room to fix this by adding wood back:
- LOD1 worst case: 236 trunk + 16×66 primaries + 1728 cards×2 = **4748/5000**
- LOD0 worst case: 15116/18000

Getting secondaries back into LOD1 means thinning foliage, for example one spray per twig with coverage compensation. It could also be done by painting twig and branchlet wood into the atlas shoot. Either way, the "all foliage retained" design needs a decision before LOD2 inherits it.

**3. Wind weights shear the cards.** `_WIND` is `(z/16)²` per vertex. At z≈14, a card's corners differ by about 18% in weight, so any displacement-based wind stretches the 1×1.2 m cards. The physical dimensions only hold at rest. `_LEAF_CENTER` is also the card centroid (`base + 0.6·axis`), not the twig attachment point. Pivoting around it swings the shoot base off the twig.
*Fix:* give all four corners one per-card weight, sampled at the attachment point. Export the attachment point, alone or alongside the centre. The glb test currently enforces the per-vertex rule, so it needs updating too.

**4. The secondary budget thins the upper crown.** Draws are uniform 5–7 in root order, with a mean of 6 × 16 = 96. The cap therefore often binds late, and it binds on the highest primaries, forcing them to 5. The invariant holds (always ≥5, total ≤96), but the bias is structural.
*Fix:* sample the full composition up front, then shuffle it.

**5. The crown is a one-turn helix.** Roots sorted by height and azimuths summing to exactly τ mean the lowest and highest primaries are neighbours in azimuth. Every seed and variant will share this staircase. The gap bound holds at attachment: at most 1.55/(1.55+15×0.65) of a turn, about 49°. At the tips, twist (±0.3) and bend (±0.22) can widen it to roughly 80°, which is under 90° but not measured.
*Fix:* use a golden-angle base increment plus bounded jitter. Compute and gate the maximum circular gap on the sorted tip azimuths.

## Numerical / rendering

- **Bark aliasing:** the `(sin²+.002)^.18` crevice is about 0.9 px wide at 1024 px/m. Colour and normal both alias; the central difference straddles the notch, so it sparkles until mips blur it. Widen the epsilon or band-limit. Leaf veins (`exp(-550|across|)`, ~1 px) have the same issue.
- **Bark normal math is correct:** the slope is in m/m, it is periodic through `np.roll`, and all frequencies are integers. The stated "3 mm amplitude" is then scaled by the NormalMap node's 0.8, so the manifest overstates it slightly.
- **Tip caps** map 1 m of bark onto caps a few mm across. Minor.
- **Cards are rigid:** the frame is orthonormal after roll, and the glb test measures all six distances. **Height/root:** the bisection plus the post-export Y check is sound. As you noted, height is the quad envelope; the card tops sit about 8 cm above the leaf pixels.
- **`_LEAF_CENTER` mapping** `(x,z,−y)` is verified empirically by the centroid test. Good. Bark vertices carry zero centres; drop them or document them.
- **Duplicate textures:** each LOD GLB embeds the full atlas and bark textures, which duplicates GPU memory until shared binding and KTX2 land.

## Provenance

- `artifacts[].path` and `lods[].runtime` are absolute paths. They leak local directories and make manifests differ per machine. Store them relative to the output directory.
- The `preExportAudit` fields `materials`, `uvLayers` and `appliedTransforms` are hard-coded, not measured.
- Record `bpy.app.build_hash`, the glTF exporter add-on version, and `numpy.__version__`. The raw-attribute claim and the bark bytes depend on these.
- Record the generator's actual outputs: secondary and twig counts, pairs per tile, max azimuth gap, and LOD triangle split. The v5 claims are currently only in code comments.
- A late `relative_to(parents[3])` failure fires after the export and overwrites the manifest as failed. Validate this up front.

## Tests

- The LOD parity test needs `ATLAS_TREE_LOD0/1_GLB` and the smoke test never sets them, so parity never runs in CI. Call the parity check from the smoke run.
- The glb test's default path is a hard-coded timestamped candidate, and `v5` is taken from that candidate's manifest. An old v4 output would pass the relaxed branch silently. Require `operation === author-5` when auditing v5.
- Nothing checks the claim that LOD1 keeps the trunk and primary tubes exactly. Add a check that LOD1 bark is a subset of LOD0 bark, mirroring `foliageContent`.
- LOD bounds agreement within 0.02 is an AABB check, not a silhouette check, and nothing structurally guarantees that foliage bounds the wood. It will fail loudly if violated, which is fine, but don't cite it as transition evidence.

## Verdict

These hold: rigid physical cards, root and height, triangle budgets, the budget invariant, determinism, and the leaf-centre frame. These do not hold yet: seamless bark tiling, and LOD1 as a visually connected and GPU-cheaper level. Items 1–3 should be resolved before further evidence or LOD2 work.
