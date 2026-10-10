import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import * as planet from '#creature-kit/planet';
import {createFaunaLodRuntimePrototype} from '../src/fauna-lod-runtime-adapter.ts';
import {createFaunaPackedWorkerAdapter} from '../src/fauna-packed-worker-adapter.ts';
import {FaunaBonePaletteWriter} from '../src/fauna-skinned-batch.ts';
let workers=[];
class WorkerFixture{
  terminated=false;abort=new AbortController();constructor(){workers.push(this);}
  postMessage(data,transfer){
    const received=structuredClone(data,{transfer});this.received=received;
    const provider={...planet,version:received.providerVersion,quadrupedBodyBuildSteps:g=>planet.quadrupedBodyBuildSteps(g,{presentation:received.presentation??'legacy-v4'})},builder=createFaunaPackedWorkerAdapter(provider,{basisStorage:received.basisStorage,yieldWork:async()=>{}});
    builder.build(received.job,this.abort.signal).then(result=>{if(!this.terminated)this.onmessage?.({data:{key:received.job.key,result:{...result,sourceDigest:'test-source-sha'}}});},error=>{if(!this.terminated)this.onmessage?.({data:{key:received.job.key,error:String(error)}});});
  }
  terminate(){this.terminated=true;this.abort.abort();}
}
function job(prototype,id,tier,genome,source=null){return {key:`job/${id}/${tier}`,individualId:id,tier,targetTriangles:tier==='close'?1500:750,genome,loadedSource:source,
  context:{planetId:'runtime-planet',lifeSignature:'exact-source',dateVersion:prototype.sourceVersion,appearanceVersion:prototype.appearanceVersion}};}
function candidate(id,genome){return {id,genome,member:{id,anchorOffsetX:0,anchorOffsetZ:0,orbitRadiusM:6,orbitAngularSpeed:.2,orbitPhase:0,gaitPeriodS:12},activity:{pose:{x:0,z:0,yaw:0,gait:'walk'},travel:.03,revolutionS:100,stateS:2},
  cameraVisible:true,distanceM:140,matrix:new THREE.Matrix4(),rigSeconds:1,nearCoverage:0,ground:(x,z)=>x*.12-z*.08,groundRevision:1};}

test('sculpted worker geometry carries its real version and rejects a borrowed legacy source before transfer',async()=>{
  const p=createFaunaLodRuntimePrototype({presentation:'sculpted-v1',workerFactory:()=>new WorkerFixture()}),g=planet.generateCreatureGenome('SCULPTED-RUNTIME','runner'),legacy=planet.buildQuadrupedBody(g),before=legacy.positions.slice();
  try{
    await assert.rejects(p.adapter.build(job(p,'wrong-style','middle',g,legacy),new AbortController().signal),/presentation/);
    assert.deepEqual(legacy.positions,before);assert.equal(p.adapter.diagnostics().workerActive,false);
    const j=job(p,'sculpted','middle',g),result=await p.adapter.build(j,new AbortController().signal);
    assert.ok(result.accepted);assert.equal(result.payload.sourcePlan.version,planet.QUADRUPED_SCULPTED_BODY_VERSION);
    assert.match(p.sourceVersion,/quadruped-body-sculpted-1/);assert.deepEqual(result.payload.sourcePlan.genome,g);
    assert.ok(p.adapter.adopt(j.individualId,j.key,result,2));
  }finally{p.adapter.dispose();}
});

