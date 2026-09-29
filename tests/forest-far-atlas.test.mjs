import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  ForestFarAtlas,FOREST_FAR_ATLAS_LAYOUT as L,FOREST_FAR_ATLAS_LEVELS,FOREST_FAR_ATLAS_VIEWS,FOREST_FAR_ATLAS_VERSION,
  forestFarAtlasBytes,forestFarAtlasScratchBytes,forestFarAtlasSphere,forestFarAtlasTileOffset,forestFarAtlasLeafCoverage,
  installForestFarAtlasCapture,forestFarAtlasGLSL,forestFarAtlasCommonGLSL,
} from '../src/forest-far-atlas.ts';
import {decodeHemiTreeView,encodeHemiTreeView,hemiTreeViewBlend,hemiTreeViewGLSL,treeCaptureBasis,treeHemiCaptureViews} from '../src/tree-impostor-views.ts';
import {forestStructuralVariants,FOREST_VARIANT_COUNT} from '../src/tree-structural-variant.ts';
import {ForestImpostors} from '../src/forest-impostor.ts';
import {ForestTreeFamilyLibrary} from '../src/forest-tree-family-library.ts';
import {calibrateTreeLodCardScale} from '../src/tree-lod-coverage.ts';
import {treeAllometryAtlasStretch,treeAllometryCardScale,treeAllometryLeafDepthScale,TREE_ALLOMETRY_VERSION} from '../src/tree-allometry.ts';
import {familyReference} from './helpers/tree-allometry-profiles.mjs';
import {loadRasterTree,deformedPositions} from './helpers/tree-raster.mjs';
import {captureSphere,captureTile,reconstruct,direct,compare,neededViews,rasterGeometry} from './helpers/far-atlas-emulation.mjs';

const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const normalize=v=>{const n=Math.hypot(...v);return v.map(x=>x/n);};
function hemisphere(count){
  const golden=Math.PI*(3-Math.sqrt(5));
  return Array.from({length:count},(_,i)=>{const y=1-(i+.5)/count,r=Math.sqrt(1-y*y),a=golden*i;return [r*Math.cos(a),y,r*Math.sin(a)];});
}
// Directions exactly on the octahedron folds (x=0, z=0), grid vertices and the horizon.
const folds=[[0,1,0],[0,.4,1],[0,.7,-1],[1,.3,0],[-1,.9,0],[1,0,1],[.3,.5,.3],[-.2,.6,-.2],[.25,.5,-.25],[1,0,0],[0,0,-1]].map(normalize);

// Line-for-line CPU transliteration of hemiTreeViewGLSL; the source checks
// below pin the GLSL text this mirrors.
const glsl={
  encode(d){d=normalize(d);const y=Math.max(d[1],0),s=Math.max(1e-6,Math.abs(d[0])+y+Math.abs(d[2])),x=d[0]/s,z=d[2]/s;
    return [(x+z)*.5+.5,(x-z)*.5+.5].map(v=>Math.min(1,Math.max(0,v)));},
  decode([u,v]){const e=[u*2-1,v*2-1],t=[(e[0]+e[1])*.5,(e[0]-e[1])*.5];return normalize([t[0],Math.max(0,1-Math.abs(t[0])-Math.abs(t[1])),t[1]]);},
  blend(direction,grid){
    const n=grid-1,g=glsl.encode(direction).map(x=>x*n),cell=g.map(x=>Math.min(Math.floor(x),n-1)),f=[g[0]-cell[0],g[1]-cell[1]],i=cell[1]*grid+cell[0];
    if((cell[0]<n*.5)===(cell[1]<n*.5))return f[0]>=f[1]?{views:[i,i+1,i+grid+1],weights:[1-f[0],f[0]-f[1],f[1]]}:{views:[i,i+grid+1,i+grid],weights:[1-f[1],f[0],f[1]-f[0]]};
    return f[0]+f[1]<=1?{views:[i,i+1,i+grid],weights:[1-f[0]-f[1],f[0],f[1]]}:{views:[i+grid+1,i+grid,i+1],weights:[f[0]+f[1]-1,1-f[0],1-f[1]]};
  },
  basis(view,grid){
    const y=Math.floor((view+.5)/grid),x=view-y*grid,toward=glsl.decode([x/(grid-1),y/(grid-1)]);
    const reference=Math.abs(toward[1])>.999?[0,0,1]:[0,1,0],cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
    const right=normalize(cross(reference,toward));return {toward,right,up:normalize(cross(toward,right))};
  },
};

