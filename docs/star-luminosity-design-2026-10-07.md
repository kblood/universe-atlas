# STAR-LUMINOSITY: dated stellar brightening in the climate (design only)

Backlog task 22 (`C:/LLM/IWSDK/docs/atlas-backlog-2026-10-04.md` §22, issue
`docs/github/ISSUES/T22-STAR-LUMINOSITY-DESIGN.md`). This is a design. No source,
test or script was changed or run to write it. Implementation follows task 9
(BIOME2-CLIMATE). The backlog names the file
`docs/star-luminosity-climate-design-2026-10.md`; the coordinator assigned this
path instead.

Source flags: **verified (X)** means I read it in this repository at X.
**From memory** means literature I did not re-check (no web access in this lane).
**Estimate** means hand arithmetic, not a measurement.

## 0. Summary of decisions

1. **Normalise to the catalogue epoch.** The dated anchor is
   `T_cat x (L(t)/L(t_epoch))^(1/4)`. At the catalogue epoch the ratio is exactly 1,
   so present-day climate, every digest and every epoch bookmark stay
   byte-identical. The static "absolute luminosity" correction (the 83 % case) is a
   separate owner option and is not recommended.
2. **One brightening law.** The climate reuses the `mainSequenceBrightening` law that
   already drives ocean loss, so the climate and the sea level warm from one L(t).
3. **Integer epoch key.** The integer epoch key is the contract's phase-fraction
   bucket (`k`, 1/4096 of the main sequence). It maps to a quantised anchor offset
   `n` in steps of 1/8 K. Every cache keys on `n`. The anchor is `T_cat + n/8`,
   which is exact in binary floating point.
4. **Warming is visible to species.** `climateCode` and niche rebasing keep the
   catalogue anchor as their reference. A warmed world therefore shifts its codes
   and its species, instead of re-centring invisibly.
