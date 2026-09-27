# Atmospheric entry and local planetary rendering

Design and implementation record, 2026-09-27. The regional flight and clock
changes below are implemented in the working source. Validation results belong
to the accompanying test reports; this document does not certify deployment.
Complements the
[population continuity review](population-continuity-review-2026-09-27.md).
The existing time and coordinate contract remains authoritative for world
identity, date, existence and body transforms.

## Implemented regional flight and clock

- `planet-flight.ts` supplies the metre-rendering entry/exit thresholds: below
  20 km terrain clearance uses one render unit per metre; above 40 km returns
  to system rendering units. The intermediate band retains the current units.
- `main.ts` preserves the physical camera pose during scale changes and shifts
  the system origin within 256 m during ordinary regional flight. Walking uses
  its existing 128 m render-origin threshold and smaller local physics frame.
  Geometry still requires tile or instance anchors before Float32 upload.
- `travel.ts` replaces the 120 m ground floor with a 1.64 m observer eye
  clearance. A deliberate descent starts automatic touchdown only within
  12 cm of that contact height. Waiting for collision holds the current view
  height; automatic contact preserves heading.
- Flight speed reaches a 0.8 m/s base speed near the surface, with a continuous
  cap on boosted low flight. `sweptTerrainStep` samples the requested path in
  at most 16 segments and uses eight refinements when contact is found. It
  shortens travel to fit the sampling budget. This is a bounded sampled sweep,
  not exact collision against arbitrarily thin geometry or decorative objects.
- Ordinary local flight can use a 3 cm near plane. The existing logarithmic
  depth buffer still covers terrain and the distant system.
- Desktop exploration advances the authoritative epoch at one second per
  elapsed second, independently of the capped physics timestep. Wildlife and
  weather receive that date. Pause and explicit seek remain paused until
  resumed; accelerated inspection playback retains its separate controls.
- The focused body supplies the navigation reference frame. Its orbital
  translation carries the observer without changing the body-relative pose.
  Crossing a dated planet lifecycle stage uses the existing seek/fallback
  policy, including leaving ground that no longer exists.
- `world-surface.ts` reuses immutable terrain queries across clock ticks when
  the body, hydrology references, canonical river references, ocean availability
  and snapped ocean height match. Exact lifecycle, environment, ecology and
  date resolution remain outside that cache.

### Contact support under cloud memory pressure

The retained terrain frontier now protects mandatory contact parents from
coarsening. Previously, a high-priority fine capsule tile could make its own
base support ring eligible for merging, producing repeated coarsening and
refinement while level-22 contact waited indefinitely.

Selection estimates use the resident terrain height lattice rather than
calling the full procedural geology for every leaf and parent. Contact
priority uses surface angular distance; collision still uses settled terrain
triangles. Coarsening scans at most 64 parents per frame with a cooperative
1.5 ms slice and a retained cursor. Refinement retains its cooperative 3 ms
limit, with at least one operation allowed for forward progress. Frame time
also includes bounded frontier bookkeeping, uploads and drawing preparation;
these slices are not hard total-frame deadlines.

Desktop retains the 256 MiB core terrain/life/water working-set budget and
allows a separate cloud allocation capped at 160 MiB, for 416 MiB combined.
Immersive mode keeps a 256 MiB combined budget and its smaller ordinary draw
limit. This preserves desktop collision headroom at large display resolutions
without reducing ground resolution during approach. Subsystem accounting does
not include every browser or driver allocation.

`tests/terrain-streaming.mjs` exercises actual cloud allocations and simulated
21 MiB / 96 MiB / 160 MiB allocations. It requires fine support, retained contact over
90 further frames, balanced 2:1 neighbours, the 450-leaf contact cap, and the
combined allocation bound. Current measured outcomes belong in its test report.

### Remaining architecture and acceptance

A separate background depth pass for distant space has **not** been introduced.
The existing spherical adaptive terrain tree, horizon/frustum culling and
coarse ancestors still supply regional terrain and horizon coverage. A fully
separate background/local pass needs explicit terrain overlap ownership and
cloud-depth handling, followed by desktop and stereo acceptance.

Population continuity and cloud rendering are implemented in their own modules
and documented in the population/cloud review records. Their integration and
performance results must be judged by the current validation report rather
than inferred from these flight changes. In-headset acceptance is separate.

## Original audit findings (before this implementation)

- `main.ts:updateFlight` already changes `systemUnit` from `1e-6` to `1`
  below 2,000 m terrain clearance, and back above 10,000 m. Between these
  thresholds it retains the previous scale. `rescaleSystem` transforms the
  entire resident system, camera and clipping distances. This preserves
  physical pose in principle, but cannot recover precision already lost in
  planet-relative Float32 instance data.
- `travel.ts:surfaceClearance` imposes a 120 m floor above solid terrain.
  The main flight loop clamps movement against it. Automatic landing begins
  below 125 m when its conditions are satisfied. Difficulty descending is
  therefore also a navigation issue; changing render scale alone is insufficient.
- `planet-renderer.ts` already uses horizon and frustum culling with a bounded
  adaptive tile tree. It does not draw the whole globe at ground resolution.
  It does retain global roots/ancestors and uses a planet-normalized interface.
  Contact selection can restart from the roots and lacks the ordinary flight
  selection time cutoff. Local rendering should reuse these terrain fields
  and tile identities while making selection and precision consistently local.
- Atmosphere rendering exists. `planet-clouds.ts:createCloudShell` currently
  draws a transparent textured sphere at 8 km on solid worlds; it provides no
  cloud thickness to fly through. Coverage is seeded and dated. Atmosphere
  availability is currently a water/type-based heuristic.
