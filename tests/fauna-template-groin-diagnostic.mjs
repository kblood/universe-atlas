// TEMPORARY IN-MEMORY weight experiment on a required authored asset.
// Does not modify the GLB, authoring source, production weights or QA thresholds.
// node tests/fauna-template-groin-diagnostic.mjs <candidate-dir> <report.json>
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createFaunaTemplate} from '../src/fauna-template.ts';
import {createFaunaTemplateMotion} from '../src/fauna-template-motion.ts';
const[directory,reportPath,mode]=process.argv.slice(2);
if(!directory||!reportPath)throw new Error('Usage: node tests/fauna-template-groin-diagnostic.mjs <candidate-dir> <report.json>');
if(mode!==undefined&&mode!=='--pose-gaussian')throw new Error('Unknown groin diagnostic mode');
const gaussian=mode==='--pose-gaussian';
const sidecar=JSON.parse(await fs.readFile(path.join(directory,'fauna-template.json'),'utf8'));
const bytes=await fs.readFile(path.join(directory,sidecar.runtime));
const loader=new GLTFLoader();loader.register(()=>({name:'ATLAS_CPU_TEMPORARY_GROIN_EXPERIMENT',loadTexture:()=>Promise.resolve(new T.Texture())}));
const gltf=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const template=createFaunaTemplate(gltf.scene,sidecar,{ownsSource:true});
const outer=[[-.43,-.12],[.61,.83],[.065,.18]],core=[[-.33,-.21],[.69,.75],[.095,.125]];
const scanBounds=[[-.50,-.08],[.57,.91],[.04,.23]],EPS=1e-6;
const smooth=t=>{const x=Math.max(0,Math.min(1,t));return x*x*(3-2*x);};
const mask=p=>p.toArray().reduce((w,value,a)=>w*smooth((value-outer[a][0])/(core[a][0]-outer[a][0]))*smooth((outer[a][1]-value)/(outer[a][1]-core[a][1])),1);
const report={source:path.resolve(directory),sourceSha256:createHash('sha256').update(bytes).digest('hex'),
  experiment:gaussian?'Temporary additional Gaussian R groin pose morph, unchanged source geometry/weights/gait; hip flexion .04→.15rad smoothstep. Not a shipping mutation or acceptance result.':'Temporary local R_stifle→R_hip redistribution, smooth spatial mask, unchanged bind/morph geometry and gait; not a shipping mutation or acceptance result.',
  scope:'Adult neutral and eight walk phases. Proper noncoplanar crossings in bounded R inner-groin patch only. Does not certify coplanar overlap, other body regions or morph endpoints.',
  outerBounds:outer,fullStrengthBounds:core,scanBounds,triangleIds:[5739,5745],samples:[]};
