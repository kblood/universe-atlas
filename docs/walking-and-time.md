# Walking and shared time

Implementation record, 2026-09-13. This is the first release following the
[checked Fable 5.1 recommendations](fable-review-assessment.md). The larger
[living-worlds roadmap](living-worlds-and-time-roadmap.md) remains a proposal.

## What this stage implements

Select a solid planet or moon and choose **Land and walk**. From orbit, the
existing approach helper finds land; near the surface, the camera descends while
a small ground neighbourhood refines. The surrounding planetary and system scene
stays present. The camera waits above the surface until contact geometry and the
lazy physics module are ready. There is no separate loading scene.

WASD walks at 4 m/s; Shift runs at 8 m/s; Space jumps; dragging looks around.
The capsule follows radial gravity and the camera heading follows local up.
**Return to flight** climbs to 160 m above the rock and releases free flight.
These are desktop controls. Existing VR remains stationary model exploration;
walking has not been enabled or validated in a headset. Touch walking controls
are not part of this stage. Gas giants and stars have no solid walking surface.
The shoreline blocks ground movement into water; underwater exploration remains
deferred. A water landing invokes the existing dry-site approach helper.

Walking addresses store body-relative position, heading and exact date in the URL.
A cold restore initializes a hover above that location and refines the ground
before resuming contact. This is a shared location, not a full physics snapshot:
mid-jump velocity is not restored. Arbitrary free-flight positions are not saved.

## Data contracts and compatibility

`world-time.ts` uses signed BigInt nanoseconds relative to the existing catalogue
reference epoch. JSON and URLs use decimal strings. The version is `atlas-time-1`
and the only branch is `baseline`. One Julian year is exactly 31,557,600 seconds.
The UI accepts decimal years with up to nine fractional digits; the saved date
retains nanoseconds. UI year formatting is a convenience, not the lossless wire
format. Dates survive navigation through universe, galaxy, system and body views.

Only bounded orbital remainders become floating-point angles. The convention
rounds the calculated period to integer nanoseconds and applies Euclidean modulo,
including negative dates. At the reference epoch, body positions and catalogue
records are unchanged. This avoids losing frame increments at enormous epochs;
it does not make a fixed Kepler orbit physically valid for billions of years.

**The current date control changes orbital positions only.** It does not render
the Big Bang, galaxy formation, stellar evolution, moving shorelines or life.
Seeking while grounded releases physics and moves to a 160 m observation hover.
Object existence and remnant tracks are not yet applied to the rendered scene.

`world-history.ts` exports identity/parent/reference sidecars and deterministic
stellar lifecycle fixtures without changing the `atlas-1.0.0` catalogue digest.
Formation, giant and remnant dates use a deliberately crude mass/lifetime power
law, seeded age, and mass thresholds. The records carry
`provenance: heuristic-data-fixture` and `visualEvolution: false`; they are not
calibrated stellar tracks. Their orbit-validity intervals describe the fixture's
assumption. Remnants have a distinct lineage address. A massive star in the unit
test exercises black-hole output; the existing generated star population has not
been expanded to massive stars. Birth ages are capped against the reference-era
age assumption, avoiding red dwarfs born hundreds of billions of years earlier.

`world-surface.ts` provides independent rock height, water level, visible height,
solid/walkable state and version. It closes over the immutable terrain 1.1
baseline. A time-keyed water fixture proves that changing water height leaves
rock unchanged. The renderer still uses the baseline ocean clamp: a separate
animated water mesh, climate model, rivers and ponds come later. Do not animate
the original `body.water` parameter; it remains part of baseline geology.

## Ground geometry and physics

The cube-sphere remains the global representation, including the poles.
Each tile has 32 × 32 cells. A contact neighbourhood forces a radius-dependent
depth, nominally `ceil(log2(2R / (32 * 1.4)))`, bounded to levels 14–20.
The Earth-radius face-centre spacing is about 0.76 m at level 19; spacing varies
across a cube face. This is mesh resolution, not a measured error bound.

The contact selector prioritizes a 28 m neighbourhood. Nine probes over a
24 × 24 m tangent region require settled fine leaves before movement starts or
continues. Missing coverage freezes the controller instead of allowing a fall.
Coarser adjacent leaves are split first in contact mode. Fine boundary vertices
next to a one-level-coarser leaf use parent-triangle positions. Skirts remain
visual fallback only. Geometry and colour are generated in a dedicated worker;
each frame installs at most two completions.

