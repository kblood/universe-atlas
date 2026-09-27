# Ground materials and named surface destinations

## Current direction — 2026-09-27

The next material and lighting work is governed by the [desktop realism plan](desktop-realism-implementation-plan-2026-09-27.md). Retain existing terrain detail and physical scale while introducing consistent lighting, ground/rock/wetness materials and compatible vegetation assets. This report retains its original measurements.

Implementation record, 2026-09-13. This follows [walking and shared time](walking-and-time.md)
and the [reviewed long-term roadmap](fable-review-assessment.md).

## Scope and use

Solid planets and moons now have metre-scaled ground shading: granular sand,
soil, fractured rock and snow/ice, blended by the existing geography and slope.
Open **Surface destinations → Survey surface** in a planet or moon inspector.
Select a named site to fly there, then choose **Land and walk**. WASD, Shift and
Space retain the walking controls. **Ground detail** switches the material layer
off; that preference is retained in the URL as `detail=0`.

These destinations are sampled positions on the real globe, not separate levels.
The survey reuses the same elevation query as the tile builder and walking
system. It does not move continents, invent a second ground mesh, or add a loading
scene. Stars and gas giants have no solid-ground survey.

This is a material and exploration increment. It does not deliver forests,
individual boulders, vegetation, flowing rivers, ponds, caves or underwater
exploration. The shader's small apparent bumps have no displacement, silhouette
or collision. Mountains and coasts keep the existing elevation field. Global
time still changes orbits visually; material and survey generation use the
reference geography, not a newly simulated climate or biological history.

## Deterministic contracts

| Layer | Version / ownership | Inputs |
| --- | --- | --- |
| Rock and macro colour | Existing `terrain-1.1.0` baseline | Body seed and spherical direction |
| Material classification | `surface-biomes-1` | Existing elevation, latitude, moisture field, type, temperature and shared normal |
| Shared scalar texture atlas | `ground-material-1` | Version-derived integer hash seed |
| Destination survey | `surface-survey-1` | Body seed and 1,536 fixed global candidate directions |

`src/surface-biomes.ts` produces normalized sand/soil/rock/snow weights. Four
normalized unsigned bytes per vertex sum to exactly 255. Normals are the same
two-metre directional finite differences used by every cube face; tile depth
does not select a different normal field. Airless worlds use regolith and rock,
ice worlds use ice, and ocean fragments suppress the new ground shading.

The classification is a habitat/material heuristic. Moisture is the existing
low-frequency noise field; latitude and altitude provide the existing snow
heuristic. A potential temperate destination additionally requires a generated
temperature of 250–325 K, dry ground, low slope and suitable altitude/moisture.
This is not a validated climate model or evidence that life exists there. Its
temperature gate is deliberately separate from any future life-history query.

`src/surface-survey.ts` samples a fixed Fibonacci distribution over the sphere.
It rejects ocean and slopes above 28 degrees, then scores highlands, plains,
coastal sand, snow/ice and potential temperate ground. The list can omit a
category, and identical candidates chosen for multiple categories are deduplicated.
A survey is reconnaissance, not an exhaustive search for every beach or summit.
Selection is independent of daylight so names and addresses do not change when
time changes. Some destinations may therefore be on the night side.

Each site ID is `<body-id>/site/<candidate-index>`. Its name derives from the body
seed and candidate index, with a category suffix. Direction, elevation, slope and
classification are retained in the export. Names are descriptive labels; IDs are
the unique addresses. A fixed category order resolves score ties. The current
browser catalogue worker computes surveys without blocking terrain generation;
the main thread retains at most four body surveys.

Same-seed reload and request-order determinism are tested. Floating terrain,
trigonometry, texture filtering and interactive physics are not claimed to have
bit-identical results across all processors/graphics drivers. Future migrations
must retain or version these namespaces instead of silently reshuffling sites.

## Rendering and precision