test('hemi-octahedral blend follows the face folds and reconstructs every upper-hemisphere direction',()=>{
  for(const grid of [3,9,17])for(const direction of [...hemisphere(600),...folds]){
    const {views,weights}=hemiTreeViewBlend(direction,grid);
    assert.equal(new Set(views).size,3);
    assert.ok(weights.every(w=>w>=-1e-12&&w<=1+1e-12));
    assert.ok(Math.abs(weights.reduce((a,b)=>a+b,0)-1)<1e-12);
    // Barycentrics interpolate L1-normalized octahedron points, so the three
    // captured directions reconstruct the query exactly on every face.
    const ray=[0,0,0];
    views.forEach((view,k)=>{const x=view%grid,y=Math.floor(view/grid),d=decodeHemiTreeView(x/(grid-1),y/(grid-1)),l1=Math.abs(d[0])+d[1]+Math.abs(d[2]);
      for(let a=0;a<3;a++)ray[a]+=weights[k]*d[a]/l1;});
    assert.ok(dot(normalize(ray),direction)>1-1e-12,`grid ${grid} direction ${direction}`);
    const [u,v]=encodeHemiTreeView(direction);assert.ok(dot(decodeHemiTreeView(u,v),direction)>1-1e-12);
  }
  // Views from below the root plane clamp onto the horizon.
  assert.deepEqual(hemiTreeViewBlend([.6,-.3,.2],9),hemiTreeViewBlend([.6,0,.2],9));
  for(const grid of [2,4,8,35,9.5])assert.throws(()=>hemiTreeViewBlend([0,1,0],grid));
});

test('far-shader view selection and bases match the CPU capture contract',()=>{
  for(const line of ['if((cell.x<n*0.5)==(cell.y<n*0.5)){','weights=vec3(1.0-f.x,f.x-f.y,f.y)','weights=vec3(1.0-f.y,f.x,f.y-f.x)',
    'weights=vec3(1.0-f.x-f.y,f.x,f.y)','weights=vec3(f.x+f.y-1.0,1.0-f.x,1.0-f.y)','d=normalize(d);d.y=max(d.y,0.0);d/=max(1e-6,abs(d.x)+d.y+abs(d.z));',
    'return clamp(vec2(d.x+d.z,d.x-d.z)*0.5+0.5,0.0,1.0);','e=e*2.0-1.0;vec2 t=vec2(e.x+e.y,e.x-e.y)*0.5;',
    'float y=floor((view+0.5)/grid),x=view-y*grid;','vec3 reference=abs(toward.y)>0.999?vec3(0,0,1):vec3(0,1,0);'])
    assert.ok(hemiTreeViewGLSL.includes(line),`GLSL no longer contains: ${line}`);
  for(const direction of [...hemisphere(400),...folds]){
    const cpu=hemiTreeViewBlend(direction,L.grid),gpu=glsl.blend(direction,L.grid);
    assert.deepEqual(gpu.views,[...cpu.views]);gpu.weights.forEach((w,k)=>assert.ok(Math.abs(w-cpu.weights[k])<1e-12));
  }
  for(const view of treeHemiCaptureViews(L.grid)){
    const gpu=glsl.basis(view.index,L.grid);
    for(const [a,b] of [[gpu.toward,view.towardCamera],[gpu.right,view.right],[gpu.up,view.up]])assert.ok(dot(a,b)>1-1e-12,`view ${view.index}`);
  }
});

