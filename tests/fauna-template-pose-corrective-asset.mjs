// Required actual exported pose-corrective regression, including negative control.
// node tests/fauna-template-pose-corrective-asset.mjs <candidate-dir> <report.json>
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createFaunaTemplate} from '../src/fauna-template.ts';
import {createFaunaTemplateMotion} from '../src/fauna-template-motion.ts';
const[directory,reportPath]=process.argv.slice(2);
if(!directory||!reportPath)throw new Error('Usage: node tests/fauna-template-pose-corrective-asset.mjs <candidate-dir> <report.json>');
const sidecar=JSON.parse(await fs.readFile(path.join(directory,'fauna-template.json'),'utf8'));
const bytes=await fs.readFile(path.join(directory,sidecar.runtime));
const loader=new GLTFLoader();loader.register(()=>({name:'ATLAS_CPU_ACTUAL_POSE_CORRECTIVE',loadTexture:()=>Promise.resolve(new T.Texture())}));
const gltf=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const template=createFaunaTemplate(gltf.scene,sidecar,{ownsSource:true}),instance=template.instantiate();
const limits={normalAngleMaxDegrees:45,areaRatioMin:.5,areaRatioMax:2,neighborEdgeStretchMax:1.8,neighborEdgeCompressionMin:.45};
const report={ok:false,source:path.resolve(directory),sourceSha256:createHash('sha256').update(bytes).digest('hex'),
  scope:'Actual adult R-groin patch at measured failure phase. Positive corrective versus same pose with only pose targets forced to zero. Whole-body/morph matrix is separately audited.',limits,negativeControl:null,corrected:null,failures:[]};
const reference=[
  [[-.30166664719581604,.7237175703048706,.10396447032690048],[-.2586251497268677,.7180728912353516,.10872608423233032],[-.2775000333786011,.7176936864852905,.1071878969669342]],
  [[-.2787156105041504,.7244558334350586,.10560637712478638],[-.24319103360176086,.7191343307495117,.11303238570690155],[-.2586251497268677,.7180728912353516,.10872608423233032]],
];
function shape(points){const normal=new T.Vector3().crossVectors(new T.Vector3().subVectors(points[1],points[0]),new T.Vector3().subVectors(points[2],points[0])),twiceArea=normal.length();return{area:twiceArea/2,normal:normal.normalize(),aspect:Math.max(...points.map((p,i)=>p.distanceToSquared(points[(i+1)%3])))/twiceArea};}
try{
  assert.equal(sidecar.poseCorrectives?.length,2,'actual asset must expose both mirrored pose correctives');
  const part=instance.root.getObjectByName('SM_AtlasDeerDoe_1');assert.ok(part?.isSkinnedMesh);
  const geometry=part.geometry,index=geometry.index.array,bind=Array.from({length:geometry.attributes.position.count},(_,i)=>new T.Vector3().fromBufferAttribute(geometry.attributes.position,i));
  const triangles=Array.from({length:index.length/3},(_,id)=>({id,vertices:Array.from(index.slice(id*3,id*3+3))}));
  const tracked=reference.map(expected=>{const matches=triangles.filter(t=>expected.every(p=>t.vertices.some(i=>bind[i].distanceTo(new T.Vector3(...p))<2e-6)));assert.equal(matches.length,1,'tracked patch must match actual neutral positions uniquely');return matches[0];});
  const patch=triangles.filter(t=>t.vertices.some(i=>{const p=bind[i];return p.x>=-.5&&p.x<=-.08&&p.y>=.57&&p.y<=.91&&p.z>=.04&&p.z<=.23;}));
  const motion=createFaunaTemplateMotion(instance);
  const points=()=>{instance.root.updateMatrixWorld(true);const inverse=instance.root.matrixWorld.clone().invert();return bind.map((_,i)=>part.getVertexPosition(i,new T.Vector3()).applyMatrix4(part.matrixWorld).applyMatrix4(inverse));};
  motion.update(0,{gait:'neutral'});const neutral=points(),neutralShapes=tracked.map(t=>shape(t.vertices.map(i=>neutral[i])));
  assert.ok(Object.values(instance.influences()).every(v=>v===0),'all targets, including pose shapes, zero in neutral');
  const time=.375*motion.measurements.cycleS,state=motion.update(time,{gait:'walk',inPlace:true});
  assert.ok(state.poseCorrectives.influences.R_hip_flexion_groin>.99,'measured failing hip angle fully activates authored target');
  const evaluate=()=>{const posed=points();const edgeRatios=patch.flatMap(t=>t.vertices.map((v,j)=>{const w=t.vertices[(j+1)%3];return posed[v].distanceTo(posed[w])/neutral[v].distanceTo(neutral[w]);}));return{time,driver:state.poseCorrectives,
    edgeStretchMax:Math.max(...edgeRatios),edgeCompressionMin:Math.min(...edgeRatios),triangles:tracked.map((t,k)=>{const current=shape(t.vertices.map(i=>posed[i])),rest=neutralShapes[k];return{triangle:t.id,vertices:t.vertices,neutralPoints:t.vertices.map(i=>neutral[i].toArray()),posedPoints:t.vertices.map(i=>posed[i].toArray()),
      neutralAreaM2:rest.area,posedAreaM2:current.area,areaRatio:current.area/rest.area,neutralAspect:rest.aspect,posedAspect:current.aspect,normalAngleDegrees:Math.acos(T.MathUtils.clamp(rest.normal.dot(current.normal),-1,1))*180/Math.PI};})};};
  report.corrected=evaluate();
  instance.root.traverse(m=>{if(m.isSkinnedMesh)for(const recipe of sidecar.poseCorrectives)m.morphTargetInfluences[m.morphTargetDictionary[recipe.target]]=0;});
  report.negativeControl=evaluate();
  const passTriangle=t=>t.areaRatio>=limits.areaRatioMin&&t.areaRatio<=limits.areaRatioMax&&t.normalAngleDegrees<=limits.normalAngleMaxDegrees;
  assert.ok(report.negativeControl.triangles.some(t=>!passTriangle(t)),'negative control must demonstrate the uncorrected fold; no vacuous pass');
  for(const t of report.corrected.triangles)if(!passTriangle(t))report.failures.push({triangle:t.triangle,areaRatio:t.areaRatio,normalAngleDegrees:t.normalAngleDegrees});
  if(report.corrected.edgeStretchMax>limits.neighborEdgeStretchMax||report.corrected.edgeCompressionMin<limits.neighborEdgeCompressionMin)report.failures.push({neighborEdges:[report.corrected.edgeCompressionMin,report.corrected.edgeStretchMax]});
  motion.update(-19);motion.update(time,{gait:'walk',inPlace:true});assert.deepEqual(evaluate(),report.corrected,'corrective skin and angles are seek independent');
  motion.update(0,{gait:'neutral'});assert.ok(Object.values(instance.influences()).every(v=>v===0));assert.ok(points().every((p,i)=>p.distanceTo(neutral[i])<1e-10));
  report.ok=report.failures.length===0;
}finally{instance.dispose();template.dispose();await fs.mkdir(path.dirname(path.resolve(reportPath)),{recursive:true});await fs.writeFile(reportPath,JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report));assert.ok(report.ok,`Actual pose corrective patch failed; see ${reportPath}`);
