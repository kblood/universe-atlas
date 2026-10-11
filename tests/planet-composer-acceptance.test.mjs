/** Negative controls for the independent acceptance oracle, not migration evidence. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {requirePlanetComposerPins,auditPlanetCanonicalCensus,auditPlanetComposerSource,auditPlanetComposerOwnership,auditPlanetComposerFeet,auditPlanetComposerBudgets} from './helpers/planet-composer-acceptance.mjs';
const copy=x=>structuredClone(x);
// Synthetic test pins only. Actual runtime needs the coordinator's approved manifest.
const pins={schema:'planet-composer-acceptance-policy-1',ownerApproved:true,approvedBy:'synthetic auditor control',approvedLayouts:['quadruped'],maxActors:8,maxBonesPerActor:80,maxFrameTriangles:20000,maxFrameDrawCalls:10,maxResidentTypedBytes:1000000,maxTransientTypedBytes:200000,maxWorkerTypedBytes:2000000,maxGpuAllocatedBytes:1000000,maxConcurrentWorkers:1,maxFaunaResidentCombinedBytes:1000000,maxCoreReservedBytes:10000000,maxPenetrationM:.005,maxStanceGapM:.005,maxDecodedPositionErrorM:.001,minGroundReliefM:.01};
const source={id:'actual-id',generator:'composer',layout:'quadruped',recipeText:'independent-kit-recipe',definition:{schema:'planet-composer-definition-1',sourceGenome:{id:'preserved-genome'},phenotype:{version:'fauna-composer-phenotype-1',metres:{bodyLength:1.2},coat:{base:[.2,.31,.4]}}},individual:{seed:3,stage:'juvenile'},resolutionPolicy:'resolved-phenotype-neutral-recipe',newVariationApplications:0,newGrowthApplications:0,versions:{graph:'composer-graph',skin:'composer-skin',pose:'terrain-pose'},sourceBufferDigests:{position:'source-position',joints:'source-joints'},boundBoneNames:Array.from({length:30},(_,i)=>'actual-composer-bone-'+i),palette:{boneCount:30,boneStride:32,maxJointIndex:29},decodedPositionErrorM:0,actualMainCameraDraws:1,actualChangedPixels:100};
test('missing owner pins cannot create an acceptance pass',()=>{assert.throws(()=>requirePlanetComposerPins({}));const p=copy(pins);delete p.maxWorkerTypedBytes;assert.throws(()=>requirePlanetComposerPins(p));});
test('source oracle rejects relabelled quadrupeds, source mismatch, fixed22 transport, duplicate growth and unsupported layout',()=>{
 assert.equal(auditPlanetComposerSource(source,source,pins).sourceParity,true);
 for(const mutate of [x=>x.generator='quadruped',x=>x.sourceBufferDigests.position='other-source',x=>x.palette.boneStride=22,x=>x.newGrowthApplications=1,x=>x.definition.phenotype.coat.base[0]=.25,x=>x.layout='limbless',x=>x.actualChangedPixels=0,x=>x.boundBoneNames[0]='old-quadruped-root']){const bad=copy(source);mutate(bad);assert.throws(()=>auditPlanetComposerSource(bad,source,pins));}
});
test('resident identity oracle rejects date drift, reseeding and idle motion labelled walk without revolution',()=>{
 const control={bodyId:'planet',worldNs:'123',members:[{id:'one',member:{genomeSeed:'seed',stage:'juvenile',variant:1},position:[1,2,3],activity:{pose:{gait:'walk'},travel:.1,stateS:2,revolutionS:100}}]};assert.equal(auditPlanetCanonicalCensus(control,copy(control)).young,1);
 for(const mutate of [x=>x.worldNs='124',x=>x.members[0].member.genomeSeed='reseeded',x=>x.members[0].position[0]=2]){const bad=copy(control);mutate(bad);assert.throws(()=>auditPlanetCanonicalCensus(control,bad));}
 const bad=copy(control);bad.members[0].activity.revolutionS=null;assert.throws(()=>auditPlanetCanonicalCensus(bad,bad));
});
test('ownership oracle catches holes, overlap, stale source and hidden quadruped fallback',()=>{
 const rows=[{id:'one',generator:'composer',tier:'near',sourceDigest:'source',low:0,high:.25},{id:'one',generator:'composer',tier:'lod',sourceDigest:'source',low:.25,high:1}];assert.equal(auditPlanetComposerOwnership(rows,['one']).represented,1);
 for(const mutate of [x=>x[1].low=.3,x=>x[1].low=.2,x=>x[1].sourceDigest='stale-source',x=>x[1].generator='quadruped']){const bad=copy(rows);mutate(bad);assert.throws(()=>auditPlanetComposerOwnership(bad,['one']));}
});
test('actual sole oracle rejects marker-only, flat fixture, planted floating and penetration',()=>{
 const e={kind:'deformed-production-mesh-vertices',samples:[{id:'one',foot:'left',stance:true,vertexIndices:[0,1,2],signedGroundDistancesM:[0,.02,.03],groundHeightsM:[0,.01,.02]},{id:'one',foot:'left',stance:false,vertexIndices:[0,1,2],signedGroundDistancesM:[.03,.04,.05],groundHeightsM:[.02,.03,.04]}]};assert.equal(auditPlanetComposerFeet(e,pins).swing,1);
 for(const mutate of [x=>x.kind='solver-contact-markers',x=>x.samples.forEach(s=>s.groundHeightsM=[0,0,0]),x=>x.samples[0].signedGroundDistancesM=[.01,.02,.03],x=>x.samples[0].signedGroundDistancesM[0]=-.01]){const bad=copy(e);mutate(bad);assert.throws(()=>auditPlanetComposerFeet(bad,pins));}
});
test('budget oracle checks measured scopes and peaks rather than claimed reduced targets',()=>{
 const m={geometryScope:'actual-main-camera-submissions',memoryScope:'owned-typed-and-gpu-allocations-with-transients',actors:2,frameTriangles:10000,frameDrawCalls:3,residentTypedBytes:100,transientTypedBytes:0,workerTypedBytes:100,gpuAllocatedBytes:200,concurrentWorkers:1,coreReservedBytes:2000000,coreBudgetBytes:10000000,cloudAllocatedBytes:100000};assert(auditPlanetComposerBudgets(m,pins).withinPins);
 for(const mutate of [x=>x.geometryScope='requested-triangle-targets',x=>x.workerTypedBytes=3000000,x=>x.concurrentWorkers=2,x=>delete x.gpuAllocatedBytes,x=>{x.residentTypedBytes=600000;x.gpuAllocatedBytes=600000;},x=>x.coreReservedBytes=10000001,x=>x.coreBudgetBytes=20000000]){const bad=copy(m);mutate(bad);assert.throws(()=>auditPlanetComposerBudgets(bad,pins));}
});
