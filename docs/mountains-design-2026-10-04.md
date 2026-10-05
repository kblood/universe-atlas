# Mountains design (2026-10-04)

Status: DESIGN, branch `design/mountains` (from main `b8d38d3`). Nothing here is wired into the app,
and no terrain output changes on this branch. The branch adds this document and two Node-only
prototype scripts. Owner decision 2026-10-04: mountains get their own design instead of the held
`round2/relief-present` change; Luna verdicts are advisory and do not block alone; testing is
element-first.

Owner decisions 2026-10-05 (explicit, recorded verbatim):

> (a) the M3 coherence row and the M3 pit row may be CALIBRATED against an eroded positive control
> (coherence measured detrended/band-passed or otherwise corrected so a physically eroded range
> passes while isotropic noise and straight mirrored fans (the rejected A0) fail; pit row made
> resampling-tolerant because the planet sampler never lands on a construction grid). Document
> old/new rows with numbers, negative controls proving the new rows still have teeth. All other rows
> and all 17 LOD pins/goldens stay unchanged.
>
> (b) M0: the 800 m multiplicative colour grain in terrain.ts (~line 587) is moved/changed inside the
> assembly step MTN-6 (which owns terrain.ts) with TERRAIN_VERSION bump and a deliberate golden re-pin
> (old/new digests documented); M0 is then re-run against the new terrain without any threshold
> change. No other loosening is authorised.

Decision (a) is applied in section 2.3 and `docs/mountain-m3-calibration-v1.md`. Decision (b) belongs
to MTN-6 and MTN-1 and is not applied by the M3 element.

Further owner decisions 2026-10-05 (explicit, recorded verbatim as the coordinator relayed them):

> (a) M3 coherence/pit rows calibrated (merged). (b) the 800 m colour grain is changed in its own
> small step with TERRAIN_VERSION bump + deliberate golden re-pin + update of the two colour tests
> that hard-code the old .88/.24 grain (old/new digests documented). (c) M3 cost judged on warm
> resident cost. (d) assembly in two steps. (e) NEW: the 8 failing LOD class pins when belts are
> wired are handled by FREEZING the stratified tile selection (so tile re-picking cannot move the
> pins; document how) AND CHANGING the M2 envelope so belts do not move the class boundary in
> snowline/treeline tiles (Maithea L8 name/carriedName); NO pin is loosened or repinned. (f) NEW:
> the convex blend lowering heights at belt edges (up to 3 km, 23-45 directions per world) is
> accepted ('uplift inside belts with fade-out at the edge'). (g) M3's relief scales with belt width
> (lattice 2w/480): give M3 a FIXED carving width tiled across wide belts so Selawyn's 220 km belt
> and low-tau belts reach M4 R1 (>=8 peaks/1000 km2), measured on the real parameters of all four
> worlds.

Decision (b) is applied as its own step, **step G** (`terrain-1.8.1-grain`), before any belt is
wired: `docs/mountains-grain-step-g-2026-10-05.md`. Decisions (d)-(g) belong to the assembly steps
that follow it.

Prototype scripts (pure Node, no browser, no GPU, not registered in `npm test`):

- `scripts/mountain-metrics.mjs` measures the mountain elements on the 4 standard worlds. Its
  `--root` option reads another checkout's `src/` read-only, and `--synthetic alpine|dome` measures a
  calibration control instead of Atlas terrain.
- `scripts/mountain-lod-footprint.mjs` re-measures the lod-consistency colour and class rows on
  the test's own 12-tile selection, first with point samples and then with footprint means.

Evidence is under `test-results/design-mountains-2026-10-04/`: the metrics and footprint JSON, the
logs, and hillshade PNGs.

Words used below: **main** means `b8d38d3`. **d3** means the held RELIEF-PRESENT design 3
(`0893ad2`), read read-only from `universe-atlas-wt/r2-relief-present`. **Site** means one of the
8 highest well-separated land samples per world: the highest land samples of a 20 000-direction
Fibonacci set, each at least 300 km from the others. The sites are picked from each field's own
heights. **Nyquist(L)** is 2 x tileEdge(L)/32, the shortest wavelength a level-L height lattice can
hold. **Colour Nyquist(L)** is 2 x tileEdge(L)/128, the same for the 128-texel colour texture.

How the site numbers aggregate (as `scripts/mountain-metrics.mjs` computes them):

- slope, crest and relief percentiles pool all pixels of the 8 sites;
- the spectrum averages power over the sites before taking RMS;
- peak density is the total peak count over the total raster area;
- drainage numbers are the median of the per-site values;
- the synthetic controls use 4 sites, not 8.

## 1. Diagnosis

### 1.1 Why mountains read as soft, low ridges (a geometry fault, not only presentation)

Luna's no-clouds frames fail too ("only low, soft ridges", "gently rolling plain";
`test-results/round2-2026-10-04/final/luna/summary.md`). Haze, tone mapping and clouds make it
worse (owner items A4 and A8), but the field itself is soft. The table below gives the measured
values for main, d3 and two synthetic controls. The controls are not Atlas terrain. `alpine` is a
crest-weighted ridged multifractal with octaves from 64 km down to 250 m and an amplitude gain of
0.71 per octave, which gives a spectral exponent near 2. `dome` is made of smooth 40 km swells.

| Metric (8 sites, 48 km raster at 125 m) | Maithea main / d3 | Selawyn main / d3 | Raiva main / d3 | Lethuris main / d3 | alpine control | dome control |
|---|---|---|---|---|---|---|
| slope at 125 m, p50 (deg) | 11.3 / 16.3 | 8.4 / 10.8 | 4.7 / 9.5 | 10.8 / 16.4 | 27.4 | 5.3 |
| slope at 125 m above 30 deg (% of area) | 2.2 / 17.4 | 0.2 / 7.7 | 0.2 / 5.0 | 1.8 / 18.7 | 42.7 | 0 |
| crest flank angle at 500 m, p50 (deg) | 6.5 / 9.6 | 4.9 / 7.1 | 2.8 / 5.5 | 6.3 / 9.5 | 14.7 | 0.4 |
| relief within 8 km, p50 (m) | 1466 / 1739 | 1000 / 1200 | 867 / 1102 | 1410 / 1808 | 1767 | 929 |
| resolved peaks with prominence >= 300 m per 1000 km² (border-censored) | 1.2 / 6.4 | 0.5 / 2.6 | 0.3 / 1.2 | 1.2 / 5.9 | 12.0 | 0 |
| spectral exponent beta, 0.5-8 km | 3.36 / 2.96 | 3.37 / 2.99 | 3.49 / 2.78 | 3.41 / 2.96 | 2.14 | 3.92 |
| RMS height in the 1-2 km octave (m) | 16 / 31 | 12 / 23 | 6 / 21 | 16 / 32 | 54 | 1 |
| RMS height in the 2-4 km octave (m) | 36 / 58 | 28 / 46 | 15 / 36 | 35 / 65 | 75 | 2 |
| closed depressions: land with fill > 10 m | 0.142 / 0.282 | 0.228 / 0.321 | 0.052 / 0.232 | 0.127 / 0.300 | 0.308 | 0 |
| pits per 1000 km² | 378 / 633 | 453 / 570 | 147 / 668 | 319 / 700 | 2108 | 0 |
| gradient orientation coherence, 40 km window, p50 | 0.298 / 0.132 | 0.239 / 0.130 | 0.679 / 0.153 | 0.262 / 0.120 | 0.135 | 0.399 |
| p99 land (m), 20 000 directions | 4358 / 4651 | 3292 / 3626 | 2475 / 2673 | 4060 / 4489 | (n/a) | (n/a) |

