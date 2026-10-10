import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {generateCreatureGenome,realisticIndividualCreatureGenome} from '../src/creature-model.ts';
import {createFaunaSkinInspector} from '../src/fauna-skin-inspector.ts';
import {FaunaNearRigs} from '../src/fauna-near-rig.ts';
import {faunaMemberActivityAtWorldNs,faunaRigSecondsAt} from '../src/fauna-runtime.ts';
import {CATALOGUE_EPOCH_NS} from '../src/world-time.ts';

test('shared Kit inspection matches production pool geometry, skinning matrices and feet for dated and explicit poses',()=>{
  for(const archetype of ['runner','long-neck'])for(const mode of ['dated','idle','walk','feed']){
    const id=`inspector-parity/${archetype}/${mode}`,genome=realisticIndividualCreatureGenome(generateCreatureGenome('INSPECTOR-PARITY',archetype),id,0,'adult');
    const radius=Math.max(6,genome.torsoLength*3),member={id,archetype,genomeSeed:id,variant:0,stage:'adult',anchorOffsetX:0,anchorOffsetZ:0,orbitRadiusM:radius,orbitAngularSpeed:genome.walkSpeed/radius,orbitPhase:0,gaitPeriodS:6};
    const inspector=createFaunaSkinInspector(genome,id,{pose:mode}),pool=new FaunaNearRigs({capacity:1,cacheSize:1,now:()=>0});
    const candidate={member,genome,distanceM:0,matrix:new THREE.Matrix4(),ground:()=>0,activity:faunaMemberActivityAtWorldNs(member,CATALOGUE_EPOCH_NS),rigSeconds:0};
    try{
      pool.update([candidate]);pool.update([candidate]);const original=pool.meshOf(id),shared=inspector.group.children.find(o=>o.isSkinnedMesh);assert.ok(original&&shared);
      for(const name of ['position','normal','color','skinIndex','skinWeight'])assert.deepEqual(shared.geometry.getAttribute(name).array,original.geometry.getAttribute(name).array,`${archetype}/${mode}: ${name}`);
      assert.deepEqual(shared.geometry.index.array,original.geometry.index.array);
      assert.equal(shared.material.roughness,original.material.roughness);
      for(const time of [0,.25,4.7]){
        const date=CATALOGUE_EPOCH_NS+BigInt(Math.round(time*1e9));candidate.activity=faunaMemberActivityAtWorldNs(member,date);candidate.rigSeconds=faunaRigSecondsAt(date);
        if(mode!=='dated'){
          const walking=mode==='walk',revolutionS=Math.PI*2*radius/genome.walkSpeed;
          candidate.activity={...candidate.activity,pose:{...candidate.activity.pose,gait:walking?'walk':'idle'},travel:walking?((time/revolutionS)%1+1)%1:0,revolutionS:walking?revolutionS:Infinity,stateS:walking?time+1:3};candidate.behaviour=mode==='feed'?'feed':'alert';
        }
        pool.update([candidate]);const diagnostics=inspector.update(time),pose=pool.poseOf(id),c=Math.cos(pose.root.yaw),s=Math.sin(pose.root.yaw);
        assert.deepEqual(diagnostics,{time,gait:pose.state,root:[0,0,0],jointCount:22,maxPenetration:pose.maxPenetration,maxReachError:pose.maxReachError,feet:pose.feet.map(f=>{const dx=f.contact[0]-pose.root.x,dz=f.contact[2]-pose.root.z;return {id:f.id,position:[...f.toe],stance:f.stance,target:[dx*c+dz*s,f.contact[1]-pose.root.h,dx*s-dz*c]};})});
        shared.skeleton.update();original.skeleton.update();assert.deepEqual(shared.skeleton.boneMatrices,original.skeleton.boneMatrices,`${archetype}/${mode}/${time}: deformation`);
      }
    }finally{inspector.dispose();pool.dispose();}
  }
});
