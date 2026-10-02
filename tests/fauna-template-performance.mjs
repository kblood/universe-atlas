// Required actual-asset CPU benchmark; no renderer, texture decode or GPU uploads.
// node tests/fauna-template-performance.mjs <candidate-directory> <report.json>
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {performance} from 'node:perf_hooks';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createFaunaTemplate} from '../src/fauna-template.ts';
import {createFaunaTemplateMotion} from '../src/fauna-template-motion.ts';

const [directory, reportPath, ...extra] = process.argv.slice(2);
if (!directory || !reportPath || extra.length) throw new Error('Usage: node tests/fauna-template-performance.mjs <candidate-directory> <report.json>');
const source = path.resolve(directory), output = path.resolve(reportPath);
const sidecarBytes = await fs.readFile(path.join(source, 'fauna-template.json'));
const sidecar = JSON.parse(sidecarBytes.toString('utf8'));
assert.match(sidecar.runtime, /^[A-Za-z0-9_.-]+\.glb$/, 'sidecar runtime must be a local GLB filename');
const sourcePath = path.join(source, sidecar.runtime);
assert.notEqual(output.toLowerCase(), sourcePath.toLowerCase(), 'report cannot overwrite the asset');
assert.notEqual(output.toLowerCase(), path.join(source, 'fauna-template.json').toLowerCase(), 'report cannot overwrite the sidecar');
const bytes = await fs.readFile(sourcePath);
const sha256 = value => createHash('sha256').update(value).digest('hex');
const warmupFrames = 120, measuredFrames = 360, lifecycleBatches = 8;
const morphMix = [
  {bodyCondition: .45, neckLength: -.2, legLength: .35, muzzleLength: .2, earSize: -.15},
  {bodyCondition: -.6, neckLength: .5, legLength: -.3, muzzleLength: -.2, earSize: .6},
  {juvenile: 1, neckLength: .2, legLength: -.25, earSize: .5},
  {bodyCondition: 1, legLength: 1},
  {juvenile: .45, bodyCondition: -.25, neckLength: -.5, muzzleLength: .6},
  {bodyCondition: .2, neckLength: 1, legLength: .4, muzzleLength: -.6, earSize: -.5},
];
const report = {
  ok: false, scope: 'CPU only: actual GLB geometry, morphs, skeletons and production motion driver',
  limitations: [
    'Textures are empty stubs: image decoding, decoded texture memory and texture upload are not measured.',
    'No renderer: excludes rendering, GPU skinning/morph evaluation, shadows, scene traversal, XR and full-world simulation.',
    'Pose timings include the production driver and its actual hoof/contact diagnostics; six-animal timings are aggregate sequential updates.',
    'Numeric storage estimates exclude JS object overhead, private driver caches and allocator behavior; disposal events do not prove garbage collection.',
    'An isolated CPU measurement does not qualify desktop full-scene FPS, 60 Hz, Quest or headset performance.',
  ],
  source, sourceUrl: pathToFileURL(sourcePath).href, sourceHash: sha256(bytes), sidecarHash: sha256(sidecarBytes),
  id: sidecar.id, schemaVersion: sidecar.schemaVersion, glbBytes: bytes.length,
  environment: {node: process.version, threeRevision: THREE.REVISION, platform: process.platform, arch: process.arch,
    cpu: os.cpus()[0]?.model ?? 'unknown', logicalCpus: os.cpus().length, totalMemoryBytes: os.totalmem()},
  method: {warmupFrames, measuredFrames, lifecycleBatches, instancesPerLifecycleBatch: 6,
    sampleStepSeconds: 1 / 60, quantiles: 'nearest-rank', inPlace: false, gaits: ['idle', 'walk'], morphMix},
  scenarios: [],
};

function resources(root) {
  const result = {meshes: [], geometries: new Set(), materials: new Set(), textures: new Set(), skeletons: new Set(), bones: new Set()};
  root.traverse(o => {
    if (o.isBone) result.bones.add(o);
    if (!o.isMesh) return;
    result.meshes.push(o); result.geometries.add(o.geometry);
    for (const material of Array.isArray(o.material) ? o.material : [o.material]) result.materials.add(material);
    if (o.isSkinnedMesh) result.skeletons.add(o.skeleton);
  });
  for (const material of result.materials) for (const value of Object.values(material)) if (value instanceof THREE.Texture) result.textures.add(value);
  return result;
}

