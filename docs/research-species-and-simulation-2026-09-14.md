# Procedural species and simulation research

Research note, 2026-09-14. This is a design and validation proposal, not an
implementation claim. It follows the existing [living-worlds and time roadmap](living-worlds-and-time-roadmap.md)
and [walking and shared time implementation record](walking-and-time.md). Those
documents frame the broad history contract. The current build also has a
regional physical-river and visual-vegetation pilot. This note concerns the
remaining canonical, planet-wide population layer: stable plant/prop identities
and ecological ownership across all regions, plus animals and historical
population simulation. It does not describe the pilot as absent.

## What a useful system must guarantee

There are three different products hidden in “procedural life,” and they need
separate contracts:

1. **Ecological population records** decide what can occur in a habitat, its
   density, age class, lineage and coarse behaviour.
2. **A species phenotype** turns a stable species record into a body plan,
   materials, growth stages, a skeleton and animation capabilities.
3. **A local representation** turns population records into instances, impostors,
   colliders and, only where necessary, nearby active agents.

The first two are canonical data. The third is disposable streaming output.
Neither a camera visit nor a worker completion may choose which tree, animal or
person exists. A biome can therefore be densely populated in its record while
rendering only a bounded, distance-appropriate subset.

Do not use a single “random alien mesh” generator. It produces neither a stable
identity nor a safe rig. Do not infer a real evolutionary history from a
plausible-looking generated creature either.

## Evidence-backed constraints and deliberate fiction

### Grounded biological constraints

Use body-plan families with constraints, rather than freely attaching arbitrary
limbs to arbitrary meshes. For terrestrial bilaterian-inspired life, make
bilateral symmetry, a central body axis, paired attachment sites, bounded joint
degrees of freedom, feasible centre-of-mass envelope and support polygon
explicit parameters. A morphological generator can allow exceptions only through
a separately named family (radial, colonial, sessile, modular), with its own
locomotion rules.

This is a useful approximation, not a claim that Earth biology supplies a
universal alien template. Developmental research finds strong, measurable
constraints in vertebrate body-plan development and in segmentation, while also
showing that existing regulatory systems can be co-opted into new structures.
It supports *structured variation* more than it supports a universal list of
permitted shapes.

Mass, gravity, terrain and locomotion have to be evaluated together. A six-legged
low body can tolerate a different failure envelope from a tall biped; a mesh that
looks sound can still be unstable, self-intersecting, impossible to skin cleanly,
or unable to clear the ground. The research below supports using articulated
kinematic trees and physics trials as a filter. It does **not** establish that a
browser physics result is biologically correct or that a good controller makes a
production-quality animation.

### Speculative alien and humanoid design

Alien plausibility is a scenario policy, not a scientific prediction. Planet
descriptor fields—gravity, atmospheric density, temperature range, liquid
solvent, terrain roughness, light spectrum and food/web productivity—may constrain
available *fictional* clades. The policy must declare which Earth-like priors it
uses and preserve its version with the world.

Humanoid societies require an independent cultural/technological policy. A
bilateral upright species can be selected as a design target, but intelligence,
language, civilisation, culture and interstellar expansion cannot be generated
as scientifically validated consequences of body shape or habitat. The first
human-like species should be a deliberately authored archetype with parameterized
individual variation, not an evolutionary endpoint produced by a seed.

## Recommended deterministic data model

Extend—not replace—the existing `worldAt`/`surfaceAt` direction. The current
`atlas-time-1` BigInt date and `baseline` branch already provide a suitable
lossless date/address foundation. Add independent versioned records:

```ts
speciesAt({ universeSeed, speciesId, phenotypeVersion, ecosystemVersion })
populationAt({ bodyId, surfaceCellId, cosmicTime, historyVersion, branchId })
individualAt({ populationId, slotId, cosmicTime, lifeVersion })
```

`SpeciesRecord` should contain a stable ID; parent/clade IDs; existence interval;
body-plan family; bounded genotype/phenotype parameters; skeletal graph template;
joint limits; locomotion capability tags; material/palette rules; growth stages;
diet and habitat tolerances; and exact generator/version hashes. `PopulationRecord`
should contain a stable surface-cell or watershed owner, habitat suitability,
target density, species mix, cohort slots and coarse event references. An
`IndividualRecord` is derived only for a stable occupied slot, with an ID derived
from `(populationId, slotId, lineage/event namespace)`.

Address every stochastic decision by a domain-separated hash, for example
`hash(worldSeed, "species", cladeId)`, `hash(speciesId, "skeleton", revision)`
and `hash(populationId, slotId, "birth", eventId)`. Never consume a global RNG
stream, use array order, or depend on tile/worker completion order. Keep topology
and historical decisions in integer/hash space; GPU noise may alter pixel detail
but cannot alter identity, collision, birth/death, river ownership or a saved
result.

