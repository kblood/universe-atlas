# Biome/climate increment 1 — integration handoff (2026-10-03)

Plan: [`docs/biome-climate-increment-1-plan-2026-10-02.json`](biome-climate-increment-1-plan-2026-10-02.json)
(package W3-INTEGRATE). Climate model: [`docs/surface-climate-v1.md`](surface-climate-v1.md).
Local only: nothing was pushed or deployed.

## What changed

Before this increment, the orbit colour, the ground classifier and the forest
each used their own rule for snow and vegetation. A peak could be white from
orbit and temperate on the ground, or the reverse. Now **one annual climate field**
(`surface-climate-1`) drives all three:

- **Per-planet climate.** Annual-mean temperature comes from insolation, which
  depends on latitude and the drawn axial tilt (0–180°, folded to an obliquity
  of 0–90°). Height then cools it at a **lapse rate set by each planet's surface
  gravity**: Γ = 0.6652·g/1004, which gives 6.50 K/km for Earth, 4.62 K/km for
  Maithea, and 1.78–8.00 K/km across the corpus. There is no global lapse
  constant. As a result, snow share varies by planet: some planets are mostly
  snow and some have none. Above about 54° of tilt the poles receive more
  sunlight than the equator, so high-tilt worlds have warm poles. This was kept
  on purpose (owner decision).
- **Classifier v2** (`surface-biomes-2-climate`, `surface-survey-2`):
  - snow = the climate's `snowFraction`;
  - 'Dry upland' comes from effective moisture, which includes the subtropical
    dry belt;
  - 'Mountain meadow' comes from the warmest-month treeline;
  - `forestPotential` and `forestSuitability01` come from the treeline,
    moisture and the snow window;
  - new flat annual fields (`annualMeanTempK`, `effectiveMoisture`,
    `snowFraction`, `treeline01`, `climateCode`, …) feed consumers.
- **Terrain colour v2** (`terrain-1.7.0-climate-colour`): water-world land colour
  is `waterWorldLandColour(climate)` × grain. The zones are humid to arid,
  darker forest belts, alpine meadow above the treeline, fell-field rock,
  coastal sand and snow, where snow is exactly the classifier's
  `snowFraction`. Elevation is bit-identical, and every other palette is
  unchanged.
- **Ground shader** (`ground-pbr-v2-climate` cache key):
  - PBR detail is applied as a ratio, so it keeps the macro colour;
  - beach sand;
  - turf or straw tint from the macro colour;
  - no new textures.
- **Forest C1** (`tree-habitat-2-climate`): presence is `roll < 0.76 ×
  forestSuitability01`. This is nested thinning on the existing population
  roll. It gives continuous ecotones toward the treeline, the dry belt and
  the snow edge, and needs no population migration.
  `FOREST_CENSUS_VERSION` stays `forest-census-3`. Its family hash now also
  carries `CLIMATE_VERSION` and `HABITAT_SUITABILITY_VERSION`.
- **Season module** (`atlas-season-1`, plus the `sun-frame` convention): this
  is a closed-form season basis only. **Nothing consumes it yet**, because
  seasons wiring is out of scope this round.
- **Habitat suitability** (`habitat-suitability-1`): evaluates the existing
  biosphere niches against the climate field. Niches and `BIOSPHERE_VERSION`
  are unchanged. This is the interface fauna will consume (see below).

### Merges on `main` (first parent)

| Commit | What |
|---|---|
| `ef74aa1` | W0-CLIMATE: surface-climate-1 (per-planet lapse) and habitat-suitability-1 |
| `6b3670e` | W0-SEASON: sun-frame convention and atlas-season-1 |
| `a9e3654` | Wave 0 test registration and the calibration script |
| `0c6d294` | W1-A classifier v2 |
| `4b18bc3` | W1-B terrain colour v2 (golden regenerated deliberately, see below) |
| `a3c2c2c` | W1-D ground shader |
| `a59b6eb`, `d2a5ccb`, `cccf15a` | Wave 1 integration fixes: fixture, renderer-gate pin, forcing cache key, and sun-shadow `normalBiasM` .06 → .30, which removed shadow-acne banding on snow |
| `0fa676b` | W2-C **C1 only**. In the same merge, the coordinator fixed the `tests/forest-water-validity.test.mjs:52` oracle to mirror the C1 presence rule; without it there was one failure. |
| `aea99dc`, `7753db9` | New `tests/acceptance/climate-agreement.test.mjs`, registered together with the long-missing `fauna-template-phenotype.test.mjs` |

