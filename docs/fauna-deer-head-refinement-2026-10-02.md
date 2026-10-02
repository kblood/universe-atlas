# Red deer hind: head, eye and chest refinement handoff

## Decision and evidence

Next asset increment: make the neutral adult **Cervus elaphus hind** read as the
retained living animal in a grey-material silhouette and close head view. The
current face is still a rounded cone with a small inset eye, conspicuous tan
eyelid outline and a separate black nose cap. The lower neck and chest form one
inflated curved mass. More passing technical checks alone will not approve this
increment: the reference comparison and recorded visual decision are required.

Reviewed:

- `Assets/_assetctl/deer-doe-candidate-022/review/{front,right,hero,top}.png`.
  Here `front.png` is broadside; `right.png` is face-on. **These images have the
  invalid all-targets-active state described below; do not use their dimensions
  as adult anatomy.** Their pale appearance also differs from the runtime coat.
- `test-results/fauna-template-021-coat-browser-diagnostic/neutral-head-detail-off.png`,
  `grazing-head-no-shadows-coat.png` and
  `grazing-head-no-shadows-neutral-material.png`. The accompanying report records
  all six controls, including juvenile, as zero. These are the useful adult
  facial-shape observations. Source GLB SHA-256:
  `23233caf7427587e88ce74a25a347297d8e67da0fd6b0fa7c811b0c544d5a6b3`.

Broad surface bands persist when coat detail is disabled and disappear with
shadows disabled. They are review-rig self-shadow artifacts, not evidence that
the observed broad bands originate in the coat texture. The separate measured
UV density, coverage and seam defects justified the earlier bake repairs.

## References and rights

The original bytes and SHA-256 attribution manifest remain in
`Assets/_assetctl/fauna-reference-2026-10-02/`. These are visual references;
no photograph pixels enter the runtime mesh or textures.

