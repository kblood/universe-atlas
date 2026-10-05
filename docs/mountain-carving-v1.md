# Ridge-valley carving v1 (M3 / MTN-4), final design round A2

**BLOCKED. No accepted winner.** A2 passes 7/8 pooled rows, failing coherence
0.133 < 0.35. Its comb-like wall grooves and sharp active-cone transitions are
visibly geometric. B is the accepted honest comparison candidate, unchanged;
it fails slope p50 19 < 20, fill 0.096 > 0.05 and pits 1601.9 > 50.
METHOD='A' remains only the provisional metric-ranked dispatcher. A2 also misses
the report-only 1500 ns/sample target. Neither candidate is ready for MTN-6.

## Calibration ledger (frozen before candidates)

Order: read harness; implement the eroded positive control; run `--controls`; apply the
pre-registered rule; only then implement/measure A and B. No threshold value changed.
The initial control run is recorded in `test-results/mountains/M3/phase1.log` and
`eroded-control.json`. Erosion constants were chosen once: three steps, K*dt=0.8,
m=0.5, n=1, no diffusion (`mountain-eroded-control-1`). Each step fills and routes
using the harness, then applies the implicit Braun-Willett update from outlets
upstream, using descending accumulation as a topological order. Starts from filled
heights, holds outlets fixed, and re-routes between steps.

R=5194907 m; fixed unit sites (1,0,0), (0,1,0), (0,0,1), (-1,0,0).
Minimum separation pi*R/2 exceeds 1000 km. Full grids: 1025² at 125 m; measurements
use central 385² crops. Drainage medians use the harness's lower median (q), like
measureSites. Slope/flank/relief pool crop samples; peaks pool counts/area. Spectrum
averages all 1025 rows and 1025 columns, first 1024 samples of each, then bins with
floor(log2(wavelength/125)) and calls betaFromOctaves. Coherence is not measured
for this control: it requires a 386 km regional raster.

| Drainage row | Bound (unchanged) | P eroded | N un-eroded | Rule |
|---|---:|---:|---:|---|
| fill10ShareP50 | <=0.05 | 0 | 0.30197901683152795 | (a), calibrated true |
| pitsPer1000km2P50 | <=50 | 0 | 2137.7230561646147 | (a), calibrated true |

The rule is literal: P passes AND N fails => keep value, set calibrated true.
If P fails or N passes, keep value and calibrated false, report to coordinator.
Neither exception occurred. Existing main/d3 rationale numbers are preserved.

| Other control metric | P | N |
|---|---:|---:|
| slope p50 degrees | 18.621496945996842 | 27.506003288951234 |
| area >30 degrees % | 29.92760193334197 | 42.827853485946456 |
| flank p50 degrees | 11.234175430381882 | 14.665198560452614 |
| 8 km relief p50 m | 996.8904565124772 | 1654.02921012457 |
| resolved prom>=300 peaks/1000 km² | 1.7271040647664024 | 13.493000505987519 |
| beta 0.5–8 km | 1.6189981688619026 | 2.1020939856796677 |

This is a drainage positive control, not a claim that erosion passes every M3
shape criterion. Hillshade and flow PNGs are visual-advisory only.


## API and ownership

The unchanged exports are MOUNTAIN_CARVING_VERSION='mountain-carving-1',
MOUNTAIN_CARVING, CARVING_BANDS, carvingAM, carvingBM and ridgeValleyCarvingM.
Inputs: (alongM, acrossM, halfWidthM, envelopeM, belt, seed), finite chart metres,
positive half-width, signed across coordinate and uint32 seed. Output: pre-radius-scale
carving delta. Both candidates return literal +0 for belt===0 or envelopeM<=0,
and always keep -envelopeM <= carving <= 0. The production sampler is unwired.

Levels 0..4 declare 16, 8, 4, 2 and 1 km, all frozen. These are generating
wavelengths, not strict Fourier support; projection, minima and clipping produce
shorter harmonics. Only levels 0..2 generate cones in A2. Levels 3..4 are wall detail.
All constants are pinned in the unit test:

```json
{
  "METHOD": "A",
  "JITTER": 0.45,
  "WALL_SLOPE": 0.65,
  "WALL_GAIN": 2.2,
  "WALL_CURVE_M": 1500,
  "WALL_LINEAR_SHARE": 0.35,
  "CHANNEL_HALF_WIDTH_M": 62.5,
  "FLOOR_BASE": 0.025,
  "FLOOR_RISE": 0.12,
  "HEAD_RISE": 0.3,
  "FLOOR_EPSILON": 0.002,
  "TRUNK_DIAGONAL_SHARE": 0.08,
  "DETAIL_2KM": 0.5,
  "DETAIL_1KM": 0.3,
  "DETAIL_CAP_M": 20000,
  "B_GAIN": 2.2,
  "B_DECAY": 0.44,
  "B_DAMP": 0.02,
  "B_WIDTH": 0.25,
  "B_LENGTH": 1.4
}
```

Only src/mountain-carving.ts, tests/mountain-carving.test.mjs,
scripts/mountain-render-carving.mjs and this document changed this round.
Outputs are under test-results/mountains/M3/. Phase 1 builder, thresholds,
calibration flags and rationale remain frozen. B's function and shared hash/point
helpers are byte-identical to the round-1 snapshot; B constants and jitter are unchanged.
No dependencies, .git writes, browser, GPU, downloads, terrain changes or other pins.

MTN-6 still needs M1's missing along coordinate, stable per-belt seeds, chart/seam
validation, and actual M2-envelope measurements. M1 exposes axisDistanceM, not alongM.

## A2: three coarse cone levels and two active-wall detail bands

The 2D signed chart retains .45-cell independent x/y jitter and separate side
salts. Each 16 km trunk head selects the next outward cell: dx=0 for 92% of the
hash interval, and each diagonal for 4%. Jitter supplies sinuosity; shared
receivers permit merges. Outermost points clip to the belt margin with zero floor.
Grid rows are strictly separated despite jitter, so trunk receivers are outward.

At 8 and 4 km, each head projects onto the nearest of the four coarser segments
in its 2x2 parent neighbourhood. Joins can occur part-way along the parent.
Normalized floors start at .025+.12*(1-abs(y)/W)+.3*level; a child's floor is
raised to at least its interpolated parent floor+.002. Interior normalized
floors strictly decrease downstream and agree with the parent at the junction.

Plain nested loops build three 5x5 patches, 75 segment evaluations at most.
Two preallocated Float64Array banks hold 25*6 values each (2400 bytes total):
head xyz and receiver xyz. Each bank is fully overwritten before it is read;
level 2 needs no writes because it has no children. Halving a child cell index
with .45-cell jitter and a 2x2 parent projection keeps every dependency inside
the preceding +/-2 patch. There is no recursion, transient allocation, register
switch, or previous-call cache. Forward/reverse/child digest and 257 poisoned
scratch calls confirm call-order independence. The old --registers mode is removed.

For distance r from the closest segment point c, d=max(0,r-62.5).
The strictly increasing wall outside the floor corridor is

`w_k(d) = .65 * 2.2^k * d * (.35 + .65*d/(d+1500))`.

The cone search finds the minimum of envelope*zeta(c)+w_k(d), retaining its
segment, projection t and wall height. After this single search, levels 3 and 4
carve only that active cone. Arc a=startOffset+t*segmentLength, where startOffset
is a fixed segment hash in [0,16000]. The two phase jitters are fixed segment
hashes scaled by 2000 and 1000 m. Thus a and phase are constant along a normal ray
to the segment (also along an endpoint ray); gullies run down the wall toward it.
Offsets need not agree across segment junctions. They do not add another cone search.

Let p(u)=16*v*v with v=u*(1-u), u=fract(phase), so 0<=p<=1 and the periodic
profile has smooth crests. With L=20000 m and weights b3=.5, b4=.3:

`amp_k(d) = b_k * L*w(d)/(L+w(d))`,
`g_k = -amp_k(d)*p((a+jitter_k)/lambda_k)`.

Amplitude is zero on the floor, increases with distance and saturates. The
returned delta is max(0,min(envelope,activeCone+g3+g4))-envelope. Bounds hold
regardless of search completeness or drainage. The envelope is applied after
detail, so the active cone can carve a previously envelope-clipped wall.

### Derivative inequality and its limits

For a fixed segment/normal ray, with w'>0:

`sum_k |dg_k/dd| <= (.5+.3)*L^2/(L+w)^2*w' <= .8*w' < w'`.

Hence w+sum(g) is strictly increasing away from the floor: detail cannot reverse
a single wall. On the specified ramp, |dEnvelope/dd|<=.1 and the per-level
normalized-floor bound is Z_k=.145+.3*k. A stronger bound holds for every d>=0:

`(1-.8)*w'_k(d) - .1*Z_k > 0`.