The face-round merges (`e89b1ae` … `179485c`) are interleaved on the same
`main` and belong to a different round.

### Versions

| Name | Value |
|---|---|
| `CLIMATE_VERSION` | `surface-climate-1` (calibration sha pinned) |
| `HABITAT_SUITABILITY_VERSION` | `habitat-suitability-1` |
| `SEASON_VERSION` | `atlas-season-1` (no consumer) |
| `BIOME_VERSION` | `surface-biomes-1` → `surface-biomes-2-climate` |
| `SURVEY_VERSION` | `surface-survey-1` → `surface-survey-2` |
| `TERRAIN_VERSION` | `terrain-1.6.0` → `terrain-1.7.0-climate-colour` |
| `TREE_HABITAT_VERSION` | `tree-habitat-1` → `tree-habitat-2-climate` |
| `FOREST_CENSUS_VERSION` | `forest-census-3` (unchanged, because C2 is held) |
| Ground shader cache key | `planet-patch-ground-bed-v11/…/ground-pbr-v2-climate` |
| `BUILD_VERSION` | `atlas-client-2026-10-biome-climate-1` |
| Unchanged (guarded) | `SURFACE_VERSION atlas-surface-7-no-inland-rivers`, `surface-population-2`, `BIOSPHERE_VERSION`, catalogue `atlas-2.0.0` |

`MODEL_MANIFEST_ID` gains BIOME, CLIMATE, HABITAT_SUITABILITY and SURVEY. A
bookmark made before this increment shows the one-time "predates the current
model" notice; the owner accepted this.

**Digests.**
- The golden `terrain` and `combined` digests moved once, in W1-B. That was a
  deliberate regeneration with the version bump and a cross-engine
  (Chromium/Firefox/WebKit) match.
- Nothing else moved:
  - `life-cpu-digest`, `terrain-leaf-loop-digest` and
    `planet-forest-frame-digest` all pass against their unchanged references;
  - no digest moves for C1.

## Integration gate (measured on `main` at `aea99dc`; quiet `npm test` rerun at `7753db9`)

Logs: `test-results/biome-climate-2026-10/final/logs/`. In the main checkout,
`test-results` is a symlink, so this evidence is not in git.

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| Full suite, serial (`node --test --test-concurrency=1` over the 165 registered files, as the plan specifies) | **1151 tests: 1147 pass, 0 fail, 4 skipped**, 356 s |
| `npm test` (default parallel concurrency, run while the browser captures were running) | 1151 tests: 1146 pass, **1 fail**, 4 skipped. The failure was `season.test.mjs` "cost: seasonBasis ≤ 2 ms" at 2.42 ms. Run alone, the file passes 16/16 with seasonBasis at 0.427 ms/body. This is a load-sensitive timing assertion, not a logic failure. |
| `npm test` rerun on a quiet machine (`7753db9`, before the doc commit) | **1151 tests: 1147 pass, 0 fail, 4 skipped**, 97 s, exit 0 (`final/logs/npm-test-quiet.log`) |
| Identity gates: `life-cpu-digest`, `terrain-leaf-loop-digest`, `planet-forest-frame-digest`, `terrain-elevation-identity` | 6/6 pass |
| Golden (`node tests/golden/node-run.mjs` vs `tests/golden/golden.json`) | all 7 digest keys match |
| `npm run build` | exit 0 |
| `tests/acceptance/climate-agreement.test.mjs` (new) | 3/3 pass |

