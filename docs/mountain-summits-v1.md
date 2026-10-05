# Summits and prominence v1 (M4 / MTN-5)

M4 checks the unchanged M2 + M3 composition; it introduces no production code. The coordinator
registers `tests/mountain-summits.test.mjs` in package.json and commits the four new files.
No terrain, M1, M2, M3, metric harness, golden, LOD pin or package file was modified.

## Frozen fixture and method

The flat chart is along=x, across=y in metres. The independent synthetic belt is
`s=abs(y)/w; belt=s>=1 ? 0 : (1-.1*s*s)*(1-smoothstep(.65,1,s))`, with arithmetic smoothstep.
It has M1's shape family but imports no M1 code. The preregistered half-width is 32000 m;
`U=massifEnvelopeM(belt,y,w,1000,1,3000/3640,'water')` has A=3000 m.
`h=U+ridgeValleyCarvingM(x,y,w,U,belt,seed)`. Site i uses x0=i*1000000 and seed=730201+i.

Local rasters are 385 square at 125 m (48 km between endpoint centres), centred on y=0.
Wide rasters are 385 square at 250 m (96 km), at the same x0 and seed, sharing M3 blocks.
R1 counts resolved prominence >=300 m summits whose cells have abs(y)<=.65w. The denominator
uses the harness cell-area convention: number of masked cells times step squared, including
sampled boundary cells. There are 333 core rows, 128205 cells and 2003.203125 km² per local raster;
the pooled area is 16025.625 km². This differs intentionally from the coordinator's belt>=.5 mask.

R2 pools all resolved >=300 m wide-raster summits, sorts by descending height (site then cell
index break ties), and takes the highest 100. The fraction with belt>=.5 must be >=.9. R2 is
defined on 100 summits: a population smaller than 100 gives the CONTRACT value NaN, which fails
closed (serialized as null), and the share of the available summits is kept as INFO
(`placementOfAvailable`). This was tightened after Astra's review (a one-peak population passed
all three rows in a probe); the unit test now pins that a one-peak population fails R2.
In this isolated element placement holds by construction: U=0 and C=+0 where belt=0. The stricter
half-mask fraction is actually measured, but meaningful assembled placement remains MTN-6 work.

R3 scans every sample of both raster sizes, without a tolerance, against maxEnvelopeM(tau,'water').
Non-finite samples count as violations; the fixture builder rejects non-finite heights too.
GAIN 1 stays within the documented R-CAL-1 ridge budget. Full bodyHeightBoundM changes belong
to MTN-6. The frozen SUMMIT_THRESHOLDS and judgeM4 gate R1>=8, R2>=.9, R3 violations<=0;
missing/non-finite values fail closed. The proposed density ceiling 25 is INFO, UNCALIBRATED,
and is neither enforced nor recalibrated here.

R4 uses the harness union-find prominence() unchanged. A component reaching the border before
its key saddle is dropped, the saddle must be interior, and the highest component is never counted.
The exact two-peak and border-censoring checks already exist in
`tests/mountain-metrics.test.mjs`, test `HARD: exact two-peak prominence and border censoring`.
M4 cites them instead of implementing or duplicating a prominence metric.

The registered test uses seed 730201 local + wide, then four negative controls. Dome is the
harness syntheticSampler(5194907,'dome') on a 385 square / 125 m raster. Bare envelope uses U
only. The shift evaluates the entire composition, including its generating belt, at y-w while
the measurement mask remains centred on zero, using the wide view. The bound mutation uses
bare U times 1.01, equivalent to raising A by 1%, against the original 3000 m limit.

The HARD determinism check evaluates the local Float64 raster forward and reverse, hashes the
same row-major byte buffer, and pins SHA-256
`4e470f04b8ce224b32852d6a99b6ef15ef6faf360bc5758e1ecf62803d315386`.
This compares forward/cold with reverse/warm traversal; broader M3 cache purity belongs to M3's
existing tests. A source audit walks the whole reachable local import graph of the test (test,
helper, M2, M3, metric harness) and rejects terrain, climate, LOD, landing and mountain-layout
import specifiers, with five injected prohibited-import controls and a check that the walk
reaches the helper, the harness, M2 and M3.
There is no wall-clock assertion or browser/GPU dependency.

## INFO study and limitations

