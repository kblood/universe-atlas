# Connected exploration: visibility, manual flight and terrain

Current implementation record, 2026-09-12. This supersedes the flight visibility,
terrain limits and atmosphere status in the original
[orbital milestone design](planetary-orbit-implementation.md).

## Problems reproduced and corrected

The previous browser routes mostly exercised explicit selection and autopilot.
They did not establish that ordinary mouse/W flight was practical, that unresolved
objects produced visible pixels, or that the terrain had useful local detail.
The user's report exposed those gaps.

| Problem | Cause in the previous code | Correction |
|---|---|---|
| Galaxies barely visible from the starting universe view | Physical galaxy extents projected to tiny images at Mpc viewing distances. | Galaxy silhouettes retain at least a 22-pixel radius on desktop. Their centres stay at actual catalogue positions; enlargement fades out naturally on approach. Brightness and point-size limits keep shapes readable. |
| W flight does not follow the apparent centre of the screen | The inspection camera retained its horizontal view offset during flight. | Free flight clears that offset and shows a centred reticle. Inspection restores its offset. |
| Star disappears before system entry | Galaxy near plane was fixed at 0.02 ly, while the default system-entry boundary is 300 AU, about 0.0047 ly. | Near clipping decreases with the nearest star's distance and remains positive. |
| Very close map star differs from its actual catalogue position | Galaxy anchor positions were stored as galaxy-wide float32 values. | Rebase the same anchor buffer from double-precision catalogue positions relative to the current origin. |
| Tiny aim correction selects another star | A small drag could also trigger the click-selection handler. | Flight look gestures suppress click selection, even below the old five-pixel click threshold. |
| Releasing the mouse interrupts held W | A global pointer-up handler deleted W for both touch and keyboard input. | Track touch forward separately; releasing a look drag leaves keyboard movement active. |
| Fast frame passes an approaching system | Travel could step past the small entry region before a new distance check. | Swept proximity checks shorten a step before close passage; near-star motion is bounded by distance. |
| Star system appears empty on arrival | Distant physical bodies can be subpixel, and a fixed far plane could clip the entire system at its entry boundary. | Far clipping covers the physical system, and one batched set of unresolved-object beacons remains visible at actual body centres. |
| Defensive clipping calculation | An empty planet list would produce an infinite minimum radius. The current catalogue always generates at least one planet, so this is not a reproduced user failure. | Include stars when calculating the smallest relevant body radius; star-only catalogue generation remains future work. |
| Descent still looks like an orbital globe | The floor was 2 km, terrain mostly had global wavelengths, and broad patches could consume the refinement budget. | 120 m free-flight floor, kilometre-scale geometry, nearest-patch prioritization, deeper local refinement, and a 600 m terrain-following helper. |
| A nearby world does not become the active terrain body | Automatic focus only activated from system view, so a currently focused star could prevent a close inner planet or moon from taking focus. | Proximity can switch directly to a different nearest body while preserving the flight pose and resident system. |
| Atmosphere remains a space-view rim | Shell rendering alone did not add aerial perspective to ground fragments. | Add height-dependent terrain haze and stronger daytime sky opacity from inside the shell. |

## How to explore

At universe level, choose a visible galaxy or fly toward it. Galaxy silhouettes
are navigation representations, not literal-size images or photometric models.

Inside a galaxy, select a star, centre it with a drag, and hold **W**. The reticle
is now aligned with the camera's forward direction. When a selected star is
within about two degrees of that direction, gentle heading assistance keeps it
aligned while W is held. The HUD reports alignment. You can also use **Fly to
selection**, or fly without selecting a target and steer manually. Physical
system entry still happens at the catalogue position; there is no teleport to
an arbitrary marker.

Inside systems, unresolved stars, planets and moons retain bright navigation
points until the real meshes become large enough to read. Star beacons are 18
pixels, planet beacons 10, and moon beacons 7 before pixel-ratio scaling. They
fade as the physical disk resolves. Very distant planets and moons may share
nearly the same direction; their names and counts remain accessible in the
catalogue. Overlapping text labels are suppressed rather than piled up.
These beacons do not enlarge collision surfaces or move orbital positions.

