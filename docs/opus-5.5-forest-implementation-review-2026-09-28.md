# Review: Atlas `eaf8414` (forest retention, selection, next rendering steps)

**Scope:** source reading only. No tools, builds, tests or screenshots. Line numbers are omitted because the source was pasted; references use function names.

## Verdict

Removing the heading bias is correct. The request-ID guard is correct for its narrow purpose.

The retained-buffer claim is much weaker than the plan states. Slot identity is a *compaction ordinal*, not a resident identity. As a result, rotation, reselection, placement warm-up and LOD changes all cause broad rewrites. Separately, a water-level change can make the forest vanish and can grow the worker's message queue without limit. Fix both before instrumenting. Otherwise the new timers will measure behaviour that is about to change.

## Findings, by severity

### H1: Slots are visibility-order indices, so "only dirty ranges" rarely holds

`writeInstance(batch, counts[lod]++, …)` assigns slots in `wanted` order after CPU frustum culling. Each of the following shifts every later index:

- A tree entering or leaving the frustum.
- A near/far LOD transition.
- A queued cell becoming present during warm-up.
- A new selection, which re-sorts `wanted` around a new center. This happens every 40 m of ground movement.

`residents[index] !== resident` then fails for the whole tail, and both matrix and colour are rewritten. `DirtyRange` merges changes into a single min–max span, so two changes 4,000 slots apart upload everything between them.

Consequences for the acceptance criteria:

- **Stationary rotation re-uploads every frame.**
- **The "movement updates only changed slots" criterion is false by construction.** It holds only for a stationary, unrotated, fully placed view.

**Minimal fix:** separate *residency* from *visibility*.

- Keep a `Map<cellId, slot>` per batch.
- Allocate on entry. On exit, swap-remove: move the last slot into the hole, costing two slot writes, and keep `count` contiguous.
- Remove per-instance CPU frustum culling from retained batches. The GPU clips cheaply at these counts. Chunk-level culling belongs in Stage E, and shadows will need off-screen casters anyway.
- Replace the single min–max range with a small list of coalesced ranges (for example, at most 8), or accept a full upload once the dirty fraction exceeds about 25%.

### H2: A water-bucket change blanks the forest and can back up the worker without limit

On `water !== this.water` the code does three things:

1. Clears `cache`, so every `resident?.present` is undefined and **nothing draws**.
2. Resets `selecting = false`.
3. Immediately posts a new request, because `center` is Infinity.

Per the tile code's own comment, geological playback crosses a 25 m bucket roughly every 40 ms. A selection job over a 4.5 km range is plausibly longer than that (see M1). Each frame with a bucket change posts another job while the old ones are still queued. All their results are discarded, and the forest never repopulates. Repopulating ~18k cells at 48 cells per frame also takes several seconds even after one isolated change.

`forestPopulationCells` does not depend on water; only placement does. So:

- Do not invalidate selection on a water change.
- Keep at most one request in flight. If the context changes mid-flight, set a `resubmit` flag and send the new request only when the old one returns.
- Double-buffer placement: keep drawing old residents until the new-bucket residents replace them cell by cell. This is the same "keep rendering until the rebuild lands" contract the terrain tiles already follow.

### M1: The selection cost lands on the main thread

The worker scans a box with half-width `angular*3`. That is about 1,500×1,500 cells at a 4.5 km range, around 2.25M `cubeDirection` calls, of which roughly 200k are hashed. The result is about 18k objects with string IDs, and structured-clone *deserialization* of those objects happens on the main thread. After that, `applySelection` builds Sets and filters over them.

This is a likely periodic hitch every 40 m. None of the current diagnostics captures it; `selectionMs` measures worker time only.

- Return packed typed arrays as transferables: face/ix/iy as `Uint32`, directions as `Float64`, and roll/height/yaw as `Float32`.
- Tighten the scan box to about 2× the angular radius.
- Time `applySelection`.

### M2: Coverage fade is recomputed per instance from eye distance

Edge fade, footprint fade and `altitudeFade` all depend on the eye position. Any movement or climb therefore rewrites coverage across the fade bands; between 3,000 and 3,500 m altitude, every instance is rewritten every frame.

Move the fade into the vertex shader instead. Add a `forestEye` uniform in the origin frame, and make per-instance data static: root position (already in the matrix) plus a flag for canopy representatives. Keep `instanceCoverage` only for real per-instance states such as lifecycle or future species masks.

