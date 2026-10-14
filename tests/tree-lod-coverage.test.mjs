import test from 'node:test';
import assert from 'node:assert/strict';
import {calibrateTreeLodCardScale,treeProjectedAreaM2,TREE_LOD_COVERAGE_VERSION,TREE_LOD_COVERAGE_VIEWS} from '#tree-kit/v1/presentation';
import {loadTreeAssetFamily,treeLodCardScale} from '#tree-kit/v1/assets';
import {loadRasterTree,rasterTree} from './helpers/tree-raster.mjs';

// One opaque 1x1 texel atlas; every card is fully covered.
const solid={width:1,height:1,rgba:[0,0,0,255],cutoffByte:128};
/** Vertical square card of half-size h centred at (x,y,z) facing +x/-x and +z/-z views equally. */
function cards(list){
  const position=[],uv=[],pivot=[],level=[],index=[];
  for(const [x,y,z,h] of list){
    for(const [plane,base] of [['xy',position.length/3],['zy',position.length/3+4]]){
      for(const [a,b] of [[-h,-h],[h,-h],[h,h],[-h,h]]){
        position.push(plane==='xy'?x+a:x,y+b,plane==='xy'?z:z+a);uv.push(.5,.5);pivot.push(x,y,z);level.push(4);
      }
      index.push(base,base+1,base+2,base,base+2,base+3);
    }
  }
  return {bark:{position:new Float32Array(0),uv:null,pivot:null,level:null,index:null},
    foliage:{position:new Float32Array(position),uv:new Float32Array(uv),pivot:new Float32Array(pivot),level:new Float32Array(level),index:new Uint32Array(index)}};
}

test('projected area is measured from actual triangles, alpha cutoff and card scale',()=>{
  const one=cards([[0,9,0,1]]);
  // A 2 m cross-card seen side-on from +x covers its 2x2 m face.
  assert.ok(Math.abs(treeProjectedAreaM2(one,solid,1,[1,0,0],192)-4)<.2);
  assert.ok(Math.abs(treeProjectedAreaM2(one,solid,1.5,[1,0,0],192)-9)<.3,'cards scale about their pivot');
  const clear={...solid,rgba:[0,0,0,0]};
  assert.equal(treeProjectedAreaM2(one,clear,1,[1,0,0]),0,'cutoff-rejected texels never cover');
  for(const args of [[one,solid,0,[1,0,0]],[one,solid,1,[1,0,0],4]])assert.throws(()=>treeProjectedAreaM2(...args));
});

test('calibration matches LOD0 projected area within the leaf-area bound and clamps both ends',()=>{
  // LOD0: four overlapping small cards; LOD1: one card at the centre.
  const lod0=cards([[-.5,9,0,1],[.5,9,0,1],[0,9.5,0,1],[0,8.5,0,1]]),lod1=cards([[0,9,0,1]]);
  const r=calibrateTreeLodCardScale(lod0,lod1,solid,3);
  assert.equal(r.version,TREE_LOD_COVERAGE_VERSION);
  assert.ok(r.cardScale>1&&r.cardScale<3,'overlapping LOD0 cards need less than the 2x leaf-area scale');
  assert.ok(Math.abs(r.areaRatio-1)<.03,`area ratio ${r.areaRatio}`);
  assert.ok(r.evaluations<=6);
  assert.equal(calibrateTreeLodCardScale(lod1,lod0,solid,3).cardScale,1,'a larger reduced set is never shrunk below authored size');
  assert.equal(calibrateTreeLodCardScale(lod0,lod1,solid,1.1).cardScale,1.1,'bounded above by the leaf-area scale');
  for(const max of [.9,3.1,NaN])assert.throws(()=>calibrateTreeLodCardScale(lod0,lod1,solid,max));
});

test('packaged Oak and Pine LOD1 cards match LOD0 silhouettes instead of inflating them',async()=>{
  for(const kind of ['branching','spire']){
    const lod0=await loadRasterTree(kind,0),lod1=await loadRasterTree(kind,1);
    const alpha={width:lod0.atlas.width,height:lod0.atlas.height,rgba:lod0.atlas.data,cutoffByte:128};
    const areaScale=kind==='branching'?2:2.83;
    const r=calibrateTreeLodCardScale(lod0,lod1,alpha,areaScale);
    assert.ok(r.cardScale>1&&r.cardScale<areaScale-.4,`${kind} scale ${r.cardScale}`);
    assert.ok(Math.abs(r.areaRatio-1)<.03,`${kind} ratio ${r.areaRatio}`);
    // Independent oracle (depth-tested supersampled raster) at held-out views.
    const frame={centerM:[0,9,0],halfSizeM:11},area=img=>img.reduce((a,b)=>a+b,0)*(22/128)**2;
    for(const direction of [[Math.SQRT1_2,0,Math.SQRT1_2],[-.6,.35,.72]]){
      assert.ok(!TREE_LOD_COVERAGE_VIEWS.some(v=>v.every((x,i)=>Math.abs(x-direction[i])<1e-6)));
      const a0=area(rasterTree(lod0,{direction,frame,size:128}).coverage);
      const matched=area(rasterTree(lod1,{direction,frame,size:128,cardScale:r.cardScale}).coverage);
      const inflated=area(rasterTree(lod1,{direction,frame,size:128,cardScale:areaScale}).coverage);
      assert.ok(Math.abs(matched/a0-1)<.08,`${kind} held-out ratio ${matched/a0}`);
      assert.ok(inflated/a0>1.25,`${kind} leaf-area rule inflates the crown (${inflated/a0})`);
    }
  }
});

test('loader rejects silhouette matching without its leaf-area bound before decoding',async()=>{
  await assert.rejects(loadTreeAssetFamily(new ArrayBuffer(0),new ArrayBuffer(0),{silhouetteMatchedLod:true}),/area-preserving bound/);
  assert.equal(treeLodCardScale({bands:[]},{bands:[]}),1);
});
