# Desktop realism and procedural life: implementation plan

Date: 2026-09-27. Accepted direction; implementation started.

Published release `580936f` includes the canopy runtime through `98556a7`: complete canonical
patches and individual ownership, 5,500 m altitude prefetch, 3,500 m altitude
rendering, water-aware patch reuse, and retained terrain refresh during date
changes. The [integration record](canopy-runtime-integration-2026-09-28.md)
links the immutable RTX 5090 date-seek and flight/walking evidence; the
[deployment receipt](deployment-580936f-2026-09-28.md) records the live build
and byte audit. This does not complete realistic species assets or establish
midrange performance.
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
The local detailed renderer now binds canonical forest individuals to dated
species recipes. Physical allometry and bounded structural variants remain
unfinished; the initial asset adapter preserves canonical population heights.

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
| D. Procedural asset contract | Existing species binding, physical envelopes, variant cache, asset brief, bark/leaf masks and instance parameters | Species recipe/variant/key contract tested; a development-only family loader binds supported branching species into detailed forest batches. Focused CPU/loader suite: 58 pass, 0 skips; one RTX 5090 game fixture passed date-replay and 316.87 m movement checks with no browser or GL errors. Opus follow-up confirms aerial composition and slot lifecycle. Asset acceptance, per-species dimensions, structural variants, resource cache, visual acceptance and performance claims remain open |
| E. Continuous canopy | Spatial batches, shared population summaries, matching near/mid/far/orbital appearance | Published release `580936f` includes canopy runtime through `98556a7`: complete census patches, near/far ownership, altitude prefetch/render thresholds, bounded uploads, water-aware patch reuse, and retained terrain refresh on date changes. RTX 5090 date-seek and flight/walk acceptance are linked in the [integration record](canopy-runtime-integration-2026-09-28.md), with the [live deployment receipt](deployment-580936f-2026-09-28.md). Legacy faceted tree shapes remain; authored realism, midrange performance validation, XR and broader visual signoff are open. The earlier deployed `e8a848d` used sparse distant representatives |
| F. Realistic landscape | One authored tree family, rocks, ground textures, grass/shrubs and shared wind | V7 applies the versioned linear-RGB-to-sRGB byte conversion and passes export/repeat and browser checks; back-lit foliage remains dark. A separate v2 capture lab passes repeat/mip/CPU audits for a 16 m tree, but the 22 m / 32-pixel capture has no leaf classification and arbitrary-view silhouette error remains high. A development-only local path attaches a supplied family to supported branching species in detailed near/middle batches. Its 58 focused CPU/loader checks pass; one RTX 5090 game fixture passed date-replay and movement checks, and Opus follow-up confirmed aerial composition and slot lifecycle. Detailed candidate crowns look thinner than the faceted legacy trees; no visual acceptance or general performance result is claimed. The published default and far canopy remain legacy. See the [browser prototype](tree-browser-prototype-2026-09-28.md), [v7 record](tree-authoring-v7-2026-09-28.md), [colour calibration](tree-color-calibration-2026-09-28.md), [capture record](authored-tree-capture-2026-09-28.md) and [local forest integration record](tree-forest-integration-2026-09-28.md). LOD2, per-species dimensions, structural variants, packaging, midrange/XR profiling and other landscape assets remain open. |
| G. Realistic fauna | One compatible rig, deterministic paths and grounded animation | Planned |
| H. Breadth | More biomes/species and separately measured Quest profile | Planned |

Historical checkpoint: [v5 authoring](tree-authoring-v5-2026-09-28.md) exports a 14,012-triangle tree and a 4,380-triangle LOD1 with identical foliage. The [Opus follow-up](tree-authoring-v5-review-assessment-2026-09-28.md) records bark wrapping, secondary support and wind issues from that version.

