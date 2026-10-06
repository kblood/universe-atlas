# LOD ladder and consistency contract, v1 (`lod-ladder-2`)

Status: P3-LOD-CONTRACT, relief round 2026-10-03 (`lod-ladder-1`); amended 2026-10-05 by mountains cost plan T3
(`lod-ladder-2`: the M3 carving reduction in section 3; nothing else changed). Code: `src/lod-ladder.ts` (data and arithmetic only),
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

**Mountain carving (amendment, `lod-ladder-2`, mountains cost plan T3).** Decided in
`docs/mountains-opus-decisions-2026-10-05.md` (Q2 "Rule" and the binding addendum item 1; decided by Opus 5.5 on
Kasper's instruction, he may overrule). Code: `carvingFromLevel` / `carvingAtLevel` in `src/lod-ladder.ts`,
`mountainRidgeTermM(..., carve)` in `src/mountain-assembly.ts`, the `lodLevel` sampler option in `src/terrain.ts`,
the level pass-through in `src/planet-tiles.ts`. Test: `tests/lod-carving-reduction.test.mjs`.

- The M3 ridge-valley carving declares 16 km as its longest wavelength (`CARVING_BANDS`). A tile lattice of 32
  cells samples it at 2 x edge / 32. A level can hold the carving only if that is at most 8 km (half the band),
  i.e. edge <= 128 km (`CARVING_MAX_EDGE_M`).
- At coarser levels the tile's sampler evaluates the carving as exactly +0, for its vertices, its peak-correction
  cell centres, its normals, metadata and colour texels. Carving = -envelope x (1 - retained) <= 0, so the
  coarse surface is an upper envelope of the carved truth: heights are only raised, as for the peak correction
  above. The ocean flag does not change (the ridge term stays >= 0 either way). No M3 block is solved at these
  levels.
- Carving starts at (arithmetic from the edge formula):

  | Body | First carved level | Edge there | Uncarved levels |
  |---|---|---|---|
  | Maithea | L6 | 127.5 km | L0-5 |
  | Selawyn | L7 | 104.9 km | L0-6 |
  | Raiva | L5 | 98.3 km | L0-4 |
  | Lethuris | L7 | 110.4 km | L0-6 |

- The truth (a sampler without a level) is unchanged and fully carved. Collision, physics and place queries keep
  using it (section 8). From the first carved level on, a level's sampler is the truth bit for bit.
- **Parent and child keep their own level's carving.** A tile at level L samples at L; its parent mesh (`parents`,
  `parentHeight`, the morph start) is the L-1 lattice under the L-1 rule. At the switch level L = cut the child is
  carved and its parent mesh is not, exactly like the L(cut-1) tile that was displayed before the split, so the
  morph starts on a surface that was shown. The parent path then has its own sampler and its own caches; at every
  other level parent and child share one sampler (same state), as before.
- The switch is a visible change of state by design: the carving appears during the L(cut-1) -> L(cut) morph. Its
  mean height step on massif tiles is reported as INFO (below); the agreed mitigation, if it is visible, is a cheap
  coarse mean-carve term, not a change of this rule.
- Staging: the mountains are not wired on main until cost plan T6 (`TERRAIN_MOUNTAINS_WIRED = false`). Until then
  the rule is active only for samplers and tiles built with `{mountains: true}`; the default field is unchanged.
- Every section-5 tolerance is unchanged. The version moved to `lod-ladder-2` for the new declared reduction.

**Baked coarse band field (amendment, branch `mountains/baked-coarse`, cost route A).** This amendment is recorded
in decisions addendum (5), decided by Opus 5.5 on Kasper's instruction; he may overrule. The evidence is in
`docs/mountains-t6-baked-coarse-2026-10-06.md`. It is not on main while that addendum's C1 miss stands.

- **What coarse levels evaluate.** Below the carving cut, a level's sampler does not run the M1 foot-point solve.
  It reads a per-body field, `orogenLayout(body).coarseBandField(48 km, 32 km)`:
  - The field stores the signed foot-point distance divided by H at cube-face nodes, at half the T1 resolution.
  - It is deterministic, built once per layout and memoised.
  - The ridge term comes from `massifCoarseRidgeTermM`, an upper bound of the uncarved composition (1−w)·main + U.
    The bound uses the interpolated distance widened by a measured margin of 0.16 H.
  - The coarse surface therefore stays an upper envelope of the carved truth. Heights are only raised, the ocean
    flag is unchanged, and no M3 block is solved.
- **Continuity.**
  - The active region is the set of T1-flagged cells dilated by one field cell. At every boundary node of that
    region the composition returns main exactly, so the field has no seam against inactive cells.
  - Face-edge nodes are evaluated from canonical directions and are bit-identical on both faces.
  - The T3 parent rule is unchanged: the parent of an L(cut) tile is coarse.
