import test from 'node:test';
import assert from 'node:assert/strict';
import {compareWeightRecord,compareNeckAssets,float32Ulps} from './helpers/fauna-neck-preservation.mjs';
const f32=v=>Math.fround(v);
test('protected weights require exact values and positive bone keys by default',()=>{
 const a={chest:.5,neck1:.5},b={chest:f32(.5+2**-24),neck1:.5};
 assert.equal(compareWeightRecord(a,a,{protectedVertex:true}).ok,true);
 assert.equal(compareWeightRecord(a,b,{protectedVertex:true}).ok,false);
 assert.equal(compareWeightRecord(a,b,{protectedVertex:true,allowExportNormalizationUlp:true}).ok,true);
 assert.equal(float32Ulps(.5,b.chest),1);
 assert.equal(compareWeightRecord(a,{chest:f32(.5+2**-23),neck1:.5},{protectedVertex:true,allowExportNormalizationUlp:true}).ok,false);
 assert.equal(compareWeightRecord({chest:1},{chest:f32(1-2**-24),neck1:2**-24},{protectedVertex:true,allowExportNormalizationUlp:true}).ok,false);
});
test('neck redistribution cannot introduce limbs, invalid weights or a fifth influence',()=>{
 const a={chest:1};for(const b of [{chest:NaN},{chest:-1,neck1:2},{chest:.9},{chest:.8,L_hip:.2},{pelvis:.2,spine:.2,chest:.2,neck1:.2,head:.2}])assert.equal(compareWeightRecord(a,b,{protectedVertex:false}).ok,false);
 assert.equal(compareWeightRecord(a,{chest:.5,neck1:.3,neck2:.1,head:.1},{protectedVertex:false}).ok,true);
});
test('actual026 keratin-cap influence loss stays a strict negative control',()=>{
 // Raw025/026 vertex0 in SM_AtlasDeerDoe_3, from the preserved failure report.
 // The cap shares a coat boundary but belongs to the protected other material.
 const before={head:0.9998117089271545,neck2:0.00018829941109288484},after={head:1};
 for(const allowExportNormalizationUlp of [false,true]){
  const result=compareWeightRecord(before,after,{protectedVertex:true,allowExportNormalizationUlp});
  assert.equal(result.valid,true);assert.equal(result.sameKeys,false);assert.equal(result.ok,false,'An above-floor influence must not disappear under a storage-roundoff allowance');
 }
});
function fixture(){
 const modelJoints={chest:[.3,1,0],neck1:[.5,1.2,0],L_hip:[-.4,.7,.1],R_hip:[-.4,.7,-.1],L_shoulder:[.3,.7,.1],R_shoulder:[.3,.7,-.1]};
 const records=[{key:'belly',vertex:0,point:[-.1,.8,0],all:{chest:1}},{key:'limb',vertex:1,point:[.4,1,0],all:{chest:.9,L_front_fetlock:.1}},{key:'neck',vertex:2,point:[.5,1.1,0],all:{chest:1}}];
 const part={name:'coat',modelJoints,records,vertexMap:new Map(records.map(r=>[r.key,[r]])),triangles:[[0,1,2]],metadata:{geometrySignature:'actual-geometry'},rawAttributeHashes:{POSITION:'positions',morph:'morphs'}};
 return{files:{'coat.png':{sha256:'coat'}},sidecarSha256:'sidecar',appearance:{texture:'embedded'},parts:[part]};
}
test('asset scope protects central abdomen, named fetlock vertices, appearance and neutral rig',()=>{
 const before=fixture(),after=structuredClone(before);assert.equal(compareNeckAssets(before,after).ok,true);
 after.parts[0].records[2].all={chest:.5,neck1:.5};assert.equal(compareNeckAssets(before,after).ok,true);
 after.parts[0].records[0].all={chest:.5,neck1:.5};assert.equal(compareNeckAssets(before,after).ok,false);
 for(const change of [a=>a.parts[0].records[1].all={chest:1},a=>a.sidecarSha256='changed',a=>a.appearance.texture='changed',a=>a.parts[0].metadata.geometrySignature='changed',a=>a.parts[0].metadata.skeleton='changed',a=>a.files['coat.png'].sha256='changed']){const a=structuredClone(before);change(a);assert.equal(compareNeckAssets(before,a).ok,false);}
});
