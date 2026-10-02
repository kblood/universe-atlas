# Structural fauna variation — 2026-10-02

## User direction

Variation must include different kinds of limbs and appendages: paws, hooves,
trunks, long necks and wings, as well as proportions and coats. The generator
therefore needs compatible anatomical families and attachment rules. Existing
catalogue identities remain stable while their visual phenotype gains detail.

## Implemented desktop milestone

| Family | Structure | Current movement |
| --- | --- | --- |
| Ungulate | Split hoof lobes, barrel/shoulder/haunch shaping, bounded horns | Four-foot walk and idle/feeding poses |
| Cursorial | Longer limbs, narrow body, padded paws with toe lobes | Anatomy-derived stride and contact |
| Padded | Broad low body, broad foot pads, family-limited dorsal armor | Four-foot walk and idle |
| Long-neck | Extended neck and legs, hoof lobes, reduced juvenile neck proportions | Shared two-joint neck, walk/feeding poses |
| Proboscidean | Deeper skull, broad pads, curved tapered trunk, enlarged ears | Grounded walk; head-attached trunk and shallow feeding inspection |
| Winged | Swept folded membranes, supported leading edges, paws | Speculative grounded quadruped; chest-attached wings |

The last family is an authored speculative animal. It is not a real bat or
bird skeleton. All six still use the existing 22-bone quadruped graph. Trunk
curling, independent wing articulation, flapping and flight are not implemented.

`realisticIndividualCreatureGenome` evaluates the additive appearance and
morphology recipe. The original founder and individual evaluators retain their
legacy results. Planetary individuals and Planet skin use the new evaluator.
The family selector in the lab allows explicit alternate shape envelopes;
**Inherited species** follows the stable species choice used in normal runtime.
Winged specimens are currently an explicit lab choice, not randomly introduced
into the planetary population.

Coat identity has independent seeds, bounded palette differences and normalized
body coordinates. Juveniles retain those identity inputs while head, feet,
ears, limbs, neck and trunk grow at different authored rates. The maturity
metadata identifies two reviewed stages; continuous biological aging remains
future work. Per-species roughness uses the shared existing material; there
are no new textures or draw calls for the coat.

Breathing rate/phase, idle tail movement and small head movements vary by
identity. Walking stride is bounded by limb length; activity dates and paths
are unchanged. Standing, walking and feeding are inspectable in Planet skin.

## How to inspect

Open `creature-lab.html?mode=skin`, then choose **Body family**, **Individual**
and **Growth**. Use front/side/three-quarter views, head framing, neutral
material and skeleton overlay. Comparison uses the same lighting and metre
scale for two specimens. **Copy specimen link** preserves seed, profile,
species, family, variants, growth, pose and view settings.

The existing Gallery, Anatomy and Arena modes still show the earlier articulated
prototype. Use Planet skin when judging this new anatomy and its movement.

## Next anatomy contracts

1. Add semantic limb recipes with explicit upper/lower/distal segments, joint
   ranges, support contacts and locomotion compatibility. Paws and hooves should
   eventually affect the articulated distal skeleton, not just the skin surface.
2. Give trunks a short segmented chain with controlled bend limits, tip contact
   and facial-root attachment. Keep the existing head-only form as distant LOD.
3. Introduce a separate wing rig and topology family. Real bird/bat-like wings
   occupy forelimb roles; an additional pair requires an explicitly speculative
   body plan. Add folded/perched poses before testing takeoff, flight and landing.
4. Replace the two-section long neck with a bounded vertebral chain where close
   motion needs it. Add authored limits and head/ground clearance for every pose.
5. Derive cheaper distant forms from the same phenotype and pose. Current far
   rendering is still the earlier approximation; seamless structural LOD is open.
6. Add continuous growth, explicit optional dimorphism, habitat/season expression,
   production running/resting and short-coat microstructure after the structural
   and movement gates pass. No automatic recolouring or topology reroll on seek.

Each topology family needs a version, deterministic attachment sites, a resource
budget, closed/valid skin, deformation/contact cases and an inspectable reference
sheet. Catalogue identity, biological stage, transient pose and rendering detail
stay separate. More random part combinations alone are not an acceptance target.

## Validation and limits

CPU checks cover the 96-specimen corpus plus six morphology boundaries and 180
posed samples. The existing geometry, deformation, contact, replay and resource
thresholds remain in place. Source references and CPU measurements are in
[anatomy increment](fauna-anatomy-increment-2026-10-02.md).

Browser screenshots, contact sheets and reports are retained under
`test-results/fauna-variation-2026-10-02/`. Visual acceptance concerns a richer
procedural prototype: surface resolution, short-coat detail and family-specific
skull/limb anatomy still need refinement. Desktop browser checks do not qualify
Quest hardware, biological accuracy, flight or a prehensile trunk.

Completed checks for the structural implementation:

- Full CPU suite: **878 passed, 0 failed, 4 optional fixtures skipped** (882
  total). The life CPU regression still compares every output for all 416
  frames against the historical unoptimised renderer, with the same new
  appearance/anatomy model supplied to both paths.
- TypeScript and Vite production build pass; the existing large-chunk warning
  remains.
- Hardware Chromium/ANGLE D3D11 production-build review: four inherited
  archetypes, six explicit morphology choices, adult/juvenile comparison,
  pose playback/pause, saved-link replay, neutral/skeleton, pre-life exclusion
  and a 390 × 844 viewport pass without page/console errors. Repeated rebuilds
  return to **3 geometries and 3 textures** for one specimen.
- Browser corpus: **96 specimens**, each with body, face and neutral side
  captures, plus walk diagnostics and eight contact sheets. This browser
  corpus uses real lab species, while the CPU corpus uses separate fixed seeds.
- Visual review refined the trunk's nasal root and curve, widened/lowered
  proboscidean ears, and replaced straight wing trailing edges with curved
  membrane spans and tapered supports. Final morphology captures are in
  `final-shapes/`; the 96-specimen four-family set is in `corpus/`.
- The existing Creature Lab gallery/ancestry/arena/export/resource suite also
  passes. One initial arena progress assertion failed intermittently; tracing
  and 60 repeated playback-to-scrub attempts did not reproduce it. Focusing the
  arena time field now pauses playback so animation cannot overwrite an edit.
  Repeated playback/focus/scrub checks cover that explicit interaction.

The review accepts broader structural variation and the inspection workflow.
It does not establish fully realistic anatomy. In particular, the feet remain
simplified lobes, long necks use two joints, and the wing profile is a resting
membrane prototype. These are explicit next refinement targets.
