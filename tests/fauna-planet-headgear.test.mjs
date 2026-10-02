/** Planet headgear (fauna face round WP3): only hoofed browsers grow horns.
 * A productised planet-horn-census on the PRODUCTION phenotype path
 * (realisticIndividualCreatureGenome with family undefined, as fauna-runtime
 * calls it): 40 species x 4 variants x 2 stages per archetype. Before this
 * round, padded (badger/bear-like) low-slung animals carried forehead horns
 * (adults 101/112, juveniles 33/112 above 1 cm); browsers (ungulates) must be
 * unchanged to the bit. Every zeroed padded genome discloses the drop once in
 * its mutationLog. Founders and the input genome are untouched. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { generateCreatureGenome, realisticIndividualCreatureGenome, validateCreatureGenome } from '../src/creature-model.ts';
import { faunaSpeciesDimorphism } from '../src/fauna-appearance.ts';

const ARCHETYPES = ['browser', 'runner', 'low-slung', 'long-neck'];
const HORN_LOG = 'face: horns not grown (only hoofed browsers carry horns)';
const HORNED = .01; // the census threshold: a horn longer than 1 cm is visible

function census() {
  const rows = {}, specimens = [];
  for (const archetype of ARCHETYPES) for (let s = 0; s < 40; s++) {
    const seed = `CENSUS/${archetype}/${s}`, founder = generateCreatureGenome(seed, archetype);
    const before = JSON.stringify(founder);
    for (let v = 0; v < 4; v++) for (const stage of ['adult', 'juvenile']) {
      const g = realisticIndividualCreatureGenome(founder, `${seed}/m`, v, stage);
      const key = `${g.morphology.family}/${stage}`;
      const r = rows[key] ??= { n: 0, horned: 0, anyHorn: 0, sum: 0, max: 0, logs: 0 };
      r.n++; if (g.hornLength > HORNED) { r.horned++; r.sum += g.hornLength; }
      if (g.hornLength > 0) r.anyHorn++;
      r.max = Math.max(r.max, g.hornLength);
      const logs = g.mutationLog.filter(l => l.endsWith(HORN_LOG)).length;
      r.logs += logs;
      specimens.push({ archetype, founder, g, stage, logs });
    }
    assert.equal(JSON.stringify(founder), before, `${seed}: founder genome must not be mutated`);
  }
  return { rows, specimens };
}
const { rows, specimens } = census();

test('production path: padded animals grow no horns at any stage', t => {
  t.diagnostic(JSON.stringify(rows));
  assert.equal(rows['padded/adult'].n, 112);
  assert.equal(rows['padded/juvenile'].n, 112);
  assert.equal(rows['padded/adult'].horned, 0, 'padded adults horned (was 101/112)');
  assert.equal(rows['padded/juvenile'].horned, 0, 'padded juveniles horned (was 33/112)');
  assert.equal(rows['padded/adult'].max, 0);
  assert.equal(rows['padded/juvenile'].max, 0);
});

test('production path: hoofed browsers keep their horns exactly', () => {
  const adult = rows['ungulate/adult'], young = rows['ungulate/juvenile'];
  assert.equal(adult.n, 160);
  assert.equal(adult.horned, 144);
  assert.equal(+(adult.sum / adult.horned).toFixed(3), .215);
  // Pinned from main a9e3654 before the rule: the rule never runs for ungulates.
  assert.ok(Math.abs(adult.sum - 31.032) < 1e-9, `ungulate adult horn sum ${adult.sum}`);
  assert.equal(adult.max, .31);
  assert.equal(young.horned, 131);
  assert.ok(Math.abs(young.sum - 3.542) < 1e-9, `ungulate juvenile horn sum ${young.sum}`);
  assert.equal(young.max, .057);
  assert.equal(adult.logs + young.logs, 0, 'ungulates never carry the horn-drop disclosure');
});

test('production path: runners, long necks and proboscideans stay hornless', () => {
  for (const family of ['cursorial', 'long-neck', 'proboscidean']) for (const stage of ['adult', 'juvenile']) {
    const r = rows[`${family}/${stage}`];
    assert.ok(r && r.n > 0, `${family}/${stage} present`);
    assert.equal(r.anyHorn, 0, `${family}/${stage}`);
    // Their founders (or the proboscidean floor) already had no horns, so no drop is disclosed.
    assert.equal(r.logs, 0, `${family}/${stage} disclosure`);
  }
  assert.equal(rows['cursorial/adult'].n, 160);
  assert.equal(rows['long-neck/adult'].n, 160);
  assert.equal(rows['proboscidean/adult'].n, 48);
});

test('every zeroed padded genome discloses the drop exactly once', () => {
  let zeroed = 0;
  for (const { founder, g, logs, stage } of specimens) {
    if (g.morphology.family !== 'padded') continue;
    // Pre-rule, a padded specimen has horns iff its founder does and it is not
    // a female of a hornless-female species (every other factor is positive).
    const female = g.appearance.individual.sex === 'female';
    const wouldHaveHorns = founder.hornLength > 0 && !(female && faunaSpeciesDimorphism(founder).hornlessFemales);
    assert.equal(g.hornLength, 0);
    assert.equal(logs, wouldHaveHorns ? 1 : 0, `${stage} padded disclosure`);
    assert.ok(g.mutationLog.includes(`padded ${HORN_LOG}`) === wouldHaveHorns);
    assert.deepEqual(validateCreatureGenome(g), []);
    if (wouldHaveHorns) zeroed++;
  }
  // 101 adults and 101 juveniles of 112 each had horns before the rule.
  assert.equal(zeroed, 202);
  assert.equal(rows['padded/adult'].logs, 101);
  assert.equal(rows['padded/juvenile'].logs, 101);
});

test('founders keep their inherited hornLength (no new draws, no reroll)', () => {
  const lowSlung = specimens.filter(s => s.archetype === 'low-slung');
  assert.ok(lowSlung.some(s => s.founder.hornLength > 0), 'low-slung founders still carry the genome horn value');
  for (const s of specimens) assert.deepEqual(validateCreatureGenome(s.founder), []);
});

test('explicit-family Lab path: only the ungulate family carries horns', () => {
  for (let s = 0; s < 12; s++) for (const archetype of ['browser', 'low-slung']) {
    const founder = generateCreatureGenome(`HEADGEAR/${archetype}/${s}`, archetype);
    for (const family of ['ungulate', 'cursorial', 'padded', 'long-neck', 'proboscidean', 'winged']) {
      const g = realisticIndividualCreatureGenome(founder, `HEADGEAR/${archetype}/${s}/m`, s % 4, 'adult', family);
      if (family !== 'ungulate') assert.equal(g.hornLength, 0, `${archetype} as ${family}`);
      assert.ok(g.mutationLog.filter(l => l.endsWith(HORN_LOG)).length <= 1);
    }
  }
});
