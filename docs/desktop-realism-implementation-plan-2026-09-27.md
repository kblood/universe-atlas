# Desktop realism and procedural life: implementation plan

Date: 2026-09-27. Accepted direction; implementation started.
Baseline before this work: `27e89c897369270728e5ef4118dcc144e40af7fc`.

This is the current plan for planetary visual quality. It consolidates the
[proposal](desktop-realism-proposal-2026-09-27.md), the
[independent Opus 5.5 review](opus-5.5-desktop-realism-review-2026-09-27.md),
the [review assessment](desktop-realism-assessment-2026-09-27.md), and the
subsequent agreement on procedural trees and instance variation. Those review
records remain historical inputs. This document owns implementation order and
status; dated validation reports own measured results.

## 1. Product target

Desktop realism comes first. Aim for a believable landscape continuously from
orbit through atmospheric descent and low flight to walking. Forests, plants,
rocks and wildlife must exist during approach, with stable identities and
physical dimensions. Landing changes navigation/collision, not world content.
Clear weather must work; clouds cannot be the only way to conceal missing detail.

Quest will receive a separate measured quality profile. Proposed desktop target
is 1440p/60 FPS on a representative midrange gaming PC, with higher settings for
the development RTX 5090. Exact hardware floor and budgets remain open. No
current full-game measurements establish that target.

## 2. Content architecture

### Procedural species

Use the existing biosphere species/lineage identities and dated existence rules.
A species recipe defines trunk taper/curvature, branching rules, crown form,
leaf arrangement, density, bark and foliage palettes, and valid parameter
ranges. Physical allometry relates height, trunk thickness and crown width.
Animal recipes similarly conform to their existing genomes and body plans.

Recipes must describe coherent families. Variation within a species stays
recognizable; different species can have different structures. Habitat controls
distribution through moisture, slope, climate and substrate. Clustering, gaps,
undergrowth and size distribution contribute to realism alongside mesh quality.

Do not introduce a second independent species catalogue inside the renderer.
Current canonical forest candidates have identities and dimensions but are not
yet individually bound to complete dated plant species recipes. That binding is
an explicit future integration task, not something the current forest proves.

### Blender and assetctl

Blender authors detailed reusable components, templates and generation recipes:
trunks, branch structures, roots, foliage clusters, leaf shapes, bark and rock
surfaces, plus compatible animal rigs. Geometry Nodes can produce offline
variants. Exported geometry/material/animation data is usable at runtime;
Blender graphs are not automatically executable browser generators.

Use the repository assetctl boundary. Before expensive generation, validate an
asset brief specifying desktop target, metres, pivots, material/texture and LOD
budgets, visual criteria, provider, provenance and license. Preserve sources and
candidates; use `Assets/_assetctl/` for disposable review output. Export GLB with
matching LODs and appropriate compressed textures. Validate and package with
manifests. Model silhouettes, UVs and deformation quality remain acceptance gates.

### Bounded structural variants

Create/cache a bounded set of structural variants per resident species: different
branch arrangements, crown shapes and age/damage forms. Eight variants is an
initial experiment, not a fixed global budget. Cache keys include species,
recipe/asset version, variant and LOD. Evict by explicit memory budgets.

Assemble compatible modules or generate branch geometry in bounded worker jobs;
cache completed meshes for instancing. Avoid a separate scene object per branch.
Use one resident asset family in the first landscape before scaling to many
species. Structural changes require different cached geometry; recolouring does
not. Matching LODs preserve physical dimensions and crown silhouette.

### Per-instance variation

| Parameter | Representation | Constraint |
| --- | --- | --- |
| Position, yaw and physical size | Instance transform | Owned by canonical individual, camera independent |
| Bark and foliage tints | Separate instance colours with material masks | Shared material, species-constrained palette |
| Crown width, lean and bend | Controlled vertex deformation or compatible morphs | Correct normals, culling bounds, shadows and LOD |
| Bark/leaf surface variation | Atlas selection or texture coordinates | Shared compatible texture/material resources |
| Wind response | Shared field, individual stiffness/phase | Root anchored, bounded date-addressable phase |
| Seasonal appearance | Species/environment/date parameters | Respect lifecycle and signed BigInt time |

