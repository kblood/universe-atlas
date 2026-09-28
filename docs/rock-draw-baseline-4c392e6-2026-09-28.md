# Rock draw traversal baseline receipt — commit 4c392e6 (2026-09-28)

Scope: CPU-only Node measurement of the **unchanged baseline** `PlanetRocks.draw`
traversal (commit `4c392e6e31db9932cb45cfe2c22bff266d4a483a`, branch
`opus/ordinary-rocks-20260928`) on a deterministic saturated fixture. These are
scoped fixture numbers for one Node process on one machine. They are **not**
GPU, browser, device or game frame timings, and they do not measure any
user-visible performance.

## Environment

- Node `v24.7.0`, `win32`/`x64`, CPU `AMD Ryzen 9 9950X 16-Core Processor`.
- Source: clean `git archive 4c392e6` extract in a temporary directory
  (`%TEMP%\rock-baseline-4c392e6`). Before measuring, its `src/planet-rocks.ts`
  was confirmed identical to `git show 4c392e6:src/planet-rocks.ts` after EOL
  normalisation. Its `node_modules` was a junction to this worktree's installed
  `node_modules` (three `super-three@0.181.0`).
- The follow-up worktree's partial implementation was not used or modified.

## Dataset

`tests/rock-saturated-fixture.mjs`, `saturatedRecords()`: seed `LETHRA-001`,
system `G001/C2128,0,1/0`, moon 0 (barren, real biosphere rock families). Each
tier holds exactly `residentCap` canonical wanted cells nearest a cube corner
(`[1,.97,1.02]` normalised), and every slot is occupied. That is the theoretical
resident maximum: **7,600 cells and 13,600 rocks**. Rocks are synthetic
but canonical-shaped: real cell ids, in-cell directions and family scale bands.
Terrain is flat at 0 m and the classifier returns all-rock/dry. Records are
injected straight into the baseline residents (`tiers[t].residents`,
`runtimeRock`) with the tiers marked valid at the focus, so no rescatter or
cell processing happens during the measured frames. The script asserts this.

## Command

```sh
git archive 4c392e6 | tar -x -C "$TEMP/rock-baseline-4c392e6"
cp tests/rock-saturated-fixture.mjs tests/rock-draw-measure-baseline.mjs "$TEMP/rock-baseline-4c392e6/tests/"
cmd //c mklink //J "<tmp>\node_modules" "<worktree>\node_modules"
cd "$TEMP/rock-baseline-4c392e6" && for i in 1 2 3; do node tests/rock-draw-measure-baseline.mjs; done
```

Each scenario gets a fresh `PlanetRocks` and runs 240 frames. The first 40 are
warm-up; statistics cover the remaining 200. The view changes on every frame,
either through 10 cm eye jitter (the baseline draw key quantises to 5 cm) or a
2°/frame yaw, so **every measured frame is a full rebuild** (`fullRebuilds:200`)
of all wanted resident cells. `drawMs` is the baseline's own
`diagnostics().work.drawMs` (the `draw()` call). `updateMs` is the whole `update()`.

## Distribution (drawMs, ms; n=200 per run)

| scenario | run | min | median | p95 | max | mean |
|---|---|---|---|---|---|---|
| all-in-frustum, jitter, shadow all | 1 | 1.406 | 4.214 | 8.998 | 17.334 | 4.524 |
| | 2 | 1.430 | 2.672 | 5.476 | 7.180 | 3.011 |
| | 3 | 1.372 | 2.336 | 5.282 | 8.378 | 2.735 |
| perspective 90° yaw, shadow all | 1 | 1.830 | 3.995 | 7.814 | 14.970 | 4.385 |
| | 2 | 1.405 | 3.710 | 7.526 | 11.163 | 4.083 |
| | 3 | 1.465 | 2.479 | 5.561 | 9.658 | 2.879 |
| perspective 90° yaw, no shadow | 1 | 1.211 | 2.232 | 5.514 | 8.748 | 2.628 |
| | 2 | 1.180 | 1.915 | 3.460 | 6.771 | 2.078 |
| | 3 | 1.187 | 1.862 | 5.051 | 9.401 | 2.280 |
| stereo XR yaw, shadow all | 1 | 1.329 | 2.385 | 5.531 | 8.930 | 2.819 |
| | 2 | 1.425 | 2.666 | 5.920 | 9.772 | 3.078 |
| | 3 | 1.392 | 2.488 | 5.536 | 12.227 | 2.809 |

