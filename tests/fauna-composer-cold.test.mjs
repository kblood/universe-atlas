import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {composerPreset} from '../src/fauna-composer-recipe.ts';
import {createComposerCreature} from '../src/fauna-composer.ts';
import {poseComposer} from '../src/fauna-composer-rig.ts';
import {FaunaComposerRenderer} from '../src/fauna-composer-renderer.ts';
import {FaunaComposerMergedBatch} from '../src/fauna-composer-merged-batch.ts';
import {buildFaunaComposerLevels, buildFaunaComposerRequestedLevels, composerTypedBytes, faunaComposerSourceKey} from '../src/fauna-composer-render-source.ts';
import {createComposerBuildReceipt, verifyComposerBuildReceipt, isVerifiedComposerBuild} from '../src/fauna-composer-build-receipt.ts';
import {createFaunaComposerWorkerProvider, installFaunaComposerSourceWorker} from '../src/fauna-composer-worker-provider.ts';
import {composerFakeGl} from './helpers/composer-fake-gl.mjs';

const animal = createComposerCreature(composerPreset('turtle'), {presentation: 'realism-1'});
const source = {graph: animal.graph, skin: animal.skin}, levels = buildFaunaComposerLevels(source);
test.after(() => animal.dispose());
const candidate = (id, distanceM = 300) => ({id, definition: {id}, sourceKey: id, matrix: new THREE.Matrix4(), distanceM, cameraVisible: true, rigSeconds: 0, poseKey: 'idle'});
const tick = () => new Promise(resolve => setTimeout(resolve, 10));
const result = job => ({key: job.key, source, levels: Object.fromEntries(job.tiers.map(t => [t, levels[t]])), buildMs: 1});
async function waitUntil(predicate,label){const deadline=performance.now()+5000;while(!predicate()){assert.ok(performance.now()<deadline,label);await tick();}}
async function pump(r, candidates, frames = 12) {
 for (let i = 0; i < frames; i++) {r.update(candidates); await tick();}
 const deadline=performance.now()+5000;
 while(r.running||r.ready.size){assert.ok(performance.now()<deadline,'build/adoption did not finish');await tick();r.update(candidates);}
 return r.update(candidates);
}
const gpuTiers=(capacity,middle=2)=>Object.fromEntries([['far',capacity],['middle',middle]].map(([tier,count])=>[tier,{storage:'packed-1',maxVertices:levels[tier].positions.length/3*count,maxIndices:levels[tier].index.length*count,maxBytes:20e6}]));
async function settle(r,candidates){for(let i=0;i<100;i++){r.update(candidates);await tick();const d=r.diagnostics();if(d.active===candidates.length&&!d.pending&&!d.upgradesPending&&!d.running)return;}assert.fail(JSON.stringify(r.diagnostics()));}

test('rotating near/middle priorities retain each canonical far allocation and demote immediately behind a blocked cold build',async()=>{
 const gl=composerFakeGl(),calls=[];let aborted=false;
 const r=new FaunaComposerRenderer({capacity:16,maxSources:16,maxBytes:40e6,fullSourceCache:2,middleSourceCache:2,mergedGpuContext:gl,mergedTiers:gpuTiers(16),
  provider:{build(job,signal){calls.push([job.key,job.tiers[0]]);if(job.key==='cold')return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>{aborted=true;reject(new Error('cancelled'));},{once:true}));return Promise.resolve(result(job));}},pose:g=>poseComposer(g,'idle',0)});
 const candidates=Array.from({length:12},(_,i)=>candidate(`animal-${i}`));
 try{
  await settle(r,candidates);const baseline=r.ownedBytes,original=new Map(candidates.map(c=>[c.id,{far:r.entries.get(c.id).levels.far,definition:r.entries.get(c.id).definition,pose:r.poseOf(c.id),positions:r.snapshotOf(c.id).skin.positions}]));
  for(let round=0;round<4;round++){
   const ordered=candidates.map((_,i)=>candidates[(i+round*3)%12]).map((c,i)=>({...c,distanceM:i<2?5:i<4?70:300}));await settle(r,ordered);
   const d=r.diagnostics();assert.equal(d.actors.filter(a=>a.tier==='near').length,2);assert.equal(d.mergedTiers.middle.actors,2);assert.equal(d.mergedTiers.far.actors,8);assert.equal(d.mergedTiers.far.records,12);
   assert.equal(d.actors.length,d.mergedTiers.far.actors+d.mergedTiers.middle.actors+[...r.entries.values()].reduce((n,e)=>n+(e.batches.near?.mesh.count??0),0),'one visible tier per actor');
   assert.ok(d.ownedBytes<d.maxBytes);
   const list=round===3?[...candidates,candidate('cold')]:candidates;
   if(round===3){r.update([...ordered,candidate('cold')]);assert.equal(r.diagnostics().running,'cold');}
   r.update(list);assert.equal(r.diagnostics().active,12);assert.ok(r.diagnostics().actors.every(a=>a.tier==='far'));assert.equal(r.diagnostics().mergedTiers.middle.records,0);
   for(const c of candidates){const before=original.get(c.id),e=r.entries.get(c.id);assert.equal(e.levels.far,before.far);assert.equal(e.definition,before.definition);assert.equal(r.poseOf(c.id),before.pose);assert.equal(e.batches.near,undefined);assert.deepEqual(r.snapshotOf(c.id).skin.positions,before.positions);}
   assert.equal(r.ownedBytes,baseline,'demotion releases all nearer ownership');assert.equal(calls.filter(([key,tier])=>tier==='far'&&key!=='cold').length,12);
  }
  r.setContext('other');await tick();assert.ok(aborted);assert.equal(r.entries.size,0);assert.equal(r.mergedBindings.size,0);assert.equal(r.levelOwners.size,0);assert.ok(Object.values(r.diagnostics().mergedTiers).every(t=>!t.records&&!t.copying));
 }finally{r.dispose();}assert.equal(gl.inspect().buffers,0);
});