`terrain-contact.ts` mirrors the settled vertex shader, including locked edges,
and excludes skirts. Both the renderer and collision therefore use the same
triangle positions. Contact conversion subtracts a nearby physics origin before
writing Float32 metre coordinates. Rapier's world rebases after 64 m, rebuilding
nearby colliders while retaining the body-relative double-precision position.
The system render origin also follows the observer. Tile normals use a shared
2 m directional finite-difference half-step, independent of cube face or LOD.

Rapier 0.20.0 provides a kinematic capsule: 1.8 m tall, 0.3 m radius, 1 cm skin,
45° climbing limit, 0.3 m autostep and 0.35 m ground snap. Simulation uses fixed
1/60 s steps with at most 0.1 s catch-up per frame. Gravity is radial and clamped
to 0.05–40 m/s² for usable traversal. Jump input persists until a physics step
consumes it. This is an exploration controller, not a simulation of human
survival, relativity or every body's true surface conditions.

## Resource bounds and performance

Ordinary terrain retains the earlier 256-tile cache and 150 desktop / 102 VR
leaf limits. Walking permits 768 cached/pending tiles and 512 leaves, including
the surrounding low-resolution globe. Only one planet owns a terrain worker.
Ancestors remain available until children are ready; unused tiles are disposed.
Worker errors retry with frame-based exponential backoff; a worker can restart
at most three times. Permanent failure keeps fallback scenery visible and
prevents unsafe ground entry. Returning to another world creates a fresh worker.

The byte ledger estimates geometry CPU + GPU storage and texture CPU + mipmapped
GPU storage. Its provisional terrain-resource budget is 256 MiB. The tile cap
bounds admission; reported collider typed buffers are separate. The ledger is
**not** total browser/driver memory: Rapier's WASM heap, acceleration structures,
framebuffers, surrounding scene and fallback planet resources are excluded.
Textures now have mipmaps. Tree selection is reused between completions and
material camera movement, with a periodic refresh; culling and morphing still
update every frame. Contact geometry is cached until its edge mask or origin
changes.

The physics module is loaded only for landing. Its bundled WASM makes the lazy
chunk approximately 2.86 MB uncompressed / 1.08 MB gzip; Vite's size warning is
retained. Initial atlas navigation does not fetch that chunk. A slow device or
cold cache can wait above the surface while generation completes. A loading-free
view does not imply zero streaming delay.

## Validation

Run `npm test`, `npm run build`, then a preview on port 5186. Browser commands:
`npm run test:walking`, `test:planet`, `test:exploration`, `test:travel`,
`test:continuous`, `test:browser`, and `test:vr`.

The walking route checks actual planet landing, motion, jumping, URL restore,
large date seeks, a moon's north-pole landing and return to flight. Optional
environment variables: `ATLAS_WALK_FAST=1` begins at a saved surface address;
`ATLAS_WORKER_FAULT=1` injects one worker error event to exercise recovery;
`ATLAS_HARDWARE=1` requests GPU rendering (D3D11 on Windows) and records the
reported renderer. Simply omitting SwiftShader flags still selected software
rendering on this machine; always inspect the reported adapter.
`ATLAS_LONG_WALK=1` extends moon travel beyond 90 m to exercise streaming.
`ATLAS_URL` targets another deployment and `ATLAS_RESULTS` changes output folder.
Reports and screenshots are disposable under `test-results/`.

Pure tests exercise all cube edges/corners, both poles, actual moon triangles,
walking across fine tiles and physics-origin rebases, missing-contact pauses,
short-frame jump input, unchanged catalogue records, huge signed dates and
independent water histories. The contact diagnostic measures the collision
triangle against the analytic rock sample; shader/collider agreement is enforced
by their shared conversion, not measured with a screenshot depth probe.

Local acceptance results, Chromium at 1440 × 1000:

| Measurement | Result |
|---|---|
| Pure catalogue, time, terrain and ground tests | 23 passed |
| Actual rocky planet / moon walk | Passed; >8 m movement on each, jump and cold restore |
| Injected worker failure | Recovered, two interrupted jobs, no permanent failed tiles |
| Planet contact resources | 486 resident tiles, level 18, 119,602,248 estimated bytes |
| Moon contact resources | 267 resident tiles, level 16, 63,785,016 estimated bytes |
| Sampled analytic rock / collision mismatch | Planet 0.059 mm; moon 0.081 mm |
| Moon takeoff clearance | 159.81 m |
| RTX 5090 / D3D11, 180 settled-ground frames | Median 16.7 ms, p95 25.3 ms |
| Terrain CPU update, same sample | Median 1.0 ms, p95 8.6 ms |
| SwiftShader, separate 180-frame route | Median 467.5 ms, p95 601 ms |
| Polar orbit regression | Both poles reached; radius drift 0.15 mm |
| General browser, travel, continuous galaxy and exploration suites | Passed; 317 ly continuous streaming route, 600 m terrain cruise |
| VR regression | Passed with IWER 2.4.0 / Quest 3 stereo emulation; 856 XR frames, no errors |

