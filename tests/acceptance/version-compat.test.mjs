// Acceptance test 4 (docs/time-and-coordinates-contract.md §6.4 / §1.3 /
// §6.2): "the WorldVersions bundle round-trips, and legacy addresses/
// bookmarks still resolve to byte-identical content (the legacy galaxies
// digest ... must not move)."
//
//   - §1.3: "A WorldVersions bundle is part of every save/bookmark/URL."
//   - §6.2 compatibility requirement 1: `galaxiesInGroup(seed, [0,0,0],
//     [0,0,0])` must return the exact same 32 Galaxy records, in the same
//     order, as today's `galaxies(seed)` — "keep a byte-identical golden
//     fixture test for this specifically."
//   - §6.2 compatibility requirement 2: an address string without a
//     cluster/group prefix resolves to clusterCell=groupCell=(0,0,0).
//   - §6.2's version-bump table: the exact TIME_VERSION/HISTORY_VERSION/
//     BIOSPHERE_VERSION/SURFACE_VERSION/VERSION(catalog)/ADDRESS_VERSION/
//     COSMOLOGY_VERSION strings this migration was supposed to land on.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { galaxies, galaxiesInGroup, VERSION as CATALOG_VERSION } from '../../src/catalog.ts';
import { TIME_VERSION, CATALOGUE_EPOCH_NS, UNIVERSE_END_NS, YEAR_NS, parseDate, dateRecord, yearsToDate, dateYears } from '../../src/world-time.ts';
import { COSMOLOGY_VERSION } from '../../src/cosmology.ts';
import { HISTORY_VERSION } from '../../src/world-history.ts';
import { SURFACE_VERSION } from '../../src/world-surface.ts';
import { BIOSPHERE_VERSION } from '../../src/biosphere-model.ts';
import { TERRAIN_VERSION } from '../../src/terrain.ts';
import { ADDRESS_VERSION, parseAddress, formatAddress, resolveGalaxy, resolveWorldPosition } from '../../src/address.ts';
import { GALAXY_HISTORY_VERSION } from '../../src/galaxy-history.ts';
import { CURRENT_VERSIONS, encodeVersions, decodeVersions, resolveTimeFromUrl, writeTimeToUrl, compatibilityNoticeFromUrl, MODEL_MANIFEST_ID, BUILD_VERSION, RELIEF_RECALIBRATED_NOTICE } from '../../src/time-nav.ts';
import { sha256, SEED } from './helpers.mjs';

// ---------------------------------------------------------------------------
// WorldVersions bundle shape and round-trip (§1.3).
// ---------------------------------------------------------------------------
const WORLD_VERSIONS_KEYS = ['time', 'space', 'cosmology', 'catalog', 'history', 'surface', 'terrain', 'biosphere', 'galaxyHistory'];

function buildWorldVersions() {
  return {
    time: TIME_VERSION,
    space: ADDRESS_VERSION,
    cosmology: COSMOLOGY_VERSION,
    catalog: CATALOG_VERSION,
    history: HISTORY_VERSION,
    surface: SURFACE_VERSION,
    terrain: TERRAIN_VERSION,
    biosphere: BIOSPHERE_VERSION,
    galaxyHistory: GALAXY_HISTORY_VERSION,
  };
}

test('WorldVersions has exactly the nine §1.3-declared keys, every value a non-empty string', () => {
  const versions = buildWorldVersions();
  assert.deepEqual(Object.keys(versions).sort(), WORLD_VERSIONS_KEYS.slice().sort());
  for (const key of WORLD_VERSIONS_KEYS) {
    assert.equal(typeof versions[key], 'string', `versions.${key} must be a string`);
    assert.ok(versions[key].length > 0, `versions.${key} must be non-empty`);
  }
  // The bundle main.ts actually threads through every save/bookmark/URL
  // (time-nav.ts's CURRENT_VERSIONS) must agree field-for-field with the
  // §1.3-declared shape built independently above.
  assert.deepEqual(Object.keys(CURRENT_VERSIONS).sort(), WORLD_VERSIONS_KEYS.slice().sort());
  assert.equal(CURRENT_VERSIONS.galaxyHistory, GALAXY_HISTORY_VERSION);
});

