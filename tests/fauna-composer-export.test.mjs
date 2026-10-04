// Headless creature GLB export (fauna-composer-export-1, backlog task 10). Checked without a GPU:
// - the GLB container and glTF structure (one skinned mesh, joints in graph order, weights summing to 1, budgets);
// - a second export of the same recipe is byte-identical, and so are the CLI's sidecar and brief;
// - clips round-trip through three's own GLTFLoader + AnimationMixer and, at every sampled key time, skin the mesh to
//   the same vertex positions as the runtime creature posed by poseComposer (createComposerCreature().update);
// - the export path imports only the 12-module composer core and three (the CLI adds only node: builtins);
// - the CLI refuses to overwrite a file whose bytes differ.
// assetctl validate/package run outside this repo (evidence: test-results/round2-2026-10-04/creature-export/).
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import ts from 'typescript';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {COMPOSER_GLOSS_ATTRIBUTE, COMPOSER_EXPORT_VERSION, bakeComposerClip, composerClipWindow, exportCreatureGlb, readComposerGlb} from '../src/fauna-composer-export.ts';
import {composerPreset, encodeComposerRecipe} from '../src/fauna-composer-recipe.ts';
import {coherentComposerSpecies} from '../src/fauna-composer-species.ts';
import {COMPOSER_BUDGET, buildComposerGraph, poseComposer} from '../src/fauna-composer-rig.ts';
import {deriveComposerIndividual} from '../src/fauna-composer-individual.ts';
import {createComposerCreature} from '../src/fauna-composer.ts';
import {CREATURE_EXPORT_SIDECAR_SCHEMA, buildCreatureFiles, generatorSourceHash, parseArgs, writeOnce} from '../scripts/export-creature.mjs';

const SPECIMENS = {
  bird: composerPreset('bird'),            // biped, feathered wings (scale channels), fast walk
  centipede: composerPreset('centipede'),  // 79 joints
  worm: composerPreset('worm'),            // limbless crawl, peristaltic scale, static neutral
  'winged-ape-rhino': composerPreset('winged-ape-rhino'),
  coherent: coherentComposerSpecies('export-test-1').recipe,
};
const cache = new Map();
const exported = name => { if (!cache.has(name)) cache.set(name, exportCreatureGlb(SPECIMENS[name])); return cache.get(name); };
const accessorArray = (json, bin, index) => {
  const a = json.accessors[index], v = json.bufferViews[a.bufferView];
  const C = {5126: Float32Array, 5123: Uint16Array, 5125: Uint32Array, 5121: Uint8Array}[a.componentType];
  const n = {SCALAR: 1, VEC3: 3, VEC4: 4, MAT4: 16}[a.type] * a.count;
  return new C(bin.buffer.slice(bin.byteOffset + v.byteOffset + (a.byteOffset ?? 0), bin.byteOffset + v.byteOffset + (a.byteOffset ?? 0) + n * C.BYTES_PER_ELEMENT));
};

test('export: GLB container and glTF structure match the composer skin and graph', () => {
  for (const name of Object.keys(SPECIMENS)) {
    const {glb, report} = exported(name);
    const {json, bin} = readComposerGlb(glb);
    const effective = deriveComposerIndividual(SPECIMENS[name]).recipe, graph = buildComposerGraph(effective);
    assert.equal(json.asset.version, '2.0');
    assert.equal(json.asset.generator, `universe-atlas ${COMPOSER_EXPORT_VERSION}`);
    assert.equal(json.asset.extras.composer.recipeText, encodeComposerRecipe(SPECIMENS[name]));
    assert.equal(json.meshes.length, 1); assert.equal(json.meshes[0].primitives.length, 1); assert.equal(json.skins.length, 1);
    const prim = json.meshes[0].primitives[0];
    assert.deepEqual(Object.keys(prim.attributes), ['POSITION', 'NORMAL', 'COLOR_0', 'JOINTS_0', 'WEIGHTS_0', COMPOSER_GLOSS_ATTRIBUTE]);
    // joints: one per graph bone, graph order and names, at most the composer budget
    const joints = json.skins[0].joints;
    assert.equal(joints.length, graph.bones.length, name);
    assert.ok(joints.length <= COMPOSER_BUDGET.maxBones);
    assert.deepEqual(joints.map(j => json.nodes[j].name), graph.bones.map(b => b.name));
    // triangles = index length / 3, and equal to the report and to the runtime skin
    const index = accessorArray(json, bin, prim.indices);
    assert.equal(index.length / 3, report.mesh.triangles);
    const runtime = createComposerCreature(SPECIMENS[name]);
    try {
      assert.equal(report.mesh.triangles, runtime.skin.triangleCount);
      assert.equal(json.accessors[prim.attributes.POSITION].count, runtime.skin.vertexCount);
      assert.deepEqual([...accessorArray(json, bin, prim.attributes.POSITION)], [...runtime.skin.positions]);
      assert.deepEqual([...index], [...runtime.skin.index]);
    } finally { runtime.dispose(); }
    // every weight row sums to 1 (float32) and names valid joints
    const w = accessorArray(json, bin, prim.attributes.WEIGHTS_0), j = accessorArray(json, bin, prim.attributes.JOINTS_0);
    for (let v = 0; v < w.length; v += 4) {
      const sum = w[v] + w[v + 1] + w[v + 2] + w[v + 3];
      assert.ok(Math.abs(sum - 1) <= 1e-6, `${name} vertex ${v / 4} weight sum ${sum}`);
      for (let k = 0; k < 4; k++) assert.ok(j[v + k] < joints.length);
    }
    assert.equal(report.repairs.zeroNormals, 0, `${name}: no zero-length normals to patch`);
    assert.ok(report.repairs.maxWeightChange < 1e-6, `${name}: weight repair is float rounding only (${report.repairs.maxWeightChange})`);
    // every buffer view lies inside the BIN chunk, 4-byte aligned
    for (const v of json.bufferViews) { assert.equal(v.byteOffset % 4, 0); assert.ok(v.byteOffset + v.byteLength <= bin.byteLength); }
    assert.deepEqual(json.animations.map(a => a.name), ['neutral', 'idle', 'walk', 'display']);
  }
});

