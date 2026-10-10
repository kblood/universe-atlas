import test from 'node:test';
import assert from 'node:assert/strict';
import {lifeRendererModule,runLifeScenario,digestPoses} from './life-scenario.mjs';

test('production-route opt-in preserves canonical population/poses, wakes paused work, and keeps fallback on refused adoption',async()=>{
  const fixture=await lifeRendererModule({prefix:'fauna-lod-route-'}),m=fixture.module,jobs=[],traces=[];
  const prototype=m.PlanetRenderer.prototype,original=prototype.submitFauna;
  prototype.submitFauna=function(...args){original.apply(this,args);if(this.faunaLod)traces.push(this.faunaLodList.map(c=>({id:c.id,distanceM:c.distanceM,tier:c.tier,nearCoverage:c.nearCoverage,position:c.matrix.elements.slice(12,15)})));};
  const adapter={group:new m.THREE.Group(),ownedBytes:100,transientBytes:0,workerReserveBytes:4*1024*1024,build:async job=>{jobs.push(job);return {accepted:true,byteLength:100,appearanceVersion:'route-proof',payload:{}};},
    adopt(){return false;},release(){},discard(){},beginFrame(){},submit(){return false;},endFrame(){},reset(){},dispose(){}};
  const first=digestPoses()[0],poses=Array.from({length:4},()=>({...first,clearanceM:80,pitchDeg:-15,phase:'paused-arrival80'}));
  const canonical=[],optIn=[];
  const capture=out=>(_i,r)=>{out.push({drawn:r.faunaDrawn.map(x=>({id:x.id,cell:x.cell,position:x.position,genome:x.genome})),near:[...r.faunaRigged].sort(),visible:r.faunaVisibleCount,drops:r.faunaBudgetDrops});return false;};
  try{
    await runLifeScenario(m,poses,{onFrame:capture(canonical)});
    await runLifeScenario(m,poses,{onFrame:capture(optIn),rendererOptions:{faunaLodPrototype:{adapter,sourceVersion:'genome1/body4/kit0.3',appearanceVersion:'route-proof',controller:{fadeSeconds:0}}}});
    assert.deepEqual(optIn,canonical,'representation work cannot remove/reseed/move a member');assert.ok(jobs.length>0,'actual route dispatches existing camera animals without Land');
    assert.ok(traces.some(frame=>frame.some(c=>c.distanceM>95&&c.distanceM<=200)),'80m arrival includes actual camera candidates beyond the old95m rig window');
    assert.ok(traces.every(frame=>frame.length<=128&&frame.filter(c=>c.tier==='close').length<=16&&frame.filter(c=>c.tier==='middle').length<=112));
    for(const job of jobs){assert.equal(job.context.planetId,jobs[0].context.planetId);assert.ok(canonical.some(frame=>frame.drawn.some(x=>x.id===job.individualId&&JSON.stringify(x.genome)===JSON.stringify(job.genome))));assert.ok([750,1500].includes(job.targetTriangles));}
  }finally{prototype.submitFauna=original;await fixture.cleanup();}
});
