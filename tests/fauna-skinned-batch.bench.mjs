// Matched synthetic canonical members: measures activity+real locomotion+packing.
// Geometry admission is a tiny fixture, so this is CPUstage evidence, notvisual,
// GPU, worker-build or complete-world acceptance. No production backend flip.
import * as THREE from 'three';
import {FaunaSkinnedBatch,FaunaBonePaletteWriter,FAUNA_PALETTE_BONES} from '../src/fauna-skinned-batch.ts';
import {FaunaLodPoseWriter} from '../src/fauna-lod-pose.ts';
import {FaunaFieldRenderer} from '../src/fauna-field-renderer.ts';
import {faunaHerdAt,faunaMemberGenome,faunaMemberActivityAtWorldNs,faunaRigSecondsAt,toSeconds} from '../src/fauna-runtime.ts';
import {createQuadrupedPlan} from '../src/fauna-body-plan.ts';
import {landingCandidate} from '../src/landing-site.ts';
import {CATALOGUE_EPOCH_NS} from '../src/world-time.ts';
const members=[];
for(let i=0;members.length<512;i++){
 const herd=faunaHerdAt('SKIN-BENCH','BENCH/planet/1',landingCandidate(i%2048,2048),{weights:[0,1,0,0],forestPotential:true,moisture:.7,slopeDeg:0,ocean:false},
  {stage:'complex'},toSeconds(0),`cell/${i}`);
 if(herd.present)members.push(...herd.members);
}
members.length=512;
const genomes=members.map(faunaMemberGenome),plans=genomes.map(createQuadrupedPlan),origin=new THREE.Vector3(),writer=new FaunaBonePaletteWriter();
const batch=new FaunaSkinnedBatch({capacity:512,maxVerticesPerAnimal:3,maxIndicesPerAnimal:3}),proxy=new FaunaFieldRenderer({bodyPlan:true});
const palettes=members.map(()=>new Float32Array(FAUNA_PALETTE_BONES*16)),matrix=new THREE.Matrix4();
const cheap=new FaunaLodPoseWriter(),handles=plans.map((plan,i)=>cheap.prepare(plan,members[i]));
const ground=(x,z)=>.015*x+.008*z;
const candidates=members.map((member,i)=>({member,genome:genomes[i],matrix,activity:faunaMemberActivityAtWorldNs(member,CATALOGUE_EPOCH_NS),ground,rigSeconds:faunaRigSecondsAt(CATALOGUE_EPOCH_NS),distanceM:30}));
for(let i=0;i<512;i++){
 const data={plan:plans[i],positions:new Float32Array([0,0,0,1,0,0,0,1,0]),normals:new Float32Array([0,0,1,0,0,1,0,0,1]),colors:new Uint8Array(9),
  skinIndex:new Uint8Array(12),skinWeight:new Uint8Array([255,0,0,0,255,0,0,0,255,0,0,0]),index:new Uint16Array([0,1,2])};
 batch.registerGeometry(`geometry/${i}`,data);batch.prepareAnimal(members[i].id,`geometry/${i}`);
 writer.pose(candidates[i],plans[i],palettes[i]);
}
function frame(mode,t){
 const rigSeconds=faunaRigSecondsAt(t);
 if(mode==='body2')proxy.beginFrame(origin);else batch.beginFrame(origin);
 for(let i=0;i<512;i++){
  matrix.makeScale(1/6e6,1/6e6,1/6e6);matrix.setPosition((i%32)*10/6e6,0,Math.floor(i/32)*10/6e6);
  const c=candidates[i];c.activity=faunaMemberActivityAtWorldNs(c.member,t);c.rigSeconds=rigSeconds;
  if(mode==='body2')proxy.submit(genomes[i],matrix,rigSeconds,c.activity.pose.gait,30,c.member,c.activity.stateS);
  else {if(mode==='canonical-skinned')writer.pose(c,plans[i],palettes[i]);if(mode==='approximate-skinned')cheap.write(handles[i],c.activity,rigSeconds,palettes[i]);batch.submit(c.member.id,matrix,palettes[i]);}
 }
 if(mode==='body2')proxy.endFrame();else batch.endFrame();
}
const results=[];
try{
 for(const moving of [false,true])for(const mode of ['body2','palette-only','canonical-skinned','approximate-skinned']){
  if(mode==='approximate-skinned')for(const handle of handles)cheap.invalidate(handle);
  for(let f=0;f<6;f++)frame(mode,CATALOGUE_EPOCH_NS+BigInt(moving?f:0)*16666667n);
  const times=[];
  for(let f=0;f<20;f++){
   const t=CATALOGUE_EPOCH_NS+BigInt(moving?f+6:0)*16666667n,start=performance.now();frame(mode,t);times.push(performance.now()-start);
  }
  times.sort((a,b)=>a-b);
  const result={mode,moving,actors:512,p50Ms:times[10],p95Ms:times[19],sourceBuildIncluded:false,geometry:'3vertex CPU fixture only'};
  results.push(result);console.log(JSON.stringify(result));
 }
 console.log(JSON.stringify({summary:results,backend:batch.diagnostics(),allocationWarning:'canonical solver allocates existingVector3/quaternion/pose arrays;palette-only isnotend-to-end animation'}));
}finally{proxy.dispose();batch.dispose();}
