# Procedural Fauna and Habitat Ranges

## Decision

Build fauna as a small set of constrained, versioned clades whose species can
occupy several *suitable* habitat types on one planet. The authoritative result
is a species/range/population record; a nearby rigged animal is only one
temporary representation of that record. This preserves the direction in
[species and simulation research](research-species-and-simulation-2026-09-14.md):
the camera, tile request order and worker completion must not decide which
organism exists. It also corrects the current biome lab boundary: its planned
fauna labels are useful vocabulary, but are not species generation or animal
simulation.

The first deliverable should be an explicitly fictional, terrestrial-inspired
quadruped clade and a limited set of aquatic, flying, sessile, or radial clades
only after separate contracts exist for them. This is a game-world policy, not a
claim to model alien evolution. Origin of life, convergent evolution, cognition,
language and civilisation remain unsolved scientific and design problems. A
future humanoid must therefore be an authored clade/archetype with controlled
individual variation and cultural policy, never a conclusion produced by a
body generator.

## What the evidence supports

Chris Hecker's published *Spore* animation paper is the most useful production
precedent, and also a warning against a generic random-mesh solution. Its
creatures were assembled from bodies with transforms, parent-child relations,
bounding boxes and semantic “capabilities”; the bodies form a directed acyclic
graph rooted in a spine. Animation selected parts through semantic queries such
as grasper, mouth, spine and spatial position, then bound authored channels to
the generated creature. This supports semantic anatomy before geometry and
capability-based animation binding, rather than attempting to retarget clips by
bone index. The paper also says its earlier general graph interface hurt player
creativity and constrained the product to a tree-like arrangement; its system
depends on animator-authored constraints and a reasonable initial pose. It is
excellent engineering evidence for a bounded creature family, not evidence that
arbitrary anatomy can be animated, nor a released source-code or asset license.
([Hecker 2008](https://www.chrishecker.com/images/archive/c/cb/20080513034828!Sporeanim-siggraph08.pdf))

Karl Sims's evolutionary virtual creatures similarly represent morphology as
linked rigid segments with joints and evolve controllers in a simulated task.
It establishes that coupled morphology/control search is possible, but its
results are task- and simulator-specific and use abstract rigid bodies rather
than shippable topology, UVs, skinning, art direction or ecology. It should
inform an offline experimentation lane, never the runtime source of a planet's
species. ([Sims 1994](https://doi.org/10.1145/192161.192167)) More recent work
also encodes creatures as kinematic trees, evolving morphology and control over
terrain tasks; it reinforces the value of a proxy physics gate, while not
providing a biological validator or browser-ready rig.
([Wang et al. 2021](https://www.nature.com/articles/s41467-021-25874-z))

For gameplay animation, the practical middle ground is a declarative gait
family plus terrain-aware inverse kinematics. Karim et al. generate footfalls,
foot trajectories and pelvis motion procedurally for many-legged characters,
and deliberately vary the computation by level of detail. Their review notes
the trade: data-driven motion looks natural but is morphology-specific;
physics-based control adapts but costs more; procedural motion is controllable
but can look unnatural. Use this as a lab hypothesis to test, not a promise of
quality. ([Karim et al. 2014](https://www.ahmadabdulkarim.com/wp-content/uploads/2014/02/AAK-ProceduralLocomotion.pdf))

Biomechanics makes several generator inputs non-optional: mass distribution,
centre of mass, attachment position, joint range, foot/contact shape, gravity,
terrain clearance and support pattern. A MuJoCo model is explicitly a set of
kinematic trees and composable joints, illustrating why those data must be
declared rather than inferred from a decorative mesh.
([Todorov, Erez & Tassa 2012](https://www.roboti.us/lab/papers/TodorovIROS12.pdf))
OpenSim likewise treats musculoskeletal dynamics and control as explicit model
data. Neither makes its numerical result portable to Rapier or a browser;
record simulator, version, timestep and terrain fixture with every offline
verdict. ([Seth et al. 2018](https://doi.org/10.1371/journal.pcbi.1006223))

Ecology supports ranges rather than one-species-per-biome. A realised range is
affected by environmental suitability, biotic interactions and access through
space; mechanistic niche models explicitly join environmental conditions with
organismal constraints. ([Kearney & Porter 2009](https://doi.org/10.1111/j.1461-0248.2008.01286.x))
Patch occupancy also changes through local extinction and colonisation, making
dispersal and barriers first-class model inputs rather than visual decoration.
([Hanski 1998](https://doi.org/10.1038/23876)) This evidence does **not** give
parameters for invented planets. It justifies a declared, falsifiable fiction
policy: climate and substrate filter candidate habitat; food, predators and
movement costs modify it; distance, rivers, coast, elevation and barriers govern
transfer between cells.

## Recommended contracts

Give every random choice a domain-separated hash and include all policy versions
in every digest. Use integer/fixed-point values for canonical thresholds and
event ordering. GPU noise, animation phase and local avoidance may vary only as
non-authoritative presentation.

```ts
speciesAt({ universeSeed, bodyId, cladeId, speciesOrdinal,
            phenotypeVersion, ecologyVersion })
rangeAt({ speciesId, surfaceCellId, cosmicTime, habitatVersion,
          historyVersion, branchId })
populationAt({ speciesId, ownerCellId, cosmicTime, historyVersion, branchId })
individualAt({ populationId, slotId, lifeEventId, phenotypeRevision })
agentAt({ individualId, representationTier, localSessionId })
```

`SpeciesRecord` is immutable except through a new revision. It contains stable
and parent/clade IDs; existence interval; body-plan family; bounded phenotype
parameters; semantic skeleton template; permitted joints and limits; mass and
collision proxy recipe; locomotion capabilities and gait parameters; growth
stages; diet/trophic role; reproduction/dispersal parameters; habitat tolerance
envelope; phenotype generator hash; and art/provenance fields. A species is
planet-specific by default. A record may be visible in woodland, grassland and
river corridor if each passes its envelope; it must not be duplicated into three
independent biome species merely to make a biome list look varied.

Keep four similarly named facts separate in the API and UI. **Suitability** is
the pure score returned from species traits and the supplied *dated* habitat
descriptor; it changes when those canonical inputs change.
**Potential density** is the capacity that suitability, productivity and
competition permit. **Dated occupancy** is the history result: whether a
reachable cell is actually colonised at the queried time. **Resident visible
agents** are the temporary, bounded local slots materialised for a viewer.
Thus a suitable island can remain unoccupied because no dispersal path or event
reached it, and a populated cell can have zero visible animals when distant.
Neither a biome-specific seed nor a camera visit may create a species, birth or
colonisation.

`HabitatDescriptor` should be a compact canonical input assembled from the
planet system: temperature/seasonality, precipitation or solvent availability,
atmosphere/density, gravity, elevation, slope, substrate, water salinity/depth,
vegetation productivity/structure, cover, roughness, light regime and barrier
class. `HabitatRangeRule` should state hard exclusions, soft suitability
weights, breeding requirements, seasonal migration rules and minimum connected
patch area. A pure `suitability(species, datedHabitatDescriptor)` function
returns an integer score and reason codes; “pure” means referentially
transparent for supplied inputs, rather than timeless in changing climate.
Food is a typed graph edge with an allowable prey/plant set, intake range and
competition group. It must be possible to answer “why is this animal absent?”
without inspecting a random stream.

`PopulationRecord` belongs to a stable watershed/surface-cell owner and holds
coarse abundance by cohort, sex/reproductive policy if used, capacity, food
availability, predator pressure, disease/disturbance events and outbound
dispersal commitments. Resolve discrete events by `(cosmicTime, priority,
stableEventId)`. Checkpoints are caches whose digest is verified by replay. A
canonical birth occupies a stable cohort slot whether or not the slot is ever
rendered; its individual ID derives from `(populationId, slotId, birthEventId)`,
never from a loop index or animated agent. Rendering may later materialise that
already-canonical individual as an agent. This lets time travel restore identity
without retaining every far-away agent.

Use a deliberately coarse trophic model at first: primary productivity supports
herbivore capacity; herbivores support predator capacity; scavenger/detritivore
roles consume a bounded fraction of deaths; each species has an explicit diet
edge and no circular consumption unless a named policy permits it. Update
capacity and dispersal at coarse ecological ticks, then cap per-tick change and
record events. This is sufficient to make prey absence, overpopulation and
barriers meaningful. It is not a claim of real food-web prediction: spatial
food-web models show that dispersal and speciation interact with web structure,
but their outcome depends on their assumed rules.
([Allhoff et al. 2015](https://doi.org/10.1016/j.jtbi.2014.11.006))

## Phenotype compiler and representation tiers

Each clade gets a separate compiler and validator. For `bilateral_quadruped_v1`,
generate a spine chain with left/right paired shoulder and hip sockets, exactly
four leg chains, bounded segment ratios, named feet, optional head/tail chains
and no cycles. Generate geometry around that semantic skeleton only after it
passes structural validation. Future `hexapod`, `serpentine`, `radial`,
`sessile`, `swimmer` and `flier` families require their own attachment,
locomotion and habitat contracts; “more limbs” is not a parameter change to the
quadruped compiler.

The compiler produces a `PhenotypeArtifact`: canonical skeleton JSON, bind pose,
joint limits, proxy bodies/masses, capsule/convex collision, material rules,
mesh/skin proposal, LOD recipes, animation capability set and a provenance
manifest. Reject a proposal if its graph is invalid; bones have non-finite or
zero lengths; paired parts are asymmetric beyond declared tolerance; bind-pose
skin weights fail; collision or mesh self-intersects in a pose sweep; feet cannot
reach ground on declared slopes; centre of mass/support margins fail the simple
stance test; or it exceeds target triangle, bone, material and texture budgets.
The proxy result is a filter for gait plausibility, not proof of biological
viability or visual quality.

Represent the same population at three costs. Beyond ecological interaction
distance, render deterministic population markers, density fields or cohort
impostors: no per-animal AI, physics, skeletal updates or collisions. In the
middle band, show a bounded, deterministic sample of slots as impostors or
shared-mesh instances with wind/idle phase derived from ID. At close range,
promote a stable selected slot into an animated agent with its rig, local
navigation, contact IK, audio and collision. Demotion discards the agent state
after recording only canonical outcomes that were explicitly allowed; usually
local steering and animation are presentation-only. Three.js exposes shared
geometry/material instancing and LOD objects, but those APIs do not establish a
Quest budget; device measurements remain the gate.
([three.js documentation](https://threejs.org/docs/#api/en/objects/InstancedMesh))

## Staged fauna prototype and labs

**Stage 0 — contracts and corpus.** Add schemas and a fixed seed corpus before
rendering animals: one temperate rocky world, one dry world, one wetland/river
corridor and one sterile regolith control. Define 8–12 habitat descriptors,
three trophic roles and only one quadruped clade. First run a **species gallery**
of 24–48 phenotype records across the bounded parameter envelope, producing
silhouette, skeleton and rig sheets but no claim that all are locomotion-ready.
Select only the accepted subset (initially at least 3, ordinarily 4–8 species)
after morphology and locomotion gates; this makes variation inspectable without
turning every random gallery specimen into a fixture. Generalist corpus species
must occupy at least two suitable, connected habitats where the descriptor
warrants it; specialists may occupy one. Add a suitable but disconnected-island
fixture that stays unoccupied until a recorded dispersal event makes it
reachable. The sterile control must produce none.
Export records, digests, reason codes and provenance, including
generator/checkpoint/seed/source/license state for any non-code asset. Do not
launch a generative model until its brief validates.

**Stage 1 — habitat-range lab.** A controlled map exposes descriptor layers,
range masks, connectivity, barriers, food edges, populations and time. Automated
checks cover same-query repeatability; changed cell request and worker order;
overlap/owner agreement; forbidden habitat absence; connected multi-biome
occupancy; barrier-limited dispersal; A→B→A time seek; checkpoint replay; and
stable individual IDs. Human review asks whether each range has an intelligible
environmental explanation, an ecotone has gradual turnover, and no biome is
made lively by arbitrary species duplication.

**Stage 2 — rig and morphology lab.** Render a labelled skeleton, rest pose,
weight heat map, collision proxy and silhouette sheet for every corpus species.
Run bounds, graph, skin, symmetry, joint, collision and budget gates, then pose
the full range of motion. Human review rejects awkward silhouettes, unreadable
head/tail/feet, visually intersecting limbs, excessive sameness across seeds or
a mesh whose personality comes only from colour. Expressive-range plots should
bin body length, leg length, stance width, mass, head/tail form and habitat
role, so “unique” is measured rather than asserted.

**Stage 3 — locomotion arena.** Use fixed flat, slope, loose-rock, shallow-water
and obstacle terrain seeds. For every declared gait/habitat pair, collect falls,
invalid contacts, foot penetration, clearance, path completion, speed envelope,
energy proxy and determinism of the proxy run. Test gait refusal as well: a
species that cannot cross deep water or climb a steep rock must select a route,
wait or fail according to its contract. Human review is a real-time playback
strip at walking and run speeds, including turns, stops and terrain transitions;
passing contacts alone does not make a credible animal.

**Stage 4 — representation/device lab.** Traverse fixed flight, descent,
walking and re-entry routes. Compare canonical population digest before/after
streaming, and measure instance count, animated-agent cap, draws, triangles,
CPU/GPU memory, frame time, promotion churn and streaming latency on target
hardware. Require no identity pop when a known slot promotes/demotes, no agent
count runaway, and a documented density reduction policy. Only this stage can
claim a runtime animal budget.

## Limits and release discipline

These labs validate meaningful constrained generation, habitat logic and
presentation quality; they do not validate abiogenesis, a scientific alien
ecosystem or intelligence. Learned morphology/controller search is offline,
optional and quarantined from canonical history until it can emit the same
versioned contract, provenance and review artifacts as code-native species.
Generated meshes remain experimental until topology, deformation, LOD,
collision, render-sheet, validator and device checks pass. Package any approved
asset through `assetctl` with its brief and sidecar manifest; preserve prompts,
seeds, parent assets, provider/checkpoint identifiers, consent and license
evidence. A paper, a public PDF and a code repository are different rights
objects: a research citation gives neither a code license nor permission to
ship its figures, data or assets.

## Sources and access notes

1. Chris Hecker, Bernd Raabe, Ryan W. Enslow, John DeWeese, Jordan Maynard and Kees van Prooijen. [“Real-time Motion Retargeting to Highly Varied User-Created Morphologies”](https://www.chrishecker.com/images/archive/c/cb/20080513034828!Sporeanim-siggraph08.pdf), SIGGRAPH paper, 2008. Public author-hosted PDF accessed 2026-09-14; its site label is “Spore’s Animation System.” The PDF grants no explicit code, data or game-asset licence.
2. Karl Sims. [“Evolving Virtual Creatures”](https://doi.org/10.1145/192161.192167), *Proceedings of SIGGRAPH ’94*, 1994. DOI landing page; publication access may require ACM access. No implementation or creature-asset license is implied.
3. Agrim Gupta, Silvio Savarese, Surya Ganguli and Li Fei-Fei. [“Embodied intelligence via learning and evolution”](https://www.nature.com/articles/s41467-021-25874-z), *Nature Communications* 12, article 5721, 6 October 2021. Open-access CC BY 4.0 article; the linked DERL code and configuration/data repository carry their own terms and must be checked separately.
4. Ahmad Abdul Karim, Thibaut Gaudin, Alexandre Meyer, Axel Buendia and Saida Bouakaz. [“Procedural Locomotion of Multi-Legged Characters in Dynamic Environments”](https://liris.cnrs.fr/Documents/Liris-5511.pdf), *Computer Animation and Virtual Worlds*, 2012. Public institutional PDF accessed 2026-09-14; author webpage was posted in 2014, and no code licence was located.
5. Emanuel Todorov, Tom Erez and Yuval Tassa. [“MuJoCo: A physics engine for model-based control”](https://www.roboti.us/lab/papers/TodorovIROS12.pdf), IROS, 2012. Public author-hosted PDF; the paper is not the MuJoCo software license.
6. Ajay Seth et al. [“OpenSim: Simulating musculoskeletal dynamics and neuromuscular control to study human and animal movement”](https://doi.org/10.1371/journal.pcbi.1006223), *PLOS Computational Biology*, 2018. Open-access article; OpenSim software is separately licensed.
7. Michael Kearney and Warren Porter. [“Mechanistic niche modelling: combining physiological and spatial data to predict species’ ranges”](https://doi.org/10.1111/j.1461-0248.2008.01286.x), *Ecology Letters*, 2009. DOI landing page; publisher access may vary and no data/code license is implied.
8. Ilkka Hanski. [“Metapopulation dynamics”](https://doi.org/10.1038/23876), *Nature*, 1998. DOI landing page; publisher access may vary.
9. Korinna T. Allhoff, Eva Marie Weiel, Tobias Rogge and Barbara Drossel. [“On the interplay of speciation and dispersal: an evolutionary food web model in space”](https://doi.org/10.1016/j.jtbi.2014.11.006), *Journal of Theoretical Biology* 366, 46–56, 7 February 2015; [arXiv preprint](https://arxiv.org/abs/1409.3065) posted 2014. The publisher article may require access; arXiv availability is not a code/data licence.
10. three.js contributors. [InstancedMesh documentation](https://threejs.org/docs/#api/en/objects/InstancedMesh), accessed 2026-09-14. API documentation; verify the installed package version and its MIT license separately from documentation content.
