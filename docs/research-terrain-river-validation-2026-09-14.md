# Terrain, rivers, and free-flight validation research

Research note, 2026-09-14. This is a proposal for the next terrain and ground-detail work; it does not claim that the proposed systems or tests exist.

## What is actually in the current pilot

The release identified as `12645f6` has a **regional** river pilot. `Find rivers and a lake` selects one bounded coastal region with one main channel, one tributary and one lake; it is not planet-wide hydrology or biome coverage. The current implementation is internally coherent in important ways: the shared surface query owns ground height, wetness and water height; contact and flight clearance read that field; river water uses locally anchored geometry; and stable seed-based placement avoids visit-order changes.

The audit confirms a coverage gap and limited local morphology. The exact Cerintar artifact in the supplied screenshot cannot be localized to a route, tile, region or URL from the image alone, so these implementation observations are explanations to test rather than a definitive diagnosis of that frame:

* The water is generated from a procedurally sampled candidate-route polyline and widths are only modestly varied. At orbit or medium altitude this can read as a straight blue ribbon. The local water surface is separately rendered, so a terrain/water disagreement would be a defect, but geometric consistency alone cannot make the planform look like a mature alluvial river.
* The local dressing is an early visual pass. It has a single shared, deterministically deformed dodecahedron stone mesh and a narrow scale interval (roughly 0.22–1.04 multiplier). Its tree choice is a temperate boolean plus seeded chance, not a full biome/ecology model. A visually dominant, similarly shaped and coloured rock population is therefore expected in sparse or non-qualifying tree cells.
* Existing numerical tests cover repeatability, budget caps, dry-bank placement, wet walking refusal, bank/surface continuity, disposal, and scripted discovery/flight/landing/walk. The release record includes one scripted bank and lake visit. I found no evidence of a systematic acceptance run that flies a matrix of routes over multiple regions, altitudes, headings, LOD transitions and biomes while recording visual/detail metrics. Passing the current tests must not be read as evidence of dense, natural-looking planet coverage.

The right response is two coupled systems: a deterministic world-description pipeline which generates landform and ecological *intent*, and an acceptance harness which samples that intent and the rendered result from repeatable free-flight routes. It should retain the current distinction between base terrain and an optional immutable regional model until a replacement has equivalent compatibility and restoration guarantees.

## Physical hydrology, plausible art, and rendering are separate contracts

| Concern | It must guarantee | It should not pretend to guarantee |
| --- | --- | --- |
| Physical/hydrologic model | A drainage graph, consistent downstream elevation, catchment area/discharge proxy, depression policy, channel width/depth class, and no uphill or disconnected ordinary reach. | A real climate history, measured discharge, sediment load, vegetation succession, or erosion age for a fictional planet. |
| Plausible geomorphic art | River-type-dependent planform, valley/floodplain/bank forms, widening at confluences, varied substrate and species assemblages tied to climate, soil, slope, moisture, disturbance and elevation. | That every curve came from a costly long-term fluid/sediment simulation. A controlled deterministic approximation is suitable. |
| Rendering and streaming | One authoritative sampled surface and wetness field, water that conforms at all LODs, stable floating origin, bounded instance/draw/memory work, and no visible holes or abrupt density seams. | Hydrological correctness merely because the shader has moving normals or reflections. |

This split matters for the reported water issue. A sinuous-looking spline by itself is art; a meander model with a compatible floodplain and reach type is plausible art informed by geomorphology; conservation of water/sediment over time is physical simulation. The product can begin with the second, supplied by a deterministic first layer, rather than attempting global high-resolution morphodynamics.

## Sources checked

