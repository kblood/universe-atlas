# Creature diversity, attributes and motion

Research follow-up to the Biosphere Lab at `22ad8ed`, 2026-09-14.
This document proposes the next implementation; it does not add animation.

## What the lab actually does

The animals cannot currently walk or run. `src/biosphere-geometry.ts` builds a
static triangle mesh with ellipsoids and tapered segments. There is no animal
skeleton, skinning, gait controller or navigation. The viewer's animation loop
updates its camera and renderer, not the animals' joints.

`src/biosphere-model.ts` produces one quadruped founder and two descendants.
They all use the same body layout and browser diet. Inheritance adjusts body,
leg, head and tail proportions inside narrow limits. Individual variation
changes some dimensions and positions. Time selects existence intervals; it
does not continuously develop new anatomy or simulate natural selection.
Consequently, the user's observation of similar animals is accurate. Different
mesh hashes prove repeatability/variation but do not prove visible diversity.

## Research direction

Use a bounded anatomical grammar that produces a semantic skeleton, then derive
both geometry and locomotion from that skeleton. Separate the planet's lineage
history, a species' inherited anatomy, an individual's growth/variation, and its
temporary animation state. This allows broader shape changes without breaking
feet, joints, habitat identity or time queries.

The two companion Terra reports collect production precedents and primary
sources:

- [Anatomy generation and alien diversity](research-creature-anatomy-references-2026-09-14.md).
- [Walking, running and morphology-aware locomotion](research-creature-locomotion-references-2026-09-14.md).

Three additional sources guide the evolution and testing decisions:

1. Karl Sims, [Evolving Virtual Creatures](https://www.karlsims.com/papers/siggraph94.pdf),
   SIGGRAPH 1994. Graphs encode developmental structure and controllers; mutation
   and selection produce different task-performing bodies. The
   [author's video](https://www.karlsims.com/evolved-virtual-creatures.html) is a
   useful visual reference. These are simulated articulated block creatures,
   not ready-made organic meshes or a browser animal library. Our proposed
   adaptation is a constrained anatomy graph with local structural mutations.
2. Agrim Gupta, Silvio Savarese, Surya Ganguli and Li Fei-Fei,
   [Embodied intelligence via learning and evolution](https://www.nature.com/articles/s41467-021-25874-z),
   Nature Communications 2021. DERL jointly investigates morphology and learned
   control in simulated environments, including changes to limbs and joints.
   It supports evaluating bodies together with movement. Its large training
   experiments are an offline research reference, not a proposed runtime
   dependency or evidence that invented animals are biologically viable.
3. Gillian Smith and Jim Whitehead,
   [Analyzing the Expressive Range of a Level Generator](https://users.soe.ucsc.edu/~ejw/papers/smith-pcg-2010.pdf),
   PCGames 2010. The paper examines generated output distributions and gaps
   rather than output count alone. Applying that method to creature silhouettes,
   skeletons and movement is our design inference; the paper studies levels.

These publications were accessed on 2026-09-14. No figures, assets, source code
or model weights were copied. Publication availability does not grant rights
to ship associated code or art. No provider or checkpoint was used.

## Attributes with consequences

The following are proposed game-system variables, not calibrated alien biology.
Every exposed trait needs an observable consumer and a validation rule. Label
unimplemented traits as planned instead of presenting decorative statistics.

| Attribute group | Example parameters | Consequence to inspect |
|---|---|---|
| Body layout | symmetry, axial segments, limb pairs, attachment sockets | distinct silhouette and valid skeleton topology |
| Proportions | torso depth, neck length, limb segment ratios, stance width | reach, clearance, turning envelope and gait limits |
| Contact anatomy | foot width, toe arrangement, claws or pads | contact targets and allowed substrate/obstacle policies |
| Feeding | mouth reach, jaw form, feeding height, diet edges | reachable food resources and compatible habitats |
| Protection and appearance | plates, horns, skin pattern scale, insulation proxy | shape/material differences and declared ecological tradeoffs |
| Senses | sensor positions, direction, range | perception cones and behavior responses when behavior exists |
| Physiology | mass/density proxy, energy demand, thermal tolerance | bounded movement/resource eligibility, not arbitrary speed sliders |
| Life history | maturity, growth curve, lifespan, reproductive policy | age-dependent proportions and dated cohorts |

Store correlated groups: changing a load-bearing leg affects joint limits,
foot targets and the movement envelope. Do not independently randomize a large
torso, tiny support limbs and extreme speed and call the result realistic.
Validate the proposed combination and expose rejection reasons.

Traits should be sampled at four scopes. Clades define permitted construction
rules and recognizable shared anatomy. Species inherit and alter a subset of
those rules. Individuals vary inside the species envelope. Age and temporary
state affect growth, posture and animation without reseeding species identity.

## Broader body plans and visible ancestry

First replace the single quadruped recipe with a proper anatomical graph and
several deliberately different quadruped envelopes: compact low browser,
long-necked browser, long-legged runner and broad-footed ground dweller.
These are sampling/validation envelopes, not four finished meshes to rescale.
Generate head profiles, spine curvature, limb joints, contact shapes and optional
appendages from inherited parameters. Preserve the distinction between a
species' feeding role and an animator's locomotion capabilities.

Next add a hexapod grammar with its own socket and gait rules. Add serpentine,
bipedal, swimming and flying families only with separate valid movement
contracts. An alien can share an ancestral segmentation or appendage pattern
without being a rearranged Earth animal. Body plans remain bounded speculative
designs; six legs do not automatically imply viability or a specific ecology.

Do not create a completely unrelated random body at every date. At a recorded
branch event, copy the parent's structural graph, apply bounded correlated
mutations, validate the result, and record which traits changed. Larger
structural changes need an explicit permitted developmental operation, such as
segment duplication or paired appendage modification. That operation must also
produce compatible skeleton, mesh and movement capabilities.

A lineage comparison should show ancestor and descendant at both true scale
and normalized scale, plus changed bones, trait deltas, dates and the selection
policy/environment that admitted the variant. Include persistent ancestors,
extinction and periods of little change. Evolution need not always increase
size, complexity or intelligence. Do not impose a humanoid or civilization
endpoint on every lineage.

For an inspectable first experiment, generate a finite branching history under
declared environmental scenarios, with viability scoring and recorded outcomes.
Call this heuristic evolutionary generation. It becomes a selection experiment
only when variation, differential survival/reproduction and population change
are actually modeled; inherited timestamps alone are not that experiment.

## Movement and Three.js implementation boundary

Proposed pipeline:

```text
dated lineage + inherited traits
  -> anatomical graph and joint limits
  -> rig, collision proxies, surface mesh and skin weights
  -> validated gait capabilities
  -> footfall timing + terrain contacts + joint solving
  -> bounded near-camera animated representation
```

Give parts semantic identities such as spine, hip, knee, foot, head and tail.
Generate bind pose and skin weights with the mesh, using the same local frames.
Start with a small supported rig family rather than infer a skeleton from the
existing merged triangle soup. Prototype with rigid segments if helpful, then
test deformation before claiming an organic finished creature.

Walking needs planted and swinging foot phases, stride length tied to movement,
body support adjustments and terrain-aware foot placement. Running needs an
appropriate gait, contact timing and body motion; playing the walk cycle faster
is not sufficient. Initially use kinematic gait rules and inverse kinematics.
Keep physics locomotion as a separate validator/experiment so an animation demo
is not described as a physically balanced animal.

Use shared geometry/materials and bounded skeleton updates for nearby creatures.
Ordinary mesh instancing does not by itself provide independent skeleton poses.
Prototype individual skinned agents first, then evaluate pose sharing, baked
animation or custom instanced skinning if measurements justify it. Far-away
animals remain population records or cheap visual representations. Benchmark
8, 16 and 32 animated agents to choose a device-specific cap; these are proposed
test sizes, not demonstrated performance budgets.

## Labs and acceptance sequence

1. **Diversity gallery:** 48 fixed species cases, multiple profiles and body
   envelopes, four individuals each. Capture front/side/top neutral silhouettes
   at common scale and normalized size. Measure actual rendered silhouette
   differences and generated rig descriptors; unique IDs or vertices are not
   acceptance criteria. Inspect distribution gaps and save rejected cases.
2. **Anatomy inspector:** display joints, limits, attachment frames, mass proxies
   and skin weights. Sweep supported poses; catch detached parts, clipping,
   unreachable feet and invalid deformation before adding movement.
3. **Locomotion arena:** walk, stop, turn, accelerate and run on flat ground,
   ramps, steps and irregular terrain. Record contact penetration, planted-foot
   slip, joint violations, path completion, falls for physics tests and frame
   cost. Define tolerances relative to limb/foot dimensions and separate visual
   animation failures from physics failures. Save videos as well as metrics.
4. **Lineage comparison:** replay a branch history, inspect inherited and changed
   traits, and return A-to-B-to-A in time. Canonical species records must replay
   exactly; no promise of bit-identical GPU pixels or physics across devices.
5. **Habitat integration:** use accepted creatures in multiple compatible
   habitats and test resource/range exclusions, stable IDs and representation
   promotion/demotion. Do this before scaling to planetary populations.

Selection history uses stable event IDs and versioned deterministic streams;
workers, camera visits and animation frame counts cannot create evolution.
Animation phase and local steering are separate from universal species history.
Any later learned controller needs recorded training/runtime versions and
accepted artifacts, not a fresh training run during a time seek.

The next implementation should deliver the diversity gallery and rig inspector,
then a walk/run arena for the accepted quadrupeds. Expanding the number of
habitat instances first would multiply the current sameness.
