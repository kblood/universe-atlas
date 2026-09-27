# Desktop renderer profiling

Implemented 2026-09-28 as the measurement foundation for
[desktop realism](desktop-realism-implementation-plan-2026-09-27.md).
This does not establish the desktop performance target.

## Enable and collect

Add `profile=1` to an Atlas URL, or use the existing browser diagnostic API:

```js
window.__atlas.setProfiling(true);
// After the fixture is ready, clear loading/warmup samples for a warm run.
window.__atlas.resetProfile();
// Read after the scripted route has run long enough for delayed GPU results.
window.__atlas.renderProfile;
window.__atlas.setProfiling(false);
```

Record the URL, exact date, viewport/device pixel ratio, quality settings,
browser, actual GPU/CPU and build-info commit alongside each capture. Collect
cold entry and warm traversal separately. Paused dates keep content stable;
ordinary flight still measures streaming and movement work.

## Meaning and limits

`src/render-profile.ts` keeps at most 600 samples per metric. Percentiles use
nearest ranks; absent samples produce null values, not invented zero timings.

- `frameIntervalMs`: callback-to-callback elapsed time, including browser pacing.
- `cpu/frameWorkMs`: synchronous animation callback work, including submission.
- `cpu/planetUpdateMs`: main-thread planetary terrain/life update work.
- `cpu/<pass>Ms`: synchronous pass work/submission, not GPU execution duration.
- `gpu/sceneMs`: ordinary main scene when the cloud compositor is absent.
- `gpu/sceneCaptureMs`: the scene capture used by the cloud compositor.
- `gpu/cloudIntegrationMs` and `gpu/cloudResolveMs`: cloud raymarch and resolve.
- `gpu/lakeReflectionMs`: reflection update region; cached/disabled frames can
  submit no draws, so do not interpret its average as the cost of a real capture.
- `gpu/framePassSumMs`: sum of non-overlapping instrumented passes belonging to
  the same completed frame. It excludes CPU work and presentation wait. A frame
  with unavailable/skipped/invalid queries is excluded from this aggregate.
- Draw/triangle counts accumulate across captures and final rendering while
  profiling is enabled. They are not unique visible-object counts.

The renderer is forward rendered: scene capture includes terrain, plants,
animals and water together. These are not separate GPU timings yet. Existing
terrain/forest/life diagnostics provide more detailed CPU/resource counters.
CPU and GPU times overlap and should not be added as a predicted frame interval.

Queries use `EXT_disjoint_timer_query_webgl2`, are polled on later frames and
never call `finish` or synchronously read pixels. The queue is limited to 48;
queries older than 240 profiling frames expire. At most 12 results are retired
per frame. Disjoint measurements are discarded, and no new timers start during
a known-disjoint frame. External timer queries are respected; queries never
nest. Unsupported GPU timing retains CPU counters and reports unavailable GPU
timing. Disabling clears histories and deletes pending queries.

Profiling is off by default and introduces its own CPU/driver overhead. Compare
enabled and disabled runs before attributing small differences to the renderer.
GPU execution timings alone do not establish responsiveness or steady 60 FPS.

## Current checks

`tests/render-profile.test.mjs` exercises bounded history/query admission,
unavailable/disjoint/nested/external timers, complete-frame aggregation, exception
cleanup, CPU-only fallback and context loss. These are mocked API unit checks;
real GPU/browser acceptance is recorded by Luna in the desktop validation report.