test('export: a second export of the same recipe is byte-identical (GLB, sidecar and brief)', () => {
  for (const name of ['bird', 'coherent']) {
    const a = exportCreatureGlb(SPECIMENS[name]).glb, b = exportCreatureGlb({...SPECIMENS[name]}).glb;
    assert.equal(Buffer.compare(Buffer.from(a), Buffer.from(b)), 0, name);
    assert.equal(Buffer.compare(Buffer.from(a), Buffer.from(exported(name).glb)), 0, name);
  }
  const hash = generatorSourceHash();
  const one = buildCreatureFiles({kind: 'preset', preset: 'ape'}, {}, hash), two = buildCreatureFiles({kind: 'preset', preset: 'ape'}, {}, hash);
  assert.equal(one.key, two.key);
  for (let i = 0; i < one.files.length; i++) {
    assert.equal(one.files[i][0], two.files[i][0]);
    assert.equal(Buffer.compare(Buffer.from(one.files[i][1]), Buffer.from(two.files[i][1])), 0, one.files[i][0]);
  }
});

test('export: recipe text and recipe object export the same bytes; options are validated', () => {
  const text = encodeComposerRecipe(SPECIMENS.bird);
  assert.equal(Buffer.compare(Buffer.from(exportCreatureGlb(text, {clips: ['walk']}).glb), Buffer.from(exportCreatureGlb(SPECIMENS.bird, {clips: ['walk']}).glb)), 0);
  assert.throws(() => exportCreatureGlb(SPECIMENS.bird, {clips: ['run']}), /unknown motion/);
  assert.throws(() => exportCreatureGlb(SPECIMENS.bird, {clips: ['walk', 'walk']}), /listed twice/);
  assert.throws(() => exportCreatureGlb(SPECIMENS.bird, {gloss: 'shiny'}), /gloss/);
  assert.throws(() => exportCreatureGlb('v9*layout_biped'), /Unsupported composer recipe version/);
  const dropped = readComposerGlb(exportCreatureGlb(SPECIMENS.bird, {gloss: 'drop', clips: []}).glb).json;
  assert.ok(!(COMPOSER_GLOSS_ATTRIBUTE in dropped.meshes[0].primitives[0].attributes));
  assert.equal(dropped.animations, undefined);
});

