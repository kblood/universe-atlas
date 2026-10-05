# M3 round 4: candidate C

**Implemented, numerically and visually rejected for promotion.** Six of eight pooled rows pass; every seed fails raster pit density. A2/B and the dispatcher remain unchanged. No thresholds, control data, existing pins, or .git files were changed. No bounded sweep was run: the raster drainage gap and visible construction artifacts warrant reporting, not parameter selection.

## Method and scope

New exports: carvingCM, MOUNTAIN_CARVING_C, CARVING_C_VERSION='mountain-carving-c-1'. Full-width canonical blocks contain 481 x 121 vertices, approximately 125 m spacing at W=30 km. Hashed diagonals are shared by routing, hillslope propagation, and barycentric interpolation. Priority uses six absolute-coordinate smoothstep noise octaves from 8 km to 250 m with gain .6, tilt 1.3, amplitude 400 m. Receiver selection follows an epsilon priority flood; physical triangle areas accumulate to boundaries. Heights integrate upstream using m=.375 via three nested square roots of A*A*A, then undergo channel-seeded mesh Dijkstra and reference-envelope capping. REROUTE=0. No extra noise, grooves, or symmetry were added.

Shared boundary curves are sampled at canonical rows and interpolated linearly for both ownership and queries; equality belongs to the block on the right. Trunks integrate from each margin toward the head with midpoint segment slopes and physical polyline lengths. HACK_C=2.56 gives approximately 175 km2 at 30 km. The shared head uses the lower flank-integrated value. Prescribed boundary discharge is not globally self-consistent with the two adjacent blocks' accumulated areas.

K was calibrated once on **seed 730201, block 0, W=30000**, over all core vertices with e0>.35, including the Dijkstra step and before capping. Twenty-two geometric bisection iterations give **K=37.552365026127084** at p90 H/E approximately 1.0. All other specified starting values were retained. Calibration iterations: [calibration.json](../test-results/mountains/M3-r4/calibration.json).

The 32-slot direct-mapped memo is an explicit change from the earlier no-stored-state architecture. Complete blocks are built before insertion; exact seed, width and block ID comparisons guard every hit; collisions rebuild. Stored heights and boundaries occupy **15145728 bytes** at capacity, excluding object/array headers and temporary build arrays. Generation has no tile or LOD dependencies. Temporary mesh/routing arrays are not retained in the cache.

The reference construction mesh has strict downhill edges at positive interior vertices: stream integration has a lower receiver, Dijkstra has a lower predecessor, and the reference ramp has a lower cross-row edge. Taking minima preserves that property; linear triangles introduce no strict interior minima. Two full-resolution blocks are tested, including raised-neighbour negative controls and accumulation conservation. This is **not** a D8-raster or arbitrary-envelope drainage guarantee, nor a claim of globally solved erosion. Changing chart/seed interfaces remain outside the certificate.

The coordinator's whole-strip probe used periodic D8 routing, 16-neighbour hillslope propagation and bilinear reconstruction. C uses the requested block mesh throughout and imposed trunk profiles. The probe's passing result does not carry over: the resampled valleys have many shallow D8 pits. The small fill share does not excuse the failed pit count. The coordinator's earlier rerouting result (coherence approximately .2) remains a negative finding; C performs no reroutes.

## Measurements

The original A2/B aggregation is preserved: core pixels for steep share; pooled whole-raster slope, crest and relief populations; averaged spectral power; site medians for drainage; pooled regional coherence values. Each seed also has its own independent site report, rather than offsets through one repeated strip.

| Row | Bound | Pooled | Result |
| --- | --- | --- | --- |
| slope125Over30 | >= 25 | 50.661 | PASS |
| slope125P50 | >= 20 | 27.1 | PASS |
| flank500mP50 | >= 12 | 16 | PASS |
| relief8kmP50 | >= 1500 | 1565 | PASS |
| beta500mTo8km | between 2,2.6 | 2.28 | PASS |
| fill10ShareP50 | <= 0.05 | 0.008 | PASS |
| pitsPer1000km2P50 | <= 50 | 592 | FAIL |
| coherence40kmWindowP50 | >= 0.35 | 0.345 | FAIL |

