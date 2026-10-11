import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {composerPreset} from '../src/fauna-composer-recipe.ts';
import {createComposerCreature} from '../src/fauna-composer.ts';
import {poseComposer} from '../src/fauna-composer-rig.ts';
import {FaunaComposerPaletteWriter} from '../src/fauna-composer-palette.ts';
import {FaunaComposerRenderer} from '../src/fauna-composer-renderer.ts';
import {buildFaunaComposerLevels, composerRenderSkin, composerTypedBytes, faunaComposerSourceKey, validateComposerRenderLod} from '../src/fauna-composer-render-source.ts';
import {patchFaunaComposerInstancing} from '../src/fauna-composer-instance-batch.ts';

const creatures = new Map();
function source(name) {if (!creatures.has(name)) creatures.set(name, createComposerCreature(composerPreset(name), {presentation: 'realism-1'})); const c = creatures.get(name); return {graph: c.graph, skin: c.skin};}
test.after(() => {for (const c of creatures.values()) c.dispose();});
const candidate = (id, name = 'worm', distanceM = 10) => ({id, definition: {name}, sourceKey: name, matrix: new THREE.Matrix4().makeTranslation(100, 20, 30), distanceM, cameraVisible: true, rigSeconds: .47, poseKey: 't=.47-ground0'});
const tick = () => new Promise(resolve => setImmediate(resolve));
function provider() {const calls = []; return {calls, build(job, signal) {calls.push({job, signal}); const s = source(job.definition.name); return Promise.resolve({key: job.key, source: s, levels: {near: composerRenderSkin(s.skin)}, buildMs: 1});}};}

