# Build a game on Atlas: getting started

Universe Atlas is a deterministic universe: every galaxy, star, planet and
place is a pure function of a seed, an address and a date. A game built on it
does not store the world; it asks for it. This guide shows the four calls a game
needs to stand somewhere: **address -> date -> `placeAt` -> `coastAt`**.

The query surface is `src/place-query.ts`; its full field reference is
[place-query-v1.md](place-query-v1.md) with the additions in
[place-query-v2.md](place-query-v2.md). The example below is executed by
`tests/platform-getting-started.test.mjs`, so it stays correct.

## The four steps

1. **Address.** A universe seed (`'LETHRA-001'`) gives the galaxies
   (`galaxies(seed)`). A system address is `G<galaxy>/C<x>,<y>,<z>/<ordinal>`
   (galaxy, 4-light-year cell, ordinal in the cell); `refByAddress` resolves it
   and `system(ref)` generates the system with its `stars`, `planets` and
   `moons`. Body ids and addresses are stable: they never depend on the order in
   which anything was visited.
2. **Date.** Time is a BigInt count of nanoseconds since the Big Bang
   (`src/world-time.ts`). `CATALOGUE_EPOCH_NS` is "now" in the catalogue;
   `YEAR_NS` converts years. The same place at a different date can have a
   different sea level, climate or no surface at all (before the planet forms,
   after its star engulfs it).
3. **Place.** A place is a unit direction in the body frame (spin axis +Y).
   `placeAt({sys, body, t}, direction)` returns plain data: ground height,
   the dated sea level and water depth, gravity, air and air pressure, biome,
   annual climate and the version keys.
4. **Coast.** `coastAt({sys, body, t}, direction)` is the cheap sea-or-land
   answer: the sign of the ground height above the dated sea level. It always
   agrees with `placeAt`.

<!-- doctest:getting-started (tests/platform-getting-started.test.mjs runs this block from the repository root) -->
```js
import {galaxies, refByAddress, system} from './src/catalog.ts';
import {CATALOGUE_EPOCH_NS, YEAR_NS} from './src/world-time.ts';
import {sine, detCos} from './src/det-math.ts';
import {placeAt, coastAt, PLACE_VERSIONS} from './src/place-query.ts';

// 1. Address: seed -> galaxy -> system address -> body.
const galaxy = galaxies('LETHRA-001')[0];
const sys = system(refByAddress(galaxy, 'G001/C2128,0,1/0'));
const body = sys.planets[1]; // Maithea, an ocean world

// 2. Date: 500 million years after the catalogue epoch (BigInt nanoseconds).
const t = CATALOGUE_EPOCH_NS + 500_000_000n * YEAR_NS;

// 3. Place: latitude/longitude to a body-frame unit direction (spin axis +Y,
//    longitude measured from +X toward +Z). det-math trig keeps the direction,
//    and so the answer, bit-identical on every JavaScript engine.
function direction(latDeg, lonDeg) {
  const lat = latDeg * Math.PI / 180, lon = lonDeg * Math.PI / 180;
  const v = [detCos(lat) * detCos(lon), sine(lat), detCos(lat) * sine(lon)];
  const n = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  return [v[0] / n, v[1] / n, v[2] / n];
}
const ctx = {sys, body, t};
const here = direction(20, 45);
const place = placeAt(ctx, here);

// 4. Coast: which side of the dated shoreline, for here and a few neighbours.
const coast = coastAt(ctx, here);
const transect = [0, 10, 20, 30, 40].map(lon => coastAt(ctx, direction(20, lon)).seaSign);

console.log(JSON.stringify({
  body: body.name,
  exists: place.exists,
  groundHeightM: place.groundHeightM,
  seaLevelM: place.seaLevelM,
  ocean: place.ocean,
  waterDepthM: place.waterDepthM,
  airPressurePa: place.airPressurePa,
  gravityMS2: place.gravityMS2,
  biome: place.biome.name,
  heightAboveSeaM: coast.heightAboveSeaM,
  seaSign: coast.seaSign,
  transect,
  versions: place.versions,
  sameVersions: JSON.stringify(place.versions) === JSON.stringify(PLACE_VERSIONS),
}));
```

Notes for the example:

- `place.exists` is `false` (with a `stage` such as `'accreting'` or
  `'engulfed'`) when the body has no surface at `t`, and for stars. Check it
  before reading surface fields; nothing is fabricated for an absent place.
- Under the ocean `seabedHeightM` is a real, solid height at any depth, and
  `depthAndPressureAt(ctx, direction, depthM)` answers the water column down to
  it.
- `placeAt(ctx, direction, level, {rung: true})` adds `rung`: what the renderer's
  tile sampler shows at a tile level (a number) or ladder rung (`'S0'..'S4'`), for
  maps that must match what the player sees from orbit. The other fields stay
  the full-detail truth used for collision and physics.
- A cold first query on a mountain massif solves one carving block (about
  150 ms). When frame time matters, run `placeAt` in a worker and transfer the
  blocks with `exportPlaceBlocks` / `importPlaceBlocks` (place-query-v1.md,
  "Warm-up and residency transfer").

## The determinism promise

- Every answer is a pure function of (universe seed, address, date, direction,
  level, options) and the model versions in `versions`. The same inputs give
  the same answer on every machine, in every process and thread, and in any
  visit order; cross-engine identity is checked by the golden run
  (`npm run test:golden`). Caches only memoise pure results.
- Values that decide a height, an ocean flag or a class use deterministic
  arithmetic (`src/det-math.ts` instead of platform `Math.sin`/`exp`), so they
  are bit-identical across engines. Pass directions built the same way
  (det-math trig, as above) if your game needs bit-identity across engines too.
- The platform answers **what is here**, never **what it means for the
  player**. Survivability, damage, breathability, building rules and balance
  belong to your game (place-query-v1.md, "Game layer").

## Version keys

Every answer carries `versions` (placeQuery, surface, terrain, oceanVolume,
geophysics, biome, climate, lodLadder). When a model changes, its key changes.

- Store the version block next to anything you save or hash that was derived
  from a place (a base location, a cached map, a leaderboard seed). On load,
  compare it with `PLACE_VERSIONS`; if a key differs, re-query instead of
  trusting the stored values.
- The app folds the same keys into `MODEL_MANIFEST_ID` (`src/time-nav.ts`);
  a bookmark from an older model shows a one-time notice.
- A new field is a version bump of `placeQuery`; an existing field's value
  never changes without one.
