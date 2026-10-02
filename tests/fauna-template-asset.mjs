// Required-input CPU audit of an ACTUAL authored GLB, not an optional fixture.
// node tests/fauna-template-asset.mjs <candidate-directory> <report.json>
// Embedded images are replaced by empty Texture objects; this checks mesh,
// morph, skeleton and ownership behavior, and makes no texture/visual claim.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createFaunaTemplate,FAUNA_TEMPLATE_CONTROLS} from '../src/fauna-template.ts';
const [directory,reportPath]=process.argv.slice(2);
if(!directory||!reportPath)throw new Error('Usage: node tests/fauna-template-asset.mjs <candidate-directory> <report.json>');
const sidecar=JSON.parse(await fs.readFile(path.join(directory,'fauna-template.json'),'utf8'));
const bytes=await fs.readFile(path.join(directory,sidecar.runtime));
const loader=new GLTFLoader();let imagesBypassed=0;
loader.register(()=>({name:'ATLAS_CPU_GEOMETRY_AUDIT',loadTexture:()=>{imagesBypassed++;return Promise.resolve(new THREE.Texture());}}));
const gltf=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const template=createFaunaTemplate(gltf.scene,sidecar,{ownsSource:true});
const instance=template.instantiate(),other=template.instantiate(),parts=[];
instance.root.traverse(o=>{if(o.isSkinnedMesh)parts.push(o);});
const report={ok:false,id:sidecar.id,source:path.resolve(directory),textureReview:'not performed: image uploads bypassed for CPU audit',imagesBypassed,
  bones:instance.bones.size,morphTargets:sidecar.targets.length,parts:parts.map(m=>({name:m.name,vertices:m.geometry.attributes.position.count})),samples:[],maxNeutralSkinErrorM:0};
const point=new THREE.Vector3(),expected=new THREE.Vector3(),delta=new THREE.Vector3();
try{
  const cases=[{},...FAUNA_TEMPLATE_CONTROLS.flatMap(id=>[sidecar.controls[id].min,1].map(value=>({[id]:value}))),
    ...Array.from({length:64},(_,mask)=>Object.fromEntries(FAUNA_TEMPLATE_CONTROLS.map((id,i)=>[id,mask&(1<<i)?1:sidecar.controls[id].min])))];
  for(const controls of cases){
    instance.apply(controls);let maxError=0;const bounds=new THREE.Box3();
    for(const mesh of parts){
      for(let i=0;i<mesh.geometry.attributes.position.count;i++){
        expected.fromBufferAttribute(mesh.geometry.attributes.position,i);
        for(const[name,index]of Object.entries(mesh.morphTargetDictionary)){
          const weight=mesh.morphTargetInfluences[index];if(!weight)continue;
          delta.fromBufferAttribute(mesh.geometry.morphAttributes.position[index],i);
          if(!mesh.geometry.morphTargetsRelative)delta.sub(new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position,i));
          expected.addScaledVector(delta,weight);
        }
        mesh.getVertexPosition(i,point);assert.ok(point.toArray().every(Number.isFinite));
        maxError=Math.max(maxError,point.distanceTo(expected));bounds.expandByPoint(point);
      }
    }
    assert.ok(maxError<2e-5,`neutral skin double-displacement ${maxError}m at ${JSON.stringify(controls)}`);
    assert.ok(other.influences().juvenile===0,'independent specimen influences');
    report.maxNeutralSkinErrorM=Math.max(report.maxNeutralSkinErrorM,maxError);
    report.samples.push({controls,maxNeutralSkinErrorM:maxError,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()}});
  }
  instance.apply();report.ok=true;
}finally{template.dispose();await fs.mkdir(path.dirname(path.resolve(reportPath)),{recursive:true});await fs.writeFile(reportPath,JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({ok:report.ok,id:report.id,bones:report.bones,morphTargets:report.morphTargets,parts:report.parts,samples:report.samples.length,maxNeutralSkinErrorM:report.maxNeutralSkinErrorM,report:path.resolve(reportPath)}));
