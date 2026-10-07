# Bench bands and cliffs (2026-10-07)

Decided by Fable 5.1 on Kasper's instruction (2026-10-07), overrulable. Read-only design pass over both carving decision docs, the C1 evidence doc and step-2 README, the 9 side-by-side probe crops, `src/mountain-carving.ts`, `src/mountain-assembly.ts`, `src/mountain-rock-detail.ts`, `src/mountain-envelope.ts`, `src/lod-ladder.ts`, the spectrum doc §3.2, the M5 design section, `tests/mountain-rock-detail.test.mjs`, the LOD tests and the assembly import allowlist.

## 1. Decisions

**Q1. The bench bands are a defect worth fixing, but not a carving or lattice problem: they are M5's strata rule.** `rockDetailM` (`src/mountain-rock-detail.ts:88-90`) takes `phase = (carvedM + jitter) / 280` with a seed-constant jitter, so every slope above 10° carries the same 280 m vertical staircase (tread over 50 % of the phase, riser over 8 %, up to 55 m deep), contour-locked to the smoothed carved height with one global phase. On the smooth envelope flank that gives the long, straight, evenly spaced, contour-parallel ledges seen in the 6000/3000/2100 m crops, identical on main and branch. Luna flagged the same on the planar fixture before wiring ("contour striping"). C1 only made them cleaner (smoother C2 driver phase). Step-2 verdict stands; C1 is not held for this. No current metric catches it (lattice families need a fixed wavevector; anisotropy reads contour stripes as natural). Cliffs and ledges are fine; uniformity is not. Fix = give the benches a geology, not remove them.

Smallest deterministic change, all inside `rockDetailM` after the `weight === 0` return:
- **Bedding datum:** `phase = (carvedM - D + jitter) / P`, `D = DATUM_TAN * (sx*alongM + sy*acrossM)`, `(sx, sy)` a seeded unit vector per strip (two hashes + sqrt), `DATUM_TAN = 0.05`. Bound (derived, re-prove numerically): worst case at the massif foot where `depth = 0.5*carved` binds, `g = tan 30°`: uphill derivative >= `g*(1 - 0.5 - benchBound) - benchBound*|grad D|`; with `benchBound <= 0.43` this needs `|grad D| <= ~0.09·g`, so 0.05 is safe by ~2x; 0.08-0.10 is not. No domain warp in stage 1 (stage-1b knob).
- **Per-strip period:** `P = 280 * (1 + 0.10 * (2*h01(seed) - 1))` (252-308 m), seed-constant. `benchBound` at `P_min`: 0.985·55/(252·0.5) = 0.430 < 0.8; `bound` 0.444 <= 0.6; +0.5 = 0.944 < 1 (HARD 6 passes with the bound rewritten for `P_min`).
- **Lens mask:** `lens = 0.7 + 0.3 * valueNoise(along/4000, across/4000, octave, seed)` (0.4-1.0) multiplying the strata shape; gradient <= 0.012 slope; R4 expectation <= ~0.07 rock power at >= 1 km (limit 0.20); HARD 2 `negative/steep > .3` unaffected.
- Rejected for stage 1: amplitude-only variation, per-cell phase jitter, cubic bench smoothing, hiding the bands under cliffs.

Cost: +20-36 ns rock-alone; in-massif rock level ~197-213 ns (main 191, C1 177); C1 budget +0.06-0.12 points on Maithea. Orbit untouched (level 0 never evaluates rock).

Versions/digests: `MOUNTAIN_ROCK_DETAIL_VERSION` -> `mountain-rock-detail-2` (fresh gate pool 731001-08, constants frozen first, one attempt); `ROCK_DETAIL_DIGEST` re-pin; `TERRAIN_VERSION` -> `terrain-1.9.2-strata`; golden biomes/placeQuery/census/rocks, `MOUNTAINS_TRUTH_SHA256`, `COST_SAMPLER_IDENTITY[2]` and rock-level `COST_IDENTITY` rows, tier-sets version, version-string pins. Not moving: `CARVING_F/S_DIGEST`, the 129-square pin, no-rock M3 rows, `COST_SAMPLER_IDENTITY[0..1]`, level-0 and belt identity, spectrum 4.7 dB limit, `MOUNTAIN_ASSEMBLY_VERSION`, import allowlist, `lod-coarse-frame` ROOM.