test('a full middle arena cannot evict an unrelated out-of-view far source',async()=>{
 const gl=composerFakeGl(),calls=[],r=new FaunaComposerRenderer({capacity:4,maxSources:4,maxBytes:40e6,mergedGpuContext:gl,mergedTiers:gpuTiers(4,1),provider:{async build(job){calls.push(job);return result(job);}},pose:g=>poseComposer(g,'idle',0)});
 const a=candidate('a'),b=candidate('b'),c=candidate('cached-far');
 try{
  await settle(r,[c,a,b]);await settle(r,[{...a,distanceM:70},b]);
  await pump(r,[{...a,distanceM:70},{...b,distanceM:70}],60);
  assert.ok(r.entries.has(c.id));assert.equal(r.diagnostics().evictions,0);assert.equal(r.diagnostics().active,2);assert.equal(r.diagnostics().actors.find(x=>x.id==='b').tier,'far');assert.equal(r.diagnostics().mergedTiers.middle.records,1);assert.equal(r.diagnostics().mergedTiers.far.records,3);assert.equal(calls.filter(j=>j.key===c.id).length,1);
 }finally{r.dispose();}assert.equal(gl.inspect().buffers,0);
});

test('retained far ownership survives shared-source actor eviction and releases every tier on source/context removal',async()=>{
 const gl=composerFakeGl(),r=new FaunaComposerRenderer({capacity:2,maxSources:3,maxBytes:40e6,fullSourceCache:1,middleSourceCache:1,mergedGpuContext:gl,mergedTiers:gpuTiers(2,2),provider:{async build(job){return result(job);}},pose:g=>poseComposer(g,'idle',0)});
 const a={...candidate('a'),sourceKey:'shared',definition:{id:'shared'}},b={...candidate('b'),sourceKey:'shared',definition:a.definition},c=candidate('c');
 try{
  await settle(r,[a,b]);const original=r.snapshotOf('a').skin.positions;
  await settle(r,[{...a,distanceM:5},b]);assert.equal(r.diagnostics().mergedTiers.far.records,2);
  await settle(r,[{...a,distanceM:5},c]);assert.equal(r.actors.has('b'),false);assert.ok(r.entries.get('shared').levels.far);
  await settle(r,[{...a,distanceM:70},c]);assert.equal(r.diagnostics().mergedTiers.middle.records,1);assert.equal(r.diagnostics().mergedTiers.far.records,2);
  r.update([a,c]);assert.deepEqual(r.snapshotOf('a').skin.positions,original);
  await settle(r,[{...a,distanceM:70},c]);r.evict('shared');assert.equal(r.mergedBindings.has('a'),false);assert.equal(r.merged.get('middle').diagnostics().records,0);assert.equal(r.merged.get('far').diagnostics().records,1);assert.ok(r.entries.has('c'));
  await settle(r,[{...c,distanceM:70}]);assert.equal(r.diagnostics().mergedTiers.far.records,1);assert.equal(r.diagnostics().mergedTiers.middle.records,1);
  let clock=0;assert.equal(r.merged.get('middle').registerSlice('partial',levels.middle,0,.8,1,()=>clock+=.2),'pending');gl.contextLost();assert.equal(r.entries.size,0);assert.equal(r.mergedBindings.size,0);assert.equal(r.levelOwners.size,0);assert.ok(Object.values(r.diagnostics().mergedTiers).every(t=>!t.records&&!t.copying));
  gl.contextRestored();await settle(r,[c]);assert.equal(r.diagnostics().active,1);assert.deepEqual(r.snapshotOf('c').skin.positions,original);
 }finally{r.dispose();}assert.equal(gl.inspect().buffers,0);
});