### M3: The 256 m rebase threshold is far more conservative than precision requires

Positions are stored relative to the origin in unit-radius coordinates. An offset of 10 km on an Earth-sized body is about 1.6e-3 units, whose Float32 ULP (≈1.2e-10 units) is under 1 mm. The model-view translation is formed in float64 on the CPU.

At 256 m, descent or fast flight rebases, and rewrites every matrix, every few frames, or every frame above about 15 km/s. Derive the threshold from a precision budget instead: 2–4 km still keeps error well below 1 mm.

### M4: `instanceColor` is created lazily

`setColorAt` creates `instanceColor` on first use. That attribute has `StaticDrawUsage` and switches the shader variant (`USE_INSTANCING_COLOR`), which causes a first-use compile hitch. It also means `allocatedBytes` under-reports memory until the first write.

Preallocate `instanceColor` with `DynamicDrawUsage` in the constructor.

### L1: `scheduledUploadBytes` can double-count

When a hidden batch keeps its pending ranges, `flush` re-merges them and reports the bytes again on the next frame. Count actual uploads through the attribute `onUpload` callback, and report the scheduled value separately.

### L2: The canopy handoff has no hysteresis

The handoff at 550 m horizontal distance (`forestFootprintM − 100`) has no hysteresis band. A representative tree near that boundary can switch between batch 1 and batch 2 repeatedly. Geometry is identical so nothing pops visually, but slots churn. Add ±15 m of hysteresis, as `retainedNear` already does for the near LOD.

### L3: The forest's terrain sampler differs from the renderer's

The forest omits `surfaceAgeMyr`, while the renderer passes it. Confirm whether age affects `groundHeightM` when craters are off. Separately, tree roots use the authoritative `groundHeightM`, but the visible tiles are coarse and morphing, so float/sink should be tested against the drawn surface at 1–4 km.

### L4: A worker error permanently falls back to synchronous selection

After a worker error, selection runs on the main thread on every future refresh, which is a multi-ten-millisecond stall at every 40 m. Restart the worker at least once, as `PlanetRenderer.startWorker` does, and flag the fallback clearly in diagnostics.

## Rendering facts that should reorder the next steps

1. **Every forest-bearing body renders through the cloud capture path, which has no MSAA.** Forests require complex flora, which in practice means ocean worlds, which always get `VolumetricClouds`. Canvas `antialias` applies only to the fullscreen resolve quad; the actual scene capture into `RGBA16F` has no samples.
   - At 4K the 160 MiB budget gives `sceneResolutionScale` ≈ 0.976, so the whole scene is bilinearly upscaled slightly.
   - The "ordinary scene" timer is therefore almost irrelevant for forest views.
   - `alphaHash` foliage with no MSAA will shimmer, which confounds any visual judgement of trees, lighting or shadows.
2. **Trees get no aerial perspective.** Terrain applies its own fog in `opaque_fragment` (65 km scale). The Lambert forest, flora and fauna materials get none, so trees at 2–4 km will look saturated and dark against hazed ground.
   - Cloud haze uses a different constant (e-fold ≈ 667 km), so the three systems already disagree.

## Acceptance tests

| Sev | Test | Pass criterion |
|---|---|---|
| H | Stationary 360° yaw after warm-up | Per-frame `matrixWrites`/`colorWrites` are at most the number of trees entering or exiting. Currently expected to fail. |
| H | Walk 200 m at 2 m/s, no rebase | At each 40 m reselection, writes are far fewer than `visibleTrees`. |
| H | Geological playback for 10 s | At most one worker job in flight (add a diagnostic); `visibleTrees > 0` in at least 95% of frames. |
| H | Stationary, placement queue empty | `onUpload` bytes are 0 across 300 frames. |
| M | Cross a rebase | Projected screen positions of ten canonical roots move ≤ 0.25 px. |
| M | Leap A→B→A beyond cache eviction | Same IDs and the same planet-frame matrices (bitwise in float64 before Float32 conversion). |
| M | Ascent from 2,900 to 3,600 m | Smooth coverage fade; `matrixWrites` = 0 except on rebase. |
| M | Main-thread long tasks during 1 km of flight | No long task over 16 ms attributable to selection apply or deserialization. |
| L | Hover at the 550 m canopy boundary | Zero batch switches per second once settled. |
| L | Forced worker error | Selection continues; the fallback is visible in diagnostics. |

