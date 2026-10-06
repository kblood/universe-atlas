# Structural terrain-realism metrics from a height field (lane L7, 2026-10-07)

Status: research only, nothing run, nothing downloaded, repo untouched apart from this file.
Context read: lane L7 of `parallel-development-plan-2026-10-07.md`, `handoff-2026-10-06/terrain-methods-survey.md`, `mountains-design-2026-10-04.md` section 2.4 (the existing M3 table: slope p50, flank angle, relief8, beta 0.5-8 km, fill > 10 m, pits025, axis coherence).

Evidence labels: **[S]** = number seen in a source fetched or returned by search this session (URLs in section 9); **[M]** = from memory of the literature, not re-verified, treat as a prior to confirm before it enters a gate; **[E]** = my own estimate (cost, thresholds), unmeasured.

## 0. Purpose and the idea

Luna fails every render including the controls, so a render verdict carries no information. The replacement is a short list of statistics computed from the height raster in Node, each checked against (a) the repo's own positive and negative controls (eroded stream-power control, alpine ridged-noise control, un-eroded, dome, comb) and (b) a loose plausibility band from published Earth values. Earth numbers are sanity bands, not targets: an Atlas planet need not be Earth, but a range whose drainage exponent is 0.3 or whose spectrum has a spike at 16 km is wrong on any planet. Controls set thresholds (the repo's pre-registered midpoint rule); Earth only vets that the controls are not absurd.

Two observations that shape the ranking:

1. The repo already covers marginal statistics (slope, relief, beta, fill, pit count, one orientation coherence). It has no metric for **joint or positional structure**: where energy sits in 2-D wavenumber space (rhythm), how flow accumulates along the network (drainage scaling), and which local landform alphabet the surface is made of. The open failure modes (block rhythm, gully/comb look, straight divide, seams, envelope caps) are structure failures.
2. F is a steady-state stream-power solve with m = 3/8, n = 1, so channels it solves have concavity theta = m/n = 0.375 by construction. A slope-area test on raw M3 is partly tautological; its value is on the **composited** field (M3 + M4 peaks + M5 detail + sector blend), where anything added on top, or any block seam, shows up as a departure. State this in the test header so a pass is not read as independent evidence on M3 alone.

## 1. Metric catalogue

### 1.1 Slope-area relation, concavity, Hack's law (drainage-area scaling)

**Definition.** Fill/route the grid (the priority-flood from F is reusable), D8 directions, upstream area A per cell.
- Flint / slope-area: S = k_s A^(-theta). Fit log S against log A on **area-binned medians** (about 10 bins per decade) between a channel-head area and a window-limited upper bound. Slope-area plots show a hillslope/channel transition at the channel head scale (Montgomery and Foufoula-Georgiou 1993 [S, abstract-level]).
- Hack: for nested basins along trunk streams, main-stem length L = c A^h.
- Horton: bifurcation ratio Rb and length ratio RL from Strahler ordering of the network (A above a threshold).

