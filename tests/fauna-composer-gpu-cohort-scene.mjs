import * as THREE from 'three';
import * as kit from '#creature-kit/planet';
import {FaunaComposerRenderer} from '../src/fauna-composer-renderer.ts';
import {createFaunaComposerWorkerProvider} from '../src/fauna-composer-worker-provider.ts';
import {composerRenderSkin,composerTypedBytes} from '../src/fauna-composer-render-source.ts';
import {composerStoredVertices,isGpuComposerSkin} from '../src/fauna-composer-storage.ts';
import {faunaGroundHeight} from '../src/fauna-ground.ts';

const webgl=new THREE.WebGLRenderer({antialias:false,preserveDrawingBuffer:true});webgl.setSize(640,480);document.body.append(webgl.domElement);
const gl=webgl.getContext(),scene=new THREE.Scene();scene.background=new THREE.Color('#263b42');scene.add(new THREE.HemisphereLight(0xffffff,0x777777,3));
const camera=new THREE.PerspectiveCamera(45,640/480,.01,100);camera.position.set(5,3,6);camera.lookAt(0,1,0);
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const query=new URLSearchParams(location.search);
const settings={capacity:512,maxSources:512,maxBones:160,maxBytes:80*1024*1024,maxResultBytes:8*1024*1024,workerReserveBytes:40*1024*1024,
 fullSourceCache:6,middleSourceCache:6,coldJobsBeforeNearUpgrade:8,nearM:35,middleM:140,maxDistanceM:600,
 mergedTiers:{middle:{maxVertices:16000,maxIndices:96000,maxBytes:5*1024*1024,storage:'packed-1'},far:{maxVertices:320000,maxIndices:1536000,maxBytes:35*1024*1024,storage:'packed-1'}}};