test('atlas layout holds every structural member in bounded memory',()=>{
  assert.equal(L.columns*L.rows,FOREST_VARIANT_COUNT);assert.equal(FOREST_FAR_ATLAS_VIEWS,81);
  assert.equal(FOREST_FAR_ATLAS_LEVELS,9,'256x128 layers keep a complete chain to 1x1');
  const tiles=Array.from({length:FOREST_VARIANT_COUNT},(_,k)=>forestFarAtlasTileOffset(k));
  assert.equal(new Set(tiles.map(t=>t.join())).size,FOREST_VARIANT_COUNT);
  // Each unit-radius member fits its 2x2 tile inside the (+-columns, +-rows) capture frustum.
  for(const [x,y] of tiles)assert.ok(Math.abs(x)+1<=L.columns+1e-12&&Math.abs(y)+1<=L.rows+1e-12);
  for(const bad of [-1,8,1.5])assert.throws(()=>forestFarAtlasTileOffset(bad));
  assert.ok(forestFarAtlasBytes()<=30e6,`resident atlas per family ${forestFarAtlasBytes()}`);
  assert.ok(forestFarAtlasScratchBytes()<=16e6,`temporary scratch ${forestFarAtlasScratchBytes()}`);
  assert.ok(L.maxMip<=Math.log2(L.tile),'the shader never samples below one texel per tile');
});

test('capture depth keeps the verified Three view-space sign: front of the sphere stores 1',()=>{
  // Installed Three: vViewPosition is the negated view position, so its z is +distance.
  assert.match(THREE.ShaderLib.physical.vertexShader,/vViewPosition = - mvPosition\.xyz;/);
  const source=installForestFarAtlasCapture(THREE.ShaderLib.physical.fragmentShader,true);
  assert.ok(source.includes('clamp((atlasCaptureFrame.x-vViewPosition.z)/atlasCaptureFrame.y*0.5+0.5,0.0,1.0)'));
  assert.ok(source.startsWith('uniform int atlasCapturePass;'));
  for(const chunk of ['opaque','tonemapping','colorspace','fog','premultiplied_alpha','dithering'])assert.ok(!source.includes(`#include <${chunk}_fragment>`),chunk);
  assert.ok(installForestFarAtlasCapture(THREE.ShaderLib.physical.fragmentShader,false).includes('0.0);\n    }'),'bark writes leaf flag 0');
  assert.throws(()=>installForestFarAtlasCapture('void main(){}',true),/terminal hook/);
  // Round trip: capture camera at toward*(r+1); the far shader decodes d*2-1 along toward.
  assert.ok(forestFarAtlasGLSL.includes('t=(plane+(d.z/c.a*2.0-1.0)*sphere.w)/denominator;'));
  const r=8.7,frame=[r+1,r];
  for(const offset of [-r,-2.5,0,3.1,r]){
    const viewZ=frame[0]-offset,encoded=Math.min(1,Math.max(0,(frame[0]-viewZ)/frame[1]*.5+.5));
    assert.ok(Math.abs((encoded*2-1)*r-offset)<1e-9,`offset ${offset}`);
  }
  assert.equal((frame[0]-1)/frame[1]*.5+.5,1,'front-most point (distance 1) stores 1');
  assert.equal((frame[0]-(2*r+1))/frame[1]*.5+.5,0,'back-most point stores 0');
});

test('capture sphere encloses every member of the packaged Oak and Pine LOD1 at its card scale',async()=>{
  for(const kind of ['branching','spire']){
    const lod1=await loadRasterTree(kind,1),variants=forestStructuralVariants(kind),cardScale=kind==='branching'?1.33:2.03;
    const sphere=forestFarAtlasSphere([rasterGeometry(lod1.bark),rasterGeometry(lod1.foliage)],variants,cardScale);
    assert.equal(sphere.centerM[0],0);assert.equal(sphere.centerM[2],0,'yaw about the root keeps the capture centre fixed');
    let reach=0;
    for(const variant of variants)for(const part of [lod1.bark,lod1.foliage]){
      const p=deformedPositions(part,variant,16,cardScale);
      for(let i=0;i<p.length;i+=3)reach=Math.max(reach,Math.hypot(p[i],p[i+1]-sphere.centerM[1],p[i+2]));
    }
    assert.ok(reach<=sphere.radiusM&&sphere.radiusM-reach<=.06,`${kind} reach ${reach} radius ${sphere.radiusM}`);
  }
  assert.throws(()=>forestFarAtlasSphere([],[],.5));
});