For a solid planet or moon, **Fly over terrain** is the primary action at the top
of the inspector. It chooses a deterministic nearby land site, preferring the
illuminated side, climbs or approaches at a safe height, then descends continuously.
The helper starts flying 600 m above sampled terrain at 250 m/s. The wheel changes
speed; dragging looks around. **WASD / Q / E** releases assistance and preserves
the current pose. **Escape** stops flight. The low-altitude HUD and caption show
terrain flight and actual clearance.

The helper's terrain-following path is kinematic and follows the sampled height,
including hills and valleys. It is not a vehicle with inertia or gravitational
orbital mechanics. The ordinary **Hold orbit** helper still follows a constant
radius above all terrain. Free flight can descend to 120 m clearance; this build
does not provide landing, walking or collision with individual rocks/trees.

## Geography and terrain detail contract

The catalogue stays `atlas-1.0.0`. Names, body records, orbital positions and
macro continent seeds are unchanged. Terrain is explicitly advanced to
`terrain-1.1.0` because local height and colour samples have changed.

The existing continuous 3D direction field now adds land detail at wavelengths
of 6,500 m, 1,400 m and 260 m. The respective maximum height contributions are
620 m, 130 m and 22 m. For ocean planets, these positive height additions fade to
zero over the first 700 m of existing land elevation. They do not create land in
ocean samples or move the zero-elevation coastline. Dry worlds also receive
local relief. An 800 m colour variation helps distinguish local surfaces.

All geometry, materials and collision queries use the same sampler. Surface
detail is independent of tile identity, traversal order, worker timing and
camera altitude. Pole handling remains the cube-sphere direction mapping and
quaternion orientation transport. The terrain-site approach also transports its
up vector along the approach arc rather than recalculating geographic north.

This is still procedural noise terrain. It does not claim erosion-derived
drainage, sediment simulation, biomes populated with plants, rock objects,
weather or a scientifically complete climate.

## Refinement and resource limits

The renderer still retains six coarse roots and keeps parent geometry until all
replacement children are available. It now estimates distance to the closest
point in a tile's face-coordinate bounds for refinement priority. It no longer
assigns the same extreme priority to every oversized bounding sphere that
contains the camera. This gives nearby ground priority over broad distant areas.

The maximum address depth is 16. In the first successful low-flight route the
camera reached level 10, versus level 6 in the previous orbital implementation.
Actual depth depends on planet size, altitude, view direction and budgets.
Each patch still has a 33x33 surface grid plus edge skirts. Texture interiors
are 64x64 below level 8 and 128x128 from level 8, with one gutter texel per edge.

| Resource | Bound |
|---|---|
| Detailed worlds | One |
| Resident plus pending terrain tiles | 256 |
| Pending tile jobs | Two, in one dedicated worker |
| Resource installations per animation frame | Two |
| Selected leaves | 150 desktop / 102 XR |
| Maximum address depth | 16 |
| New system beacons | One draw call for the resident system |
| Cached terrain-sampler closures | 32 |

The larger close-up textures increase the worst-case raw tile-buffer payload to
about 33 MiB if all 256 entries used that size. CPU/GPU copies, driver allocations
and fallback previews add overhead. This is a bounded resource design, not a
measured Quest memory or frame-rate guarantee.

Remaining limitations include visible coarsening during fast travel, skirts
instead of a fully balanced stitched mesh, no velocity-predicted tile prefetch,
and simplified sampled-height collision. Very fast terrain following can expose
coarse patches. Hardware profiling and tighter geometry/error bounds are needed
before ground walking or high-speed vehicles.

## Atmosphere and precision

The existing single-scattering shell remains a lightweight approximation for
ocean-bearing planets. Surface materials now mix distant ground lighting with
an atmospheric tint using view-path distance and mean altitude. The inside-sky
opacity increases on the day side, so the scene reads as an atmosphere rather
than the same star-filled orbital sky. Airless moons omit those effects.

This is not Bruneton multiple scattering, a cloud system, physical composition
generation or full optical integration along each surface ray. The approximation
is explicit and shares the planet's coordinate frame and primary-star direction.

