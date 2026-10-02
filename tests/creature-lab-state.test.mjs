import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_LAB_STATE, parseCreatureLabState, creatureLabUrl, creatureLabReplayInputError, creatureLabTemplateMismatch } from '../src/creature-lab-state.ts';
import {faunaTemplateRevisionLocation} from '../src/fauna-template-revisions.ts';

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

test('authored reference URLs retain six bounded morph controls and source selection', () => {
  const state = { ...DEFAULT_LAB_STATE, mode: 'skin', source: 'blender-reference', assetHash: 'a1'.repeat(32), pose: 'neutral', compare: true,
    bodyCondition: -.8, neckLength: .5, legLength: -1, muzzleLength: 1, earSize: .23, juvenile: .6 };
  assert.deepEqual(parseCreatureLabState(new URL(creatureLabUrl('https://example.test/lab', state)).search), state);
  const invalid = parseCreatureLabState('?source=https://untrusted.test/a.glb&bodyCondition=7&neckLength=-8&legLength=NaN&muzzleLength=Infinity&earSize=.4&juvenile=-1');
  assert.equal(invalid.source, 'procedural');
  assert.equal(invalid.bodyCondition, 1); assert.equal(invalid.neckLength, -1);
  assert.equal(invalid.legLength, 0); assert.equal(invalid.muzzleLength, 0);
  assert.equal(invalid.earSize, .4); assert.equal(invalid.juvenile, 0);
  assert.equal(parseCreatureLabState('?assetHash=invalid').assetHash, '');
  assert.equal(parseCreatureLabState(`?assetHash=${'AB'.repeat(32)}`).assetHash, 'ab'.repeat(32));
});

test('recipe and trait locks round-trip alongside authoritative manual values and pinned asset revision', () => {
  const state = {...DEFAULT_LAB_STATE, source: 'blender-reference', templateRecipe: 'deer-individual-1',
    morphLocks: 'bodyCondition,juvenile', bodyCondition: -.873, neckLength: .777, juvenile: .37, assetHash: 'ef'.repeat(32)};
  const replay = parseCreatureLabState(new URL(creatureLabUrl('https://example.test/lab', state)).search);
  assert.deepEqual(replay, state, 'parsing never regenerates stored morphology');
  const malformed = parseCreatureLabState('?templateRecipe=unknown-v99&morphLocks=earSize,bogus,juvenile,earSize,__proto__,bodyCondition');
  assert.equal(malformed.templateRecipe, 'manual');
  assert.equal(malformed.morphLocks, 'bodyCondition,earSize,juvenile');
  const legacy = parseCreatureLabState('?source=blender-reference&bodyCondition=.44&juvenile=.3');
  assert.equal(legacy.templateRecipe, 'manual'); assert.equal(legacy.morphLocks, '');
  assert.equal(legacy.bodyCondition, .44); assert.equal(legacy.juvenile, .3);
});

test('version 2 replay pins GLB and sidecar bytes; legacy GLB-only pins remain explicit',()=>{
  const state={...DEFAULT_LAB_STATE,source:'blender-reference',replayVersion:2,assetHash:'ab'.repeat(32),sidecarHash:'cd'.repeat(32),bodyCondition:.4};
  const query=new URL(creatureLabUrl('https://example.test/lab',state)).search;
  assert.deepEqual(parseCreatureLabState(query),state);assert.equal(creatureLabReplayInputError(query),null);
  assert.equal(creatureLabTemplateMismatch(state,{sourceHash:state.assetHash,sidecarHash:state.sidecarHash}),null);
  assert.match(creatureLabTemplateMismatch(state,{sourceHash:state.assetHash,sidecarHash:'ef'.repeat(32)}),/sidecar revision/);
  assert.match(creatureLabTemplateMismatch(state,{sourceHash:'ef'.repeat(32),sidecarHash:state.sidecarHash}),/GLB revision/);
  const legacyQuery=`?source=blender-reference&assetHash=${state.assetHash}`,legacy=parseCreatureLabState(legacyQuery);
  assert.equal(legacy.replayVersion,1);assert.equal(legacy.sidecarHash,'');assert.equal(creatureLabReplayInputError(legacyQuery),null);
  assert.equal(creatureLabTemplateMismatch(legacy,{sourceHash:state.assetHash,sidecarHash:'ef'.repeat(32)}),null,'Legacy GLB pin makes no sidecar pin claim');
  assert.equal(parseCreatureLabState('?sidecarHash='+state.sidecarHash.toUpperCase()).sidecarHash,state.sidecarHash);
  for(const suffix of ['&sidecarHash=bad','&replayVersion=3','&replayVersion=2','&sidecarHash='+state.sidecarHash+'&sidecarHash='+state.sidecarHash])assert.ok(creatureLabReplayInputError(legacyQuery+suffix),'Malformed/incomplete pins must not silently become legacy');
  assert.equal(parseCreatureLabState('?sidecarHash=bad').sidecarHash,'');
});

test('retained fauna resolver uses only registered local paths and complete revision pairs',()=>{
  const pins={assetHash:'AB'.repeat(32),sidecarHash:'CD'.repeat(32)},route=faunaTemplateRevisionLocation('deer-doe-v1',pins);
  assert.equal(route.retained,true);assert.equal(route.runtimePath,`assets/fauna/deer-doe-v1/revisions/${pins.assetHash.toLowerCase()}/${pins.sidecarHash.toLowerCase()}/deer-doe.glb`);
  assert.equal(route.sidecarPath,route.relativeRoot+'fauna-template.json');
  for(const assetHash of['','ab'.repeat(32)])assert.equal(faunaTemplateRevisionLocation('deer-doe-v1',{assetHash,sidecarHash:''}).runtimePath,'assets/fauna/deer-doe-v1/deer-doe.glb','Legacy GLB-only links retain default resolution and later GLB guard');
  for(const value of['../else','https://example.test/evil','0'.repeat(63),'a/'.repeat(32)])assert.throws(()=>faunaTemplateRevisionLocation('deer-doe-v1',{...pins,sidecarHash:value}),/hash/);
  for(const key of ['unknown','__proto__','toString'])assert.throws(()=>faunaTemplateRevisionLocation(key,pins),/Unknown/);
  assert.throws(()=>faunaTemplateRevisionLocation('deer-doe-v1',{assetHash:'',sidecarHash:pins.sidecarHash}),/requires/);
});