test('WorldVersions bundle round-trips through JSON (the persisted save/bookmark/URL form) byte-for-byte', () => {
  const versions = buildWorldVersions();
  const roundTripped = JSON.parse(JSON.stringify(versions));
  assert.deepEqual(roundTripped, versions);
  assert.equal(JSON.stringify(roundTripped), JSON.stringify(versions));
  // A second, independent construction (as a fresh "load" would do, reading
  // the same live module constants again) must produce byte-identical JSON —
  // this bundle has no hidden non-determinism (wall clock, random ids, ...).
  assert.equal(JSON.stringify(buildWorldVersions()), JSON.stringify(versions));
});

test('pinned current package versions include the released rivers-off surface contract', () => {
  assert.equal(TIME_VERSION, 'atlas-time-2', 'was atlas-time-1: origin moved from catalogue epoch to Big Bang');
  assert.equal(HISTORY_VERSION, 'atlas-history-3-remnant-cooling', 'current authoritative lifecycle algorithm includes remnant cooling');
  assert.equal(BIOSPHERE_VERSION, 'biosphere-lab-3', 'was biosphere-lab-2: reseeded by body address + rekeyed to planet age');
  assert.equal(SURFACE_VERSION, 'atlas-surface-8-ocean-volume', 'was atlas-surface-7-no-inland-rivers: the dated sea is an ocean-volume level on the body seabed (relief round, P2; re-pinned by P6); rivers stay off');
  assert.equal(CATALOG_VERSION, 'atlas-2.0.0', 'was atlas-1.0.0: address space gains cluster/group hierarchy levels');
  assert.equal(ADDRESS_VERSION, 'atlas-address-1', 'new module');
  assert.equal(COSMOLOGY_VERSION, 'atlas-cosmology-2-radiation', 'current background includes the radiation-era model');
});

test('FINDING (not this suite\'s fault, reported for visibility): §6.2 explicitly requires TERRAIN_VERSION stay fixed at "terrain-1.2.0" ("deliberate: ... its version shouldn\'t either"); the live value has since moved', () => {
  // terrain.ts is owned by neither this contract's four packages nor this
  // acceptance suite (§6.1's ownership table: no package may bump
  // TERRAIN_VERSION for this migration) - concurrent, unrelated terrain work
  // (a catalog.ts coordinate-hash avalanche fix, per terrain.ts's own header
  // comment) has moved it independently. Asserted as a soft, informational
  // check (type/non-empty only) rather than a hard pin to the contract's
  // stale expected literal, so this suite does not misattribute someone
  // else's unrelated version bump as a failure of the time-and-coordinates
  // contract itself. See this test's title and the final report for the
  // measured value.
  assert.equal(typeof TERRAIN_VERSION, 'string');
  assert.ok(TERRAIN_VERSION.length > 0);
});

// ---------------------------------------------------------------------------
// Legacy galaxy digest: must not move (§6.2 compatibility requirement 1).
// Pinned as a literal, hard-coded sha256 over the canonical-JSON encoding of
// galaxiesInGroup(SEED, [0,0,0], [0,0,0]) — computed once, frozen here, and
// cross-checked two independent ways below (against galaxies(seed) directly,
// and against the pre-existing tests/fixtures/legacy-galaxies.json this repo
// already tracks) so a change in EITHER the generator or the fixture is
// caught, not just a change that conveniently moves both together.
// ---------------------------------------------------------------------------
const LEGACY_GALAXIES_DIGEST_SHA256 = '12682070b559d517acd4e82f72bf539a9e9a6b9b88e347a55faaf88e00e59b93';

test(`legacy galaxies digest for seed "${SEED}" is pinned and must not move`, () => {
  const legacy = galaxiesInGroup(SEED, [0n, 0n, 0n], [0n, 0n, 0n]);
  assert.equal(legacy.length, 32);
  const digest = sha256(legacy);
  assert.equal(digest, LEGACY_GALAXIES_DIGEST_SHA256,
    `legacy galaxy catalogue for seed "${SEED}" changed: expected ${LEGACY_GALAXIES_DIGEST_SHA256}, got ${digest}`);
});

