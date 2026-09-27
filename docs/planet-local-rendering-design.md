# Atmospheric entry and local planetary rendering

Design, 2026-09-27. Proposed architecture; no runtime changes are implemented
by this document. Complements the
[population continuity review](population-continuity-review-2026-09-27.md).
The existing time and coordinate contract remains authoritative for world
identity, date, existence and body transforms.

## Findings in the current code

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

Express velocity, acceleration and clearance in physical metres and seconds,
independent of the active render units. Replace the fixed 120 m flight floor
with a swept collision policy based on the observer/vehicle volume and actual
dated terrain. Use a controlled braking distance and continuous local speed
curve; account for mountains ahead, not only terrain directly underneath.
Do not automatically begin a descent animation at 125 m.

Regional preparation accounts for travel speed and expected worker latency.
Bound generation, upload and selection work, including contact selection.
Maintain coarse fallback during delayed work, prioritize imminent collision
and visible tiles, and retain completed region data across entry/exit.
Use the same world date for terrain, weather and population queries; reject
stale worker results after a body/date change.

## Implementation sequence and acceptance

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
separate. These are planned checks, not results of this design review.
