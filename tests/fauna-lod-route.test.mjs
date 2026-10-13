import test from 'node:test';
import assert from 'node:assert/strict';
import {lifeRendererModule,runLifeScenario,digestPoses,createRenderer,body} from './life-scenario.mjs';

const LEGACY={faunaGenerator:'archive-quadruped'};

test('versioned body switches to legacy in XR and back without changing the planet, terrain or canonical animals',async()=>{
  const fixture=await lifeRendererModule({prefix:'fauna-body-style-'}),pose={...digestPoses()[0],clearanceM:80,pitchDeg:-15};
  try{await runLifeScenario(fixture.module,[pose],{rendererOptions:{...LEGACY,faunaBodyPresentation:'sculpted-v1'},onFrame(_i,r){
    assert.equal(r.faunaNear.presentation,'sculpted-v1');const terrain=r.patches,worldBody=r.body,group=r.group;
    const canonical=r.faunaDrawn.map(x=>({id:x.id,genome:x.genome,position:x.position}));
    r.setFaunaLodImmersive(true);assert.equal(r.faunaNear.presentation,'legacy-v4');assert.equal(r.faunaLod,null);
    r.setFaunaLodImmersive(false);assert.equal(r.faunaNear.presentation,'sculpted-v1');
    assert.equal(r.patches,terrain);assert.equal(r.body,worldBody);assert.equal(r.group,group);
    assert.deepEqual(r.faunaDrawn.map(x=>({id:x.id,genome:x.genome,position:x.position})),canonical);return false;
  }});}finally{await fixture.cleanup();}
});

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
    await runLifeScenario(m,poses,{onFrame:capture(canonical),rendererOptions:LEGACY});
    await runLifeScenario(m,poses,{onFrame:capture(optIn),rendererOptions:{...LEGACY,faunaLodPrototype:()=>({adapter,sourceVersion:'genome1/body4/kit0.3',appearanceVersion:'route-proof',controller:{fadeSeconds:0}})}});
    assert.deepEqual(optIn,canonical,'representation work cannot remove/reseed/move a member');assert.ok(jobs.length>0,'actual route dispatches existing camera animals without Land');
    assert.ok(traces.some(frame=>frame.some(c=>c.distanceM>95&&c.distanceM<=200)),'80m arrival includes actual camera candidates beyond the old95m rig window');
    assert.ok(traces.every(frame=>frame.length<=128&&frame.filter(c=>c.tier==='close').length<=16&&frame.filter(c=>c.tier==='middle').length<=112));
    for(const job of jobs){assert.equal(job.context.planetId,jobs[0].context.planetId);assert.ok(canonical.some(frame=>frame.drawn.some(x=>x.id===job.individualId&&JSON.stringify(x.genome)===JSON.stringify(job.genome))));assert.ok([750,1500].includes(job.targetTriangles));}
  }finally{prototype.submitFauna=original;await fixture.cleanup();}
});

test('failed prototype initialization keeps legacy presentation and does not retry allocation every frame',async()=>{
  const fixture=await lifeRendererModule({prefix:'fauna-lod-init-fail-'}),pose={...digestPoses()[0],clearanceM:80,pitchDeg:-15};let attempts=0;
  try{await runLifeScenario(fixture.module,[pose,pose,pose],{rendererOptions:{...LEGACY,faunaLodPrototype:()=>{attempts++;throw new Error('unsupported adapter budget');}},onFrame(_i,r){
    assert.equal(r.faunaLod,null);assert.ok(r.faunaRenderer.meshes.every(mesh=>!mesh.geometry.hasAttribute('instanceFaunaCoverage')));assert.ok(r.faunaDrawn.length>0);assert.match(r.faunaLodInitError,/budget/);return false;}});
    assert.equal(attempts,1);
  }finally{await fixture.cleanup();}
});

