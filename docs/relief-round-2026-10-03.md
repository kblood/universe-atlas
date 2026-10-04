# Relief round 2026-10-03 (terrain-1.8.0-relief, ocean-volume-1, render-bounds-1, place-query-1)

Status: integrated on branch `relief-round/INT` (finish round 2026-10-04). Not merged to `main`, not
deployed. This document is the round summary: what changed, the rules it follows, the version keys,
every deliberate re-pin, what is still OPEN, and how a game reads the world. The detail lives in the
package documents:

- `docs/terrain-relief-v1.md`: P4, relief model, constants, measurements and deviations.
- `docs/planet-geophysics-v1.md`: P1, gravity, optical depth and pressure.
- `docs/place-query-v1.md`: P2, the place query and the ocean-volume model.
- `docs/lod-ladder-contract-v1.md`: P3, the LOD ladder; section 7.2 covers render-bounds-1 on P4 relief.

## 1. Before and after

| Measure | Before (terrain-1.7.0, surface-7) | After (terrain-1.8.0-relief, surface-8) | Source |
|---|---|---|---|
| Maithea land p50 / p90 / p99 / max | 6514 / 12393 / 16649 / 19500 m | 426 / 2690 / 4358 / 5910 m | terrain-relief-v1 section 4 |
| Maithea land above 4 km / below 500 m | 71.8% / 2.9% | 2.2% / 55.7% | same |
| Maithea snow share | 68.5% | 19.6% (owner band 15-40%) | same |
| Maithea forestPotential share | 7.6% | 38.0% | same |
| Mean ocean depth, Maithea / Selawyn / Raiva / Lethuris | 4775 / 5578 / 5353 / 5928 m | 3305 / 3793 / 3687 / 4011 m | same |
| Dated sea at the catalogue epoch | linear metre ramp (Maithea about -4500 m) | exactly 0; falls afterwards by lost volume | ocean-volume-1 |
| Body height bound (relief max), four fixture worlds | about 19.5 km for every body | 4.0-6.6 km (Maithea 6628, Selawyn 5176, Raiva 4024, Lethuris 6485 m) | INT `render-bounds-evidence.tap` |
| HUD TERRAIN FLIGHT flip / direct-landing boundary | 19.5 km | 19.5 km, now a fixed constant (owner decision) | P6, `planet-renderer.ts` |
| Landing ceiling (0.8 x bound max) | about 15.6 km | 3.2-5.3 km, above p99 land on every world (OPEN, section 4) | lod-ladder-contract 7.2 |
| Harness living site SITE_A | 188.7 m ground, 28.7 m above the 160 m forest gate | 280.2 m ground, ring minimum 255.4 m, ring forest share 1.0, moisture 0.750; moved 11.64 km | P6, `tests/harness-sites.mjs` |
| Harness lowered sea | -4500 / -4475 m (94.5% of the volume lost on the new seabed) | 60% volume lost: Maithea -2425 / -2400 m via `levelForLoss` | P6, `tests/helpers/harness-water.mjs` |
| golden.json terrain / combined | b992f755... / 7642ed53... | b3818c33... / ec37f25c... (other five digests unchanged) | section 3 |

## 2. Rules this round follows

1. **Physics is never retuned to fit a test.** When a fixture no longer fits the new terrain, the fixture
   moves (with a stated rule and a deterministic search) or the test is re-based on the new field.
   Thresholds that were loosened are listed in section 4, never hidden.
2. **The seabed is always real at its true depth.** It is the same deterministic ground function as dry
   land: solid, collidable and queryable at any depth (up to 16 km), with no cut-off. Seabed detail is
   driven by distance to the seabed (`SEABED_DETAIL_POLICY seabed-by-distance-1`), not by water
   thickness. Collision, physics and place queries always sample full detail.
3. **One documented exception: `OCEAN_SURFACE_DETAIL_M = 2000`** (owner decision). From the sea surface,
   the seabed below 2 km of water is drawn as far terrain, and full detail returns as a diver approaches.
   This is reduced seabed *rendering* detail, not missing ground, and it is listed as OPEN (section 4).