Four causes follow from the code (`src/terrain.ts:500-546`, `src/planet-landforms.ts:23-33`) and
from the numbers.

1. **The height sits at the wrong scale.** The ridge belt term `tau*1.3*2800*ridges*ss(.35,.8,ridges)`
   (up to about 2.9 km on Maithea) reads value noise `n(d,30,7)` in direction space. Its cells are
   R/30 wide: 173 km on Maithea, 67 km on Raiva, 300 km on Lethuris. A crest of about 2.9 km spread
   over tens of kilometres has flanks of a few degrees.
   - On main, the RMS of the 64-128 km octave on Maithea is 601 m. The 1-2 km octave is only 16 m.
   - The km-scale relief comes only from the detail window (hills of 620 m at 6.5 km), and from
     landforms (1650 m at 14 km). Both are scaled again by `tau` (0.46-0.79) and by the upland gate.
2. **The spectrum falls too steeply below 8 km.** beta is 3.36-3.49 on the four worlds. The
   synthetic alpine control has 2.14. The commonly quoted value for Earth topography is about 2
   (literature, not measured here). At the 1-2 km scale, main has 16 m of RMS where the control has
   54 m. This is the measured form of "soft".
3. **The relief has no valley organisation.** The crest flank angle is 6.5 deg on main, against
   14.7 deg on the control. The main hillshade (`png-main/Maithea-site0-48km.png`) shows blob- and
   worm-shaped cells: the ridged value-noise isolines that §9 of `docs/terrain-relief-v1.md` already
   calls a maze. There is no drainage hierarchy and no V-valleys between the crests.
4. **Presentation stacks on top.** The causes are haze, ACES tone mapping, clouds and the arbitrary
   horizon poses (A4, A5 and A8). They are real, but they are separate elements (section 2.7).

What d3 changed, measured:

- It fixed part of causes 1 and 2. beta fell to 2.78-2.99, the area above 30 deg rose to 5-19%,
  and resolved peak density rose by about 4-5x.
- It made cause 3 worse. Pits rose by 1.3-4.5x and fill > 10 m rose by 1.4-4.5x.
- Linear organisation collapsed: coherence fell from 0.24-0.68 to 0.12-0.15, which is the level of
  the isotropic control.
- Its hillshade (`png-design3/Maithea-site0-48km.png`) shows rugged islands in smooth soft plains,
  not ranges with valleys.
- It also changed the landform term on all land above about 300 m of raw base height, not only
  inside belts. That is the most likely reason SITE_A, a lowland forest site, fell from 280.2 m to
  155.5 m. The isolation evidence: the landform-only variant `oroOff` broke 9 checks on its own
  (`relief-present/fix1/lod/`).

A useful negative result: the synthetic alpine control passes every slope, spectrum and peak
threshold, yet its hillshade (`png-synthetic/synthetic-alpine-site0-48km.png`) is rough noise, not
a range. Its drainage metrics (31% closed depressions, 2108 pits per 1000 km²) and its coherence
(0.135) catch this. So **spectrum and slope alone can be gamed by noise**.

Prominence is border-censored: a peak counts only if its component never reached the raster
border before its key saddle. Otherwise a higher col may exist outside the 48 km raster, so its
value would be an upper bound. The first draft of this document counted those peaks; Astra's review
caught it, and the numbers above are the censored ones (roughly half the uncensored counts). The element set below
includes drainage and layout metrics for that reason.

### 1.2 Why each prior attempt broke the LOD pins: all three suspects, measured

The owner asked which of three suspects is to blame: pins that are specific to relief, high-frequency
energy at coarse LOD, or the lack of footprint filtering. Each is measured below.

**(a) The pins are regression snapshots with almost no headroom, taken on a selection that moves
with the field.** `SHIPPED_CEILINGS` (`tests/lod-consistency.test.mjs:50-60`) holds main's own
measured values, rounded up by 0.03-0.05. Examples: Maithea L6 RGB has a pin of 26.3 against 26.26
measured; Lethuris L6 RGB has 39.2 against 39.17; Lethuris L6 forest has 1.8 against 1.76.

The 12 tiles come from `stratifiedEdgeDirections(ts, cls)`, which reads the field under test, so a
new field also re-picks the tiles. Only 3 of the 12 are range tiles; the other 9 are snowline,
treeline and coast. These pins are not about mountains. They are upper bounds at main's values, so
a change can pass by improving a row. But any change that adds colour or class variation inside the
selected tiles has only about 0.04 of room before it fails. H10 (`main + 0.1*orogen`) passed
because it is close to main.

**(b) Height energy at wavelengths the coarse level cannot hold rose.** The measurement is the
Hann-windowed spectrum of 128 km transects through the mountain sites (`E7_spectrum.aboveNyquist`
in the JSON). It gives an estimate of the RMS height at wavelengths shorter than the height-lattice
Nyquist(L6) and the colour Nyquist(L6). The estimate splits the straddling octave by uniform power
in log wavelength; it is not an FFT-bin integral.

| World | Nyquist(L6), lattice / colour | main lattice / colour | d3 lattice / colour | ratio d3/main, lattice / colour |
|---|---|---|---|---|
| Maithea | 7.97 / 1.99 km | 85 / 17 m | 139 / 35 m | 1.64 / 2.1 |
| Selawyn | 13.1 / 3.28 km | 110 / 27 m | 168 / 47 m | 1.53 / 1.7 |
| Raiva | 3.07 / 0.77 km | 14 / 3 m | 37 / 11 m | 2.64 / 3.7 |
| Lethuris | 13.8 / 3.45 km | 154 / 36 m | 236 / 68 m | 1.53 / 1.9 |

Colour depends on height (snowline, treeline, slope), so the colour column is the one that bears on
the RGB rows. A point-sampled coarse texture cannot represent energy below its Nyquist; it aliases
it. The direction matches the failures: Maithea L6 RGB went from 26.26 to 33.33 (x1.27) and
Lethuris L6 RGB from 39.17 to 54.18 (x1.38).

Two limits on this evidence. The spectral sites are the highest points of each world, not the 12
LOD tiles, so the table shows the field's character in mountains, not the energy inside the tested
tiles. And it shows a contribution, not that aliasing is the only cause.

**(c) Coarse colour and class are point samples, not footprint means.** `buildTile`'s colour
texture (128 texels per tile) and its class lattice read single points. That contradicts the
contract's own reduction rule (`docs/lod-ladder-contract-v1.md` §3: "coverage-weighted mean of the
finer level"). §9 of the contract already flags it: "They need footprint-filtered colour and class
grain".

`scripts/mountain-lod-footprint.mjs` repeats the test's colour, snow and forest rows on the test's
own tiles. It first uses point samples, which reproduce the test's reported RGB p99 values exactly
(26.26 / 3.55 / 39.17 / 11.05 on main and 33.33 / 4.34 / 54.18 / 11.79 on d3), and then the mean of
K x K sub-samples over each texel or lattice cell.

This is a **report-proxy, not production validation**. Like the report script it mirrors, it reads
unquantised sampler colour at `x/res`. The production `buildTile` uses `(x-.5)/textureSize`, byte
quantisation, gutters and a wet-substrate branch. The prototype also zeroes snow below sea level,
where `crossPair` passes the underwater classifier weight through, so coastal snow cells can
differ. It does not emit the `name` / `carriedName` rows or ocean disagreement. MTN-1 must validate
in `buildTile` itself.

