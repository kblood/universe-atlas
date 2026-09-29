# Terrain budget and leaf loop: receipt (2026-09-29)

Task 4a of [the desktop-realism handoff](opus-5.5-desktop-realism-handoff-2026-09-28.md)
(task 4, desktop frame cost), items "Terrain starvation near water" and "CPU
hotspots" 3 of [desktop-perf-plan-2026-09-29.md](desktop-perf-plan-2026-09-29.md).
Branch `opus55/terrain-budget-20260929`, based on `9420bdd`. Local only: not
merged, pushed or deployed.

Scope: terrain tile selection, admission, eviction and the per-leaf loop in
`src/planet-renderer.ts`, plus `src/renderer-memory.ts` and
`src/planet-tiles.ts`. No forest, canopy, flora, fauna, rock or harness code
changed. Canonical content, exact-date replay and visit-order independence
are untouched: nothing here feeds generation, only which tiles are resident
and in what order the workers rebuild them. Rivers stay disabled.

## Commits

| SHA | What |
|---|---|
| `5ad62a6` | Budget fix: refresh reserve, byte-aware splitting, stationary pressure merge with 0.94/0.90 hysteresis, diagnostics, Node regression test |
| `a096cf4` | Leaf loop: cached per-leaf records with numeric keys, still-frame reuse, restitch only on change, lazy eviction sort; digest test and benchmark |
| `e2548db` | Selection pass: ancestor maps cached per leaf set, projected distance terms cached per pose |
| `59a8f3a` | Starvation test reports its numbers as test diagnostics |
| `d9c6577` | Request order: rebuild drawn patches before undrawn resident ones |

## 1. Terrain starvation near water

### Cause (rock receipt, "Unresolved")

At the shore hover, 534 protected tiles (leaves and their ancestors) held
186.4 MB of the 186.7 MB terrain budget. A water-level seek makes every leaf
stale. Each rebuild of a stale leaf was charged as a new tile (one
`PENDING_TILE_BYTES` = 374,406 B reservation on top of the resident copy),
although `install` releases the copy it replaces. Only 0.85 of a tile fitted,
so no rebuild was ever admitted. Eviction could not help, because every
resident tile was protected. Pressure merging only ran when the view changed,
so a still camera never freed bytes. The drawn sea stayed at the old level
indefinitely.

### Policy now

Let B be the terrain budget and P the worst-case pending tile.

- **Refresh reserve.** `refreshReserveBytes = maxInFlight × P`, where
  maxInFlight is workers × 2 (1,497,624 B with two workers). New keys are
  admitted only while `resident + (pending + 1) × P ≤ B − reserve`. A
  same-key rebuild of a resident tile may use the reserve, up to B.
  (`terrainAdmission` in `renderer-memory.ts`.)
- **Byte-aware splitting.** Ordinary splits stop at 0.94 B: a split is taken
  only if its missing children (not resident, pending or already planned this
  pass) fit under the split ceiling. Mandatory splits (contact, score > 1e8)
  use the admission ceiling instead. Refinement therefore settles with room
  for refreshes.
- **Pressure with hysteresis.** Pressure enters when resident bytes exceed
  0.94 B and exits below 0.90 B. It is evaluated every frame after installs,
  camera or not, and entering it forces a selection pass.
- **Stationary pressure merge.** Under pressure the selection pass merges the
  lowest-scored eligible parents first (all children leaves, parent
  resident, not mandatory contact, 2:1 neighbour rule kept), until the freed
  child bytes bring resident down to 0.89 B. The old `score < urgent/4`
  merge rule never fired in a byte-saturated frontier because every parent
  scored at least `urgent`. Under pressure only mandatory splits run, and
  eviction continues down to 0.90 B.
- **Admission loop.** It stops only on the in-flight cap. A blocked item is
  counted and skipped (`continue`) instead of ending the loop, so one large
  new tile can no longer hold back a refresh behind it.
- **Request order (`d9c6577`).** A rebuild of a resident patch that is not
  drawn this frame (an off-screen leaf or a fallback ancestor) moves behind
  every other request; relative order is otherwise kept. With two workers the
  bottleneck, the drawn sea is refreshed first.

New diagnostics fields on `terrain.tiles`: `refreshReserveBytes`,
`terrainBudgetBytes`, `terrainAdmissionCeilingBytes`,
`terrainSplitCeilingBytes`, `terrainReservedBytes` (resident + pending × P),
`terrainPressure`, `terrainPressureEntries`, `blockedRefreshes`,
`blockedAdmissions` (per frame), `blockedRefreshesTotal`,
`blockedAdmissionsTotal` and `splitsBlockedByBytes`.