test('initial XR creates no provider; desktop→XR disposes/cancels prototype and restores legacy fauna buffers without terrain rebuild',async()=>{
  const fixture=await lifeRendererModule({prefix:'fauna-lod-xr-'}),m=fixture.module,created=[],pending=[];
  const factory=()=>{const adapter={group:new m.THREE.Group(),ownedBytes:100,transientBytes:0,workerReserveBytes:4*1024*1024,disposed:false,
    build(job,signal){return new Promise((resolve,reject)=>{const item={job,signal,resolve,reject};pending.push(item);signal.addEventListener('abort',()=>reject(new Error('cancelled')),{once:true});});},
    adopt(){return false;},release(){},discard(){},beginFrame(){},submit(){return false;},endFrame(){},reset(){},dispose(){this.disposed=true;this.group.clear();}};created.push(adapter);return {adapter,sourceVersion:'xr-source',appearanceVersion:'xr-test'};};
  const pose={...digestPoses()[0],clearanceM:80,pitchDeg:-15},snapshots=[];
  try{
    await runLifeScenario(m,[pose,pose,pose,pose],{rendererOptions:{...LEGACY,faunaLodPrototype:factory,presentationContinuity:true},onFrame(i,r){
      const sceneGroup=r.group,body=r.body,life=r.lifeContext,tiles=r.patches,drawn=r.faunaDrawn.map(x=>({id:x.id,position:x.position}));
      if(i===0){assert.equal(created.length,1);assert.ok(r.faunaRenderer.meshes.every(mesh=>mesh.geometry.hasAttribute('instanceFaunaCoverage')));}
      else if(i===1){assert.ok(pending.some(job=>!job.signal.aborted),'exercise an active pending worker, not only a scheduled microtask');
        r.setFaunaLodImmersive(true);assert.equal(created[0].disposed,true);assert.equal(r.faunaLod,null);assert.equal(r.faunaLodContext,null);assert.equal(r.faunaLodPool.length,0);assert.equal(r.faunaLodTrace(),null);
        assert.ok(r.faunaRenderer.meshes.every(mesh=>!mesh.geometry.hasAttribute('instanceFaunaCoverage')&&mesh.customDepthMaterial===undefined));assert.ok(pending.every(job=>job.signal.aborted));
      }else if(i===2){r.setFaunaLodImmersive(true);const before=created.length;assert.equal(before,2);r.setFaunaLodImmersive(true);assert.equal(created.length,before,'XR does not create another provider');r.setFaunaLodImmersive(false);assert.equal(created.length,before,'desktop return waits for actual camera demand');}
      assert.equal(r.group,sceneGroup);assert.equal(r.body,body);assert.equal(r.lifeContext,life);assert.equal(r.patches,tiles);snapshots.push(drawn);return false;
    }});
    assert.deepEqual(snapshots[0],snapshots[1],'same date/camera canonical population remains through presentation transitions');
    const prototype=m.PlanetRenderer.prototype,update=prototype.update,count=created.length;
    prototype.update=function(...args){args[4]=true;return update.apply(this,args);};
    try{await runLifeScenario(m,[pose],{rendererOptions:{...LEGACY,faunaLodPrototype:factory},onFrame(_i,r){assert.equal(r.faunaLod,null);assert.ok(r.faunaRenderer.meshes.every(mesh=>!mesh.geometry.hasAttribute('instanceFaunaCoverage')));return false;}});
      assert.equal(created.length,count,'actual constructor and initial XR frames cannot initialize provider');
    }finally{prototype.update=update;}
    assert.ok(created.every(adapter=>adapter.disposed),'renderer disposal releases final desktop provider');
  }finally{await fixture.cleanup();}
});