Across all runs the minimum is ≥1.18 ms, and every median and p95 is above the
configured `ROCK_WORK_BUDGET_MS = 1.5`. That constant gates only canonical cell
processing. The baseline draw-key rebuild is unbounded by it and walks every
wanted resident. Run-to-run spread is large (for example median 2.3–4.2 ms,
max 7–17 ms in the first scenario), so only the ordering of magnitude is
meaningful.

Last-frame outcome, identical in every run (deterministic):

| scenario | drawn lod0/1/2 (total) | cameraCulled | shadowOnly | budgetDrops |
|---|---|---|---|---|
| all-in-frustum | 321/1536/2048 (3905) | 0 | 0 | 5894 |
| perspective, shadow | 320/1536/1815 (3671) | 3865 | 2805 | 2259 |
| perspective, no shadow | 108/1202/1815 (3125) | 6670 | 0 | 0 |
| stereo XR, shadow | 320/1536/1860 (3716) | 3820 | 2753 | 2259 |

The saturated fixture exceeds the baseline's per-LOD submission caps
(`ROCK_LOD_CAPS` 512/1536/2048), so baseline `budgetDrops` is non-zero there.
That is a property of the baseline at the theoretical maximum; this receipt only
records it and does not assess it visually.

## Raw output (verbatim)

