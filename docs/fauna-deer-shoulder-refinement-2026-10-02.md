# Red deer hind: shoulder, chest and neck insertion

## Decision and references

**Revise the primary forms.** Candidate025 improves the head modestly, but retains
paired low shoulder lobes and a continuously convex lower-neck/chest profile.
The next increment should redistribute that volume into a higher lateral
shoulder and a tapered throat entering a deep thorax. Keep the neutral adult
red deer hind identity; preserve the accepted limb chains and hoof placement.

Inspected actual zero-default exports:

- `Assets/_assetctl/deer-doe-candidate-025-recovery-review-001/review/`
  `front.png`, `right.png`, `hero.png`; matching024 `right.png`.
  In this review convention, **front.png is broadside and right.png is face-on**.
- 025 GLB SHA-256:
  `9459a4b5a82dafaaad4746412f742b540325297bcc23408f09c5018bb2f360b3`.
- The retained Hempel near-broadside hind, Sharp three-quarter hind with frontal
  head, and Museum Wiesbaden female skull; source/rights are recorded in
  [the reference review](fauna-deer-reference-review-2026-10-02.md).
  The skull informs the head-to-throat separation, not chest dimensions.

In [Hempel's hind](https://commons.wikimedia.org/wiki/File:Cervus_elaphus_LC0266.jpg),
the ventral neck rises from the front of the thorax as a tapered form; the
shoulder reads as part of the rib cage. In
[Sharp's hind](https://commons.wikimedia.org/wiki/File:Red_deer_(Cervus_elaphus)_hind.jpg),
upper-arm volume emerges below a higher shoulder and narrows toward the elbow.
Neither view supports the candidate's two pendant, near-spherical shoulder
masses. These are visual comparisons: the photos have oblique cameras, fur and
grass occlusion, and are not calibrated orthographic measurements.

The anatomical basis is the scapula against the thorax, humerus leading to the
elbow, and muscular attachment between forelimb and trunk. The serratus sling
supports the thorax; pectoral tissues connect chest and proximal limb.
[University of Minnesota, Thoracic Limb](https://open.lib.umn.edu/largeanimalanatomy/chapter/thoracic-limb-forelimb/)
supports this general ungulate organization. Its horse/ox details do **not**
establish deer-specific muscle volumes or justify copying a horse's chest.

## Measured025 cause

Source anchors below refer to the immutable
`Assets/_assetctl/deer-doe-candidate-025/fauna-authoring-source.py`.

| Source | Current construction | Consequence |
| --- | --- | --- |
| `_make_skin`, lines 218–243 | Rows x.25/.39 use half-heights .246/.245m; neck rows x.50/.57/.63 use .202/.171/.137m. One ellipse controls dorsal and ventral sectors. | Enlarging the thorax also rounds its front into the throat. Rotating the section frame turns ventral radius into forward projection. |
| Row x.57, centreY1.055 | Actual cage ventral point is approximately x.7079,Y.9581, before subdivision. | About138mm forward of its centre: the lower-neck profile is built into the primary loft, not just the coat or a tiny surface offset. |
| Fore openings, lines 251–252; first path rows 273–275 | First section centre(.395,.775), radii(.094,.070); second(.34,.725), radii(.070,.051). The shoulder joint is(.45,.91), elbow(.30,.69). | A large cross-section is concentrated low on the upper arm. The first ring's 140 mm lateral diameter adds to the broad collar around fixed limb centres Z±.155. |
| Post-subdivision axillary fill, lines 387–395 | Adds up to 67 mm in +X near x.38,Y.775,absZ.108. | A previous crease repair pushes a broad region forward. It must be reconsidered with the new anatomy instead of covered by a second opposing correction. |

Read-only triangle/plane measurements of the exported coat are saved in
`test-results/fauna-025-shoulder-profile.json` (script
`test-results/measure-shoulder-025.mjs`). Restricted to X.20–.85:

| Height Y (m) | Maximum half-width (m) | Anterior X near midline, absZ<.025 (m) |
| --- | --- | --- |
| .775 | .2181 | .5213 |
| .850 | .2314 | .6155 |
| .925 | .2075 | .6742 |
| 1.000 | .1961 | .7131 |
| 1.075 | .1685 | .7395 |
| 1.150 | .0976 | .7608 |

Thus the low shoulder envelope is about 463 mm wide at Y.85, versus 415 mm at
Y.925. These are **asset measurements**, not deer population measurements;
the sampling window includes rib cage and both proximal limbs.

## Next shape edit, in order

All numerical ranges below are **art-direction trials**, not published
biological measurements. Compare the resulting silhouette before declaring
success; do not turn these values into substitute visual acceptance gates.

### 1. Give the lower neck independent ventral sectors

Keep the dorsal outline, torso depth behind x.39, and named joint anchors.
Replace the symmetric neck ellipse with separate dorsal, lateral and ventral
profiles on the existing connected cage. First trial: reduce only the ventral
radius around rows x.50/.57 by 25–30%, row x.63 by 15–20%, tapering to zero change
at adjacent chest/upper-neck rows. Preserve broad lateral attachment into the
thorax. This is a roughly 40–60mm profile redistribution in the lower neck,
substantially larger than the prior 10–20mm cosmetic offset proposal.

Expected visual direction: a clearer throat front rising out of the chest,
less projection around Y.85–1.05, and a higher shoulder/back remaining behind
it. Preserve the sternum under the thorax; do not hollow out the whole rib cage
or produce an abrupt notch. Use smooth sector transitions and inspect every
resulting ring's area, orientation and spacing.

### 2. Move shoulder mass higher and taper the upper arm

Rebuild the first two fore-path sections and collar flow around the existing
shoulder-to-elbow axis. Trial first centre near(.42,.85–.87), with lateral
radius.050–.055 instead of.070; second near(.35,.77–.79), tapering into the
existing elbow section(.30,.69,.052,.042). These coordinates identify a
starting cage layout, not final surface measurements.

Orient proximal cross-sections across the humeral direction rather than
automatically keeping them horizontal. Preserve the shared opening and use
well-spaced intermediate sections; check for folded quads and collisions with
intact chest skin. Move broad volume toward the high lateral scapular region
(approximately X.25–.42,Y.95–1.13) through connected surface contours. Avoid
adding separate muscle balls or merely shrinking the entire chest.

The face-on objective is one thorax with gently separated upper limbs, whose
fullness narrows toward the elbows. A first visual trial would reduce each low
outer lobe by roughly 20–30mm, while retaining the upper rib-cage width and fixed
foot spacing. The paired lobes should stop being the dominant front silhouette.

### 3. Replace the broad axillary patch with the new surface transition

Reassess the 67 mm fill after editing the cage. Compare the same pose with the
old fill enabled/disabled during author review; replace its broad displacement
with a smaller, anatomically placed transition only where the new connected
surface needs it. A shallow axillary recess is reasonable; a deep cleft,
inserted tube, inflated breast or intersecting sheet is not acceptable.

Do not independently stack a negative offset over the old positive patch.
The new collar, sternum and ventral-neck profile should agree in the base cage.

## Preservation and review contract

- Schedule after the current continuous-neck weight repair. Opus exclusively
  owns authoring edits; this document changes no source model or asset.
- Preserve all 27 semantic joint anchors, neutral transforms, hoof geometry and
  spacing, distal forelimb geometry from the elbow down, hind geometry, head025
  details, 12 identity targets and current gait/browse amplitudes. Mesh changes
  in the proximal shoulder are allowed; former exact geometry equality applies
  only to protected regions. Preserve old candidates and source snapshots.
- Recompute weights from the revised anatomy; retain protected hind ownership,
  distal-mixture bounds and continuous axial/neck field. Do not weaken skin
  strain, contact or crossing gates to accommodate the new forms.
- Inspect matched zero-control adult views: strict side; face-on; both front
  three-quarters; top; close lower-neck/sternum/upper-arm region. Include neutral
  material, textured and a no-shadow diagnostic. Pair side with Hempel and
  three-quarter with Sharp; do not describe Sharp as a calibrated front view.
- Record before/after exported profiles at the Y heights above, plus chest
  widths and first-section dimensions. The decision remains **revise / visual
  approval** for neck insertion, scapular mass, sternum and upper-arm taper.
- Repeat neutral/morph topology, all-control walking and browsing deformation,
  actual hoof contacts and head attachment checks. The existing .45–1.8 edge
  bounds remain. Re-bake and re-audit UV/coat after geometry changes; retain
  20k-triangle/three-material limits. Technical success is not device approval.

This review supersedes only the shoulder/chest trial in
[the earlier head handoff](fauna-deer-head-refinement-2026-10-02.md). It does not
reopen the ongoing neck-weight ownership or authorize another simultaneous
Blender job.