test('CPU emulation: atlas reconstruction reproduces the packaged LOD1 member silhouettes at held-out views',async()=>{
  // Engineering regression only; browser captures decide visual acceptance.
  const directions=[[.8,.25,.55],[-.62,.4,-.68]].map(normalize),size=24;
  for(const kind of ['branching','spire']){
    const lod0=await loadRasterTree(kind,0),lod1=await loadRasterTree(kind,1);
    const alpha={width:lod0.atlas.width,height:lod0.atlas.height,rgba:lod0.atlas.data,cutoffByte:128};
    const cardScale=calibrateTreeLodCardScale(lod0,lod1,alpha,kind==='branching'?2:2.83).cardScale;
    const variants=forestStructuralVariants(kind),sphere=captureSphere(lod1,variants,cardScale),{reference}=await familyReference(kind);
    for(const direction of directions){
      assert.ok(!treeHemiCaptureViews(L.grid).some(v=>dot(v.towardCamera,direction)>1-1e-6),'held-out view');
      const own=[],wrong=[];
      for(const member of [1,5]){
        const tiles=new Map(neededViews(direction).map(index=>[index,captureTile(lod1,{variant:variants[member],cardScale,sphere,index})]));
        const atlas=reconstruct(tiles,{direction,sphere,size});
        const truth=direct(lod1,{variant:variants[member],cardScale,sphere,direction,size});
        const native=compare(atlas.coverage,truth.coverage);
        assert.ok(native.areaRatio>.88&&native.areaRatio<1.08,`${kind} member ${member} area ${native.areaRatio}`);
        own.push(native.l1);wrong.push(compare(atlas.coverage,direct(lod1,{variant:variants[(member+4)%8],cardScale,sphere,direction,size}).coverage).l1);
        // Density-preserving cards: a short crown is the reference scaled
        // uniformly, so the atlas needs no correction (leaf depth scale 1).
        {
          const heightM=10,c=treeAllometryCardScale(reference,heightM,1,1);
          assert.ok(Math.abs(treeAllometryLeafDepthScale(reference,heightM,1,1)-1)<1e-12);
          const truthH=direct(lod1,{variant:variants[member],cardScale:cardScale*c,sphere,direction,heightM,size});
          const raw=compare(atlas.coverage,truthH.coverage).areaRatio;
          assert.ok(raw>.88&&raw<1.08,`${kind} ${heightM} m area ${raw}`);
        }
        // Above 16 m the card scale clamps at 1: cards are sparser than the
        // reference and the leaf optical-depth rule restores the crown. The
        // emulation reconstructs without the horizontal stretch, so its depth
        // scale is c^2/s^2 (the shader's per-drawn-area value times the stretch).
        {
          const heightM=22,c=treeAllometryCardScale(reference,heightM,1,1),stretch=treeAllometryAtlasStretch(reference,heightM,1,1);
          assert.equal(c,1);assert.ok(stretch<1);
          const truthH=direct(lod1,{variant:variants[member],cardScale:cardScale*c,sphere,direction,heightM,size});
          const raw=compare(atlas.coverage,truthH.coverage).areaRatio;
          const depth=treeAllometryLeafDepthScale(reference,heightM,1,1)*stretch;
          const corrected=compare(atlas.coverage.map((a,i)=>a>0?forestFarAtlasLeafCoverage(a,atlas.leaf[i]/a,depth):0),truthH.coverage).areaRatio;
          assert.ok(Math.abs(Math.log(corrected))<Math.abs(Math.log(raw))*.6,`${kind} ${heightM} m raw ${raw} corrected ${corrected}`);
          assert.ok(corrected>.7&&corrected<1.15,`${kind} ${heightM} m corrected ${corrected}`);
        }
      }
      assert.ok(own.reduce((a,b)=>a+b)<wrong.reduce((a,b)=>a+b),`${kind} the member's own atlas beats another member (${own} vs ${wrong})`);
    }
  }
});

