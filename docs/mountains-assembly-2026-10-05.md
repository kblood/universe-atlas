# Mountains assembly, step A (MTN-6), 2026-10-05

Branch `mountains/assembly-2` from main `39e2448` (`terrain-1.8.1-grain`, step G merged).

**Result: PARTIAL.** M1 + M2 + M3 were wired into `terrain.ts` and met every terrain row on the
branch: the 17 LOD pins, 96/96 LOD cells, identity outside the belts, SITE_A, coast invariance and
M4 R1-R3 on the real parameters of all four worlds. The wiring is **not merged**, because sampler
cost misses its budget by two to three orders of magnitude (section 5):

- warm resident cost: +108% to +156% against a +8% budget. M1 (the orogen layout) causes most of it.
- cold sparse sampling: 2 to 4.3 ms per sample. M3 causes this; every in-massif sample far from the
  last one needs its own ~140 ms block solve. Building the 6 L0 tiles of Maithea took 335 to 461 s,
  against 0.19 s on main.

The wired state is kept on the branch as evidence, in commits `2744237` (M1+M2) and `92afaa3`
(M1+M2+M3, `terrain-1.9.0-mountains`). What merges is the part that does not change terrain:

- the frozen LOD tile selection (decision e);
- M2 `massif-envelope-2` (decision e);
- M1's additive `alongM`;
- the unwired composition `src/mountain-assembly.ts` (decision g);
- the identity pins (recorded on main first);
- the measurement scripts and tests.

`TERRAIN_VERSION` stays `terrain-1.8.1-grain`. No golden digest moves, so there is no re-pin
(section 6).

## Owner decisions (2026-10-05, verbatim as relayed)

> (a) M3 coherence/pit rows calibrated (merged). (b) the 800 m colour grain is changed in its own
> small step with TERRAIN_VERSION bump + deliberate golden re-pin + update of the two colour tests
> that hard-code the old .88/.24 grain (old/new digests documented). (c) M3 cost judged on warm
> resident cost. (d) assembly in two steps. (e) NEW: the 8 failing LOD class pins when belts are
> wired are handled by FREEZING the stratified tile selection (so tile re-picking cannot move the
> pins; document how) AND CHANGING the M2 envelope so belts do not move the class boundary in
> snowline/treeline tiles (Maithea L8 name/carriedName); NO pin is loosened or repinned. (f) NEW:
> the convex blend lowering heights at belt edges (up to 3 km, 23-45 directions per world) is
> accepted ('uplift inside belts with fade-out at the edge'). (g) M3's relief scales with belt width
> (lattice 2w/480): give M3 a FIXED carving width tiled across wide belts so Selawyn's 220 km belt
> and low-tau belts reach M4 R1 (>=8 peaks/1000 km2), measured on the real parameters of all four
> worlds.

## 1. Decision (e): frozen selection plus massif-envelope-2

**Freezing (how).** `tests/lod-consistency.test.mjs` used to pick its tiles on the live field. Now it
reads literal directions from `tests/helpers/lod-frozen-selection.mjs`:

- the 12 stratified tiles of Maithea and Lethuris (3 each of snowline, treeline, coast and range);
- the 32 Maithea retention edge tiles.

These are the exact outputs of `stratifiedEdgeDirections(ts, cls)` and
`edgeDirections(ts, cls, 32)` from `scripts/lod-consistency-report.mjs` on main `39e2448`
(`terrain-1.8.1-grain`), which is the field every current pin was measured on. A round-trip check
compared them with a fresh run on main: the match is exact, and Astra reproduced it independently.
The fixture header gives the regeneration recipe. Use it only for an owner-approved re-pin, and
record the commit and version (`FROZEN_SELECTION_SOURCE`, asserted by the test).

**For the owner:** freezing the retention edge selection goes beyond the letter of (e), which names
the stratified selection. It is done for the same reason: those tiles were also picked on the live
field. It keeps today's directions and thresholds. Over time, though, those points may stop sitting
on live snow or forest edges.

