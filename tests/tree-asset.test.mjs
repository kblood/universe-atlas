import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import * as THREE from 'three';
import {prepareTreeLODPair,treeVertexMeters,treeWindPhase,TREE_REFERENCE_HEIGHT_M,TREE_WIND_PERIOD_NS} from '../src/tree-asset.ts';
import {UNIVERSE_END_NS} from '../src/world-time.ts';
import {TreeInstancePasses,TreeInstanceRows} from '../src/tree-instance-passes.ts';
import {CompactInstanceSlots} from '../src/compact-instance-slots.ts';

test('tree camera prefix and full shadow union preserve callbacks, materials and zero-camera casters',()=>{
  const meshes=[0,1].map(()=>new THREE.InstancedMesh(new THREE.BufferGeometry(),new THREE.MeshBasicMaterial(),8));
  const calls=[],original=[],camera=new THREE.PerspectiveCamera(),reflection=new THREE.PerspectiveCamera();
  for(const mesh of meshes){
    mesh.count=0;mesh.castShadow=true;mesh.frustumCulled=false;
    mesh.customDepthMaterial=new THREE.MeshDepthMaterial();mesh.customDistanceMaterial=new THREE.MeshDistanceMaterial();
    for(const name of ['onBeforeRender','onAfterRender','onBeforeShadow','onAfterShadow'])mesh[name]=function(...args){assert.equal(this,mesh);calls.push({mesh,name,args,count:mesh.count});};
    original.push([mesh.onBeforeRender,mesh.onAfterRender,mesh.onBeforeShadow,mesh.onAfterShadow]);
  }
  const passes=new TreeInstancePasses(meshes);passes.grow(6);passes.setCameraCount(2);passes.setViewCameras([camera]);
  for(const mesh of meshes){
    for(const material of [mesh.customDepthMaterial,mesh.customDistanceMaterial]){
      const args=[{},mesh,{}, {},mesh.geometry,material,null];
      mesh.onBeforeShadow(...args);assert.equal(mesh.count,6);assert.deepEqual(calls.at(-1).args,args);
      mesh.onAfterShadow(...args);assert.equal(mesh.count,2);
    }
    const args=[{}, {},camera,mesh.geometry,mesh.material,null];mesh.onBeforeRender(...args);assert.equal(mesh.count,2);assert.deepEqual(calls.at(-1).args,args);mesh.onAfterRender(...args);
    const reflected=[...args];reflected[2]=reflection;mesh.onBeforeRender(...reflected);assert.equal(mesh.count,6);mesh.onAfterRender(...reflected);assert.equal(mesh.count,2);
  }
  passes.setCameraCount(0);
  for(const mesh of meshes){assert.equal(mesh.visible,true);mesh.onBeforeShadow();assert.equal(mesh.count,6);mesh.onAfterShadow();assert.equal(mesh.count,0);}
  const eyes=[new THREE.PerspectiveCamera(),new THREE.PerspectiveCamera()];passes.setViewCameras(eyes);passes.setCameraCount(2);
  for(const mesh of meshes)for(const view of [...eyes,camera,reflection]){
    const args=[{}, {},view,mesh.geometry,mesh.material,null];mesh.onBeforeRender(...args);assert.equal(mesh.count,eyes.includes(view)?2:6);mesh.onAfterRender(...args);assert.equal(mesh.count,2);
  }
  passes.grow(7);assert.equal(passes.initializedCount,7);passes.setCount(3);assert.equal(passes.cameraCount,3);
  for(const operation of [()=>passes.setCameraCount(4),()=>passes.setCount(4),()=>passes.grow(9)])assert.throws(operation);
  assert.equal(passes.initializedCount,3);assert.ok(meshes.every(m=>m.count===3));
  passes.dispose();passes.dispose();meshes.forEach((mesh,i)=>assert.deepEqual([mesh.onBeforeRender,mesh.onAfterRender,mesh.onBeforeShadow,mesh.onAfterShadow],original[i]));
  assert.throws(()=>passes.setCount(0),/truncate/);
  for(const mesh of meshes){mesh.geometry.dispose();mesh.material.dispose();mesh.customDepthMaterial.dispose();mesh.customDistanceMaterial.dispose();mesh.dispose();}
});

test('tree pass callback failures restore camera counts and keep errors observable',()=>{
  for(const failing of ['onBeforeRender','onAfterRender','onBeforeShadow','onAfterShadow']){
    const mesh=new THREE.InstancedMesh(new THREE.BufferGeometry(),new THREE.MeshBasicMaterial(),4),error=new Error(failing);
    mesh[failing]=()=>{mesh.count=99;throw error;};
    const passes=new TreeInstancePasses([mesh]);passes.grow(4);passes.setCameraCount(1);
    if(failing==='onAfterShadow')mesh.onBeforeShadow();
    assert.throws(()=>mesh[failing](),e=>e===error);assert.equal(mesh.count,1);
    passes.dispose();mesh.geometry.dispose();mesh.material.dispose();mesh.dispose();
  }
});

test('camera partition preserves every typed tree row, canonical state and topology through visibility churn',()=>{
  const capacity=24,attributes=[16,16,3,3,4,2,2].map((size,n)=>{
    const attribute=new THREE.InstancedBufferAttribute(new Float32Array(capacity*size),size);
    for(let row=0;row<capacity;row++)for(let k=0;k<size;k++)attribute.array[row*size+k]=n*10000+row*100+k+.125;
    return attribute;
  });
  const before=attributes.map(a=>a.array.slice()),buffers=attributes.map(a=>a.array.buffer),rows=new TreeInstanceRows([...attributes,attributes[4]]);
  const pool=new CompactInstanceSlots(capacity,x=>String(x.id)),items=Array.from({length:capacity},(_,id)=>({id}));
  pool.reconcile(items,(_i,item)=>({owner:item}));let swaps=0;
  const swap=(a,b)=>{rows.swap(a,b,pool.items.length);swaps++;};
  for(let frame=0;frame<80;frame++){
    const selected=item=>(item.id*7+frame)%11<5,count=pool.partition(selected,swap);
    assert.equal(count,items.filter(selected).length);
    pool.items.forEach((item,row)=>{
      assert.equal(selected(item),row<count);assert.equal(pool.states[row].owner,item);
      attributes.forEach((attribute,n)=>assert.deepEqual(attribute.array.slice(row*attribute.itemSize,(row+1)*attribute.itemSize),before[n].slice(item.id*attribute.itemSize,(item.id+1)*attribute.itemSize)));
    });
    const versions=attributes.map(a=>a.version),previous=swaps;
    assert.equal(pool.partition(selected,swap),count);assert.equal(swaps,previous);assert.deepEqual(attributes.map(a=>a.version),versions,'same visibility schedules no uploads');
    assert.deepEqual(attributes.map(a=>a.array.buffer),buffers,'no mirror or replacement allocation');
    assert.ok(attributes.every(a=>a.updateRanges.length<=8),'bounded pending upload ranges');
    const retained=[...pool.items];pool.reconcile([...items].reverse(),(_i,item,state)=>{assert.equal(state.owner,item);return state;});assert.deepEqual(pool.items,retained,'identity map follows swaps');
  }
  const snapshot=attributes.map(a=>a.array.slice()),identities=[...pool.items];
  assert.throws(()=>pool.partition(item=>item!==pool.items[0],()=>rows.swap(0,capacity,capacity)),/swap/);
  assert.deepEqual(pool.items,identities);attributes.forEach((a,i)=>assert.deepEqual(a.array,snapshot[i]));
});

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