test('all cold animals receive coarse jobs before any near upgrade; identities are canonical', async () => {
  const calls = [], provider = {async build(job) {calls.push(job); return result(job);}};
  const r = new FaunaComposerRenderer({provider, pose: g => poseComposer(g, 'idle', 0), capacity: 4});
  try {const candidates = ['a','b','c','d'].map(id => candidate(id, 5)); await pump(r, candidates);
    assert.equal(r.diagnostics().active, 4);
    assert.deepEqual(calls.slice(0, 4).map(j => [j.key, ...j.tiers]), [['a','far'],['b','far'],['c','far'],['d','far']]);
    assert.ok(calls.slice(4).every(j => j.tiers[0] === 'near' && j.loadedSource === source), 'upgrade borrows the retained original');
    assert.equal(faunaComposerSourceKey({b: 2, a: 1}, 'v'), faunaComposerSourceKey({a: 1, b: 2}, 'v'));
    assert.throws(() => {candidates[0].definition.id = 'changed';}, /read only/);
  } finally {r.dispose();}
});

test('shared canonical text is validated, frozen and retained without removing its budget allowance',async()=>{
 const r=new FaunaComposerRenderer({provider:{async build(job){return result(job);}},pose:g=>poseComposer(g,'idle',0),capacity:1});
 try{
  const a={...candidate('shared'),canonicalDefinition:'{"id":"shared"}'};
  await pump(r,[a]);assert.equal(r.diagnostics().active,1);assert.ok(Object.isFrozen(a.definition));
  const entry=r.entries.get(a.sourceKey);assert.equal(entry.definition,a.canonicalDefinition);
  assert.ok(entry.cpuBytes>=entry.graphBytes+a.canonicalDefinition.length*2,'the retained shared text is still accounted');
  assert.throws(()=>r.update([{...a,canonicalDefinition:'{"id":"changed"}'}]),/shared canonical identity mismatch/);
  r.setContext('new');assert.throws(()=>r.update([{...candidate('bad'),canonicalDefinition:'{"id":"different"}'}]),/shared canonical identity mismatch/);
 }finally{r.dispose();}
});
test('bounded near promotions preserve cold coverage and borrow the verified original', async () => {
  const calls = [], provider = {async build(job) {calls.push(job); return result(job);}};
  const r = new FaunaComposerRenderer({provider, pose: g => poseComposer(g, 'idle', 0), capacity: 6, coldJobsBeforeNearUpgrade: 2});
  try {
    const candidates = ['a','b','c','d','e','f'].map((id, i) => candidate(id, i ? 300 : 5));
    await pump(r, candidates, 20);
    assert.deepEqual(calls.slice(0, 4).map(j => [j.key, ...j.tiers]), [['a','far'],['b','far'],['a','near'],['c','far']]);
    assert.equal(calls[2].loadedSource, source);
    assert.equal(r.diagnostics().active, 6);
    assert.equal(r.diagnostics().actors.find(a => a.id === 'a').tier, 'near');
    assert.equal(calls.filter(j => j.tiers[0] === 'far').length, 6);
  } finally {r.dispose();}
});

test('bounded middle refinement preserves all canonical members and settles without impossible upgrades', async () => {
  const calls = [], provider = {async build(job) {calls.push(job); return result(job);}};
  const r = new FaunaComposerRenderer({provider, pose: g => poseComposer(g, 'idle', 0), capacity: 8, middleSourceCache: 2});
  try {
    const candidates = Array.from({length: 8}, (_, i) => candidate(String(i), 60 + i));
    await pump(r, candidates, 24);
    assert.equal(r.diagnostics().active, 8);
    assert.equal(r.diagnostics().upgradesPending, 0);
    assert.deepEqual(calls.filter(j => j.tiers[0] === 'middle').map(j => j.key), ['0','1']);
    assert.equal(r.diagnostics().actors.filter(a => a.tier === 'middle').length, 2);
    assert.equal(r.diagnostics().actors.filter(a => a.tier === 'far').length, 6);
    assert.equal(r.diagnostics().farTierBudgetFallbacks, 6);
    await pump(r, candidates.slice().reverse(), 8);
    assert.equal(r.diagnostics().active, 8);
    assert.deepEqual(r.diagnostics().actors.filter(a => a.tier === 'middle').map(a => a.id).sort(), ['6','7']);
    assert.equal(r.diagnostics().upgradesPending, 0);
    r.setContext('other'); assert.equal(r.diagnostics().middleSourcesEligible, 0);
  } finally {r.dispose();}
});

