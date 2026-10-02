# Realistic fauna: next implementation increment

Starting source: `059004c` on `main`. This is the next bounded generation
increment, following the user's request to prioritise realistic fauna.

## Findings and tasks

The current production renderer already has a connected, genome-derived skin,
22-bone quadruped skeleton, six nearby rig slots, deterministic dated motion,
and a bounded geometry cache. The old Creature Lab displays the earlier
articulated primitive animals and therefore cannot review the production skin.
Eyes are only small vertex-colour marks; they can disappear at coarse surface
resolution. Ears have the same conical construction as horns.

This increment:

1. Generate bilateral eyes with iris/pupil and lid borders, nostril marks and
   a closed mouth seam projected onto the actual polygonised skull surface.
   Interpolate the supporting skin's bone weights to retain attachment during
   head/neck motion. Keep one material and one draw per animal.
2. Give ears a broader, tapered, cupped shape and inherited interior colour.
3. Add **Planet skin** to Creature Lab: inspect the production body and dated
   pose for the selected species/individual, adult or juvenile, with neutral
   material and the actual skeleton. Use a flat, centred specimen and an
   explicitly labelled demonstration orbit for pose inspection.
4. Check topology, landmark exposure, deformation, date replay, disposal and
   browser rendering. Save inspectable images and state the visual limits.

The visual generator version advances to `quadruped-body-2`; species catalogue
IDs, individual genomes, dated existence and planetary paths are preserved.
This is code-generated geometry with inherited colours, not a new external
asset/model provider. No art downloads, trained models or source assets are
required. Existing originals and prior review outputs are preserved.

## Follow-on work

See the [realism and variation plan](fauna-variation-plan-2026-10-02.md) for the
ordered tasks, species/individual/growth contract and fixed review corpus.

- Review full-body proportions and muscle/limb transitions across a fixed
  species corpus; improve silhouettes beyond the four present envelopes.
- Improve coat detail at close range without increasing body polygon density
  merely to carry colour marks. Evaluate surface roughness and hair direction.
- Derive cheaper representations from the same anatomy and dated pose to
  address the 80/95 m near/far discontinuity documented in the handoff review.
- Review foot contact, walk/run timing and obstacle-aware paths. The current
  planet solver walks on a coarse immutable terrain stencil and has no run state.
- Measure the six-rig scene on target hardware and qualify Quest separately.

Facial patches are surface geometry, not separate eyeballs with corneal shading,
nostril cavities or an articulated jaw. The animals remain procedural quadruped
prototypes; this increment cannot establish photorealism or biological validity.

## Read before implementation

- `README.md` and `docs/desktop-realism-implementation-plan-2026-09-27.md`
- `docs/fauna-near-body-plan-2026-09-28.md`
- `docs/fauna-handoff-review-2026-09-28.md`
- `docs/fauna-continuity-2026-09-28.md`
- `docs/creature-lab-implementation-spec.md`
- `docs/creature-diversity-and-motion-plan-2026-09-14.md`
- `docs/research-creature-anatomy-references-2026-09-14.md`
- `docs/research-procedural-fauna-habitats-2026-09-14.md`
- Parent IWSDK `AGENTS.md` and `docs/ai-asset-creation-research-2026-07-29.md`

Earlier task ownership and deployment records are historical. The current
working tree and checks are the authority for this increment's implementation.

## Validation

The four implementation tasks above are complete for this increment.

- `npm test`: **862 passed, 0 failed, 4 skipped** (866 total). Skips are three
  retained tree-GLB fixtures and one optional tree-capture hardware fixture.
- `npm run build`: passes TypeScript and Vite. The existing large-chunk warning
  remains.
- `tests/fauna-face.test.mjs`: 24 genome/growth cases check projected feature
  exposure against the actual body triangles, outward winding and detail
  budgets. All four archetypes also exercise production skinning, facial
  attachment, dated A–B–A replay, neutral materials and full disposal.
- Existing body connectivity, volume, weights, foot contact, edge stretch,
  rig-pool bounds and representation ownership regressions pass.
- Hardware Chromium browser review through ANGLE/D3D11: all four archetypes,
  adult/juvenile faces, neutral material, skeleton overlay, pose scrubbing,
  pre-life exclusion, repeated rebuilds and a 390 × 844 viewport pass without
  page/WebGL errors. After repeated specimen changes, renderer counts stay at
  **3 geometries and 3 textures**, including the inspection shadows.
- The existing Creature Lab browser suite also passes its gallery, ancestry,
  terrain/gait, 16-actor, export and regeneration checks. Its four regeneration
  checkpoints retain 450 geometries and 17 textures with no page errors.

Review artifacts are in `test-results/fauna-skin-2026-10-02/`: `unit.log`,
`build.log`, the initial captures, `final/report.json` and the final body/face/
juvenile/skeleton images, plus `legacy-regression/report.json` and its images.
Browser evidence uses the local Vite source server; the production build was
checked separately. No deployment or headset acceptance is claimed.

The image review prompted smaller, flatter, darker eyes and an inspection
shadow before the final captures. Facial landmarks now read clearly; the body
surface, blocky muzzle, coat markings and limb proportions remain stylized.
The review is acceptance of this inspection/generation increment, not of fully
realistic fauna or seamless near/far rendering.

The face adds **488 triangles** per animal. The two fuller ears add 136 triangles
over the prior ear pair. They use the existing vertex colours, skin attributes,
single coat material and single body draw; no textures or extra runtime draws
are introduced. The planetary six-rig/eight-geometry limits remain in force.

An early attempt to force the entire skull to one rigid bone increased measured
neck edge stretch beyond the existing threshold. It was replaced with
barycentric interpolation of the supporting skin triangle's weights. Existing
deformation thresholds were retained and pass.

To inspect locally, start `npm run dev` and open
`http://127.0.0.1:5186/creature-lab.html?mode=skin`. Run `npm run test:fauna-skin`
with that server running; `ATLAS_URL` and `ATLAS_RESULTS` override the URL and
artifact directory. Hardware browser runs also set `ATLAS_HARDWARE=1` and use
the existing exclusive GPU lock.
