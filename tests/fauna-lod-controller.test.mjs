import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FaunaLodController,faunaLodTierAt} from '../src/fauna-lod-controller.ts';
import {generateCreatureGenome} from '../src/creature-model.ts';
import {buildQuadrupedBody} from '../src/fauna-body-plan.ts';
const genome=generateCreatureGenome('LOD-RUNTIME-CONTROLLER','runner');
const context={planetId:'actual/planet/1',lifeSignature:'life-a',dateVersion:'genome1/body4',appearanceVersion:'packed-proof-1'},origin=new THREE.Vector3();
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
function candidate(id,distanceM=140,cameraVisible=true){return {id,genome,member:{id},activity:{pose:{gait:'idle'},travel:0,stateS:3,revolutionS:Infinity},cameraVisible,distanceM,matrix:new THREE.Matrix4(),rigSeconds:0,nearCoverage:0};}
function fixture(options={}){
  let time=0,wakes=0;const jobs=[],draws=[],discarded=[],resources=new Map();
  const adapter={group:new THREE.Group(),ownedBytes:100,transientBytes:0,workerReserveBytes:65536,disposed:false,
    build(job,signal){return new Promise((resolve,reject)=>jobs.push({job,signal,resolve,reject}));},
    adopt(id,key,result,budgetMs){assert.ok(budgetMs>0);resources.set(id,key);return true;},release(id,key){if(resources.get(id)===key)resources.delete(id);},discard(result){discarded.push(result);},
    beginFrame(){draws.length=0;},submit(c,coverage,start){draws.push({id:c.id,coverage,low:Math.fround(start),high:Math.fround(Math.min(1,start+coverage)),matrix:c.matrix,genome:c.genome});return true;},endFrame(){},reset(){resources.clear();},dispose(){resources.clear();this.disposed=true;}};
  const controller=new FaunaLodController(adapter,{maxResultBytes:500,maxTotalBytes:1024*1024,fadeSeconds:0,now:()=>time,onReady:()=>wakes++,...options});controller.setContext(context);
  const result=(overrides={})=>({accepted:true,byteLength:100,appearanceVersion:context.appearanceVersion,payload:{},...overrides});
  return {adapter,controller,jobs,draws,discarded,resources,result,setTime(n){time=n;},get wakes(){return wakes;}};
}

test('bounded single cold job adopts only requested exact members and never consumes shadow/full-near fallback ownership',async()=>{
  const f=fixture({maxActors:2});const a=candidate('camera-first',160),b=candidate('camera-second',180),shadow=candidate('shadow-only',10,false),near=candidate('full-near',10);near.nearCoverage=1;
  const input=[near,a,b,shadow],snapshot=input.slice();
  f.controller.update(input,origin);await flush();assert.equal(f.jobs.length,1);assert.equal(f.jobs[0].job.individualId,a.id);assert.equal(f.jobs[0].job.genome.seed,a.genome.seed);
  for(let i=0;i<5;i++)f.controller.update(input,origin);await flush();assert.equal(f.jobs.length,1,'only one cold job may exist');
  assert.equal(f.controller.fallbackCoverage(a.id),1);f.jobs[0].resolve(f.result());await flush();assert.ok(f.wakes>0,'asynchronous readiness wakes a paused observer');assert.equal(f.controller.idle,false);
  f.controller.update(input,origin);await flush();assert.deepEqual(f.draws.map(x=>x.id),[a.id]);assert.equal(f.controller.fallbackCoverage(a.id),0);assert.equal(f.controller.fallbackCoverage(shadow.id),1);assert.equal(f.controller.fallbackCoverage(near.id,1),0);
  assert.equal(f.jobs.length,2);assert.equal(f.jobs[1].job.individualId,b.id);assert.deepEqual(input,snapshot,'canonical ordered population is not modified');
  assert.equal(f.draws[0].matrix,a.matrix);assert.equal(f.draws[0].genome,a.genome);f.controller.dispose();f.jobs[1].resolve(f.result());await flush();
});

test('context cancellation is fail-closed even when an adapter ignores abort: no concurrent job and no stale adoption',async()=>{
  const f=fixture(),a=candidate('member');f.controller.update([a],origin);await flush();const old=f.jobs[0];
  f.controller.setContext({...context,dateVersion:'explicit-date/genome-version-2'});assert.equal(old.signal.aborted,true);f.controller.update([a],origin);await flush();assert.equal(f.jobs.length,1);
  old.resolve(f.result());await flush();assert.equal(f.discarded.length,1);assert.equal(f.resources.size,0);
  f.controller.update([a],origin);await flush();assert.equal(f.jobs.length,2);assert.equal(f.jobs[1].job.context.dateVersion,'explicit-date/genome-version-2');
  f.controller.dispose();f.jobs[1].resolve(f.result());await flush();assert.equal(f.resources.size,0);assert.equal(f.discarded.length,2);
});