**Earth reference values.**
- Hack h: "slightly less than 0.6 in most basins", range 0.5-0.7 [S, Wikipedia Hack's law]; accepted range 0.57-0.6 (Maritan et al. 1996, quoted in search result) [S]; slightly lower above about 20,700 km2 [S]. Rigon et al. 1996, WRR 32(11):3367 ties h to basin elongation and fractal structure [S, abstract]. A 48 km window holds basins up to about 2,300 km2, so the large-basin drift does not apply.
- Concavity theta: reference concavity 0.45 with typical +-0.2 spread is the Kirby and Whipple convention [M]; one result gave a median most-likely concavity of about 0.425 across mountain/upland sites [S, secondary]. Plausibility band to use: **0.3-0.6**.
- Horton Rb about 3-5, RL about 1.5-3.5 for natural basins [S, tutorial-level; classic values, indicative].
- k_s rises monotonically with erosion rate at equilibrium (Kirby and Whipple 2012) [S, abstract]: a free check on a two-belt scene (higher uplift belt, higher k_s).

**Cost** on a 384 x 384 tile (48 km at 125 m, 147k cells) [E]: flood-fill + D8 about 20-60 ms in JS, accumulation about 10 ms, binning/regression under 5 ms, Strahler ordering 10-20 ms. About 50-100 ms per tile, most of it the flood fill the repo already runs for fill/pits; incremental cost about 20-40 ms if routed state is shared.

**What it catches.**
- *Gully/comb look.* Parallel gullies that do not converge have S nearly independent of A (theta near 0) and few junctions: low h, Rb far above 5 or no orders above 2-3. Real nets: theta 0.3-0.6, h 0.55-0.6.
- *Carving blocks, seams.* **Block-line statistic**: fraction of D8 edges running parallel to a block/sector boundary within one cell, versus the same on lines offset by half a block. Ratio should be about 1; "trunk gutters" along 16 km boundaries (the rejected C/D/E failure) give a ratio well above 1. Also compare median log A and S on the line versus off it.
- *Straight main divide.* Divide sinuosity = length of the main-divide path over its chord; a straight divide gives about 1. No sourced Earth number [M: real divides are visibly sinuous]; calibrate on the eroded control.
- *Envelope caps.* Weak.

**Tiering.** Smoke: 10-50 tiles, report theta, k_s, h, block-line ratio; accept anything inside wide bands (theta 0.2-0.7, h 0.45-0.75, ratio under 1.5). Gate: 200+ tiles over at least 8 seeds and 3 belt widths, per-tile theta and h, then a **distribution** check (pooled median inside the control-derived band; bounded fraction of tiles outside the Earth band). Negative controls required to fail: alpine ridged noise, comb, dome; eroded control must pass.

### 1.2 Directional power spectrum, anisotropy, lattice-peak detection

**Definition.** Detrend with a plane (not the envelope, which injects structure), Hann/Tukey window, 2-D FFT, P(kx, ky). Derive:
1. Radial slope beta (already in the repo, band 2.0-2.6 over 0.5-8 km).
2. **Residual after the radial fit**, P / P_fit(|k|). A **narrow peak at a lattice wavenumber** (1/16 km, 1/32 km, harmonics, 1/250 m for the kernel lattice) is the signature of block or cell rhythm. Statistic: peak-to-local-median ratio in dB.
3. **Angular anisotropy per octave**: structure-tensor coherence or strongest-30-degree-sector power over mean sector power. Axis coherence at 2 km is already gated (0.14-0.64); this extends it to every octave so stripes at 125-250 m become visible.
4. **Gradient alignment of fine bands**: band-pass the fine octaves, take the local structure-tensor angle, compare with the coarse gradient angle; the circular resultant of 2x(angle difference) is large for natural dissection (valleys run downslope) and near 0 for lattice stripes at a fixed absolute angle.

**Earth reference values.** Isotropic scaling for moment order <= 2 holds within about +-45% down to about 40 m in the global DEM analysis of Gagnon et al. 2006 (NPG 13:541), with anisotropic singularities and scale breaks present [S, abstract-level]; expected profile exponent about 2 [S]. Fluvial landscapes show **characteristic scales** (valley spacing) as spectral bumps, not pure power law (Perron, Kirchner and Dietrich 2008 JGR; Perron et al. 2009 Nature 460) [S, abstract-level]. So some spectral structure is natural; what must be absent is a **delta-function at a generator lattice scale**. Hence compare peak width and location against the lattice wavenumbers of our own generator, not against a flat spectrum.

**Cost** [E]: 512 x 512 zero-padded FFT in pure JS about 30-60 ms; binning about 5 ms; three band-pass FFTs for item 4 still under 200 ms.

**What it catches.**
- *Carving blocks*: peaks at 1/16 km and harmonics. **The strongest single detector for block artefacts.** Build the expected lattice list from generator constants (block 16 km, halo 24 km, kernel lattice 250 m, level spacing).
- *Seams*: a step or kink along a line puts a ridge of power through the origin perpendicular to the line (about 1/k_perp^2 decay). Detect as excess along one axis through the origin for axis-aligned seams; for others use the line probe in 1.3.
- *Gully/stripe look*: angular concentration at fine bands plus low gradient-alignment resultant.
- *Envelope caps*: a plateau cap changes the low-k slope; a knee appears. Secondary.

**Tiering.** Smoke: 20 tiles of (peak ratio, beta, coherence per octave); fail when peak ratio exceeds a threshold set from the eroded control (expected about 1-2 dB) with detector power proven by a seeded negative (a 1% amplitude 16 km periodic modulation must exceed it). Gate: add per-octave anisotropy and gradient alignment on 8 seeds.

### 1.3 Seam / discontinuity probe (not a published metric)

Added because seams are an open failure and the above catch them only indirectly.
- Sample the **same absolute points** through two different tile origins (the repo already has an Object.is seam test for kernels); extend to sector borders on the composed field.
- Along a candidate seam, compute |dh/dn| and the second difference across it versus parallel offset lines, as a ratio. Seamless means about 1.0 +- sampling noise, estimated from 20 random control lines of equal length. Cost: microseconds.
- Flow continuity: D8 area along a river that crosses a seam should be continuous; flag jumps of more than 2x in log A over one cell where the cell is not a confluence.
Tiering: smoke 50 lines per sector border; gate all borders.

### 1.4 Geomorphons (landform alphabet)

**Definition.** Jasiewicz and Stepinski: per cell, line-of-sight zenith and nadir angles in eight directions out to search radius L, thresholded by flatness angle d into +, 0, -; 498 distinct patterns after symmetry, usually mapped to 10 classes (flat, peak, ridge, shoulder, spur, slope, hollow, footslope, valley, pit) [S]. Small L, d is local, large is wide perspective (example: L = 100, 300, 1000 m with d = 1 degree) [S].

**Earth reference values.** No published global class percentage table could be retrieved. The hard number actually read: on the 10 m North Carolina test DEM, **8 geomorphons cover 50% of pixels, 36 cover 90%, 352 of 498 occur at all**; the 10 most frequent cover almost 60% [S, Stepinski and Jasiewicz 2011]. Global layers exist in Geomorpho90m (Amatulli et al. 2020, Sci. Data 7:162, from MERIT-DEM, about 90 m and 250 m) [S: existence only]; class fractions to be extracted at calibration. Until then use the repo controls and these *relative* invariants that need no table:
- **Alphabet concentration**: cumulative coverage curve of sorted pattern frequencies (the 8/36/352 curve); noise spreads mass over many exotic patterns, coherent terrain concentrates it. Compare entropy and patterns-for-90%.
- **Hollow:spur and valley:ridge ratio versus L.** Gully combs alternate hollow/spur at small L and lose it at larger L.
- **Peak density per 1000 km2** at a chosen L (the open R1 row, failing on Selawyn, 0.05 vs >= 8) and pit fraction (proxy of pits025).
- **Flat fraction on the highest ground** (cap detector).

**Cost** [E]: 8 rays up to L/cell steps per cell; at L = 16 cells, 147k x 8 x about 10 average steps (early exit) about 12M steps, about 50-150 ms; L = 64 cells about 4x. Three radii (4, 16, 64 cells, i.e. 0.5, 2, 8 km) about 0.3-0.6 s per tile. Precompute a 3^8 (6561) pattern-to-class table.

**What it catches.**
- *Gully look*: scale dependence above; the "slope" class collapsing at fine L because the surface is a plane with stripes.
- *Envelope caps*: flat/footslope classes on the highest cells where peaks should be; peak density falling to zero while elevation reaches the cap.
- *Carving blocks*: class fractions per 16 km block, coefficient of variation across blocks, and cells within 2 cells of a block line versus the rest (ratio about 1 expected); lattice artefacts give structure that persists across seeds.
- *Seams*: same edge-vs-interior comparison along sector lines.

**Tiering.** Smoke: 10-20 tiles, L = 16 cells only; report peak density, entropy, patterns-for-90%, hollow/spur. Gate: three radii, 8 seeds, bands from controls, edge-vs-interior ratio about 1 within the noise of off-line placement.

### 1.5 Hypsometric integral and elevation distribution

**Definition.** HI = (mean h - min h)/(max h - min h) per **basin** (per window is framing-dependent). Also the curve, skewness, and the fraction of land within x% of the local maximum.

**Earth reference values.** Strahler 1952: HI >= 0.6 young (convex), 0.3-0.6 mature (S-shape), < 0.3 old (concave); about 0.5 as equilibrium reference [S, secondary summaries]. For a stream-power equilibrium range expect roughly 0.4-0.55 [E].

**Cost.** One pass once basins are labelled by the D8 step; under 5 ms.

**What it catches.** *Envelope caps*: spike in the top height bin and a vertical step in the hypsometric curve; statistic = area in top 2% height bin over the mean of the next 10 bins, expected about 1 or below for natural peaked terrain, larger with a clip. *Dome / bare envelope*: HI dominated by envelope shape (cone about 1/3, dome higher; geometry, no source needed). Weak for seams and gullies. A cheap guard, not a headline.

**Tiering.** Smoke: always included. Gate: per-basin distribution and top-bin spike.

### 1.6 Ridge / valley network statistics

Reuse 1.1 and 1.4 outputs:
- Channel density (channel length per area at fixed A threshold) and the same on -h for ridges. Natural dissection shows similar Horton statistics on both [M, no number].
- **Junction angles**: natural tributaries join acutely (mean about 70 degrees, Howard 1971 [M, unverified]); parallel gullies give angles near 0, combs near 90.
- **Valley spacing CV** along ridge-perpendicular transects: lattices (comb, stripe, block rhythm) have very low CV; natural dissection about 0.3-0.7 [E, calibrate on controls]. Under 20 ms.
- Divide sinuosity as in 1.1.

### 1.7 Roughness by scale

**Definition.** Structure function or RMS of detrended height / slope at windows 0.5, 2, 8, 32 km; relief within r at r = 1, 2, 4, 8 km (the repo gates 8 km only).

**Earth reference.** Profile beta about 2 [S] corresponds to a Hurst-like H about 0.5 under fBm assumptions [M]; the repo already holds calibrated slope/relief values (design doc 2.4).

**What it catches.** *Envelope caps*: relief grows with window then saturates sharply; log-log slope of relief vs window should be a smooth power about 0.6-0.9 [E] with a **knee exactly at a block or cap scale** as the flag. *Extra sub-8 km noise* (rejected H10/d3): too much fine-window power relative to coarse; mostly what beta already gates, so new only if used per band. Cost: summed-area tables, about 10 ms per window.

## 2. Failure-mode matrix

| Failure mode | Primary detector | Secondary | Failure direction |
|---|---|---|---|
| Carving blocks (16 km rhythm) | spectrum lattice peak (1.2); block-line flow-parallel ratio (1.1) | edge-vs-interior geomorphon mix; block-to-block CV | peak above control; ratio above 1 |
| Gully / comb look | theta, h, Rb, junction angle (1.1, 1.6) | hollow/spur scale dependence (1.4); gradient alignment (1.2); valley-spacing CV | theta near 0, h low, angles near 0 or 90, CV low |
| Envelope caps | hypsometric top-bin spike (1.5); flat class on highest cells (1.4) | relief-vs-window knee (1.7) | spike above about 1; flat fraction above control |
| Seams between sectors | seam probe, step ratio and flow continuity (1.3) | edge-vs-interior mix; axis-aligned spectrum excess | ratio above random-line noise |
| Straight main divide | divide sinuosity (1.1/1.6) | none | about 1 |
| Over-noisy fine detail | roughness ladder (1.7); alphabet concentration (1.4) | pits025 (existing) | too many patterns for 90% |
| Peak density wrong on wide belts | geomorphon peak density (1.4) | | below band |

## 3. Cost summary [E]

Per 384 x 384 tile at 125 m, plain JS, unoptimised:

| Metric | Cost | Shares work with |
|---|---|---|
| Flood-fill, D8, accumulation | 30-80 ms | existing fill/pits |
| Slope-area, Hack, Rb, junctions, sinuosity | 20-50 ms extra | line above |
| 2-D FFT, lattice peaks, anisotropy | 40-100 ms | none |
| Geomorphons, 3 radii | 300-600 ms | none |
| Hypsometric (per basin) | under 5 ms | labelling |
| Roughness ladder | about 40 ms | none |
| Seam probe | under 5 ms | sampler |
| **Total** | about 0.5-1.0 s | |

Sampling the field costs 384 x 384 x about 50-470 ns (repo: F warm 48.7 ns, sampler about 472 ns) = 7-70 ms, so metrics dominate. 50 tiles about 25-50 s; 200 tiles about 2-3 min single-threaded (use worker_threads for the gate). Do not run in timing-sensitive CPU-quiet slots.

## 4. Tiered fail-fast test design

Principle: order by cost and information; stop at the first hard fail; every metric has a negative control that must fail (the repo already does this: dome, bare-envelope, +1% amplitude negatives).

**Tier 0, unit (under 2 s, HARD).** Detectors on synthetic fields with known answers: plane, cone (HI = 1/3), pure lattice sine (peak at known wavenumber), straight V (Hack, sinuosity), plus injected defects: a 16 km periodic 1% modulation (spectrum must fire), a 1 m step along a line (seam probe must fire), clipping at 0.9 of max (cap detector must fire), a comb of parallel gullies (theta and junction detectors must fire). Proves the detectors have teeth before they gate anything (same idea as the world-gen negative-test suite).

**Tier 1, smoke (10-50 tiles, 30-60 s).** 8 seeds x 2-6 tiles: lattice-peak ratio, seam probe, geomorphon peak density + entropy at one radius, hypsometric top-bin spike, theta and h in wide bands. Sequential rule, in cost order: abort at the first tile where two or more detectors are far outside band, or after 8 tiles if the median of any hard metric is outside the control band. Thresholds are deliberately wide (about half the control-to-negative gap); the aim is gross-regression catch in under a minute, not design acceptance.

**Tier 2, gate (200+ tiles, 2-3 min, HARD).** 8 seeds x 3 belt widths x several tiles plus tiles deliberately straddling block and sector borders. All metrics, three geomorphon radii, per-octave anisotropy, Rb/RL, junction angles, valley-spacing CV. Thresholds by the repo's pre-registered midpoint rule between positive control and nearest negative (`docs/mountain-m3-calibration-v1.md`). Report effect sizes with bootstrap intervals over seeds; pass only if the **interval** lies inside the band so noise cannot flip a verdict.

**Tier 3, comparison (offline, INFO, Section 7).** Real-DEM distributions as a plausibility envelope; gate only after calibration.

Hygiene:
- Test-side statistics may use `Math.log/pow/atan2`, but results are **tolerance-compared, never digest-compared**, and must not reuse the runtime hash.
- Fresh seed pool per calibration and gate (pools 730201-08, 730301-08, 730901-08, 731001-08 are used or reserved; suggest 740001-08).
- Compute at the controls' grid (125 m, 48 km) and document any change: results shift with resolution (geomorphon L, slope-area binning, FFT window).
- Re-measure controls before using them as references: eroded steady-state, eroded resampled, alpine, un-eroded, dome, comb, main generator. Write results in a new `*-calibration-v1.md`, do not edit the existing table.

## 5. Recommended ranking

1. **Slope-area / drainage scaling (Hack h, concavity theta, Rb, junction angle) plus block-line flow-parallel ratio.** The only family testing whether the surface is a coherent *drainage network*, which every rejected method lacked and Luna cannot judge. Reuses the flood fill (about 50 ms). Tight published Earth numbers (h about 0.57-0.6, theta 0.3-0.6, Rb 3-5). Caveat above: partly tautological on raw F, strong on the composited field.
2. **2-D spectrum with lattice-peak and angular-anisotropy analysis.** Cheapest strong detector of block rhythm and fine stripes, exactly the "stripes / blocky steps" Luna names. Extends the existing beta and coherence rows.
3. **Multi-scale geomorphons (alphabet concentration, hollow/spur by scale, peak density, flat-on-top, edge-vs-interior mix).** Covers caps, gully look, seams and the open peak-density row in one method with a published Earth anchor for the concentration curve (8/36/352 patterns for 50/90/100% [S]). Most expensive (0.3-0.6 s per tile) but affordable.

Cheap adjuncts: hypsometric top-bin spike (caps), seam probe (seams), roughness ladder (scale knee).

## 6. Risks and honesty notes

- Several Earth numbers are secondary or from memory (Rb, RL, theta compilation, HI classes, junction angles); re-verify against primary sources (Horton 1945, Strahler 1952, Kirby and Whipple 2012, Howard 1971, Wobus et al. 2006) at calibration.
- No global geomorphon class percentages were retrievable (Jasiewicz and Stepinski 2013 returned 403; Geomorpho90m paper behind a redirect). The only hard geomorphon number is for one 10 m test site.
- Every cost figure is an estimate; measure on first implementation.
- D8 on a 125 m generated raster needs a calibration run for the channel-head threshold and the slope-area binning window; theta from per-bin median slope is noisy and window-sensitive.
- A passing scalar is necessary, not sufficient. These metrics reject known failure modes; they do not prove "looks like mountains". Final sign-off stays with a headset or calibrated human look, as the repo already states.

## 7. Designing a later DEM comparison (no download now)

**Goal.** Build once an offline table of metric distributions from real mountain tiles, store **only summary numbers** (quantiles per metric, tile ids, DEM name and version) in the repo, and compare generator distributions to it. Raw tiles never enter the repo or the published project, which also minimises licence exposure.

**Procedure.**
1. *Tile choice.* Pre-register 20-40 tiles of 48 x 48 km stratified by type: active alpine, fold-and-thrust, old rounded range, plateau-incised, arid dissected. Fix coordinates before looking at any metric (same discipline as seed pools). Exclude lakes, large glacier flats, cities, sea.
2. *Preparation.* Project to local equal-area/UTM, resample to 125 m with area averaging (decimation aliases the spectrum), fill voids, run the **same code path** as generator tiles (Float32 raster in metres).
3. *Known biases to document.* Copernicus GLO-30 and SRTM/NASADEM are surface models, so canopy adds roughness; radar speckle and void filling add noise below about 100-200 m. Compare only bands above about 250-500 m; do not compare the 125 m scale against 30 m-derived data without a noise-floor test.
4. *Comparison.* Per metric and class, a two-sample statistic (Wasserstein or KS) and a simple band: generator median inside the 10-90 percentile band of the real tiles. INFO only; promote a metric to a gate only if the generator's own positive control (eroded stream-power) falls inside the real band, otherwise the metric is mis-specified, not the generator.
5. *Storage.* `tests/data/dem-reference-v1.json`: metric, resolution, tile ids, DEM and version, quantiles, date, licence line (provenance is part of the artefact, per AGENTS.md).
6. *Closing the loop.* If real values contradict Section 1 priors, update the priors, not the controls.

**Licence screening** (verify exact text before use; not legal advice):

| DEM | Licence as found | Fit |
|---|---|---|
| Copernicus DEM GLO-30 / GLO-90 | free, open, commercial and non-commercial use; attribution "(c) DLR e.V. 2010-2014 and (c) Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved" when communicating or distributing; GLO-30 excludes Armenia and Azerbaijan [S] | Good. Publish derived statistics only, keep the attribution line in the reference file and docs. Redistributing raw tiles is a separate licensing question; avoid. |
| NASADEM, SRTM | US-government work, public domain [S] | Best licence; older, noisier, adequate above about 500 m. |
| USGS 3DEP (US only) | public domain, credit requested [S] | Best quality; US tiles only (Sierra Nevada, Rockies, Cascades, Appalachians, Brooks Range) already span alpine to old range. |
| Mapzen / AWS Terrain Tiles | composite of 3DEP, SRTM, GMTED, ETOPO1; attribution required and per-source terms apply [S] | Convenient but mixed sources create seams that corrupt seam-sensitive metrics; prefer the originals. |
| ALOS AW3D30 | free under JAXA "Terms for Use"; derived products must credit JAXA [S] | Probably fine for derived statistics; read redistribution terms first; low priority. |
| FABDEM | CC BY-NC-SA 4.0, non-commercial and share-alike [S] | **Avoid.** |
| MERIT-DEM / Geomorpho90m | not verified this session; MERIT believed non-commercial [M] | Unusable until checked. |

Recommendation: **USGS 3DEP + NASADEM first** (public domain), Copernicus GLO-30 for non-US ranges (Alps, Himalaya, Andes, Southern Alps) with attribution; avoid FABDEM and, until checked, MERIT/Geomorpho90m. Publish metrics only. Per AGENTS.md, the first real download needs Kasper's explicit go-ahead; this plan lists what is needed so the request is one line.

## 8. Next steps

1. Tier-0 detectors and defect fixtures in a new `tests/helpers/terrain-structure-metrics.mjs` (do not touch `mountain-metrics.mjs`).
2. Run the seven controls through Tier 1; drop metrics that do not separate positives from negatives.
3. Calibrate thresholds by the midpoint rule on a fresh seed pool; write a `*-calibration-v1.md`.
4. Registration: `needs: tiers.json / tier-sets.json / smoke.json membership and package.json test registration, reason: new structural-metric tests` (merger-owned files; not edited on this branch).
5. After calibration, request the one-line DEM download authorisation and build the reference JSON.

## 9. Sources

Fetched or returned by search this session (abstract or page level unless stated):
- Stepinski and Jasiewicz 2011, Geomorphons (full text read): https://geomorphometry.org/uploads/pdf/pdf2011/StepinskiJasiewicz2011geomorphometry.pdf ; overview https://geomorphometry.org/?p=512 ; ESRI https://doc.arcgis.com/en/allsource/1.5/analysis/geoprocessing-tools/spatial-analyst/how-geomorphon-landforms-works.htm
- Geomorpho90m (Amatulli et al. 2020, Sci. Data 7:162): https://spatial-ecology.net/docs/build/html/GEODATA/geomorpho90m/geomorpho90m.html
- Hack's law: https://en.wikipedia.org/wiki/Hack%27s_law ; Rigon et al. 1996: https://digitalcommons.usu.edu/cee_facpub/2901
- Kirby and Whipple 2012: https://pure.psu.edu/en/publications/expression-of-active-tectonics-in-erosional-landscapes/ ; concavity compilation: https://esurf.copernicus.org/articles/6/505/2018/esurf-6-505-2018.pdf
- Montgomery and Foufoula-Georgiou 1993: https://efi.eng.uci.edu/papers/efg_058.pdf
- Hypsometric integral classes (secondary): https://www.geomorphometry.org/uploads/pdf/pdf2015/ZwolinskiSznigir2015geomorphometry.pdf ; https://www.ajol.info/index.php/jasem/article/download/301983/283941
- Gagnon et al. 2006: https://npg.copernicus.org/articles/13/541/2006/
- Perron et al. 2008/2009: https://dspace.mit.edu/handle/1721.1/64681 ; https://www.doi.org/10.1038/NATURE08174
- Licences: https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Data/DEM/resources/license/License-COPDEM-30.pdf ; https://developers.google.com/earth-engine/datasets/catalog/COPERNICUS_DEM_GLO30 ; https://gee-community-catalog.org/projects/fabdem/ ; https://catalog.data.gov/dataset/nasadem-merged-dem-global-1-arc-second-v001 ; https://catalog.data.gov/dataset/1-3rd-arc-second-digital-elevation-models-dems-usgs-national-map-3dep-downloadable-data-co ; https://registry.opendata.aws/terrain-tiles ; https://www.eorc.jaxa.jp/ALOS/en/dataset/aw3d30/
- Not retrievable: Jasiewicz and Stepinski 2013 (403), Geomorpho90m paper tables, primary texts of Horton, Howard, Wobus (memory, marked [M]).