test('real Kit cold payload adopts unique body, canonical terrain-aware pose and Float32 interval; worker exits per job',async()=>{
  workers=[];const p=createFaunaLodRuntimePrototype({profile:true,workerFactory:()=>new WorkerFixture()}),g=planet.realisticIndividualCreatureGenome(planet.generateCreatureGenome('RUNTIME-POSE','browser'),'runtime-id',1,'adult','ungulate'),c=candidate('runtime-id',g),j=job(p,c.id,'middle',g);
  try{
    const before=p.adapter.ownedBytes,result=await p.adapter.build(j,new AbortController().signal);assert.equal(result.accepted,true);assert.equal(workers[0].terminated,true);assert.equal(result.payload.source,undefined);
    const sourcePlan=result.payload.sourcePlan;assert.deepEqual(sourcePlan.genome,g);assert.equal(p.adapter.adopt(c.id,j.key,result,2),true);assert.ok(p.adapter.ownedBytes>before);
    p.adapter.beginFrame(new THREE.Vector3());assert.equal(p.adapter.submit(c,.37,0),true);p.adapter.endFrame();const row=p.adapter.trace()[0];assert.equal(row.id,c.id);assert.equal(row.high,Math.fround(.37));assert.equal(row.sourceDigest,'test-source-sha');assert.deepEqual(JSON.parse(JSON.parse(row.genomeKey)[3])[3],g);
    const expected=planet.quadrupedPoseAt(sourcePlan,c.member,c.activity,c.ground,c.rigSeconds);assert.equal(row.maxPenetration,expected.maxPenetration);assert.equal(row.maxReachError,expected.maxReachError);
    const palette=new Float32Array(22*16);new FaunaBonePaletteWriter().write(sourcePlan,expected,palette);
    const material=p.adapter.group.children[1].children[0].material,template=THREE.ShaderLib.standard,shader={vertexShader:template.vertexShader,fragmentShader:template.fragmentShader,uniforms:{}};material.onBeforeCompile(shader,{});
    assert.deepEqual(shader.uniforms.faunaBones.value.image.data.slice(0,22*16),palette,'Into is written immediately and exactly matches independent canonical palette');
    const attribution=p.adapter.diagnostics().profile;
    assert.equal(attribution.phases.pose.calls,1);assert.equal(attribution.phases.palette.calls,1);
    assert.ok(attribution.phases.ground.calls>0);assert.equal(attribution.phases.workerDispatch.calls,1);
    // Exercise the real parent/pool/actor transform contract with a nonzero
    // floating origin, including a deformed vertex from the GPU source arrays.
    const parent=new THREE.Group(),floatingOrigin=new THREE.Vector3(.4,.7,-.3),canonicalPosition=new THREE.Vector3(.41,.72,-.29);parent.position.copy(floatingOrigin);parent.add(p.adapter.group);
    c.matrix.makeScale(.001,.001,.001);c.matrix.setPosition(canonicalPosition.clone().sub(floatingOrigin));
    p.adapter.beginFrame(floatingOrigin);p.adapter.submit(c,1,0);p.adapter.endFrame();parent.updateMatrixWorld(true);
    const mesh=p.adapter.group.children[1].children[0],roots=shader.uniforms.faunaRoots.value.image.data,actorRoot=new THREE.Matrix4().fromArray(roots),bones=shader.uniforms.faunaBones.value.image.data;
    const vertex=new THREE.Vector3().fromBufferAttribute(mesh.geometry.getAttribute('position'),0),indices=mesh.geometry.getAttribute('skinIndex'),weights=mesh.geometry.getAttribute('skinWeight'),skinned=new THREE.Vector3(),bone=new THREE.Matrix4();
    for(let k=0;k<4;k++){bone.fromArray(bones,indices.array[k]*16);skinned.addScaledVector(vertex.clone().applyMatrix4(bone),weights.array[k]/255);}
    const actual=skinned.clone().applyMatrix4(actorRoot).applyMatrix4(mesh.matrixWorld),expectedWorld=skinned.clone().multiplyScalar(.001).add(canonicalPosition);
    assert.ok(actual.distanceTo(expectedWorld)<1e-7,'GPU actorRoot × mesh.matrixWorld adds floating origin exactly once');assert.deepEqual(mesh.parent.position.toArray(),[0,0,0]);
    p.adapter.beginFrame(new THREE.Vector3());p.adapter.submit(c,.37,0);p.adapter.endFrame();assert.equal(p.adapter.trace()[0].poseBuilds,1,'paused palette reused');
    c.groundRevision++;p.adapter.beginFrame(new THREE.Vector3());p.adapter.submit(c,.37,0);p.adapter.endFrame();assert.equal(p.adapter.trace()[0].poseBuilds,2,'stencil revision invalidates pose');
    assert.equal(p.adapter.diagnostics().poseWorkspaceTypedBytes,1760);assert.ok(p.adapter.diagnostics().poseWorkspaceJsObjects>0);
    c.member={...c.member,orbitPhase:.35};p.adapter.beginFrame(new THREE.Vector3());p.adapter.submit(c,.37,0);p.adapter.endFrame();assert.equal(p.adapter.trace()[0].poseBuilds,3,'changed immutable path gets a fresh workspace');
    p.adapter.release(c.id,j.key);assert.equal(p.adapter.diagnostics().middle.prepared,0);
    assert.equal(p.adapter.diagnostics().poseWorkspaceTypedBytes,0);
  }finally{p.adapter.dispose();}
});

test('atomic cross-tier upgrade/downshift keeps exact member binding and old-key release never removes replacement',async()=>{
  const p=createFaunaLodRuntimePrototype({workerFactory:()=>new WorkerFixture()}),g=planet.realisticIndividualCreatureGenome(planet.generateCreatureGenome('RUNTIME-TIER','browser'),'tier',1,'adult','ungulate'),id='tier';
  try{
    const middle=job(p,id,'middle',g),first=await p.adapter.build(middle,new AbortController().signal);assert.ok(first.accepted);assert.equal(p.adapter.adopt(id,middle.key,first,2),true);
    const close=job(p,id,'close',g),second=await p.adapter.build(close,new AbortController().signal);assert.ok(second.accepted);assert.equal(p.adapter.adopt(id,close.key,second,2),true);p.adapter.release(id,middle.key);
    assert.equal(p.adapter.diagnostics().close.prepared,1);assert.equal(p.adapter.diagnostics().middle.prepared,0);
    const failed=structuredClone(second);failed.payload.key='invalid';assert.equal(p.adapter.adopt(id,'invalid',failed,2),false);assert.equal(p.adapter.diagnostics().close.prepared,1);
    p.adapter.release(id,close.key);assert.equal(p.adapter.diagnostics().close.prepared,0);
  }finally{p.adapter.dispose();}
});

test('abort terminates a pending concrete worker, and each transport detaches only cloned source buffers',async()=>{
  const p=createFaunaLodRuntimePrototype({workerFactory:()=>new WorkerFixture()}),g=planet.generateCreatureGenome('RUNTIME-TRANSPORT','runner'),source=planet.buildQuadrupedBody(g),clone=structuredClone(source),before=source.positions.slice(),signal=new AbortController();
  try{
    const request=job(p,'transport','middle',clone.plan.genome,clone),pending=p.adapter.build(request,signal.signal);assert.equal(clone.positions.byteLength,0);assert.deepEqual(source.positions,before);
    signal.abort();await assert.rejects(pending,/cancelled/);assert.equal(workers.at(-1).terminated,true);
    assert.equal(p.adapter.diagnostics().workerActive,false);assert.equal(p.adapter.diagnostics().pendingJobs,0);
  }finally{p.adapter.dispose();}
});
