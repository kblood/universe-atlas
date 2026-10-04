# LOD ladder and consistency contract, v1 (`lod-ladder-1`)

Status: P3-LOD-CONTRACT, relief round 2026-10-03. Code: `src/lod-ladder.ts` (data and arithmetic only),
`src/planet-tiles.ts` (peak-preserving coarse heights, tile metadata). Tests: `tests/lod-consistency.test.mjs`,
`tests/tile-metadata.test.mjs`. Report: `scripts/lod-consistency-report.mjs`.

## 1. Principle

One deterministic function f(seed, direction, t) is the truth at every level. A coarser level is a declared
**reduction** of the finer level, never a different drawing. Nothing is stored: a tile and its metadata are a
pure function of (seed, address, tile key, t-bucket, sea level) and can be regenerated anywhere, in any order,
in any process or worker (the regenerability rule). Nothing is void: under the sea there is always a solid
seabed, and pressure, depth, gravity and similar quantities are derived from the same data and can be queried
at any point.

## 2. The ladder

Rungs start at physical tile edges (edge = (pi/2) R / 2^L), so the same rung means the same physical scale on
every body. S1 starts at the first level with an edge of 400 km or less, S2 at 10 km or less, S3 at 300 m or
less. S3 ends at the renderer's `contactLevel`, and S4 ends at `fineContactLevel` (`planet-renderer.ts:553/561`,
mirrored as integer loops in `contactLevelFor` / `fineContactLevelFor`).

| Rung | Views | Representation | Keeps |
|---|---|---|---|
| S0 space/orbit | galaxy, system, orbit; slant distance >= 2 R | planetSurface equirect 1024x192 plus quadtree tiles below S1 | continents, coastlines, ice caps, biome belts, the largest ranges as shading |
| S1 atmosphere/horizon | flight 6-100 km; distant mountains seen from the ground | tiles with peak-preserving heights; metadata maxH/peakDir for silhouettes and bounds; coarse class shares from metadata | ranges with true summits, snowline, treeline, coastline, belts |
| S2 far ground | 0.5-6 km; ground view beyond ~2 km | point-sampled tiles; canopy/impostor up to 4500 m; fauna far form in the 100-280 m bands | valleys, ridges, forest edges, beaches |
| S3 near ground | walking, slant < 500 m | contact tiles; fauna near rig 80/95 m; flora field; rocks | hills, gullies, collision geometry |
| S4 fine | contact (< 3 m), water edges, any seabed being approached | fine contact tiles; metre-scale rocks; seabed detail on demand | everything; collision truth |

Level ranges (`ladderFor(R)`):

| Body | R (km) | S0 | S1 | S2 | S3 | S4 | Corrected levels | L6 edge |
|---|---|---|---|---|---|---|---|---|
| Maithea | 5195 | L0-4 | L5-9 | L10-14 | L15-18 | L19-22 | <= L9 | 128 km |
| Selawyn | 8552 | L0-5 | L6-10 | L11-15 | L16-19 | L20-23 | <= L10 | 210 km |
| Raiva | 2002 | L0-2 | L3-8 | L9-13 | L14-17 | L18-21 | <= L8 | 49 km |
| Lethuris | 8997 | L0-5 | L6-10 | L11-15 | L16-19 | L20-23 | <= L10 | 221 km |

`levelForPose(radiusM, altitudeM, distanceM)` maps a viewing situation to a rung. It uses the slant distance
sqrt(altitude² + horizontal²), the same quantity the renderer's split rule divides by:

- slant >= 2 R: S0
- slant >= 6 km: S1
- slant >= 500 m: S2
- slant >= 3 m: S3
- otherwise: S4

Place queries and reports use it to say which representation a viewer at a pose is actually shown. Terrain
generation never uses it.

## 3. Reduction rules