| Row (12 stratified tiles) | main point | main footprint K=4 | main footprint K=2 | d3 point | d3 footprint K=4 | d3 footprint K=2 | pin |
|---|---|---|---|---|---|---|---|
| Maithea L6 RGB p99 | 26.26 | 21.98 | 22.53 | 33.33 | 25.99 | 26.82 | 26.3 |
| Maithea L6 snow % | 1.25 | 1.08 | 1.12 | 1.01 | 0.89 | 0.75 | 1.3 |
| Maithea L6 forest % | 0.42 | 0.11 | 0.10 | 1.04 | 0.55 | 0.51 | 0.5 (plan) |
| Maithea L8 RGB p99 | 3.55 | 3.89 | 3.81 | 4.34 | 4.81 | 4.71 | 4 (plan) |
| Lethuris L6 RGB p99 | 39.17 | 25.07 | 26.33 | 54.18 | 40.09 | 40.59 | 39.2 |
| Lethuris L6 snow % | 2.12 | 1.36 | 1.36 | 2.95 | 2.08 | 2.17 | 2.2 |
| Lethuris L6 forest % | 1.76 | 0.52 | 0.77 | 5.89 | 2.56 | 3.34 | 1.8 |
| Lethuris L8 RGB p99 | 11.05 | 11.56 | 11.44 | 11.79 | 12.00 | 11.92 | 11.1 |
| Lethuris L8 forest % | 2.17 | 0.89 | 1.15 | 1.91 | 0.98 | 1.09 | 2.2 |

What the table shows:

- At L6, a footprint mean cuts RGB p99 by 16% on Maithea and 36% on Lethuris, and forest
  disagreement by 2-4x. That is a large share. But a footprint mean also smooths legitimate
  variation, so this does not isolate aliasing from smoothing; it measures what the reduction rule
  buys.
- With the footprint mean, d3 at L6 would sit at or near main's point-sampled values (Maithea 25.99
  against the 26.3 pin; Lethuris 40.09 against 39.2).
- K=2 (4 sub-samples) keeps most of the K=4 gain.
- At L8 the footprint mean does not help, and RGB rises by 0.3-0.5. Little height energy lies
  below colour Nyquist(L8) (3 m RMS on Maithea), so the remaining difference is mostly the blur
  difference between the two footprints, which is the colour content of one octave.
- **Even with the footprint mean, the strict targets stay out of reach** (12 RGB at L6, 4 RGB at L8,
  0.5% for classes). The smallest L6 RGB value is 21.98.

**(d) Peak retention is a height metric, and it may trade against sharp mountains.** The metric is
"L6 peak area kept >= 85%" (d3: 80.18%, main 89.56%). `retentionTile` takes the truth's p90 height
on a dense 97² grid of the tile. It counts the truth points at or above that p90 where the coarse
bilinear surface is also at or above the same truth p90.

The truth's top-decile area stays about 10% whatever the shape. What can change is its shape: thin,
fragmented crest areas narrower than the 4 km L6 lattice are harder for a bilinear surface to reach.
The non-negative peak correction works the other way and can raise retention. So the trade-off is
plausible and d3 showed it once (89.56% to 80.18%), but it is not a law. Footprint filtering of
colour does not touch this metric. MTN-4 measures it on the synthetic M3 field before MTN-6 depends
on it, and the rule for it is an owner question (section 4.2, Q3).

**Verdict.** The pins broke because the change added height energy below Nyquist(L6/L8), and that
energy:

- is aliased by point-sampled coarse colour and class, a known contract gap (c), and this is a
  measured, large contribution, not the only cause;
- moves pins that have about 0.04 of headroom on a field-dependent tile selection (a);
- lowered a peak-area metric in d3 (d).

So a design that makes mountains steeper is likely to break the same pins unless the coarse
reduction changes first. Sharper mountains need more sub-8 km energy; the alpine control has about
3x main's 1-2 km RMS. This is why element M0 comes first.

### 1.3 Why SITE_A broke

The site rule needs ground at least 250 m above sea and at least 80% forest on the rings. d3 put the
old site at 155.5 m with a ring forest share of 0.31 (`relief-present/fix1/site-a-design3.json`).
SITE_A is a lowland site. It broke because d3's landform change reached all land, not because of the
belts.

Design rule here: **where `belt = 0`, `terrainSampler` output is bit-identical to main.** It is not
enough for the new terms to be zero there, because the old ridge term is non-zero outside belts and
feeds `floorM`, `upland`, the detail-window weight and `landformScale`
(`terrain.ts:543-547`). So the assembly does not delete the old ridge term. It replaces it only
inside belts:

```
ridgeTerm = belt === 0 ? <the literal main expression>
                       : (1 - w(belt)) * <main expression> + U + carving
```

`w` rises from 0 to 1 at the belt edge, so the old term fades out inside belts. The `belt === 0`
branch evaluates main's exact expression, so the sum stays bit-identical (no `x*1 + 0` rounding
argument needed). MTN-6 tests this exactly on 4096 Fibonacci directions per world: 0 differences
where `belt = 0`.

SITE_A then moves only if a belt reaches it. If one does, the documented search (rule 4) moves the
site; the rule is not loosened.

The cost of this rule: the soft 173 km ridge maze stays as it is outside belts. Retiring it
everywhere is a separate later change and an owner question (Q4, section 4.2). It would move
lowland terrain, SITE_A and every lowland pin.

### 1.4 Why Luna's mountain verdicts cannot gate

In fix round 1, Luna failed every browser frame and every CPU render, before and after, in every
variant. Its results on positive controls were:

- POS, pyramidal peaks with 37 deg faces: 0/6, judged "smooth, rounded hills".
- POS2, carved alpine peaks with synthetic snow: 1/12.

So the judge rejects textbook mountains. Its mountain verdicts are uncalibrated today. Section 6 is
the calibration plan.

## 2. Elements

Each element has these parts:

- one owner module or file set;
- a pure, deterministic metric with a threshold whose rationale is a measured number;
- a single-element render made in Node: a hillshade or map PNG from the element's own field, with no
  app renderer, no climate colour and no GPU;
- an explicit list of what its test must NOT depend on.

Element tests run on **synthetic inputs or on the element alone**. Atlas terrain is used only in the
assembled check (section 3). Each card separates three kinds of acceptance:

- **unit:** the element on synthetic fixtures, in `npm test`, under 2 s;
- **integration:** the element on the real worlds, run once at hand-off, not registered;
- **benchmark:** cost, under the CPU-quiet lock.

The section 2.6 restrictions apply to unit tests. M0 is the exception by nature: it is the
colour/class reduction, so its integration acceptance measures RGB on main's field.

Shared harness: the prototype's metric functions are promoted to `tests/helpers/mountain-metrics.mjs`
(task MTN-0). It holds slopes, crests, prominence, depressions, spectrum, coherence and the hillshade
PNG writer. Every element test imports it; no element test reimplements a metric.

### 2.0 M0: coarse reduction (LOD precondition, comes first)

- **What.** Coarse colour texels and class-lattice weights become the footprint mean of K x K
  sub-samples (K=2 measured as enough) at the levels where it measurably helps. In the proxy that
  is L6; L8 got slightly worse. The level rule (L <= `peakCorrectionMaxLevel(R)`, or narrower) is set
  by measurement in `buildTile`, not in the proxy. Heights keep the point sample plus the existing peak correction; the contract says
  heights are only raised.
- Each terrain band declares its shortest wavelength (see M2 and M3). The ladder can then report, per
  level, which bands sit below Nyquist(L).
- **Owner files:** `src/planet-tiles.ts` (colour and class grid hunks only), `src/lod-ladder.ts`
  (reduction constants, `LOD_LADDER_VERSION` lod-ladder-2), `scripts/lod-consistency-report.mjs`
  (footprint mode), `tests/lod-consistency.test.mjs` (ceilings, changed only after the owner's A3
  answer), and the new `tests/lod-footprint.test.mjs`.
