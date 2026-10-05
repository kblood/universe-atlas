# Orogen layout 1 (M1 / MTN-2)

Unwired element; this revision changes only the five M1 draft files and regenerates the four CPU PNGs and `test-results/mountains/M1/report.json`. The four plan thresholds remain fixed: 5–15% positive belt share of land; aspect >=4 for each component strictly above 1% of land; primary coherence p50 >=.45; zero coast violations. Strict coherence p50 >=.45 and the coordinator's distance gate are additional checks.

## Geometry and API

Exports are `OROGEN_LAYOUT_VERSION = 'orogen-layout-1'` (`'orogen-layout-2'` since cost plan T2: the foot-point solve only, see "In-massif foot-point solve"), frozen `OROGEN_LAYOUT`, `continentalA0`, `buildOrogenLayout` and `orogenLayout`. Geography inputs are seed, radius and a0; optional `landProbe` replaces construction directions. The memoised wrapper also reads water, type and kind. Stars and gas giants have empty layouts. Only catalogue and deterministic-math functions are imported by the implementation. The a0 identity pin (`continentalA0(d)*min(1,R/2e6)` bit-equal to terrain's `reliefLayersSampler(body)(d).continentalM`, 2000 directions per terrestrial body) runs in the integration script, so the unit file imports no terrain (section 2.6); measured mismatches: 0 on all 54 terrestrial bodies.

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

C (orogen-layout-1; orogen-layout-2 replaced the steps, see "In-massif foot-point solve") uses five Gauss–Newton steps from the sample's own u, minimizing squared chord distance to the exact centreline, with a fixed central derivative at u+/-1e-5. A square-root arithmetic clamp keeps projection on the finite arc; no data-dependent exit or transcendental operation is used. Minimizing chord distance also minimizes great-circle distance. Distance is signed using the sample's displaced-side coordinate and recovered as `R*chord*(1+chord²/24+3*chord⁴/640)`. For supported W/R<=.045, the omitted term is <3e-13 radians. The axis is the projected nearest-centreline tangent at the sample. These measured errors describe this reference regression, not a universal floating-point accuracy guarantee.

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
`1828a9e5b23444ba181699ad51370ee61ddf370274e6a539da7ec9d88a25cfca` (before `alongM` was added to the
sample; the current digest, pinned literally in tests/mountain-layout.test.mjs since T1, is
`0aa3d59b9ed979c85da729386c3531e732bb3f94dbf3b1961db2292be60ec7b2`).

Cost (INFO, wall clock, not CPU-quiet; single observations): standalone Maithea, 100000 Fibonacci directions, caller-owned output, 10000 warm-up samples, sampling includes a0 (about 116 ns of it): about **0.82-0.94 us/sample** after round 2, build 9-23 ms. The script's end-of-run observation was 1388 ns (after 93 s of other work). Earlier history: A 807 ns, B 842 ns, C 1004 ns per sample (projection +19% over B). MTN-6's +8% sampler budget is not met by this element alone; candidates are a tighter residual bound before projection and the caller-supplied a0 path.

## Band rejection grid

Mountains cost plan T1 (docs/mountains-opus-decisions-2026-10-05.md Q2). `sampleWithinWithA0(d, a0, maxDistM, out, minHalfWidthM)`
returns `sampleWithA0` filtered to a band: its result when `belt !== 0`, `halfWidthM >= minHalfWidthM` and
`|axisDistanceM| < maxDistM`, else the empty sample. `sample` and `sampleWithA0` are unchanged; the version stays
`orogen-layout-1` and the 4096-sample digest is unchanged. The assembly calls it through `massifBeltSample`
(src/mountain-assembly.ts) with the massif band (48 km, minimum half width 32 km); outside that band the ridge term
is `main` exactly, so filtering is value-neutral.

It is value-preserving: the grid only decides how much of `sampleWithA0` runs. Per (maxDistM, minHalfWidthM) the
layout lazily builds, once:

- a cube map (N = 256-2048 cells per face edge, N chosen so a face-centre cell is at most 1/4 of the band radius),
  stamped conservatively from node caps along each eligible belt's base arc (node spacing, curvature and gnomonic
  distortion bounds in the comment above `BAND_AXES_A`); each 32-cell word carries a tag (none, one belt, several);