At d=0 these lower bounds are .031, .0556 and .14572 for levels 0,1,2;
w' increases thereafter. This reserves the worst envelope gradient contribution.
The unit test uses the actual production private helpers via a test-only export,
checks 10001 periodic-profile samples and 198531 finite-difference
wall samples over three levels, 0.01..16384.01 m and 129 arc phases.
Maximum detail/wall derivative bound=0.7999998179977776; minimum observed
composed radial derivative after envelope allowance=0.05365719061828364.
Doubling the detail at coincident gully maxima gives derivative
-0.13682935068604074, so the negative control fails the condition.

**This is a local active-wall proof, not a global pit-free certificate.**
Selecting the raw minimum and then applying different segment phases can make
height jump at active-cone boundaries. Along-channel envelope variation also
means decreasing normalized floors alone do not prove decreasing absolute floors
for arbitrary supplied envelopes. Finite patches and D8 resolution remain limits.
The final raster has measured fill .004 and 33.2 strict pits/1000 km2; neither is
silently relabelled zero. The requested global construction guarantee is unresolved.
Changing to a minimum of all detailed cones would be a different design and is not
silently substituted for the mandated active-cone method.

## Unchanged B: oriented compact gully kernels

Each octave sums compact elliptical kernels from a 4x4 jittered-point patch.
Every point has independent 2D phase through its x/y location. The long axis
follows the carried downhill gradient, initialized from the envelope's across
slope. The transverse and longitudinal radii are .25 and 1.4 cells. For local
elliptical radius squared r2<1, the kernel is (1-r2)^3; it vanishes outside.
The 4x4 neighbourhood covers its support including .45-cell jitter.

Octave amplitude is 2.2*.44^level, damped by slope/(slope+.02). Kernel values
and analytic x/y derivatives accumulate; the rational pure-carving transform
H=envelope/(1+cut) carries the product/quotient gradient into the next octave.
The envelope derivative estimate is exact on the linear fixture away from the
axis and margin, but is only an approximation for a general M2 profile.

**Derivative limitation:** each octave differentiates its kernels with orientation
held fixed, the local erosion-filter convention. It does not differentiate the
orientation feedback or slope-dependent damping through all earlier octaves.
Thus the carried vector is an analytic kernel-gradient estimate, not the exact
total gradient of the composed scalar field. This remains an implementation
limitation against a strict full-gradient interpretation of the redesign brief.
No drainage guarantee is claimed; the measured pit/fill failures are retained.

## Final-round tuning order

Phase 1 was frozen before this round and remained unchanged. A1 source, doc and
report were archived under round1/. The initial A2 used head rise .1, wall gain
1.4, detail weights .35/.15 and cap 1000: site-0 beta 3.85 and coherence .103.
A nine-setting wall-gain/detail-cap sweep improved spectrum, but not coherence.
A second nine-setting head-rise/wall-gain sweep retained head rise .3, wall gain
2.2, weights .5/.3 and cap 20000. Site-0 coherence .174 remained below the gate;
all eight sites then gave .133. No B tuning occurred. Trial logs and JSON are in
a2-initial.log, a2-detail-sweep.json, a2-head-sweep.json and a2-eight-trial.log.

## Acceptance, structure and retention methods

The shared fixture is unchanged: R=5194907 m, across=R*asin(d.y),
along=R*atan2(d.z,d.x), W=30000 m, envelope=3000*max(0,1-abs(across)/W),
belt=1 strictly inside W and 0 outside. Sites k=0..7 are centred at along=k*1e6;
seed=730201+round(along/1e6). No sampled window crosses a seed-band boundary.

measureSites defaults remain 385x385 at 125 m, regional 193x193 at 2 km and
four spectral directions. All metrics come from the shared harness. Steep-core
percentage pools only abs(across)<=19500 pixels; slopes output index k maps to
i=1+k%(n-2), j=1+floor(k/(n-2)). Raster y is across; x points in decreasing along.
Core slope p50 is also reported; other acceptance rows use whole-raster populations.
Context envelope/alpine/dome use the same eight sites; P uses its four frozen
central control crops and has no regional coherence measurement.

The existing pure harness helper, carvingStructure, composes flowAccumulationD8
and defines the report-only diagnostics. Channel cells have accumulation>=16
(0.25 km2 at 125 m). A head has zero incoming channel donors; a confluence has
at least two. All qualifying cells are counted, including the raster border; crop boundaries
can therefore affect head/confluence counts. Densities use the harness area convention (n*step/1000)^2 = 2316.015625 km2.
All four P/N crops are rebuilt, and all eight full-grid hashes must match the
frozen calibration before their diagnostics are accepted.