- **Metrics and thresholds:**
  1. *Structural (unit, exact):* on a synthetic colour field, a coarse texel equals the mean of its
     K² sub-samples, bit-identical across visit order and processes.
  2. *Reduction on main's own field (integration):* L6 RGB p99 at most 0.9 x the point value on
     both Maithea and Lethuris, measured through `buildTile`. Proxy measurement: 0.86 and 0.67 at
     K=2. The 0.9 leaves margin and still demands a real effect.
  3. *Per-octave height retention*, on the coarse surface interpolated at a 4x denser grid against
     the truth, octave by octave from the shared spectrum function:
     - a retained RMS ratio of at least 0.9 for wavelengths of 4 Nyquist(L) or more;
     - error power at most 0.25 of the truth power in the octave just above Nyquist(L), which is
       what a coarse level may get wrong.

     These two are proposed bounds, not measured; MTN-1 measures them on main first and records the
     values before fixing the thresholds.
  4. *Cost (benchmark):* build mean at most +10% per level (`LOD_BUDGETS.buildTimeGrowth`). Measure
     K=2 against K=1. If it is over, apply the footprint only to the colour grid at L <= 7.
- **Single-element render:** a coarse-against-child |RGB| difference heat map per level (PNG from
  Node), point and footprint side by side, on the 12 test tiles.
- **Must not depend on:** any mountain element, or the tile selection of a candidate field. The unit
  test must not depend on the climate colour constants either. The integration check runs on
  main's field, so M0 lands before any terrain change.

### 2.1 M1: orogen layout (where ranges are; wavelengths of 200 km and more)

- **What.** A per-body belt mask `belt(d)` in [0,1] and a belt-axis direction field `axis(d)`, both
  seeded by `body.seed` and an `OROGEN_LAYOUT_VERSION`. Belts are long, sinuous bands: for example
  arcs near selected continental margins plus interior sutures, built from the macro continental
  coordinate, which is seed-only.
- The mask is a pure function of the direction. It uses only `+ - * /`, floor and imul, because it
  feeds a height. It contains no detail octaves.
- **Owner file:** new `src/mountain-layout.ts` and `tests/mountain-layout.test.mjs`.
- **Metrics and thresholds,** on a 1024 x 512 equirect sample of the mask over land:
  - **Belt land share 5-15% of land per world.** Main's ridge belt (`ridges*ss(.35,.8,ridges) > 0`)
    has no measured share yet; MTN-2 measures it first and states it. The band keeps ranges rare,
    as on Earth, and caps how much lowland the mountains can touch (SITE_A, forest share).
  - **Elongation:** each connected component of `belt > 0.5` with an area above 1% of land has a
    principal-axis aspect ratio of at least 4.
  - **Linearity:** the gradient-orientation coherence of the mask in 40 km windows inside belts has
    a p50 of at least 0.45. Main's height field measures 0.24-0.30 on three worlds (0.68 on Raiva),
    d3 measures 0.12-0.15 and the isotropic control 0.135. So 0.45 separates linear belts from a
    maze.
  - **Coast safety:** `belt = 0` wherever the continental coordinate `a0 < 0`, checked exactly on
    the 410 000 directions of the relief round.
- **Single-element render:** an equirect PNG of the mask over a land/sea silhouette, one per world.
- **Must not depend on:** heights from M2 or M3, climate, colour, LOD, or terrain.ts internals. It
  reads only `body.seed`, `radiusM` and the macro continental code.

### 2.2 M2: massif envelope (how high and how wide; wavelengths of 32 km and more)

- **What.** A smooth uplift `U(d) = A(tau, class) * profile(distance to the belt axis, belt width)`.
  At assembly it takes over from the `ridges*ss(...)` term of the land floor `F` inside belts only,
  by the blend in section 1.3. The profile can be asymmetric or have a plateau.
- The envelope is band-limited by construction: no feature narrower than 32 km. That makes it
  LOD-safe down to L6 on every world (Nyquist(L6) is 3.1-13.8 km).
- **Owner file:** new `src/mountain-envelope.ts` and `tests/mountain-envelope.test.mjs`. Inputs are
  passed as arguments (`a0`, `landFactor`, `tau`, the M1 mask and axis distance), so the element
  never edits `terrain.ts`. Its test recomputes `a0` from `reliefLayersSampler(body).continentalM`
  divided by the radius scale.
- **Metrics and thresholds:**
  1. *Band limit:* in the shared spectrum function, the envelope alone has less than 5% of its RMS
     at wavelengths under 32 km.
  2. *Hypsometry stays in the owner band of `docs/terrain-relief-v1.md` §4* (integration), measured
     with the envelope composed into the R-CAL-1 floor by the section 1.3 blend:
     - Maithea p50 350-650 m, p90 1.8-3.3 km, p99 3.5-6 km;
     - more than 4 km: 1-6% of land;
     - below 500 m: at least 45% of land.
     Main sits at 426 / 2690 / 4358 m, 2.2% and 55.7%.
  3. *Relief ratio per planet class:* p99 land inside belts divided by `bodyHeightBoundM.maxM` is
     between 0.6 and 0.9. Main's p99 over all land is 0.615-0.657. The ratio must not fall, and must
     not reach the bound.
  4. *Bound containment:* M2 exports its analytic maximum `maxEnvelopeM(tau, class)`, and the unit
     test checks 0 samples above it. Updating `bodyHeightBoundM` in `terrain.ts` is MTN-6's job,
     because only MTN-6 owns `terrain.ts`.
  5. *Coastline:* 0 flips against `baseTerrainSampler` at sea level 0, on the same directions as M1.
  6. *Zero outside belts:* `U = 0` exactly where `belt = 0`.
- **Single-element render:** a 384 km hillshade of the envelope alone, plus an across-belt height
  profile.
- **Must not depend on:** M3 detail, climate or colour, LOD, or the real M1 field. The test uses a
  synthetic straight belt (mask = 1 within w km of a great circle). An integration test reads the
  real M1 field.

### 2.3 M3: ridge-valley carving (structure; wavelengths from 1 to 16 km)

- **What.** The relief that makes a massif a range: crests across the belt axis, V-valleys between
  them, a drainage hierarchy, and steep faces. Each band of the carving declares its wavelength, so
  that M0 and LOD can name it. The term is exactly zero where `belt = 0`.