test('lazy camera demand avoids lifeless/shadow/hidden allocations and recreates after hidden life without changing world identity',async()=>{
  const fixture=await lifeRendererModule({prefix:'fauna-lod-demand-'}),m=fixture.module,created=[],pending=[];
  const factory=()=>{const adapter={group:new m.THREE.Group(),ownedBytes:100,transientBytes:0,workerReserveBytes:65536,disposed:false,
    build(job,signal){return new Promise((resolve,reject)=>{pending.push({job,signal});signal.addEventListener('abort',()=>reject(new Error('cancelled')),{once:true});});},
    adopt(){return false;},release(){},discard(){},beginFrame(){},submit(){return false;},endFrame(){},reset(){},dispose(){this.disposed=true;this.group.clear();}};created.push(adapter);return {adapter,sourceVersion:'demand-source',appearanceVersion:'demand-test'};};
  const options={...LEGACY,faunaLodPrototype:factory},cold=createRenderer(m,body,{rendererOptions:options});
  try{
    assert.equal(created.length,0,'constructor retains factory without allocating pool arrays');
    cold.renderer.setFaunaLodImmersive(false,true);assert.equal(created.length,0,'null life cannot instantiate even with a demand request');
    for(const life of [{faunaStage:'sterile'},{faunaStage:'complex',faunaSpecies:[]},{faunaStage:'complex',faunaAvailableArchetypes:[]}]){cold.renderer.lifeContext=life;cold.renderer.setFaunaLodImmersive(false,true);assert.equal(created.length,0);}
    cold.renderer.hideLife();assert.equal(created.length,0);assert.equal(cold.renderer.faunaLod,null);
  }finally{cold.dispose();}
  const pose={...digestPoses()[0],clearanceM:80,pitchDeg:-15},snapshots=[];
  const original=m.PlanetRenderer.prototype.drawFauna;
  m.PlanetRenderer.prototype.drawFauna=function(eye,date,frustum){const empty=new m.THREE.Frustum();for(const plane of empty.planes)plane.set(new m.THREE.Vector3(1,0,0),-100);return original.call(this,eye,date,empty,frustum);};
  try{await runLifeScenario(m,[pose],{rendererOptions:options,onFrame(_i,r){assert.equal(created.length,0,'shadow-only actual animals do not construct a camera pool');assert.ok(r.faunaVisibleList.length>0);assert.equal(r.faunaCameraVisibleCount,0);return false;}});
  }finally{m.PlanetRenderer.prototype.drawFauna=original;}
  try{await runLifeScenario(m,[pose,pose,pose,pose],{rendererOptions:options,onFrame(i,r){
    snapshots.push(r.faunaDrawn.map(item=>({id:item.id,position:item.position,genome:item.genome})));
    const terrain=r.patches,scene=r.group,life=r.lifeContext;
    if(i===0){assert.equal(created.length,1);assert.ok(r.faunaCameraVisibleCount>0);
      const empty=new m.THREE.Frustum();for(const plane of empty.planes)plane.set(new m.THREE.Vector3(1,0,0),-100);
      r.drawFauna(r.lastEye,pose.dateNs,empty,null);assert.equal(r.faunaCameraVisibleCount,0);assert.equal(created.length,1);assert.equal(created[0].disposed,false,'brief empty camera view retains established pool');
    }else if(i===1){assert.ok(pending.some(job=>!job.signal.aborted));r.hideLife();assert.equal(created[0].disposed,true);assert.equal(r.faunaLod,null);assert.equal(r.faunaLodTrace(),null);assert.ok(pending.every(job=>job.signal.aborted));assert.ok(r.faunaRenderer.meshes.every(mesh=>!mesh.geometry.hasAttribute('instanceFaunaCoverage')));
    }else if(i===2){assert.equal(created.length,2,'visible animals recreate resources after global hidden life');assert.equal(created[1].disposed,false);}
    assert.equal(r.patches,terrain);assert.equal(r.group,scene);assert.equal(r.lifeContext,life);return false;
  }});assert.deepEqual(snapshots[0],snapshots[1]);assert.deepEqual(snapshots[0],snapshots[2]);assert.deepEqual(snapshots[0],snapshots[3]);assert.ok(created.every(adapter=>adapter.disposed));
  }finally{await fixture.cleanup();}
});
