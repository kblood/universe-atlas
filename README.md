# Universe Atlas

A deterministic Three.js universe explorer, deployed at
https://dionysus.dk/webxr/IWSDK/universe-atlas/.

Next-stage proposal: [walkable worlds and traversable history](docs/living-worlds-and-time-roadmap.md).
This roadmap describes planned work, not the deployed feature set.
See also [Fable 5.1's independent review](docs/fable-5.1-plan-review.md) and
[the checked follow-up](docs/fable-review-assessment.md).

## Run and validate

Requires Node.js 22.18+ (the catalogue tests use native TypeScript stripping).

```powershell
npm ci
npm test
npm run build
npm run preview
# In a second terminal, with the preview running:
npm run test:browser
npm run test:continuous
npm run test:travel
npm run test:planet
npm run test:exploration
npm run test:vr
```

Playwright needs its Chromium browser installed (`npx playwright install chromium`).
The automated browser test uses SwiftShader for reliable headless WebGL on this
machine. Its frame timings are software-rendering measurements, not a hardware
performance guarantee. Desktop and mobile viewport layouts are exercised;
headset and physical mobile-device performance have not been validated.
The VR suite injects IWER 2.4.0 with a stereo Meta Quest 3 profile through
Playwright only. It exercises controller rays, the in-world catalogue, thumbstick
rotation/zoom, orbital approach, relief controls, session exit and re-entry.
The emulator is a development dependency and is not shipped in the live app.

## Explore

Start with seed `LETHRA-001`. Select a galaxy, then select any mapped star.
**Approach selected star** flies to that exact catalogue position within the same
galaxy scene. **Visit this system** opens its stars, planets, moons and orbital
parameters directly. Scroll over stars to zoom; drag to rotate and right-drag to
pan. Returning to the galaxy pulls back through the same geometry.

**Fly freely** works at universe, galaxy, system and planetary scales. Drag to
look, use WASD to move and Q/E to descend/ascend. Speed adjusts automatically:
intergalactic travel uses Mpc/s, galactic travel uses ly/s, and systems use AU/s
or km/s. The wheel adjusts a speed multiplier; Shift boosts it; Escape stops
flight. **Fly to selection** steers to a chosen galaxy, star or planet.
**Fly outward** departs the current system or galaxy. Touch users can hold Fly
forward and drag to steer.

Free flight uses a centred reticle. Select a star, align it and hold W; gentle
alignment assistance helps reach that exact system. Releasing the look drag does
not release a held movement key. Galaxy silhouettes stay readable from the initial
universe view, and unresolved system bodies have small navigation beacons at their
actual centres until their meshes become visible. Physical positions and sizes
remain unchanged.

Crossing a galaxy or system boundary converts position and heading between
coordinate frames, without moving the camera to a preset inspection viewpoint.
Entry and exit thresholds differ to prevent repeated switching at a boundary.
A small bounded cache prepares approaching galaxies and systems. If a worker is
still preparing the next scale, the current scene stays visible and movement
pauses until it is ready; there is no loading screen. Travel speeds are game
controls, not a relativistic or propulsion simulation.

Nearby stars stream around the camera. Internal 32-ly chunk boundaries update
the nearby catalogue without replacing the galaxy scene. Surface clearance limits
keep flight outside solid bodies; terrain landing and ground travel are future work.

The help button lists controls. Seed tools provide direct addresses, bookmarks,
catalogue exports and a repeatability check. URLs restore the selected destination.
Continuous flight positions themselves are not yet saved in shared URLs.

Galaxy-to-local navigation uses an uninterrupted logarithmic camera move and
retains the same galaxy point buffer. Planetary focus retains the system scene.
Explicit navigation between other scales blends between prepared views; flight
boundary crossings retain the physical camera pose. Reduced-motion preferences disable animated travel. VR presents
stationary spatial models; selection changes model focus/scale without moving the
headset viewpoint. Free-flight keyboard controls are for desktop/touch only.

The system view defaults to a spaced orbital overview. **Physical scale** shows
true relative distances and radii. Orbit angles, time, object identities and
physical catalogue records are the same in both views. Starting flight or focusing
a world switches to physical scale. The orbital helper moves the camera toward
the actual planet while retaining all system bodies, moons, rings and orbits.
**Approach low orbit** flies to 30–100 km above the selected planet or moon.
**Descend to 10 km** approaches the surface while preserving at least 3 km over
mountains. **Hold orbit** follows a great circle at your current altitude and
carries the camera smoothly across both poles. Drag to look around; movement
keys release assistance. The wheel also adjusts assisted orbit speed.
The HUD shows altitude, terrain clearance and latitude. **Terrain relief ×12**
exaggerates elevation for stationary inspection; flight restores physical heights.
**Fly over terrain**, at the top of a solid world's inspector, approaches land
and starts a 600 m terrain-following flight. The terrain now includes local hills
and gullies, with atmospheric haze where appropriate. The wheel adjusts speed;
movement keys release assistance. Free flight retains a 120 m terrain-clearance
floor. Landing is a later milestone.

The implementation, controls, cube-face mathematics, budgets, known limitations,
test procedure and research sources are documented in
[Connected exploration corrections](docs/exploration-corrections.md).
Measured acceptance results are in
[Connected exploration corrections](docs/exploration-corrections.md).
The original orbital design and validation remain linked there as historical records.

On a headset browser, choose **Enter VR**. The atlas becomes a stationary spatial
model with a floating explorer panel. Controller triggers select objects; use
Explore selection to descend. The left stick zooms/pans, the right stick rotates,
and holding a grip lets you move the model. Back, Fit model and Exit VR are on
the panel. The design manipulates the model without artificial head motion.

## Architecture and limits

- `src/catalog.ts`: pure generation, version `atlas-1.0.0`. FNV-1a 64-bit path
  hashes initialize PCG32 streams independently for names, structures and
  textures. Stable IDs encode the hierarchy, independent of exploration order.
- Galaxy origins use Mpc, galaxy-local cells use light-years, and body records
  use SI units. Rendering applies a local scale at each hierarchy level, keeping
  GPU coordinates small. System orbits use analytical Kepler positions, with
  barycentric binary stars. The spaced system overview uses separate orbit scales
  with disjoint radial envelopes, accounting for eccentricity and ring extents.
  Physical-scale mode uses one common scale for positions and body radii.
- Thirty-two galaxies span four morphologies. `src/galaxy-field.ts` integrates
  their catalogue density, with fine vertical bins for thin disks. These density
  tracers guide the distribution of real map stars. Universe-scale galaxy glyphs
  still represent unresolved populations.
- `src/star-map.ts` resolves density tracers to existing catalogue systems near
  each tracer. It never invents a star at the tracer coordinate. The focused
  galaxy map uses up to 10,000 candidate anchors, with unique stable addresses;
  every selectable point opens exactly that system. Successive map detail levels
  preserve their earlier anchors. Four worker-side maps are cached. This is a
  representative subset, not an enumeration of every star in the galaxy.
- `src/galaxy-space.ts` keeps a single galaxy scene through zooming and flight.
  Distant mapped stars occupy actual 3D positions and exhibit positional parallax.
  The camera uses a floating origin near resolved stars. Twenty-seven nearby
  32-ly chunks stream through one worker request at a time; up to 64 chunks stay
  cached. Each chunk resolves at most 512 representative systems, reporting its
  true count. A single batched near-star cloud draws at most 13,824 points.
  Mapped anchors are excluded from that cloud to prevent duplicates. Local stars
  fade in as generated and fade with distance between 24 and 32 ly, before chunk
  boundaries become visible. Large travel steps request the latest neighbourhood
  without applying an old result to a new position.
- Map positions, names and system records come from the unchanged `atlas-1.0.0`
  catalogue. Map lighting emphasises young spiral-arm populations; close stars
  use catalogue colours. Point brightness is illustrative, not photometry. The
  small representative sample does not describe all the unresolved diffuse light,
  extinction, or naked-eye visibility of a physical galaxy.
- `src/worker.ts` also generates planetary textures and transfers typed buffers.
  The renderer caps pixel ratio, disposes abandoned view resources, and rejects
  stale navigation results. `src/view-transition.ts` keeps at most one outgoing
  scene for explicit changes to universe or system scales. Galaxy/local zooms and
  planet focus do not allocate a second scene or render target. Flight uses a
  bounded three-entry preparation cache.
- Neighbouring galaxies remain visible in catalogue-derived directions. Their
  silhouettes are enlarged for legibility. System skies use the same real map
  anchors projected from the system's physical position, plus actual local and
  adjacent catalogue stars. Galactic previews follow camera translation only at
  system scale, where AU travel has negligible light-year parallax. In VR, distant
  galaxy points are depth-compressed along their true viewing rays to fit the
  stereo camera's far plane. Location maps show your place in the hierarchy.
- `src/travel.ts` supplies proximity-based flight speeds, system entry extents
  and nearest-body clearance. The renderer uses logarithmic depth and a floating
  origin in metres near planetary bodies. Camera position and heading cross
  Mpc/galaxy-local ly/system-local metre frames at boundaries; close planetary
  movement never depends on adding metre offsets to a global Mpc position.
- Planet focus refines the resident body mesh in place. Previously focused bodies
  return to their small preview when another body receives high detail, bounding
  the number of detailed worlds. Moons use 64-pixel previews until focused;
  planets use 256-pixel previews. Focus tokens prevent a late terrain result from
  being applied to a different body. Moons' orbital paths follow their moving
  parent during playback. Very distant system context still uses directional sky
  markers, with negligible AU-scale parallax for most stars.
- `src/terrain.ts`, version `terrain-1.1.0`, preserves the existing seeded
  continents, coastlines and ocean level, adding local relief at 6,500 m, 1,400 m
  and 260 m wavelengths. `src/planet-tiles.ts` samples
  that field over a cube-sphere, including matching face edges and pole centres.
  `src/planet-renderer.ts` streams patches through a dedicated worker, retains
  parents until children are ready, morphs new geometry, and uses edge skirts.
  The cache plus pending work is capped at 256 tiles, with two jobs in flight and at most two
  resource installations per frame. Desktop selects at most 150 leaves, XR 102.
  Horizon and camera-frustum culling reduce hidden work. Ground-proximity priority
  permits deeper refinement (maximum address level 16); level 8+ textures have
  128x128 interiors. Focused 1024-pixel
  globes remain fallback previews; solid worlds no longer upscale a whole globe
  to 2048 pixels for close inspection. The terrain sampler, not the fallback map,
  supplies streamed detail. Ground walking, metre-scale objects, vegetation,
  weather, full atmospheric scattering and landing remain future work.
- `src/planet-flight.ts` uses quaternion free look and great-circle transport
  without a geographic-north singularity. `src/travel.ts` samples actual terrain
  for clearance. Ocean planets receive a lightweight atmosphere shell; it is a
  visual approximation rather than a complete scattering or climate simulation.
  Terrain materials also receive height-dependent aerial haze. The new
  `src/navigation-markers.ts` batches unresolved system-body beacons into one draw.
- `src/vr.ts` uses the installed Three.js WebXR runtime with a 0.85 framebuffer
  scale and foveation, a single reusable panel texture, bounded paginated lists
  and two controller rays. Particle sizing accounts for the model's world scale.
  Reference: [Three.js VR guide](https://threejs.org/manual/en/how-to-create-vr-content.html).
  Validation approach: [Meta IWER](https://meta-quest.github.io/immersive-web-emulation-runtime/getting-started.html).
- Moon records have parent-relative physical orbits and individual previews.
  They are visible at physical system scale and remain present during planet focus;
  the spaced overview omits their markers to avoid clutter. Belts
  and rings are lightweight descriptors/visuals. Planetary demographics,
  climate and long-term orbital stability are simplified models, not an
  astrophysical simulation. Shared names can recur; canonical IDs are unique.
- Determinism tests cover random reference vectors, generation order, signed
  sector boundaries, direct-address reconstruction and orbital relationships.
  Saved worlds depend on the generator version. The continuous browser test selects a visible map star by its projected screen
  position, verifies its exact system identity, flies across several chunk boundaries,
  and checks geometry identity, rebasing and cache limits. Cross-engine, bit-for-bit
  compatibility requires additional browser fixtures before it can be promised.

The travel acceptance test flies from one galaxy into a chosen system, focuses a
planet while asserting every resident body keeps its identity, then departs into
another galaxy. It verifies five automatic scale crossings and adaptive speed.
The planet acceptance test uses actual UI flight to low orbit, crosses both
poles under orbit assistance, descends, visits a moon, and checks tile-cache
bounds and resource disposal. It produces inspectable screenshots and a report.
The exploration regression adds actual drag/W entry into a selected system,
rendered-pixel visibility checks, star-only clipping, land-site approach,
low-altitude terrain following, and keyboard/mouse interaction checks.

All visual geometry and textures are generated by this application's code.
There are no downloaded art assets or external runtime services. Three.js is
provided by the pinned `super-three` package; its MIT notice ships as
`public/three-LICENSE.txt`. Dependency versions are recorded in package-lock.json.

## Deployment

This project has its own repository at
`caldor@192.168.50.17:/srv/git/repositories/universe-atlas.git`.
The shared scripts and research live in the sibling IWSDK repository.

From `C:\LLM\IWSDK`:

```powershell
.\release.ps1 universe-atlas
.\release-site.ps1 -IndexOnly
```

The index source is `deploy/iwsdk-index.html`. The release scripts upload static
build output through staging and retain a backup of the previous site index.
This project's `deploy/site-index-entry.html` preserves its current landing-page
card. To restore that card, replace the `href="universe-atlas/"` feature in the
shared index with the fragment, preserving the other applications' entries.
Run `tests/browser.mjs` with `ATLAS_URL` set to the live URL and `ATLAS_RESULTS`
set to a separate report directory for post-deployment verification.

Research and the broader roadmap are in the parent `docs` directory:
`procedural-universe-research-2026-09-12.md`,
`procedural-universe-build-prompts-2026-09-12.md`, and
`universe-atlas-v1-spec.md`.
