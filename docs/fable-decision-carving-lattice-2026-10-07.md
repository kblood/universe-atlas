# Decision: the 200 m carving lattice (2026-10-07)

Decided by Fable 5.1 on Kasper's instruction (2026-10-07), overrulable. Kasper's input: "cliffs are allowed to exist, maybe that helps". Recorded verbatim from the Fable decision report.

Note added by the coordinator: the GATE-6 `placeAt` regression this decision says must land first is already fixed on main as `e0ada88` (point-query lattice cell cache, `docs/placeat-regression-2026-10-07.md`). The C1 branch rebases on it; the point memo in item 3 below must be adapted to the memo that exists on main.

## 1. Decision: FIX, built now on a staged branch, landed with the next TERRAIN_VERSION bump, with one trigger that promotes it to its own bump

**Not "accept".** The peak is a pure interpolation artefact: `retainedAt` in `src/mountain-carving.ts` (lines 273-281) triangle-interpolates the solved `retained` field on a 200 m lattice, so the carving `C = -U·(1-retained)` is C0 with a gradient kink on every lattice line, axis-aligned and periodic. Attribution in the spectrum doc is unambiguous: uncarved -6..+3 dB, carving-only 5-13 dB, truth (rock on) 7.8-8.9 dB pooled on 20/28 massif tiles, off-belt about 0. A perfectly regular, axis-aligned grid of slope kinks is exactly the "generator lattice fingerprint" class the structural-metric lane was built to catch (metrics doc §1.2). Leaving it means the fine-lattice row can never become a CONTRACT pin without setting the threshold above the artefact, which the repo's own rule calls "a fit to hide failures". It is also the one structural finding on the real field that has a cheap, local, value-changing fix with no re-tuning.

**Kasper's hint, taken at its real meaning.** "Cliffs are allowed" says slope discontinuities per se are fine, so the fix does not need C2 smoothness or any softening of the V-valleys and crests the solve produces. What is not fine is *periodicity*: cliffs are irregular and follow structure (drainage, strata); a 200 m grid does not. So the target is "no lattice-periodic kinks", not "no kinks". Rejected readings:
- **Hide it under rock/cliff detail (M5).** Rock already sits on top of the facets wherever they are resolvable and removes only about 2 dB. It is slope-gated (0 below 10°), so valley floors and gentle flanks stay faceted; M5's real-M3 margins are thin (slope p90 48.25 vs 48.4, R3' 3.28 vs 3.32) and its round-2 ribs already blew the M3 pits row (2.6 -> 54). Most expensive, least complete option.
- **Jitter the lattice.** Jittering solve vertices changes edge lengths, routing and every M3 row; jittering only the query coordinate blinds the detector but leaves wavy kinks the eye still reads as a grid.

**Why bundled with the next bump rather than now.** Amplitude is at most 1.6 m RMS (mostly under 0.8 m), shading-only, resolvable only from Maithea L11 / Raiva L10 / Selawyn-Lethuris L12, under ground-detail normal maps (fade 600-6000 m), so there is no measured evidence that it is visible in the app. A terrain bump costs a golden re-pin plus a ~2 h fair-protocol quiet window. The engineering is small and is done now so the bump cost is shared with whatever moves terrain next.

**Promotion trigger (binding):** one GPU-slot probe pair, before/after, descent over the Maithea frozen axis station at L11-L13 with sun elevation at most 15° (2-4 s). If the 200 m grid is visible to a human in shading on the before frame, the fix lands on its own bump immediately. Luna is advisory only.

**Risks:**
- *Cost (C1 only).* The orbit bake samples level 0 (uncarved), so the Raiva orbit cell (4.36 %, CI upper 5.49 %) is untouched. C1: 16-tap Catmull-Rom vs 3-tap triangle; estimate +50..110 ns per in-massif sample, **+0.2..0.5 points** on Maithea (5.77 % -> about 6.1-6.3 % median vs 8 %). Fallback if C1 misses: 9-tap quadratic B-spline (about half the cost, slight smoothing), or the bicubic's analytic gradient for M5's slope (changes M5 input semantics, own version; not first choice).
- *M3/M4 rows.* Catmull-Rom reproduces vertex values exactly; between vertices it rounds V-floors and crests over ±100 m. No undershoot below a V floor, so no new pits; `fill > 10 m` may tick. Raiva whole-core R1 is 8.59 vs >= 8 and is the row most likely to bite; hard reject condition.
- *Exact +0 semantics.* Interpolate the *cut* fraction `1 - r` (exactly 0 where uncut), not `retained`.
- *Block edges.* 16 taps reach one column past the stored `CORE+1`; store `CORE+3` (already solved inside the halo, bit-identical across seams). Rows clamp to [0, ROWS].

## 2. Implementation brief (branch `mountains/carving-c1`; no push/deploy/downloads; no pin loosened)

Read first: `docs/terrain-structural-spectrum-2026-10-07.md` §3.2, `docs/mountains-opus-decisions-2026-10-05.md` (addenda 3, 6, T6 record), `docs/mountain-carving-f-v1.md`, `tests/helpers/mountain-carving-digest.mjs`, this decision.