- **What is unchanged.** The truth and levels at or above the cut keep the exact M1/M2/M3 path. Section-5
  tolerances are unchanged.
- **Versions.** The layout and envelope versions move: `orogen-layout-3`, `massif-envelope-3`. `LOD_LADDER_VERSION`
  is unchanged: the declared reduction is still "upper envelope of the carved truth below the cut".

**Colour and class shares:** coverage-weighted mean of the finer level. A class is carried as a class: the
bilinear-weighted majority of the four corner labels. It is never re-derived from a coarse height.

**Ocean flag:** the exact sign of (height - sea level). It is identical on every vertex two levels share.

### 3.1 Coarse frame and edge match (owner principle 2026-10-06; new element test, `tests/lod-coarse-frame.test.mjs`)

Owner principle (Kasper, 2026-10-06): the coarse levels carry the large-scale structure; a finer tile gets some
room but lies within the coarse frame, and tile-to-tile edges match, especially at the mountains. This section
documents a NEW test and its measured numbers. No existing pin or tolerance in this contract was changed.

The test runs with the staged mountains on (`{mountains: true}`), on the four real water worlds, on tiles that touch
a massif: two massif axis sites per world, tiles chosen by the T1 band grid (`bandCellFlagged`) plus the belt query.
Per world: 39 / 45 / 29 / 44 frame tiles (Maithea / Selawyn / Raiva / Lethuris), each with > 0 massif samples on a
65x65 net, plus 6 edge-only neighbours. Each world runs in its own worker thread; the file takes about 12 s.

**(1) Frame.** At the 289 shared lattice vertices of each parent/child pair L -> L+1 (L = 0 .. the last
peak-corrected level): `parent - ROOM <= child <= parent + EPS_UP`, with EPS_UP = 0.05 m (the existing morph rule).
ROOM is measured per world and pair (parent - child, all frame pairs of that level). The pin is the measured max
+ 25%, rounded up to 50 m. That is a margin over the measurement, not a fit to hide failures:

| Pair | Maithea p50 / p99 / max -> ROOM | Selawyn | Raiva | Lethuris |
|---|---|---|---|---|
| L0->1 | 0 / 2601 / 3882 -> 4900 | 0 / 1553 / 2860 -> 3600 | 0 / 1259 / 1870 -> 2350 | 0 / 2793 / 3816 -> 4800 |
| L1->2 | 0 / 1579 / 3322 -> 4200 | 0 / 2030 / 2689 -> 3400 | 0 / 1256 / 1670 -> 2100 | 0 / 2604 / 3953 -> 4950 |
| L2->3 | 0 / 1214 / 3926 -> 4950 | 1 / 1491 / 2724 -> 3450 | 0 / 1470 / 2119 -> 2650 | 0 / 1697 / 3627 -> 4550 |
| L3->4 | 0 / 494 / 2565 -> 3250 | 10 / 462 / 1304 -> 1650 | 4 / 200 / 1384 -> 1750 | 0 / 420 / 1720 -> 2200 |
| L4->5 | 2 / 285 / 783 -> 1000 | 9 / 404 / 662 -> 850 | **97 / 551 / 632 -> 800** | 3 / 504 / 1080 -> 1350 |
| L5->6 | **35 / 844 / 1216 -> 1550** | 6 / 263 / 399 -> 500 | 2 / 143 / 201 -> 300 | 7 / 351 / 728 -> 950 |
| L6->7 | 13 / 240 / 563 -> 750 | **463 / 1387 / 1575 -> 2000** | 0 / 152 / 209 -> 300 | **161 / 1364 / 1869 -> 2350** |
| L7->8 | 0 / 284 / 369 -> 500 | 0 / 383 / 708 -> 900 | 2 / 44 / 61 -> 100 | 2 / 329 / 533 -> 700 |
| L8->9 | 0 / 147 / 207 -> 300 | 5 / 207 / 305 -> 400 | 20 / 56 / 63 -> 100 | 0 / 305 / 749 -> 950 |
| L9->10 | 50 / 121 / 137 -> 200 | 11 / 99 / 187 -> 250 | - | 12 / 149 / 205 -> 300 |
| L10->11 | - | 54 / 131 / 175 -> 250 | - | 53 / 150 / 194 -> 250 |

Bold marks the carving switch pair L(cut-1) -> L(cut). The room is in metres and is large at S0-S2. A child there is
the point-sampled field plus its own peak correction, and the parent's 32-segment lattice cannot carry the relief
between its vertices.

- Upper side, point-sample child levels (child level > last corrected level): **holds exactly** (max 0.000 m).
  HARD.
