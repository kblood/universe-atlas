# Desktop perf harness receipt (handoff task 4b)

Date: 2026-09-29. Branch `opus55/perf-harness-20260929` from `9420bdd`.
Plan: `docs/desktop-perf-plan-2026-09-29.md` (budgets, proxies, scenarios).

This receipt covers the **measurement harness only**. It does not optimise any
system. The baseline below was measured on the RTX 5090 + 9950X workstation with
proxies; it is **not** RTX 3060 evidence.

## What was built

### In-app instrumentation (`?profile=1`, zero cost when off)

- `src/render-profile.ts`: a per-frame, per-system CPU histogram
  (`cpu/system/<name>Ms`) for `terrainTiles, sky, forest, canopy, flora,
  lifeScatter, fauna, rocks, clouds, submission, shadow, other`. The systems do
  not overlap, and `other` is frame work minus the attributed systems, so each
  frame's rows sum to `cpu/frameWorkMs`. Other additions:
  - hitch counters (`>33`, `>50`, `>100` ms frame intervals, max interval);
  - an adjustable history (600 by default, capped at 36,000);
  - `samples()` for the raw per-frame series.

  `systemTimer` is the only hook the systems use. It returns 0 and records
  nothing while profiling is off.
- `src/planet-renderer.ts` / `src/planet-forest.ts` contain only thin hooks:
  timers around the existing sub-updates, `profilingObjects(system)` (which
  three.js objects a system draws), and `backlog()` (queue, residency and
  memory counters for time series). Neither file's behaviour changes.
- `src/main.ts` `__atlas` debug API:
  - `setSystemVisible(name, on)` and `profilingSystems`: `terrain, sky,
    forestNear, forestMiddle, forestFar, flora, fauna, rocks, clouds,
    shadow`. A hidden system's objects are set invisible **only for the render
    passes of each frame** and restored in `finally`, so the systems' own
    visibility and invalidation logic never sees the change. `shadow` skips the
    shadow-map update and `clouds` skips cloud integration.
  - `qualitySettings()`: URL toggles (trees, detail, lighting, horizon, clouds);
    renderer pixel ratio, DPR cap, CSS viewport and drawing buffer, antialias,
    log depth, tone mapping, shadow type and map size, anisotropy; cloud
    resolution, steps, light steps and scene samples; forest assets; surface
    lighting; hidden systems; and every static capacity (`PLANET_DETAIL`, terrain
    tile cache and draw limit, memory budgets, flora slots, fauna capacity and
    constants, rock tiers and budgets). The static capacities come from
    `src/quality-settings.ts`.
  - `setPose(bodyRelativeM[3], quaternion[4], clearanceM?)`: a frozen flight
    pose. With a clearance, the pose is snapped radially onto the app's own
    terrain.
  - `setPerfMotion({yawDegPerS, speedMps, clearanceM, descentPerS,
    minDescentMps} | null)`: scripted constant-rate yaw and level travel. It
    holds terrain clearance or descends exponentially with a minimum rate.
  - `perfSample()`: backlog, JS heap, pose, heading and clearance.
  - `setProfileHistory(n)` and `renderProfileSamples(names)`.
- `vite.config.ts`: COOP `same-origin`, COEP `require-corp` and CORP
  `same-origin` on **both** `vite dev` and `vite preview`. The app loads no
  cross-origin resources, so nothing broke. `crossOriginIsolated === true` is
  recorded in every harness run (see the baseline). `dist/build-info.json` now
  also carries `branch` and `subject`.