- Trees, small plants and animals have different preparation distances and
  coordinate paths. Some detailed life only starts below 350 m. Atmospheric
  entry currently does not coordinate those working sets.

## Coordinate contract

Physical sizes and world positions remain continuous. A tree has the same
height in metres in orbit, atmospheric flight and walking.

Maintain authoritative body-relative positions in double precision, with a
nearby origin and an orthonormal local frame. For a world point `P`, origin
`O`, and world-to-local rotation `R`, compute `R * (P - O)` before converting
to GPU Float32 data. Subtracting two planet-scale Float32 values in a shader
is too late. Chunk vertices can remain relative to stable chunk origins;
compose chunk-to-camera offsets in double precision before upload.

Use one render unit per metre in the local scene. Shift its origin within a
bounded distance of the observer; rebase terrain, water, instances, rigs,
collision, particles, culling bounds and camera coherently in the same frame.
Rebasing changes no organism ID, date, generator seed or physical velocity.
Retain spherical geometry and curvature; a local frame is not a flat planet.

## Continuous entry

The cloud deck is a useful visual landmark for entering the surface view.
Preparation must begin above it, and entry must work through clear weather.

| Phase | Rendering and streaming responsibility |
| --- | --- |
| Orbital | Coarse globe, orbital atmosphere/cloud coverage and distant space. Prepare regional terrain based on projected size and approach velocity. |
| Atmospheric preparation | Load the approaching region, adjacent cells and terrain ahead of travel. Begin local metre rendering while retaining coarse coverage wherever fine data is unavailable. |
| Regional flight | Local terrain, water and population batches own detailed drawing. Coarse curved terrain supplies the distant horizon; space remains a background representation. |
| Surface contact | Continue the same region and entities. Refine collision/near detail before touchdown and retain flight control until actual contact or an explicit landing command. |

Use an overlapping altitude band with distinct entry/exit thresholds. Thresholds
depend on body size, relief, cloud heights, projected error and streaming lead
time. The existing 8 km deck is a starting reference, not a universal boundary.
Airless worlds use the same geometric preparation policy without clouds.
Gas giants have atmospheric rendering without a solid-ground landing path.

Handoff requires useful regional coverage, including collision support ahead
of descent. Missing fine tiles retain their coarse parents. Coverage ownership
and compatible morphing prevent double surfaces, cracks and depth fighting.
The camera pose, heading, FOV and physical velocity stay continuous during
handoff and on ascent. No reset to an independently generated surface scene.

## Render the visible region at appropriate detail

Detailed generation covers the local visible terrain plus a retention and
prefetch margin. Selection uses stable surface tiles across cube-face edges,
not a newly seeded camera-centred patch. Retain adjacent cells when moving
between sectors. Trees and animals follow the same identity rules from the
population review.

Keep a cheap horizon representation because a nearby square of terrain cannot
represent distant mountains or the view from altitude. For a spherical surface,
the geometric line-of-sight horizon distance is `sqrt(h * (2 * radius + h))`;
relief and actual visibility require conservative expansion. This gives scale
to the far coverage requirement, not a demand for fine geometry everywhere.
Cull the far side and regions outside the view. Retain coarse ancestors needed
for fallback without refining them solely because they exist in the tree.

Separate distant space depth requirements from local metre geometry. A proposed
background pass supplies stars, distant bodies and coarse planetary coverage;
local geometry overlays the region it owns. Define terrain overlap masks and
sky/atmosphere occlusion explicitly before introducing independent depth
buffers. Clouds crossing local mountains need compatible depth information.
Stereo views must share the same world frame and streaming decisions.

## Atmosphere and clouds

Reuse the seeded, dated coverage field for both orbital and regional clouds.
Add cloud base/top heights and a bounded regional thickness representation,
with an adjustable quality budget. It must allow broken clouds, clear areas,
views from above/below and flight through a cloud volume.

Atmospheric haze reduces distant contrast continuously. Cloud opacity follows
weather coverage and path length. Neither should suddenly cover the screen at
a render-mode threshold. The handoff must be acceptable with clouds disabled;
clouds provide atmosphere and visual continuity rather than a loading gate.

## Flight and work budgets

Velocity, clearance and sweep distances use physical metres and seconds,
independent of active render units. The implemented sampled sweep follows the
dated visible surface, replacing the fixed 120 m floor and 125 m landing
trigger. Near-ground speed and per-frame travel are bounded. A future vehicle
with a larger hull needs its own swept volume; the current boundary matches
the on-foot observer eye height.

Regional preparation accounts for travel speed and expected worker latency.
Bound generation, upload and selection work, including contact selection.
Maintain coarse fallback during delayed work, prioritize imminent collision
and visible tiles, and retain completed region data across entry/exit.
Use the same world date for terrain, weather and population queries; reject
stale worker results after a body/date change.

## Architecture sequence and acceptance

1. Introduce the local frame and coherent transforms for every surface renderer,
   including culling and collision. Measure precision during origin shifts.
2. Add retained regional tile/population selection with bounded contact work.
   Repair organism identity and LOD continuity from the companion review.
3. Implement orbital/regional coverage handoff and local clipping/depth policy.
4. Replace the fixed flight floor and early landing trigger with continuous
   surface flight and swept contact handling.
5. Extend clouds to regional thickness and consistent atmospheric blending.

Acceptance includes orbital descent, low flight, touchdown and ascent on the
same world; clear and cloudy conditions; airless worlds; mountains; poles and
cube seams; slow and boosted approaches; delayed worker completion; date seeks;
and following the same tree/animal through region, origin and LOD transitions.
Record physical pose continuity, projected jitter, actual submitted instances,
memory/queue bounds and frame-time tails. Desktop and headset acceptance are
separate. These remain acceptance requirements; consult the current test reports
for measured outcomes and failures.