| Seed | Core >30 % | Slope p50 | Flank | Relief8 m | Beta | Fill share | Pits/1000 km2 | Coherence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 730201 | 50.653 | 27 | 15.9 | 1565 | 2.41 | 0.009 | **740.9 FAIL** | 0.394 |
| 730202 | 51.167 | 27.3 | 16.3 | 1557 | 2.23 | 0.007 | **583.3 FAIL** | 0.36 |
| 730203 | 49.643 | 26.7 | 15.8 | **1452 FAIL** | 2.26 | 0.008 | **649 FAIL** | 0.357 |
| 730204 | 52.958 | 28.1 | 16.6 | 1580 | 2.11 | 0.008 | **592 FAIL** | **0.334 FAIL** |
| 730205 | 50.558 | 27 | 16 | 1551 | 2.29 | 0.006 | **509.5 FAIL** | **0.329 FAIL** |
| 730206 | 49.97 | 26.9 | 15.7 | **1475 FAIL** | 2.18 | 0.008 | **620 FAIL** | **0.337 FAIL** |
| 730207 | 49.15 | 26.5 | 16 | **1493 FAIL** | 2.32 | 0.006 | **551.4 FAIL** | **0.33 FAIL** |
| 730208 | 51.19 | 27.3 | 15.9 | 1570 | 2.3 | 0.008 | **592.4 FAIL** | 0.35 |

Coast safety: **297992 samples**, 111168 outside the belt; zero negative-height, positive-carving, or outside-positive-zero violations.

INFO retention (point-sampled proxy, production peak correction omitted): **L6 81.768%; L8 86.505%**.

| Diagnostic (lower site median) | Value |
| --- | --- |
| headsPer1000km2 | 750.858 |
| confluencesPer1000km2 | 693.864 |
| mirrorCorrelation | 0.455 |
| uncarvedSharePct | 4.193 |

## Costs

| Workload | ns/sample | Builds |
| --- | --- | --- |
| Standard 1,185,800 samples, empty cache | 961.602 | 34 |
| Same workload second pass | 545.012 | 18 |
| Same sites individually resident | 109.767 | 0 |
| Terrain reference | 721.891 | — |

Median block build **27.785 ms** (seven builds). Cold build time totals 1000.811 ms. A second pass is not fully warm because the direct-mapped cache collides across sites. Resident timing preloads each site's working set outside timing and confirms zero timed builds.

At 10% belt share the weighted terrain-cost proxies are **13.321% cold** and **1.521% resident**, against +8%. These are not assembled slowdowns. Each workload has one timed pass, build time uses a private source-loaded instrumentation wrapper, and no CPU-quiet lock was acquired. [Raw benchmark](../test-results/mountains/M3-r4/benchmark.json).

## Visual verdict

I inspected the [48 km hillshade](../test-results/mountains/M3-r4/C-hillshade.png), [flow map](../test-results/mountains/M3-r4/C-flow.png), and [192 km x 60 km strip](../test-results/mountains/M3-r4/C-strip-192km-hillshade.png). **Not visually credible enough for promotion.** There is branching and confluence structure, but the long strip exposes recurring, almost transverse trunk gutters at block spacing. Boundary curves bend smoothly yet retain an imposed rhythm. The center is a conspicuously straight horizontal divide with shallow/capped stretches, not a naturally wandering divide. Slopes have angular facets and grid-like steps. Wide smooth apron patches alternate with narrow incised valleys toward the margins. The flow map shows irregular branching but also rectilinear stair-steps. The sides are not exact mirrors; their common ramp and imposed trunks still produce strong visual correspondence. Numeric C0 continuity does not remove those visual artifacts.

