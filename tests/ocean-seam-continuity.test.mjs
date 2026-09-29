// Ocean seam regression (docs/ocean-seam-2026-09-29.md).
//
// Each ocean patch phases its Gerstner waves at
//   wavePosM = transformed.xz * R + oceanPhaseOriginM.xz,
// where oceanPhaseOriginM is the patch anchor in metres wrapped modulo
// DETAIL_PERIOD_M (4096 m) to keep float32 precision. The normal-atlas
// ripples repeat exactly at 4096 m, but the Gerstner wavelengths (8-42 m) do
// not, so two neighbouring patches whose anchors fall in different 4096 m
// cells evaluated the same world point at different wave phases: a straight
// seam with a different wave pattern and brightness on each side.
//
// This test settles the production PlanetRenderer over open sea on Maithea
// (inline workers, no GPU) and evaluates each drawn ocean patch's wave field
// from its own material uniforms, exactly as the vertex shader does, at points
// on every shared edge between drawn ocean leaves (same level and 2:1). The
// height and slope on both sides must agree. It also checks that the per-frame
// ocean uniforms (eye, phase) are fresh on moving and still frames.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {rendererModule,maithea,createRenderer,nextTurn} from './terrain-renderer-fixture.mjs';
import {terrainSampler} from '../src/terrain.ts';
import {tileDirection,tileNeighbour,tileKey,unit} from '../src/planet-tiles.ts';
import {DETAIL_PERIOD_M} from '../src/ground-material.ts';

const WATER_M=-4475;

/** The vertex shader's wave sum for one patch at one body-frame unit-radius
 * point, read from that patch's uniforms with float32 uniform values. */
function patchWave(ocean,point){
  const u=ocean.material.uniforms,R=Math.fround(u.oceanRadiusM.value),origin=u.oceanPhaseOriginM.value,anchor=ocean.position;
  const phaseOffsets=u.oceanWavePhase?.value??u.oceanWaveNumber.value.map(()=>0);
  const x=Math.fround(point[0]-anchor.x)*R+Math.fround(origin.x),z=Math.fround(point[2]-anchor.z)*R+Math.fround(origin.z),t=Math.fround(u.oceanTime.value);
  let height=0,sx=0,sz=0;
  u.oceanWaveNumber.value.forEach((k0,i)=>{
    const k=Math.fround(k0),d=u.oceanWaveDir.value[i],a=Math.fround(u.oceanWaveAmplitudeM.value[i]);
    const phase=k*(Math.fround(d.x)*x+Math.fround(d.y)*z)+Math.fround(phaseOffsets[i])+t*Math.fround(u.oceanWaveSpeed.value[i]);
    height+=Math.sin(phase)*a;const c=k*a*Math.cos(phase);sx+=c*d.x;sz+=c*d.y;
  });
  return {height,sx,sz};
}

function findOpenSea(body){
  const sample=terrainSampler(body,undefined,undefined,undefined,WATER_M);
  for(let i=0;i<4096;i++){
    const a=i*2.399963,z=1-2*(i+.5)/4096,r=Math.sqrt(1-z*z),d=[Math.cos(a)*r,z,Math.sin(a)*r];
    const s=sample(d);
    // Deep open ocean with deep ocean all round it, away from cube-face edges.
    if(!s.ocean||s.elevationM>WATER_M-1500)continue;
    const m=Math.max(...d.map(Math.abs));if(m<.8)continue;
    if([[.01,0,0],[0,.01,0],[0,0,.01],[-.01,0,0],[0,-.01,0],[0,0,-.01]].some(o=>!sample(unit(d.map((v,k)=>v+o[k]))).ocean))continue;
    return d;
  }
  throw new Error('no open sea found on Maithea');
}