- Upper side, peak-corrected child levels: **NOT MET (OPEN finding)**. The child rises above the parent by up to
  3894 m (Maithea L1->2). At the switch pair the excess is 75-158 m. At every corrected pair 6-40% of the shared points
  exceed 0.05 m.
  - Cause: each level's peak correction reads its own finer cell centres. A child can therefore find a higher peak
    than its parent's correction saw, so the stored coarse surface is not an upper envelope of the stored finer
    surface.
  - Kept as a node:test `todo` with the per-pair counts. It is counted in todo, not fail, and it remains OPEN, not
    passed.
  - A HARD companion check holds the excess within the section 5 height tolerance (`heightP99M` and `heightMaxM` at the parent tile edge; a loose bound, it only rules out a gross excess).
  - Fixing it means changing the correction rule (e.g. a child correction capped by the parent surface), which is
    an owner decision.

**(2) Edge match.** For each world, 28-44 same-level edge pairs, matched by direction:
- siblings at the uncarved levels and at L(cut+1);
- a non-sibling neighbour across a parent boundary at L(cut);
- the 12 cube edges at L0;
- a cube-face edge on a massif at L(cut-1) and L(cut) (3-17 massif nodes on the shared edge).

Results:
- Stored surface heights and morph-start (parent mesh) heights at every edge vertex are `Object.is`-identical from
  both builds: 0 mismatches. No morph state opens a height gap.
- Rendered positions (Float32, anchor-relative) at t = 0 and t = 1 agree within the Float32 rounding bound
  R * 2^-24 * (|rel_A| + |rel_B|). Measured worst gaps:
  - 0.11-0.53 m at the L0 cube edges (bound 0.22-0.99 m);
  - 0.04-0.26 m at the coarse siblings;
  - 0.006-0.010 m at the cube-face pairs at L(cut-1)/L(cut);
  - 0.002-0.005 m at the carved neighbours.
- INFO: at L0 the skirt is 0.25 m, so the Float32 gap exceeds the skirt on 5-12 of the 12 cube edges on three of
  the worlds. Elsewhere the skirt is 40.25 m. This is pre-existing encoding behaviour, not a height mismatch.

**(3) Coarse-only continuity.**
- A net over all six faces: 2 directions x 4 lines x 16384 intervals per face, extended 2% onto the neighbouring
  faces. It is sampled with the L(cut-1) sampler only, and the M3 block-solve counter stays at **0** (the carved
  frame builds solve 21-26).
- Refinement: every interval with a belt edge, a massif edge, a belt switch, or a height flag (slope > 4x the
  neighbouring intervals) is refined to 1024 sub-intervals. Per world: 333-1882 refined intervals, 104-120 belt
  edges, 43-111 massif edges.
- Bound: |dh| <= 4 x distance (slope 4). Steepest measured slope is 0.70-1.03 on the net and 0.62-0.79 refined.
  0 violations.

**Negative controls (must fail; all do).**
- 2x carve: the switch child is carved with 2x depth and leaves the frame on every world. 1-27 shared points fall
  below parent - ROOM per site, and 7 of the 8 sites are caught.
  - This is a point-level model. No source hook doubles the carving, so the child's stored height is lowered once
    more by its own point-sample carving depth, and the peak correction is not re-run.
- 1 m edge offset: tile A's middle edge vertex is raised 1 m (stored height and rendered position, radially) and
  re-measured through the same edge-pair path. It is caught on every edge pair from L(cut-1) on: 8-12 per world.
- 10 m belt step: a 10 m step on every belt in the coarse field is caught in the interval of every belt edge
  crossed: 7-14 of 7-14.

