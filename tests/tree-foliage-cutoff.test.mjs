import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {calibrateTreeFoliageLodCutoffs,installTreeFoliageLodCutoff,sampleTreeFoliageTrilinearAlpha,treeFoliageLodCutoff,treeFoliageLodCutoffGLSL,
  TREE_FOLIAGE_LOD_CUTOFF_VERSION,TREE_FOLIAGE_LOD_CUTOFF_STEP} from '#tree-kit/v1/assets';
import {FOREST_FAR_ATLAS_VERSION} from '#tree-kit/v1/impostors';
import {loadRasterTree,rasterTree} from './helpers/tree-raster.mjs';
import {loadFoliageMipChain,mipRasterArea} from './helpers/tree-mip-raster.mjs';

// Silhouette-matched lod1CardScale (tree-families-2026-09-28) and a typical
// allometry card factor; wide-view focal length 1440x1000 @ 48 deg (px/rad).
const LOD1_CARD_SCALE={branching:1.3315,spire:2.0357},ALLOMETRY_CARD=.6,FOCAL_PX=1000/2/Math.tan(24*Math.PI/180);
const families={};
async function family(kind){
  if(families[kind])return families[kind];
  const tree=await loadRasterTree(kind,1),{manifest,levels}=await loadFoliageMipChain(kind,tree.atlas);
  const table=calibrateTreeFoliageLodCutoffs(levels,manifest.policy.baseCoverage,manifest.alphaCutoff);
  return families[kind]={tree,levels,manifest,table};
}

test('calibration is deterministic, pins lambda 0 to the authored cutoff and restores base coverage at every level',async()=>{
  for(const kind of ['branching','spire']){
    const {levels,manifest,table}=await family(kind);
    assert.equal(table.version,TREE_FOLIAGE_LOD_CUTOFF_VERSION);
    assert.equal(table.maxLevel,manifest.maxLevel);
    assert.equal(table.cutoffs.length,manifest.maxLevel/TREE_FOLIAGE_LOD_CUTOFF_STEP+1);
    assert.equal(table.cutoffs[0],manifest.alphaCutoff,'full-resolution close-ups keep the GLB MASK cutoff');
    assert.deepEqual(calibrateTreeFoliageLodCutoffs(levels,manifest.policy.baseCoverage,manifest.alphaCutoff),table,'pure function of the packaged bytes');
    for(let i=1;i<table.cutoffs.length;i++){
      assert.ok(table.cutoffs[i]>0&&table.cutoffs[i]<.6,`${kind} cutoff ${i} = ${table.cutoffs[i]}`);
      assert.ok(Math.abs(table.calibratedCoverage[i]-table.baseCoverage)<.01,`${kind} lambda ${i*table.step}: ${table.calibratedCoverage[i]} vs ${table.baseCoverage}`);
    }
    // The defect this fixes: with the fixed cutoff, trilinear filtering drops texel coverage mid-chain.
    const worst=Math.min(...table.authoredCoverage.slice(1))/table.baseCoverage;
    assert.ok(worst<.9,`${kind}: fixed cutoff keeps ${worst.toFixed(2)} of base coverage at its worst level`);
  }
});

test('emulated LOD1 crowns keep their true silhouette area from 150 m to past the far-atlas hand-off',async()=>{
  const frame={centerM:[0,8.5,0],halfSizeM:11},elevation=5*Math.PI/180,direction=[Math.cos(elevation)*.8,Math.sin(elevation),Math.cos(elevation)*.6];
  const results={};
  for(const kind of ['branching','spire']){
    const {tree,levels,table}=await family(kind),cardScale=LOD1_CARD_SCALE[kind]*ALLOMETRY_CARD;
    const reference=rasterTree(tree,{direction,frame,size:440,ss:2,cardScale});
    const trueArea=reference.coverage.reduce((a,b)=>a+b,0)*(2*frame.halfSizeM/440)**2;
    for(const distanceM of [150,300,450,600]){
      const pixelM=distanceM/FOCAL_PX;
      const fixed=mipRasterArea(tree,levels,{cardScale,direction,frame,pixelM,cutoff:()=>table.authoredCutoff})/trueArea;
      const calibrated=mipRasterArea(tree,levels,{cardScale,direction,frame,pixelM,cutoff:l=>treeFoliageLodCutoff(table,l)})/trueArea;
      results[`${kind}@${distanceM}`]={fixed:+fixed.toFixed(3),calibrated:+calibrated.toFixed(3)};
      assert.ok(calibrated>=.9&&calibrated<=1.12,`${kind} at ${distanceM} m retains ${calibrated.toFixed(3)} of its silhouette`);
    }
  }
  // Before: the Pine lost more than half its silhouette in the mid band.
  assert.ok(results['spire@300'].fixed<.5,JSON.stringify(results));
});