4. **The harness site rule (`SITE_RULE` in `tests/harness-sites.mjs`).** The centre must be
   forestPotential, at least 250 m above the dated sea, with effectiveMoisture of at least 0.6.
   ForestPotential must hold on at least 80% of 96 ring samples (radii 0.5, 1 and 2 km, 32 each), and
   every ring sample must be at least 250 m above the sea. The forest gate itself (aboveSea > 160 m in
   `surface-biomes.ts`) is unchanged. If a later terrain change breaks the site, run the search in
   `tests/helpers/harness-site-search.mjs` and record old -> new; do not loosen the rule.
5. **Harness seas state a lost-volume fraction, not metres.** A metre value means something different on
   every seabed. `HARNESS_OCEAN_LOSS = 0.6` is resolved through `levelForLoss(body, f)` and snapped to the
   renderer's 25 m bucket. Dated harnesses use whole orbital years after the catalogue date, which keeps
   the sun direction.
6. **Golden re-pins are deliberate.** Each re-pin is one commit naming old -> new and the reason, after
   Node, Chromium, Firefox and WebKit agree once, at the end.

## 3. Versions (old -> new)

| Key | Old | New | Package |
|---|---|---|---|
| TERRAIN_VERSION | terrain-1.7.0-climate-colour | terrain-1.8.0-relief | P4 |
| SURFACE_VERSION | atlas-surface-7-no-inland-rivers | atlas-surface-8-ocean-volume | P2 |
| BIOME_VERSION | surface-biomes-2-climate | surface-biomes-2.1-sea-datum | P4 |
| SURVEY_VERSION | surface-survey-2 | surface-survey-2.1-relief | P4 |
| CLIMATE_VERSION | surface-climate-1 | surface-climate-1.1-geo-g | P4 |
| LANDFORM_SHAPE_VERSION | (none) | planet-landforms-shape-2 | P4 |
| GEOPHYSICS_VERSION | (none) | planet-geophysics-1 | P1 |
| OCEAN_VOLUME_VERSION | (none) | ocean-volume-1 | P2 |
| PLACE_QUERY_VERSION | (none) | place-query-1 | P2 |
| LOD_LADDER_VERSION | (none) | lod-ladder-1 | P3 |
| Render bounds | (none) | render-bounds-1 | P5 |
| MODEL_MANIFEST_ID | ...BIOME, CLIMATE, HABITAT, SURVEY | the same plus GEOPHYSICS, LANDFORM_SHAPE, OCEAN_VOLUME, LOD_LADDER, PLACE_QUERY | P6 |
| BUILD_VERSION | atlas-client-2026-10-biome-climate-1 | atlas-client-2026-10-relief-1 | P6 |

### Re-pins (old -> new, and why)

| Pin | Old | New | Reason | Commit |
|---|---|---|---|---|
| golden.json terrain | b992f75557f735e9b457b84eaa8f6cf18dfef16c093823c55d4cfac12606580c | b3818c33be40ca9947dc68e26d19ef0f6fbd4fde4e6b22c2eedeb511879578e2 | P4 relief field (deliberate); equals P4's proposal | beb1f68 |
| golden.json combined | 7642ed533cea1d8cc640d60a59f820a39c4f99f978de20efd9f763ca09071a12 | ec37f25ccbedbdf16cbd18c4bae9dc33c24cab6e8fed1163d39d6ee5369fed92 | follows terrain | beb1f68 |
| golden galaxies, sectors, systems, history, hierarchy and all counts | - | unchanged | - | - |
| SITE_A (6 users) | [4068880.8, -1511750.9, 2855601.0] | [4075043.7, -1510938.2, 2845723.8] (search index 55) | the old site fails SITE_RULE on relief terrain (188.7 m) | c465f6a |
| Harness water levels | -4500 / -4475 m | Maithea `loweredSeaLevels` 0.6: -2425 / -2400 m | the old values are 94.5% lost on the new seabed | c465f6a |
| Dated harness dates (rock-acceptance, canopy-water-date-seek, desktop-perf S4) | the catalogue date, at which the old ramp gave about -4500 m | whole Maithea years after it: about 701.5 Myr (-2400 m) and 705.5 Myr (-2425 m); biosphere still complex, surface solid | under surface-8 the sea is 0 at the catalogue date | c465f6a |
| version-compat and inland-rivers-disabled SURFACE pin | atlas-surface-7-no-inland-rivers | atlas-surface-8-ocean-volume | stale since P2 on main (the two failed INT handoff runs) | c465f6a |
| surface.mjs survey export version | 'surface-survey-1' literal | `SURVEY_VERSION` import | stale literal | c465f6a |
| tests/known-failures.json | 2 entries (the two stale surface pins) | [] (moved to `resolved`) | fixed | c465f6a |
| life-cpu-digest / planet-forest-frame-digest / terrain-leaf-loop-digest | REFERENCE e6a0b39 / e6a0b39 / 5ad62a6 and their floors | unchanged; the floors hold at the new site | - | - |

