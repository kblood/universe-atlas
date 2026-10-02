# Blender fauna, anatomical rigs and morph variation

**Priority amendment:** the user clarified that broad, independently combinable
animal parts are the immediate objective and explicitly assigned implementation
to Opus 5.5. Follow [the modular composer plan](fauna-modular-composer-plan-2026-10-02.md)
before further deer-only polishing. The active goal continues; retained deer
work is a reusable reference, not a prerequisite for other body plans.

Status: implementation ongoing; the first modular desktop preview is
[deployed and verified](fauna-modular-preview-2026-10-02.md). The broader realism
goal remains active.
Date: 2026-10-02.

## Direction and evidence

The user wants realistic animals, substantially broader anatomical variation,
Blender involvement, and reuse of kblood/CharacterCreator where appropriate.
The deployed baseline is commit `68dc9e7d6c7b3744a1c0269cc10025f4502e038f`.
Its animals are procedural TypeScript surfaces; Blender was not used to author
them. Passing its technical tests did not establish anatomical realism.

This plan supersedes the next procedural-only implementation slice in
[the earlier variation plan](fauna-variation-plan-2026-10-02.md). Existing
[structural work](fauna-structural-variation-2026-10-02.md) supplies identity,
review controls and regression fixtures, but its shared skeleton is insufficient.

### Limb diagnosis

`src/fauna-body-plan.ts` calls the single middle joint a front carpus or rear
hock, while constructing a shoulder/hip-to-middle-to-low-ankle chain. Its
`rear ? -1 : 1` pole encodes this simplification. `fauna-locomotion.ts` carries
it into movement. The elbow/stifle and distal joints need separate landmarks.

Different apparent bending directions at the front carpus and rear hock are
normal; they are different joints. Simply reversing the current pole would
not restore the missing anatomy. Reference chains are:

```text
chest -> scapula -> shoulder -> elbow -> carpus -> fetlock -> hoof contact
pelvis -> hip -> stifle -> hock -> fetlock -> hoof contact
```

The first implementation may combine small digit segments, but must explicitly
represent these landmarks and their different constraints. Bone counts follow
the anatomy contract; preserving the current 22-bone graph is not a requirement.
The implemented first reference graph has 27 named bones and is subject to
deformation and visual review.

Primary references:

