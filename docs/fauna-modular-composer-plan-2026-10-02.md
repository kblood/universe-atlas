# Modular creature composer: current priority

This amendment follows the user's explicit correction on 2 October 2026. It
supersedes the deer-first ordering in the earlier fauna plan. The active goal
continues, with structural variety and a testable modular Creature Lab first.
The user explicitly requests Opus 5.5 to perform implementation.

## Intended result

Create new, strange animals by combining parts across dinosaur, turtle,
giraffe, bird, ostrich, rhinoceros, ape, worm and centipede-inspired anatomy.
Species presets are starting points. Parts can be chosen independently to
produce combinations that are visibly structurally different. Realism remains
a goal for attachment, proportions, surfaces and movement; geometric prototypes
must be labelled experimental.

## Sequence

1. Versioned deterministic recipe: body plan, torso, head, neck, limbs,
   feet/hands, tail, shell/armor, wings and trunk; bounded segment/leg counts.
2. Composable geometry and anchors for upright bipeds, quadrupeds, sprawled,
   limbless and many-legged segmented bodies. Keep the fixed quadruped skeleton
   separate from layouts it cannot represent.
3. Plan-dependent walking, biped stepping, many-leg waves, crawling/slithering,
   and articulated wings/trunks. Powered flight remains separate.
4. Lab controls for independent parts, presets, seeded random combinations,
   pause/pose inspection, comparison and reproducible links. Explain actual
   compatibility adjustments without silently ignoring choices.
5. Independent structural, attachment, finite-geometry, resource, replay and
   motion tests, with representative hybrid creatures rendered in the browser.
6. Publish a labelled desktop preview and share a verified direct link. Save
   source/build/asset hashes. Headset qualification remains open.

## Ownership and retained work

Opus 5.5 owns production implementation: geometry, rig, animation, state and lab
integration, with Edit/Write/Bash and test access. Native agents provide anatomy
and UX specifications plus independent tests/review. Root deploys the preview.

Candidate027 and its passing neck/morph/replay work remain as an authored
reference. Further deer-only shoulder work was interrupted and preserved under
`test-results/fauna-opus-shoulder-028/`. It has not been exported or deployed and
is not a prerequisite for modular composition.

## First-preview acceptance

- Every requested family has a distinct example; hybrids prove independent
  composition rather than only switching species presets.
- Zero, two, four and many legs are genuinely different graphs/geometries.
- Selected shells, wings, trunks, necks and feet are visible and attached.
- Each graph has appropriate deterministic motion; numeric passes alone do not
  establish biological realism.
- Links reproduce recipe and pose. Invalid states are bounded or rejected
  clearly; repeated changes preserve resource ownership.
- Measure desktop budgets and report limits. Experimental procedural parts
  must not be presented as finished Blender-authored assets.