These are measured samples, not global maximum-error or minimum-frame-rate
guarantees. The hardware is a high-end desktop GPU. Cold approach takes tens of
seconds while the CPU worker builds the contact tree; future channel caching and
generation profiling should reduce that delay. No physical headset or mobile
walking performance claim is made. Hardware timings, software timings and
headset results must not be treated as interchangeable.

The hardware travel regression exposed a pre-existing precision trap at the
0.03-light-year approach staging distance. A value rounded just above that
distance repeatedly produced a movement too small to change the camera position.
The sweep guard now releases within a 0.000001-light-year tolerance; the separate
physical system-entry test is unchanged. A numeric regression test captures the
previously stuck value. One earlier general-browser low-orbit wait timed out;
the focused planet suite and full browser rerun passed, with diagnostics retained
to help investigate a recurrence.
The continuous-streaming test now waits for measured lateral travel instead of
assuming one second of forward movement always covers 260 light-years. That
assumption varied with the settled camera pose and speed; the revised test still
requires crossing multiple chunks while retaining the galaxy and bounded cache.

Date seeking also cancels a pending camera-focus animation, so an old animation
cannot overwrite the pose after its coordinate origin changes. Inspection tests
wait for an actually settled camera before comparing relative positions.

The final live-site route passed on 2026-09-13, including a 90.02 m moon run,
takeoff and preservation of the exact date while returning through system,
galaxy and universe views. The moon run ended with 391 resident tiles, no pending
jobs, 94,476,192 estimated terrain bytes and 0.059 mm sampled contact mismatch.
There were no browser errors. The live settled-ground sample measured 16.4 ms
median / 25.3 ms p95 on the RTX 5090. URLs, documentation, entry/worker/physics
bundles and the shipped license were checked against the local deployment.

Generation remains independent of the observer's route. Interactive capsule
physics is not the canonical universe-history simulation: frame catch-up is
bounded, and bit-identical input replay across devices is not promised. Future
civilization events must consume canonical history rules, not local render-frame
timing or the order in which terrain happens to stream.

## Next work

This stage deliberately retains the existing hills, gullies and coarse colours.
It does not yet deliver realistic ground materials, rocks, beaches, vegetation,
forests, rivers or ponds. The next milestone should add structured geology and
watershed data behind the surface query, then streamed material/prop detail with
independent visual and collision budgets. Preserve reference-epoch geography or
introduce an explicit generator migration. Visible stellar lifecycle consequences
and regional history can then consume the same date/lineage contracts. Universal
civilization history still needs canonical causal ownership and tie-breaking.

## Sources and provenance

- [Rapier JavaScript character controller](https://rapier.rs/docs/user_guides/javascript/character_controller/): capsule movement, slopes, autostep, ground snapping and custom up vectors.
- [Rapier JavaScript getting started](https://rapier.rs/docs/user_guides/javascript/getting_started_js/): WASM initialization and world stepping.
- [Rapier JavaScript colliders](https://rapier.rs/docs/user_guides/javascript/colliders/): triangle mesh and capsule colliders. Dependency pinned to `@dimforge/rapier3d-compat@0.20.0`; upstream Apache-2.0 license is shipped as `rapier-LICENSE.txt`.
- [Three.js Texture documentation](https://threejs.org/docs/pages/Texture.html): mipmaps and texture filtering.
- [MDN BigInt](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt): arbitrary-width integers and explicit JSON serialization.
- [Prior orbital research and sources](planetary-orbit-implementation.md) and [exploration corrections](exploration-corrections.md): cube-sphere, deterministic geography and floating frames.
- [Full Fable 5.1 review](fable-5.1-plan-review.md), [invocation metadata](fable-5.1-plan-review.metadata.json), [supplied brief](fable-review-brief.md), and [checked assessment](fable-review-assessment.md): preserved design provenance and corrections. The new implementation and measurements were performed by Codex.

No generated art assets, private asset uploads or model checkpoints were added.