- Two candidate methods. Both are pointwise, deterministic and level-indexed, with no global
  simulation and no stored state. The metrics pick between them:
  - **A. Hierarchical channel network.** A Dendry-style method (Gaillard et al., "Dendry: a
    procedural model for dendritic patterns", I3D 2019). Seeded channel segments per cell and level
    connect to the coarser level's channels. Height is the distance to the nearest channel, shaped
    into V-valleys. The next level adds tributaries.
  - **B. Gradient-aligned erosion noise.** Gully octaves oriented along the gradient of the coarser
    bands (the derivative-damped / slope-aligned fBm family). It is cheaper, but it does not
    guarantee drainage, so the drainage metric must pass on measurement.
- **Owner file:** new `src/mountain-carving.ts` and `tests/mountain-carving.test.mjs`.
- **Metrics and thresholds,** on M3 over a fixed synthetic ramp envelope (3 km high, 60 km wide,
  straight axis), 8 seeds, 48 km rasters at 125 m:

| Metric | Threshold | Rationale (measured) |
|---|---|---|
| slope at 125 m above 30 deg | >= 25% of belt-core area | alpine control 42.7%; d3 17.4%; main 2.2% |
| slope at 125 m, p50 | >= 20 deg | control 27.4; d3 16.3; main 11.3 |
| crest flank angle at 500 m, p50 | >= 12 deg | control 14.7; d3 9.6; main 6.5; dome 0.4 |
| relief within 8 km, p50 | >= 1500 m at 3 km envelope | control 1767; main Maithea 1466 |
| beta, 0.5-8 km | 2.0-2.6 | control 2.14; d3 2.78-2.99; main 3.36-3.49; Earth about 2 (literature) |
| land with fill > 10 m (closed depressions) | <= 5% | main 5-23%, d3 23-32%, noise control 31%; calibrated by MTN-4: eroded control 0, un-eroded 0.302 (see below) |
| pits per 1000 km² whose closed depression is >= 0.25 km² (`pits025Per1000km2P50`, calibrated 2026-10-05) | <= 50 | eroded positives 0-38.4 (steady-state stream power), 22.5 (resampled eroded control); negatives alpine 1023.7, noise carving 369.6, un-eroded 829; main 79-300, d3 363-399 |
| axis coherence of the detrended 2 km footprint raster, 40 km window (`axisCoherence40kmP50`, calibrated 2026-10-05) | 0.14-0.64 | eroded positives 0.255-0.464; isotropic 0.014-0.032; straight mirrored fans (A0) 0.823; comb 0.968 |

- **Calibration of the last two rows (owner decision (a), 2026-10-05).** The rows above replace
  `pits per 1000 km² <= 50` (all strict pits) and `gradient coherence >= 0.35`, which physically
  eroded controls failed (resampled eroded control 1287 pits; steady-state ramps coherence
  0.085-0.114). Definitions, controls, the pre-registered midpoint rule and all numbers:
  `docs/mountain-m3-calibration-v1.md`. The other six rows are unchanged.

- (Superseded 2026-10-05.) The two drainage thresholds were UNCALIBRATED until MTN-4 built the
  eroded positive control (the alpine control after a priority-flood fill and a stream-power incision
  pass, `tests/helpers/mountain-eroded-control.mjs`). The fill row was then calibrated from it
  (eroded 0, un-eroded 0.302, bound 0.05 kept) and the pit row was recalibrated under owner decision
  (a) as above.
- **Coast-safety bound:** for every sample, `envelope + carving >= 0`, checked over the synthetic
  ramp including its zero-envelope margin (exact, 0 violations). This keeps the relief branch's
  `F >= 0` coastline guarantee when M3 is wired in.
- **Single-element render:** a 48 km hillshade plus a flow-accumulation map (D8 on the filled
  raster) from Node.
- **Must not depend on:** the real M1 or M2 fields, climate, colour, LOD, the app renderer, or
  Luna.
- **Status (MTN-4, 2026-10-05): candidate F accepted on the rows, unwired.** Rounds A2/B/C/D/E were
  blocked by a block rhythm. F is a seam-free haloed drainage solve (24 km halo per 16 km block,
  LRU memo), which supersedes the "pointwise, no stored state" wording above under owner decision
  (c) of 2026-10-05 (cost judged on the warm-cache resident cost per region, budget 8%; cold
  first-touch reported, non-blocking). All eight rows pass pooled and on all 8 seeds (relief8 per
  seed 1519-1616 m); coast safety exact; resident cost 1.03% weighted, cold 71.7%. The straight
  main divide stays within a few hundred metres of the axis and reads as a straight line at
  192 km (Luna, UNCALIBRATED, names it on the strips; open for the owner). Numbers, method and visual
  review: `docs/mountain-carving-f-v1.md`.

### 2.4 M4: summits and prominence (no own code; a check on M2 + M3)

- **What.** Peaks stand on the belt axes, are distinct, and never exceed the bound.
- **Owner file:** `tests/mountain-summits.test.mjs`. It composes M2 and M3 in Node over a synthetic
  straight belt. It does not use `terrain.ts`.
- **Metrics and thresholds:**
  - Resolved peaks with prominence of at least 300 m: at least 8 per 1000 km² of belt core. The
    alpine control has 12.0, d3 1.2-6.4 and main 0.3-1.2 (border-censored, section 1.1). An upper
    bound of 25 is proposed against needle fields but is UNCALIBRATED: no measured field sits above
    it yet.
  - At least 90% of the 100 highest summits lie where `belt >= 0.5`.
  - Maximum height at or below `bodyHeightBoundM.maxM`, with 0 violations.
  - Prominence is computed by union-find (`prominence()` in the harness). A peak counts only if
    its component did not reach the raster border before its key saddle and the saddle is
    interior. The highest component never merges and is never counted.
- **Single-element render:** the M2 + M3 hillshade with peak markers sized by prominence.
- **Must not depend on:** climate, LOD, landing code. The interaction with landing no-summit (A6) is
  checked only in the assembled step.
- **Status (MTN-5, 2026-10-05): rows pass on the pre-registered fixture, unwired, no own code.**
  Fixture: straight synthetic belt, w = 32 km, A = 3 km (tau 3000/3640), 8 seeds. R1 39.1 per
  1000 km² of belt core (per seed 32.4-43.4), R2 100/100, R3 max 3000 m with 0 violations; the
  dome, bare-envelope, off-belt-shift and +1% amplitude negatives fail their rows. R2 now requires
  100 summits (fails closed otherwise). Open for MTN-6 / the owner (INFO, measured): with real
  parameters R1 fails on Selawyn's 220 km belt (0.05) and is marginal on Raiva (7.9 axis, 2.6 at
  0.4w), because M3's lattice scales with the belt width; the fixture density (39) is above every
  physically eroded control (1.7-10.1) and above the UNCALIBRATED 25 ceiling, which stays ungated.
  `docs/mountain-summits-v1.md`.

### 2.5 M5: steep-rock fine detail (wavelengths under 1 km; optional, later)

- **What.** The existing detail window (hills, gullies, rocks) gets a slope weight, so steep faces
  carry rock-scale relief and valley floors stay smooth.
- **Owner file:** the detail-window hunk of `terrain.ts`. This is after assembly, as its own version
  bump.
- **Metric:** octave RMS at 125-500 m on slopes above 30 deg is at least 2x the RMS on slopes below
  10 deg. Main has 1-3 m in these octaves everywhere.
- **Must not depend on:** M1-M4 parameters. It is tested on the synthetic ramp.

### 2.6 What no element test may depend on (all elements)

An element unit test must not use the following (M0's integration check is the one stated
exception, section 2):

- any browser, GPU, Luna or wall-clock timing;
- the stratified tile selection of a candidate field;
- `SITE_A`, golden digests or climate/biome colours;
- another element's tuned constants. It uses synthetic fixtures instead.

Each element test runs in under 2 s (`docs/agent-round-prompts-2026-10-03.md`, implementer prompt).

### 2.7 Presentation (outside this design, listed so nobody folds it in)

- Range snow and rock contrast: owner item A4, backlog task 13.
- The cloud deck above p99 land: A8, task 11.
- Sun-aware picked-range horizon poses: A5.
- Haze and tone mapping: the renderer.

These are judged after assembly with the calibrated Luna procedure. A geometry element is never
accepted or rejected on a frame that includes them.

## 3. Assembly order and the single assembled check

Order:

1. **MTN-0**: the shared harness.
2. **MTN-1**: M0, the coarse reduction. It lands alone on main's current field; no terrain change.
3. **MTN-2, MTN-3, MTN-4, MTN-5**: M1, M2, M3 and M4. These are pure modules, unwired, each with its
   own test. MTN-2 and MTN-3 can run in parallel. MTN-4 needs only the harness. MTN-5 needs MTN-3
   and MTN-4.