test('leaf coverage twin is identity at depth scale 1 and only rescales leaf optical depth',()=>{
  assert.ok(forestFarAtlasGLSL.includes('float k=mix(1.0,leafDepthScale,clamp(leafFraction,0.0,1.0));'));
  for(const a of [0,.2,.5,.9,1]){
    assert.ok(Math.abs(forestFarAtlasLeafCoverage(a,1,1)-a)<1e-12);
    assert.ok(Math.abs(forestFarAtlasLeafCoverage(a,0,2.5)-a)<1e-12,'bark scales with the skeleton');
  }
  assert.ok(forestFarAtlasLeafCoverage(.5,1,2.56)>.5&&forestFarAtlasLeafCoverage(.5,1,.53)<.5);
  assert.equal(forestFarAtlasLeafCoverage(1,1,.53),1,'opaque texels stay opaque');
  assert.throws(()=>forestFarAtlasLeafCoverage(.5,1,0));
});

function fakeSource(){
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,0,16,0,2,9,1,-1,11,-2],3));
  geometry.setAttribute('_leaf_pivot',new THREE.Float32BufferAttribute([0,0,0,0,16,0,1.8,9,.8,-.8,11,-1.8],3));
  geometry.setAttribute('_branch_level',new THREE.Float32BufferAttribute([0,0,4,4],1));
  const log={members:[],disposed:0,created:0};
  return {log,source:{kind:'branching',geometries:[geometry],variants:forestStructuralVariants('branching'),cardScale:1.3,
    createCaptureBatch(lod,count){
      log.created++;assert.equal(lod,1,'the far atlas captures the reduced LOD');assert.equal(count,FOREST_VARIANT_COUNT);
      return {group:new THREE.Group(),pass:{value:0},frame:{value:new THREE.Vector2()},count,
        setMember(index,matrix,member){log.members.push({index,member,translation:new THREE.Vector3().setFromMatrixPosition(matrix)});},
        dispose(){log.disposed++;}};
    }}};
}
function fakeRenderer({failOn=-1}={}){
  const log={targets:[],renders:0,clears:0};let target=null,face=0,level=0,clear=new THREE.Color(.2,.3,.4),alpha=1;
  return {log,xr:{enabled:true},shadowMap:{autoUpdate:true},autoClear:true,
    getRenderTarget:()=>target,getActiveCubeFace:()=>face,getActiveMipmapLevel:()=>level,
    getClearColor:c=>c.copy(clear),getClearAlpha:()=>alpha,setClearColor(c,a){clear=new THREE.Color(c);alpha=a;},
    setRenderTarget(t,f=0,l=0){target=t;face=f;level=l;log.targets.push({t,f,l});},clear(){log.clears++;},
    render(scene,camera){if(log.renders++===failOn)throw new Error('lost context');log.lastCamera=camera.clone();},
    get state(){return {target,face,level,clear:clear.getHex(),alpha};}};
}