- [University of Minnesota: forelimb anatomy](https://open.lib.umn.edu/largeanimalanatomy/chapter/thoracic-limb-forelimb/)
- [University of Minnesota: hindlimb anatomy](https://open.lib.umn.edu/largeanimalanatomy/chapter/pelvic-limb/)
- [University of Illinois: horse anatomy diagram, PDF page 7](https://vetmed.illinois.edu/open-house/wp-content/uploads/sites/126/2020/10/More-About-Horses-Illinois-Vet-Med-Open-House-2020.pdf)
- [University of Minnesota: equine reciprocal apparatus](https://vanat.ahc.umn.edu/ungDissect/Lab06/Lab06.html)

Equine references explain joint roles, not deer proportions or hoof shape.
Collect species-specific visual references before approving the first model.
Record reference rights; reference images are not automatically distributable.

### CharacterCreator reuse

Inspected repository: https://github.com/kblood/CharacterCreator
Pinned revision: `d9d72e7628c4a7b4bfa1127627104042fe887e12` (master).

| Source | Adaptation |
| --- | --- |
| `web/character.js` | Schema-driven bipolar morph weights, paired correctives, named bone binding, morph-dependent joint offsets and inverse-bind rebasing. |
| `blender/build_base.py` | Pattern for neutral mesh, shape-key extremes, corrective shapes and joint sidecar; implement a new fauna producer. |
| `web/export/glbpack.js` | Sparse morph packing, duplicate targets, skin deduplication and float fallback for large deltas. |
| `web/cloth/skin.js` | CPU morph/skinning reference calculations for validation. |
| `blender/cc_clothing.py` | Barycentric fitting across all morphs for later mane, ear and membrane attachments. |
| `web/cloth/colliders.js` | Morph-aware capsules with new animal joint definitions. |
| `tests/export.test.mjs`, `tests/humanoid.test.mjs` | Export round trips, joint movement, rest-pose and binding test patterns. |

CharacterCreator's human mesh, 53-bone rig and human morph catalogue are not a
fauna base. Its +Z-forward convention also differs from Atlas's +X forward.
Its draft plugin contract is unimplemented; there is no generic plugin to install.
The Python quantizer rejects deltas of one metre or more; large neck/trunk
variation needs the JavaScript packer's float fallback or equivalent treatment.
Capture neutral joints before animation, and prevent position tracks from
overwriting morph-dependent joint offsets. Each animal owns its skeleton and
morph influences; shared geometry requires explicit ownership rules.

Code is MIT, copyright 2026 Kasper Olesen: retain the license notice and source
revision for adaptations. `LICENSE-NOTES.md` identifies MakeHuman assets as CC0
and MPFB as GPL build-time tooling. Do not copy MPFB implementation into an MIT
extraction. New fauna assets need their own authorship and license records.
Defer history-dependent XPBD cloth until deterministic seeking is designed.

## Implementation sequence

### 1. Establish one realistic reference animal in Blender

Start with an adult deer-like browsing ungulate and a juvenile of the same
identity. Author a species-specific reference sheet, dimensions and validated
asset brief before asset generation. Build the mesh with deliberate shoulder,
pelvis, muzzle, eye sockets, ears, cloven hooves and joint silhouettes. Include
UVs, eye surfaces and restrained short-coat PBR detail.

Use the existing named `assetctl` Blender boundary. Add a reviewed, narrowly
scoped fauna authoring/export operation if required, following the existing
tree-family precedent: validated paths, fresh outputs, structured results and
smoke coverage. No caller-supplied scripts or arbitrary evaluation interface.

Capability audit: headless Blender 5.1.1 and assetctl validators are available.
The interactive safe Blender bridge refused its connection during research;
the headless path remains usable. No model downloads are needed for this plan.

Save original `.blend`, exported GLB, textures, joint/morph sidecar and provenance.
Put disposable renders and experiments in a fresh `Assets/_assetctl/` directory.
Review front/side/back/three-quarter, close face/feet, neutral material and
wireframe before expanding the family. A smooth primitive assembly is not a
successful realism result merely because it was generated inside Blender.

### 2. Correct joints, skinning and movement

Implement semantic limb definitions with species-specific lengths, axes and
limits. Solve shoulder-elbow-carpus and hip-stifle-hock independently, then
apply distal joint orientation and contact constraints. Evaluate scapular
movement and species-appropriate coupling rather than a universal pole sign.
Derive contacts and stride from the actual morphed rig.

Author skin weights and corrective deformation around the real joints. Review
neutral stance, lifted foot, stance/swing walk phases, feeding and turning.
Extend to run transitions only after walking passes. Tests must compare named
landmarks against independent reference expectations, not just configured poles.

### 3. Add actual morph targets and reproducible customization

Create a versioned fauna morph schema and a small adapter based on the reusable
CharacterCreator algorithms. Initial bounded controls: body condition, torso
length/depth, leg proportions, neck length, muzzle, ear size and juvenile growth.
Use correlated bounds and paired correctives, with explicit joint offsets.
Separate topology changes from within-template shape changes.

Connect species, individual and growth inputs to deterministic morph weights.
Preserve catalogue IDs, coat identity and dated replay. Add lab sliders, reset,
trait locking and versioned specimen links, with neutral/extreme/adult/juvenile
comparison at the same scale and lighting. Keep the current baseline available
for a direct visual comparison during development.

### 4. Expand anatomical families in order

| Order | Family | Required structural difference |
| --- | --- | --- |
| 1 | Browsing ungulate | Cloven hooves and explicit distal joints; reference quality gate for the pipeline. |
| 2 | Cursorial pawed animal | Digitigrade chain, articulated paws/toes and family-specific head and shoulders. |
| 3 | Broad padded animal | Appropriate foot posture, mass distribution and gait; not a scaled hoof mesh. |
| 4 | Long-neck browser | Multi-segment neck, balanced torso and head, neck correctives and feeding reach. |
| 5 | Proboscidean | Articulated trunk with bend limits, ears, broad feet and family-specific skull. |
| 6 | Wing-bearing animal | Separate bird- or bat-like forelimb wing graph, membrane/feather topology and folded/perched poses. |

Each family receives a template, morph bounds, named skeleton, attachment
contract, deformation cases and review sheet. Real bird/bat wings replace
forelimbs. A four-legged animal with additional wings is a separately labeled
speculative family. Powered flight is a later locomotion milestone; this goal
includes articulated folded wings and grounded/perched review, not a flight
claim. Existing speculative wings remain identifiable as such.

### 5. Runtime and measurable acceptance

Export and reimport GLB morphs, skin and sidecars through assetctl. Implement
family loading, owned skeleton instances and bounded caching/disposal. Derive
lower-detail silhouettes from the same phenotype and pose. Preserve existing
contact, stretch, replay and resource gates; record any deliberate budget change.

Set numeric geometry, material, texture, bone/morph and resident-memory budgets
in each brief before authoring. Start the reference asset at no more than 20,000
LOD0 triangles, three materials and 2K texture dimensions; these are proposed
desktop limits, not measured results or Quest qualification. Measure six nearby
animals, repeated specimen switches, frame time and memory against the baseline.

Validation includes:

- Neutral shapes, every morph extreme and representative interacting extremes.
- Independently checked limb landmarks, joint directions and movement envelopes.
- Attachment clearance, skin stretch, normals, contacts and GLB reimport.
- Stable individual coat through growth, morph changes, LOD and saved-link replay.
- Deterministic date seek and existing catalogue regression checks.
- Updated fixed 96-specimen corpus plus explicit new-family boundary fixtures.
- Desktop browser screenshots, animation strips, actual cost measurements and
  before/after visual review. Numeric passes alone cannot accept realism.

### 6. Package, deploy and share

Ship reviewed desktop increments with their `.blend` sources preserved, valid
brief, technical report, provenance and packaged manifests. Deploy through the
existing project workflow after each completed visual/technical gate, verify
the live build and provide the Creature Lab link with reproducible specimens.
Keep unaccepted families out of the planetary default population.

Desktop is the immediate runtime target. Assets remain experimental for XR
until deformation, animation and in-headset acceptance pass. Quest qualification
requires actual device testing and must be reported separately, never inferred
from desktop results. No new models/licenses/private uploads are authorized by
this plan; use existing tools and original or appropriately licensed assets.

## Delegation and completion

Use subagents for anatomy/reference checks, isolated morph/runtime work and
independent visual/regression review. Coordinate shared contracts before edits;
serialize GPU-heavy generation, Blender renders and browser review.

First checkpoint: one convincing Blender-authored ungulate with correct limb
landmarks, actual morph targets and reproducible adult/juvenile lab specimens.
Then apply the same quality gates to the ordered families. Do not call the full
goal complete at the first checkpoint: it also includes the family expansion,
runtime validation, documentation and deployment described above. Report any
unfinished quality or hardware gate explicitly.