Approach (`src/mountain-carving.ts` only, plus the `terrain.ts` version string):
1. Block storage `S = CORE+3`; `build()` copies columns `HALO-1 .. HALO+CORE+1`; store `cut = c>0 ? 1 - min(v/c,1) : 0` (Float32) instead of `r`.
2. `retainedAt` -> `cutAt`: 4x4 tensor Catmull-Rom on the quad grid (ignore the hashed diagonal), rows clamped to [0, ROWS], taps `col-1..col+2` from one block. Clamp to [0,1]. `carvingFM` returns `cut === 0 ? 0 : -envelopeM*cut`. Arithmetic within the audited set (+ - × / floor min max).
3. Point memo: a cell memo of 16 taps, same bit-identity rule as the block path; update the memory bound and the memo-bound test (the combined 8.5 MB limit stays).
4. `MOUNTAIN_CARVING_VERSION` -> `'mountain-carving-3'`; `TERRAIN_VERSION` -> next (e.g. `terrain-1.9.1-carving-c1`). `MOUNTAIN_ASSEMBLY_VERSION` unchanged unless the analytic-gradient fallback is taken.
5. Stage like T3: frozen `MOUNTAIN_CARVING.INTERPOLANT: 'catmull-rom'`, the old triangle path kept only as a test-side reference in `tests/helpers/` for the negative control.

What moves (ledger with old/new values in the evidence doc): `CARVING_F_DIGEST` and the 129-square pin; version asserts; memo tests; golden terrain/combined/placeQuery/census by version string; sampler identity digests where pinned; `SURVEY_VERSION` only if a survey value moves; version pins in `lod-consistency` and `version-compat`. Does not move: anything where belt = 0, SITE_A, `BASE_ELEVATION_SHA256`, seabed, `SHIPPED_CEILINGS`, ROOM/UP_ROOM, budgets, every M3/M4/M5 threshold.

Tests:
- HARD: exact +0 where no tap is cut; carving <= 0 and `U + C >= 0` on the ramp; C1 continuity straddle across lattice lines (triangle reference must fail it); block-seam identity 0/280 including the two extra stored columns; memo purity and point-memo bit-identity; digest re-pin.
- M3 eight rows on training pool 730201-08 and held-out 730301-08, separate columns, no re-tuning. M4 whole-core R1 (Raiva >= 8 reject condition). M5 real-M3 INFO margins re-reported.
- **Spectrum pin**: register `tests/terrain-structural-spectrum.test.mjs` (package.json + tiers.json smoke and work, two shards). Promote §3.2 to a HARD row at smoke tier, truth sampler, pooled over frozen massif tiles: max over {lattice-x, -y, -d, -d2} pooled peakDb <= **4.7 dB**, pre-registered by the midpoint rule (control max 1.6 dB, defect min 7.84 dB) before measuring the C1 field. Negative control: triangle reference on the same block data must exceed 4.7 dB. INFO: the row with rock off. Also pin the 250 m gully cell pooled peakDb < 4.7 dB.
- Outside-massif identity 0 mismatches on 4 × 15,120 directions; upper-envelope check; `lod-carving-reduction` and `lod-coarse-frame`.
- `tsc --noEmit`, `test:affected --base main`, `test:full` once at the gate.

Cost protocol: `scripts/cost-fair/` per addendum (6) Q-A, pre-registered, quiet machine, against main as it is then; budgets unchanged. Plus the M5 micro-bench (`ATLAS_M5_BENCH=1`) and `npm run test:perf`.

Acceptance: all HARD rows; M3 rows pass on both pools; Raiva R1 >= 8; spectrum pin <= 4.7 dB with the negative control firing; C1 <= 8 % and orbit <= 5 % medians on all four worlds; contract §6 <= +10 %; belt = 0 identity; evidence doc `docs/mountain-carving-c1-<date>.md` with the ledger and the GPU probe pair (advisory). Merge rides the next TERRAIN_VERSION bump unless the probe trigger fires.

## 3. For Kasper

The 200 m grid is real but tiny (at most 1.6 m, usually under 1 m) and is purely the carving field's linear interpolation showing in shading, not relief; cliffs are fine, but a perfectly regular axis-aligned grid of kinks is the generator fingerprint the new metric exists to catch, and rock detail only shaves about 2 dB off it.

The fix swaps the triangle interpolation for a C1 Catmull-Rom on the same solve (same vertex values, kinks gone, exact +0 kept), built now on a staged branch and landed with the next terrain bump so it shares the golden re-pin and the two-hour cost window, unless a short GPU probe over a Maithea massif at L11-L13 under low sun shows the grid, in which case it gets its own bump at once.

Cost risk is C1-only (the orbit bake never carves): roughly +0.2-0.5 points on Maithea's 5.77 % against 8 %, with a cheaper 9-tap fallback, and the spectrum row becomes a HARD pin at a pre-registered 4.7 dB with a negative control proving today's field fails it.
