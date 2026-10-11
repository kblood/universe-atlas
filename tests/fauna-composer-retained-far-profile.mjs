/** Explicit CPU-only resource proof for the preserved actual 432 cohort.
 * The fake GL models exact buffer storage; this is not GPU/heap/frame timing. */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import * as kit from '#creature-kit/planet';
import receipt from '../vendor/creature-kit/PACKAGE.json' with {type:'json'};
import {FaunaComposerRenderer} from '../src/fauna-composer-renderer.ts';
import {FAUNA_PLANET_COMPOSER_POLICY as p} from '../src/fauna-planet-composer-policy.ts';
import {FaunaComposerMergedBatch} from '../src/fauna-composer-merged-batch.ts';
import {buildFaunaComposerRequestedLevels,composerTypedBytes} from '../src/fauna-composer-render-source.ts';
import {composerStoredVertices,isGpuComposerSkin} from '../src/fauna-composer-storage.ts';
import {faunaGroundHeight} from '../src/fauna-ground.ts';
import {composerFakeGl} from './helpers/composer-fake-gl.mjs';

const input=process.env.COMPOSER_COHORT,output=process.env.COMPOSER_PROFILE_OUTPUT;
assert.ok(input&&output,'explicit preserved cohort and review-output paths are required');
const raw=await readFile(input,'utf8'),fixture=JSON.parse(raw);assert.equal(fixture.schema,'actual-planet-composer-cohort-1');assert.equal(fixture.candidates.length,432);
await mkdir(output,{recursive:true});
const ground=new Map(fixture.groundProfiles.map(row=>{const grid=Float64Array.from(row.rawGrid);return[row.cellId,(x,z)=>faunaGroundHeight(grid,x,z)*row.relief];}));
const candidates=fixture.candidates.map(c=>{const token=kit.planetComposerSourceIdentity(c.definition,{presentation:'realism-1',codePin:receipt.kit.commit});return{...c,sourceKey:token.key,canonicalDefinition:token.canonical,matrix:new THREE.Matrix4().fromArray(c.matrix),ground:ground.get(c.groundProfileId),activity:{...c.activity,revolutionS:c.activity.revolutionS==='Infinity'?Infinity:c.activity.revolutionS}};});
assert.ok(candidates.every(c=>c.ground&&c.distanceM<=p.visibleM));
const gl=composerFakeGl(),jobs=[],settings={capacity:p.capacity,maxSources:p.capacity,maxBones:p.maxBones,maxBytes:p.residentBytes,maxResultBytes:p.resultBytes,workerReserveBytes:p.workerReserveBytes,
 fullSourceCache:p.nearSources,middleSourceCache:p.middleSources,coldJobsBeforeNearUpgrade:8,nearM:p.nearM,middleM:p.middleM,maxDistanceM:p.visibleM,
 mergedTiers:{middle:{storage:'packed-1',maxVertices:p.middleVertices,maxIndices:p.middleIndices,maxBytes:5*1024*1024},far:{storage:'packed-1',maxVertices:p.farVertices,maxIndices:p.farIndices,maxBytes:35*1024*1024}}};
const provider={async build(job){const started=performance.now(),source=job.loadedSource?structuredClone(job.loadedSource):kit.buildPlanetComposerSource(job.definition),levels=buildFaunaComposerRequestedLevels(source,job.tiers,[4500,1000]);
 jobs.push({key:job.key,tiers:job.tiers,bones:source.graph.bones.length,sourceBytes:composerTypedBytes(source)});if(jobs.length%50===0)console.log(JSON.stringify({jobs:jobs.length}));return{key:job.key,source,levels,buildMs:performance.now()-started};}};
