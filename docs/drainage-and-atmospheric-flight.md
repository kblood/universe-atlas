# Connected drainage foundations and atmospheric flight

Implementation record, 2026-09-13. This continues the
[reviewed planetary roadmap](fable-review-assessment.md) and
[ground-material release](surface-materials-and-survey.md).

## What is usable now

On an ocean-bearing solid planet, open **Drainage atlas → Analyse drainage**.
The orbital overlay shows coloured catchments, cyan proposed flow routes, amber
depressions, and the selected main route with white endpoint markers. Choose one
of the twelve largest catchments, use **Inspect basin**, or fly to its headwater
vicinity or coastal outlet. **Export drainage graph** saves the complete sampled
receiver graph, coordinates, original and conditioned elevations, areas, names
and addresses as JSON. The ordinary body export also includes its summary.

This is a coarse analysis map. It does not add physical river water, carve a
channel, fill a lake, or change terrain/collision. Its angular lines and coloured
regions are visibly cartographic. They fade between 120 and 50 km altitude and
are hidden below 50 km. The existing ground and surrounding system remain in
place when travelling to a mapped destination. Dry moons and gas giants have no
active-drainage UI. Reference geology remains unchanged when the date changes.

Atmospheric free flight now gently aligns the horizon to the planet. Use
**Atmospheric horizon assist** to disable or restore it; `horizon=0` retains the
disabled preference in a shared URL. Drag to look and WASD/QE retain their
existing movement controls. The assist corrects roll while preserving aim and
position. Pitch is still the pilot's choice. It does not simulate aerodynamic
forces or hold altitude.

## Drainage specification and generation

The fixed production grid has 64 subdivisions per cube-face edge, 24,578 unique
spherical vertices and 98,304 undirected neighbour edges. Integer cube coordinates
give shared ownership to face edges and corners; the poles are ordinary shared
surface locations. Horizontal, vertical and diagonal neighbours form a single
connected graph. Spherical triangle areas are distributed to their vertices,
avoiding an assumption that face-UV samples cover equal physical areas.

