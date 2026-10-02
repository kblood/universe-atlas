import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_LAB_STATE, parseCreatureLabState, creatureLabUrl, creatureLabReplayInputError, creatureLabTemplateMismatch } from '../src/creature-lab-state.ts';
import {faunaTemplateRevisionLocation} from '../src/fauna-template-revisions.ts';
import {creatureLabComposerInputError, creatureLabInputNotices, creatureLabLightInputError, COMPOSER_HERD_SIZES} from '../src/creature-lab-state.ts';
import {decodeComposerRecipe, encodeComposerRecipe, composerPreset, composerSpeciesEqual, COMPOSER_RECIPE_MAX_TEXT} from '../src/fauna-composer-recipe.ts';
import {readFileSync} from 'node:fs';

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

// ---- Composer herd and review lighting (fauna variation round, WP5)

const composerState = extra => ({...DEFAULT_LAB_STATE, mode: 'composer', recipe: encodeComposerRecipe(composerPreset('giraffe')), ...extra});
const share = state => new URL(creatureLabUrl('https://example.test/creature-lab.html', state));

test('herd and light round-trip through composer links; light also through planet-skin links', () => {
  for (const herd of COMPOSER_HERD_SIZES) for (const light of ['studio', 'planet-noon', 'planet-evening']) {
    const state = composerState({herd, light, time: 3.5, view: 'side'}), url = share(state);
    assert.equal(url.searchParams.get('herd'), String(herd)); assert.equal(url.searchParams.get('light'), light);
    assert.deepEqual(parseCreatureLabState(url.search), state);
    assert.equal(creatureLabComposerInputError(url.search), null); assert.deepEqual(creatureLabInputNotices(url.search), []);
  }
  const skin = {...DEFAULT_LAB_STATE, mode: 'skin', species: 'w/a:1', light: 'planet-noon'}, skinUrl = share(skin);
  assert.equal(skinUrl.searchParams.get('light'), 'planet-noon'); assert.equal(skinUrl.searchParams.has('herd'), false, 'herd is composer-only');
  assert.deepEqual(parseCreatureLabState(skinUrl.search), skin);
  const gallery = share({...DEFAULT_LAB_STATE, mode: 'gallery'});
  assert.equal(gallery.searchParams.has('light'), false, 'modes without the lighting control do not write it');
  assert.equal(parseCreatureLabState('').herd, 1); assert.equal(parseCreatureLabState('').light, 'studio');
});

test('a repeated herd or light parameter rejects the link', () => {
  const url = share(composerState({herd: 6, light: 'planet-noon'}));
  for (const key of ['herd', 'light']) {
    const q = new URLSearchParams(url.search); q.append(key, q.get(key));
    assert.match(creatureLabComposerInputError(q), new RegExp(`repeated ${key}`));
  }
  const skin = share({...DEFAULT_LAB_STATE, mode: 'skin', light: 'studio'}).searchParams; skin.append('light', 'planet-noon');
  assert.match(creatureLabLightInputError(skin), /repeated light/);
  assert.equal(creatureLabLightInputError(share({...DEFAULT_LAB_STATE, mode: 'skin'}).search), null);
});

test('an unsupported herd size or lighting falls back with a visible notice', () => {
  const q = '?mode=composer&herd=7&light=disco';
  const state = parseCreatureLabState(q);
  assert.equal(state.herd, 1); assert.equal(state.light, 'studio');
  assert.equal(creatureLabComposerInputError(q), null, 'falls back, does not reject');
  const notices = creatureLabInputNotices(q);
  assert.equal(notices.length, 2); assert.match(notices[0], /Herd size "7".*1, 6, 9 or 12/); assert.match(notices[1], /Lighting "disco"/);
  for (const bad of ['0', '6.0', '-6', '120', 'x', '']) assert.equal(parseCreatureLabState(`?mode=composer&herd=${bad}`).herd, 1, bad);
  assert.deepEqual(creatureLabInputNotices('?mode=gallery&herd=7&light=x'), [], 'legacy modes ignore composer-only keys');
});

