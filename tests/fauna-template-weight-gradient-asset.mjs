// Audit FINAL exported weights on every actual triangle edge, including diagonals.
// node tests/fauna-template-weight-gradient-asset.mjs <candidate-dir> <report.json>
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const[directory,reportPath]=process.argv.slice(2);
if(!directory||!reportPath)throw new Error('Usage: node tests/fauna-template-weight-gradient-asset.mjs <candidate-dir> <report.json>');
const sidecar=JSON.parse(await fs.readFile(path.join(directory,'fauna-template.json'),'utf8'));
const bytes=await fs.readFile(path.join(directory,sidecar.runtime));
const loader=new GLTFLoader();loader.register(()=>({name:'ATLAS_CPU_FINAL_WEIGHT_AUDIT',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
const gltf=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
gltf.scene.updateMatrixWorld(true);
const report={ok:false,source:path.resolve(directory),sourceSha256:createHash('sha256').update(bytes).digest('hex'),
  scope:'Final GLB four-influence L/R total hind-limb weights across every unique exported triangle edge, all skinned parts; bind geometry in metres.',
  limits:{hindOwnershipGradientPerM:5,floatTolerancePerM:.0001},edges:0,maximumNormalizationError:0,sides:Object.fromEntries(['L','R'].map(side=>[side,{maximumGradientPerM:0,maximumStifleGradientPerM:0,worst:null}]))};
try{
  gltf.scene.traverse(mesh=>{
    if(!mesh.isSkinnedMesh)return;
    const geometry=mesh.geometry,ids=geometry.attributes.skinIndex,weights=geometry.attributes.skinWeight;
    const vertices=Array.from({length:geometry.attributes.position.count},(_,i)=>{
      const influences=Array.from({length:4},(_,j)=>({name:mesh.skeleton.bones[ids.getComponent(i,j)].name,weight:weights.getComponent(i,j)}));
      report.maximumNormalizationError=Math.max(report.maximumNormalizationError,Math.abs(1-influences.reduce((n,w)=>n+w.weight,0)));
      return{point:new THREE.Vector3().fromBufferAttribute(geometry.attributes.position,i).applyMatrix4(mesh.matrixWorld),influences,
        totals:Object.fromEntries(['L','R'].map(side=>[side,influences.filter(w=>new RegExp(`^${side}_(hip|stifle|hock|rear_fetlock)$`).test(w.name)).reduce((n,w)=>n+w.weight,0)]))};
    });
    const index=geometry.index?.array??vertices.map((_,i)=>i),edges=new Set();
    for(let i=0;i<index.length;i+=3)for(let k=0;k<3;k++){
      const a=Math.min(index[i+k],index[i+(k+1)%3]),b=Math.max(index[i+k],index[i+(k+1)%3]),key=`${a}/${b}`;if(edges.has(key))continue;edges.add(key);report.edges++;
      const from=vertices[a],to=vertices[b],distance=from.point.distanceTo(to.point);
      for(const side of ['L','R']){
        const difference=Math.abs(from.totals[side]-to.totals[side]),gradient=difference/Math.max(distance,1e-12),out=report.sides[side];
        const stifle=v=>v.influences.find(w=>w.name===`${side}_stifle`)?.weight??0;
        out.maximumStifleGradientPerM=Math.max(out.maximumStifleGradientPerM,Math.abs(stifle(from)-stifle(to))/Math.max(distance,1e-12));
        if(gradient>out.maximumGradientPerM){out.maximumGradientPerM=gradient;out.worst={part:mesh.name,vertices:[a,b],distanceM:distance,points:[from.point.toArray(),to.point.toArray()],totals:[from.totals[side],to.totals[side]],influences:[from.influences,to.influences]};}
      }
    }
  });
  report.ok=report.edges>0&&report.maximumNormalizationError<1e-5&&Object.values(report.sides).every(s=>s.maximumGradientPerM<=report.limits.hindOwnershipGradientPerM+report.limits.floatTolerancePerM);
}finally{
  const resources=new Set();gltf.scene.traverse(o=>{if(o.geometry)resources.add(o.geometry);for(const m of(Array.isArray(o.material)?o.material:o.material?[o.material]:[])){resources.add(m);for(const value of Object.values(m))if(value?.isTexture)resources.add(value);}});for(const value of resources)value.dispose();
  await fs.mkdir(path.dirname(path.resolve(reportPath)),{recursive:true});await fs.writeFile(reportPath,JSON.stringify(report,null,2)+'\n');
}
console.log(JSON.stringify(report));assert.ok(report.ok,`Final exported ownership exceeds declared 5/m bound; see ${reportPath}`);