Use an event key `(time, priority, stableEventId)` and a canonical total sort.
At a distant date, resolve the latest checkpoint then apply the bounded suffix of
events. Checkpoints are verified caches: their canonical digest must equal replay
from the prior checkpoint. Local animal activity is a separate, explicitly
non-authoritative simulation layer. Preserve a snapshot plus input/event log only
if exact local replay is actually required; a seed alone cannot promise it across
engines or devices.

## Phased implementation specification

### Phase A — coverage before creatures

Make vegetation and rocks a deterministic population layer first. Derive habitat
from the planned geology, watershed, climate, soil/sediment, elevation, slope and
exposure fields. Sample candidates on the sphere with a deterministic blue-noise/
minimum-distance process, apply density and exclusion rules, then persist the
cell/slot identity. Add a small authored asset family: two tree forms with growth
stages, shrub, grass cluster and several materially distinct rock families. The
generator should vary scale, silhouette, age, orientation, material and local
assemblage under measured bounds; it must not represent every variation through
uniform random scale and tint.

Acceptance fixtures: wet temperate forest, dry rocky scrub, alpine slope, beach,
wetland/river corridor and airless moon. Each needs explicit expected coverage
ranges and forbidden content. Trees must be absent where water, climate or soil
disallow them; rocks must vary by substrate and erosion class. The “forest”
fixture needs a canopy/understory/clearings structure at regional scale and stable
individual IDs at close range.

### Phase B — biological phenotypes, geometry recipes and rig contracts

Begin biological phenotype families with plant and a deliberately small animal
family such as quadruped. A phenotype compiler produces a semantic skeleton first,
then a mesh/skin proposal. It validates: graph is a tree where required; exactly
one root; permitted attachment sites; finite nonzero bone lengths; no
self-intersection at reference pose; joint limits; mass distribution;
bind-pose/weight validity; material slots; named locomotion clips; LOD/proxy
collider correspondence. Rocks are not species or phenotypes: static geometry
recipes instead derive their silhouette, fracture/erosion class, material and
scale from substrate and local conditions, and validate mesh/LOD/collider rules
without a biological skeleton or gait contract.

A green rig validation does not prove a pleasant gait, anatomy, or art quality.
Run a visual review sheet and motion playback for every generated family, and
keep failed candidates/reasons in the test corpus. Production meshes still follow
the repository’s asset brief, provenance, optimisation, package and intended
device validation rules.

### Phase C — local locomotion and behaviour

Use authored parameterized gaits for the first creatures. A fixed-step local
controller gets terrain probes, target/avoidance steering and a state machine
(idle, forage, flee, traverse, rest); it operates only in active cells. Test a
physics proxy skeleton on flat, slope, step, water-edge, obstacle and low-gravity
fixtures before attaching art meshes. Spawn/despawn must preserve the canonical
cohort outcome while local animation can be restarted.

Treat learned/evolved controllers as an offline research tool, not runtime
generation. They are expensive, stochastic and require an explicit training
dataset, seed, simulator version, reward, evaluation environments and human
review. No automated pipeline should promote a learned morphology or rig into
shipping content merely because it traverses a benchmark.

### Phase D — ecology and universal time

Add coarse populations before individual births: carrying-capacity bands and
species composition per canonical habitat owner, followed by scheduled migration,
disturbance, speciation/extinction and settlement events. A species change is an
event with parent lineage, constraint-policy version and a descriptor diff; it is
not a re-roll of all descendants. For date seeks, historical population state
comes from checkpoint plus events; only the nearby representation is materialized.

This preserves observation-first time travel: `branchId` remains in every query,
but editing past history remains deferred. History has to be revalidated when an
algorithm version changes, using an explicit migration, never silently regenerated
because the player revisited a biome.

## Generator test systems

Build these as automated, inspectable test suites and a seed corpus, not as a
single beautiful fly-through.

| System | What it measures | Required invariants / output |
|---|---|---|
| Fixed-seed world survey | Detail density across climates, latitudes, cube faces, LOD bands and travel routes | Histograms/maps for occupancy, nearest-neighbour spacing, canopy cover, species mix, rock size/material/shape descriptors; no camera-order change |
| Expressive-range dashboard | Whether parameters actually cover intended variety rather than one dominant rock/tree | 2-D/3-D bins such as canopy cover × tree height, rock angularity × size, gait speed × stability; empty/overfull bins are review findings |
| Route sampler | What a player sees during free flight, descent, walking and re-entry | Canonical routes across fixture worlds; captures record digests, counts and optional screenshots; comparison is primarily semantic metrics, not pixels |
| Morphology/rig gate | Whether a phenotype is structurally exportable | Skeleton/skin checks, pose sweep, self-collision, joint-limit, contact, LOD/collider and animation-root checks; machine-readable failures |
| Locomotion arena | Whether the selected proxy can traverse its declared habitat | Success, falls, slip/contact count, energy proxy, clearance and time across fixed terrain seeds; never substitute for animation/art review |
| History replay matrix | Whether date, cache and parallelism affect canonical history | cold/warm cache; shuffled cells; worker counts; A→B→A seeks; checkpoint replay; event digests and IDs must match |
| Device budget run | Whether dense representation is affordable | Measure frame time, draw calls, CPU/GPU memory, instance counts, shadow/alpha cost and streaming latency per target device; establish limits from measurements |

