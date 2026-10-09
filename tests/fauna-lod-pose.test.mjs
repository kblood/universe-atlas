import {test} from 'node:test';
import assert from 'node:assert/strict';
import {FaunaLodPoseWriter} from '../src/fauna-lod-pose.ts';
import {createQuadrupedPlan} from '../src/fauna-body-plan.ts';
import {generateCreatureGenome} from '../src/creature-model.ts';
import {faunaMemberActivityAtWorldNs,faunaRigSecondsAt} from '../src/fauna-runtime.ts';
const member={id:'lod-member',anchorOffsetX:1,anchorOffsetZ:2,orbitRadiusM:8,orbitAngularSpeed:.1,orbitPhase:.3,gaitPeriodS:12};
test('approximateLOD preserves sourceplan and exact activity while remaining seek/repetition independent',()=>{
 const plan=createQuadrupedPlan(generateCreatureGenome('LOD-POSE','browser')),snapshot=JSON.stringify(plan),writer=new FaunaLodPoseWriter(),h=writer.prepare(plan,member);
 const a=new Float32Array(22*16),b=new Float32Array(22*16),ns=31345678901n,activity=faunaMemberActivityAtWorldNs(member,ns),source=structuredClone(activity);
 writer.write(h,activity,faunaRigSecondsAt(ns),a);
 writer.write(h,faunaMemberActivityAtWorldNs(member,12345678901n),faunaRigSecondsAt(12345678901n),b);
 writer.write(h,activity,faunaRigSecondsAt(ns),b);assert.deepEqual(a,b);
 assert.deepEqual(activity,source);assert.equal(JSON.stringify(plan),snapshot);
 assert.ok([...a].every(Number.isFinite));
});
test('toe endpoints remain abovebody groundplane through gait transitions and fullphase sweep for allarchetypes',()=>{
 const writer=new FaunaLodPoseWriter(),out=new Float32Array(22*16);
 for(const archetype of ['browser','runner','low-slung','long-neck']){
  const plan=createQuadrupedPlan(generateCreatureGenome(`LOD-${archetype}`,archetype)),h=writer.prepare(plan,member);
  for(const gait of ['idle','walk'])for(const stateS of [0,.1,.3,.6,5])for(let i=0;i<=64;i++){
   const activity={pose:{gait},travel:i/64,revolutionS:60,stateS};writer.write(h,activity,i*.2,out);
   for(const leg of plan.legs){const m=leg.footBone*16,[x,y,z]=leg.toe;
    const bottom=out[m+1]*x+out[m+5]*y+out[m+9]*z+out[m+13]-leg.toeRadius;
    assert.ok(bottom>=-1e-6,`${archetype} ${gait} phase${i}: ${bottom}`);
   }
   assert.ok(writer.metrics[1]>=-1e-12);
  }
 }
});
