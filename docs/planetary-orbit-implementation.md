# Planetary orbit and pole-safe terrain

**Historical orbital milestone design.** For current flight, visibility,
`terrain-1.1.0`, 120 m clearance and terrain-following behaviour, see
[Connected exploration corrections](exploration-corrections.md). That document
supersedes the corresponding limits and implementation status below.

Implementation record, 2026-09-12. This document describes the shipped code,
its design rationale, controls, budgets, limitations, sources and validation.
See the [project README](../README.md) for the complete universe architecture.

## Scope and user-visible behaviour

Rocky planets and moons support continuous approach from the resident star
system to low orbit and an initial descent. The system's meshes, physical
positions and IDs remain resident. Planet focus does not create an isolated
planet scene. Existing universe/galaxy/system flight and stationary VR inspection
remain available.

Select a planet, choose **Visit / Explore**, then:

| Control | Behaviour |
|---|---|
| Approach low orbit | Continuous radial flight to `max(30 km, min(100 km, 0.03 R))` above reference radius. The camera then turns smoothly toward the horizon. |
| Descend to 10 km | Fly toward the selected body, stopping at 10 km above reference radius or 5 km above sampled terrain, whichever is higher. |
| Hold orbit | Follow a great circle at the current radius. The camera heading is transported with the motion; dragging looks around. |
| Release orbit / movement keys | Release assistance immediately; retain position and heading. |
| WASD, Q/E | Camera-relative movement. Q/E are camera down/up, not an absolute altitude command. |
| Wheel / Shift | Adjust the speed multiplier / boost free flight. The wheel also changes assisted orbit rate. |
| Escape | Stop flight without resetting position. |
| Terrain relief | Toggle physical height / 12x inspection exaggeration. Entering flight restores physical height. |

The HUD reports altitude above reference radius, clearance over sampled terrain,
latitude, movement speed and assistance state. Latitude uses the current fixed
planet-local Y axis. Shared URLs restore bodies, not arbitrary flight poses.

Guided orbit is kinematic exploration, **not** an orbital-gravity simulator.
Its base angular rate is 0.045 radians/second times the speed multiplier. It is
only enabled above the generator's maximum terrain height plus 5 km. Flight has
a 2 km minimum clearance over the sampled sea/terrain surface. This milestone
does not offer landing or ground walking. Stars and gas giants keep their
separate exclusion radii; solid-surface controls are not offered for them.

## Files and responsibilities

| File | Responsibility |
|---|---|
| `src/terrain.ts` | Existing `terrain-1.0.0` continuous geography; no catalogue or continent seed changes. |
| `src/planet-tiles.ts` | Pure cube projection, tile addressing, geometry, normals, parent interpolation and texture sampling. |
| `src/planet-worker.ts` | Dedicated worker generating tiles and transferring typed arrays. |
| `src/planet-renderer.ts` | Selection, parent fallback, horizon/frustum culling, resource installation, morphing, bounded cache and disposal. |
| `src/planet-flight.ts` | Quaternion free look and great-circle orientation transport. |
| `src/travel.ts` | Surface-aware clearance, existing automatic speeds and system boundaries. |
| `src/planet-atmosphere.ts` | Lightweight density integration for the visible atmosphere shell. |
| `src/main.ts` | Controls, integration with the resident system, approach assistance, depth range and diagnostics. |
| `tests/planet.test.mjs` | Determinism, face edges/corners, triangle orientation, poles and terrain clearance. |
| `tests/planet.mjs` | Actual UI-driven browser orbital/descent/moon route, resource bounds and screenshots. |

## Coordinate and identity contracts

The catalogue remains `atlas-1.0.0`. A terrain address is
`body.seed / terrain-1.0.0 / face / level / x / y`. Rendering relief is a separate
parameter and never changes catalogue elevation or collision heights.

Each face has `u,v` in `[-1,1]`; the following vectors are normalized:

| Face | Direction before normalization |
|---|---|
| +X | `(1, v, -u)` |
| -X | `(-1, v, u)` |
| +Y | `(u, 1, -v)` |
| -Y | `(u, -1, v)` |
| +Z | `(u, v, 1)` |
| -Z | `(-u, v, -1)` |

North and south lie at the centres of the +Y and -Y faces. No mesh triangle fan,
longitude wrap or texture singularity exists there. Equal cube-edge coordinates
produce the same normalized direction. The cube projection does have varying
area distortion; this implementation is not an equal-area projection.

Level L contains `2^L` tiles along each face axis. A tile maps its local `[0,1]`
coordinates into that face. All geometry, colour and normal samples use the
resulting direction, not an independently randomized tile. Generation order,
worker timing and cache eviction cannot change the sampled geography.