Use metamorphic tests alongside golden fixtures: rotating a world-space sample
within a symmetric fixture should preserve coverage statistics; splitting a
non-border cell should not change its parent-owned population; generating the
same cell alone or after neighbouring cells should yield the same identities;
replay from a checkpoint must equal replay from origin. Pixel-perfect images are
useful for regression triage but are unsuitable as the sole determinism oracle
because browser/GPU rendering differs.

The survey needs a coverage floor chosen per habitat, not one global “objects per
square metre” target. Publish the actual ranges and measured device outcomes in
the fixture manifest. A dense grassland, sparse desert and open beach can all be
credible; identical prop density everywhere cannot.

## Research sources and precise use

1. [Wang et al. (2021), “Embodied intelligence via learning and evolution,” *Nature Communications*](https://doi.org/10.1038/s41467-021-25874-z). The paper encodes creatures as kinematic trees of rigid parts and articulated joints, varies limb topology/physical and joint parameters, and evaluates them in increasingly difficult terrain. It supports a semantic skeleton plus physics-gate approach. Its simplified shapes, simulator and learned controllers are research abstractions, not an art rig or biological-validation recipe.

2. [Seth et al. (2018), “OpenSim: Simulating musculoskeletal dynamics and neuromuscular control to study human and animal movement,” *PLOS Computational Biology*](https://doi.org/10.1371/journal.pcbi.1006223). This is evidence that articulated biomechanical models can be analysed in a specialised simulation tool. It supports keeping morphology, joints, actuators and motion tests explicit. It does not make OpenSim a proposed browser/runtime dependency or give a generic alien anatomy model.

3. [Todorov, Erez & Tassa (2012), “MuJoCo: A physics engine for model-based control,” *IROS*](https://doi.org/10.1109/IROS.2012.6386109). It is a primary reference for using constrained articulated-body simulation to evaluate control. Use the principle—proxy physics tests and recorded simulator versions—not an assumption that its numerical results replay identically in Rapier or browsers.

4. [Takeuchi et al. (2017), “Constrained vertebrate evolution by pleiotropic genes,” *Nature Ecology & Evolution*](https://doi.org/10.1038/s41559-017-0318-0). Their transcriptome analysis supports the claim that conserved vertebrate body plans have developmental constraints. It justifies constraints as priors for vertebrate-inspired families; it cannot establish constraints for non-Earth life.

5. [Young et al. (2015), “Shared rules of development predict patterns of evolution in vertebrate segmentation,” *Nature Communications*](https://doi.org/10.1038/ncomms7690). The study connects segment proportions and variation to an inhibitory-cascade rule across several structures. It supports parameterizing repeated segments with bounded relationships, not independently random bone lengths. Its results do not prescribe a complete creature generator.

6. [Bridson (2007), “Fast Poisson Disk Sampling in Arbitrary Dimensions,” *ACM SIGGRAPH Sketches*](https://www.cs.ubc.ca/~rbridson/docs/bridson-siggraph07-poissondisk.pdf). This gives a practical basis for minimum-distance/blue-noise candidate placement. Its sequential active-list sampler does **not** promise independent-cell determinism: identical output requires a canonical owner/domain, halo inputs and stable candidate priorities (or another order-independent construction). Habitat weights, spherical-area correctness, exclusion zones, temporal identity and stream-boundary consistency remain application work.

7. [Smith & Whitehead (2010), “Analyzing the Expressive Range of a Level Generator,” *FDG*](https://doi.org/10.1145/1814256.1814260). It defines expressive-range analysis as measurement of output variety and parameter effects, useful for revealing biases and holes. Reuse the method with ecology-specific metrics; its platform-level metrics cannot simply be reused for forests or species.

8. [Mouret & Clune (2015), “Illuminating search spaces by mapping elites,” *arXiv*](https://arxiv.org/abs/1504.04909). MAP-Elites maps high-performing solutions across chosen feature dimensions rather than returning a lone optimum. It motivates a morphology/coverage exploration dashboard. Chosen behavioural descriptors determine what is illuminated, and the method’s evaluation cost makes it an offline tool.

9. [McGlohon & Carothers (2021), “Unbiased Deterministic Total Ordering of Parallel Simulations with Simultaneous Events,” *arXiv*](https://arxiv.org/abs/2105.00069). It directly addresses deterministic ordering of simultaneous discrete events. It supports the explicit stable event tie-breaker and replay matrix. It does not make arbitrary floating-point physics deterministic across engines or devices.

## First bounded acceptance milestone

Before any universal animal evolution: deliver one rocky ocean world and one
airless moon fixture; six representative habitats; deterministic vegetation/rock
populations; a survey dashboard; fixed free-flight/descent/walking routes; and
the complete replay matrix. Then add one authored quadruped family with a
validated semantic skeleton and proxy locomotion arena. Record all seed/version
manifests and measure the real browser/device budget before raising density or
adding learned morphology, humanoids or time-varying ecology.
