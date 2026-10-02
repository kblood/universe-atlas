# Pawed reference plan: red fox

**Status: planned / review only, 2026-10-02.** No fox has been modeled,
generated, rigged, animated or accepted. This is family 2 in the
[ordered morph-template plan](fauna-blender-morph-plan-2026-10-02.md).
Authoring and runtime family expansion wait for the reference deer's geometry,
deformation and visual quality gate. Its current experimental status is not
inherited as approval. The companion brief is
[pawed-reference-v1.json](../assets/briefs/pawed-reference-v1.json).

## Species and evidence

Choose an adult **red fox, Vulpes vulpes**, in a red coat phase. Author a distinct
digitigrade canid template with a low carried head, tapered muzzle, cupped
triangular ears, compact paws and a long bushy tail. A wolf requires a separate
proportion review; a cat requires different feet and gait review. Neither is
an automatic extreme of this template. The Yellowstone account supports the
slender snout, dark distal legs and white-tipped bushy tail; regional coat and
size variation prevent treating one photograph as a species-wide measurement.
[NPS species account](https://www.nps.gov/yell/learn/nature/red-fox.htm).

Sources inspected on 2026-10-02; links and credits are the retained evidence.
No reference image, CT data or skeleton mesh is incorporated into the project.

| Primary reference / attribution | Evidence and limitation | Rights / proposed use |
| --- | --- | --- |
| [Red fox, Yellowstone NPS](https://www.nps.gov/yell/learn/nature/red-fox.htm); main photograph NPS / Neal Herbert | Living silhouette and coat; population account, not calibrated views. | NPS-created material generally public domain under its [ownership notice](https://www.nps.gov/aboutus/disclaimer.htm); third-party exceptions apply. Link-only here. Preserve specific credit if an image is later retained. |
| [Female skull UCLA 15180, DigiMorph](https://digimorph.geo.utexas.edu/specimens/Vulpes_vulpes/female/); Pamela Owen, 2002; imaging Jessie Maisano / Rachel Racicot, scan Matthew Colbert | Species-specific skull and relatively long muzzle with flatter frontal profile than Canis. Skull is not the fur/soft-tissue outline. Page locality/subspecies metadata is inconsistent; do not derive regional proportions from it. | UTCT copyright notice; no open image/data license established. Reference-only; no CT or model download. |
| [Red fox skeleton, Higashiyama Zoo](https://commons.wikimedia.org/w/index.php?title=File:Skeletal_specimen_of_Red_fox.jpg&oldid=1252657742); original photograph KKPCW, 2022 | Whole skeleton reference identified as V. v. japonica. Display pose, perspective and a different regional population limit measurement. | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Any retained/reproduced photo needs attribution, license and change record; presently link-only. |
| [Canine skeleton, University of Minnesota](https://vanat.ahc.umn.edu/run/plate4.html); veterinary anatomy courseware, T. F. Fletcher | Canid joint-chain and digitigrade contact comparison. Dog homology only; no dog-breed dimensions transferred to fox. | University courseware copyright, freely viewable; no redistribution license established. Link-only. |
| [Carnivore Tracking, Mount Rainier NPS, pp. 4 and 7](https://www.nps.gov/mora/planyourvisit/upload/Carnivore-Tracks-12-20-21_508.pdf); Tara Chestnut, David Moskowitz and coauthors, February 2021; track illustrations Charon Henning; p. 7 photo NPS / K. Dreher | Four registering toe pads, canid pad/track shape, Cascade red fox front/hind tracks and walk/trot patterns. Track dimensions depend on substrate and population; not direct bone dimensions. | Mixed credits in publication: do not assign one blanket image license. Reference-only; illustrations not copied. |

Before authoring, retain an attributed unobscured side/front/rear living-animal
set and paw-sole close-up, and inspect the actual skeleton images at full
resolution. Establish adult and juvenile landmarks separately; no complete
calibrated fox dataset or age series has been acquired. Start with **0.38 m
withers height as a provisional art-direction scale**, subject to those
references; this is not a measured specimen or acceptance tolerance.

## Anatomical and runtime differences

The following are authoring requirements/hypotheses to review, not completed
features or numerical biological claims.

| Region | Fox requirement | Consequence for model / rig |
| --- | --- | --- |
| Head and neck | Narrow muzzle, defined jaw/cheeks, restrained eyes with attached lids; neck flows forward from chest. | New skull/soft-tissue mesh and head landmarks; independent jaw and ear controls. Do not shorten a deer skull and call it a fox. |
| Shoulder and trunk | Scapular movement along rib cage, continuous shoulder/axilla, flexible loin and controlled abdominal volume. | Author new topology around limb openings and scapular skin; preserve connected surface through stance and swing. Avoid the deer's thin groin/collar triangles. |
| Forelimb | Scapula → humerus → radius/ulna → carpus → metacarpal/paw → digits. | Separate wrist and digital flexion. No ungulate cannon/fetlock/hoof graph. |
| Hindlimb | Hip → femur/stifle → tibia/hock → metatarsal/paw → digits, with hock elevated. | Two proximal segments plus articulated distal paw; family-specific reach, limits and contact orientation. |
| Toes and sole | Four visible load-bearing digits per foot; separated digital pads, central pad and restrained claws; review fore dewclaw separately. | One articulated bone per main digit in initial budget; phalanges simplified visibly and declared. Dewclaw attached above stance surface, not counted as a fifth ground contact. |
| Tail and coat | Long tail with volume taper; coat conceals but does not replace underlying anatomy. | Three tail bones; original directional coat maps plus shaped silhouette. No expensive strand simulation or opaque tube tail. |

**Proposed 47-bone deform budget:** 11 axial/tail bones (root, pelvis, lumbar,
thorax, chest, neck, head, jaw, three tail), two ear bones; nine per forelimb
(scapula, shoulder, elbow, carpus, paw, four digits); eight per hindlimb (hip,
stifle, hock, paw, four digits). One spare remains under 48. These are runtime
approximations, not an anatomical bone count. Final names/parentage and local
rest transforms must be exported from the authored rig. The existing generic
template loader can be reused after validation; the deer motion solver's named
27-bone contract cannot be silently mapped onto this graph.

Ground contacts must come from actual deformed pad/toe vertices, with all sole
vertices checked for penetration. Contact centroids alone can hide an inverted
toe or skid. Begin with standing, slow walk and weight shift; then validate trot
against fox footage. Preserve measured segment lengths and deterministic seek;
publish unreachable targets and joint-limit diagnostics. Gait timings and
limits require reference measurements, not deer constants. Tail/ears must not
mask poor shoulder or pelvis motion.

## Variation, budgets and gates

Keep species, individual coat seed and developmental stage independent. Retain
the six control semantics (`bodyCondition`, `neckLength`, `legLength`,
`muzzleLength`, `earSize`, `juvenile`) for UI consistency, but author fox-specific
bounded deltas and local joint corrections. Proposed allocation: five paired
targets plus juvenile = 11; one demonstrated interaction corrective and up to
four evidence-driven pose correctives fit within 16. Spare targets are not a
requirement to add corrections. Fix bad neutral topology/weights first.
Juvenile changes must include head/ear/paw proportion and limb growth while
preserving coat identity; no uniform scale-only kit. Confirm age references
before exposing this control as realistic.

| Desktop review budget | Limit |
| --- | --- |
| LOD0 / materials | 20,000 triangles / 3 |
| Textures | At most 2 sets; dimension ≤2048; prefer 2048 base/normal and 1024 ORM |
| Shared decoded RGBA8 textures including mips | ≤48 MiB total across all material maps, shared across instances |
| Rig / weights / morphs | ≤48 bones / ≤4 normalized influences per vertex / ≤16 named targets |

The 48 MiB cap governs actual aggregate allocations: two full 2K map sets may
exceed it. Six instances share immutable geometry/textures but own skeletons
and morph state. Desktop evidence does not qualify Quest; an eventual XR asset
needs its own brief, LODs and measured headset review.

1. **Reference gate:** deer accepted first; then freeze fox reference ledger,
   landmark sheet, proposed contact shape and neutral silhouette. Record all
   unresolved reference/rights gaps before an expensive run.
2. **Neutral mesh gate:** shared-scale side/front/rear/top/three-quarter,
   wireframe, head and sole close-ups. Independent connected-skin topology
   audit; report intentional separate eyes/lids/claws and their attachment.
3. **Deformation gate:** actual GLB tests on both sides, entire skin and all
   approved morph combinations; retain current 0.45–1.8 edge-ratio guardrail,
   reject proper skin crossings and local reversals, review thin triangles,
   volume and face attachment. Do not weaken thresholds to accept a family.
4. **Motion gate:** real pad contacts, clearance, toe roll, planted-foot drift,
   reachable joints, preserved lengths and reverse-time replay. Review neutral,
   stance, swing and transitions visually before calling walk/trot accepted.
5. **Runtime/package gate:** hashes and provenance, assetctl/Khronos validation,
   Blender reimport, two independent morph instances, six-animal desktop CPU/GPU
   and memory measurements, stable repeated switching/disposal, preserved URL
   replay and coat identity. Publish only after explicit acceptance.

## Planning receipt

Read the ordered morph plan, deer reference review and asset-production
research. `assetctl doctor` passed (Blender 5.1.1, Node 24.7.0, pinned validators);
provider inventory was inspected without starting a provider. The planned path
is original Blender authoring; no fox authoring operation is implemented or
claimed. Run the schema check from the IWSDK root:

```powershell
node tools/assetctl/assetctl.mjs contract validate asset-brief universe-atlas/assets/briefs/pawed-reference-v1.json
```

Executed on 2026-10-02: exit code 0, `valid: true`, `errors: []`. This validates
the planning contract only; none of the future asset acceptance gates has run.

The brief lists eventual deliverables only. Future candidates use fresh
`Assets/_assetctl/red-fox-candidate-NNN/` directories and preserve source,
prompts, seeds, version hashes, review images and exact file hashes.
