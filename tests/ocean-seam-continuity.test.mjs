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
import {tileDirection,tileNeighbour,tileKey,unit,PATCH_SEGMENTS} from '../src/planet-tiles.ts';
import {oceanSkirtDepthM,oceanSkirtSagM} from '../src/ocean-water-material.ts';
import {DETAIL_PERIOD_M} from '../src/ground-material.ts';
import {loweredSeaLevels} from './helpers/harness-water.mjs';

// Relief round P6: was -4475 m (the old metre ramp's lowered sea); now the
// higher bucket of the 60%-volume-lost harness sea on the relief seabed.
const WATER_M=loweredSeaLevels(maithea()).highM;

/** The vertex shader's grid-spacing estimate (ocean-wave-fade-1) at one
 * body-frame unit-radius point: eye distance times the shared per-metre
 * spacing, floored. */
function patchSpacing(ocean,point,edges=[]){
  const u=ocean.material.uniforms,R=Math.fround(u.oceanRadiusM.value),anchor=ocean.position,eye=u.oceanEyeM.value,s=u.oceanWaveSpacing?.value??{x:0,y:0};
  const l=[0,1,2].map(i=>Math.fround(point[i]-anchor.getComponent(i))*R);
  return Math.max(Math.hypot(eye.x-l[0],eye.y-l[1],eye.z-l[2])*s.x,s.y,u.oceanPatchSpacingM?.value??0,...edges.map(e=>u.oceanEdgeSpacingM?.value.getComponent(e)??0));
}
/** Edge index (as a list) of patch b that faces patch a (a at b's level or finer). */
function facing(b,a){
  let anc=a.tile;while(anc.level>b.tile.level)anc={face:anc.face,level:anc.level-1,x:Math.floor(anc.x/2),y:Math.floor(anc.y/2)};
  const k=tileKey(anc);for(let e=0;e<4;e++)if(tileKey(tileNeighbour(b.tile,e))===k)return [e];
  return [];
}
const smoothstep=(e0,e1,x)=>{const t=Math.min(1,Math.max(0,(x-e0)/(e1-e0)));return t*t*(3-2*t);};

/** The vertex shader's wave sum for one patch at one body-frame unit-radius
 * point, read from that patch's uniforms with float32 uniform values,
 * including the per-wave distance fade. */
