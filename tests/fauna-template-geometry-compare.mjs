// Required-input exported geometry comparison, independent of vertex ordering
// and weight-induced vertex splitting. Skin weights are intentionally excluded.
// node tests/fauna-template-geometry-compare.mjs <before-dir> <after-dir> <report.json>
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const [beforeDirectory,afterDirectory,reportPath,option]=process.argv.slice(2);
if(!beforeDirectory||!afterDirectory||!reportPath)throw new Error('Usage: node tests/fauna-template-geometry-compare.mjs <before-dir> <after-dir> <report.json>');
if(option!==undefined&&option!=='--allow-added-pose-targets')throw new Error('Unknown geometry comparison option');
const hash=data=>createHash('sha256').update(data).digest('hex');
async function inspect(directory,compareNames=null){
  const sidecar=JSON.parse(await fs.readFile(path.join(directory,'fauna-template.json'),'utf8'));
  const bytes=await fs.readFile(path.join(directory,sidecar.runtime));
  const loader=new GLTFLoader();loader.register(()=>({name:'ATLAS_CPU_BIND_GEOMETRY_COMPARE',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
  const gltf=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  const meshes=[];gltf.scene.updateMatrixWorld(true);gltf.scene.traverse(o=>{if(o.isSkinnedMesh)meshes.push(o);});
  try{
    const parts=meshes.map(mesh=>{
      const geometry=mesh.geometry,actualNames=Object.keys(mesh.morphTargetDictionary).sort();
      const names=compareNames??actualNames;
      assert.ok(names.every(name=>actualNames.includes(name)),'Every original target must remain');
      const additions=actualNames.filter(name=>!names.includes(name));
      for(const added of additions){
        assert.ok(sidecar.poseCorrectives?.some(recipe=>recipe.target===added),`Added target ${added} must be explicitly pose-driven`);
        const target=sidecar.targets.find(target=>target.name===added);
        assert.equal(target?.default,0,'Added pose targets must be neutral at zero');
        assert.ok(Object.values(target.jointDeltas).every(delta=>delta.every(value=>value===0)),'Added pose target must not move neutral joints');
      }
      const attributes=[geometry.attributes.position,...names.map(name=>geometry.morphAttributes.position[mesh.morphTargetDictionary[name]])];
      const vertices=Array.from({length:geometry.attributes.position.count},(_,i)=>{
        const data=Buffer.alloc(attributes.length*12);let offset=0;
        for(const attribute of attributes)for(let axis=0;axis<3;axis++){
          const value=attribute.getComponent(i,axis);assert.ok(Number.isFinite(value));data.writeFloatLE(value===0?0:value,offset);offset+=4;
        }
        return hash(data);
      });
      const index=geometry.index?.array??vertices.map((_,i)=>i),triangles=[];
      for(let i=0;i<index.length;i+=3){
        const triangle=[vertices[index[i]],vertices[index[i+1]],vertices[index[i+2]]];
        // Cyclic rotation only: reversed winding must remain a different hash.
        triangles.push([triangle.join('/'),[triangle[1],triangle[2],triangle[0]].join('/'),[triangle[2],triangle[0],triangle[1]].join('/')].sort()[0]);
      }
      return{name:mesh.name,vertices:vertices.length,triangles:triangles.length,morphNames:names,morphTargetsRelative:geometry.morphTargetsRelative,
        meshWorldMatrix:mesh.matrixWorld.toArray(),bindAndMorphTrianglesSha256:hash(triangles.sort().join('\n'))};
    });
    return{source:path.resolve(directory),sourceSha256:hash(bytes),addedPoseTargets:compareNames?sidecar.targets.map(target=>target.name).filter(name=>!compareNames.includes(name)):[],parts:parts.sort((a,b)=>a.name.localeCompare(b.name))};
  }finally{
    const geometries=new Set(),materials=new Set(),textures=new Set();
    gltf.scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of(Array.isArray(o.material)?o.material:o.material?[o.material]:[])){materials.add(m);for(const value of Object.values(m))if(value?.isTexture)textures.add(value);}});
    for(const value of [...geometries,...materials,...textures])value.dispose();
  }
}
const before=await inspect(beforeDirectory),after=await inspect(afterDirectory,option==='--allow-added-pose-targets'?before.parts[0].morphNames:null);
const comparable=asset=>asset.parts.map(({vertices,...part})=>part);
const report={ok:JSON.stringify(comparable(before))===JSON.stringify(comparable(after)),scope:'Exact exported position and original morph-position float32 triangle multisets, preserving winding, target names and mesh transforms; independent of index order/vertex splitting. Weights, materials, UVs and texture appearance excluded.',allowAddedPoseTargets:option==='--allow-added-pose-targets',before,after};
await fs.mkdir(path.dirname(path.resolve(reportPath)),{recursive:true});await fs.writeFile(reportPath,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
assert.ok(report.ok,'Exported bind/morph geometry differs; inspect required comparison report');
