# Creature locomotion references for generated quadrupeds

Date: 2026-09-14. A practical route from static, unrigged triangle-soup animals to walk/run motion in Three.js; it is not a claim that the current meshes can animate without conversion.

## Recommendation

Do not try to infer a reliable skeleton or deformation weights from arbitrary generated triangle soup at runtime. First admit each creature to a deliberately small **locomotion-ready** class: a named root, pelvis/chest/spine chain, and four named legs, each with hip, knee/elbow, ankle and toe/end-effector joints. Retopology/skin weights and this semantic skeleton are asset-preparation work. The runtime system should then carry a compact morphology descriptor (leg-pair order, hip positions in body space, segment lengths, joint limits, foot radius, body dimensions, and gait limits), not hard-coded wolf bone names or fixed clip data.

Use a phase-driven gait and terrain-aware foot targets to supply a two-bone/three-bone IK solve. This is the useful common ground between Spore's morphology-independent pose goals and Johansen's semi-procedural terrain adaptation. It gives a readable creature that can walk and run across the Atlas ground without requiring a physics-trained controller.

## Four primary references

1. Chris Hecker, Bernd Raabe, Ryan W. Enslow, John DeWeese, Jordan Maynard, and Kees van Prooijen, **“Real-time Motion Retargeting to Highly Varied User-Created Morphologies,”** *Proceedings of ACM SIGGRAPH 2008*. [Author-hosted paper and materials](https://chrishecker.com/Real-time_Motion_Retargeting_to_Highly_Varied_User-Created_Morphologies), [PDF](https://chrishecker.com/images/c/cb/Sporeanim-siggraph08.pdf).

   Spore records an authored action in morphology-independent semantic relationships, then specializes it at runtime into IK pose goals. Make intentions explicit: planted limb, foot target relative to body/travel direction, head aim, and torso compression. A skeleton remains required, but animation can target normalized semantics rather than one exact creature.

2. Rune Skovbo Johansen, **“Automated Semi-Procedural Animation for Character Locomotion,”** Master’s thesis, Aarhus University, 2009. [Locomotion System page and thesis PDF](https://runevision.com/tech/locomotion/).

   It derives speed, heading, liftoff, landing, and timing from animation, then adapts it to uneven terrain; the released system demonstrates four-legged support. Retain a small authored/procedural gait as style while raycasts, foot placement, and IK solve local contact. This avoids sliding feet on slopes and steps.

3. Baxi Chong, Yasemin O. Aydin, Jennifer M. Rieser, Guillaume Sartoretti, Tianyu Wang, Julian Whitman, Abdul Kaba, Enes Aydin, Ciera McFarland, Kelimar Diaz Cruz, Jeffery W. Rankin, Krijn B. Michel, Alfredo Nicieza, John R. Hutchinson, Howie Choset, and Daniel I. Goldman, **“A general locomotion control framework for multi-legged locomotors,”** *Bioinspiration & Biomimetics* 17(4), 046015, 2022. [Open preprint](https://arxiv.org/abs/2112.00662), [DOI record](https://doi.org/10.1088/1748-3190/ac6e1b).

   It describes contact patterns with duty factor and lateral phase lag, generalizes to different leg counts, and evaluates speed and static stability separately. For our initial experiment, explore a walk with duty factor above 0.5, then a separately validated trot/run envelope. Duty factor alone neither identifies a gait nor establishes dynamic stability. Change stride length, duty factor, phase, clearance, body motion, and turn rate together.

4. Jie Tan, Tingnan Zhang, Erwin Coumans, Atil Iscen, Yunfei Bai, Danijar Hafner, Steven Bohez, and Vincent Vanhoucke, **“Sim-to-Real: Learning Agile Locomotion For Quadruped Robots,”** *Robotics: Science and Systems*, 2018. [Google Research publication page](https://research.google/pubs/sim-to-real-learning-agile-locomotion-for-quadruped-robots/).

   This is a boundary reference, not the first implementation. Learned trot/gallop policies need actuator/latency models, physics randomization, perturbations, and a careful observation space. Later learning work must explicitly define morphology, contacts, velocity target, terrain sensing, action bounds, falls, and transfer tests; it cannot replace a production rig.

## Proposed Three.js animation contract

At load/import, reject missing semantic joints, non-finite/zero segment lengths, disconnected skinning, or unreachable foot targets. Cache each leg’s hip transform, lengths, bend plane, and limits. Advance one normalized phase per creature; derive stance/swing from phase offset and duty factor. World-lock a stance foot. Move a swing foot from plant to predicted landing with smooth horizontal interpolation and a raised arc. Predict from body velocity, heading, stride, turn radius, hip offset, and clamped look-ahead; raycast down and use hit normal/height. If no valid reachable hit exists, shorten the step, then use an in-place recovery pose.

Solve hip-to-target with analytic two-bone IK; use bounded CCD/FABRIK for an ankle/toe. Clamp joints, preserve bend side, and partly align feet to terrain normals. Compute/smooth pelvis height, pitch and roll from planted feet, then solve legs again. Add a phase-linked spine wave and head stabilization. These are pre-render kinematic transforms; use `AnimationMixer` only to blend a sparse style clip.

## Animation versus physics

This proposal is animation: the game decides the creature’s root velocity/path, and the gait presents that movement while feet are placed plausibly. Collision can stop or steer the root, but it must not be expected to create a dynamically balanced gait. Physics locomotion instead applies joint forces/torques, simulates mass, friction and contacts, and needs recovery behavior, a fixed timestep, tuning or training, and robust fall handling. Start with kinematic animation for ambient fauna and ordinary NPC travel. Consider physics only where pushing, being pushed, falling, or terrain response is central gameplay and a controlled body/rig has passed its own test program.

## Acceptance metrics and proposed budgets

These are proposals to calibrate on target hardware, not repository-wide limits. Record a 30-second flat-ground loop and a fixed slope/step course for every locomotion-ready species. Require no visible foot slide during stance (measure mean/end-point drift in world space), no target outside the leg’s reachable annulus, no joint-limit violation, no NaN transforms, no ground penetration beyond a small tolerance, and no root-speed error large enough to make the gait visibly skate. Record planted-contact count, support-polygon violations for the walk gait, pitch/roll peaks, stride frequency, and left/right asymmetry. For runs, accept dynamic imbalance deliberately but measure heading/yaw drift and discontinuities at walk/run blend thresholds.

As a starting web budget, propose four legs with at most four deforming joints each, one root/spine/head chain, one skeleton per creature, one terrain raycast per pending landing plus a bounded number of validation probes, and no per-frame allocations. Profile representative crowds on the intended device before setting final counts: cap active full IK creatures by measured frame time, then degrade distant creatures to reduced update rate, baked/simple cycle, or impostor. Validate CPU animation time, raycast time, draw calls, triangles, skinned-vertex count, and texture memory separately; a low triangle count does not make an unskinned triangle soup animatable.

## Provenance and licensing

Keep scholarly citations separate from executable code licenses. The references above justify ideas and must remain cited with their exact titles, authors, publication context, and URLs; they grant no right to copy source, figures, videos, or implementation. Before importing any third-party code, shaders, rigs, clips, or motion data, record its repository/source URL, version or commit, license, attribution obligations, modification, and asset-use terms in the creature’s provenance manifest. For generated input meshes, also preserve provider/model/checkpoint, prompt, seed, input references and their consent/license status. A locomotion-ready source asset, the generated rig/weights, the gait parameters, and validation recordings should be package artifacts so an attractive animation remains reproducible and reviewable.
