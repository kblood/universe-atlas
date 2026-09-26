/** App-level t-seek independence (contract §6.4 test 3), exercised against
 * REAL catalogue bodies through the same lifecycle/existence queries
 * src/main.ts wires into rendering (galaxyStateAt/starStateAt/
 * planetStateAt/biosphereStateAt) and the same digest shape exposed live via
 * `window.__atlas.existenceDigest`. Pure Node — no browser — per the task's
 * instruction to extract pure helpers rather than test the DOM: main.ts's
 * own existence-gating call sites do nothing but call these same functions
 * with the current `t`, so proving THIS is order/path-independent proves the
 * app-level property without needing a headless browser to also prove it. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { galaxies, system, refByAddress, sector } from '../src/catalog.ts';
import { parseAddress } from '../src/address.ts';
import { galaxyLifecycle, galaxyStateAt } from '../src/galaxy-history.ts';
import { starLifecycle, starStateAt, planetLifecycle, planetStateAt } from '../src/stellar-evolution.ts';
import { biosphereStateAt } from '../src/world-surface.ts';
import { CATALOGUE_EPOCH_NS, YEAR_NS } from '../src/world-time.ts';
import { canonicalDigest, CURRENT_VERSIONS } from '../src/time-nav.ts';

const SEED = 'LETHRA-TIME-NAV-TEST';

function firstPlanetWithOrbit(sys) {
  return sys.planets.find((p) => p.orbit) || sys.planets[0];
}

function findSystemWithPlanet(galaxy) {
  // Scan a handful of sectors near the origin until we find a system with at
  // least one planet — deterministic (same seed => same result every run).
  for (let gx = -2; gx <= 2; gx++) {
    for (let gz = -2; gz <= 2; gz++) {
      const data = sector(galaxy, [gx, 0, gz], 64);
      for (const ref of data.refs) {
        const sys = system(ref);
        if (sys.planets.length > 0 && sys.stars.length > 0) return sys;
      }
    }
  }
  throw new Error('test setup: no system with a planet found nearby');
}

function bodyAddressFor(sys, body) {
  const sysAddress = parseAddress(sys.ref.id);
  const slot = body.id.slice(sys.ref.id.length + 1);
  return { ...sysAddress, slot };
}

function digestAt(t, galaxyAddr, gLifecycle, starAddr, starBody, starLc, planetAddr, planetBody, planetLc, seed, sysId) {
  const galaxyState = galaxyStateAt(gLifecycle, t);
  const starState = starStateAt(starLc, t);
  const planetState = planetStateAt(planetLc, starLc, t);
  const bio = (planetState.stage === 'molten' || planetState.stage === 'solid')
    ? biosphereStateAt(seed, sysId, planetBody, t, 'baseline', CURRENT_VERSIONS, starLc)
    : null;
  return canonicalDigest({
    galaxy: galaxyState.stage,
    star: starState.stage,
    planet: planetState.stage,
    biosphere: bio ? bio.stage : null,
  });
}

test('t-seek independence at the app level: the existence digest is a pure function of t — reaching the same t via different arithmetic paths, and in shuffled order, always agrees', () => {
  const catalogue = galaxies(SEED);
  const galaxy = catalogue[0];
  const galaxyAddr = parseAddress(galaxy.id);
  const gLifecycle = galaxyLifecycle(SEED, galaxyAddr);

  const sys = findSystemWithPlanet(galaxy);
  const starBody = sys.stars[0];
  const planetBody = firstPlanetWithOrbit(sys);
  const starAddr = bodyAddressFor(sys, starBody);
  const planetAddr = bodyAddressFor(sys, planetBody);
  const starLc = starLifecycle(SEED, starAddr, starBody);
  const planetLc = planetLifecycle(SEED, planetAddr, planetBody, starLc);
  const at = (t) => digestAt(t, galaxyAddr, gLifecycle, starAddr, starBody, starLc, planetAddr, planetBody, planetLc, SEED, sys.ref.id);

  // Interesting target instants: well before star formation, right around
  // formation/cooling, at the catalogue epoch, and during/after the star's
  // giant phase (the engulfment window) — every stage boundary this package
  // gates rendering on. Each target is also reconstructed via a SECOND,
  // independent BigInt arithmetic path (e.g. "formation + delta" vs
  // "remnant - (remnant - formation - delta)") — exact BigInt arithmetic
  // guarantees the two paths land on the identical integer nanosecond
  // value, so this checks that the digest genuinely depends on nothing but
  // that value (contract §1.2 rule 2: no visit-order, no accumulated state).
  const targets = [
    starLc.formationNs > 1_000_000n * YEAR_NS ? starLc.formationNs - 1_000_000n * YEAR_NS : 0n,
    starLc.formationNs + 1_000_000n * YEAR_NS,
    planetLc.formationNs,
    planetLc.coolingNs + 1_000_000n * YEAR_NS,
    CATALOGUE_EPOCH_NS,
    starLc.giantNs + 1_000_000n * YEAR_NS,
    starLc.remnantNs + 1_000_000n * YEAR_NS,
  ].filter((t) => t >= 0n);

  const forward = targets.map((t) => at(t));
  const reconstructed = targets.map((t) => at(starLc.remnantNs - (starLc.remnantNs - t)));
  assert.deepEqual(reconstructed, forward, 'digest must match when t is reached via a different arithmetic path');

  const byT = new Map(targets.map((t, i) => [t.toString(), forward[i]]));
  const shuffled = [targets[3], targets[0], targets[targets.length - 1], targets[1]];
  for (const t of shuffled) assert.equal(at(t), byT.get(t.toString()), 'visit order must not affect the digest at a given t');
  // Repeated evaluation is bit-identical (no hidden mutable/cache state).
  for (const t of targets) assert.equal(at(t), at(t));
});

test('headline bug check: a planet never reports solid/molten existence before its host star has formed', () => {
  const catalogue = galaxies(SEED);
  const galaxy = catalogue[0];
  const sys = findSystemWithPlanet(galaxy);
  const starBody = sys.stars[0];
  const planetBody = firstPlanetWithOrbit(sys);
  const starAddr = bodyAddressFor(sys, starBody);
  const planetAddr = bodyAddressFor(sys, planetBody);
  const starLc = starLifecycle(SEED, starAddr, starBody);
  const planetLc = planetLifecycle(SEED, planetAddr, planetBody, starLc);
  assert.ok(planetLc.formationNs >= starLc.formationNs, 'a planet cannot form before its star');
  const beforeStar = starLc.formationNs > 10_000_000n * YEAR_NS ? starLc.formationNs - 10_000_000n * YEAR_NS : 0n;
  const planetState = planetStateAt(planetLc, starLc, beforeStar);
  assert.equal(planetState.stage, 'unformed', 'planet must not exist before its star has formed');
});
