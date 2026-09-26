// Shared helpers for the docs/time-and-coordinates-contract.md §6.4
// acceptance-test suite (tests/acceptance/*.test.mjs). Not itself a *.test.mjs
// file, exactly like tests/canonical-json.mjs.
//
// ⚠ RUN THE FOUR *.test.mjs FILES EXPLICITLY — never `node --test
// tests/acceptance/`. Given the directory, node executes THIS file as a test
// file too; it registers zero tests, and node then reports the whole directory
// as a failing test (`tests\acceptance:1:1`, message 'test failed') with no
// child assertion naming a cause — a phantom failure that has already cost one
// debugging round. Measured: the directory form reported 194/195 with the only
// failure being that wrapper, while the same suites with the four files listed
// explicitly reported 233/233. package.json's "test" script lists them
// explicitly and is therefore unaffected; keep it that way.
import { createHash } from 'node:crypto';
import { galaxies, sector, system } from '../../src/catalog.ts';
import { canonicalJSON } from '../canonical-json.mjs';

/** The de facto standard fixture seed used across every existing
 * *.test.mjs in this repo (river-determinism, stellar-evolution,
 * world-surface, galaxy-hierarchy's SEED, world.test.mjs, ...). Reused here
 * so this suite exercises the same real, already-verified catalogue content
 * rather than inventing a parallel universe nobody else has looked at. */
export const SEED = 'LETHRA-001';

export function sha256(value) {
  const text = typeof value === 'string' ? value : canonicalJSON(value);
  return createHash('sha256').update(text).digest('hex');
}

/** Placeholder BodyAddress, matching the identical convention already
 * established in tests/stellar-evolution.test.mjs and
 * tests/world-surface.test.mjs (starLifecycle/planetLifecycle key entirely
 * off body.seed and never read this value — see stellar-evolution.ts's own
 * header comment). */
export const dummyAddress = {
  clusterCell: [0n, 0n, 0n], groupCell: [0n, 0n, 0n], galaxyOrdinal: 0,
  sectorCell: [0n, 0n, 0n], genCell: [0n, 0n, 0n], systemOrdinal: 0, slot: 'star/0',
};

/** Deterministic PRNG (not Math.random) for reproducible test-only shuffles
 * and step sizes — identical pattern to tests/stellar-evolution.test.mjs's
 * own mulberry32. */
export function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashIndex(seed) {
  let h = 0;
  for (const c of seed) h = (h * 131 + c.charCodeAt(0)) >>> 0;
  return h;
}

/** A deterministic pseudo-shuffle (not Math.random, for a stable CI diff) —
 * same technique tests/galaxy-hierarchy.test.mjs uses. */
export function pseudoShuffle(arr) {
  return arr.map((_, i) => arr[(i * 29 + 13) % arr.length]);
}

/** Gathers a real corpus of stars/planets/moons (paired with their true host
 * star, falling back to the system primary for a binary) from the live
 * procedural catalogue, starting at sector x=`startCx` and walking outward —
 * the same "real generated bodies, not synthetic fixtures" pattern
 * tests/stellar-evolution.test.mjs and tests/world-surface.test.mjs already
 * use, parameterized so different acceptance files can pull independent,
 * non-overlapping sector ranges from the one shared catalogue seed. */
export function buildCorpus(minStars, startCx = 900) {
  const g = galaxies(SEED)[0];
  const stars = [], planets = [], moons = [];
  let cx = startCx;
  while (stars.length < minStars) {
    const refs = sector(g, [cx, 0, 0]).refs;
    for (const ref of refs) {
      const sys = system(ref);
      const primary = sys.stars[0];
      for (const star of sys.stars) stars.push(star);
      for (const planet of sys.planets) {
        const star = sys.stars.find(s => s.id === planet.parentId) || primary;
        planets.push({ planet, star, bodyAddress: planet.id });
      }
      for (const moon of sys.moons) {
        const planet = sys.planets.find(p => p.id === moon.parentId);
        if (!planet) continue;
        const star = sys.stars.find(s => s.id === planet.parentId) || primary;
        moons.push({ moon, planet, star, bodyAddress: moon.id });
      }
      if (stars.length >= minStars) break;
    }
    cx++;
    if (cx > startCx + 1500) throw new Error('could not gather enough stars from the catalogue corpus');
  }
  return { stars, planets, moons };
}