test('ocean waves are continuous across drawn patch edges and per-patch ocean uniforms stay fresh',async t=>{
  const {module,cleanup}=await rendererModule({prefix:'atlas-ocean-seam-'});
  const body=maithea(),fx=createRenderer(module,body),renderer=fx.renderer,R=body.radiusM;
  const seaDir=findOpenSea(body),seaRadius=1+WATER_M/R;
  // 40 m above the sea: contact-scale leaves at the eye, 2:1 rings outward.
  let eye=seaDir.map(v=>v*(1+(WATER_M+40)/R)),worldNs=435084631200000032044300000n;
  const sun=unit([seaDir[0]+.3,seaDir[1]+.6,seaDir[2]]);
  const frame=async()=>{renderer.update(eye,1080,65,1/60,false,sun,[],worldNs,null,WATER_M);await nextTurn();return renderer.diagnostics();};
  const oceanUniformsFresh=label=>{
    let checked=0,time=null;
    for(const key of renderer.active){
      const p=renderer.patches.get(key);if(!p.ocean||!p.ocean.visible)continue;
      const u=p.ocean.material.uniforms,expected=[0,1,2].map(i=>(eye[i]-p.ocean.position.getComponent(i))*R);
      [u.oceanEyeM.value.x,u.oceanEyeM.value.y,u.oceanEyeM.value.z].forEach((v,i)=>assert.ok(Math.abs(v-expected[i])<=1e-6+1e-9*Math.abs(expected[i]),`${label}: ${key} oceanEyeM[${i}] ${v} != ${expected[i]}`));
      time??=u.oceanTime.value;assert.equal(u.oceanTime.value,time,`${label}: ${key} oceanTime differs from other patches`);
      checked++;
    }
    assert.ok(checked>20,`${label}: expected many drawn ocean patches (${checked})`);
    return checked;
  };
  try{
    let d,quiet=0;
    for(let i=0;i<3000&&quiet<60;i++){d=await frame();quiet=d.pending===0&&i>30?quiet+1:0;}
    assert.equal(quiet,60,'frontier settles');
    assert.equal(d.staleWaterPatches,0);

    // 1. Continuity of the wave field across every shared edge.
    const drawn=new Map();
    for(const key of renderer.active){const p=renderer.patches.get(key);if(p.ocean&&p.ocean.visible)drawn.set(key,p);}
    const levels=new Set([...drawn.values()].map(p=>p.tile.level));
    // Near field: both tiles at most ~20 km across (level >= NEAR_LEVEL), where
    // float32 anchor-relative positions resolve the 8-42 m waves to well
    // under a millimetre; this is where a seam is visible. Far tiles (up to a
    // cube face) cannot resolve the waves in float32 at all, so there the jump
    // is only bounded by position precision (see farTolerance).
    const NEAR_LEVEL=9;
    const stats={near:{pairs:0,coarseFine:0,crossCell:0,height:0,slope:0,worst:null},far:{pairs:0,crossCell:0,height:0,slope:0,excess:0,worst:null}};
    const cell=p=>[0,2].map(i=>Math.floor(p.ocean.position.getComponent(i)*R/DETAIL_PERIOD_M)).join(',');
    const edgeUV=(e,s)=>[[0,s],[1,s],[s,0],[s,1]][e];
    const extentM=tile=>2/2**tile.level*R;
    const u0=drawn.values().next().value.ocean.material.uniforms;
    const slopeGain=u0.oceanWaveNumber.value.reduce((sum,k,i)=>sum+k*u0.oceanWaveAmplitudeM.value[i],0);
    const farTolerance=(a,b)=>2e-3+slopeGain*(extentM(a.tile)+extentM(b.tile))*2**-23;
    for(const a of drawn.values()){
      for(let e=0;e<4;e++){
        let n=tileNeighbour(a.tile,e),b=null;
        while(n.level>=0){b=drawn.get(tileKey(n));if(b||n.level===0)break;n={face:n.face,level:n.level-1,x:Math.floor(n.x/2),y:Math.floor(n.y/2)};}
        if(!b||b===a)continue;
        const near=a.tile.level>=NEAR_LEVEL&&b.tile.level>=NEAR_LEVEL,st=near?stats.near:stats.far;
        st.pairs++;if(near&&b.tile.level!==a.tile.level)st.coarseFine++;
        if(cell(a)!==cell(b))st.crossCell++;
        for(let s=1;s<16;s++){
          const point=tileDirection(a.tile,...edgeUV(e,s/16)).map(v=>v*seaRadius);
          const wa=patchWave(a.ocean,point),wb=patchWave(b.ocean,point);
          const dh=Math.abs(wa.height-wb.height),ds=Math.hypot(wa.sx-wb.sx,wa.sz-wb.sz);
          if(dh>st.height){st.height=dh;st.worst={a:a.key,b:b.key,cellA:cell(a),cellB:cell(b),dh,ds};}
          st.slope=Math.max(st.slope,ds);
          if(!near)st.excess=Math.max(st.excess,dh/farTolerance(a,b));
        }
      }
    }
    const fmt=st=>`${st.pairs} shared edges${st.coarseFine!==undefined?` (${st.coarseFine} 2:1)`:''}, ${st.crossCell} across a ${DETAIL_PERIOD_M} m phase-origin cell, max height jump ${st.height.toExponential(3)} m, max slope jump ${st.slope.toExponential(3)}${st.worst?`, worst ${JSON.stringify(st.worst)}`:''}`;
    t.diagnostic(`drawn ocean patches ${drawn.size} (levels ${[...levels].sort((x,y)=>x-y).join(',')})`);
    t.diagnostic(`near field (level >= ${NEAR_LEVEL}): ${fmt(stats.near)}`);
    t.diagnostic(`far field: ${fmt(stats.far)}, max jump / precision bound ${stats.far.excess.toFixed(3)}`);
    assert.ok(stats.near.pairs>100&&stats.near.coarseFine>10,`fixture has same-level and 2:1 near ocean edges (${stats.near.pairs}, ${stats.near.coarseFine})`);
    assert.ok(stats.near.crossCell>10,'fixture includes near neighbours whose wrapped phase origins differ (the seam case)');
    assert.ok(stats.near.height<1e-3,`ocean height is continuous across near patch edges (max jump ${stats.near.height} m, ${JSON.stringify(stats.near.worst)})`);
    assert.ok(stats.near.slope<1e-3,`ocean slope is continuous across near patch edges (max jump ${stats.near.slope})`);
    assert.ok(stats.far.excess<=1,`far patch edges agree to float32 position precision (${stats.far.excess} of bound, ${JSON.stringify(stats.far.worst)})`);

    // The mirror above must stay the shader's own phase expression.
    const shader=drawn.values().next().value.ocean.material.vertexShader;
    assert.match(shader,/vec2 wavePosM=transformed\.xz\*oceanRadiusM\+oceanPhaseOriginM\.xz;/);
    assert.match(shader,/float phase=k\*dot\(oceanWaveDir\[i\],posM\)\+oceanWavePhase\[i\]\+t\*oceanWaveSpeed\[i\];/);

    // 2. Per-frame ocean uniforms are fresh on moving, still and seek frames.
    oceanUniformsFresh('settled');
    eye=eye.map((v,i)=>v+(i===1?3/R:0));await frame();oceanUniformsFresh('moved 3 m');
    await frame();oceanUniformsFresh('still frame');
    worldNs+=7_250_000_000n;await frame();oceanUniformsFresh('clock advanced');
    const times=new Set([...renderer.active].map(k=>renderer.patches.get(k).ocean?.material.uniforms.oceanTime.value).filter(v=>v!==undefined));
    assert.equal(times.size,1,'every drawn ocean patch shares one phase');
  }finally{fx.dispose();await cleanup();}
});