No `SHIPPED_CEILINGS` value changed.

**Cause of the Maithea L8 failure.** On the frozen selection, M1 plus the v1 envelope moved only one
tile: Maithea snowline tile 0 (lat 34.3 deg). It lies inside major belt 0 (220 km half-width),
123 km from the axis, at belt value .97. The v1 profile `(1-s^2)^3` spread over the whole 220 km
half-width. That gave about 950 m of envelope at s = .56, which is less than main's ridge term
there. The convex blend therefore lowered the tile, with its L8 p50 going from 3629 m to 2235 m. The
snowline and treeline boundary moved into the tile:

| Rows | L6 name / carried / forest / snow (cells) | L8 name / carried / forest / snow (cells) |
|---|---|---|
| Main | 31 / 32 / 27 / 7 | 0 / 0 / 0 / 0 |
| M1 + v1 envelope | 29 / 39 / 43 / 0 | 32 / 42 / 16 / 0 |

Maithea L6 `carriedName` has 0 spare cells under its ceiling (3.491% against 3.5), so any change in
this tile's L7 child breaks it. That child is at least 58 km from the axis.

**massif-envelope-2** (`src/mountain-envelope.ts`):

- The massif is a band of fixed maximum half-width, `MAX_HALF_WIDTH_M = 48000`, along the belt axis.
- `U = A (1 - s^2)^3 x landFactor x blend(belt)`, with `s = |d| / min(w, 48 km)`.
- The composition weight is `blend(belt) x (1 - smoothstep(.65, 1, s))`.
- `composeRidgeTermM(main, belt, axisDistanceM, halfWidthM, U)` returns main's term bit-exactly when
  belt = 0, when the belt is width-gated, or at or beyond the massif half-width. Inside the massif it
  returns `(1 - w) main + U`.

So decision (f) holds: uplift inside the massif, fading out at its edge. The outer part of a wide
belt keeps main's ridge term. The element test covers bit-exactness (signed zero included),
convexity, the bound `max(main, A)`, the fade profile, and a v1 negative control.

**For the owner, a deviation.** The 48 km cap applies to every belt, so on a wide belt the massif is
narrower than the belt. Selawyn's 220 km belt carries mountains only within 48 km of its axis.
Both of these force it:

- (e) with "no pin loosened": a massif reaching 58 km from the axis would move the 0-cell budget
  in the tile above;
- (g): R1 needs a carving width of about 40 km or more at Raiva's tau (section 3).

Astra flagged this as HIGH: "only strip 0 can ever reach M3 ... not fixed-width carving tiled across
wide belts". The finding is correct and is listed under open items.

## 2. Decision (g): fixed carving width (`src/mountain-assembly.ts`)

- `CARVING_HALF_WIDTH_M = 48000`, so the M3 lattice spacing is d = 2w/480 = 200 m on every belt.
  (With w = 220 km it was 917 m.)
- `carvingStrip(across)` tiles the across-axis coordinate into strips of width 2w centred on 0,
  +-2w, ... Each strip `k` has its own seed from `carvingSeed(beltSeed, k)`. The belt seed is
  `hash64("<body seed>/mountain-carving/<i>") & 0xffffffff`, computed once per sampler.
- `mountainRidgeTermM = composeRidgeTermM(...) + carving(U)`, where the carving uses the along
  coordinate `alongM` from M1.
- U + C = U x retained >= 0, so the ridge term stays >= 0 and the sea-level-0 coastline is
  unchanged. This is tested with the ocean flag of every direction against a pin taken on main.
- The massif cap equals the carving width (`MASSIF_IS_ONE_STRIP`), so in practice only strip 0
  carries an envelope. The strip rule is unit-tested so that a wider massif would tile rather than
  stretch the carving.

