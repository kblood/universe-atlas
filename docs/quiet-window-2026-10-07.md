# Quiet window 2026-10-07 (lane L0): GATE-1, GATE-6, GATE-5

- Run by one Opus agent; the only agent in the window. Host DESKTOP-N09QOSU, Node v24.7.0, 16C/32T.
- Main at the start: `39d1f0e`. Its `src/` is identical to `772cad3` (the tree that passed GATE-2/3/4,
  `docs/gate-2026-10-07.md` run 2). `772cad3..39d1f0e` adds only docs plus one unregistered, measure-only test
  (`tests/terrain-structural-spectrum.test.mjs` with its helper).
- Order: GATE-1, then GATE-6, then GATE-5, as the plan prescribes. The runners took the test slot and the GPU lock
  themselves, one level per command and never nested. Both locks were free before and after each gate, and **no lock is
  held now**.
- Nothing in source, pins, budgets, `known-failures.json` or golden was changed. Nothing was merged, pushed or
  deployed.

## Verdicts

| Gate | What | Verdict |
|---|---|---|
| **GATE-1** | Fair cost protocol: REF `9dcb1cf`, REF2 = identical copy, CAND `772cad3` (pinned) | **PASS: ALL MET** (8/8 budget cells). Least headroom: **Raiva orbit** 4.36 % with CI upper **5.49 %**, which is above the 5 % budget (see below). |
| **GATE-6** | `ECO_PERF_STRICT=1 npm run test:perf` on main `39d1f0e` | **FAIL: 1 NEW perf failure.** `placeAt` at full level measured **3,433 µs** against the relaxed 30 µs cap. It is a T6 regression (REF gives 1.43 µs). The ECO 25 ns strict test **PASSES** (21.6 ns). |
| GATE-5 | Massif-targeted Luna sheet, wired `772cad3` vs refmain `9dcb1cf` | **VISUAL-ADVISORY, UNCALIBRATED, not a verdict.** Recorded: wired 0 PASS of 6 (0/18/0 asks); refmain 0 of 6 (0/18/0). |

## GATE-1: fair cost protocol (pre-registered, decisions addendum (6), Q-A)

**Arms.** `git archive` exports in `C:/LLM/IWSDK/universe-atlas-wt/_fair-q/{ref,ref2,cand}`, with one `node_modules`
junction in their parent. Exports: REF = `9dcb1cf74307513b72d938e57b2fb7da3b64df41`, REF2 = a second identical
export (`diff -rq` empty), CAND = `772cad3b3f90676c2fd9191cfa347a84c15989f1` (critic correction 3: the GATE-2/3/4
sha, pinned). The records confirm the arms:
- A/B is `terrain-1.8.1-grain`, unwired, against `terrain-1.9.0-mountains`, wired.
- A/A is `1.8.1-grain` against `1.8.1-grain`.
- Every A/A orbit bake is byte-identical to its pair, and every A/B bake differs.
- Carving block solves inside the timed orbit bakes: 0.

**Harness.** Main's harness, run from main's checkout (`H` and `SLOT` resolve to `C:/LLM/IWSDK/universe-atlas`).
`scripts/cost-fair/*` and `tests/helpers/test-slot.mjs` were unchanged during the run (I4 has not landed). The
driver (`quiet-window-2026-10-07/gate1/fair-driver.sh`) is `run.sh` verbatim plus one hook. Before every counted
process, `pre` runs `precheck.mjs` (`driver.diff` shows the whole change). The hook:
- asserts that the shared holder dir `.atlas-test-slot.shared` is empty. This is a hard assert: the driver would
  abort, and it never fired;
- records the `perf-host.mjs` `classifyProcess` contenders from `tasklist` and `nvidia-smi` compute apps, diffed
  against the window-start baseline, together with host idle over 500 ms;
- waits in 15 s steps, up to 10 min, if a new strong contender appears (codex, chrome, blender, ffmpeg, python,
  llama) or host idle falls below 85 %. It then proceeds and FLAGS the process. Flagged processes are never dropped
  and never killed.

The counted protocol (point sets, arms, order, N = 30, commands, analysis) is unchanged.

**Contenders.**
- At the window start: no codex, chrome, ComfyUI or Blender, and no GPU contender. The baseline holds idle MCP
  servers (node and python), ollama serve, two idle `claude.exe` sessions (this one and session `390eef30`) and the
  AI-control-center node services. Host idle was 92.7 %.
- During the run, two transient `python.exe` processes (pids 47424 and 12500, not started by this agent, gone by
  the time they were inspected) each lasted past the 10-min wait. Two processes ran while one was present, both
  flagged: `orbit AA Lethuris ref i=10` and `c1 AA Maithea ref i=11`.