function patchWave(ocean,point,edges=[]){
  const u=ocean.material.uniforms,R=Math.fround(u.oceanRadiusM.value),origin=u.oceanPhaseOriginM.value,anchor=ocean.position;
  const phaseOffsets=u.oceanWavePhase?.value??u.oceanWaveNumber.value.map(()=>0);
  const x=Math.fround(point[0]-anchor.x)*R+Math.fround(origin.x),z=Math.fround(point[2]-anchor.z)*R+Math.fround(origin.z),t=Math.fround(u.oceanTime.value);
  const spacing=patchSpacing(ocean,point,edges);
  let height=0,sx=0,sz=0;
  u.oceanWaveNumber.value.forEach((k0,i)=>{
    const k=Math.fround(k0),d=u.oceanWaveDir.value[i],lambda=2*Math.PI/k,a=Math.fround(u.oceanWaveAmplitudeM.value[i])*(1-smoothstep(lambda*.25,lambda*.5,spacing));
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
  // The render-bounds block's self-contained skirt sag equals the shell's.
  for(let level=0;level<=22;level++)assert.ok(Math.abs(module.rendererExports.renderOceanSkirtSagM(R,level)-oceanSkirtSagM(level,R,PATCH_SEGMENTS))<1e-9,`skirt sag bound, level ${level}`);
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
          const wa=patchWave(a.ocean,point,[e]),wb=patchWave(b.ocean,point,facing(b,a));
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
    // ... and its fade/spacing expressions (OCEAN-PRESENT).
    assert.match(shader,/oceanGerstnerSpacingM=max\(max\(length\(oceanEyeM-transformed\*oceanRadiusM\)\*oceanWaveSpacing\.x,oceanWaveSpacing\.y\),max\(oceanPatchSpacingM,edgeSpacingM\)\);/);
    assert.match(shader,/uniform vec4 oceanEdgeSpacingM;/);
    assert.match(shader,/float amplitude=oceanWaveAmplitudeM\[i\]\*\(1\.0-smoothstep\(lambda\*\.25,lambda\*\.5,oceanGerstnerSpacingM\)\);/);
    assert.match(shader,/if\(gl_VertexID>=OCEAN_BASE_VERTICES\)\{waveHeightM=0\.0;waveSlope=vec2\(0\.0\);\}/);

    // 1b. Wave amplitude fade (OCEAN-PRESENT): on every drawn patch, every
    // wave the local vertex grid cannot sample (wavelength < 2 x the local
    // vertex spacing, the Nyquist limit) has zero displacement amplitude.
    const S=PATCH_SEGMENTS,stride=S+1,base=stride*stride;
    const fade={pairs:0,unresolvable:0,violations:0,worst:0,worstAt:null,keptNear:0};
    for(const p of drawn.values()){
      const pos=p.ocean.geometry.getAttribute('position').array,u=p.ocean.material.uniforms,anchor=p.ocean.position.toArray();
      const at=i=>[pos[i*3]+anchor[0],pos[i*3+1]+anchor[1],pos[i*3+2]+anchor[2]];
      const len=(i,j)=>Math.hypot(pos[i*3]-pos[j*3],pos[i*3+1]-pos[j*3+1],pos[i*3+2]-pos[j*3+2])*R;
      for(let y=0;y<=S;y++)for(let x=0;x<=S;x++){
        const i=y*stride+x;let spacing=0;
        if(x<S)spacing=Math.max(spacing,len(i,i+1));if(x>0)spacing=Math.max(spacing,len(i,i-1));
        if(y<S)spacing=Math.max(spacing,len(i,i+stride));if(y>0)spacing=Math.max(spacing,len(i,i-stride));
        const rows=[x===0?0:-1,x===S?1:-1,y===0?2:-1,y===S?3:-1].filter(e=>e>=0),est=patchSpacing(p.ocean,at(i),rows);
        u.oceanWaveNumber.value.forEach((k,w)=>{
          const lambda=2*Math.PI/Math.fround(k),amp=Math.fround(u.oceanWaveAmplitudeM.value[w])*(1-smoothstep(lambda*.25,lambda*.5,est));
          fade.pairs++;
          if(lambda<2*spacing){fade.unresolvable++;if(amp>1e-6){fade.violations++;if(amp>fade.worst){fade.worst=amp;fade.worstAt={key:p.key,level:p.tile.level,lambda,spacing,est};}}}
          else if(amp>0)fade.keptNear++;
        });
      }
    }
    t.diagnostic(`wave fade: ${fade.pairs} vertex-wave pairs, ${fade.unresolvable} beyond the Nyquist limit, ${fade.violations} of those still displaced (worst ${fade.worst} m ${JSON.stringify(fade.worstAt)}), ${fade.keptNear} resolvable pairs keep amplitude`);
    assert.ok(fade.unresolvable>1000&&fade.keptNear>1000,'fixture has both resolvable and unresolvable waves');
    assert.equal(fade.violations,0,`no wave is displaced on a grid that cannot sample it (worst ${fade.worst} m, ${JSON.stringify(fade.worstAt)})`);

    // 1c. Ocean skirts (OCEAN-PRESENT): every drawn shell carries skirt copies
    // in the terrain skirt layout, hanging oceanSkirtDepthM below the sea, and
    // at every 2:1 edge (both sides) the skirt is drawn. A sliver is an edge
    // point where the two surfaces separate (> 1 mm) and the higher side's
    // skirt does not reach below the lower side's surface.
    const edgesOf=n=>[Array.from({length:n+1},(_,i)=>i),Array.from({length:n+1},(_,i)=>i*(n+1)+n),Array.from({length:n+1},(_,i)=>n*(n+1)+n-i),Array.from({length:n+1},(_,i)=>(n-i)*(n+1))];
    const skirtStats={patches:0,skirtVertexError:0,skirtDrawn:0};
    for(const p of drawn.values()){
      const g=p.ocean.geometry,pos=g.getAttribute('position').array,depth=oceanSkirtDepthM(p.ocean.material.waves,p.tile.level,R,S),anchor=p.ocean.position.toArray();
      assert.equal(pos.length/3,base+4*stride,`${p.key}: base grid plus 4 x ${stride} skirt vertices`);
      assert.equal(g.index.count,S*S*6+4*S*6,`${p.key}: terrain index buffer with skirt triangles`);
      edgesOf(S).forEach((edge,e)=>edge.forEach((a,k)=>{
        const b=base+e*stride+k,v=[0,1,2].map(i=>pos[a*3+i]+anchor[i]),l=Math.hypot(...v);
        const err=Math.hypot(...[0,1,2].map(i=>(pos[b*3+i]-(pos[a*3+i]-v[i]/l*depth/R))*R));
        skirtStats.skirtVertexError=Math.max(skirtStats.skirtVertexError,err);
      }));
      // Every skirt triangle joins two edge vertices to their own skirt copies.
      const idx=g.index.array;
      for(let i=S*S*6;i<idx.length;i++)assert.ok(idx[i]<pos.length/3,`${p.key}: skirt index in range`);
      skirtStats.patches++;if(g.drawRange.count>=g.index.count)skirtStats.skirtDrawn++;
    }
    const slivers={edges21:0,edges41:0,odd:0,openWithoutSkirt:0,maxGap:0,slivers:0,worst:null,sameLevelOpen:0};
    const drawsSkirt=p=>p.ocean.geometry.drawRange.count>=p.ocean.geometry.index.count;
    for(const a of drawn.values()){
      for(let e=0;e<4;e++){
        let n=tileNeighbour(a.tile,e),b=null;
        while(n.level>=0){b=drawn.get(tileKey(n));if(b||n.level===0)break;n={face:n.face,level:n.level-1,x:Math.floor(n.x/2),y:Math.floor(n.y/2)};}
        if(!b||b===a)continue;
        const P=k=>tileDirection(a.tile,...edgeUV(e,k/S)).map(v=>v*seaRadius);
        if(b.tile.level===a.tile.level){
          for(let k=0;k<=S;k++){const pt=P(k),gap=Math.abs(patchWave(a.ocean,pt,[e]).height-patchWave(b.ocean,pt,facing(b,a)).height);if(gap>1e-3&&!drawsSkirt(a)&&!drawsSkirt(b))slivers.sameLevelOpen++;}
          continue;
        }
        // Coarser neighbour (2:1, or 4:1 where the frontier has one): the
        // fine side's edge vertices (chord midpoints where locked to a parent
        // neighbour) against the coarse side's straight segments, radial
        // heights in metres above the sea including the waves.
        const diff=a.tile.level-b.tile.level,step=2**diff;if(step>S)continue;
        slivers.edges21++;if(diff>1)slivers.edges41++;
        assert.ok(drawsSkirt(a)&&drawsSkirt(b),`${step}:1 edge ${a.key} | ${b.key}: both sides draw their skirt`);
        const depth=oceanSkirtDepthM(b.ocean.material.waves,b.tile.level,R,S),depthFine=oceanSkirtDepthM(a.ocean.material.waves,a.tile.level,R,S),locked=a.edge.value.getComponent(e)===1,fb=facing(b,a);
        const lift=(p,h)=>(Math.hypot(...p)-seaRadius)*R+h;
        for(let k=1;k<S;k++){
          if(k%step===0)continue;
          const F=locked&&k%2?P(k-1).map((v,i)=>(v+P(k+1)[i])/2):P(k);
          const j=Math.floor(k/step)*step,f=(k-j)/step,C0=P(j),C1=P(j+step),C=C0.map((v,i)=>v+(C1[i]-v)*f);
          const fine=lift(F,patchWave(a.ocean,F,[e]).height),coarse=lift(C,patchWave(b.ocean,C0,fb).height*(1-f)+patchWave(b.ocean,C1,fb).height*f),gap=Math.abs(fine-coarse);
          slivers.odd++;slivers.maxGap=Math.max(slivers.maxGap,gap);
          if(gap<=1e-3)continue;
          slivers.openWithoutSkirt++;
          // The higher side's skirt runs from its edge down to depth below the sea.
          const higherIsFine=fine>coarse,bottom=higherIsFine?lift(F,0)-depthFine:lift(C,0)-depth,covered=drawsSkirt(higherIsFine?a:b)&&bottom<Math.min(fine,coarse)-1e-3;
          if(!covered){slivers.slivers++;slivers.worst??={a:a.key,b:b.key,k,fine,coarse,bottom,depth};}
        }
      }
    }
    t.diagnostic(`ocean skirts: ${skirtStats.patches} drawn shells, ${skirtStats.skirtDrawn} drawing skirts, skirt vertex error ${skirtStats.skirtVertexError.toFixed(3)} x float32 tolerance`);
    t.diagnostic(`coarser-neighbour edges ${slivers.edges21} (${slivers.edges41} at 4:1 or more): ${slivers.odd} fine edge vertices, ${slivers.openWithoutSkirt} open > 1 mm without skirts (max gap ${slivers.maxGap.toFixed(3)} m), slivers with skirts ${slivers.slivers}; same-level open edges without skirts ${slivers.sameLevelOpen}`);
    assert.ok(skirtStats.skirtVertexError<1,'skirt copies sit oceanSkirtDepthM below their edge vertices');
    assert.ok(slivers.edges21>10,'fixture has 2:1 ocean edges');
    assert.ok(slivers.openWithoutSkirt>0,'fixture has wave gaps that would be slivers without skirts');
    assert.equal(slivers.slivers,0,`0 slivers at 2:1 edges (${JSON.stringify(slivers.worst)})`);
    assert.equal(slivers.sameLevelOpen,0,'same-level edges without skirts never open');

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

test('wave amplitude fade: kept on a fine grid, gone at the Nyquist limit, gone past OCEAN_SURFACE_DETAIL_M (OCEAN-PRESENT)',async()=>{
  const {oceanWaveFade,oceanWaveSpacingM,oceanWaveMinSpacingPerM,sampleOceanDisplacement,generateOceanWaveField,hashSeedString,OCEAN_WAVE_WAVELENGTH_RANGE_M}=await import('../src/ocean-gerstner.ts');
  for(const lambda of [8,13.5,27,42]){
    assert.equal(oceanWaveFade(lambda,0),1);assert.equal(oceanWaveFade(lambda,lambda/4),1,'four vertices per wavelength keep the wave');
    assert.equal(oceanWaveFade(lambda,lambda/2),0,'two vertices per wavelength (Nyquist) remove it');
    let previous=1;for(let s=0;s<=lambda;s+=lambda/97){const f=oceanWaveFade(lambda,s);assert.ok(f<=previous+1e-15&&f>=0&&f<=1);previous=f;}
  }
  // The renderer's per-metre spacing is never below the value that ends the
  // longest wave by 2000 m (OCEAN_SURFACE_DETAIL_M; asserted textually in the renderer).
  const perM=oceanWaveMinSpacingPerM(2000);
  assert.equal(oceanWaveFade(OCEAN_WAVE_WAVELENGTH_RANGE_M[1],oceanWaveSpacingM(2000,perM)),0);
  assert.ok(oceanWaveFade(OCEAN_WAVE_WAVELENGTH_RANGE_M[1],oceanWaveSpacingM(900,perM))>0,'the longest wave survives well inside 2000 m');
  assert.equal(oceanWaveSpacingM(10,perM,4),4,'the floor holds near the eye');
  // The displacement sample fades the same way; spacing 0 is the unfaded field.
  const waves=generateOceanWaveField(hashSeedString('LETHRA-001/fade'));
  assert.deepEqual(sampleOceanDisplacement(waves,3,4,5),sampleOceanDisplacement(waves,3,4,5,0));
  assert.deepEqual(sampleOceanDisplacement(waves,3,4,5,30),{heightM:0,dHdx:0,dHdz:0});
  const renderer=await (await import('node:fs/promises')).readFile(new URL('../src/planet-renderer.ts',import.meta.url),'utf8');
  assert.match(renderer,/oceanWaveMinSpacingPerM\(OCEAN_SURFACE_DETAIL_M\)/);
  assert.match(renderer,/export const OCEAN_SURFACE_DETAIL_M=2000;/,'OCEAN_SURFACE_DETAIL_M is unchanged');
  // A submerged eye gets no cloud composite over the sea's underside.
  assert.match(renderer,/renderCloudScene\([^)]*\)\{[\s\S]{0,400}?if\(this\.oceanSubmerged\)return false;\s*return this\.clouds\?\.render/);
});

test('underwater medium: identity for a dry eye, water colour with distance, red lost first, darker deeper (OCEAN-PRESENT)',async()=>{
  const {underwaterReference,OCEAN_UNDERWATER,OCEAN_UNDERWATER_GLSL,OCEAN_CAUSTICS_GLSL,oceanSkirtBuffers,oceanSkirtEdges}=await import('../src/ocean-water-material.ts');
  const bed=[.4,.35,.25];
  assert.deepEqual(underwaterReference(bed,500,3000,.8,[0,0,0,0]),bed,'dry eye: unchanged');
  const near=underwaterReference(bed,5,10,.8,[1,5,0,0]),far=underwaterReference(bed,20000,10,.8,[1,5,0,0]);
  assert.ok(near[0]<bed[0]&&near[2]/near[0]>bed[2]/bed[0],'even a near shallow floor turns blue (red absorbed first)');
  const water=[0,1,2].map(i=>(OCEAN_UNDERWATER.deep[i]+(OCEAN_UNDERWATER.shallow[i]-OCEAN_UNDERWATER.deep[i])*Math.exp(-7.5/OCEAN_UNDERWATER.lightDepthM)));
  far.forEach((v,i)=>assert.ok(Math.abs(v-water[i])<2e-3,'a long path converges on the water colour'));
  const shallowBed=underwaterReference(bed,800,30,.8,[1,30,0,0]),deepBed=underwaterReference(bed,800,3500,.8,[1,3000,0,0]);
  assert.ok(deepBed.every((v,i)=>v<shallowBed[i]),'the deep floor is darker than a shallow one');
  assert.ok(deepBed[2]>deepBed[0]*3,'the deep floor reads blue, not black or grey');
  const night=underwaterReference(bed,20000,10,-.6,[1,5,0,0]);assert.ok(night.every((v,i)=>v<far[i]),'night water is darker');
  for(const c of [...OCEAN_UNDERWATER.shallow,...OCEAN_UNDERWATER.deep,...OCEAN_UNDERWATER.absorbPerM,...OCEAN_UNDERWATER.pathExtinction])assert.ok(OCEAN_UNDERWATER_GLSL.includes(c.toFixed(4)),`GLSL embeds ${c}`);
  // Caustic wave vectors are whole cycles per 4096 m, speeds whole quanta of the 86400 s wrap.
  for(const m of OCEAN_CAUSTICS_GLSL.matchAll(/vec3\((-?\d+)\.0,(-?\d+)\.0,(-?\d+)\.0\)/g))[1,2,3].forEach(i=>assert.ok(Number.isInteger(Number(m[i]))));
  for(const m of OCEAN_CAUSTICS_GLSL.matchAll(/t\*(\d+\.\d+)/g)){const n=Number(m[1])/(2*Math.PI/86400);assert.ok(Math.abs(n-Math.round(n))<1e-4,`caustic speed ${m[1]} is whole wrap quanta`);}
  // Skirt layout: copies follow planet-tiles' edge order.
  const n=4,stride=n+1,pos=new Float32Array(stride*stride*3),par=new Float32Array(stride*stride*3);
  for(let y=0;y<=n;y++)for(let x=0;x<=n;x++){const i=y*stride+x;pos.set([x*1e-4,y*1e-4,0],i*3);par.set([x*1e-4,y*1e-4,1e-7],i*3);}
  const s=oceanSkirtBuffers(pos,par,[0,0,1],n,3,6e6);
  assert.equal(s.baseVertices,25);assert.equal(s.skirtVertices,20);assert.deepEqual(oceanSkirtEdges(n)[2],[24,23,22,21,20]);
  oceanSkirtEdges(n).forEach((edge,e)=>edge.forEach((a,k)=>{const b=25+e*stride+k,v=[pos[a*3],pos[a*3+1],pos[a*3+2]+1],l=Math.hypot(...v);
    for(let i=0;i<3;i++)assert.ok(Math.abs(s.positions[b*3+i]-(pos[a*3+i]-v[i]/l*3/6e6))<1e-9);}));
});
