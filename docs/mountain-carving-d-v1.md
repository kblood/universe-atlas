# Candidate D, round 5

Coordinator note (2026-10-05): D was written by Astra in the worktree `m3-r5-d` by a previous M3
agent that died on an API 529 error. D's source was never committed; it is kept as a patch in the
gitignored evidence `test-results/mountains/M3-r5/D-source.patch`, with renders under
`test-results/mountains/M3-r5/D/`. The `m3-r5-d` worktree and branch were removed. The report below
is Astra's, unchanged. D was measured with a D-local copy of the calibrated metrics, which are the
same functions that were later committed in `tests/helpers/mountain-metrics.mjs`.

**Rejected after six variants.** Seven pooled rows pass. Relief8 is 1448 m against 1500 m; cold weighted cost is 8.505% against 8%. The visuals remain artificial. A2 is still the dispatcher. Nothing was committed and no .git files were written.

## Method

Divide-bounded blocks have no side outlets; priority flooding starts only on belt-margin vertices. The 241 x 61 mesh uses actual triangle edges for receivers, physical triangle-area accumulation, stream-power integration (m=.375) and channel-seeded slope propagation. Heights are capped to the reference ramp, then barycentrically interpolated and scaled to the caller's envelope. No detail noise is added to the final heights.

Side boundaries jitter and wiggle with absolute block IDs. Final JITTER+WIGGLE=.45 guarantees noncrossing walls (width at least .1 times the mean). Boundaries and query ownership use the same linearly interpolated row samples. Shared vertex height is the canonical minimum of the reference envelope and neighbouring interior heights plus threshold slope times edge length on both sides. Actual triangle-edge neighbours are used; equality belongs to the right block. Adjacent blocks can produce steep boundary notches despite numeric continuity. These are routing walls, not a globally self-consistent cross-block discharge solution.

Routing priority has a smooth 24 km along-axis wander of amplitude 2500 m. The reference cap itself remains the original straight ramp. This reduces but does not eliminate capped crest bands; carving cannot lift a wandering crest above the envelope. Compared with the proposed jitter range, v6 uses bounded total jitter to guarantee noncrossing walls for all seeds.

Each raw interior block and each completed query block is inserted only after completion. Two separate 32-slot direct maps compare exact seed, width and block ID; collisions rebuild. Completed surface generation uses its own raw interior and two neighbours, with no recursive dependencies. Stored typed-array payload at full capacity is at most **7773696 bytes**, excluding object/array headers and temporary build arrays; shared boundary arrays can make actual retained bytes smaller. C's separate unchanged memo is excluded. The construction drainage certificate covers the reference ramp, not arbitrary caller envelopes, chart transitions or D8 resampling.

C shares only private mesh/interpolation/heap/noise arithmetic; default arguments retain C's operations and both pinned digests. D's source is compact because the unchanged C child-process fixture passes the entire source on Windows' command line; duplicating helpers exceeded that limit. Existing A2/B/C constants, dispatcher, tests, pins and metric harness are unchanged.

## Constants

Version: `mountain-carving-d-1`.

```json
{
  "ROWS": 240,
  "COLS": 60,
  "CACHE": 32,
  "TILT": 1.3,
  "NOISE_AMP": 400,
  "NOISE_LAMBDA": 8000,
  "SC": 1.1,
  "FOOT": 1500,
  "AC": 300000,
  "M": 0.375,
  "K": 40,
  "JITTER": 0.3,
  "WIGGLE": 0.15,
  "WANDER": 2500,
  "EPSILON": 1e-06,
  "REFERENCE_M": 3000
}
```

Fixed routing octave gain .6, six octaves, wander wavelength 24000 m, boundary wiggle wavelength W/5 and mean block width W/2. At W=30000 m, cross-row construction spacing is 250 m; along spacing varies with block width.

## Measurements

Bounds: core >30 >=25%; slope >=20 deg; flank >=12 deg; relief8 >=1500 m; beta 2.0-2.6; fill <=.05; area-qualified pits <=50/1000 km2; S .14-.64. Only pooled rows gate; per-seed results are reported independently.

| Site | Core >30 % | Slope deg | Flank deg | Relief8 m | Beta | Fill | Area pits | S | All pits INFO | Raw coherence INFO |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Pooled | 38.423 | 23.4 | 14.7 | 1448 | 2.14 | 0.008 | 0 | 0.166 | 587.6 | 0.363 |
| 730201 | 39.7 | 23.8 | 14.9 | 1468 | 2.13 | 0.01 | 0 | 0.213 | 760.4 | 0.343 |
| 730202 | 37.955 | 23.2 | 14.6 | 1460 | 2.07 | 0.009 | 0.9 | 0.164 | 667.5 | 0.373 |
| 730203 | 38.482 | 23.3 | 14.8 | 1356 | 2.13 | 0.008 | 0 | 0.285 | 607.1 | 0.386 |
| 730204 | 39.054 | 24 | 14.9 | 1418 | 2.26 | 0.008 | 0 | 0.166 | 587.6 | 0.366 |
| 730205 | 39.978 | 23.9 | 15 | 1440 | 2.08 | 0.007 | 0 | 0.115 | 556.1 | 0.379 |
| 730206 | 38.979 | 23.5 | 14.1 | 1448 | 2.04 | 0.009 | 0 | 0.156 | 677.9 | 0.321 |
| 730207 | 35.848 | 22.2 | 14.4 | 1356 | 2.15 | 0.008 | 0.9 | 0.089 | 559.6 | 0.391 |
| 730208 | 37.385 | 23 | 14.8 | 1523 | 2.21 | 0.008 | 0 | 0.164 | 572.1 | 0.296 |

