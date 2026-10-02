import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_LAB_STATE, parseCreatureLabState, creatureLabUrl } from '../src/creature-lab-state.ts';

test('specimen URLs preserve identity, growth, frame, comparison and dated pose', () => {
  const state = { ...DEFAULT_LAB_STATE, seed: 'A & B/æ', profile: 'cold', species: 'world/animal:2', mode: 'skin', variant: 3,
    growth: 'juvenile', frame: 'head', family: 'winged', view: 'side', pose: 'walk', time: 47.25, date: -91, compare: true, compareVariant: 2, compareGrowth: 'adult', neutral: true, skeleton: true };
  const url = new URL(creatureLabUrl('https://example.test/nested/creature-lab.html?old=1#old', state));
  assert.equal(url.pathname, '/nested/creature-lab.html'); assert.equal(url.hash, ''); assert.equal(url.searchParams.has('old'), false);
  assert.deepEqual(parseCreatureLabState(url.search), state);
});
test('malformed shared state is bounded before generation or posing', () => {
  const state = parseCreatureLabState('?profile=bogus&mode=typo&variant=99&compareVariant=-4&time=Infinity&date=-999999&growth=bad&pose=bad&frame=bad&compare=true&seed=%00%0A');
  assert.equal(state.variant, 3); assert.equal(state.compareVariant, 0); assert.equal(state.date, -20000);
  assert.equal(state.time, 0); assert.equal(state.compare, false); assert.equal(state.seed, DEFAULT_LAB_STATE.seed);
  assert.equal(state.profile, 'temperate'); assert.equal(state.mode, 'gallery'); assert.equal(state.pose, 'dated');
  assert.equal(parseCreatureLabState('?variant=1.9&time=999').variant, 1);
  assert.equal(parseCreatureLabState('?variant=1.9&time=999').time, 120);
  assert.equal(parseCreatureLabState(`?seed=${'x'.repeat(200)}`).seed.length, 160);
  assert.deepEqual(parseCreatureLabState(''), DEFAULT_LAB_STATE);
});