test('legacy galaxies digest is consistent between galaxiesInGroup and the back-compat galaxies() alias', () => {
  const viaGroup = galaxiesInGroup(SEED, [0n, 0n, 0n], [0n, 0n, 0n]);
  const legacyAlias = galaxies(SEED);
  assert.deepEqual(viaGroup, legacyAlias);
  assert.equal(sha256(legacyAlias), LEGACY_GALAXIES_DIGEST_SHA256);
});

test('legacy galaxies digest matches the independently-tracked tests/fixtures/legacy-galaxies.json fixture', async () => {
  const fixture = JSON.parse(await readFile(new URL('../fixtures/legacy-galaxies.json', import.meta.url)));
  assert.equal(fixture.seed, SEED, 'this cross-check assumes the tracked fixture uses the same seed this suite pins against');
  const current = galaxiesInGroup(fixture.seed, [0n, 0n, 0n], [0n, 0n, 0n]);
  assert.deepEqual(current, fixture.galaxies);
  assert.equal(sha256(current), LEGACY_GALAXIES_DIGEST_SHA256, 'the tracked fixture and this suite\'s own pinned digest must agree');
});

// ---------------------------------------------------------------------------
// Legacy addresses/bookmarks resolve to byte-identical content (§6.2
// compatibility requirement 2 + §5.1/§5.2's bookmark shape).
// ---------------------------------------------------------------------------
test('legacy address strings (no U/K/H prefix) parse to clusterCell=groupCell=(0,0,0) and resolve to the exact legacy galaxy', () => {
  const legacy = galaxies(SEED);
  for (const s of ['G001', 'G001/C2128,0,1/0', 'G032']) {
    const parsed = parseAddress(s);
    assert.ok(parsed, s);
    assert.deepEqual(parsed.clusterCell, [0n, 0n, 0n]);
    assert.deepEqual(parsed.groupCell, [0n, 0n, 0n]);
    const resolved = resolveGalaxy(SEED, { clusterCell: parsed.clusterCell, groupCell: parsed.groupCell, galaxyOrdinal: parsed.galaxyOrdinal });
    assert.deepEqual(resolved, legacy[parsed.galaxyOrdinal]);
  }
});

test('a bookmark (address string + date string) round-trips to byte-identical resolved content', () => {
  // The bookmark persistence shape this codebase actually uses (main.ts
  // persists `epoch.toString()` in the URL; addresses are persisted as their
  // canonical string via formatAddress) — no raw BigInt ever needs to cross
  // a JSON boundary, sidestepping BigInt-unsafe JSON.stringify entirely.
  const addressString = 'G001/C2128,0,1/0';
  const dateString = CATALOGUE_EPOCH_NS.toString();

  const parsedAddress = parseAddress(addressString);
  const reencodedAddress = formatAddress(parsedAddress);
  assert.equal(reencodedAddress, addressString, 'formatAddress(parseAddress(s)) === s for a legacy bookmark string');

  const parsedDate = parseDate(dateString);
  assert.equal(parsedDate, CATALOGUE_EPOCH_NS);
  assert.equal(parsedDate.toString(), dateString);

  // The full "load a saved bookmark" flow: reconstruct WorldPosition +
  // WorldVersions purely from the persisted strings, then resolve — twice,
  // independently — and require byte-identical results.
  const versions = buildWorldVersions();
  const loadOnce = () => {
    const addr = parseAddress(addressString);
    const t = parseDate(dateString);
    const pos = { address: addr, frame: 'system-barycentric', localOffset: [0, 0, 0] };
    return resolveWorldPosition(SEED, pos, t, 'baseline');
  };
  const first = loadOnce();
  const second = loadOnce();
  assert.deepEqual(first, second, 're-loading the same bookmark twice must resolve to byte-identical content');
  assert.deepEqual(JSON.parse(JSON.stringify(versions)), versions, 'the accompanying WorldVersions bundle round-trips alongside the bookmark');
});

