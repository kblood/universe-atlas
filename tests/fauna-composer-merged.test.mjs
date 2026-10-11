import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FaunaComposerMergedBatch, composerMergedCoatGlsl, patchComposerMergedShader} from '../src/fauna-composer-merged-batch.ts';
import {createComposerCreature, patchComposerGlossShader} from '../src/fauna-composer.ts';
import {composerPreset} from '../src/fauna-composer-recipe.ts';
import {composerRenderSkin} from '../src/fauna-composer-render-source.ts';

test('unique source geometry and full coat data share one bounded draw without quantization', () => {
  const creatures = ['worm', 'turtle', 'bird'].map(name => createComposerCreature(composerPreset(name), {presentation: 'realism-1'}));
  const skins = creatures.map(c => composerRenderSkin(c.skin)), vertices = skins.reduce((n, s) => n + s.positions.length / 3, 0), indices = skins.reduce((n, s) => n + s.index.length, 0);
  const texture = new THREE.DataTexture(new Float32Array(160 * 16 * 3), 640, 3), arena = new FaunaComposerMergedBatch({maxVertices: vertices, maxIndices: indices, maxActors: 3, maxBytes: 24 * 1024 * 1024, bones: {value: texture}});
  try {
    let start = 0;
    for (let i = 0; i < skins.length; i++) {const s = skins[i]; assert.ok(arena.register(String(i), s, i));
      for (const [name, source, width] of [['position', s.positions, 3], ['normal', s.normals, 3], ['skinIndex', s.skinIndex, 4], ['skinWeight', s.skinWeight, 4], ['composerGloss', s.gloss, 1]]) assert.deepEqual(arena.mesh.geometry.getAttribute(name).array.slice(start * width, start * width + source.length), source);
      start += s.positions.length / 3;
    }
    assert.equal(arena.register('overflow', skins[0], 0), false);
    arena.beginFrame(); for (let i = 0; i < 3; i++) assert.ok(arena.submit(String(i), new THREE.Matrix4().makeTranslation(i * 5, 4, 0))); arena.endFrame();
    assert.equal(arena.diagnostics().draws, 1); assert.equal(arena.diagnostics().actors, 3); assert.equal(arena.diagnostics().activeTriangles, indices / 3);
    const expected = (vertices * 120 + indices * 4 + 3 * 112) * 2; assert.equal(arena.diagnostics().ownedBytes, expected);
    arena.release('1'); arena.release('0'); arena.release('2'); assert.equal(arena.mesh.geometry.drawRange.count, 0);
    assert.ok(arena.register('reused', skins[2], 1), 'released blocks coalesce');
  } finally {arena.dispose(); texture.dispose(); creatures.forEach(c => c.dispose());}
  assert.equal(arena.diagnostics().ownedBytes, 0);
});
test('merged coat preserves all seven pattern branches and exact seed reconstruction', () => {
  const code = composerMergedCoatGlsl(); assert.doesNotMatch(code, /#(?:if|elif|else|endif)/); assert.doesNotMatch(code, /COAT_PATTERN/);
  assert.match(code, /uint\(vComposerCoatA.y\) << 16u/); assert.match(code, /int\(vComposerCoatB.z\) == 7/);
  for (const name of ['standard', 'depth', 'distanceRGBA']) {const shader = {vertexShader: THREE.ShaderLib[name].vertexShader, fragmentShader: THREE.ShaderLib[name].fragmentShader};
    if (name === 'standard') patchComposerGlossShader(shader); patchComposerMergedShader(shader, name === 'standard');
    assert.match(shader.vertexShader, /composerRoot\*vec4\(transformed/); assert.match(shader.vertexShader, /composerCoatB.w<0.5/);
    if (name === 'standard') assert.match(shader.fragmentShader, /roughnessFactor = mix/);
  }
});
