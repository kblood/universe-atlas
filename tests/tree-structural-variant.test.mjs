import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {deriveTreeCanopyMetadata} from '#tree-kit/v1/presentation';
import {FOREST_VARIANT_COUNT,FOREST_VARIANT_CROWN_RAMP,FOREST_VARIANT_TWIST_FLOOR,FOREST_VARIANT_LIMITS,FOREST_VARIANT_VERSION,forestStructuralVariant,forestStructuralVariants,forestVariantClumpHash,
  forestVariantEnvelope,forestVariantGLSL,forestVariantPoint,forestVariantRadiusBound,forestVariantRemovesLeaf,forestVariantTwist,forestVariantUniformData} from '#tree-kit/v1/presentation';
import {treeLodCardScale} from '#tree-kit/v1/assets';
import {FOREST_CARD_COMPENSATION} from '#tree-kit/v1/instances';
import {treeInstanceAppearance} from '#tree-kit/v1/recipes';

function readFloatAttribute(doc,binary,index){
  const a=doc.accessors[index],v=doc.bufferViews[a.bufferView],components={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type];
  const start=(v.byteOffset??0)+(a.byteOffset??0),stride=v.byteStride??components*4,data=new Float32Array(a.count*components),view=new DataView(binary.buffer,binary.byteOffset,binary.byteLength);
  for(let i=0;i<a.count;i++)for(let c=0;c<components;c++)data[i*components+c]=view.getFloat32(start+i*stride+c*4,true);
  return data;
}
function readIndex(doc,binary,index){
  const a=doc.accessors[index],v=doc.bufferViews[a.bufferView],start=(v.byteOffset??0)+(a.byteOffset??0),view=new DataView(binary.buffer,binary.byteOffset,binary.byteLength);
  const size=a.componentType===5125?4:a.componentType===5123?2:1,out=new Uint32Array(a.count);
  for(let i=0;i<a.count;i++)out[i]=size===4?view.getUint32(start+i*4,true):size===2?view.getUint16(start+i*2,true):view.getUint8(start+i);
  return out;
}
export async function packagedGeometries(path){
  const bytes=new Uint8Array(await readFile(new URL(path,import.meta.url))),view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const jsonEnd=20+view.getUint32(12,true),doc=JSON.parse(new TextDecoder().decode(bytes.subarray(20,jsonEnd)));
  const binary=bytes.subarray(jsonEnd+8,jsonEnd+8+view.getUint32(jsonEnd,true));
  return doc.meshes[0].primitives.map(primitive=>{
    const g=new THREE.BufferGeometry();
    for(const [name,key,itemSize] of [['position','POSITION',3],['_leaf_pivot','_LEAF_PIVOT',3],['_branch_level','_BRANCH_LEVEL',1],['_wind','_WIND',1]])
      g.setAttribute(name,new THREE.BufferAttribute(readFloatAttribute(doc,binary,primitive.attributes[key]),itemSize));
    if(primitive.indices!==undefined)g.setIndex(new THREE.BufferAttribute(readIndex(doc,binary,primitive.indices),1));
    return g;
  });
}
const FAMILIES={branching:['oak-lod0','oak-lod1'],spire:['conifer-lod0','conifer-lod1']};
const families=new Map();
async function family(kind){
  if(!families.has(kind)){
    const [a,b]=FAMILIES[kind].map(name=>packagedGeometries(`../public/assets/forest/desktop-v1/${kind}/${name}.glb`));
    const lods=[await a,await b];families.set(kind,{lods,metadata:lods.map(deriveTreeCanopyMetadata)});
  }
  return families.get(kind);
}
const rotate=([x,y,z],theta)=>{const c=Math.cos(theta),s=Math.sin(theta);return [c*x+s*z,y,-s*x+c*z];};
/** CPU copy of the detailed vertex shader: wind, variant, metric and scaled cards. */
function deformVertex(variant,p,q,leaf,wind,heightM,windAngle,cardScale){
  const scale=heightM/16;
  if(!leaf)return forestVariantPoint(variant,[p[0]*scale,p[1]*scale,p[2]*scale],heightM);
  const angle=windAngle*wind,c=Math.cos(angle),s=Math.sin(angle),o=[p[0]-q[0],p[1]-q[1],p[2]-q[2]];
  const wound=[c*o[0]-s*o[1],s*o[0]+c*o[1],o[2]],card=rotate(wound,forestVariantTwist(variant,q[1]*scale,heightM));
  const pivot=forestVariantPoint(variant,[q[0]*scale,q[1]*scale,q[2]*scale],heightM);
  return [pivot[0]+card[0]*cardScale,pivot[1]+card[1]*cardScale,pivot[2]+card[2]*cardScale];
}