## Verification

| Command | Exit |
| --- | --- |
| node scripts/mountain-render-carving.mjs --candidate C --calibrate | 0 |
| node --test tests/mountain-carving.test.mjs | 0 |
| npx tsc --noEmit | 0 |
| node scripts/mountain-render-carving.mjs --candidate C | 1 |
| node scripts/mountain-render-carving.mjs --candidate C --bench | 0 |
| node scripts/mountain-render-carving.mjs --quick | 0 |
| git diff --check | 0 |

The unit file passes **13/13**, including all unchanged existing tests, in **1073.1139 ms** (<2 s). The evaluation's exit 1 is an actual acceptance failure, not a tool error. The whole-file arithmetic audit passes.

Production C SHA-256 (128 samples, 480x120 lattice): **cc97b80ffec00b6f028bbddee57b4c0c196cb0cba575ed2722f4bb7cf3f85416**. Identical forward/reverse, cold/warm, after a direct-map eviction, and in a child process. Small-lattice equivalent: **e40c2a40fa6437176b8e58517ec811be1759ddba346afc06eb14f4a2ec5ddf06**. Production source SHA-256: **7b46e649fb20309549dc374dba5db97e1f05da0b82d074d2684fcbf1fbc95580**.

Files changed: src/mountain-carving.ts (C appended), tests/mountain-carving.test.mjs (C tests appended), scripts/mountain-render-carving.mjs (C mode and private calibration/benchmark support), this document, and evidence under test-results/mountains/M3-r4/. Existing untracked probe scripts were left untouched.

## Coordinator findings (round 4): M3 stays BLOCKED

Decision: candidate C is **not promoted**. Pooled pits are 592 against a limit of 50, and pooled coherence is 0.345 against 0.35. The cold cost proxy is 13.3% against 8%, and the visuals are not credible. A2 remains the dispatcher. No row, threshold, pin, golden or control was changed. The eroded control re-verifies bit-identically (`--verify-controls`, exit 0).

Round 4 is structurally different from rounds 1-3. Those rounds were pointwise kernels. This one is a drainage-network-first construction: priority-flood routing, flow accumulation, stream-power profiles and threshold hillslopes. Astra proposed three families (design-answer.md in the probe folder): (1) drainage lattice, (2) ridge mesh, (3) fault-block/glacial. Family 1 was implemented because only it produces the transverse dendritic structure the coherence row rewards without gaming it.

### Whole-strip probe: what passed, and why it does not transfer

The probe is `scripts/mountain-carving-strip-probe.mjs`. It is a periodic 384 km strip, so it is not tile-independent and is not a candidate. Settings: tilt 1.3, noise 400, Ac 0.3 km2, Sc 0.9, foot 1500, m 0.375, pfit 0.97. It passes all eight rows on seeds 1 and 2. Seeds 3 and 4 miss relief8 by 2-20 m:

| Seed | Relief8 (m) | Beta | Pits | Coherence |
| --- | --- | --- | --- | --- |
| 1 | 1500 | 2.40 | 0 | 0.398 |
| 2 | 1501 | 2.34 | 0 | 0.394 |
| 3 | 1480 | 2.32 | 0 | 0.373 |
| 4 | 1498 | 2.33 | 0 | 0.391 |

**Its zero pit count is a grid-alignment artifact.** The measurement rasters (sites at along = k·1e6 m, 125 m step) fall exactly on the probe's 125 m nodes. Shifting the sampler by a sub-cell offset changes the result on seed 1:

| Offset (x, y) | Pits/1000 km² | Relief8 (m) |
| --- | --- | --- |
| (0, 0) | 0 | 1500 |
| (62.5, 0) | 588.5 | 1435 |
| (37, 53) | 591.5 | 1431 |
| (91, 17) | 395.9 | 1440 |