// Merge view ranges on each backing buffer: GLTF attributes can overlap or share storage.
function bufferBytes(attributes) {
  const ranges = new Map();
  for (const attribute of attributes) {
    const array = attribute.isInterleavedBufferAttribute ? attribute.data.array : attribute.array;
    if (!ranges.has(array.buffer)) ranges.set(array.buffer, []);
    ranges.get(array.buffer).push([array.byteOffset, array.byteOffset + array.byteLength]);
  }
  let referencedBytes = 0;
  for (const list of ranges.values()) {
    list.sort((a, b) => a[0] - b[0]); let end = -1;
    for (const [start, next] of list) { referencedBytes += Math.max(0, next - Math.max(start, end)); end = Math.max(end, next); }
  }
  return {referencedBytes, backingBufferBytes: [...ranges.keys()].reduce((sum, buffer) => sum + buffer.byteLength, 0), backingBuffers: ranges.size};
}

function memoryInventory(r) {
  const base = [], morph = [];
  for (const g of r.geometries) {
    base.push(...Object.values(g.attributes)); if (g.index) base.push(g.index);
    morph.push(...Object.values(g.morphAttributes).flat());
  }
  const numericSkeletonBytes = [...r.skeletons].reduce((sum, s) => sum + s.boneMatrices.byteLength + s.boneInverses.length * 16 * 8, 0);
  return {geometries: r.geometries.size, materials: r.materials.size, textureObjects: r.textures.size,
    meshParts: r.meshes.length, approximateDrawParts: r.meshes.reduce((sum, m) => sum + (Array.isArray(m.material) ? m.geometry.groups.length : 1), 0),
    triangles: r.meshes.reduce((sum, m) => sum + (m.geometry.index?.count ?? m.geometry.attributes.position.count) / 3, 0),
    baseBuffers: bufferBytes(base), morphBuffers: bufferBytes(morph), combinedBuffers: bufferBytes([...base, ...morph]),
    skeletons: r.skeletons.size, bones: r.bones.size, numericSkeletonBytes,
    boneTransformNumericBytes: r.bones.size * (16 + 16 + 3 + 4 + 3) * 8,
    morphInfluenceNumericBytes: r.meshes.reduce((sum, m) => sum + (m.morphTargetInfluences?.length ?? 0) * 8, 0)};
}

function statistics(samples) {
  assert.ok(samples.length && samples.every(v => Number.isFinite(v) && v >= 0));
  const ordered = [...samples].sort((a, b) => a - b), rank = q => ordered[Math.max(0, Math.ceil(q * ordered.length) - 1)];
  return {samples: samples.length, meanMs: samples.reduce((a, b) => a + b, 0) / samples.length,
    p50Ms: rank(.5), p95Ms: rank(.95), p99Ms: rank(.99), maxMs: ordered.at(-1)};
}

// Skeleton has no dispose event; record calls separately. Materials/textures/geometries emit events.
const trackers = new Map();
function track(object, kind, owner) {
  if (trackers.has(object)) return;
  const record = {kind, owner, count: 0}; trackers.set(object, record);
  if (kind === 'skeleton') {
    const dispose = object.dispose;
    object.dispose = function () { record.count++; return dispose.call(this); };
  } else object.addEventListener('dispose', () => { record.count++; });
}
function trackResources(r, owner) {
  for (const [key, kind] of [['geometries', 'geometry'], ['materials', 'material'], ['textures', 'texture'], ['skeletons', 'skeleton']]) {
    for (const object of r[key]) track(object, kind, owner);
  }
}
const eventSummary = () => {
  const summary = {};
  for (const {kind, owner, count} of trackers.values()) {
    const key = `${owner}.${kind}`;
    summary[key] ??= {objects: 0, disposeEventsOrCalls: 0, zero: 0, multiple: 0};
    const row = summary[key]; row.objects++; row.disposeEventsOrCalls += count;
    if (!count) row.zero++; if (count > 1) row.multiple++;
  }
  return summary;
};