test('measured middle arena limits settle to source-derived far without repeated reduction', async () => {
  const calls = [], provider = {async build(job) {calls.push(job); return result(job);}};
  const r = new FaunaComposerRenderer({provider, pose: g => poseComposer(g, 'idle', 0), capacity: 3, middleSourceCache: 3,
    mergedTiers: {middle: {maxVertices: levels.middle.positions.length / 3, maxIndices: levels.middle.index.length, maxBytes: 4e6}}});
  try {
    const candidates = ['a','b','c'].map(id => candidate(id, 70));
    await pump(r, candidates, 20);
    assert.equal(r.diagnostics().active, 3);
    assert.equal(r.diagnostics().upgradesPending, 0);
    assert.equal(r.diagnostics().actors.filter(a => a.tier === 'middle').length, 1);
    const built = calls.length;
    await pump(r, candidates, 10); assert.equal(calls.length, built, 'known oversized refinements do not rebuild');
    assert.equal(r.diagnostics().failures, 0);
  } finally {r.dispose();}
});

test('completed offscreen result remains cached and a blocked admission never rebuilds each retry interval', async () => {
  let resolve; const calls = [], provider = {build(job) {calls.push(job); return new Promise(r => {resolve = () => r(result(job));});}};
  const r = new FaunaComposerRenderer({provider, pose: g => poseComposer(g, 'idle', 0), capacity: 2, maxSources: 1});
  try {const a = candidate('a'), b = candidate('b'); r.update([a]); r.update([]); resolve(); await waitUntil(()=>!r.running,'offscreen completion'); r.update([]);
    assert.equal(r.diagnostics().sources, 1); assert.equal(r.diagnostics().completedOutOfView, 1); assert.equal(r.update([a]).size, 1);
    r.update([a,b]); resolve(); await waitUntil(()=>!r.running,'blocked completion'); r.update([a,b]);
    for (let i = 0; i < 500; i++) r.update([a,b]);
    assert.equal(calls.length, 2); assert.equal(r.diagnostics().stagedSources, 1); assert.equal(r.diagnostics().failures, 0);
    assert.equal(r.update([b]).has('b'), true); assert.equal(calls.length, 2, 'actual completed result admitted after room appears');
  } finally {r.dispose();}
});
test('mutable definition mismatch is rejected at completion without replacing another phenotype', async () => {
  let resolve; const r = new FaunaComposerRenderer({provider: {build(job) {return new Promise(r => {resolve = () => r(result(job));});}}, pose: g => poseComposer(g, 'idle', 0)});
  try {const c = candidate('a'); r.update([c]); c.definition.id = 'different'; resolve(); await tick(); r.update([c]);
    assert.equal(r.diagnostics().active, 0); assert.match(r.diagnostics().lastError, /mutated during build/);
  } finally {r.dispose();}
});
test('same-version source drift during an upgrade cannot replace the resident animal', async () => {
  let calls = 0;
  const provider = {async build(job) {calls++; const built = result(job); if (calls > 1) {
    const changed = structuredClone(built); changed.source.skin.positions[0] += .01;
    changed.levels.near.positions = changed.source.skin.positions; return changed;
  } return built;}};
  const r = new FaunaComposerRenderer({provider, pose: g => poseComposer(g, 'idle', 0), capacity: 1});
  try {const c = candidate('a', 5); await pump(r, [c], 8);
    assert.equal(r.diagnostics().active, 1); assert.equal(r.diagnostics().actors[0].tier, 'far');
    assert.match(r.diagnostics().lastError, /original source changed/);
  } finally {r.dispose();}
});
test('arena-owned cached attributes remain valid through visibility changes and source eviction', async () => {
  const calls = [], provider = {async build(job) {calls.push(job.key); return result(job);}}, vertices = levels.far.positions.length / 3;
  const r = new FaunaComposerRenderer({provider, pose: g => poseComposer(g, 'idle', 0), capacity: 2, maxSources: 2,
    mergedTiers: {far:{maxVertices:vertices*2,maxIndices:levels.far.index.length*2,maxBytes:3e6}}});
  try {const a=candidate('a'), b=candidate('b'), c=candidate('c'); await pump(r,[a,b]); const owned=r.ownedBytes;
    r.update([]); assert.equal(r.diagnostics().mergedTiers.far.records,2); assert.equal(r.update([b,a]).size,2); assert.equal(calls.length,2);
    await pump(r,[b,c]); assert.equal(r.diagnostics().active,2); assert.equal(r.diagnostics().sources,2); assert.equal(calls.length,3);
    assert.ok(Math.abs(r.ownedBytes-owned)<1024); assert.equal(r.diagnostics().failures,0);
  } finally {r.dispose();}
});
test('verified receipts bind all real arrays, exact definition and source versions; tags alone never authorize', async () => {
  const job = {key: 'a', definition: {id: 'a'}, tiers: ['far']}, valid = result(job);
  valid.receipt = await createComposerBuildReceipt(job, valid);
  assert.equal(isVerifiedComposerBuild(valid), false); await verifyComposerBuildReceipt(job, valid); assert.equal(isVerifiedComposerBuild(valid), true);
  const changed = structuredClone(valid); changed.levels.far.gloss[0] += .01;
  await assert.rejects(verifyComposerBuildReceipt(job, changed), /digest mismatch/);
  await assert.rejects(verifyComposerBuildReceipt({...job, definition: {id: 'b'}}, structuredClone(valid)), /digest mismatch/);
  const impostor = structuredClone(valid); impostor.source.skin.version = 'other'; await assert.rejects(verifyComposerBuildReceipt(job, impostor), /metadata mismatch/);
  const corrupt = structuredClone(valid); corrupt.levels.far.positions[0] += .1;
  await assert.rejects(createComposerBuildReceipt(job, corrupt), /original Composer/);
  const far = buildFaunaComposerRequestedLevels(source, ['far']).far; assert.deepEqual(far, levels.far, 'coarse-only reduction follows the same source path');
});
test('persistent worker performs strict checks once per job, reuses startup, and never detaches a borrowed source', async () => {
  let created = 0, terminated = 0;
  class FakeWorker {
    constructor() {created++; this.scope = {onmessage: null, postMessage: data => queueMicrotask(() => this.onmessage?.({data: structuredClone(data)}))}; installFaunaComposerSourceWorker(this.scope, () => structuredClone(source));}
    postMessage(data) {queueMicrotask(() => this.scope.onmessage({data: structuredClone(data)}));}
    terminate() {terminated++;}
  }
  const provider = createFaunaComposerWorkerProvider(() => new FakeWorker(), 30000, {maxJobsPerWorker: 4});
  try {for (const key of ['a','b']) {const r = await provider.build({key, definition: {key}, tiers: ['near'], loadedSource: source}, new AbortController().signal); assert.ok(isVerifiedComposerBuild(r));}
    assert.equal(created, 1); assert.equal(terminated, 0); assert.ok(source.skin.positions.byteLength > 0);
  } finally {provider.dispose();} assert.equal(terminated, 1);
  created=0;terminated=0;const recycled=createFaunaComposerWorkerProvider(()=>new FakeWorker());
  try {for(const key of ['a','b'])await recycled.build({key,definition:{key},tiers:['near'],loadedSource:source},new AbortController().signal);
    assert.equal(created,2);assert.equal(terminated,2,'default retires each completed worker');
  }finally{recycled.dispose();}
  assert.throws(()=>createFaunaComposerWorkerProvider(()=>new FakeWorker(),30000,{maxJobsPerWorker:0}),/reuse cap/);
});
test('sliced arena admission remains invisible until complete, owns exact attributes and frees partial reservations', () => {
  const skin = levels.far, vertices = skin.positions.length / 3;
  const texture = new THREE.DataTexture(new Float32Array(32 * 16), 128, 1);
  const arena = new FaunaComposerMergedBatch({maxVertices: vertices, maxIndices: skin.index.length, maxActors: 1, maxBytes: 2e6, bones: {value: texture}});
  try {let clock = 0; const now = () => clock++;
    assert.equal(arena.registerSlice('a', skin, 0, .8, 2, now), 'pending'); assert.equal(arena.submit('a', new THREE.Matrix4()), false);
    assert.equal(arena.mesh.geometry.drawRange.count, 0); arena.release('a'); assert.equal(arena.diagnostics().copying, 0);
    assert.ok(arena.register('b', skin, 0)); const owned = arena.residentSkin('b', skin);
    assert.deepEqual(owned.positions, skin.positions); assert.deepEqual(owned.skinIndex, skin.skinIndex);
    assert.equal(composerTypedBytes(owned, arena.backingBuffers), skin.index.byteLength + skin.sourceVertex.byteLength);
    assert.ok(composerTypedBytes(owned, arena.backingBuffers) < composerTypedBytes(skin) / 3);
  } finally {arena.dispose(); texture.dispose();}
});
