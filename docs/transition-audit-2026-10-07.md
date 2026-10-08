# Transition audit, read-only (backlog #7 TRANSITION-AUDIT), 2026-10-07

Lane L4 (docs/parallel-development-plan-2026-10-07.md). Tree audited: main `4de78ec`.
Backlog spec: `C:/LLM/IWSDK/docs/atlas-backlog-2026-10-04.md` task 7, from `C:/LLM/IWSDK/docs/astra-brief-2026-10-03.md` Task B.
The backlog names the file `docs/smooth-transition-audit-2026-10.md`; this lane's brief named this file instead.

## Status, read this first

- **This is a code audit. Nothing was rendered or run.** No tests, builds or browsers ran, and no locks were taken.
  The GPU belonged to the gate lane, so the "one GPU before-render batch" is **NOT done**. §6 lists the renders it needs.
- **Visual check NOT done.** Luna saw no frames, so nothing here is a Luna verdict.
  The acceptance item "Luna gets 3 asks per disputed frame" is open.
- **"Measured discontinuity" is mostly derived from code.** Each number below says how we got it:
  - **derived**: arithmetic on the constants at the cited line;
  - **measured (source)**: an existing measurement, with its source;
  - **needs probe**: nothing in the code or the existing evidence gives the magnitude.

  Two figures are real measurements, both from `docs/lod-ladder-contract-v1.md` §9: the cross-level colour RGB p99 and the height p99.
- **Method: two independent passes, then reconciled.**
  1. Opus read the code directly.
  2. Astra (`gpt-6-astra`, read-only `codex exec`) ran its own pass on the same tree, with the transition list from the brief.

  Opus re-read the cited lines of every Astra finding before it went into this doc. §5 records what was confirmed, downgraded or added.
- **No fixes are made here, as the acceptance requires.** Many proposed smoothings move digests: forest, colour or terrain identity.
  Each one notes which lane owns it.

Severity = how visible to a player × how often it happens. These are predicted ranks, not measured ones, and Luna on the §6 renders should re-rank them.

## 1. Ranked findings (confirmed against the code)

| # | Sev | Transition | Kind | Where | Found by |
|---|---|---|---|---|---|
| 1 | **High** | Terrain tile split/merge: colour and normals jump, merge regrows from the grandparent, rebuilt tiles re-morph | POP + KINK | `planet-renderer.ts:1070,1097,1441,1561-1562`; `terrain-shadow.ts:3-7` | both (re-morph: Opus) |
| 2 | **High** | Atmosphere shell, eye inside vs outside `outer`: extinction and opacity switch | STEP, screen-wide | `sky-atmosphere.ts:258-259` | Astra |
| 3 | **High** | Ground life (flora + fauna) hidden at 350 m altitude; rocks hidden at 960 m; no hysteresis | POP / flicker | `planet-renderer.ts:1305`; `planet-detail.ts:20`; `planet-rocks.ts:395`; `rock-field.ts:41` | both |
| 4 | **Med-High** | Surface shadow window ends hard at about ±160 m around the eye | STEP (spatial, moves with eye) | `surface-lighting.ts:8,66-89` | Opus |
| 5 | **Med-High** | Fauna near rig ↔ instanced primitive proxy: a different body and a different gait | POP (hysteresis 80/95 m) | `fauna-near-rig.ts:21-23,119-123`; `fauna-field-renderer.ts:51-54`; `planet-renderer.ts:2090` | both |
| 6 | **Medium** | Trees: LOD0↔LOD1 (98/122 m), LOD1↔far canopy (550/600 m), census install, atlas-ready, capacity demotion | POP (hysteresis on the distances) | `planet-forest.ts:866-896`; `planet-canopy.ts:266-276`; `forest-impostor.ts:498` | both |
| 7 | **Medium** | Rocks and small flora: distance LOD and range cut-offs, no fade and no hysteresis | POP / flicker | `rock-field.ts:29-35,143-147`; `flora-culling.ts:136-146`; `flora-field.ts:873,887`; `planet-renderer.ts:1845` | both |
| 8 | **Medium** | Forest edge: density steps from 0 to 0.76·suitability at the 160 m coast contour and at a 28° slope | STEP (static) | `surface-biomes.ts:114`; `forest-habitat.ts:30`; `surface-climate.ts:316` | both |
| 9 | **Med-Low** | Deep-time sea level moves in 25 m buckets; tiles rebake one by one (patchwork plus a re-morph) | STEP (time seek) | `planet-renderer.ts:375-376,1194-1203,1558`; `world-surface.ts:120-123` | Opus |
| 10 | **Med-Low** | Underwater medium switches on the mean (snapped) sea level, not the drawn wave (±3 m) | STEP | `planet-renderer.ts:1273-1274`; `RENDER_WAVE_BOUND_M=3` at `:133` | Opus |
| 11 | **Low-Med** | Orbital preview sphere → tile set: a single hard swap at the first active level ≥3 tile | POP (once per approach) | `planet-renderer.ts:1611-1614` | both |
| 12 | **Low-Med** | Instanced fauna gait idle↔walk: legs and bob switch instantly (the near rig blends over 0.6 s) | STEP | `fauna-field-renderer.ts:159-176` vs `fauna-locomotion.ts:142` | Opus |
| 13 | **Low** | Fauna proxies: eyes at 60 m, range cut at 600 m | STEP | `fauna-field-renderer.ts:14-16,132,169`; `planet-renderer.ts:2051` | both |
| 14 | **Low** | Linear-ramp C1 kinks: snow 6 K, treeline 6 K, sand 160 m / 30°, rock 18–45°, coast colour 120 m, fell 160–760 m | KINK (no step) | `surface-climate.ts:64-65,303-305`; `surface-biomes.ts:109-111`; `terrain.ts:360-369` | both |
| 15 | **Low** | Small or rare items: shadow basis flip at abs(sun.y)=.98; weather texture rebuilt per 5 s bucket; impostor view barycentric kinks; foot-lift sine; eye-wrap bands; haze cap | KINK / tiny STEP | §3 | Astra (Opus verified) |
| — | dormant | River environment (15/420 m, 1500 m altitude) and regional bank tint (1800 m, snow .2, rock .55) | STEP, **inactive** | `inland-rivers.ts:21,37-38` gate them off; `planet-renderer.ts:817,826` | Astra, downgraded by Opus |
| — | absent | Seasons: `season.ts` has no importer in `src/`, so rendering reads annual climate only | none to smooth | grep `from './season'` = 0 hits; `surface-climate.ts:303` | both |

