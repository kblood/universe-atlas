# Mountains cost plan T3: coarse-level carving rule (`lod-ladder-2`) — evidence, 2026-10-06

Status: **merged staged (output-neutral) per the decisions addendum of 2026-10-06 (3)**, after the bounded cost
attempt of section 7. Contract §6 against shipped main `914d86f` is now met (max +5.5%); the mountains' own cost at
coarse levels (+17..+33% against this branch's builder) is carried **OPEN** into T6's gate. Sections 1-6 below are
the original evidence (when T3 was blocked); section 7 is the follow-up. Branch `mountains/t3-coarse` (worktree
`universe-atlas-wt/t3-coarse`), on top of main `914d86f` (T1 and T2 merged).

Task: T3 of `docs/mountains-opus-decisions-2026-10-05.md` (Q2 "Rule", task table row T3, binding addendum
item 1). Contract amendment: `docs/lod-ladder-contract-v1.md` §3 "Mountain carving (amendment, `lod-ladder-2`)".

**Summary.**

- The rule works as declared: at L0..L(cut-1) no tile solves an M3 block (0 solves while building all
  75,768 coarse tiles of the four worlds). The coarse surface is an upper envelope (0 violations). The truth
  sampler is bit-identical to the wired baseline.
- The binding switch-level requirement holds on every world: parent and child keep their own level's
  carving. The seam test covers one case inside a cube face and one across a cube-face edge per world, and the
  mutation control fails as it must.
- **(C2) part 1, Maithea 6 x L0 cold:** 0 block solves. Against main in the same process, branch/main is
  0.945-1.093 (12 fresh processes, median 1.051), within +10%. The absolute 211 ms bound (192 ms main + 10%) is
  exceeded in most runs because **main itself** measured 198-252 ms on this machine today.
- **(C2) part 2 / contract §6, per-level build mean at L0..cut-1 <= main +10%: NOT MET.** Under the contract's
  own benchmark protocol it is +8.0% to +26.6% per level, with every world over +10% at most levels. The
  excess is the per-sample cost of M1 + M2, which T3 does not touch (T3 removes M3 only). It does not come
  from T3's code: an A/A control (main vs this branch with the mountains off) and a wired-baseline control
  are below.

Nothing here is wired on main: see "Staging".

## 1. What changed

| File | Change |
|---|---|
| `src/lod-ladder.ts` | `LOD_LADDER_VERSION` `lod-ladder-1` -> `lod-ladder-2`; `CARVING_REDUCTION` {16 km, 32}, `CARVING_MAX_EDGE_M` = 128 km, `carvingFromLevel(R)`, `carvingAtLevel(R, level?)`. |
| `src/mountain-assembly.ts` | `MOUNTAIN_ASSEMBLY_VERSION` `mountain-assembly-1` -> `mountain-assembly-2`; `mountainRidgeTermM(..., carve = true)` returns the uncarved composition when `carve` is false. |
| `src/terrain.ts` | Staged wiring hunk (M1 + M2 + M3 ridge term, the `92afaa3` hunk with T1's `massifBeltSample` call site) gated by `mountains`; `TERRAIN_MOUNTAINS_WIRED = false`; `TerrainSamplerOptions {lodLevel, mountains}` as the 8th `terrainSampler` argument; `mountainCarvingState(body, options)`. `TERRAIN_VERSION` unchanged. |
| `src/planet-tiles.ts` | `buildTile(..., samplerOptions)`; the child samples at `tile.level`. At the switch level only (the carving state of L and L-1 differ), the parent path (`parentPoint` -> `vertexPoint`, `correctedHeight` step 2 -> `rawAt`) has its own sampler at L-1 and its own point cache and raw grid. |
| `docs/lod-ladder-contract-v1.md` | §3 amendment and the version line. |
| `tests/lod-carving-reduction.test.mjs` (new, registered) | 15 tests, below. |
| `tests/helpers/mountain-coarse-tiles.mjs` (new) | Axis sites (M1 inputs only), the switch-seam case finder, and an independent lattice-height reference written from contract §3. |

## 2. Version ledger (old -> new)

| Constant | Old | New | Pins moved |
|---|---|---|---|
| `LOD_LADDER_VERSION` | `lod-ladder-1` | `lod-ladder-2` | `tests/lod-consistency.test.mjs` (pin and title), `tests/acceptance/version-compat.test.mjs` |
| `MOUNTAIN_ASSEMBLY_VERSION` | `mountain-assembly-1` | `mountain-assembly-2` | `tests/terrain-mountains-assembly.test.mjs` |
| `TERRAIN_VERSION` | `terrain-1.8.1-grain` | unchanged | none |

No golden, `SHIPPED_CEILINGS` value or §5 tolerance changed. `MODEL_MANIFEST_ID` includes the LOD version
and so moves with it; it is used only for bookmark notices, not for goldens.

## 3. Staging (scope change, stated for the decision record)

The task table put T3 on the wired branch (`mountains/assembly-3`). Merging T3 into main wired would move
`TERRAIN_VERSION` and the goldens, which belong to T6. So T3 stages the wiring: the hunk is present but
off by default (`TERRAIN_MOUNTAINS_WIRED = false`). A sampler or tile built with `{mountains: true}`
opts in. T6 wires by flipping the constant (and does its own version move, goldens and acceptance).

Proof that the default is unchanged: `tests/planet.test.mjs` tile digests and
`tests/terrain-elevation-identity.test.mjs` pass unchanged. Astra compared main and this branch directly on
8,192 sampler results and 20 tile builds (L0, 5, 6, 7, 12 on four worlds): identical.

## 4. Results

### (1) 0 block solves at every coarse tile — MET

Every tile at L0..L(cut-1) built with the mountains on (`test-results/mountains/t3/coarse-all-tiles.mjs`).
`carvingBuildStats.count` is module-global.

| World | Cut | Tiles built | Tiles touching a massif (M1), per level | Block solves |
|---|---:|---:|---|---:|
| Maithea | L6 | 8,190 | L0 6/6, L1 17/24, L2 63/96, L3 143/384, L4 291/1536, L5 637/6144 | **0** |
| Selawyn | L7 | 32,766 | L0 2/6 ... L5 485/6144, L6 1070/24576 | **0** |
| Raiva | L5 | 2,046 | L0 6/6, L1 11/24, L2 24/96, L3 50/384, L4 110/1536 | **0** |
| Lethuris | L7 | 32,766 | L0 5/6 ... L5 535/6144, L6 1180/24576 | **0** |

### (2) Cost — L0 part met relative to main; per-level part NOT MET

**Maithea 6 x L0, cold, fresh process** (`l0-protocol.mjs`: both samplers built and warmed on the 20,000
Fibonacci directions, no tile built before; main first or, with `--swap`, branch first; CPU-quiet test slot):

| Run | Order | main ms | branch ms | branch/main |
|---|---|---:|---:|---:|
| 1 | main first | 214 | 215 | 1.002 |
| 2 | branch first | 198 | 214 | 1.081 |
| 3 | main first | 251 | 237 | 0.945 |
| 4 | branch first | 202 | 214 | 1.061 |
| 5 | main first | 218 | 210 | 0.964 |
| 6 | branch first | 207 | 217 | 1.048 |
| 7 | main first | 200 | 207 | 1.037 |
| 8 | branch first | 200 | 214 | 1.072 |
| 9 | main first | 252 | 239 | 0.951 |
| 10 | branch first | 199 | 215 | 1.085 |
| 11 | main first | 197 | 208 | 1.051 |
| 12 | branch first | 198 | 217 | 1.093 |

12 fresh processes, 0 block solves in each: branch/main median **1.051**, max 1.093, so within +10% in every
run. Branch absolute: 207-239 ms (median 215 ms). 9 of 12 runs exceed the absolute 211 ms, but main's own
time on the same machine was 197-252 ms, not the 192 ms of the decision record. **Judged relative to main,
this part is met; judged by the absolute 211 ms, it is not.** Stated both ways for the record.

Also the official `scripts/mountain-assembly-cost.mjs --l0 --same-version` row (fixed main-then-branch order,
after the region and outside passes), on a checkout with the constant flipped, 3 fresh processes per world:

| World | main / branch ms (run 1, 2, 3) | Block solves |
|---|---|---:|
| Maithea | 220/214, 219/232, 188/209 | 0 |
| Selawyn | 217/220, 214/222, 195/207 | 0 |
| Raiva | 213/216, 185/194, 190/222 | 0 |
| Lethuris | 203/222, 180/182, 216/211 | 0 |

Before T3 the same wired L0 build took 335-461 s (`docs/mountains-assembly-2026-10-05.md`).

**Per-level build mean, contract §6 protocol** (`contract-build-bench.mjs` = `benchBuild` of
`scripts/lod-consistency-report.mjs`: 12 land tiles, interleaved A/B in one process, alternating order,
5 rounds; main = read-only import of main's checkout, branch = mountains on; fresh process per world, test
slot). Budget: <= +10%.

| Level | Maithea | Selawyn | Raiva | Lethuris |
|---|---:|---:|---:|---:|
| L0 | +14.3% | +14.0% | +13.9% | +13.1% |
| L1 | +19.6% | +15.7% | +8.0% | +20.2% |
| L2 | +16.5% | +17.3% | +20.5% | +18.8% |
| L3 | +23.2% | +17.9% | +15.7% | +15.7% |
| L4 | +26.6% | +11.5% | +14.2% | +24.1% |
| L5 | +19.0% | +21.7% | | +22.6% |
| L6 | | +19.4% | | +26.0% |

Main means are 22-29 ms per tile; the branch adds 3-7 ms. A massif-weighted tile set (`level-build-mean.mjs`,
half the tiles on massif axes) gives +8.9% to +28.2%.

**Where the excess comes from (diagnosis):**

- **Not from T3's code.** A/A control (`aa-bench`, main vs this branch with the mountains off, same
  protocol, Maithea): L0 -0.6%, L1 -1.5%, L2 +3.0%, L3 +3.6%, L4 -0.4%, L5 +0.2%. The level plumbing in
  `buildTile` and the staged hunk cost nothing measurable when off. (Running both arms through ONE module
  instance instead makes both slower, 31-37 ms, because the shared sampler becomes polymorphic; that is why
  the benches use separate module instances.)
- **Not added by T3 on top of the wiring.** Wired baseline (main + the wiring hunk, no T3) against this
  branch with the constant flipped, same cost script, interleaved, 3 runs each on Maithea and Raiva: in-massif
  warm Maithea 1270/1167/1472 ns vs 1216/1222/1216 ns; the weighted (C1) rows scatter by +-15 points on
  both because main's own outside pass varies (467-841 ns). There is no sign that T3 adds sampler cost.
- **It is the M1 + M2 per-sample cost on tile lattices.** Maithea L3 lattice directions of the 12 bench
  tiles (199,692 samples, 9.0% with `belt != 0`), main vs branch sampler: all samples +12.5% (603 -> 679 ns);
  outside belts +6.8% (593 -> 634 ns); inside belts +46% (637 -> 930 ns). Raiva: outside belts +9.2%,
  inside +16%. A coarse tile is mostly made of samples that pay T1's per-sample rejection (accepted at
  +3.8-5.4% on random directions, addendum (2)) and, inside belts, M1's foot point and M2. T3 removes M3
  only, which was the whole cold cost (335-461 s -> about 210 ms), but it cannot bring this residual under
  +10%.