System rescaling near worlds remains one render unit per 1,000 km. Floating
origins preserve physical camera positions, and logarithmic-depth shader chunks
are also used by the new beacons so they agree with opaque body depth.

## Verification

Run `npm test`, `npm run build`, and `npm run preview`, then:

```powershell
npm run test:exploration
npm run test:browser
npm run test:continuous
npm run test:travel
npm run test:planet
npm run test:vr
```

`tests/exploration.mjs` uses actual mouse drags and held W, never camera mutation
or the destination autopilot, to reach a selected star. It checks rendered pixel
brightness around universe galaxies and system beacons; clipping ranges;
land-site descent; physical movement during terrain following;
clearance; retained body IDs; cache bounds; and held-W behaviour after releasing
the mouse. Its diagnostics API is read-only. Screenshots and numeric reports are
saved under `test-results/exploration/` and `test-results/live-exploration/`.

The first successful development route entered `G001/C-254,-386,-688/0` by manual
flight, reached land on Maithea with level-10 patches, and maintained 600 m ground
clearance while travelling. Resident tiles increased from 218 to 226, within the
256-entry bound, with no browser or worker errors. Final regression results are
recorded below; production reports are retained separately in `test-results/`.

Software WebGL screenshots demonstrate behaviour and appearance, not hardware
frame rate. VR remains stationary model inspection and is checked with IWER;
physical-headset performance and atmospheric free flight in VR are not claimed.

## Sources

Sources checked 2026-09-12. No external textures, meshes, checkpoints or generated
art assets were imported. The runtime remains pinned to `super-three@0.181.0`.

- [Three.js PerspectiveCamera](https://threejs.org/docs/pages/PerspectiveCamera.html):
  near/far validity, view offsets and projection-matrix updates. The offset and
  clipping failures above were established from local code and browser tests.
- [Three.js ShaderMaterial](https://threejs.org/docs/pages/ShaderMaterial.html):
  custom attributes/uniforms for the batched beacon and terrain-haze shaders.
- [Three.js BufferGeometry](https://threejs.org/docs/pages/BufferGeometry.html):
  updating the existing anchor buffer from rebased catalogue positions.
- [Cesium Native tile selection](https://cesium.com/learn/cesium-native/ref-doc/selection-algorithm-details.html):
  background for refinement and available-parent fallback. Our tile-distance
  heuristic is not a measured Cesium screen-space-error hierarchy.
- [Bruneton atmospheric scattering](https://ebruneton.github.io/precomputed_atmospheric_scattering/):
  research reference for later atmosphere work, not the implementation used here.
- The original [orbit implementation and source list](planetary-orbit-implementation.md)
  documents worker transfers, cube-face mapping, normal continuity, skirts and
  quaternion transport. The current changes and limits above take precedence.

## Validation results — 2026-09-12

- TypeScript and Vite production build passed; 16 pure catalogue/terrain tests
  passed. Catalogue digest remains
  `884c207e57d282f4a3019aa6e6d59c742cc476cfce4d87dea8a3bbd693ae1ce8`.
- Browser hierarchy/mobile/cleanup, continuous galaxy navigation, cross-galaxy
  travel, planetary orbit and IWER VR suites passed without browser errors.
- The final local exploration route entered `G001/C-254,-386,-688/0` using
  mouse/W input. All sampled starting-view galaxy centres and system beacons
  contributed visible pixels. Terrain following traversed land at 600 m
  clearance, with level-10 geometry and 218–226 resident tiles, zero pending
  jobs at the sampled endpoints, and no worker failures.
- The polar route reached 89.867 degrees north and 89.926 degrees south. Its
  constant-radius orbit drift was approximately 0.000033 m; the peak sampled
  cache held 253 tiles. Moon approach and terrain descent passed as well.
- IWER exercised 482 stereo frames, body approach, VR exit and re-entry. This
  validates integration only; no Quest hardware frame-rate claim is made.
- Browser reports and screenshots are in `test-results/`; the production replay
  uses the same exploration test with `ATLAS_URL` set to the deployed app and
  `ATLAS_RESULTS=test-results/live-exploration`.

The current generator always creates at least one planet per system. A proposed
star-only browser fixture was therefore removed instead of altering catalogue
generation or claiming coverage for an unreachable case.