- 39 of 480 processes are flagged in total (18 C1, 21 orbit). Almost all are short idle waits (17-65 s).
  Waits totalled 55 min, and the minimum idle at a process start was 86.3 %. Wall time was 127 min
  (00:28:31Z → 02:35:53Z).

**Exits:** 480/480 exit 0, `orbit.err` empty, and 240 C1 plus 240 orbit records.

`node scripts/cost-fair/analyze.mjs` (main's, unchanged) gives the following. Medians are over 30 processes, with
the distribution-free 95 % CI from ranks 10 and 21:

| World | C1 weighted A/B [CI] | A/A [CI] | C1 judged vs 8 % | Orbit A/B [CI] | A/A [CI] | Orbit judged vs 5 % |
|---|---|---|---|---|---|---|
| Maithea | 5.77 [4.28, 7.69] | 0.71 [−1.26, 1.97] | **5.77 MET** | 3.08 [2.03, 4.71] | 0.91 [−1.13, 2.01] | **3.08 MET** |
| Selawyn | 2.83 [−0.11, 5.48] | −0.12 [−1.63, 1.40] | **2.83 MET** | 2.50 [1.82, 2.95] | −0.46 [−1.59, 0.70] | **2.50 MET** |
| Raiva | 4.61 [2.69, 6.55] | 0.61 [−2.49, 1.41] | **4.61 MET** | 4.36 [2.94, **5.49**] | 0.25 [−0.91, 2.23] | **4.36 MET** |
| Lethuris | 5.11 [3.39, 5.71] | 0.42 [−0.95, 1.51] | **5.11 MET** | 1.64 [0.48, 3.40] | −0.55 [−1.28, 1.28] | **1.64 MET** |

- A/A bias is demonstrated on no cell (every A/A CI contains 0), so each judged value is the A/B median. **ALL MET:
  true.**
- **Headroom.** The protocol judges the median, so every cell is MET. Raiva orbit's CI upper bound (5.49 %) still
  lies above the 5 % budget: the wired tree's Raiva orbit growth is not shown to be below 5 % at 95 % confidence.
  This is the least headroom of the run. Lethuris orbit, which had the least headroom on route A (CI upper 4.98 %),
  now has a lot (1.64 [0.48, 3.40]). Maithea C1 has the next-least: its CI upper is 7.69 % against 8 %.
- **INFO.**
  - C1 outside the massifs, A/B: +2.38 / +1.10 / +2.08 / +2.96 %.
  - In-massif A/B: +148 / +131 / +131 / +161 % (shares 2.3 / 1.1 / 1.7 / 1.2 % of land).
  - Against route A (4.55 / 1.60 / 3.32 / 5.14 % C1 and 2.92 / 3.01 / 2.78 / 4.20 % orbit), the wired tree is higher
    on C1 for Maithea, Selawyn and Raiva, and on orbit for Raiva. It is lower on Lethuris for both.
- **Sensitivity, INFO only, not the verdict.** Excluding the 39 flagged processes changes no verdict:
  - C1: 5.77 / 3.87 / 4.61 / 5.13 %;
  - orbit: 3.45 / 2.46 / 4.32 / 1.48 %;
  - Raiva orbit CI upper: 5.56 % (`gate1/sensitivity-info.txt`).

Evidence in `docs/quiet-window-2026-10-07/gate1/`:
- the analysis (`analysis.txt`, `analysis.json`);
- all raw records (`c1.jsonl`, `orbit.jsonl`, `exits.log`, `c1.log`);
- `precheck.jsonl` and `baseline.json`;
- the driver, `precheck.mjs`, `driver.diff` and `sens.mjs`;
- the point-set metadata (`points-*.json`) and the sha256 of the 8 point-set `.f64` files. The files themselves
  (115 MB) are in the git-ignored `test-results/quiet-2026-10-07/gate1/` in the main checkout.

## GATE-6: `npm run test:perf` (`ECO_PERF_STRICT=1`, other `*_PERF_STRICT` unset = relaxed defaults)

- Main `39d1f0e` (`src` = `772cad3`). Pre-check: idle 96.1 %, no new contender. Runner CPU gate: 10 % / 3 % / 1 %
  (< 25 % × 3).
- Exit **1**, wall 02:36:28Z → 02:43:37Z: `tests 11, pass 10, fail 1, skipped 0, todo 0`.

| Test (tests/perf/…) | Result |
|---|---|
| eco-class: regression guard ≤ 100 ns, no allocation | PASS (21.6 ns/call, heap delta −425,704 B) |
| **eco-class: acceptance ≤ 25 ns on a quiet host (ECO_PERF_STRICT=1)** | **PASS: 21.6 ns.** The OPEN 25 ns criterion is measured as met on a quiet host. |
| fauna-appearance-v2: far-LOD mean cost, 512 genomes | PASS (cold 47.3 ms, bursts 10.6–19 ms, cap 30, strict=false). This is a `known-failures.json` perf entry; it passed alone. |
| fauna-appearance-v2: 96 corpus bodies, coat CPU / step caps | PASS (maxCoat 11.03 ms, mean 5.81, longest step 11.4 ms, cap 40). Also a known-failures perf entry; it passed. |
| resumable build step timing cap | PASS |
| performance sanity (fauna coat swatches) | PASS |
| ocean-volume: hypsometry build and levelForLoss (relaxed) | PASS (build median 3.35 ms, levelForLoss 1.64 µs) |
| **place-query: `placeAt` at full level (relaxed 30 µs; strict 3 µs)** | **FAIL: 3,433.13 µs** (best of 3 × 40,000). The test took 414 s. **NEW**: not in `known-failures.json`. |
| season: seasonBasis ≤ 2 ms, seasonAt ≤ 5 µs | PASS (0.417 ms, 0.517 µs) |
| shadow-map-cache signature linear and cheap | PASS (0.153 ms for 602 casters) |
| surface: planetSurface multi-body job budget | PASS |

**Diagnosis of the `placeAt` failure (read-only, nothing fixed).** It is attributable to the T6 wiring:
- **Same test file on the REF arm (`9dcb1cf`, pre-T6): 1.43 µs, PASS** (`gate6/g6-ref-placeat.log`).
- A diagnostic (`gate6/placeat-diag.mjs`, 4,000 of the test's Fibonacci directions, Maithea, two rounds) counted the
  carving block builds:
  - REF: 2.0–6.5 µs per call, 0 builds.
  - Wired: about 3,212 µs per call. In each round, 88 calls (2.2 %, the in-massif points) take over 1 ms (max 289 ms)
    and trigger 88 carving block builds. **Round 2 rebuilds the same 88 blocks**: the truth-path blocks that
    `placeAt` touches are not kept resident.
- The cost is therefore M3 block solves on the truth path, at about 146 ms per in-massif point, with no residency
  between calls.
- C1, which measures warm resident cost, does not see this, and T4 removed it only for the orbit bake (0 block
  solves there). It is not load: the host was quiet, and the runner gate read 1 %.
- Exposure: `placeAt` is the documented games-facing query (`place-query-1`). A single call on a massif can take up
  to about 0.3 s.
- Fix direction, for the terrain or place-query owner (not applied): keep the solved truth blocks resident, through
  an LRU sized for scattered queries, or use the coarse field where a full solve is not needed.
- Allowlisting this failure in `known-failures.json` would be the wrong remedy: it is a real ~2,400× regression,
  not a load-sensitive timing.

Evidence: `docs/quiet-window-2026-10-07/gate6/` (`g6.log`, `g6.time`, `g6-precheck.jsonl`, `g6-ref-placeat.log`,
`placeat-diag.mjs`, `placeat-diag.log`).

**Not measured (outside this brief):** quiet-host or in-browser frame time of the wired build, which the scouts list
under GATE-6. Strict runs of `FAUNA_PERF_STRICT`, `SEASON_PERF_STRICT` and `OCEAN_PERF_STRICT` were also not done.

## GATE-5: massif-targeted Luna sheet (VISUAL-ADVISORY, UNCALIBRATED: record only, never cite as pass/fail)

**Tooling.** I added two files on this branch, `scripts/luna-capture/capture-massif.browser.mjs` and
`luna-capture-massif.sh`. They are derived from the preserved `capture-sheet.browser.mjs` and `luna-capture.sh`,
whose standard views, scoring and free-port logic are untouched. They add one view, `massifAxis`:
- **Target.** One AXIS station of `FROZEN_MASSIF_TILE_SET`, read from `772cad3`'s
  `tests/helpers/mountain-tile-set.mjs` (M1-only and frozen). The target is therefore the same direction on both
  arms.
- **Which station.** The one with the highest sun elevation under the page's sun direction, which is the same on
  both arms. It must be at least 20° above the horizon.
- **Eye.** The V3 rule around the fixed target, on each arm's own field (as for every standard view): dry ground
  8–20 km away on the sun side, with a clear line of sight from 250 m clearance; the largest drop wins. If no line
  of sight exists, the `sunSide` fallback is used and flagged `losBlocked`.

**Arms.**
- refmain = worktree `t6-refmain` (`9dcb1cf`). Its build (`dist/`, git-ignored) was rebuilt in place.
- wired = a temporary detached worktree `universe-atlas-wt/q-cand` at `772cad3`. A real worktree was needed because
  the vite build stamps `git rev-parse HEAD`. The worktree was removed after the run, junction first.
- Both builds were clean (`dirty: false`), served `9dcb1cf` and `772cad3` respectively, and had 0 page errors.
- Build and capture ran under one slot level each, and the capture took the GPU lock itself. Window 02:45:05Z →
  02:54:11Z, all four exits 0.

| World | Frozen axis idx | Sun elev | refmain ground / pose | wired ground / pose |
|---|---|---|---|---|
| Maithea | 5 | 32.5° | 190 m, Dry upland; V3 eye 20 km away (eye ground 1,069 m) | 2,553 m, Dry upland; **losBlocked** fallback |
| Lethuris | 6 | 74.7° | 331 m, Temperate; losBlocked fallback | 1,800 m, Alpine / polar snow; **losBlocked** fallback |
| Raiva | 4 | 51.1° | 957 m, Temperate; losBlocked fallback | 2,353 m, Temperate; **losBlocked** fallback |
| Selawyn | — | max 1.5° | **no view**: all 8 axis stations are unlit at the sheet's fixed date | same |

- On the wired arm, every target sits behind intervening massif terrain from the 8–20 km eye ring, so all three
  wired views are sunSide fallbacks (eye 8 km away, 400 m clearance, aimed at the target).
- By eye (`gate5/contact-noclouds.jpg`, no-cloud frames, left refmain, right wired):
  - wired Maithea shows ridged relief with snow;
  - wired Lethuris shows a snow-covered massif;
  - wired Raiva shows green ridged hills;
  - refmain is flat lowland at all three axis tiles.
- So the sheet does target a massif, unlike the standard `mountainV3` sheet.

**Luna.**
- Run: `scripts/luna-vote.mjs`, 3 asks per image, `gpt-6-luna`. Question: the calibration prompt verbatim,
  `test-results/mountains/assembly/luna/prompt-mountain-cal.txt`, sha256 `89f0115c…00cf`. Elements: the same list
  as the assembly and T6 sheets.
- Results: wired 0 PASS of 6 images (0 / 18 / 0 asks); refmain 0 PASS of 6 (0 / 18 / 0).
- Diagnosed elements:
  - refmain: massif height/silhouette on 6/6 images;
  - wired: summits/peaks 3, ridges and valleys/drainage 2, massif height/silhouette 1.
- Wired reasons read "soft, rounded swells without distinct peaks or sharp ridges" and "broad, rounded hills rather
  than a high mountain range".
- Comparison with the earlier sheets: assembly 0/24 asks and 0/22/2 on the calibration prompt; T6 standard sheet
  0/24 on 8 images; main 0/23/1. This sheet adds a massif-targeted 0/18. On wired, the diagnosed element moves from
  height/silhouette to peaks and ridges.
- None of this is citable: the question is UNCALIBRATED (3 of 6 positives in the CPU-path calibration), and the app
  capture path is not calibrated at all.

**Evidence.** In `docs/quiet-window-2026-10-07/gate5/`:
- both capture reports, including picks, poses and the tile-set provenance;
- the Luna JSON and logs, the exits and the pre-check;
- a downscaled contact sheet;
- the sha256 of the 12 PNGs.

The full-resolution PNGs (6.8 MB) are in the git-ignored `test-results/quiet-2026-10-07/gate5/luna-sheet/` in the
main checkout. The image paths inside the Luna JSON point to the session scratchpad, where the files were first
written.

## Left as found / cleanup

- Removed the GATE-1 arms folder `universe-atlas-wt/_fair-q` and the `q-cand` worktree. In both cases the
  `node_modules` junction was removed first with `cmd /c rmdir` (never `--force`); `git worktree remove` was run
  without `--force`. Main's `node_modules` was verified intact (vite and playwright present).
- `t6-refmain` stays. Its git-ignored `dist/` was rebuilt for GATE-5.
- No `.atlas-test-slot`, `.atlas-test-slot.shared` holder, `.gpu-browser-lock` or `.main-merge-lock` is held.

## For the merger / Kasper

1. **GATE-1 passes** on the pinned `772cad3`, so T6 meets its cost budgets under the fair protocol. Raiva orbit is
   the cell to watch: median 4.36 %, CI upper 5.49 % against 5 %. This settles plan decision 1 ("keep or revert T6
   if GATE-1 fails") on cost.
2. **GATE-6 fails** on a NEW, real T6 regression: `placeAt` at full level is about 3.4 ms per call, against 30 µs
   relaxed and 3 µs strict, because carving blocks are not resident on the truth path. This needs an owner and a fix
   (`needs:` terrain/place-query owner). Do not allowlist it.
3. ECO 25 ns criterion: measured MET (21.6 ns) on a quiet host. The owner can close the OPEN 25 ns criterion; the test's skip-unless-strict guard is unchanged.
4. GATE-5 is recorded only. A future massif sheet needs a pose rule that can see over the massif's own foreground,
   and a lit Selawyn station (a different date or station).
