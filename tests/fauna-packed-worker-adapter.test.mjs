import test from 'node:test';
import assert from 'node:assert/strict';
import {generateCreatureGenome,realisticIndividualCreatureGenome} from '../src/creature-model.ts';
import {quadrupedBodyBuildSteps,buildQuadrupedBody} from '../src/fauna-body-plan.ts';
import {createFaunaPackedWorkerAdapter,faunaPackedPayloadBytes,faunaPackedPayloadTransfers} from '../src/fauna-packed-worker-adapter.ts';
import {FAUNA_PLANET_CRISP_RAW_PACKED_VERSION} from '../src/fauna-planet-crisp-packed.ts';
import {FaunaPlanetCrispBatch} from '../src/fauna-planet-crisp-batch.ts';
const genome=realisticIndividualCreatureGenome(generateCreatureGenome('PACKED-WORKER','browser'),'worker',1,'adult','ungulate');
const provider={version:'test-exact-provider',quadrupedBodyBuildSteps,createQuadrupedBodyPatternSampler(source){return {version:'quadruped-body-pattern-sampler-raw-1',source,sampleInto(x,y,z,ny,layers,context){layers.set([.3,.2,.1,.2,.15,.05,.2,.15,.05]);Object.assign(context,{x,y,z,dorsal:ny,region:'torso',along:0,footprint:.025});return {coat:{pattern:'spots',seed:4294967295,scale:.5,threshold:0,warp:.2,bellyLine:0},region:'torso',mask:.5,patch:0,affineError:0,rawLayers:true};}};}};
const job=loadedSource=>({key:'individual/worker/750/raw',individualId:'individual/worker',genome,loadedSource,context:{planetId:'test-planet',lifeSignature:'life-exact',dateVersion:'date-exact',appearanceVersion:FAUNA_PLANET_CRISP_RAW_PACKED_VERSION}});
test('worker bridge produces lean transferable payload and preserves borrowed source/body identity',async()=>{
  const source=buildQuadrupedBody(genome),before=source.positions.slice(),adapter=createFaunaPackedWorkerAdapter(provider,{yieldWork:async()=>{}}),result=await adapter.build(job(source),new AbortController().signal);
  assert.equal(result.accepted,true);const payload=result.payload;assert.equal(payload.source,undefined);assert.equal(payload.sourceGeometry.sourceVertex,undefined);assert.equal(payload.sourceGeometry.representative,undefined);assert.equal(payload.sourcePlan,payload.sourceGeometry.plan);assert.equal(payload.individualId,'individual/worker');assert.equal(result.byteLength,faunaPackedPayloadBytes(payload));
  const transfers=faunaPackedPayloadTransfers(payload);assert.equal(new Set(transfers).size,transfers.length);assert.ok(!transfers.includes(source.positions.buffer));const received=structuredClone(payload,{transfer:transfers});assert.ok(received.sourceGeometry.positions.byteLength>0);assert.deepEqual(source.positions,before);
  const batch=new FaunaPlanetCrispBatch({cacheMode:'atlas-owned',basisStorage:'packed-snorm16',maxIndicesPerAnimal:2250});try{assert.equal(batch.registerGeometry(received.key,received),true);assert.equal(batch.prepareAnimal(received.individualId,received.key),true);assert.equal(batch.diagnostics().basisCacheBytes,0);}finally{batch.dispose();}
});
test('cold Kit provider path yields/cancels and rejects identity, capacity and old appearance API',async()=>{
  const abort=new AbortController();let yields=0,adapter=createFaunaPackedWorkerAdapter(provider,{yieldWork:async()=>{if(++yields===2)abort.abort();}});await assert.rejects(adapter.build(job(null),abort.signal),/cancelled/);assert.equal(yields,2);
  adapter=createFaunaPackedWorkerAdapter(provider,{yieldWork:async()=>{}});const cold=await adapter.build(job(null),new AbortController().signal);assert.equal(cold.accepted,true);assert.ok(cold.sourceTypedBytes>cold.byteLength);
  const source=buildQuadrupedBody(genome);await assert.rejects(adapter.build({...job(source),genome:{...genome,color:'#ffffff'}},new AbortController().signal),/genome differs/);
  const tiny=createFaunaPackedWorkerAdapter(provider,{maxVertices:1,yieldWork:async()=>{}});assert.equal((await tiny.build(job(source),new AbortController().signal)).accepted,false);
  const old=createFaunaPackedWorkerAdapter({...provider,createQuadrupedBodyPatternSampler(s){return {...provider.createQuadrupedBodyPatternSampler(s),version:'quadruped-body-pattern-sampler-1'};}},{yieldWork:async()=>{}});await assert.rejects(old.build(job(source),new AbortController().signal),/exact raw/);
});