test('variable Composer palette exactly matches native flat skeleton, including bind rotation and radial/chord scale', () => {
  const counts = new Set();
  for (const name of ['worm', 'turtle', 'bird', 'trunked-centipede']) {
    const s = source(name), creature = creatures.get(name), pose = creature.update('display', .73);
    creature.group.updateMatrixWorld(true); creature.mesh.skeleton.update(); counts.add(s.graph.bones.length);
    const out = new Float32Array(s.graph.bones.length * 16); new FaunaComposerPaletteWriter(s.graph).write(pose, out);
    assert.deepEqual(out, creature.mesh.skeleton.boneMatrices, name);
  }
  assert.ok(counts.size >= 3);
});
test('anatomic LOD retains exact original joints, gloss and all crisp coat layers', () => {
  const s = source('turtle'), levels = buildFaunaComposerLevels(s, [4500, 1500]);
  for (const level of Object.values(levels)) validateComposerRenderLod(s.skin, level);
  assert.ok(levels.far.index.length < s.skin.index.length);
  const broken = {...levels.far, colors: levels.far.colors.slice()}; broken.colors[0] += .01;
  assert.throws(() => validateComposerRenderLod(s.skin, broken), /original Composer/);
  assert.ok(composerTypedBytes(s) > composerTypedBytes(levels.far));
});
test('same-source instancing uses one draw and independent dated palettes; source/phenotype keys differ', async () => {
  const p = provider(), r = new FaunaComposerRenderer({provider: p, pose: (graph, c) => poseComposer(graph, 'walk', c.rigSeconds), capacity: 3});
  try {
    const a = candidate('a'), b = {...candidate('b'), rigSeconds: 1.23, poseKey: 't=1.23'};
    assert.equal(r.update([a, b]).size, 0); await tick(); assert.equal(r.update([a, b]).size, 2);
    assert.equal(r.diagnostics().draws, 1); assert.equal(r.group.children[0].count, 2);
    assert.notDeepEqual(r.poseOf('a').positions, r.poseOf('b').positions);
    assert.equal(r.diagnostics().poseBuilds, 2); r.update([a, b]); assert.equal(r.diagnostics().poseBuilds, 2);
    assert.equal(r.diagnostics().uploadBytes, 0); assert.equal(p.calls.length, 1);
    assert.notEqual(faunaComposerSourceKey({recipe: 'same', phenotype: {height: 1}}, 'v1'), faunaComposerSourceKey({recipe: 'same', phenotype: {height: 2}}, 'v1'));
    r.assertCapabilities({capabilities: {maxAttributes: 16, maxVertexTextures: 16, maxTextureSize: 2048}});
    assert.throws(() => r.assertCapabilities({capabilities: {maxAttributes: 14, maxVertexTextures: 16, maxTextureSize: 2048}}), /15 vertex/);
  } finally {r.dispose(); assert.equal(r.ownedBytes, 0); assert.equal(r.group.children.length, 0);}
});
test('pending upgrade keeps same coarser animal, then source upgrades without changing its graph or pose', async () => {
  const s = source('worm'), levels = buildFaunaComposerLevels(s, [4500, 1500]); let resolveUpgrade;
  const p = {calls: 0, build(job) {this.calls++; return this.calls === 1 ? Promise.resolve({key: job.key, source: s, levels: {far: levels.far}, buildMs: 1}) : new Promise(resolve => {resolveUpgrade = () => resolve({key: job.key, source: s, levels: {near: levels.near}, buildMs: 1});});}};
  const r = new FaunaComposerRenderer({provider: p, pose: (g, c) => poseComposer(g, 'walk', c.rigSeconds), capacity: 1});
  try {
    const a = candidate('a', 'worm', 300); r.update([a]); await tick(); assert.equal(r.update([a]).size, 1); assert.equal(r.sourceOf('a'), null, 'full source not retained for far animal');
    a.distanceM = 5; assert.equal(r.update([a]).size, 1); assert.equal(r.diagnostics().actors[0].tier, 'far');
    const oldPose = r.poseOf('a'); r.update([a]); assert.equal(r.poseOf('a'), oldPose);
    resolveUpgrade(); await tick(); assert.equal(r.update([a]).size, 1); assert.equal(r.diagnostics().actors[0].tier, 'near'); assert.equal(r.poseOf('a'), oldPose);
  } finally {r.dispose();}
});
test('tight resident budget rejects admission visibly and preserves an already drawn source', async () => {
  const p = provider(), r = new FaunaComposerRenderer({provider: p, pose: g => poseComposer(g, 'idle', 0), capacity: 2, maxSources: 1, maxBytes: 8 * 1024 * 1024});
  try {
    const a = candidate('a'), b = candidate('b', 'turtle'); r.update([a]); await tick(); r.update([a]);
    r.update([a, b]); await tick(); const drawn = r.update([a, b]);
    assert.ok(drawn.has('a')); assert.ok(!drawn.has('b')); assert.match(r.diagnostics().lastError, /budget full/); assert.equal(r.diagnostics().sources, 1);
    assert.ok(r.ownedBytes <= 8 * 1024 * 1024);
    r.update([b]); for (let i = 0; i < 125; i++) r.update([b]); await tick(); r.update([b]); assert.equal(r.diagnostics().sources, 1);
  } finally {r.dispose();}
});
test('context/disposal aborts the single outstanding job and rejects stale results', async () => {
  let resolve, signal; const p = {build(job, s) {signal = s; return new Promise(r => {resolve = () => r({key: job.key, source: source('worm'), levels: {near: composerRenderSkin(source('worm').skin)}, buildMs: 1});});}};
  const r = new FaunaComposerRenderer({provider: p, pose: g => poseComposer(g, 'idle', 0), capacity: 1});
  r.update([candidate('a')]); r.setContext('other-planet'); assert.ok(signal.aborted); resolve(); await tick();
  assert.equal(r.diagnostics().sources, 0); assert.equal(r.diagnostics().stale, 1); r.dispose(); assert.equal(r.reservedBytes, 0);
});
test('colour and both shadow shaders use the same variable palette deformation', () => {
  for (const name of ['standard', 'depth', 'distanceRGBA']) {const shader = {vertexShader: THREE.ShaderLib[name].vertexShader}; patchFaunaComposerInstancing(shader); assert.match(shader.vertexShader, /composerSkin\*vec4\(transformed/); assert.match(shader.vertexShader, /texelFetch/);}
});