const renderer=new FaunaComposerRenderer({...settings,provider,mergedGpuContext:gl,pose:(g,c)=>kit.posePlanetComposer(g,c.member,c.activity,c.ground,c.rigSeconds)});
function snapshot(label){
 const levels={};let graph=0,strings=0,typed=0,writers=0,retainedFarMetadataBytes=0;
 for(const[key,e]of renderer.entries){graph+=e.graphBytes;strings+=(e.definition.length+key.length+e.graphIdentity.length+e.skinIdentity.length)*2;typed+=composerTypedBytes({source:e.source,levels:e.levels},renderer.arenaBuffers);writers+=e.writer.ownedBytes;
  for(const[tier,s]of Object.entries(e.levels)){const row=levels[tier]??={raw:0,gpu:0,vertices:0,indices:0,indexBytes:0,sourceMapBytes:0};row[isGpuComposerSkin(s)?'gpu':'raw']++;row.vertices+=composerStoredVertices(s);row.indices+=s.index.length;row.indexBytes+=s.index.byteLength;row.sourceMapBytes+=s.sourceVertex?.byteLength??0;}
 }
 for(const a of renderer.actors.values())if(a.tier!=='far'){const far=renderer.entries.get(a.key).levels.far;assert.ok(isGpuComposerSkin(far));retainedFarMetadataBytes+=far.index.byteLength+(far.sourceVertex?.byteLength??0);}
 const d=renderer.diagnostics(),arenas=Object.fromEntries([...renderer.merged].map(([tier,a])=>[tier,{...a.diagnostics(),usedVertices:[...a.records.values()].reduce((n,r)=>n+r.vertices,0),usedIndices:[...a.records.values()].reduce((n,r)=>n+r.indices,0)}]));
 const activeTiers=d.mergedTiers.far.actors+d.mergedTiers.middle.actors+[...renderer.entries.values()].reduce((n,e)=>n+(e.batches.near?.mesh.count??0),0);assert.equal(activeTiers,d.active,'one visible representation per actor');
 return{label,diagnostics:d,headroomBytes:p.residentBytes-d.ownedBytes,breakdown:{graphJsonEquivalentBytes:graph,canonicalStringBytes:strings,typedOutsideArenas:typed,writerBytes:writers,fullSources:[...renderer.entries.values()].filter(e=>e.source).length,retainedFarMetadataBytes,levels,arenas},fakeBufferBytes:gl.inspect().bytes};
}
async function settle(list,label){
 const started=performance.now();let peak=0;
 while(performance.now()-started<300000){renderer.update(list);await new Promise(resolve=>setTimeout(resolve,1));const d=renderer.diagnostics();peak=Math.max(peak,d.ownedBytes);
  assert.equal(renderer.desired.size,432);assert.equal(d.failures,0,d.lastError);assert.equal(d.poseFailures,0,d.lastError);assert.ok(d.ownedBytes<=p.residentBytes);
  if(d.active===432&&!d.running&&!d.stagedSources&&!d.pending&&!d.upgradesPending)break;
 }
 const result=snapshot(label);assert.equal(result.diagnostics.active,432);assert.equal(result.diagnostics.upgradesPending,0);assert.equal(result.diagnostics.pending,0);assert.equal(result.diagnostics.budgetDrops,0);result.peakOwnedBytes=peak;result.cpuProbeElapsedMs=performance.now()-started;return result;
}
const report={note:'CPU-only exact-storage model using fake WebGL; no GPU job, shader measurement, measured JS heap, or production cold-latency claim.',input,inputSha256:createHash('sha256').update(raw).digest('hex'),capturedBuild:fixture.sourceBuild,capturedKitCommit:fixture.kitCommit,currentKitCommit:receipt.kit.commit,count:432,settings,jobs,phases:[]};
try{
 report.phases.push(await settle(candidates,'captured actual distances'));
 const mixed=candidates.map((c,i)=>({...c,distanceM:i<6?10+i:i<12?80+i:Math.max(160,c.distanceM)}));report.phases.push(await settle(mixed,'same432: six near, six middle,420 far with all432 far allocations retained'));
 const farRefs=new Map([...renderer.entries].map(([key,e])=>[key,e.levels.far])),farJobs=jobs.filter(j=>j.tiers.includes('far')).length,built=jobs.length;
 assert.equal(farJobs,432);assert.equal(report.phases[1].breakdown.fullSources,6);assert.equal(report.phases[1].diagnostics.mergedTiers.middle.actors,6);assert.equal(report.phases[1].diagnostics.mergedTiers.far.actors,420);assert.equal(report.phases[1].diagnostics.mergedTiers.far.records,432);
 const sample=renderer.entries.get(candidates[0].sourceKey).levels.far,inspection=FaunaComposerMergedBatch.snapshotSkin(sample);assert.equal(inspection.storage.readback,'webgl2-getBufferSubData');report.inspection={method:'fake-GL getBufferSubData (CPU emulation)',vertices:inspection.positions.length/3,triangles:inspection.index.length/3};
 renderer.update(candidates.map(c=>({...c,distanceM:Math.max(160,c.distanceM)})));const demoted=snapshot('same432 demoted in one update without any build');
 assert.equal(demoted.diagnostics.active,432);assert.ok(demoted.diagnostics.actors.every(a=>a.tier==='far'));assert.equal(demoted.diagnostics.running,null);assert.equal(demoted.diagnostics.upgradesPending,0);assert.equal(jobs.length,built);assert.equal(demoted.breakdown.fullSources,0);assert.equal(demoted.diagnostics.mergedTiers.middle.records,0);for(const[key,e]of renderer.entries)assert.equal(e.levels.far,farRefs.get(key));report.phases.push(demoted);
 renderer.setContext('profile-cleanup');assert.equal(renderer.entries.size,0);assert.equal(renderer.mergedBindings.size,0);assert.equal(renderer.levelOwners.size,0);assert.ok(Object.values(renderer.diagnostics().mergedTiers).every(t=>!t.records&&!t.copying));
}finally{renderer.dispose();assert.equal(gl.inspect().buffers,0);report.disposed={buffers:gl.inspect().buffers,ownedBytes:renderer.ownedBytes};await writeFile(output+'/report.json',JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report.phases.map(phase=>({label:phase.label,active:phase.diagnostics.active,ownedBytes:phase.diagnostics.ownedBytes,headroomBytes:phase.headroomBytes,retainedFarMetadataBytes:phase.breakdown.retainedFarMetadataBytes,farRecords:phase.diagnostics.mergedTiers.far.records}))));
