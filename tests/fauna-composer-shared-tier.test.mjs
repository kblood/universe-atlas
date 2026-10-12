import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {composerPreset} from '../src/fauna-composer-recipe.ts';
import {buildComposerSource} from '../src/fauna-composer-source.ts';
import {poseComposer} from '../src/fauna-composer-rig.ts';
import {buildFaunaComposerRequestedLevels} from '../src/fauna-composer-render-source.ts';
import {FaunaComposerRenderer} from '../src/fauna-composer-renderer.ts';

test('identical source at near, middle and far distances obtains every missing tier without repeated upgrades',async()=>{
 const source=buildComposerSource(composerPreset('worm'),{presentation:'realism-1'}),jobs=[];
 const controller=new FaunaComposerRenderer({provider:{async build(job){jobs.push([...job.tiers]);return {key:job.key,source,levels:buildFaunaComposerRequestedLevels(source,job.tiers,[4500,1000]),buildMs:0};}},pose:(g,c)=>poseComposer(g,'walk',c.rigSeconds),capacity:3});
 const candidates=[5,80,300].map((distanceM,i)=>({id:'member/'+i,definition:{recipe:'worm'},sourceKey:'same-worm',matrix:new THREE.Matrix4(),distanceM,cameraVisible:true,rigSeconds:.375,poseKey:'fixed/.375'}));
 try{
  const deadline=performance.now()+5000;
  do{controller.update(candidates);await new Promise(resolve=>setTimeout(resolve,0));assert(performance.now()<deadline,JSON.stringify(controller.diagnostics()));}while(controller.pendingPresentationWork||controller.diagnostics().active!==3);
  assert.deepEqual(controller.diagnostics().actors.map(a=>a.tier),['near','middle','far']);
  assert.deepEqual(jobs,[['far'],['near'],['middle']]);
  const count=jobs.length;for(let i=0;i<50;i++)controller.update(candidates);assert.equal(jobs.length,count);
 }finally{controller.dispose();assert.equal(controller.ownedBytes,0);}
});