- A per-tile rejection (skip M1 for a tile whose footprint has no flagged grid cell) would be
  value-preserving, but it does not help L0-L3, where nearly every tile touches a belt (Maithea L0 6/6,
  L1 17/24, L2 63/96 tiles touch a massif). A per-block or batch rejection (Astra's idea (b) in the T1
  addendum) is M1 work in `src/mountain-layout.ts`, outside T3's files.

### (3) Truth identity — MET (against the wired baseline; scope note)

`truth-identity.mjs`: 15,120 directions per world (4,096 Fibonacci + rasters at 8 axis sites: 33 x 33 at
1.5 km and 17 x 17 at 6 km), height, ocean, colour and roughness compared with `Object.is`.

- Against **main `914d86f` + the `92afaa3` wiring hunk with T1's call site** (`t2-wired-baseline.patch`):
  **0 mismatches, equal SHA-256 digests** on all four worlds. 10,838-10,896 of the directions per world are
  changed by the mountains (so the comparison is not vacuous).
- Against **`92afaa3` itself** (INFO): 10,817-10,880 directions differ, max |dh| 7.0 mm (Maithea), 0.87 mm
  (Selawyn), 0.15 mm (Raiva), 0.39 mm (Lethuris). That is T2's `orogen-layout-2` (it moved M1 by up to
  7.8e-8 m in distance and 0.1 m along the belt), not T3.