**Height** (levels <= `peakCorrectionMaxLevel(R)`, the last S1 level). Each lattice vertex stores its point
sample p plus a bounded, non-negative correction. The correction reads the four adjacent cell centres c_k,
which are the next finer level's own lattice points:

```
max = max(p, c_1..c_4), min = min(p, c_1..c_4)
transfer: for each adjacent cell k, if p is that cell's highest corner and c_k > p, lift >= c_k
slope:    if max > min, lift >= p + (p - min) / (max - min) * (max - p)
h = max(p, lift)
```

- The correction is zero in a local minimum and grows toward the local maximum. h never exceeds the highest
  of the five samples.
- Three kinds of vertex keep p unchanged:
  - ocean vertices (p below sea level on a water world);
  - vertices whose correction footprint reaches the sea (any c_k below sea level), so the interpolated
    coastline stays where the point lattice puts it;
  - vertices on a cube-face edge, so both faces stay bit-identical along the edge.
- Only `+ - * / min max` are used, so the rule is deterministic, order-independent and gives the same value
  for a vertex seen from either tile.
- Children morph from the corrected parent: `parents` uses the same rule at the parent's lattice. Finer
  levels store p.
- Normals, materials, roughness and the colour texture keep reading point samples.
- Heights are only ever raised, never lowered.

The plan's literal rule, h = mean + 0.5(max - mean) over the vertex and four sub-samples, was measured first and
rejected. At Maithea L6 it kept 81.6% of the peak area, but the median summit loss got worse (312 m against
205 m shipped) because the mean pulls summits down. See
`test-results/relief-round-2026-10-03/P3-LOD-CONTRACT/reduction-variants-L6-L8.txt`.

**Colour and class shares:** coverage-weighted mean of the finer level. A class is carried as a class: the
bilinear-weighted majority of the four corner labels. It is never re-derived from a coarse height.

**Ocean flag:** the exact sign of (height - sea level). It is identical on every vertex two levels share.

## 4. Tile metadata (64 bytes, `meta`, version 1)

`buildTile` returns `meta: Uint8Array(64)`. It is computed from the lattice samples and classifier calls the
tile already makes; coarse tiles also use the cell centres they sample for the correction. No extra terrain
sample is taken. Decode it with `readTileMetadata(tile, meta)`.

All fields are little-endian:

| Offset | Type | Field |
|---|---|---|
| 0 | f32 | minH: lowest stored vertex height (m) |
| 4 | f32 | maxH: tile summit, over vertices plus, on coarse tiles, the cell centres |
| 8 / 12 / 16 | f32 | floorMin / floorMax / windowMax (NaN until P1 `floorM`) |
| 20 | f32 | snowlineM: lowest snow-labelled land vertex |
| 24 | f32 | treelineM: highest forestPotential vertex |
| 28 / 32 | f32 | peakU / peakV (tile-local position of maxH; `peakDir` decoded) |
| 36 | f32 | waterLevelM the tile was built at |
| 40-46 | u16 | lattice (1089), ocean, snow and forest counts. Shares are exactly count / 1089. |
| 48-54 / 56-59 | u16 / u8 | top four class counts and their `TILE_CLASS_LABELS` ids (255 = none) |
| 60 | u8 | version |
| 61 | u8 | flags: 1 = floor present, 2 = peak-corrected heights |

Guarantees, each tested against an independent lattice recomputation:

- minH <= every stored Float32 vertex height <= maxH (Float32 rounding is monotonic);
- the counts equal the lattice counts exactly;
- the bytes are bit-identical on every rebuild.

Once P1 lands: floorMin <= floorM, and maxH - floorMax <= the terrain window. Uses: P5 bounds and distant
silhouettes from maxH/peakDir; place-query class shares; the C2 summit store.

## 5. Tolerances (`LOD_TOLERANCES`, plan.lodLadder.tolerances_after_relief)

`edge` below is the coarse level's tile edge.

