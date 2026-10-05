# Mountains step G: the 800 m colour grain, alone (terrain-1.8.1-grain, 2026-10-05)

Owner decision (b), 2026-10-05, recorded verbatim in `docs/mountains-design-2026-10-04.md`:

> the 800 m colour grain is changed in its own small step with TERRAIN_VERSION bump + deliberate
> golden re-pin + update of the two colour tests that hard-code the old .88/.24 grain (old/new
> digests documented).

Step G lands that change on its own, before any mountain belt is wired (decision (d): assembly in
two steps). The grain constants are the ones measured on the blocked `mountains/assembly-1` branch
(`6d48c45`); no belt code (M1 layout, M2 envelope) is taken from it.

## The change

`src/terrain.ts`, water-world LAND colour only (the climate colour path of `terrainSampler`):

| | localGrain | range | mean |
|---|---|---|---|
| terrain-1.8.0-relief | `.88 + n(d, R/800, 74) x .24` | +-12% | 1 |
| terrain-1.8.1-grain | `TERRAIN_LOCAL_GRAIN.BASE + n x AMPLITUDE` = `.952 + n x .096` | +-4.8% | 1 |

- `k = .4` of the old amplitude (`AMPLITUDE = .4 x .24 = .096`, `BASE = 1 - AMPLITUDE/2`). The
  800 m cell (`CELL_M`) and the noise `n(d, R/800, 74)` are unchanged, so the fine-level pattern
  keeps its position and scale; only its contrast drops.
- Why `k = .4`: on assembly-1 the grain sweep (k = 0, .25, .4, .5, .75, 1) measured the grain at
  about half of the L6/L8 cross-level RGB p99 (Maithea L6 26.26 -> 13.22 with no grain); .4 is the
  largest k at which the grain's quadrature share stays at or below the grain-free error on every
  pinned RGB row (Maithea L6, Lethuris L6 and L8).
- The base core now also returns the raw noise (`CoreSample.localGrainNoise`, 0 where the core saw
  ocean), so the climate path re-weights the same noise without a second noise call. Where the
  core saw ocean but the post-landform height is land, the noise is evaluated as before.
- Unchanged, bit for bit: heights, `groundHeightM`, the ocean flag (so every class), dry/ice/
  volcanic/gas-giant colours, ocean colours, the `legacyWaterLandColour` fallback, and
  `baseTerrainSampler` (all keep `.88/.24`).
- `TERRAIN_VERSION` `terrain-1.8.0-relief` -> `terrain-1.8.1-grain` (a patch number: colour only;
  `terrain-1.9.0` stays reserved for the belt assembly). `time-nav`'s `terrainPredates(v, 1, 8)`
  parses it as 1.8, so a 1.8.0 bookmark gets the generic "older terrain" notice and no relief notice.
  `BUILD_VERSION` is unchanged: no shader or presentation code moves.

Tests changed:

- `tests/terrain-climate-colour.test.mjs` and `tests/acceptance/climate-agreement.test.mjs`: their
  independent grain copy is now `.952 + n x .096` (was `.88 + n x .24`), still written out (not
  imported) so a drifted shared helper is caught; both still assert bit-exact colour on 20k land
  directions x 4 water worlds.
- Version string only: `tests/acceptance/version-compat.test.mjs`, `tests/inland-rivers-disabled.test.mjs`,
  `tests/river-terrain.test.mjs`, `tests/terrain-relief-hypsometry.test.mjs`, `tests/terrain-climate-colour.test.mjs`.

## Evidence (all under `test-results/mountains/step-g/`, untracked)

### LOD cells (CONTRACT): 96 of 96 pass, 17 of 17 pins pass, nothing loosened

`lod-cells.mjs` (copied from assembly-1) computes every cross-level cell of
`tests/lod-consistency.test.mjs` (Maithea and Lethuris x L6..L14 x 9 rows) plus the 6 retention
rows, with the SHIPPED_CEILINGS limits read from the test file itself. Main (`e636b5a`) and step G
both: 96 cells, 17 pins, 0 failures. Only 10 cells move, all RGB p99 rows, all down:

| Cell | main (1.8.0) | step G (1.8.1) | limit |
|---|---|---|---|
| Maithea L6 rgbP99 (pin) | 26.257 | 15.183 | 26.3 |
| Maithea L8 rgbP99 | 3.547 | 2.258 | 4 |
| Maithea L10 / L12 / L14 rgbP99 | 0.474 / 0.031 / 0.003 | 0.449 / 0.020 / 0.002 | 1 |
| Lethuris L6 rgbP99 (pin) | 39.170 | 20.540 | 39.2 |
| Lethuris L8 rgbP99 (pin) | 11.051 | 5.244 | 11.1 |
| Lethuris L10 / L12 / L14 rgbP99 | 0.920 / 0.066 / 0.020 | 0.433 / 0.028 / 0.008 | 1 |

Every height, ocean, snow, forest, name and carriedName cell and every retention row is unchanged
(identical values), as expected from a colour-only change. The step G numbers equal the
grain-only variant measured on assembly-1 (`lod-cells-grainonly.log`) cell for cell.
Logs: `lod-cells-main.log`, `lod-cells-grain.log` (+ `.json`).

### Identity (HARD, evidence script `identity-grain.mjs`)

terrainSampler, main vs step G, 4096 Fibonacci directions on each of the 4 water worlds (Maithea,
Selawyn, Raiva, Lethuris) and the 6 golden terrain bodies (Volcanic, Rocky, 2 Ice, 2 more Oceanic):
0 differences in `elevationM`, `groundHeightM` and `ocean` on every body; colour differs only on
water-world land (every land sample there, max |new/old - 1| 7.5-8.0%); 0 colour differences on
the dry, ice and volcanic bodies and on every ocean sample. Log: `identity-grain.log`.

