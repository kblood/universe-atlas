# M3 carving F: seam-free haloed drainage solve (2026-10-05)

Element M3 (MTN-4), branch `mountains/m3-r5`. Version `mountain-carving-2`. F replaces the
rejected candidates A2, B, C, D and E in `src/mountain-carving.ts`; `ridgeValleyCarvingM` now
dispatches to F. The carving stays **unwired**: nothing in `terrain.ts` calls it until MTN-6.

Owner decisions applied (2026-10-05):

- (a) the calibrated coherence and pit rows (`docs/mountain-m3-calibration-v1.md`) are the rows
  judged here; they merge together with M3.
- (c) the cost advisory is judged on the warm-cache resident cost per region against the 8%
  budget; the cold first-touch cost is measured and reported, and does not block. This is what
  allows a haloed 125 m drainage solve.
- Nothing else is loosened. The other six rows are unchanged; no LOD pin or golden is touched.

## Why F

Rounds 1-5 (`docs/mountain-carving-v1.md`, `-c-v1`, `-d-v1`, `-e-v1`) showed that only the
drainage-network-first family produces the rows with real dendritic structure, and that every
tile-independent version left a visible rhythm at block spacing (C trunk gutters, D notches, E
raised ribbons), because each along-axis block solved its own drainage with its own walls. F removes
the cause: the drainage of every block is solved on a domain padded by a halo wide enough that the
solved values on the core no longer depend on where the domain ends.

## Method

Arguments follow section 2.3: `carvingFM(alongM, acrossM, halfWidthM, envelopeM, belt, seed)`.

1. **Global lattice.** Rows `j = 0..480` across the belt (`y = -w + j d`), global columns `c` along
   it (`x = c d`), `d = 2w/480` (125 m at `w = 30 km`). Each cell's diagonal is a seeded hash of its
   global `(c, j)`, so the triangulated mesh does not depend on any block.
2. **Blocks and halo.** A block is 128 columns (16 km). It is solved on columns
   `[128 id - HALO, 128 (id+1) + HALO]` with `HALO = 192` (24 km per side).
3. **Routing surface.** `1.3 x` the 3 km reference ramp plus 400 m of 6-octave fBm value noise
   (8 km base wavelength, gain 0.6), all in absolute coordinates.
4. **Priority flood** from the two margin rows only (the domain side walls are not outlets),
   steepest-descent receivers on the filled surface, upstream area in reverse flood order.
5. **Heights** integrated from the outlets: hillslope gradient `1.0 x min(1, e/1500 m)` below a
   channel area of 0.6 km², stream power `K / A^(3/8)` with `K = 33` (capped by the hillslope
   gradient) at or above it. `A^(3/8)` is `sqrt(sqrt(sqrt(A^3)))` (audited arithmetic).
6. **Hillslope limit.** Shortest path (Dijkstra) from the margins and channel vertices at the
   hillslope gradient; heights are `min(stream integral, hillslope limit)`.
7. **Relief normaliser.** `M` = two 9x9 box blurs of a 17x17 dilation of the heights (1 km
   radius), evaluated only on the columns that reach the core. `retained = h / max(e_ref, M)`,
   clipped to [0, 1]. This keeps local maxima near the envelope (relief) without the hard-capped
   flat crest band of C/E (capped share 0.02% instead of 8-16%).
8. **Query.** `col = floor(x/d)`, block `floor(col/128)`, triangle interpolation on the hashed
   diagonal. The carving is `-envelope (1 - retained)`, exactly `+0` where `belt === 0`,
   `envelope <= 0` or `|across| >= w`. So `envelope + carving = envelope x retained >= 0`.

Tie-breaks (heap order, receiver ties) use the local row-major index, which orders any two vertices
the same way in every domain that contains both; with enough halo every core value is a function of
the vertex alone. **This is measured, not proven**: a flood route can in principle run further along
the belt than the halo. Seam columns (column 128 of block `id` vs column 0 of block `id+1`):

| HALO (columns) | seams checked | seams differing | max retained difference |
|---|---|---|---|
| 128 (16 km) | 56 | 2 | 8.3e-4 (about 2.5 m at 3 km) |
| 160 (20 km) | 280 | 1 | 1.3e-6 |
| **192 (24 km)** | **280** | **0** | 0 |

A block solved with HALO 192 is also bit-identical to the same block solved with HALO 256 (pinned in
`tests/mountain-carving-memo.test.mjs`, which also shows a 4 km halo differs at 25,530 values).

**Memo.** LRU of 32 blocks keyed on exact `(seed >>> 0, halfWidth, id)`, storing the 481 x 129 core
values as Float32 (248,196 B per block, 7.94 MB in total). Working arrays are allocated per solve
(12.3 MB transient) and freed; nothing else persists. A value never depends on what was solved
before: cold, warm, reverse, evicted (CACHE 1) and child-process digests are identical.

## Acceptance (`node scripts/mountain-carving-f.mjs`, exit 0)

Run before the final exclusion hardening (non-finite inputs return `+0`), which changes no finite
value: the pinned digest is unchanged.