The P4 re-pins (KEPT_PALETTE, classifier golden, ELEVATION_IDENTITY, lod-consistency ceilings,
version-compat biome-climate pins) are listed in `docs/terrain-relief-v1.md` section 5 and the P4 r2
commits.

### Bookmarks

- A bookmark whose stored terrain is older than terrain-1.8.0 gets one notice
  (`RELIEF_RECALIBRATED_NOTICE` in `src/time-nav.ts`): "Terrain relief was recalibrated (terrain-1.8.0):
  mountains, sea depths and snow cover changed. This place is the same location; its height and
  surroundings may differ. Oceans now shrink by volume as the star brightens."
- The river-withdrawal sentence now appears only for bookmarks from before surface-7 or terrain-1.6.
- A ground bookmark (`?walk=`) stores a direction, not a height. `prepareLanding` re-samples the ground
  along that direction on the current terrain, so the eye lands on the new ground. This is pinned in
  `tests/acceptance/version-compat.test.mjs` (a source-level pin, not a browser run).
- **A ground bookmark whose site is now under the sea is NOT kept** (OPEN item 12). It is not walkable, so
  `prepareLanding` falls back to `exploreTerrain()`. That searches for a different walkable site near the
  current view and lands there. This behaviour predates the round, but relief and the surface-8 sea make it
  more common: the catalogue-date sea is now 0 instead of about -4500 m, so old coastal bookmarks can be
  flooded. Astra's P6 review flagged that an earlier P6 comment and test claimed the bookmark "opens in
  flight above it". That claim was false, and both now describe the real fallback. Keeping the saved
  direction and hovering above the water needs an owner decision and a browser check.

## 4. OPEN items (none of these is passed)

| # | Item | State | Where |
|---|---|---|---|
| 1 | LOD-consistency exception: Lethuris L6 `name` ceiling loosened 6.9 -> 7.0% (measured 6.99%) | OPEN, owner | terrain-relief-v1 section 8 |
| 2 | Reduced seabed rendering detail below 2 km of water (`OCEAN_SURFACE_DETAIL_M = 2000`) | accepted exception, OPEN | lod-ladder-contract |
| 3 | Strict post-relief LOD class/colour targets not reached | OPEN | terrain-relief-v1 section 8 |
| 4 | Weak range snow: the data says snow, the render reads pale grey | OPEN | terrain-relief-v1 section 13 |
| 5 | Horizon presentation on Raiva, Selawyn and Lethuris (flattened, never re-posed sun-aware) | OPEN | terrain-relief-v1 section 13 |
| 6 | Landing no-summit: the ceiling formula is kept but sits above p99 land; summit picks at the datum sea: Maithea 2, Selawyn 6, Raiva 6, Lethuris 2 of 256 | `todo` tests, NOT passing | lod-ladder-contract 7.2 |
| 7 | Clouds: the cloud-deck part of P5 plan (E) | deferred | P5 commit 8241fcb |
| 8 | Quiet-host performance: INT perf was measured on a contended machine only | not measured | lod-ladder-contract 7.2 |
| 9 | Luna presentation FAILs (section 7) | OPEN | INT sheets |
| 10 | The fell-colour test uses synthetic columns | OPEN | terrain-relief-v1 section 6 |
| 11 | P6 browser harnesses not run after the re-pin (section 6) | NOT RUN | this document |
| 12 | A flooded ground bookmark lands at a different site (section 3, Bookmarks) | OPEN, owner | `main.ts` prepareLanding |
| 13 | desktop-perf S4 does not assert the browser's date and water bucket after each seek (it checks only backlog and stale counts); rock-acceptance does | should-fix, deferred (browser) | Astra P6 review |