- **Height:** coarse-at-child p99 <= max(5 m, 0.03 x edge) and max <= 0.08 x edge. Tile summit loss p50 <=
  0.01 x edge and max <= 0.04 x edge. Maithea L6 target: 120/400 m.
- **Colour:** RGB p99 <= 12 at L6->7, <= 4 at L8->9 and <= 1 from L10.
- **Classes:** snow, biome name, forest and ocean disagreement <= 0.5% per adjacent pair. The ocean flag must
  have zero disagreement on shared vertices.
- **Coarse keeps** (edge tiles):
  - snow >= 98% at L6;
  - forest >= 97% at L6;
  - peak area >= 85% at L6;
  - peak area >= 95% at L8.
- **Determinism:** bit-identical across cold runs, visit orders and processes.

## 6. Budgets (`LOD_BUDGETS`)

- Build mean <= shipped +10% at every level.
- Metadata <= 64 B per tile.
- Streamed bytes per frame unchanged at an equal pose.
- Orbit bake <= +5%.
- No new texture bytes.

## 7. Seabed policy (owner decision 2026-10-03, `SEABED_DETAIL_POLICY` `seabed-by-distance-1`)

This replaces the planned rule that seabed under more than 400 m of water stops refining at S2/L14.

- **The seabed always exists.** It is solid and collidable, at its true depth of up to 16 km, and comes from
  the same deterministic terrain function as land.
- **Detail depends on distance to the seabed, not on how much water is above it.**
  - Seen from the surface, the view is sea surface, air and sparse sea life, and the seabed kilometres below
    is far terrain. A 16 km-deep floor seen from a boat is S1; a 4 km-deep floor is S2.
  - Seabed detail appears when a viewer, camera or body approaches the bottom. A diver 1 m above a 16 km-deep
    floor gets S4. There is no cap based on water thickness.
- **Collision, physics and place queries ignore this policy.** They always sample full detail on demand at
  every depth.
- **Renderer obligation (P5, `planet-renderer.ts`, render-bounds-1).** The split rule's `near` distance
  measures to the solid ground or seabed at the tile's closest point (`seabedAwareNear`), not to the water
  surface. Before render-bounds-1 it used max(waterLevel, elevation), so seabed tiles were judged by their
  distance to the sea surface.

### 7.1 Documented rendering exception: the 2 km ocean-surface band (owner decision 2026-10-04)

The rule above says seabed detail is never chosen by distance to the water surface. The renderer has one
accepted exception, `OCEAN_SURFACE_DETAIL_M = 2000` in `planet-renderer.ts`:

- **What it does.** For a tile that draws an ocean surface, `seabedAwareNear` uses the smaller of the
  distance to the ground/seabed and the distance to the drawn sea surface, but only while the sea surface is
  closer than 2 km. Beyond 2 km, only the ground/seabed distance counts.
- **Why.** The ocean shell shares the terrain tile's grid, and the vertex Gerstner waves (8-42 m) need a fine
  grid near the eye. Without the band, a boat over a 4 km-deep floor would get a coarse sea surface right
  under it.
- **What it does not change.**
  - The seabed is always real and solid at its true depth.
  - Collision, physics and place queries still sample full detail on demand.
  - Seabed detail is still chosen by the distance to the seabed. The band can only add detail to tiles near
    the sea surface. It never coarsens a seabed the viewer is approaching.
- **Side effect inside the band (accepted).** Seabed tiles under the band refine with the waves. The seabed
  under a viewer at the surface is therefore finer than distance-to-seabed alone would give.