### Node evidence

`tests/terrain-budget-starvation.test.mjs` (in the `npm test` list, about
45 s). It uses the real budget, Maithea, a hover 2 km above the ground at
[1,0,0], no frustum (so the whole horizon competes for bytes), and the
production renderer with inline workers. It asserts on every frame that
`terrainReservedBytes ≤ terrainBudgetBytes` and that the combined
reservation is within the total budget.

| Phase | Result |
|---|---|
| Before the fix (same pose, `9420bdd`) | 486 resident tiles, 186,708,564 B (0.99986 B); 349 visible patches stale forever |
| Settle at −4,500 m | 454 tiles, 174,414,996 B (0.934 B), 325 visible, splits blocked by bytes (max 325), reserve 1,497,624 B |
| Stationary seek to −4,475 m | 325 stale → 0 in 174 frames (install cap 2/frame: 163 minimum), 0 blocked refreshes, 0 blocked admissions, drawn frontier unchanged |
| Budget shrunk to 0.85 × resident (148,252,746 B), stationary | pressure entered once, exited at 0.8992 of budget, quiet after 46 frames, regrew to 0.9381 (below the 0.94 split ceiling) |
| Stationary seek to −4,450 m under the shrunk budget | 256 stale → 0 in 139 frames, 0 blocked |
| 240-frame hold | no pressure re-entry, drawn frontier unchanged over the last 120 frames |

A second test in the file checks `deferUndrawnRefreshes` ordering on a
hand-made map.

### Browser evidence (shore date A → B)

Script: `test-results/terrain-budget/shore-seek.mjs` (gitignored scratch).
It loads the rock receipt's shore pose from its `report.json`, waits for the
walker to ground, pauses exploration, settles at date A
(`435084631200000032044300000`, sea −4,500 m), then seeks to B
(`434632321869292101021892696`, −4,475 m), back to A, and to B again. It polls
`__atlas.terrain.tiles` every 50 ms.

- Headless Chromium, `ATLAS_HARDWARE=1` (ANGLE D3D11, RTX 5090), 1440×1000,
  `vite preview` builds on port 5194.
- One browser at a time under the shared GPU lock. Other agents were running
  Node work, so **timings are contended**.
- "Drawn sea current" is the first sample with `staleWaterPatches` = 0 (a
  count over drawn patches). "All refreshed" also needs `pending` = 0, which
  includes off-screen leaves.

| Build | Resident | Drawn stale peak | Drawn sea current | All refreshed | Over-budget samples |
|---|---|---|---|---|---|
| `9420bdd` (baseline) | 534 tiles, 186.4 MB | 145 | never (145 stale after 20 s, both A→B seeks) | never | 0 |
| `e2548db` (budget fix, leaf order) | 494 tiles, 174.3 MB | 128 | about 4.5 s | 5.4 s | 0 |
| `d9c6577` (drawn first), A→B | 494 tiles, 174.3 MB | 128 | **1.98 s** | 6.4 s | 0 |
| `d9c6577`, B→A | | 125 | **1.80 s** | 6.1 s | 0 |
| `d9c6577`, A→B again | | 128 | **1.82 s** | 6.0 s | 0 |

The baseline reproduces the receipt: 534 tiles and 186.4 MB, with 145
visible patches stuck (the receipt saw 149 in its own run). In the baseline,
B→A "resolves" at once only because its patches were never rebuilt away
from A's bucket.

For `d9c6577` the peak terrain reservation was 175.8 MB against 186.7 MB, and
the peak combined reservation was 287.3 MB against 416 MiB. There were no
blocked refreshes and no page errors. The drawn sea is current within 3 s.
Rebuilding the off-screen leaves takes the rest (≈ 6 s), at about 50
rebuilds/s: four jobs in flight on two workers. Installs are not the
bottleneck.

Captures at B after the first seek: `test-results/terrain-budget/base-date-b.png`
shows dry sand where the sea is, and `final-date-b.png` shows sea. Reports are
next to them (`base-report.json`, `current-report.json`,
`ordered-report.json`, `final-report.json`).

## 2. Terrain per-leaf loop

### What changed

- **Per-leaf records.** Each `LeafRecord` is kept while its tile stays in the
  frontier. It holds the key, a numeric `tileCode` (exact to level 24; leaves
  never exceed 24, and −1 outside that range), the centre, a horizon bound,
  the neighbour, neighbour-parent and neighbour-child codes, and a visibility
  sphere cached per patch object.
- **No per-frame rebuilds.** Nothing is rebuilt per frame: no `leafIndex`, no
  previous-leaf set, no protected-ancestor set, no `wanted` array, and no
  `unique` Map. Records, index and protection are rebuilt only when the leaf
  array changes (by tile identity). `wanted` is the request Map itself, with
  set-if-absent semantics.