Verification (pre-registered): attribution first (truth minus rock-off carries the bands, rock-off does not, on the 20 frozen massif rasters); new HARD pin **heightCombDb** (rock term binned by carved height, 10 m bins, periodogram 0-3000 m, peak in the 230-330 m period band vs median of 100-1000 m excluding it, pooled over 20 tiles; threshold by midpoint rule on calibration seeds 740101-08 with bad controls = main/C1 field and a global-phase synthetic ramp, good controls = rock-off and datum+lens ramp); INFO riser run length (expect >= 2x shorter); spectrum truth <= 4.7 dB, rock-off row must equal the CR row 2.28/-0.79/0.58/0.12 exactly; INFO 4 km lens and 250 m gully families; visual probe pair main vs stage 1 at the Maithea axis station and a Raiva flank station plus rock-off frames, blind to arm order; STOP on new regular structure or tile-spanning bands.

**Q2. Cliffs: yes, staged, fitting the point-evaluated, non-positive rock-rung architecture.**
1. **Stratigraphic ledges** = stage 1 above (M5's 8 % riser already gives ~60° faces on 30° slopes; stage 1 makes them oblique, segmented, decorrelated).
2. **Fault-line scarps** (stage 2, `src/mountain-scarps.ts`, `mountain-scarps-1`): seeded sparse segments on a jittered 4 km cell lattice (3x3 search, ~30 % occupancy, random strike, 1-3 km, 300 m end tapers). Cut on the downhill side: ramp W = 25 m down to `h`, recovering to 0 over apron B = 250 m; `h = min(H_MAX, 0.5*carved, KAPPA_S*|g_n|*B)`, `g_n` from the C2 carved gradient, `KAPPA_S = 0.6`, `H_MAX = 80 m` (under the Raiva `lod-coarse-frame` rock-switch ROOM of 100 m). Pit-free by the same construction as M5; composed as `min(rock, scarp)`; same LOD rung and cache state as rock; `placeAt` untouched. Cost ~60-90 ns on steep rock-level samples, +0.1-0.2 C1 points. `mountain-assembly-5`, allowlist + one entry, terrain bump; own synthetic-ramp gate in the M5 pattern.
3. **Glacial headwalls / drainage-tied cliffs** (stage 3, later): need upstream area or a channel mask from the solve (+63 KB/block or a solve change); decided with the next solve change (`mountain-carving-4`).

Heightfield limits: no overhangs; a cliff is a >= 60-75° ramp over 20-30 m; metre scale is the ground-detail normal map's job. Rejected: two-sided steps (closed depressions), local `HILL_SLOPE` changes in the solve, `BENCH_FALL` below 0.08.

## 2. Implementation brief (stage 1)

Ordering: branch `mountains/strata-datum` from main **after** the C1 merge (needs the C2 driver). Own terrain bump, golden re-pin, exactly one counted cost run (same protocol, REF 9dcb1cf). Stage 2 after stage 1's visual verdict; stage 3 waits for a solve decision. No push/deploy/downloads, no pin loosened, no `known-failures.json` entry.

Files: `src/mountain-rock-detail.ts` (+ `terrain.ts` version string), `tests/mountain-rock-detail.test.mjs`, `tests/helpers/mountain-rock-detail-fixture.mjs`, `tests/terrain-structural-spectrum.test.mjs` (+ helper), golden/tier-sets/version pins, `docs/mountain-strata-datum-<date>.md` (evidence + ledger).

Steps (each a stop point):
1. Attribution (no src change) on the 20 tiles; calibrate `heightCombDb` on 740101-08 with the four controls; record the threshold before touching src. STOP if main's field does not fire the comb.
2. Code: datum (`DATUM_TAN 0.05`), period spread 0.10, lens (`LENS_FLOOR 0.4`, `LENS_LAMBDA_M 4000`), constants frozen in `MOUNTAIN_ROCK_DETAIL`; keep the pinned `const jitter = ...` line textually; new work after the `weight === 0` return; no new imports; audited arithmetic only (no `Math.cos/sin`).
3. Tests: version `-2`; HARD 6 `benchBound` at `P_min`; HARD 7 `L_MAX` with `|grad base| + DATUM_TAN` and `P_min`, wrap-root finder updated, negative controls still firing; every `SOURCE.replace` needle must throw when absent; new HARD no-uphill-reversal row on the synthetic ramp incl. a `carved < 110 m` foot band, 65,536 samples, `DATUM_TAN 0.12` negative control must fail; HARD 2 unchanged; gate pool 731001-08 single run, R1e/R2/R3'/R4/R5/R6 at unchanged limits; cost row `ATLAS_M5_BENCH=1` <= 214 ns.
4. Re-pins and identities as listed above; HARD identity: belt = 0, outside-massif, carved-no-rock levels and level 0 bit-identical to main on 4 x 15,120 directions; `tsc`, `test:pkg` for mountain-*, lod-carving-reduction, lod-coarse-frame, terrain-mountains-assembly.
5. Spectrum: HARD truth <= 4.7 dB; rock-off row = CR row exactly; `heightCombDb` HARD; INFO families.
6. M3 eight rows on 730201-08 and 730301-08, no re-tuning; Raiva whole-core R1 >= 8 hard reject; report, do not tune.
7. In-massif warm bench <= 216 ns; `test:perf`; `test:affected --base main`; `test:full` once.
8. GPU lock: cross-engine golden (0 new mismatches), probe pairs with rock-off frames, blind judging.
9. Counted cost protocol on the coordinator's quiet window, pre-registered, N = 30, budgets unchanged. STOP = no rerun; orbit-by-noise STOP goes to Kasper with the 2d(b) options; C1 STOP back to Fable.

Any HARD failure after one attempt returns to Fable for a design decision, not tuning.

## 3. For Kasper

The long parallel ledges on the flanks are not the grid coming back; they are the rock-strata layer putting an identical 280 m staircase at the same heights on every slope of the massif, so they are the next thing to fix now that the carving branch has merged. The smallest fix gives the strata a geology: a gently tilted bedding plane per range, a slightly different layer thickness per range, and layers that thin out and end over a few kilometres, which breaks the lock-step at almost no cost and stays within the proven no-pit budget. Cliffs come next as fault scarps up to about 80 m that cut across the ledges at any angle and cannot make closed pits; glacial headwalls need the drainage solver and wait for its next change.

## Addendum A: stage-1 step-1 STOP (decided by Fable 5.1 on Kasper's instruction 2026-10-07, overrulable)

Last Fable decision on this track: from 2026-10-07 new decisions go to Opus 5.5 (owner instruction). Where this addendum says "returns to Fable", read "returns to the Opus decision agent".

Evidence: branch `mountains/strata-datum` ee9c613 (`docs/mountain-strata-datum-2026-10-07.md`: attribution holds, rock term 10.86 dB on the real tiles; fixture calibration midpoint fails; finding 1 planar flank; finding 2 span dependence). Fable read-only probes on the fixture ramp (seeds 740101-08, 35°, 3.2 km along contour):

| arm | heightCombDb pooled (per-seed) | riser-spacing CV pooled (per-seed) | mean carve / v1 |
|---|---|---|---|
| v1 (main) | 39.0 (34.9-40.3) | 0.00 | 1.00 |
| old stage 1 datum+lens | 23.3 (24.9-35.0) | 0.20 (0.05-0.25) | - |
| per-bed, GAP .25, PROM_FLOOR .35 | 18.1 (14.5-25.2) | 0.59 (0.42-0.68) | 0.43 |
| random-walk ledge null | 8.8 (7.1-16.0) | 0.24 (0.13-0.33) | - |
| rock off | 13.7 (11.0-18.3) | n/a | 0 |

Reversal spot-check of the per-bed design on planes 12-45°, 8 datum directions, foot included: min uphill slope ratio 0.40 at >= 30°, 0.99 at 12°, no reversal. Cost rock-alone 68 -> 116 ns.

**Decision.** Any spatial modulation of the stratigraphic coordinate is gradient-bounded (~0.05) and needs >= ~5.6 km per period of phase shift, so it cannot de-regularise bands inside a 3 km view; straight parallel ledges on a planar flank are geologically fine, the artefact is identical thickness and depth. Lever = 1-D variation per bed: per-bed prominence with ledge-less beds (dominant), per-bed thickness, per-bed lateral lens; datum kept only to break the height lock and give dip on curved flanks. Rejected: domain warp (stage 1b), spatially varying period, per-strip period spread. This reverses the earlier "amplitude-only rejected" line.

**Metrics.**
- HARD A `riserSpacingCv` on a planar ramp: 35° plane, 256 x 12.5 m along contour, 160 x 25 m along fall line (carved 100-2900 m), fixture background, two tiles per seed; per fall-line column a riser = pixel pair where the rock term alone rises > 15 m uphill; spacings in carved height, merge < 70 m; pooled CV over 8 seeds x 2 tiles. BAD = v1 (~0.00), GOOD = random-walk null (bed thickness uniform [0.5P, 1.5P] by prefix sum, unit prominence, no datum, no lens; ~0.24). Threshold = pooled midpoint (~0.12); design pooled CV on fresh seeds 740201-08 >= threshold.
- HARD B `heightCombDb` on the same ramp tiles (`HEIGHT_COMB` frozen): BAD v1 (~39), GOOD max(rock-off, null) (~13.7); threshold pooled midpoint (~26); design pooled on 740201-08 <= threshold.
- HARD C (conditional) `riserSpacingCv` on the 20 frozen massif tiles via the trace worker (columns and rows, spacings only within monotone-uphill carved runs): BAD = main via the hook, GOOD = the null via the hook; pooled midpoint; if bad >= good or < 300 pooled spacings, C demotes to INFO (pre-registered).
- INFO: real-tile heightCombDb (main 10.86), riser run count (expect -25..40 %). Old fixture-field calibration withdrawn. Thresholds recorded before any src edit; the design is never a control.

**Design (constants frozen).** In `rockDetailM` after the `weight === 0` return, pinned `const jitter = ...` line kept textually:
- `u = carvedM - DATUM_TAN*(sx*alongM + sy*acrossM) + jitter`, `DATUM_TAN = 0.05`, `(sx, sy)` seeded unit vector per strip (two hashes + sqrt).
- Beds: `q = u / STRATA_PERIOD_M`, `k = floor(q)`; boundary k at `k + BED_SHIFT*(2*h01(k) - 1)`, `BED_SHIFT = 0.06` (thickness 246.4-313.6 m); resolve bed k-1/k/k+1 from the boundary hashes; `t = (q - lo)/(hi - lo)`; `bench(t)` unchanged.
- Prominence `r = h01(k)`: `prom = r < BED_GAP ? 0 : PROM_FLOOR + (1 - PROM_FLOOR)*(r - BED_GAP)/(1 - BED_GAP)`, `BED_GAP = 0.25`, `PROM_FLOOR = 0.35`.
- Per-bed lens: value noise, `LENS_FLOOR 0.4`, `LENS_LAMBDA_M 4000`, corners hashed with octave `4096 + k` (document no collision with gully octave 0; assert |k| <= 2048 over the gate pool).
- `strata = bench(t)*prom*lens`; rest unchanged. Per-bed hashes keyed on (k, seed) only.
- HARD 6 at `T_min = P*(1 - 2*BED_SHIFT) = 246.4`: benchBound 0.4397, bound 0.4536 <= 0.6, +0.5 = 0.954 < 1. HARD 7 `L_MAX`: strata term with `(|grad base| + DATUM_TAN)` and `T_min`, plus lens term `MAX_DEPTH_M*(1-LENS_FLOOR)*1.5*sqrt2/LENS_LAMBDA_M`.

**Revised steps** (branch continues from ee9c613; each a stop point):
1. Metric + calibration, no src change: `riserSpacingCv` and ramp builder in `tests/helpers/height-comb.mjs`; `null-edit.mjs` beside `stage1-edit.mjs`; A, B controls on 740101-08; C on the 20 tiles; thresholds into the evidence doc. STOP if v1 is not CV < 0.05 and comb > 30 pooled on the ramp, or the null reads CV < 0.15.
2. Code as above; no per-strip period spread; no new imports; audited arithmetic; no `Math.cos/sin`.
3. Tests: version `mountain-rock-detail-2`; HARD 6/7 as above; every `SOURCE.replace` needle throws when absent; HARD no-uphill-reversal row (planes 12/15/20/25/30/35/45°, 8 datum directions, 1 m central differences along the fall line, 65,536 samples per slope, foot band from carved 20 m, min ratio > 0; negative controls `BENCH_RISE 0.2` and `DATUM_TAN 0.5` (foot band) must fail; `DATUM_TAN 0.12` INFO); HARD A/B on 740201-08, HARD C per step 1; HARD 2 unchanged; gate pool 731001-08 single run, rows at unchanged limits (mean carve ~0.43 of main; any lower-limit row tripped = STOP, no tuning); cost row `ATLAS_M5_BENCH=1` <= 248 ns.
4. Re-pins/identities as in section 2 step 4.
5. Spectrum: HARD truth <= 4.7 dB; rock-off row = CR row exactly; INFO families, real-tile comb, riser runs.
6. M3 eight rows on 730201-08 and 730301-08, no re-tuning; Raiva R1 >= 8 hard reject.
7. In-massif warm bench <= 250 ns; `test:perf`; `test:affected --base main`; `test:full` once.
8. GPU lock: cross-engine golden; blind probe pairs main vs branch at the Maithea axis station, a Raiva flank station and one long straight flank station, plus rock-off frames; judged on varied ledge thickness/depth, absent beds, ledges ending laterally, no tile-spanning identical bands; STOP on new regular structure.
9. Counted cost protocol (O13 now signed by Kasper; pre-register which protocol), budgets unchanged; expected +0.15-0.2 points Maithea.
