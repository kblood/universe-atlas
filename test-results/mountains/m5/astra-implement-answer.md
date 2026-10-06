Created the staged candidate, but **M5 is not acceptance-ready**. R1 fails, the white-spectrum negative control lacks teeth, and the test exceeds 2 seconds. No existing tracked files changed; no wiring or git writes occurred. Constants were not retuned after held-out evaluation.

Full results, constants, commands and limitations are saved in [report.md](C:/LLM/IWSDK/universe-atlas-wt/m5-rock/test-results/mountains/m5/report.md), with machine-readable [rows.json](C:/LLM/IWSDK/universe-atlas-wt/m5-rock/test-results/mountains/m5/rows.json).

Created:

- [mountain-rock-detail.ts](C:/LLM/IWSDK/universe-atlas-wt/m5-rock/src/mountain-rock-detail.ts)
- [mountain-rock-detail.test.mjs](C:/LLM/IWSDK/universe-atlas-wt/m5-rock/tests/mountain-rock-detail.test.mjs)
- Evidence scripts: `integration-m3.mjs`, `cost-bench.mjs`, `render.mjs`, fixture/digest/report helpers and patch generator.
- [m5-wiring.patch](C:/LLM/IWSDK/universe-atlas-wt/m5-rock/test-results/mountains/m5/m5-wiring.patch), unapplied.
- Three PNGs and the test log.

**Final constants**

| Constant | Value | Reason |
|---|---:|---|
| `SLOPE_ZERO_TAN` | 0.17632698070846498 | Required gentle-ground exclusion |
| `SLOPE_FULL_TAN` | 0.5773502691896257 | Required full-weight threshold |
| `SLOPE_STEP_M` | 125 | Fixed metric slope estimate |
| `MAX_DEPTH_M` | 120 | Tuning candidate preserving drainage |
| `CAP_FRACTION` | 0.5 | Height safety bound |
| `CELL_M` | 250 | Reduces long-wave rib energy |
| `OCTAVES` | 4 | Multiple rock scales |
| `GAIN` | 0.5 | Decreasing fine-scale amplitude |
| `STRATA_PERIOD_M` | 160 | Monotonicity budget |
| `STRATA_WEIGHT` | 0.2 | Maximum strata amplitude 24 m |
| `RIB_WEIGHT` | 0.8 | Complements strata weight |
| `JITTER_M` | 30 | Wandering ledges |
| `JITTER_CELL_M` | 500 | Smooth phase variation |
| `SEED_SALT` | `0x68bc21eb` | Seed decorrelation |

Declared bands: 1000/500/250/125 m; reduction inputs 1000 m and 32 segments; maximum edge 8000 m.

**HARD results**

All seven implemented HARD tests passed.

| Check | Result |
|---|---|
| Exclusions | 810 literal +0 cases |
| Bounds | 131,072 samples per pool; zero violations |
| Non-vacuity | Negative on 100% of steep samples in both pools |
| Weight | 10,001 monotonicity points; boundary checks passed |
| Determinism | Forward/reverse/child digest identical |
| Audit | All 20 forbidden-operation controls rejected |
| Frozen constants/bands | Passed |
| Continuity | 24,000 pairs per pool; maximum difference 0.039007 / 0.051301 m against 0.364729 m bound |
| Shared edge vertices | Zero mismatches in both pools |
| Edge interpolation error | 76.374 / 74.578 m against conservative 4750.294 m bound |

Digest: `9a1217a0b96a966cbf30b82ae5268fce32e9c93bdde95571225fa61f089bae71`.

Additional continuity coverage included 1,248 height-wrap crossings and 432 slope-threshold crossings.

**ROW results** — tuning / held-out:

| Measurement | Tuning | Held-out | Result |
|---|---:|---:|---|
| Base flat share | 17.8135% | 17.8139% | Pass |
| Base steep share | 52.0126% | 52.0065% | Pass |
| Base fill / qualifying pits | 0 / 0 | 0 / 0 | Pass |
| R1 steep RMS, m | 21.0369 | 20.9639 | Measured |
| R1 flat RMS, m | 15.4859 | 15.3911 | Measured |
| R1 ratio | **1.35846** | **1.36208** | **Fail ≥2** |
| R2 p50 with / without | 29.9231 / 30.0011 | 29.8962 / 29.9765 | Pass |
| R2 p90 with / without | 43.8718 / 42.8492 | 43.8827 / 42.8541 | Pass |
| R3 beta with / without | 2.05264 / 3.60438 | 2.01756 / 3.58806 | Candidate passes |
| R4 long-wave variance share | 0.179610 | 0.188362 | Pass |
| R5 fill10 share | 0.023190 | 0.022570 | Pass |
| R5 qualifying pits/1000 km² | 0 | 0 | Pass |
| All pits/1000 km² | 1045.882 | 1030.203 | INFO |

**Negative controls**

| Control | Tuning / held-out | Required failure demonstrated? |
|---|---|---|
| No rock R1 ratio | 0.86846 / 0.87160 | Yes |
| Forced weight R1 ratio | 0.92256 / 0.92807 | Yes |
| Depth ×4 R2 p90 | 55.6961 / 55.6686° | Yes |
| No rock R3 beta | 3.60438 / 3.58806 | Yes |
| Equal-gain R3 beta | **2.16007 / 2.14062** | **No** |
| Extra 4 km octave R4 | 0.600994 / 0.588826 | Yes |
| Reversed strata fill / qualifying pits | 0.007713 / 0; 0.007651 / 0 | No; guard lacks demonstrated teeth |
| Speckle maximum jump | 94.3725 / 92.3721 m | Yes |
| Level-dependent slope | 20 shared-point differences | Yes |

**Commands run**

| Command | Exit |
|---|---:|
| `node --test tests/mountain-rock-detail.test.mjs` | **1** |
| `npx --no-install tsc --noEmit` | 0 |
| `python test-results/mountains/m5/build-wiring-patch.py` | 0 |
| `node test-results/mountains/m5/render.mjs` | 0 |
| `node --check test-results/mountains/m5/integration-m3.mjs` | 0 |
| `node --check test-results/mountains/m5/cost-bench.mjs` | 0 |
| `node test-results/mountains/m5/report.mjs` | 0 |
| `git apply --check C:/LLM/IWSDK/universe-atlas-wt/m5-rock/test-results/mountains/m5/m5-wiring.patch` — scratch main files | 0 |

Final test: **21 passed, 4 failed, 1 skipped; 20.834 seconds**.

Not run: expensive M3 integration, real-cost benchmark, opt-in synthetic COST benchmark, patched-source type-checking, whole `npm test`, `test:full`, browser or GPU work.

Remaining limitations: background RMS measured only **1.137/1.155 m**, below “about 2 m”; the smallest rib cell introduces sub-125 m energy; the interpolation bound is weak. Evidence files are under the repository’s ignored `test-results` directory and need explicit inclusion by the coordinator.