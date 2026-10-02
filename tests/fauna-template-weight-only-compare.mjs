// Independent, read-only comparison of actual weight-only candidate exports.
// Required: before-dir after-dir frozen-before-hashes.json report.json
// Never edits sources/assets. Nonhind weights remain exact; redistributed hind
// sums have an explicit float32-storage envelope and exact equality is reported.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const [beforeDir,afterDir,baselinePath,reportPath,...options]=process.argv.slice(2);
if(!beforeDir||!afterDir||!baselinePath||!reportPath)throw Error('Required: <before-dir> <after-dir> <frozen-before-hashes.json> <report.json>');
if(options.length>1||options.some(option=>option!=='--allow-export-normalization-ulp'))throw Error('Unknown comparison option');
const allowExportNormalizationUlp=options.includes('--allow-export-normalization-ulp');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
const signature=v=>hash(JSON.stringify(stable(v)));
const canonicalTriangle=v=>[v,[v[1],v[2],v[0]],[v[2],v[0],v[1]]].map(a=>a.join('/')).sort()[0];
const hindSide=name=>/^L_(hip|stifle|hock|rear_fetlock)$/.test(name)?'L':/^R_(hip|stifle|hock|rear_fetlock)$/.test(name)?'R':null;
// Four nonnegative float32 influences sum to ~1: summing rounded stored values
// on either side has error bounded by ~2*2^-24 for round-to-nearest values.
// 2e-7 also covers export normalization; it is a weight-storage tolerance only.
const totalHindStorageTolerance=2e-7;
function float32UlpDistance(a,b){assert.ok(Number.isFinite(a)&&Number.isFinite(b)&&a>=0&&b>=0,'Finite nonnegative weights required');const bytes=Buffer.alloc(8);bytes.writeFloatLE(a,0);bytes.writeFloatLE(b,4);return Math.abs(bytes.readUInt32LE(0)-bytes.readUInt32LE(4));}
assert.equal(float32UlpDistance(.0819711908698082,.0819711983203888),1,'Actual023 one-ULP normalization fixture');
assert.equal(float32UlpDistance(1,1+2**-22),2,'Two-ULP negative control must exceed the allowed envelope');
function glbData(bytes){assert.equal(bytes.readUInt32LE(0),0x46546c67);const jsonLength=bytes.readUInt32LE(12),document=JSON.parse(bytes.subarray(20,20+jsonLength).toString('utf8'));let binary=null;for(let offset=12;offset<bytes.length;){const length=bytes.readUInt32LE(offset),type=bytes.readUInt32LE(offset+4);if(type===0x004e4942)binary=bytes.subarray(offset+8,offset+8+length);offset+=length+8;}assert.ok(binary,'Embedded GLB binary required');return{document,binary};}
function rawAccessor(data,index){const spec=data.document.accessors[index];assert.ok(spec&&spec.bufferView!==undefined&&!spec.sparse,'Dense raw accessor required');const view=data.document.bufferViews[spec.bufferView];assert.equal(view.buffer,0);const size={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[spec.type],types={5121:[1,'readUInt8',255],5123:[2,'readUInt16LE',65535],5125:[4,'readUInt32LE',4294967295],5126:[4,'readFloatLE',1]},type=types[spec.componentType];assert.ok(size&&type,'Supported raw accessor type');const stride=view.byteStride??size*type[0],start=(view.byteOffset??0)+(spec.byteOffset??0),array=[];for(let i=0;i<spec.count;i++)for(let c=0;c<size;c++){const value=data.binary[type[1]](start+i*stride+c*type[0]);array.push(spec.normalized?value/type[2]:value);}return{count:spec.count,itemSize:size,getComponent:(i,c)=>array[i*size+c]};}
async function topFiles(directory){const files={};for(const entry of(await fs.readdir(directory,{withFileTypes:true})).filter(e=>e.isFile()).sort((a,b)=>a.name.localeCompare(b.name))){const bytes=await fs.readFile(path.join(directory,entry.name));files[entry.name]={bytes:bytes.length,sha256:hash(bytes)};}return files;}
function embeddedAppearance(bytes){const jsonLength=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+jsonLength).toString('utf8'));let binary=null;for(let offset=12;offset<bytes.length;){const length=bytes.readUInt32LE(offset),type=bytes.readUInt32LE(offset+4);if(type===0x004e4942)binary=bytes.subarray(offset+8,offset+8+length);offset+=length+8;}return{materials:json.materials,textures:json.textures,samplers:json.samplers,images:(json.images??[]).map(({bufferView,...image})=>{assert.equal(image.uri,undefined,'Comparison requires embedded images');const view=json.bufferViews[bufferView];assert.equal(view.buffer,0);return{...image,sha256:hash(binary.subarray(view.byteOffset??0,(view.byteOffset??0)+view.byteLength))};})};}
async function inspect(directory){
  const files=await topFiles(directory),sidecar=JSON.parse(await fs.readFile(path.join(directory,'fauna-template.json'))),bytes=await fs.readFile(path.join(directory,sidecar.runtime)),raw=glbData(bytes);
  const loader=new GLTFLoader();loader.register(()=>({name:'ATLAS_CPU_WEIGHT_PRESERVATION',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
  const gltf=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');gltf.scene.updateMatrixWorld(true);
  const meshes=[];gltf.scene.traverse(o=>{if(o.isSkinnedMesh)meshes.push(o);});
  try{return{directory:path.resolve(directory),files,sourceSha256:hash(bytes),sidecar,appearance:embeddedAppearance(bytes),parts:meshes.map(mesh=>{
    const geometry=mesh.geometry,names=Object.keys(mesh.morphTargetDictionary??{}).sort(),attributeNames=Object.keys(geometry.attributes).filter(n=>!['skinIndex','skinWeight'].includes(n)).sort(),morphKinds=Object.keys(geometry.morphAttributes).sort();
    const attrs=attributeNames.map(name=>({name,attribute:geometry.attributes[name]}));for(const kind of morphKinds)for(const name of names){const attribute=geometry.morphAttributes[kind][mesh.morphTargetDictionary[name]];assert.ok(attribute,`Missing ${kind} morph ${name}`);attrs.push({name:`morph:${kind}:${name}`,attribute});}
    // GLTFLoader normalizes skin weights during construction. Preserve its
    // geometry/rig parsing but read original weight/index accessors directly.
    const association=gltf.parser.associations.get(mesh);assert.ok(association?.meshes!==undefined&&association?.primitives!==undefined,'Explicit raw primitive association required');
    const primitive=raw.document.meshes[association.meshes].primitives[association.primitives];assert.ok(primitive.attributes.JOINTS_1===undefined&&primitive.attributes.WEIGHTS_1===undefined,'One raw joint/weight set only');
    const ids=rawAccessor(raw,primitive.attributes.JOINTS_0),weights=rawAccessor(raw,primitive.attributes.WEIGHTS_0);assert.equal(ids.itemSize,4);assert.equal(weights.itemSize,4);assert.equal(weights.count,geometry.attributes.position.count);assert.equal(ids.count,weights.count);
    const vertexMap=new Map(),records=[];let nonNormalized=0,nonFinite=0;
    for(let i=0;i<geometry.attributes.position.count;i++){
      const values=attrs.map(({attribute})=>Array.from({length:attribute.itemSize},(_,c)=>{const n=attribute.getComponent(i,c);assert.ok(Number.isFinite(n),'All preserved attributes finite');return n===0?0:n;}));
      const key=signature(values),all={};for(let j=0;j<weights.itemSize;j++){const weight=weights.getComponent(i,j),bone=mesh.skeleton.bones[ids.getComponent(i,j)]?.name;assert.ok(bone,'Valid skin bone');if(!Number.isFinite(weight)||weight<0)nonFinite++;if(weight!==0)all[bone]=(all[bone]??0)+weight;}
      const preserved={},totals={L:0,R:0};for(const[bone,weight]of Object.entries(all)){const side=hindSide(bone);if(side)totals[side]+=weight;else preserved[bone]=weight;}
      if(Math.abs(Object.values(all).reduce((s,w)=>s+w,0)-1)>2e-7)nonNormalized++;
      assert.ok(Object.keys(all).length<=4,'At most four nonzero influences');
      const invariant={preserved,totals},record={key,all,invariant,vertex:i};records.push(record);if(!vertexMap.has(key))vertexMap.set(key,[]);vertexMap.get(key).push(record);
    }
    const index=geometry.index?.array??records.map((_,i)=>i),geometryTriangles=[],invariantTriangles=[],hindTotalTriangles=[];
    for(let i=0;i<index.length;i+=3){const tri=Array.from(index.slice(i,i+3)).map(id=>records[id]);geometryTriangles.push(canonicalTriangle(tri.map(v=>v.key)));invariantTriangles.push(canonicalTriangle(tri.map(v=>signature([v.key,v.invariant.preserved]))));hindTotalTriangles.push(canonicalTriangle(tri.map(v=>signature([v.key,v.invariant.totals]))));}
    const skeleton=mesh.skeleton.bones.map((bone,i)=>({name:bone.name,parent:bone.parent?.name??null,position:bone.position.toArray(),quaternion:bone.quaternion.toArray(),scale:bone.scale.toArray(),inverseBind:mesh.skeleton.boneInverses[i].toArray()}));
    return{name:mesh.name,vertexCount:records.length,triangles:index.length/3,morphNames:names,morphTargetsRelative:geometry.morphTargetsRelative,attributes:attrs.map(({name,attribute})=>({name,itemSize:attribute.itemSize,normalized:attribute.normalized})),meshMatrix:mesh.matrixWorld.toArray(),bindMatrix:mesh.bindMatrix.toArray(),bindMatrixInverse:mesh.bindMatrixInverse.toArray(),skeleton,geometryTriangleSha256:hash(geometryTriangles.sort().join('\n')),preservedWeightsTriangleSha256:hash(invariantTriangles.sort().join('\n')),totalHindTriangleSha256:hash(hindTotalTriangles.sort().join('\n')),nonNormalized,nonFinite,vertexMap,records};
  }).sort((a,b)=>a.name.localeCompare(b.name))};}finally{const resources=new Set();gltf.scene.traverse(o=>{if(o.geometry)resources.add(o.geometry);for(const m of(Array.isArray(o.material)?o.material:o.material?[o.material]:[])){resources.add(m);for(const v of Object.values(m))if(v?.isTexture)resources.add(v);}});for(const resource of resources)resource.dispose();}
}
const [before,after,baseline]=await Promise.all([inspect(beforeDir),inspect(afterDir),fs.readFile(baselinePath,'utf8').then(JSON.parse)]);
const failures=[],check=(name,pass,detail)=>{if(!pass)failures.push({name,detail});};
check('originalCandidateFilesUnchanged',signature(before.files)===signature(baseline.files),'All top-level source/GLB/texture/sidecar/manifest files must match frozen baseline hashes');
check('sameSidecar',signature(before.sidecar)===signature(after.sidecar),'Full sidecar: neutral joints, all morph deltas, controls, correctives and metadata');
check('sameEmbeddedAppearance',signature(before.appearance)===signature(after.appearance),'Material/texture bindings, samplers and embedded image bytes');
for(const name of Object.keys(before.files).filter(name=>name==='fauna-coat-source.py'||name==='asset-brief.json'||name.endsWith('.png')))check(`unchangedFile:${name}`,before.files[name].sha256===after.files[name]?.sha256);
check('samePartNames',signature(before.parts.map(p=>p.name))===signature(after.parts.map(p=>p.name)));
const diagnostics=[];
for(const a of before.parts){const b=after.parts.find(p=>p.name===a.name);if(!b)continue;
  const metadata=p=>{const{records,vertexMap,vertexCount,preservedWeightsTriangleSha256,totalHindTriangleSha256,nonNormalized,nonFinite,...data}=p;return data;};
  check(`exactGeometryUvMorphAndRig:${a.name}`,signature(metadata(a))===signature(metadata(b)));
  const exactNonHindTriangleEquality=a.preservedWeightsTriangleSha256===b.preservedWeightsTriangleSha256;
  check(`validWeights:${a.name}`,b.nonFinite===0&&b.nonNormalized===0,{nonFinite:b.nonFinite,nonNormalized:b.nonNormalized});
  let changedVertices=0,unmatchedVertices=0,maxNonHindWeightDelta=0,maxNonHindUlpDistance=0,nonHindBoneKeyChanges=0,maxTotalHindDelta=0,maxWeightDelta=0;
  const examples=[];for(const r of b.records){const candidates=a.vertexMap.get(r.key);if(!candidates){unmatchedVertices++;continue;}const scored=candidates.map(old=>{const names=new Set([...Object.keys(old.all),...Object.keys(r.all)]);let weight=0,nonHind=0;for(const n of names){const d=Math.abs((old.all[n]??0)-(r.all[n]??0));weight=Math.max(weight,d);if(!hindSide(n))nonHind=Math.max(nonHind,d);}const total=Math.max(...['L','R'].map(side=>Math.abs(old.invariant.totals[side]-r.invariant.totals[side])));return{old,weight,nonHind,total};}).sort((x,y)=>(x.nonHind+x.total)-(y.nonHind+y.total)||x.weight-y.weight);const s=scored[0];if(s.weight>0)changedVertices++;maxNonHindWeightDelta=Math.max(maxNonHindWeightDelta,s.nonHind);maxTotalHindDelta=Math.max(maxTotalHindDelta,s.total);maxWeightDelta=Math.max(maxWeightDelta,s.weight);if((s.nonHind>0||s.total>0)&&examples.length<8)examples.push({beforeVertex:s.old.vertex,afterVertex:r.vertex,before:s.old.all,after:r.all,nonHindDelta:s.nonHind,totalHindDelta:s.total});}
  // Match unchanged geometry records independently of vertex ordering. Compare
  // every retained nonhind bone, and disallow added/dropped nonzero slots.
  for(const record of b.records){const candidates=a.vertexMap.get(record.key)??[];const distances=candidates.map(old=>{const oldKeys=Object.keys(old.invariant.preserved).sort(),newKeys=Object.keys(record.invariant.preserved).sort(),sameKeys=JSON.stringify(oldKeys)===JSON.stringify(newKeys);return{sameKeys,ulp:sameKeys?Math.max(0,...oldKeys.map(bone=>float32UlpDistance(old.invariant.preserved[bone],record.invariant.preserved[bone]))):Infinity};}).sort((x,y)=>x.ulp-y.ulp);const closest=distances[0];if(!closest?.sameKeys)nonHindBoneKeyChanges++;else maxNonHindUlpDistance=Math.max(maxNonHindUlpDistance,closest.ulp);}
  const nonHindWithinExportEnvelope=nonHindBoneKeyChanges===0&&maxNonHindUlpDistance<=1;
  check(`${allowExportNormalizationUlp?'axialForeWithinOneExportUlp':'exactAxialForeWeights'}:${a.name}`,allowExportNormalizationUlp?nonHindWithinExportEnvelope:exactNonHindTriangleEquality,{exactNonHindTriangleEquality,maxNonHindUlpDistance,nonHindBoneKeyChanges});
  check(`totalHindOwnershipWithinFloat32Storage:${a.name}`,maxTotalHindDelta<=totalHindStorageTolerance,{maxTotalHindDelta,tolerance:totalHindStorageTolerance});
  diagnostics.push({part:a.name,changedVertices,unmatchedVertices,maxNonHindWeightDelta,maxNonHindUlpDistance,nonHindBoneKeyChanges,exactNonHindTriangleEquality,nonHindWithinExportEnvelope,maxTotalHindDelta,maxWeightDelta,exactTotalHindTriangleEquality:a.totalHindTriangleSha256===b.totalHindTriangleSha256,examples});
}
let sourceJustification=null;
if(allowExportNormalizationUlp){const manifest=JSON.parse(await fs.readFile(path.join(afterDir,'authoring-manifest.json'))),audits=manifest.distalMixtureAudit?.authoring;
  check('sourceNonLimbPreservationReceipt',Array.isArray(audits)&&audits.length===2&&audits.every(a=>a.nonLimbWeightsChanged===0),'Requires two source final-assignment audits proving unchanged nonhind dictionaries');
  check('sourceSnapshotMatchesManifest',after.files['fauna-authoring-source.py']?.sha256===manifest.authoringCodeSha256);
  sourceJustification={reason:'Explicitly authorized exported-only float32 normalization envelope. Source review found only hind groups assigned and exact nonhind dictionary assertion; saved authoring audits report zero nonlimb changes. Blender exporter normalizes retained float32 weights. Exact raw comparison remains reported separately.',authoringCodeSha256:manifest.authoringCodeSha256,nonLimbWeightsChanged:audits?.map(a=>({side:a.side,value:a.nonLimbWeightsChanged})),maximumUlps:1,forbidNonHindBoneKeyChanges:true};
}
const compact=asset=>({directory:asset.directory,files:asset.files,sourceSha256:asset.sourceSha256,parts:asset.parts.map(({records,vertexMap,...part})=>part)});
const report={ok:failures.length===0,weightSource:'Raw embedded GLB JOINTS_0/WEIGHTS_0 accessors; GLTFLoader normalized values are not used',allowExportNormalizationUlp,sourceJustification,totalHindStorageTolerance,scope:'Exact semantic triangle multisets preserve all nonweight vertex attributes, all morph attribute channels, UVs, winding and rig; only L/R hind redistribution allowed. Nonhind weights require exact equality by default; explicit option permits at most one float32 ULP with unchanged nonhind bone keys and source preservation receipts. Exact status remains separately reported. Per-side total hind ownership has explicit 2e-7 storage envelope. No physical shape QA thresholds changed. Source baseline covers every original top-level file; review subdirectory excluded. New authoring source and blend may differ; source diff still requires review.',before:compact(before),after:compact(after),diagnostics,failures};
await fs.mkdir(path.dirname(path.resolve(reportPath)),{recursive:true});await fs.writeFile(reportPath,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({ok:report.ok,diagnostics,failures,report:path.resolve(reportPath)}));assert.ok(report.ok,'Weight-only preservation failed; inspect exact differences');