**Scope note:** the task table says "digest equal to `92afaa3`". After T2 that is impossible for any T3,
so the comparison is against the wiring hunk on the current main.

### (4) Upper envelope — MET

On 3 axis sites x 9 x 9 rasters (12 km step) per world: uncarved floor >= carved floor and uncarved ground
>= carved ground with 0 violations, the ocean flag equal, and the carving active on those sites (negative
control). `mountainRidgeTermM(carve = false)` >= the carved term on a fixture.

### (5) Switch level L(cut-1) -> L(cut) — binding addendum item 1 — MET

`tests/lod-carving-reduction.test.mjs`, 15/15 pass. Two cases per world: inside a cube face (axis site) and
across a cube-face edge (the neighbour on another face). Tolerance: the existing 0.05 m morph rule of
`tests/lod-consistency.test.mjs`; no new tolerance.

| World | Case | Morph start (child parent mesh vs built L(cut-1) tile) | Seam vs neighbour | Mutant (parent sampled carved): morph / seam | Mean step at the cut (min) |
|---|---|---:|---:|---:|---:|
| Maithea | 2/6/33/54, N 2/5/17/27 | 0.0062 m | 0.0061 m | 883.9 / 132.9 m | -175.9 m (-1018.7) |
| Maithea | face edge 0/6/0/6, N 4/5/31/3 | 0.0041 m | 0.0038 m | 135.7 / 3.3 m | -13.4 m (-203.3) |
| Selawyn | 0/7/112/107, N 0/6/55/53 | 0.0055 m | 0.0032 m | 1584.0 / 1298.1 m | -502.6 m (-1574.7) |
| Selawyn | face edge 0/7/127/53, N 5/6/0/26 | 0.0058 m | 0.0050 m | 1344.5 / 82.1 m | -100.2 m (-1264.9) |
| Raiva | 1/5/19/25, N 1/4/9/13 | 0.0062 m | 0.0052 m | 471.1 / 247.4 m | -99.4 m (-539.6) |
| Raiva | face edge 0/5/0/5, N 4/4/15/2 | 0.0058 m | 0.0052 m | 1013.8 / 14.5 m | -245.5 m (-1086.7) |
| Lethuris | 2/7/28/73, N 2/6/13/36 | 0.0065 m | 0.0057 m | 1787.3 / 511.9 m | -473.2 m (-1939.6) |
| Lethuris | face edge 0/7/0/105, N 4/6/63/52 | 0.0052 m | 0.0029 m | 1917.0 / 18.4 m | -384.1 m (-1917.0) |

