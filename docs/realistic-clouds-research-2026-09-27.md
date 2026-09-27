# Realistic clouds for continuous planetary flight

## Current direction — 2026-09-27

The [desktop realism plan](desktop-realism-implementation-plan-2026-09-27.md) retains full-resolution desktop clouds as the baseline while adding an AA/depth audit and shared lighting work. Reduced-resolution reconstruction needs the earlier checker artifact resolved. This research report’s measurements do not establish whole-game desktop performance.

Research and implementation notes, 2026-09-27. See also the
[local rendering design](planet-local-rendering-design.md) and
[population continuity review](population-continuity-review-2026-09-27.md).
Validation results are recorded separately; a convincing still image does not
establish stability in flight or headset performance.

## Decision

Use a spherical volumetric density field with ray integration, sunlight
extinction, approximate multiple scattering, distinct vertical profiles,
terrain depth clipping and matching ground shadows. Evaluate the same seeded,
dated field above, below and inside clouds. Keep detailed computation bounded
to rays through visible cloud regions. Maintain metre-based world dimensions.

The first implementation uses procedural volume textures and a weather map.
It has no frame-history reconstruction. This is a deliberate initial quality
choice for fast camera movement and date seeking; it can be revisited after
measuring actual image stability. Fully simulated weather and voxel-authored
storms remain separate, larger projects.

## Techniques considered

| Technique | Strength | Limitation for Atlas | Decision |
| --- | --- | --- | --- |
| Textured spherical sheet / skybox | Cheap distant coverage | No interior thickness; crossing exposes the sheet; limited parallax and lighting | Keep existing sheet as the comparison baseline |
| Billboard particles or intersecting cards | Local wisps can be inexpensive and shaped individually | Sorting, overlap, stereo and rotation artifacts; large clouds need many layers | Suitable for later small mist effects, not the principal cloud deck |
| Weather-driven procedural volumes | True thickness; modest stored data; scalable ray integration | Noise needs careful shaping; long horizon rays and lighting are expensive | Selected foundation |
| Explicit voxel density with acceleration structures | Detailed overhangs, sculpted storms and coherent interiors | Voxel storage, generation/streaming, acceleration and transitions need substantial engineering | Reference for future storm volumes |
| Fluid simulation and high-order light transport | Better reference for evolving shapes and illumination | A full planetary simulation is costly and conflicts with instant date seeking unless independently reconstructible | Use as a future authoring/reference method, not required runtime state |

These are engineering judgments for this application. A weather-map-controlled
volume is still three-dimensional; the “2.5D” label in cloud literature does
not mean the transparent shell currently used by Atlas.

## Primary references and what they establish

### Guerrilla: Nubis, Evolved (2022)

