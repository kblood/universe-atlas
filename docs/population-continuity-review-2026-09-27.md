# Population continuity: source audit and comparable projects

Reviewed 27 September 2026 against Atlas commit `6955468`.

## What this investigation establishes

The reported frozen animals, changing populations and abrupt scenery changes
have concrete counterparts in the implementation. The previous descent check
established that population candidates existed and walking could start. It did
not establish continuity of an individual animal, locomotion during ordinary
exploration, or a visually matching transition between representations.

This is an investigation and repair design. No runtime fix or deployment is
claimed by this document. Source findings and numerical probes below are
distinct from a browser reproduction of the user's particular visit.

## Findings in Atlas

### 1. Ordinary exploration freezes the animal clock

`main.ts:toggleFlight` sets `playing = false`. The main loop advances `epoch`
only while playing, and passes that epoch to `PlanetRenderer.update`.
`fauna-runtime.ts:faunaMemberPoseAtWorldNs` and `faunaRigSecondsAt` derive both
movement and rig animation from that same date. Repeated frames at a paused
date therefore produce the same animal positions and animation time.

Even when time advances, the current movement is a small periodic orbit about
a herd anchor, with a radius of 0.6–2.4 m. It is not terrain-aware roaming,
grazing, obstacle avoidance or migration. Changing a clock alone will not
provide those behaviors.

### 2. Stable IDs are undermined by incomplete spatial selection

`planet-renderer.ts:rescatterLife` replaces the herd array after 20 m of ground
movement. It samples a moving tangent grid with 24 m spacing, snaps those
points to plant cells, then snaps them again to 32 m herd cells. This does not
enumerate every herd cell intersecting a fixed visibility region. A previously
selected interior cell can disappear from the array on the next resample.

A numerical reconstruction of those exact selection steps used Maithea
(`LETHRA-001`, `G001/C2128,0,1/0/planet/1`, radius 5,194,907.072465867 m).
The reference direction was the normalization of the prior live-test walking
position `[4067932.6051911283, -1506999.4015015522, 2860044.6926233927]`.
Eight starting positions, separated by 20.1 m eastward, were each moved 20.1 m
in sixteen tangent directions. In 125 of 128 moves, some previously selected
anchors within 100 m of **both** observers disappeared from the selection.
The worst case omitted 22 of 39 such interior anchors. These are candidate
herd anchors, not a claim that all 22 contained animals.

The outer grid's retained samples extend about 144 m along each tangent axis,
while fauna's distance limit is 280 m. Increasing the distance constant did
not extend population enumeration to cover that entire radius.

### 3. Animal detail levels do not depict the same specimen

The current thresholds are 18 m, 100 m and 280 m. Nearby rigs use each member's
individual genome. The middle and far representations use one representative
genome per archetype. The far representation is an untextured colored quad;
the middle representation has static box geometry. These are placeholders,
not faithful reduced versions of the individual animal.

`pickFaunaLodBand` switches immediately at each threshold. There is no overlap
fade or hysteresis. A changing silhouette, size or color is therefore expected.
The runtime proxy buckets are 24 middle and 48 far instances per archetype.
`tryAdd` can fail when full; its return value is ignored. `faunaVisibleCount`
increments before successful submission, and the fauna draw path does not
frustum-cull candidates before spending its instance slots. Thus that counter
does not establish that the user can actually see the reported animals.

### 4. Small-object rendering has a precision risk

Ground flora instance matrices store translations in radius-normalized,
planet-centred Float32 buffers. Fauna anchors also use Float32 directions,
and proxy matrices use the planet-centred frame. The new forest renderer
already subtracts a local origin; the other life paths do not consistently
use that approach.

At a normalized component of 0.75, adjacent Float32 values are `2^-24` apart.
On Maithea this represents approximately **0.310 m**. This demonstrates an
inadequate precision scale for nearby small objects; it is not a measurement
that every observed jitter has that amplitude. Camera movement, transforms,
terrain refinement and shading still need to be isolated in a visual capture.

### 5. Distant canopy is a separate population approximation

The forest worker enumerates 18 m individual-tree cells and a separate 140 m
stand grid. The latter draws a fixed arrangement of crowns. It is not an
aggregate built from the individual trees it replaces. The two layers can
therefore disagree on coverage and silhouette. Scale-based fades make crowns
grow or shrink as the moving working-set centre changes.

### 6. Walking still has expensive synchronous work

Contact selection rebuilds its frontier from the roots when selection changes.
The 3 ms refinement cutoff applies only without contact. Life resampling also
performs its terrain and habitat queries synchronously. Earlier live captures
included occasional roughly 160 ms terrain updates despite a good median.
These are frame-stall candidates, distinct from positional shaking.

## Projects worth studying

### Veloren — entity continuity and simulation detail

