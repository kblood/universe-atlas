# ECO-CLASS-1: absolute eco classes, fauna roles and lab biomes

Status: implemented on branch `round2/biome2-eco` (backlog task 6, BIOME2-ECO).
Versions: `eco-class-1` (`src/eco-class.ts`) and `eco-assemblages-1`
(`src/eco-assemblages.ts`). `BIOME_ECOLOGY_VERSION` remains `biome-ecology-2`:
the lab biomes were appended, and the 9 original digests are pinned in
`tests/biome-ecology.test.mjs`.

**Source flags.** Each threshold is marked either *verified (source)* or *from
memory*. A *from memory* value is a standard textbook figure that was **not**
re-checked against the primary source in this session. Before anyone treats
it as authoritative, it needs a citation pass.

## 1. Inputs

`ecoClassOf` works on the climate v1 sample:

- annual mean temperature `Ta`;
- warmest-month temperature `Tw`, lapse-corrected to the sample height as `TwP`;
- coldest-month temperature, derived as `Tc = 2·Ta − TwP`;
- effective moisture `M` in 0..1;
- snow cover;
- height above sea level;
- the coastal-sand weight;
- `living`, which is false for bodies without life.

The function uses arithmetic only: no `Math` transcendentals and no allocation.
The adapter `ecoClassOfBiomeSample` returns `-1` for ocean.

## 2. Class table and rule order

The rules are tested in order and the first match wins.

| # | Class | Rule | Basis | Flag |
|---|---|---|---|---|
| 13 | lifeless | `!living` | design | n/a |
| 12 | sterile hot | Ta ≥ 320 K or TwP ≥ 335 K | design heat cap (GEOPHYSICS follow-up) | design |
| 0 | nival / ice | snow > 0.6 or TwP < 273.15 K | Köppen EF (warmest month < 0 °C) | from memory |
| 1 / 2 | tundra / alpine | TwP < 283.15 K. The class is alpine when the sea-level warmest month is ≥ 10 °C, meaning the cold comes from height. | Köppen ET; the treeline near a 10 °C warmest month (Körner & Paulsen 2004 give a growing-season mean of about 6.4 °C) | from memory |
| 11 | coast | h < 120 m and sand > 0.5 | uses the classifier's own coastal-sand gate | design |
| 9 / 10 | hot / cold desert | M < 0.30. The desert is hot when Ta ≥ 18 °C. | Köppen B; the BWh/BWk split at Ta 18 °C | from memory |
| 7 / 8 | tropical wet / savanna | Tc ≥ 18 °C. The class is wet when M ≥ 0.62. | Köppen A (coldest month ≥ 18 °C) | from memory |
| 3 | boreal | Tc < −3 °C, TwP < 22 °C and M ≥ 0.44 | Köppen D (coldest month < −3 °C), excluding the hot-summer Dfa | from memory |
| 6 / 4 | humid subtropical / temperate forest | M ≥ 0.5. The class is 6 when Ta ≥ 290 K and Tc ≥ 283 K. | Köppen Cfa-like, with no upper Ta bound so that rank stays monotone | from memory / design |
| 5 | temperate grassland / steppe | everything else | Whittaker | design |

Every threshold lives in the frozen `ECO_CLASS_CALIBRATION`, and its sha256 is
pinned at `550c3322…f8ce1c`. Changing any value forces an `ECO_CLASS_VERSION`
bump.

**Monotone ranks.** `ECO_THERMAL_RANK` and `ECO_MOISTURE_RANK` order the
classes. The tests sweep temperature and moisture and assert that warming a
sample never lowers its thermal rank, and adding moisture never lowers its
moisture rank. Coast, sterile and lifeless classes carry rank −1 and are
excluded from the sweeps. The subtropical box has no upper annual bound for
this reason: an upper bound would let a warmer sample fall back to class 4.

## 3. Ground look

`groundLookOf` writes four 0..1 channels into a caller buffer: peat, leaf litter,
arid crust and red soil, with scree added on slopes. Every channel is a product
of linear ramps. The widths are chosen so that a 0.01 K step, or a 0.001
moisture step, moves any channel by at most 0.02; the test checks this.

