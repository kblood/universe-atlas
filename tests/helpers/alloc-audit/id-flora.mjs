// Numeric outputs and written instance buffers must match the original renderer.
import * as THREE from 'three';
import {pair, gate, rng} from './id-lib.mjs';
import {FLORA_KIND_NAMES} from '../../../src/flora-field.ts';
const {base: B, wt: W, shas} = await pair('flora-culling.ts');
const g = gate('flora'), random = rng(0xF10A), cap = 256;
const budgets = {tree: [8,8,8], shrub: [8,8,8], grass: [8,8,8], flower: [8,8,8]};
const render = M => new M.FloraFieldRenderer(() => new THREE.BoxGeometry(), () => new THREE.MeshBasicMaterial(), budgets);
const rb = render(B), rw = render(W), bb = new B.FloraCandidateBuffer(cap), bw = new W.FloraCandidateBuffer(cap);
const planes = new Float32Array(24), matrix = new THREE.Matrix4(), camera = {x: 0, y: 1.6, z: 0};
for (let i = 0; i < 6; i++) W.packCullPlane(planes, i, i < 2 ? (i === 0 ? 1 : -1) : 0,
  i >= 2 && i < 4 ? (i === 2 ? 1 : -1) : 0, i >= 4 ? (i === 4 ? 1 : -1) : 0, 80);
for (let frame = 0; frame < 2000; frame++) {
  bb.clear(); bw.clear();
  const owners = [];
  const count = frame % 17 === 0 ? 0 : cap;
  for (let i = 0; i < count; i++) {
    const x = random() * 200 - 100, y = random() * 5, z = random() * 200 - 100;
    matrix.makeTranslation(x, y, z);
    const ob = {floraLod: i % 5 - 1}, ow = {floraLod: ob.floraLod};
    owners.push([ob, ow]);
    const kind = FLORA_KIND_NAMES[i % FLORA_KIND_NAMES.length];
    bb.push(kind, x, y, z, .5, matrix.elements, ob);
    bw.push(kind, x, y, z, .5, matrix.elements, ow);
  }
  camera.x = random() * 20 - 10;
  const b = B.drawFloraCandidates(bb, rb, camera, planes), w = W.drawFloraCandidates(bw, rw, camera, planes);
  g.cmp(b.survivorCount, w.survivorCount, 'survivors'); g.cmp(b.drawnCount, w.drawnCount, 'drawn');
  for (const [b, w] of owners) g.cmp(b.floraLod, w.floraLod, 'owner LOD');
  for (let i = 0; i < rb.meshes.length; i++) {
    const b = rb.meshes[i], w = rw.meshes[i];
    g.cmp(b.count, w.count, 'mesh count');
    g.cmpArr(b.instanceMatrix.array, w.instanceMatrix.array, b.instanceMatrix.array.length, 'matrix');
    if (b.geometry.getAttribute(W.FLORA_FADE_ATTRIBUTE)) g.cmpArr(b.geometry.getAttribute(W.FLORA_FADE_ATTRIBUTE).array,
      w.geometry.getAttribute(W.FLORA_FADE_ATTRIBUTE).array, b.geometry.getAttribute(W.FLORA_FADE_ATTRIBUTE).array.length, 'coverage');
  }
  g.calls++;
}
g.finish({shas, frames: 2000});