## 5. How a game queries the world

The world is data. A game asks **what is here, at this date** and applies its own rules
(`docs/place-query-v1.md`, module `src/place-query.ts`):

```ts
import {placeAt, depthAndPressureAt} from './place-query.ts';

const ctx = {sys, body, t};                // star system, body, BigInt ns on the world-time axis
const here = placeAt(ctx, direction, 'S3'); // level: 'S0'..'S4' or a tile level 0..22
if (here.exists) {
  here.groundHeightM;      // solid ground; under water this is the real seabed
  here.seaLevelM;          // dated sea (null when there is no global ocean)
  here.oceanLossFraction;  // 0 = full catalogue-epoch ocean
  here.waterDepthM;        // sea - ground (0 on land)
  here.pressureAtSeabedPa; // P_surface + rho g depth
  here.biome; here.climate; here.gravityMS2; here.hasAir; here.airClass;
  here.versions;           // store this with any saved or hashed place data
}
const dive = depthAndPressureAt(ctx, direction, 1200); // any depth down to the seabed, clamped
```

- `direction` is a unit body-frame direction (spin axis +Y). Every answer is a pure function of the body
  seed, date, direction, level and the version keys, so it is safe for a deterministic shared simulation.
- place-query-1 answers every level at full resolution and echoes the level (`resolution: 'full'`).
- Survivability, damage, diving limits, breathability and building rights are game-layer rules, not
  platform data.
- A game that needs a lowered sea for a scenario should state a lost-volume fraction and resolve it
  with `levelForLoss(body, f)` (`src/ocean-volume.ts`), as the harnesses do, never a metre value.

## 6. Evidence and checks

All evidence is under `C:/LLM/IWSDK/universe-atlas/test-results/finish-round-2026-10-04/`.