test('export: clip windows are measured, walk loops on whole gait periods, a static motion bakes two keys', () => {
  const worm = buildComposerGraph(deriveComposerIndividual(SPECIMENS.worm).recipe);
  assert.deepEqual(composerClipWindow(worm, 'neutral'), {duration: 1, keys: 2, seamPosition: 0, seamAngle: 0, seamScale: 0, seamless: true, method: 'static'});
  const bird = buildComposerGraph(deriveComposerIndividual(SPECIMENS.bird).recipe);
  const walk = composerClipWindow(bird, 'walk');
  assert.equal(walk.method, 'gait-periods');
  assert.ok(walk.seamless, `bird walk loops (seam ${walk.seamPosition} m, ${walk.seamAngle} rad)`);
  assert.ok(Math.abs(walk.duration / bird.locomotion.period - Math.round(walk.duration / bird.locomotion.period)) < 1e-12);
  const baked = bakeComposerClip(bird, 'walk', walk);
  assert.equal(baked.times.length, walk.keys);
  assert.equal(baked.times[0], 0); assert.equal(baked.times[walk.keys - 1], Math.fround(walk.duration));
  // quaternion keys stay in one hemisphere
  for (const q of baked.rotation) for (let k = 4; k < q.length; k += 4) assert.ok(q[k] * q[k - 4] + q[k + 1] * q[k - 3] + q[k + 2] * q[k - 2] + q[k + 3] * q[k - 1] >= 0);
  // the report carries every clip's seam honestly
  for (const c of exported('bird').report.clips) assert.equal(c.seamless, c.seamPosition <= 5e-4 && c.seamAngle <= 0.25 * Math.PI / 180 && c.seamScale <= 1e-3, c.motion);
});

const loadGlb = glb => new Promise((resolve, reject) => new GLTFLoader().parse(glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength), '', resolve, reject));

test('export: clips played by three\'s GLTFLoader + AnimationMixer skin the mesh exactly like poseComposer', async () => {
  const fwd = new THREE.Matrix4().makeRotationY(-Math.PI / 2); // exported +Z front
  const a = new THREE.Vector3(), b = new THREE.Vector3();
  const lines = [];
  for (const name of Object.keys(SPECIMENS)) {
    const {glb, report} = exported(name);
    const gltf = await loadGlb(glb);
    let skinned = null; gltf.scene.traverse(o => { if (o.isSkinnedMesh) skinned = o; });
    assert.ok(skinned, `${name}: a SkinnedMesh`);
    assert.equal(skinned.skeleton.bones.length, report.mesh.bones);
    const runtime = createComposerCreature(SPECIMENS[name]);
    const graph = runtime.graph;
    const mixer = new THREE.AnimationMixer(gltf.scene);
    try {
      for (const clip of gltf.animations) {
        const spec = report.clips.find(c => c.motion === clip.name);
        assert.ok(Math.abs(clip.duration - spec.duration) < 1e-5, `${name} ${clip.name} duration`);
        mixer.stopAllAction();
        const action = mixer.clipAction(clip); action.play();
        let worstKey = 0, worstMid = 0, worstBone = 0;
        const step = Math.max(1, Math.floor((spec.keys - 1) / 6));
        for (let k = 0; k < spec.keys; k += step) for (const mid of [0, 0.5]) {
          if (mid && k >= spec.keys - 1) continue;
          const t = spec.duration * (k + mid) / (spec.keys - 1);
          action.time = t; mixer.update(0); gltf.scene.updateMatrixWorld(true);
          runtime.update(clip.name, t); runtime.group.updateMatrixWorld(true);
          if (!mid) {
            // joint local transforms under the skeleton root equal poseComposer (float32)
            const pose = poseComposer(graph, clip.name, t);
            skinned.skeleton.bones.forEach((bone, i) => {
              for (let c = 0; c < 3; c++) worstBone = Math.max(worstBone, Math.abs(bone.position.getComponent(c) - pose.positions[i * 3 + c]));
              const q = bone.quaternion, dot = Math.abs(q.x * pose.quaternions[i * 4] + q.y * pose.quaternions[i * 4 + 1] + q.z * pose.quaternions[i * 4 + 2] + q.w * pose.quaternions[i * 4 + 3]);
              worstBone = Math.max(worstBone, 1 - dot);
            });
          }
          let worst = 0;
          for (let v = 0; v < skinned.geometry.attributes.position.count; v += 7) {
            skinned.getVertexPosition(v, a).applyMatrix4(skinned.matrixWorld);
            runtime.mesh.getVertexPosition(v, b).applyMatrix4(fwd);
            worst = Math.max(worst, a.distanceTo(b));
          }
          if (mid) worstMid = Math.max(worstMid, worst); else worstKey = Math.max(worstKey, worst);
        }
        lines.push(`${name} ${clip.name}: keys ${spec.keys}, vertex error at keys ${worstKey.toExponential(1)} m, between keys ${worstMid.toExponential(1)} m`);
        assert.ok(worstBone < 2e-6, `${name} ${clip.name}: joint TRS differs from poseComposer by ${worstBone}`);
        assert.ok(worstKey < 2e-6, `${name} ${clip.name}: skinned vertices at key times differ from the runtime by ${worstKey} m`);
        // linear interpolation between 30 fps keys: a sanity bound only (bird walk: ~3 mm)
        assert.ok(worstMid < 0.02, `${name} ${clip.name}: between-key interpolation error ${worstMid} m`);
      }
    } finally { runtime.dispose(); }
  }
  console.log(lines.join('\n'));
});