`src/ground-material.ts` creates one 256 × 256 RGBA scalar atlas in code. Its
channels hold multiscale grain, rounded gravel, Voronoi fracture structure and
fine sediment. Integer hashing and periodic sampling preserve wrap continuity.
This is data in linear colour space, not an imported colour photograph.

The fragment shader samples three planar projections blended by the fourth power
of the absolute surface normal, at 1 m and 16 m periods. This avoids longitude
stretching and singularities at poles. The baseline colour still controls the
world's palette; material weights modulate local colour, roughness and the
surface-gradient bump normal. Triplanar terrain texturing follows the technique
described in [NVIDIA's GPU Gems chapter](https://developer.nvidia.com/gpugems/gpugems3/part-i-geometry/chapter-1-generating-complex-procedural-terrains-using-gpu).
The derivative-based normal perturbation follows the surface-gradient method
described by [Morten Mikkelsen](https://mmikkelsen3d.blogspot.com/p/3d-graphics-papers.html).
It is adapted to metre amplitudes and the viewer's changing render units.

A planet-sized float32 position cannot retain small material detail reliably.
Each mesh is anchored at its actual surface centre, including elevation. The
CPU computes `(anchor × planetRadius) mod 4096 m` in double precision. The vertex
shader adds its small local metre offset to that phase. Both texture periods
divide 4096 exactly, so neighbouring patches agree even when their origins wrap.
The tests emulate float32 shader arithmetic and compare common vertices at poles,
cube corners and adjacent refinement levels within 3 mm.

Ground screenshots exposed a second precision issue: inward tile skirts were
visible as textured fences despite already-stitched surface edges. Removing
only bump mapping retained the stripe; excluding skirts removed it. The renderer
now omits skirts when it and all neighbouring edge coverage are settled and at
most one level apart. Parent edge locks already close those boundaries. Skirts
remain for streaming/morphing or less compatible coverage. Fine skirt depth is
also bounded by patch width; contact collision continues to exclude skirts.
This avoids relying on the depth buffer to hide overlapping, nearly coplanar
vertical faces. It does not establish a formal global terrain-error bound.

## Performance and memory

The ground layer adds no draw calls and uses six texture reads on nearby enabled
patches. A uniform per-patch branch skips those reads and normal perturbation when
detail is disabled or conservatively outside range. Per-fragment fading starts
at 1.5 km and ends at 6 km. Orbital macro appearance remains unchanged. Textures
use mipmaps, repeat wrapping, trilinear minification and up to 4× available
anisotropy; these controls are documented in [Three.js Texture](https://threejs.org/docs/pages/Texture.html).
Roughness and lighting use [MeshStandardMaterial](https://threejs.org/docs/pages/MeshStandardMaterial.html).

One atlas costs 262,144 CPU bytes plus approximately 349,526 GPU bytes with its
mip chain. Each tile adds four material bytes per vertex on both CPU and GPU.
The existing byte ledger includes both additions. Existing limits remain:
256 ordinary resident/pending tiles; 768 for walking contact; at most two worker
jobs pending and two completions installed per frame. The estimate still excludes
driver allocation overhead, temporary worker arrays, retained whole-body preview
textures, browser memory and physics WASM internals. It is not total process VRAM.

Turning detail off saves shader work, but keeps the small shared atlas allocated
so toggling does not regenerate resources. Disposing a resident planet disposes
its atlas. Surveys use a different worker from the terrain tile worker.

## Acceptance and measurements

Numerical tests cover weight normalization, unsuitable habitat, atlas repeatability,
material coordinates at cube/polar/LOD boundaries, dry survey positions, unique IDs,
and request-order stability. The established catalogue, date, collision and
orbital tests continue to run. `npm run test:surface` exercises the actual UI,
compares rendered pixels with detail on/off, restores the preference from a URL,
flies to a named coast, lands there, and regenerates the same list after a cold
reload. It also checks that orbital patches skip material sampling.

Local acceptance on 2026-09-13 used Chromium with ANGLE/D3D11 and an NVIDIA
GeForce RTX 5090, at 1440 × 1000. All 27 numerical tests passed. Screenshots and
machine-readable reports are kept under ignored `test-results/`.

| Check | Measured result |
| --- | --- |
| Actual ground on/off comparison, 300 × 150 px crop | Mean RGB difference 17.12/255; 94.34% of pixels changed by more than 2/255 |
| Orbital on/off comparison, 450 × 400 px crop | Identical pixels; zero patches sampling ground detail |
| Named coast flight and landing | 16.87 m from surveyed direction; grounded |
| Cold reload | Same site IDs, names, coordinates and classifications; disabled-detail preference preserved |
| Settled planet memory estimate | 115,278,030 bytes, 454 resident tiles, no pending jobs |
| Settled-ground 180-frame sample | Median 16.6 ms; p95 23.9 ms |
| Terrain update within that sample | Median 1.4 ms; p95 8.3 ms |
| Moon north-pole walk/run | 90.02 m, grounded, 0.044 mm sampled contact mismatch |
| Moon memory at end of run | 98,907,150 bytes, 391 tiles, no pending jobs |

The walking route also passed jumping, saved-location restoration, date seeking,
takeoff and navigation back through system, galaxy and universe views. It reported
no browser errors. Frame timings include VSync and this high-end desktop; they
are not Quest, mobile or minimum-hardware performance guarantees. Fine material
can repeat visibly over larger flat expanses. Distant labels still use the prior
spherical occlusion approximation, which can miss local hills.

The final orbital regression passed low orbit, descent, both polar crossings,
moon approach and the 256-tile ordinary cache bound (peak 253). The IWER 2.4.0
Meta Quest 3 stereo route passed controller selection, model controls, planetary
approach, exit and re-entry without browser errors. This is emulator validation;
physical-headset testing remains outstanding, and walking remains desktop-only.

The public-site surface route also passed on 2026-09-13 at
https://dionysus.dk/webxr/IWSDK/universe-atlas/. It restored the disabled-detail
preference and ground location, reproduced all five named sites, landed 16.57 m
from Iris Shore, and exported the same versioned site records to JSON. Ground
on/off RGB difference was 17.12/255; orbital pixels were identical. No browser
errors occurred. The live HTML, main bundle (`index-sIAWX87p.js`), CSS, catalogue
worker, terrain worker, lazy physics chunk and implementation document matched
the local SHA-256 digests. The website index displayed the new material and
destination description. After this acceptance note was added, its updated
published document was checked again against the local source.

## Next geography and history work

This increment brings forward the independent material layer from the staged
recommendations. Structured geology and connected hydrology remain the next
larger change. River routing needs stable drainage ownership across tile and cube
boundaries. Independently carving a stream inside each visible patch would make
catchments disagree and could invalidate saved walking locations. A versioned
planet-wide coarse drainage graph, regional refinements and explicit outlet/lake
rules should precede channel carving. [Génevaux et al.'s hydrology-based terrain research](https://perso.liris.cnrs.fr/egalin/Articles/2013-river-networks.pdf)
provides a relevant drainage-first approach; this is an architectural direction,
not an implementation of that paper or a complete planetary hydrology model.

Preserve the baseline or expose an explicit geology migration. Future rock
instances, trees and grass should consume stable regional feature IDs, with
separate visual, collision and history budgets. The current weights and habitat
proxy can guide material and vegetation placement; they must not decide when a
species or civilization begins. That belongs to the shared deterministic history
contract, together with star formation/death and the universal date.

## Sources and provenance

Primary references linked above were checked on 2026-09-13. Additional context is
in [the initial orbital implementation](planetary-orbit-implementation.md),
[walking and time](walking-and-time.md), and the preserved [Fable 5.1 review](fable-5.1-plan-review.md).
The implementation and validation in this record were performed by Codex.

No external art, generated model assets, checkpoints or private uploads were
used. The signal atlas is runtime code with its version seed preserved in source;
no `.blend`, GLB, image or audio source was replaced. No new dependencies were
added. Three.js remains pinned through the existing `super-three@0.181.0` package.