let template, imagesBypassed = 0;
try {
  const loader = new GLTFLoader();
  loader.register(() => ({name: 'ATLAS_CPU_PERFORMANCE_AUDIT', loadTexture: () => { imagesBypassed++; return Promise.resolve(new THREE.Texture()); }}));
  const parseStart = performance.now();
  const gltf = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  report.parseWithTextureStubsMs = performance.now() - parseStart;
  report.imagesBypassed = imagesBypassed;
  template = createFaunaTemplate(gltf.scene, sidecar, {ownsSource: true, sourceHash: report.sourceHash, sourceUrl: report.sourceUrl});
  const shared = resources(gltf.scene); trackResources(shared, 'template');
  report.sharedAsset = memoryInventory(shared);
  const instanceResources = new Set(), setupTimes = {instantiate: [], applyMorphs: [], motionDriver: []};

  function createActors(count) {
    return Array.from({length: count}, (_, index) => {
      let start = performance.now(); const instance = template.instantiate(); setupTimes.instantiate.push(performance.now() - start);
      start = performance.now(); instance.apply(morphMix[index % morphMix.length]); setupTimes.applyMorphs.push(performance.now() - start);
      start = performance.now(); const motion = createFaunaTemplateMotion(instance); setupTimes.motionDriver.push(performance.now() - start);
      const owned = resources(instance.root); trackResources(owned, 'instance');
      for (const geometry of owned.geometries) assert.ok(shared.geometries.has(geometry), 'geometry must remain template shared');
      for (const texture of owned.textures) assert.ok(shared.textures.has(texture), 'textures must remain template shared');
      for (const key of ['materials', 'skeletons', 'bones']) for (const object of owned[key]) {
        assert.ok(!shared[key].has(object) && !instanceResources.has(object), `${key} must be independently owned`);
        instanceResources.add(object);
      }
      return {instance, motion, owned};
    });
  }
  function disposeActors(actors) {
    for (const actor of actors) { actor.instance.dispose(); actor.instance.dispose(); }
    for (const {owner, count} of trackers.values()) if (owner === 'template') assert.equal(count, 0, 'instances cannot dispose shared resources');
    for (const actor of actors) for (const key of ['materials', 'skeletons']) for (const object of actor.owned[key]) assert.equal(trackers.get(object).count, 1, 'owned resources dispose exactly once');
  }

  for (const count of [1, 6]) {
    const actors = createActors(count), row = {animals: count, perInstance: actors.map(a => memoryInventory(a.owned)), pose: {}};
    for (const gait of report.method.gaits) {
      const update = frame => {
        for (let i = 0; i < actors.length; i++) actors[i].motion.update(frame / 60 + i * .137, {gait, inPlace: false});
      };
      for (let frame = 0; frame < warmupFrames; frame++) update(frame);
      const samples = [];
      for (let frame = 0; frame < measuredFrames; frame++) {
        const start = performance.now(); update(frame + warmupFrames); samples.push(performance.now() - start);
      }
      row.pose[gait] = statistics(samples);
    }
    report.scenarios.push(row); disposeActors(actors);
  }
  for (let batch = 0; batch < lifecycleBatches; batch++) {
    const actors = createActors(6);
    for (let i = 0; i < actors.length; i++) actors[i].motion.update(.37 + i * .11, {gait: 'walk'});
    disposeActors(actors);
  }
  report.setup = Object.fromEntries(Object.entries(setupTimes).map(([key, samples]) => [key, statistics(samples)]));
  report.disposalBeforeTemplate = eventSummary();
  template.dispose(); template.dispose();
  for (const record of trackers.values()) assert.equal(record.count, 1, `${record.owner}.${record.kind} must dispose exactly once`);
  report.disposalAfterTemplate = eventSummary();
  report.createdInstances = setupTimes.instantiate.length;
  report.ok = true;
} catch (error) {
  report.error = error.stack ?? String(error); process.exitCode = 1;
} finally {
  template?.dispose();
  report.finishedAt = new Date().toISOString();
  await fs.mkdir(path.dirname(output), {recursive: true});
  await fs.writeFile(output, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ok: report.ok, report: output, sourceHash: report.sourceHash,
    scenarios: report.scenarios.map(({animals, pose}) => ({animals, pose})), error: report.error}, null, 2));
}