Stage F has a v7 colour-encoding increment and a browser lab. V7 preserves v6
geometry, alpha and normal data while converting the declared linear RGB recipe
to sRGB bytes. Export, repeat and browser checks pass; the colour reads greener,
but the back-lit canopy remains dark. This is not visual acceptance. The
published default still uses legacy faceted shapes. A separate opt-in
development path now loads a supplied family for supported branching species
in detailed near/middle slots. Its RTX 5090 fixture checks date replay and
316.87 m movement; the family aerial hook attached to all 24 meshes in that
fixture. The follow-up review confirms shader composition and slot lifecycle,
but flags shader warm-up, mixed-batch vertex work, upload diagnostics, asset
error containment, update-to-render clear/swap behavior and off-camera
shadows for further checking. The detailed candidate crowns look thinner than
the legacy shapes, so these results are not visual acceptance or a performance
claim. The far canopy still uses the legacy shape, and LOD2, per-species
dimensions, variants, packaging and midrange profiling remain open.
See the [v7 validation](tree-authoring-v7-2026-09-28.md),
[browser prototype](tree-browser-prototype-2026-09-28.md) and
[next-increment proposal](tree-authoring-next-increment-2026-09-28.md). A
separate [distance-proxy design](authored-tree-distance-design-2026-09-28.md)
documents view selection and capture bases. The distance stage now has a GPU
capture baker and one-tree browser preview; planetary integration remains open.
Its [21 passing CPU checks](../test-results/tree-impostor-capture-v2/combined-cpu-test.log)
cover capture reduction, view math, physical transforms and a separate GPU-packing
helper. The [capture experiment](authored-tree-capture-2026-09-28.md)
passes the 16 m technical audit on one adapter, while the 22 m low-resolution
leaf-class result fails. Browser checks confirm exact-axis matching but retain
a substantial intermediate-view silhouette mismatch. Opus source and
reconstruction reviews are archived with hashes; remaining rendering
suggestions are not implemented wholesale. No capture asset is accepted or
bound to a species.

The [existing-implementation comparison](tree-existing-methods-2026-09-28.md)
led to a pinned EZ-Tree oak geometry run and a local browser fixture. The
[current comparison record](tree-ez-reference-2026-09-28.md) documents the
seeded 16 m source, wood-reduced control, upstream LODs, leaf-card and normal
differences and final browser comparison. In this one RTX 5090 fixture, the
192-tree timer-query p50/p95 is 0.5828/0.6045 ms for EZ-Tree and
0.7244/0.8129 ms for Atlas, with different geometry and submitted triangle
counts; this is not a general performance claim. The visual result favors
EZ-Tree's branching as the next source candidate, but card/material quality,
normal correction, wind/pivot data, LOD budgets, packaging and runtime
acceptance remain open. The [Opus source review](opus-5.5-tree-reference-review-2026-09-28.md)
records applied adapter and manifest fixes but is not a visual acceptance.
Nothing from the experiment has been adopted into the game. The subsequent
[Three.ez impostor comparison](tree-three-ez-impostor-2026-09-28.md) uses the
same Atlas-material GLB, preserves an unmodified baseline, and tests an isolated
colour-include repair. Native distant coverage and hemisphere limitations must
be resolved before choosing a game representation. Its
[Opus review assessment](opus-three-ez-impostor-review-2026-09-28.md) separates
library defects, fixture corrections and unimplemented calibration checks.

The [EZ-Tree family adapter candidate F](tree-ez-family-2026-09-28.md) now
emits a local two-LOD GLB pair with Atlas materials, physical cards, attachment
pivots and wind data. Its LOD0 contains 13,806 triangles and LOD1 4,866; a
mid-twig tangent sign was corrected from E without changing geometry or images.
Independent export and loader checks pass; the fixed RTX 5090 browser fixture
replays leaf wind pixel-exactly when returning to the same date. The linked
record includes isolated GPU measurements and visibly unresolved canopy and
back-lighting issues.
GLB validation is not canopy or LOD acceptance, and its runtime browser lab
does not change the deployed default. A separate local integration path now
accepts supplied families for supported species in the detailed near/middle
batches; it is not enabled by the deployed default. Live checkpoint `cc25635`
still draws the legacy tree shapes. No asset from this adapter has been
accepted as a game species. See the [local forest integration record](tree-forest-integration-2026-09-28.md).

The [instance streaming stage](tree-instance-streaming-2026-09-28.md) shares
the forest's bounded update-range helper with the detailed adapter, skips
unchanged Float32 transforms/height/phase, and supports separate bark and leaf
tints without per-tree materials. Owned instance buffers clear consumed ranges
after their initial GPU upload as well as later updates. The [local forest
integration record](tree-forest-integration-2026-09-28.md) describes the new
development-only binding path, its passing CPU/loader checks, and remaining
far-silhouette, shadow and mixed-batch cost checks.