**P6-HARNESS-REPIN/** (this package, branch `relief-round/INT`, commits c465f6a, be2618c, beb1f68, c5527ac):

| Check | Result | File |
|---|---|---|
| ocean-seam-continuity, terrain-budget-starvation, forest-water-validity at the OLD levels (baseline) | exit 0 | baseline-water-tests.tap |
| ocean-seam-continuity, terrain-budget-starvation, terrain-leaf-loop-digest at the NEW levels | exit 0, 5/5 | water-tests-after.tap |
| version-compat + harness-sites | exit 0, 26/26 | version-compat.tap |
| render-bounds (fast) incl. the fixed 19.5 km HUD pin | exit 0, 11 pass, 2 todo (OPEN item 6) | render-bounds.tap |
| life-cpu-digest, planet-forest-frame-digest, inland-rivers-disabled | exit 0, 12/12 | digests.tap |
| `npx tsc --noEmit` | exit 0 | tsc.log |
| golden Node run | terrain and combined as section 3; other digests unchanged | golden-node-run.json |
| golden cross-engine `--update` under the GPU lock | exit 0; Node, Chromium, Firefox, WebKit MATCH | golden-cross-engine.log, .exit.txt |
| golden perturbation.test | exit 0, 2/2 | golden-node-test.tap |
| dated lowered-sea pair in Node (the preamble the three browser harnesses build) | exit 0; -2425 / -2400 m exactly, catalogue-date sea 0 | dated-sea-check.mjs, .log |
| harness-sites + version-compat after the Astra fixes | exit 0, 26/26 | version-compat-2.tap |
| `npx tsc --noEmit` after the Astra fixes | exit 0 | tsc-2.log |
| Astra read-only review of c465f6a | see section 8 | astra/ |

**Not run in P6:** the browser harnesses whose fixtures moved (rock-acceptance, canopy-water-date-seek,
desktop-perf, render-probe, surface.mjs), walking and VR suites, the full `npm test` (the merger's job),
quiet-host performance, and headset checks. No new Luna images were taken in P6, because P6 makes no
visual change.

**INT/** (the integration of P4 and P5): `render-bounds-evidence.tap` (exit 0), `handoff-tests.tap`
(exit 1: 104 tests, 101 pass, 1 fail at `inland-rivers-disabled.test.mjs:236`, 2 todo) and
`handoff-tests-p4files.tap` (exit 1: 86 tests, 85 pass, 1 fail at `version-compat.test.mjs:79`). Both
failures were the stale surface-7 pins fixed in P6. Sheets are in `INT/sheets/` and Luna answers in
`INT/sheets/luna/`.

**Package evidence:** `test-results/relief-round-2026-10-03/P4-RELIEF/` (views, Luna verdicts r1-r3) and
the P5 directories under `finish-round-2026-10-04/`.

## 7. Luna verdicts

Luna is a local vision model. Its verdicts are advisory and do not decide pass or fail.

- **INT sheets (four worlds: orbit, horizon, ground, seabed; 3 asks each, 48 answers, all exits 0).**
  - No holes, cracks, seams or floating tiles were reported on any world.
  - The seabed reads as solid ground on all four worlds.
  - The presentation FAILs are OPEN (item 9):
    - Orbit colours are "mottled and patchy", with sharp, blotchy boundaries. Raiva's white patches are
      "unusually dominant" and Lethuris looks "confused".
    - Horizons are "low, hazy", "soft and washed out" ridges rather than readable ranges, on Maithea,
      Raiva and Lethuris. Selawyn reads best ("layered mountain silhouettes").
    - Ground detail is weak or repetitive on Maithea and Lethuris.
    - The seabed is "smooth and featureless", and Maithea's does "not clearly read as underwater".
- **P4 (r1/r2):** "AFTER partly meets the target" on Maithea and the other worlds. Luna names the
  Lethuris orbit maze, the flattened horizons and weak snow on the Maithea range (OPEN items 4 and 5).
- **P6:** no visual change was made, so there is no Luna verdict.

## 8. Reviews

- **Astra, INT review (fix-required).** Three blockers, all addressed in P6:
  1. The HUD 19.5 km flip was not preserved. Fixed by the constant `LOW_FLIGHT_CLEARANCE_M`, pinned in a
     test.
  2. The integration docs omitted the two exit=1 handoff runs. They are now recorded in lod-ladder-contract
     7.2 and in this document.
  3. lod-ladder-contract 7.2 mixed measurements with assertions. The enforced thresholds are now
     separated from the measured values, the landing ceiling is given per world (Raiva 3.219 km), and
     the dated-sea coverage is stated as Maithea and Lethuris only.
- **Astra, P6 review of c465f6a** (`P6-HARNESS-REPIN/astra/review-1-answer.md`, read-only; Astra ran
  harness-sites 4/4 itself). It confirmed on inspection that all six SITE_A users take the shared site,
  that the dates are whole-year offsets, that the shore opens at the low-water date, that the
  manifest/notice guards are correct, and that the 19.5 km constant reaches both the HUD and the landing
  routing. Findings and what was done:
  1. Blocker: the flooded-bookmark claim was false. The comment and test were corrected, and the gap is
     recorded as OPEN item 12. `main.ts` behaviour was not changed.
  2. `datedLoweredSea` promised exact levels without checking them. It now returns null on a skipped
     bucket.
  3. desktop-perf S4 browser-side date/bucket checks: deferred, OPEN item 13.
  4. The search-reproduction tolerance (1 m) was weaker than its "0.1 m rounding" title. It now compares
     the rounded coordinates and allows at most sqrt(3) x 0.05 m.