- **Streaming.** `renderSeabedDive()` uses the same 2 km band: over a seabed and below sea + 2 km.
  - Inside it, byte-blocked splits count as merge pressure, and eviction keeps room for a full 4-child split.
  - Everywhere else, these two streaming modifications are switched off, so the streaming GATING is the
    same as before. That is a statement about the gate, not a claim that every resulting frontier is the
    same tile for tile. What was actually compared:
    - Node attribution (`test-results/relief-round-2026-10-03/P5-RENDER-BOUNDS/attribution/attrib-gated.json`):
      the gated build and its base gave identical visible/leaf counts at 20 poses on 4 bodies, except Selawyn
      ground (147 vs 146).
    - Browser probes (`test-results/finish-round-2026-10-04/P5-FRONTIER/`): same-build before/after pairs had
      identical leaf and visible sets for the Selawyn and Lethuris flight scenarios. A pre-existing
      merge-scheduler stall (OPEN) makes frontiers path- and timing-dependent; in the Node convergence check
      (`node-convergence.json`) Selawyn base/head reached 80/81 visible with five leaf keys unique to each.
    - The candidate culling itself (tighter per-tile bounds than the legacy +20/-16 km envelope) changes
      frontiers by design wherever bounds matter; the open-ocean descent shows different frontiers above the
      band (10 km: 66 vs 72 visible, max level 8 vs 9).
- **Tests.** `tests/render-bounds.test.mjs` pins the band's on/off cases. The open-ocean descent in
  `tests/render-bounds-evidence.test.mjs` shows that above the band, deep water is coarser than under the
  legacy surface-distance rule. Inside the band, both rules refine equally, by design.
- **Wording.** This note is the policy statement of the exception. The `SEABED_DETAIL_POLICY` comment in
  `src/lod-ladder.ts` still says "never by distance to the water surface". Read it as "except inside this
  band". The code comment is left to the lod-ladder owner.
- **Still open, not covered by this exception.** Reduced seabed detail away from the band and the strict
  post-relief LOD class/colour targets remain open owner items. This note does not waive them.

### 7.2 Integration with the P4 relief terrain (finish round 2026-10-04, branch relief-round/INT)

render-bounds-1 (P5) and terrain-1.8.0-relief (P4) ship together: P4 changes the per-body orbit texture
encoding (`reliefTextureRange`) and P5 holds the matching decoder (`PlanetRenderer.reliefTextureSpanM`).
Evidence is under `test-results/finish-round-2026-10-04/INT/`.

- **Candidate margins re-measured on P4 terrain.** `CANDIDATE_MARGIN_M` was re-measured with 2400 child tiles
  per level on each of the four fixture worlds (`excess-p4/`). The raw maxima all fit inside the old margins.
  The x2+4 m rule exceeded them at L2 down, L6 up, L15 up and L16 up, so each entry is now
  max(old, P4 x2+4). Margins were only widened, never narrowed.
- **The all-world assertions now run by default** (`tests/helpers/render-bounds-suite.mjs`, fast mode):
  containment 0 violations, candidate/tight ratio p50 0.86-1.01 at L10/L14/L18 on all four worlds, 0 false
  culls, horizon cull used 434.8 km vs analytic 399.7 km.
- **Landing ceiling (formula kept, OPEN owner item).** `landingCeilingM = 0.8 x bound.maxM` is kept, as decided.
  On P4 terrain it is 4.1-5.3 km over the sea, which is ABOVE p99 land (2.5-4.2 km) on every fixture world, so it
  no longer keeps the landing pick off summits. Measured over 256 eyes at the datum sea, picks at or above p99
  land: Maithea 2, Selawyn 6, Raiva 6, Lethuris 2 (0 at the dated sea). The required no-summit test exists as a
  `todo` test (`landing at the datum sea never picks a summit`) and does NOT pass. It is not labelled passed.