Non-finite heights, gaps and samples count as violations in every check.

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
- **The all-world assertions now run by default** (`tests/helpers/render-bounds-suite.mjs`, fast mode in
  `npm test`, full counts in `npm run test:render-bounds-evidence`). What is ENFORCED and what was MEASURED
  are different things (corrected after Astra's INT review):
  - Enforced thresholds: containment 0 violations; candidate/tight sphere ratio p50 <= 1.5 at L10 and <= 2 at
    L14 and L18 on all four worlds (suite line `percentile(ratios,.5)<=(L===10?1.5:2)`); 0 false culls against
    brute force; Maithea horizon peak radius within 10% of the analytic value.
  - Measured in the fast run: ratio p50 0.86-1.01. Measured in the full evidence run
    (`render-bounds-evidence.tap`): ratio p50 0.90-1.12 (Raiva L18 1.117 is the maximum), p90 up to 1.28;
    containment 0 of 8000 (plus 0 on seeds 13579 and 24680); horizon cull used 434.8 km vs analytic 399.7 km.
    These values are evidence, not thresholds.
- **Landing ceiling (formula kept, OPEN owner item).** `landingCeilingM = 0.8 x bound.maxM` is kept, as decided.
  On P4 terrain it is 3.2-5.3 km (Maithea 5303, Selawyn 4141, Raiva 3219, Lethuris 5188 m), which is ABOVE p99
  land (Maithea 4214, Selawyn 3246, Raiva 2506, Lethuris 4058 m) on every fixture world, so it no longer keeps
  the landing pick off summits. Measured over 256 eyes at the datum sea (sea 0), picks at or above p99 land:
  Maithea 2, Selawyn 6, Raiva 6, Lethuris 2. At the dated (60%-volume-lost, -2425 m) sea only Maithea and
  Lethuris are covered (suite: `landing at a dated (lowered) sea`), with 0 summits on both; Selawyn and Raiva
  were not measured at a dated sea. The required no-summit test exists as a `todo` test (`landing at the datum
  sea never picks a summit`) and does NOT pass. It is not labelled passed.
- **HUD flip and direct-landing boundary: fixed 19.5 km (owner decision).** INT had tied
  `PlanetRenderer.lowFlightClearanceM` to the relief bound, which moved the HUD TERRAIN FLIGHT flip and the
  direct-landing route to 4.0-6.6 km after P4 (Astra INT blocker 1). P6 (c465f6a) makes it the constant
  `LOW_FLIGHT_CLEARANCE_M = 19500` again, used by both the HUD label and the "Land" routing in `main.ts`
  (below it: landing preparation; above it: a terrain cruise first). Pinned in the render-bounds suite.
- **Integration handoff runs were NOT green (corrected after Astra's INT review).** `handoff-tests.exit.txt`
  exit=1 (TAP 104 tests: 101 pass, 1 fail, 2 todo; the failure is `tests/inland-rivers-disabled.test.mjs:236`)
  and `handoff-tests-p4files.exit.txt` exit=1 (TAP 86 tests: 85 pass, 1 fail; the failure is
  `tests/acceptance/version-compat.test.mjs:79`). Both were stale pins expecting
  `atlas-surface-7-no-inland-rivers` while production returns `atlas-surface-8-ocean-volume` (bumped by P2 on
  main; listed in `tests/known-failures.json`). They are pre-existing, not relief regressions, and their exit
  codes are not the landing todos. Owner: P6, which re-pinned both and removed them from the known-failures
  list (c465f6a; `test-results/finish-round-2026-10-04/P6-HARNESS-REPIN/`).
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
- **Integration sheets** (`sheets/`, Luna, 3 asks per world). Maithea, Selawyn (heavy, 18.6 g, tilt 90 deg),
  Raiva (light, 2.6 g) and Lethuris (high tilt, 109 deg). Each world has four sun-aware poses: orbit, horizon,
  ground, and seabed approach (200 m above a 3-4 km-deep floor).
  - Across all 48 answers Luna named no holes, cracks, missing or floating tiles, or seams. That is the visual
    side of the 0-false-cull result.
  - Majority verdicts:
    - orbit PASS on Maithea and Selawyn, FAIL on Raiva and Lethuris (mottled, blotchy colour patches);
    - horizon FAIL on 3 of 4 worlds (subdued relief, the OPEN P4 horizon item); Selawyn PASS 2/3;
    - ground PASS on Selawyn (3/3), FAIL on Maithea, Raiva (1/3) and Lethuris (1/3) (smooth, low detail);
    - seabed FAIL on every world. The seabed is solid and continuous, but it is smooth and does not read as
      underwater.
  - These are absolute judgements with no before image: the poses come from the P4 terrain and do not exist on
    main. They are presentation items, recorded OPEN for their owners and not labelled passed. Underwater
    presentation (water tint or fog on the seabed approach) has no owner in this round.
- **Desktop perf, before (main 7aaa48f) vs after (INT 50b3bd4): CONTENDED, NOT acceptance evidence.** Blender
  (PID 11524) held the GPU and Opera was open, and the harness itself labels both runs CONTENDED. Each build
  ran once (native, 1 repeat), and S4 was skipped. S4's deterministic shore-site search throws "no
  deterministic shore site" on main as well, so it is a harness item.
  - Frame-interval p95 (ms), before -> after: S1 ground paused 10.49 -> 8.83, S1 realtime 11.19 -> 11.40,
    S1 100 m 9.84 -> 9.88, S2 turning 16.57 -> 21.24, S3 flight 16.58 -> 18.19, S3 walk 12.85 -> 13.41,
    S5 out 17.34 -> 20.07, S5 back 19.13 -> 22.10, S6 descent 10.09 -> 11.23.
  - Draw calls p50 are within +-17 in every tabulated scenario (S3 has no draw-call row in the table). The S2/S5 increases need a quiet-host, multi-repeat run
    before anyone reads them as a regression or as noise. Evidence: `perf/compare.txt`.

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