The script evaluates all eight seeds for every tau/width pair using the exact composition.
It keeps each seed/width's M3 memo blocks warm across taus; it does not rescale a cached raster.
Each row reports local core density, maximum over local+wide, top-100 placement and count,
per-seed measurements, and bound violations in report.json.

The M2 report was absent locally. The four real pairs use tectonicReliefOf(world) and
orogenLayout(world), selecting the first Fibonacci direction (of 20000) with belt>=.5 and
half-width>=32000, exactly M2's first spectrum-site rule. The resulting widths match M2's
documented site-zero widths. Each pair is measured both at y=0 and y=+.4w, over eight seeds.
These are synthetic straight-belt compositions with real parameters, not assembled terrain.
The bound integration scans all local+wide samples against both maxEnvelopeM and the world's
bodyHeightBoundM.maxM; it makes no claim about the still-unwired full terrain sum.

Wide belts require care: the 48 km raster covers only the inner portion of the core (even the
96 km wide raster lies entirely within Selawyn's core). Its measured density is not a
whole-belt estimate. M3 spacing is d=2w/480: 133.33 m at 32 km, 916.67 m at 220 km.
The construction features change scale with width while the prominence cutoff stays 300 m
and output sampling stays 125 m. Combined with amplitude/tau, this gives a non-monotonic density
response. Low tau and very wide belts can fail the nominal density target; this is an MTN-6
finding, not permission to change M3, M2, or the M4 row.

Control densities use their whole rasters, not the synthetic belt mask. Alpine and dome use
the four cardinal CONTROL_SITES at R=5194907, 385 square / 125 m. The plan's alpine 12.0 used
four highest well-separated Fibonacci sites instead; this study reports its own measured value
without substituting the historical number. Eroded alpine uses all four 1025-square builds
and centralCrop to 385 square. The twelve steady-state variants reproduce the positive-control
parameters and eight site directions of mountain-calibrate-m3.mjs, including the (37,53) m
off-grid variants and 125 m construction variant. All are sampled at 385 square / 125 m.
They provide context for 25, not a calibration rule or a justification for enforcing that ceiling.

Eight render pairs (plain and marked) use the harness hillshade at bound 5000. Markers are
single-colour square outlines with radius 2+floor(sqrt(prominence/300)), on resolved peaks only.
The image y coordinate is flipped consistently with hillshade. Composed seeds 730201/730204
use their actual acceptance x0, and seed 730201 also has a 96 km view. Controls rendered are
dome, bare envelope, shifted range (96 km), eroded site zero and uniform steady-state seed one
site zero. These are VISUAL-ADVISORY material; no Luna vote or visual verdict was performed.

## Execution record

`node --test tests/mountain-summits.test.mjs`: exit 0, external wall 1.4584171 s;
Node runner 1.3949754 s. Under the 2 s budget on this run; no CPU-quiet benchmark claim.
The initial digest-capture run exited 1 solely because the expected digest was a placeholder;
forward/reverse equality and all contract/negative-control checks already passed. Its wall
was 1.4097913 s. The measured digest was then pinned and the final test run passed.

`npx tsc --noEmit`: exit 0, wall 3.1362311 s. No npm test, test:full, browser, GPU,
Luna, downloads, network, golden generation or commit was attempted. Read-only discovery had
exit 1 when probing absent AGENTS.md / M2 evidence (not test failures). Other read/write
inspection commands completed successfully. Evidence is local and reproducible under
`test-results/mountains/M4/`: report.json, run.log, unit.log, checks.log, and 16 PNGs.

Coordinator re-run after the review fixes: `node --test tests/mountain-summits.test.mjs` exit 0,
1.444 s (runner), 1.484 s wall. No new thresholds or source changes are proposed by this hand-off;
open items are listed at the end.

<!-- Measured tables appended from the completed report. -->

## Measured acceptance (CONTRACT)

| Row | Pooled | Per-seed min–max | Threshold | Result |
|---|---:|---:|---|---|
| R1 density | 39.062 | 32.448–43.430 | >=8 | PASS |
| R2 placement | 100/100 (100%) | 100%–100% | >=90% | PASS |
| R3 max / violations | 3000 m / 0 | 2993.166–3000 m / 0–0 | <=3000 m, 0 violations | PASS |
| R4 method | shared union-find | same on all rasters | border censoring; highest excluded | PASS (existing exact pins cited) |

626 resolved core peaks, 16025.625 km² core area, 2371600 samples checked across both raster sizes.

| Seed | Core peaks | Density / 1000 km² | R2 percent (top count) | Max m | Violations |
|---|---:|---:|---:|---:|---:|
| 730201 | 87 | 43.430 | 100 (100) | 3000.000 | 0 |
| 730202 | 78 | 38.938 | 100 (100) | 2997.797 | 0 |
| 730203 | 78 | 38.938 | 100 (100) | 2997.936 | 0 |
| 730204 | 77 | 38.438 | 100 (100) | 2993.166 | 0 |
| 730205 | 80 | 39.936 | 100 (100) | 2998.303 | 0 |
| 730206 | 80 | 39.936 | 100 (100) | 2999.714 | 0 |
| 730207 | 65 | 32.448 | 100 (100) | 2998.764 | 0 |
| 730208 | 81 | 40.435 | 100 (100) | 2998.074 | 0 |

Negative controls (reduced fixture): dome density 0 and bare envelope density 0 fail R1;
shifted field placement 12/100=12% fails R2; amplitude mutation max 3030 m with
11165 violating samples fails R3. The positive reduced fixture has 87 peaks, density 43.430,
placement 100/100 and max 3000 m.

## Full INFO sweep

Each row pools eight seeds; max scans both raster sizes. All bound violation counts are zero.
These rows do not gate acceptance. Where the top count is below 100 (w 220 km, tau .456 and
.603) the R2 column is the INFO share of the available summits; the CONTRACT R2 value is null
there (fails closed).

| w km | tau | Core density | Max m | R2 % | Top count |
|---|---:|---:|---:|---:|---:|
| 32.0 | 0.456000 | 5.429 | 1659.840 | 100.0 | 100 |
| 32.0 | 0.603000 | 18.158 | 2194.920 | 100.0 | 100 |
| 32.0 | 0.771000 | 34.258 | 2806.440 | 100.0 | 100 |
| 32.0 | 0.789000 | 35.506 | 2871.960 | 100.0 | 100 |
| 32.0 | 0.824176 | 39.062 | 3000.000 | 100.0 | 100 |
| 32.0 | 1.000000 | 53.602 | 3640.000 | 100.0 | 100 |
| 48.0 | 0.456000 | 10.902 | 1659.840 | 100.0 | 100 |
| 48.0 | 0.603000 | 27.796 | 2194.920 | 100.0 | 100 |
| 48.0 | 0.771000 | 48.467 | 2806.440 | 100.0 | 100 |
| 48.0 | 0.789000 | 50.680 | 2871.960 | 100.0 | 100 |
| 48.0 | 0.824176 | 55.159 | 3000.000 | 100.0 | 100 |
| 48.0 | 1.000000 | 74.265 | 3640.000 | 100.0 | 100 |
| 64.0 | 0.456000 | 11.820 | 1659.840 | 100.0 | 100 |
| 64.0 | 0.603000 | 27.148 | 2194.920 | 100.0 | 100 |
| 64.0 | 0.771000 | 43.771 | 2806.440 | 100.0 | 100 |
| 64.0 | 0.789000 | 45.175 | 2871.960 | 100.0 | 100 |
| 64.0 | 0.824176 | 48.575 | 3000.000 | 100.0 | 100 |
| 64.0 | 1.000000 | 63.849 | 3640.000 | 100.0 | 100 |
| 71.6 | 0.456000 | 9.607 | 1659.654 | 100.0 | 100 |
| 71.6 | 0.603000 | 24.557 | 2194.674 | 100.0 | 100 |
| 71.6 | 0.771000 | 40.911 | 2806.125 | 100.0 | 100 |
| 71.6 | 0.789000 | 42.638 | 2871.638 | 100.0 | 100 |
| 71.6 | 0.824176 | 46.254 | 2999.663 | 100.0 | 100 |
| 71.6 | 1.000000 | 62.122 | 3639.591 | 100.0 | 100 |
| 90.1 | 0.456000 | 7.988 | 1659.214 | 100.0 | 100 |
| 90.1 | 0.603000 | 19.970 | 2194.093 | 100.0 | 100 |
| 90.1 | 0.771000 | 35.352 | 2805.382 | 100.0 | 100 |
| 90.1 | 0.789000 | 36.809 | 2870.878 | 100.0 | 100 |
| 90.1 | 0.824176 | 39.939 | 2998.869 | 100.0 | 100 |
| 90.1 | 1.000000 | 53.702 | 3638.628 | 100.0 | 100 |
| 129.7 | 0.456000 | 4.102 | 1659.471 | 100.0 | 100 |
| 129.7 | 0.603000 | 13.277 | 2194.432 | 100.0 | 100 |
| 129.7 | 0.771000 | 23.316 | 2805.816 | 100.0 | 100 |
| 129.7 | 0.789000 | 24.072 | 2871.321 | 100.0 | 100 |
| 129.7 | 0.824176 | 27.094 | 2999.333 | 100.0 | 100 |
| 129.7 | 1.000000 | 46.578 | 3639.190 | 100.0 | 100 |
| 220.0 | 0.456000 | 0.000 | 1659.840 | 100.0 | 3 |
| 220.0 | 0.603000 | 0.054 | 2194.920 | 100.0 | 35 |
| 220.0 | 0.771000 | 0.270 | 2806.440 | 100.0 | 100 |
| 220.0 | 0.789000 | 0.270 | 2871.960 | 100.0 | 100 |
| 220.0 | 0.824176 | 0.324 | 3000.000 | 100.0 | 100 |
| 220.0 | 1.000000 | 1.241 | 3640.000 | 100.0 | 100 |

## Real pairs and bound integration (INFO)

Every row pools eight seeds; body and envelope violation counts are zero for every row. Selawyn's
R2 entries (35 and 8 summits) are INFO shares of the available summits; CONTRACT R2 is null.

| World | tau | w m | y/w | Density | Max m | Envelope max m | Body max m | R2 % (count) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Maithea | 0.789084604 | 71598.664 | 0.0 | 42.422 | 2871.962 | 2872.268 | 6628.142 | 100 (100) |
| Maithea | 0.789084604 | 71598.664 | 0.4 | 22.758 | 2865.290 | 2872.268 | 6628.142 | 100 (100) |
| Selawyn | 0.603382925 | 220000.000 | 0.0 | 0.054 | 2196.314 | 2196.314 | 5175.954 | 100 (35) |
| Selawyn | 0.603382925 | 220000.000 | 0.4 | 0.054 | 1960.963 | 2196.314 | 5175.954 | 100 (8) |
| Raiva | 0.456025502 | 90090.171 | 0.0 | 7.934 | 1659.854 | 1659.933 | 4023.619 | 100 (100) |
| Raiva | 0.456025502 | 90090.171 | 0.4 | 2.618 | 1655.488 | 1659.933 | 4023.619 | 100 (100) |
| Lethuris | 0.770802080 | 129657.615 | 0.0 | 22.722 | 2805.704 | 2805.720 | 6485.172 | 100 (100) |
| Lethuris | 0.770802080 | 129657.615 | 0.4 | 11.388 | 2768.941 | 2805.720 | 6485.172 | 100 (100) |

Selawyn stays at 0.054 on the flank. Raiva is already just below 8 at its actual tau/width
and drops to 2.618 on the flank. Maithea drops from 42.422 to 22.758; Lethuris from 22.722
to 11.388. A successful 3 km / 32 km element fixture is not evidence that these real pairs pass R1.

## Control context (INFO)

| Control | Density per 1000 km² | Per-site min–max |
|---|---:|---:|
| alpine | 13.493 | 10.363–15.976 |
| dome | 0.000 | 0.000–0.000 |
| eroded-alpine-central-crop | 1.727 | 1.727–1.727 |
| ss-uniform-s1 | 6.854 | 5.181–8.636 |
| ss-uniform-s2 | 9.769 | 8.204–12.090 |
| ss-uniform-s3 | 9.229 | 6.908–11.658 |
| ss-uniform-s4 | 10.147 | 9.067–10.794 |
| ss-uniform-s1-off | 3.616 | 2.591–4.318 |
| ss-uniform-sc09-s1 | 6.153 | 4.750–7.772 |
| ss-uniform-125m-s1-off | 7.286 | 6.045–8.636 |
| ss-envelope-s1 | 4.965 | 4.318–6.477 |
| ss-envelope-s2 | 3.886 | 2.591–5.613 |
| ss-envelope-s3 | 3.994 | 3.022–5.613 |
| ss-envelope-s1-off | 2.537 | 1.727–3.454 |
| ss-envelope-sc09-s1 | 4.102 | 3.454–4.750 |

The physically eroded control densities span 1.727–10.147 pooled, below 25, while the
M4 fixture is 39.062. These observations do not establish a safe upper bound; prominence density
alone does not decide appearance or whether a range is a needle field.

Full command: `node scripts/mountain-render-summits.mjs`, exit 0, wall 169.251 s
(measured inside the script, including report/renders/control work; excludes process startup).
Coordinator re-run after the review fixes: exit 0, 163.970 s; acceptance values identical
(density 39.062, placement 100/100, max 3000 m, 0 violations).

## Visual review (coordinator)

The marked 48 km render shows the prominence >= 300 m summits spread over both flanks as knobs on
the transverse spurs, not concentrated on the axis; the main divide is the straight bright line
already recorded for M3 F. Density 39 per 1000 km² is 4-23x the physically eroded controls
(1.7-10.1) and 2.9x the un-eroded alpine control (13.5). R1's lower bound passes with a large
margin; whether this many flank summits is right is an owner question (the UNCALIBRATED 25
ceiling would fail it).

## Luna (VISUAL-ADVISORY, `scripts/luna-vote.mjs`, 3 asks + diagnosis)

Evidence: `test-results/mountains/M4/luna/` (manifests, logs, JSON; images in `img/`, the
coordinator's extra control renders from `extra-controls.mjs`). Controls: 4 known-good (eroded
alpine sites 0 and 1, steady-state uniform strip, un-eroded alpine) and 3 known-bad (dome sites
0 and 1, bare envelope). Plain hillshades, no markers.

| Question | Known-good passed | Known-bad failed | Calibration |
|---|---|---|---|
| `q-distinct-summits` (asks for separate summit points and saddles) | 1 of 4 (eroded s0 UNSTABLE, steady-state FAIL, alpine FAIL: "dense fine-grained relief obscures separated high points") | 2 of 3 (dome s0 UNSTABLE) | **UNCALIBRATED** |
| `q-rugged-peaks` (reworded: summits at this scale are the bright tops of ridges and knobs; rugged peaks-and-valleys vs smooth/featureless) | 4 of 4 | 3 of 3 | **CALIBRATED** (luna-vote controls rule; 5 of 7 unanimous) |

Votes on the M4 composition with `q-rugged-peaks` (citable under that rule): 48 km seed 730201
PASS 3/0/0, 48 km seed 730204 PASS 3/0/0, 96 km seed 730201 PASS 3/0/0. Scope: this question
separates rugged peaked relief from smooth ground only. It has no needle-field or
artificial-pattern negative and says nothing about the density question above; the section 6
calibration (12 controls, two render paths, hard negative) was not run.

## Review

Astra (gpt-6-astra, read-only): FIX-BLOCKERS-FIRST with one MAJOR and one MINOR, both fixed:
- MAJOR: R2 accepted fewer than 100 summits (a one-peak probe passed all rows). Fixed: R2 is NaN
  unless 100 summits exist; pinned by a one-peak negative in the unit test.
- MINOR: the import audit was direct-only. Fixed: it walks the reachable local import graph.
Astra independently reproduced the core areas, the four real-pair sites, taus and body bounds,
the pinned digest from a fresh process (cold reverse, warm forward), and matched all 65 INFO table
rows against report.json.

## Open items for the owner / MTN-6

1. Wide belts: with real parameters the composition fails R1 on Selawyn's 220 km belt (0.054) and
   Raiva is marginal (7.934 at the axis, 2.618 at 0.4w); Lethuris drops to 11.4 at 0.4w. Cause:
   M3's lattice spacing is 2w/480 (917 m at 220 km), so its relief scales with the belt width,
   and the amplitude scales with tau. MTN-6 has to decide how M3 receives its width (for example a
   fixed carving width tiled across wide belts) before the assembled check can pass R1.
2. Density ceiling: the UNCALIBRATED 25 stays ungated. The fixture is at 39, above every
   physically eroded control; whether to calibrate a ceiling (and against which positive) is open.
3. R2 holds by construction in the element; it becomes meaningful only in the assembled check,
   where the outside-belt floor keeps main's ridges.