4. **MTN-6**: assembly. One wiring change in `terrain.ts`:
   - in the relief branch only (`terrain.ts:542-543`, the `tau * RC.KB * 2800 * ridges * ...`
     term of `F`), blend the ridge term into `U + carving` inside belts by the section 1.3 rule;
     where `belt = 0` the literal main expression is evaluated, so the output is bit-identical. The legacy
     sum at `terrain.ts:504-506` keeps its `ridges * 2800` term untouched: `baseTerrainSampler`
     reads it, and `BASE_ELEVATION_SHA256` ("NEVER re-pinned", the archived drainage input) must
     stay bit-identical;
   - keep the coastline invariant: carving may cut valleys (negative values), so the mountain term
     is clamped to `U + carving >= 0`, the same way `fineT` is clamped at `terrain.ts:541`. `F >= 0`
     where `a0 >= 0` then still holds by construction;
   - note that the new term also feeds `floorM`, so it moves `upland` and therefore the detail
     window weight and `landformScale` inside belts. MTN-6 measures that shift, and only there;
   - one `TERRAIN_VERSION` bump;
   - one coordinator golden re-pin;
   - one SITE_A search move, if needed.

   Wiring once keeps the pin churn to one event, instead of one per element.

**The single assembled check** (MTN-6 hand-off, one run, all four worlds):

0. Outside-belt identity: `terrainSampler` output (`elevationM`, `groundHeightM`, `ocean`,
   `color`) is bit-identical to main on every direction of a 4096-direction Fibonacci set per world
   where `belt = 0`. Expected differences: 0.
1. Run `mountain-metrics` on the composed `terrainSampler`. Every M1-M4 threshold must hold on the
   real field's belt sites. The sites are picked by the same rule as the prototype.
2. Run `terrain-relief-hypsometry` with the owner bands unchanged, and get 0 coastline flips over
   410 000 directions.
3. Run `lod-consistency` under M0, with the ceilings as the owner decides on A3 (section 4.2), and
   the per-octave retention check from M0.
4. Run the harness-sites SITE_A rule. If it fails, run the documented search and record old -> new.
5. Run render-bounds containment with 0 violations, and landing todos re-measured (A6).
6. Take one AFTER capture set under the GPU lock: 4 worlds x {orbit, range from lowland, flight} =
   12 frames. Luna judges it by the section 6 procedure. It is advisory; an UNCALIBRATED verdict is
   recorded and does not count.

## 4. Pins and versions, and the A3 proposal

### 4.1 What each element moves

The "expected" entries are confirmed with `npm run test:affected -- --base main` at hand-off.
Re-pins belong to the coordinator.

| Element | Moves | Does not move |
|---|---|---|
| MTN-0 harness | nothing | everything |
| MTN-1 (M0) | `LOD_LADDER_VERSION` -> lod-ladder-2; buildTile colour and class bytes, so any test that hashes `buildTile` output (to be identified with `test:affected`; the leaf-loop and forest-frame digests hash renderer state and forest output and are not expected to move); build-time budget re-measured. `SHIPPED_CEILINGS` change only in the form the owner picks for A3; the proxy suggests L6 could tighten (Maithea RGB about 22.5, Lethuris about 26.3 at K=2) and L8 RGB would loosen unless L8 stays point-sampled (Lethuris 11.05 -> 11.44) | `TERRAIN_VERSION`, golden terrain (sampler-based), SITE_A, hypsometry, KEPT_PALETTE |
| MTN-2..5 (M1-M4, unwired) | nothing: new modules and tests only | everything |
| MTN-6 assembly | `TERRAIN_VERSION` (proposed terrain-1.9.0-mountains); a new `MOUNTAIN_CALIBRATION` sha pin; `RELIEF_CALIBRATION` (KB/BT0/BT1 retired: a new sha, or a documented supersession); `ELEVATION_IDENTITY`; golden terrain and combined; the classifier golden (land class follows height); KEPT_PALETTE only if the change reaches non-water bodies or water-world ocean colour (its digest excludes water-world land colour); `SURVEY_VERSION`; `LANDFORM_SHAPE_VERSION` only if the landform shape changes inside belts (the seed version `LANDFORM_VERSION` stays); `bodyHeightBoundM`, `reliefTextureRange`, render-bounds margins and the landing ceiling if `A` changes the bound; lod-consistency cells; SITE_A only if a belt reaches it; `BUILD_VERSION` and the shader cache key (coordinator); a bookmark relief notice | seabed (`a0 < 0` untouched), `ocean-volume-1` and the harness sea levels (`levelForLoss` reads the seabed), `BASE_ELEVATION_SHA256` |
| M5 (later) | `TERRAIN_VERSION` again, plus identity and golden | M0-M4 pins |

### 4.2 Proposal to the owner for A3, "strict post-relief LOD class/colour targets" (OPEN, not decided here)

The strict targets are RGB p99 of 12 at L6 and 4 at L8, and 0.5% class disagreement. Measured on the
12 stratified tiles:

| | Maithea L6 RGB | Maithea L8 RGB | Lethuris L6 RGB | Lethuris L8 RGB | worst snow / forest cell (proxy) | worst name cell (test) |
|---|---|---|---|---|---|---|
| main, point (today's gate) | 26.26 | 3.55 | 39.17 | 11.05 | Lethuris L8 forest 2.17% | Lethuris L6 carriedName 8.15% (name 6.99%) |
| main, footprint K=2 (proxy) | 22.53 | 3.81 | 26.33 | 11.44 | Lethuris L6 snow 1.36% | not measured |
| d3, point | 33.33 | 4.34 | 54.18 | 11.79 | Lethuris L6 forest 5.89% | not re-measured here |
| d3, footprint K=2 (proxy) | 26.82 | 4.71 | 40.59 | 11.92 | Lethuris L6 forest 3.34% | not measured |
| strict target | 12 | 4 | 12 | 4 | 0.5% | 0.5% |

The proxy covers only the RGB, snow and forest rows; `name`, `carriedName` and ocean disagreement
were not measured with a footprint.

The cross-level metric compares level L with level L+1, not with the truth. Even with an ideal
reduction it therefore measures the colour and class content of the one octave that L+1 adds. The
strict 12 RGB at L6 is, in effect, a cap on colour detail between about 0.5 and 1 km on Maithea.
Mountains need more of that detail: snow/rock contrast and treeline on steep faces.

Options, none decided:

1. **Status quo.** The `SHIPPED_CEILINGS` map stays the gate and the strict targets stay a goal (the
   owner sheet's default).
   - Consequence: with 0.03-0.05 of headroom and a field-dependent tile selection, a mountain change
     is likely to need re-pins (d3 broke 12 checks).
2. **Versioned regression ceilings.** Ceilings are re-measured once per `TERRAIN_VERSION` or
   `LOD_LADDER_VERSION` bump and stored with that version key. Each ceiling is the measured value
   plus max(10%, 0.5). A cell may rise only in the bump that explains it, with the old -> new value
   recorded. The strict targets stay a goal.
2b. **Fixed tile selection (adds to option 2).** Same as option 2, plus the 12 tiles are frozen as tile keys, taken from
   main today, so that a new field is judged on the same ground.
3. **Footprint reduction first (M0), then tighten.** Ceilings are set to the M0 measured values
   (Maithea L6 RGB about 22.5, Lethuris L6 about 26.3 at K=2), and the strict targets stay a goal.
   In the proxy this closes 14-33% of the L6 RGB excess without reaching 12. The values have to be
   re-measured through `buildTile`.
4. **Retire the absolute strict colour and class numbers.** Replace them with:
   - (a) M0's exact structural reduction test (coarse = footprint mean of the finer level);
   - (b) the per-octave height-retention bounds of M0;
   - (c) option 2's versioned regression ceilings.

   Rationale: (a) and (b) test the reduction itself, and (c) catches regressions. The strict numbers
   cap legitimate detail instead.

Nothing in this document or in the task cards applies one of these options. MTN-1 can implement
and measure the footprint reduction, but no ceiling and no acceptance bound changes until the owner
answers A3.

Related questions for the owner (OPEN):

- **Q3, peak retention.** Peak retention at L6 (85%) fell with d3's sharper summits (89.56% to
  80.18%); section 1.2 (d) explains why that is plausible but not certain. Should it be measured
  against a reference low-passed at Nyquist(L6), with true summits carried by tile metadata `maxH`?
  Or should it stay against the full field?
- **Q4, the old ridge maze outside belts.** Section 1.3 keeps the 173 km value-noise ridges
  bit-identical outside belts, so the isolation guarantee holds. Retiring them everywhere would
  soften lowland terrain too, and would move SITE_A and every lowland pin. Keep (the default in this
  design) or retire in a later, separate version?
- **A1.** Lethuris L6 name 6.99% (ceiling 7.0) and carriedName 8.15% (ceiling 8.2) sit on the same
  narrow headroom. This evidence does not measure the name rows with a footprint, so it does not
  resolve A1. Options 2, 2b and 4 would cover A1 by their rule; options 1 and 3 leave it as it is.

## 5. Task cards

The legend is the same as in `IWSDK/docs/atlas-backlog-2026-10-04.md`:

- S means under half a day, M one round, L several rounds.
- GPU means the machine-wide `.gpu-browser-lock`.
- The lean verification policy applies.
- package.json registration, golden, `BUILD_VERSION` and the README entry belong to the coordinator.

File ownership is disjoint across cards. `terrain.ts` is touched only by MTN-6 (and later by M5).

### MTN-0. MOUNTAIN-HARNESS — shared deterministic mountain metrics
- **Why:** Every element test needs the same slope, crest, prominence, depression, spectrum,
  coherence and hillshade functions. The prototype has them in a script.
- **Owner:** Sonnet (mechanical promotion); Opus reviews.
- **Files owned:** `tests/helpers/mountain-metrics.mjs` (new), `tests/mountain-metrics.test.mjs`
  (new), `scripts/mountain-metrics.mjs` (made to import the helper).
- **Resource:** none. **Dependencies:** none. **Size:** S.
- **Acceptance:**
  - On the synthetic controls the helper reproduces this document's control numbers (alpine slope
    p50 27.4, dome 5.3, pits 2108 / 0, beta 2.14 / 3.92).
  - Negative tests, one per failure mode: the dome fails the M3 slope, flank, relief and spectrum
    thresholds (it passes the drainage ones by having no relief at all); the un-eroded noise
    control fails the drainage and coherence thresholds. Together they cover every M3 row.
  - Under 2 s per test file.

