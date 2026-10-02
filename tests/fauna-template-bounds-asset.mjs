// Required-input proof that cheap per-bone envelopes contain ACTUAL posed skin.
// node tests/fauna-template-bounds-asset.mjs <candidate-dir> <report.json>
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createFaunaTemplate,FAUNA_TEMPLATE_CONTROLS} from '../src/fauna-template.ts';
import {createFaunaTemplateMotion} from '../src/fauna-template-motion.ts';
const[directory,reportPath]=process.argv.slice(2);
if(!directory||!reportPath)throw new Error('Usage: node tests/fauna-template-bounds-asset.mjs <candidate-dir> <report.json>');
const sidecar=JSON.parse(await fs.readFile(path.join(directory,'fauna-template.json'),'utf8'));
const bytes=await fs.readFile(path.join(directory,sidecar.runtime));
const loader=new GLTFLoader();loader.register(()=>({name:'ATLAS_CPU_BOUND_CONTAINMENT',loadTexture:()=>Promise.resolve(new T.Texture())}));
const gltf=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const template=createFaunaTemplate(gltf.scene,sidecar,{ownsSource:true});
const report={ok:false,source:path.resolve(directory),sourceSha256:createHash('sha256').update(bytes).digest('hex'),verticesChecked:0,maximumBoxEscapeM:0,maximumSphereEscapeM:0,perPoseComputeBoundingBoxCalls:0,samples:[]};
try{
  const cases=[{}, {juvenile:1}, {bodyCondition:1,legLength:1}, {legLength:-1}];
  for(const values of[...FAUNA_TEMPLATE_CONTROLS.flatMap(id=>[sidecar.controls[id].min,1].map(value=>({[id]:value}))),{juvenile:1,legLength:-1,neckLength:1}])if(!cases.some(c=>JSON.stringify(c)===JSON.stringify(values)))cases.push(values);
  for(const controls of cases){
    const instance=template.instantiate();
    try{
      instance.apply(controls);instance.root.position.set(7,3,-4);instance.root.rotation.set(.15,.4,-.1);
      const motion=createFaunaTemplateMotion(instance),parts=[];instance.root.traverse(m=>{if(m.isSkinnedMesh)parts.push(m);});
      for(const m of parts)m.computeBoundingBox=()=>{report.perPoseComputeBoundingBoxCalls++;throw new Error('Unexpected per-pose full bounding-box scan');};
      for(let sample=0;sample<9;sample++){
        const gait=sample?'walk':'neutral',phase=sample?(sample-1)/8:0;
        motion.update(phase*motion.measurements.cycleS,{gait,inPlace:true});let boxEscape=0,sphereEscape=0;
        for(const m of parts){assert.ok(m.boundingBox&&m.boundingSphere);const p=new T.Vector3(),clamped=new T.Vector3();
          for(let i=0;i<m.geometry.attributes.position.count;i++){
            m.getVertexPosition(i,p);m.boundingBox.clampPoint(p,clamped);boxEscape=Math.max(boxEscape,p.distanceTo(clamped));sphereEscape=Math.max(sphereEscape,p.distanceTo(m.boundingSphere.center)-m.boundingSphere.radius);report.verticesChecked++;
          }
        }
        report.maximumBoxEscapeM=Math.max(report.maximumBoxEscapeM,boxEscape);report.maximumSphereEscapeM=Math.max(report.maximumSphereEscapeM,sphereEscape);report.samples.push({controls,gait,phase,boxEscapeM:boxEscape,sphereEscapeM:sphereEscape});
      }
    }finally{instance.dispose();}
  }
  report.ok=report.maximumBoxEscapeM===0&&report.maximumSphereEscapeM===0&&report.perPoseComputeBoundingBoxCalls===0;
}finally{template.dispose();await fs.mkdir(path.dirname(path.resolve(reportPath)),{recursive:true});await fs.writeFile(reportPath,JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({...report,samples:report.samples.length}));assert.ok(report.ok,'Conservative pose bounds failed actual skin containment');