| Reference | Credit / rights | Specific observation |
| --- | --- | --- |
| [Hempel, near-broadside hind](https://commons.wikimedia.org/wiki/File:Cervus_elaphus_LC0266.jpg) | Jörg Hempel, 2011; [CC BY-SA 3.0 Germany](https://creativecommons.org/licenses/by-sa/3.0/de/deed.en) | Distinct rear jaw, brow-to-nasal transition, fuller eye opening, short dark muzzle surface, neck entering the chest behind the throat. |
| [Sharp, hind with nearly frontal head](https://commons.wikimedia.org/wiki/File:Red_deer_(Cervus_elaphus)_hind.jpg) | Charles J. Sharp, 2016; [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | Lateral orbit prominence, cheeks tapering toward the muzzle, pale eye/throat markings, narrow upper neck widening into a deep chest. Head is turned; do not treat it as an orthographic measurement. |
| [Museum Wiesbaden female skull MWNH 859](https://commons.wikimedia.org/wiki/File:Cervus_elaphus_female_02_MWNH_859.jpg) | Klaus Rassinger and Gerhard Cammerer, 2011; [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) | Lateral orbital rim and zygomatic connection; mandible deepens at its rear angle and becomes shallower toward the muzzle. Bone dimensions are not the living soft-tissue silhouette. |

See [the existing reference review](fauna-deer-reference-review-2026-10-02.md)
for species scale, further references and their limitations. All proposed
millimetre changes below are **authoring trial ranges**, not published biological
measurements or calibrated measurements from these photos.

## First repair the neutral export state

Raw JSON inspection of the preserved GLBs found:

```json
{
  "candidate021.meshes[0].weights": [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  "candidate022.meshes[0].weights": [1,1,1,1,1,1,1,1,1,1,1,1]
}
```

For 022 these twelve entries are, in order: bodyCondition min/max, neckLength
min/max, legLength min/max, muzzleLength min/max, earSize min/max, juvenile,
bodyCondition_max__legLength_max. There are no node weight overrides. This is
not a valid phenotype: opposite targets and the juvenile target are active
simultaneously. Candidate022 raw POSITION accessor bounds have top Y
**1.6642258167 m**, bottom Y **0.0040000002 m**, and maximum X **1.1790000200 m**.
The imported render-sheet reports top Blender Z **1.1546463966 m** and maximum X
**0.7998446822 m**. Its scale/shape is therefore not the neutral adult.

Read-only SDNA parsing of the preserved `022/deer-doe.blend` also found
`KeyBlock.curval = 1.0` on Basis and every target. Thus the defect exists before
GLB export; it is not established as an exporter bug. Evidence:
`Assets/_assetctl/fauna-coat-next-source/022-source-shape-key-values.json`.

Exact repair site in preserved `022/fauna-authoring-source.py`: `_rig_and_morphs`,
lines 714–722. It creates each key and sets slider bounds but never assigns
`key.value`. Explicitly set each non-Basis `key.value = 0` immediately after
creation and sweep/assert all target values zero immediately before both source
save and export. Re-import smoke must inspect actual mesh/node default weights
(absent means zero), then assert zero controls reproduce the saved neutral
source dimensions. Reject contradictory nonzero defaults; do not silently
normalize them only inside the review renderer. Keep intentional morph endpoint
tests separate. Root will hand this repair to the current exclusive author.

## Three priorities, in implementation order

### 1. Replace the rotational head cone with recognizable cranial planes

**Observation:** even with neutral material and shadows disabled, the crown,
cheek, nasal bridge and underside blend into a nearly continuous tapered volume.
The photographic hind has a readable orbit and cheek behind a shallower nasal
bridge, plus a mandibular angle below/behind the orbit. Merely enlarging the
eye or making the coat darker will leave this silhouette unchanged.

**Source:** `_make_skin`, `sections` at snapshot lines 153–166; 24-sample ring
construction at 169–179; local cheek/orbit/bridge corrections at 335–348.
Current head section tuples `(x, centreY, halfWidth, halfHeight)` include
`(.825,1.399,.101,.103)`, `(.91,1.399,.090,.091)`,
`(.99,1.374,.074,.070)`, `(1.065,1.350,.060,.052)`.
They constrain upper and lower profiles to essentially the same ellipse.

**Change contract:** keep the connected head/neck surface and existing ring
count initially, but give head rings independently authored dorsal, lateral,
cheek and ventral sectors in their local section frame. Place/reuse vertices at
the brow, lower orbit/zygomatic ridge, jaw angle and muzzle side plane. Do not
append spherical cheek primitives.

- Trial: reduce the posterior crown above x .82–.93 by **8–15 mm**, while
  maintaining a local brow above the orbit. The crown should not remain the
  top of one round bulge extending directly into the snout.
- Establish a rear jaw angle around x .83–.90 with **10–20 mm** additional
  ventral depth, smoothly returning to the shallower lower muzzle by x 1.04.
  The throat recess must remain behind this angle, not become a dark notch
  painted onto an unchanged cone.
- Keep a localized **5–10 mm** lateral zygomatic/orbital support near x .87–.93;
  relieve the preorbital cheek ahead of it by **4–8 mm**, with broad transitions.
  This is a connected change of planes, not a narrow embossed ring.
- Retain the long nasal portion, but separate its upper bridge and lateral
  planes. Do not shorten the entire head to make a generic cute deer. First
  compare the photo's orbit-to-nose proportion at matched head angle.

Measure the resulting dorsal/ventral profiles and cross-section widths at
x .825, .91, .99 and 1.065 in the **actual zero-morph export**. Record before/
after coordinates and silhouette views; the trial millimetres are not acceptance
by themselves. Preserve the named head anchor initially and regenerate attached
features from the revised surface, rather than retaining old Z offsets.

### 2. Rebuild the eye-to-skin and nose-to-muzzle transitions

**Eye source:** `_details` lines 411–456. Eye centre is sampled at
`(.891,1.436,side)` and recessed 3 mm along global Z. The globe is an oblate
surface with half-width `.017*1.1` and half-height `.017*.48`; its full projected
size is **37.4 × 16.32 mm**. The inner lid approximately spans **36.96 × 15.84 mm**.
Lid geometry is another surface-conforming closed ribbon with fixed radial
factors `(1.35,1.12,.88)`. `_FaceDark` uses `(.28,.68,.96)`; `_surface_attributes`
lines 746–747 darkens the existing coat by a multiplier. The resulting visible
tan ring is not an intentional metallic material.

- Orient the globe and eyelid opening in a frame derived from the revised
  orbital surface normal and head longitudinal axis, instead of global-Z
  embedding. Maintain lateral placement and a readable anterior canthus.
- Trial visible opening: **34–40 mm long and 18–22 mm high**, chiefly by
  raising the upper arch and restoring the lower-lid contour, without scaling
  the whole globe into a protruding sphere. Compare at matched photograph angle.
- Seat the outer ribbon into continuous cheek/brow skin. Limit the visible
  dark margin to roughly **0.5–1.5 mm** and its surface relief to **under 1 mm**.
  Fade the outer colour into the adjacent coat rather than retaining a complete
  high-contrast tan outline. Keep a subtle nonuniform upper brow/lower lid.
- Use the existing dark eye material (roughness .18 is already in source).
  No fourth material or metallic rim is needed. An eyeball highlight is not
  evidence of an anatomically connected socket.

**Nose source:** `_details` nose loft lines 390–396, nostril loft 471–476 and
lip construction 458–470. The nose is a 29 mm long separate cap with radial
sections centered around Y 1.339; the lip is a thin separate strip. In runtime
the cap reads as a black plug at the end of the cone.

- Author a broad, shallow rhinarium front plane with embedded rear edges and
  lateral nostril wings. Trial rear-edge overlap **2–4 mm**, with no complete
  protruding ring around the muzzle in side/front views. Reshape its junction
  to the revised muzzle; a translation alone will not remove the plug silhouette.
- Put each recessed nostril in its corresponding lateral nasal wing, rather
  than a visible round pit on a cylindrical attachment. Keep the lip close to
  the upper/lower muzzle boundary and terminate its dark line at a plausible
  mouth corner. Recess any detail shell so it cannot float when muzzleLength
  changes. Retain the existing three-material budget.

### 3. Give the lower neck a chest insertion instead of an inflated prow

**Observation:** the neutral runtime neck expands into one round forward chest
curve; the all-targets 022 front view additionally shows paired bulbous upper
limb masses. The hind references have a deep chest and upper arms, but the
throat/neck front, sternum and lateral shoulder are distinguishable forms.
Do not use the invalid 022 front dimensions to prescribe adult widths.

**Source:** section rows x .25 through .69 (153–164); chest/axilla correction
at 325–330 adds up to `.067 * fold * gate` in X. Current neck-base half-heights
include .202 at x .50 and .171 at x .57. These controls and the upper-arm collar
jointly determine the profile; altering only a colour stripe cannot repair it.

After the head is reviewed, trial a **10–20 mm** reduction of forward projection
in the lower-neck/upper-sternum transition, feathered through x .42–.65 and
Y .90–1.20. Maintain the deep rib cage and a readable lateral scapular/upper-arm
mass. Inspect whether the existing 67 mm axillary fill is locally excessive
before adding another opposing offset. Do not globally narrow the chest or
move limb anchors to hide the problem. This touches previously sensitive
shoulder skin: regenerate weight/deformation evidence against the accepted 023
baseline before accepting the change.

## Review and release gate for this increment

1. Fix/verify neutral defaults first. Preserve source, exact GLB hash, explicit
   controls and lighting settings with every capture.
2. Render actual zero-control adult at metre scale: strict side, front, top,
   left/right three-quarter head, lower jaw/throat, and full chest/forelimbs.
   Use the runtime renderer with repaired shadow fit. Include grey material and
   textured versions; one no-shadow diagnostic separates shape from shadow acne.
   Do not crop off the nose, ear tips, jaw or neck insertion.
3. Place matching reference views beside the renders and record **revise /
   visually approved** separately for cranial planes, eye seating, nose/mouth
   attachment and neck/chest insertion. The silhouette and facial planes must
   improve before adding higher-frequency surface detail or more polygons.
4. Once the neutral form is visually convincing, repeat muzzle min/max,
   neck min/max, juvenile and representative combined controls; neutral, idle
   and walk. Check eyes/lips/nose remain attached and paired features symmetric.
5. Run the unchanged exported topology, morph, deformation, contact, coat/UV,
   default-weight, material/triangle budget and browser resource gates. Head
   displacement changes UV density; rerun the actual bake and map audit. Keep
   the existing fixed coat helper unless its measured gates require a separately
   reviewed change. Technical passes do not substitute for step 3.

No source geometry, helper, asset binary, GPU job or browser run was changed by
this handoff. Candidate023 source remains exclusively owned by the active
author; apply these proposals only after that stage is reviewed.
