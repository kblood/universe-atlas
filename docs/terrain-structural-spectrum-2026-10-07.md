# Structural metric 2: 2-D spectrum, lattice peaks, per-octave anisotropy (2026-10-07)

Branch `tests/structural-spectrum` (from main 41afb47). Design: `docs/terrain-structural-metrics-2026-10-07.md`
section 1.2 (recommendation 2), section 2 (failure-mode matrix) and section 4 (tiers). No `src/` change, no terrain
value changed, no pin, no registration file touched.

## 1. What was added

| File | What |
|---|---|
| `tests/helpers/terrain-spectrum.mjs` | Pure, deterministic test-side helper. Complex radix-2 2-D FFT; `powerSpectrum2D` (plane detrend, periodic 2-D Hann, P in m^2 summing to the detrended variance); ring-median whitening; `latticeTargets` (a rhythm's wavevector and harmonics in raster coordinates); `latticeStats` / `latticePeaks` (peakDb, lineDb, per-family combDb, toneRmsM); `poolWhitened` (mean of whitened spectra of tiles in the same orientation); `octaveAnisotropy` (coherence, strongest-30-degree-sector ratio, angle per octave); `radialBeta` (INFO); `alignedRaster` (gnomonic raster with x along a given world axis, e.g. the M1 belt axis); synthetic fields and injected defects (`fractalField`, `addRhythm`, `addGutters`, `addBlockScaling`, `addStripes`). Uses Math.cos/sin/log/atan2 (test statistics only); results are tolerance-compared, never digest-compared; the runtime hash is not reused. |
| `tests/terrain-structural-spectrum.test.mjs` | 6 HARD/INFO unit tests on synthetic fields (part 1) and 3 INFO real-terrain tests on the frozen tier-set tiles (part 2). Tier-aware through `tests/helpers/tier.mjs`: smoke = 4 synthetic seeds, tiles of kinds axis/flank/belt-end/outside, 1 alpine chart; default/gate = 8 seeds, + face-edge and coast tiles, 2 alpine charts. Thresholds and titles never change with the tier. Prints one `SPECTRUM_ROWS {json}` line with every number. |

### Statistics (definitions)

Rasters: coarse **512 x 200 m (102.4 km)** for block rhythm; fine **256 x 50 m (12.8 km)** for lattice and stripe
scales. Real rasters are centred on the tier-set direction with x along the M1 belt axis (`orogenLayout(body).sample(d).axis`; the frame of `mountain-metrics.mjs` off-belt).

- **W** = P / median of P over the integer ring round(|k|) (target neighbourhoods excluded): removes the radial slope.
- **peakDb** = 10 log10( mean W over the 3x3 bins at a target / mean W over the 11x11 box around it ), the 3x3 of
  every target and its mirror and |k| < 2 bins excluded. Box-local in |k| and angle, so a ridge of power along the
  axis (transverse valleys) is not a peak. A clean field scatters around 0 dB.
- **lineDb** (axis-aligned targets) = 10 log10( mean W along the target's column / mean W on the columns +-2, +-3 ):
  seams whose step varies along the seam.
- **combDb** per family = 10 log10( mean linear peak ratio over the in-range harmonics ): seam/gutter combs have many
  harmonics, a natural bump one.
- **toneRmsM** = RMS height of the 3x3 excess over the box mean (an amplitude in metres; one tile only).
- **coherence** per octave [lo, 2 lo) = |sum P e^{2i theta}| / sum P (band-passed structure-tensor coherence), bins
  with |k| <= n/2 only; **sectorRatio** = strongest 30-degree sector / mean sector; **gradientAngleDeg** from raster x.

Targets: M3 block **BLOCK_M = CORE x 2w/ROWS = 128 x 2 x 48 000 / 480 = 25 600 m** (with the fixed carving
half-width `MOUNTAIN_ASSEMBLY.CARVING_HALF_WIDTH_M` = 48 km; the design doc's "16 km" is the w = 30 km value of
`mountain-carving.ts`'s comment), harmonics 1-16 (25.6 km .. 1.6 km); the doc's **nominal 16 km**, harmonics 1-8 (kept
for transparency); the **M3 lattice 200 m** along x, along y and both diagonals (141 m at +-45 deg; triangulated
cells); the **M5 gully cell 250 m** along x and y, harmonics 1-2.

## 2. Tier 0: injected-defect calibration (synthetic)

Controls: isotropic Gaussian fractal by spectral synthesis (P2 ~ |k|^-3.2, transect beta about 2.2, rms 800 m, range
about 5 km). Defects added at the coarse config with a 16 km rhythm along x (bin 6.4, fractional on purpose):
sinusoid (amplitude a percent of the field's range), trunk-gutter comb (Gaussian trench, sigma 250 m, depth a percent
of range, the rejected C/D/E look), per-block relief scaling by (1 +- f) (seams whose step varies along the seam).
Calibration seeds 1-16, 16 harmonics:

| Case | per-tile maxPeakDb (min..max) | per-tile combDb (min..max) | pooled 16 tiles maxPeakDb / combDb |
|---|---|---|---|
| clean control | 1.92 .. 6.09 | -0.86 .. 1.33 | 1.28 / 0.21 |
| sinusoid 1% | min 1.92 | min -0.62 | 2.61 / 0.33 |
| sinusoid 2% | min 2.92 | min -0.21 | 4.70 / 0.60 |
| sinusoid 5% | min 5.62 | min 0.90 | 10.05 / 2.03 |
| sinusoid 10% | min **11.45** | min 2.80 | 15.27 / 4.86 |
| gutter 1% | min 3.85 | min 0.89 | 3.99 / 2.27 |
| gutter 2% | min 7.78 | min **4.19** | 7.76 / 5.63 |
| gutter 5% | min 13.99 | min 10.69 | 14.76 / 12.39 |
| block scaling 1-10% | 1.78 .. 2.21 (min) | min -0.63 .. -0.25 | <= 2.58 / <= 1.06 |

Thresholds by the repo's midpoint rule (control maximum to defect minimum):
**PEAK_DB = 8.75** (6.09 to 11.45), **COMB_DB = 2.75** (1.33 to 4.19). Fine stripes (256 x 50 m, 250 m wavelength at
30 deg, amplitude = the clean 200-400 m band RMS): clean coherence in octaves with >= 1000 bins max 0.150 (fractal
seeds 1-16) and 0.190 (alpine, 4 charts); striped 200-400 m band min 0.285 -> **FINE_COHERENCE = 0.24**.

Out-of-sample check (the HARD tests run fresh seeds 101-108, 101-104 at smoke):

| Seeds | clean maxPeakDb | clean combDb | 10% sinusoid peakDb (at h1) | 2% gutter combDb | stripes coherence (clean fine max) |
|---|---|---|---|---|---|
| 101-104 (smoke) | 1.61 .. 4.46 | -0.54 .. 0.53 | 12.16 .. 19.21 | 4.43 .. 7.80 | 0.31 .. 0.32 (0.04 .. 0.08) |
| 101-108 (default) | 1.61 .. 4.97 | -0.54 .. 1.00 | 12.16 .. 19.21 | 4.43 .. 7.80 | 0.30 .. 0.34 (0.02 .. 0.08) |

So on synthetic fields the separation is clean for a 10% sinusoid, a 2% gutter comb and band-RMS stripes, and the
detectors stay quiet on every clean control. Honest limits:

- **The design doc's seeded negative ("a 1% amplitude 16 km periodic modulation must exceed the threshold") is not
  achievable per tile.** At 16 km the fractal background holds about as much power per bin as a 1%-of-relief
  sinusoid; 1% fires 0/16 per tile. Pooling the whitened spectra of tiles in the same orientation is the lever (pooled
  2.61 dB vs pooled control 1.28 dB: detectable with a pooled threshold, not with the per-tile one).
- **A 64 km window is worse than 102.4 km**: at 512 x 125 m (16 km at an exact bin 4) the clean max is 6.72 dB and the
  10% sinusoid minimum only 6.71 dB (overlap); the gutter comb needs 5% there. Hence the 102.4 km coarse raster.
- **Per-block relief scaling (seams) is invisible** up to +-10% (comb <= 1.06 dB pooled). That failure belongs to the
  seam probe (design section 1.3), not to the spectrum.
- **The alpine ridged-noise control is NOT a clean lattice control**: its gradient noise sits on 64 km / 2^o lattices,
  and the detector finds them (chart [1,0,0]: maxPeakDb 13.47 at 2 km = harmonic 8 of 16 km, comb 4.63 dB; earlier
  4-chart scan 10.8-18.9 dB at 2 km / 1 km). A natural positive; the spectral-synthesis fractal is the clean control.

## 3. Real terrain, smoke set (MEASURE-ONLY)

24 frozen tiles from `tests/tier-sets.json` smoke (`tier-sets-1`), 4 water worlds x (axis x2, flank, belt-end x2,
outside), deduplicated by direction; 20 are massif tiles (M1 belt > 0). Truth sampler (`mountainSampler(body)`,
terrain-1.9.0-mountains, carving and rock on).

### 3.1 Coarse 512 x 200 m: is there an M3 block lattice peak? **No.**

| World | kind | block maxPeakDb (harmonic) | block combDb | nominal 16 km maxPeakDb / combDb | maxLineDb | beta1D |
|---|---|---|---|---|---|---|
| Maithea | axis | 4.24 (h4) | 0.43 | 3.90 / 0.39 | 1.32 | 2.42 |
| Maithea | axis | 3.85 (h6) | -0.60 | 3.72 / 0.47 | 1.07 | 2.50 |
| Maithea | flank | 2.94 (h4) | 0.34 | 1.82 / -0.92 | 1.64 | 2.49 |
| Maithea | belt-end | 0.83 (h11) | -1.19 | 0.97 / -1.51 | 1.44 | 2.51 |
| Maithea | belt-end | 2.94 (h12) | -0.85 | -0.19 / -2.36 | 2.05 | 2.67 |
| Selawyn | axis | 3.04 (h8) | -0.81 | 3.04 / -0.32 | 0.95 | 2.32 |
| Selawyn | axis | 2.80 (h16) | -0.63 | 2.37 / -0.24 | 1.01 | 2.35 |
| Selawyn | flank | 6.63 (h1) | -0.12 | 7.16 / 1.34 | 1.25 | 2.31 |
| Selawyn | belt-end | 4.04 (h9) | -0.13 | 3.64 / -0.14 | 0.90 | 2.40 |
| Selawyn | belt-end | 2.51 (h10) | 0.35 | 4.47 / 1.32 | 1.59 | 2.24 |
| Raiva | axis | 5.72 (h2) | 1.02 | 3.45 / 1.52 | 0.52 | 2.42 |
| Raiva | axis | 6.64 (h2) | 1.41 | 5.75 / 2.43 | 1.59 | 2.37 |
| Raiva | flank | 5.69 (h8) | 0.05 | 5.69 / 1.23 | 1.32 | 2.53 |
| Raiva | belt-end | 2.03 (h10) | -0.80 | 0.56 / -0.82 | 1.64 | 2.65 |
| Raiva | belt-end | 5.72 (h13) | 1.22 | 6.45 / 1.62 | 0.71 | 2.45 |
| Lethuris | axis | 4.27 (h15) | 0.34 | 2.63 / 0.44 | 0.76 | 2.38 |
| Lethuris | axis | 2.41 (h12) | -0.62 | 1.94 / -1.25 | 1.01 | 2.40 |
| Lethuris | flank | 3.93 (h6) | -0.01 | 6.19 / 0.85 | 1.02 | 2.36 |
| Lethuris | belt-end | 4.01 (h10) | 0.79 | 3.38 / 1.32 | 1.09 | 2.40 |
| Lethuris | belt-end | 5.94 (h12) | 0.84 | 2.63 / 0.12 | 1.32 | 3.04 |
| *off-belt* Maithea | outside | 8.65 (h11) | 1.86 | 8.76 / 2.38 | 1.70 | 3.30 |
| *off-belt* Selawyn | outside | 6.81 (h4) | 2.15 | 6.21 / 2.18 | 0.67 | 3.52 |
| *off-belt* Raiva | outside | 7.61 (h1) | **3.26** | 4.34 / 1.24 | 1.02 | 3.63 |
| *off-belt* Lethuris | outside | 6.31 (h4) | 0.75 | 2.29 / -0.23 | 1.13 | 3.64 |

**Pooled over the 20 massif tiles: block combDb 0.08 dB, largest block harmonic 1.19 dB (h2), nominal 16 km combDb
0.35 dB.** Every massif tile is below both synthetic thresholds (largest per-tile block peak 6.64 dB < 8.75, comb
1.41 dB < 2.75) and inside the synthetic clean-control range. The T6 mountains show **no lattice peak at the M3 block
length (25.6 km) or at 16 km**, per tile or pooled, consistent with the seam-free haloed solve
(`mountain-carving.ts`: 0 of 280 seams differ at HALO 192).

**Default tier (36 tiles: + face-edge x2 and coast per world; 28 massif):** massif per-tile block maxPeakDb 0.83-6.64,
combDb -1.41..1.63, none over a synthetic threshold; **pooled over 28 massif tiles block combDb 0.06 dB, largest
harmonic 0.95 dB**, nominal 16 km comb 0.35 dB. Off-belt (8): maxPeakDb 6.31-9.12, combDb 0.75-3.26; two exceed a
synthetic threshold (Raiva outside comb 3.26; Maithea coast maxPeak 9.12, its nominal-16 km family 12.22 dB / comb
5.12 dB; Selawyn coast nominal 16 km 11.93 / 4.41). A coastline is a step edge and lights up any comb, which is a
further reason the real-terrain statistic stays INFO.

**Detector power on the real background** (same rasters, defect added at 25.6 km): a 10% sinusoid fires 16/20 massif
tiles at smoke (peakDb 6.35-23.92; 23/28 at default), a 2% gutter comb only **2/20** (combDb -0.76..4.70; 4/28 at
default). Real massif terrain carries much more
power at 1.6-25.6 km relative to its range than the synthetic control, so a per-tile verdict would only catch a gross
block rhythm. And an off-belt tile (Raiva outside, no carving there) already reaches comb 3.26 dB > 2.75. **The
injected-defect separation is therefore not unambiguous on real terrain: no pin, the real-terrain tests stay INFO.**

### 3.2 Fine 256 x 50 m: the 200 m M3 lattice **is** visible (small)

| | lattice x / y / d / d2 peakDb | toneRmsM range | gully 250 m x / y |
|---|---|---|---|
| massif tiles (20), per tile | 0.56 .. 12.09 (median about 8) | 0.01 .. 1.61 m | -1.86 .. 5.86 / -4.16 .. 5.41 |
| **pooled massif** (smoke 20 / default 28) | **7.84 / 8.20 / 8.83 / 8.88** ; 7.84 / 8.01 / 8.87 / 8.63 | - | 1.22 / 0.47 ; 1.04 / 0.69 |
| pooled off-belt (4) | -1.12 / -3.13 / -0.66 / 1.58 | 0 | -0.61 / -1.98 |

Attribution (scratch run on Maithea and Selawyn axis/flank tiles, same raster): truth 2.8-11.3 dB; carving on and
rock off (`lodLevel` = carving level, below the rock level) 4.7-13.2 dB; uncarved composition (`lodLevel` = cut - 1)
-6.3..3.4 dB with tone 0.00-0.03 m. So the peak is the **triangle-interpolated 200 m lattice of M3 candidate F** (a
piecewise-linear surface has gradient kinks on every lattice line); M5 rock detail partly masks it. Amplitude is
sub-metre (tone RMS 0.01-1.6 m against tile RMS 9-320 m), so it is a facet imprint (slope discontinuities, i.e.
shading), not visible relief. The 250 m gully cell shows no pooled peak (1.2 / 0.5 dB; the cell jitter of 0.15
smears it). INFO only; whether a 200 m facet lattice matters is a visual/owner question, not a pin.

### 3.3 Anisotropy per octave (INFO)

Massif tiles, fine octaves 100-1600 m: coherence 0.05-0.71 (most 0.15-0.45); coarse octaves 400 m-25.6 km:
0.02-0.75. That is above the synthetic stripe threshold 0.24 on many tiles, but real mountains are legitimately
anisotropic (transverse valleys, flanks), so without the design's gradient-alignment discriminator (section 1.2 item
4: stripes at a fixed absolute angle vs valleys that follow the coarse gradient) no verdict is possible. Notable:
**Lethuris "outside" (off-belt, low relief, range 198-341 m) has coherence 0.66-0.89 in every fine octave at a fixed
gradient angle of 77-79 deg** (sector ratio 4.0-5.2, band RMS 0.1-7.6 m): a strongly directional fine texture in the
main (non-mountain) terrain. Not investigated further here; a candidate for the gradient-alignment check.

Radial beta (INFO, 2-D slope minus 1, 0.5-8 km): massif 2.24-3.04 (mostly 2.3-2.7), off-belt 3.30-3.64, in line with
the E7 transect rows (main 3.36-3.49).

## 4. Failure-mode matrix, metric 2 as built

| Failure mode | Statistic | Synthetic teeth | Real terrain today |
|---|---|---|---|
| Carving blocks (rhythm) | block peakDb / combDb, pooled | 10% sinusoid and 2% gutter comb per tile; 1-2% sinusoid pooled only | no peak (pooled comb 0.08 dB); per-tile power limited (gutter 2% fires 2/20) |
| Kernel / cell lattice | lattice-x/y/d peakDb, toneRmsM | exact-bin tone recovery (HARD) | **200 m M3 lattice present, pooled 7.8-8.9 dB, tone <= 1.6 m** |
| Fine stripes | octave coherence, sectorRatio, angle | band-RMS stripes fire 200-400 m only | not judgeable without gradient alignment; Lethuris off-belt flagged |
| Seams (per-block scaling) | lineDb, comb | **blind up to +-10%** | use the seam probe (design 1.3) |
| Over-steep / over-noisy spectrum | radialBeta (INFO) | controls 2.15-2.23 | massif 2.24-3.04 |

## 5. Cost and runs

Spectrum + whitening + anisotropy: about 70-100 ms per 512^2 raster, 20-30 ms per 256^2. Sampling dominates: about
1.0-1.7 s per massif tile at 512 x 200 m (fresh M3 block solves), 0.2 s off-belt. Measured runs (another agent's
`test:full` was running concurrently, so walls are loaded):

| Run | Result | Wall |
|---|---|---|
| `ATLAS_TEST_TIER=smoke node --test tests/terrain-structural-spectrum.test.mjs` | 10 pass (24 tiles) | 76 s (real-tile test 65 s; 29 s unloaded in a scratch run) |
| `node --test tests/terrain-structural-spectrum.test.mjs` (default) | 10 pass (36 tiles) | 131 s (real-tile test 106 s) |
| `npx tsc --noEmit` | exit 0 | - |

## 6. Needs (merger-owned files, not edited here)

- needs: `package.json` `test` script registration of `tests/terrain-structural-spectrum.test.mjs`, reason: new
  structural-metric test (tiers.json requires npm-test membership).
- needs: `tests/tiers.json` smoke and work lists, with two shards: `^INFO: real` (the three real-terrain tests share
  the in-process tile rasters, keep them in one step) and `#rest` (synthetic, about 5-10 s), reason: the real-tile step
  is about 30-65 s and should run in parallel with the rest.
- needs: nothing in `tests/tier-sets.json` (the existing smoke set is used as is), golden or `known-failures.json`.

## 7. Next

1. Gradient-alignment discriminator (design 1.2 item 4) before any anisotropy verdict on real mountains.
2. A real eroded positive control and real negatives (comb, alpine-with-lattice, injected blocks) at the coarse
   config, then a pooled-threshold calibration on a fresh seed pool (design: 740001-08) in a `*-calibration-v1.md`;
   only then a CONTRACT on the pooled block comb.
3. Owner question: is the 200 m M3 facet lattice (tone <= 1.6 m, mostly < 0.8 m) acceptable, or should M3's
   interpolation be smoother (that would change terrain output, out of scope here)?
4. Look at the Lethuris off-belt directional texture (77-79 deg, all fine octaves).
