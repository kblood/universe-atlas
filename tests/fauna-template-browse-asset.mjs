// Required real authored asset; CPU skinning, no texture or visual acceptance.
// node tests/fauna-template-browse-asset.mjs <candidate-dir> <report.json>
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createFaunaTemplate,FAUNA_TEMPLATE_CONTROLS} from '../src/fauna-template.ts';
import {createFaunaTemplateBrowse} from '../src/fauna-template-browse.ts';
const[directory,reportPath]=process.argv.slice(2);
if(!directory||!reportPath)throw new Error('Required candidate directory and report path');
const sidecar=JSON.parse(await fs.readFile(path.join(directory,'fauna-template.json'),'utf8'));
const bytes=await fs.readFile(path.join(directory,sidecar.runtime));
const browseSource=await fs.readFile(new URL('../src/fauna-template-browse.ts',import.meta.url));
const loader=new GLTFLoader();loader.register(()=>({name:'CPU_BROWSE_AUDIT',loadTexture:()=>Promise.resolve(new T.Texture())}));
const gltf=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const template=createFaunaTemplate(gltf.scene,sidecar,{ownsSource:true});
const cases=[{}, {juvenile:1}, {bodyCondition:1,legLength:1}, {legLength:-1}];
for(const values of [...FAUNA_TEMPLATE_CONTROLS.flatMap(id=>[sidecar.controls[id].min,1].map(value=>({[id]:value}))),{juvenile:1,legLength:-1,neckLength:1}])if(!cases.some(c=>JSON.stringify(c)===JSON.stringify(values)))cases.push(values);
const limits={edgeStretchMax:1.8,edgeCompressionMin:.45,muzzleResidualM:1e-5,hoofDisplacementM:1e-6,soleBelowFloorM:1e-6,localBoneTranslationM:1e-9};
const report={ok:false,source:path.resolve(directory),sourceSha256:createHash('sha256').update(bytes).digest('hex'),browseSourceSha256:createHash('sha256').update(browseSource).digest('hex'),limits,
  scope:'Actual morphed/skinned all-body edges, head-weighted muzzle vertex, hoof surfaces and joint translations. No visual, topology-crossing or device approval.',
  maxEdgeStretch:1,minEdgeCompression:1,maxMuzzleResidualM:0,maxHoofDisplacementM:0,minSoleY:Infinity,maxLocalBoneTranslationM:0,samples:[],failures:[]};
