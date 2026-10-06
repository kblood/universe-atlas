# Bounded fix round

Value-preserving fix complete; G2 remains over budget on Selawyn and Lethuris. No official acceptance benchmark was run.

Changes relative to the implement-round working tree:
- terrain.ts: skip candidates before arc-parameter calculation when abs(sd)-delta >= 1.
- mountain-envelope.ts: return main when lo >= 1 or vHi === 0, retaining all evaluated arithmetic expressions and order.
- mountain-layout.ts: evaluate only corners of active cells, using a reusable nine-row bit mask; leave unread nodes zero. Candidate lists, resolution, stored layout, scalar stride, and all read node expressions are unchanged.
- mountain-coarse-field.test.mjs: face-edge comparisons now compare only nodes read by active cells. Additional one-off validation compares every read node against the captured original builder.

## G1 (unofficial, no slot)

Maithea, the contract's 12 land directions and L5 tile builds, including all core sample calls: 238,155 samples. Active cell: 32,550 (13.6676%); at least one candidate with abs(sd)-delta < 1: 20,721 (8.7006%); at least one composition with w !== 0 or U !== 0: 20,349 (8.5444%). All encountered cells had one candidate. Counts come from an instrumented copy of the before source, independently of timing.

Interleaved main / before / after in one process, rotating arm order, one L6 warm build per arm, seven rounds with first two excluded, 60 measured tiles per arm:

| Arm | Mean ms/tile | p50 ms/tile |
|---|---:|---:|
| main 9971c3f | 19.886695 | 19.3839 |
| before | 21.241548 | 19.9637 |
| after | 20.566798 | 19.6539 |

Mean growth versus main: +6.81% before, +3.42% after. After is 3.18% faster than before. These unofficial timings do not establish the coordinator's official gate.

## G2

Fresh-process profiling excludes layout and T1. Node phase includes traversal, direction normalization, projection setup, transverse, and storage; ns/node is amortized phase time, not an isolated transverse microbenchmark.

| World | Projections before -> after | Node phase ms before -> after | ns/node before -> after | Other ms before -> after |
|---|---:|---:|---:|---:|
| Maithea | 172854 -> 103365 | 44.73 -> 28.41 | 258.7 -> 274.8 | 11.81 -> 11.63 |
| Selawyn | 294435 -> 182972 | 70.34 -> 47.46 | 238.9 -> 259.4 | 17.98 -> 18.61 |
| Raiva | 28269 -> 17879 | 10.05 -> 8.50 | 355.4 -> 475.7 | 4.72 -> 4.35 |
| Lethuris | 318816 -> 198949 | 76.29 -> 51.00 | 239.3 -> 256.4 | 18.15 -> 18.78 |

Uninstrumented `field-report.mjs`, one fresh process per world:

| World | Build ms | Bytes | <=50 ms |
|---|---:|---:|---|
| Maithea | 38.8963 | 822144 | pass |
| Selawyn | 66.1417 | 1624130 | fail |
| Raiva | 12.9085 | 145206 | pass |
| Lethuris | 70.0713 | 1726504 | fail |

No claim that 50 ms is impossible; this bounded optimization has not achieved it. No candidate-specific pruning was added: all candidates' active-cell corners retain the original values, including contributions of conservative interpolated envelopes outside exact belt support.

## Identity and checks

`fix-before.json == fix-after.json: true` (byte comparison, exit 0). Each world: 4,096 Fibonacci directions plus four 41x41 axis rasters, L0 and cut-1, floor off/on (43,280 sampler outputs/world), plus one cut-1 and one cut tile. Totals: 173,120 sampler outputs and eight complete tile digests. Every read field node is also Object.is identical to the original: 503,165 nodes across four worlds; 311,209 unread nodes are zero.

- `npx tsc --noEmit`: exit 0, no diagnostics.
- `node --test tests/mountain-coarse-field.test.mjs tests/mountain-layout.test.mjs tests/mountain-layout-grid.test.mjs tests/mountain-envelope.test.mjs tests/terrain-mountains-assembly.test.mjs`: exit 0, 57 passed, 0 failed/skipped.
- `node test-results/mountains/t6-baked/fix-identity.mjs fix-before.json`: exit 0, captured before production edits.
- `node test-results/mountains/t6-baked/fix-identity.mjs fix-after.json`: exit 0.
- `node -e "const fs=require('fs');const p='test-results/mountains/t6-baked/';const equal=fs.readFileSync(p+'fix-before.json').equals(fs.readFileSync(p+'fix-after.json'));console.log('fix-before.json == fix-after.json:',equal);if(!equal)process.exit(1)"`: exit 0, true.
- `node test-results/mountains/t6-baked/field-report.mjs`: exit 0, four worlds; 56,724 upper-envelope samples/world, zero violations/ocean differences/inactive differences.
- `node test-results/mountains/t6-baked/fix-node-identity.mjs`: exit 0, all read nodes identical.
- `node test-results/mountains/t6-baked/fix-profile.mjs before` and `after`: both exit 0.
- `node test-results/mountains/t6-baked/fix-cost.mjs fractions` and `timing`: both exit 0.
- `git diff --check`: exit 0.

No pins or versions edited this round. Separate mountain core, scratch direction copy, private kernels, inline coarse lookup, no caller direction passed to layout on the coarse path, and TERRAIN_MOUNTAINS_WIRED=false retained. No .git writes, network, downloads, browser, GPU, full suite, test-slot helper, or official benchmarks. No commit.