The [leaf diffuse-transmission note](leaf-diffuse-transmission-2026-09-28.md)
records an opt-in shader prototype. Its independent Opus review and 13 focused
CPU/GLB checks pass; synthetic calibration and corrected family-F tree browser
fixtures have also completed. The factor remains off by default and is not
wired to the planetary game or a complete Khronos extension implementation.

Before accepting the new textured tree at distance, address its measured
minification loss. In three converged-reference views, the current alpha-masked
mesh retains about 13% of reference coverage at a 32 px output; the existing
impostor retains about 103%. The [foliage filtering comparison](tree-foliage-minification-2026-09-28.md)
prioritizes existing Three.js material options and established coverage-preserving
mip generation. Those findings apply to the experimental tree family, not a
replacement already deployed in the game.

A separate [MASK/HASH temporal browser check](../test-results/tree-foliage-temporal/README.md)
verified fixed-camera date replay and foliage coverage propagation to
depth/distance materials for both LODs. The four 192-tree profiles are
descriptive lab measurements, not a broad performance comparison. A corrected
[isolated coverage probe](../test-results/tree-foliage-temporal/isolated-final/README.md)
shows HASH closer to its downsampled reference at 16/32/64 pixels, with greater
coverage variation under small yaw turns and a moving wind date. The 512/1024
references are not proven ground truth, and TAA is absent. The earlier
zero-footprint and MASK/HASH load-race probes remain identified as failures.
This does not resolve static minification or establish perceptual acceptance.

Stages have dependencies. Beginning this programme does not mean replacing all
subsystems at once. The first code increment targets B so detailed assets have
a more stable population renderer underneath them. It does not claim a realistic
forest, a completed asset generator or a complete performance solution.

### First source increment — 2026-09-28

`planet-renderer.ts` no longer offsets visible forest density with camera heading.
`planet-forest.ts` retains its origin until 256 m movement, caches instance slot
identity/origin version, and submits dirty matrix/colour/coverage ranges only.
Worker selections use request IDs to reject stale or terminated-worker replies.
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
The follow-up increment implemented stable per-batch ID slots with swap-removal,
up to eight coalesced dirty ranges, preallocated colours, water-only habitat
refresh, and a bounded worker restart. Six source unit cases cover these repairs.
Packed selection transfer is implemented at checkpoint `a0dd78a`; its Node
benchmark and protocol checks are recorded below. Opus 5.5 reviewed the receiver
and found no merge blockers; two recommended fixes were applied in `23de0b9`.
The final receiver passes the production build, 75 focused tests and the
110.74 m movement/rendering browser fixture. In a sequential production-preview
comparison, frame interval p50/p95 was 16.8/20.8 ms on this build and
17.6/24.3 ms on the `66c7728` baseline, with zero browser errors in both runs.
This is one fixture and one run: it shows no regression signal, not a general
speedup or a 60 FPS guarantee. The [validation record](../test-results/forest-transfer-23de0b9/README.md)
contains the evidence. The previous deployed release at that checkpoint was
`e8a848d`, with a clean build stamp; its live movement/rendering checks and all
60 unique guide targets passed. The [historical deployment record](../test-results/deploy-e8a848d/live-deployment.json) preserves the evidence. See
the [transfer review](opus-5.5-transfer-review-2026-09-28.md) and its
assessment in the [transfer record](forest-selection-transfer-2026-09-28.md).
Shader-based fades, larger precision-derived rebases and canopy handoff
hysteresis remain follow-on work; none is silently declared complete.

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

### Canopy preparation — 2026-09-28

The [new Opus 5.5 review](opus-5.5-canopy-review-2026-09-28.md) identifies the
missing far crown coverage and recommends bounded canonical patches, shared
habitat/dimensions, readiness-gated handoff and measured worker/cache budgets.
The [first canopy foundation](canopy-foundation-2026-09-28.md) implements
addressable patches and extracts the current habitat rule without changing
the placement digest. The distant rendered population remains a sparse sample.
The [second tree proposal](tree-asset-candidate-2026-09-28.md) documents an
earlier candidate. The newer v3 smoke has a less regular branch layout and
original cutout sprays, but visual review still finds the crown sparse and the
foliage pale; it remains outside the game. See the [v3 review record](tree-authoring-v3-2026-09-28.md).

