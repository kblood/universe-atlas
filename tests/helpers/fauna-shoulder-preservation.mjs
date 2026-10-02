/** Bounded shoulder-edit audit. Existing whole-neck preservation remains strict. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {inspectNeckAsset,signature,hash,float32Ulps} from './fauna-neck-preservation.mjs';
export const SHOULDER_EDIT_SCOPE=Object.freeze({minX:.10,maxX:.78,maxY:1.35});
const hind=name=>/^[LR]_(hip|stifle|hock|rear_fetlock)$/.test(name);
const triangleKey=v=>[v,[v[1],v[2],v[0]],[v[2],v[0],v[1]]].map(a=>a.join('/')).sort()[0];
const digestTriangles=values=>hash(values.sort().join('\n'));
export async function inspectShoulderAsset(directory){
 const asset=await inspectNeckAsset(directory),bytes=await fs.readFile(path.join(directory,asset.sidecar.runtime)),loader=new GLTFLoader();
 loader.register(()=>({name:'SHOULDER_SHAPE_ONLY',loadTexture:()=>Promise.resolve(new T.Texture())}));
 const gltf=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 // Raw weights/rig come from the established inspector. Extract position and
 // morph POSITION channels separately: a permitted UV rebake must not disguise
 // changed anatomy or fail solely because UV splits/normal arrays changed.
 try{gltf.scene.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;const part=asset.parts.find(p=>p.name===mesh.name);assert.ok(part);const names=Object.keys(mesh.morphTargetDictionary??{}).sort();
  part.materialName=mesh.material.name;part.positionMorphNames=names;
  for(const r of part.records){const attributes=[mesh.geometry.attributes.position,...names.map(n=>mesh.geometry.morphAttributes.position[mesh.morphTargetDictionary[n]])];r.shapeKey=signature(attributes.map(a=>Array.from({length:a.itemSize},(_,c)=>a.getComponent(r.vertex,c))));}
 });return asset;}finally{const resources=new Set();gltf.scene.traverse(o=>{if(o.geometry)resources.add(o.geometry);if(o.skeleton)resources.add(o.skeleton);for(const m of(Array.isArray(o.material)?o.material:o.material?[o.material]:[])){resources.add(m);for(const v of Object.values(m))if(v?.isTexture)resources.add(v);}});for(const r of resources)r.dispose();}
}
function mainCoat(asset){const candidates=[];for(const part of asset.parts){if(part.materialName!=='MAT_DeerCoat')continue;const parent=part.records.map((_,i)=>i),find=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;},join=(a,b)=>{a=find(a);b=find(b);if(a!==b)parent[a]=b;},weld=new Map();
 for(const r of part.records){const key=r.point.map(x=>Math.round(x/1e-6)).join('/');if(weld.has(key))join(r.vertex,weld.get(key));else weld.set(key,r.vertex);}
 for(const t of part.triangles){join(t[0],t[1]);join(t[0],t[2]);}const counts=new Map();for(const t of part.triangles)counts.set(find(t[0]),(counts.get(find(t[0]))??0)+1);for(const[id,count]of counts)candidates.push({part,count,vertices:new Set(part.records.filter(r=>find(r.vertex)===id).map(r=>r.vertex))});}
 candidates.sort((a,b)=>b.count-a.count);assert.ok(candidates.length&&(!candidates[1]||candidates[0].count>candidates[1].count),'Unique largest connected coat component required');return candidates[0];}
export function protectedShoulderReason(part,record,main,elbowY){
 if(part!==main.part)return'other-material-or-part';if(!main.vertices.has(record.vertex))return'separate-component';
 if(Object.keys(record.all).some(hind))return'hind-chain';
 const[x,y]=record.point;if(y<=elbowY)return'at-or-below-elbow';
 if(x>=SHOULDER_EDIT_SCOPE.maxX)return'head025';
 if(x<=SHOULDER_EDIT_SCOPE.minX||y>=SHOULDER_EDIT_SCOPE.maxY)return'outside-edit-envelope';return null;
}
function subset(part,classify){const protectedRecords=part.records.filter(r=>classify(r)),shapeSet=new Set(protectedRecords.map(r=>r.shapeKey)),shapeWeights=new Map();for(const r of protectedRecords){if(!shapeWeights.has(r.shapeKey))shapeWeights.set(r.shapeKey,[]);shapeWeights.get(r.shapeKey).push(r.all);}
 const all=[],mixed=[],geometry=[],weighted=[],counts={protectedTriangles:0,mixedTriangles:0,editableTriangles:0};
 for(const t of part.triangles){const records=t.map(i=>part.records[i]),flags=records.map(classify),n=flags.filter(Boolean).length;if(n===0){counts.editableTriangles++;continue;}const shape=records.map((r,i)=>flags[i]?r.shapeKey:'EDITABLE'),weights=records.map((r,i)=>flags[i]?signature([r.shapeKey,r.all]):'EDITABLE');all.push(triangleKey(shape));weighted.push(triangleKey(weights));if(n===3){counts.protectedTriangles++;geometry.push(triangleKey(shape));}else{counts.mixedTriangles++;mixed.push({vertices:t,protectedCorners:t.filter((_,i)=>flags[i]),editableCorners:t.filter((_,i)=>!flags[i])});}}
 return{shapeSet,shapeWeights,geometrySignature:digestTriangles(geometry),boundarySignature:digestTriangles(all),weightedBoundarySignature:digestTriangles(weighted),counts,mixed};
}
const rig=p=>{const{geometrySignature,attributes,...rest}=p.metadata;return{...rest,positionMorphNames:p.positionMorphNames,materialName:p.materialName};};
export function compareShoulderAssets(before,after,headReference){
 const failures=[],check=(name,pass,detail)=>{if(!pass)failures.push({name,detail});},main=mainCoat(before),newMain=mainCoat(after),elbowY=Math.max(main.part.modelJoints.L_elbow[1],main.part.modelJoints.R_elbow[1]);
 check('exactFullSidecarBytes',before.sidecarSha256===after.sidecarSha256);check('all27SemanticJoints',Object.keys(before.sidecar.neutralJoints).length===27&&signature(Object.keys(before.sidecar.neutralJoints).sort())===signature(Object.keys(after.sidecar.neutralJoints).sort()));
 check('samePartNames',signature(before.parts.map(p=>p.name).sort())===signature(after.parts.map(p=>p.name).sort()));
 const diagnostics=[];
 for(const a of before.parts){const b=after.parts.find(p=>p.name===a.name);if(!b)continue;check(`allJointAnchorsBindsAndDefaults:${a.name}`,signature(rig(a))===signature(rig(b)));
  const oldSubset=subset(a,r=>protectedShoulderReason(a,r,main,elbowY)),newSubset=subset(b,r=>protectedShoulderReason(b,r,newMain,elbowY));
  const exactShapes=signature([...oldSubset.shapeSet].sort())===signature([...newSubset.shapeSet].sort()),exactTriangles=oldSubset.geometrySignature===newSubset.geometrySignature,exactBoundary=oldSubset.boundarySignature===newSubset.boundarySignature,exactWeights=oldSubset.weightedBoundarySignature===newSubset.weightedBoundarySignature;
  check(`protectedPositionAndAllPositionMorphs:${a.name}`,exactShapes);check(`protectedTriangleGeometryAndWinding:${a.name}`,exactTriangles);check(`mixedTriangleProtectedCorners:${a.name}`,exactBoundary);check(`exactProtectedRawWeights:${a.name}`,exactWeights);
  let maxProtectedUlps=0,changedPositiveBoneKeys=0,missingProtectedShapes=0,invalidWeights=0;const examples=[];
  for(const r of b.records){const sum=Object.values(r.all).reduce((s,w)=>s+w,0);if(Object.keys(r.all).length>4||Math.abs(sum-1)>2e-7||Object.values(r.all).some(w=>!Number.isFinite(w)||w<0||w>1))invalidWeights++;
   const reason=protectedShoulderReason(b,r,newMain,elbowY);if(!reason)continue;const old=oldSubset.shapeWeights.get(r.shapeKey);if(!old){missingProtectedShapes++;if(examples.length<8)examples.push({vertex:r.vertex,point:r.point,reason,issue:'new or changed protected geometry/morph'});continue;}
   const keys=Object.keys(r.all).sort(),scores=old.map(weights=>{const sameKeys=signature(Object.keys(weights).sort())===signature(keys);return{sameKeys,ulp:sameKeys?Math.max(0,...keys.map(k=>float32Ulps(weights[k],r.all[k]))):Infinity,weights};}).sort((x,y)=>x.ulp-y.ulp),closest=scores[0];
   if(!closest.sameKeys)changedPositiveBoneKeys++;else maxProtectedUlps=Math.max(maxProtectedUlps,closest.ulp);
   if(closest.ulp!==0&&examples.length<8)examples.push({vertex:r.vertex,point:r.point,reason,before:closest.weights,after:r.all,ulps:closest.sameKeys?closest.ulp:null});
  }
  check(`validFourInfluenceWeights:${a.name}`,invalidWeights===0);
  diagnostics.push({part:a.name,exactProtectedShapes:exactShapes,exactProtectedTriangles:exactTriangles,exactMixedProtectedCorners:exactBoundary,exactProtectedWeights:exactWeights,maxProtectedUlps,changedPositiveBoneKeys,missingProtectedShapes,invalidWeights,beforeCounts:oldSubset.counts,afterCounts:newSubset.counts,beforeMixedTriangles:oldSubset.mixed,afterMixedTriangles:newSubset.mixed,examples,nonweightArraysExact:signature(a.rawAttributeHashes)===signature(b.rawAttributeHashes)});
 }
 // The accepted head identity is025. Compare its entire anterior region and
 // separate attachments spatially there, irrespective of later neck weights.
 const referenceMain=mainCoat(headReference),headRegion=(part,r,body)=>r.point[0]>=SHOULDER_EDIT_SCOPE.maxX||((part!==body.part||!body.vertices.has(r.vertex))&&r.all.head>0);
 const head=[];for(const reference of headReference.parts){const current=after.parts.find(p=>p.name===reference.name);if(!current){check(`head025Part:${reference.name}`,false);continue;}const old=subset(reference,r=>headRegion(reference,r,referenceMain)),now=subset(current,r=>headRegion(current,r,newMain)),exact=signature([...old.shapeSet].sort())===signature([...now.shapeSet].sort())&&old.geometrySignature===now.geometrySignature&&old.boundarySignature===now.boundarySignature;check(`head025GeometryMorphsAndAttachments:${reference.name}`,exact);head.push({part:reference.name,exact,reference:old.counts,current:now.counts});}
 return{ok:failures.length===0,failures,diagnostics,head025:head,boundaries:{...SHOULDER_EDIT_SCOPE,minY:elbowY,coordinateSpace:'neutral runtime model metres; strict open edit envelope',rationale:'X>.10 includes the old authored axillary patch support (.1<x<.65). Root explicitly approved .10 instead of .12. Distal geometry at/below actual elbow remains protected although the old patch extended toY.62. No further boundary expansion authorized.'},appearanceDiagnostics:{sameEmbeddedAppearance:signature(before.appearance)===signature(after.appearance),externalMaps:Object.fromEntries(Object.keys(before.files).filter(n=>n.endsWith('.png')).map(n=>[n,before.files[n].sha256===after.files[n]?.sha256]))}};
}