- **Heading restore fix** (docs/fauna-continuity-2026-09-28.md, "faces ≈π
  away"). The cause was that landing re-derived the view with
  `projectOnPlane(up)`. When the saved view was near-vertical, that projection
  collapsed and flipped the sign. Two changes fix it:
  - A saved `heading` is now restored **exactly**. `prepareLanding` carries the
    quaternion through to walker creation.
  - The generic fallback, `levelForward()` in `src/view-heading.ts`, is
    sign-aware.

  `tests/view-heading.test.mjs` covers level, near-vertical down, and the
  near-vertical-up regression geometry. Every harness run also records the
  restored-vs-requested angle (`headingRestore.angleDeg`).

  Note that the fixture URLs in the fauna and rock acceptance tests compute
  their heading from `radius + 12 m`, which is about 1.17 km **below** the
  ground there. Their heading therefore looks steeply up. That is a problem in
  the fixtures, not the app. Those files were left alone.

### Harness

- `tests/desktop-perf.browser.mjs` runs the scenarios S0–S6 from the plan at
  2560×1440, DPR 1, against the production `vite preview` on port 5195. It
  builds first and fails if `dist/build-info.json` is not HEAD or is dirty.
- It runs 3 repeats × conditions `native` and `cpu-proxy`. Each condition ×
  repeat gets a **fresh browser**, and the condition order alternates per
  repeat.
  - `native` runs on all cores. Its CPU rows are scaled × 1.7.
  - `cpu-proxy` uses CDP `Emulation.setCPUThrottlingRate` 1.7. The harness also
    pins its own chrome processes to affinity `0xFFF` (6C/12T) right after
    launch, via `ProcessorAffinity`. Children spawned later inherit the mask.
    The per-process masks are recorded. Set `ATLAS_PERF_CPU_AFFINITY=none` to
    disable pinning, or pass another mask.
- `tests/helpers/gpu-lock.mjs` wraps each browser run in the machine-wide GPU
  lock (`mkdir C:/LLM/IWSDK/.gpu-browser-lock` plus `owner.txt`). The harness
  waits for the lock, retrying every 60 s. It launches no browser without the
  lock. It releases the lock in `finally` as soon as the browser closes, and
  also on exit or SIGINT. While it holds the lock, a 60 s heartbeat rewrites
  `owner.txt`.

  **Stale-lock guard** (coordinator rule, 2026-09-29): a lock is taken over
  only when both of these are true:
  - its `owner.txt` is older than 20 min (`ATLAS_GPU_LOCK_STALE_MS`);
  - no `chrome`, `chrome-headless-shell`, `headless_shell` or `chromium`
    process is running.

  The takeover is logged as `TOOK OVER stale lock …`, with the old owner. It
  works by renaming the stale directory away (only if `owner.txt` is unchanged)
  and then re-running the atomic `mkdir`. A live lock is never broken, and
  release never removes a lock that is no longer ours. `tests/gpu-lock.test.mjs`
  covers these cases (3 tests, part of `npm test`).
- `tests/helpers/perf-host.mjs` records the host and GPU state:
  - an nvidia-smi snapshot before and after each run: name, driver, pstate,
    power limit and draw, clocks and max clocks, clock-event reasons, the
    application-clocks flag, and the `-q -d CLOCK` report;
  - the **process table**, with each process classified as desktop, contender
    or user-browser;
  - GPU utilisation over 3 s before the run;
  - a 1 Hz background sampler during the run (clocks, power, utilisation);
  - the CPU model, the harness affinity mask, and the affinity of each spawned
    chrome process.
- The harness also records:
  - Chrome version and flags, the WebGL unmasked renderer, and timer-query
    availability;
  - `crossOriginIsolated`, `qualitySettings()`, the viewport and drawing
    buffer;
  - long tasks (PerformanceObserver) and hitch counts;
  - JS heap, accounted and reserved bytes against budget;
  - a backlog time series at 4 Hz, or 10 Hz for S4–S6.
- `tests/helpers/perf-report.mjs` maps the per-system CPU series and the GPU
  hide-one-system deltas onto the plan's budget rows and writes
  `summary.md`. Conversion to target-equivalent values:
  - CPU: native × 1.7; the cpu-proxy condition is read directly.
  - GPU: × 5.4, with the bracket 4.5–6.5 shown.

  Each row gets PASS or FAIL, and there are overall CPU, GPU and overall
  verdicts. A run is labelled **CONTENDED** if any of these is true:
  - a foreign GPU process (a headless browser, python, blender, node, …) appears
    in the nvidia-smi process table;
  - GPU utilisation was above 15 % before the run;
  - host CPU load was above 20 % before the run. Other agents' builds and
    tests show up here, and the GPU lock does not serialise them;
  - a user browser (Opera, Brave, Edge, Firefox) is open;
  - a run failed;
  - the tree was dirty.

  Waiting for the lock is recorded but is not contention, because the lock is
  exclusive while held.

| Scenario | What the harness does |
|---|---|
| S0 | Cold `goto` of a `walk=&heading=` URL, then a warm reload. Milestones from a 50 ms in-page poller: `api, firstFrame, ready, surfaceReady, grounded, forest (trees or far canopy), flora, fauna, rocks, settled`. Flora and fauna count only while their groups are visible. Hitches and long tasks in the first 10 s. |
| S1 | Walking eye at 1.7 m: 10 s paused, then 10 s realtime. 100 m pose: 10 s paused. Sampled forest matrix/colour writes. |
| GPU attribution | Native only, at the 100 m and 1.7 m poses. Keys `none, <each system>, all, none-after`: 600 ms warm-up, then 2.5 s capture of the `gpu/framePassSumMs` p95. Row = baseline (median of `none`, `none-after`) − hidden. Overhead = `all`. |
| S2 | 90°/s yaw for 8 s at 1.7 m clearance. Checks whether the forest origin version changes. |
| S3 | 40 m/s at 120 m for 20 s. 1.6 m/s at 1.7 m for 20 s: a walk proxy, because the walker's own speed is fixed at 4 m/s. Records selection-apply changes and max, plus the backlog series. |
| S4 | Inland hover at 160 m, then the deterministic shore site (`findShoreSite`) at 160 m. A→B→A seek (A = `…032044300000`, −4500 m; B = one 25 m bucket higher, −4475 m, same orbital phase). Records time to `staleWaterPatches=0` and `terrainPending=0`, and peak `reservedCombinedBytes` against the budget. |
| S5 | 30 m/s for 20 s outwards, a 180° turn, then 20 s back at 1.7 m, sampled at 10 Hz. Records representation counts (forest near and visible, flora, fauna visible, near rigs). |
| S6 | `setPose` 15 km above the site, then descent (0.3/s exponential, minimum 3 m/s) to 1.7 m through the clouds, within at most 60 s (never shortened). Records the clearance at which forest (any tier, including the far canopy), trees (LOD0/1), flora, fauna and rocks first appear, and the frame distribution. |

## How to run

Run these from the worktree root. The harness builds, serves on port 5195, and
takes and releases the GPU lock itself.

```powershell
# Plain native + CPU-proxy run (3 repeats, all scenarios):
node tests/desktop-perf.browser.mjs

# The harness pins the cpu-proxy browser to 0xFFF itself. Alternatively, pin the
# WHOLE harness (every condition, including native) the way the plan describes.
# From PowerShell, /b keeps the output in this console:
cmd /c start `"`" /b /affinity FFF /wait node tests/desktop-perf.browser.mjs
# (From cmd.exe: start "" /b /affinity FFF /wait node tests/desktop-perf.browser.mjs)

# Useful variants:
$env:ATLAS_PERF_REPEATS=1; $env:ATLAS_PERF_SCENARIOS='S1,S2'; node tests/desktop-perf.browser.mjs
$env:ATLAS_PERF_SKIP_BUILD=1   # reuse dist/ (still must be HEAD and clean)
$env:ATLAS_PERF_SHORT=1        # quarter-length capture windows (harness development only; labelled)
$env:ATLAS_PERF_OUT='test-results/desktop-perf/my-run'
```

Output goes to `test-results/desktop-perf/<sha>-<timestamp>/report.json` and
`summary.md`. The exit code is 0 when every browser run completed. A budget
FAIL is data, so it does not change the exit code.

### GPU clock-lock proxy (admin, user action, exclusive GPU)

The ×5.4 ratio is always reported. The preferred GPU proxy locks the 5090's
clocks down to 3060-class throughput. It needs an **elevated** PowerShell and
must run with no other GPU work:

```powershell
# 1. Lock memory and graphics clocks (elevated shell):
nvidia-smi -lmc 7001
nvidia-smi -lgc 1100,1100     # starting guess; calibrate N below
# 2. Calibrate: run 3DMark Time Spy; adjust N (nvidia-smi -lgc N,N) until the
#    Graphics score is about 8,700 (RTX 3060 12 GB). Record N.
# 3. Run the harness, declaring the lock so the report carries it
#    (the nvidia-smi snapshots also record clocks and the applications-clocks reason):
$env:ATLAS_PERF_GPU_CLOCK_LOCK='lgc=N,lmc=7001'; node tests/desktop-perf.browser.mjs
# 4. ALWAYS reset afterwards (elevated):
nvidia-smi -rgc
nvidia-smi -rmc
```

Caveats (from the plan):
- 11 vs 3 GPCs under-represents geometry cost.
- The 96 MB L2 flatters bandwidth-bound passes.
- The power limit is already 400 W, the minimum.

With a clock lock active, read the GPU rows **without** the ×5.4 factor. The
report still prints the ratio columns, so the declared lock is what
distinguishes the two cases.

## Baseline (CONTENDED label rules above)

**CONTENDED. This is not acceptance evidence.** Run at `be4faff` (clean build,
`crossOriginIsolated` true in all 6 runs), 2026-09-29 06:28–07:08 UTC.
- Setup: 3 repeats × `native` and `cpu-proxy`, all scenarios, 2560×1440 DPR 1.
  Chrome 149.0.7827.55 headless shell, ANGLE D3D11, RTX 5090, driver 617.14,
  400 W limit, no clock lock (graphics clock p50 per run was 1,417–2,325 MHz).
- Why contended:
  - host CPU load before the runs was 52 / 10 / 45 / 13 / 25 / 13 %, from
    other agents' builds and tests;
  - Opera and Brave were open.
- What was clean:
  - no foreign GPU process appeared in the nvidia-smi table;
  - GPU utilisation before each run was 1–3 %;
  - none of the runs waited for the lock.
- Full tables: `docs/desktop-perf-baseline-2026-09-29-contended.md`.
- Raw data: `test-results/desktop-perf/baseline-be4faff/report.json` (46 MB,
  not committed).

**Overall verdict: FAIL** on both CPU and GPU.

### CPU, target-equivalent p95 ms (median of 3)

Native columns are host × 1.7. The cpu-proxy columns are measured directly
under a 1.7× throttle with affinity 0xFFF.

| System (budget) | S1 ground paused (native / proxy) | S1 100 m | S2 turn 90°/s | S3 flight 40 m/s | S3 walk |
|---|---|---|---|---|---|
| Terrain (1.8) | 4.6 / 5.7 | 9.9 / 10.4 | 10.7 / 11.8 | 10.3 / 10.5 | 7.7 / 10.6 |
| Forest near+middle (1.6) | 6.4 / 13.7 | 6.9 / 8.3 | 7.4 / 9.0 | 9.1 / 14.6 | 6.7 / 8.8 |
| Forest far canopy (0.5) | 0.03 / 2.4 | 0.04 / 0.11 | 0.05 / 0.13 | 0.94 / 2.3 | 0.04 / 0.11 |
| Flora + life scatter (0.7) | 1.1 / 1.1 | 1.2 / 1.2 | 1.2 / 1.2 | 4.4 / 14.6 | 1.6 / 2.8 |
| Fauna (1.4) | 7.4 / 8.5 | 8.0 / 7.8 | 14.6 / 16.0 | 8.3 / 8.3 | 8.7 / 12.0 |
| Clouds (0.2) | 0.10 / 0.19 | 0.12 / 0.19 | 0.14 / 0.20 | 0.13 / 0.24 | 0.11 / 0.21 |
| Rocks (0.5) | 0.05 / 0.13 | 0.06 / 0.13 | 0.58 / 0.78 | 0.97 / 5.5 | 0.59 / 0.94 |
| Sky/atmosphere (0.4) | 0.01 / 0.01 | 0.01 / 0.01 | 0.01 / 0.01 | 0.01 / 0.01 | 0.01 / 0.01 |
| Overhead: submission + shadow + other (4.8) | 8.8 / 12.4 | 10.2 / 12.3 | 12.1 / 15.3 | 10.9 / 13.0 | 10.0 / 13.7 |
| **Frame work (11.9)** | **25.5 / 42.5** | **32.4 / 37.7** | **41.4 / 49.2** | **40.3 / 52.6** | **31.2 / 44.5** |
| Frame interval p95 (16.7) | 26.3 / 43.2 | 33.3 / 38.6 | 42.4 / 50.9 | 43.0 / 63.6 | 32.1 / 45.6 |

The cpu-proxy condition reads 1.16–1.64× worse than native × 1.7. Frame
interval p95, native × 1.7 vs cpu-proxy:
- ground paused: 26.3 vs 43.2 ms;
- 100 m: 33.3 vs 38.6 ms;
- turning: 42.4 vs 50.9 ms;
- flight: 43.0 vs 63.6 ms;
- walk: 32.1 vs 45.6 ms.

The proxy also loses cores (12 vs 32 threads) for the workers and main-thread
contention, so a linear ×1.7 of native is an **optimistic** lower bound.
Quote the cpu-proxy numbers for the target.

The largest CPU gaps against budget:
- Fauna: 5–10× over budget. It worsens while turning (14.6 ms).
- Terrain: 3–6×.
- Forest (near and middle combined): 4–9×.
- Overhead: 2–3×.
- Flora and life scatter spike while flying (4.4 native, 14.6 proxy).
- Rocks spike in the proxy flight (5.5).

### GPU ratio proxy (native, hide-one-system, ×5.4)

| Pose | Unhidden pass sum p95 → ×5.4 (budget 14.9) | Largest attributable (Δp50 ×5.4) |
|---|---|---|
| 100 m | 7.21 ms → **38.9 ms** (bracket 32.5–46.9) FAIL; p50 5.04 → 27.2 | terrain 9.5, far canopy 4.1, sky/ocean 3.3, flora 1.3, clouds 1.0 |
| 1.7 m eye | 6.29 ms → **34.0 ms** (28.3–40.9) FAIL; p50 4.38 → 23.6 | terrain 6.7, far canopy 2.5, fauna 1.6 |

Hiding forest LOD0 or LOD1 made no measurable difference at either pose (Δ 0).

With everything hidden, the pass sum p95 is still 2.9–3.1 ms, but its p50 is
only 0.19–0.22 ms. The p95 of these 2.5 s windows is spike-dominated, so treat
single-system Δp95 as ±0.3 ms noise and read Δp50 alongside it.

### Scenario signals (native unless marked)

- **S0 load.** Median of 3:
  - Cold: ready 4.7–5.0 s, surface 7.6–8.6 s, flora 7.9–9.0 s, settled
    19.3–21.6 s.
  - Warm: settled 17.7–20.2 s.
  - Cold first 10 s: 9–14 frames over 33 ms and 8–9 over 50 ms. The longest
    frame was 2.7 s (native repeat 1). The warm first 10 s had none.
  - cpu-proxy cold: 77–86 frames over 33 ms.
- **S1.** Sampled forest matrix and colour writes were 0 in all 3 native
  paused captures. The cpu-proxy paused captures sampled 90 / 214 / 130
  writes, which means work is still settling under throttle.
- **S2.** The forest origin version never changed during turning (3/3 in both
  conditions).
- **S3 flight at 40 m/s.**
  - Native: 22 frames over 33 ms and 16 over 50 ms in 20 s.
  - The largest selection-apply spikes were 68 / 43 / 50 ms native and
    94 / 87 / 104 ms proxy.
- **S4 seek.**
  - Peak reserved bytes were 327 MiB against a 416 MiB budget: within budget in
    24/24 steps.
  - **`staleWaterPatches` did not reach 0 within 12 s after A→B in 12/12
    runs.** Only 0–38 of 151–174 stale patches were rebuilt in that time.
  - The return seek (B→A) cleared in 9/12 runs (0.7–11.9 s), but only because
    the unrebuilt patches matched bucket A again.
  - This reproduces the open terrain issue in
    `docs/rock-acceptance-2026-09-28.md`: stale-bucket rebuilds are starved at
    the terrain byte-admission budget while the view is still. It fails the
    plan's 3 s bound.
  - The harness now waits up to 30 s and stops 2 s after the patches clear.
    The baseline itself used 12 s.
- **S5 traverse at 30 m/s, 1.7 m.** Native: 22–23 frames over 33 ms and 13–14
  over 50 ms per 20 s leg. cpu-proxy: 191–280 frames over 50 ms.
- **S6 descent from 15 km** (touchdown at about 28.4 s). First appearance, all
  6 runs:
  - forest (far canopy): 3,485–3,500 m. PASS against ≤ 3,500 m.
  - trees (LOD0/1): 539–554 m.
  - fauna: 341–349 m. PASS against ≤ 350 m.
  - rocks: 753–779 m, before 125 m.
  - **Every run had one 1.31–1.46 s frame at exactly the moment the far canopy
    appears (about 3,490 → 3,300 m).** The frame's CPU work was only 13–37 ms,
    so the stall happens outside the frame callback. It is probably first-use
    shader or pipeline compilation in the GPU process. That cause is
    **unconfirmed**.
  - Flora reports `floraSubmitted > 0` with the flora group visible at
    **15 km**, and keeps the 1,093 count left over from the ground pose. Either
    flora is still drawn at altitude or its visibility and counter are not
    cleared when life stops updating. This needs a look from the flora owner.
- **Heading restore.** The restored-vs-requested angle was 0° in all 6 runs,
  including after the S0 reload.

## Unresolved / limits

- **Proxy only.** Nothing here is RTX 3060 or Ryzen 5 5600 evidence.
  - The GPU clock lock was not applied, because it needs an elevated shell and
    user action (procedure above).
  - A run on real target hardware is still required.
- **Contended baseline.** Host CPU was 25–52 % busy before 3 of the 6 runs, and
  Opera and Brave were open. Re-run with the machine otherwise idle for
  acceptance numbers.
- **A/B build alternation** (plan: "3 repeats alternating A/B") is not
  implemented. The harness alternates the *condition* order per repeat, but it
  measures one build. To compare two builds, run the harness on each commit
  and compare the `report.json` files. There is no paired runner yet.
- **Forest CPU cannot be split by tier.** The forest update is one pass, so
  the near (0.6) and middle (1.0) budgets are checked combined (1.6).
  `canopy` (far) is timed separately.
- **GPU attribution noise.** It uses 2.5 s windows at a frozen pose. Δp95 is
  spike-dominated, so read Δp50 alongside it. Hiding a system also removes its
  shadow-casting draws from the shadow pass. The shadow row is the shadow-map
  update itself.
- **S3 walk** uses scripted terrain-following flight at 1.6 m/s and 1.7 m,
  because the walker's own speed is fixed at 4 m/s. It is not a walker.
- **S5 duplicates and pops** are reported as per-sample (10 Hz)
  representation counts only. Exact duplicate/pop correctness remains the job
  of the forest and fauna acceptance tests.
- **S4 in this baseline used a 12 s window.** The harness now uses 30 s with an
  early stop, so the next run will give actual clear times, or confirm that
  the patches never clear.
- **Findings for other owners** (not fixed here, outside this task's scope):
  - the S4 stale-sea starvation, for terrain;
  - the 1.3–1.5 s stall at far-canopy appearance during descent, for
    forest/renderer (cause unconfirmed);
  - flora counted and visible from 15 km, for flora.
- **Fixture headings.** The fauna and rock acceptance fixtures compute their
  `heading` from `radius + 12 m`, which is about 1.17 km below ground, so they
  look steeply up. The app now restores any given heading exactly (0° in all
  harness runs). The fixtures' own heading choice was left alone because those
  files are out of scope.
- **COOP/COEP on production hosting** (dionysus.dk) is not configured. Only
  `vite dev` and `vite preview` send the headers. Without them the deployed
  site keeps coarse timers, which is harmless for users.
- `dist/` also picks up everything under `test-results/`, including a 7 MB
  report, through the existing build configuration. That behaviour predates
  this branch and was left as is.

## Verification

- `npm test` at `c7ed667`: **816 tests, 813 pass, 0 fail, 3 skip**. The
  baseline at `9420bdd` was 807 / 804 / 3. The 9 new tests are 3 view-heading,
  3 render-profile and 3 gpu-lock.
- `npm run build`, which runs `tsc --noEmit` and then `vite build`: passes.
  The only warning is the existing rapier chunk-size warning.
- Harness validation: a short-window native run
  (`test-results/desktop-perf/validate1`) and the full 6-run baseline above,
  with 0 page errors in every run.