**Climate agreement** (the plan's orbit/ground mismatch gate) is checked on 4
water worlds (Maithea, Selawyn, Raiva, Lethuris). Each world uses 60k uniform
Fibonacci directions, which gives 22.6k–33.0k land directions. At the same
post-landform height, the test asserts:
- terrainSampler colour === `waterWorldLandColour(climate)` × grain;
- classifier `weights[3]` and `snowFraction` === the climate's snowFraction;
- `effectiveMoisture`, `annualMeanTempK` and `climateCode` are equal;
- the 'Alpine / polar snow' label holds ⇔ snowFraction > 0.6;
- `forestPotential` ⇒ the colour's forest suitability.

A second test checks that the orbit bake (`planetSurface`, the texture the
orbit view draws) stores exactly the sampler colour in every pixel.
**Negative check:** a forcing with a fixed 6.5 K/km lapse fails both
agreement tests.

## Per-planet snow share (shipped classifier)

The corpus is the W0-CLIMATE one: the 721 life-eligible rocky planets of the
first 2000 G001 systems, sampled at 8000 directions each, using the merged
`biomeClassifier`. Script: `final/snow-share.mjs`. Result:
`final/snow-share.json`. The numbers match the W0 calibration report's
"gravity" row exactly.

| Measure | min | p10 | median | p90 | max | mean |
|---|---:|---:|---:|---:|---:|---:|
| Snow share of land (weights[3] > 0.6), % | 0 | 9.4 | **61.0** | 99.4 | 100 | 57.9 |
| Was (surface-biomes-1), % | 15 | 25.4 | 32.8 | 39.4 | 49.3 | 32.5 |
| forestPotential share of land, % | 0 | 0 | 16.8 | 50.9 | 65.7 | 20.4 |
| Expected tree cover (0.76 × mean forestSuitability01), % | 0 | 0 | 9.9 | 32.6 | 44.2 | 12.7 |

- **Histogram.** Snow share in 10% bins, from 0–10% up to 90–100%:
  75, 55, 48, 66, 58, 52, 66, 52, 56, 193 planets.
- **Extremes.** 249 planets are mostly snow (> 80%), and 63 are almost
  snow-free (< 5%).
- **By gravity tercile** (median snow, median forestPotential):
  - g 2.69–5.87: 33.0% snow, 30.2% forestPotential;
  - g 5.91–9.24: 58.2% snow, 16.8% forestPotential;
  - g 9.25–12.07: 70.7% snow, 12.1% forestPotential.

  Heavier worlds have steeper lapse rates and therefore more snow.
- **By obliquity** (median snow): 0–30°: 59.8%; 30–54.7°: 62.0%;
  54.7–90°: 61.9%.

| Planet | g (m/s²) | lapse (K/km) | obliquity | snow % | forestPotential % |
|---|---:|---:|---:|---:|---:|
| Maithea (the default life world) | 6.97 | 4.62 | 13.5° | 68.9 (was 35.0) | 7.7 |
| Selawyn (high tilt) | 11.48 | 7.60 | 89.8° | 37.3 | 31.4 |
| Raiva (light) | 2.69 | 1.78 | 61.4° | 0.0 | 55.3 |
| Lethuris (heavy) | 12.07 | 8.00 | 70.8° | 90.0 | 3.5 |

Maithea is now about two-thirds snow over its land. Most of that is the high
continental interior: the median land height is 6.5 km, and the lapse rate is
4.62 K/km. The owner accepted that some planets are mostly snow.

## Visual before/after

**Setup.**
- **Trees.** Before is `c80c8dd`, the `main` commit just before the W0-CLIMATE
  merge. After is `7753db9`.
- **Builds.** Both are production `vite preview` builds on port 5249, one
  server at a time, each under the machine-wide GPU lock (released between
  batches).
- **Browser.** Headless Chromium on ANGLE d3d11, which selected the **AMD
  Radeon iGPU**.
- **Poses.** All poses are identical between trees. Sites were re-resolved
  with the merged classifier (`final/resolve-sites.mjs` → `final/sites.json`)
  using the baseline audit's categories.
- **Ground views** are frozen hover poses via `__atlas.setPose` with an
  explicit level heading:
  - near: 2.2 m clearance, pitch −6°;
  - far: 320 m clearance, pitch −16°.

  None use `?walk=` landings.
- **Orbit views** repeat the baseline audit's procedure: the default body
  view, then four 400 px drags. `rot4` is the sunlit limb pose of
  `biome-plan-2026-10-02/shots/03-orbit-rot4.png`.
- **Settling.** Most near shots did **not** settle within the 30 s window,
  because the forest backlog was still pending. They are hover-state
  captures, which the plan accepts. Settle flags and counts are in
  `final/{before,after}/report-*.json`.

**Contact sheets** (in `test-results/biome-climate-2026-10/final/`):
- `contact-sheet-maithea.png`: the orbit limb and the 7 Maithea sites;
- `contact-sheet-tilt-gravity.png`: Selawyn, Raiva and Lethuris, with orbit,
  near and far views of each;
- zooms: `zoom-orbit-maithea-limb.png` and `zoom-polar-near.png`;
- individual pairs: `sheet-rows/`.

### Verdicts against the plan's acceptance list

| Criterion | Verdict | Evidence |
|---|---|---|
| The 18 km equatorial summit is snow | **Met.** Before: brown grass with flora. After: snow, with no flora. | `row-highMountain-near` |
| The coast shows a sand tint | **Met.** Before: olive-brown. After: pale sand under the same scrub. | `row-coast-near` |
| Polar snow does not read as dunes | **Met.** Before: regular dune ripples. After: smooth snow. | `zoom-polar-near.png` |
| Dry upland is distinct from forest | **Met.** No trees at the dry-upland site in either tree (far canopy 0). After shows olive ground with shrubs, against the forested sites' dense canopy. It reads greener than "dry". | `row-dryUpland-near` |
| Equatorial and mid-latitude forests differ in Oak/Pine mix and density | **Density: met. Mix: NOT met (needs owner confirmation).** Near trees: equator 72 → 72, mid-latitude 67 → 46, matching C1 thinning by 0.76 × suitability. The ground at the mid-latitude site turns from brown to green turf. The species mix is unchanged, because the climate-weighted species binding is **C2, which is held** (see Deferred). | `row-equatorLowland-*`, `row-midLatForest-near` |
| The orbit view shows green forested belts and white peaks | **Partly met on Maithea, met on Raiva.** Maithea's high interior is now white, matching ground snow, but its green is a narrow coastal and lowland fringe, because most of its land is above the snowline. Raiva, the low-gravity world, shows broad green belts next to arid tan. | `zoom-orbit-maithea-limb.png`, `row-orbit-raiva-rot4` |
| Mid-latitude snow mountain | Both trees show snow. After: the tan ridge band in the background is now snow, and the fauna herd is gone (weights[1] carries (1 − snow)). | `row-midLatSnowMountain-near` |
| High tilt, Selawyn (89.8°) polar lowland at 68.6° | Before: white dunes, no trees. **After: green forest and turf.** The annual mean is 326.9 K and the warmest month is 376 K: the warm pole the owner chose to keep. See Limits. | `row-highTiltPolarLowland-*` |
| Gravity pair at matched height (about 3.3–3.4 km, below 40° latitude) | Raiva (light, 1.78 K/km): before, brown ground; after, green turf with pine forest. Lethuris (heavy, 8.00 K/km): before, brown ground with flora and fauna; after, full snow. The per-planet lapse rate is visible directly. | `row-lightGravityMountain-near`, `row-heavyGravityMountain-near` |

`midLatForest-far` sits inside a cloud bank in both trees and shows nothing.
This is a pose and weather artefact; the near view is the evidence.

## Performance (same-session, interleaved)

**Method.**
- **Trees.** Before is `c80c8dd`, after is `7753db9`.
- **Process.** One node process imports both trees and interleaves them in
  every repeat. The result is the minimum over 7 repeats (5 for the orbit
  bake).
- **Script.** `final/perf/bench-node.mjs`. Report:
  `final/perf/bench-node-report.json`. Log: `final/logs/bench-node.log`.
- **What is measured.** These are the plan's CPU budgets, measured on the
  same functions the workers run:
  - `buildTile` is the worker terrain tile build;
  - `planetSurface(1024,192)` is the worker orbit `surface` job.

| Budget (plan) | Before | After | Result |
|---|---:|---:|---|
| `buildTile` mean, Maithea levels 6–18, 7 sites × 7 levels: ≤ +3% | 18.19 ms | 17.04 ms | **−6.3%, pass** |
| Orbit `planetSurface` 1024: ≤ +0.25 s | 417–484 ms | 371–412 ms | **−24 to −72 ms per world, pass** |
| New texture bytes: 0 | | | **0, pass.** Constants are identical: `GROUND_PBR_TEXTURE_BYTES` 5,592,406, `GROUND_ATLAS_BYTES` 611,670, `TERRAIN_BUDGET_BYTES` 186,733,908 |
| `PENDING_TILE_BYTES` unchanged | 374,406 | 374,406 | **pass** |
| Per-frame CPU: +0 | | | **+0 by inspection.** This is not a measurement (see below) |

`planetSurface` per-world deltas: Maithea −72.4 ms, Selawyn −24.3 ms, Raiva
−56.8 ms, Lethuris −46.0 ms.

`buildTile` per site: only `equatorLowland` is slower (15.05 → 16.21 ms,
+7.7%). Every other site is faster, by 1–11%. The tile cost now carries the
climate field in place of the older per-sample colour and classifier logic.
The mean is the plan's gate.

**Per-frame CPU (by inspection, not measured).** The render-path diff from
`c80c8dd` to `7753db9` is limited to:
- GLSL inside the ground shader (`ground-material.ts`);
- a shader cache-key string;
- the `groundHabitat` uniform, set once at material compile through
  `temperateHabitat(body)`;
- the `SURFACE_SHADOW.normalBiasM` constant.

No per-frame JS was added.

**GPU (not measured).**
- The ground fragment shader gained two `textureLod(…, 16.0)` mean lookups
  and a few ALU ops, but no new textures.
- **The browser harness (`tests/desktop-perf.browser.mjs`, S1/S4/S6, native
  and cpu-proxy) produced no data on this machine.** Headless Chromium only
  exposes the **AMD Radeon iGPU**. I probed d3d11, d3d11on12, vulkan and
  `--force_high_performance_gpu`, and the RTX 5090 is never selected.
- On the iGPU, the **before** tree itself never reached the walking state
  within the harness's 180 s wait, in both conditions (`final/perf/before-r1/`,
  `overall: FAIL (CONTENDED)`, no scenario data). I aborted the interleaved
  series after that, so no after-tree browser run was completed.