Synthetic ramp, 8 seeds (730201-730208), 48 km rasters at 125 m and the 386 km regional raster.

| Row | Threshold | Pooled | Per seed (min - max) |
|---|---|---|---|
| core slope > 30 deg (\|across\| <= 19.5 km) | >= 25% | 69.7% | 68.5 - 71.1 |
| slope125P50 | >= 20 deg | 33.9 | 33.5 - 34.5 |
| flank500mP50 | >= 12 deg | 20.7 | 20.2 - 21.2 |
| relief8kmP50 | >= 1500 m | 1574 | **1519** - 1616 |
| beta500mTo8km | 2.0 - 2.6 | 2.29 | 2.16 - 2.41 |
| fill10ShareP50 | <= 0.05 | 0.004 | 0.003 - 0.006 |
| pits025Per1000km2P50 (calibrated) | <= 50 | 3.9 | 1.3 - 13.0 |
| axisCoherence40kmP50 (calibrated) | 0.14 - 0.64 | 0.224 | 0.197 - 0.276 |

All eight rows pass pooled and on every seed. relief8 per seed: 1592, 1537, 1519, 1616, 1589, 1574,
1519, 1602 (the tightest margin, 19 m, is on seeds 730203 and 730207).

Coast safety: 297,992 samples (111,168 outside the belt): 0 violations of `envelope + carving >= 0`,
0 non-`+0` values outside, 0 positive carvings.

Retention proxy (INFO, point-sampled, no production peak correction): L6 79.3% of p90 peaks kept,
L8 74.7% (bare envelope 100 / 100). For Q3 / MTN-6.

## Cost (`node scripts/mountain-carving-f.mjs --bench`, INFO)

1,185,800 samples (8 sites x 385²), compared with `terrainSampler(maithea())` on the same count.

| Measure | ns per sample | weighted at 10% belt land |
|---|---|---|
| terrain sampler (median of 3) | 472 | - |
| **resident warm (median of 5 rounds: 45, 62, 49, 46, 79)** | **48.7** | **1.03%** (budget 8%) |
| second pass over all 8 sites (0 rebuilds; the 28 blocks fit the LRU) | 49.4 | 1.04% |
| empty cache, first touch (28 builds) | 3388 | 71.7% (non-blocking under (c)) |

Block build: median 131 ms (7 blocks; 117-195 ms in other runs). Single machine, CPU quiet slot not
acquired.

## Parameter search (scratch prototype, HALO 128, reported for the record)

Base (K 33, hard cap at `e_ref`, no hillslope regime): pits/fill/slope pass, but relief8 fails on 3
seeds (1465-1487) and beta on 5 (1.81-1.99), capped crest share 8%. Adding the hillslope regime
below a channel area raised beta (0.6 km²: 2.29-2.54) and the relief normaliser removed the capped
band and raised relief on every seed. Rejected on the rows: K 38-46 (capped share 15-35%, relief
failures), soft caps (relief 950-1350), m = 7/16 or 1/2 (relief), channel area 1e6 (beta > 2.6),
normaliser radius 12-16 (coherence < 0.14, beta > 2.6), 16 km noise base wavelength (relief,
pits).

Crest wander (prototype only, not in `src`): moving the routing divide by `W x valueNoise(x/24 km)`
on top of the production settings. Passing all rows on all 8 seeds: W 1500 m with channel area
6e5 (relief min 1512, beta 2.05-2.44, coherence min 0.189), W 1500 / 7.5e5 (1528, 2.24-2.54,
0.177) and W 2000 / 7.5e5 (1522, 2.14-2.43, 0.156; visibly wavy divide). Failing: W 2000 / 6e5
(beta min 1.95) and every W >= 2500 or channel area 1e6 variant (beta or coherence). Not adopted:
the margins are thinner than the straight F and the straight crest is an artefact of the
synthetic tent envelope that the real M2 envelope replaces; listed as an open option for MTN-6.

## Visual review

Renders: `test-results/mountains/M3-r5/F/` (48 km hillshade and D8 flow for seeds 730201/04/07,
192 km strips for 730201 and 730206).

Coordinator inspection: **no block rhythm** at 16 km (the strips show no gutters, notches, ribbons or
seam lines at block spacing; the flow maps are dendritic transverse networks with confluences
across block boundaries). Remaining issues, recorded honestly:

- The **main crest is straight** along `y = 0`, a narrow ridge with small knobs. It is the kink of
  the synthetic straight tent envelope: the final surface is `envelope x retained`, and retained is
  near 1 at the divide. It is no longer a capped flat band. A crest-wander variant (parameter search
  above) passes the rows with thinner margins and was not adopted; the crest line belongs to the M2
  envelope at assembly.
- The main divide stays within a few hundred metres of the belt axis, so it reads as one straight
  bright line at 192 km (see Luna below). This is the main open visual item for the owner.
- Flanks are streaky: closely spaced, near-parallel transverse valleys with angular facets at 125 m.
  This is the transverse drainage of a linear range, but the texture is more combed than the eroded
  alpine control.

## Luna (VISUAL-ADVISORY, `scripts/luna-vote.mjs`, 3 asks + diagnosis)