function shape(points){
  const edges=points.map((p,i)=>p.distanceTo(points[(i+1)%3]));
  const normal=new T.Vector3().crossVectors(new T.Vector3().subVectors(points[1],points[0]),new T.Vector3().subVectors(points[2],points[0]));
  const twiceArea=normal.length();return{points:points.map(p=>p.toArray()),areaM2:twiceArea/2,aspectRatio:Math.max(...edges)**2/Math.max(twiceArea,1e-20),normal:normal.normalize().toArray()};
}
function crossing(a,b,shared){
  if(shared>=2)return null;const hits=[];
  for(const [from,to]of [[a,b],[b,a]])for(let k=0;k<3;k++){
    const direction=new T.Vector3().subVectors(from[(k+1)%3],from[k]),extent=direction.length();
    const hit=new T.Ray(from[k],direction.normalize()).intersectTriangle(...to,false,new T.Vector3());
    if(hit&&hit.distanceTo(from[k])<=extent+EPS*.01&&!hits.some(p=>p.distanceTo(hit)<EPS*.01))hits.push(hit);
  }
  const length=hits.reduce((max,p)=>Math.max(max,...hits.map(q=>p.distanceTo(q))),0);
  return length>EPS?length:null;
}
try{
  for(const fraction of gaussian?[0,.004,.008,.012,.016,.020]:[0,.25,.5,.75,1]){
    const instance=template.instantiate();instance.apply();const part=instance.root.getObjectByName('SM_AtlasDeerDoe_1');assert.ok(part?.isSkinnedMesh);
    const sharedGeometry=part.geometry;part.geometry=sharedGeometry.clone();
    try{
      const geometry=part.geometry,index=geometry.index.array,skin=geometry.attributes.skinIndex,weights=geometry.attributes.skinWeight;
      const point=new T.Vector3(),bind=Array.from({length:geometry.attributes.position.count},(_,i)=>point.fromBufferAttribute(geometry.attributes.position,i).clone());
      const names=part.skeleton.bones.map(b=>b.name),hip=names.indexOf('R_hip'),stifle=names.indexOf('R_stifle');assert.ok(hip>=0&&stifle>=0);
      let changedVertices=0,missingHipSlots=0,maximumTransfer=0;
      for(let i=0;i<bind.length;i++){
        const spatialMask=mask(bind[i]);if(gaussian||!spatialMask||!fraction)continue;
        const slots=Array.from({length:4},(_,j)=>skin.getComponent(i,j)),from=slots.indexOf(stifle),to=slots.indexOf(hip);
        if(from<0)continue;if(to<0){missingHipSlots++;continue;}
        const transfer=weights.getComponent(i,from)*fraction*spatialMask;if(!transfer)continue;
        weights.setComponent(i,from,weights.getComponent(i,from)-transfer);weights.setComponent(i,to,weights.getComponent(i,to)+transfer);changedVertices++;maximumTransfer=Math.max(maximumTransfer,transfer);
      }
      let correctiveIndex=-1;
      if(gaussian){
        const delta=new Float32Array(bind.length*3);
        for(let i=0;i<bind.length;i++){const p=bind[i];if(p.z<=0)continue;delta[i*3+1]=-fraction*Math.exp(-(((p.x+.275)/.10)**2+((p.y-.714)/.006)**2+((p.z-.108)/.03)**2));}
        correctiveIndex=geometry.morphAttributes.position.length;geometry.morphAttributes.position.push(new T.BufferAttribute(delta,3));part.morphTargetInfluences.push(0);
      }
      const motion=createFaunaTemplateMotion(instance),hipBone=instance.bones.get('R_hip'),child=instance.bones.get('R_stifle');
      const restDirection=child.position.clone().applyQuaternion(hipBone.quaternion).normalize(),driverAxis=new T.Vector3(0,0,1).applyQuaternion(hipBone.parent.getWorldQuaternion(new T.Quaternion()).invert()).normalize();
      const driver=()=>{const a=restDirection.clone().addScaledVector(driverAxis,-restDirection.dot(driverAxis)).normalize(),b=child.position.clone().applyQuaternion(hipBone.quaternion);b.addScaledVector(driverAxis,-b.dot(driverAxis)).normalize();return Math.atan2(driverAxis.dot(new T.Vector3().crossVectors(a,b)),a.dot(b));};
      const weld=bind.map(p=>p.toArray().map(v=>Math.round(v/EPS)).join('/'));
      const triangles=Array.from({length:index.length/3},(_,i)=>({id:i,ids:Array.from(index.slice(i*3,i*3+3))}));
      const selected=triangles.filter(t=>t.ids.some(i=>bind[i].toArray().every((v,a)=>v>=scanBounds[a][0]&&v<=scanBounds[a][1])));
      const skinPoints=()=>{instance.root.updateMatrixWorld(true);const inverse=instance.root.matrixWorld.clone().invert();return bind.map((_,i)=>part.getVertexPosition(i,new T.Vector3()).applyMatrix4(part.matrixWorld).applyMatrix4(inverse));};
      motion.update(0,{gait:'neutral'});const neutral=skinPoints();
      const tracked=report.triangleIds.map(id=>{const triangle=triangles[id];return{id,vertices:triangle.ids,neutral:shape(triangle.ids.map(i=>neutral[i])),weights:triangle.ids.map(i=>Array.from({length:4},(_,j)=>({bone:names[skin.getComponent(i,j)],weight:weights.getComponent(i,j)})))};});
      const sample={fraction,changedVertices,missingHipSlots,maximumTransfer,patchTriangles:selected.length,tracked,frames:[]};
      for(let frame=0;frame<8;frame++){
        const phase=frame/8,time=phase*motion.measurements.cycleS;motion.update(time,{gait:'walk',inPlace:true});const hipAngle=driver(),correctiveWeight=smooth((hipAngle-.04)/(.15-.04));if(gaussian)part.morphTargetInfluences[correctiveIndex]=correctiveWeight;const points=skinPoints();
        const bounds=selected.map(t=>({min:[0,1,2].map(a=>Math.min(...t.ids.map(i=>points[i].getComponent(a)))),max:[0,1,2].map(a=>Math.max(...t.ids.map(i=>points[i].getComponent(a))))}));
        const intersections=[];
        for(let i=0;i<selected.length;i++)for(let j=0;j<i;j++){
          if(bounds[i].min.some((v,a)=>v>bounds[j].max[a]+EPS||bounds[i].max[a]<bounds[j].min[a]-EPS))continue;
          const a=selected[i],b=selected[j],shared=a.ids.filter(id=>b.ids.some(other=>weld[id]===weld[other])).length;
          const length=crossing(a.ids.map(i=>points[i]),b.ids.map(i=>points[i]),shared);
          if(length)intersections.push({triangles:[b.id,a.id],lengthM:length});
        }
        const edgeRatios=selected.flatMap(t=>t.ids.map((id,j)=>{const other=t.ids[(j+1)%3];return points[id].distanceTo(points[other])/neutral[id].distanceTo(neutral[other]);}));
        sample.frames.push({phase,time,hipAngle,correctiveWeight,edgeStretchMax:Math.max(...edgeRatios),edgeCompressionMin:Math.min(...edgeRatios),properCrossings:intersections.length,intersections,tracked:tracked.map(t=>{
          const posed=shape(t.vertices.map(i=>points[i])),normalDot=new T.Vector3(...t.neutral.normal).dot(new T.Vector3(...posed.normal));
          return{id:t.id,...posed,areaRatio:posed.areaM2/t.neutral.areaM2,normalDot,normalAngleDegrees:Math.acos(Math.max(-1,Math.min(1,normalDot)))*180/Math.PI};
        })});
      }
      report.samples.push(sample);
    }finally{part.geometry.dispose();part.geometry=sharedGeometry;instance.dispose();}
  }
  assert.equal(report.samples[0].frames[3].properCrossings,8,'Original015 phase.375 must reproduce eight known crossings before interpreting diagnostics');
}finally{template.dispose();await fs.mkdir(path.dirname(path.resolve(reportPath)),{recursive:true});await fs.writeFile(reportPath,JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({sourceSha256:report.sourceSha256,experiment:report.experiment,samples:report.samples.map(s=>({fraction:s.fraction,changedVertices:s.changedVertices,maximumTransfer:s.maximumTransfer,crossings:s.frames.map(f=>f.properCrossings),trackedPhase375:s.frames[3].tracked})),report:path.resolve(reportPath)}));