The browser-side gates are therefore **not observed**:
- cpu-proxy frame-work p95 within +3%;
- GPU p95 within +3%;
- browser worker tile build within +3%.

They need a run on a machine whose headless browser gets a discrete GPU, or
a headed run on the 5090. Owner waiver or re-run required.

## How fauna will consume habitat-suitability

Owner wish (long term): every biome on a planet with air should host adapted
animals. This round did not edit any fauna file (`src/fauna-*.ts`,
`src/creature-*.ts`, creature lab). The parallel face round owns them. The
interface is ready:

1. **Per planet:**
   `compileNicheEvaluator(biosphereAt(world,date).species, profile, body.temperatureK)`
   compiles the dated species once. Temperatures are rebased from the planet's
   anchor onto the profile's nominal (temperate 286 K, arid 299 K, cold 268 K).
2. **Per sample**, build a `FaunaHabitatSample` from the classifier v2 annual
   fields at that location:
   - `annualMeanTempK`
   - `effectiveMoisture`
   - `snowFraction`
   - `forestSuitability01`
   - `slopeDeg`
   - `ocean`
   - `climateCode`

   `forestHabitat` already returns `climateCode` in C1. Read only annual
   fields, never a season phase.
3. Call `evaluator.animals(local, out)`, which returns the suitability per
   animal. It includes the producer rule: browsers need an occupied tree or
   shrub at the location, grazers an occupied grass.