test('yearsToDate/dateYears/dateRecord/parseDate round-trip a bookmark date exactly, including fractional years and huge (but in-cap) magnitudes', () => {
  // yearsToDate's own regex caps the integer part at 80 digits
  // (`\d{1,80}`) — the largest legal input is exactly 80 nines.
  const largestLegalYears = '9'.repeat(80);
  // '0' — the Big Bang itself — is a legal, addressable instant (§2.1's
  // range is closed at BOTH ends) and must round-trip exactly like any
  // other in-range value, not just avoid throwing.
  for (const yearsStr of ['13787000000', '13787000000.123456789', '0', largestLegalYears]) {
    const t = yearsToDate(yearsStr);
    const record = dateRecord(t);
    const roundTripped = JSON.parse(JSON.stringify(record));
    assert.equal(parseDate(roundTripped.offsetNs), t, `bookmark date ${yearsStr}yr must round-trip through JSON exactly`);
  }
  assert.equal(yearsToDate('0'), 0n, 'the Big Bang instant (t = 0n) must be explicitly reachable through yearsToDate');
  // Note: dateYears() is a deliberately-lossy DISPLAY formatter (it keeps
  // only 6 fractional-year digits, `(n % YEAR_NS) * 1_000_000n / YEAR_NS`,
  // vs. yearsToDate's 9-digit input precision) - `yearsToDate(dateYears(t))
  // === t` does NOT hold in general and is not a documented round-trip
  // guarantee, so it is deliberately not asserted here. The exact,
  // nanosecond-precision bookmark round trip is dateRecord/parseDate, above.
});

// ---------------------------------------------------------------------------
// Floor + ceiling as a matched pair (§2.1: the navigable range is CLOSED at
// BOTH ends, `[0n, UNIVERSE_END_NS]`). This '-500000000' case used to live in
// the round-trip test above, asserted as a SUCCESSFUL serialization-fidelity
// round trip — that was the actual defect this suite now documents as fixed:
// a negative `t` is an instant before the Big Bang, which §2.1 declares out
// of range, and `yearsToDate` (the untrusted-input parser for this axis)
// must reject it loudly, exactly as it already rejects one nanosecond past
// `UNIVERSE_END_NS` below, not silently accept and round-trip it.
// ---------------------------------------------------------------------------
test('yearsToDate: floor and ceiling are a matched pair — before the Big Bang and past UNIVERSE_END_NS both throw, "0" and UNIVERSE_END_NS itself both succeed', () => {
  // Floor: was formerly asserted as a successful round trip (see comment
  // above) — now the exact opposite, a loud rejection, because that
  // "successful" round trip was itself the bug: a negative `t` (a moment
  // before the Big Bang) round-tripping cleanly through the axis's own entry
  // point, silently, with no error at all.
  assert.throws(() => yearsToDate('-500000000'), /out of range/i,
    'a negative years value (before the Big Bang) must be rejected explicitly, not silently accepted and round-tripped');
  assert.throws(() => yearsToDate('-1'), /out of range/i, 'even one year before the Big Bang must throw, not just huge negatives');
  // Ceiling's existing matched-pair partner (unchanged behaviour, restated
  // here so the two bounds read together as a pair).
  assert.throws(() => yearsToDate((10n ** 100n + 1n).toString()), /out of range/i,
    'one year past UNIVERSE_END_NS must still throw');
  // Both closed ends of the range are themselves legal, addressable instants.
  assert.equal(yearsToDate('0'), 0n, 'the Big Bang itself (t = 0n) must succeed');
  assert.equal(yearsToDate((10n ** 100n).toString()), UNIVERSE_END_NS, 'UNIVERSE_END_NS itself must succeed');
});