### MTN-1. LOD-FOOTPRINT (M0) — footprint-mean coarse colour and class, per-octave retention
- **Why:** Section 1.2 (c). Coarse colour and class are point samples. The footprint mean cuts L6
  RGB p99 by 16-36% on main itself (proxy). Without it, a steeper mountain design is likely to
  re-break the L6 pins.
- **Owner:** Opus implements; Astra reviews read-only.
- **Files owned:**
  - `src/planet-tiles.ts` (colour and class grid hunks only);
  - `src/lod-ladder.ts` (reduction constants and the version);
  - `scripts/lod-consistency-report.mjs`;
  - `tests/lod-consistency.test.mjs`;
  - `tests/lod-footprint.test.mjs` (new);
  - `docs/lod-ladder-contract-v1.md` (§3 and §9 amendment).
- **Resource:** CPU only, plus the CPU-quiet lock for the build-time benchmark.
- **Dependencies:** implementation and measurement can start now. Any change to `SHIPPED_CEILINGS`
  or another acceptance bound waits for the owner's A3 answer, and MTN-1 is not merged before it.
  Conflicts with backlog tasks 13 and 23 on `planet-tiles.ts`, so the coordinator orders them.
- **Size:** M.
- **Acceptance:**
  - Unit: the structural reduction test is exact.
  - Integration: L6 RGB p99 is at most 0.9 x the point value on Maithea and Lethuris, on main's
    field, measured through `buildTile` (not the proxy), with the name, carriedName and ocean rows
    reported as well.
  - The per-octave retention values are measured and recorded, and their thresholds are set from
    those values.
  - Build mean is at most +10% per level.
  - Determinism digest identical forward, reverse and from a child process.
  - The measured values are listed for each A3 option; the ceilings change only as the owner
    decides.

### MTN-2. OROGEN-LAYOUT (M1) — belt mask and axis field
- **Owner:** Opus.
- **Files owned:** `src/mountain-layout.ts` and `tests/mountain-layout.test.mjs` (new);
  `scripts/mountain-render.mjs` (new; only the `layout` mode at first; later cards add their mode in
  their own `scripts/mountain-render-<element>.mjs`).
- **Resource:** none. **Dependencies:** MTN-0. **Size:** M.
- **Acceptance:**
  - The section 2.1 thresholds hold on all four worlds and on 60 corpus bodies.
  - Main's ridge-belt land share is measured and stated next to the new share.
  - Exactly 0 belt where `a0 < 0`.
  - The equirect PNGs are saved, and the owner looks at them (no Luna).
  - No `Math.*` transcendental in the value path, checked by a source grep.

### MTN-3. MASSIF-ENVELOPE (M2)
- **Owner:** Opus.
- **Files owned:** `src/mountain-envelope.ts`, `tests/mountain-envelope.test.mjs` and
  `scripts/mountain-render-envelope.mjs` (all new).
- **Resource:** none. **Dependencies:** MTN-0; reads MTN-2's export only in its integration test.
- **Size:** M.
- **Acceptance:**
  - Unit: section 2.2 metrics 1, 4 and 6 hold on synthetic belts.
  - Integration: metrics 2, 3 and 5 hold on the four worlds, composed into the R-CAL-1 floor by the
    section 1.3 blend (computed in the test, not wired into `terrain.ts`).
  - The hypsometry table is reported against the owner band.

### MTN-4. RIDGE-VALLEY (M3) — carving with a drainage structure
- **Owner:** Opus designs. Astra implements candidate B in workspace-write mode if time allows, as an
  independent second candidate.
- **Files owned:** `src/mountain-carving.ts`, `tests/mountain-carving.test.mjs` and
  `scripts/mountain-render-carving.mjs` (all new); the eroded-control builder under
  `test-results/mountains/` (test-only).
- **Resource:** CPU; no GPU. **Dependencies:** MTN-0. **Size:** L.
- **Acceptance:**
  - The eroded positive control is built first and its drainage numbers are recorded. The drainage
    thresholds in section 2.3 are then fixed from those numbers, and the UNCALIBRATED mark is
    removed.
  - Every section 2.3 threshold holds on 8 seeds.
  - Candidates A and B are compared in one table.
  - The L6 peak-retention trade-off (section 1.2 d) is measured on the synthetic M3 field and
    reported for Q3.
  - Benchmark: per-sample cost is reported against the +8% sampler budget of the relief round.

### MTN-5. SUMMITS (M4)
- **Owner:** Sonnet writes the test; Opus reviews.
- **Files owned:** `tests/mountain-summits.test.mjs` (new).
- **Resource:** none. **Dependencies:** MTN-3 and MTN-4. **Size:** S.
- **Acceptance:** the section 2.4 thresholds hold, and a negative test with the dome envelope fails
  them.

### MTN-6. MOUNTAINS-ASSEMBLY — wire M1-M3 into the relief floor