test('pool is deterministic, frozen, bounded and stratified per family and version',()=>{
  assert.equal(FOREST_VARIANT_VERSION,'forest-structural-variant-1');
  for(const kind of ['branching','spire']){
    const pool=forestStructuralVariants(kind),limit=FOREST_VARIANT_LIMITS[kind];
    assert.equal(pool,forestStructuralVariants(kind),'cached pool');assert.equal(pool.length,FOREST_VARIANT_COUNT);
    assert.ok(Object.isFrozen(pool)&&pool.every(v=>Object.isFrozen(v)&&Object.isFrozen(v.crownScale)&&Object.isFrozen(v.lean)));
    // Each channel visits each eighth of its range exactly once.
    const units=[pool.map(v=>(v.crownScale[0]-1)/limit.anisotropy/2+.5),pool.map(v=>(v.crownScale[1]-1)/limit.anisotropy/2+.5),
      pool.map(v=>Math.hypot(...v.lean)/limit.leanFraction),pool.map(v=>(Math.abs(v.twistRad)/limit.twistRad-FOREST_VARIANT_TWIST_FLOOR)/(1-FOREST_VARIANT_TWIST_FLOOR)),
      pool.map(v=>v.thinning/limit.thinning)];
    for(const channel of units)assert.deepEqual(channel.map(u=>Math.round(u*8-.5)+0).sort((a,b)=>a-b),[0,1,2,3,4,5,6,7]);
    assert.equal(pool.filter(v=>v.twistRad>0).length,4,'balanced tier-twist direction');
    for(const v of pool){
      assert.equal(v.kind,kind);assert.equal(forestStructuralVariant(kind,v.index),v);
      assert.ok(v.crownScale.every(s=>Math.abs(s-1)<=limit.anisotropy));
      assert.ok(Math.hypot(...v.lean)<=limit.leanFraction+1e-12&&Math.abs(v.twistRad)<=limit.twistRad&&v.thinning>=0&&v.thinning<limit.thinning);
    }
    const data=forestVariantUniformData(pool);
    assert.deepEqual([...data.subarray(8*3,8*3+8)],[...pool[3].crownScale,...pool[3].lean,pool[3].twistRad,pool[3].thinning,pool[3].clumpRefM,0].map(Math.fround));
  }
  assert.notDeepEqual(forestStructuralVariants('branching').map(v=>v.twistRad),forestStructuralVariants('spire').map(v=>v.twistRad));
  for(const index of [-1,8,.5,NaN])assert.throws(()=>forestStructuralVariant('branching',index));
  assert.throws(()=>forestStructuralVariants('palm'));
  assert.throws(()=>forestVariantEnvelope([{...forestStructuralVariant('spire',0),thinning:1}]));
  assert.deepEqual([...forestVariantUniformData([]).subarray(0,8)],[1,1,0,0,0,0,1,0],'empty pool is authored identity');
});

test('canonical identity chooses the variant; recipe version, species and cell are the only inputs',()=>{
  const recipe={speciesId:'oak',family:'branching',sourceFingerprint:'fixture'};
  const first=treeInstanceAppearance(recipe,'cell-a'),again=treeInstanceAppearance(recipe,'cell-a');
  assert.equal(first.variant,again.variant);
  const seen=new Set();for(let i=0;i<256;i++)seen.add(treeInstanceAppearance(recipe,`cell-${i}`).variant);
  assert.deepEqual([...seen].sort((a,b)=>a-b),[0,1,2,3,4,5,6,7],'every bounded member is reachable');
});

