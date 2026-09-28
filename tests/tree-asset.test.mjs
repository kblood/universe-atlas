import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import * as THREE from 'three';
import {prepareTreeLODPair,treeVertexMeters,treeWindPhase,TREE_REFERENCE_HEIGHT_M,TREE_WIND_PERIOD_NS} from '../src/tree-asset.ts';
import {UNIVERSE_END_NS} from '../src/world-time.ts';

const root=process.env.ATLAS_TREE_CANDIDATE?resolve(process.env.ATLAS_TREE_CANDIDATE):null;
const lod0Path=process.env.ATLAS_TREE_LOD0??(root?join(root,'atlas-branching-v1.glb'):null);
const lod1Path=process.env.ATLAS_TREE_LOD1??(root?join(root,'atlas-branching-v1.lod1.glb'):null);
const havePair=Boolean(lod0Path&&lod1Path&&existsSync(lod0Path)&&existsSync(lod1Path));
if((root||process.env.ATLAS_TREE_LOD0||process.env.ATLAS_TREE_LOD1)&&!havePair)throw new Error(`Requested tree candidate is incomplete: LOD0=${lod0Path??'(unset)'}, LOD1=${lod1Path??'(unset)'}`);

function asArrayBuffer(bytes){return bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);}
function inspectGlb(input){
  const bytes=input instanceof Uint8Array?input:new Uint8Array(input),view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  assert.equal(view.getUint32(0,true),0x46546c67);assert.equal(view.getUint32(4,true),2);assert.equal(view.getUint32(8,true),bytes.byteLength);
  const jsonLength=view.getUint32(12,true),jsonStart=20,jsonEnd=jsonStart+jsonLength;
  assert.equal(view.getUint32(16,true),0x4e4f534a);
  const json=JSON.parse(new TextDecoder().decode(bytes.subarray(jsonStart,jsonEnd)));
  const binaryLength=view.getUint32(jsonEnd,true),binaryStart=jsonEnd+8;
  assert.equal(view.getUint32(jsonEnd+4,true),0x004e4942);assert.equal(binaryStart+binaryLength,bytes.byteLength);
  return {json,binary:bytes.subarray(binaryStart,binaryStart+binaryLength),binaryStart,binaryLength};
}
function rewriteJson(input,mutate){
  const doc=inspectGlb(input);mutate(doc.json);
  const encoded=new TextEncoder().encode(JSON.stringify(doc.json)),jsonLength=(encoded.length+3)&~3;
  const total=12+8+jsonLength+8+doc.binary.length,out=new Uint8Array(total),view=new DataView(out.buffer);
  view.setUint32(0,0x46546c67,true);view.setUint32(4,2,true);view.setUint32(8,total,true);
  view.setUint32(12,jsonLength,true);view.setUint32(16,0x4e4f534a,true);out.fill(32,20,20+jsonLength);out.set(encoded,20);
  const binaryHeader=20+jsonLength;view.setUint32(binaryHeader,doc.binary.length,true);view.setUint32(binaryHeader+4,0x004e4942,true);out.set(doc.binary,binaryHeader+8);
  return out.buffer;
}

test('wind phase uses Euclidean BigInt dates at negative, period, and universe endpoints',()=>{
  const dates=[-TREE_WIND_PERIOD_NS-1n,-TREE_WIND_PERIOD_NS,-1n,0n,1n,TREE_WIND_PERIOD_NS-1n,TREE_WIND_PERIOD_NS,TREE_WIND_PERIOD_NS+1n,UNIVERSE_END_NS];
  for(const date of dates){
    const phase=treeWindPhase(date),remainder=((date%TREE_WIND_PERIOD_NS)+TREE_WIND_PERIOD_NS)%TREE_WIND_PERIOD_NS;
    const expected=Number(remainder)/Number(TREE_WIND_PERIOD_NS)*2*Math.PI;
    assert.ok(Number.isFinite(phase)&&phase>=0&&phase<2*Math.PI);
    assert.ok(Math.abs(phase-expected)<1e-12,`phase for ${date}n follows exact positive modulo`);
    assert.equal(treeWindPhase(date+TREE_WIND_PERIOD_NS),phase,'adding one exact BigInt wind period preserves phase');
  }
  assert.equal(treeWindPhase(0n),0);
  assert.ok(treeWindPhase(-1n)>6.2,'negative dates wrap to the last phase of the cycle');
});