test('incremental bake renders bounded views per step, restores renderer state and releases temporary targets',()=>{
  const {log,source}=fakeSource(),atlas=new ForestFarAtlas(source),renderer=fakeRenderer();
  const released=[];for(const target of [atlas.colour,atlas.data])target.addEventListener('dispose',()=>released.push('atlas'));
  const r=atlas.sphereM.radiusM,before=renderer.state;
  assert.equal(atlas.state,'baking');assert.equal(log.created,1);
  assert.deepEqual(atlas.sphere.toArray(),[0,atlas.sphereM.centerM[1]/16,0,r/16]);
  assert.equal(atlas.step(renderer,3),false);
  assert.equal(atlas.nextView,3);
  // Two capture passes per view plus one copy per level for each array target.
  assert.equal(renderer.log.renders,3*(2+2*FOREST_FAR_ATLAS_LEVELS));
  const writes=renderer.log.targets.filter(x=>x.t===atlas.colour);
  assert.deepEqual(writes.map(x=>`${x.f}/${x.l}`),[0,1,2].flatMap(view=>Array.from({length:FOREST_FAR_ATLAS_LEVELS},(_,l)=>`${view}/${l}`)));
  assert.deepEqual(renderer.state,before,'target, clear colour and alpha are restored');
  assert.equal(renderer.autoClear,true);assert.equal(renderer.xr.enabled,true);assert.equal(renderer.shadowMap.autoUpdate,true);
  // Every member occupies its own tile in the capture plane of the last view.
  const view=treeHemiCaptureViews(L.grid)[2],last=log.members.slice(-FOREST_VARIANT_COUNT);
  assert.deepEqual(last.map(x=>x.member),[1,2,3,4,5,6,7,8],'members are pool codes 1..8, never authored structure');
  for(const {index,translation} of last){
    const centre=translation.clone().add(new THREE.Vector3(...atlas.sphereM.centerM)),[x,y]=forestFarAtlasTileOffset(index);
    assert.ok(centre.distanceTo(new THREE.Vector3(...view.right).multiplyScalar(x*r).addScaledVector(new THREE.Vector3(...view.up),y*r))<1e-9);
  }
  const camera=renderer.log.lastCamera;
  for(let steps=1;atlas.state==='baking';steps++){assert.ok(steps<=27);atlas.step(renderer,3);}
  assert.equal(atlas.state,'ready');assert.equal(atlas.nextView,FOREST_FAR_ATLAS_VIEWS);assert.equal(log.disposed,1,'capture batch released once baked');
  assert.equal(atlas.diagnostics().scratchBytes,0);assert.equal(atlas.step(renderer,3),true);
  assert.ok(camera);atlas.dispose();atlas.dispose();assert.deepEqual(released,['atlas','atlas']);assert.equal(atlas.state,'disposed');
});

test('a failed bake is reported, releases its temporary resources and leaves renderer state intact',()=>{
  const {log,source}=fakeSource(),atlas=new ForestFarAtlas(source),renderer=fakeRenderer({failOn:1}),before=renderer.state;
  assert.equal(atlas.step(renderer,3),false);
  assert.equal(atlas.state,'failed');assert.match(atlas.error,/lost context/);assert.equal(log.disposed,1);
  assert.deepEqual(renderer.state,before);assert.equal(renderer.xr.enabled,true);
  assert.equal(atlas.step(renderer,3),false,'a failed bake never resumes');atlas.dispose();
});