test('the GLSL lookup mirrors the JS table interpolation and clamps like the sampler',()=>{
  const table={cutoffs:[.5,.4,.3,.35,.45],step:.5,maxLevel:2};
  assert.equal(treeFoliageLodCutoff(table,-3),.5);
  assert.equal(treeFoliageLodCutoff(table,0),.5);
  assert.ok(Math.abs(treeFoliageLodCutoff(table,.25)-.45)<1e-12);
  assert.ok(Math.abs(treeFoliageLodCutoff(table,1.75)-.4)<1e-12);
  assert.equal(treeFoliageLodCutoff(table,9),.45);
  const glsl=treeFoliageLodCutoffGLSL(5,2,.5);
  assert.match(glsl,/uniform float atlasFoliageCutoffs\[5\];/);
  assert.match(glsl,/clamp\(log2\(max\(rho,1e-8\)\),0\.0,2\.0\)\/0\.5000/);
  assert.match(glsl,/int j=min\(i\+1,4\);/);
  assert.match(glsl,/textureSize\(map,0\)/);
  // Trilinear sampler: level blend and clamp to the last level.
  const lv=(w,a)=>({width:w,height:w,data:new Uint8ClampedArray(w*w*4).fill(a)});
  const chain=[lv(4,255),lv(2,0),lv(1,0)];
  assert.equal(sampleTreeFoliageTrilinearAlpha(chain,.3,.7,0),1);
  assert.ok(Math.abs(sampleTreeFoliageTrilinearAlpha(chain,.3,.7,.25)-.75)<1e-12);
  assert.equal(sampleTreeFoliageTrilinearAlpha(chain,.3,.7,7),0);
});

test('calibration rejects incomplete chains and invalid coverage',()=>{
  const lv=(w)=>({width:w,height:w,data:new Uint8ClampedArray(w*w*4)});
  assert.throws(()=>calibrateTreeFoliageLodCutoffs([lv(4)],.3,.5),/mip/);
  assert.throws(()=>calibrateTreeFoliageLodCutoffs([lv(4),lv(4)],.3,.5),/power-of-two/);
  assert.throws(()=>calibrateTreeFoliageLodCutoffs([lv(4),lv(2),lv(1)],0,.5),/coverage/);
  assert.throws(()=>calibrateTreeFoliageLodCutoffs([lv(4),lv(2),lv(1)],.3,1),/cutoff/);
});

test('the hook replaces three alpha test once in colour, depth and distance shaders and keys the program',()=>{
  const table={version:TREE_FOLIAGE_LOD_CUTOFF_VERSION,step:.5,maxLevel:2,authoredCutoff:.5,baseCoverage:.3,grid:16,cutoffs:[.5,.4,.3,.35,.45],authoredCoverage:[],calibratedCoverage:[]};
  const map=new THREE.Texture();
  const cases=[[new THREE.MeshStandardMaterial({map,alphaTest:.5}),THREE.ShaderLib.physical],
    [new THREE.MeshDepthMaterial({map,alphaTest:.5}),THREE.ShaderLib.depth],[new THREE.MeshDistanceMaterial({map,alphaTest:.5}),THREE.ShaderLib.distanceRGBA]];
  for(const [material,lib] of cases){
    material.customProgramCacheKey=()=>'fixture-base';const before='fixture-base';
    const uniform=installTreeFoliageLodCutoff(material,table);
    const shader={uniforms:{},vertexShader:lib.vertexShader,fragmentShader:lib.fragmentShader};
    material.onBeforeCompile(shader,{});
    assert.equal(shader.fragmentShader.includes('#include <alphatest_fragment>'),false);
    assert.equal(shader.fragmentShader.split('atlasFoliageLodCutoff(vMapUv)').length,2);
    assert.ok(shader.fragmentShader.indexOf('uniform float atlasFoliageCutoffs[5]')<shader.fragmentShader.search(/void\s+main/));
    assert.equal(shader.uniforms.atlasFoliageCutoffs,uniform);
    assert.deepEqual(uniform.value,table.cutoffs);
    assert.equal(material.customProgramCacheKey(),`${before}/${TREE_FOLIAGE_LOD_CUTOFF_VERSION}/5`);
  }
  assert.throws(()=>installTreeFoliageLodCutoff(new THREE.MeshStandardMaterial({alphaTest:.5}),table),/mapped/);
  assert.throws(()=>installTreeFoliageLodCutoff(new THREE.MeshStandardMaterial({map,alphaTest:0,alphaHash:true}),table),/mapped/);
  assert.throws(()=>installTreeFoliageLodCutoff(new THREE.MeshStandardMaterial({map,alphaTest:.5}),{...table,cutoffs:[.5]}),/table/);
  // Captures made with the old fixed cutoff must not be reused.
  assert.equal(FOREST_FAR_ATLAS_VERSION,'forest-far-atlas-2');
});
