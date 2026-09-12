# Planetary orbit validation

This records the original orbital milestone. Current manual-flight, visibility
and low-altitude terrain checks are documented in
[Connected exploration corrections](exploration-corrections.md).

2026-09-12. See [implementation and sources](planetary-orbit-implementation.md)
for scope, algorithms, controls and limitations.

## Environment

- Windows development workstation; Node.js native TypeScript tests.
- Three.js through pinned `super-three@0.181.0`.
- Playwright Chromium, SwiftShader software WebGL, desktop 1440x1000 viewport.
- VR acceptance uses IWER 2.4.0 with Quest 3 stereo emulation.
- No physical Quest or mobile-device frame-rate claim is made.

## Evidence

The pure suite passes all 16 tests, including the unchanged catalogue tests and
four new terrain/pole checks. The new checks cover all twelve cube edges and
eight corners, equal sampled geography and normals, adjacent patch positions,
outward triangle winding, deterministic tile buffers, a full polar orbit and
terrain-aware exclusion distances.

Browser test reports and screenshots are retained under `test-results/`.

| Check | Result |
|---|---|
| `npm test` | 16/16 pass. |
| `npm run build` | TypeScript and Vite pass. |
| `npm run test:browser` | Hierarchy, body focus, new low-orbit approach, seed verification, deep-link restore, mobile viewport and cleanup pass. |
| `npm run test:planet` | Ocean planet, low orbit, polar circuit, descent, moon approach, body identity retention, cache limits and cleanup pass. |
| `npm run test:travel` | Five automatic scale crossings, planet focus retaining all bodies, speed adaptation and departure to another galaxy pass. |
| `npm run test:vr` | IWER Quest 3 stereo selection, planet inspection, relief, model zoom and session exit/re-entry pass. |
| `npm run test:continuous` | Exact visible-star selection, continuous galaxy geometry, 4,340.6 ly of flight, floating-origin rebasing and the 64-chunk cache cap pass. |

The catalogue digest remains
`884c207e57d282f4a3019aa6e6d59c742cc476cfce4d87dea8a3bbd693ae1ce8`.

The final local polar route sampled latitude from -89.297 to +89.879 degrees;
the analytical test also crosses the exact poles. Camera quaternion changes
remained continuous. Radius drift over the browser circuit was approximately
0.000105 metres. The runtime cache peaked at 253 tiles against a 256-entry cap;
at most two jobs were pending. Low orbit reached tile level 6 with 73 visible
patches at the sampled viewpoint. The number of visible patches varies with
heading and arrival timing, so these measurements are not golden pixel fixtures.

Visual review includes the orbital globe, horizon at 100 km, terrain after the
polar circuit, atmospheric descent, the moon and stereo VR inspection. Review
found close-range depth stippling during development; uniform system rescaling
fixed it while preserving physical poses. The globe, coastlines and horizon
were inspected again after that correction. Full single-pixel seam freedom at
all speeds and viewpoints is not claimed; see the implementation's seam limits.

Reports: `test-results/browser-report.json`, `test-results/planet/report.json`,
`test-results/travel/report.json`, `test-results/continuous/report.json` and `test-results/vr/report.json`.
Planet screenshots: `test-results/planet/01-orbital-globe.png` through
`05-moon-orbit.png`. Timings in those images are software-rendering diagnostics,
not hardware performance benchmarks.

## Production verification

Production verification completed the planet route at
`https://dionysus.dk/webxr/IWSDK/universe-atlas/`, with no browser/worker errors,
253 peak cached tiles, both polar regions visited and 0.000069 m radius drift.
The app, bundled documentation and updated site index returned HTTP 200.
The production route report is `test-results/live-planet/report.json`.
An additional VR regression checks that returning to desktop retains a camera
far plane covering every resident system body after the planetary scale change.

## Known limits requiring later validation

1. Physical headset GPU time and comfort need on-device checks.
2. Fast traversal can expose lower detail or visible coarsening; fully balanced
   edge stitching, material blending and predictive prefetch are future work.
3. Surface collision is sampled terrain with a 2 km floor, not landing collision.
4. Atmospheric rendering is a lightweight shell, without clouds or complete
   ground-level aerial perspective.
5. Cross-engine bit-for-bit procedural floating-point equivalence is not promised.