5. **The hard band gate stays catalogue-static.** `temperateHabitat` does not move
   with t. The climate physics decides whether forests survive warming: snow,
   treeline, and task 9's heat cap `Tw' >= 316 K`. There is no on/off switch.

## 1. What exists today

| Fact | Where | Flag |
|---|---|---|
| Planet catalogue temperature is `round(278/sqrt(a_AU))`, with no stellar luminosity term. Every star is treated as 1 L_sun. | `src/catalog.ts:847` | verified |
| Moons copy their parent's temperature. | `src/catalog.ts:884` | verified |
| Star radius is `6.957e8 x M^0.8` and temperature is `5772 x sqrt(M)`, so the catalogue-implied luminosity is `R^2 T^4 = M^3.6`. | `src/catalog.ts:778,781` (the exponent is my derivation) | verified / derivation |
| Star mass is uniform on [0.18, 1.63] M_sun. | `src/catalog.ts:760` | verified |
| The climate anchor is `opts.anchorTempK ?? body.temperatureK`. It does not take t. | `src/surface-climate.ts:250-251` | verified |
| The forcing cache key is `seed, kind, anchorTempK, water, type, massKg, radiusM`, in a 64-entry FIFO. | `src/surface-climate.ts:240-271` (key at :255) | verified |
| The header comment already anticipates "a dated or luminosity-corrected temperature later". | `src/surface-climate.ts:246-247` | verified |
| The anchor enters the per-sample path as `annual = anchor + K_LAT_K(q-1) - lapse*max(0,h)`. | `src/surface-climate.ts:284,297` | verified |
| `climateCode` is relative to the anchor: `tBin = floor((annual - anchor + 32)/2)`. | `src/surface-climate.ts:309` | verified |
| The habitat gate reads `body.temperatureK` in the band 250-325 K. | `src/surface-climate.ts:130-131`; `src/planet-tiles.ts:89`; `src/surface-biomes.ts:100` | verified |
| `starStateAt().luminosityRel` is exactly 1 for the whole main sequence. It carries no brightening. | `src/stellar-evolution.ts:117` | verified |
| A brightening law already exists, private, for ocean loss: `B(x) = 1.4/(1.4 - 0.875x)`, where x is the fractional main-sequence age. It is normalised to the catalogue epoch. | `src/stellar-evolution.ts:227-250,274-277` | verified |
| The main-sequence length is `1e10 x M^-2.5` years. The epoch age fraction is 0.15-0.65 for stars whose main sequence is shorter than 13.7 Gyr. | `src/stellar-evolution.ts:69-76` | verified |
| A dated "estimated temperature" `T_cat x luminosityRel^0.25` (`Math.pow`) gates oceans and the biosphere at 235-330 K. On the main sequence it equals `T_cat`. | `src/world-surface.ts:95-112` | verified |
| The giant-stage luminosity is `1 + 400*frac`. The remnant luminosity uses `Math.exp` and `Math.log1p`, which are not deterministic across engines. | `src/stellar-evolution.ts:118-138` | verified |
| `place-query` hosts every planet on `sys.stars[0]`. | `src/place-query.ts:126-128` | verified |
| The renderer quantises sea level to a 25 m bucket and marks tiles stale lazily. | `src/planet-renderer.ts:375-376,1194-1202` | verified |
| The contract's cache rule for a star stage is the phase fraction `floor(4096 (t - stageStart)/stageDuration)`. | `docs/time-and-coordinates-contract.md` §1.3 (lines 208-226) | verified |
| Purity rules: seek independence is §1.2 rule 2. Discrete decisions must use the det path (§1.2 rule 3). | contract lines 94-122 | verified |
| "About 83 % of forest-eligible water worlds leave 250-325 K" refers to the static `T x L^0.25` correction. It is not about brightening, and the computation method is not recorded. | `docs/biome-climate-increment-1-plan-2026-10-02.json:271,328`; `docs/surface-climate-v1.md` §5c | verified (the claim is quoted, not reproduced) |

## 2. Anchor-temperature formula

Physics (from memory, the standard radiative balance):
`T_eq = [ L (1 - A) / (16 pi sigma a^2) ]^(1/4)`. With L = L_sun, A = 0 and
a = 1 AU this gives about 278.6 K, which is the catalogue's `278/sqrt(a)`. The
catalogue therefore assumes L = 1 L_sun and folds albedo and greenhouse into the
anchor's calibration: the Earth reference uses 288 K (`docs/surface-climate-v1.md` §1.5).

If albedo, distance and greenhouse are held fixed, they cancel in a ratio:

```
anchor(t) = T_cat * ( L(t) / L(t_epoch) )^(1/4)
```

**Brightening law.**
- Gough (1981), from memory: `L(t) = L_now / (1 + 0.4 (1 - t/t_sun))`.
- `stellar-evolution.ts:236-238` rewrites this in fractional main-sequence age x,
  using `t_now/t_MS = 0.457`: `L(x)/L_ZAMS = 1.4/(1.4 - 0.875x)`. The comment there
  also flags it as "from memory".
- Arithmetic check (verified): x = 0.457 gives 1.4/1.0 = 1.4, and Gough at t = 0
  gives 1/1.4. The two forms agree.
- Applying the solar law to every mass through the fractional age x is a heuristic.
  It is the same heuristic ocean loss already uses. Real massive stars brighten more
  over their main sequence (from memory).
- The mass-luminosity relation `L ~ M^3.5` is from memory. The catalogue's own
  implied `M^3.6` is verified as a derivation (§1).

**Deterministic evaluation.** Every step below uses only BigInt arithmetic,
`+ - * /`, `Math.sqrt`, `Math.round` and `Math.floor`. These are all exactly
specified or correctly rounded in IEEE 754 / ECMAScript.

```
star  = lifecycle of sys.stars[0]                  (same host as place-query.ts:127)
span  = star.giantNs - star.formationNs            (BigInt)
k(t)  = Number( (4096n * (t - star.formationNs)) / span )   for formationNs <= t < giantNs
ke    = k(CATALOGUE_EPOCH_NS)
x_k   = k / 4096 ;  x_e = ke / 4096                 (both exact dyadics)
r     = (1.4 - 0.875 * x_e) / (1.4 - 0.875 * x_k)   (= B(x_k)/B(x_e))
n     = (k === ke) ? 0 : Math.round( 8 * T_cat * (Math.sqrt(Math.sqrt(r)) - 1) )
anchor(t) = T_cat + n / 8                           (T_cat is an integer: exact)
```

- `T_cat` is `body.temperatureK`.
- A host off the main sequence (t at or after `giantNs`) or before formation gets
  no dated climate. The query returns `hostMainSequence: false`, and the surface is
  already gated by `planetEnvironmentAt` (`hostSuitable`, `world-surface.ts:104`).
  Giant and remnant climates are out of scope, because the remnant luminosity is
  not det-math.
- `Math.pow` and `**` stay banned, as the surface-climate source-grep test already
  enforces (`docs/surface-climate-v1.md` §4). The quarter power is
  `sqrt(sqrt(r))`.

**Second reference anchor.** The forcing carries both `anchorTempK` (dated) and
`referenceAnchorTempK` (always `T_cat`).
- `annual` uses the dated anchor.
- `tBin` (`surface-climate.ts:309`) and niche rebasing (`compileNicheEvaluator`,
  `habitat-suitability.ts:97-98`) use the reference anchor.
- At the epoch the two anchors are equal, so the output is identical.

## 3. Seek-independence and determinism gate

The climate at t must be a pure function of (body address, t, versions). It must
never depend on how t was reached.

- **Allowed inputs.** The only time input is the integer `k`, which is derived from
  BigInt `t`. Nothing accumulates between frames. There is no float time, no
  wall-clock and no "previous anchor".
- **Allowed math.** Only the operations in §2. A source-grep test extends to the new
  function: no `Math.pow`, `**`, `Math.exp`, `Math.log` or `Math.log1p`. `n` is a
  threshold decision, so it falls under contract §1.2 rule 3 (det path), even
  though "interpolated luminosity" would otherwise count as continuous.
- **Tests.** Implementation must land all of these.
  1. *Epoch identity.* At `CATALOGUE_EPOCH_NS`, and at the existing
     `TARGET = epoch + 32 s` (`tests/acceptance/climate-seek-independence.test.mjs:30`),
     the following stay byte-identical to their pre-change pins:
     classifier bytes, `life-cpu-digest`, `terrain-leaf-loop-digest`,
     `terrain-elevation-identity` and `climate-agreement`.
  2. *Calibration sha.* The surface-climate calibration sha is unchanged. The new
     constants (4096, 1/8 K, 1.4, 0.875) go in a separate frozen
     `BRIGHTENING_CALIBRATION` with its own pinned sha.
  3. *Seek A to B versus direct B.* Extend `climate-seek-independence` with targets
     epoch +1, +4 and +8 Gyr and epoch -2 Gyr. For each target, compare digests from
     (a) a direct seek, (b) stepped playback over all five tiers, using the existing
     `playbackTicks` harness, and (c) A -> B -> A -> B with A = epoch. Each digest
     includes `k`, `n`, the forcing anchor and the classifier rows.
  4. *Cache independence.* Cold, warm and evicted caches, and shuffled visit order,
     give equal digests. The pattern is at `climate-seek-independence.test.mjs:100-117`.
  5. *Bucket edges.* `k(start - 1n) + 1 === k(start)`. `n` never decreases in t while
     the host is on the main sequence.
  6. *Cross-engine golden.*
     - Body set: the five named bodies in `climate-seek-independence.test.mjs:40-46`.
     - Dates: epoch, +-1, +4 and +8 Gyr, and the last main-sequence bucket.
     - Pinned values per (body, date): `k`, `n`, `anchor`, and a 64-direction
       climate digest. These go in `tests/golden/star-luminosity.json`.
     - The golden must match in Node and in Chromium/Firefox through the
       `tests/browser.mjs` pattern (contract §6.4 item 4).
     - The 1-ULP perturbation test (`tests/golden/perturbation.test.mjs`) reports the
       flip count on `n`.

## 4. Per-epoch cache key

**Key:** the integer climate epoch index `n`, which is a 1/8 K anchor quantum
derived from the phase bucket `k`.

**Bucket justification.**
- `d ln B / dx = 0.875/(1.4 - 0.875x)` is at most 1.667 (at x = 1). One phase bucket
  therefore moves the anchor by at most `T/4 x 1.667/4096 = 1.0e-4 T`. That is 0.033 K
  at 325 K, whatever the star's mass. This mass independence is why the contract's
  phase-fraction rule fits better than a fixed-Myr bucket.
- The 1/8 K quantum is 16x finer than the 2 K `climateCode` bin and 48x finer than
  the 6 K snow and treeline ramps. Scrubbing therefore reads as continuous.
- Rates (estimates from the formulas):

  | Host | Anchor drift | One `n` step every |
  |---|---|---|
  | Sun analogue at x of about 0.45 | about 6 K/Gyr | about 20 Myr |
  | 1.63 M_sun near the end of its main sequence | about 46 K/Gyr | about 2.7 Myr |
  | 0.18 M_sun | under 0.1 K/Gyr | over 1 Gyr |

- At the "geological" tier (1 Gyr per second, `climate-seek-independence.test.mjs:27`)
  a Sun analogue changes `n` about 50 times per second. That is the same regime as
  the water bucket, and it is bounded by the same worker-admission cap
  (`planet-renderer.ts:360-370`).

**Caches that must include `n`:**

| Cache | Where | Change |
|---|---|---|
| Forcing FIFO | `src/surface-climate.ts:240-271` | Key on `n`. Provenance becomes `'dated-luminosity'`. Share `qMean`/`qAmp` with the epoch forcing, because the tables depend only on obliquity. A new epoch then costs O(1), not the 0.7-0.8 ms table build (`docs/surface-climate-v1.md` §4). |
| `variantForcings` | `src/surface-biomes.ts:31-54` (key at :46 uses `body.temperatureK`) | Add `n`. |
| Season cache | `src/season.ts:348` (keys on `opts.anchorTempK`) | Pass the dated anchor. |
| Terrain colour sampler | `src/terrain.ts:1106` | Add an optional `climateEpochIndex` with default 0. |
| Tile stamps and tile metadata | `planet-renderer.ts` (water-bucket pattern); `planet-tiles.ts` (64 B summit/snowline/treeline metadata) | Stamp `n` and mark stale lazily. Otherwise `climate-agreement` (orbit colour equals ground classifier) breaks at non-epoch dates. |
| place-query `datedCache` | `src/place-query.ts:148` | Already keyed on exact t, which is finer, so it stays correct. It may move to `n` for reuse. |

**No `n` needed:**
- `climate-grid.ts`. In `windRow` (`climate-grid.ts:125-141`), `rain = amount/ref`.
  Both `amount` and `ref` scale linearly with `sat`, so a uniform anchor shift
  cancels analytically.
- The design feeds the grid the catalogue-anchor zonal temperatures. That keeps it
  bit-stable and leaves `CLIMATE_GRID_VERSION` alone. The grid is not wired yet:
  `buildClimateGrid` has no caller.

## 5. Bookmark and version impact

- **Addresses and bookmarks do not break.** The catalogue, `temperatureK`,
  addresses and `ADDRESS_VERSION` are untouched.
  - A bookmark with no `date` param resolves to `CATALOGUE_EPOCH_NS`
    (`time-nav.ts:271,293`), so it lands on a byte-identical world.
  - A dated bookmark gets the existing notice "predates the current combined model",
    because `MODEL_MANIFEST_ID` contains `CLIMATE_VERSION` and `BIOME_VERSION`
    (`time-nav.ts:58-69,348`).
- **Versions that move:**
  - `CLIMATE_VERSION`: dated output is new, under contract rule 4. It folds into or
    follows task 9's v2 string.
  - `BIOME_VERSION`: the classifier takes `n`.
  - `PLACE_QUERY_VERSION`: only if `PlaceClimate` gains `anchorTempK` and `n` (it
    should).
  - `BUILD_VERSION`: coordinator, when the renderer threads `n`.
- **Versions that stay:**
  - `HISTORY_VERSION`: the change only exports `mainSequenceBrightening` and adds
    a pure function; no existing output changes.
  - `SURFACE_VERSION`: `planetEnvironmentAt` is untouched.
  - `CATALOG`, `TIME` and `ADDRESS`.
  - `TERRAIN_VERSION`: elevation is unchanged, and the colour identity is tracked by
    `TERRAIN_CLIMATE_VERSION = CLIMATE_VERSION` (`terrain.ts:142`). The coordinator
    decides at merge, as in task 9.
  - `WorldVersions` (`wv`): it does not contain `CLIMATE_VERSION`
    (`address.ts:122-132`), so it changes only if one of the moves above touches a
    `WorldVersions` field.
- **Present-day identity is the hard requirement.** Option B (§7) breaks it for
  about 83 % of habitat worlds, which is why it is not recommended.

## 6. Corpus table: worlds leaving 250-325 K

**Saved script (to be written by the implementer; not run here):**
`scripts/star-luminosity-corpus.mjs`

- **Run:** `node scripts/star-luminosity-corpus.mjs [outDir]` from the repo root. It
  needs Node 24 type stripping, like `scripts/climate-calibration-report.mjs`. It is
  CPU-only, takes seconds, needs no lock and is not part of `npm test`.
- **Corpus:**
  - Seed `'LETHRA-001'`, `g0 = galaxies(seed)[0]`.
  - The first 2000 systems, using exactly the enumeration in
    `scripts/climate-calibration-report.mjs:84-86`
    (`for (sx = 266; systems < 2000; sx++) for (ref of sector(g0,[sx,0,0]).refs)`).
  - Filter with `temperateHabitat`. surface-climate-v1 §2.2 counted 721 worlds; the
    script re-counts.
- **Per body:**
  - Host = `sys.stars[0]`. Also record `binary` and whether
    `planet.parentId === stars[0].id`.
  - `starLifecycle`, `planetLifecycle`, `planetStateAt`, `starStateAt`.
- **Dates:** `CATALOGUE_EPOCH_NS + D x 1e9 x YEAR_NS` for D in {-4, -1, 0, +1, +4, +8}.
- **Per (body, D):**
  - `k`, `n` and the anchor from §2. The script implements §2 inline until src
    exports it, then imports it and asserts equality.
  - `hostMS`, `engulfed`, and the band outcome: `below250`, `in`, or `above325`.
- **Cross-check column (option B, static):** `T_cat x sqrt(sqrt(L_cat))` with
  `L_cat = (R/6.957e8)^2 (T/5772)^4` from the host's catalogue fields. This should
  reproduce the quoted 83 %.
- **Outputs:**
  - `test-results/star-luminosity-corpus/report.json` and `report.txt`.
  - Counts per D, split by host off the main sequence, engulfed, above 325 and
    below 250.
  - A breakdown by spectral class (`host.type`).
  - The `n` histogram.
  - A sha256 of canonical-JSON `(id, k, n)` rows per D, as a golden candidate.

| Date (from epoch) | Host off main sequence | Anchor > 325 K, host on main sequence | Total leaving the band | Status |
|---|---|---|---|---|
| static option B, at the epoch | - | - | about 83 % | quoted, `biome-climate-increment-1-plan-2026-10-02.json:271` (method not recorded) |
| +1 Gyr | NOT COMPUTED | NOT COMPUTED | NOT COMPUTED | needs the script run |
| +4 Gyr | NOT COMPUTED | NOT COMPUTED | NOT COMPUTED | needs the script run |
| +8 Gyr | NOT COMPUTED | NOT COMPUTED | NOT COMPUTED | needs the script run |

**Analytic estimate (not a measurement).**

Assumptions:
- Host mass is uniform on [0.18, 1.63] (`catalog.ts:760`). It is independent of
  `T_cat`, because `T_cat` ignores the star.
- Epoch age fraction 0.15-0.65; I used 0.4 for the main-sequence part.
- Near the top of the band the corpus density is about 1.56 % per K, from the
  anchor bins in surface-climate-v1 §2.2 (171 worlds in 310-325 K and 166 in
  295-309 K, of 721).
- Brightening only warms, so worlds exit through 325 K.

| Date | Host off main sequence | Anchor > 325 K, host on main sequence | Total |
|---|---|---|---|
| +1 Gyr | about 0 % (the shortest remaining main sequence is about 1.0 Gyr) | about 12 % | about 10-15 % |
| +4 Gyr | about 32 % | about 15 % | about 40-50 % |
| +8 Gyr | about 50 % | about 10 % | about 55-65 % |

- Cross-check of option B with `L = M^3.6`: the anchor stays in the band only for
  M within about +-14 % of 1 M_sun. That is about 18-22 % of hosts, so about 80 %
  leave. This is consistent with the quoted 83 %.
- Past (option a, symmetric): a Sun analogue 4 Gyr before the epoch has r = 0.75,
  which is about -7 %, so 288 K becomes 268 K. This is the faint-young-Sun cooling,
  with no greenhouse compensation.

## 7. Owner question (paste-ready for the owner sheet)

The sheet is `docs/owner-sheet-2026-10-07.md`, owned by L6; I did not edit it. It
has no STAR-LUMINOSITY item yet (grep for luminos/brighten: no match). The older
`docs/owner-decisions-2026-10-04.md` has none either. Proposed row 28, for section 4,
in the sheet's language and format:

```
| 28 | **T22 STAR-LUMINOSITY** Skal klimaets ankertemperatur foelge stjernens lysstyrke over tid? | (a) dateret lysstigning normaliseret til katalog-epoken: i dag uaendret, fremtid varmere, fortid koldere; (a') som (a), men kun fremad (fortid = i dag); (b) ogsaa absolut lysstyrke (T x L^0,25) allerede nu; (c) udskyd | (a)/(a'): ingen digest eller bogmaerke flytter ved epoken. ESTIMAT (ikke maalt): ca. 10-15 / 40-50 / 55-65 % af skov-egnede vandverdener forlader 250-325 K ved +1/+4/+8 mia. aar, heraf ca. 0/32/50 % fordi stjernen forlader hovedserien. (a) goer fortiden koldere (solanalog 4 mia. aar tilbage: 288 -> ca. 268 K). Baand-gaten forbliver katalog-statisk; skov doer via klimaet (opgave 9's varmeloft). (b): ca. 83 % forlader baandet I DAG, alle klima-, liv- og farve-digests flytter | (a), implementeret efter opgave 9 | `docs/star-luminosity-design-2026-10-07.md`; `docs/surface-climate-v1.md` s.5c |
```

## 8. Implementation scope (after task 9)

**Touches:**
- `src/stellar-evolution.ts`: export `mainSequenceBrightening` (numerics unchanged)
  and add the pure functions `brighteningBucket(star, t)` and
  `climateEpochIndex(star, tCatK, t)`. Add `BRIGHTENING_CALIBRATION`.
- `src/surface-climate.ts`:
  - a dated forcing (`climateForcingFor(body, {epochIndex})`) that shares the tables;
  - `referenceAnchorTempK` for `tBin`;
  - provenance `'dated-luminosity'`;
  - the `CLIMATE_VERSION` bump.
- `src/surface-biomes.ts`: `biomeClassifier(body, waterLevelM, epochIndex = 0)`, and
  the `variantForcings` key.
- `src/habitat-suitability.ts` callers: pass the reference anchor. The file itself
  does not change.
- `src/season.ts` callers: pass the dated anchor.
- `src/terrain.ts`: an optional `climateEpochIndex` on the sampler (default 0).
- `src/planet-renderer.ts`, `src/planet-tiles.ts`, `src/main.ts`: thread `n` and
  stamp tiles with it, like `waterBucket`.
- `src/place-query.ts`: pass `n`, and expose `anchorTempK`, `n` and `hostMainSequence`.
- Tests:
  - extend `tests/acceptance/climate-seek-independence.test.mjs`;
  - add `tests/star-luminosity.test.mjs` and `tests/golden/star-luminosity.json`;
  - the browser golden;
  - the source-grep ban;
  - add both new tests to the `package.json` test list.
- `scripts/star-luminosity-corpus.mjs`.
- A section in `docs/surface-climate-v2.md`.

**Out of scope:**
- Option B (absolute luminosity), unless the owner picks it.
- `planetEnvironmentAt`'s 235-330 K gate and its `Math.pow` (`world-surface.ts:97-98`).
  That is a separate `SURFACE_VERSION` change; the plan already flags the
  `sqrt(sqrt)` fix.
- Circumbinary total luminosity. The host stays `stars[0]`, as in ocean loss.
- Giant and remnant climates.
- Greenhouse and atmosphere evolution, and carbonate-silicate feedback
  (surface-climate-v1 §5a).
- Coupling `biosphere-model` species timelines to the dated climate.
- Orbital evolution.
- Any change to `catalog.ts`.
