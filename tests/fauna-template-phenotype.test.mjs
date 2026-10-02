import test from 'node:test';
import assert from 'node:assert/strict';
import {DEER_INDIVIDUAL_RECIPE, deerIndividualMorphs, applyDeerIndividualRecipe, templateMorphLocks} from '../src/fauna-template-phenotype.ts';

const identity = {seed: 'fixture', profile: 'temperate', species: 'deer/01', variant: 2, growth: 'adult'};
const correlate = (rows, a, b) => {
  const mean = key => rows.reduce((sum, row) => sum + row[key], 0) / rows.length;
  const ma = mean(a), mb = mean(b);
  return rows.reduce((sum, row) => sum + (row[a] - ma) * (row[b] - mb), 0) /
    Math.sqrt(rows.reduce((sum, row) => sum + (row[a] - ma) ** 2, 0) * rows.reduce((sum, row) => sum + (row[b] - mb) ** 2, 0));
};

test('versioned deer recipe is deterministic, pure and separate from temporary dated activity', () => {
  assert.equal(DEER_INDIVIDUAL_RECIPE, 'deer-individual-1');
  const frozen = Object.freeze({...identity}), a = deerIndividualMorphs(frozen);
  assert.deepEqual(a, {bodyCondition: -.29, neckLength: .23, legLength: .23, muzzleLength: .13, earSize: .02, juvenile: 0}, 'recipe-v1 golden; change the version before changing this output');
  deerIndividualMorphs({...identity, variant: 0});
  assert.deepEqual(deerIndividualMorphs(frozen), a);
  assert.deepEqual(deerIndividualMorphs({...identity, date: -500, time: 23, pose: 'walk'}), a);
  for (const [key, value] of [['seed', 'other'], ['profile', 'cold'], ['species', 'deer/02'], ['variant', 3]]) {
    assert.notDeepEqual(deerIndividualMorphs({...identity, [key]: value}), a, key);
  }
  assert.throws(() => deerIndividualMorphs({...identity, variant: NaN}));
  assert.throws(() => deerIndividualMorphs({...identity, growth: 'unbounded'}));
});

test('growth keeps adult identity offsets and uses the authored juvenile morph once', () => {
  const adult = deerIndividualMorphs(identity), juvenile = deerIndividualMorphs({...identity, growth: 'juvenile'});
  assert.equal(adult.juvenile, 0); assert.equal(juvenile.juvenile, 1);
  for (const key of ['bodyCondition', 'neckLength', 'legLength', 'muzzleLength', 'earSize']) assert.equal(juvenile[key], adult[key]);
  assert.deepEqual(deerIndividualMorphs(identity), adult);
});

test('broad fixed corpus stays restrained, varies individuals and retains intended shape correlations', () => {
  const rows = [];
  for (let seed = 0; seed < 64; seed++) for (let species = 0; species < 8; species++) {
    const individuals = [];
    for (let variant = 0; variant < 4; variant++) {
      const row = deerIndividualMorphs({...identity, seed: `corpus/${seed}`, species: `species/${species}`, variant});
      for (const [key, value] of Object.entries(row)) {
        assert.ok(Number.isFinite(value), key);
        assert.ok(Math.abs(value) <= .65, `${key}: ${value}`);
        assert.ok(Math.abs(value * 100 - Math.round(value * 100)) < 1e-8, 'slider precision');
      }
      individuals.push(JSON.stringify(row)); rows.push(row);
    }
    assert.equal(new Set(individuals).size, 4, 'each of four identities is distinct');
  }
  assert.equal(rows.length, 2048);
  assert.ok(correlate(rows, 'neckLength', 'legLength') > .9, 'length changes are coherent');
  assert.ok(correlate(rows, 'bodyCondition', 'legLength') < -.45, 'stockier builds have shorter relative limbs');
  assert.ok(correlate(rows, 'muzzleLength', 'earSize') > .65, 'head details share a restrained factor');
});

test('locks preserve exact chosen values across reseed, individual and growth changes without mutating inputs', () => {
  const current = Object.freeze({bodyCondition: -.873, neckLength: .55, juvenile: .37});
  const locks = Object.freeze(['bodyCondition', 'juvenile']);
  for (const next of [identity, {...identity, seed: 'new'}, {...identity, variant: 0}, {...identity, growth: 'juvenile'}]) {
    const actual = applyDeerIndividualRecipe(next, current, locks);
    assert.equal(actual.bodyCondition, current.bodyCondition); assert.equal(actual.juvenile, current.juvenile);
    assert.equal(actual.neckLength, deerIndividualMorphs(next).neckLength);
  }
  assert.deepEqual(applyDeerIndividualRecipe(identity, {}, []), deerIndividualMorphs(identity));
  assert.throws(() => applyDeerIndividualRecipe(identity, {earSize: NaN}, ['earSize']));
  assert.deepEqual(templateMorphLocks('earSize,bogus,juvenile,earSize,bodyCondition,__proto__'), ['bodyCondition', 'earSize', 'juvenile']);
});