Colour/shape variation should not require a unique material for every tree.
Instancing reduces submissions, not vertex, fragment, overdraw or shadow costs.
Many topology variants and materials can still fragment batches. Measure the
tradeoff between diversity, cache size and rendering cost.

## 3. Identity, time and physical scale

- Preserve current seed/body/cell identities, positions, heights and yaw during
  the initial renderer work. A new placement distribution requires an explicit
  population version and compatibility decision.
- Derive species recipes from species identity; structural variant and
  individual parameters from stable individual identity. Camera, cache contents,
  task completion order and visit order must never choose these values.
- Distinguish identity versions (world/population/history) from appearance
  versions (assets/material/representation). Pixel baseline keys include both.
- A future growth/generation index must respect species birth/extinction and
  body lifecycle. Use bounded random-access queries for dates; do not simulate
  all preceding time. Handle negative dates with deliberate floor/modulo rules.
- Roots remain at canonical ground contact. Species dimensions constrain mesh
  scale, collision proxies, culling bounds and canopy summaries.
- Fix or explain existing history/version compatibility failures before adding
  new identity version axes. Renderer-only changes do not silently reseed worlds.

## 4. Continuous forest and terrain representations

| Scale | Intended representation |
| --- | --- |
| Near | Detailed branches, leaves, trunks, ground cover and contact shadows |
| Middle | Simpler meshes or relightable impostors preserving individual form |
| Far | Aggregate canopy preserving crown coverage, height and colour |
| Regional/orbital | Terrain/canopy appearance derived from the same ecological field |

Initially derive aggregate coverage from the existing population rules and
bounded regional summaries. Do not invent dense far forests that resolve into
sparse near trees. Avoid drawing both representations at full coverage during
handoff. Treat ground and canopy height separately; trees must not become solid
collision terrain. Evaluate parallax, lighting and silhouettes in clear weather.

Use projected size/error and hysteresis for LOD, with physical distance and
memory limits. Forward prefetch may prioritize work but cannot move the visible
dense forest area when the camera rotates. Resident regions use stable origins
and retained instance buffers. Change only dirty instance ranges. Later spatial
chunking must handle both view visibility and off-camera shadow casters.

Existing terrain already supplies adaptive tiles, horizon culling and local
surface detail. Improve rock/soil/wetness material response and metre-scale
features without adding an unversioned terrain height field. GPU grass patches
are a candidate for dense cover; occupancy remains consistent with the world
query and tile height data.

## 5. Lighting, atmosphere, clouds and frame budget

Establish a common sun/sky, aerial perspective and exposure contract across
terrain, trees, fauna, water and clouds. Terrain already uses PBR; current tree
and animal materials are simpler. Evaluate foliage transmission and coherent
roughness/normal detail under the common lighting baseline.

Audit the RGBA16F cloud scene capture, which currently has no requested MSAA.
Compare bounded MSAA/depth-resolve and post-AA approaches before choosing leaf
coverage techniques. Any shader deformation must be reflected in shadow/depth
passes. Logarithmic depth is enabled; measure its cost before changing depth
architecture. Keep current full-resolution desktop clouds as the baseline while
investigating the earlier reduced-resolution checker artifact.

Start with one bounded local sun-shadow region, then evaluate cascades and far
terrain shadow approximations. A shared atmosphere LUT implementation is a
candidate follow-on, not a prerequisite for all useful improvements. Stay on
WebGL2 until a measured bottleneck warrants an independently scoped migration.

Measure full-game CPU, GPU, uploads, draws, triangles, JS heap and estimated GPU
memory. Track distributions and cold/warm streaming separately. Reserve costs
for terrain, vegetation, fauna, water, shadows, clouds, UI and headroom. Existing
416 MiB accounting is incomplete driver/browser accounting, not a certified
desktop asset budget. Expand budgets deliberately with measurements.

## 6. Animal realism