Checked and smooth, with no action needed:
- day/night and the terminator: `surface-lighting.ts:53`, `local-aerial-perspective.ts:11`, `sky-atmosphere.ts:167`;
- the ground detail and PBR fades (`ground-material.ts:111,131`). Their per-patch enables at 6000/1800 m (`planet-renderer.ts:1571-1572`) fire only where the fragment fade is already 0. The altitude enable is `renderHeightBoundM.max·relief + 6000 m` (`:201`), so no fragment within 6000 m exists when it flips;
- the cloud time windows: a 6 h smoothstep cross-fade (`planet-clouds.ts:156-159`);
- the close/far cloud body blend (`volumetric-clouds.ts:131`);
- the ocean wave distance fade (`ocean-gerstner.ts` `ocean-wave-fade-1`);
- view transitions: smoothstep cross-fades of .45, .7 and 1.4 s (`view-transition.ts:90`);
- star, beacon and disc fades (`main.ts:3233,3274,3590`; `galaxy-space.ts:141`);
- the forest range, footprint and altitude fades: smoothsteps over 300 m, 130 m and 500 m (`planet-forest.ts:798,871,894`; `planet-canopy.ts:297`).

## 2. The top findings in detail

### F1. Terrain tile LOD: only position is morphed
- **Status (2026-10-08, branch `presentation/terrain-morph`, not merged):** F1.2 (reverse-morph merge), F1.3 (inherit on replace) and F1.4 (smoothstep) are done behind `presentationContinuity`, plus fractional edge locks. F1.1 (normals/colour) is a design note only. CPU tests only; R1–R3 NOT RUN. See `docs/terrain-morph-continuity-2026-10.md`.
- **What blends.** A child's vertex position goes `mix(parentPosition, position, patchMorph)` (`terrain-shadow.ts:7`), and the height varying does the same (`planet-renderer.ts:1097`).
  The morph is **time-based and linear**: `morph += dt/.22` (`planet-renderer.ts:1562`). Width 0.22 s.