Mirror correlation is raw Pearson correlation of carving(x,y) and carving(x,-y)
on every raster pixel. It is not detrended, divided by the envelope, or masked
to the core. The raw values remain substantially positive despite independent
side salts; both samples share the symmetric envelope's amplitude trend. No
near-zero correlation claim is made. Uncarved share counts delta===0 exactly
among all core raster pixels (120505 per site). These diagnostics have no gates.

Coast checks use all eight 193x193 rasters at 500 m, including the zero-envelope
margin. Retention uses the unchanged 33x33 point lattice and 97x97 truth grid on
L6/L8 gnomonic squares. **The production nonnegative peak correction is omitted.**
L6 and L8 cover different geographic extents, so their percentages need not be
monotonic. Benchmark inputs are eight 385x385 candidate rasters and the same
number of production Maithea Fibonacci samples, median of five rotated rounds.

## Final A2/B results

CONTRACT acceptance exit **1**. A in report.json, filenames and the API means A2.
P/F below means pass/fail against the unchanged bounds. Context P is the frozen
four-site erosion control; its coherence is not measured, not a claimed pass.

| Row (bound) | A2 provisional | B | Envelope | Alpine | Dome | Eroded P |
|---|---|---|---|---|---|---|
| slope125Over30 >= 25 | 39.186909 P | 33.433400 P | 0 F | 42.300000 P | 0 F | 29.927602 P |
| slope125P50 >= 20 | 21.500000 P | 19 F | 5.700000 F | 27.300000 P | 2.700000 F | 18.621497 F |
| flank500mP50 >= 12 | 20.100000 P | 15.200000 P | 3 F | 14.800000 P | 0.300000 F | 11.234175 F |
| relief8kmP50 >= 1500 | 1984 P | 1616 P | 787 F | 1658 P | 453 F | 996.890457 F |
| beta500mTo8km between [2,2.6] | 2.150000 P | 2.030000 P | 3.910000 F | 2.100000 P | 3.990000 F | 1.618998 F |
| fill10ShareP50 <= 0.05 | 0.004000 P | 0.096000 F | 0 P | 0.327000 F | 0.029000 P | 0 P |
| pitsPer1000km2P50 <= 50 | 33.200000 P | 1601.900000 F | 0 P | 2061.300000 F | 12.500000 P | 0 P |
| coherence40kmWindowP50 >= 0.35 | 0.133000 F | 0.384000 P | 1 P | 0.139000 F | 0.400000 P | not measured |

Core slope p50: A2=23.579315964199697, B=22.026430425428625 degrees.
Whole-raster >30 degrees: A2=35.8%, B=28.2%.

INFO structure diagnostics, per-site populations:

| Field / site | Mirror correlation | Heads / 1000 km2 | Confluences / 1000 km2 | Uncarved core % |
|---|---|---|---|---|
| A2 / 0 | 0.247682 | 1028.058695 | 911.910946 | 28.008796 |
| A2 / 1 | 0.306822 | 1002.152134 | 895.935234 | 25.226339 |
| A2 / 2 | 0.036758 | 1142.047563 | 993.516613 | 28.911663 |
| A2 / 3 | 0.209709 | 1005.606342 | 904.570754 | 26.738310 |
| A2 / 4 | 0.376181 | 1004.311014 | 906.729634 | 20.279656 |
| A2 / 5 | 0.327106 | 990.062405 | 895.071682 | 26.789760 |
| A2 / 6 | 0.455447 | 962.428740 | 867.006241 | 23.789884 |
| A2 / 7 | 0.084703 | 1044.897959 | 936.522179 | 32.874984 |
| B / 0 | 0.537763 | 1007.765222 | 900.684770 | 0.128625 |
| B / 1 | 0.684405 | 1006.469894 | 908.024962 | 0.092112 |
| B / 2 | 0.459349 | 1000.856806 | 883.845505 | 0.094602 |
| B / 3 | 0.586372 | 1005.174566 | 892.912801 | 0.175926 |
| B / 4 | 0.685064 | 1013.810086 | 908.024962 | 0.170947 |
| B / 5 | 0.741037 | 1009.924102 | 899.821218 | 0.367620 |
| B / 6 | 0.696852 | 1036.262439 | 933.931523 | 0.102070 |
| B / 7 | 0.448303 | 1005.174566 | 900.252994 | 0.285465 |
| P / 0 | not measured | 965.019396 | 895.503458 | not measured |
| P / 1 | not measured | 918.819362 | 860.529600 | not measured |
| P / 2 | not measured | 921.841795 | 865.710912 | not measured |
| P / 3 | not measured | 924.864227 | 863.983808 | not measured |
| N / 0 | not measured | 1132.980266 | 1006.469894 | not measured |
| N / 1 | not measured | 1075.122280 | 961.133412 | not measured |
| N / 2 | not measured | 1107.505482 | 1006.469894 | not measured |
| N / 3 | not measured | 1046.625063 | 947.748356 | not measured |