- a coarse N/8 summary of the fine map, and
- a division-free 128^3 voxel prefilter over [-1,1]^3, stamped with the same node caps plus the voxel half-diagonal.

Lookup: voxel bit, then coarse bit, then fine bit. An unset bit returns the empty sample. A word stamped by one
belt only first runs `beyondChord` (a rigorous lower bound on the chord to that belt's arc) and then that belt's
`value`; only a sample in that belt's own band runs the remaining belts (same order, strict `>`, value reused).
A word stamped by several belts runs the full `sampleWithA0`.

Measured (tests/mountain-layout-grid.test.mjs, HARD; scripts/mountain-layout-grid.mjs, INFO):

| | Maithea | Selawyn | Raiva | Lethuris |
|---|---|---|---|---|
| N per face edge | 1024 | 2048 | 512 | 2048 |
| identity mismatches (102,500 + edge offsets) | 0 | 0 | 0 | 0 |
| band directions in unflagged cells | 0 | 0 | 0 | 0 |
| flagged area (land + ocean) / massif area | 1.486 | 1.446 | 1.332 | 1.368 |
| flagged land / massif area | 1.372 | 1.302 | 1.247 | 1.261 |
| cold grid build (fresh process) | 26 ms | 30 ms | 13 ms | 31 ms |

The 60-body corpus (20,000 directions per body plus 24 edge offsets per belt) has 0 mismatches and 0 unflagged
band directions; band-edge pairs (refined on the displaced centreline to 10 mm-50 m either side of 48 km) straddle the edge for 1480/1480, 1280/1280, 120/160, 1640/1640 pairs. Node spacing 3/N (2/N gives area ratios 1.41/1.39/1.29/1.33 but cold builds of 56-60 ms). The worst cold build is Auraese (66 belts, N = 2048): 48.7 ms in the 64-body run, 46-49 ms over 7 fresh processes,
one observation 51.9 ms; about 24 ms once warm (the rest is first-call JIT).

**Outside-massif cost target (+3% against main) is NOT met; waived** (docs/mountains-opus-decisions-2026-10-05.md,
"Addendum 2026-10-05 (2)": the binding row is the +8% weighted warm budget after T2, whose in-massif target
tightens to about 1,530 ns on Maithea and Raiva). CPU-quiet lock, one process pinned per run
(`start /high /affinity 0x10`), wired terrain sampler on Fibonacci directions outside every massif:

- 15 fresh processes per world, median against main: grid +3.8% / +3.8% / +5.4% / +4.6%; the same harness
  without the band call: 0.0% / -0.1% / +1.0% / +1.5% (process noise ±3-5%).
- Same-process on/off A/B (5 runs per world): +4.4-5.1% / +3.0-4.2% / +3.6-4.9% / +3.2-3.8%, about 14-23 ns per sample.
- Breakdown (A/B variants): the call, out reset and `a0 <= 0` check alone cost about +1.7%; any table lookup on
  land samples adds about +2-3% irrespective of the scheme (octahedral map, branchy or branch-free cube face,
  voxels); the flagged path adds about 0.4%. Without the grid the same call costs +83-137%.

## In-massif foot-point solve (orogen-layout-2)

Mountains cost plan T2 (docs/mountains-opus-decisions-2026-10-05.md, T2 row and "Addendum 2026-10-05 (2)").
`OROGEN_LAYOUT_VERSION` is now `orogen-layout-2`. The belts are unchanged. Construction keeps its
orogen-layout-1 random stream (`OROGEN_LAYOUT_CONSTRUCTION_SEED`) and its land-coverage predicate: `coveredV1` is
orogen-layout-1's `value > 0`, verbatim. Without it, a probe near a belt edge could flip under the new solve and
change when construction stops (found in review). A HARD test pins the belt-set SHA-256 of the four water worlds,
the 60 corpus bodies (2384 belts) and the synthetic cap. The literals were computed on main 66453b2
(orogen-layout-1). Only the projection moved: by under 0.1 um in
distance and under 0.1 m along the belt.

**Solve.** Gauss-Newton on the squared chord, as before, but with the exact derivative instead of a central
difference, iterated in belt-frame coordinates (the derivation is in the comment above `transverse`), from the
sample's own u, clamped to the finite arc, a fixed `FOOT_POINT_STEPS = 4` steps, no data-dependent exit. The
final chord is evaluated in world coordinates, as orogen-layout-1 did: belt centres are unit only to
`|C| - 1 >= -2.9e-11` (164,328 belts of 4173 catalogue bodies), and a frame-coordinate chord moved the 1% gate's
worst sample by 7e-6 m. The card's per-grid-cell seed `u0` was not needed: the sample's own u is free and four
exact steps converge (table). The distance series, the sign rule and the axis (the projected tangent) are
orogen-layout-1's.

**Value-preserving rewrites** (the orogen-layout-1 digest `0aa3d59b...` stayed unchanged through them):

- `offsetNoise(x, s)` is catalog `noise(x, 37, 19, s)` bit for bit: with integer y and z the y/z smoothstep
  weights are exactly 0 and 1, so the trilinear blend is the two x-corner hashes, and the y, z and seed `imul`
  terms fold into one XOR constant. The last (seed, cell) corner pair is cached. Pinned against `noise` on
  16,000+ interleaved points (negative x, cell boundaries, -0, extreme seeds).
- Scalar paths (no per-call arrays) in `value`, `finish`, `centreline`.

**Exact rejections.** Each returns 0 only where `value` would return 0. They are tested against
`sampleWithA0Unpruned`, which runs the solve for every belt past orogen-layout-1's own rejections: Object.is on
every field, 4 worlds x (10,000 Fibonacci + 4 x 17² rasters over 1.5 W per belt), coast gate open.
`sampleWithinWithA0` is checked against the band-filtered reference at (48 km, 32 km), (48 km, 0) and
(16 km, 0), and both solo and non-solo words are decided during the check.

- Per belt, a cap `z < max(supportZ, sqrt(1-Y²)(1-U²)/(1+U²) - 1e-9)`, with Y the tube radius.
- `beyondChord`'s bound at rho = W/R before the solve (`farFromArc`). If every displaced-arc point is at
  chord >= W/R, the projected |distance| >= R x chord >= W (the distance series is >= the chord), so value is 0.
  Its absolute margin moved from 1e-12 to 1e-9 to cover the centre-length error above (at most 6e-11 in chord).
  This also makes T1's band test slightly more conservative; the grid identity tests are unchanged and pass.
- Per 32-cell grid word, a lazily computed "solo" flag: no other belt can be positive anywhere on the word
  (cap and pole-slab bounds of the word's cells, with a rigorous cell radius). `withinFlagged` then skips
  the other-belt loop. The single-belt path shares `beyondChord`'s frame values with the solve.

**Agreement with orogen-layout-1** (`node scripts/mountain-layout-foot.mjs <orogen-layout-1 checkout> 2,3,4,5`).
The run uses 20,000 Fibonacci directions plus 8 in-belt 129² rasters spanning 2 W per world (153,128
samples, 124,136-132,542 positive), with the coast gate from `continentalA0`. Belt/index mismatches are 0
on every world at every step count. Maxima over the four worlds:

| steps | \|d distance\| | \|d alongM\| | \|d axis\| | \|d belt\| |
|---|---:|---:|---:|---:|
| 2 | 4.4e-3 m | 32 m | 1.0e-5 | 1.2e-7 |
| 3 | 4.9e-6 m | 1.06 m | 2.3e-6 | 1.6e-10 |
| **4 (chosen)** | **7.8e-8 m** | **0.097 m** | **2.3e-6** | **1.4e-12** |
| 5 | 7.8e-8 m | 0.097 m | 2.3e-6 | 1.4e-12 |

Steps 4 and 5 agree with each other, so the remaining along difference is orogen-layout-1's own: its five
central-difference steps stop up to 0.1 m short along the belt. Against a dense ternary search for the foot
point (305 off-axis Maithea samples, HARD test < 0.1 m), alongM is within 0.024 m with 4 steps. With 3 steps
it is 0.64 m, which is why 4 was chosen; the fourth step costs about 17-19 ns/sample at layout level.
The coordinator's 1% distance gate (2000 positive Maithea samples against the dense displaced-centreline
search) is unchanged at **8.79e-7 m** maximum error (4.0e-10 % of W), on the same worst sample as orogen-layout-1.

**Digest ledger.** tests/mountain-layout.test.mjs hashes 4096 Maithea `sample` values; the forward, reverse and
child-process digests agree.

| version | digest |
|---|---|
| orogen-layout-1 (with alongM, T1) | `0aa3d59b9ed979c85da729386c3531e732bb3f94dbf3b1961db2292be60ec7b2` |
| orogen-layout-2 (T2) | `dd8e6306c35553aad026290caa0f5dc12204a5aa66b16a155b1e2a44b4b53501` |

No other pin moves. The band-grid identity and conservativeness tests and the terrain mountains-assembly
identity counts pass unchanged.

**Cost** (mountains cost plan rows; CPU-quiet test slot; one process per run pinned with `start /high /affinity 0x10`;
`scripts/mountain-assembly-cost.mjs` on the T1 wiring of terrain.ts with M1+M2+M3, i.e. T1's band grid included):

- **Layout level.** `node scripts/mountain-layout-foot.mjs`, in-massif `sampleWithinWithA0` at the massif band,
  orogen-layout-1 vs orogen-layout-2 in one process: Maithea 2513 -> 304 ns, Selawyn 2464 -> 308 ns, Raiva 2543 ->
  322 ns, Lethuris 2609 -> 325 ns.
- **(C1) weighted warm resident overhead, medians of 15 fresh processes per world.** In the table, "region" is
  main / branch warm in-massif ns, and "outside" is main / branch ns.

| | Maithea | Selawyn | Raiva | Lethuris |
|---|---:|---:|---:|---:|
| massif land share | 2.27% | 1.11% | 1.72% | 1.16% |
| region | 548 / 1170 | 581 / 1150 | 587 / 1161 | 517 / 1147 |
| outside | 480 / 500 (+3.5%) | 442 / 452 (+2.0%) | 462 / 480 (+4.1%) | 442 / 451 (+3.5%) |
| **weighted (median of runs)** | **+6.58%** | **+3.44%** | **+6.23%** | **+5.13%** |
| weighted, from component medians | +6.99% | +3.65% | +5.94% | +3.66% |
| range over the 15 runs | +1.7 .. +15.2% | +1.8 .. +14.7% | +0.9 .. +9.2% | -4.0 .. +10.0% |

  Against the targets: the in-massif warm branch is 1170 ns on Maithea and 1161 ns on Raiva (<= 1,530; card
  <= 1,700). (C1) <= +8% holds on all four worlds by the median. The margin is thin on Maithea, where the outside
  branch (T1's band lookup, about +3.5%) is most of the total. A 9-process batch of the same warm code (it
  differed only in construction coverage) gave a Maithea median of +7.68%. Pooled over all 24 processes, Maithea's
  median is +7.10%, and 10 of 24 single runs exceed +8%. Single processes swing by +/-5 points, mostly in the
  outside branch.
- In one process, the fourth Gauss-Newton step costs 11-23 ns per in-massif terrain sample (Maithea, Raiva).
- **Cold (INFO, unchanged in kind).** The region is 3.8-4.0 us cold (22-24 M3 block builds). Sparse 1000 cold is
  2.2-4.1 ms per sample, still dominated by M3 block solves (decision (c), T3).
- **Grid** (`scripts/mountain-layout-grid.mjs`). Cold builds are unchanged: 25 / 30 / 14 / 30 ms, and at most
  46.1 ms over 64 bodies (Auraese; <= 50 ms). The ungridded band call now costs +34-66% instead of +83-137%.

**Acceptance re-run** (worktree, orogen-layout-2):

- `node scripts/mountain-render.mjs layout`: 64 bodies, 0 failing (all four plan gates); strict coherence p50
  min .932; distance gate 8.79e-7 m max; exit 0, 36 s.
- `tests/terrain-mountains-assembly.test.mjs`: 8/8, on the unwired tree and on the T1-wired tree. The identity
  counts and digests are unchanged. M4 R1 on the whole Raiva core is **8.594** per 1000 km² (>= 8; 275 summits).