The red-soil ramp starts **at** the Köppen A threshold (Tc 291.15 K) and reaches
full strength at 295.15 K. As a result, no non-tropical sample gets red soil.
This keeps the live harness site SITE_A (Tc 290.60 K) at an all-zero ground
look, so the legacy fragment path is reproduced there.

## 4. Productivity (NPP)

`ECO_NPP_REL` holds Whittaker & Likens (1975) mean net primary productivity by
ecosystem, divided by the tropical rain forest value of 2200 g/m²/yr. Examples:

| Ecosystem | Absolute (g/m²/yr) | Relative |
|---|---|---|
| tropical rain forest | 2200 | 1.0 |
| boreal forest | 800 | 0.36 |
| savanna | 900 | 0.41 |
| tundra / alpine | 140 | 0.064 |
| desert scrub | 90 | 0.04 |

Flag: **from memory**.

`life01Of` multiplies NPP by a heat fade (TwP 313 to 325 K) and a nival cold
fade (Ta 243 to 263 K). Both fades are design values.

## 5. Fauna roles and lab biomes

The fauna roles are in `src/eco-assemblages.ts`. They use only the four
rendered archetypes: browser, runner, low-slung and long-neck. Every class 0-11
has at least one role and non-zero flora weight, and a negative test shows that
removing either one fails.

The 7 new Biome Lab biomes each illustrate one class that had no lab biome
before. `BIOME_ECO_LINKS` maps every lab fauna entry, index for index, to a
planet role id.

| Class | Lab biome | Planet roles (archetype) |
|---|---|---|
| 0 nival | ice-margin (new) | musk-ox (browser), ice-bear (low-slung) |
| 1 tundra | tundra (new) | reindeer and musk-ox (browser), arctic fox (runner), wolf (low-slung) |
| 2 alpine | alpine, alpine-meadow (new) | ibex (browser), chamois (runner), snow leopard (low-slung) |
| 3 boreal | boreal-taiga (new) | moose (browser), lynx (runner), bear (low-slung) |
| 4 temperate forest | woodland, conifer, wetland | deer (browser), fox (runner), boar (low-slung) |
| 5 steppe | grassland | bison (browser), pronghorn (runner), badger (low-slung) |
| 6 humid subtropical | woodland, wetland | deer (browser), coyote (runner), marsh tapir (low-slung) |
| 7 tropical wet | rainforest (new) | duiker (browser), forest cat (runner), forest elephant (low-slung) |
| 8 savanna | savanna (new) | giraffe (long-neck), antelope (runner), zebra (browser), elephant (low-slung) |
| 9 hot desert | hot-desert (new) | camel (browser), oryx and fennec (runner) |
| 10 cold desert | dry-scrub | saiga (browser), corsac (runner), marmot (low-slung) |
| 11 coast | coast | coastal browser, shore scavenger (runner), dune burrower and seal haul-out (low-slung) |
| 12 / 13 | volcanic, regolith | none (lifeless) |

The new recipes are listed below. All of them keep `maxSizeM × footprint
factor ≤ 4 m`, the `MAX_FOOTPRINT_M` competition halo; a test checks this.

- dwarf birch and dwarf willow;
- sedge tussock;
- lichen rock;
- cushion plant;
- umbrella acacia;
- tall grass;
- buttress broadleaf;
- columnar succulent;
- flowering herb;
- moss mat;
- taiga spruce;
- termite mound;
- understory palm;
- thorn scrub.

The lab renders the new forms through an exact-name dispatch in
`src/eco-lab-forms.ts`, so the 9 original biomes keep their geometry.

**Footprint contract.** Each new vegetation form is normalised to unit height
and unit crown radius. The lab scales its width by `recipeFootprintM`, so the
rendered crown radius equals the queryable footprint that coverage uses. When an
authored form is wider or narrower than its kind's default, the recipe stores
that ratio as data in `visibleRadiusScale`:

| Recipe | `visibleRadiusScale` |
|---|---|
| umbrella acacia | 2 |
| buttress broadleaf | 1.2 |
| understory palm | 1.17 |
| thorn scrub | 1.05 |
| sedge tussock | 0.94 |
| tall grass | 0.88 |
| flowering herb | 0.69 |
| moss mat | 0.56 |
| taiga spruce | 0.5 |

