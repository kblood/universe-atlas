# Desktop realism acceptance — 2026-09-28

## Build and source checks

Validated the foundation checkpoint `eaf841423aa6d847601d4019650bc31788c13e20`
and the follow-up `26b41f578e401f7109369085686db5b2c7fe2329` in a detached
worktree at `C:\LLM\IWSDK\universe-atlas-stage-eaf8414`. The validation server
used port 5191. The follow-up production build passed (`tsc --noEmit && vite
build`); Vite emitted its existing advisory about the large Rapier bundle.

At `26b41f5`, 53 targeted tests passed: forest retention, render profiling,
population continuity, flora field/culling and fauna runtime. They include
stable instance slots across stationary/reordered demand, frustum
swap-removal, origin rebasing, water-context worker bounds, and mocked delayed
GPU-query behavior.

The full `npm test` command was also run at the foundation checkpoint. It
failed on existing contract drift: `COSMOLOGY_VERSION` and
`GALAXY_HISTORY_VERSION` expected pins in tests do not match the current
constants, and `time-nav.test.mjs` failed its late-time horizon-gating case.
These are outside the forest changes. The complete suite was not rerun at
`26b41f5`.

## Browser acceptance

Both checkpoints were served locally and tested at 1440×1000 CSS pixels, DPR 1,
on Windows 11 Pro 10.0.26100. Browser was Chromium 149.0.7827.55 through
Playwright 1.61.1. The renderer reported ANGLE/NVIDIA GeForce RTX 5090 using
Direct3D 11. CPU: AMD Ryzen 9 9950X 16-Core Processor. The fixture used seed
`LETHRA-001`, body `G001/C2128,0,1/0/planet/1`, Find Life descent, paused
exploration and a stationary camera turn. No page or console errors occurred.

At `eaf8414`, warmed forest diagnostics reported 1,933 visible instances and
18,202 cached canonical candidates. Two stationary samples reported zero
matrix, colour and coverage writes. A 280-pixel mouse turn changed the camera
heading while observer displacement stayed at 0 m; visible count shifted from
1,933 to 1,904 from frustum changes. No instance writes or origin rebase were
reported in those sampled frames.

At `26b41f5`, the final warmed sample at date offset
`435084631200000032044300000` ns reported 1,925 visible instances and 18,210
cached candidates. Both stationary samples had zero
matrix, colour and coverage writes. The turn changed heading by quaternion
delta norm 0.4197 with 0 m observer displacement; visible count shifted to
1,891, while the sampled frame still had zero writes and origin version 13.
The changed count reflects camera-frustum visibility, not a moved density
focus. These captures sample frame diagnostics; they do not establish that
every turn, rebase or near-LOD transition has zero uploads.

`tests/population-flight-integration.browser.mjs` also passed at `26b41f5`:
128 of 294 fauna anchors were drawn in low flight, 20.71 m observer movement
retained an individual ID, paused exact-date replay reproduced positions,
animals moved at a different date and under real-time playback, descent reached
walking contact at 1.63 m clearance, and there were no browser errors.

## Warmed profile sample

Profiling was enabled for an 8-second stationary low-flight interval after
forest selection, terrain streaming and fauna terrain work had drained. The
captured frame had 643 resident terrain tiles, 162 visible tiles, 128 drawn
fauna, and no pending terrain or fauna-terrain requests. It is one settled
fixture, not a representative-world benchmark or a 60 FPS acceptance result.
Complete machine-readable diagnostics
and screenshots are in
[`forest-hardware/report.json`](../test-results/desktop-realism-26b41f5/forest-hardware/report.json).

| Metric | p50 | p95 | p99 | Samples |
| --- | ---: | ---: | ---: | ---: |
| Frame interval | 20.9 ms | 27.1 ms | 30.3 ms | 380 |
| CPU frame work | 20.4 ms | 26.5 ms | 29.8 ms | 380 |
| CPU planet update | 16.2 ms | 20.5 ms | 22.5 ms | 380 |
| GPU scene capture | 3.18 ms | 5.79 ms | 7.22 ms | 378 |
| GPU cloud integration | 0.52 ms | 2.34 ms | 2.85 ms | 378 |
| GPU cloud resolve | 0.03 ms | 1.56 ms | 1.97 ms | 378 |
| GPU complete pass sum | 3.90 ms | 6.77 ms | 8.31 ms | 378 |

Draw count was 240 per frame; triangle count was about 711,000. At the sampled
frame, terrain update was 11.9 ms, of which life update was 7.7 ms, flora draw
work was 5.9 ms, fauna draw work was 1.3 ms, and forest update was 1.7 ms.
These nested counters overlap and are one-frame diagnostics; they do not sum to
the percentile samples. The main measured cost is CPU planet update and frame
work, rather than the instrumented GPU passes. CPU and GPU durations overlap.
Timer-query history omits incomplete
frames and profiling itself adds overhead. This evidence does not establish a
midrange-PC floor, sustained 60 FPS, cold traversal performance, headset
performance or full GPU memory usage. Terrain/life update counters in the
machine-readable report should guide the next CPU investigation.

## Artifacts and scope

- [`desktop-forest-acceptance.browser.mjs`](../tests/desktop-forest-acceptance.browser.mjs)
  records warm writes, camera turn and an enabled profile.
- [`forest-hardware/report.json`](../test-results/desktop-realism-26b41f5/forest-hardware/report.json)
  records the 26b41f5 sample and diagnostics.
- [`population-flight/report.json`](../test-results/desktop-realism-26b41f5/population-flight/report.json)
  records travel and date-replay acceptance.
- [`forest-warmed.png`](../test-results/desktop-realism-26b41f5/forest-hardware/forest-warmed.png)
  and [`forest-turned.png`](../test-results/desktop-realism-26b41f5/forest-hardware/forest-turned.png)
  are the matched browser captures.

This validates retained forest buffers and local behavior. It does not validate
the planned authored tree assets, aggregate canopy density, broad weather/time
matrix, cold streaming, headset behavior or production release. Deployment is
recorded separately after the reviewed stage is explicitly approved.