M1 gains `alongM`, the base-circle arc of the foot point `R x 2 atan(u)`. It uses a half-angle
reduction plus the odd atan series to t^19, so it is arithmetic only, with error under 1e-14 rad.
Existing outputs are unchanged: Astra compared every legacy field on 4096 directions per world. The
version stays `orogen-layout-1`.

## 3. M4 on the real parameters of the four worlds

`node scripts/mountain-assembly-summits.mjs` took 105 s; its report is
`test-results/mountains/assembly-2/m4/report.json`.

**Method.** A straight belt, with the world's tau and its real M1 half-width (the first M2 spectrum
site), composed exactly as `terrain.ts` does inside a belt: `mountainRidgeTermM` with main's term 0.
Eight seeds, each with a 48 km raster at 125 m and a 96 km raster at 250 m. Prominence is at least
300 m.

| World | tau | Belt w (km) | R1 axis 48 km | R1 flank 48 km (y0 = 19.2 km) | **R1 whole core** | R2 | R3 (max / bound m) |
|---|---:|---:|---:|---:|---:|---:|---:|
| Maithea | .789 | 71.6 | 50.68 | 37.17 | **41.00** | 100% | 0 (2872 / 2872) |
| Selawyn | .603 | 220.0 | 27.85 | 20.13 | **22.78** | 100% | 0 (2196 / 2196) |
| Raiva | .456 | 90.1 | 10.90 | **7.12** | **8.59** | 100% | 0 (1660 / 1660) |
| Lethuris | .771 | 129.7 | 48.47 | 35.52 | **39.41** | 100% | 0 (2806 / 2806) |

Before decision (g), the same method gave Selawyn 0.054 and Raiva 7.93 at the axis and 2.62 on the
flank (docs/mountain-summits-v1.md). Body-bound violations are 0 everywhere.

**For the owner: which R1 method.** The 48 km axis and flank rasters each cover only part of the
core band. The flank raster's core region is mostly s in .4 to .65, where the envelope is weakest.
The proposed R1 measurement is the whole core: one 513 x 125 m raster (64 km) per seed spanning
|y| <= .65 x 48 = 31.2 km.

On that measure Raiva passes with 8.59 (275 summits over 31,998 km2). The flank raster alone gives
7.12, which is below 8. Astra (HIGH): the earlier axis and flank results should stay binding until
the owner accepts the whole-core method. `tests/terrain-mountains-assembly.test.mjs` pins Raiva's
whole-core value (CONTRACT, method pending owner) next to a negative control: the bare envelope,
with carving off, fails.

**Assembled field (INFO, at `92afaa3`).** `groundHeightM` of the wired `terrainSampler` on 8 real
on-axis land sites per world (48 km at 125 m), with the same rasters on main:

| World | Branch | Main |
|---|---:|---:|
| Maithea | 44.80 | 0.00 |
| Selawyn | 35.78 | 0.54 |
| Raiva | 20.08 | 0.00 |
| Lethuris | 29.20 | 0.00 |

Values are summits per 1000 km2 of massif core, over 18,528 km2 per world.

## 4. LOD pins, identity and site checks with the assembly wired

| Check | M1+M2 (`2744237`) | M1+M2+M3 (`92afaa3`) |
|---|---|---|
| 17 SHIPPED_CEILINGS pins (frozen selection) | 17/17 pass | 17/17 pass |
| 96 LOD cells (heights, ocean, RGB, classes, retention) | 96/96 | 96/96 |
| outside-belt identity (heights + ocean + colour, 4096 per world) | identical to main | identical to main |
| outside-massif identity | identical | identical |
| ocean flag everywhere (4096 per world) | (not run) | identical to main |
| SITE_A (`tests/harness-sites.test.mjs`) | 4/4 pass | (not re-run) |
| hypsometry, climate colour, river-terrain, inland-rivers-disabled | pass | (version pins only; not re-run) |

With M3 wired, the pin values equal main's (for example Maithea L6 carriedName 3.491 against
ceiling 3.5). No frozen pin tile touches a 48 km massif, so these pins do not exercise mountain
terrain.

