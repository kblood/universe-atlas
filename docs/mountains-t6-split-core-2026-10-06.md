# Mountains T6 pre-gate: split terrain core (structural cost attempt), 2026-10-06

Evidence for decisions addendum (4) in `docs/mountains-opus-decisions-2026-10-05.md`. Written by the coordinator
(Claude Opus 5.5, acting on Kasper's instruction), implementation by Astra (Codex `gpt-6-astra`). Branch
`mountains/split-core` from main `33b049a`. **The source change is not merged**: it is kept as a patch,
`test-results/mountains/t6-split/split-core.patch` (applies cleanly to `33b049a`), because it does not reduce the cost.

## 1. The problem (carried from T3 and T4)

With the mountains wired, the coarse tile build costs +17..+33% per level against main (contract §6 allows +10%)
and the orbit bake +19..+27% (`orbitBakeGrowth` .05), with 0 M3 block solves. T3 tried eleven restructurings
inside the one shared `baseTerrainCore` `sample` closure, T4 five more; none held. The suspected cause is V8 code
quality: the plain core `sample` runs about 2x slower (self time) in a process that also runs the mountain path.

## 2. What was built (Astra implement round)

The structural fix not tried before: two sampler cores, chosen at construction.

- `baseTerrainCore` is textually 914d86f's again: no `orogen`, `massif`, `mountain` or `carve` in it (a source test
  enforces this).
- A distinct `mountainTerrainCore(body, waterLevelM, exposeFloor, carve)` (own function, own SharedFunctionInfo):
  the relief water-world path plus the M1/M2/M3 hunk, same expressions, same order, same `CoreSample` shape.
- `terrainSampler` builds the mountain core only when `mountainCarvingState` is non-null and the T1 massif band grid
  has a flagged cell, and dispatches per sample: in-band (T1 grid tag, new read-only `layout.bandTagWithin`) to
  the mountain core, everything else to the plain core at its unchanged call site.
- New guard test `tests/terrain-mountain-core-split.test.mjs`: dispatch vs forced-mountain-core identity
  (`Object.is` on every field, four worlds, truth / L0 / cut, both `exposeFloor` values, Fibonacci + axis rasters +
  a bracketed band edge), the source check, and a construction counter for null states and empty grids.

## 3. Identity (all MET)

- SHA-256 ledger (`identity-ledger.mjs`): samplers (default, default-L0, on-truth, on-L0, on-L(cut-1), on-L(cut),
  off-truth, each with and without floor), craters, base sampler, tiles at L0 / L3 / cut-1 / cut / cut+2 at two
  axis sites wired and unwired, orbit bake 512x96, hypsometry, survey; 15,120 directions per world. Before (main
  `33b049a`) and after are **byte-identical**, staged and wired (`before-*.json` = `after-*.json`, `cmp` exit 0).
- `npx tsc --noEmit` exit 0; `node --test tests/terrain-mountain-core-split.test.mjs tests/lod-carving-reduction.test.mjs
  tests/sparse-consumer-levels.test.mjs` exit 0, 33/33 (coordinator). Astra's nine-file run: exit 0, 84/84.
- `TERRAIN_MOUNTAINS_WIRED` stayed false; no version constant moved.

## 4. Cost (official, NOT MET)

Same protocols as T3/T4, one fresh process per world under the CPU-quiet test slot
(`official-benches.sh`, all 8 runs exit 0). Contract build bench: 12 tiles, 5 rounds, branch wired (`{mountains:
true}`) vs main `33b049a`. Orbit bake: 7 rounds, wired copy of the branch vs main.

| World | Contract §6 growth per level (target <= +10%) | Orbit bake median / paired median (target <= +5%) |
|---|---|---|
| Maithea (cut 6) | L0 +23.2, L1 +25.3, L2 +24.2, L3 +27.6, L4 +33.2, L5 +27.4% | +20.7% / +24.0% |
| Selawyn (cut 7) | L0 +18.8, L1 +17.9, L2 +20.7, L3 +24.9, L4 +24.9, L5 +23.1, L6 +25.7% | +28.7% / +29.1% |
| Raiva (cut 5) | L0 +20.7, L1 +23.0, L2 +26.3, L3 +20.8, L4 +20.0% | +31.3% / +24.9% |
| Lethuris (cut 7) | L0 +21.0, L1 +25.7, L2 +24.9, L3 +25.7, L4 +29.1, L5 +21.0, L6 +21.4% | +27.6% / +26.2% |

