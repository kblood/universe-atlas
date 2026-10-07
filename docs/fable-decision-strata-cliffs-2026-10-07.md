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