Only the retention cells move:

| Retention cell | M1+M2 | M1+M2+M3 | Requirement |
|---|---:|---:|---|
| L6 peak kept | 90.94 | 89.62 | >= 85 |
| L8 peak kept | 97.99 | 97.48 | >= 95 |
| L6 summit p50 / max (m) | 13.9 / 227.8 | 10.2 / 295.9 | <= 120 / 400 |
| snow kept | 99.25 | 99.05 | |
| forest kept | 98.97 | 98.87 | |

**Identity pins.** The digests come from main's `src/terrain.ts`, imported read-only by
`test-results/mountains/assembly-2/identity-pins-on-main.mjs`, before any wiring:

| Digest (4096 per world) | Value |
|---|---|
| outside-belt heights + ocean | `a7000ad6...` |
| outside-belt with colour | `e04aa67d...` |
| outside-massif heights + ocean | `e26e77d3...` |
| outside-massif with colour | `35a334d2...` |
| ocean everywhere | `48f643c5...` |
| ocean everywhere, n = 20000 | `8d6d51d3...` |

Negative controls show that one changed height, colour or ocean flag breaks the digest.

## 5. Sampler cost (the blocking rows)

`scripts/mountain-assembly-cost.mjs <world>` ran in one fresh process per world on the eval checkouts
of `2744237` and `92afaa3`, against main, one at a time with nothing else running. CPU-quiet lock
not taken.

- **Region:** 8 in-massif sites x 385^2 samples. Warm means 5 passes with 0 block rebuilds, which the
  script asserts.
- **Outside:** Fibonacci directions outside every massif.
- **Weighted:** `(s Bin + (1 - s) Bout) / (s Min + (1 - s) Mout) - 1`, where s is the in-massif land
  share. This is Astra's corrected formula.

All times are ns per sample.

| Wired | World | Massif land share | Region main / warm / cold | Outside main / branch | **Weighted warm resident** | Sparse 1000 cold (ms/sample) |
|---|---|---:|---|---|---:|---:|
| M1+M2 | Maithea | 2.27% | 563 / 3366 / 3310 | 489 / 1172 | **+149%** | 0 builds |
| M1+M2 | Selawyn | 1.11% | 642 / 3337 / 3332 | 446 / 918 | **+111%** | |
| M1+M2 | Raiva | 1.72% | 623 / 3356 / 3271 | 486 / 1181 | **+150%** | |
| M1+M2 | Lethuris | 1.16% | 543 / 3462 / 3402 | 455 / 991 | **+123%** | |
| M1+M2+M3 | Maithea | 2.27% | 557 / 3441 / 6459 (22 builds) | 517 / 1149 | **+132%** | 4.29 (27 builds) |
| M1+M2+M3 | Selawyn | 1.11% | 602 / 3301 / 5894 (22) | 457 / 927 | **+108%** | 2.12 (15) |
| M1+M2+M3 | Raiva | 1.72% | 602 / 3409 / 5983 (22) | 604 / 1513 | **+156%** | 1.99 (14) |
| M1+M2+M3 | Lethuris | 1.16% | 541 / 3467 / 6767 (24) | 444 / 988 | **+128%** | 2.01 (13) |

**L0 tile streaming (cold):**

| World | Main | Branch | Block solves | Conditions |
|---|---:|---:|---:|---|
| Raiva | 186 ms | 93,205 ms | 585 | clean run |
| Maithea | 192 ms | 461,352 ms | 2313 | concurrent load |
| Maithea | | 335 s | 2314 | earlier probe |

A full L0 to L5 stream would multiply this. Maithea has 152 in-massif L0 vertices, 9855 at L3 and
158,204 at L5, and peak correction adds about 4 more samples per vertex.

**Reading.**