[Publication](https://www.guerrilla-games.com/read/nubis-evolved).
Guerrilla describes extending sky cloudscapes into environments that can be
flown through. The talk identifies close views and rapid motion as specific
rendering challenges, including problems with temporal upscaling, and presents
an approach without temporal upscaling. This supports making motion and cloud
interiors explicit acceptance cases. Its console performance does not predict
Atlas browser or Quest performance.

### Guerrilla: Nubis Cubed (2023)

[Publication](https://www.guerrilla-games.com/read/nubis-cubed).
The later system uses voxel clouds, compressed signed-distance acceleration,
simulation-based cloud modeling and improved lighting approximations. It is
the strongest reference here for detailed cloud environments. Atlas's first
volume implementation does not reproduce this system, its assets or its
accelerated voxel pipeline.

### Epic: volumetric cloud lighting

[Documentation](https://dev.epicgames.com/documentation/unreal-engine/volumetric-cloud-component-in-unreal-engine).
Cloud brightness and depth depend on light scattering within the volume.
Epic documents approximate multiple scattering, ray-marched light paths and
shadow-map alternatives, atmospheric interaction and ground illumination.
For Atlas, shadowed interiors, bright sun-facing edges and a restrained diffuse
contribution are required together; increasing texture noise alone cannot
create believable lighting. The current implementation approximates these
terms and does not solve full multiple scattering.

### Hillaire: a scalable atmosphere (2020)

[Paper](https://sebh.github.io/publications/egsr2020.pdf) and
[author's implementation](https://github.com/sebh/UnrealEngineSkyAtmosphere).
This is a reference for physically based sky and aerial perspective spanning
ground and orbital viewpoints. Atlas currently uses a stylized precomputed
colour lookup, so matching cloud haze to that sky is an approximation. A full
physical atmosphere should eventually provide common transmittance and
irradiance queries to clouds, terrain and water.

### Takram: Three.js geospatial clouds

[Project](https://github.com/takram-design-engineering/three-geospatial) and
[cloud documentation](https://github.com/takram-design-engineering/three-geospatial/blob/main/packages/clouds/README.md).
This is the closest browser implementation reviewed. It offers volumetric
layers, shadowing, temporal reconstruction and atmosphere integration. Its
documentation also reports ghosting, depth approximation artifacts, weather
seams and planned orbital coverage. It uses a different postprocessing
pipeline from Atlas. It is a valuable implementation reference, but importing
it would not establish seamless orbital entry or XR compatibility. No code or
textures from it were copied into this implementation.

### WMO: morphology reference

[Cloud classification](https://public.wmo.int/world-meteorological-day-2017/classifying-clouds)
and [cirrus appearance](https://cloudatlas.wmo.int/en/explanatory-remarks-and-special-clouds-cirrus.html).
Use observed Earth cloud forms as visual references on temperate worlds:
rounded cumulus masses, stratiform layers and fibrous high clouds should have
different density profiles. Cloud genera and altitude influence appearance;
one repeated puff shape is insufficient. Earth reference forms do not imply
that every alien atmosphere has Earth's composition or condensation heights.

## Atlas implementation

`volumetric-clouds.ts` supplies a separate presentation renderer:

- Uses a seeded spherical 3D front field for terrestrial coverage. The older
  `cloudCoverAt` weather map remains available for the comparison shell and
  banded gas-giant coverage. Ocean/atmosphere and moisture heuristics remain
  explicit limitations.
- Generates a small tileable 3D noise texture using integer-seeded code.
  It uses a broad lower cloud profile and a thinner high wispy profile, with
  density erosion at a smaller spatial scale. These are appearance models.
- Reduces the BigInt world date before converting wind phase to a float.
  Wind wraps over a common spatial texture period; camera rebasing never
  resets the weather or moves it with the observer.
- Intersects view rays with spherical cloud bounds and skips the empty
  interior of the shell. Geometry depth terminates cloud integration.
- Integrates extinction with Beer-Lambert attenuation, samples toward the sun
  for self-shadowing, includes directional scattering and a broad higher-order
  approximation. The planet blocks sunlight on the night side.
- Captures scene colour at native resolution within a 160 MiB desktop target budget.
  Very large displays and stereo buffers are proportionally scaled to fit.
  Desktop clouds use the capture resolution. Immersive clouds use half its
  width and height with a 96 MiB cap, then a depth-aware spatial resolve. Desktop terrain admission preserves its own working set alongside cloud targets.
- Uses independent eye targets in XR, with no cross-eye frame history. Real
  headset acceptance is still required; desktop measurements do not prove it.
- Applies a conservative ground-shadow approximation that preserves ambient
  light. The current scene buffer does not separate direct and ambient light,
  so this is not an exact radiometric treatment.

Initial integration budgets are 64 view samples / 5 light samples on desktop
and 32 / 3 in immersive mode. These are tunable limits, not measured frame-time
guarantees. Empty density and nearly opaque rays terminate work early. Render
targets, weather and noise textures are released with the planet renderer.

## What should look realistic

1. Clear regions between clouds; coverage is not a permanent fog layer.
2. Distinct bases, rounded bodies and eroded edges, with depth while moving.
3. Brightening toward sunlight and shadowed interiors without uniformly black
   undersides or uniformly glowing white shapes.
4. Gradual loss of visibility while entering a cloud, then recovery on exit.
5. Mountains occlude the correct portions of cloud; clouds shadow terrain.
6. Cloud positions and silhouettes remain anchored during local origin shifts.
7. Sunset, night and orbital views remain consistent with the sun and planet.
8. Date seeking reconstructs the same field without waiting for simulation.

## Prototype comparison and acceptance

The cloud comparison lab keeps the original shell and the new volume available
under the same camera, sun and world date. Luna is responsible for pre-change
baseline checks and post-change tests, including shader compilation, inside /
below / above / orbital views, foreground occlusion, fixed-date repeatability,
clear skies and frame measurements. An identical fixed-date image is a useful
regression check; it is not evidence that the physical model is accurate.

Integration checks must additionally cover planet approach and departure,
day/night changes, terrain detail, exact date replay, retained population IDs,
actual animal motion, contact, resource disposal and origin rebasing. Record
known failures and device limitations alongside passing results. In particular,
the full voxel/SDF storm system, physical condensation simulation and a complete
atmospheric scattering replacement are not part of this first implementation.

### Morphology and sampling refinements

A warped multioctave spherical front field avoids thresholding a coarse
latitude/longitude map into visible grid cells. Mipmapped value/Worley noise
provides regional structure, billows and erosion. Footprint filtering replaces
subpixel billows with aggregate density in orbit. Static stratified ray samples
reduce bands without temporal history. Cubically spaced sunlight samples
resolve the nearby cloud body before traversing the wider layer.

Desktop has a 256 MiB core reservation plus a separate 160 MiB cloud cap
(416 MiB combined). The core includes 28 MiB for water/environment and 16 MiB
for life. Immersive mode keeps a 256 MiB combined target and its smaller
terrain draw budget. Changing modes can briefly retain old tiles while the
selection coarsens and releases them. These are application estimates, not
a browser-wide GPU memory measurement; JavaScript object overhead and driver
allocations are not exhaustively represented.

Desktop initially used half-resolution integration. Controlled Luna comparisons
found orbital checker artifacts persisted with uniform density and alternate
resolve kernels, but disappeared at full resolution. Desktop therefore uses
full-resolution clouds; immersive quality remains reduced pending hardware
validation. The larger desktop buffer cap preserves scene detail at 4K.