Start with one continuous, rigged body plan compatible with existing genome
proportions, then expand. Bind bone lengths/morphs to the genome; authored rigs
must support realistic deformation. Keep exact-date movement and individual IDs.
Investigate deterministic paths with bounded segment/corridor obstacle checks,
stable interval boundaries and fallbacks. Foot contact requires reach limits,
ground normals and stance timing, not merely body-height adjustment.

Profile conventional skinning before adopting instanced bone palettes or baked
vertex animation. Keep the current 128-animal budget until evidence supports
more. Structural diversity must not come from disconnected anatomy.

## 7. Implementation sequence and status

| Stage | Deliverables | Status |
| --- | --- | --- |
| A. Record direction | This plan, related MD links/status, guide explanations | Written; guide updated by Luna 6 |
| B. Forest foundation | Observer-centred density, retained origins and dirty uploads, upload diagnostics | Implemented; build, 53 targeted checks and RTX 5090 browser acceptance pass; see validation record |
| C. Pipeline baseline | Fixed valley/routes, complete-game timings, AA/depth decisions, consistent lighting and bounded shadows | Profiling and shared aerial perspective implemented; optional scene AA experiment reviewed; final lighting/AA/shadows pending |
| D. Procedural asset contract | Existing species binding, physical envelopes, variant cache, asset brief, bark/leaf masks and instance parameters | Species recipe/variant/key contract tested; first Blender brief validates; forest integration, authored assets and resource cache pending |
| E. Continuous canopy | Spatial batches, shared population summaries, matching near/mid/far/orbital appearance | Planned |
| F. Realistic landscape | One authored tree family, rocks, ground textures, grass/shrubs and shared wind | Planned |
| G. Realistic fauna | One compatible rig, deterministic paths and grounded animation | Planned |
| H. Breadth | More biomes/species and separately measured Quest profile | Planned |

Stages have dependencies. Beginning this programme does not mean replacing all
subsystems at once. The first code increment targets B so detailed assets have
a more stable population renderer underneath them. It does not claim a realistic
forest, a completed asset generator or a complete performance solution.

### First source increment — 2026-09-28

`planet-renderer.ts` no longer offsets visible forest density with camera heading.
`planet-forest.ts` retains its origin until 256 m movement, caches instance slot
identity/origin version, and submits dirty matrix/colour/coverage ranges only.
Worker selections have request IDs to reject stale water-context results.
Upload/write counters and forest-update CPU timing are exposed in diagnostics.
The [population implementation record](population-continuity-implementation-2026-09-27.md)
documents scope and limitations. This is a retained-buffer foundation; complete
spatial chunks, revised LOD/canopy and species-bound assets remain future stages.

### Measurement increment — 2026-09-28

[Desktop render profiling](desktop-render-profiling.md) adds bounded, optional
CPU frame/planet timings and asynchronous GPU capture/cloud/resolve measurements.
It reports complete-frame pass sums separately from frame intervals. Nine
mocked-API unit cases pass; browser measurements remain a separate acceptance
step. It does not yet split the forward scene into individual subsystem GPU
timings or implement the lighting/shadow/AA changes in stage C.

### Review corrections — 2026-09-28

Opus 5.5 [reviewed checkpoint eaf8414](opus-5.5-forest-implementation-review-2026-09-28.md)
and identified compacted-slot rewrites and water-triggered selection backlog.
The next source increment introduces stable per-batch ID slots with swap-removal,
up to eight coalesced dirty ranges, preallocated colours, water-only habitat
refresh, and a bounded worker restart. Six source unit cases cover these repairs.
Luna 6 is independently checking the browser fixtures and preparing committed
stage deployment. Remaining review suggestions (packed selection transfer,
shader-based fades, larger precision-derived rebases and canopy handoff
hysteresis) remain follow-on work; none is silently declared complete.

## 8. Acceptance for later verification

### Rendering and asset-contract increments — 2026-09-28