Coverage and the lab read this field. Competition (`footprintM`) ignores it, so
placements and digests are unchanged. `tests/eco-lab-forms.test.mjs` fails if
any of these forms renders more than 1 % away from its footprint, and includes
a negative test on the raw geometry from before the fix: acacia at 2x and
spruce at 0.5x. The lab also reports a mismatch as a geometry-validation
failure.

With honest crowns, taiga canopy is 0.058 against 0.098 for woodland. The
structure test now checks taiga's stem count (118 against 96) rather than
claiming a denser canopy than woodland.

Ground accents (`groundAccent`) are painted only by the lab and never enter a
digest. They cover meltwater ponds, scree, red soil, dune ripples and snow
gravel.

## 6. Finding: the SITE_A rings after relief (OPEN, owner / BIOME2-REPLAN)

Measured on 2026-10-04 with terrain-1.8.0-relief and surface-climate-1.1:

| Location | Class mix |
|---|---|
| SITE_A centre | class 6: Ta 294.91 K, Tw 299.22 K, Tc 290.60 K, M 0.75 |
| SITE_RULE rings (500, 1000, 2000 m × 32) | all classes 4/5/6 (pass) |
| 5 km and 10 km rings (× 64) | all classes 4/5/6 (pass) |
| 20 km ring | {6: 59, 7: 5} |
| 60 km ring (× 64) | {6: 25, 7: 18, 11: 6, ocean: 15}, which fails |

- **Tropical margin.** SITE_A sits only **0.55 K** below the tropical boundary
  (Tc 291.15 K). A climate change of that size, for example climate v2
  (backlog task 9), would flip the site to class 7. The test prints this margin
  on every run.
- **60 km ring.** The biome2 plan's 60 km ring was measured before relief. After
  relief, SITE_A moved 11.6 km and the coast lies inside 60 km. The test is kept
  as a `todo`, and physics was **not** retuned to make it pass. Re-baselining
  the ring radius, or moving the site with `tests/harness-sites.mjs`, is an
  owner decision.

## 7. Cost

The cost was measured on a contended host (about 68 % CPU from other agents),
best of 5:

| Function | Cost |
|---|---|
| `ecoClassOf` | 3.4 ns |
| `life01Of` | 7.4 ns |
| `groundLookOf` | 6.0 ns |
| combined, harness included | 26.2 ns |

There are two separate tests:

- **Regression guard.** It allows up to 100 ns and runs on every host. Its
  title says that it is not the 25 ns criterion.
- **Acceptance test.** It requires 25 ns or less and is reported as
  **skipped** (OPEN) unless `ECO_PERF_STRICT=1` is set on a quiet host.

A relaxed run therefore never reports the 25 ns criterion as passed. The
quiet-host measurement is still OPEN.

## 8. Visual check (Luna blind ID)

Luna (gpt-6-luna) was shown two blind contact sheets, oblique and ground views,
with the letters shuffled for each iteration. It was asked 3 times per
iteration, and every ask exited 0.

| Iteration | Correct | Weakest pair | Confidence for the weakest pair |
|---|---|---|---|
| Design 1 | 7/7 in each of 3 asks | tundra vs alpine meadow | 55-72 % |
| Design 2 | 7/7 in each of 3 asks | tundra vs alpine meadow | 48-74 % |
| Footprint fix (after-4) | 7/7 in each of 3 asks | tundra vs alpine meadow | 55-69 % |

All other biomes scored 65-99 %.

**Footprint fix (after-4).** The placements are identical to design 2, and the
pixel RMSE against it is 0.1-4.0 %. Luna was asked about tree crowns directly:

- The taiga spires and savanna umbrella crowns fit their biomes (3/3 asks).
- The rainforest buttress crowns look too wide and heavy for their thin trunks
  (3/3 asks).

The rainforest crown is the authored look, kept by `visibleRadiusScale 1.2`.
This round did not change it, and it remains an open design note.

The cue Luna still asks for is relief: mountains for the alpine meadow, and
snow patches for the tundra. A flat 128 m lab plot cannot show either. The
verdicts and raw answers are in
`test-results/round2-2026-10-04/biome2-eco/luna-verdicts.json` and
`blind-*/luna-run*.txt`.
