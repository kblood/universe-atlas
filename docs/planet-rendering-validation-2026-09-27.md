# Planet flight, population and cloud validation — 2026-09-27

## Scope and research

Compared the previous transparent cloud shell with a spherical ray-marched
volume. Reviewed billboards, weather-controlled volumes, voxel/SDF storms,
fluid simulation, physical atmosphere references and browser implementations.
The selected implementation is described in [the cloud research](realistic-clouds-research-2026-09-27.md).
The alternatives were researched, not all implemented as production systems.

GPT-6 Luna performed baseline and browser acceptance checks. A separate source
review covered flight coordinates, terrain admission and population transforms.

## Regressions found and corrected during development

- Empty cloud image from far-plane ray reconstruction and invalid sphere hits.
- Coarse weather-grid artifacts, excessive cloud brightness and repeating puffs.
- False motion measurements caused by a missing test radius value.
- A 280 m animal range that missed the visible ground during forward low flight.
- Synchronized animal idle periods at the reference date.
- A worst-case cloud reservation that prevented collision terrain from loading.
- A stale 120 m flight-floor assertion; contact is now at 1.64 m eye height.

## Automated checks

- TypeScript and production Vite build passed.
- Full unit suite: 403 tests, 399 passed, four pre-existing failures.
- Focused fauna suite: 16 passed.
- Cloud unit suite: five passed, including exact replay, different identities,
  finite signed distant dates, ordered layers and extinction behavior.
- Canonical population enumeration matches exhaustive enumeration at face
  interiors, seams and corners. Terrain stencils reproduce a sloping plane.

The four baseline failures concern cosmology saturation, history-version
compatibility, the expected cosmology version and late-time horizon gating.
They were present before this rendering work and were not changed here.

## Browser measurements and limits

Luna used Chromium with NVIDIA RTX 5090 through ANGLE/D3D11. GPU measurements
use asynchronous EXT_disjoint_timer_query_webgl2 around scene capture, cloud
integration and resolve; CPU submission time is reported separately.

A fixed date reproduces the same cloud pixels; advancing time changes the
field. Browser checks also exercise target resizing and memory accounting.
Stereo rendering passed IWER Meta Quest 3 emulation with separate eye targets
and 32 view / 3 lighting samples. This is not a physical Quest performance or
visual-comfort test.

The volume provides thickness and self-shadowing absent from the old shell.
Cloud lighting and morphology remain procedural approximations. This work does
not certify photorealism, implement full atmospheric transport, or simulate
planetary weather. Population motion has no obstacle avoidance or foot IK;
distant forest density is still approximated with a stable subset of trees.

## Integrated flight checks

The local production build passed Luna's browser flight test on the dated
LETHRA-001 / G001/C2128,0,1/0/planet/1 fixture:

- At 98.54 m clearance, 295 herd anchors were resident and 128 individuals drawn.
- Moving 21.34 m retained a previously drawn individual ID.
- Seeking A to B to A reproduced the same individual positions; B differed.
- Ordinary exploration advanced 4.0588 world seconds over a four-second wait
  and animal positions changed.
- Descent crossed below 120 m and reached walking at 1.632 m eye clearance.
- No browser or WebGL errors occurred.

A separate exact-date walking deep link restored the same runner specimen
from a 175.34 m low-flight observation to a close view. The screenshot visibly
shows its quadruped anatomy; paused IDs and positions were unchanged across
repeated frames. The URL includes the current version record so nanosecond
dates are not interpreted as legacy offsets.

These checks confirm behavior for the fixture, not exhaustive habitat coverage.
The fine river-contact stress test exposed merge/refinement oscillation.
Required collision support is now protected from pressure-driven merges.
Visual selection uses resident height samples instead of rerunning geology
for every tile. All four cases passed fine level 22 support, 90 additional
frames of stable contact and 2:1 neighbour balance:

| Cloud allocation | Frames to contact | Combined estimate |
| --- | ---: | ---: |
| Actual, before GPU rendering | 315 | 231.1 MiB |
| Simulated 21 MiB | 309 | 251.1 MiB |
| Simulated 96 MiB | 313 | 325.7 MiB |
| Simulated 160 MiB | 316 | 390.1 MiB |

All were below the desktop 416 MiB cap. These controlled CPU/streaming checks
use inline workers and do not measure GPU frame time. Terrain update p95 ranged
from 28–74 ms across these runs, with maxima up to 104 ms while streaming.
Passing contact and memory bounds does not establish steady 60 FPS or headset
acceptance; cooperative work slices do not bound the whole frame.

## Cloud pass measurements

Warmed GPU p95 for the final V13 lab capture/integration/resolve pass was
4.02 ms in orbit, 6.03 ms inside clouds and 2.85 ms at the surface (240
samples per view). The RAF interval p95 was 16.8 ms. These are cloud lab
measurements on the RTX 5090, not total Atlas scene or headset frame budgets.

The 4K viewport (3540 × 2160 canvas beside the lab sidebar) used 153,941,468
bytes, below its 167,772,160-byte cloud budget, at native scene resolution.
Seeking back produced zero pixel difference; advancing time changed 32.8% of
pixels. Controlled comparisons ruled out jitter, coverage fields, ground
shadows and the resolve kernel as explanations for orbital checker artifacts.
Full-resolution desktop cloud integration removed the pattern and was adopted.
Close cloud shapes still have visibly procedural billows and approximate
lighting; this is not a photorealism certification.

This report records pre-publication checks. The same browser harnesses accept
`ATLAS_URL` for live acceptance. `build-info.json` records the committed source
revision and whether its working tree was dirty at build time.