const specifiers = (path, kind) => {
  const sf = ts.createSourceFile(path, readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true, kind);
  const out = [];
  const visit = node => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) out.push(node.moduleSpecifier.text);
    else if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === 'require')))
      out.push(node.arguments[0] && ts.isStringLiteralLike(node.arguments[0]) ? node.arguments[0].text : '<non-literal>');
    else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) && ts.isStringLiteral(node.argument.literal)) out.push(node.argument.literal.text);
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
};
const CORE = new Set(['fauna-coat-fields.ts', 'fauna-coat-vocab.ts', 'fauna-composer-eye-catalogue.ts', 'fauna-composer-eye.ts', 'fauna-composer-face-geometry.ts',
  'fauna-composer-face.ts', 'fauna-composer-individual.ts', 'fauna-composer-mesh.ts', 'fauna-composer-recipe.ts', 'fauna-composer-rig.ts', 'fauna-composer-species.ts', 'fauna-composer.ts']);

test('export: the export path imports only the composer core and three (the CLI adds node: builtins)', () => {
  // the core itself is closed (tests/creature-core-boundary.test.mjs); so the export path never reaches an Atlas module
  const leaks = specifiers('src/fauna-composer-export.ts', ts.ScriptKind.TS).filter(s => s !== 'three' && !CORE.has(/^\.\/([^/]+\.ts)$/.exec(s)?.[1]));
  assert.deepEqual(leaks, []);
  const cli = specifiers('scripts/export-creature.mjs', ts.ScriptKind.JS).filter(s => !s.startsWith('node:') && !(s === '../src/fauna-composer-export.ts' || CORE.has(/^\.\.\/src\/([^/]+\.ts)$/.exec(s)?.[1])));
  assert.deepEqual(cli, []);
});

test('export CLI: sidecar and brief carry provenance; an existing file is never overwritten', () => {
  const built = buildCreatureFiles({kind: 'coherent-species', seed: 'export-test-1'});
  const sidecar = built.sidecar;
  assert.equal(sidecar.schema, CREATURE_EXPORT_SIDECAR_SCHEMA);
  assert.match(sidecar.generator.sourceSha256, /^[0-9a-f]{64}$/);
  assert.equal(sidecar.recipeText, encodeComposerRecipe(SPECIMENS.coherent));
  assert.equal(sidecar.source.seed, 'export-test-1');
  assert.equal(sidecar.asset.sha256.length, 64);
  // asset-provenance v1: generated assets need generator, prompt and seed; the licence stays NOASSERTION (owner question)
  const p = sidecar.provenance;
  assert.equal(p.sourceType, 'generated');
  assert.ok(p.generator.provider && p.generator.model && p.prompt && p.seed);
  assert.equal(p.license.expression, 'NOASSERTION');
  const brief = JSON.parse(new TextDecoder().decode(built.files.find(([n]) => n.endsWith('.brief.json'))[1]));
  assert.match(brief.id, /^[a-z0-9][a-z0-9-]{2,63}$/);
  assert.equal(brief.kind, 'creature');
  assert.deepEqual(brief.provenance, p);
  assert.doesNotMatch(new TextDecoder().decode(built.files[1][1]), /20\d\d-\d\d-\d\dT/, 'no timestamp in the sidecar');
  const dir = mkdtempSync(join(tmpdir(), 'creature-export-'));
  try {
    const path = join(dir, 'x.bin');
    assert.equal(writeOnce(path, new Uint8Array([1, 2, 3])), 'written');
    assert.equal(writeOnce(path, new Uint8Array([1, 2, 3])), 'identical');
    assert.throws(() => writeOnce(path, new Uint8Array([1, 2, 4])), /refusing to overwrite/);
    assert.deepEqual([...readFileSync(path)], [1, 2, 3]);
  } finally { rmSync(dir, {recursive: true, force: true}); }
  assert.throws(() => parseArgs(['--preset', 'all']), /--out/);
  assert.throws(() => parseArgs(['--out', 'x']), /nothing selected/);
  assert.throws(() => parseArgs(['--out', 'x', '--preset', 'unicorn']), /unknown preset/);
  assert.equal(parseArgs(['--out', 'x', '--count', '3', '--seed-prefix', 'p']).selections.map(s => s.seed).join(), 'p-0,p-1,p-2');
});
