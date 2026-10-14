import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {deriveTreeCanopyMetadata} from '#tree-kit/v1/presentation';
import {deriveFamilyProxyBounds,evaluateFamilyProxyBounds} from '#tree-kit/v1/presentation';

const emptyBand=(centerM=[0,0,0])=>({centerM,minY_M:0,maxY_M:0,halfHeightM:0,populated:false,radiusM:0,count:0});
function profile(bands,maxLeafOffsetM=0){return {referenceHeightM:16,bands,radiusStatistic:'p90-visual-only',maxLeafOffsetM};}
function populated(centerM,radiusM,halfHeightM,count=2){
  return {centerM,minY_M:centerM[1]-halfHeightM,maxY_M:centerM[1]+halfHeightM,halfHeightM,populated:true,radiusM,count};
}
function inside(bounds,p,height){
  const b=evaluateFamilyProxyBounds(bounds,height);
  return p.every((v,i)=>Math.abs(v-b.centerM[i])<=b.extentM[i]+1e-8);
}

test('analytic profile returns deterministic height-scaled AABB plus constant metric margin',()=>{
  const input=profile([
    populated([2,5,-1],4,2),emptyBand([1000,1000,1000]),populated([-3,12,2],1,3),emptyBand(),
  ],.75);
  const a=deriveFamilyProxyBounds(input),b=deriveFamilyProxyBounds(input);
  assert.deepEqual(a,b);assert.equal(a.metricMarginM,.75);
  const bound=evaluateFamilyProxyBounds(a,16);
  // Lateral and vertical union of the two occupied bands plus the actual trunk.
  assert.deepEqual(a.centerPerHeight,[(Math.min(0,2-4,-3-1)/16+Math.max(0,2+4,-3+1)/16)/2,
    (Math.min(0,5-2,12-3)/16+Math.max(.64,5+2,12+3)/16)/2,
    (Math.min(0,-1-4,2-1)/16+Math.max(0,-1+4,2+1)/16)/2]);
  assert.ok(bound.extentM.every(x=>x>.75));
  for(const h of [10,16,22]){
    const b=evaluateFamilyProxyBounds(a,h);
    for(const band of input.bands.filter(x=>x.populated)){
      const center=band.centerM.map(x=>x*h/16),r=band.radiusM*h/16,y=band.halfHeightM*h/16;
      for(const sx of [-1,1])for(const sy of [-1,1])for(const sz of [-1,1]){
        const point=[center[0]+sx*r,center[1]+sy*y,center[2]+sz*r];
        assert.ok(inside(a,point,h),'profile ellipsoid extrema fit the proxy box');
        for(let n=0;n<32;n++){
          const angle=2*Math.PI*n/32,coneRadius=r*(1-(sy+1)/2);
          const vertex=[center[0]+sx*coneRadius*Math.cos(angle),center[1]+sy*y,center[2]+sz*coneRadius*Math.sin(angle)];
          assert.ok(inside(a,vertex,h),'stacked cone vertices fit the proxy box');
        }
      }
    }
    const trunkHeight=.64*h;
    for(const [y,radius] of [[0,.031*h],[trunkHeight,.018*h]])for(let n=0;n<32;n++){
      const angle=2*Math.PI*n/32;
      assert.ok(inside(a,[radius*Math.cos(angle),y,radius*Math.sin(angle)],h),'legacy trunk cylinder vertices fit');
    }
  }
});

function attr(doc,binary,index){
  const a=doc.accessors[index],view=doc.bufferViews[a.bufferView],components={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type];
  assert.equal(a.componentType,5126);assert.ok(components);
  const stride=view.byteStride??components*4,start=(view.byteOffset??0)+(a.byteOffset??0),data=new Float32Array(a.count*components),dv=new DataView(binary.buffer,binary.byteOffset,binary.byteLength);
  for(let i=0;i<a.count;i++)for(let c=0;c<components;c++)data[i*components+c]=dv.getFloat32(start+i*stride+c*4,true);
  return {data,itemSize:components};
}
async function actualProfile(path){
  const bytes=new Uint8Array(await readFile(new URL(path,import.meta.url))),dv=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  assert.equal(dv.getUint32(0,true),0x46546c67);const jLength=dv.getUint32(12,true),jEnd=20+jLength,doc=JSON.parse(new TextDecoder().decode(bytes.subarray(20,jEnd)));
  const binaryLength=dv.getUint32(jEnd,true),binary=bytes.subarray(jEnd+8,jEnd+8+binaryLength);
  const geometries=doc.meshes[0].primitives.map(p=>{
    const g=new THREE.BufferGeometry();
    for(const [name,semantic] of [['position','POSITION'],['_leaf_pivot','_LEAF_PIVOT'],['_branch_level','_BRANCH_LEVEL'],['_wind','_WIND']]){
      const a=attr(doc,binary,p.attributes[semantic]);g.setAttribute(name,new THREE.BufferAttribute(a.data,a.itemSize));
    }
    return g;
  });
  const result=deriveTreeCanopyMetadata(geometries).profile;geometries.forEach(g=>g.dispose());return result;
}