test('FIXED (was a FINDING): UNIVERSE_END_NS (10^100 yr, the contract\'s own declared navigable ceiling, §2.1) now round-trips exactly through yearsToDate, with no silent Number precision loss', () => {
  // Root cause: yearsToDate's regex capped the integer-years part at 80
  // digits (`\d{1,80}`), but UNIVERSE_END_NS in years is "1" followed by 100
  // zeros — a 101-digit integer — so the contract's own declared ceiling
  // could never be typed/round-tripped through this entry point, even
  // though it was already exactly representable and exact in raw
  // nanoseconds (parseDate's 120-digit cap already covers UNIVERSE_END_NS's
  // ~117-digit nanosecond form). Fixed in world-time.ts by widening the
  // regex's digit cap (to 200, generous headroom rather than a value tuned
  // to exactly 101) and adding an explicit BigInt magnitude check against
  // UNIVERSE_END_NS — a loud, explicit throw for anything beyond it, never
  // a silent clamp/truncation. See tests/world-time.test.mjs for the
  // dedicated unit-level teeth (ceiling, ceiling-1, ceiling+1, and a
  // same-double-but-different-BigInt precision-collapse check).
  const yearsString = dateYears(UNIVERSE_END_NS);
  assert.equal(yearsString.length, 101, `sanity: 10^100 renders as a 101-digit years string, got length ${yearsString.length}: ${yearsString}`);
  // The exact ceiling now round-trips.
  assert.equal(yearsToDate(yearsString), UNIVERSE_END_NS, 'yearsToDate must now accept its own 101-digit dateYears(UNIVERSE_END_NS) output and recover UNIVERSE_END_NS exactly');
  assert.equal(yearsToDate((10n ** 100n).toString()), UNIVERSE_END_NS);
  // One full year below the ceiling is exact and distinct — proves the path
  // never silently collapsed through a Number/double (10^100 and 10^100-1
  // are indistinguishable as doubles).
  const oneBelow = yearsToDate((10n ** 100n - 1n).toString());
  assert.equal(oneBelow, UNIVERSE_END_NS - YEAR_NS);
  assert.notEqual(oneBelow, UNIVERSE_END_NS);
  // Beyond the ceiling is a loud, explicit rejection — never a silent clamp.
  assert.throws(() => yearsToDate((10n ** 100n + 1n).toString()), /out of range/i,
    'a years value beyond UNIVERSE_END_NS must be rejected explicitly, not silently clamped to the ceiling or truncated');
});

// ---------------------------------------------------------------------------
// GALAXY_HISTORY_VERSION now HAS a dedicated WorldVersions slot (closes the
// gap previously noted here and in galaxy-history.ts's header / the
// contract's §6.2 GALAXY_HISTORY_VERSION row): a bookmark can now record
// which galaxy-history algorithm produced it, the same way it already
// records TIME_VERSION/HISTORY_VERSION/etc.
// ---------------------------------------------------------------------------
test('GALAXY_HISTORY_VERSION is pinned to its exact contractual value — a change here must be a deliberate, reviewed bump, not silently absorbed', () => {
  // A literal pin (not a self-comparison against the live import) so this
  // test actually has teeth: it fails if galaxy-history.ts's own constant
  // ever changes without the change being reviewed here too — the same
  // pattern the §6.2 version-bump table test above uses for the other seven
  // module versions.
  assert.equal(GALAXY_HISTORY_VERSION, 'atlas-galaxy-history-2');
});

test('GALAXY_HISTORY_VERSION has a dedicated WorldVersions.galaxyHistory slot (§1.3 gap closed)', () => {
  assert.equal(typeof GALAXY_HISTORY_VERSION, 'string');
  assert.ok(GALAXY_HISTORY_VERSION.length > 0);
  const versions = buildWorldVersions();
  assert.equal(versions.galaxyHistory, GALAXY_HISTORY_VERSION);
  assert.equal(CURRENT_VERSIONS.galaxyHistory, GALAXY_HISTORY_VERSION);
  // Round-trips through the persisted JSON form like every other slot.
  assert.equal(JSON.parse(JSON.stringify(versions)).galaxyHistory, GALAXY_HISTORY_VERSION);
});