### Golden re-pin (HARD; one deliberate re-pin, decision (b))

`node tests/golden/run-cross-engine.mjs --update` (machine-wide browser lock, exit 0): Node,
Chromium 149 and Firefox 151 equal on every digest; WebKit 26.5 differs only on the recorded
`faunaKnownUnstable` open finding (unchanged by this step). Old -> new:

| Digest | terrain-1.8.0-relief | terrain-1.8.1-grain | Cause |
|---|---|---|---|
| terrain | `b3818c33be40ca9947dc68e26d19ef0f6fbd4fde4e6b22c2eedeb511879578e2` | `1363e73fc158559e71febd81c54c920b1df6aba354fa0f38c0f32c9c70ee6a2b` | water-land colour |
| combined | `ec37f25ccbedbdf16cbd18c4bae9dc33c24cab6e8fed1163d39d6ee5369fed92` | `c2b6e424e382091d10da6402452c366cea396cf0ca24b760505efccbb9b3dda5` | contains terrain |
| placeQuery | `0ee0946d8ec2abc780589f4ba34e2e7fe9273e28664e508d0ea3650ba70da831` | `675746e64b1cde0be648a5c503d126662b955f15d30ebd6382031d89b74a5dda` | version string only |
| census | `c681362d7289dcee12c9dec76fcbe756615c58503faa79d923de085029992892` | `02ede0a8e69348e136dfb497d2ee1d364d2f4cf08b4fca632ea0ea428122fb1e` | version string only |

"Version string only" was measured: the step G source with `TERRAIN_VERSION` set back to
`terrain-1.8.0-relief` (scratch copy) reproduces the old placeQuery and census digests exactly and
moves only terrain and combined (`placeAt` reports `versions.terrain`; the forest census context
hashes `TERRAIN_VERSION`). All other 12 digests and every count are unchanged.
`tests/golden/perturbation.test.mjs`: 5/5 pass on the new fixture. Logs: `golden-update.log`,
`golden-report.json`.

### Fine-level look (VISUAL-ADVISORY, UNCALIBRATED: not citable)

`render-fine.mjs`: nadir CPU renders of terrainSampler colour x a Lambert hillshade, 640 x 640 px at
16 m/px (10.24 km, about 13 grain cells), on one lowland and one forest site of Maithea and
Lethuris, BEFORE (main) and AFTER (step G), same sites and renderer (`fine/`). Two questions
(`q-mottle.txt`, `q-variation.txt`), `scripts/luna-vote.mjs`, 3 asks per image plus diagnosis.
No control set exists for these questions, so every result is NOT-CHECKED / UNCALIBRATED and none
counts.

| Image | "free of artificial mottle?" | "still shows natural variation?" |
|---|---|---|
| Maithea lowland before / after | FAIL 0/3 / **PASS 2/3** | FAIL 1/3 / FAIL 0/3 (1 unclear) |
| Maithea forest before / after | FAIL 1/3 / **PASS 3/3** | FAIL 1/3 / FAIL 0/3 |
| Lethuris lowland before / after | FAIL 0/3 / FAIL 1/3 | FAIL 0/3 / FAIL 0/3 |
| Lethuris forest before / after | FAIL 0/3 / FAIL 1/3 | FAIL 1/3 / FAIL 0/3 |
| pass asks, before -> after | 1/12 -> 7/12 | 3/12 -> 0/12 |

Diagnoses: every non-pass names the element `texture/colour`. Before: "large soft light and dark
patches form an artificial-looking cloud-like mottle". After (variation): "nearly uniform olive
green with only faint broad shading". Reading: the reduced grain removes most of the 800 m mottle
Luna objected to (and the axis-aligned blocks visible on the near-polar Lethuris sites), and the
ground then reads flatter. The flat look was already there before (the variation question failed
every BEFORE image too); it is a missing fine colour-detail element, not a regression the pins
measure. Routed to the owner as an observation, not a blocker.

### Other checks

- `npx tsc --noEmit`: exit 0.
- `npm run test:pkg -- tests/terrain-climate-colour.test.mjs tests/acceptance/climate-agreement.test.mjs`:
  8/8 pass, exit 0.
- `npm run test:affected -- --base main` (73 files: every direct and transitive importer of
  `terrain.ts`, including `lod-consistency`, `terrain-elevation-identity`, `harness-sites`,
  `render-bounds`, `landing-site`, `eco-identity-site`): 576 tests, 574 pass, 0 fail, 2 TODO (the
  known SITE_A 60 km ring and rocky Spearman TODOs), exit 0. Log: `affected.log`.
- Astra (gpt-6-astra, read-only): APPROVE WITH NITS. No correctness findings (grain scope,
  ocean-to-land branch, legacy bits and float order correct; no renderer/worker copy of the grain;
  version consumers and `terrainPredates` handle the bump). Its one nit (this document was still a
  placeholder during the review) is resolved here. `astra-review.md`.
- Not run: `npm run test:full` and `test:perf` (the plan runs test:full once, at the last merge of
  the mountains sequence), browser/VR gates, an app-path capture.

## What step G does not do

No mountain belt, no M2/M3/M4 wiring, no LOD ladder change, no `SHIPPED_CEILINGS` change, no
classifier change. Decisions (e)-(g) are for the assembly steps; their LOD cells will be measured
against the step G field (the RGB pins now have 11.1 / 18.7 / 5.9 of headroom; the class pins'
headroom is unchanged at 0.009-0.075).