Lower site medians (harness q, no diagnostic gates):

| Field | Mirror correlation | Heads / 1000 km2 | Confluences / 1000 km2 | Uncarved core % |
|---|---|---|---|---|
| A2 | 0.247682 | 1004.311014 | 904.570754 | 26.738310 |
| B | 0.586372 | 1006.469894 | 900.252994 | 0.128625 |
| P | not measured | 921.841795 | 863.983808 | not measured |
| N | not measured | 1075.122280 | 961.133412 | not measured |

P/N mirror and uncarved share are not applicable. Raw counts and denominators are in report.json.

| Safety | Samples | Outside belt | Negative heights | Outside +0 violations | Positive carving |
|---|---|---|---|---|---|
| A2 | 297992 | 111168 | 0 | 0 | 0 |
| B | 297992 | 111168 | 0 | 0 | 0 |

INFO peak-retention proxy, production peak correction omitted:

| Field | L6 retained % | L8 retained % |
|---|---|---|
| envelope | 100 | 100 |
| A2 | 81.714437 | 82.085987 |
| B | 80.387473 | 73.367834 |
| alpine | 59.620488 | 81.581741 |

INFO benchmark, 1185800 samples per function per round, median of five rounds:

| Sampler | ns/sample | Terrain ratio | Ratio x 10% belt share |
|---|---|---|---|
| A2 | 2627.731911 | 5.668278 | 56.682777% |
| B | 604.387586 | 1.303724 | 13.037238% |
| terrain | 463.585596 | 1 | — |

A2 misses <=1500 ns/sample, despite falling from A1's 18323.844 to 2627.732.
The weighted proxies of 56.682777% and 13.037238% both exceed +8%; these are not
measured assembled slowdowns. No CPU-quiet slot was acquired; coordinator confirmation
under its slot remains outstanding. The source was held fixed throughout the five
benchmark rounds and its start/end SHA-256 matched.

## Image review

A2 hillshade: A2 has smooth trunk bands, repeated comb-like wall gullies, rounded coarse tributary ends and sharp active-cone transitions; conspicuously geometric, not an eroded range.

B hillshade: Irregular bending near-vertical gullies and rough side detail alternate with broad smooth slopes; strong preferred direction and measured drainage failures remain.

I inspected both hillshades, both flow maps and the frozen eroded-control hillshade.
A2's flow map has regular combs and polygonal junctions, unlike the irregular control.
The geometric artefact independently prevents DONE under the final-round brief.

Four candidate PNGs were regenerated at 385x385 (48 km):
[A2 hillshade](../test-results/mountains/M3/A-hillshade.png),
[A2 flow](../test-results/mountains/M3/A-flow.png),
[B hillshade](../test-results/mountains/M3/B-hillshade.png),
[B flow](../test-results/mountains/M3/B-flow.png).
P/N hillshade/flow PNGs were also regenerated and all eight frozen control raster
hashes matched during the full acceptance run. No Phase 1 recalibration was done.

## Verification and reproducibility

- HARD carving unit: 10/10 pass, exit 0; process wall **610.8257 ms** (<2 s), Node duration 565.2405 ms. No timing assertion.
- HARD shared metrics/envelope tests: 24/24 pass, exit 0.
- HARD npx tsc --noEmit: exit 0.
- Digest: 31f7dfacfb12123041b9f1b6cf110052b35123863c74aff53adbf4a3d43a39ec, identical forward/reverse/child.
- New constant and reduced metric pins recorded in tests/mountain-carving.test.mjs.
- Arithmetic audit with negative controls passes. Scratch poisoning and dense derivative negative control pass.
- Source SHA-256: d55f285e0985a7aafc5bca0450efe227ed7c83763243c38806eede6b1b5f37ae.
- Evidence: report.json, a2-acceptance.log, benchmark.json, a2-benchmark.log,
  a2-unit.log, a2-unit-time.json, a2-shared-tests.log, a2-tsc.log.