The fail pattern is the same as C's: 592 pooled. So C's pit failure is not a block-mesh defect. Single-node-wide channels aliased onto an unaligned D8 raster produce strict pits, even though the construction surface provably has no interior minima. The same is likely true of the frozen eroded control, which scores P=0 pits: it is built on the measurement raster itself (owner note: its pit calibration never saw resampling).

Coarser construction meshes are a diagnostic, not a candidate: `scripts/mountain-carving-c-coarse-probe.mjs`, with K recalibrated by the same rule:

| Mesh | Pits | Coherence | Other rows | Cold cost (ns/sample, busy machine) | Build |
| --- | --- | --- | --- | --- | --- |
| 250 m | 397 | 0.354 | others pass | 303 | 5.8 ms |
| 500 m | 180 | 0.365 | slope >30 21.7 F, slope p50 19.2 F, relief8 1485 F, beta 2.76 F | 238 | 2.0 ms |

Pits fall with mesh coarsening far more slowly than the slope and spectrum rows degrade, so there is no resolution that passes. Other probe variants:

- A wandering divide (`--wander` 3000/6000 m) removes the straight capped divide. It drops coherence to 0.30-0.32 and relief8 to about 1460-1480 (both fail).
- Rerouting toward steady state (2 passes) drops coherence to 0.28-0.29 (fail).

### Coherence row: well-posedness argument for the owner (row NOT changed)

The row measures regional directional concentration, not erosion. The evidence uses `scripts/mountain-coherence-steady-state.mjs`, a steady-state stream-power ramp (n=1, m=0.5) on the section 2.3 geometry, measured with the harness's own `coherence()` and `measureSites`:

| Uplift | Coherence (2 km point samples) | Box-averaged 2 / 4 / 8 km | Rows |
| --- | --- | --- | --- |
| Uniform (Hovius-like transverse basins, the textbook linear-range case) | 0.084-0.145 over 5 seed/step runs | 0.13-0.15 / 0.16-0.28 / 0.70-0.73 | With all eight rows: coherence 0.08 F, beta 1.46 F |
| Envelope-proportional | 0.37-0.40 | — | Coherence 0.40 P, relief8 1207-1348 F, beta 1.48-1.95 F |

The isotropic alpine control scores 0.139, which is indistinguishable from the physically eroded uniform-uplift range. The threshold rationale lists only negatives plus main's maze, and no eroded positive control on the ramp. By Astra's analysis, C ≥ 0.35 needs an eigenvalue ratio ≥ 2.077; with two orthogonal populations, one must carry ≥ 67.5% of gradient energy. The row is therefore passable only by strongly consequent (parallel, young-range) drainage, or by envelope-proportional uplift. It rewards straight parallel combs: a tilt-2 probe scores 0.54 and looks artificial. Recommendation for the owner, not applied: calibrate coherence against an eroded positive control on the ramp, or measure it on a detrended / band-passed field, before it gates acceptance.

### Cost and architecture

C introduces a deterministic 32-slot block memo of about 15 MB at capacity. This changes the "no stored state" architecture; it is observationally pure (tested cold, warm, evicted and in a child process). The figures are against a measured terrain reference of 722 ns (machine busy; earlier quiet reference ≈ 464 ns):

| Metric | Value |
| --- | --- |
| Cold standard workload | 962 ns/sample, 34 builds × 28 ms |
| Weighted proxy at 10% belt share | 13.3% (would be ≈ 20.7% against 464 ns) |
| Resident warm | 110 ns/sample (1.5%) |

The advisory fails cold.

### Visual verdict (coordinator, independent of Astra)

The probe strips show transverse dendritic basins with dissected foothills: the best structure of any round. However, they still have:

- a flat, straight, capped divide strip;
- D8-straight facets;
- a combed, along-tilted grain.

C's 192 km strip is worse. Its prescribed block-boundary trunks appear as evenly spaced, nearly transverse gutters every ~15 km. That is a visible tiling rhythm and would be called artificial on sight.