Patch vertices are stored relative to the patch-centre direction, in planet
radius units. The patch root scales them to the body's physical radius. Its
parent is the existing system body mesh. System floating-origin rebasing moves
the parent and therefore all patches together. Camera motion continues in the
existing metre-based system frame; GPU calculations do not subtract intergalactic
positions to resolve nearby terrain.

Focusing a body also rescales the entire resident physical system to one render
unit per 1,000 km. Positions, camera, orbit geometry and body radii receive the
same ratio; IDs and SI coordinates are preserved. This avoids depth stippling
from using logarithmic depth on planets much smaller than one render unit.
Leaving body focus restores the system overview's physical render scale. Camera
near distance adapts to terrain clearance and the far distance covers the system.

The local planet axes are fixed in this milestone. Axial tilt, spin, seasonal
climate, longitude-based landing bookmarks and moving surface reference frames
are future additions. Adding them must rotate terrain, collision and atmosphere
together and explicitly version any geographic changes.

## Geometry, coastlines and seams

Each patch has a 33x33 surface grid (32x32 cells), outward-facing triangles and
four duplicated edge strips forming inward skirts. The sampler's seafloor is
retained, while ocean geometry is clamped to sea level. Water is currently part
of the terrain surface, without a separate wave mesh.

Normals use fixed direction-space finite differences of the same elevation
field. They are independent of face and mesh triangulation, avoiding different
lighting on either side of an edge. Texture tiles have 64x64 interior texels
and one gutter texel on every side: 66x66 RGBA bytes. Texel centres and UVs are
matched so filtering samples the same field across tile boundaries. They use
linear filtering; mipmaps and a material atlas are not implemented yet.

Children start on the parent's actual triangle interpolation and morph toward
their sampled positions over 0.22 seconds. Skirts hide temporary T junctions and
different-detail boundaries. The skirt depth includes conservative curvature
and elevation terms. Equal-level surface edge samples agree to numerical
precision; this is not a fully stitched, one-level-balanced quadtree.

Remaining visual limitations: parent-to-child colour resolution changes and
coarsening can still be perceptible, especially at boosted speed. Skirts are a
practical crack cover, not a proof of watertight topology. Before ground travel,
add balanced neighbours, explicit edge stitching, tighter error bounds and
material blending. Existing noise describes continents and ridges, not metre-scale
geology, drainage, erosion, vegetation or a physically simulated climate.

## Selection, scheduling and memory

The renderer starts with all six coarse roots. Until all are prepared, the
existing globe remains visible. After that, parent patches stay visible until
all four replacement children exist. More detail never requires a loading screen.

Selection ranks visible patches by projected span using camera distance, field
of view and viewport height. This is a conservative **detail heuristic**, not a
measured bound on terrain screen-space error. It includes horizon rejection and
frustum tests; XR considers both eye frusta. A future measured geometric-error
hierarchy can replace this estimate without changing tile addresses.

| Budget | Current implementation |
|---|---|
| Detailed planets | One; changing focus terminates/disposes the old tile renderer. |
| Worker | One dedicated terrain worker; at most two tile jobs in flight. |
| GPU resource installation | At most two completed tiles per animation frame. |
| Cache | At most 256 resident plus in-flight tile entries. |
| Selected leaves | At most 150 desktop / 102 XR, including coarse fallbacks. |
| Maximum quadtree depth | 12; practical refinement is also limited by the leaf budget. |
| Texture | 66x66 RGBA per patch, no global close-up texture escalation. |
| Geometry | 1,221 vertices and 2,304 triangles including skirts per patch. |
| Target projected patch span | 260 pixels desktop / 360 XR. |

At the cache limit, raw tile buffer payload is about 21 MiB; CPU/GPU copies,
driver allocations, materials and retained preview maps add overhead. The desktop
leaf cap corresponds to at most 345,600 terrain triangles, before the other
system objects. These are resource caps, not frame-rate promises. Actual headset
performance still needs physical-device profiling.

Older unused tiles are evicted, with current parents and requested children
protected. Worker errors retain the available coarse surface. Failed tile keys
are not repeatedly retried during that renderer's lifetime; refocusing retries.
Navigation or focus changes terminate the worker, discard completions, dispose
tile geometry/materials/textures and restore the original body material.

Current scheduling prioritizes the present camera view. Velocity-predicted
prefetching, GPU mesh pooling, texture arrays, time-budgeted generation batches
and exact terrain-error data are future optimizations. The existing system-scale
worker can still pause a scale crossing until its data is ready; planet tile
generation itself never blocks movement waiting for detailed terrain.

