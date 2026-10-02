# Realistic fauna and variation plan

## Current implementation direction

The [Blender and morph plan](fauna-blender-morph-plan-2026-10-02.md) supersedes
the procedural-only next slice below. It records the limb diagnosis,
CharacterCreator reuse, a Blender-authored reference animal and ordered family
expansion. Historical implementation statements below reflect their original
milestone; consult the structural milestone and new plan for current status.

## Structural expansion and implementation status

The user expanded the direction to different limbs, paws, hooves, trunks, long
necks and wings. The [structural variation milestone](fauna-structural-variation-2026-10-02.md)
records six implemented morphology families, production-skin comparison and
shareable specimen links, plus the remaining rig/topology work. The original
ordered plan below remains the broader roadmap; its future items are not all
complete. Wings and trunks currently share existing chest/head bones.

## Direction and current baseline

The target is animals with believable anatomy, surfaces and movement, with
recognisable species and recognisable individuals within each species. The
current four procedural quadruped archetypes are a starting point. This release
adds facial landmarks, shaped ears and inspection of the actual planetary skin;
it does not yet deliver realistic coats or fully realistic bodies.

Today the genome already controls proportions, colours, plain/striped/spotted
patterns and inherited clade changes. Creature Lab exposes four individual
variants and adult/juvenile selection. Juveniles mostly use scaled adult
dimensions, and individual coat identity is not yet separately modelled.

## Ordered implementation tasks

| Order | Task | Deliverable and acceptance |
| --- | --- | --- |
| 1 | Anatomy and reference corpus | Establish side/front/three-quarter reference sheets for a browsing ungulate, a running quadruped, a low-bodied quadruped and a long-necked browser. Resolve feet, joint landmarks, skull, shoulder and pelvis for each family before adding more families. Neutral silhouettes must read as distinct animals at the same scale. |
| 2 | Coherent species variation | Replace independently varied dimensions with bounded, correlated anatomy profiles: body mass, limb proportions, head/neck proportions, stance and foot type. Reject self-intersections and unreachable foot placements. Each profile has documented parameter bounds and a fixed set of extreme examples. |
| 3 | Individual appearance | Derive stable coat markings, palette offsets, muzzle/ear proportions and small body-condition differences from individual identity. Keep species traits inherited. Produce four recognisably different individuals per species without changing their identity when the camera moves or quality changes. |
| 4 | Growth and dimorphism | Introduce family-specific juvenile proportions and an explicit growth curve; evaluate optional sex-linked size, mane or horn differences only for families designed to have them. Growth changes anatomy and movement together. Keep biological age distinct from the world reference date. |
| 5 | Skin, coat and face | Improve muzzle and joint surfaces; add restrained coat roughness, hair direction and finer markings. Evaluate proper eye surfaces, eyelids and nostril depth. Start with short coats; evaluate fur only after measuring its runtime cost. |
| 6 | Movement and behaviour | Fit stride, cadence and foot contact to each anatomy profile. Add production run transitions, breathing, head/ear motion and feeding/resting poses with deterministic individual timing. Pose changes must preserve facial attachment and avoid foot skating. |
| 7 | Habitat expression and runtime integration | Add bounded habitat/season effects to coat and behaviour with explicit inputs. Match distant silhouettes, colours and pose to the near animal. Measure six nearby animals, cache churn and transitions on desktop, then qualify Quest separately. |

Finish anatomy for one reference family to a convincing level before extending
that treatment across the remaining three. The next implementation slice is
task 1 plus the browsing family's profile and shoulder/muzzle/foot refinements
from task 2. More animal classes can follow once this quadruped pipeline works.

## Variation contract

- **Species identity:** body family, proportion envelope, foot type, coat family
  and allowed appendages. Traits are inherited through the existing ancestry.
- **Individual identity:** stable size/body-condition offsets, marking seed and
  small feature differences. Reuse the same identity in the lab and on a planet.
- **Life stage:** growth and development evaluated explicitly; switching stage
  preserves the individual's coat identity.
- **Dated state:** pose and activity are reproducible for the same animal,
  environment and time. Temporary state must not reroll permanent anatomy.
- **Rendering quality:** only detail changes with distance or device tier.
  Species, individual identity and world position remain consistent.

Extend and version the genome deliberately. Preserve existing IDs and old
genome evaluation; keep morphology, appearance and animation seed channels
separate so adding a cosmetic trait cannot reshuffle the world catalogue.

## Creature Lab review plan

Use the new **Planet skin** mode for production geometry. Species, Individual,
Growth, Whole animal/Head and face, Neutral material, Skeleton and Pose time
are available in this release. Proposed additions are a side-by-side comparison
with fixed scale/camera/light, trait locking and a saved specimen URL containing
seed, species, individual and stage. These additions are not yet implemented.

Retain a review corpus of **4 families × 3 species × 4 individuals × 2 stages =
96 specimens**. Capture body, face and neutral silhouette views, with walk/idle
pose samples and later run samples. Add boundary specimens separately. Compare
both within a species and between species; a palette change alone is not enough
to count as species diversity.

Acceptance requires visual review of anatomy and naturalness as well as
deterministic generation, bounded geometry/material/cache costs, deformation,
contact and disposal checks. Record frame time and memory before/after each
increment. The current six-rig/eight-geometry limits remain the starting budget;
any increase needs measurements and an explicit target-device budget.

References must retain their origin and usage rights. If external generation
becomes useful, create a validated asset brief and use `tools/assetctl` with
provenance and review artifacts. No model download or external asset generation
is required for the next procedural anatomy slice.
