# Massif envelope v1 (M2 / MTN-3)

Status: implemented, unwired; `massif-envelope-1`. No terrain, landform, layout, golden,
package registration or production version changed. M2 moves nothing (§4.1 of the mountains plan).
The coordinator registers the test and MTN-6 owns assembly. The four owner files are
`src/mountain-envelope.ts`, `tests/mountain-envelope.test.mjs`,
`scripts/mountain-render-envelope.mjs`, and this document.

## API and constants

`massifEnvelopeM(belt, axisDistanceM, halfWidthM, a0, landFactor, tau, cls)` returns
pre-radius-scale metres, in the units of the R-CAL-1 floor F. Inputs are finite;
`belt` and `landFactor` are in [0,1], tau >= 0, and cls is `water` or `dry`.
The hot path allocates nothing and imports nothing. It uses arithmetic, comparisons,
and Math.abs/min/max only. The source audit rejects other Math access, exponentiation,
numeric conversion shortcuts, and imports; eleven negative controls exercise it.

The frozen `MASSIF_ENVELOPE` object contains:

| Constant | Value |
|---|---:|
| GAIN | 1 |
| MIN_HALF_WIDTH_M | 32000 |
| RIDGE_EQUIVALENT_WATER_M | 3640 |
| RIDGE_EQUIVALENT_DRY_M | 1800 |
| BLEND_BELT_FULL | 0.5 |
| MIN_FEATURE_WAVELENGTH_M | 32000 |

`maxEnvelopeM(tau, cls)` returns A: GAIN*tau*3640 for water and GAIN*1800 for dry.
The integration pin checks 3640 === RELIEF_CALIBRATION.KB*2800. Dry amplitude is
before the legacy dry floor's kd scaling. Dry is unit-tested only; MTN-6 wires only water.

`envelopeBlendWeight(belt)` returns arithmetic smoothstep(0,0.5,belt).
With s=abs(axisDistanceM)/halfWidthM, p=(1-s*s)*(1-s*s)*(1-s*s) for s<1,
otherwise zero. U=A*p*landFactor*w*widthGate. The implementation explicitly multiplies
the factors. a0<=0, belt===0, width below the gate, or s>=1 returns literal positive zero.
At s=1, p, p'=-6s(1-s²)² and p''=-6(1-s²)²+24s²(1-s²) all vanish.

`composeRidgeTermM(mainTermM,belt,halfWidthM,envelopeM)` implements the section 1.3 rule:
`belt === 0 || halfWidthM < MIN_HALF_WIDTH_M ? mainTermM : (1-w)*mainTermM + envelopeM`.
A belt below the width gate carries no envelope, so it is treated exactly like outside belts:
main's term is returned unchanged (coordinator review: without this, the 33 gated Raiva minor
belts had their old ridges faded out by w with nothing in their place).
Because U already contains w, this is a convex blend of main and
A*p*landFactor*widthGate. For nonnegative main and inputs in range, its real-arithmetic
maximum is max(main maximum,A maximum). GAIN<=1 therefore preserves the existing
R-CAL-1 ridge amplitude bound and requires no body-bound change. The exact-zero branch
returns main itself, preserving signed zero and subnormal bits. This identity also
preserves the downstream floor, upland, detail window and landform scale outside belts.

**Floating-point qualification / measured deviation:** the literal blend can round
above equal endpoints. The unit grid finds seven such samples, at most
9.094947017729282e-13 m (one ULP at 7280 m). Its check permits only this equal-endpoint,
crown case within Number.EPSILON*bound; all other grid cases retain the exact inequality.
Witness: water, tau=2, belt=.01, main=7280, s=0 gives 7280.000000000001.
Changing the literal expression or clamping would violate the requested assembly rule,
so the implementation preserves it and reports the qualification. No physical contract
band is widened. U itself has zero bound violations, as does the composed real terrain.

## Width gate and band measurement (HARD)

The width gate is constant along each M1 belt and therefore adds no spatial switch
inside a belt. It excludes every envelope with half-width below 32 km by construction.
The polynomial is C2 at its compact support edge, suppressing high-frequency tails.
“Band limit” here means the specified <5% RMS criterion, not strict Fourier support:
a compact polynomial still has nonzero high-frequency energy. The declared 32 km
wavelength is a band/LOD contract, not a claim that the full real field has no shorter
variation from its input coast or landFactor. Those inputs are measured separately as INFO.

