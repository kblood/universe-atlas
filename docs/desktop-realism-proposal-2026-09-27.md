# Desktop realism: proposal for independent review

Date: 2026-09-27. Baseline: `27e89c897369270728e5ef4118dcc144e40af7fc`.
Status: brainstorming proposal, not an implementation commitment.

## Direction accepted by the user

Desktop realism is the first target. Establish believable landscapes from orbit,
through atmospheric flight, to walking among plants and animals. Quest will
receive a separately measured reduced profile later. Its budgets should not
set the desktop visual ceiling. Preserve seamless free flight, physical scale,
stable population identities and arbitrary deterministic time travel.

The user asked for Opus 5.5 to critique this plan and offer its own approach.
The independent response and our assessment should remain separate records.

## What exists today

- Adaptive cube-sphere terrain, horizon/frustum culling, worker generation,
  bounded caches and protected contact terrain. Regional flight uses metres
  below 20 km and exits at 40 km; origins are rebased before local GPU uploads.
- Forest uses three instanced batches. Trees are geometric trunks/crowns with
  Lambert shading. Dense forest fades around 520–650 m; far trees are a stable
  6.5% subset of the same canonical population. Actual tree drawing ends at
  4 km, though preparation covers 4.5 km. All forest fades at 3–3.5 km altitude.
- Ground plants use four kinds and three LOD buckets, with a 120 m cutoff.
- Fauna has four primitive instanced batches and at most 128 drawn animals,
  within 600 m. Spheres, cones, cylinders and boxes form their anatomy. Motion
  uses deterministic bounded paths and height stencils; no foot IK or obstacle
  avoidance. Trees and animals lack realistic surface textures and configured
  cast shadows in these runtime paths.
- Instancing reduces draw submissions. Forest matrices/attributes and fauna
  part transforms still have substantial per-frame CPU work. It does not
  eliminate vertex work, leaf overdraw, shadow cost or texture bandwidth.
- Clouds use bounded volume integration, self-shadow approximations and memory
  limits. Desktop uses full-resolution integration because controlled tests
  isolated checker artifacts in the lower-resolution path. There is no temporal
  history. Existing atmosphere/sky is not a complete physical lighting model.
- Current desktop accounted terrain/life/water plus cloud cap is 416 MiB; this
  is not exhaustive browser/driver memory accounting.

See the attached implementation source and
[validation report](planet-rendering-validation-2026-09-27.md). Cloud timings on
the RTX 5090 measure the cloud lab, not the complete game. Inline-worker terrain
stress checks had p95 updates of 28–74 ms. We have not established steady 60 FPS
on a representative desktop. Existing acceptance proves continuity on selected
fixtures, not photorealism or universal habitat quality.

## Proposed rendering and content approach

### 1. Build one representative landscape in the actual game

Choose a deterministic forest-edge valley containing slopes, exposed rock,
soil, a water boundary, grass/shrubs and an animal. Develop one tree family and
one coherent animal body plan first. Use fixed seeds, exact dates, camera poses,
sun elevations and travel routes for repeatable comparison. Include midday,
grazing light, clear sky and overcast views; realism must survive ordinary play.

Start with shared sun/sky lighting, exposure, material response and shadows,
alongside one good asset family. Establish physical dimensions and terrain
material scale. Macro geology and forest distribution must read correctly
before fine textures can carry the scene. Add slope/height/wetness-driven
rock/soil/vegetation blending and local normal/roughness detail. Avoid inventing
new mountain geography without explicit generator versioning.

### 2. Blender supplies reusable assets and recipes

Author tree trunks, branch structures, leaf clusters, rocks, shrubs and a rigged
animal in Blender. Export meshes, PBR texture sets, rig/animation data and
matching LODs through GLB and the assetctl contract. Bake normals and surface
detail; keep metres, explicit pivots and stable names. Geometry Nodes recipes
can produce offline variants; Blender graphs are not automatically browser
programs. Preserve source files, briefs, seeds, licenses and manifests.