4. `faunaSpeciesWeights(out)` turns suitability into weights from 1 to 8, with
   0 meaning absent. `pickWeightedMax` then picks the species with an id
   `tieKey`. The pick is order-independent, and all-ones weights reproduce the
   legacy pick.
5. **Contract cautions:**
   - **`weights[1]` (herd/turf) already carries (1 − snowFraction).** Do not
     multiply by it again. Snow- and alpine-adapted species should key off
     `snowFraction` and `climateCode`.
   - Do **not** copy `treeSpeciesWeights`' "hard zero plus uniform fallback"
     pattern without a zoning check. That pattern is what inverted the
     cold/warm species zoning in the held C2 prototype.

The BIOME-FAUNA follow-up wires this, so that snow, tundra, dry upland and
forest each get adapted species instead of the current turf-weighted herd
placement.

## Deferred

- **C2: climate-weighted tree species binding** (`forest-census-4-climate`).
  It is held on branch `biome-round/W2-C-FOREST-C2-held` (`5f49777`). The
  branch is kept deliberately: it is the only copy of that work. To revive it:
  1. The habitat-suitability.ts owner (W0-CLIMATE) changes
     `treeSpeciesWeights` to w[i] = 1 + floor(7·a²·(0.5 + 0.5·suit)) for
     every bindable tree, where a = `familyClimateAffinity`. There is no hard
     zeroing.
  2. The same owner bumps `HABITAT_SUITABILITY_VERSION` to
     `habitat-suitability-2` and updates its fallback test.
  3. Rebase C2.
  4. Flip the todo in `tests/forest-climate-binding.test.mjs` and register
     the file. It is not registered this round.
  5. Redo the C2 captures and let them settle.

  The validated recipe is in
  `test-results/biome-climate-2026-10/w2c/logs/option-a-weight-variants-probe.diff`.
  The prototype reached cold 0.822 / warm 0.295 (ratio 2.78), falling
  monotonically by tBin. Until C2 ships, Oak/Pine mix does not follow climate.