1. **The warm budget fails with M1 + M2 alone.** M1's foot-point solve costs about 2.7 µs per
   in-belt sample, and its per-belt loop adds about 500 to 700 ns outside massifs. M3's warm
   resident cost is small: about +75 ns on the region, consistent with M3's own 49 ns.
   `docs/mountain-layout-v1.md` already noted that "MTN-6's +8% sampler budget is not met by this
   element alone". The weighted overhead is +108% to +156% against +8%.
2. **Cold sparse sampling is unusable** (decision (c) calls cold cost non-blocking, but this is about
   500 to 2400 times main's L0 build time). Global consumers sample far apart: L0 to L5 tiles, the
   orbit relief texture, the 4096 to 20000-direction test sweeps and golden capture. Each in-massif
   sample there costs a full block solve of about 100 to 160 ms. Measurement on dense rasters
   (`docs/mountain-carving-f-v1.md`, cold 71.7%) could not show this. Astra found no
   value-preserving shortcut: "larger caches alone cannot make first-touch sparse misses cheap",
   though exact precomputed or persisted Float32 blocks, prefetching and batching could preserve
   values.

## 6. Versions, golden, cloud sheet

- `TERRAIN_VERSION` is unchanged on main (`terrain-1.8.1-grain`). The proposed
  `terrain-1.9.0-mountains` exists only at `92afaa3`.
- **Golden:** no re-pin, because no terrain digest moves. The step G digests stay current: terrain
  `1363e73f...`, combined `c2b6e424...`, placeQuery `675746e6...`, census `02ede0a8...`.
- **Luna sheet** (4 worlds, with and without clouds): not run. The wiring is not merged, and
  rendering wired terrain needs cold tile streaming, which takes minutes per L0 set (section 5).
- **Component versions on main after this merge:**
  - `massif-envelope-2` (was `-1`);
  - `mountain-assembly-1` (new, unwired);
  - `orogen-layout-1` (additive `alongM`);
  - `mountain-carving-2` (unchanged).

## 7. Astra review (read-only, gpt-6-astra)

Verdict: MERGE-AFTER-FIXES for the unwired state, saved in
`test-results/mountains/assembly-2/astra-review.md`.

| Finding | Severity | Status |
|---|---|---|
| Massif cap is a design deviation from "tiled across wide belts" | HIGH | Flagged to owner (section 1) |
| R1 method changed: the whole core is pooled and the axis/flank rows are no longer the gate | HIGH | Flagged to owner (section 3); both reported |
| `scripts/mountain-render-envelope.mjs` called `composeRidgeTermM` with the old 4-argument signature (NaN heights) | MEDIUM | Fixed |
| Weighted-cost formula; cold runs not in fresh processes; residency not enforced; no unwired-checkout guard | MEDIUM | Fixed (section 5) |
| New test not registered; 316 s bound sweep; no identity or R1 mutation controls | MEDIUM | Fixed: registered in `npm test`, sweep confined to two M3 blocks, negative controls added |
| Retention selection frozen too | LOW | Documented as an extension (section 1) |
| `thetaOf` accuracy comment wrong (8 mm, not 0.1 mm) | LOW | Fixed by extending the series to t^19 (< 1e-14 rad) |

## 8. Open for the owner

1. **Cost:** decide how M1 and M3 reach the sampler budget before the wiring can merge. Options:
   - M1: a tighter residual bound or bounding-cap rejection before the foot-point solve, or a
     cached per-tile belt query;
   - M3: precomputed or persisted blocks per world, a coarse-level rule so sparse or coarse sampling
     never triggers a block solve (this needs the LOD contract to allow it), or a cheaper block
     solve (new M3 version with re-calibration);
   - or accept a different budget.
2. **Massif cap (48 km on every belt)** in place of carving tiled across the full wide belt.
3. **R1 method:** accept whole-core pooling, or keep the axis and flank rasters binding. Raiva's
   flank raster gives 7.12.
4. **Retention selection freeze**, beyond the letter of (e).