- [Shared aerial perspective and AA experiment](desktop-rendering-stage-c-2026-09-28.md)
  aligns solid local life with terrain's approximation. Opus 5.5's review led
  to reducing AA samples before sacrificing scene resolution. This is not yet
  a full physically based lighting or final antialiasing pipeline.
- [Retained flora decisions](flora-recipe-cache-2026-09-28.md) remove repeated
  habitat/hash work from the per-frame plant path while preserving a 960-result
  previous-implementation digest. Luna's hardware comparison shows lower CPU
  cost in the tested fixture; see the validation record for limits.
- [Tree species/asset contract](tree-species-asset-contract-2026-09-28.md)
  consumes existing species and exposes bounded variants, allometry, separate
  bark/leaf appearance and versioned geometry keys. The first tree-family
  asset brief validates, but the renderer still uses primitive tree geometry.

These are staged commits in the implementation branch. Luna's
[rendering acceptance](desktop-rendering-validation-2026-09-28.md) passes on
the RTX 5090, including full-resolution AA fallback, 19 material hooks, warmed
flora cache and fauna replay. Publication must identify the integrated revision.

### Foundation acceptance — 2026-09-28

Luna 6 validated `26b41f5` on RTX 5090 / Ryzen 9 9950X with stationary
forest uploads, camera rotation, fauna motion/identity, exact-date replay and
touchdown checks. The [validation record](desktop-realism-validation-2026-09-28.md)
includes hardware, source checks, captures and measured limits. The warmed
fixture is CPU limited (planet update p95 about 20 ms); flora work is the next
measured optimization target. This does not establish sustained 60 FPS or
realistic artwork. Later acceptance below remains outstanding.

Use one dated in-game valley with forest edge, exposed terrain, water boundary
and wildlife. Fix camera poses at ground height, low flight, 300 m, 3 km, 15 km
and orbit. Include midday, grazing sun, overcast and clear skies, descent/ascent,
fast traversal, stationary camera rotation and replay after cache eviction.

- Individual identities, dimensions and placement survive approach and A→B→A.
- Turning in place does not move the full-density forest footprint.
- A warmed stationary view does not repeatedly upload unchanged tree matrices
  or colours. Movement within a retained origin updates only genuinely changed
  slots/coverage; rebases preserve apparent positions.
- Species colour/shape limits remain coherent across individuals and LODs.
- Aggregate canopy approaches the same near coverage and silhouette, without
  terrain displacement, duplicate darkening or disappearing stands.
- Shadows, wind, depth, normals and bounds agree with visible geometry.
- Report CPU/GPU percentiles, hitches, transfers and memory on selected hardware;
  do not infer performance from instance counts or the 5090 cloud lab alone.
- Treat pixel equality as a same-build/device, settled-state diagnostic;
  world identity/state determinism is a separate stronger architectural contract.
- Asset briefs, source/provenance, technical/visual review, LOD and target-runtime
  acceptance must pass before assets are described as production ready.

Testing and deployment are separate recorded actions; source changes alone do
not establish these acceptance criteria. Commit the reviewed source before any
future publication, and record the deployed revision and validation outcome.

## 9. Reference techniques and boundaries

Hello Games describes artist-directed procedural content in its
[art presentation](https://www.gdcvault.com/play/1021805/Art-Direction-Bootcamp-How-I)
and [art overview](https://www.nomanssky.com/2016/04/art-of-no-mans-sky/).
Its [Worlds Part I notes](https://www.nomanssky.com/worlds-part-I-update/)
describe a GPU-based planetary object renderer and improvements to mesh/LOD and
texture systems. These are reference directions; Atlas's proposed hierarchy
above is our design, not a claim to reproduce NMS's unpublished current internals.

[Three.js instancing](https://threejs.org/docs/pages/InstancedMesh.html) provides
shared meshes with individual transforms/colours. Custom shape/colour masks need
our shader and data contract. [Cascaded shadows](https://threejs.org/docs/pages/CSM.html)
and [Bruneton's atmosphere reference](https://ebruneton.github.io/precomputed_atmospheric_scattering/)
are candidate techniques, not validated Atlas dependencies.
