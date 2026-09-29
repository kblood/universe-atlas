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

BASELINE_PLACEHOLDER

## Unresolved / limits

LIMITS_PLACEHOLDER
