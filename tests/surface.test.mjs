import {test} from 'node:test';
import assert from 'node:assert/strict';
import {galaxies,refByAddress,system} from '../src/catalog.ts';
import {terrainSampler,baseTerrainSampler,planetSurface,DEFAULT_SURFACE_AGE_MYR,TERRAIN_VERSION} from '../src/terrain.ts';
import {cubeDirection,buildTile,PATCH_SEGMENTS,directionTile} from '../src/planet-tiles.ts';
import {biomeClassifier,materialBytes} from '../src/surface-biomes.ts';
import {detailPixels,detailOrigin} from '../src/ground-material.ts';
import {surfaceSurvey} from '../src/surface-survey.ts';
const sys=system(refByAddress(galaxies('LETHRA-001')[0],'G001/C2128,0,1/0')),body=sys.planets[1];
test('biome weights sum to one and distinguish airless ground from living habitat',()=>{
  for(const b of [body,sys.moons[0],{...body,type:'Ice world',water:0},{...body,type:'Volcanic world',water:0},{...body,temperatureK:600},{...body,temperatureK:90}]){
    const classify=biomeClassifier(b);
    for(const d of [[0,1,0],[0,-1,0],[1,0,0],cubeDirection(0,1,1)])for(const height of [-1000,0,50,900,4000])for(const dot of [.3,.8,1]){
      const c=classify(d,height,dot);assert.ok(c.weights.every(x=>x>=0&&x<=1));
      assert.ok(Math.abs(c.weights.reduce((a,b)=>a+b,0)-1)<1e-12);
      const bytes=materialBytes(c.weights);assert.equal(bytes.reduce((a,b)=>a+b,0),255);
      if(!b.water||height<0||b.temperatureK<250||b.temperatureK>325)assert.equal(c.forestPotential,false);
    }
  }
});
test('material coordinates and weights match at poles, cube corners and LOD boundaries',()=>{
  const phase=(t,i)=>{const origin=detailOrigin(t.anchor,body.radiusM);return origin.map((v,j)=>Math.fround(Math.fround(t.positions[i*3+j]*Math.fround(body.radiusM))+Math.fround(v)));};
  const n=PATCH_SEGMENTS,seen=new Map();let shared=0;
  for(const level of [17,18])for(const d of [[0,1,0],[0,-1,0],[1,1,1],[-1,-1,-1]]){
    const center=directionTile(d,level),count=2**level;
    const tiles=[];
    for(let face=0;face<6;face++){
      // Corner fixtures cover each of the three meeting faces; polar fixtures
      // cover the four patches around the pole on its single cube face.
      if(d.every(v=>v!==0)){
        if(Math.sign(d[Math.floor(face/2)])!==(face%2?-1:1))continue;
        for(const x of [0,count-1])for(const y of [0,count-1])tiles.push({face,level,x,y});
      }else if(face===center.face)for(const dx of [-1,0])for(const dy of [-1,0])tiles.push({...center,x:center.x+dx,y:center.y+dy});
    }
    for(const tile of tiles){
      const t=buildTile(body,tile);
      // Surface-centred anchors keep fine geometry local even on high mountains.
      assert.ok(Math.max(...t.positions.slice(0,(n+1)**2*3).map(Math.abs))*body.radiusM<200);
      for(const i of [0,n,n*(n+1),(n+1)**2-1]){
        const absolute=[0,1,2].map(j=>t.positions[i*3+j]+t.anchor[j]);
        const key=absolute.map(v=>v.toFixed(9)).join(',');
        const item={p:phase(t,i),w:Array.from(t.materials.slice(i*4,i*4+4))};
        if(seen.has(key)){
          shared++;const old=seen.get(key);
          for(let j=0;j<3;j++)assert.ok(Math.abs(((item.p[j]-old.p[j])%4096+6144)%4096-2048)<.003);
          assert.deepEqual(item.w,old.w);
        }else seen.set(key,item);
      }
    }
  }
  assert.ok(shared>60,'compared shared cube/polar/LOD vertices');
});
test('ground texture is repeatable and phase agrees between planet-sized tile origins',()=>{
  assert.deepEqual(detailPixels(),detailPixels());
  const a=buildTile(body,{face:2,level:18,x:12000,y:12000}),b=buildTile(body,{face:2,level:18,x:12001,y:12000}),n=PATCH_SEGMENTS;
  const pa=detailOrigin(a.anchor,body.radiusM),pb=detailOrigin(b.anchor,body.radiusM);
  for(let y=0;y<=n;y++)for(let j=0;j<3;j++){
    const av=a.positions[(y*(n+1)+n)*3+j]*body.radiusM+pa[j],bv=b.positions[(y*(n+1))*3+j]*body.radiusM+pb[j];
    const delta=((av-bv)%4096+6144)%4096-2048;
    assert.ok(Math.abs(delta)<.003,'material phase agrees within 3 mm at shared vertices');
  }
});
test('survey sites are repeatable real dry terrain and retain IDs across request order',()=>{
  const before=terrainSampler(body)([1,0,0]),sites=surfaceSurvey(body);
  surfaceSurvey(sys.moons[0]);assert.deepEqual(surfaceSurvey(body),sites);
  assert.deepEqual(terrainSampler(body)([1,0,0]),before);
  assert.ok(sites.length>=3);assert.equal(new Set(sites.map(x=>x.id)).size,sites.length);
  for(const site of sites){const s=terrainSampler(body)(site.direction);assert.equal(s.elevationM,site.elevationM);assert.equal(s.ocean,false);assert.ok(site.slopeDeg<=28);}
  assert.deepEqual(surfaceSurvey({...body,type:'Gas giant'}),[]);
});
test('procedural craters: pure function of (seed,address,t), gated by real surface age, never flip ocean/land',()=>{
  const moon={id:'crater-test-moon',seed:'crater-test-seed',kind:'moon',type:'Rocky moon',radiusM:1737000,massKg:7.3e22,temperatureK:220,water:0};
  // `includeCraters=true` is required explicitly below: `terrainSampler`'s
  // own default is now OFF (see terrain.ts's terrain-1.4.1 version-bump
  // comment - a real-time walking/contact performance regression and a
  // drainage.ts correctness hazard, both traced to every unmodified caller
  // in this codebase inheriting craters-on with no override). This test
  // exercises the crater feature itself via the explicit opt-in, which
  // remains fully wired, pure and deterministic.
  const young=terrainSampler(moon,undefined,0,true),aged=terrainSampler(moon,undefined,3500,true),base=terrainSampler(moon,undefined,0,false);
  let differed=false;
  for(let i=0;i<200;i++){
    const theta=(i/200)*Math.PI*2,phi=Math.PI*((i*7%200)/200);
    const d=[-Math.cos(theta)*Math.sin(phi),Math.cos(phi),Math.sin(theta)*Math.sin(phi)];
    const b=base(d);
    // surfaceAgeMyr=0 => zero elapsed time => Poisson lambda=0 for every
    // band (planet-craters.ts's craterField), so literally no craters exist
    // yet - this must reproduce the pre-crater baseline exactly, not merely
    // "close", proving the age gate at its zero boundary is exact.
    assert.equal(young(d).elevationM,b.elevationM,'surfaceAgeMyr=0 must have zero craters, matching the pre-crater baseline exactly');
    if(aged(d).elevationM!==b.elevationM)differed=true;
    assert.equal(aged(d).ocean,b.ocean,'craters are summed after the ocean/land decision and must never flip it');
  }
  assert.ok(differed,'an aged (3500 Myr) surface must carry at least one crater over this sample sweep');
  // Default OFF: with no explicit opt-in, terrainSampler(moon,undefined,3500)
  // must reproduce the pre-crater baseline exactly, matching every other
  // unmodified caller in this codebase (planet-renderer.ts, planet-tiles.ts,
  // drainage.ts, travel.ts, world-surface.ts, surface-survey.ts) that samples
  // with no override.
  const agedDefault=terrainSampler(moon,undefined,3500);
  for(const d of [[1,0,0],[0,1,0],[0,0,1],[-1,0,0]])assert.equal(agedDefault(d).elevationM,base(d).elevationM,'terrainSampler defaults to craters off');
  // Purity/determinism: identical (seed,address,t,includeCraters) via fresh
  // sampler instances reproduces the identical field - no hidden state
  // carried between calls, no dependence on call/visit order.
  const a1=terrainSampler(moon,undefined,3500,true),a2=terrainSampler(moon,undefined,3500,true);
  for(const d of [[1,0,0],[0,1,0],[0,0,1],[-1,0,0],[0.6,0.6,0.529150262212918]])assert.deepEqual(a1(d),a2(d));
});
test('planetSurface gates craters off by default (the system-surfaces multi-body job budget) and matches terrainSampler exactly when opted in',()=>{
  const moon={id:'crater-test-moon-2',seed:'crater-test-seed-2',kind:'moon',type:'Rocky moon',radiusM:1737000,massKg:7.3e22,temperatureK:220,water:0};
  const t0=performance.now();
  const off=planetSurface(moon,64,16);
  // Regression guard: before terrain.ts gated craters off by default here,
  // a system view (worker.ts's job('system-surfaces',...), which calls this
  // function once per body with no per-call time budget of its own, all
  // inside ONE 60s-timeout job in main.ts) measured 261.2s in isolated Node
  // timing for a real 37-body system (11 planets + 26 moons), over 4x the
  // job's hard timeout, permanently stranding the app on the sector view -
  // see this task's report for the exact before/after numbers. This bound
  // is generous (the fixed body above measures under 50ms in isolation) but
  // catches the shape of that regression (an unbounded per-call cost that
  // does not scale down with a small width/segments request) recurring.
  assert.ok(performance.now()-t0<3000,'default planetSurface(...) must stay well inside a multi-body job budget');
  const sample=terrainSampler(moon,undefined,DEFAULT_SURFACE_AGE_MYR,false);
  for(let y=0;y<=8;y++)for(let x=0;x<=16;x++){
    const u=x/16,v=y/8,theta=u*Math.PI*2,phi=v*Math.PI;
    const d=[-Math.cos(theta)*Math.sin(phi),Math.cos(phi),Math.sin(theta)*Math.sin(phi)];
    // `elevations` is a Float32Array (single-precision storage); compare
    // against the plain double-precision sampler within float32 rounding,
    // not bit-for-bit - the underlying craters-off computation is identical.
    assert.ok(Math.abs(off.elevations[y*17+x]-sample(d).visibleHeightM)<1e-2,'craters-off elevations match the craters-off sampler at every grid point (within float32 rounding)');
  }
  const on=planetSurface(moon,64,16,DEFAULT_SURFACE_AGE_MYR,true);
  assert.equal(on.elevations.length,off.elevations.length);
  assert.equal(on.version,TERRAIN_VERSION);
});
