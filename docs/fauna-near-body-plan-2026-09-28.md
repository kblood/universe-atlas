# Planet fauna: near skinned quadruped body — implementation and CPU evidence (2026-09-28)

Brief: `test-results/opus-fauna-bodyplan/task-brief.md`. Branch `opus-fauna-continuous-20260928`.
Status: **CPU-complete**. Visual, performance and device acceptance still needs Luna's serialized visual slot. No browser, WebGL, GPU or Blender run was made.

## What changed

Ordinary planet flight and walking now draw herd members near the camera as a single connected, skinned
animal. Everything farther away keeps the existing individual instanced anatomy. The catalog, species/member
IDs, dated existence gates, genome ancestry and member positions are unchanged: the near body only
reads them.

| File | Role |
| --- | --- |
| `src/fauna-body-plan.ts` | Genome → `QuadrupedPlan`, a 22-bone rig with rest pose, a smooth-union SDF (round cones and ellipsoids), surface-nets skin, lathe ears/horns, distance-band 4-bone weights and vertex-colour coat. Built by a resumable generator so the work can be time-sliced. |
| `src/fauna-locomotion.ts` | Closed-form pose `quadrupedPoseAt(plan, member, activity, ground, t)`: lateral-sequence walk, world-fixed stance footholds, two-bone leg IK, pelvis height and pitch from the ground, idle settle/resume, grazing and look-around. |
| `src/fauna-near-rig.ts` | `FaunaNearRigs` bounded pool: 6 `SkinnedMesh` slots, 80/95 m enter/exit hysteresis, LRU geometry cache of 8, at most one build in flight with a 2.5 ms/frame budget, failure fallback, and `clear`/`hide`/`dispose`. |
| `src/fauna-runtime.ts` | Adds `faunaMemberActivityAtWorldNs`, which returns the canonical pose plus travel fraction, revolution period and time-in-state. `faunaMemberPoseAtWorldNs` now delegates to it, so both return the same value. |
| `src/planet-renderer.ts` | Fauna connection only. Takes near candidates from camera-visible fauna within 95 m. Rigged members use the same outer matrix as the instanced path (origin-relative, 1/radius scale) and are skipped from instanced submission. The pool group sits under the fauna group, so the local-aerial traversal and life-signature clear/hide/dispose also reach it. Adds diagnostics: `faunaRigCount`, `faunaNear`, near bytes in `faunaAllocatedBytes`. |

## Design choices

- **Proportions come from the genome.** Body length, torso height, leg length, neck length, head size,
  tail length and girth drive the primitive placement. Stride, foot length and posture drive the leg chain
  length (sized for the stride sweep extremes), foot angle, step lift and the stride itself. The torso rest
  height matches the instanced anatomy (`L + 0.36·torsoHeight`), so the handoff keeps the same silhouette
  height.
- **Poses are evaluated directly from the date.** Gait phase = orbit travel fraction × an integer number of
  cycles per revolution, so the gait is periodic with the orbit. Each stance foothold is the body frame at
  touchdown applied to the touchdown foothold, which keeps feet planted without slip on the curved orbit.
  Idle state, grazing choice (hashed from member ID and travel) and envelopes are all pure functions of
  `(member, worldNs)`. Nothing builds up across frames, camera visits or worker order.
- **Ground** is the immutable herd stencil (`faunaGroundHeight × relief`), the same context the instanced path uses.
- **Skinning** uses `DetachedBindMode` in body space with identity bind rotations. The mesh matrix carries
  the planet placement, so the skinned and instanced bodies share one transform.
- **Fallback:** an invalid genome, a build exception or pool saturation leaves the member on the instanced
  renderer. Failures are remembered, and the set is cleared once it exceeds 512 entries.

## Resources and lifecycle

- Budgets: 6 live skinned bodies. Up to 8 cached geometries, never evicting one in use. About 8–15k triangles per body.
  Measured about 0.6 MB per cached body, so the worst case is about 6 MB with 8 cached, inside the 16 MiB life reserve.
  That limit is not enforced in code.
- One body build runs at a time, time-sliced at 2.5 ms/frame. A full build takes 20–90 ms single-threaded, so it spreads over several frames.
  The instanced body stays visible until the build finishes.
- `clear()` on a life-signature change, `hide()` when life is hidden, and `dispose()` with the renderer.
  Tests confirm that every geometry and material is disposed.

## CPU evidence

`npx tsc --noEmit -p tsconfig.json`: clean.
`node --test` over the fauna, creature, population, life, aerial, render-profile and acceptance sets: **124/124 pass**.
The full `npm test` was not run in this session because it needed extra approval.

New tests:
- `tests/fauna-body-plan.test.mjs`: one closed, outward-facing connected skin per archetype/stage, within
  volume and ≤40k-triangle budgets; weights sum to 255 and every bone is used; hips sit inside the trunk;
  knee poles point the right way; appendages are rooted; the body responds to genome proportions; builds are
  deterministic when resumed.
- `tests/fauna-locomotion.test.mjs`: the activity adapter equals the canonical pose. A→B→A replay and
  far-future seeks give identical poses. Feet stay planted without slip and touch the stencil across
  idle↔walk windows. Measured: penetration 0 on sloped/bumpy stencil, reach error < 6 % of leg length, and
  joint motion 0.09–0.18 m per 1/30 s (limit 0.2). Also covers rigid bone lengths, idle settle, grazing head
  clearance, and locomotion changing with proportions. Cadence is 0.6–1.13 Hz.
- `tests/fauna-near-rig.test.mjs`: CPU skinning via `applyBoneTransform` matches the solver bones, keeps
  hooves on the ground and penetration < 0.05 m, with edge stretch < 3.5×. Also covers capacity, hysteresis,
  slot stickiness, time-sliced build with fallback, invalid-genome fallback, bounded cache and full disposal,
  and a planet integration mirror (no duplicate draws, same outer matrix, matching root height, handoff back
  to instanced beyond 95 m, date replay).

## Known limits / for Luna's visual slot

- Linear blend skinning only. Deep grazing stretches about 40 withers edges up to ~3.1×. The neck flex is
  limited to 1.35 rad and split across two neck bones, but check for visible creasing.
- One walk gait on the planet (the herd model has no run state yet). No obstacle-aware paths. The stencil
  has about 8 m resolution, so small rocks are not stepped over.
- Not yet measured on GPU: skinned draw and shadow cost for 6 bodies, whether local-aerial perspective
  reaches `SkinnedMesh` materials as expected, any visible pop at the 80/95 m handoff (especially mid-stride
  against the instanced pose), and Quest frame budget.