// ---------------------------------------------------------------------------
// Old-bookmark compatibility: adding a ninth VERSION_FIELDS entry changes the
// `wv` URL param's encoded field count. A `wv` string written by a build
// before this change (8 fields, `time` already at `atlas-time-2`) must still
// be recognized as a CURRENT, non-legacy bundle — not misclassified as a
// pre-`atlas-time-2` bookmark, which would silently re-offset an already-
// absolute `date` value against CATALOGUE_EPOCH_NS a second time.
// ---------------------------------------------------------------------------
test('an old (8-field, pre-galaxyHistory) wv bundle decodes as current, not legacy', () => {
  const oldWv = ['atlas-time-2', 'space-x', 'cosmo-x', 'catalog-x', 'history-x', 'surface-x', 'terrain-x', 'biosphere-x'].join(',');
  const decoded = decodeVersions(oldWv);
  assert.ok(decoded, 'an 8-field wv string must still decode, not return null');
  assert.equal(decoded.time, 'atlas-time-2');
  assert.equal(decoded.space, 'space-x');
  assert.equal(decoded.biosphere, 'biosphere-x');
  assert.equal(decoded.galaxyHistory, '', 'the new slot is unknown for a pre-galaxyHistory bundle, not guessed at');
});

test('an old (8-field) bookmark URL with an absolute atlas-time-2 date resolves to that exact t — no double-offset', () => {
  const absoluteT = CATALOGUE_EPOCH_NS + 12_345_000_000_000n; // an arbitrary absolute instant, NOT an offset
  const oldWv = ['atlas-time-2', ADDRESS_VERSION, COSMOLOGY_VERSION, CATALOG_VERSION, HISTORY_VERSION, SURFACE_VERSION, TERRAIN_VERSION, BIOSPHERE_VERSION].join(',');
  const params = new URLSearchParams(`date=${absoluteT}&wv=${oldWv}`);
  const resolved = resolveTimeFromUrl(params);
  assert.equal(resolved, absoluteT, 'an old 8-field wv bundle must not be treated as legacy (which would add CATALOGUE_EPOCH_NS a second time)');
});

test('a freshly written (9-field) bookmark URL still round-trips exactly through the new encoding', () => {
  const t = CATALOGUE_EPOCH_NS + 999_999n;
  const params = new URLSearchParams();
  writeTimeToUrl(params, t);
  assert.equal(params.get('wv').split(',').length, 9, 'sanity: the current encoding now carries nine fields');
  assert.equal(resolveTimeFromUrl(params), t);
});

test('a genuinely pre-4D-contract URL (no wv at all) still falls back to the CATALOGUE_EPOCH_NS-relative offset interpretation', () => {
  const offsetNs = 86400_000_000_000n * 7n; // 7 days
  const params = new URLSearchParams(`date=${offsetNs}`);
  assert.equal(resolveTimeFromUrl(params), CATALOGUE_EPOCH_NS + offsetNs);
});