test('far impostors adopt a baked atlas per family, draw its union bound and fall back to bands without it',()=>{
  const f=new ForestImpostors(8),presentation={enabled:true,lod1Profile:{referenceHeightM:16,maxLeafOffsetM:.8,
    bands:Array.from({length:4},(_,i)=>({centerM:[0,4+i*3,0],radiusM:2.5,halfHeightM:1.5,populated:true,count:4}))},
    conservativeBounds:{radiusM:14},barkLinearRgb:[.1,.07,.05],foliageLinearRgb:[.03,.08,.02],structuralVariants:forestStructuralVariants('spire')};
  try{
    f.setFamilyPresentation('spire',presentation);
    const before=f.uniforms.treeFamilyExtent.value[1].clone();
    const texture=new THREE.DataArrayTexture(new Uint8Array(4),1,1,1),atlas={colour:{texture},data:{texture},sphere:new THREE.Vector4(0,.53,0,.66)};
    for(const bad of [{...atlas,sphere:new THREE.Vector4(0,0,0,0)},{...atlas,sphere:new THREE.Vector4(NaN,0,0,1)},{...atlas,colour:{}}])assert.throws(()=>f.setFamilyAtlas('spire',bad));
    assert.equal(f.uniforms.treeAtlasReady.value.y,0);
    f.setFamilyAtlas('spire',atlas);
    assert.equal(f.uniforms.treeAtlasReady.value.y,1);assert.equal(f.uniforms.treeAtlasReady.value.x,0,'families adopt independently');
    assert.equal(f.uniforms.treeAtlasColour1.value,texture);assert.equal(f.familyAtlas('spire'),atlas);
    const centre=f.uniforms.treeFamilyCenter.value[1],extent=f.uniforms.treeFamilyExtent.value[1];
    for(let axis=0;axis<3;axis++){
      const s=atlas.sphere.getComponent(axis);
      assert.ok(centre.getComponent(axis)-extent.getComponent(axis)<=s-atlas.sphere.w+1e-9&&centre.getComponent(axis)+extent.getComponent(axis)>=s+atlas.sphere.w-1e-9,'quad bound encloses the capture sphere');
    }
    // Re-presenting the family (e.g. a catalogue change) keeps the atlas bound.
    f.setFamilyPresentations(new Map([['spire',presentation]]));
    assert.ok(f.uniforms.treeFamilyExtent.value[1].y>=atlas.sphere.w-1e-9);
    const index=0;f.write(index,new THREE.Vector3(),20,new THREE.Quaternion(),.4,0);f.parameters.setZ(index,2);
    const c=new THREE.Vector3(),e=new THREE.Vector3();f.proxyBounds(index,c,e);
    assert.ok(e.y>=atlas.sphere.w*20-1e-6,'CPU culling bound matches the GPU quad');
    f.setFamilyAtlas('spire',null);
    assert.equal(f.uniforms.treeAtlasReady.value.y,0);assert.deepEqual(f.uniforms.treeFamilyExtent.value[1].toArray(),before.toArray());
    const shader={uniforms:{},vertexShader:THREE.ShaderLib.lambert.vertexShader,fragmentShader:THREE.ShaderLib.lambert.fragmentShader};
    f.mesh.material.onBeforeCompile(shader,{capabilities:{logarithmicDepthBuffer:false,reversedDepthBuffer:false}});
    // Views are chosen in the allometry-scaled atlas frame (identity for kc=1).
    assert.ok(shader.vertexShader.includes('treeHemiBlend(treeRotate(vec4(-treeQ.xyz,treeQ.w),toEye)/atlasScale,TREE_ATLAS_GRID,treeAtlasViews,treeAtlasWeights);'));
    assert.ok(shader.fragmentShader.includes('if(familyBound>0.0&&treeAtlasWeights!=vec3(0)){'),'atlas path');
    assert.ok(shader.fragmentShader.includes('}else if(familyBound>0.0){'),'band fallback remains for unbaked families');
    // Coverage rescales leaf optical depth by card area over drawn side area.
    assert.ok(shader.fragmentShader.includes('treeCoverage=treeAtlasLeafCoverage(atlasColour.a,leafFraction,treeAllometryLeafDepthScale(treeRootHeight.w,allometry,treeFamilyAllometry[familyIndex]));'));
    // The member is stretched to the detailed crown width, not the crown ratio.
    assert.ok(shader.fragmentShader.includes('vec3 atlasScale=vec3(atlasStretch,1.0,atlasStretch),atlasRo=ro/atlasScale,atlasRd=rd/atlasScale;'));
    assert.ok(forestFarAtlasCommonGLSL.includes(`TREE_ATLAS_GRID=${L.grid}.0`));
    assert.ok(f.mesh.material.customProgramCacheKey().endsWith(`${FOREST_FAR_ATLAS_VERSION}/${TREE_ALLOMETRY_VERSION}`));
  }finally{f.dispose();}
});

test('family attachments (far atlas bakes) are released before the family geometry they captured',async()=>{
  const order=[];let n=0;
  const loader=async()=>{const id=++n;return {forestCoverage:true,maxRadiusM:10,setDate(){},
    createBatch(){return {group:new THREE.Group(),dispose(){order.push(`batch${id}`);}};},dispose(){order.push(`family${id}`);}};};
  const library=new ForestTreeFamilyLibrary(new THREE.Group(),loader,x=>x,[2,2]);
  await library.replace([{kind:'branching',lod0:new ArrayBuffer(0),lod1:new ArrayBuffer(0)}]);
  library.entries.get('branching').attachments.push({dispose(){order.push('atlas1');}});
  await library.replace([{kind:'branching',lod0:new ArrayBuffer(0),lod1:new ArrayBuffer(0)}]);
  assert.deepEqual(order,['atlas1','batch1','batch1','family1']);
  library.entries.get('branching').attachments.push({dispose(){order.push('atlas2');}});
  library.dispose();
  assert.deepEqual(order.slice(4),['atlas2','batch2','batch2','family2']);
});
