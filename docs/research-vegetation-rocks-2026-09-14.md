# Vegetation, rocks, and free-flight coverage research

_Research note, 2026-09-14. No runtime code, assets, dependencies, or test baselines were changed by this note._

## What the current implementation actually proves

The audit confirms that a general biome vegetation implementation is missing:
`RiverEnvironment` is constructed only for a body with a generated hydrology
region. It is visible only when the observer projects into the region's tangent
hemisphere and is below 1,500 m clearance. Its trees additionally require a
temperate non-ice/non-volcanic body, dry ground below 26 degrees, and a positive
river-bank influence. `surface-biomes.ts` exposes `forestPotential`, but the
tree placement gate does not consume it. Thus ordinary temperate ground away
from the river pilot has no tree layer at all. The exact cause of the specific
screenshot remains unresolved without its reproducible URL, position, seed and
environment diagnostics, but these gates are sufficient to explain why a broad
planetary tree distribution is not currently assured.

The implementation has one shared, deterministically deformed dodecahedron
stone geometry, one `0x777267` stone material, one tree architecture, and one
fern. Tree height varies from 5.2 to 17 m, but the silhouette grammar and
material do not. A bounded near-foot grass layer also belongs only to the active
hydrology environment; its visual density acceptance has not been established.
These are bounded pilot constraints, not a planet-wide ecosystem.

The unit suite checks deterministic placement, dry-ground conformity, finite
geometry, bounded resident cells/draws/memory, and disposal. `exploration.mjs`
and `atmospheric-flight.mjs` exercise travel and atmospheric flight; neither
collects flora/rock coverage or diversity while traversing an itinerary through
multiple habitats. The existing tests therefore cannot establish that a landed
planet is richly inhabited outside its one regional river environment.

## Findings from primary sources

### Generate species geometry separately from ecological placement