// ---------------------------------------------------------------------------
// 2026-10 biome-climate increment (W1-A-CLASSIFIER): the classifier, its
// shared climate field, the habitat evaluation and the survey are pinned and
// folded into MODEL_MANIFEST_ID, so an older bookmark shows the one-time
// "predates the current combined model" notice instead of silently landing on
// different ground. A change here must be a deliberate, reviewed bump.
// ---------------------------------------------------------------------------
test('biome-climate model versions are pinned and part of the model manifest', async () => {
  const { BIOME_VERSION, SURVEY_VERSION } = await import('../../src/surface-biomes.ts');
  const { CLIMATE_VERSION } = await import('../../src/surface-climate.ts');
  const { HABITAT_SUITABILITY_VERSION } = await import('../../src/habitat-suitability.ts');
  const { SURVEY_VERSION: SURVEY_REEXPORT } = await import('../../src/surface-survey.ts');
  const { MODEL_MANIFEST_ID } = await import('../../src/time-nav.ts');
  // Relief round 2026-10-03 (P4-RELIEF, re-pinned deliberately in r2):
  // surface-biomes-2-climate -> surface-biomes-2.1-sea-datum (height gates and
  // the climate measured from the current sea level), surface-climate-1 ->
  // surface-climate-1.1-geo-g (lapse gravity from planet-geophysics),
  // surface-survey-2 -> surface-survey-2.1-relief (survey sites move with the
  // relief terrain). habitat-suitability-1 is unchanged.
  assert.equal(BIOME_VERSION, 'surface-biomes-2.1-sea-datum', 'was surface-biomes-2-climate (was surface-biomes-1: climate snowline, treeline forest window and labels, dry belt)');
  // BIOME2-CLIMATE M1 (2026-10-08, docs/surface-climate-v2.md): surface-climate-1.1-geo-g -> surface-climate-2
  // (PDD snow, warm-column lapse, warmest-month ceiling, heat cap, PET effective moisture, ITCZ zonal band).
  assert.equal(CLIMATE_VERSION, 'surface-climate-2', 'was surface-climate-1.1-geo-g (lapse gravity from planet-geophysics); was surface-climate-1 (per-planet annual climate field)');
  assert.equal(HABITAT_SUITABILITY_VERSION, 'habitat-suitability-1', 'new: niche evaluation against the climate field');
  assert.equal(SURVEY_VERSION, 'surface-survey-2.1-relief', 'was surface-survey-2 (was surface-survey-1: survey sites move through classifier v2)');
  assert.equal(SURVEY_REEXPORT, SURVEY_VERSION);
  const parts = MODEL_MANIFEST_ID.split('|');
  for (const v of [BIOME_VERSION, CLIMATE_VERSION, HABITAT_SUITABILITY_VERSION, SURVEY_VERSION]) assert.ok(parts.includes(v), `${v} missing from MODEL_MANIFEST_ID`);
});

// ---------------------------------------------------------------------------
// 2026-10 relief round (P6-HARNESS-REPIN): the relief model versions are
// folded into MODEL_MANIFEST_ID, BUILD_VERSION moves, and a bookmark from
// before terrain-1.8.0 gets the one-time relief notice. Its address,
// catalogue and date are unchanged (golden systems digest unchanged), so it
// still opens the same place and date.
// ---------------------------------------------------------------------------
test('relief model versions are pinned and part of the model manifest; build version moved', async () => {
  const { GEOPHYSICS_VERSION } = await import('../../src/planet-geophysics.ts');
  const { LANDFORM_SHAPE_VERSION, LANDFORM_VERSION } = await import('../../src/planet-landforms.ts');
  const { OCEAN_VOLUME_VERSION } = await import('../../src/ocean-volume.ts');
  const { LOD_LADDER_VERSION } = await import('../../src/lod-ladder.ts');
  const { PLACE_QUERY_VERSION } = await import('../../src/place-query.ts');
  assert.equal(GEOPHYSICS_VERSION, 'planet-geophysics-1', 'new (P1)');
  assert.equal(LANDFORM_SHAPE_VERSION, 'planet-landforms-shape-2', 'new (P4): the landform shaping; the landform seed version is unchanged');
  assert.equal(LANDFORM_VERSION, 'planet-landforms-1', 'unchanged: it seeds the landform noise');
  assert.equal(OCEAN_VOLUME_VERSION, 'ocean-volume-1', 'new (P2)');
  assert.equal(LOD_LADDER_VERSION, 'lod-ladder-4', 'lod-ladder-4 adds the M5 riser reduction (docs/mountain-riser-lod-2026-10-07.md); was lod-ladder-1, new in P3 (mountains cost plan T3: declared M3 carving reduction; tolerances unchanged)');
  assert.equal(PLACE_QUERY_VERSION, 'place-query-2', 'was place-query-1 (new in P2); backlog task 16: coastAt, altitude pressure, rung answer, versions.lodLadder (docs/place-query-v2.md)');
  assert.equal(TERRAIN_VERSION, 'terrain-1.10.1-forest-colour', 'was terrain-1.9.1-carving-c1 (BIOME2-CLIMATE M1: land colour reads surface-climate-2); was terrain-1.9.0-mountains (carving C1: mountain-carving-3 + mountain-assembly-4); was terrain-1.8.1-grain (mountains cost plan T6: M1-M5 wired); was terrain-1.8.0-relief (step G: reduced 800 m land colour grain)');
  assert.equal(BUILD_VERSION, 'atlas-client-2026-10-round2-1', 'was atlas-client-2026-10-relief-1 (round 2: landing-site-1, ocean-present)');
  const parts = MODEL_MANIFEST_ID.split('|');
  for (const v of [GEOPHYSICS_VERSION, LANDFORM_SHAPE_VERSION, OCEAN_VOLUME_VERSION, LOD_LADDER_VERSION, PLACE_QUERY_VERSION])
    assert.ok(parts.includes(v), `${v} missing from MODEL_MANIFEST_ID`);
});