Synthetic geometry is a straight equatorial great-circle belt on a sphere of radius
6e6 m, a0=1000, landFactor=1, tau=1. Across-axis transects contain 8192 samples at
250 m with compact support inside the transect, window='none', detrend=false. The
shared harness computes band powers. The RMS fraction is sqrt(power below 32000 / total
non-DC power). The oblique transect uses true great-circle latitude at 45 degrees.

The gate choice is conservative: exploratory ungated half-widths 12/24/30/32/40/60 km
gave RMS shares 48.929726/10.947777/3.009811/2.059755/1.558753/0.343138 percent.
32 km also matches the declared minimum scale. The dense accepted sweep tests every
integer km from 32 to 80, plus 100/150/220 km; all 52 pass, worst 2.059755% at 32 km.
The oblique share is 0.857418%. Negative controls fail: ungated 12 km 48.929726%,
32 km half-width box 22.728544%.

## Other unit measurements (HARD)

Seven tests pass. Bound grid: 614922 samples over two classes, tau 0..2 by .1,
s 0..1.2 by .01, belt and landFactor 0..1 by .1. Synthetic raster: 193²=37249
samples at 2 km; zero U<0 or U>maxEnvelopeM samples. Shape checks cover 2001 samples
per class, symmetry, monotonicity, exact crown, and C2 convergence at three offsets.
Exclusion checks exercise both classes, zero belt inside the support, nonpositive a0,
zero/narrow/valid widths, boundary and distant coordinates, and tau=0.
Composition checks signed zeros, subnormals, large positive/negative mains outside belts,
and a 30300-sample convex grid (with the rounding qualification above).

Forward, reverse and a fresh child process agree on 4096 binary float64 samples:
`7dd050150ebef98ea41a7762272cb0c2d6c0e6e2d0a402d5af19461e55fa049d`.
No terrain, climate, LOD, real M1, SITE_A or golden dependency enters the unit file.
No wall-clock assertion is used.

## Integration method and gain choice

The Node script duplicates the relief water branch, including independent seabed arithmetic,
macro/coast/ridges/fine, legacy detail subtraction, floor, upland, elevation, and landform
composition. It uses terrain.ts expression order. Before any measured ground is trusted,
composition-disabled ground is pinned bit for bit to terrainSampler. Every sampled
direction in the 2000-direction a0 pin, 20000-direction hypsometry set, 102500-direction
coast/ratio set, four transects, 385² raster and 769-point profile passes this identity
check: 306262 comparisons per world. A mismatch aborts with a report. Continental a0
also matches reliefLayersSampler on 2000 directions per world.

All outside-belt and bound comparisons cover that same full measured population.
Coastline uses 102500 directions per world, against baseTerrainSampler at sea level 0.
Quantiles use the shared q helper, sorted index floor(p*(n-1)), matching the owner test.
Land is ground>=0; the metric 3 belt population is belt>0 on an active belt (halfWidthM >= 32 km); width-gated belts count as outside belts for the identity check.
Hypsometry is CONTRACT only on Maithea, INFO on the other three worlds. Relief ratio,
identity, bound containment and coast are CONTRACT on all four.

The exploratory sweep and the final integration both measured GAIN .6/.8/1.
Every gain meets all Maithea hypsometry bands. At .6 every ratio is below .6;
at .8 Maithea, Selawyn and Lethuris fall below their main all-land ratio (Raiva .628 >= .612
passes). GAIN=1 passes both metrics on every world; it is the only sampled gain that passes on
all four, and it is the largest gain the convex-blend bound allows (no bodyHeightBoundM change).
Margin at GAIN 1: belt ratio exceeds main by .051-.116 and stays .17-.22 below the .9 cap. No plateau parameter or band relaxation was needed.
The 102500-direction baseline ratios differ slightly from the plan's 20000-direction
0.615..0.657 summary: measured range is 0.612274..0.654722. Acceptance compares the
actual identical 102500-direction populations, not the rounded historical summary.

## Renders and limits

Nine CPU PNGs were written: synthetic-envelope.png and one envelope/profile pair per
world, under `test-results/mountains/M2`. Hillshades isolate U*radiusScale on a
384 km square, 385² at 1 km. Profile colors are blue=U*scale, red=composed floor,
gray=main floor; x spans -192..192 km. The report records the y maximum per PNG.
These are VISUAL-ADVISORY artifacts for owner inspection; no appearance verdict is claimed.