const assert=(condition,message)=>{if(!condition)throw new Error(message);};
const checkGl=label=>{const error=gl.getError();assert(error===gl.NO_ERROR,label+' GL error '+error);};
function buffersOf(controller){const out=[];for(const pool of controller.merged.values()){for(const a of Object.values(pool.mesh.geometry.attributes))out.push(a.buffer);out.push(pool.mesh.geometry.index.buffer);}return out;}
function pixels(){const out=new Uint8Array(640*480*4);gl.readPixels(0,0,640,480,gl.RGBA,gl.UNSIGNED_BYTE,out);return out;}
async function lifecycle(candidate){
 const source=kit.buildPlanetComposerSource(candidate.definition),skin=composerRenderSkin(source.skin);let hold=false,aborted=false,builds=0;
 const provider={async build(job,signal){builds++;if(hold)await new Promise((resolve,reject)=>signal.addEventListener('abort',()=>{aborted=true;reject(new Error('context aborted'));},{once:true}));return {key:job.key,source,levels:{far:skin},buildMs:0};}};
 const controller=new FaunaComposerRenderer({provider,pose:(g,c)=>kit.posePlanetComposer(g,c.member,c.activity,c.ground,c.rigSeconds),mergedGpuContext:gl,maxBytes:40e6,
  mergedTiers:{far:{storage:'packed-1',maxVertices:skin.positions.length,maxIndices:skin.index.length*3,maxBytes:20e6}}});scene.add(controller.group);
 const a={...candidate,id:'copy-a',distanceM:300,matrix:new THREE.Matrix4()},b={...candidate,id:'copy-b',distanceM:300,matrix:new THREE.Matrix4().makeTranslation(3,0,0)},list=[a,b];
 const settle=async()=>{for(let i=0;i<200;i++){controller.update(list);webgl.render(scene,camera);if(controller.diagnostics().active===2)return;await pause(10);}throw new Error('GPU lifecycle rebuild timed out');};
 try{await settle();const original=controller.snapshotOf(a.id).skin,copied=controller.snapshotOf(b.id).skin;
  assert(original.positions.every((x,i)=>Object.is(x,copied.positions[i])),'GPU copy differs');assert(copied.storage.readback==='webgl2-getBufferSubData','inspection did not read GPU');
  const before=pixels(),oldBuffers=buffersOf(controller);hold=true;controller.update([...list,{...candidate,id:'pending',sourceKey:'pending',canonicalDefinition:undefined,definition:{pending:true}}]);
  let tick=0;const pool=controller.merged.get('far');assert(pool.registerSlice('partial',skin,4,.8,1,()=>tick+=.2)==='pending','partial-copy fixture failed');
  const lost=new Promise(resolve=>webgl.domElement.addEventListener('webglcontextlost',resolve,{once:true})),restored=new Promise(resolve=>webgl.domElement.addEventListener('webglcontextrestored',resolve,{once:true}));
  const extension=gl.getExtension('WEBGL_lose_context');assert(extension,'context loss test extension missing');extension.loseContext();await lost;await pause(40);
  assert(aborted&&controller.entries.size===0&&pool.diagnostics().copying===0,'lost context retained sources/work');hold=false;extension.restoreContext();await restored;await settle();
  const after=pixels();let changed=0,max=0;for(let i=0;i<after.length;i++){const d=Math.abs(before[i]-after[i]);if(d)changed++;max=Math.max(max,d);}
  assert(max===0,'restored canonical render changed pixels');assert(oldBuffers.every(b=>!gl.isBuffer(b)),'old VBO survived context loss');assert(gl.getError()===gl.NO_ERROR,'GL error after restoration');
  return {builds,aborted,partialCopyCleared:true,actors:controller.diagnostics().active,copyReadback:true,restoredPixels:{changed,max},oldBuffersInvalid:true};
 }finally{const owned=buffersOf(controller);controller.dispose();checkGl('lifecycle disposal');assert(owned.every(b=>!gl.isBuffer(b)),'VBO leaked on dispose');}
}
function breakdown(controller){let graph=0,strings=0,typed=0,writers=0;const levels={};
 for(const [key,e]of controller.entries){graph+=e.graphBytes;strings+=(e.definition.length+key.length+e.graphIdentity.length+e.skinIdentity.length)*2;typed+=composerTypedBytes({source:e.source,levels:e.levels},controller.arenaBuffers);writers+=e.writer.ownedBytes;
  for(const [tier,s]of Object.entries(e.levels)){const group=levels[tier]??={raw:0,gpu:0,vertices:0,indices:0};group[isGpuComposerSkin(s)?'gpu':'raw']++;group.vertices+=composerStoredVertices(s);group.indices+=s.index.length;}}
 return {graphJsonEquivalentBytes:graph,canonicalStringBytes:strings,typedOutsideArenas:typed,writerBytes:writers,fullSources:[...controller.entries.values()].filter(e=>e.source).length,levels};
}
function footPreservation(snapshot,definition){
 const original=kit.buildPlanetComposerSource(definition).skin,stored=snapshot.skin,packed=!!stored.storage,palette=snapshot.palette;let feet=0,maxY=0,maxDistance=0;
 const deform=(skin,v,normalized)=>{const out=[0,0,0];let sum=0;if(normalized)for(let k=0;k<4;k++)sum+=skin.skinWeight[v*4+k];
  for(let k=0;k<4;k++){const w=skin.skinWeight[v*4+k]/(normalized?sum:1),m=skin.skinIndex[v*4+k]*16;
   for(let a=0;a<3;a++)out[a]+=w*(palette[m+a]*skin.positions[v*3]+palette[m+4+a]*skin.positions[v*3+1]+palette[m+8+a]*skin.positions[v*3+2]+palette[m+12+a]);}return out;};
 for(let v=0;v<stored.positions.length/3;v++){const source=stored.sourceVertex?.[v]??v;if(![0,1,2,3].some(k=>snapshot.graph.bones[original.skinIndex[source*4+k]].part==='foot'&&original.skinWeight[source*4+k]>0))continue;
  const a=deform(original,source,false),b=deform(stored,v,packed);feet++;maxY=Math.max(maxY,Math.abs(a[1]-b[1]));maxDistance=Math.max(maxDistance,Math.hypot(...a.map((x,k)=>x-b[k])));}
 assert(maxY<.00005&&maxDistance<.00015,'GPU readback changed posed foot contact beyond packed bounds');return {feet,maxY,maxDistance};
}
window.__gpuCohort={ready:true,async run(fixture){
 const profiles=new Map(fixture.groundProfiles.map(p=>{const grid=Float64Array.from(p.rawGrid);return [p.cellId,(x,z)=>faunaGroundHeight(grid,x,z)*p.relief];}));
 const candidates=fixture.candidates.map(c=>{const token=kit.planetComposerSourceIdentity(c.definition,{presentation:'realism-1',codePin:fixture.kitCommit});assert(token.key===c.sourceKey,'captured source key changed');return {...c,canonicalDefinition:token.canonical,matrix:new THREE.Matrix4().fromArray(c.matrix),ground:profiles.get(c.groundProfileId),activity:{...c.activity,revolutionS:c.activity.revolutionS==='Infinity'?Infinity:c.activity.revolutionS}};});
 const lifecycleReport=await lifecycle(candidates[0]),jobs=[];checkGl('after lifecycle');
 if(query.has('lifecycleOnly'))return {count:0,lifecycleOnly:true,lifecycle:lifecycleReport};
 const workerUrl=query.get('worker')??new URL('../src/fauna-planet-composer.worker.ts',import.meta.url).href;
 const worker=createFaunaComposerWorkerProvider(()=>new Worker(workerUrl,{type:'module'}),30000,{maxJobsPerWorker:1});
 const provider={async build(job,signal){const result=await worker.build(job,signal);jobs.push({id:job.definition.phenotype.identity.individualId,tiers:job.tiers,buildMs:result.buildMs,bytes:result.receipt.byteLength});return result;},dispose:()=>worker.dispose()};
 const controller=new FaunaComposerRenderer({...settings,mergedGpuContext:gl,provider,pose:(g,c)=>kit.posePlanetComposer(g,c.member,c.activity,c.ground,c.rigSeconds)});scene.add(controller.group);
 async function settle(list,label){const start=performance.now();let peak=0,lastProgress=0;
  while(performance.now()-start<480000){controller.update(list);webgl.render(scene,camera);const d=controller.diagnostics();checkGl('cohort frame '+d.active);assert(!d.failures&&!d.poseFailures,d.lastError??'cohort source failed');peak=Math.max(peak,d.ownedBytes);
   assert(controller.desired.size===list.length,'cohort candidates were hidden');window.__gpuCohort.live={label,seconds:(performance.now()-start)/1000,active:d.active,pending:d.pending,upgrades:d.upgradesPending,ownedBytes:d.ownedBytes,failures:d.failures,lastError:d.lastError};
   if(d.active===list.length&&!d.running&&!d.stagedSources&&!d.upgradesPending)break;
   if(d.builds!==lastProgress){lastProgress=d.builds;}await pause(10);
  }
  const diagnostics=controller.diagnostics();assert(diagnostics.active===list.length&&!diagnostics.upgradesPending&&!diagnostics.pending,'full cohort failed to settle');
  assert(diagnostics.ownedBytes<=settings.maxBytes&&diagnostics.failures===0&&diagnostics.poseFailures===0,'resident budget or source error');assert(gl.getError()===gl.NO_ERROR,'cohort GL error');
  // Sample the actual GPU buffers after every original source has been verified.
  const inspections=[0,6,12,list.length-1].map(i=>{const s=controller.snapshotOf(list[i].id);return {id:s.id,tier:s.tier,readback:s.skin.storage?.readback??'raw original',vertices:s.skin.positions.length/3,triangles:s.skin.index.length/3,posedFootPreservation:footPreservation(s,list[i].definition)};});
  return {label,elapsedMs:performance.now()-start,peakOwnedBytes:peak,diagnostics,breakdown:breakdown(controller),inspections};
 }
 try{const phases=[await settle(candidates,'actual captured432 distances')];
  const mixed=candidates.map((c,i)=>({...c,distanceM:i<6?10+i:i<12?80+i:Math.max(160,c.distanceM)}));phases.push(await settle(mixed,'same full cohort: explicit six-near/six-middle tier stress; resource test, not new camera census'));
  const far=[...controller.merged.values()].at(-1).diagnostics();assert(far.cpuBytes<100000,'full CPU mirror retained');
  return {count:candidates.length,settings,workerUrl,lifecycle:lifecycleReport,jobs,phases,note:'Real WebGL2, renderer served by Vite, one-job worker URL recorded; resident accounting and captured definitions verified. This is not whole-planet frame timing or measured JS heap.'};
 }finally{controller.dispose();}
}};
