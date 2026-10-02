# Red deer reference and authored-mesh review

## Reference animal

Start with an adult **red deer hind, Cervus elaphus**, in a relaxed standing
pose. Keep this reference specimen antlerless. Approve this animal before
turning the base mesh into a general quadruped generator.

The [British Deer Society species account](https://bds.org.uk/information-advice/about-deer/deer-species/red-deer/)
gives hind shoulder heights of 1.07–1.22 m and masses of 63–120 kg; it describes
unspotted adults, a short tail and pale rump patch. Its downloadable leaflet
uses a slightly different lower height bound (1.00 m). These are population
guides, not measurements of the photographed individuals. Use **1.10 m at the
withers** as the authored reference scale, an art-direction choice within those
ranges. Do not convert the photos into purported measured anatomy.

## Inspectable sources and rights

Unmodified originals and an attribution/hash manifest are retained under
`C:/LLM/IWSDK/Assets/_assetctl/fauna-reference-2026-10-02/`.
They are local review references, separate from the shipped GLB and textures.

| Local original | Source and credit | Declared rights | What it establishes / limitation |
| --- | --- | --- | --- |
| `red-deer-hind-joerg-hempel.jpg` | [Cervus elaphus LC0266](https://commons.wikimedia.org/wiki/File:Cervus_elaphus_LC0266.jpg), Jörg Hempel, 2011 | [CC BY-SA 3.0 Germany](https://creativecommons.org/licenses/by-sa/3.0/de/deed.en) | Best near-broadside head/body: nasal wedge, ear placement, neck/chest transition, belly and rump. Feet obscured by grass; not a calibrated orthographic view. |
| `red-deer-hind-charles-sharp.jpg` | [Red deer hind](https://commons.wikimedia.org/wiki/File:Red_deer_(Cervus_elaphus)_hind.jpg), Charles J. Sharp, 2016 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | Three-quarter body and almost frontal face: chest width, brow, ears, throat, pelvis. Head is turned and several feet are hidden. |
| `red-deer-hind-calf-charles-sharp.jpg` | [Hind with juvenile](https://commons.wikimedia.org/wiki/File:Red_deer_(Cervus_elaphus)_hind_with_juvenile.jpg), Charles J. Sharp, 2016 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | Relative developmental appearance, juvenile spotting and larger apparent ears/head. Different depths and obscured feet prevent an exact growth scale. |
| `red-deer-female-skull-museum-wiesbaden.jpg` | [Female skull MWNH 859](https://commons.wikimedia.org/wiki/File:Cervus_elaphus_female_02_MWNH_859.jpg), Klaus Rassinger and Gerhard Cammerer, Museum Wiesbaden, 2011 | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) | Deer-specific nasal length, lateral orbit and deep rear mandibular angle. Bone is not the soft-tissue silhouette. |
| `red-deer-skeleton-de-seve-lempereur-1756.png` | [Red deer skeleton, Gallica plate XVIII](https://commons.wikimedia.org/wiki/File:Cerf,_squelette_-_Stag,_skeleton_-_Gallica_-_ark_12148-btv1b2300253d-f20.png), De Sève / Lempereur, 1756; [BnF original](https://gallica.bnf.fr/ark:/12148/btv1b2300253d/f20.item) | [Public Domain Mark](https://creativecommons.org/publicdomain/mark/1.0/) on Commons | Species-specific limb-chain and shoulder/pelvis landmarks. Historical male mount: do not copy its antlers, display pose or proportions as calibrated female measurements. |
| `red-deer-hind-jeff-collins.jpg` | [Red deer Hind](https://commons.wikimedia.org/wiki/File:Red_deer_Hind_-_geograph.org.uk_-_1940632.jpg), jeff collins / Geograph, 2010 | [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0/) | Supplementary rear rump/short-tail view only; small animal, oblique angle and vegetation limit detail. |

Preserve credit, source and license with any distributed reference image or
adaptation, and identify changes. No photo pixels are to be projected into the
runtime coat. Asset provenance should distinguish observed anatomy from an
image-derived texture or mesh; these references do not establish license
clearance for unrelated downloaded assets. No calibrated front/top reference or
unobscured modern hoof close-up has yet been retained.

## Shape hypotheses for the first review

The following are **estimated authoring envelopes**, based on visual comparison
of the references above. They are not published osteometric measurements and
must remain editable after the first neutral render. Let H be withers height.

| Landmark / ratio | Initial review envelope | Visible evidence to compare |
| --- | --- | --- |
| Shoulder-to-hip horizontal span | 0.90–1.15 H | Distinct rib cage and pelvis, with a short loin transition. |
| Rib-cage depth | 0.34–0.46 H | Sternum below the shoulder; oval chest rather than a uniform cylinder. |
| Occiput-to-nose length | 0.28–0.36 H | Long tapered nasal bridge; mouth under the muzzle, not a spherical snout. |
| Ear base-to-tip length | 0.15–0.22 H | Thin cupped leaves with a narrow root and pointed tip. |
| Orbit centre-to-nose / skull length | Approximately 0.58–0.66 | Visual estimate from the museum lateral skull; orbit lies well behind the nose. |
| Rump height / withers height | Approximately 0.95–1.07 | A nearly level adult topline; pose and condition can change it. |

For limbs, review the chain rather than arbitrary tube lengths: scapula high
against the rib cage, humerus sloping to an elbow near the chest, radius/ulna,
carpus, slender cannon and short pastern; pelvis, forward stifle, rearward hock,
slender cannon and pastern on the hind limb. Split load-bearing hoof tips must
be visible in the model's front and underside review. The high stifle is not
the backward-pointing hock. Do not use the equine hoof as the deer foot template.

## Visual acceptance rubric

Review source and runtime exports in side, front, rear, three-quarter, close
head and wireframe views, at shared scale and neutral material. Record each
criterion as pass / revise with a screenshot; passing numeric tests alone is
not approval.

1. **Identity and outline:** reads as an antlerless deer at thumbnail size;
   narrow head, raised tapering neck, deep chest, tucked transition to pelvis,
   long slender lower limbs and short tail remain distinguishable in silhouette.
2. **Anatomical connections:** shoulder and haunch flow into the torso without
   inserted-ball or tube seams; abdomen is a controlled surface; legs show the
   correct elbow/stifle/hock relationships and separate cloven hooves.
3. **Face:** eyes sit laterally in eyelid rims, ears have visible thickness and
   cup, nasal bridge tapers, nostrils sit on the muzzle, jaw separates from
   throat. No floating face plates or oversized spherical eyes.
4. **Depth:** front/rear views show chest and pelvis volume and space between
   the four limbs. Side-view correctness must survive a camera orbit.
5. **Deformation:** neutral, weight shift, mid-stance and mid-swing keep chest,
   groin, elbow and hock volume. Lips/eyes remain attached. Record skin stretch,
   foot contact and joint limits separately from aesthetic judgement.
6. **Variation:** approve the neutral base first; then compare minimum/maximum
   morphology and adult/juvenile at identical lighting and metre scale. A coat
   change alone does not demonstrate different anatomy.

## Creature Lab insertion points

The following proposal guided the first integration later in this session.
`fauna-template-inspector.ts` now supplies the static authored adapter, six
bounded controls, named head bounds and asset diagnostics. The source selector,
shared URLs, loading guard and authored/procedural comparison are implemented;
they do not constitute visual or animation approval of the candidate mesh.

- `src/creature-lab.ts:addActor`: introduce an authored-inspector adapter beside
  `createFaunaSkinInspector`. Load/cache the approved GLB before `buildActors`;
  keep the present synchronous procedural path. Use a rebuild generation token
  so stale asynchronous loads cannot resurrect disposed specimens.
- Agree an asset contract first: source asset ID/hash, metre/Y-up/+X-forward
  transform, named bones, bind pose, named morph targets with bounded values,
  approved material slots, head bounds/landmarks and supported clips. Prefer a
  manifest key to arbitrary URLs. Never quietly fall back after a load error.
- `creature-lab.html:#skin-controls` and `src/creature-lab-state.ts`: add an
  explicit source choice and bounded named morphology controls only once that
  contract exists. Persist source asset ID and morph values in specimen URLs.
  Keep inherited species/individual/growth identity separate from source choice.
- `buildActors` / `arrangeSkinComparison`: allow **authored source versus
  procedural specimen**, retaining two independent instances at metre scale,
  shared light and camera-plane separation. Label exact asset revision and
  phenotype. A static source must not be presented as supporting animation.
- `skinBounds`: current head selection assumes dominant procedural bone 6.
  An authored adapter must supply named head bounds; generalize body bounds to
  ordinary meshes as well as skinned meshes and include active morph targets.
- `updateRigs` / `disposeActors` / `skinDetails`: retain the existing update and
  disposal interface; expose morph/clip/asset revision diagnostics. Own cloned
  skeletons/materials per instance and release cached geometry only when its
  final reference is gone. Keep gallery/anatomy/arena/ancestry behaviour intact.
- Extend browser checks with source/procedural comparison, URL replay,
  cancelled loads, morph extremes, clip replay, and repeated-switch resource
  counts. The reference images remain review artifacts outside the web build.

## Candidate 002 independent visual review

Inspected `deer-doe-candidate-002/review/front.png`, `hero.png`, `right.png`
and `top.png` against the retained living-animal and skull photographs.
The sheet's `front.png` shows the animal's side; `right.png` is face-on.
The known white-material export issue is separate from these geometry findings.
Visual status: **revise**, with three priorities sent to the anatomy author:

1. Face-on, the shoulder/chest forms two hanging round lobes separated by a
   deep cleft. Merge the shoulder masses higher into one tapered chest/sternum;
   let the upper arms emerge below/behind it. Add a modest flank tuck before
   the upper haunch instead of a nearly uniform tubular underside.
2. The head reads as a flat wedge with button eyes and flat leaf ears. Define
   orbit/cheek volume, restrained eyelid rims, a rear jaw angle and throat
   recess. Taper the nasal tip relative to the cheek. Give ears a concave cup,
   finite rim thickness and narrow roots; enlarging the eyeballs alone will
   not establish the face.
3. Lower limbs read as kinked cords terminating in tiny rectangular pads.
   Keep the neutral forelimb near plumb, with elbow close to the chest; make
   carpus/hock landmarks and cannon-to-pastern taper readable. Give each foot
   two substantial hoof caps and a visible front cleft, while preserving the
   hind stifle-forward/hock-back joint chain.