1. **Jean-David Génevaux, Éric Galin, Éric Guérin, Adrien Peytavie and Bedrich Beneš (2013), [Terrain Generation Using Procedural Models based on Hydrology](https://perso.liris.cnrs.fr/egalin/Articles/2013-river-networks.pdf), ACM Transactions on Graphics 32(4), Article 143, DOI 10.1145/2461912.2461996.** The authors build a hierarchical drainage network first, then a continuous analytic terrain that can be evaluated at varying LOD. This directly supports a river/terrain constraint field shared by rendering, collision and queries. The paper itself warns that its method does not represent deltas or oxbow lakes and can make unnatural hills under strong slope variation; use its ownership/continuity design, not its result as a complete river simulator.

2. **Richard Barnes, Clarence Lehman and David Mulla (2014), [Priority-Flood: An Optimal Depression-Filling and Watershed-Labeling Algorithm for Digital Elevation Models](https://rbarnes.org/sci/2014_depressions.pdf), Computers & Geosciences 62, 117–127, DOI 10.1016/j.cageo.2013.04.024.** This primary algorithm paper gives a fast deterministic way to label watersheds and establish drainage/flow directions on a DEM or mesh. It supports a global/coarse hydrology analysis layer, with stable tie-breaking explicitly specified. Depression filling is a routing preparation, however, and should not erase real lakes/endorheic basins from the visual world.

3. **K. Callaghan and A. D. Wickert (2019), [Computing water flow through complex landscapes – Part 1: Incorporating depressions in flow routing using FlowFill](https://esurf.copernicus.org/articles/7/737/2019/), Earth Surface Dynamics 7, 737–753, DOI 10.5194/esurf-7-737-2019.** The study preserves depression storage and makes drainage connectivity depend on supplied runoff, with flat lake surfaces as an output. It supports an explicit planet rule such as `closed-basin`, `seasonal-spill`, or `integrated-drainage`, plus fixtures for lakes and dry basins. It is an overland-flow routing model, not a real-time WebGL water renderer, and its random tie option must be avoided for canonical generation.

4. **D. Motta, J. D. Abad, E. J. Langendoen and M. H. García (2012), [The effects of floodplain soil heterogeneity on meander planform shape](https://agupubs.onlinelibrary.wiley.com/doi/abs/10.1029/2011WR011601), Water Resources Research 48, W09518, DOI 10.1029/2011WR011601.** The original modelling study finds that spatially varied bank erodibility makes meander forms more varied and complex than a homogeneous classic-bank treatment. It supports using a seeded but spatially coherent substrate/vegetation resistance field to perturb a reach, rather than repeated perfect sine turns. It does not provide an uncalibrated formula for every alien river.

5. **Manuel Bogoni, Mario Putti and Stefano Lanzoni (2017), [Modeling meander morphodynamics over self-formed heterogeneous floodplains](https://agupubs.onlinelibrary.wiley.com/doi/abs/10.1002/2017WR020726), Water Resources Research 53(6), 5137–5157, DOI 10.1002/2017WR020726.** The authors compare simulated and observed planforms with half-meander metrics and curvature distributions, and show the value of floodplain heterogeneity, scroll bars and oxbow fills. It supports acceptance metrics beyond "is the river curved?": sinuosity, bend wavelength, curvature spectrum, cutoff/oxbow frequency and floodplain correspondence. This is long-term alluvial morphodynamics; steep bedrock channels, glacial valleys and alien chemistries need other reach classes.

6. **A. D. Howard and A. T. Hemberger (1991), [Multivariate characterization of meandering](https://doi.org/10.1016/0169-555X(91)90002-R), Geomorphology 4(3–4), 161–186.** This original quantitative study measures 40 centreline-derived variables across 57 freely meandering channel sections and uses multiple measures to distinguish meander character, rather than treating one sinuosity number as enough. It supports recording curvature and wavelength distributions per reach class in generated fixtures. It is a classification/measurement basis, not a rendering prescription.

7. **Luna B. Leopold and M. Gordon Wolman (1960), [River Meanders](https://pubs.usgs.gov/publication/70185557), Geological Society of America Bulletin 71(6), 769–793, DOI 10.1130/0016-7606(1960)71[769:RM]2.0.CO;2.** This observational study establishes a durable empirical relationship between channel size and meander geometry. It supports scaling bend wavelength, radius and floodplain width from a generated bankfull-width/discharge class, so a 15 m creek is evaluated against a size-compatible broad envelope rather than given arbitrary, repeated kilometre-scale turns. It is Earth data and a statistical relationship, so it should set broad plausible envelopes, never force a fictional planet to Earth measurements.

8. **Three.js maintainers (current documentation), [InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html) and [Renderer.info](https://threejs.org/docs/pages/WebGLRenderer.html#property:info).** These are primary technical documentation for the actual render dependency: instancing reduces draws for shared geometry/materials and `renderer.info` exposes render/memory statistics. They support measuring actual draw calls/triangles/memory in the route harness. They do not measure perceived variety, biological plausibility, or device-wide GPU allocation by themselves.

## Proposed deterministic generation model

### 1. Planet descriptors, then fields, then instances

Give a planet a versioned immutable `ecosystem` descriptor alongside geology/hydrology: atmospheric class, temperature/precipitation seasonality proxies, latitude/elevation, soil/substrate, moisture, disturbance, and biological/alien morphology family. Derive continuous, random-access fields from canonical coordinates and seed: climate, slope, curvature, wetness/distance-to-water, soil depth, rock exposure, and canopy potential. A placement cell queries those fields; it does not infer ecology from the currently loaded tile.

The placement result is a stable candidate ID, category, transform, morph parameters, material palette and occupancy radius. The renderer may select a deterministic subset under budgets, but selection must be invariant for the same focus cell/LOD and must not change the underlying population identity. That is essential later for collisions, fauna, persistence and repeatable screenshots.

For rocks, generate an **assemblage**, not a single scatter rule: bedrock outcrops on high curvature/steep exposed surfaces; talus below cliffs; riparian rounded cobble bands; soil-buried stones on gentle ground; rare boulders with cluster correlation; and colour/material families coupled to substrate. Use several template families plus deterministic low-frequency shape and palette parameters. Validate frequency, size and nearest-neighbour distributions per biome so the fallback is not "rocks everywhere".

For plants/trees, derive density and species/morphotype mix from the fields. Use canopy coverage as the primary density statistic, then generate trunks/crowns/understory conditionally. A humid riparian strip may have high moisture-loving cover; exposed scree should have little or none. Non-Earth life can reuse the same interface while changing grammar, scale, palette, symmetry, movement and reproduction cues. Avoid hard-coding Earth trees as the universal life form.

### 2. Hydrography and channel geometry

At global/coarse scale: derive deterministic basins and flow accumulation from an explicitly chosen depression policy. At regional detail scale: select a reach type from slope, accumulated area/discharge proxy, substrate and climate. Each reach owns a centreline, bankfull width/depth, thalweg, bed/bank/floodplain constraints, tributary relationships and water surface. All consumers sample that same model.

Do not apply meanders everywhere. Use steep, confined/bedrock reaches with low sinuosity; permit higher-curvature alluvial reaches only where floodplain width and slope permit them. Construct a bounded, curvature-limited spline from the downhill corridor, then modulate it with coherent bank-resistance fields. Enforce non-self-intersection, minimum neck separation, non-increasing downstream water elevation outside controlled lakes, and a channel width that varies smoothly and expands at confluences. Attach point bars/outer-bank cut slopes, levees, abandoned loops and oxbows only to appropriate low-gradient alluvial classes.

Render water from the same centreline but tessellate it at a screen-space and curvature error target. Add width-aware bank geometry, depth/flow direction, shallow-water colour and riparian wetness. Animated ripples and reflection are visual cues; they cannot correct a straight or submerged channel. The fixture should contain both a quiet lake and a flowing reach so flatness and flow are assessed separately.

## Proposed acceptance harness: route fixtures plus metrics

The harness should be a repeatable Node/browser test mode that records JSON, canonical hashes and fixed-size captures. It is not a claim that image similarity alone proves realism. It combines field/model checks, rendered instrumentation and human review.

### Fixture catalogue

Use compact synthetic fixtures for failure isolation and a small fixed catalogue of real seeded pilot addresses. Each fixture owns a seed, model version, starting pose, ordered waypoints, altitude, heading, time-of-day, LOD budget and expected metric ranges.

| Fixture | Required route | Principal checks |
| --- | --- | --- |
| `alluvial-meander` | Headwater → two bends → confluence → lake outlet at 25 m / 150 m / 600 m clearance, both flow directions. | Curvature/wavelength, width continuity, outer/inner-bank appearance, water/terrain seam, no self intersections. |
| `confined-valley` | Down-valley and cross-valley routes at 100 m and 800 m. | Low-sinuosity class, bank/bed conformity, no water above terrain or through ridge, LOD seam visibility. |
| `lake-shore` | Orbit approach → 2 km → 200 m → shoreline walk. | Flat connected lake surface, wet boundary, reflection/shallow cue stability, no submerged/floating rim. |
| `riparian-ecotone` | Dry upland → floodplain → riverbank → opposite bank, daytime and dusk. | Plant/rock category mix changes with moisture/substrate; canopy and understory density; no abrupt cell seam. |
| `scree-and-outcrop` | Cliff crest → talus → gentle soil, three headings. | Rock assemblage distribution and palette changes by landform; trees excluded where unsuitable. |
| `streaming-rebase` | 40 km looping flight through several tiles, climb/descend across streaming thresholds, then repeat in reverse. | Canonical model hash, tile/instance identity, no geometry crack/pop beyond defined thresholds, bounded allocation and frame time. |
| `planet-sweep` | Fixed routes across at least three generated ocean-bearing planets and distinct latitude/climate bands. | Regional pilot availability/reporting, absence of accidental whole-planet claim, deterministic failure/retry and no silent fallback. |

### Model and field metrics

Record these before drawing. Thresholds should initially be baselined from accepted hand-reviewed fixtures, then hardened; arbitrary Earth numbers are not a quality standard.

* **Drainage:** fraction of non-endorheic channel samples with a downstream route; uphill-water samples; cycles; tributaries whose joining water elevations differ; outlet/shore connection; lake storage/spill policy; and maximum water-vs-shared-surface error.
* **Planform:** reach sinuosity, signed-curvature distribution, bend wavelength divided by mean bankfull width, minimum non-adjacent centreline/bank distance, bend/straight run lengths, channel-width derivative, and confluence widening ratio. Compare each to the reach class envelope, not one global target.
* **Terrain relationship:** channel bed remains below water by the intended depth; banks transition continuously to terrain; no feature field changes across a tile border; finite normal/slope values at poles/cube seams; and a sampled count of water/rock intersections or gaps.
* **Ecology/detail:** canopy-cover estimate, category proportions, rock size histogram, shape/template entropy, palette entropy, nearest-neighbour distance and clustering, vegetation density by moisture/slope class, and a boundary delta between adjacent placement cells. Report a reason for every rejected candidate (wet, slope, snow, biome, budget) so empty forest is diagnosable.
* **Determinism:** same canonical model and placement ID hashes after cold load, alternate request order, route reversal, worker cancellation/retry and LOD changes. Tie-breaks must be lexical/canonical, never dependent on `Math.random`, timing or worker completion order.

### Rendered-flight metrics

At every waypoint capture colour, normal/depth/wetness/class-ID diagnostic images in addition to the beauty frame. Use masks and numeric comparisons rather than a model judging the scene without instrumentation.

* **Water continuity:** count connected water components, screen-space shoreline gaps, water pixels whose depth is behind the terrain when they should be visible, and temporal change between nearby LOD/streaming frames. A depth/class-ID diagnostic isolates a terrain overlap from a shading complaint.
* **Detail density and variety:** per distance annulus, count visible instances and category share; screen occupancy by trees/ground cover/rocks; repeated silhouette/template rate; colour-cluster diversity; and change in those values across adjacent streamed cells. This detects a sparse forest or a rock monoculture even if individual assets pass geometry tests.
* **Flight stability:** record `renderer.info` calls/triangles/geometries/textures, CPU tile/environment update time, frame median/p95/p99, buffer allocations, resident tile/cell count and GC/worker events. Compare route reverse/repeat traces. Run desktop checks first, then the intended headset/device; desktop success is not a Quest claim.
* **Visual review board:** generate a contact sheet per fixture with the same camera poses, overlays and metrics. A reviewer records `pass`, `artifact`, `plausibility concern`, or `intentional alien choice`, with a one-line reason. This leaves art direction review human-readable without making it unrepeatable.

The initial hard failures should be objective: NaN/infinite samples, bad model hash, a water/terrain mismatch beyond tolerance, disconnected intended reach, overlap/gap above a pixel threshold, missing expected fixture categories, route budget overflow, or a sustained performance regression versus the recorded baseline. Plausibility metrics should gate promotion only after baselines are reviewed across fixture classes, otherwise they become false precision.

## Phased recommendation

1. **Make the current pilot observable.** Add a versioned route-fixture schema and diagnostic capture mode; expose canonical counts/hashes, terrain/water error, placement rejection reasons, class IDs and renderer stats. Freeze 6–7 fixtures above around the existing pilot. This can answer whether trees were absent because of a species rule, a budget selector, an altitude gate or a bad region.

2. **Correct obvious variety limits within the regional pilot.** Replace the single-rock assumption with deterministic substrate-conditioned families, widen the scale/palette/cluster distribution, and make tree/cover density a continuous habitat field. Add the density/variety metrics before tuning, retaining static IDs and budget-aware deterministic selection. Do not claim a planetary ecosystem at this stage.

3. **Make river reach types credible.** Add a regional hydrology descriptor, reach classifier and centreline builder with curvature, width, confluence and valley constraints. Begin with controlled alluvial and confined fixtures; use spline/constraint fields rather than a global morphodynamic solver. Upgrade banks, floodplain and shallow-water render cues from the shared reach model.

4. **Expand only after route evidence holds.** Promote to multiple selected regional pilots on a planet, then planet-level hydrography/biome fields. Each expansion must add fixture coverage for seams, poles, routes and streaming budgets. Preserve old model versions and URL restoration; the global model should be a new versioned choice, not a silent rewrite of existing terrain.

5. **Build living populations on top of stable habitat.** Animals, people and alien species need fixed population/occupancy identities, habitat queries, navigation/collision and a time/event owner independent of streamed visual cells. First test population distributions and movement corridors with the same route harness; defer behavior simulation until terrain, vegetation and occupancy agree.

## Determinism and performance consequences

Hydrology and ecology need a two-resolution design. Global analysis is expensive and should be built once per body/model version in a cancellable worker, serialized/cached with a content hash, and never recomputed per camera frame. Regional fields must be random-access and bounded, so a terrain texel, collision query and instance cell get the same answer without scanning the whole drainage graph. Keep canonical coordinates/quantized inputs, a specified stable priority order for equal elevations, integer/fixed-point IDs where practical, and deterministic PRNG streams partitioned by subsystem and candidate ID.

Streaming should generate only candidates and compact parameter records in workers, then use shared instanced meshes/material families on the render thread. LOD changes may alter representation density, but not the model address, retained near-field IDs, waterline, or collision field. Maintain a fixed per-route measurement budget, cap worker backlog, dispose superseded resources, and measure actual renderer counters as well as estimated bytes. The current regional pilot's resource caps are useful guardrails; they need route-long measurement before they become acceptance limits for a denser world.

## Decision record

The first implementation investment should be the route-fixture/metric harness plus instrumentation, then a region-level habitat/rock assemblage upgrade. It provides direct evidence for the user's free-flight concern and prevents tuning a single screenshot into an apparent solution. Hydrologically constrained reach generation follows once the same harness can expose water/shore failures at several scales. Full physical erosion and a whole-planet ecosystem are later optional simulations, not prerequisites for a deterministic, richly detailed, visually plausible world.