- **Discontinuities:**
  1. **Colour and normals are not morphed.** Each patch has its own colour `DataTexture` (`planet-renderer.ts:1060-1069`). The `normal` attribute is never mixed with a parent normal (`patchMorphVertex` mixes positions only).
     So at a split the child's colour and shading appear in one frame while its shape is still the parent's.
     Size, **measured (lod-ladder-contract-v1.md §9)**: cross-level RGB p99 **33.8 at L6→7** and **5.2 at L8→9**, against targets of 12 and 4.
  2. **A merge regrows from the grandparent.** The children are spliced out in one frame (`:1441`). The parent is new to the leaf set, so it gets `morph=0` (`:1561`) and is drawn at *its* parent's interpolated shape, then morphs up over 0.22 s.
     The visible sequence is fine → coarser than the parent → parent. That is a pop plus a regrowth, where a reversed morph would give a smooth coarsening.
  3. **A rebuilt resident tile re-morphs (Opus-only).** A replacement patch for a tile already in the leaf set is built with `morph={value:0}` (`:1070`). Because `previous.has(code)` is true, `:1561` neither resets nor fast-forwards it.
     So every rebuild of a visible tile drops it to parent shape and regrows it over 0.22 s. Rebuilds happen on a water-bucket change (`:1558`) and on retries.
  4. **Linear ramp.** The vertex velocity jumps between 0 and Δh/0.22 s at both ends.
     Size, **measured (contract §9)**: height p99/max at L6→7 is **651/1358 m**, covered in 0.22 s.
- **Proposed smoothing:**
  - blend parent colour and normal into the child over the same morph: carry the parent colour as a second sampler or a vertex colour, and a parent normal attribute;
  - on a merge, run the children's morph back to 0 before swapping in the parent;
  - give a replacement patch the morph value of the patch it replaces;
  - use a smoothstep easing, and consider a distance-driven geomorph instead of a time-driven one.
  - Owner: #23 LOD-HORIZON (same files). Rendering only; no digest moves.
- **Regression tests (CPU):**
  - a node test that drives the leaf loop through split → merge with a fixed `dt` and asserts that every drawn vertex's displacement per frame is ≤ k·Δh·dt/0.22, with no frame where a vertex jumps by more than the parent-to-grandparent difference;
  - an assert that a replacement patch inherits `morph`;
  - for colour, assert that the drawn RGB at a fixed surface point changes by at most 33.8/N per frame through a split.
- **GPU:** yes, see §6 R1–R3.

### F2. Atmosphere shell inside/outside switch
- **Code.** `sky-atmosphere.ts:258-259`:
  - extinction is `1-exp(-density*(length(eye)<outer?2.5:0.14))`;
  - opacity is multiplied by `length(eye)<outer?mix(.42,.995,day):.88`.
- **Width.** 0 m at the shell radius `outer`, which is 1 + atmosphereHeight/R (`planet-atmosphere.ts:33-36`).
- **Discontinuity, derived.** For a column density D the alpha switches between `.88·(1-e^-0.14D)` and `mix(.42,.995,day)·(1-e^-2.5D)`.
  At D = 1, day = 1 that is **0.115 → 0.910**. At night (day = 0) the inside multiplier is .42, so 0.115 → 0.386.
- **Who sees it.** Every descent from orbit and every climb out, over the whole screen.
- **Smoothing.** Interpolate both coefficients with `smoothstep(outer-0.1·H, outer+0.1·H, length(eye))`, where H is the atmosphere height.
- **Test (CPU).** Evaluate the shader formula in JS at `length(eye)=outer±ε` on fixed rays and assert |Δalpha| < 0.01.
- **GPU.** Yes, R4. Whether other layers hide the jump (local air, clouds) is **needs probe**.

### F3. Ground-life and rock altitude gates
- **Ground life.** Flora and fauna together: `relief===1&&(contact||altitudeM<groundLifeAltitudeM)` (`planet-renderer.ts:1305`), with `groundLifeAltitudeM: 350` (`planet-detail.ts:20`).
  Otherwise `hideLife()`. There is no hysteresis and no fade.
  Fauna proxies are drawn out to 600 m (`fauna-field-renderer.ts:16`), so a herd in plain view vanishes at once when the eye passes 350 m altitude. Low flight that holds about 350 m flickers.
- **Rocks.** `!(altitudeM<ROCK_MAX_ALTITUDE_M)` → `hide()` (`planet-rocks.ts:395`). That value is 960 m, the largest tier range (`rock-field.ts:41`), and there is no hysteresis.
- **Smoothing.** A hysteresis band (for example enter 330 / leave 370 m), plus a coverage fade. Flora can use the forest's existing dithered coverage path; fauna can use the dither proposed in F5.
- **Test (CPU).** Oscillate the altitude ±5 m around each gate and assert visibility changes at most once. Sweep altitude and assert that drawn coverage is monotone and Lipschitz.
- **GPU.** R5.

