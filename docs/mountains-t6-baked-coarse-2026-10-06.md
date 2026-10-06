# Mountains T6 cost route A: baked coarse band field, 2026-10-06

Evidence for decisions addendum (5) in `docs/mountains-opus-decisions-2026-10-05.md`. Written by the coordinator
(Claude Opus 5.5, acting on Kasper's instruction). Astra (Codex `gpt-6-astra`) did the implement round and the one
fix round. After that the coordinator made value-preserving edits only.

The work is on branch `mountains/baked-coarse`, cut from main `9971c3f`. **The branch is not merged.** Two budgets
are missed:

- the C1 sampler budget, by +0.4 to +2.4 points;
- the field build target, on two of four worlds.

Contract §6 and the orbit bake are met. All evidence is under `test-results/mountains/t6-baked/`. That folder is
git-ignored and stays on disk.

## 1. Problem and route

Addendum (4) blocked the wiring step. Wired, the coarse tile build cost +17..+33% per level against main (the
contract allows +10%), and the orbit bake cost +21..+31% (the budget is +5%). The cause was V8 code quality. The
plain core ran slowly in any process that had also run the exact mountain path (M1 foot-point solve, M2
composition, M3 carving).

Route A replaces the exact M1/M2 work at coarse levels with a lookup in a baked, per-body field. The fine levels
(L >= the carving cut) and the truth sampler keep the exact M1/M2/M3 path.

## 2. What was built

- **Field** (`src/mountain-layout.ts`, `coarseBandField(maxDistM, minHalfWidthM)`, memoised on the layout,
  `orogen-layout-3`):
  - Grid:
    - Nodes lie on the cube-face grid at half the T1 band-grid resolution (Nf = 512 / 1024 / 256 / 1024).
    - The field is stored in sparse 8x8-cell blocks. Each block holds a 9x9 Float32 array per candidate belt.
  - Active cells:
    - A cell is active when it covers a T1-flagged cell. The active set is then dilated by one field cell, across
      face edges too.
    - Only the corners of active cells are evaluated. Unread nodes are 0.
  - Node values:
    - Each node stores the signed foot-point distance divided by H = min(halfWidthM, 48 km).
    - The distance comes from the same `transverse` projection as M1, including its sign rule.
    - Node directions are canonical on face edges, so both faces store bit-identical values there (tested).
  - Per-belt scalars:
    - tangent, centre, uLimit, halfWidthM, and the margin delta = 0.16 H.
    - The margin is measured, not derived. The worst bilinear error was 0.0768 H, at belt endpoints with
      |u/U| ≈ 1. The margin is more than twice that, Float32 storage included.
- **Coarse composition** (`src/mountain-envelope.ts`, `massifCoarseRidgeTermM`, `massif-envelope-3`):
  - The composition is an upper bound on the exact uncarved ridge term (1−w)·main + U.
  - For each candidate it takes w_lo = g²·blend(v_lo)·fade(s_hi) and U_hi = E·p(s_lo)³·lf·blend(v_hi).
  - The bound is valid because of the lemma blend(vg) ≥ g²·blend(v).
  - A candidate is skipped when |sd| − delta ≥ 1. The result is the maximum over the candidates and main.
- **Terrain** (`src/terrain.ts`):
  - `baseTerrainCore` serves plain samplers and coarse samplers (state false). For coarse samplers it reads the
    field with an inline lookup. No direction array is passed to a layout function.
  - `mountainTerrainCore` is a separate function literal. It serves the truth and L >= cut.
  - A source test keeps the two cores textually identical outside the setup hunk and the ridge-term hunk.
  - `TERRAIN_MOUNTAINS_WIRED` stays false.
- **Continuity rule.** The dilation ring makes every boundary node of the active region lie at least one field
  cell outside the band. There the composition returns main exactly.
  - Test: every active-boundary tap equals the inactive neighbour, `Object.is` on every returned field.
  - Seams: face-edge nodes are compared Object.is from both faces. Switch tiles keep the T3 parent rule, so the
    parent of an L(cut) tile is coarse.
- **Tests:** `tests/mountain-coarse-field.test.mjs` (20 tests) and its helper `tests/helpers/mountain-coarse-field.mjs`.
  They cover:
  - the g² lemma;
  - conservativeness against the exact reference, plus a zero-margin mutant that must fail;
  - determinism across build orders;
  - signed-distance enclosure and face edges;
  - more than 50,000 directions plus axis rasters per world: upper bound, inactive identity, ocean flags;
  - plain/mountain core identity outside massifs;
  - the core-sync source test;
  - the private-kernel identity;
  - the voxel-prefilter identity (see section 5).

## 3. Accuracy (coarse minus exact uncarved floor, 56,724 samples per world)

| World | Field build, cold, slotted | Bytes | Active cells | Violations | Ocean diff | p99 | max |
|---|---:|---:|---:|---:|---:|---:|---:|
| Maithea | 35.6 ms | 822,144 | 74,826 | 0 | 0 | 756 m | 2,347 m |
| Selawyn | **57.8 ms** | 1,624,130 | 133,763 | 0 | 0 | 769 m | 1,836 m |
| Raiva | 13.7 ms | 145,206 | 13,112 | 0 | 0 | 443 m | 1,355 m |
| Lethuris | **61.5 ms** | 1,726,504 | 145,451 | 0 | 0 | 740 m | 2,086 m |

The p50 is 0 m: outside massifs the coarse floor equals the exact floor.

The coarse surface is an upper envelope of the uncarved surface, and therefore of the carved truth. The p99
overestimate of about 750 m sits near belt endpoints, where the margin is widest relative to the real error.

The field build target is **≤ 50 ms per body cold**. It is missed on Selawyn and Lethuris (`final-field-report.jsonl`).

Profile of the build:

- About 40 ms is the node phase: 183k / 199k node projections at about 250 ns each.
- A second build in the same process takes 44-47 ms (`diag/field-warm.log`). JIT warm-up is therefore not the main
  cost.
- The resolution was not lowered. No value was changed to meet the target.

## 4. Identity and pins

- **Staged** (flag false), against main `9971c3f`, SHA-256 ledger. What moved:
  - the `{mountains: true}` samplers at L0 and L(cut−1);
  - mountain tiles at L0, L3, L(cut−1) and L(cut). L(cut) moved in `parents`/`parentHeight` only.

  Unchanged: default, truth, ≥ cut, off, crater, base and cut+2 samplers and tiles (27 identical entries per world).
- **Wired** (flag true, scratch copy only). What also moved: the default-L0 samplers, default tiles at L ≤ cut, the
  orbit bake and the hypsometry.

  Unchanged: the survey and the truth.
- **Re-pins**, old → new, ledger in `digest-ledger.json`, all in `tests/lod-carving-reduction.test.mjs`:
  - `COST_IDENTITY[0]`:
    - Maithea `05a0aea7…84af` → `08521843…44e0`
    - Selawyn `565f77b3…321d` → `b787565e…8954`
    - Raiva `fc27a747…474e` → `498662db…f570`
    - Lethuris `26402011…0557` → `4f79a66f…80b7`
  - `COST_SAMPLER_IDENTITY[0]`:
    - Maithea `df801672…a3a6` → `0c2e6161…d454`
    - Selawyn `b335c740…2f9a` → `c25d73c6…d5ec`
    - Raiva `35996b0d…df48` → `733c1c25…8778`
    - Lethuris `f5218c6f…a42b` → `3fa308f5…c492`
  - `COST_IDENTITY[1]` (switch tile; only `parents`/`parentHeight` moved, which is the T3 parent rule):
    - Maithea `2e3759c5…4194` → `3e812d1d…cfdb`
    - Selawyn `59cac04c…f558` → `528260f7…7ecf`
    - Raiva `d1b2089d…2d55` → `92f44e5f…4c5c`
    - Lethuris `26e7faa3…89d9` → `2c689122…0986`
  - `COST_SAMPLER_IDENTITY[1]` is unchanged.
- **Versions:** `OROGEN_LAYOUT_VERSION` orogen-layout-2 → orogen-layout-3 and `MASSIF_ENVELOPE_VERSION`
  massif-envelope-2 → massif-envelope-3. The pins in four test files moved with them. `LOD_LADDER_VERSION` and
  `TERRAIN_VERSION` are unchanged. No golden re-pin: that happens once, at T6 wiring.
- **Coordinator edits are value-preserving.** `fix-identity.mjs` digests (173,120 sampler outputs and 8 tiles)
  are byte-equal before and after every edit. `fix-node-identity.mjs` shows every read node `Object.is`-identical
  (503,165 nodes).

## 5. Cost (official protocols, CPU-quiet test slot, against main `9971c3f`, fresh process per world)

The final state is the branch as committed. Each round of the protocol was re-run whenever the code changed.

**Contract §6** (`contract-build-bench`, 5 rounds, mean growth per level, budget ≤ +10%): **MET.**

| World | L0 | L1 | L2 | L3 | L4 | L5 | L6 |
|---|---:|---:|---:|---:|---:|---:|---:|
| Maithea | +6.4 | +1.7 | +3.8 | +2.6 | +3.3 | +7.2 | |
| Selawyn | +0.9 | +3.9 | +0.5 | +1.1 | +8.9 | +5.4 | +5.5 |
| Raiva | +4.8 | +2.2 | +1.8 | +0.6 | +2.3 | | |
| Lethuris | +5.6 | +2.6 | +7.5 | +7.4 | +6.0 | +3.4 | −0.4 |

Before route A, the same table showed +17..+33% at every level.

**Orbit bake** (wired, 7 rounds, median growth, budget ≤ +5%): **MET**, 0 block solves.

| World | Median | Mean | Paired |
|---|---:|---:|---:|
| Maithea | +4.3 | +4.3 | +4.9 |
| Selawyn | +2.8 | +2.8 | +2.8 |
| Raiva | +0.3 | +4.1 | +4.2 |
| Lethuris | +2.3 | +5.0 | +5.1 |

Before route A: +21..+31%.

Noise note: the orbit bake executes only the coarse path, which is identical in all three code states measured.
Its medians ranged from −3.6% to +9.4% across repeated official-protocol runs of that identical path. One earlier
run (Maithea +5.8%, Selawyn +7.8%) would have missed. That run is reported in `fix1-freshcopy/` and was not
discarded.

**C1** (`scripts/mountain-assembly-cost.mjs --same-version`, 15 fresh processes per world, median weighted
resident overhead, budget ≤ +8%): **NOT MET.**

| World | Branch weighted | Branch outside | Main-wired control weighted | Main-wired control outside |
|---|---:|---:|---:|---:|
| Maithea | **8.40%** | +5.4% | 7.17% | +4.2% |
| Selawyn | **9.38%** | +7.9% | 2.53% | +1.2% |
| Raiva | **10.43%** | +8.5% | 3.95% | +2.0% |
| Lethuris | **8.76%** | +7.0% | 5.34% (n=5) | +3.6% |

The main-wired control is main `9971c3f` with only the flag flipped. It measures what the exact mountains cost
the truth path without route A. The per-run spread is wide: the branch runs range from −7.6% to +36.4%.

### C1 bisection (Maithea, coordinator, unofficial runs of 3-5 under the slot unless noted)

The truth sampler outside massifs became slower than main-wired. The hunks were bisected on top of main-wired.
The value columns are outside overhead / weighted overhead.

| Variant | Outside / weighted | Notes |
|---|---|---|
| Branch as after the fix round (official, 15 runs) | +21.8% / 24.1% | Private kernels everywhere, core-owned scratch copy of d |
| Main terrain + branch layout, private kernels only (V2a) | +20% / 22% | |
| Main terrain + branch layout, catalog kernels (V2b) | +3% / 6% | |
| Main terrain + scratch copy (Z2) | +11..21% | |
| Branch terrain without the copy, catalog kernels (Z3) | +3..8% | Contract +17..+25%: fails |
| Private construction kernels + scratch copy (X2) | +20..26% | Contract met |
| Private construction kernels + **fresh copy** `[d[0], d[1], d[2]]` (W3) | +4.5..7% | Contract met (one noisy Lethuris L0) |
| W3 official, 15 runs | +9.9% / 12.9% | |
| W3 + **inline T1 voxel prefilter** (final, official) | +5.4% / 8.4% | |

Conclusions:

- Two coordinator changes help C1 and keep contract and orbit met:
  1. The layout construction uses `constructionA0`, which runs on private kernel copies. The per-sample `sample`
     uses `continentalA0` on the catalog kernels again. Both are bit-identical, tested.
  2. The truth core copies d fresh instead of using a scratch array. It also reads the T1 voxel prefilter inline,
     so it skips `massifBeltSample` where that call returns the empty sample. A test compares this against the
     same core with the prefilter bypassed (Object.is on every field, four worlds), and a negative control (a
     shifted voxel index) fails it.
- The remaining gap to main-wired is +1..+6 points outside massifs. That is a V8 code-quality effect in the truth
  core. It is not more work: with the prefilter, the branch runs fewer operations per outside sample than
  main-wired.
- The profiles (`diag/prof-*.log`, `diag/prof2-*.log`) show only differences in inlining decisions, for example
  `detAcos` and `detAtan2` in the climate colour not being inlined.

## 6. Not done

- Route B (worker isolate) was not attempted. Route A met the coarse budgets it was meant to fix. The remaining
  misses are the truth-path C1 overhead and the field build, and an isolate for coarse tiles would not change C1.
- `test:full` was not run. Its one remaining use stays reserved for the T6 gate.
- No Luna vote and no full `npm test`.

## 7. Open items for the owner

1. **C1:** +0.4..+2.4 points over +8% on all four worlds. The main-wired control is 2.5..7.2%, so the branch adds
   about +1.2..+6.9 points in V8 effects.
2. **Field build:** Selawyn 57.8 ms and Lethuris 61.5 ms cold, against a 50 ms target. A lazy per-block build would
   meet it without changing values, but it adds a branch to the coarse hot path, which would need re-measuring.
3. **Accuracy follow-up:** a delta that depends on |u/U| would cut the about 750 m p99 overestimate. The error is
   concentrated at belt endpoints. This changes values and needs a version move.