- **`desktop-forest-acceptance.browser.mjs` needs an owner.** Its
  `#find-life` timeout predates W2-C (it appears on the base tree too).
- **`tests/forest-water-validity.test.mjs` should be added to the W2-C
  ownership list.** Its oracle mirrors the habitat rule.
- **Gaps carried from the plan:**
  - understory and ground covers do not follow climate yet;
  - seasons are not wired (the `atlas-season-1` module is unconsumed);
  - inland rivers, lakes and wetlands stay withdrawn.

## Limits

- **Hot poles grow forest.** High-tilt warm poles are physical consequences
  the owner kept. However, `forestSuitability01` has no upper heat bound, so
  Selawyn's 327 K annual / 376 K warmest-month pole grows temperate forest.
  A heat or aridity cap belongs in a later climate version (GEOPHYSICS or
  BIOME-FAUNA).
- **Maithea is mostly snow.** The default life world went from 35% to 69%
  snow, and its forest is confined to low, warm margins. This is per the
  owner's gravity-lapse decision, and it is what a first-time visitor sees
  from orbit.
- **The visual evidence is partial.** It is headless iGPU, hover-state,
  mostly unsettled captures, and nothing was tested in a headset.
- **The perf baseline includes the face round.** The before tree `c80c8dd`
  predates the face-round merges as well. Any perf difference therefore
  includes the face round's fauna changes (eyes and gloss) as well as this
  increment.

## Planned follow-ups

- **GEOPHYSICS.** Re-datum the climate to the dated sea level, add an upper
  heat and aridity cap for forest, and add orographic moisture (rain shadows).
  Its own version bump.
- **BIOME-FAUNA.** Wire habitat-suitability into fauna species choice and
  placement as described above, so that every biome on an air-bearing planet
  hosts adapted animals.
- **SEASONS.** Consume `atlas-season-1` (`seasonAt`, `faunaSeasonContext`) for
  presentation: seasonal snow, foliage and daylight. Presence and kind stay on
  annual fields.
- **STAR-LUMINOSITY.** Feed the dated stellar brightening into the climate
  anchor. That makes `t` a climate input, so it needs its own determinism and
  seek-independence gate.

## Evidence index

All paths are under `C:/LLM/IWSDK/universe-atlas/test-results/biome-climate-2026-10/`:
- `final/logs/`:
  - `gate-summary.txt`, `npm-test-serial.log`, `npm-test.log`,
    `identity-gates.log`, `golden-node.json`, `build.log`;
  - the perf logs and the capture logs.
- `final/before/`, `final/after/`: screenshots and `report-*.json`. The
  reports record GPU, build commit, settle flags and forest counts.
- `final/contact-sheet-maithea.png`, `final/contact-sheet-tilt-gravity.png`,
  `final/zoom-*.png`, `final/sheet-rows/`.
- Scripts and data:
  - `final/sites.json`, `final/resolve-sites.mjs`;
  - `final/snow-share.{mjs,json}`;
  - `final/capture.mjs`, `final/contact-sheet.sh`;
  - `final/run-gate.sh`, `final/run-perf.sh`.
- `final/perf/`: the desktop-perf reports.
- Earlier packages: `W0-CLIMATE/`, `W0-SEASON/`, `W1-A-CLASSIFIER/`, `w1b/`,
  `W1-D-GROUND-SHADER/`, `W1-integrate/`, `w2c/`.