- **Stitching.** Edge locks and skirt draw ranges are recomputed only while
  the leaf set, the resident patches (`patchVersion`, bumped by install and
  release) or any leaf morph changed in this frame or the previous one.
  Stitching reads neighbour morphs in loop order, so one extra frame
  reproduces those reads exactly.
- **Still frames.** Visibility, the active set, local eye and detail flags are
  reused while eye, frustum planes, frustum count, root readiness, leaf set
  and patches are unchanged. Morph, LRU stamps, stale requests and the ocean
  frame uniforms still run every frame.
- **Eviction.** The LRU sort only runs when a limit is actually exceeded.
- **Selection pass (`e2548db`).** Ancestor and deepest-level maps are cached
  per leaf array. The projected distance terms (nearest-point ground and
  contact distance) are cached per tile and resident patch, and cleared when
  observer, contact, snapped sea level, ground height or relief changes. A
  turn in place therefore redoes only the frustum-dependent work.

### Output identity

`tests/terrain-leaf-loop-digest.test.mjs` (in `npm test`, about 40 s)
bundles `src/planet-renderer.ts` from `5ad62a6` (the budget fix before any
caching) out of git, next to the worktree renderer. It drives both through
the same 1,061-frame script with `performance.now` frozen:

1. settle;
2. a 90° yaw;
3. 120 frames of flight at 60 m/frame;
4. a descent from 8,000 m to 3,000 m;
5. a hold;
6. a stationary sea seek to −4,475 m;
7. a yaw back.

Every frame digests the following, and all 1,061 digests must be equal:

- leaf order, active set, pending set and worker jobs;
- per patch: visibility, ocean visibility, morph, edge mask, draw range,
  detail and PBR flags, local eye, ocean uniforms, water bucket and LRU
  stamp;
- the diagnostics.

On a mismatch the test replays up to the first differing frame and prints
the fields that differ. The request-order policy of `d9c6577` is a behaviour
change, so the test injects the worktree's own `deferUndrawnRefreshes` text
into the reference. The comparison still isolates the cached loop.

Negative controls: each of these makes the test fail.

- Drop the one-frame restitch window.
- Ignore `patchesChanged` in the still-frame check.
- Never invalidate the projected-distance cache.

### Microbenchmark

`node scripts/bench-terrain-leaf-loop.mjs 5ad62a6 a096cf4 worktree`
(`BENCH_ROUNDS=3`, Node v24.7.0). All revisions run alternately in one
process against the same memoized tiles, so tile building is excluded. The
scene is the 2 km hover: 342 leaves, 140 visible, 454 resident. The table
shows `update()` ms per frame, with 400 stationary frames and 300 turning
frames (0.25°/frame) per round.

| Revision | Stationary mean | p50 | p95 | Turning mean | p50 | p95 |
|---|---|---|---|---|---|---|
| `5ad62a6` (before) | 2.014 | 2.033 | 2.830 | 2.951 | 3.010 | 4.112 |
| `a096cf4` (leaf loop) | 0.056 | 0.053 | 0.092 | 1.358 | 1.319 | 2.189 |
| `e2548db` (plus selection caches) | 0.053 | 0.051 | 0.082 | 0.819 | 0.768 | 1.382 |
| BENCH_FINAL_ROW |

The stationary frame is about 38× cheaper. A turning frame still runs a full
selection pass (frustum-dependent scores), so it is about 3.6× cheaper.

## Tests and build

TESTS_AND_BUILD

## Unresolved (not claimed)

- **Full refresh time.** Off-screen leaves take about 6 s to refresh after a
  seek at the shore. That time is bound by worker build time: two workers,
  four jobs in flight, about 50 tiles/s on the RTX 5090 machine. It would be
  slower on a 3060-class CPU. No 3060-proxy numbers were taken for this
  task.
- **Contact mode.** Walking-contact frontiers (mandatory fine splits) are not
  covered by a Node test. The browser shore run grounds the walker before
  pausing exploration, but the page then reports terrain flight, as in the
  baseline. The contact path of the admission ceiling is therefore only
  covered by code review.
- **Turning cost.** A turning frame still pays for a full selection pass
  (about 0.8 ms mean in Node). Caching frustum-independent score terms
  further was not attempted.
- **Seam.** One faint straight seam in the water is visible near the lower
  right of `final-date-b.png`. It may be a tile edge between LOD levels. It
  was not investigated, and the baseline capture cannot show it because it
  has sand there.
- **On-device.** Nothing here was checked on a headset or a lower-end GPU.
