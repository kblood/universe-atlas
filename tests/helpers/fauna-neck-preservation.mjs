/** Read-only raw-GLB preservation checks for a neck-weight-only candidate.
 * GLTFLoader normalizes weights, so all weight comparisons read raw accessors. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
export const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
export const signature=v=>hash(JSON.stringify(stable(v)));
const limb=name=>/^[LR]_(scapula|shoulder|elbow|carpus|front_fetlock|hip|stifle|hock|rear_fetlock)$/.test(name);
const axial=new Set(['pelvis','spine','chest','neck1','neck2','head']);
const canonicalTriangle=v=>[v,[v[1],v[2],v[0]],[v[2],v[0],v[1]]].map(a=>a.join('/')).sort()[0];
export function float32Ulps(a,b){assert.ok(Number.isFinite(a)&&Number.isFinite(b)&&a>=0&&b>=0);const v=new Float32Array([a,b]),u=new Uint32Array(v.buffer);return Math.abs(u[0]-u[1]);}
export function compareWeightRecord(before,after,{protectedVertex,allowExportNormalizationUlp=false}={}){
  const keys=Object.keys(after).filter(k=>after[k]!==0).sort(),oldKeys=Object.keys(before).filter(k=>before[k]!==0).sort();
  const valid=keys.length<=4&&keys.length>0&&Object.values(after).every(v=>Number.isFinite(v)&&v>=0&&v<=1)&&Math.abs(Object.values(after).reduce((a,b)=>a+b,0)-1)<=2e-7;
  const sameKeys=JSON.stringify(keys)===JSON.stringify(oldKeys),exact=signature(before)===signature(after);
  const ulps=sameKeys&&valid?Math.max(0,...keys.map(k=>float32Ulps(before[k],after[k]))):null;
  const permittedBones=keys.every(k=>axial.has(k));
  return{ok:valid&&(protectedVertex?(exact||(allowExportNormalizationUlp&&sameKeys&&ulps<=1)):permittedBones),valid,exact,sameKeys,maxUlps:ulps,permittedBones};
}
function glbData(bytes){assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.equal(bytes.readUInt32LE(8),bytes.length);const jsonLength=bytes.readUInt32LE(12),document=JSON.parse(bytes.subarray(20,20+jsonLength).toString('utf8'));let binary;for(let offset=12;offset<bytes.length;){const size=bytes.readUInt32LE(offset),type=bytes.readUInt32LE(offset+4);if(type===0x004e4942)binary=bytes.subarray(offset+8,offset+8+size);offset+=size+8;}assert.ok(binary);return{document,binary};}
function rawAccessor(data,index){const s=data.document.accessors[index],v=data.document.bufferViews[s.bufferView];assert.ok(s&&!s.sparse&&v.buffer===0,'Dense embedded weight/index accessor required');const size={VEC4:4}[s.type],type={5121:[1,'readUInt8',255],5123:[2,'readUInt16LE',65535],5126:[4,'readFloatLE',1]}[s.componentType];assert.ok(size&&type);return{count:s.count,get:(i,c)=>{const value=data.binary[type[1]]((v.byteOffset??0)+(s.byteOffset??0)+i*(v.byteStride??size*type[0])+c*type[0]);return s.normalized?value/type[2]:value;}};}
export async function topFiles(directory){const files={};for(const e of(await fs.readdir(directory,{withFileTypes:true})).filter(e=>e.isFile()).sort((a,b)=>a.name.localeCompare(b.name))){const bytes=await fs.readFile(path.join(directory,e.name));files[e.name]={bytes:bytes.length,sha256:hash(bytes)};}return files;}
export async function inspectNeckAsset(directory){
 const files=await topFiles(directory),sidecarBytes=await fs.readFile(path.join(directory,'fauna-template.json')),sidecar=JSON.parse(sidecarBytes),bytes=await fs.readFile(path.join(directory,sidecar.runtime)),raw=glbData(bytes),j=raw.document;
 const appearance={materials:j.materials,textures:j.textures,samplers:j.samplers,images:(j.images??[]).map(({bufferView,...im})=>{assert.equal(im.uri,undefined);const v=j.bufferViews[bufferView];return{...im,sha256:hash(raw.binary.subarray(v.byteOffset??0,(v.byteOffset??0)+v.byteLength))};})};
 const loader=new GLTFLoader();loader.register(()=>({name:'RAW_NECK_PRESERVATION',loadTexture:()=>Promise.resolve(new T.Texture())}));
 const gltf=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');gltf.scene.updateMatrixWorld(true);const parts=[];
 try{gltf.scene.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;const g=mesh.geometry,association=gltf.parser.associations.get(mesh),p=j.meshes[association.meshes].primitives[association.primitives];assert.ok(p.attributes.JOINTS_1===undefined&&p.attributes.WEIGHTS_1===undefined);const ids=rawAccessor(raw,p.attributes.JOINTS_0),weights=rawAccessor(raw,p.attributes.WEIGHTS_0),names=Object.keys(mesh.morphTargetDictionary??{}).sort();
   const attributes=Object.keys(g.attributes).filter(k=>!['skinWeight','skinIndex'].includes(k)).sort().map(name=>({name,a:g.attributes[name]}));
   for(const kind of Object.keys(g.morphAttributes).sort())for(const name of names)attributes.push({name:`${kind}:${name}`,a:g.morphAttributes[kind][mesh.morphTargetDictionary[name]]});
   const vertexMap=new Map(),records=[];assert.equal(ids.count,g.attributes.position.count);assert.equal(weights.count,ids.count);
   for(let i=0;i<ids.count;i++){const values=attributes.map(({a})=>Array.from({length:a.itemSize},(_,c)=>{const value=a.getComponent(i,c);assert.ok(Number.isFinite(value));return value;})),all={};for(let k=0;k<4;k++){const w=weights.get(i,k),bone=mesh.skeleton.bones[ids.get(i,k)]?.name;assert.ok(bone);assert.ok(Number.isFinite(w)&&w>=0&&w<=1,'Valid raw weight');if(w!==0)all[bone]=(all[bone]??0)+w;}
    const point=new T.Vector3().fromBufferAttribute(g.attributes.position,i).applyMatrix4(mesh.matrixWorld).applyMatrix4(gltf.scene.matrixWorld.clone().invert()).toArray(),key=signature(values),record={key,point,all,vertex:i};records.push(record);if(!vertexMap.has(key))vertexMap.set(key,[]);vertexMap.get(key).push(record);}
   const index=Array.from(g.index?.array??records.map((_,i)=>i)),triangles=[];for(let i=0;i<index.length;i+=3)triangles.push(index.slice(i,i+3));
   const geometrySignature=hash(triangles.map(tri=>canonicalTriangle(tri.map(i=>records[i].key))).sort().join('\n'));
   const skeleton=mesh.skeleton.bones.map((b,i)=>({name:b.name,parent:b.parent?.name??null,translation:b.position.toArray(),rotation:b.quaternion.toArray(),scale:b.scale.toArray(),inverseBind:mesh.skeleton.boneInverses[i].toArray()}));
   const modelJoints=Object.fromEntries(mesh.skeleton.bones.map(b=>[b.name,b.getWorldPosition(new T.Vector3()).applyMatrix4(gltf.scene.matrixWorld.clone().invert()).toArray()]));
   parts.push({name:mesh.name,records,vertexMap,triangles,modelJoints,metadata:{skeleton,meshMatrix:mesh.matrixWorld.toArray(),bindMatrix:mesh.bindMatrix.toArray(),morphTargetsRelative:g.morphTargetsRelative,rawMeshMorphDefaults:j.meshes[association.meshes].weights??null,rawNodeMorphDefaults:(j.nodes??[]).filter(n=>n.mesh===association.meshes).map(n=>({name:n.name,weights:n.weights??null})),attributes:attributes.map(({name,a})=>({name,itemSize:a.itemSize,normalized:a.normalized})),geometrySignature},rawAttributeHashes:Object.fromEntries([...attributes,...(g.index?[{name:'index',a:g.index}]:[])].map(({name,a})=>[name,hash(Buffer.from(a.array.buffer,a.array.byteOffset,a.array.byteLength))]))});
 });return{directory:path.resolve(directory),files,sourceSha256:hash(bytes),sidecarSha256:hash(sidecarBytes),sidecar,appearance,parts};}
 finally{const resources=new Set();gltf.scene.traverse(o=>{if(o.geometry)resources.add(o.geometry);if(o.skeleton)resources.add(o.skeleton);for(const m of(Array.isArray(o.material)?o.material:o.material?[o.material]:[])){resources.add(m);for(const v of Object.values(m))if(v?.isTexture)resources.add(v);}});for(const r of resources)r.dispose();}
}
// Components are derived independently from actual neutral exported triangles.
// One micrometre weld only reconnects UV/material seam duplicates.
function largestComponent(asset){let best=null;for(const part of asset.parts){const parents=part.records.map((_,i)=>i),find=i=>{while(parents[i]!==i){parents[i]=parents[parents[i]];i=parents[i];}return i;},join=(a,b)=>{a=find(a);b=find(b);if(a!==b)parents[a]=b;},weld=new Map();for(const r of part.records){const key=r.point.map(x=>Math.round(x/1e-6)).join('/');if(weld.has(key))join(r.vertex,weld.get(key));else weld.set(key,r.vertex);}for(const t of part.triangles){join(t[0],t[1]);join(t[0],t[2]);}const counts=new Map();for(const t of part.triangles)counts.set(find(t[0]),(counts.get(find(t[0]))??0)+1);for(const[id,count]of counts)if(!best||count>best.count)best={part,id,count,vertices:new Set(part.records.filter(r=>find(r.vertex)===id).map(r=>r.vertex))};}return best;}
export function compareNeckAssets(before,after,{allowExportNormalizationUlp=false}={}){
 const failures=[],check=(name,pass,detail)=>{if(!pass)failures.push({name,detail});};
 check('exactSidecarBytes',before.sidecarSha256===after.sidecarSha256);check('sameEmbeddedAppearance',signature(before.appearance)===signature(after.appearance));
 check('samePartNames',signature(before.parts.map(p=>p.name).sort())===signature(after.parts.map(p=>p.name).sort()));
 for(const name of Object.keys(before.files).filter(n=>n.endsWith('.png')||['asset-brief.json','fauna-coat-source.py'].includes(n)))check(`exactExternalAppearance:${name}`,before.files[name].sha256===after.files[name]?.sha256);
 const main=largestComponent(before);assert.ok(main);const joints=main.part.modelJoints,chest=joints.chest,neck=joints.neck1,hip=(joints.L_hip[0]+joints.R_hip[0])/2,shoulder=(joints.L_shoulder[0]+joints.R_shoulder[0])/2;
 const protectedReason=(part,r)=>{if(part!==main.part||!main.vertices.has(r.vertex))return'attachment';if(Object.keys(r.all).some(limb))return'limb';if(r.point[0]>=hip+.35*(shoulder-hip)&&r.point[0]<=hip+.60*(shoulder-hip)&&r.point[1]>=chest[1]*.65&&r.point[1]<=chest[1])return'central-abdomen';if(r.point[0]<=chest[0]-.12||r.point[1]<=chest[1]-.16)return'outside-neck-gate';return null;};
 const diagnostics=[];
 for(const a of before.parts){const b=after.parts.find(p=>p.name===a.name);if(!b)continue;check(`geometryMorphUvAndRig:${a.name}`,signature(a.metadata)===signature(b.metadata));
  const protectedKeys=new Map();for(const r of a.records){const reason=protectedReason(a,r);if(reason)protectedKeys.set(r.key,reason);}
  const protectedTriangleSignature=part=>hash(part.triangles.map(t=>canonicalTriangle(t.map(i=>{const r=part.records[i];return signature([r.key,protectedKeys.has(r.key)?r.all:null]);}))).sort().join('\n'));
  const exactProtectedTriangles=protectedTriangleSignature(a)===protectedTriangleSignature(b);if(!allowExportNormalizationUlp)check(`exactProtectedWeightTriangles:${a.name}`,exactProtectedTriangles);
  const row={part:a.name,beforeVertices:a.records.length,afterVertices:b.records.length,changedVertices:0,protectedVertices:0,exactProtectedTriangles,maxProtectedUlps:0,protectedFailures:0,invalidWeights:0,unmatchedVertices:0,rawAttributeArraysExact:signature(a.rawAttributeHashes)===signature(b.rawAttributeHashes),reasons:{},examples:[]};
  for(const r of b.records){const candidates=a.vertexMap.get(r.key);if(!candidates){row.unmatchedVertices++;continue;}const reason=protectedKeys.get(r.key),isProtected=Boolean(reason);if(isProtected){row.protectedVertices++;row.reasons[reason]=(row.reasons[reason]??0)+1;}
   const scores=candidates.map(old=>({old,result:compareWeightRecord(old.all,r.all,{protectedVertex:isProtected,allowExportNormalizationUlp})})).sort((x,y)=>Number(y.result.ok)-Number(x.result.ok)||Number(y.result.exact)-Number(x.result.exact)||(x.result.maxUlps??Infinity)-(y.result.maxUlps??Infinity));const{old,result}=scores[0];
   if(!result.exact)row.changedVertices++;if(!result.valid)row.invalidWeights++;if(isProtected){row.maxProtectedUlps=Math.max(row.maxProtectedUlps,result.maxUlps??Infinity);if(!result.ok)row.protectedFailures++;}
   if(!result.ok&&row.examples.length<8)row.examples.push({beforeVertex:old.vertex,afterVertex:r.vertex,point:r.point,reason,before:old.all,after:r.all,result});
   if(!result.ok)check(`weight:${a.name}:${r.vertex}`,false,{reason,point:r.point,before:old.all,after:r.all,result});
  }
  check(`matchedGeometryVertices:${a.name}`,row.unmatchedVertices===0);diagnostics.push(row);
 }
 return{ok:failures.length===0,failures,diagnostics,mainSkin:{part:main.part.name,triangles:main.count},boundaries:{hipX:hip,shoulderX:shoulder,chest,neck,neckGateMinX:chest[0]-.12,neckGateMinY:chest[1]-.16,centralAbdomenXFractions:[.35,.60],centralAbdomenChestYFractions:[.65,1]}};
}
