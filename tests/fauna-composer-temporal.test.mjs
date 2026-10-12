import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FaunaComposerRenderer} from '../src/fauna-composer-renderer.ts';
import {buildComposerSource} from '../src/fauna-composer-source.ts';
import {composerPreset} from '../src/fauna-composer-recipe.ts';
import {buildFaunaComposerRequestedLevels} from '../src/fauna-composer-render-source.ts';
import {poseComposer} from '../src/fauna-composer-rig.ts';
const wait=()=>new Promise(resolve=>setTimeout(resolve,0));
const setup=async(adaptive=true,distance=300,maxBytes=32e6,fullSourceCache)=>{
 const source=buildComposerSource(composerPreset('worm'),{presentation:'realism-1'});let calls=0;
 const renderer=new FaunaComposerRenderer({provider:{async build(job){return {key:job.key,source,levels:buildFaunaComposerRequestedLevels(source,job.tiers,[4500,1000]),buildMs:0};}},pose:(g,c)=>{calls++;return poseComposer(g,'walk',c.rigSeconds);},capacity:1,adaptiveAnimation:adaptive,fastFarMatrices:true,maxBytes,fullSourceCache});
 const candidate={id:'original/member',definition:{recipe:'worm'},sourceKey:'original/recipe',matrix:new THREE.Matrix4(),distanceM:distance,cameraVisible:true,rigSeconds:0,poseKey:'0',animationContext:'ground1/walk'};
 const deadline=performance.now()+5000;do{renderer.update([candidate]);await wait();assert(performance.now()<deadline);}while(renderer.pendingPresentationWork||!renderer.poseOf(candidate.id));
 return {renderer,candidate,source,get calls(){return calls;}};
};
test('far presentation reduces canonical solver calls, records sample clocks and preserves original identity',async()=>{
 const s=await setup();try{const initial=s.calls;
  for(let frame=1;frame<=60;frame++){s.candidate.rigSeconds=frame/60;s.candidate.poseKey=String(frame);s.renderer.update([s.candidate]);}
  assert(s.calls-initial<=12);assert(s.calls-initial>=8);const snap=s.renderer.snapshotOf(s.candidate.id);
  assert.equal(snap.id,'original/member');assert.equal(snap.key,'original/recipe');assert.equal(snap.presentation.version,'composer-temporal-presentation-1');assert(snap.presentation.sourceClockB<=1);
  s.candidate.animationContext='ground2/walk';s.candidate.poseKey='new-ground';s.renderer.update([s.candidate]);
  assert.deepEqual(s.renderer.poseOf(s.candidate.id).positions,poseComposer(s.source.graph,'walk',1).positions);
  s.candidate.rigSeconds=.1;s.candidate.poseKey='backwards';s.renderer.update([s.candidate]);assert.deepEqual(s.renderer.poseOf(s.candidate.id).positions,poseComposer(s.source.graph,'walk',.1).positions);
 }finally{s.renderer.dispose();assert.equal(s.renderer.ownedBytes,0);}
});
test('near presentation and camera-near fallback remain exact at every frame',async()=>{
 for(const distance of [5,34,80,99]){const s=await setup(true,distance);try{
  for(let frame=1;frame<=12;frame++){s.candidate.rigSeconds=frame/60;s.candidate.poseKey=String(frame);s.renderer.update([s.candidate]);assert.deepEqual(s.renderer.poseOf(s.candidate.id),poseComposer(s.source.graph,'walk',frame/60));}
 }finally{s.renderer.dispose();}}
});
test('far-to-near handover evaluates the current exact pose immediately',async()=>{
 const s=await setup();try{for(let frame=1;frame<20;frame++){s.candidate.rigSeconds=frame/60;s.candidate.poseKey=String(frame);s.renderer.update([s.candidate]);}
  s.candidate.distanceM=5;s.renderer.update([s.candidate]);assert.deepEqual(s.renderer.poseOf(s.candidate.id),poseComposer(s.source.graph,'walk',s.candidate.rigSeconds));assert.equal(s.renderer.snapshotOf(s.candidate.id).presentation,null);
 }finally{s.renderer.dispose();}
});
