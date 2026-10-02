// Required actual-asset anatomical walk/contact audit. No GPU/texture review.
// node tests/fauna-template-motion-asset.mjs <candidate-directory> <report.json>
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createFaunaTemplate,FAUNA_TEMPLATE_CONTROLS} from '../src/fauna-template.ts';
import {createFaunaTemplateMotion} from '../src/fauna-template-motion.ts';
const[directory,reportPath]=process.argv.slice(2);
if(!directory||!reportPath)throw new Error('Usage: node tests/fauna-template-motion-asset.mjs <candidate-directory> <report.json>');
const sidecar=JSON.parse(await fs.readFile(path.join(directory,'fauna-template.json'),'utf8'));
const bytes=await fs.readFile(path.join(directory,sidecar.runtime));
const loader=new GLTFLoader();loader.register(()=>({name:'ATLAS_CPU_MOTION_AUDIT',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
const gltf=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const template=createFaunaTemplate(gltf.scene,sidecar,{ownsSource:true});
const report={ok:false,id:sidecar.id,source:path.resolve(directory),textureReview:'not performed',samples:[],maxContactErrorM:0,maxReachErrorM:0,maxStanceDriftM:0,minSoleHeightM:Infinity,
  // Rigid planted soles should be exact; 0.1 mm only allows float32/export
  // rounding. This is a numerical check, not a perceptual realism tolerance.
  numericalToleranceM:1e-4};
try{
  const cases=[{},...FAUNA_TEMPLATE_CONTROLS.flatMap(id=>[sidecar.controls[id].min,1].map(value=>({[id]:value}))),{bodyCondition:1,legLength:1},{juvenile:1,legLength:-1,neckLength:1}];
  for(const controls of cases){
    const instance=template.instantiate();instance.apply(controls);const motion=createFaunaTemplateMotion(instance);
    const row={controls,measurements:motion.measurements,maxContactErrorM:0,maxReachErrorM:0,maxStanceDriftM:0,minSoleHeightM:Infinity,frames:121};let previous=null;
    for(let frame=0;frame<=120;frame++){
      const time=frame*motion.measurements.cycleS/60,state=motion.update(time);
      row.maxContactErrorM=Math.max(row.maxContactErrorM,state.maxContactErrorM);row.maxReachErrorM=Math.max(row.maxReachErrorM,state.maxReachErrorM);
      for(const foot of state.feet){row.minSoleHeightM=Math.min(row.minSoleHeightM,foot.minSoleHeightM);const old=previous?.feet.find(f=>f.id===foot.id);
        if(old?.stance&&foot.stance)row.maxStanceDriftM=Math.max(row.maxStanceDriftM,new THREE.Vector3(...old.contact).distanceTo(new THREE.Vector3(...foot.contact)));}
      previous=state;
    }
    const a=motion.update(.37);motion.update(9);motion.update(-2);assert.deepEqual(motion.update(.37),a,'exact pose replay');
    for(const key of['maxContactErrorM','maxReachErrorM','maxStanceDriftM'])report[key]=Math.max(report[key],row[key]);
    report.minSoleHeightM=Math.min(report.minSoleHeightM,row.minSoleHeightM);report.samples.push(row);instance.dispose();
  }
  for(const key of['maxContactErrorM','maxReachErrorM','maxStanceDriftM'])assert.ok(report[key]<=report.numericalToleranceM,`${key} ${report[key]}m`);
  assert.ok(report.minSoleHeightM>=-report.numericalToleranceM,`skinned soles below floor ${report.minSoleHeightM}m`);report.ok=true;
}finally{template.dispose();await fs.mkdir(path.dirname(path.resolve(reportPath)),{recursive:true});await fs.writeFile(reportPath,JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({...report,samples:report.samples.length,report:path.resolve(reportPath)}));
