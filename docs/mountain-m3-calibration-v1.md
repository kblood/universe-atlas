# M3 row calibration v1: pit row and coherence row (2026-10-05)

Element M3 (MTN-4, ridge/valley carving). This document records the owner-authorised change to two of
the eight rows in `docs/mountains-design-2026-10-04.md` section 2.3. The numbers come from
`node scripts/mountain-calibrate-m3.mjs --jobs 4` (exit 0). Evidence is written to
`test-results/mountains/M3-r5/calibration/calibration.json`, which is gitignored and reproducible.

## Owner decision (verbatim)

> (a) "the M3 coherence row and the M3 pit row may be CALIBRATED against an eroded positive control
> (coherence measured detrended/band-passed or otherwise corrected so a physically eroded range
> passes while isotropic noise and straight mirrored fans (the rejected A0) fail; pit row made
> resampling-tolerant because the planet sampler never lands on a construction grid). Document
> old/new rows with numbers, negative controls proving the new rows still have teeth. All other rows
> and all 17 LOD pins/goldens stay unchanged."

Nothing else changed:
- The six other rows are unchanged.
- `fill10ShareP50 <= 0.05` is unchanged.
- No LOD pin or golden changed.

## Old and new rows

| # | Old row (superseded) | New row |
|---|---|---|
| 7 | `pitsPer1000km2P50 <= 50`: every strict 8-neighbour land minimum on the 125 m raster, per-site median | `pits025Per1000km2P50 <= 50`. Same pits and same bound. A pit counts only if its closed depression covers at least 0.25 km², which is 16 cells. The depression is the 8-connected set of cells with priority-flood fill depth > 1e-9 m. |
| 8 | `coherence40kmWindowP50 >= 0.35`: unsigned structure-tensor coherence of the 2 km point-sampled raster, 40 km windows on cells above land p50 | `axisCoherence40kmP50` between **0.14 and 0.64**. Details below the table. |

How the new coherence row is measured:
- It is the axis-signed coherence S = (Jaa - Jcc)/(Jaa + Jcc), where a is the belt axis.
- It is computed on the regional 193² raster at 2 km. Each pixel is a 4x4 footprint mean of 500 m sub-samples.
- Each across-row has its along-axis mean subtracted.
- The windows and the window mask are the same as the old row.

The code is in `tests/helpers/mountain-metrics.mjs`:
- `depressionPits()` and `axisCoherence()` compute the new metrics.
- `MOUNTAIN_THRESHOLDS` holds the new rows.
- `MOUNTAIN_THRESHOLDS_SUPERSEDED` keeps the old rows on record.
- `measureSites` still reports both old metrics as INFO, and they are bit-identical to their old pins. The MTN-0 test checks this.

Why each definition:
- **Pits.** The planet sampler never lands on a construction grid. Bilinear resampling of a fully drained surface leaves 1-4 cell dams along every channel. Resampling the frozen eroded control, which has 0 pits on its own grid, gives 1287 pits per 1000 km². Real closed basins in noise relief are large. 0.25 km² is the channel-initiation area that `carvingStructure` already uses, so the area threshold was not tuned here. Thresholds of 9 cells or fewer fail the eroded control (56.6); 25 cells also separates the controls.
- **Coherence.** A physically eroded linear range is not crest-parallel at 2 km. Its transverse valleys produce gradients along the axis, while the envelope produces gradients across it. The unsigned coherence of the raw raster is dominated by the envelope's crest and margin kinks: an uncarved envelope scores 1.0. Steady-state stream-power ramps score 0.085-0.114, which fails the old row.
  - The axis sign separates "valleys across the belt" (S > 0) from isotropic relief (S ~ 0) and from a strike-parallel or envelope-only field (S < 0; envelope-only scores -0.915).
  - Removing the along-axis mean of each across-row takes out any profile that depends on the across coordinate only.
  - The footprint mean removes 2 km point aliasing.
  - The row is two-sided because the rejected first candidate (A0, straight mirrored fans) and the parallel comb B0 score high. The owner decision requires them to fail.

## Controls (8 ramp sites, R = 5194907 m; pit row is the per-site median, coherence is p50 of pooled windows)

Positive controls are physically eroded:
- `steadyStateStrip`: detachment-limited stream power at steady state (n = 1, m = 0.5). It runs on the section 2.3 ramp: a periodic 384 km strip, base level at |across| >= 30 km, rescaled to a 3 km crest.
- The frozen MTN-4 eroded alpine control, bilinearly resampled at 4 sub-cell offsets on 4 sites.
- "off" means the chart is shifted by (37 m, 53 m), so the samples miss the construction grid.

Negative controls:
- The isotropic alpine and dome controls.
- Noise carving on the ramp: envelope·(1 - 0.6·normalised alpine).
- A0 and B0, from the frozen source `tests/fixtures/mountain-carving-a0-rejected.ts.txt`.
- The resampled un-eroded control.