Veloren's RTSim models activity outside loaded chunks. Its NPC controller
intentions feed either the abstract simulation or the loaded agent system.
The relevant lesson for Atlas is to keep an entity record and its behavior
independent of its render representation. See the [RTSim overview](https://docs.veloren.net/veloren_rtsim/index.html),
[NPC control documentation](https://docs.veloren.net/veloren_rtsim/rule/npc_ai/index.html)
and [simulation source](https://docs.veloren.net/src/veloren_rtsim/rule/simulate_npcs.rs.html).

Atlas-specific adaptation: retain seeded animal identities through loading
and LOD changes. Veloren's running simulation is not evidence of arbitrary
deterministic time seeking; Atlas must preserve its own date-query contract.

### Voxel Tools — deterministic spatial generation and planetary instances

Voxel Tools documents coordinate-seeded generation across block boundaries,
spherical instance orientation, separate block and mesh LOD, and placement
errors caused by coarse terrain. These are directly relevant to population
coverage and terrain anchoring. See [procedural generation](https://github.com/Zylann/godot_voxel/blob/master/doc/source/procedural_generation.md)
and [instancing](https://voxel-tools.readthedocs.io/en/latest/instancing/).

Atlas-specific adaptation: enumerate canonical cells plus their intersecting
neighbors, retain the same records as detail changes, and use the authoritative
surface query for anchors. This does not require converting Atlas to voxels.

### Terrain3D — spatial batches and foliage LOD

Terrain3D divides instanced foliage into 32 × 32 m batches for spatial culling
and supports authored detail levels. Its documentation also distinguishes
stored placement from camera-local particle decoration. See [foliage instancing](https://terrain3d.readthedocs.io/en/stable/docs/instancer.html)
and [mesh asset source](https://github.com/TokisanGames/Terrain3D/blob/main/src/terrain_3d_mesh_asset.cpp).

Atlas-specific adaptation: batch stable trees and shrubs spatially; reserve
ephemeral camera-local placement for expendable ground detail. Its documented
cell-level LOD switching can still pop, so it is not a complete seamlessness
solution by itself.

### Proland / Bruneton–Neyret — forest appearance across scales

The authors' forest research explicitly addresses large aerial forests and
transitions between individual-tree representations and distant terrain
appearance. See [the Inria research summary](https://rex-radar.inria.fr/report/2012/maverick/uid83.html).
The [partial Unity port](https://github.com/Scrawk/Proland-To-Unity) is useful
for planetary rendering and precision study, but its README limits it to
Unity 5.5 and lists terrain, atmosphere and ocean components; it should not
be mistaken for a current complete forest implementation.

Atlas-specific adaptation: derive distant canopy coverage from the same
population and match its density, color and silhouette to near geometry.
The old implementation is a research reference, not a drop-in web dependency.

For the precision issue, Godot's [large-world coordinate documentation](https://docs.godotengine.org/en/stable/tutorials/physics/large_world_coordinates.html)
also explains float-induced vibration and origin shifting. Atlas can retain
double-precision world coordinates while uploading small local offsets.

## Recommended architecture and repair order

1. **Canonical population records.** Enumerate every intersecting stable
   surface cell within the requested region. Give each organism a cell/index
   identity, dated species/genome, physical dimensions and terrain anchor.
   Camera pose selects records to load; it must not select a new population.
2. **Retained working sets.** Reconcile cells by ID. Use an inner demand region
   and larger retention/prefetch region. Keep existing instances until
   replacements are ready. Reserve room for motion bounds, cell extent and
   streaming latency rather than matching load radius to draw radius exactly.
3. **One explicit physical-time contract.** Ordinary exploration should advance
   physical seconds at 1×, with an intentional pause freezing motion. Time warp
   changes the rate. Seeking establishes an exact date; do not feed unrecorded
   wall-clock time into animal motion. Bookmarks and replay must identify the
   effective date used for the pose. An alternative decorative animation clock
   must be labelled as such and cannot silently replace world behavior.
4. **One specimen across representations.** Near rigs, middle meshes and far
   impostors must share genome, dimensions, pose and ground anchor. Use overlap
   transitions and separate enter/leave thresholds. Cache per-species geometry
   with compatible per-member parameters to retain batching efficiency.
5. **Small local render coordinates.** Use cell-local or camera-relative metre
   offsets for flora, fauna, bounds and instance transforms. Keep world/cell
   identity independent of origin rebasing. Measure projected-position changes
   around rebases and LOD transitions.
6. **Consistent distant forests.** Generate canopy summaries from the retained
   tree field. Switch representation with coverage fades rather than changing
   the physical size of organisms as the observer moves.
7. **Bound work and report actual drawing.** Keep generation, habitat queries,
   uploads and contact selection within explicit budgets. Prioritize nearby
   visible animals, retain overflow as entities, and count submitted instances,
   culled entities and budget drops separately. Record worst-frame stalls as
   well as medians.

## Acceptance needed before calling the repair complete

- Track one seeded animal ID from 280 m to 5 m and back. Its identity, genome,
  size and world pose survive each representation change.
- Approach it across several population-cell boundaries, leave and return,
  and change camera direction. Interior visible entities are never omitted by
  working-set refreshes or unsignalled instance-budget overflow.
- Observe normal-speed movement, deliberately pause it, then seek away and
  back to an exact date. Confirm the selected clock semantics and reproducible
  poses; distinguish body translation from leg animation.
- Measure small-object screen motion with a stationary camera and during
  controlled camera movement, origin rebasing and contact refinement.
- Fly through the same forest, land and walk without replacing its population.
  Compare actual pixels and matching silhouettes as well as candidate counts.
- Keep the memory cap and bounded queues while measuring p95, p99 and maximum
  frame intervals during sustained travel. Headset acceptance remains separate.

These should precede adding more scenery density or civilizations. The immediate
priority is making the existing organisms persist, move and render consistently.