test('roots, heights and tree yaw are invariant; only horizontal crown structure moves',()=>{
  for(const kind of ['branching','spire'])for(const v of forestStructuralVariants(kind))for(const heightM of [10,16,22]){
    assert.deepEqual(forestVariantPoint(v,[0,0,0],heightM),[0,0,0],'root stays at canonical ground contact');
    for(const point of [[1,3,-2],[-.4,heightM*.5,.8],[2,heightM,1]])assert.equal(forestVariantPoint(v,point,heightM)[1],point[1],'no vertical change');
    // Root flare (below the crown ramp) is not scaled; twist keeps radius; lean grows as t².
    const t=FOREST_VARIANT_CROWN_RAMP[0],low=forestVariantPoint(v,[.3,heightM*t,0],heightM);
    assert.ok(Math.abs(Math.hypot(low[0],low[2])-.3)<=Math.hypot(...v.lean)*heightM*t*t+1e-12);
    assert.deepEqual(forestVariantPoint(null,[1,2,3],heightM),[1,2,3]);
  }
});

test('variants change real Oak and Pine geometry, and leaf thinning is shared by both LODs',async t=>{
  for(const kind of ['branching','spire']){
    const {lods}=await family(kind),pool=forestStructuralVariants(kind);
    const pivots=[];
    for(const g of lods[0]){
      const q=g.getAttribute('_leaf_pivot'),b=g.getAttribute('_branch_level');
      for(let i=0;i<q.count;i+=4)if(b.getX(i)>3.5)pivots.push([q.getX(i),q.getY(i),q.getZ(i)]);
    }
    const signatures=pool.map(v=>pivots.slice(0,2000).map(q=>forestVariantPoint(v,q,16)));
    for(const [i,a] of signatures.entries()){
      const displacement=Math.max(...a.map((p,j)=>Math.hypot(p[0]-pivots[j][0],p[2]-pivots[j][2])));
      t.diagnostic(`${kind} variant ${i}: max pivot displacement ${displacement.toFixed(3)} m at 16 m`);
      assert.ok(displacement>.4,`${kind} variant ${i} is more than a tint (${displacement.toFixed(3)} m)`);
      for(const b of signatures.slice(i+1))assert.ok(Math.max(...a.map((p,j)=>Math.hypot(p[0]-b[j][0],p[2]-b[j][2])))>.1,'pool members are distinct');
    }
    // Thinning is a per-clump probability; whole clumps go, never single cards.
    for(const v of pool){
      const cells=new Map();
      for(const q of pivots){
        const key=q.map(x=>Math.floor(x/v.clumpRefM)).join();
        const removed=forestVariantRemovesLeaf(v,q);
        assert.equal(cells.get(key)??removed,removed,'one decision per clump cell');cells.set(key,removed);
      }
      const fraction=[...cells.values()].filter(Boolean).length/cells.size;
      assert.ok(cells.size>60&&Math.abs(fraction-v.thinning)<3*Math.sqrt(.25/cells.size)+.02,`${kind} ${v.index} removes ${fraction} of ${cells.size} clumps for ${v.thinning}`);
    }
    // LOD1 pivots are a subset of the same skeleton, so a pivot's decision cannot depend on LOD.
    const q1=lods[1][1].getAttribute('_leaf_pivot'),q=[q1.getX(0),q1.getY(0),q1.getZ(0)];
    for(const v of pool)assert.equal(forestVariantRemovesLeaf(v,q),forestVariantRemovesLeaf(v,[...q]));
    assert.equal(forestVariantRemovesLeaf(null,q),false);
  }
  // CPU hash matches the unsigned GLSL expression text and stays in uint32.
  assert.match(forestVariantGLSL,/q\.x\*73856093u\)\^\(q\.y\*19349663u\)\^\(q\.z\*83492791u\)\^\(seed\*2654435761u/);
  assert.match(forestVariantGLSL,/h\*=2246822519u;h\^=h>>13u;h\*=3266489917u/);
  const h=forestVariantClumpHash([1025,1030,1019],4);assert.ok(Number.isInteger(h)&&h>=0&&h<2**32);
  assert.notEqual(h,forestVariantClumpHash([1025,1030,1019],5));
});