test('packaged Oak and Pine LOD profiles produce valid deterministic proxy bounds and cone/trunk samples fit',async()=>{
  for(const path of [
    '../public/assets/forest/desktop-v1/branching/oak-lod0.glb','../public/assets/forest/desktop-v1/branching/oak-lod1.glb',
    '../public/assets/forest/desktop-v1/spire/conifer-lod0.glb','../public/assets/forest/desktop-v1/spire/conifer-lod1.glb',
  ]){
    const shape=await actualProfile(path),bounds=deriveFamilyProxyBounds(shape);
    assert.deepEqual(bounds,deriveFamilyProxyBounds(await actualProfile(path)));
    for(const h of [10,16,22]){
      const b=evaluateFamilyProxyBounds(bounds,h);
      for(const band of shape.bands.filter(x=>x.populated)){
        const center=band.centerM.map(x=>x*h/16),r=band.radiusM*h/16,y=band.halfHeightM*h/16;
        for(let n=0;n<24;n++){
          const angle=2*Math.PI*n/24;
          for(const sign of [-1,1]){
            assert.ok(inside(bounds,[center[0]+sign*r*Math.cos(angle),center[1]+sign*y,center[2]+sign*r*Math.sin(angle)],h),`${path}: analytic band sample fits`);
            const coneRadius=r*(1-(sign+1)/2);
            assert.ok(inside(bounds,[center[0]+coneRadius*Math.cos(angle),center[1]+sign*y,center[2]+coneRadius*Math.sin(angle)],h),`${path}: cone sample fits`);
          }
        }
      }
      for(const [y,radius] of [[0,.031*h],[.64*h,.018*h]])for(let n=0;n<24;n++){
        const angle=2*Math.PI*n/24;
        assert.ok(inside(bounds,[radius*Math.cos(angle),y,radius*Math.sin(angle)],h),`${path}: trunk sample fits`);
      }
      assert.ok(b.extentM.every(Number.isFinite));
    }
  }
});

test('empty bands are excluded and invalid profiles or heights are rejected',()=>{
  const one=populated([0,8,0],2,1),bounds=deriveFamilyProxyBounds(profile([emptyBand([1e8,1e8,1e8]),one,emptyBand(),emptyBand()],.4));
  assert.ok(bounds.centerPerHeight.every(x=>Math.abs(x)<1e7),'empty bands cannot inflate the box');
  assert.equal(bounds.metricMarginM,.4);
  assert.throws(()=>deriveFamilyProxyBounds(profile([emptyBand(),emptyBand(),emptyBand(),emptyBand()])),/no populated/);
  assert.throws(()=>deriveFamilyProxyBounds(profile([populated([NaN,0,0],1,1),emptyBand(),emptyBand(),emptyBand()])),/Invalid crown band/);
  assert.throws(()=>deriveFamilyProxyBounds(profile([populated([0,1,0],-1,1),emptyBand(),emptyBand(),emptyBand()])),/Invalid crown band/);
  assert.throws(()=>deriveFamilyProxyBounds(profile([populated([0,1,0],1,1),emptyBand(),emptyBand()])),/Invalid canopy/);
  // Family envelope is the allometry range [4,24] m (tree-allometry-2), not the canonical 10-22 m proxy.
  assert.doesNotThrow(()=>evaluateFamilyProxyBounds(bounds,4));assert.doesNotThrow(()=>evaluateFamilyProxyBounds(bounds,24));
  assert.throws(()=>evaluateFamilyProxyBounds(bounds,3.99),/unsupported/);
  assert.throws(()=>evaluateFamilyProxyBounds(bounds,24.01),/unsupported/);
  for(const ratios of [{crownRatio:0,trunkRatio:1},{crownRatio:1,trunkRatio:NaN},null])assert.throws(()=>evaluateFamilyProxyBounds(bounds,16,ratios),/unsupported/);
  assert.throws(()=>evaluateFamilyProxyBounds({...bounds,metricMarginM:-1},16),/Invalid family/);
});