Release `6f7cb21` publishes the reviewed forest selection cache and updated
guide. Luna 6's deployed RTX 5090 movement and rendering checks pass; the
[cache record](forest-selection-cache-2026-09-28.md) links source, CPU and
browser evidence. This completes the selection-cache increment, not stage E
or the overall realism plan. Continuous canopy, production landscape assets,
lighting/shadows and realistic rigged fauna remain active work.

### Census worker and full-radius cost — 2026-09-28

The census implementation at `8c5ff7f` adds bounded, cancellable patch work,
content-stamped contexts and bounded completed-result caching. Five focused
tests passed; the actual Vite module Worker matched Node results for a 16-patch
fixture, exercised batching, cache hits, cancellation, invalid requests and
stale-context recovery, and reported no browser/page errors. The full suite
had 448 passes and four unrelated existing failures: seek saturation,
version-compatibility expectations, cosmology version expectations and time
horizon gating. These checks validate the worker protocol, not a rendered
canopy or full-radius integration. See the [implementation check](../test-results/forest-canopy-census-8c5ff7f/README.md), the [census design](canopy-census-design-2026-09-28.md) and the [Opus design review](opus-5.5-census-design-review-2026-09-28.md).

A separate Luna 6 cost probe used a real near-ground Maithea forest fixture
and the shared habitat query. At 4.5 km, 6,537 full 8×8 patches sampled
200,865 candidates and contained all 196,306 production-selected cells in the
exact-radius reference, with zero missing and 149,478 trees present. Patch
coverage extended to 4,625.4 m, including 4,559 candidates beyond the circle.
Habitat evaluation took 636.2 ms cumulatively; patch enumeration/data
construction took 1,071.1 ms, hydrology setup 244.8 ms, and the full Worker
roundtrip 2,159.4 ms including module startup. This was one CPU-side browser
probe with no renderer or WebGL scene; it is a workload measurement, not a
frame/GPU result or proof of an interactive 4.5 km census. See the [cost
probe](../test-results/forest-canopy-census-481e693/README.md). At the earlier
`e8a848d` deployment checkpoint, the worker and probe were not in the live
release; the canopy runtime is now included through `98556a7`. The standalone
exact-individual proxy lab remains separate from the faceted runtime proxies.

### Exact-individual proxy experiment — 2026-09-28

An isolated 64-view silhouette comparison measured an analytic, faceted proxy
against the current point-tree shape. Silhouette area mean error was about
0.0024% and maximum error 0.0098%; perspective bounds and opaque depth were
checked at 24, 64, 650 and 4,000 m. An antialiasing edge-coverage prototype was
also checked. These tests validate the proxy shape and depth in the lab, not a
near/far game handoff. See [silhouette report](../test-results/forest-impostor/report.json).

A second RTX 5090 lab compared 149,479 jittered-root proxy trees across 6,684
conservative patches at 1440×900 and 120 m / 1,200 m camera heights. Its
full-mesh reference rendered 14.38 million triangles including terrain; the
proxy path rendered 331,726. GPU p50 was 2.51 ms reference versus 2.57 ms
proxy at 120 m, and 3.52 ms versus 2.59 ms at 1,200 m. This is an isolated
forest/terrain comparison, not a whole-game performance claim. The proxy uses
the existing faceted procedural tree shape; it is not an authored realistic
tree asset. The lab counts jittered roots, so its 149,479 trees differ by one
from the census probe's 149,478 cell-centre count. See the [field report](../test-results/forest-impostor-field/report.json).

These specific lab measurements are not game-performance results. The faceted
proxy representation was subsequently integrated at `213ca95`, with the
runtime now included through `98556a7`; the earlier `e8a848d` deployment had
the sparse representation. Realistic authored trees, binding individual forest
cells to dated species, wind and shadows remain to be implemented and validated. The separate [census
implementation review](opus-5.5-census-implementation-review-2026-09-28.md)
records six passing tests and a browser-worker protocol pass; neither that
review nor the proxy lab constitutes game acceptance. Follow-up protocol fixes received an Opus implementation review; six focused tests and the browser-worker protocol report pass, with no renderer or visual acceptance. See the [protocol report](../test-results/forest-census-protocol-review/report.json) and [implementation review](opus-5.5-census-implementation-review-2026-09-28.md).