```
=== run 1
{"commit":"4c392e6e31db9932cb45cfe2c22bff266d4a483a","node":"v24.7.0","platform":"win32","arch":"x64","cpu":"AMD Ryzen 9 9950X 16-Core Processor            ","fixture":{"cells":7600,"rocks":13600},"frames":240,"warm":40}
{"name":"all-in-frustum, eye jitter 10 cm, shadow all","drawMs":{"n":200,"min":1.406,"median":4.214,"p95":8.998,"max":17.334,"mean":4.524},"updateMs":{"n":200,"min":1.41,"median":4.242,"p95":9.033,"max":17.372,"mean":4.555},"fullRebuilds":200,"lastFrame":{"drawn":{"lod0":321,"lod1":1536,"lod2":2048,"total":3905},"cameraCulled":0,"shadowOnly":0,"budgetDrops":5894}}
{"name":"perspective 90deg yaw 2deg/frame, shadow all","drawMs":{"n":200,"min":1.83,"median":3.995,"p95":7.814,"max":14.97,"mean":4.385},"updateMs":{"n":200,"min":1.843,"median":4.015,"p95":7.857,"max":15.036,"mean":4.404},"fullRebuilds":200,"lastFrame":{"drawn":{"lod0":320,"lod1":1536,"lod2":1815,"total":3671},"cameraCulled":3865,"shadowOnly":2805,"budgetDrops":2259}}
{"name":"perspective 90deg yaw 2deg/frame, no shadow","drawMs":{"n":200,"min":1.211,"median":2.232,"p95":5.514,"max":8.748,"mean":2.628},"updateMs":{"n":200,"min":1.215,"median":2.242,"p95":5.533,"max":8.772,"mean":2.639},"fullRebuilds":200,"lastFrame":{"drawn":{"lod0":108,"lod1":1202,"lod2":1815,"total":3125},"cameraCulled":6670,"shadowOnly":0,"budgetDrops":0}}
{"name":"stereo XR yaw 2deg/frame, shadow all","drawMs":{"n":200,"min":1.329,"median":2.385,"p95":5.531,"max":8.93,"mean":2.819},"updateMs":{"n":200,"min":1.332,"median":2.403,"p95":5.549,"max":8.946,"mean":2.83},"fullRebuilds":200,"lastFrame":{"drawn":{"lod0":320,"lod1":1536,"lod2":1860,"total":3716},"cameraCulled":3820,"shadowOnly":2753,"budgetDrops":2259}}
=== run 2
{"commit":"4c392e6e31db9932cb45cfe2c22bff266d4a483a","node":"v24.7.0","platform":"win32","arch":"x64","cpu":"AMD Ryzen 9 9950X 16-Core Processor            ","fixture":{"cells":7600,"rocks":13600},"frames":240,"warm":40}
{"name":"all-in-frustum, eye jitter 10 cm, shadow all","drawMs":{"n":200,"min":1.43,"median":2.672,"p95":5.476,"max":7.18,"mean":3.011},"updateMs":{"n":200,"min":1.436,"median":2.695,"p95":5.521,"max":7.213,"mean":3.033},"fullRebuilds":200,"lastFrame":{"drawn":{"lod0":321,"lod1":1536,"lod2":2048,"total":3905},"cameraCulled":0,"shadowOnly":0,"budgetDrops":5894}}
{"name":"perspective 90deg yaw 2deg/frame, shadow all","drawMs":{"n":200,"min":1.405,"median":3.71,"p95":7.526,"max":11.163,"mean":4.083},"updateMs":{"n":200,"min":1.412,"median":3.727,"p95":7.547,"max":11.189,"mean":4.102},"fullRebuilds":200,"lastFrame":{"drawn":{"lod0":320,"lod1":1536,"lod2":1815,"total":3671},"cameraCulled":3865,"shadowOnly":2805,"budgetDrops":2259}}
{"name":"perspective 90deg yaw 2deg/frame, no shadow","drawMs":{"n":200,"min":1.18,"median":1.915,"p95":3.46,"max":6.771,"mean":2.078},"updateMs":{"n":200,"min":1.184,"median":1.929,"p95":3.467,"max":6.782,"mean":2.09},"fullRebuilds":200,"lastFrame":{"drawn":{"lod0":108,"lod1":1202,"lod2":1815,"total":3125},"cameraCulled":6670,"shadowOnly":0,"budgetDrops":0}}
{"name":"stereo XR yaw 2deg/frame, shadow all","drawMs":{"n":200,"min":1.425,"median":2.666,"p95":5.92,"max":9.772,"mean":3.078},"updateMs":{"n":200,"min":1.431,"median":2.676,"p95":5.943,"max":9.792,"mean":3.089},"fullRebuilds":200,"lastFrame":{"drawn":{"lod0":320,"lod1":1536,"lod2":1860,"total":3716},"cameraCulled":3820,"shadowOnly":2753,"budgetDrops":2259}}
=== run 3
{"commit":"4c392e6e31db9932cb45cfe2c22bff266d4a483a","node":"v24.7.0","platform":"win32","arch":"x64","cpu":"AMD Ryzen 9 9950X 16-Core Processor            ","fixture":{"cells":7600,"rocks":13600},"frames":240,"warm":40}
{"name":"all-in-frustum, eye jitter 10 cm, shadow all","drawMs":{"n":200,"min":1.372,"median":2.336,"p95":5.282,"max":8.378,"mean":2.735},"updateMs":{"n":200,"min":1.376,"median":2.351,"p95":5.299,"max":8.432,"mean":2.754},"fullRebuilds":200,"lastFrame":{"drawn":{"lod0":321,"lod1":1536,"lod2":2048,"total":3905},"cameraCulled":0,"shadowOnly":0,"budgetDrops":5894}}
{"name":"perspective 90deg yaw 2deg/frame, shadow all","drawMs":{"n":200,"min":1.465,"median":2.479,"p95":5.561,"max":9.658,"mean":2.879},"updateMs":{"n":200,"min":1.469,"median":2.488,"p95":5.575,"max":9.671,"mean":2.891},"fullRebuilds":200,"lastFrame":{"drawn":{"lod0":320,"lod1":1536,"lod2":1815,"total":3671},"cameraCulled":3865,"shadowOnly":2805,"budgetDrops":2259}}
{"name":"perspective 90deg yaw 2deg/frame, no shadow","drawMs":{"n":200,"min":1.187,"median":1.862,"p95":5.051,"max":9.401,"mean":2.28},"updateMs":{"n":200,"min":1.191,"median":1.867,"p95":5.068,"max":9.439,"mean":2.29},"fullRebuilds":200,"lastFrame":{"drawn":{"lod0":108,"lod1":1202,"lod2":1815,"total":3125},"cameraCulled":6670,"shadowOnly":0,"budgetDrops":0}}
{"name":"stereo XR yaw 2deg/frame, shadow all","drawMs":{"n":200,"min":1.392,"median":2.488,"p95":5.536,"max":12.227,"mean":2.809},"updateMs":{"n":200,"min":1.394,"median":2.495,"p95":5.54,"max":12.245,"mean":2.819},"fullRebuilds":200,"lastFrame":{"drawn":{"lod0":320,"lod1":1536,"lod2":1860,"total":3716},"cameraCulled":3820,"shadowOnly":2753,"budgetDrops":2259}}
```