test('wave phase offsets map a 4096 m-wrapped origin back onto the one world wave field',async()=>{
  const {generateOceanWaveField,hashSeedString,oceanWavePhaseOffsets}=await import('../src/ocean-gerstner.ts');
  const {createOceanWaterMaterial}=await import('../src/ocean-water-material.ts');
  const {detailOrigin}=await import('../src/ground-material.ts');
  const waves=generateOceanWaveField(hashSeedString('LETHRA-001/ocean-seam'));
  const R=5_195_000,world=(x,z,t)=>waves.reduce((h,w)=>h+Math.sin(Math.fround(2*Math.PI/w.wavelengthM)*(w.dirX*x+w.dirZ*z)+t*w.speedMps)*w.amplitudeM,0);
  let worst=0;
  for(let i=0;i<64;i++){
    const anchor=[Math.sin(i*1.7)*.8,Math.cos(i*.9)*.5,Math.sin(i*.37+1)*.9];
    const exact=anchor.map(v=>v*R),wrapped=detailOrigin(anchor,R);
    const offsets=oceanWavePhaseOffsets(waves,exact[0]-wrapped[0],exact[2]-wrapped[2]);
    offsets.forEach(o=>assert.ok(o>=0&&o<2*Math.PI));
    for(const [lx,lz] of [[0,0],[137.5,-912.25],[-2047,2047]]){
      const t=4321.5,patch=waves.reduce((h,w,j)=>h+Math.sin(Math.fround(2*Math.PI/w.wavelengthM)*(w.dirX*(lx+wrapped[0])+w.dirZ*(lz+wrapped[2]))+offsets[j]+t*w.speedMps)*w.amplitudeM,0);
      worst=Math.max(worst,Math.abs(patch-world(exact[0]+lx,exact[2]+lz,t)));
    }
  }
  assert.ok(worst<1e-6,`wrapped + offset equals the world phase (max ${worst} m)`);
  // The material turns an unwrapped origin into these offsets; without one it adds none.
  const base={radiusM:R,normalAnchorDir:[1,0,0],phaseOriginM:[1000,0,3000],patchMorph:{value:1},patchEdges:{value:{x:0,y:0,z:0,w:0}},patchTexels:32,waveSeed:hashSeedString('LETHRA-001/ocean-seam')};
  const plain=createOceanWaterMaterial(base),shifted=createOceanWaterMaterial({...base,waveOriginM:[1000+4096*1200,0,3000-4096*7]});
  assert.deepEqual(plain.uniforms.oceanWavePhase.value,waves.map(()=>0));
  assert.deepEqual(shifted.uniforms.oceanWavePhase.value,oceanWavePhaseOffsets(waves,4096*1200,-4096*7));
  assert.ok(shifted.uniforms.oceanWavePhase.value.some(v=>v>1e-3),'a whole-period shift is not a no-op for the Gerstner waves');
  plain.dispose();shifted.dispose();
});