Relief fails on seven seeds; seed 730208 passes all eight. S additionally fails on 730205 and 730207. Old pit count and raw coherence are INFO and do not gate. The two new metrics are a verbatim D-local copy of the coordinator's frozen exploratory functions, not edits to tests/helpers/mountain-metrics.mjs. Frozen function-group SHA-256: `4752efc2475a932577b85263c202af83162665e5779e27e3b2862a36d8110159`. A direct source comparison verifies both copied groups and the complete unchanged existing test prefix.

Coast: 297992 samples; 111168 outside belt; 0 negative heights, 0 positive carvings and 0 outside-positive-zero violations.

Point-sampled retention proxy (production peak correction omitted): L6 **85.019%**, L8 **86.014%**.

## Cost (INFO)

Same-process terrain reference is terrainSampler(maithea()). Standard workload: 1185800 samples. CPU quiet slot not acquired; coordinator must rerun. These are weighted cost proxies, not assembled terrain slowdowns.

| Workload | ns/sample | Builds |
|---|---:|---:|
| Empty cache | 402.189 | 51 |
| Second pass | 286.938 | 33 |
| Resident warm | 108.338 | 0 |
| Terrain reference | 472.894 | � |
| Isolated cold query, worst of seven | 28800700 | 3 |

Cold weighted proxy: **8.505%**; warm: **2.291%**. Median block build: **6.1775 ms**. Sparse worst measurement: **28.8007 ms** including both neighbours; this is an observed maximum, not a universal time bound. Cold build total: 338.1878 ms. First full benchmark measured 9.270% cold; the final source run above still fails. Earlier variant cold timings are in variants.md and are not CPU-slot comparisons.

## Digests and verification

- Small D: `5d329fc24446d6dbcb586c6e9f8fb231867f18cc3ca892edeb962e0c6ee350eb`.
- Production D: `a278f6b07e35e2c53e4a0ce0850bda4811cdd0aa02d12c53f2c94f17368a1508`.
- Source: `3554a5d08e314592c4707362232b4938065ff7c66cf7b3c60ac128475d271021`.
- C small unchanged: `e40c2a40fa6437176b8e58517ec811be1759ddba346afc06eb14f4a2ec5ddf06`.
- C production unchanged: `cc97b80ffec00b6f028bbddee57b4c0c196cb0cba575ed2722f4bb7cf3f85416`.

**16/16 tests, 1714.1804 ms**. D tests cover exclusions, bounds, exact memo keys, frozen constants, small/production digests cold/warm/reverse/evicted/child, all positive vertices on two production blocks including boundaries, a raised-vertex negative control, exact shared heights and shrinking seam differences. Whole-file arithmetic audit passes. Type checking passes.

| Command | Exit |
|---|---:|
| node test-results/mountains/M3-r5/D/variants-run.mjs --candidate D | 0 |
| node scripts/mountain-render-carving.mjs --candidate D | 1 (actual relief failure) |
| node scripts/mountain-render-carving.mjs --candidate D --bench | 0 |
| node --test tests/mountain-carving.test.mjs | 0 |
| node node_modules/typescript/bin/tsc --noEmit | 0 |
| git diff --check | 0 |
| Python frozen-function and unchanged-test-prefix comparison | 0 |

Development failures were corrected: initial C child fixture exceeded Windows command length (unit exit 1); helper callback name initially collided (unit exit 1); a temporary narrowed global CC annotation failed type checking (exit 1). First D CLI run exited 1 due to a circular top-level import, repaired by the D-local frozen-function module. Initial path discovery also exited 1 for absent AGENTS.md and src/terrain/mountain-carving.ts; the actual source is src/mountain-carving.ts. No full suite, downloads, browser, GPU, installation or commit was used.

## Visual self-check and remaining issues

Inspected D-hillshade.png, D-flow.png, D-strip-192km-hillshade.png and all five earlier strips. The prescribed, evenly spaced, uniform-depth transverse gutters are absent. Nevertheless some long narrow curving boundary notches remain visibly imposed. The crest wanders gently but still reads as a near-horizontal band with flat capped stretches. Rectilinear stair-step facets and comb-like tributaries remain conspicuous, alongside broad smooth apron patches. The flow map has branching but many grid-aligned segments. No final visual approval is claimed. Numeric continuity has not made these features credible.

Open issues: pooled relief8, seven per-seed relief failures, two per-seed S failures, cold cost budget, boundary notches and angular/capped visuals. Six measured variants satisfy the requested unsuccessful-search stop condition. v6 is retained for review because it preserves the seven-row pass, slightly improves relief over v2 and guarantees noncrossing walls; it is not a promotable result.

## Files and evidence

Changed: src/mountain-carving.ts; tests/mountain-carving.test.mjs (append only); scripts/mountain-render-carving.mjs; new scripts/mountain-carving-d-metrics.mjs; this report. Gitignored evidence: test-results/mountains/M3-r5/D/report.json, benchmark.json, variants.json, variants.md, variants-run.mjs, all PNGs and command logs. The exploratory explore.mjs copy additionally exports the frozen functions and accepts field D; arithmetic is unchanged. fields.mjs is unchanged.