Atlas selects a bounded set of compatible species variants and instance
parameters from stable identities. Cache completed species/variant meshes and
instance them; avoid building separate draw objects for every branch. Separate
world-generator, asset-library and visual-representation versions. Specify the
time-dependent phenotype/age mapping explicitly so arbitrary date seeking is
independent of cache and visit order. Species diversity should respect anatomy
and topology; arbitrary disconnected body-part combinations are insufficient.

### 3. Keep forest extent and appearance across scale

Use the same canonical ecological field for all representations:

| View | Proposed representation |
| --- | --- |
| Near | Detailed trunks, branches, foliage, contact shadows and ground cover |
| Middle | Simpler meshes preserving tree silhouette, size and location |
| Far | Cluster impostors or another aggregate canopy representation |
| Regional/orbital | Canopy coverage, colour and roughness derived from the same field |

Preserve canopy outline, density, height and lighting across transitions instead
of merely removing trees. Use projected size/error with hysteresis, bounded
memory, worker scheduling and prefetch based on travel direction/speed. Physical
distance remains a resource limit, not the sole visual criterion. Evaluate
impostor relighting, parallax, alpha overdraw and shadow continuity before
committing to an implementation. Clouds may conceal some transitions but clear
weather must remain convincing. No promise of individually drawing every tree
to the horizon.

### 4. Spend GPU and CPU work where it matters

Keep instancing but partition spatially, retain static instance buffers, update
dirty ranges and move repeatable wind/animation work to shaders where justified.
Use bounded visibility/LOD selection, texture compression, material atlases where
appropriate and explicit upload budgets. Investigate terrain occlusion only
after profiling its likely return. Avoid unbounded per-frame population scans.

Begin with a few properly rigged animals; evaluate ordinary skinning versus
instanced bone palettes or baked animation only when the measured population
requires it. Preserve deterministic date-addressable animation and positions;
obstacle-aware paths and foot contact need a bounded random-access design,
not a simulation that must run from the beginning of time.

Assess whether current Three.js/WebGL2 can deliver the first landscape. Consider
WebGPU after a specific measured limitation establishes a benefit. A renderer
migration is a separate decision, including depth, cloud and material migration.

## Proposed milestones and acceptance (not yet measured)

1. Capture current full-game CPU/GPU/upload/memory costs and visual references.
   Select an explicit desktop hardware floor. Proposed initial goal: 1440p at
   60 FPS on a representative midrange desktop, with 1080p and 4K profiles;
   hardware and quality settings remain to be decided. The 5090 is development
   hardware, not sufficient evidence of broad desktop performance.
2. Establish one landscape's lighting/material/shadow baseline and one validated
   tree family. Set screen-space detail and surface texel-density targets from
   reference views. Measure shadow, foliage and cloud costs together.
3. Implement continuous canopy representations and stable spatial instance
   batches. Evaluate walking, fast low flight, ascent and descent in clear sky.
4. Add a coherent animated animal with ground contact, then profile population
   scaling. Broaden species/biomes only after this scene is convincing.

For each milestone, acceptance should cover visual evidence and frame-time
distributions (CPU/GPU p50/p95/p99, streaming hitches, uploads, draw/triangle
counts, estimated GPU memory, JS heap and asset transfer size). Separate cold
entry from warmed traversal. Compare paused A→B→A, reversed routes, cache
eviction and different worker schedules for identity and replay stability.
LOD error thresholds and hitch limits need numerical definitions before
implementation; do not claim performance from draw counts alone.

## Questions for Opus 5.5

Give your own recommended architecture and priorities, including disagreements.
Do not merely endorse this proposal. Which three changes buy the most realism?
What is missing from lighting, terrain, vegetation, animals and atmosphere?
Is the order right? Should one animal be delayed or used early as a scale cue?
Can WebGL2 support the first target or is there a concrete reason to migrate?
How should forest coverage remain consistent without a planet-sized asset set?
What physical-scale, random-access time and asset-version contracts are missing?
Propose practical performance/visual acceptance gates, identifying assumptions.
Identify work to defer. Distinguish code observations, engineering judgments and
unverified technical claims. Do not claim to have run tests or seen screenshots.