test('a terrain-1.7.0 bookmark loads with the relief notice; a current (1.8.0) bookmark loads without it', () => {
  const current = new URLSearchParams({ seed: SEED });
  writeTimeToUrl(current, CATALOGUE_EPOCH_NS);
  assert.equal(compatibilityNoticeFromUrl(current), null, 'a 1.8.0 bookmark needs no notice');
  const old = new URLSearchParams(current);
  old.set('wv', encodeVersions({ ...CURRENT_VERSIONS, terrain: 'terrain-1.7.0-climate-colour', surface: 'atlas-surface-7-no-inland-rivers' }));
  old.set('mv', 'pre-relief-manifest');
  old.set('bv', 'atlas-client-2026-10-biome-climate-1');
  const notice = compatibilityNoticeFromUrl(old);
  assert.ok(notice.includes(RELIEF_RECALIBRATED_NOTICE), `relief notice present: ${notice}`);
  assert.match(notice, /older surface, terrain model versions/);
  assert.match(RELIEF_RECALIBRATED_NOTICE, /terrain-1\.8\.0/);
  assert.equal(resolveTimeFromUrl(old), resolveTimeFromUrl(current), 'same date');
  // A 1.8.0 bookmark from before the manifest/build bump gets only the lighter notices.
  const manifestOnly = new URLSearchParams(current);
  manifestOnly.set('mv', 'pre-relief-manifest');
  const manifestNotice = compatibilityNoticeFromUrl(manifestOnly);
  assert.ok(manifestNotice && !manifestNotice.includes(RELIEF_RECALIBRATED_NOTICE), 'no relief notice for a 1.8.0 terrain');
});

test('ground bookmarks re-snap to the new ground height: main.ts restores ?walk= by direction only', async () => {
  // The relief recalibration moved every ground height. A restored ?walk=
  // bookmark must use only the saved DIRECTION and land at the current
  // terrain height (never inside or far above the new ground). Pinned on the
  // source: prepareLanding normalises the saved point and re-samples the
  // surface. A now-flooded site (landing-site-1, round 2 LANDING-FIXES) is
  // resolved by src/landing-site.ts resolveGroundBookmark under
  // FLOODED_GROUND_BOOKMARK (default: keep the saved place, hover above the
  // water; OPEN owner item in docs/relief-round-2026-10-03.md). The resolver's
  // outcome is tested in tests/landing-site.test.mjs; this pin only records
  // that a restored bookmark reaches it before the terrain-search fallback,
  // which is kept for a non-bookmark landing over water.
  const source = (await readFile(new URL('../../src/main.ts', import.meta.url), 'utf8')).replace(/\r\n/g, '\n');
  assert.ok(source.includes("const d=relative.normalize(),s=surfaceSample(body,d.toArray() as V3);"), 'saved point reduced to a direction and re-sampled');
  assert.ok(source.includes('const point=d.multiplyScalar(body.radiusM+s.rockHeightM+.92).toArray() as V3;'), 'landing point is the CURRENT ground height');
  const resolver = source.indexOf('if(!s.walkable&&savedPoint){'), fallback = source.indexOf('if(!s.walkable){if(exploreTerrain())landAfterCruise=true;return;}');
  assert.ok(resolver > 0 && fallback > resolver, 'a now-flooded restored bookmark is resolved (landing-site.ts) before the terrain-search fallback');
});
