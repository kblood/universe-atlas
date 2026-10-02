import test from 'node:test';
import assert from 'node:assert/strict';
import {compareShoulderAssets,SHOULDER_EDIT_SCOPE} from './helpers/fauna-shoulder-preservation.mjs';
import {signature} from './helpers/fauna-neck-preservation.mjs';
function fixture(){
 const points=[[1,1.4,0],[.5,1.1,.1],[.35,.9,.1],[.3,.5,.1],[-.3,.7,.1],[-.1,1,.1],[.74,1.5,.15],[.72,1.65,.18],[.75,1.6,.13]],records=points.map((point,vertex)=>({vertex,point,all:vertex>=6?{head:1}:vertex===4?{L_hip:1}:{chest:1},shapeKey:signature([point,[0,0,0]])}));
 const joints=Object.fromEntries(Array.from({length:27},(_,i)=>[`joint${i}`,{parent:null}]));
 const part={name:'coat',materialName:'MAT_DeerCoat',records,triangles:[[0,1,2],[1,3,2],[3,4,2],[4,5,2],[6,7,8]],modelJoints:{L_elbow:[.3,.69,.1],R_elbow:[.3,.69,-.1]},positionMorphNames:['juvenile'],metadata:{skeleton:Array.from({length:27},(_,i)=>({name:`joint${i}`,translation:[0,0,0],inverseBind:[1]})),bindMatrix:[1],rawMeshMorphDefaults:[0],geometrySignature:'fixture'},rawAttributeHashes:{uv:'uv',normal:'normal'}};
 return{files:{'coat.png':{sha256:'map'}},sidecar:{neutralJoints:joints},sidecarSha256:'sidecar',parts:[part],appearance:{maps:'embedded'}};
}
const shape=(asset,i,point,morph=[0,0,0])=>{asset.parts[0].records[i].point=point;asset.parts[0].records[i].shapeKey=signature([point,morph]);};
test('bounded shoulder and lower-neck edits pass while UV/normal rebakes stay diagnostic',()=>{
 const before=fixture(),after=structuredClone(before);shape(after,1,[.47,1.09,.12]);shape(after,2,[.35,.96,.09],[.01,0,0]);after.parts[0].records[1].all={chest:.6,neck1:.4};after.parts[0].rawAttributeHashes={uv:'rebaked',normal:'recomputed'};after.appearance={maps:'rebaked'};
 const result=compareShoulderAssets(before,after,before);assert.equal(result.ok,true,JSON.stringify(result.failures));assert.equal(result.appearanceDiagnostics.sameEmbeddedAppearance,false);assert.ok(result.diagnostics[0].beforeCounts.mixedTriangles>0);assert.equal(result.boundaries.minX,.10);
});
test('head, ear attachments, hind and distal forelimb geometry or morph changes fail',()=>{
 for(const index of[0,3,4,5,6])for(const channel of['position','morph']){const before=fixture(),after=structuredClone(before),point=[...after.parts[0].records[index].point];if(channel==='position')point[2]+=.001;shape(after,index,point,channel==='morph'?[.001,0,0]:[0,0,0]);assert.equal(compareShoulderAssets(before,after,before).ok,false,`${index}:${channel}`);}
});
test('protected raw weights are exact; one ULP is reported but not silently accepted',()=>{
 const before=fixture(),after=structuredClone(before);before.parts[0].records[3].all={L_elbow:.5,L_carpus:.5};after.parts[0].records[3].all={L_elbow:Math.fround(.5+2**-24),L_carpus:.5};const result=compareShoulderAssets(before,after,before);assert.equal(result.ok,false);assert.equal(result.diagnostics[0].maxProtectedUlps,1);
 const hind=fixture(),changed=structuredClone(hind);shape(hind,4,[.4,.8,.1]);shape(changed,4,[.4,.8,.1]);changed.parts[0].records[4].all={L_hip:.8,L_stifle:.2};assert.equal(compareShoulderAssets(hind,changed,hind).ok,false,'Hind influence overrides edit envelope');
});
test('sidecar, all joint anchors, inverse binds, target defaults and triangle winding are protected',()=>{
 for(const mutate of[a=>a.sidecarSha256='changed',a=>a.parts[0].metadata.skeleton[4].translation[0]=.001,a=>a.parts[0].metadata.skeleton[4].inverseBind[0]=2,a=>a.parts[0].metadata.rawMeshMorphDefaults[0]=1,a=>a.parts[0].triangles[4].reverse(),a=>a.parts[0].triangles.splice(4,1)]){const before=fixture(),after=structuredClone(before);mutate(after);assert.equal(compareShoulderAssets(before,after,before).ok,false);}
});
test('boundary planes are protected and edits cannot escape by crossing the envelope',()=>{
 for(const point of[[SHOULDER_EDIT_SCOPE.minX,.9,0],[SHOULDER_EDIT_SCOPE.maxX,1.2,0],[.4,.69,0],[.4,SHOULDER_EDIT_SCOPE.maxY,0]]){const before=fixture(),after=structuredClone(before);shape(before,1,point);shape(after,1,[point[0],point[1],.001]);assert.equal(compareShoulderAssets(before,after,before).ok,false);}
 const before=fixture(),after=structuredClone(before);shape(after,1,[.79,1.1,.1]);assert.equal(compareShoulderAssets(before,after,before).ok,false);
});