Commands: node scripts/mountain-render-carving.mjs (exit 1); same with --bench
(exit 0); node --test tests/mountain-carving.test.mjs; node --test
 tests/mountain-metrics.test.mjs tests/mountain-envelope.test.mjs; npx tsc --noEmit.
No full suite, browser, GPU, download, push or .git write.

## Rejected attempts (historical, not current results)

### A0: first straight-fan attempt

The first A scored 31.812077% steep core, 20.4 degrees median slope, 18.7 degrees
flank, 1992 m relief, beta 2.53, fill 0, pits 0 and coherence .637 (8/8 rows), but
was exactly mirrored straight fans. Every tributary converged near its parent's
margin endpoint. Its benchmark was 9336.066 ns/sample, 13.9446x terrain. First B
was parallel cosine grooves: 35.509243%, 14.8 degrees, 18 degrees, 1117 m, beta
2.13, fill .020, pits 51.8, coherence .884 (5/8), 317.944 ns/sample. These results
were metric gaming, not a completed range. The coordinator rejected both.

### A1: round-1 five-level cones

A1 scored 43.808027% steep core, 26.4 degrees median slope, 21.7 degrees flank,
1756 m relief, beta 2.51, fill 0, pits 47.5 and coherence .086 (7/8 rows).
Cost 18323.843903 ns/sample, 40.123571x terrain. The coordinator rejected its
smooth flat trunk bands, 1–2 km cone clusters and unreviewable 49-register switches.
The old A1 design text follows verbatim for review; it does not describe A2.

#### Archived A1 design

Each level has a square jittered grid in the signed chart. Points move up to
0.45 cell in each coordinate; positive and negative cell rows have independent
hash salts. Both sides are evaluated near the divide. Coordinates are never
folded with abs(acrossM). abs(y) is used only for drainage direction and floors.

Each trunk chooses one of the three points in the next outward row. The score
is outwardDistance/(cellSize+abs(dx)) + 0.85*hash; increasing abs(y) makes this
root graph acyclic, with shared receivers and wandering piecewise-linear trunks.
Points reaching the belt margin are clipped to it and have zero floor; points
outside the support become degenerate margin segments, not interior channel heads.

A finer head chooses the nearest projection onto the four coarser segments in
the 2x2 cell-centre neighbourhood around it. Junctions are normally part-way
along those segments. This is a genuine multilevel graph, with 2D heads; no
fan-to-margin shortcut and no recursively multiplying parent search.

The initial normalized head floor is
0.025 + 0.12*(1-abs(y)/W) + 0.10*level. A child raises that to at least its
parent's interpolated junction floor + .002. A segment interpolates its two
floor values and matches the parent at its junction. Interior normalized floors
strictly descend along each directed edge. **This is not a proof that the
sampled surface is pit-free:** multiplying by the spatially varying envelope,
nearest-point projection, finite neighbourhoods and D8 discretization require
measurement. The final raster has small but nonzero strict pit density. A
continuous no-depression guarantee has not been established for arbitrary inputs.

The composed height is min(envelope, envelope*zeta + wall*profile(d)), with
d=max(0,distanceToSegment-125), wall=.65*1.65^level and
profile(d)=d*(.1+.9*d/(d+1500)). This profile is strictly increasing for positive
d and has curved walls instead of planar cones. The flat 125 m corridor helps
D8 resolve diagonal channels, but does not remove every discrete pit.

Evaluation builds levels bottom-up. Each level visits at most 9x9 heads and
retains the central 7x7 dependency patch in two banks of 49*6 scalar registers.
The central coarser patch contains all four parents of every visited child:
halving a +/-4 child offset, including jitter and cell parity, gives +/-3.
Root receivers use three candidates; child projections use four. There are at
most 405 segment constructions and 1539 receiver/projection candidates per call,
with no recursive multiplication. Margin nodes take an inexpensive branch;
outer cells not needed by descendants can be rejected by a conservative distance
lower bound. This still misses the 1500 ns/sample aim by a large margin.

The search halo was checked for continuity at all five cell sizes on the 3 km
fixture. Pure-carving bounds apply independently of the halo. Arbitrarily large
envelopes are not certified for search completeness or continuous drainage.
The mechanical register blocks can be regenerated with --registers; that mode
changes only the scalar declarations and load/store/copy switches.

