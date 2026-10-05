# Orogen layout 1 (M1 / MTN-2)

Unwired element; this revision changes only the five M1 draft files and regenerates the four CPU PNGs and `test-results/mountains/M1/report.json`. The four plan thresholds remain fixed: 5–15% positive belt share of land; aspect >=4 for each component strictly above 1% of land; primary coherence p50 >=.45; zero coast violations. Strict coherence p50 >=.45 and the coordinator's distance gate are additional checks.

## Geometry and API

Exports are `OROGEN_LAYOUT_VERSION = 'orogen-layout-1'`, frozen `OROGEN_LAYOUT`, `continentalA0`, `buildOrogenLayout` and `orogenLayout`. Geography inputs are seed, radius and a0; optional `landProbe` replaces construction directions. The memoised wrapper also reads water, type and kind. Stars and gas giants have empty layouts. Only catalogue and deterministic-math functions are imported by the implementation. The a0 identity pin (`continentalA0(d)*min(1,R/2e6)` bit-equal to terrain's `reliefLayersSampler(body)(d).continentalM`, 2000 directions per terrestrial body) runs in the integration script, so the unit file imports no terrain (section 2.6); measured mismatches: 0 on all 54 terrestrial bodies.

Construction uses 4096 Fibonacci probes, at most 4096 candidates, and a 10% probe-land target. The first 768 attempts seek up to three majors. Margins use 800–3000 raw metres; interiors require at least 800 m. Major half width W is .045R capped at 220 km, with a 30 km floor also capped by .045R on small worlds. Major angular half length is .72–.90; minor half length .10–.30 and half width .014R times .85–1.15. There are 25 land-continuity nodes, now on the exact displaced centreline, requiring 92% land for majors and 70% for minors.

The exact along coordinate is `u=x/(r+z)`, with `x=dot(d,t)`, `z=dot(d,c)` and `r=sqrt(x*x+z*z)`. It equals `tan(theta/2)` off the base great circle as well as on it. With `U=tan(L/2)`, displacement is `o(u)=bendM*(u/U)^2 + A*(2*noise(2*u/lambda+13.37.19,seed)-1)`. The bow is retained: interior magnitude <=.12LR; margin bow uses the a0 contour's second tangent derivative divided by normal gradient, sampled at +/-.025 rad and clamped to .15LR. There are no detail octaves.

Sinuosity amplitude is now .3–.6W. `lambda=max(random(.12,.20),16W/R*(1+U*U))`. Since `du/dtheta=(1+u*u)/2`, the local wavelength in metres on the underlying arc is at least `16W`, eight full widths, including at the endpoints. The .12-radian minimum remains. Exact displaced points are `(sqrt(1-y*y)*sin(theta), y, sqrt(1-y*y)*cos(theta))` in the belt frame, with `y=o(u)/R`; sine and cosine here are evaluated using rational half-angle identities. Value, axis, separation nodes and independent test geometry share this exact coordinate.

## Curvature and support bounds

The construction bound includes full spatial curvature (and therefore bounds geodesic bending too), the bow, and the sphere's curvature. Cubic value noise obeys `|n'|<=1.5`, `|n''|<=6` piecewise. Define:

```
H = (abs(bendM)+A)/R
S = 2*abs(bendM)/(U*R) + 6*A/(lambda*R)
T = 2*abs(bendM)/(U*U*R) + 48*A/(lambda*lambda*R)
P = (1+U*U)/2
D = S*P
E = T*P*P + S*U*P
a = sqrt(1-H*H)
K = W/R * (1 + 2*H*D/a + (D*D+H*E)/a + H*H*D*D/(a*a*a) + E)/(a*a)
```

For centreline `p(theta)=(a(theta)cos(theta),a(theta)sin(theta),y(theta))`, speed >=a, `|y'|<=D`, `|y''|<=E`, `|a'|<=HD/a`, and `|a''|<=(D²+HE)/a+H²D²/a³`. Thus `curvature*W <= (W/R)*|p''|/|p'|² <= K`. Candidates with K>.2 are rejected; every accepted belt asserts K<=.2, giving bend radius >=5W. The dense unit check uses 4096 along-u intervals and central differences at h=1e-5 on every Maithea/Lethuris belt. Measured maximum curvature*W is **.047823456258** (Maithea); Lethuris is **.047823357421**. Maximum analytic K is **.092127797631** / **.081580144509**, respectively. The test also checks each measured value against its own belt's bound.

The conservative pre-check retains `gradientMax=1+S*(1+U*U)/(2*supportZ)`, with supportZ=.5. This follows from `|grad(u)|=(1+u*u)/(2r)` and r>=z>=.5. Although projection replaces F/g, this wider tube remains conservative: a point within W of any centreline point has `abs(pole.d)<=H+W/R`, because dot with a unit pole is 1-Lipschitz in chord distance. The retained radius is `H+W*gradientMax/R`. Construction rejects a tube radius >=.5. Projection's polynomial distance error is far smaller than the retained inflation.

At the exact same theta, the chord from a sample to the base circle divided by `abs(pole.d)` is `sqrt(2/(1+sqrt(1-y*y)))`, at most 1.036 when |y|<.5; separation uses 1.04. Node balls also include half a base node interval, bounded by `2U/24`. Rejecting intersections of these balls separates the full supported arcs, including between nodes. The independent unit check verifies that the pre-check loses no measured footprint and that no sample belongs to two belts.

## Distance accuracy

The coordinator's gate compares `abs(axisDistanceM)` with dense-search great-circle distance to the finite displaced centreline at 2000 positive Maithea samples; tolerance remains **1% of halfWidthM**, separate from the four plan thresholds. History is **10.3243% -> 1.27622% (A) -> 1.28536% (A+B) -> 3.99675e-10% (A+B+C)** maximum error. The old 10.3243% / 22.7134 km result is supplied prior-run history, not rerun here. The curvature bound is <=.2 as derived above; measured maximum is .04782346. No tolerance relaxation is needed.

| Step | Max error % W | p99 error % W | Max error m | True distance/W at max | Offset slope at nearest u |
|---|---:|---:|---:|---:|---:|
| A: width-tied sinuosity | 1.276219564 | .0785524041 | 800.976982 | .9637469294 | -.2641264232 |
| B: exact along coordinate | 1.285363485 | .0965763703 | 806.715861 | .9636560184 | -.2641264232 |
| C: fixed projection | 3.996749663e-10 | 3.507540731e-10 | 8.792849258e-7 | .9990671894 | .02765879805 |

Slope in this table is `d(offset/R)/dtheta`, including the bow, evaluated at the reference nearest point. A/B worst samples are direction `[-.15277741809323167,-.96303,.2218834820818481]`, belt 33 / 32, W=62761.69119019 m. C's worst sample is belt 0, W=220000 m, reported magnitude 219794.781674451 m and reference distance 219794.781675330 m. Changing accepted belts changes the positive-sample population; each stage uses the same coprime permutation and first-2000-positive rule, not necessarily identical points.

C uses five Gauss–Newton steps from the sample's own u, minimizing squared chord distance to the exact centreline, with a fixed central derivative at u+/-1e-5. A square-root arithmetic clamp keeps projection on the finite arc; no data-dependent exit or transcendental operation is used. Minimizing chord distance also minimizes great-circle distance. Distance is signed using the sample's displaced-side coordinate and recovered as `R*chord*(1+chord²/24+3*chord⁴/640)`. For supported W/R<=.045, the omitted term is <3e-13 radians. The axis is the projected nearest-centreline tangent at the sample. These measured errors describe this reference regression, not a universal floating-point accuracy guarantee.

The reference searches 4000 intervals per belt, refines the nearest interval with 36 ternary iterations and converts chord to great-circle distance with asin. Samples come from a coprime permutation of 100000 Fibonacci directions. Distance accuracy on other worlds was not measured. Curvature was measured on Maithea and Lethuris.

Mask and output use the same projected distance. Within along support and a positive coast gate, belt is positive exactly when abs(distance)<W, subject to taper rounding. Crown is `1-.1*(distance/W)^2`; the outer smoothstep starts at .65W and the along taper at .75U. a0<=0 returns exact zero; positive a0 multiplies by smoothstep(0.100,a0). `sampleWithA0` is bit-identical to `sample` for identical a0. Output storage resets on every call; empty output has zero fields and beltIndex=-1. All layout/belt/frame data are frozen.

## Measurement populations

Area uses a 1024x512 pixel-centre map weighted by sin(phi). Components use eight neighbours and longitude wrapping, strict belt>.5, weighted covariance in the mean-direction tangent plane, and aspect>=4 for each component strictly above 1% of land. Components above .1% are separately informative. Shares are relative to land. Main ridge share uses the exported RELIEF_CALIBRATION.BT0.

Both coherence populations use 193x193 rasters at 2 km spacing, 20-cell (40 km) windows and ten-cell (20 km) stride, at up to eight sites separated by 300 km. Sites are the first belt>=.5 points in a 20000-direction probe. Primary uses positive-mask centres above their median, omitting zero-trace windows; strict uses every positive centre and includes zero-trace windows as zero. Both p50 thresholds are .45. No existing MTN-0 helper was changed.

The run covers the four water worlds **and** 60 corpus bodies (first ten per catalogue type, the four worlds excluded): 64 bodies, 54 terrestrial and 10 gas giants. (The relief round's hypsometry test truncates worlds+corpus to 60 total; this element follows the card literally instead.) The historical relief-round 410 000-direction set is not recorded in the repo (T11 only states the count), so it is not reproduced: coast checks use 4x102500 Fibonacci directions on the water worlds (=410000), plus 20000 per terrestrial body. This totals 1490000 terrestrial coast checks; ten gas giants receive another 200000 all-zero samples.

## Final measurements

**64/64 bodies pass; failing bodies: none.** All 54 terrestrial bodies pass the four plan gates, strict coherence and the a0 identity pin. All ten gas giants pass all-zero checks. Coast violations and strict zero-trace windows are zero throughout. Integration wall: **93.186 s**.

| World | Belt >0 % | Belt >=.5 % | >1% count / min aspect | Coherence primary / strict | Windows primary / strict | Coast violations | Build ms |
|---|---:|---:|---|---|---|---:|---:|
| Maithea | 10.208 | 7.351 | 3 / 15.158 | 0.999456 / 0.999684 | 706 / 1415 | 0 | 19.440 |
| Selawyn | 9.535 | 6.920 | 3 / 13.245 | 1.000000 / 1.000000 | 970 / 1973 | 0 | 26.667 |
| Raiva | 10.018 | 7.251 | 3 / 9.144 | 0.998474 / 0.998213 | 213 / 408 | 0 | 37.632 |
| Lethuris | 9.676 | 6.997 | 1 / 19.641 | 0.999998 / 0.999995 | 898 / 1778 | 0 | 52.914 |

| World | R km | Land % | Main ridge % | All >1% aspects | >.1% min / p10 / below4 |
|---|---:|---:|---:|---|---|
| Maithea | 5194.907 | 54.987 | 37.020 | 15.158, 16.982, 19.961 | 11.317 / 12.149 / 0 |
| Selawyn | 8552.056 | 39.267 | 37.179 | 25.652, 13.245, 25.006 | 7.218 / 8.866 / 0 |
| Raiva | 2002.004 | 52.285 | 36.645 | 9.144, 16.814, 10.822 | 9.096 / 9.144 / 0 |
| Lethuris | 8997.494 | 37.731 | 36.804 | 19.641 | 7.639 / 8.351 / 0 |

Corpus ranges below use raw fractions for shares; construction is in ms and radius in metres.

| Metric, 54 terrestrial bodies | Minimum | Maximum |
|---|---:|---:|
| radiusM | 340789.3256 | 8997493.828 |
| landShare | 0.3560626446 | 0.7435453424 |
| beltShare | 0.09231632328 | 0.1072349021 |
| coreShare | 0.0670249259 | 0.0780883059 |
| mainShare | 0.3587117370 | 0.3750504991 |
| minAspect | 9.143591326 | 27.08377607 |
| smallMinAspect | 1.716616501 | 12.20559915 |
| smallP10Aspect | 5.759006434 | 13.68419911 |
| smallBelow4 | 0 | 1 |
| majorCount | 1 | 3 |
| coherenceP50 | 0.9509884298 | 0.9999999819 |
| coherenceStrictP50 | 0.9323044591 | 0.999999964 |
| coherenceWindowCount | 82 | 1168 |
| coherenceStrictWindowCount | 158 | 2282 |
| coherenceZeroTraceCount | 0 | 0 |
| coastViolations | 0 | 0 |
| constructionMs | 6.8497 | 75.109 |
| largeComponents | 0 | 3 |

**44/54 terrestrial bodies have at least one >1% component** (the four added corpus moons all do). The ten without one are Auraese, Selyune, Isyth, Asywyn, Vailria, Naotis, Isaven, Laenune, Zeuva, Ceroron. Their large-component aspect gate is vacuous; this is not proof that a different layout could not fit. Per-body names, IDs and components are in the report.

Unrounded measurements, components, coherence sites/counts, curvature witnesses and the distance witness are in [report.json](../test-results/mountains/M1/report.json). Regenerated CPU PNGs: [Maithea](../test-results/mountains/M1/Maithea-layout.png), [Selawyn](../test-results/mountains/M1/Selawyn-layout.png), [Raiva](../test-results/mountains/M1/Raiva-layout.png), [Lethuris](../test-results/mountains/M1/Lethuris-layout.png). Owner visual review remains pending; no appearance verdict is claimed.

## Verification and cost

Final coordinator-run validation (worktree mountains/m1, after review round 2):

- `node --test tests/mountain-layout.test.mjs`: **10/10 pass**, exit 0, Node duration 655 ms (< 2 s). No wall-clock timing, terrain, climate, SITE_A, golden, browser or GPU use in the unit file.
- `npx tsc --noEmit`: pass, exit 0.
- `node scripts/mountain-render.mjs layout`: pass, exit 0, 93.186 s; 64 bodies; report and four PNGs regenerated.

Review round 2 changes: the a0 identity pin and the cost measurement moved from the unit file to the integration script; the corpus became 4 worlds + 60 bodies; `value()` now runs the pole-band rejection before the along-coordinate square root and `sampleWithA0` reuses the winning belt's projection instead of projecting twice. These are output-neutral: the 4096-sample digest is unchanged.

Forward, reverse and child-process 4096-sample SHA-256 digests agree:
`1828a9e5b23444ba181699ad51370ee61ddf370274e6a539da7ec9d88a25cfca`.

Cost (INFO, wall clock, not CPU-quiet; single observations): standalone Maithea, 100000 Fibonacci directions, caller-owned output, 10000 warm-up samples, sampling includes a0 (about 116 ns of it): about **0.82-0.94 us/sample** after round 2, build 9-23 ms. The script's end-of-run observation was 1388 ns (after 93 s of other work). Earlier history: A 807 ns, B 842 ns, C 1004 ns per sample (projection +19% over B). MTN-6's +8% sampler budget is not met by this element alone; candidates are a tighter residual bound before projection and the caller-supplied a0 path.
