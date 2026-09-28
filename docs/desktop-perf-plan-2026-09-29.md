# Desktop frame-cost plan (handoff task 4)

Date: 2026-09-29. Planning basis: `desktop-rendering-stage-c` at `4ed2fec`
(fauna continuity + rock acceptance merged); detailed tree families becoming the
default desktop forest is landing separately.

## Hardware floor (user decision, 2026-09-28)

**RTX 3060-class desktop at 2560×1440, 60 FPS → 16.7 ms frame.** Only an RTX
5090 (driver 617.14, 32 GB, already power-limited to 400 W — the minimum) and a
Ryzen 9 9950X exist locally, so every "floor" number is a labelled **proxy**,
never a 3060 result. A real-hardware run is still required before claiming the
target.

### GPU proxy
1. Preferred (needs an elevated shell, user action, exclusive GPU):
   `nvidia-smi -lmc 7001` + `nvidia-smi -lgc N,N` calibrated so 3DMark Time Spy
   Graphics ≈ 8,700 (3060 12 GB); reset with `nvidia-smi -rgc; nvidia-smi -rmc`.
   Caveats: 11 vs 3 GPCs under-represents geometry cost; 96 MB L2 flatters
   bandwidth-bound passes.
2. Always reported, no admin: measured GPU pass time × **5.4** (Time Spy 5090
   ≈ 46.9k vs 3060 ≈ 8.7k), bracket 4.5–6.5×, same resolution, uncontended.
3. Chrome flags are hygiene only: `--use-angle=d3d11 --disable-gpu-vsync
   --disable-frame-rate-limit --force-device-scale-factor=1
   --disable-renderer-backgrounding --disable-background-timer-throttling`.

### CPU proxy (no admin; the frame is CPU-bound)
Reference Ryzen 5 5600 / i5-12400. CDP `Emulation.setCPUThrottlingRate`
rate **1.7** and harness launched with affinity `0xFFF` (6C/12T). Label:
"CPU proxy: 9950X, CDP throttle 1.7×, affinity 0xFFF".

## Per-system budget (target machine, 2560×1440, p95)

| System | CPU ms | GPU ms |
|---|---|---|
| Terrain | 1.8 | 3.0 |
| Forest near (LOD0 detailed) | 0.6 | 1.5 |
| Forest middle (LOD1 + handoff) | 1.0 | 2.0 |
| Forest far (canopy, far atlas) | 0.5 | 1.0 |
| Understory flora | 0.7 | 1.2 |
| Fauna | 1.4 | 0.5 |
| Clouds | 0.2 | 2.5 |
| Rocks | 0.5 | 0.4 |
| Sky / atmosphere / ocean / lights | 0.4 | 1.2 |
| Overhead (submission 3.8 + app 1.0 / GPU composite, AA, UI) | 4.8 | 1.6 |
| Reserve (GC, browser, jitter) | 4.8 | 1.8 |
| **Total** | **16.7** | **16.7** |

Host-equivalent limits without throttling: CPU ÷ 1.7, GPU ÷ 5.4.

Starting gap (770d807, 1440×1000, contended): CPU frame p95 28.2 ms (≈48 ms on
target → ~3.5× reduction needed); GPU pass sum p95 10.38 ms (≈20 ms at 1440p on
the 5090, ≈110 ms on a 3060 by ratio). Detailed families raise triangles ~7×.
GPU levers: per-tree-LOD triangle caps (middle ≤ ~1.5k, near ≤ ~15k), a shorter
middle→far-atlas handoff than 550–600 m, LOD1/impostor shadow casters, and a
3060 quality profile (clouds at resolution 0.5, ~40 steps; scene render scale
~0.75).

Memory/streaming bounds: 256 MiB core + 160 MiB clouds; explicit forest/far
atlas byte budget; terrain pending ≤ workers×2; `staleWaterPatches` → 0 within
3 s of a seek; forest placement queue drains within 2 s of a new selection,
life queue within 1 s.

## Measurement protocol

Fixed: seed `LETHRA-001`, body `G001/C2128,0,1/0/planet/1`, living date
`435084631200000032044300000`, fauna date `435084631200000040194500000`, shore
A/B dates from `rock-acceptance-2026-09-28.md`, optional barren moon
`planet/1/moon/0`. Viewport 2560×1440 DPR 1, production `vite preview`, 3
repeats alternating A/B, conditions native / CPU proxy / GPU proxy.