- **Status (step A, 2026-10-05): PARTIAL, wiring not merged** (`docs/mountains-assembly-2026-10-05.md`).
  Wired on branch `mountains/assembly-2` (`2744237` M1+M2, `92afaa3` M1+M2+M3, `terrain-1.9.0-mountains`):
  17/17 pins and 96/96 LOD cells on the frozen selection, identity outside belts/massifs and the ocean flag
  everywhere bit-equal to main, whole-core M4 R1 41.0/22.8/8.6/39.4 (Maithea/Selawyn/Raiva/Lethuris).
  Blocked on cost: warm resident +108-156% against +8% (M1 dominates), cold sparse 2-4.3 ms/sample (M3
  block solves; Maithea L0 x6 335-461 s). Merged: frozen LOD selection, massif-envelope-2 (48 km massif
  cap), M1 `alongM`, unwired `mountain-assembly.ts`, identity pins, scripts.
- **Owner:** Opus implements; Astra reviews read-only; Luna is advisory.
- **Files owned:**
  - `src/terrain.ts` (the relief-branch ridge-term hunk of `baseTerrainCore`, the version constants,
    and `bodyHeightBoundM` if M2's maximum changes it);
  - `src/planet-landforms.ts` (only if the 14 km range octave is retired inside belts, with a
    `LANDFORM_SHAPE_VERSION` bump);
  - `tests/terrain-relief-hypsometry.test.mjs` and `tests/terrain-elevation-identity.test.mjs`;
  - `tests/harness-sites.mjs` (SITE_A literal via the search only);
  - `docs/mountains-v1.md` (new).
- **Resource:** GPU for one AFTER capture set (12 frames, holds under 30 s), CPU otherwise.
- **Dependencies:** MTN-1 to MTN-5; owner answers on A3, Q3 and Q4; task 11's cloud deck for the
  capture frames, or the frames hide clouds and say so.
- **Size:** M.
- **Acceptance:** the section 3 assembled check, every item reported with its number and none
  labelled passed unless measured.
  - Golden is re-pinned by the coordinator, and the four engines match.
  - Luna gives 3 asks per frame under the section 6 procedure. An UNCALIBRATED verdict is reported
    as such and does not count.

### MTN-7. LUNA-MOUNTAIN-CALIBRATION
- **Owner:** Opus. Luna judges; Sonnet assembles the sheets.
- **Files owned:** `test-results/mountains/luna-calibration/` (prompts, images, answers and the
  summary); no `src/` files.
- **Resource:** Luna calls. GPU only for the in-app control captures (one batch).
- **Dependencies:** MTN-0 for the CPU controls. The real-DEM controls need owner authorisation for
  any download (section 6).
- **Size:** S-M.
- **Acceptance:** the section 6 calibration result is recorded with the prompt hash: CALIBRATED or
  UNCALIBRATED.

## 6. Luna calibration plan for mountains

Goal: before any mountain frame is judged, show that Luna separates mountains from non-mountains on
images whose answer is known. If it cannot, its verdicts are recorded as **UNCALIBRATED** and never
count.

1. **Control set (12 images, neutral file names, shuffled order).**
   - **Labels are independent of Luna and of the candidate design.** Each label comes from how the
     image was made, and from the deterministic metrics where those apply. The owner signs off the
     label sheet before any ask. No Luna answer is ever used to set a label. The candidate M3 field is
     never a control, because the calibration exists to judge it.
   - *Positives (6):*
     - 4 CPU renders of the eroded alpine control (MTN-4), from 4 different seeds and poses;
     - 2 renders of real, well-known ranges from public-domain DEM tiles, for example SRTM over the
       Alps and the Himalaya. **These need the owner's authorisation to download** (AGENTS.md: no
       downloads without it). Until then the slot is filled by two more eroded-control seeds, and the
       calibration says so.
   - *Negatives (6):*
     - 2 of the dome control;
     - 2 of main's current field at the same pose rule. The label "not a mountain range" comes from
       the metrics (crest flank 6.5 deg against 14.7 deg on the control, beta 3.36) and the owner's
       sign-off, not from Luna's earlier FAIL;
     - 1 flat plain;
     - 1 of the rough-noise alpine control **without** erosion: the hard negative, rough but not a
       range.
   - Every control is rendered twice: through the CPU hillshade/perspective renderer, and through
     the app's own capture path (one GPU batch). That separates "Luna cannot see mountains" from
     "the app's haze and tone mapping hide them". The two render paths are **two separate
     calibrations**, each with its own result: 12 images x 3 asks x 2 paths = 72 asks.
2. **Asking.** Three independent asks per image, in a fresh context each time. Each ask returns
   PASS/FAIL as the first line, a 1-5 confidence and the features named (peaks, faces, valleys,
   snow line). The prompt is fixed and its sha256 recorded. The prompt must not mention the expected
   answer or the image's origin.
3. **Majority-of-3.**
   - At least 2 of 3 PASS gives PASS; at least 2 of 3 FAIL gives FAIL.
   - Anything else is NO MAJORITY and counts as wrong for calibration.
   - A non-zero exit is NOT DONE and is re-asked once.
4. **Calibration rule,** per render path. CALIBRATED needs all four of:
   - at least 5 of 6 positives PASS;
   - at least 5 of 6 negatives FAIL;
   - the hard negative (un-eroded noise) FAILs by majority. This is mandatory: structure, not
     roughness, is what the mountain verdict must detect;
   - at least 10 of the 12 images unanimous (3/3).

   Otherwise the result is UNCALIBRATED. The prior evidence (POS 0/6, POS2 1/12) predicts
   UNCALIBRATED for the current prompt.
5. **Paired format as the fallback.** "Which of A and B shows steeper, more mountain-like terrain?"
   is asked with both orders, to cancel position bias. Calibration pairs are positive against
   negative from the set above. Paired verdicts are CALIBRATED if at least 11 of 12 order-swapped
   pairs pick the positive in both orders. Paired judgement is the preferred way to compare
   candidate designs (A vs B), because it does not ask Luna for an absolute standard.
6. **Validity.**
   - A calibration result is valid only for its prompt hash, Luna model id and render path.
   - Any change to one of these re-runs the 12 controls on the affected path: 36 asks, no GPU for
     the CPU path, one batch for the app path.
   - An UNCALIBRATED verdict is still saved verbatim, labelled "UNCALIBRATED, advisory, not
     counted". Acceptance then rests on the deterministic element metrics and on the owner's own
     look at the single-element renders.

## 7. What was run for this document

- `node scripts/mountain-metrics.mjs --sites 8 --png ... --out metrics-main.json`: about 4 s per
  world on main.
- The same command with `--root C:/LLM/IWSDK/universe-atlas-wt/r2-relief-present`. This read d3's
  `src/` without modifying that worktree.
- `--synthetic alpine` and `--synthetic dome`, 4 sites each.
- `node scripts/mountain-lod-footprint.mjs` with K=4 and K=2, on main and on d3. The point columns
  reproduce the test's reported RGB values exactly (section 1.2 c). It is a report-proxy, not
  production validation.
- Astra read-only review (gpt-6-astra, 2026-10-04): FIX-BLOCKERS-FIRST, 2 blockers and 8 majors.
  All are addressed in this version:
  - the outside-belt bit-identity rule (section 1.3);
  - no A3 option applied by default;
  - border-censored prominence, with the metrics re-run;
  - colour Nyquist added to section 1.2 (b);
  - the corrected peak-retention mechanism;
  - the proxy limits stated;
  - unit / integration / benchmark acceptance split;
  - pins attribution corrected;
  - Luna labels made independent, with the hard negative mandatory.
- Not run: browser, GPU, Luna, `npm test` or tsc. No `src/` file changed, so tsc has nothing new to
  check. The prototypes are not registered tests.
