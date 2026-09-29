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
    let pairs=0,coarseFine=0,crossCell=0,maxHeight=0,maxSlope=0,worst=null;
    const cell=p=>[0,2].map(i=>Math.floor(p.ocean.position.getComponent(i)*R/DETAIL_PERIOD_M)).join(',');
    const edgeUV=(e,s)=>[[0,s],[1,s],[s,0],[s,1]][e];
    for(const a of drawn.values()){
      for(let e=0;e<4;e++){
        let n=tileNeighbour(a.tile,e),b=null;
        while(n.level>=0){b=drawn.get(tileKey(n));if(b||n.level===0)break;n={face:n.face,level:n.level-1,x:Math.floor(n.x/2),y:Math.floor(n.y/2)};}
        if(!b||b===a)continue;
        pairs++;if(b.tile.level!==a.tile.level)coarseFine++;
        if(cell(a)!==cell(b))crossCell++;
        for(let s=1;s<16;s++){
          const point=tileDirection(a.tile,...edgeUV(e,s/16)).map(v=>v*seaRadius);
          const wa=patchWave(a.ocean,point),wb=patchWave(b.ocean,point);
          const dh=Math.abs(wa.height-wb.height),ds=Math.hypot(wa.sx-wb.sx,wa.sz-wb.sz);
          if(dh>maxHeight){maxHeight=dh;worst={a:a.key,b:b.key,cellA:cell(a),cellB:cell(b),dh,ds};}
          maxSlope=Math.max(maxSlope,ds);
        }
      }
    }
    t.diagnostic(`drawn ocean patches ${drawn.size} (levels ${[...levels].sort((x,y)=>x-y).join(',')}), shared edges ${pairs} (${coarseFine} 2:1, ${crossCell} across a ${DETAIL_PERIOD_M} m phase-origin cell), max height jump ${maxHeight.toExponential(3)} m, max slope jump ${maxSlope.toExponential(3)}${worst?`, worst ${JSON.stringify(worst)}`:''}`);
    assert.ok(pairs>100&&coarseFine>10,`fixture has same-level and 2:1 ocean edges (${pairs}, ${coarseFine})`);
    assert.ok(crossCell>0,'fixture includes neighbours whose wrapped phase origins differ (the seam case)');
    assert.ok(maxHeight<2e-3,`ocean height is continuous across patch edges (max jump ${maxHeight} m, ${JSON.stringify(worst)})`);
    assert.ok(maxSlope<2e-3,`ocean slope is continuous across patch edges (max jump ${maxSlope})`);

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