## Camera and collision behaviour at the poles

Free look composes rotations about camera-local axes with normalized quaternions.
It does not reconstruct pitch/yaw from global Euler angles or clamp pitch at the
north/south direction. Guided orbit rotates position and heading by the same
great-circle quaternion. Looking across a pole therefore preserves orientation.

Clearance samples the normalized body-relative direction and computes reference
radius plus visible terrain elevation. A bounded cache holds 32 sampler closures.
Movement steps are capped by proximity and corrected back above the exclusion
surface if needed. This remains kinematic sampled-height collision, not a swept
mesh collision solver. The 2 km floor and bounded step are appropriate to the
orbital milestone; ground travel requires tighter collision and loaded-tile
error bounds.

## Atmosphere and lighting

Ocean-bearing planets receive an atmosphere shell. Its height is
`min(80 km, 0.12 R)`, with an exponential scale height of one eighth of that.
The shader samples eight points along a ray through the shell, clipping the ray
against the reference sphere, and estimates sunlight from the primary star.
Moons and dry worlds currently have no shell. This assignment is a visual
placeholder, not a scientifically generated atmospheric composition.

This is a lightweight single-scattering approximation. It does not implement
Bruneton's lookup tables, ozone, multiple scattering, clouds, weather, physical
ocean reflectance or ground-level aerial perspective. Surface illumination still
uses the system's existing simplified light; XR keeps inspection lighting.
The shell uses the eye-centre approximation in XR. Treat these limits as future
work, not physically accurate planetary atmosphere simulation.

## Verification and reproducibility

Run from `universe-atlas`, with the preview server on port 5186:

```powershell
npm test
npm run build
npm run preview
# Another terminal:
npm run test:planet
npm run test:browser
npm run test:travel
npm run test:continuous
npm run test:vr
```

The planet route uses seed `LETHRA-001`, galaxy `G001`, system
`G001/C2128,0,1/0`, ocean planet `.../planet/1` (Maithea), and its first moon.
It checks actual browser camera positions during a polar circuit, body-object
identity retention, bounded cache/worker counts, UI descent and resource disposal.
Screenshots and numeric results are under `test-results/planet/`. Software
WebGL timings are diagnostic only; they do not establish GPU or Quest frame rates.
Test results and any final caveats are recorded in `planetary-orbit-validation.md`.

## Sources and attribution

Sources checked 2026-09-12. The implementation is original project code;
these links document architectural principles and API contracts, not imported
terrain assets or copied shader implementations.

1. [Cesium Native tile selection](https://cesium.com/learn/cesium-native/ref-doc/selection-algorithm-details.html).
   Reference for view-dependent refinement, visibility and preserving available
   detail during streaming. Cesium uses measured geometric errors and more
   sophisticated fallback traversal. Our simple all-children-ready rule is an
   explicit tradeoff; it is not Cesium's exact algorithm.
2. [Three.js BufferGeometry](https://threejs.org/docs/pages/BufferGeometry.html).
   Reference for indexed typed vertex attributes and explicit resource disposal.
   This repository remains pinned to `super-three@0.181.0`; latest online docs
   are not an instruction to upgrade that dependency.
3. [Three.js Quaternion](https://threejs.org/docs/pages/Quaternion.html).
   Reference for composing axis-angle rotations, interpolation and normalization.
   Cube-face mappings and great-circle transport are derived directly from vector
   geometry in this implementation and covered by tests.
4. [MDN: Using Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers).
   Reference for background execution, transferable buffers and worker lifetime.
5. [Eric Bruneton: Precomputed Atmospheric Scattering](https://ebruneton.github.io/precomputed_atmospheric_scattering/).
   Research reference for a future physically richer atmosphere. The current
   eight-sample shell is not a port or claimed implementation of this method.
6. [Three.js WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html).
   Reference for depth settings, shader diagnostics and renderer resource counters.
   The installed `three/src/renderers/shaders/ShaderChunk/logdepthbuf_vertex.glsl.js`
   and `logdepthbuf_fragment.glsl.js` were also inspected: their logarithm uses
   `1 + clip-space w`. Rescaling small planetary render coordinates addresses
   observed close-view depth artifacts without changing physical distances.

Earlier universe research, design decisions and build prompts remain in
`../../docs/procedural-universe-research-2026-09-12.md`,
`../../docs/procedural-universe-build-prompts-2026-09-12.md` and
`../../docs/universe-atlas-v1-spec.md`. This document supersedes their planet
rendering implementation status where it differs, without changing the catalogue
specification or implying that planned ground-level features are finished.