test('a v1 recipe link opens and re-shares as v2 with the same species', () => {
  const fixture = JSON.parse(readFileSync(new URL('./fixtures/composer-v1-links.json', import.meta.url), 'utf8'));
  const giraffe = fixture.presets.find(p => p.id === 'giraffe');
  const opened = parseCreatureLabState(`?mode=composer&recipe=${encodeURIComponent(giraffe.text)}&time=1.25`);
  assert.ok(opened.recipe.startsWith('v1*')); assert.equal(opened.herd, 1); assert.equal(opened.light, 'studio');
  const decoded = decodeComposerRecipe(opened.recipe);
  assert.equal(decoded.error, null); assert.deepEqual(decoded.issues, []);
  assert.ok(composerSpeciesEqual(decoded.recipe, composerPreset('giraffe')), 'old preset link still names the preset');
  // The Lab re-shares what it decoded: always version 2.
  const reshared = share({...opened, recipe: encodeComposerRecipe(decoded.recipe)});
  assert.match(reshared.searchParams.get('recipe'), /^v2\*/);
  assert.equal(reshared.searchParams.get('light'), 'studio');
  assert.deepEqual(decodeComposerRecipe(reshared.searchParams.get('recipe')).recipe, decoded.recipe);
});

test('a legacy planetary link gains no composer keys when re-shared', () => {
  const legacy = '?seed=LETHRA-BIOSPHERE-01&profile=arid&species=w%2Fa%3A3&mode=anatomy&variant=2&growth=juvenile&time=4&date=-12';
  const state = parseCreatureLabState(legacy);
  for (const mode of ['anatomy', 'gallery', 'arena', 'ancestry', 'skin']) {
    const url = share({...state, mode});
    for (const key of ['recipe', 'compareRecipe', 'composerSeed', 'motion', 'herd']) assert.equal(url.searchParams.has(key), false, `${mode} ${key}`);
    assert.deepEqual(parseCreatureLabState(url.search), {...state, mode});
  }
});

test('an oversize recipe (1201 characters) still fails visibly instead of truncating', () => {
  const text = `v2*layout_biped*${'x'.repeat(COMPOSER_RECIPE_MAX_TEXT)}`.slice(0, COMPOSER_RECIPE_MAX_TEXT + 1);
  assert.equal(text.length, 1201);
  const state = parseCreatureLabState(`?mode=composer&recipe=${text}`);
  assert.equal(state.recipe.length, 1201, 'one character over the limit is kept');
  assert.match(decodeComposerRecipe(state.recipe).error, /longer than 1200/);
  assert.equal(parseCreatureLabState(`?mode=composer&recipe=${text}yyyy`).recipe.length, 1201);
});

test('preset identity is species-only; herd recipes are consecutive individuals with young every fourth', async () => {
  const {composerPresetOf, composerHerdRecipes, herdSeed} = await import('../src/creature-lab-composer.ts');
  const giraffe = composerPreset('giraffe');
  for (const change of [{individualSeed: 17}, {sex: 'female'}, {sex: 'male'}, {maturity: .4}, {condition: .5}, {individualSeed: 9999, maturity: .2}])
    assert.equal(composerPresetOf({...giraffe, ...change}), 'giraffe', JSON.stringify(change));
  assert.equal(composerPresetOf({...giraffe, neckLength: 1.2}), null, 'anatomy edit is a custom combination');
  assert.equal(composerPresetOf({...giraffe, pattern: 'spots'}), null, 'coat is part of the species');
  const herd = composerHerdRecipes({...giraffe, individualSeed: 0}, 12);
  assert.deepEqual(herd.map(r => r.individualSeed), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  assert.deepEqual(herd.map(r => r.maturity), [1, 1, 1, .3, 1, 1, 1, .4, 1, 1, 1, .5]);
  assert.ok(herd.every(r => r.sex === 'auto' && composerSpeciesEqual(r, giraffe)));
  assert.deepEqual(composerHerdRecipes({...giraffe, individualSeed: 9998}, 6).map(r => r.individualSeed), [9998, 9999, 1, 2, 3, 4], 'wraps 9999 -> 1');
  assert.equal(herdSeed(40, 2), 42);
  assert.deepEqual(composerHerdRecipes({...giraffe, individualSeed: 5, sex: 'male'}, 1), [{...giraffe, individualSeed: 5, sex: 'male'}], 'one animal is the recipe itself');
  assert.equal(new Set(composerHerdRecipes(giraffe, 9).map(r => encodeComposerRecipe(r))).size, 9);
});