### Packed selection transfer — 2026-09-28

Checkpoint `a0dd78a` sends population-selection results in a bounded,
transferable binary buffer instead of structured-cloning one JavaScript object
per cell. Twelve Float64 values preserve each cell's canonical numeric address,
direction, roll, height, yaw, query distance and representative flag. Order and
canonical doubles remain unchanged. Validation checks protocol version, length,
addresses and finite values. Malformed/failed worker replies recover through
one restart and the existing synchronous selector; existing residents remain
visible during recovery. Main-thread objects are still reconstructed, so this
is not zero-allocation and adds no canopy or asset rendering.

The [Node worker benchmark](forest-selection-transfer-2026-09-28.md) compares
18,019-cell responses and verifies exact JSON equality. Object cloning measured
23.33/32.70 ms p50/p95 round trip; packed transfer including encode/decode
measured 13.79/19.42 ms. Selection itself is excluded. These are Node
worker-thread measurements on the development machine, not browser frame or
GPU improvement claims. The final receiver at `23de0b9` passes its production
build, 75 focused tests and 110.74 m browser movement/rendering fixture. One
sequential production-preview comparison reports 16.8/20.8 ms frame interval
p50/p95 versus 17.6/24.3 ms on `66c7728`, with zero browser errors in either
run. This single run shows no regression signal and does not establish a
general speedup or 60 FPS. See the
[validation record](../test-results/forest-transfer-23de0b9/README.md), the
completed [Opus review](opus-5.5-transfer-review-2026-09-28.md), and its
assessment in the [transfer record](forest-selection-transfer-2026-09-28.md).
At the 2026-09-28 checkpoint, deployed release `e8a848d` had a clean build
stamp; Luna’s live movement/rendering checks and all 60 unique guide targets
passed. See the [historical deployment record](../test-results/deploy-e8a848d/live-deployment.json).

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

## 10. Direction after the current-state review — 2026-09-28

The user-requested [Opus 5.5 review](opus-5.5-desktop-state-review-2026-09-28.md)
recommends prioritizing one coherent, lit forest area reached through ordinary
game controls. The [assessment and acceptance criteria](desktop-state-review-assessment-2026-09-28.md)
retain the full objective and order the next work: resolve the live navigation
check; establish vegetation lighting and bounded shadows; combine existing
branching/conifer assets and foliage mip correction; match the distant canopy;
then enable the accepted result through normal desktop loading/settings.
Separate AA experiments and additional standalone tree labs are deferred.
The local detailed-tree integration is committed; it is not the live default
or proof that the broader realism goal is complete.

### Progress — 2026-09-28, surface lighting

Luna's deployed desktop navigation and publication checks now pass for `8e16776`;
the [receipt](../test-results/tree-forest-live/live-publication-receipt.json)
preserves the scope and earlier failures. Shared sky fill and a metre-scaled
local sun shadow region are implemented behind the normal surface-lighting
setting. [Implementation and validation status](surface-lighting-2026-09-28.md):
69 focused CPU tests and the production build pass; initial actual-game lighting
and timing captures are recorded in the implementation document. The complete
forest-area acceptance remains open.

### Updated Opus progress review — 2026-09-28

The [updated independent review](opus-5.5-surface-progress-review-2026-09-28.md)
inspected the current source and new actual-game captures. Its
[assessment](surface-progress-review-assessment-2026-09-28.md) prioritizes compact
family instance pools, completing the Pine family, matching the far canopy,
correcting mip/loading issues, and reducing far candidate work. Combined
detailed-tree lighting still needs the corrected capture: the family comparison
had basic lighting selected. Fauna stencil warm-up also invalidated the initial
steady-state assumption. No causal cache speedup or final realism acceptance is
claimed. Live remains `8e16776`; these later changes are local checkpoints.

### Compact family integration

[Compact per-family slots](compact-tree-families-2026-09-28.md) are now integrated,
with an atomic branching/spire library and 38 focused CPU tests. Unsupported
trees no longer consume detailed GPU slots, and fully replaced legacy batches
are hidden. The next actual-game comparison must measure submissions and verify
identity, dated return, movement and shadows; no frame-rate improvement is yet
claimed. Pine remains an asset candidate until its combined visual check passes.