test('complementary near/pool/fallback coverage remains continuous through adoption and 175–200m range fade',async()=>{
  const f=fixture({fadeSeconds:.25}),a=candidate('fading',190);a.nearCoverage=.2;
  f.controller.update([a],origin);await flush();f.jobs[0].resolve(f.result());await flush();f.controller.update([a],origin);
  assert.equal(f.controller.fallbackCoverage(a.id,a.nearCoverage),.8);assert.equal(f.controller.idle,false);
  f.setTime(125);f.controller.update([a],origin);const pool=f.draws[0].coverage,fallback=f.controller.fallbackCoverage(a.id,a.nearCoverage);
  assert.ok(pool>0&&pool<.8);assert.equal(f.draws[0].low,Math.fround(a.nearCoverage));assert.equal(f.draws[0].high+fallback,1,'shared Float32 endpoint is exactly complementary');
  f.setTime(250);a.distanceM=140;f.controller.update([a],origin);assert.equal(f.draws[0].coverage,.8);assert.equal(f.controller.fallbackCoverage(a.id,a.nearCoverage),0);
  a.distanceM=200;f.controller.update([a],origin);assert.equal(f.draws.length,0);assert.equal(f.controller.fallbackCoverage(a.id,a.nearCoverage),.8);f.controller.dispose();
});

test('malformed, refused, oversized, wrong-appearance and over-budget results keep original fallback',async()=>{
  for(const patch of [{accepted:false},{byteLength:501},{byteLength:NaN},{appearanceVersion:'unaccepted-material'}]){
    const f=fixture(),a=candidate('rejected');f.controller.update([a],origin);await flush();f.jobs[0].resolve(f.result(patch));await flush();f.controller.update([a],origin);
    assert.equal(f.resources.size,0);assert.equal(f.controller.fallbackCoverage(a.id),1);assert.equal(f.discarded.length,1);f.controller.dispose();
  }
  const f=fixture(),a=candidate('pressure');f.controller.update([a],origin);await flush();f.adapter.transientBytes=1024*1024;f.jobs[0].resolve(f.result());await flush();f.controller.update([a],origin);
  assert.equal(f.resources.size,0);assert.equal(f.controller.fallbackCoverage(a.id),1);f.controller.dispose();
});

test('cold payload clones a loaded exact source; transferring its clone preserves the live near body buffers',async()=>{
  const source=buildQuadrupedBody(genome),original=source.positions.slice(),f=fixture({maxTotalBytes:4*1024*1024}),a=candidate('loaded');a.loadedSource=source;f.adapter.workerReserveBytes=2*1024*1024;
  f.controller.update([a],origin);await flush();const job=f.jobs[0].job;
  assert.notEqual(job.genome,genome);assert.deepEqual(job.genome,genome);assert.equal(job.loadedSource.plan.genome,job.genome);assert.notEqual(job.loadedSource.positions.buffer,source.positions.buffer);
  structuredClone(job,{transfer:[job.loadedSource.positions.buffer]});assert.deepEqual(source.positions,original);assert.ok(source.positions.byteLength>0);
  f.controller.dispose();f.jobs[0].resolve(f.result());await flush();
});

test('camera churn evicts only unrequested cached members and caches remain capped',async()=>{
  const f=fixture({maxActors:2}),a=candidate('a'),b=candidate('b'),c=candidate('c');
  for(const input of [[a,b],[a,b],[b,c]]){
    f.controller.update(input,origin);await flush();f.jobs.at(-1).resolve(f.result());await flush();f.controller.update(input,origin);await flush();
  }
  assert.ok(f.controller.diagnostics().prepared<=2);assert.deepEqual([...f.resources.keys()].sort(),['b','c']);assert.equal(f.controller.fallbackCoverage(a.id),1);
  f.controller.dispose();if(f.jobs.at(-1).signal.aborted)f.jobs.at(-1).resolve(f.result());await flush();
});

test('tier upgrades/downshifts retain the old draw until atomic success and use explicit target identity',async()=>{
  const f=fixture(),a=candidate('tier');a.tier='middle';f.controller.update([a],origin);await flush();f.jobs[0].resolve(f.result());await flush();f.controller.update([a],origin);const old=f.resources.get(a.id);
  a.tier='close';f.controller.update([a],origin);await flush();assert.equal(f.jobs[1].job.targetTriangles,1500);assert.equal(f.jobs[1].job.tier,'close');assert.equal(f.resources.get(a.id),old);assert.equal(f.controller.fallbackCoverage(a.id),0);
  f.jobs[1].resolve(f.result());await flush();f.controller.update([a],origin);assert.notEqual(f.resources.get(a.id),old);assert.equal(f.controller.fallbackCoverage(a.id),0);
  a.tier='middle';f.controller.update([a],origin);await flush();assert.equal(f.jobs[2].job.targetTriangles,750);assert.equal(f.controller.fallbackCoverage(a.id),0);
  f.jobs[2].resolve(f.result({accepted:false}));await flush();f.controller.update([a],origin);assert.equal(f.controller.fallbackCoverage(a.id),0,'failed downshift keeps the old body');f.controller.dispose();
  assert.equal(faunaLodTierAt(80,'close'),'close');assert.equal(faunaLodTierAt(96,'close'),'middle');assert.equal(faunaLodTierAt(80,'middle'),'middle');assert.equal(faunaLodTierAt(64,'middle'),'close');
});

test('impossible worker/clone reserve rejects before cloning or cold work and reports the blocking budget',async()=>{
  const f=fixture();assert.throws(()=>new FaunaLodController(f.adapter,{maxResultBytes:500,maxWorkerBytes:65500}),/worker reserve/);
  const a=candidate('small-reserve');a.loadedSource=buildQuadrupedBody(genome);f.adapter.workerReserveBytes=1;f.controller.update([a],origin);await flush();assert.equal(f.jobs.length,0);assert.equal(f.controller.diagnostics().admissionBlocked,'worker-reserve-smaller-than-cloned-input');f.controller.dispose();
});
