import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {alphaWeightedLinearRgbMean,deriveTreeCanopyMetadata,TREE_CANOPY_HEIGHT_RANGE_M,TREE_CANOPY_REFERENCE_HEIGHT_M,TREE_CANOPY_WIND_MAX_ANGLE_RAD} from '../src/tree-canopy-profile.ts';

function geometry(position,pivot,branch,wind){
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(position,3));
  g.setAttribute('_leaf_pivot',new THREE.Float32BufferAttribute(pivot,3));
  g.setAttribute('_branch_level',new THREE.Float32BufferAttribute(branch,1));
  g.setAttribute('_wind',new THREE.Float32BufferAttribute(wind,1));
  return g;
}
function readFloatAttribute(doc,binary,index){
  const a=doc.accessors[index],v=doc.bufferViews[a.bufferView],components={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type];
  assert.equal(a.componentType,5126);assert.ok(components);
  const start=(v.byteOffset??0)+(a.byteOffset??0),stride=v.byteStride??components*4,data=new Float32Array(a.count*components),view=new DataView(binary.buffer,binary.byteOffset,binary.byteLength);
  for(let i=0;i<a.count;i++)for(let c=0;c<components;c++)data[i*components+c]=view.getFloat32(start+i*stride+c*4,true);
  return {data,components};
}
function geometriesFromGlb(bytes){
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  assert.equal(view.getUint32(0,true),0x46546c67);assert.equal(view.getUint32(4,true),2);
  const jsonBytes=view.getUint32(12,true),jsonStart=20,jsonEnd=jsonStart+jsonBytes,doc=JSON.parse(new TextDecoder().decode(bytes.subarray(jsonStart,jsonEnd)));
  const binaryLength=view.getUint32(jsonEnd,true),binaryStart=jsonEnd+8,binary=bytes.subarray(binaryStart,binaryStart+binaryLength);
  return doc.meshes[0].primitives.map(primitive=>{
    const g=new THREE.BufferGeometry();
    for(const [name,key,itemSize] of [['position','POSITION',3],['_leaf_pivot','_LEAF_PIVOT',3],['_branch_level','_BRANCH_LEVEL',1],['_wind','_WIND',1]]){
      const {data,components}=readFloatAttribute(doc,binary,primitive.attributes[key]);assert.equal(components,itemSize);
      g.setAttribute(name,new THREE.BufferAttribute(data,itemSize));
    }
    return g;
  });
}
function deformedVertex(position,pivot,leaf,wind,height,sign){
  const s=height/TREE_CANOPY_REFERENCE_HEIGHT_M;
  if(!leaf)return position.map(x=>x*s);
  const angle=sign*TREE_CANOPY_WIND_MAX_ANGLE_RAD*wind,c=Math.cos(angle),sn=Math.sin(angle),x=position[0]-pivot[0],y=position[1]-pivot[1];
  return [pivot[0]*s+x*c-y*sn,pivot[1]*s+x*sn+y*c,pivot[2]*s+position[2]-pivot[2]];
}

test('analytic profile uses four deterministic reference-height bands and metric card extent',()=>{
  const g=geometry([
    0,2,0, .4,5,0, -.2,9,.2, .8,14,0,
    0,0,0, 0,4,0, 0,8,0, 0,12,0,
  ],[
    0,2,0, 0,5,0, 0,9,0, 0,14,0,
    0,0,0, 0,4,0, 0,8,0, 0,12,0,
  ],[0,4,4,4,0,0,0,0],[0,.5,1,.25,0,0,0,0]);
  const result=deriveTreeCanopyMetadata([g]),again=deriveTreeCanopyMetadata([g]);
  assert.deepEqual(result,again);
  assert.equal(result.profile.bands.length,4);
  assert.deepEqual(result.profile.bands.map(b=>b.count),[0,1,1,1]);
  assert.deepEqual(result.profile.bands.map(b=>b.centerM[1]),[2,5,9,14]);
  assert.equal(result.profile.bands[1].radiusM,0);
  assert.ok(Math.abs(result.profile.maxLeafOffsetM-.8)<1e-6,'leaf offset remains source metres and is not multiplied by tree height');
  assert.equal(result.profile.radiusStatistic,'p90-visual-only');
  assert.ok(result.cullingBounds.radiusM>0);
  g.dispose();
});

test('guaranteed sphere contains every actual Oak and Pine LOD vertex at 10, 16, and 22 m under both extreme wind phases',async()=>{
  for(const path of [
    '../public/assets/forest/desktop-v1/branching/oak-lod0.glb','../public/assets/forest/desktop-v1/branching/oak-lod1.glb',
    '../public/assets/forest/desktop-v1/spire/conifer-lod0.glb','../public/assets/forest/desktop-v1/spire/conifer-lod1.glb',
  ]){
    const bytes=new Uint8Array(await readFile(new URL(path,import.meta.url))),geometries=geometriesFromGlb(bytes),metadata=deriveTreeCanopyMetadata(geometries);
    assert.equal(metadata.cullingBounds.heightRangeM[0],TREE_CANOPY_HEIGHT_RANGE_M[0]);
    assert.equal(metadata.cullingBounds.heightRangeM[1],TREE_CANOPY_HEIGHT_RANGE_M[1]);
    for(const g of geometries){
      const p=g.getAttribute('position'),q=g.getAttribute('_leaf_pivot'),branch=g.getAttribute('_branch_level'),wind=g.getAttribute('_wind');
      for(let i=0;i<p.count;i++)for(const h of [10,16,22])for(const sign of [-1,1]){
        const leaf=branch.getX(i)>3.5,point=deformedVertex([p.getX(i),p.getY(i),p.getZ(i)],[q.getX(i),q.getY(i),q.getZ(i)],leaf,wind.getX(i),h,sign);
        assert.ok(Math.hypot(...point)<=metadata.cullingBounds.radiusM+1e-5,`${path} vertex ${i} escapes at ${h} m, wind ${sign}`);
      }
      g.dispose();
    }
    assert.equal(metadata.profile.bands.length,4);
    assert.ok(metadata.profile.maxLeafOffsetM>0);
  }
});

test('alpha-weighted color mean decodes straight sRGB before averaging',()=>{
  const result=alphaWeightedLinearRgbMean(new Uint8Array([255,0,0,255,0,0,255,0,0,255,0,255]));
  assert.deepEqual(result.linearRgb,[.5,.5,0]);
  assert.equal(result.pixelCount,3);assert.equal(result.alphaWeight,2);
  const blackWhite=alphaWeightedLinearRgbMean([0,0,0,255,255,255,255,255]);
  assert.ok(Math.abs(blackWhite.linearRgb[0]-.5)<1e-12,'mean is linear light, not sRGB encoded midpoint');
});

test('invalid geometry, attributes, wind, and color inputs are rejected',()=>{
  assert.throws(()=>deriveTreeCanopyMetadata([]),/At least one/);
  assert.throws(()=>deriveTreeCanopyMetadata([new THREE.BufferGeometry()]),/missing valid float/);
  const noLeaves=geometry([0,0,0],[0,0,0],[2],[0]);assert.throws(()=>deriveTreeCanopyMetadata([noLeaves]),/no foliage pivots/);
  const invalidWind=geometry([0,1,0],[0,1,0],[4],[1.01]);assert.throws(()=>deriveTreeCanopyMetadata([invalidWind]),/wind outside/);
  for(const value of [[],[255,0,0],[256,0,0,255],[0,0,0,NaN],[0,0,0,0]])assert.throws(()=>alphaWeightedLinearRgbMean(value));
  noLeaves.dispose();invalidWind.dispose();
});
