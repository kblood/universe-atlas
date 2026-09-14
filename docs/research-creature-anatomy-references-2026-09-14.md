# Creature anatomy and expressive-diversity references

Research note, 2026-09-14. This is a bounded design reference for the
`universe-atlas` Biosphere Lab, not an assertion that the current quadruped
fixtures have skeletons, animation, or biologically simulated evolution. The
current animal renderer is a static, ellipsoid-based quadruped with inherited
proportion traits. The useful next abstraction is therefore a **semantic body
plan and skeleton recipe**, rather than more independent body-scale sliders.

## Finding

The strongest common lesson is to make the generator decide *what a part is*
before it decides what it looks like. A species should carry a bounded graph of
roles (`spine`, `head`, `jaw`, `fore-limb`, `hind-limb`, `foot`, `tail`,
`sensor`, `wing`, `fin`), bilateral/radial symmetry policy, attachment sites,
bone lengths, joint limits, support/contact roles, and material/detail rules.
Geometry, rigging and gaits are then compiled from that record. This makes a
descendant visibly related because it retains topology and role correspondences,
while differing species can change a constrained set of structural choices.

## Primary references and verified use

1. **Chris Hecker, Bernd Raabe, Ryan W. Enslow, John DeWeese, Jordan Maynard
   and Kees van Prooijen, _Real-time Motion Retargeting to Highly Varied
   User-Created Morphologies_ (ACM TOG / SIGGRAPH 2008), plus Hecker's GDC
   2007 _How to Animate a Character You've Never Seen Before_.** The GDC
   abstract describes user-created creatures with arbitrary skeleton topology,
   including different limb counts. The 2008 paper is particularly concrete: a
   creature is built from a deformable torso
   containing a spine plus attached parts; its 20--80 bodies hold transforms,
   bounds, parent/child relationships and semantic capability tags. Animation
   selects bodies through semantic and spatial queries (for example `grasper`,
   `mouth`, `spine`, front/back/left/right) rather than fixed bone names. It
   also reports a locomotion synthesizer, IK and secondary animation.

   Use this as the main runtime model: encode capabilities and attachment graph
   in `Species`, use a stable semantic query layer for AI and animation, and
   generate mesh and bones from that layer. Do not copy a Spore mesh, part
   library, animation, source code, or assume its proprietary system is
   available. The papers establish a design pattern, not a reusable licence.
   [GDC abstract](https://www.chrishecker.com/How_To_Animate_a_Character_You've_Never_Seen_Before)
   and [ACM publication record](https://doi.org/10.1145/1360612.1360626).

2. **Raistrick et al., _Infinite Photorealistic Worlds Using Procedural
   Generation_ (CVPR 2023), supplementary material, Appendix G.6.** Infinigen
   is a reproducible procedural nature generator, and its creature appendix is
   unusually actionable. Each part template must produce a mesh *and a
   skeleton line*. It assembles animal templates as a tree, tags bones such as
   head, feet, shoulders, hips and tail, then poses with IK targets. Its walk,
   run and swim loops are parametric target curves; gait changes include stride
   height/length, RPM and per-foot phase. Crucially, diversity is constrained:
   carnivore, herbivore, bird, beetle and fish templates use distributions over
   attachment parameters, but topology is mostly fixed within a template;
   insect leg count and horns/fins are named exceptions.

   This is the best immediate reference for `bodyPlanFamily` recipes: start
   with fixed-topology `quadruped-browser`, `quadruped-runner`, `hexapod`,
   `bird`, `fish` and perhaps `radial-sessile`, rather than letting every
   species attach any limb anywhere. It also demonstrates that variation can be
   legible through proportions, attachment placement, appendage presence and
   gait phase, not colour alone. [CVF Open Access paper](https://openaccess.thecvf.com/content/CVPR2023/html/Raistrick_Infinite_Photorealistic_Worlds_Using_Procedural_Generation_CVPR_2023_paper.html),
   [CVF Open Access supplementary PDF](https://openaccess.thecvf.com/content/CVPR2023/supplemental/Raistrick_Infinite_Photorealistic_Worlds_CVPR_2023_supplemental.pdf), and
   [BSD-3-Clause repository](https://github.com/princeton-vl/infinigen).

3. **Ilčík, Fiedler and Wimmer, _Procedural Skeletons: Kinematic Extensions
   to CGA-Shape Grammars_ (2010).** This paper extends shape grammar objects
   with kinematic sections, local pivots and joints. Its sequential split turns
   a section into a jointed chain; a parallel split creates a fork, explicitly
   suitable for legs or fingers. The grammar constraints prevent ambiguous
   parentage. It is not an animal-anatomy model or a skinning solution, but it
   is a direct technical basis for compiling grammar choices to a valid bone
   tree.

   In Three.js, represent a body-plan recipe as deterministic grammar expansion
   to `Bone` nodes, then build `SkinnedMesh` geometry around the resulting rest
   pose. Validate one root, acyclic parentage, finite non-zero lengths, allowed
   attachment counts, left/right pairing and joint ranges before allocating the
   mesh. [Author-hosted paper](https://www.cg.tuwien.ac.at/research/publications/2010/ilcik-2010-ps/ilcik-2010-ps-draft.pdf).

4. **Guo et al., _Creature Grammar for Creative Modeling of 3D Monsters_
   (2014).** The system begins with normalized, co-oriented, semantically
   segmented creatures and records symmetry and proximity between parts. Its
   creature grammar preserves part-adjacency relations, category counts and
   symmetries while producing abnormal structures through operations including
   torso concatenation and insertion of new parts. It is a human-in-the-loop
   inspiration system, not a claim that its outputs are physically viable or
   rigged.

   Its useful contribution is the diversity contract: measure and preserve
   topology, symmetry and semantic adjacency, then permit explicit mutations
   such as `addHornPair`, `replaceForelimbWithWing`, or `duplicateThorax` only
   in compatible clades. Present alien exceptions as authored speculative
   families and require a separate rig/contact gate. [Paper PDF](https://kevinkaixu.net/papers/guo_gmp14_creature.pdf).

5. **Innes McKendrick, _Continuous World Generation in No Man's Sky_ (GDC
   2017).** The official session description verifies a continuous deterministic
   world pipeline from voxel generation through polygonization, texturing,
   population and simulation. That supports separating canonical species and
   population decisions from streamed visual instances. It does **not** publish
   a fauna anatomy generator, skeleton format, limb rule or gait algorithm.
   Treat it as a streaming/ownership reference only; do not attribute a specific
   creature construction method to Hello Games from this talk description.
   [GDC Vault session](https://www.gdcvault.com/play/1024265/).

6. **Lionel Reveret, Laurent Favreau, Christine Depraz and Marie-Paule Cani,
   _Morphable Model of Quadrupeds Skeletons for Animating 3D Animals_ (SCA
   2005).** The authors construct an
   animation-ready quadruped skeleton from simple mesh measurements using a
   learned morphable skeleton; they report three intuitive parameters. This is
   narrow (mammal-like quadrupeds) and depends on expert skeleton examples, but
   it supports the low-risk first step: keep a common quadruped graph while
   deriving correlated spine/limb/head proportions instead of mutating each
   ellipsoid independently. [Eurographics publication record and abstract](https://diglib.eg.org/items/2624c2b8-a62e-4800-b9ca-7a81ea5042b5).

## Recommended bounded implementation contract

Add a versioned `phenotype` to animal `Species`, separate from ecological
`niche`: `familyId`, `topologyVariant`, `symmetry`, `segments`, `attachmentSites`,
`boneRatios`, `jointLimits`, `supportFeet`, `locomotion`, `surfaceRecipe`, and
`mutationLog`. Correlate values through **authored game-family envelopes**: a
`runner` recipe may jointly lengthen distal legs, shorten the trunk and widen
its permitted stride range; a `browser` recipe may jointly alter neck reach,
trunk proportions and idle/forage pose. These are controlled art and gameplay
choices, not universal anatomical claims. A lineage event should retain its
parent recipe and record a bounded descriptor difference, so the Lab can show
why the descendant changed.

Compile each species once per `(speciesId, phenotypeVersion, LOD)` into a small
prototype set. At runtime, instances only vary age, a bounded inherited latent,
pose phase and material expression. Use `InstancedMesh` for distant static or
impostor representations; instantiate the small `SkinnedMesh`/bone graph only
for nearby active animals. First deliverable: one fixed-topology quadruped with
front/hind leg chains, named feet, tail and head; authored idle/walk parameters;
flat/slope/step contact fixtures; and a same-lineage silhouette/rig/motion
review sheet. Do not add topology-changing aliens until that gate passes.

## Limits, provenance and licences

These sources guide representations and tests; none validates a fictional
alien's evolutionary history or predicts biology from a planet seed. A stable
seed is reproducibility, not scientific evolution. Physics success is only a
proxy for contact and traversal, and a valid rig is not visual approval.

Keep the implementation code cleanly separated from reference assets. Infinigen
currently publishes source under BSD-3-Clause, but its licence applies to that
repository, not to Spore, No Man's Sky, paper figures, screenshots or any
third-party meshes. Academic papers and GDC material likewise grant neither
production code nor art assets. If adopting external code, record its exact
revision and licence; if using a paper only, record it as design provenance.
Every generated prototype still needs its own deterministic generator version,
seed, source/asset provenance, assetctl validation, review sheet and target
device test before it is a shippable IWSDK asset.