| Field | Class | pits ≥0.25 km² (new) | all pits (old) | axis coherence (new) | coherence (old) | fill > 10 m |
|---|---|---|---|---|---|---|
| ss-uniform-s1 | P | 32.4 | 1271.1 | 0.433 | 0.104 | 0.057 |
| ss-uniform-s2 | P | 31.5 | 1274.2 | 0.464 | 0.114 | 0.059 |
| ss-uniform-s3 | P | 32.0 | 1273.7 | 0.416 | 0.092 | 0.057 |
| ss-uniform-s4 | P | 34.5 | 1296.6 | 0.453 | 0.085 | 0.059 |
| ss-uniform-s1-off | P | 38.4 | 806.1 | 0.438 | 0.105 | 0.035 |
| ss-uniform-sc0.9-s1 | P | 13.8 | 1156.7 | 0.440 | 0.110 | 0.044 |
| ss-uniform-125m-s1-off | P | 0 | 1290.1 | 0.408 | 0.086 | 0.023 |
| ss-envelope-s1 | P | 31.1 | 1334.2 | 0.271 | 0.386 | 0.058 |
| ss-envelope-s2 | P | 32.8 | 1355.3 | 0.298 | 0.378 | 0.058 |
| ss-envelope-s3 | P | 29.8 | 1380.8 | 0.255 | 0.414 | 0.058 |
| ss-envelope-s1-off | P | 32.0 | 869.2 | 0.279 | 0.408 | 0.032 |
| ss-envelope-sc0.9-s1 | P | 25.0 | 1252.2 | 0.282 | 0.381 | 0.051 |
| eroded control, resampled (16 rasters) | P | **22.5** | 1286.7 | (not a ramp) | | 0.010 |
| alpine | N iso | **1023.7** | 2061.3 | **0.014** | 0.139 | 0.327 |
| dome | N iso (coherence only) | 5.2 | 12.5 | **0.032** | 0.400 | 0.029 |
| noise carving | N iso | **369.6** | 1993.9 | **0.022** | 0.605 | 0.051 |
| A0 (straight mirrored fans) | N straight | 0 | 0 | **0.823** | 0.637 | 0 |
| B0 (parallel comb) | N straight | 23.3 | 51.8 | **0.968** | 0.884 | 0.020 |
| un-eroded control, resampled | N pit | **829** | 1622.6 | (not a ramp) | | 0.302 |

Rule (pre-registered; `deriveRule` in the script checks it against the frozen rows and exits non-zero on disagreement):
- **Coherence lo** = midpoint(min positive 0.255, max isotropic negative 0.032) = 0.1435, which gives **0.14**.
- **Coherence hi** = midpoint(max positive 0.464, min straight negative 0.823) = 0.6435, which gives **0.64**.
- Every positive is inside [0.14, 0.64]. Every negative is outside.
- **Pits:** the bound stays 50. Every positive is at or below 38.4. Every noise-relief negative is at or above 369.6.
- The dome is smooth and legitimately drains, so it is not a pit negative. MTN-0 requires it to pass the drainage rows; on the subset pin it scores 0.

Teeth (negative controls that still fail the new rows, in tests):
- **MTN-0** (`tests/mountain-metrics.test.mjs`):
  - The alpine subset fails both new rows: pits 757.6, axis coherence 0.011.
  - A synthetic parallel comb fails high, with S > 0.9.
  - The same comb with the stated axis rotated by 90 degrees gives S < -0.8.
  - A one-cell pit is gated at 125 m but counted at 1 km.
- **M3** (`tests/mountain-carving.test.mjs`): on the small drainage fixture, the eroded control passes the pit row at 0 and the un-eroded control fails it at 757.6.

Honesty notes:
- The coordinator saw the candidate values (C 0.406, A2 0.225, B 0.663) during exploration, before the rule was written down. The bounds come only from the controls by the midpoint rule. The script measures the candidates as INFO and keeps them out of the rule.
- Other definitions were explored and rejected:
  - Band-pass variants were contaminated by the envelope kink.
  - Unsigned detrended coherence gave the dome 0.399.
  - A 2x2 footprint read 0.37-0.40 for the positives.
- Fill row (unchanged, INFO only): resampled steady-state positives sit at 0.023-0.059, and six of them exceed 0.05. The row was not touched. Candidates must pass it as before.

Reference worlds under the new rows (`scripts/mountain-metrics.mjs`, 8 highest sites per world):

| Worlds | Pit row (new) | Pit row (old) |
|---|---|---|
| main (Maithea, Selawyn, Raiva, Lethuris) | 221.5, 299.7, 79.0, 201.6 (all fail) | 378.2, 452.9, 147.2, 319.1 |
| d3 (`r2-relief-present`) | 363.1-399.0 (all fail) | 570-700 |

Axis coherence on world sites is measured along the raster x. That axis is not the belt axis, so the value is INFO only (main -0.04 to 0.058, d3 -0.009 to 0.034).

**MTN-6 assembly:** a real belt must pass its axis from M1 as `site.axis`. The along-axis detrend then removes the M2 envelope's across profile.

## Cost

- The new coherence row samples 193² x 16 ≈ 596k extra points per site.
- `opts.axisSub` reduces the footprint. The HARD subset pins use 2x2, and the row uses 4x4.
- `opts.axisCoherence: false` skips the row, which then fails closed.