`src/drainage.ts` samples `terrain-1.1.0` exactly once per vertex, preserving a
separate immutable height array. Ocean samples seed a priority queue. A
Priority-Flood traversal raises the *conditioning field* across closed
depressions until they can reach an outlet. Queue order is conditioned height,
then stable node index. Each newly reached node records an earlier receiver.
The algorithm follows the graph-compatible approach described by
[Barnes, Lehman and Mulla](https://arxiv.org/abs/1511.04463); this implementation
uses a binary heap throughout, with O(N log N) work rather than the paper's
optional plain-queue optimization for filled interiors.

After flooding, a node prefers the steepest descent among earlier-ranked
neighbours. Flats retain their deterministic flood-tree receiver. Every receiver
has an earlier traversal rank, so paths cannot cycle. No tiny artificial height
epsilon is needed to encode the ordering. Contributing area accumulates in reverse
traversal order. Terminal totals equal the input spherical area; this is an area
conservation check, not a simulated water-volume or discharge calculation.

A catchment belongs to the last dry node before an ocean receiver. Upstream nodes
inherit that outlet address. The sampled main route follows the greatest
contributing-area child, with node-index tie breaking. For a dry closed-sphere
fixture, the lowest node is an explicitly terminal basin; the grid has no outer
map edge that can be mistaken for an ocean.

Conditioning depth greater than 5 m is marked amber. It identifies sampled
depressions affected by the fill operation, not confirmed lakes or their
shorelines. A sampled depression may contain smaller barriers, tributaries,
islands, groundwater losses or genuine endorheic basins that this model cannot
resolve. The full-wet drainage assumption would have to change for those cases.

## Identity and physical positions

The model version is `drainage-1`; its production resolution is part of an
address: `<body-id>/drainage-1/n64/outlet/<node-index>`. Catchment names derive
from the body seed and that address. Names are labels; IDs are the unique keys.
The twelve largest catchments are exposed in the compact UI, while the complete
node-to-outlet mapping is exported. Grid resolution changes require an explicit
new namespace/migration. Refinements should inherit coarse catchment ownership
and use child IDs, rather than renumbering established features.

The headwater waypoint is an actual dry terrain sample. The mouth waypoint is
refined between its dry node and ocean receiver toward the 12 m elevation on the
existing coast. It is a landing vicinity, not a surveyed real river mouth. The
flight helper approaches that direction and then begins the established 600 m
terrain cruise. Its existing angular arrival tolerance is 0.002 radians, about
10 km on the test planet, so arrival can be a short distance from the exact
waypoint. Landing can follow; it remains normal ground without a river mesh.

The model is independent of request order, LOD, observer position, current
daylight and UI date. Repeated same-seed exports are byte-identical in the tested
runtime. Cross-platform floating-point identity is not claimed. Future epochs
need explicit geology/hydrology histories: the current universal date must not
silently reinterpret this reference graph as evolving rainfall or liquid water.

## Rendering, ownership and budgets

`drainage-worker.ts` owns one analysis job, independently of the terrain worker.
Typed arrays transfer to the main thread. The worker terminates on completion,
failure, a 30-second timeout, or leaving the body. A failed analysis has an explicit
retry button. Disposed/failed owners reject late results.

`drainage-map.ts` owns one resident overlay with at most five draw calls:
catchment mesh, network lines, depression points, selected route and endpoint
markers. Indexed [Three.js BufferGeometry](https://threejs.org/docs/pages/BufferGeometry.html)
keeps the global overlay bounded. Selection releases replaced GPU buffers;
leaving the body disposes all map geometry and materials. Ordinary terrain jobs,
cache limits and texture channels are unaffected.

The diagram lies on a shell 21.5 km above the reference sphere at normal relief,
expanded with the relief helper, to keep analytical marks readable over terrain.
Its matrix follows the resident planet, including floating-origin, system-scale
and VR model transformations. It is not pickable physical scenery and has no
colliders. The shell disappears before ground flight can mistake it for water.

The map has a separate 16 MiB estimated residency budget. The test world uses
3,170,454 bytes of graph arrays and approximately 6,038,382 bytes including CPU/GPU
render buffers. The estimate conservatively counts a shared index array twice;
it excludes transient worker/JSON allocations, JS objects and graphics-driver
overhead. The fixed node count also bounds worst-case line buffers. There is no
unbounded cache of previously analysed worlds. This remains a desktop measurement,
not a demonstrated Quest performance budget.

## Atmospheric attitude control

`alignPlanetaryDown` in `planet-flight.ts` takes a quaternion, local radial up,
altitude, atmosphere depth and timestep. It projects radial up onto the camera's
view plane, measures the signed angle from camera up, and applies only a rotation
around the current forward vector. That leaves pitch/heading unchanged. Rotation
uses a normalized [Three.js quaternion](https://threejs.org/docs/pages/Quaternion.html).

Correction uses exponential convergence at 1.8/s, capped at 36 degrees/s. It is
fully active below 45% of the atmospheric height and smoothly fades to zero at
the top. Near vertical sight lines, it fades again because a horizon becomes
undefined. Neither latitude/longitude nor a global north direction defines its
frame; the same calculation works over both poles and cube-face seams.

The shared `atmosphereHeightM` matches the app's existing rendered atmosphere:
ocean-bearing solid planets, depth `min(80 km, 0.12 × radius)`. This is the current
visual proxy, not a complete atmospheric catalogue. Airless moons and space
receive no automatic roll correction. Future atmosphere records should replace
the proxy in one place. Autopilot, terrain cruise, staged landing/walking and
immersive headset poses retain their separate orientation owners.

For future ship or superhero control, keep this attitude assist separate from
desired acceleration, velocity, drag, lift, gravity and collision. Different
vehicles can consume the same radial frame with different turn rates and manual
bank controls. Preserving aim now avoids an implicit autopilot that would fight
the player's attempts to climb, dive or leave the atmosphere.

## Validation

The numerical suites cover connected reciprocal topology, spherical area,
unchanged rock samples, depression conditioning, cycle-free routing, contributing
area conservation, deterministic complete graphs and real dry waypoint positions.
Attitude tests cover poles, equator, bounded correction, preserved aim, atmosphere
exit, airless bodies, and vertical views without a forced flip.

`test:drainage` exercises map generation, on/off, basin inspection, all twelve
selections, time seeking, full export, flight to an outlet, landing, cold
regeneration and leaving while analysis is pending. `ATLAS_DRAINAGE_FAULT=1`
injects a worker failure and proves explicit retry. `test:atmosphere` creates
bank with real mouse drags, tests the switch, measures levelling, and checks that
space flight preserves orientation. Screenshots/reports remain under ignored
`test-results/`; final measured acceptance is recorded below.

### Measured acceptance, 2026-09-13

- All 31 numerical tests and the TypeScript/production build passed.
- Planet browser regression passed polar orbits, atmospheric descent, airless
  moon approach and terrain disposal. Peak sampled residency was 253/256 tiles,
  with no browser or terrain-worker errors.
- Hardware Chromium drainage acceptance, including injected worker failure and
  retry, passed with no browser errors. On the Maithea fixture, the worker took
  164.8 ms; 120 sampled frames had a 16.8 ms median and 19.9 ms p95 on an RTX 5090
  through D3D11. This is a desktop observation, not a portable frame-rate promise.
- The graph accounted for 3,170,454 bytes and the resident map for approximately
  6,038,382 bytes. Cycling all twelve selections stayed bounded. The outlet
  journey reached terrain cruise and landed 1,112 m from its waypoint, within
  the flight helper's existing angular tolerance described above.
- Cold regeneration produced the same full JSON SHA-256:
  `a308256782a559258d9d2166b703eff38f0eaee165e85199f1005f295327d53c`.
- Browser flight created a 25.8448-degree bank with real mouse input. Six seconds
  after enabling the assist, the remaining error was 0.000530 degrees; aiming
  direction and position were unchanged. Disabling it retained the bank, the
  preference survived a URL reload, and space flight did not level itself.
- IWER 2.4.0 Quest 3 stereo emulation passed controller navigation, map visibility,
  VR exit/re-entry and disposal after leaving the planet without browser errors.
  This does not replace a physical headset performance or comfort check.

### Published acceptance

The release is live at <https://dionysus.dk/webxr/IWSDK/universe-atlas/>; the
IWSDK index describes both additions. Entry HTML, JS, CSS, drainage worker and
this document were checked against their local SHA-256 values after publishing.
Both new browser suites also passed against the public HTTPS URL with no errors.
Live flight reduced a 25.8448-degree bank to 0.000529 degrees in six seconds.
Live drainage regenerated the same export hash above, built in 229.2 ms, and
sampled 16.7 ms median / 20.4 ms p95 frames on the same desktop GPU. The outlet
journey landed 203 m from the waypoint. Existing landing tolerance explains the
variation between runs; it does not change the deterministic destination.

Local screenshots and reports remain accessible under `test-results/`. After C:
ran out of space, this ignored directory was preserved on
`D:\IWSDK-review\universe-atlas\test-results-20260913` with a junction at its
original path; browser temporary files for the final checks used that drive too.
The interrupted documentation write was restored from the already built copy
before adding these results. Runtime source and test artifacts were preserved.

## Next physical hydrology step

The graph provides canonical coarse outlets and a way to inspect their quality.
It is not yet sufficiently resolved for channel carving: the test planet's mean
sample spacing is 117 km. Some intervening terrain rises above straight graph
segments. Filled regions also require a deliberate choice between lakes,
spillways, breaching and closed basins. These choices must become shared regional
data before terrain, material, collision and water rendering consume them.

Build deterministic sub-basins inside the fixed owners, reconcile their boundary
ports, and refine route profiles before carving. Preserve the old baseline or
offer an explicit geology version; update the visible terrain and contact mesh
together. Then add separate water surfaces with consistent shorelines. The
drainage-led terrain approach in [Génevaux et al.](https://perso.liris.cnrs.fr/egalin/Articles/2013-river-networks.pdf)
supports this ordering; the current graph is a foundation, not a reproduction of
that paper's finished terrain generator.

## Sources and provenance

Primary references are linked beside the relevant algorithms above, checked on
2026-09-13. The local `C:\LLM\Test\ai-game-prompt-pipeline.md` informed the scoped
specification and evidence-driven validation workflow; its third-party prompt
examples are not scientific evidence for the algorithms. The preserved
[Fable review](fable-5.1-plan-review.md) and
[checked assessment](fable-review-assessment.md) remain the design background.
Codex implemented and tested this increment. No model-generated art, external
assets, new dependencies, private uploads or checkpoint downloads were used.