const point=new T.Vector3();
function skin(parts,root){const inverse=root.matrixWorld.clone().invert();return parts.map(part=>Array.from({length:part.geometry.attributes.position.count},(_,i)=>part.getVertexPosition(i,new T.Vector3()).applyMatrix4(part.matrixWorld).applyMatrix4(inverse)));}
try{
 for(const controls of cases){
  const instance=template.instantiate();instance.apply(controls);const browse=createFaunaTemplateBrowse(instance);
  const parts=[];instance.root.traverse(o=>{if(o.isSkinnedMesh)parts.push(o);});
  browse.update(0);const rest=skin(parts,instance.root),translations=new Map([...instance.bones].map(([name,b])=>[name,b.position.clone()]));
  const edges=parts.map((part,p)=>{const index=part.geometry.index,map=new Map();for(let i=0;i<index.count;i+=3)for(let k=0;k<3;k++){const a=index.getX(i+k),b=index.getX(i+(k+1)%3),key=[a,b].sort((x,y)=>x-y).join('/');if(!map.has(key)){const length=rest[p][a].distanceTo(rest[p][b]);if(length>1e-6)map.set(key,{a,b,length});}}return[...map.values()];});
  const hooves=parts.map(part=>Array.from({length:part.geometry.attributes.position.count},(_,i)=>i).filter(i=>{const a=part.geometry.attributes;let sum=0;for(let k=0;k<4;k++)if(/fetlock$/.test(part.skeleton.bones[a.skinIndex.getComponent(i,k)].name))sum+=a.skinWeight.getComponent(i,k);return sum>=.5;}));
  assert.ok(hooves.flat().length>20,'real weighted hoof surface required');
  const sample={controls,measurements:browse.measurements,frames:[]};
  for(let frame=0;frame<=48;frame++){
   const time=frame*browse.measurements.cycleS/48,state=browse.update(time),posed=skin(parts,instance.root),bad=[];
   let max=1,min=1,hoofDisplacement=0,soleY=Infinity;
   for(let p=0;p<parts.length;p++){
    for(const edge of edges[p]){const ratio=posed[p][edge.a].distanceTo(posed[p][edge.b])/edge.length;max=Math.max(max,ratio);min=Math.min(min,ratio);if(ratio>limits.edgeStretchMax||ratio<limits.edgeCompressionMin){const a=parts[p].geometry.attributes;bad.push({part:parts[p].name,vertices:[edge.a,edge.b],ratio,neutralPoints:[rest[p][edge.a].toArray(),rest[p][edge.b].toArray()],weights:[edge.a,edge.b].map(i=>Array.from({length:4},(_,k)=>({bone:parts[p].skeleton.bones[a.skinIndex.getComponent(i,k)].name,weight:a.skinWeight.getComponent(i,k)})))});}}
    for(const i of hooves[p]){hoofDisplacement=Math.max(hoofDisplacement,posed[p][i].distanceTo(rest[p][i]));soleY=Math.min(soleY,posed[p][i].y);}
   }
   const support=state.actualMuzzle,part=parts.find(p=>p.name===browse.measurements.support.part),actual=part.getVertexPosition(browse.measurements.support.vertex,point).applyMatrix4(part.matrixWorld).applyMatrix4(instance.root.matrixWorld.clone().invert());
   assert.ok(actual.distanceTo(new T.Vector3(...support))<1e-9,'reported muzzle is actual skinned vertex');
   let translated=0;for(const[name,b]of instance.bones)translated=Math.max(translated,b.position.distanceTo(translations.get(name)));
   const skeletalPose=JSON.stringify([...instance.bones].map(([name,b])=>[name,b.position.toArray(),b.quaternion.toArray(),b.scale.toArray()]));
   if(frame===20){browse.update(-37);browse.update(1e15);assert.deepEqual(browse.update(time),state);assert.equal(JSON.stringify([...instance.bones].map(([name,b])=>[name,b.position.toArray(),b.quaternion.toArray(),b.scale.toArray()])),skeletalPose);}
   bad.sort((a,b)=>Math.abs(Math.log(b.ratio))-Math.abs(Math.log(a.ratio)));
   report.maxEdgeStretch=Math.max(report.maxEdgeStretch,max);report.minEdgeCompression=Math.min(report.minEdgeCompression,min);report.maxMuzzleResidualM=Math.max(report.maxMuzzleResidualM,state.reachResidualM);report.maxHoofDisplacementM=Math.max(report.maxHoofDisplacementM,hoofDisplacement);report.minSoleY=Math.min(report.minSoleY,soleY);report.maxLocalBoneTranslationM=Math.max(report.maxLocalBoneTranslationM,translated);
   sample.frames.push({time,angles:state.angles,plannedMuzzle:state.plannedMuzzle,actualMuzzle:state.actualMuzzle,reachResidualM:state.reachResidualM,maxEdgeStretch:max,minEdgeCompression:min,maxHoofDisplacementM:hoofDisplacement,minSoleY:soleY,badEdges:bad.length,worstEdges:bad.slice(0,6)});
  }
  report.samples.push(sample);instance.dispose();
 }
 for(const[metric,bound,direction]of[['maxEdgeStretch',limits.edgeStretchMax,'max'],['minEdgeCompression',limits.edgeCompressionMin,'min'],['maxMuzzleResidualM',limits.muzzleResidualM,'max'],['maxHoofDisplacementM',limits.hoofDisplacementM,'max'],['minSoleY',-limits.soleBelowFloorM,'min'],['maxLocalBoneTranslationM',limits.localBoneTranslationM,'max']])if(direction==='max'?report[metric]>bound:report[metric]<bound)report.failures.push({metric,value:report[metric],bound,direction});
 report.ok=report.failures.length===0;
}finally{template.dispose();await fs.mkdir(path.dirname(path.resolve(reportPath)),{recursive:true});await fs.writeFile(reportPath,JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({...report,samples:report.samples.map(s=>({controls:s.controls,measurements:s.measurements,frames:s.frames.length})),report:reportPath}));
assert.ok(report.ok,`Actual browse audit failed: ${JSON.stringify(report.failures)}`);