Real-field transects use the first four belt>=.5 Fibonacci probe points on ACTIVE belts
(halfWidthM >= 32 km), at least 300 km apart, and the transverse tangent cross(direction,axis).
They use 8192 samples at 250 m, without detrending or windowing. (The first Astra run picked
Raiva sites on width-gated minors, which gave a flat render and zero-energy spectra; the
coordinator restricted the site rule to active belts.)

Not run: npm test, test:full, affected suite, browser, GPU, Luna, downloads, dry-world
integration, LOD checks, full production assembly, goldens, or CPU-quiet benchmarking.
No commit was attempted. The script cost observation is INFO only.

## Verification

- `node --test tests/mountain-envelope.test.mjs`: final exit 0, 7/7, 213.6223 ms (<2 s).
  Initial exit 1 exposed the seven rounding cases and an audit matching a JSDoc comment's
  double asterisk. The latter was fixed by plain line comments; no audit rule was removed.
- `npx tsc --noEmit`: exit 0. The subsequent source edit changed comments only.
- `node scripts/mountain-render-envelope.mjs`: Astra run exit 0, 6.51 s. Coordinator re-runs after
  the site-rule and gated-composition fixes: exit 0, 7.12 s, all CONTRACTs pass (tables below are
  from the final re-run; only Raiva's rows changed).

The following tables and complete precision record are transcribed from that final run.


## Final integration measurements

Hypsometry: metres and percentages, main → composed; Maithea CONTRACT, others INFO.

| World | p10 | p50 | p90 | p99 | max | >4 km % | <500 m % |
|---|---:|---:|---:|---:|---:|---:|---:|
| Maithea | 206.454 → 208.915 | 425.909 → 463.658 | 2689.961 → 2991.496 | 4357.854 → 4462.419 | 5909.958 → 5909.958 | 2.234 → 2.888 | 55.721 → 52.561 |
| Selawyn | 184.701 → 187.110 | 345.270 → 366.252 | 1793.867 → 2069.665 | 3291.679 → 3370.828 | 4363.976 → 4363.976 | 0.038 → 0.026 | 65.383 → 62.168 |
| Raiva | 184.576 → 185.375 | 339.489 → 348.225 | 1489.362 → 1616.538 | 2474.912 → 2509.533 | 3193.524 → 3312.685 | 0.000 → 0.000 | 69.241 → 67.282 |
| Lethuris | 195.727 → 199.091 | 350.882 → 372.597 | 2410.060 → 2647.391 | 4059.555 → 4155.612 | 5010.147 → 5010.147 | 1.205 → 1.510 | 64.831 → 61.189 |

CONTRACT: ratios and containment on the 102500-direction set. Identity and outside-belt counts cover all 306262 measured directions per world.

| World | Belt n | Main ratio | Belt ratio | Composed max m | Bound m | Coast flips | Identity / a0 mismatches | Outside diffs / count | Bound violations |
|---|---:|---:|---:|---:|---:|---:|---|---|---:|
| Maithea | 5768 | 0.655 | 0.719 | 5781.072 | 6628.142 | 0 | 0 / 0 | 0 / 235811 | 0 |
| Selawyn | 3835 | 0.640 | 0.705 | 4555.745 | 5175.954 | 0 | 0 / 0 | 0 / 193730 | 0 |
| Raiva | 3205 | 0.612 | 0.728 | 3370.728 | 4023.619 | 0 | 0 / 0 | 0 / 234324 | 0 |
| Lethuris | 3750 | 0.631 | 0.682 | 5544.804 | 6485.172 | 0 | 0 / 0 | 0 / 199484 | 0 |

Gain sweep: Maithea hypsometry (CONTRACT) and every-world belt ratio (CONTRACT). Full precision and other-world sweep hypsometry are in the record below.

| GAIN | Maithea p10 / p50 / p90 / p99 / max m | >4 km / <500 m % | Maithea ratio | Selawyn ratio | Raiva ratio | Lethuris ratio |
|---|---|---|---:|---:|---:|---:|
| 0.6 | 208.462 / 460.384 / 2701.799 / 4332.175 / 5909.958 | 2.089 / 52.824 | 0.572 | 0.537 | 0.538 | 0.534 |
| 0.8 | 208.723 / 461.866 / 2848.983 / 4346.197 / 5909.958 | 2.243 / 52.624 | 0.639 | 0.622 | 0.628 | 0.608 |
| 1 | 208.915 / 463.658 / 2991.496 / 4462.419 / 5909.958 | 2.888 / 52.561 | 0.719 | 0.705 | 0.728 | 0.682 |

## Width-excluded belts (INFO)

Maithea, Selawyn and Lethuris: none. Raiva: 33 minor belts; zero-based indices follow M1.

| Index | Half-width m |
|---|---:|
| 3 | 26187.589113923757 |
| 4 | 26847.408543829133 |
| 6 | 29827.056079557617 |
| 7 | 27646.308982388702 |
| 8 | 28938.118265601646 |
| 9 | 25861.32622722519 |
| 10 | 29512.313732551844 |
| 11 | 23877.04786787379 |
| 12 | 25712.74174499821 |
| 13 | 23941.342888294304 |
| 14 | 24293.994502257912 |
| 15 | 30222.96155285862 |
| 16 | 28748.53413474383 |
| 17 | 27126.0444352704 |
| 18 | 25120.300514672283 |
| 19 | 24126.883133466858 |
| 20 | 28282.773822878557 |
| 21 | 27117.131422978553 |
| 22 | 30346.530791426496 |
| 23 | 25688.983509387992 |
| 24 | 30566.002994630475 |
| 25 | 28282.717637787176 |
| 26 | 28472.130509736176 |
| 27 | 24932.330230526426 |
| 28 | 31092.34560221685 |
| 29 | 29028.351185633146 |
| 30 | 28422.20409962722 |
| 31 | 28811.835482306305 |
| 32 | 27521.003197906197 |
| 33 | 28768.049995597383 |
| 34 | 26034.479348295707 |
| 35 | 31188.797739462607 |
| 36 | 24023.903595979016 |

## Real-field spectra (INFO)

| World | Site | Belt index | Half-width m | Sub-32 km RMS % | Total power m² |
|---|---:|---:|---:|---:|---:|
| Maithea | 0 | 21 | 71598.664 | 0.312562 | 188281.050 |
| Maithea | 1 | 21 | 71598.664 | 0.312562 | 188281.050 |
| Maithea | 2 | 21 | 71598.664 | 0.381846 | 188284.133 |
| Maithea | 3 | 0 | 220000.000 | 0.767760 | 17893.626 |
| Selawyn | 0 | 2 | 220000.000 | 0.054913 | 269689.879 |
| Selawyn | 1 | 2 | 220000.000 | 0.056748 | 306945.918 |
| Selawyn | 2 | 2 | 220000.000 | 0.054405 | 262169.395 |
| Selawyn | 3 | 2 | 220000.000 | 0.061806 | 300891.306 |
| Raiva | 0 | 2 | 90090.171 | 0.431447 | 72933.724 |
| Raiva | 1 | 2 | 90090.171 | 0.222464 | 78211.391 |
| Raiva | 2 | 2 | 90090.171 | 0.273825 | 33568.639 |
| Raiva | 3 | 2 | 90090.171 | 0.417661 | 15309.352 |
| Lethuris | 0 | 20 | 129657.615 | 0.147198 | 42610.489 |
| Lethuris | 1 | 20 | 129657.615 | 0.138336 | 119714.161 |
| Lethuris | 2 | 20 | 129657.615 | 0.134844 | 27587.177 |
| Lethuris | 3 | 20 | 129657.615 | 0.136225 | 313538.606 |

Cost (INFO, no CPU-quiet lock, single observation): about 21-22 ns per massifEnvelopeM call (100000 calls after 10000 warm-ups).

- [synthetic-envelope.png](../test-results/mountains/M2/synthetic-envelope.png)
- [Maithea-envelope.png](../test-results/mountains/M2/Maithea-envelope.png)
- [Maithea-profile.png](../test-results/mountains/M2/Maithea-profile.png)
- [Selawyn-envelope.png](../test-results/mountains/M2/Selawyn-envelope.png)
- [Selawyn-profile.png](../test-results/mountains/M2/Selawyn-profile.png)
- [Raiva-envelope.png](../test-results/mountains/M2/Raiva-envelope.png)
- [Raiva-profile.png](../test-results/mountains/M2/Raiva-profile.png)
- [Lethuris-envelope.png](../test-results/mountains/M2/Lethuris-envelope.png)
- [Lethuris-profile.png](../test-results/mountains/M2/Lethuris-profile.png)

## Complete integration precision record

Unrounded values, sweep hypsometry for every world, site coordinates, profile scales and timing are in
[report.json](../test-results/mountains/M2/report.json) (`test-results/` is local evidence, not committed;
regenerate with `node scripts/mountain-render-envelope.mjs`).