| Scenario | Script | Signals |
|---|---|---|
| S0 cold load | fresh context, cold+warm HTTP cache | time to ready/surface/forest/life, pending=0, >33/>50 ms frames in first 10 s |
| S1 settled | ~100 m and 1.7 m eye, 10 s, paused and realtime | CPU/GPU p50/p95/max, forest writes = 0 |
| S2 turning | scripted 90°/s yaw, 8 s | p95/max, forest origin version unchanged |
| S3 movement | low flight 40 m/s @120 m 20 s; walk 1.6 m/s | p95/max, selection-apply spikes, backlog series |
| S4 date seek | shore A→B→A and inland | time to staleWaterPatches=0, peak reservedCombinedBytes ≤ budget, hitch |
| S5 handoff | approach/retreat across 110 m, 550/600 m, fauna near-rig exit | per-frame representation counts, no duplicates/pops |
| S6 flight→landing | 15 km → touchdown through clouds | forest below 3,500 m, life/rocks below 350 m before 125 m; frame distribution |

Record: commit from `build-info.json` (fail if dirty/missing), Chrome version and
flags, WebGL renderer, `nvidia-smi` before/after (driver, power limit, clocks,
locks, processes → mark "contended" if another GPU process exists), CPU model,
throttle, affinity, `crossOriginIsolated`, viewport + drawing buffer, all
quality settings, p50/p95/p99/max, hitch counts, heap, accounted/reserved bytes,
backlog series.

Missing today: per-system CPU histograms every frame; per-system GPU attribution
by hide-one-system at a frozen pose (`__atlas.setSystemVisible`);
`__atlas.qualitySettings`; build/hardware/throttle metadata; scripted constant
rate turn/flight; longtask/hitch counters; COOP/COEP on preview; 2560×1440 runs;
exclusive-GPU guard; the URL `heading` restore (faces ≈π away).

## CPU hotspots (identity-preserving fixes)

1. `planet-forest.ts:629-687` per-active-cell loop every frame (5.9 ms settled):
   still-frame key (like rocks `380f375`), cached per-resident invariants, 1 m
   eye hysteresis for distance membership, turn-only frustum test with group
   broadphase, coverage writes only on change.
2. `planet-forest.ts:140-153` selection apply (48.5 ms spike every 40 m):
   diff-apply or worker-built typed arrays, double-buffered.
3. `planet-renderer.ts:1052-1088` terrain per-leaf loop (~1.7 ms in Node):
   cached per-leaf records with numeric keys, stitching only on leaf-set change,
   eviction sort only when over limit.
4. Submission (4.5/6.6 ms): shadow-map caching while sun/light camera/casters
   unchanged; shared tile materials (measure first); cheaper detailed-tree
   shadow casters.
5. `drawFauna` `planet-renderer.ts:1338-1382`: herd-level frustum cull, pooled
   allocations, `faunaDrawn` only on diagnostics request.
6. `drawFlora` 1219-1277: retained rebasing origin, cached slot matrices.
7. Realtime only: memoize `lifeGateContext` species arrays (`main.ts:278-305`).
8. Rock rescatter spikes 4–6 ms in flight: spread over frames.

Every optimization gets a digest test comparing old/new per-frame outputs at the
same key; none may change canonical cells, placements, IDs or dated poses.

## Terrain starvation near water (rock receipt)

`renderer-memory.ts:18` subtracts the 28 MiB rock reserve from terrain; 390
protected leaves + ancestors (534 tiles) now fill the budget, a same-key stale
refresh is charged as a new tile (`planet-renderer.ts:1113`) although `install`
releases the old copy, eviction frees nothing, and pressure merging (999) only
runs when the view changed. Fix: a refresh reserve (`maxInFlight × P`) that new
admissions cannot use but same-key rebuilds can; byte-aware splitting (1039);
merge under pressure even when stationary with 0.94/0.90 hysteresis;
`refreshReserveBytes`/`blockedRefreshes`/`blockedAdmissions` diagnostics; Node
test with saturated budget + stationary camera + sea-level change.