Also checked in each case: the built parent's stored heights equal `Math.fround` of the independent
contract-§3 reference, and building the two L(cut-1) tiles solves 0 blocks.

### INFO: cross-level cells at the switch (report-only, addendum item 2)

`switch-cells.mjs`, 8 axis-site tiles per world (a provisional M1-only selection; the frozen Q6 massif set
belongs to T6), each tile's lattice, classes and colour from its own level's sampler.

| World | Pair | |dh| p50 / p99 / max (m) | RGB p99 | snow % | name % | mean step child - parent mesh |
|---|---|---|---:|---:|---:|---:|
| Maithea | **L5->L6 (switch)** | 185 / 1567 / 2034 | 184.9 | 9.97 | 13.73 | **-325.6 m** |
| Maithea | L6->L7 | 98 / 860 / 1600 | 55.5 | 4.52 | 5.50 | -20.2 m |
| Selawyn | **L6->L7 (switch)** | 288 / 1276 / 1599 | 7.0 | 0 | 0 | **-352.1 m** |
| Selawyn | L7->L8 | 121 / 690 / 1140 | 5.0 | 0 | 0 | -11.5 m |
| Raiva | **L4->L5 (switch)** | 213 / 906 / 1218 | 7.3 | 0 | 0.03 | **-245.1 m** |
| Raiva | L5->L6 | 105 / 493 / 732 | 4.5 | 0 | 0 | -6.0 m |
| Lethuris | **L6->L7 (switch)** | 135 / 1360 / 1922 | 261.1 | 9.03 | 11.88 | **-257.9 m** |
| Lethuris | L7->L8 | 95 / 738 / 1323 | 90.3 | 4.77 | 5.58 | -10.8 m |

Every height cell is inside its §5 tolerance (`planHeightP99M` / `planHeightMaxM` in the JSON). The switch
level is where the carving appears: the mean massif-tile height drops by 245-352 m during that morph,
against 6-20 m at the next pair, and on the snowy worlds (Maithea, Lethuris) about 10% of land cells change
snow state. Whether this is visible is a headset or Luna question (T6). The agreed mitigation, if it is,
is a cheap coarse mean-carve term, not a change of the rule.

## 5. Not run

- Luna sheet (VISUAL-ADVISORY): the mountains are not wired; the sheet runs at T6.
- `test:full`: only at a merge gate; T3 is not merged.
- (C1) and (C3) are T6 rows; the (C1) numbers above are controls, not a judgement.

## 6. Evidence files