test('area-preserving LOD card scale follows the real mesh leaf-area ratio',async()=>{
  const oak=await family('branching'),pine=await family('spire');
  const oakScale=treeLodCardScale(oak.metadata[0].profile,oak.metadata[1].profile),pineScale=treeLodCardScale(pine.metadata[0].profile,pine.metadata[1].profile);
  assert.ok(Math.abs(oakScale-2)<.05,`oak ${oakScale}`);assert.ok(Math.abs(pineScale-2*Math.SQRT2)<.08,`pine ${pineScale}`);
  const area=m=>m.profile.bands.reduce((n,b)=>n+b.leafAreaM2,0);
  assert.ok(Math.abs(area(oak.metadata[1])*oakScale**2/area(oak.metadata[0])-1)<1e-9,'LOD1 total card area matches LOD0');
  const broken={...oak.metadata[0].profile,bands:oak.metadata[0].profile.bands.map(b=>({...b,leafAreaM2:0}))};
  assert.equal(treeLodCardScale(broken,oak.metadata[1].profile),1,'missing area falls back to authored cards');
  for(const m of [...oak.metadata,...pine.metadata]){
    assert.ok(m.profile.trunk&&m.profile.trunk.heightM>10&&m.profile.trunk.baseRadiusM>.1&&m.profile.trunk.baseRadiusM<1);
    assert.ok(m.profile.cardExtentM>0&&m.profile.cardExtentM<=m.profile.maxLeafOffsetM);
  }
});

test('conservative sphere contains every actual LOD vertex for every variant, height, wind extreme and card scale',async t=>{
  for(const kind of ['branching','spire']){
    const {lods,metadata}=await family(kind),pool=forestStructuralVariants(kind);
    const lodScale=treeLodCardScale(metadata[0].profile,metadata[1].profile),cardMax=lodScale*FOREST_CARD_COMPENSATION.maxScale;
    const radiusM=forestVariantRadiusBound(pool,Math.max(...metadata.map(m=>m.cullingBounds.radiusM)),Math.max(...metadata.map(m=>m.profile.maxLeafOffsetM)),cardMax);
    let worst=0;
    for(const [lod,geometries] of lods.entries())for(const g of geometries){
      const p=g.getAttribute('position'),q=g.getAttribute('_leaf_pivot'),b=g.getAttribute('_branch_level'),w=g.getAttribute('_wind');
      for(let i=0;i<p.count;i+=lod?1:3){
        const position=[p.getX(i),p.getY(i),p.getZ(i)],pivot=[q.getX(i),q.getY(i),q.getZ(i)],leaf=b.getX(i)>3.5;
        for(const v of [null,...pool])for(const heightM of [10,22])for(const windAngle of [-.12,.12]){
          const point=deformVertex(v,position,pivot,leaf,w.getX(i),heightM,windAngle,leaf?(lod?lodScale:1)*FOREST_CARD_COMPENSATION.maxScale:1);
          worst=Math.max(worst,Math.hypot(...point));
        }
      }
    }
    t.diagnostic(`${kind}: authored ${Math.max(...metadata.map(m=>m.cullingBounds.radiusM)).toFixed(2)} m, worst deformed vertex ${worst.toFixed(2)} m, bound ${radiusM.toFixed(2)} m`);
    assert.ok(worst<=radiusM,`${kind}: ${worst} m escapes ${radiusM} m`);
    assert.ok(radiusM<worst*1.6,`${kind}: bound ${radiusM} m stays useful for culling (${worst} m)`);
  }
});