### F4. The surface shadow window ends hard (Opus-only)
- **Status (2026-10-08, branch `presentation/terrain-morph`, not merged):** done behind `presentationContinuity`: the receiver fades the shadow over the outer 36 m of the ±160 m window, and the weight is exactly 0 at the edge (`tests/shadow-window-edge-fade.test.mjs`). R6 NOT RUN. See `docs/terrain-morph-continuity-2026-10.md`.
- **Code.** There is one orthographic shadow camera, `widthM:320` (`surface-lighting.ts:8`), centred under the eye (`:69`), with `left/right/top/bottom = ±160 m` (`:86`).
  Only the altitude is faded (`:66`). There is no fade toward the window edge.
- **Effect.** In three.js a fragment outside the shadow frustum is unshadowed. So casters and receivers beyond about 160–226 m (the square's half-width to its corner, in sun space) lose their shadows along a straight line that moves with the eye.
  That line falls inside the LOD1 forest band (out to 4 km, `planet-detail.ts:5`) and inside the fauna range. For a low sun the window's ground footprint is stretched.
- **Smoothing.** Fade shadow intensity to 0 over the outer 20–25% of the window in the receiver shader, or use two cascades.
- **Test (CPU).** Compute the shadow-camera bounds for a pose sweep and assert that the receiver fade weight is exactly 0 at the frustum edge.
- **GPU.** R6: low sun, forest, a camera panning over the 160 m line.

### F5. Fauna near rig ↔ proxy
- **Thresholds.** Enter 80 m, exit 95 m (`fauna-near-rig.ts:21-23`), 15 m of hysteresis. Capacity is 6 (`:20`).
- **The swap is a hard visibility switch** (`:119-128`; `planet-renderer.ts:2090` skips the proxy for rigged ids).
- **The two forms are not the same picture.** The proxy is four primitive instanced batches with a sinusoidal stride (`fauna-field-renderer.ts:70-77,158-180`). The rig is the composer body with IK and grazing.
  The file says so itself: "This simpler pose does not reproduce the near rig's IK or grazing, so it is not yet a continuous representation handoff" (`fauna-field-renderer.ts:52-54`).
- **The swap can also happen inside 80 m:**
  - when the body finishes building, after time-sliced builds at 2.5 ms per frame (`:171-186`);
  - when capacity reassigns a slot to a closer animal (`:120`).
- **Smoothing.**
  - Short term: a 0.3 s dithered cross-fade, with both forms drawn for the overlap.
  - Root fix: a proxy pose derived from the rig's pose clock.
  - Owner: L3 fauna (`fauna-*` single writer).
- **Test (CPU).** Feed a candidate list oscillating 75↔100 m, plus a delayed build, and assert one swap per crossing. Assert that complementary coverage weights sum to 1 during the overlap.
- **GPU.** R7.

### F6. Tree representations
- **LOD0↔LOD1.** `forestNearM=110`, `±12` m retained band (`planet-forest.ts:866-869`), so 98 to 122 m. The swap is hard, with no dither.
- **LOD1↔far canopy.** Hand-off at 550/600 m (`:884-886`, default `enter=550` and +50 at `:918`), hard.
- **Census installs.** These write every member of a patch in one frame (`planet-canopy.ts:266-276`). Atlas readiness flips 0→1 per family (`forest-impostor.ts:498`).
- **Capacity.** When LOD0 is full the tree is demoted to LOD1 in iteration order, not distance order. When LOD1 is full the tree is dropped (`planet-forest.ts:892-893`).
  Near capacity is 192 on desktop and **64 in immersive** (`:795`). Whether these caps are reached in dense forest is **needs probe** (a count only, CPU).
- **The coverage fades are smooth** (see §1).
- **Smoothing.**
  - complementary dither bands of about 20 m at 110 m and about 50 m at 550–600 m;
  - a 0.3 s per-instance publication fade for census installs and atlas readiness;
  - distance-ordered demotion.
  - Owner: #14 BIOME2-FOREST lane (forest files).
- **Test (CPU).**
  - Sweep one tree's distance and assert that summed coverage over all representations stays at 1 ± ε.
  - Fill the near batch past capacity and assert that the demoted set is the farthest.
- **GPU.** R8; the existing `setDebug({middleHandoffM})` probe (`planet-forest.ts:914-919`) was made for exactly this pair.

### F7. Rocks and small flora
- **Rocks.** `rockLod` uses distance/diameter ratios of 40/150/560 (320/80/40 triangles, `rock-geometry.ts:171`) and a hard per-tier range: scatter 64 m, boulder 280 m, outcrop 960 m (`rock-field.ts:29-35,143-147`). There is no hysteresis.
  The range cut is the binding one: ratio 560 lies beyond the range for every tier.
  On-screen size at the cut, **derived** at 1440 px vertical and a 48° FOV (≈1719 px/rad, the assumption in `fauna-field-renderer.ts:11`):

  | Tier | Largest size | Range | Size at the cut |
  |---|---|---|---|
  | scatter | 0.48 m | 64 m | **≈13 px** |
  | boulder | 1.5 m | 280 m | **≈9 px** |
  | outcrop | 3.4 m | 960 m | **≈6 px** |

  All three are visible pops.
- **Flora** (everything except trees). Bands switch at 22, 55 and 120 m with no hysteresis (`flora-culling.ts:136-146`, used at `planet-renderer.ts:1845`).
  Grass drops from **7 blades to 3** at 22 m (`flora-field.ts:873,887`), a density pop. A plant about 1 m tall at 120 m is about 14 px when it is culled (derived).
- **Smoothing.** Dithered distance fades about 10% wide at the range cuts, a hysteresis of about 5% on LOD ratios, and blade-count fade-out instead of a step. Rendering only.
- **Test (CPU).** Sweep distance through every boundary for a fixed instance. Assert that coverage is monotone with a per-metre step ≤ 1/(fade width), and that oscillation ±1 m changes the LOD at most once.
- **GPU.** R9.

### F8. Forest edge on the coast contour and on slopes
- **Code.** `forestPotential = forestBody && !ocean && snow<.2 && aboveSea>160 && slope<28 && suitability>0` (`surface-biomes.ts:114`). Presence is then `roll < .76·forestSuitability01` (`forest-habitat.ts:30`).
- **The snow gate is continuous**: suitability already contains `clamp01(1-snow/0.2)` (`surface-climate.ts:316`).
- **The coast and slope gates are not.** Suitability has no height-above-sea term and no slope term.
  So at the 160 m contour and at the 28° isocline the tree density jumps from 0 to 0.76·suitability. From flight this reads as tree lines that follow the contour.
  At the same contour the sand weight reaches 0 (`surface-biomes.ts:110`), so the two edges coincide.
- **Smoothing.** Multiply suitability by `smoothstep(130,190,aboveSea)·(1-smoothstep(24,30,slope))`.
- **This moves forest and biome digests.** It is identity-changing, so it belongs to the terrain/biome lane (#9 BIOME2-CLIMATE or #13), not to this lane.
- **Test (CPU).** Run a density transect across each gate and assert that the presence probability changes by ≤ 0.1 per 10 m and per 1°.

## 3. Full inventory: blend widths and smaller items

| Transition | Where | Width (const) | Discontinuity | Proposed | GPU? |
|---|---|---|---|---|---|
| Tile split/merge position | `planet-renderer.ts:1561-1562` | 0.22 s, linear | velocity 0→Δh/0.22 s (derived); Δh p99 651 m at L6→7 (measured, contract §9) | smoothstep easing; reverse morph on merge | R1 |
| Tile edge locks and skirts | `planet-renderer.ts:1577-1585`; `planet-tiles.ts:349` | 0 (draw range on/off) | skirt depth 0.25–40.25 m (derived); hides gaps, does not smooth | keep; coordinate neighbour morph before unlocking | R2 |
| Orbit preview → tiles | `planet-renderer.ts:1611-1614` | 0 | one swap per session; colour delta needs probe | 0.3 s cross-fade | R3 |
| Atmosphere shell | `sky-atmosphere.ts:258-259` | 0 m | alpha .115→.910 at D=1, noon (derived) | smoothstep over 0.1 H | R4 |
| Ground-life altitude gate | `planet-renderer.ts:1305`; `planet-detail.ts:20` | 0, 350 m | all flora+fauna on/off | hysteresis + fade | R5 |
| Rock altitude gate | `planet-rocks.ts:395`; `rock-field.ts:41` | 0, 960 m | all rocks on/off | hysteresis + 100 m fade | R5 |
| Low-flight detail | `planet-renderer.ts:1244` | 0, 6000 m (`flightDetailAltitudeM`) | changes the split target (`:1459`), so the morphs above apply | – | R1 |
| Local render units | `planet-flight.ts:7-12` | hysteresis 20/40 km | unit change only, invisible by design; orbit lines toggle at 40 km (`main.ts:2107`) | fade orbit lines | – |
| Shadow window edge | `surface-lighting.ts:8,86` | 0 at ±160 m | shadow present/absent line (derived) | edge fade / cascades | R6 |
| Shadow altitude fade | `surface-lighting.ts:66` | smoothstep 300–700 m | smooth | – | – |
| Shadow basis flip | `surface-lighting.ts:73` | 0 at abs(sun.y)=.98 | camera `up` flips, so texel phase changes once (derived); size needs probe | continuous basis | R6 |
| Fauna rig ↔ proxy | `fauna-near-rig.ts:21-23` | 0; hysteresis 80/95 m | different body and gait (code comment `fauna-field-renderer.ts:52-54`) | dither cross-fade 0.3 s | R7 |
| Fauna proxy eyes | `fauna-field-renderer.ts:14,169` | 0 at 60 m | sub-pixel by the file's own argument (`:11-13`) | 5 m fade (optional) | R7 |
| Fauna range | `planet-renderer.ts:2051` | 0 at 600 m | 1.5 m animal ≈4 px (derived) | 30 m fade | R7 |
| Proxy gait idle↔walk | `fauna-field-renderer.ts:159-176` | 0 | stride and bob amplitude step | ease on `stateS` like `fauna-locomotion.ts:142` | R7 |
| Near-rig gait | `fauna-locomotion.ts:142,175` | 0.6 s / 1.4 s smoothstep | smooth; sine foot lift gives a non-zero lift-off velocity (`:236`), a KINK | quartic lift | R10 |
| Composer rig modes | `fauna-composer-rig.ts:775` (Astra; lab composer) | 0 | mode switch; size needs probe | 0.25 s pose blend | R10 |
| Tree LOD0↔LOD1 | `planet-forest.ts:866-869` | 0; hysteresis 98/122 m | mesh swap | 20 m dither | R8 |
| Tree LOD1↔far canopy | `planet-forest.ts:884-886` | 0; 550/600 m | representation swap | 50 m dither | R8 |
| Forest range/footprint/altitude | `planet-forest.ts:798,871,894` | 300 / 130 / 500 m smoothstep | smooth | – | – |
| Census install / atlas ready | `planet-canopy.ts:266-276`; `forest-impostor.ts:498` | 0 s | patch-sized pop during streaming | 0.3 s publication fade | R8 |
| Impostor view blend | `tree-impostor-views.ts:93-96` | barycentric across 1/(grid-1) | KINK at cell edges | C1 reconstruction | R8 |
| Rock tiers / LOD | `rock-field.ts:29-35,143-147` | 0 | ≈13/9/6 px pops (derived) | 10% dither + hysteresis | R9 |
| Flora LOD / range | `flora-culling.ts:136-146` | 0 at 22/55/120 m | 7→3 grass blades; ≈14 px at the cut (derived) | dither + hysteresis | R9 |
| Snowline | `surface-climate.ts:64,303` | 6 K linear (262–268 K) ≈ 0.9 km of height at 6.5 K/km (derived from `LAPSE_*` `:62`) | KINK only | smoothstep | R11 |
| Treeline | `surface-climate.ts:65,305` | 6 K linear (283–289 K, warmest month) | KINK only | smoothstep | R11 |
| Forest edge | `surface-biomes.ts:114` | 0 at 160 m / 28° | density 0→0.76·suit (derived) | ramps (identity change) | R11 |
| Sand / rock weights | `surface-biomes.ts:109-111` | 160 m, 30°, 18–45° linear | KINK | smoothstep | R11 |
| Macro colour coast/fell | `terrain.ts:360-369` | 120 m; 160–760 m × 6 K | KINK | smoothstep (colour identity) | R11 |
| Climate bins | `surface-climate.ts:309-310` | 2 K / 1/8 moisture codes | a step only if a consumer colours by code; **not found** in the colour path (`terrain.ts:354-373` reads continuous fields) | – | – |
| Sea level over time | `planet-renderer.ts:375`; `world-surface.ts:120-123` | 25 m buckets | shoreline step 25 m vertical, 25/tan(slope) horizontal (≈1.4 km at 1°, derived); per-tile async rebuild | finer bucket for render or a shoreline cross-fade | R12 |
| Underwater medium | `planet-renderer.ts:1273-1274` | 0 at mean snapped level | disagrees with the drawn wave by up to 3 m (`:133`) | test against the local wave height | R12 |
| Ground detail / PBR fades | `ground-material.ts:111,131`; `planet-renderer.ts:1571-1572` | 1500–6000 / 600–1800 m smoothstep | smooth (enables fire at zero weight) | – | – |
| Day/night/terminator | `surface-lighting.ts:53`; `local-aerial-perspective.ts:11`; `sky-atmosphere.ts:167` | sun-dot −.08..2, −.15..15, −.12..15 smoothstep | smooth | – | R13 |
| Local haze | `local-aerial-perspective.ts:10,22` | 65 km / 14 km scales, cap .92 | KINK at the cap and floor clamps | soft saturation | R13 |
| Cloud windows / weather | `planet-clouds.ts:156-159`; `volumetric-clouds.ts:350-368` | 6 h cross-fade; weather texture re-baked per 5 s world-time bucket, no fade | at 1× the per-bucket rotation is 2π·5e9/5.04e14 ≈ 6e-5 rad (derived), so negligible; at accelerated time it re-bakes every frame anyway | interpolate two textures (low priority) | – |
| Eye wrap bands | `fauna-composer-eye.ts:444,581,594` (Astra) | linear .075/.15 eye radii | geometric KINK | smoothstep | R10 |
| Star lifecycle | `galaxy-space.ts:287` (Astra) | `alive` 0/1 at the lifecycle date | visible only when seeking across a birth/death date | short date-fade | – |
| River environment, bank tint | `river-environment.ts:7,92-95`; `terrain.ts:384-393`; `planet-tiles.ts:85-101` | 0 | **dormant**: `activeRenderedRiverRegion` returns null unless `archivedInlandRivers` is set (`inland-rivers.ts:21,37-38`), which is test-only (`:28`) | fix only if inland rivers return | – |
| Seasons | `season.ts` | – | **not rendered**: no importer in `src/` | revisit in #19 SEASONS-1 | – |

## 4. What this means for the backlog order (#12, #13, #23)

- **#23 LOD-HORIZON owns F1.** It edits the same tile-selection hunks of `planet-renderer.ts`.
  F1 is the highest-ranked item and is rendering-only, with no digest moves.
  Proposal: put the morph fixes (inherit morph on replace, reverse morph on merge, parent colour/normal blend, eased curve) in #23's first increment, before the horizon metadata work. Otherwise the new rung selection inherits the colour pop it is meant to make invisible.
- **#12 OCEAN-PRESENT** should take F10 (the underwater switch is not wave-aware) and should check F2 on the seabed approach.
  The Luna "reads as underwater" FAIL has no known cause, and the medium flip at the mean level is a candidate worth one render (R12).
- **#13 BIOME2-VISUAL and #9 BIOME2-CLIMATE** are where F8 and the §3 colour kinks belong. They change forest and colour identity, so they ride the version bump those tasks already carry.
- **L3 fauna** owns F5, F12 and F13. They are independent of terrain.
  - *Correction (2026-10-07, decisions D1/D3, Opus-decided on Kasper's instruction):* the claim that they "move no digest" was wrong. F12 (proxy gait eased on `stateS`) and F13 (eye/range fades) do move the life digest (`tests/life-cpu-digest.test.mjs`) when on, and so do the F5 near-rig cross-fade (proxies stay drawn through the overlap, exits past 95 m are listed so they fade) and the F3/F7 life hooks.
  - They therefore ship behind `PlanetRendererOptions.presentationContinuity` (`src/planet-renderer.ts`). The app turns it on (`?continuity=0` turns it off for an A/B). The identity scenario leaves it off, so `life-cpu-digest` and `planet-forest-frame-digest` stay byte-identical against `e6a0b39`. `tests/life-continuity-scenario.test.mjs` covers the on path.
  - **F7-flora is partial.** Band memory (hysteresis) and the 108–120 m range fade are in, but the 22 m grass blade-count step (7→3 blades) is still a mesh swap with no fade.
  - **For the R5 brief:** the rock altitude gate's descent switch is now at 920 m (it exits at 960 m, the old hard threshold), not 960 m as in §3. The ground-life gate is 350 m in and 380 m out with the option on.
- **F3, F4, F6 and F7 have no owner yet.** They are presentation-only and move no digests, so they are good candidates for a non-identity rendering round:
  - F3 and F4 are cheap, each a few lines with a CPU test;
  - F6 overlaps the forest files (#14);
  - F7 is self-contained (`rock-field.ts`, `flora-culling.ts`).

## 5. Reconciling Astra with Opus

- **Both passes found:**
  - the terrain morph and merge (F1);
  - the orbit preview swap;
  - the fauna 80/95 swap;
  - the tree bands;
  - the rocks and flora;
  - the forest gate;
  - the linear-ramp kinks;
  - the ground-detail enable gates (both concluded these are harmless; Opus proved the altitude case, §1).
- **Found by Astra and confirmed by Opus at the cited lines:**
  - the atmosphere shell switch (F2, `sky-atmosphere.ts:258-259`);
  - the 350 m ground-life gate and the 960 m rock gate (F3);
  - census install and atlas readiness (`planet-canopy.ts:266-276`, `forest-impostor.ts:498`);
  - the shadow basis flip (`surface-lighting.ts:73`);
  - the impostor barycentrics (`tree-impostor-views.ts:89-96`);
  - the sine foot lift (`fauna-locomotion.ts:236`);
  - the weather bucket (`volumetric-clouds.ts:350-368`).
- **Astra's claims that Opus downgraded:**
  - *River environment and regional bank tint* (Astra #12, #16): the code is real but dormant in the shipped build, because inland rivers are archived (`inland-rivers.ts:21,37-38`; `planet-renderer.ts:817`).
  - *Cloud weather buckets* (Astra rank 6): at 1× the per-bucket change is about 6e-5 rad of rotation plus whatever the 6 h-cross-faded coverage moves in 5 s. That is negligible, so it moved to Low.
  - *Seasons latitude kinks* (Astra #23): `season.ts` has no consumer in `src/`, so there is nothing on screen today.
- **Opus-only findings that Astra missed:**
  - the rebuilt-tile re-morph (F1.3);
  - the hard shadow-window edge (F4);
  - the 25 m sea-level bucket with its async rebuild (F9);
  - the wave-unaware underwater switch (F10);
  - the instanced-proxy gait step (F12);
  - the immersive near-tree capacity of 64 with demotion in iteration order (F6);
  - the measured contract figures (colour p99 33.8/5.2 and height p99 651 m) that size F1.
- **Not verified by either pass:**
  - whether fog or local air hides F2 in practice;
  - whether the F6 capacities are ever reached;
  - how large the F11 preview/tile colour delta is;
  - the composer-rig mode switch (`fauna-composer-rig.ts:775`), which is the lab composer path, not the planet runtime.

## 6. GPU before-render batch this audit needs (NOT run; for the gate lane or a later GPU slot)

Each render is a short capture: a still pair, or 2–4 s at 30 fps. Pose names follow the contract's worlds (Maithea, Selawyn, Raiva, Lethuris). Luna gets 3 asks per disputed frame: "Do you see a pop, seam or line? Where? Is it worse in A or B?"

| ID | Finding | Shot |
|---|---|---|
| R1 | F1 | Descend over a Maithea massif at L6→L10 altitudes (orbit 400 km → 10 km → 300 m), sunlit and steep. Then ascend again (merges). 30 fps frame strip; RGB and height difference between consecutive frames. |
| R2 | F1 skirts | Grazing camera at 2 m over a cube-face edge and a 2:1 boundary, while tiles refine. |
| R3 | F11 | Focus from orbit onto a sunlit steep coastline: the frames before and after `surfaceReady`. |
| R4 | F2 | Slow radial crossing of the atmosphere shell `outer`, horizon in view, at noon and at night; 2 s. |
| R5 | F3 | Ascend through 330–370 m over a herd plus flora, and through 940–980 m over boulders; then hover at 350 m ±3 m. |
| R6 | F4 | Low sun (elevation about 10°) in forest; pan across the ±160 m shadow window edge; then a sun sweep through abs(sun.y)=.98. |
| R7 | F5/F12/F13 | One walking animal at 75→100→75 m; a proxy herd changing idle↔walk at 150 m; a herd crossing 600 m. |
| R8 | F6 | An isolated leafy tree circled at 98–122 m; a forest edge crossed sideways at 500–650 m (`setDebug({middleHandoffM})`); a stationary forest view during cold streaming. |
| R9 | F7 | Dolly at 1.7 m eye height over grass and boulders through 22/55/64/120/280 m. |
| R10 | F5 rig kinks | Side-on near-rig walk, touchdown frames, idle→walk. |
| R11 | F8 / §3 colour | An oblique flight transect from coast to inland forest across the 160 m contour, and a steep-slope transect across 28°; a snowline flyover. |
| R12 | F9/F10 | A time-seek across a 25 m sea-level bucket at a gentle shore; an eye 1 m below and above the mean sea level in 2–3 m waves. |
| R13 | §3 light | A fixed landscape through sunset (control: expected smooth). |

## 7. Regression tests to add later (all CPU, all rendering-only)

| Test | Pins |
|---|---|
| `terrain-morph-continuity` | F1: inherit on replace, reverse on merge, per-frame displacement bound |
| `atmosphere-shell-continuity` | F2: shader formula at `outer±ε`, |Δalpha| < .01 |
| `life-altitude-hysteresis` and `rock-altitude-hysteresis` | F3 |
| `shadow-window-edge-fade` | F4 |
| `fauna-handoff-coverage` | F5: complementary weights, one swap per crossing |
| `forest-representation-coverage` | F6: sum of coverage = 1 across bands; capacity demotes the farthest |
| `rock-flora-lod-sweep` | F7: monotone coverage, single switch under ±1 m oscillation |
| `forest-edge-transect` | F8: identity-changing; lands with the biome version bump |

Each test needs a negative case: re-introduce the step and show that the test fails.