`test-results/mountains/t3/`: `truth-identity.{mjs,json}`, `t2-wired-baseline.patch`,
`coarse-all-tiles.mjs` and `coarse-all-tiles-<world>.{json,log}`, `l0-protocol.{mjs,json}`,
`contract-build-bench.{mjs,json}`, `level-build-mean.{mjs,json}`, `switch-cells.{mjs,json,log}`,
`cost-run{1,2,3}.json` and `control-*.json` (cost script rows), `l0-cold.mjs`, `l0-breakdown.mjs`.

## 7. Follow-up 2026-10-06: bounded cost attempt (decisions addendum (3), option (b))

One Astra implement round and one fix round, both value-preserving. Official numbers are the coordinator's
(CPU-quiet test slot, `contract-build-bench.mjs` unchanged, 5 rounds, fresh process per world).

**Diagnosis first (coordinator).** A CPU profile of the L0..L5 bench tiles (`profile-maithea-l0-l5.txt`, main 22.76
vs mountains-on 28.73 ms/tile) shows the T1 band rejection itself is small (`bandTag` ~1.5% of the time). The
excess is spread over the terrain core (`sample` +439 ms, `macroHeightCode` +195 ms, `n` +163 ms, GC +124 ms,
sampler wrapper +109 ms, M1 direct ~+234 ms of +1.73 s). With an extra mountains-off arm in the same module
instance (`tile-bench-arms.mjs main,off,on`) the on/main growth fell to -8..+10% with identical tile output
(SHA-256 checked), so most of the residual is how V8 compiles the core when it only sees the mountain path, not
arithmetic. A per-tile/per-block batch M1 rejection (idea (b)) therefore cannot recover the 10+ points on its own.

**Round 1 (committed `49c8bc3`).** Per-layout memo of the belt carving seeds (no `hash64` per sampler); in
`buildTile`: dense halo-aware lattice caches instead of string-keyed Maps, one raw-grid lookup per peak correction,
`cubeDirection` without the six-vector table, direct colour-texel stores. Guards captured before the change and kept:
L(cut-1) and L(cut) tile SHA-256 per world and full sampler outputs at truth and L0..22
(`tests/lod-carving-reduction.test.mjs`, `opt-identity-{before,after}.json` byte-identical; truth 4 x 15,120
directions 0 mismatches). tsc exit 0; 10 element test files 91/91.

| Contract §6, growth per level L0..cut-1 | Against shipped main `914d86f` (`official-after-contract.json`) | Mountains on vs this branch's own staged builder, off (`official-residual-vs-staged.json`) |
|---|---|---|
| Maithea | +5.5 / +1.3 / +2.3 / -3.4 / +0.0 / +1.6 % | +19.5 / +26.7 / +24.6 / +26.7 / +31.9 / +30.1 % |
| Selawyn | -3.6 / +2.2 / -0.5 / -3.9 / +1.6 / -1.3 / +0.8 % | +19.7 / +30.3 / +22.0 / +32.6 / +31.1 / +21.9 / +22.7 % |
| Raiva | -3.5 / -2.8 / -1.3 / -6.2 / -1.0 % | +20.0 / +26.5 / +21.4 / +24.6 / +24.0 % |
| Lethuris | -0.1 / -0.9 / -6.2 / -4.9 / -5.8 / -5.1 / -7.1 % | +16.8 / +25.8 / +21.1 / +24.4 / +25.8 / +27.2 / +20.1 % |

So the §6 row as written ("build mean <= shipped +10%", shipped = main `914d86f`) is **met, max +5.5%**. It is met
because the builder speedups, which also apply with the mountains off, pay for the mountains. The mountains' own cost
at coarse levels is not reduced: +17..+33% against the same builder.

**Fix round (not kept).** Target: the residual <= +10%. Astra moved the relief composition into its own closure and
tried ten other variants (mountain helper, base-height extraction, merged rejection/solve, coarse-only evaluator,
isolated noise kernels, numeric field init, noise-closure reuse, explicit core context, reusable core results).
Unofficial result of the best variant: residual max +26.5..+30.7% per world, against-main up to +8.6% (Lethuris L4),
i.e. no reliable gain and a worse against-main margin. V8 traces: in an on-only process V8 inlines
`massifBeltSample` into the core; with relief split out the core `sample` self time is still 1,535 ms on vs 641 ms
off, cause unresolved. The source change was **discarded**; its report and logs are kept (`fix-report.md`,
`fix-*.json`, `fix-*.log`; the multi-MB V8 traces and `.cpuprofile` files are not committed).

**Carried OPEN into T6** (decisions addendum (3)): when the wiring is judged at T6, "shipped" will be main with
these builder speedups, and the mountains residual above (+17..+33%) is what that gate will see.