- **Clouds above p99 land: DEFERRED, removed from this increment's acceptance.** P4 lowered relief so that only
  3 of 161 corpus water bodies have p99 land above the reference deck top (by at most 371 m). Two attempts
  were made and both failed Luna 9/9 on raiva-flight, selawyn-flight and selawyn-horizon (3 asks each, all
  TERRAIN PASS, all CLOUD FAIL):
  1. the P5 cloud hunks (79b8845 + e1b4d73: scale-height stretch, dated-sea riding, p99 floor, reference-frame
     sampling): tall streaky curtains;
  2. the p99 floor alone (deck stretched only where p99 + 500 m exceeds the reference top): judged "worse",
     with the same streaks and columns as base.
  The cloud files are back to planet-clouds-1 / cloud-volume-2 exactly. Luna's attempt-2 complaints (streaks,
  columns, horizon curtains) are present in the BASE image too, so the cloud look itself is an open item for
  the cloud owner, independent of the p99 rule. Evidence: `clouds/`.

## 8. How place-query uses the contract

1. `levelForPose` gives the rung, and with it the tile level range, that the viewer is shown.
2. The tile at that level gives the stored heights (`surfaceHeight`), and its metadata gives the summary for
   the place: summit, class shares, snowline/treeline, ocean share.
3. Collision and physical queries ignore the rung and sample the terrain function directly at full detail.

## 9. Measured numbers (2026-10-03; BEFORE = shipped main, AFTER = this contract)

Full table: `test-results/relief-round-2026-10-03/P3-LOD-CONTRACT/report-v2.txt` and `.json`.

**BEFORE reproduces the plan's shipped figures.** For example, Maithea L6->7 gives 97/761/1564 m and RGB
6.7/33.8, retention is 70.0% with a summit loss of 205/661 m, and the figures at L8 and L10 also match.

**Coarse retention on edge tiles** (plan selection; K=16 unless noted). Summit loss is shown as p50/max.

| Body, level | Peak area kept, BEFORE -> AFTER | Summit loss, BEFORE -> AFTER |
|---|---|---|
| Maithea L6 | 70.0% -> 84.99% (K=32: 85.16%; 12 stratified tiles: 88.2%) | 205/661 m -> 67/279 m |
| Maithea L8 | 91.4% -> 98.4% | 69/196 m -> 41/160 m |
| Lethuris L6 | 50.6% -> 67.1% | 267/681 m -> 242/681 m (within 0.01 x edge = 2.2 km) |
| Lethuris L8 | 76.6% -> 91.9% | — |

On Maithea L6, snow kept stays at 98.5% and forest kept at 97.1%. Metadata maxH (C2) summit loss is the same
as the in-tile value.

**Cost of the correction.** On Maithea L6 the false peak area rises from 10% to 36% of the true peak area,
and the mean bias is +122 m (L8: +54 m), because a corrected coarse surface is a conservative upper envelope.

**Cross-level** (K=16):

- Height p99/max improve or hold at every pair. For example, Maithea L6->7 goes from 761/1564 m to 651/1358 m.
- The ocean flag has zero mismatch on all 4624 shared vertices at every pair, and ocean disagreement equals
  BEFORE.
- Snow, forest, colour and the carried name equal BEFORE, because they come from unchanged point samples.
- The re-classified name proxy (classifier re-run at the coarse interpolated height) rises at L6->7: 0.42% ->
  0.65% on Maithea and 0.50% -> 0.52% on Lethuris.

**Open rows that shipped terrain also misses.** These are pinned as ceilings in the test for P4 to tighten:

- colour p99 at L6/L8 (33.8 / 5.2 against 12 / 4);
- the carried biome name (0.78% at L6 on the plan set);
- on the stratified set, snow, forest and name at L6/L8.

They need footprint-filtered colour and class grain in terrain.ts (P4).

**Build time** (Node, interleaved A/B in one process, Maithea, mean):

| Level | Change |
|---|---|
| L4 | +0.4% |
| L6 | -0.8% |
| L8 | +0.1% |
| L9 | -0.4% |
| L10 | -11% |
| L12 | -12% |
| L14 | -14% |
| L16 | -18% |
| L18 | -18% |

The lattice samples are now reused instead of taken twice. Bytes per tile grow by exactly 64.