The split changed nothing measurable: the same +17..+33% band as T3. Main means were 17.7-20.1 ms/tile.

## 5. Diagnosis (coordinator prototypes, unofficial, Maithea, 12 land tiles x L0-L5 per round)

ms per tile, one process per arm; `diag/armd.mjs`, `diag/armr.mjs` (per-round), on a scratch copy of the branch:

| Arm | ms/tile |
|---|---|
| mountains off (layout never built) | 18.5-18.7 |
| on, band test forced false (layout built, plain core only) | 18.2-18.4 |
| on, band test run per sample, in-band samples still sent to the plain core | 19.1-19.6 |
| on (dispatch as built) | 23.1-23.9 |
| on + private noise / macroHeightCode / `n` in the mountain core and in the layout's `continentalA0` | 22.5-22.6 (main 18.3-18.6) |
| + private `ss` / `clamp` / `mix` in the mountain core | 21.6-24.4 per round, ~22.3 |
| + distinct `CoreSample` shape for the mountain core | ~22.3 |

- Only 3-10% of tile samples reach the mountain core (L0 4.4%, L1 4.0, L2 3.1, L3 5.5, L4 7.9, L5 9.8%). The band
  test itself costs +3..+6%. Running the mountain core on that small share is what costs the rest: the plain core
  `sample` self time doubles (1,273 ms vs 630 ms, cpuprofile) although it is a different function, and in the
  profiled prototype shares no noise kernel (`noise`, `macroHeightCode`, `n`) with the mountain core; making
  `ss` / `clamp` / `mix` private as well changed nothing either. The V8 cause is not identified (trace: the plain
  `sample` is recompiled to Maglev 11 times vs 4 with the mountains off; `buildTile` takes 30+ "wrong map" deopts).
- Building the M1 layout alone slows mountains-off tiles in the same process by +14..+19%: its belt-construction
  loop pollutes the shared catalog kernels. Private kernel copies in `continentalA0` remove that part
  (`diag-private-kernels-layout.diff`). This is real but does not matter while unwired, and does not fix the
  wired cost.
- Genuine mountain work (arithmetic, not a measurement): in-band samples cost ~+450 ns (sampler-only, L3: 972-1,026
  vs 550-569 ns), so 3-10% of samples add about +2..+5% of tile time. The rest of the +18..+33% is the code-quality
  effect.

**The Astra fix round was not spent.** The fix candidates the diagnosis points to (private kernels for the layout
and the mountain core, private helpers, distinct output shape) were prototyped by the coordinator and measured at
+20..+25% on Maithea. An Astra round would have implemented a variant already measured to miss the +10% target.

## 6. Not run

- `scripts/mountain-assembly-cost.mjs` (15 fresh processes): not run, the per-level gate already fails.
- `test:full`: not run (reserved for T6's final gate; T6 is blocked).
- Luna visual sheet: not run (nothing wired, nothing visual changed).
- The planet-canopy 2 ms wall-time flake fix: T6 gate work, not done because T6 is blocked.

## 7. Files

- `test-results/mountains/t6-split/split-core.patch`: the value-preserving split (src/terrain.ts,
  src/mountain-layout.ts, package.json, the new test). Not merged.
- `diag-private-kernels-terrain.diff`, `diag-private-kernels-layout.diff`: the coordinator's diagnostic prototype
  against the patched branch (contains env-switched diagnostic arms, not for merging).
- `identity-ledger.mjs`, `before-*.json`, `after-*.json`: identity evidence.
- `contract-build-bench.json`, `orbit-bench.json`, logs, `official-benches.sh`, `bench-exits.log`: official cost.
- `diag/`: the diagnostic drivers.
- `astra-implement-prompt.txt`, `astra-implement-answer.md`: the Astra round.

## 8. Ledger

No threshold, pin, tolerance, budget, golden or version change. Nothing merged into `src/`.
