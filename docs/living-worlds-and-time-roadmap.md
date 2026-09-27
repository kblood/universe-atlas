# Walkable worlds and traversable history

## Current direction — 2026-09-27

For the next planetary visual increment, use the [desktop realism plan](desktop-realism-implementation-plan-2026-09-27.md). It preserves this roadmap’s random-access history and metre-scale world contracts while specifying procedural asset families, instance variation, canopy continuity and a desktop-first implementation sequence.

Proposal, 2026-09-13. This describes future work, not capabilities of the deployed
build. It extends the [exploration corrections](exploration-corrections.md) and
the shared universe research. No runtime changes accompany this proposal.

Independent review: [Fable 5.1's complete assessment](fable-5.1-plan-review.md),
with [caller-checked corrections and a refined next-release recommendation](fable-review-assessment.md).
Read the follow-up before implementing the milestone sequence below.

## Recommended direction

Keep Three.js, the cube-sphere, deterministic catalogue and floating coordinate
frames. Build a time-addressable world model and a coarse universe-wide history
beneath them, then make one complete orbit-to-walking route convincing before
multiplying content. Time applies to every spatial scale: the Big Bang, galaxy
and planetary formation, stellar death, black holes, the emergence and extinction
of life, and civilizations expanding across systems and galaxies. The universal
generation rules should support every solid planet and moon; the first visual
acceptance world should be an ocean-bearing rocky planet, with an airless moon
as the contrasting correctness fixture.

The scientific scope needs one distinction: gas giants have no ordinary surface
to walk on [1]. All bodies can remain visitable, but surface locomotion applies
where solid ground exists at the selected date. An ocean world need not acquire
artificial land, and a molten young world need not acquire forests. Begin with a
protected explorer and observation mode rather than environmental survival rules.

Cosmic and biological history will be a deterministic, scientifically informed
fiction. Neither alien civilizations nor the ultimate fate of the universe can
be predicted by this application. Early-universe and far-future modes require
different representations from today's galaxy catalogue [2].

## What the code currently provides

- `terrain.ts` supplies one direction-space height/colour field, with broad
  continent shapes and metre-scaled noise bands. It does not model watersheds,
  substrate, erosion history or vegetation populations.
- `planet-tiles.ts` uses 32-cell patches, shared directional samples, parent
  morphing and skirts. Skirts are visual coverage, not walkable seam topology.
- `planet-renderer.ts` caps address depth at 16, uses patch-span refinement, and
  limits resident/pending tiles to 256. Existing tests reached level 10 while
  cruising 600 m above ground. That is not walking-resolution validation.
- `travel.ts` protects flight with a radial height query and a 120 m floor. It
  has no walking capsule, slopes, steps, obstacle collision or grounded state.
- Visible water is currently terrain clamped to sea level. Separate water and
  seabed representations are needed for beaches, inland water and future diving.
- Orbit playback advances a numeric epoch, but the catalogue and terrain have no
  formation dates, evolutionary stages or historical event model.

## Foundational data contract

Introduce a query shaped like:

```ts
worldAt({ universeSeed, versions, scenarioId, entityId, cosmicTime, branchId })
surfaceAt({ bodyId, bodyFixedPosition, cosmicTime, branchId, versions })
```

The authoritative records and sampled fields describe existence, position,
geology, water, climate, material, habitats and historical state. Meshes,
textures, colliders and vegetation batches are disposable representations of
those records. Rendering distance and camera movement never decide history.

Use independently versioned catalogue, geology, hydrology, ecology and history
algorithms. Address random choices by feature ID, event ID and generation layer;
never run one shared random sequence or reseed the whole world with the date.
Keep integer/hash decisions authoritative. GPU noise and appearance differences
must not change rivers, entity births, collision or saved content.

Determinism is an acceptance requirement across the full history. Fix event order
by precise date and a stable tie-breaking ID; version numerical models and tables;
quantize threshold-sensitive authoritative values where needed. Generate IDs from
stable lineage and slots, never from worker completion order. Serialize dates and
seeds losslessly. Browsers and GPUs may differ in pixels; canonical records and
event digests should agree. Test cold/warm caches, shuffled requests, different
worker counts, reversed visits and seek A→B→A against the same fixtures. Exact
cross-platform physics replay is a separate requirement, not assumed from a seed.

Preserve current catalogue IDs and reference-date system positions. Treat the
existing coordinate-shaped IDs as opaque identities: a star moving to another
cell keeps its ID. Add a separate spatial index for positions at a date. Galaxy
mergers and object destruction require lineage and existence intervals, not
silent reassignment of IDs.

Existing terrain 1.1 remains a versioned baseline. Start new geology from its
reference-date macro geography where practical, but watershed carving can change
local coastlines and elevations. Release that explicitly as terrain/geology 2;
do not promise byte-identical coastlines after a geology redesign. Old bookmarks
carry versions and either reopen the baseline or undergo an explicit migration.

## Surface generation order

1. **Planet descriptor:** radius, gravity, age, crust family, heat, atmosphere,
   volatile inventory, spin and stellar forcing. Water availability and life
   eligibility are independent fields; water does not automatically imply trees.
2. **Geological structure:** persistent crust provinces, approximate plate
   boundaries, mountain chains, basins, crater fields and volcanic provinces.
   Start with controllable structural primitives, not full plate physics.
3. **Coarse climate and water balance:** temperature, precipitation, snow/ice,
   evaporation and broad rain shadows. These constrain the drainage model.
4. **Drainage and landforms:** shared catchments, outlets and lake basins, then
   nested river channels, ridges and valleys. Parent basins own cross-region flow
   contracts; child detail cannot invent contradictory outlets. Allow closed
   basins and terminal lakes rather than forcing every depression to the ocean.
5. **Bounded local refinement:** channel carving, talus, weathering, beach slope
   and sediment. Optional erosion runs over cached regions with boundary halos
   and fixed upstream constraints, never independent camera-selected tiles.
6. **Materials and habitats:** continuous weights for rock, sediment, sand,
   soil, snow and vegetation, informed by altitude, slope, wetness and climate.
7. **Populations:** forest stands, trees, rocks and later grass, animals,
   settlements and people, all addressed independently of mesh LOD.

Climate, erosion and vegetation form feedback loops in reality. Use a documented
bounded macro pass first; later historical updates can add feedback without
running a global coupled simulation during descent.

Hydrology-led procedural terrain is supported by research that builds drainage
networks and derives associated terrain features [3]. Our proposal additionally
requires a spherical hierarchy, cross-face ownership and deterministic regional
refinement; the cited paper is not a ready-made planetary implementation.

Large rivers belong to the macro/regional model. Small streams and ponds can be
generated in nested sub-basins with persistent IDs, drainage classification and
spill heights. Beaches arise from shore position, slope and sediment supply;
some coasts should be cliffs. Islands belong to geography, not scattered props.

## Walking and geometric continuity

Add a fixed-step kinematic capsule with gravity directed toward the body centre,
parallel-transported orientation, slope/step limits and swept movement queries.
Prototype Rapier in the existing Three.js application: its character controller
exposes configurable up, steps, slopes and ground snapping; gravity remains the
application's responsibility [4]. Pin the chosen version after a small integration
test. Do not replace the renderer or introduce a whole game framework for this.

Physics uses a small moving local frame with nearby terrain and simplified object
colliders. Far mountains and distant trees have no resident physics bodies.
Flight, walking and saved positions share the same body-fixed coordinates.

Upgrade cross-face neighbour queries, enforce adjacent LOD difference at most
one, and stitch or constrain fine edges to the actual coarse edge. Retain short
skirts only as backup. Normals need metre-scaled sampling suitable for close
detail; the current fixed angular difference is too broad for small ground detail.

Use roughly 0.5–2 m geometry spacing near feet as an initial desktop target,
refining steep features further where error requires it. Centimetre material
detail belongs mostly in normal/roughness textures; larger protrusions that can
block movement need geometry and collision. Protect the contact neighbourhood
from a visual morph that disagrees with collision. Target visible/contact height
mismatch below 5 cm on the acceptance route, measured rather than assumed from
using the same analytic sampler.

Retain the spherical quadtree initially. Geometry clipmaps are a documented
alternative for a dense moving ground region [5], but adding a second terrain
representation now would also require a seamless spherical join. Reconsider only
if profiling identifies a problem the corrected quadtree cannot meet.

An ordinary heightfield cannot represent caves or overhangs. Leave a bounded
surface-feature interface for later local meshes/SDF volumes and their colliders;
do not convert whole planets into voxels to reserve that possibility.

## Oceans now, underwater later

Separate terrain elevation, water level and water rendering. Keep coarse seabed
and water-depth queries now, with independent water surfaces for ocean, lakes and
rivers. Local wave phase is anchored to the body, not the moving camera origin.

For this milestone render waves, shore transitions, wet sand and bounded foam,
with inland water at its own elevations. Keep walking on land and provide a
clear shoreline limit. Swimming, diving, underwater fog, submerged objects and
marine ecosystems are deferred. This preserves their future data requirements
without spending their rendering or physics budget today.

## Forests and close visual quality

A small set of good material and tree assets will matter as much as added terrain
polygons. Use metre-scaled PBR detail, slope-aware blending, macro colour variation,
local contact shadows and atmospheric light consistent with the sky. Avoid baking
every detail into today's small colour tile.

Generate stable candidates in surface cells with area-corrected density,
neighbour checks and habitat rejection. A tree keeps its ID across camera LOD
changes; historical births, growth and death are separate changes. Climate patches
and forests should be visible as coverage from orbit before individual trees resolve.

Use spatially partitioned instancing: close meshes, cheaper middle-distance trees,
then distant canopy/impostors. Three.js instancing reduces repeated mesh submission
[6], but foliage still costs shading, alpha overdraw and shadows. Bound all three.
Start with a few species and forest structure; later grass/plants extend the same
population layer. Follow the existing assetctl brief, provenance, LOD and target
validation workflow when producing production assets.

## Time architecture to introduce before dense populations

The timeline is universal from its first implementation. One shared cosmic date
feeds universe, galaxy, system and surface queries. It supports era jumps and
logarithmic navigation for enormous spans, then linear fine control around a
selected event. Users can follow an entity or search milestones such as formation,
first life, first settlement, stellar expansion or remnant formation. Local view
changes must not reset the date. Rendered detail may be deferred, but existence
and coarse historical state cannot be deferred to the order of exploration.

**Observation first.** Initially seeking time changes the date being observed,
without changing history. Reserve a branch ID in saves now; defer editable pasts,
causal paradox rules and branch propagation until observation is reliable.

Separate three mechanisms:

- **Analytic motion:** bounded-interval orbits, rotation, day/night and seasons.
- **Historical transitions:** formation, cooling, changing seas, glaciation,
  eruptions, extinctions, settlement founding and abandonment. Store ordered
  events with validity intervals and deterministic key states/checkpoints.
- **Nearby activity:** walking, animal movement, crowds and debris. Run detailed
  simulation only in active regions; persist meaningful outcomes. Rewinding exact
  individual actions would need its own snapshots/input log and is not implied
  by replaying coarse historical events.

For distant dates, resolve the relevant era and checkpoint directly, then apply
the bounded subsequent events. Never advance from the Big Bang one tick at a
time. Use selective event records and checkpoints, not an event for each blade
of grass or physics frame. Historical reconstruction is an established use of
event records, with explicit versioning and replay costs [7]. No distributed
event platform is required for the browser prototype.

**Stellar and planetary lifecycles.** Each star gets a formation date, initial
mass/composition, a versioned evolution track, mass/radius/luminosity curves and
a remnant outcome. Use published model tables or fitted tracks with provenance
when implementing this; one lifetime formula and a colour fade are insufficient.
Sun-like stars and sufficiently massive stars take different evolutionary paths;
not every star becomes a supernova or black hole [8, 9].

Represent a young system with its disk and forming bodies before switching to
mature planets; planetary formation in disks is the physical reference [10].
Model embryo/accretion stages statistically with scheduled important impacts,
rather than integrating every dust particle. Planet formation, cooling and water
availability constrain when surfaces, life or settlements may exist.

A stellar transition schedules dependent changes to the system: lighting and
heating, possible ocean/atmosphere loss, engulfment, orbital changes, debris,
habitability and civilization outcomes. These are explicit modelled consequences,
not a visual effect followed by the old unchanged planets. Use bounded orbital
approximations within evolution intervals and regenerate orbital elements at
discontinuities. Preserve source-star/remnant lineage. Remnant mass and any
modelled impulse govern surviving orbits; a black-hole renderer alone does not
define the fate of the system. Detailed outcomes require dedicated validation.

Supermassive black holes need their own seed/growth/merger histories. They should
not all be represented as individual ordinary stars reaching the same terminal
stage. Accretion appearance is conditional on available material [9].

**Civilizations across galaxies.** Generate a persistent causal graph of origin,
colonies, communication, migration, infrastructure, decline and successor states.
At universe scale render distributions and intergalactic connections; at galaxy
scale render expansion fronts and settlement networks; on a world derive the
actual cities and ruins from those same records. Individual citizens are local
detail attached to population cohorts, not billions of always-running agents.

Civilization reach depends on an explicit scenario policy: expansion speed,
communication limits, longevity, resource costs and optional fictional faster-
than-light travel. The observer's existing fast flight grants no automatic travel
ability to inhabitants. A universe-spanning civilization can occupy the simulated
cosmic domain under the chosen scenario; that is not a prediction that one can
colonize an infinite or causally inaccessible physical universe. Store scenario
parameters with the seed so histories remain reproducible. Begin with bounded
coarse nodes per macro region, deterministic boundary exchange and selective
refinement; a global node per star would defeat the performance design.

Use a precise serialized cosmic date, such as integer coarse units plus a bounded
sub-unit component, and local epoch offsets for numerical evaluation. Very early
and extremely late era views may need an exponent/era representation. Do not feed
a gigantic floating-point seconds count into today's Kepler phase expression.
Version the convention before exposing time bookmarks.

Cross-region history is the hardest future extension. A settlement cannot depend
on whether its neighbouring trade partner was visited first. Generate a coarse
regional causal graph in canonical order, with explicit migration/resource
boundary summaries; refine local events from it. Checkpoints are caches of that
history, not arbitrary opportunities to roll new random outcomes. Full galactic
civilization interaction is a separate bounded milestone, not a solved side effect
of adding an event log.

At cosmic scale, use histories and representations appropriate to the era:
early plasma/gas fields, star formation and enrichment, galaxy lineages, stellar
evolution and remnants. Add comoving/reference coordinates and evolving transforms;
do not multiply all distances by expansion, including bound planetary systems.
Existing named objects exist only inside their lifetime intervals. Preserve the
present catalogue as one reference-date constraint when creating those histories.

Time traversal should initially show state at the chosen simulation date.
Light-travel-delay observation is another mode; mixing it silently into the
timeline would make object histories confusing. The first moments and far future
must disclose assumptions. Offer a configurable future scenario and a latest
represented era, not a claimed known finite end of the universe [2].
The Big Bang view represents an evolving hot early universe; it must not depict
a bomb at one central point in a pre-existing empty map [11]. Use an explanatory
observation representation for epochs without ordinary stars or walkable matter.

Seeking while standing on changing ground needs a defined result. The initial
policy is to enter observation hover before a large seek, prepare the destination
state, then allow landing if ground exists. A disappeared planet switches to a
safe system/era view. Small day/night changes keep a body-fixed ground anchor.
Following a continent over geological time eventually needs a crust/feature
anchor; fixed latitude/longitude alone will not follow a drifting plate.

For smooth playback, prepare neighbouring historical states in advance and blend
only quantities that can sensibly interpolate. A coastline changing topology or
a city being founded needs an event transition, not vertex interpolation between
unrelated meshes. Arbitrary cold-cache date jumps may take background work; keep
the current scene visible and report preparation rather than promising zero delay.

## Performance contract

Apply detail limits to both space and time. Only the observer's region receives
dense meshes, detailed populations, physics or short-step simulation.

Provisional targets, to tune on named hardware:

- Desktop: 60 fps / 16.7 ms frame budget. Start with at most 256 MiB of accounted
  resident surface resources, including macro fields, tile geometry/textures,
  vegetation buffers and colliders; report worker/staging and seek-overlap peaks
  separately. This is a budget proposal, not a measured browser memory guarantee.
- XR: preserve a separate quality profile and measure on the actual headset;
  a 72 Hz target permits about 13.9 ms per frame. Desktop screenshots do not
  establish XR performance or comfortable locomotion.
- Bound worker concurrency, generation queues, GPU uploads and total bytes.
  An initial main-thread upload/install allowance is 1–2 ms per frame, measured
  with delayed driver costs considered; a tile-count cap alone is insufficient.
- Prioritize grounded collision and imminent route coverage, then visible terrain,
  materials, trees and minor decoration. Prefetch distance depends on speed,
  measured generation latency and braking distance. Slow descent smoothly when
  safe coverage is missing, while continuing to render available parent terrain.
- Cull by frustum, conservative horizon, distance and cell bounds. Pool grids and
  instance buffers. Use a limited nearby shadow region and dominant stellar light.
- Cache by entity/region, layer versions and relevant historical state signature.
  Changing the sun angle must not rebuild a mountain; a geological event should
  invalidate its affected regions and downstream dependencies.

Measure frame-time percentiles, GPU time where supported, bytes, worker latency,
upload bursts and traversal/seek spikes on repeatable routes. Reduce expensive
shadows, grass density and shader work before sacrificing collision correctness.

## Ordered milestones and acceptance

| Milestone | Visible result | Required evidence |
|---|---|---|
| 1. Universal time foundation | Shared date at every scale; coarse era view and one system from formation to remnant, plus versioned surface queries | Deterministic event digest, planet existence/stellar forcing dependencies, visit-order independence, backward/forward query equality |
| 2. Walkable ground | Land, walk, jump, run and return to flight on a rocky planet and moon | Earth-scale poles/cube edges, 5 cm contact target, no tunnelling, cold-cache save/restore |
| 3. Structured terrain and water | Mountain ranges, valleys, beaches, lakes and connected rivers | Downhill channels, correct basin outlets, cross-face continuity, orbit/ground agreement |
| 4. Detailed living surface | Convincing coastal forest-to-mountain route | Stable tree IDs and positions across LOD, correct habitat exclusions, measured frame/memory bounds |
| 5. Local history demonstration | Revisit one region before/after glacier, forest or settlement change | Seek A→B→A restores A, dependency-consistent changes, stale jobs rejected, safe ground transitions |
| 6. Wider planetary history | Formation, crust/water changes, biosphere stages and extinction scenarios | Object lifetimes, reference-date consistency, independently reproducible region histories |
| 7. Civilizations and richer cosmic eras | Settlements/cities/ruins linked to interstellar/intergalactic expansion; richer galaxy and remnant histories | Bounded causal generation, lineage, explicit scenario limits and time/space navigation |

Milestone 1 is a bounded end-to-end history prototype, not an attempt to
finish cosmic history before walking. Include at least a Sun-like outcome and a
massive-star remnant fixture so the data model cannot assume one stellar fate.
Complete milestones 2–4 as one coherent
surface release, proving the same generators on representative rocky, icy,
volcanic and airless bodies. All-solid-body locomotion does not require every
world to share an Earth-like material palette or support life.

## Sources and limits

Primary sources checked 2026-09-13. The architecture and numerical budgets above
are engineering proposals inferred from these references and the local code.
No source establishes this project's performance or predicts alien history.

1. [NASA: Jupiter facts](https://science.nasa.gov/jupiter/jupiter-facts/) — physical
   reason to distinguish solid-world walking from gas-giant visits.
2. [NASA: Universe overview](https://science.nasa.gov/universe/overview/) — cosmic
   epochs, emergence of stars/galaxies and uncertainty about future evolution.
3. [Génevaux et al.: Terrain generation using procedural models based on hydrology](https://perso.liris.cnrs.fr/egalin/Articles/2013-river-networks.pdf)
   — research reference for drainage-led landforms.
4. [Rapier: Character controller](https://rapier.rs/docs/user_guides/javascript/character_controller/)
   — locomotion building blocks, configurable up and application-supplied gravity.
5. [Losasso and Hoppe: Geometry clipmaps](https://hhoppe.com/proj/geomclipmap/)
   — alternative near-view terrain representation, deferred pending profiling.
6. [Three.js: InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html)
   — repeated-object rendering primitive.
7. [Microsoft: Event sourcing pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing)
   — selective historical reconstruction, snapshots and versioning trade-offs.
8. [NASA: Stars](https://science.nasa.gov/universe/stars/) — differing stellar
   lifecycles and remnants; background rather than numerical evolution tables.
9. [NASA: Black-hole types](https://science.nasa.gov/universe/black-holes/types/)
   — stellar and supermassive populations and growth pathways.
10. [NASA: How do planets form?](https://science.nasa.gov/exoplanets/how-do-planets-form/)
    — protoplanetary disks and planetary assembly.
11. [NASA: Webb and the Big Bang Q&A](https://science.nasa.gov/mission/webb/big-bang-q-and-a/)
    — the early universe has no central explosion point.

No assets were generated/imported, dependencies installed, runtime code changed
or deployment performed for this proposal.