test('physical leaf transforms scale the attachment pivot, retain card size, and rotate the rigid offset',()=>{
  assert.equal(TREE_REFERENCE_HEIGHT_M,16);
  const pivot=new THREE.Vector3(2,3,4),offset=new THREE.Vector3(.5,.6,0),position=pivot.clone().add(offset);
  for(const heightM of [10,16,22]){
    const scale=heightM/16,rest=treeVertexMeters(position,pivot,true,heightM,0,1.1);
    assert.ok(rest.distanceTo(pivot.clone().multiplyScalar(scale).add(offset))<1e-12);
    const wood=treeVertexMeters(position,pivot,false,heightM,.7,1.1);
    assert.ok(wood.distanceTo(position.clone().multiplyScalar(scale))<1e-12);
    assert.ok(Math.abs(treeVertexMeters(position,pivot,true,heightM,0,1.1).distanceTo(treeVertexMeters(pivot,pivot,true,heightM,0,1.1))-offset.length())<1e-12,'leaf offset length does not scale with tree height');
  }
  const weight=.75,phase=Math.PI/2,instancePhase=.37,angle=Math.sin(phase+instancePhase)*.12*weight;
  const expected=position.clone().sub(pivot).applyAxisAngle(new THREE.Vector3(0,0,1),angle).addScaledVector(pivot,22/16);
  assert.ok(treeVertexMeters(position,pivot,true,22,weight,phase,instancePhase).distanceTo(expected)<1e-12);
});

test('LOD pair validates matching embedded material/texture bytes and strips LOD1 texture descriptors before parse',
  {skip:!havePair?'Set ATLAS_TREE_CANDIDATE or both LOD paths to run retained v6 GLB checks.':false},async()=>{
    const lod0=asArrayBuffer(await readFile(lod0Path)),lod1=asArrayBuffer(await readFile(lod1Path));
    const a=inspectGlb(lod0),b=inspectGlb(lod1),prepared=prepareTreeLODPair(lod0,lod1),stripped=inspectGlb(prepared.lod1GeometryBuffer);
    assert.deepEqual(a.json.materials,b.json.materials);assert.deepEqual(a.json.textures,b.json.textures);assert.deepEqual(a.json.samplers,b.json.samplers);
    const expectedBytes=a.json.images.reduce((sum,image)=>sum+a.json.bufferViews[image.bufferView].byteLength,0);
    assert.equal(prepared.embeddedTextureBytes,expectedBytes);
    assert.deepEqual(stripped.json.materials,[{name:'MAT_AtlasBark'},{name:'MAT_AtlasFoliage'}]);
    assert.equal('images' in stripped.json,false);assert.equal('textures' in stripped.json,false);assert.equal('samplers' in stripped.json,false);
    assert.deepEqual(stripped.json.meshes,b.json.meshes,'geometry and custom attributes survive descriptor stripping');
    assert.deepEqual(stripped.binary,b.binary,'temporary GLB keeps original binary buffer offsets and payload');
    assert.ok(prepared.lod1GeometryBuffer.byteLength<lod1.byteLength,'stripping texture descriptors reduces the second parser input');
  });

test('LOD preparation rejects material and embedded image divergence before sharing',
  {skip:!havePair?'Set ATLAS_TREE_CANDIDATE or both LOD paths to run retained v6 GLB checks.':false},async()=>{
    const lod0=asArrayBuffer(await readFile(lod0Path)),lod1=asArrayBuffer(await readFile(lod1Path));
    const wrongMaterial=rewriteJson(lod1,json=>{json.materials[0].pbrMetallicRoughness.roughnessFactor+=.01;});
    assert.throws(()=>prepareTreeLODPair(lod0,wrongMaterial),/Tree LOD materials differ/);
    const changedImage=lod1.slice(0),doc=inspectGlb(changedImage),image=doc.json.images[0],bufferView=doc.json.bufferViews[image.bufferView];
    new Uint8Array(changedImage)[doc.binaryStart+(bufferView.byteOffset??0)]^=1;
    assert.throws(()=>prepareTreeLODPair(lod0,changedImage),/Tree LOD image 0 differs/);
  });

test('GLB contract rejects extra, malformed, normalized, and blended attributes',
  {skip:!havePair?'Set ATLAS_TREE_CANDIDATE or both LOD paths to run retained v6 GLB checks.':false},async()=>{
    const lod0=asArrayBuffer(await readFile(lod0Path)),lod1=asArrayBuffer(await readFile(lod1Path));
    const extra=rewriteJson(lod0,json=>{json.meshes[0].primitives[0].attributes.COLOR_0=json.meshes[0].primitives[0].attributes.POSITION;});
    assert.throws(()=>prepareTreeLODPair(extra,lod1),/Incomplete tree vertex contract/);
    const badPivot=rewriteJson(lod0,json=>{const id=json.meshes[0].primitives[0].attributes._LEAF_PIVOT;json.accessors[id].type='VEC2';});
    assert.throws(()=>prepareTreeLODPair(badPivot,lod1),/Invalid tree accessor _LEAF_PIVOT/);
    const normalizedLevel=rewriteJson(lod0,json=>{const id=json.meshes[0].primitives[0].attributes._BRANCH_LEVEL;json.accessors[id].normalized=true;});
    assert.throws(()=>prepareTreeLODPair(normalizedLevel,lod1),/Invalid tree accessor _BRANCH_LEVEL/);
    const blended=rewriteJson(lod0,json=>{json.materials[1].alphaMode='BLEND';});
    assert.throws(()=>prepareTreeLODPair(blended,lod1),/Tree foliage requires alpha MASK/);
  });