Evidence: `test-results/mountains/M3-r5/luna-F/` (manifests `controls-q1.json`, `controls-q2.json`,
prompts, logs and JSON). Controls: 4 known-good (eroded alpine control, two steady-state
stream-power strips, a steady-state 48 km square on a tent envelope) and 5 known-bad (A2, B, C, D,
E, each with its documented artefact).

| Question | Known-good passed | Known-bad failed | Calibration |
|---|---|---|---|
| `q-natural-eroded` (round-4 wording) | 2 of 4 (both steady-state strips FAIL, "repeated pattern") | 5 of 5 | **UNCALIBRATED** |
| `q-linear-range` (new: says a lengthwise main divide and transverse valleys are normal, names tile seams, fixed-interval gutters/notches/ribbons, flat bands, stars, stair-steps) | 3 of 4 (steady-state strip FAIL) | 1 of 5 (A2; D UNSTABLE; B, C, E PASS) | **UNCALIBRATED** |

The new wording fixed most false failures but lost the teeth against B, C and E, so neither question
is citable. Votes on F (not citable, recorded only):

| Image | q-natural-eroded | q-linear-range |
|---|---|---|
| 48 km, seed 730201 | FAIL 0/3 (repeated pattern) | PASS 2/1 |
| 48 km, seed 730204 | FAIL 0/3 (repeated pattern) | PASS 2/0/1 |
| 48 km, seed 730207 | FAIL 0/3 (repeated pattern) | PASS 3/0 |
| 192 km strip, seed 730201 | FAIL 0/2/1 (other) | FAIL 0/3 (repeated pattern) |
| 192 km strip, seed 730206 | FAIL 0/3 (other) | FAIL 1/2 (repeated pattern) |

The strip diagnoses name the same feature every time: "a conspicuous straight horizontal band cuts
across the range at mid-height", i.e. the straight main divide, which is also what fails the
known-good steady-state strips. Two diagnostics (prototype renders, not in `src`): the crest-wander
strips W 2000 and W 1500 also FAIL q-linear-range 1/2; and F rendered on the merged M2 envelope
profile `(1 - s^2)^3` (smooth at the axis) still shows the bright straight divide, so the line is
the carving's own divide, not the tent kink. Measured: the highest point across +-6 km lies within
375 m of the axis at 17 of 20 stations 2 km apart (seed 730206).

Render caveat (Astra review): the renders sample along-coordinates near 0, while acceptance sites
3-7 sit at 3,000-7,000 km along the belt; F is in absolute coordinates, so the renders show
additional, unmeasured locations of the same field, not the measured rasters.

## Files

- `src/mountain-carving.ts`: F only (version `mountain-carving-2`, frozen `MOUNTAIN_CARVING`,
  unchanged `CARVING_BANDS`, `carvingFM`, `ridgeValleyCarvingM`, `carvingBuildStats`).
- `tests/fixtures/mountain-carving-r5-rejected.ts.txt`: A2, B, C, E exactly as committed at
  `470c8b5` (a commented A2/B/C copy is at `c4c813d`), loaded by `loadRejectedR5()` in
  `tests/helpers/mountain-calibration-controls.mjs`; `scripts/mountain-render-carving.mjs`,
  `scripts/mountain-calibrate-m3.mjs` and `scripts/mountain-carving-c-coarse-probe.mjs` use it, so
  the round 1-5 evidence stays reproducible.
- `tests/mountain-carving.test.mjs` (HARD): exact `+0` exclusions with no solve, coast safety and
  bounds, cold/warm/reverse/child (stdin) digest pin, arithmetic audit with negative controls,
  frozen constants, every interior core construction vertex drains on the solved heights (lowered
  vertex control), plus the unchanged eroded-builder and structure-helper tests.
- `tests/mountain-carving-memo.test.mjs` (HARD): halo agreement vs HALO 256 with a HALO 32
  negative control, bit-exact shared seam columns and seam continuity (two seeds, two half-widths),
  evicted CACHE 1 digest and LRU order, exact half-width key (interleaved 30000 / 30000.5 against
  fresh modules, with a width-blind-key mutation control) and `seed >>> 0`, memo memory bound.
- `tests/mountain-carving-pin.test.mjs` (HARD): the reduced 129-square metric pin, re-pinned for F
  (old A2 values in the file).
- `tests/helpers/mountain-carving-digest.mjs`: shared digest fixture, SHA-256
  `1321803fcd6ba5b03fa009035154a025aefff6a2a5bf1442e9e4cf902443cfee`.
- `scripts/mountain-carving-f.mjs`: acceptance, renders and benchmark driver.

## Review

Astra (gpt-6-astra, read-only): no blockers; heap, flood, receivers, accumulation, Dijkstra limit,
normaliser windows, interpolation, negative indexing, LRU, exclusions and coast bound found correct;
an independent probe found exact agreement on 120 further seams across six half-widths. Two MINOR
findings: the half-width memo key was untested (fixed: key-mutation test above) and the renders are
not the measured sites (recorded above). Exclusions were also hardened so NaN or non-finite inputs
return `+0` (tested).