L-systems are a sound compact description for plant architecture at scales from
herbaceous plants to trees and plant communities. They are a candidate authoring
language for a small, deterministic species grammar library, not a rule that
every visible plant must be simulated as it grows. [Prusinkiewicz, Cieslak,
Ferraro and Hanan (2018), *Modeling plant development with L-systems*](https://algorithmicbotany.org/papers/modeling-plant-development-with-l-systems.html)
documents the method and its extensions.

For hero or near-range tree variants, Pałubicki et al. combine local branching
rules with competition for light or space and internal signalling; their method
produces varied trees and shrubs from the same species controls. That supports
using a bounded growth solve offline/worker-side to make archetype meshes, then
instancing the finished archetypes at runtime. It does **not** justify a
per-tree, per-frame biological simulation in a streamed browser world.
[Pałubicki, Horel, Longay, Runions, Lane, Měch and Prusinkiewicz (2009),
*Self-organizing tree models for image synthesis*](https://wp.faculty.wmi.amu.edu.pl/Self.html).

The practical division is:

| Layer | Deterministic output | Examples |
|---|---|---|
| Biological species library | Grammar and trait record, then a small fixed set of meshes/cards/material variants | conifer, broadleaf, shrub, fern, grass tuft, succulent, alien analogue |
| Geological recipe library | Shape and material recipe, then a small fixed set of rock meshes/material variants | sedimentary slab, rounded fluvial cobble, angular talus, columnar volcanic rock |
| Habitat/placement | Stable points, species labels, age/size and transform from shared ground, climate, substrate, wetness and disturbance fields | forest stand, riparian strip, meadow, scree, beach, lava field |
| Rendering | The appropriate representation of the already-decided instance | near mesh, mid clump/card, far impostor/coverage field, then absent |

This separation is essential. Improving the tree mesh cannot make a rock-only
plain into a forest; increasing placement count cannot make one repeated tree
species look biologically varied.

### Place plants from habitat fields, coverage and patchiness

Onrust, Bidarra, Rooseboom and van de Koppel translate landscape maps plus
per-species coverage, patchiness and spacing data into positions and species
labels. Their rendering pipeline organizes the result in a terrain LOD
structure. The useful design lesson is a data contract: coverage and patchiness
are explicit observable outputs, not accidental consequences of a single random
chance. [Onrust et al. (2017), *Ecologically Sound Procedural Generation of
Natural Environments*](https://doi.org/10.1155/2017/7057141).

Gasch, Martínez Sotoca, Chover, Remolar and Rebollo demonstrate a related
two-stage approach: select candidate seeds, label them from terrain/species
conditions, then solve size/spacing constraints and remove plants that cannot
reach a viable radius. This supports coarse-to-fine competition for canopy
space, while their own discussion makes clear that full local-to-global growth
is costly. Use it as a bounded regional solve, not as a whole-planet runtime
simulation. [Gasch et al. (2022), *Procedural modeling of plant ecosystems
maximizing vegetation cover*](https://doi.org/10.1007/s11042-022-12107-8).

Candidate placement algorithm for this project:

1. Produce versioned global fields from the same planet direction query used by
   terrain: temperature, moisture, solar/latitude proxy, slope, substrate,
   water distance/depth, sediment, disturbance and biome/region identifiers.
2. Make each species record declare suitable ranges, density curve, patch-scale
   range, minimum spacing, canopy radius range, age/size distribution, and
   permitted substrate/wetness. Alien species use the same trait schema, with
   invented values recorded in the planet profile.
3. At a regional generation scale (for example 1--4 km with a deterministic
   halo), create a multi-resolution blue-noise/candidate lattice. First assign
   canopy species and resolve their exclusion/competition. Then assign shrub,
   herb, grass, litter and small-rock layers beneath the resulting canopy and
   on open ground. Seed keys derive from `(planet, ecologyVersion, region,
   species, candidate)` so load order cannot move an instance.
4. Use low-frequency, feature-aligned patch fields to vary *where* a viable
   species occurs. Do not use independent white noise for every object: it
   produces statistically homogeneous placement with random clumping, rather
   than habitat-correlated patch structure. Rivers may increase moisture and
   alluvial substrate, but must not be the only place that can grow a tree.

This is a regional ecological approximation. It does not claim real biology for
fictional worlds, predict succession, or replace a climate model. Its value is
traceable, testable spatial structure.

### Rocks need morphology families, placement contexts, and material variation

Current rocks are one fixed topology and grey albedo with scale variation. A
useful procedural-rock reference separates deterministic parameter files,
node-based noise, boolean/skin geometry, PBR material creation and simple LODs.
It is evidence for a parameterized family approach and reproducibility, not a
drop-in dependency: its implementation is GPL-3.0 and must not be imported into
this project without a separate licence decision. [C. Faruk, *Proc-Rock:
Procedural Generation of Rock Structures*](https://github.com/acfaruk/proc-rock).

Create a rock recipe record with `origin` (bedrock, talus, fluvial, glacial,
impact, volcanic), `shapeFamily`, `strataAxis`, `roundness`, `aspect`,
`fracture`, `sizeDistribution`, `palette`, `roughness`, `moss/lichen` and
`burial`. Generate a small recipe bank per substrate/planet class, then vary
seeded parameters within a family. Place rocks in geomorphic contexts: scree
below escarpments, rounded/size-sorted clasts at channels, exposed slabs on
bedrock, clustered debris around outcrops, and sparse isolated stones in soil.
That creates a reason for both the geometry and the density. Preserve collision
only for selected nearby large instances; visual scatter should remain
collision-free.

### Dense detail needs representation bands rather than unlimited meshes

The rendering case for instancing is direct: instances can vary transform and
colour while sharing geometry/material, reducing draw calls. [Carucci (2005),
*Inside Geometry Instancing*, GPU Gems 2](https://developer.nvidia.com/gpugems/gpugems2/part-i-geometric-complexity/chapter-3-inside-geometry-instancing).
Three.js likewise documents `InstancedMesh` for many objects sharing geometry
and material, and requires bounding volumes to be refreshed after changing
instance transforms. [Three.js `InstancedMesh` documentation](https://threejs.org/docs/pages/InstancedMesh.html).

Trees must retain their broad volume at distance, but need progressively cheaper
leaf clumps and then view-dependent billboards/impostors. Ground clutter gains
believability from mixed grasses, twigs, small plants and stones, with tint and
transform variation. [Baxter (2005), *Toward Photorealism in Virtual Botany*,
GPU Gems 2](https://developer.nvidia.com/gpugems/gpugems2/part-i-geometric-complexity/chapter-1-toward-photorealism-virtual-botany).
For grass, dense appearance from many lines of sight requires grouped/crossed
representations and distance blending; individually modelled blades cannot be
the whole meadow representation. [Pelzer (2004), *Rendering Countless Blades
of Waving Grass*, GPU Gems](https://developer.nvidia.com/gpugems/gpugems/part-i-natural-effects/chapter-7-rendering-countless-blades-waving-grass).

Use four bands, with distance values tuned from device measurements rather than
copied from these sources: contact meshes/collision; nearby instanced species
meshes; mid-distance cards/clumps; and far coverage/impostors or material
signal. Hysteresis and overlap/dither rules must be tested while moving, since
fixed-camera LOD images hide popping. Three.js supplies a basic distance LOD
object with hysteresis, although batched vegetation will likely need a
custom per-cell equivalent. [Three.js `LOD` documentation](https://threejs.org/docs/pages/LOD.html).

## A test system that evaluates the world while it is travelled

Build a **procedural ecology audit** alongside unit tests. It is a test harness,
not another renderer and not a hand-curated showcase scene.

### 1. Deterministic sampler and regional pilot

Start with one 4 km square river-to-upland pilot, plus a dry/rocky comparison
region on the same planet. The pilot must use the future general ecology API,
not `RiverEnvironment` directly. Give it a fixed seed, sun, date, ecology and
geology versions. Generate a `coverage.json` artifact that includes, per grid
cell and representation band:

- available habitat area, sampled/candidate count, accepted count and density;
- counts and area share by species/archetype, life layer and rock family;
- size/age and canopy-radius histograms; colour/material-parameter histograms;
- nearest-neighbour and patch-size summaries; wet/slope/substrate rejection
  counts; and deterministic hashes of placement records;
- draw calls, instance counts, bytes, build/upload time and streaming latency.

This reveals a missing forest, uniform rock family, empty understory, or a
loading-order seam before a reviewer must infer it from a screenshot. The
initial numeric thresholds should be stated as engineering acceptance choices,
not sourced ecological laws. Examples: every viable reference habitat has a
non-zero configured cover target; no single rock family exceeds its configured
share in a mixed substrate; and repeat generation has an identical placement
hash. Values need calibration against intended art direction and device budget.

### 2. Stratified free-flight itineraries

Generate addresses from the planet's own fields rather than choosing attractive
manual views: at least several samples for riparian lowland, temperate interior,
dry upland, steep/talus, coast, alpine/polar and lifeless/volcanic when present.
For each address, choose a destination whose ecology is expected to differ from
the previous address. Run scripted flights between them at high, mid and
near-ground clearance, including sideways crossing of region/tile boundaries
and return paths. At regular metre/distance intervals record the artifact above,
visible/resident/pending cells, LOD band counts, frame time and a camera pose.

Assertions should cover:

- same seed/version/path gives the same placement hashes and no duplicate or
  missing boundary candidates;
- valid habitat gains the configured vegetation layers after streaming settles;
- prohibited habitat has the expected zero layers, instead of accidental
  rock-only fallback;
- visible density changes continuously within declared LOD/streaming bounds;
- no active-cell count, memory, generation latency or frame-time threshold is
  exceeded on the named test device; and
- the path reaches distinct ecological signatures, rather than repeatedly
  observing the same river bank.

Run this at least once from a cold cache and once warm. A separate whole-planet
sampling pass can query only fields and placement metadata without creating
render meshes; it is the right scale for global distribution statistics. The
4 km pilot is the right scale for canopy competition, ground contact, water-edge
rules and close visual review. Do not pretend the first proves every point of a
planet.

### 3. Controlled visual and water review

For every itinerary capture fixed FOV/clearance/screenspace views looking
forward, sideways and down, with weather/time/wind frozen. Capture another
pass in motion to expose LOD popping and density holes. Visual image baselines
are useful only in a pinned browser/OS/GPU configuration; Playwright documents
both screenshot comparisons and the host variability that makes cross-platform
goldens unsuitable. [Playwright, *Visual comparisons*](https://playwright.dev/docs/test-snapshots).

Review water on its own route set: upstream bend, tributary junction, inside and
outside bends, floodplain, lake inlet/outlet and shoreline at walking height.
The present river is a physical regional pilot, so a natural-looking river needs
its centreline and banks to arise from shared catchment/terrain data and to be
tested from these routes. A visually curved line alone does not establish
correct bank grade, water/bed intersection, flow direction, confluence, or
close-range material behaviour. Keep those water metrics separate from ecology
metrics, then combine both in the same free-flight report.

## Recommended implementation order

1. Expose a versioned planet ecology query and diagnostics artifact; add the
   global field-only coverage sampler and the free-flight itinerary fixture.
2. Make generic placement consume biome/habitat fields across suitable surface
   regions. Retain river distance as one moisture/substrate input, not the
   eligibility switch for all trees.
3. Add a small authored/procedural species and rock-recipe library with
   per-instance palette, form and age variants. Validate geometry and provenance
   when any imported/generated mesh enters the asset pipeline.
4. Deliver the 4 km regional pilot with canopy competition, understory, rock
   contexts and the four representation bands. Record desktop and headset
   results separately.
5. Expand to planet classes only after the pilot's coverage, streaming and
   moving visual results are accepted. Add animals and humanoid/alien agents as
   a distinct population/behaviour layer later; they may consume habitat and
   species data, but should not be conflated with static vegetation placement.

## Limitations and provenance

The papers and technical chapters support architectural choices, not numerical
density targets for fictional planets or Quest performance promises. The rock
repository is a research reference with GPL-3.0 code and has not been installed
or copied. The current `RiverEnvironment` facts above come from the local source
and tests inspected on 2026-09-14. All proposed thresholds in this document are
engineering choices to calibrate through the described measurements.