## Critique of the planned next steps

Instrumenting before making visual changes is right. Four amendments:

- **Fix H1 and H2 first, or in parallel.** Stage B's claims currently depend on them, and timing a design that is about to change wastes the baseline.
- **Add passes to the timer list:**
  - The lake reflection render (`renderLakeReflection`), an offscreen pass otherwise misattributed.
  - The future shadow map. Three renders shadows inside `renderer.render`, and timer queries cannot nest. Accept "capture including shadows" and measure the shadow cost with an A/B toggle.
- **Move the AA decision ahead of shadows.** Compare two options:
  - An MSAA capture target (Three `samples` with depth resolve), combined with `alphaToCoverage` for forest coverage.
  - SMAA or FXAA on the resolved output.

  4× MSAA `RGBA16F` at 1440p adds on the order of 150–200 MB and must be counted in the cloud budget, where `allocatedBytes` currently assumes 12 B/px. Also measure log depth's `gl_FragDepth` cost with a toggle; foliage overdraw is where losing early-Z would hurt most.
- **Split "unify lighting and shadows" into three gated steps:**
  1. Shared aerial perspective.
  2. An ambient model.
  3. One bounded shadow region.

  Each step should have a before/after pixel-difference test at fixed poses.

## Minimal architecture: profiler

- **Opt-in.** Enable with `FrameProfiler` behind a URL flag; otherwise a null object with zero queries and zero allocations.
- **API.** `frameBegin()`, `pass(name, fn)`, `frameEnd()`. `pass` asserts it is not nested, because only one `TIME_ELAPSED_EXT` query can be active at a time.
- **Query rings.** Keep a ring of about 6 queries per pass name.
  - Poll the oldest pending query with `QUERY_RESULT_AVAILABLE`. Results never become available within the same task.
  - If a ring slot is still busy, skip that pass this frame and count it as `dropped`. Never block.
  - After polling, check `GPU_DISJOINT_EXT` once per frame. If set, discard all pending results.
- **Wiring.**
  - `VolumetricClouds.render` takes an optional profiler and wraps the capture per eye, the integration pass and the resolve.
  - `main.ts` wraps the ordinary render and the lake reflection.
- **Contamination flags.** Record deltas in `renderer.info.programs.length` and in upload bytes (via `onUpload`), so frames containing compiles or uploads are marked rather than trusted.
- **CPU metrics.** Record the rAF interval, `planetTiles.update`, forest/life update, render submission, and `PerformanceObserver('longtask')` entries.
- **History.** One `Float32Array(1024)` ring per metric. Compute p50/p95/p99 only when diagnostics are requested (copy and sort). Count hitches above 2× median and above 33 ms. `mark(label)` starts a named window so cold and warm streaming are reported separately.
- **Tolerate missing support.** SwiftShader and Firefox commonly lack the timer extension, so tests must accept `gpu: null`.

## Minimal architecture: lighting and shadows

- **Aerial perspective.** Use one shared per-frame uniform object: view-space sun direction, eye altitude in metres, metres per view unit, planet-up in view space, the `air` flag, and the colours.
  - Put the calculation in a single chunk inserted before `<opaque_fragment>` in the terrain, forest, flora, fauna and water materials.
  - Approximate fragment altitude as `eyeAlt + dot(viewPos, upView)·mpu − d²/2R`, using the existing terrain constants.
  - Migrate terrain to the chunk last, with a pixel-difference check against the current output.
- **Ambient.** Replace the constant 0.22 ambient with a hemisphere light driven by sun elevation.
- **Shadows.**
  - One directional shadow of about 400 m that follows the eye, with the shadow camera snapped to the texel grid.
  - Set `shadowMap.autoUpdate = false` and update once per frame; XR otherwise renders the shadow map twice.
  - Use a `customDepthMaterial` for the forest that includes coverage and alpha hash, so faded trees do not cast full shadows. Use one for terrain that includes the patch morph.
  - Express bias in metres, converted to render units.
  - Verify log-depth behaviour with an orthographic shadow camera.
- **Cloud shadow.** The cloud resolve currently darkens the whole pixel. Once scene shadows exist, it should attenuate only direct light, or areas already in shadow will be darkened twice.