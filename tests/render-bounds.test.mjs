// render-bounds-1 (relief round 2026-10, P5-RENDER-BOUNDS): conservative but
// tight tile bounds, the per-tile horizon, the seabed-distance detail policy,
// landing/cloud heights from the body's own height bound.
//
// Sample sizes are environment-tunable so the evidence run can use the plan's
// full counts (RENDER_BOUNDS_TILES=2000 RENDER_BOUNDS_RATIO_TILES=200
// RENDER_BOUNDS_POSES=125); the defaults keep `npm test` to a few minutes.
import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {rendererModule,createRenderer,nextTurn} from './terrain-renderer-fixture.mjs';
import {galaxies,refByAddress,system,sector} from '../src/catalog.ts';
import {buildTile,readTileMetadata,directionTile,tileDirection,tileKey} from '../src/planet-tiles.ts';
import {peakCorrectionMaxLevel} from '../src/lod-ladder.ts';
import {createServer} from 'vite';
import * as NODE_THREE from 'three';
import {terrainSampler} from '../src/terrain.ts';
import {oceanHypsometry,fibonacciDirection} from '../src/ocean-volume.ts';
import {oceanPatchCullProof} from '../src/ocean-patch-culling.ts';
import {planetGeophysics} from '../src/planet-geophysics.ts';
import {placeAt} from '../src/place-query.ts';
import {CATALOGUE_EPOCH_NS} from '../src/world-time.ts';
import {cloudScaleHeightRatio,createCloudShell,CLOUD_LAND_CLEARANCE_M} from '../src/planet-clouds.ts';

const TILES=Number(process.env.RENDER_BOUNDS_TILES||120),RATIO_TILES=Number(process.env.RENDER_BOUNDS_RATIO_TILES||40),POSES=Number(process.env.RENDER_BOUNDS_POSES||125);
const g0=galaxies('LETHRA-001')[0];
const FIXTURE={Maithea:['G001/C2128,0,1/0',1],Selawyn:['G001/C2142,3,4/0',0],Raiva:['G001/C2143,4,3/0',1],Lethuris:['G001/C2142,6,1/1',1]};
const WORLDS=Object.entries(FIXTURE).map(([name,[a,i]])=>{const sys=system(refByAddress(g0,a));return {name,sys,body:sys.planets[i]};});
const report=globalThis.__renderBoundsReport={};
let M,RB,THREE;
before(async()=>{M=await rendererModule({prefix:'atlas-render-bounds-'});RB=M.module.rendererExports;THREE=M.module.THREE;});
after(async()=>{await M?.cleanup();if(process.env.RENDER_BOUNDS_REPORT)console.log('RENDER_BOUNDS_REPORT '+JSON.stringify(report));});

let seed=0x2545f491;const rnd=()=>{seed^=seed<<13;seed>>>=0;seed^=seed>>>17;seed^=seed<<5;seed>>>=0;return seed/4294967296;};
const randDir=()=>{const z=rnd()*2-1,a=rnd()*2*Math.PI,q=Math.sqrt(1-z*z);return [q*Math.cos(a),q*Math.sin(a),z];};
const parentOf=t=>({face:t.face,level:t.level-1,x:Math.floor(t.x/2),y:Math.floor(t.y/2)});
const percentile=(v,p)=>{const s=[...v].sort((a,b)=>a-b);return s[Math.min(s.length-1,Math.floor(p*(s.length-1)+.5))];};
const tileCache=new Map();
function tile(body,t,water=0){const k=`${body.id}|${tileKey(t)}|${water}`;let d=tileCache.get(k);if(!d){d=buildTile(body,t,1,water);tileCache.set(k,d);if(tileCache.size>3000)tileCache.delete(tileCache.keys().next().value);}return d;}
/** A patch-shaped record whose ocean is drawn exactly when the renderer would draw it. */
function patchOf(body,d){
  const ocean=!!(d.oceanPositions&&d.oceanParents&&!oceanPatchCullProof({positions:d.positions,parents:d.parents,oceanPositions:d.oceanPositions,oceanParents:d.oceanParents,baseVertices:33*33,anchorDir:d.anchor,radiusM:body.radiusM}).canCull);
  return {data:d,ocean:ocean?{}:null};
}
/** Every drawn point (unit radii, planet space) of a patch; `wave` flags ocean points. */
function* drawnPoints(p){
  const d=p.data,a=d.anchor;
  for(const arr of [d.positions,d.parents])for(let i=0;i<arr.length;i+=3)yield [arr[i]+a[0],arr[i+1]+a[1],arr[i+2]+a[2],0];
  if(p.ocean)for(const arr of [d.oceanPositions,d.oceanParents])for(let i=0;i<arr.length;i+=3)yield [arr[i]+a[0],arr[i+1]+a[1],arr[i+2]+a[2],1];
}
function sitesFor(body){
  const ts=terrainSampler(body),dirs=Array.from({length:4096},(_,i)=>fibonacciDirection(i,4096)),h=dirs.map(d=>ts(d).groundHeightM);
  let summit=0,deep=0,coast=0,land=0;
  for(let i=0;i<dirs.length;i++){if(h[i]>h[summit])summit=i;if(h[i]<h[deep])deep=i;if(Math.abs(h[i])<Math.abs(h[coast]))coast=i;if(h[i]>2000&&h[i]<6000&&!land)land=i;}
  return {ts,summit:dirs[summit],deep:dirs[deep],coast:dirs[coast],land:dirs[land||summit],random:randDir()};
}

test('body height bound contains the sampled terrain of every fixture world',()=>{
  for(const {name,body} of WORLDS){
    const b=RB.renderHeightBoundM(body),hyp=oceanHypsometry(body);
    assert.ok(hyp.heights[0]>=b.minM&&hyp.heights.at(-1)<=b.maxM,`${name}: [${hyp.heights[0]}, ${hyp.heights.at(-1)}] within [${b.minM}, ${b.maxM}]`);
    (report.bounds??={})[name]={...b,sampledMinM:hyp.heights[0],sampledMaxM:hyp.heights.at(-1)};
  }
  assert.equal(RB.RENDER_BOUNDS_VERSION,'render-bounds-1');
});

test('shell sphere contains its radial shell and is no larger than needed',()=>{
  const c=new THREE.Vector3(...tileDirection({face:2,level:6,x:20,y:31},.5,.5));
  for(const [r0,r1] of [[.999,1.001],[1,1.000001],[.9969,1.0037]]){
    const t={face:2,level:6,x:20,y:31},cos=RB.tileCornerCos(t,c),s=RB.shellSphere(c,cos,r0,r1);
    for(let i=0;i<=8;i++)for(let j=0;j<=8;j++)for(const r of [r0,(r0+r1)/2,r1]){
      const d=tileDirection(t,i/8,j/8);assert.ok(Math.hypot(d[0]*r-s.center.x,d[1]*r-s.center.y,d[2]*r-s.center.z)<=s.radius);
    }
  }
});

test('candidate bounds contain every child tile built under a resident parent (0 violations)',()=>{
  const out={};
  for(const {name,body} of WORLDS){
    // 1 mm: Float32 vertex storage relative to the tile anchor.
    const R=body.radiusM,{ts,summit,coast}=sitesFor(body),tol=1e-3/R;let violations=0,checked=0;const worst=[];
    for(let k=0;k<TILES;k++){
      const L=1+Math.floor(rnd()*20),dir=k%3===0?summit:k%3===1?coast:randDir();
      // Walk away from the site so the sample is not one tile repeated.
      const jitter=k%3===2?dir:dir.map((v,i)=>v+(rnd()-.5)*Math.min(.5,40/2**L)),n=Math.hypot(...jitter),d=jitter.map(v=>v/n);
      const child=directionTile(d,L),parent=parentOf(child),pd=tile(body,parent),cd=tile(body,child);
      const patches=new Map([[tileKey(parent),{data:pd,ocean:null}]]);
      const center=new THREE.Vector3(...tileDirection(child,.5,.5));
      const {r0,r1,sphere}=RB.candidateTileSphere(child,center,patches,body,1,0),wave=RB.RENDER_WAVE_BOUND_M/R;
      let bad=0;
      for(const [x,y,z,w] of drawnPoints(patchOf(body,cd))){
        const r=Math.hypot(x,y,z),e=w?wave:0;
        if(r-e<r0-tol||r+e>r1+tol||Math.hypot(x-sphere.center.x,y-sphere.center.y,z-sphere.center.z)+e>sphere.radius+tol)bad++;
      }
      const meta=readTileMetadata(child,cd.meta);
      if(1+meta.maxH/R>r1+tol||1+meta.minH/R<r0-tol)bad++;
      checked++;if(bad){violations++;worst.push(`${tileKey(child)}:${bad}`);}
    }
    out[name]={checked,violations};
    assert.equal(violations,0,`${name}: ${violations}/${checked} child tiles outside their candidate bound: ${worst.slice(0,5)}`);
  }
  report.containment=out;
});

test('candidate/tight sphere ratio p50 <= 1.5 at L10 and <= 2 at L14, L18 (legacy 20 km envelope for comparison)',()=>{
  const out={};
  for(const {name,body} of WORLDS){
    const R=body.radiusM;out[name]={};
    for(const L of [10,14,18]){
      const ratios=[],legacy=[];
      for(let k=0;k<RATIO_TILES;k++){
        const child=directionTile(randDir(),L),parent=parentOf(child),pd=tile(body,parent),cd=tile(body,child);
        const patches=new Map([[tileKey(parent),{data:pd,ocean:null}]]);
        const center=new THREE.Vector3(...tileDirection(child,.5,.5));
        const candidate=RB.candidateTileSphere(child,center,patches,body,1,0).sphere.radius;
        const tight=RB.residentTileBounds(patchOf(body,cd),R).sphere.radius;
        ratios.push(candidate/tight);legacy.push((Math.min(1.8,2/2**L*1.42)+20000/R)/tight);
      }
      out[name][`L${L}`]={p50:percentile(ratios,.5),p90:percentile(ratios,.9),legacyP50:percentile(legacy,.5)};
      if(name==='Maithea'||process.env.RENDER_BOUNDS_ALL_RATIOS)assert.ok(percentile(ratios,.5)<=(L===10?1.5:2),`${name} L${L} ratio p50 ${percentile(ratios,.5)}`);
    }
  }
  report.ratio=out;
});

test('Maithea horizon peak radius is within 10% of the analytic value',()=>{
  const {body}=WORLDS[0],R=body.radiusM,b=RB.renderHeightBoundM(body),hyp=oceanHypsometry(body);
  // Ground distance from which the highest peak can rise over the lowest ground sphere.
  const radius=(low,high)=>R*Math.acos((R+low)/(R+high));
  const used=radius(b.minM,b.maxM),analytic=radius(hyp.heights[0],hyp.heights.at(-1)),legacy=radius(-16000,20000);
  report.horizon={usedKm:used/1000,analyticKm:analytic/1000,legacyKm:legacy/1000};
  assert.ok(Math.abs(used/analytic-1)<=.1,`horizon peak radius ${used} vs analytic ${analytic}`);
});

test('0 false culls over 500 poses (ground, 2 km, 20 km, orbit) x 4 bodies against brute force',()=>{
  const out={};
  for(const {name,body} of WORLDS){
    const R=body.radiusM,sites=sitesFor(body),pool=[];
    for(const key of ['summit','deep','coast','land','random'])for(const L of [4,6,8,10,12,14,16,18])for(let j=0;j<3;j++){
      const base=sites[key],d=j?base.map(v=>v+(rnd()-.5)*3/2**L):base,n=Math.hypot(...d),child=directionTile(d.map(v=>v/n),L),parent=parentOf(child);
      if(pool.some(p=>tileKey(p.tile)===tileKey(child)))continue;
      const cd=tile(body,child),pd=tile(body,parent),patch=patchOf(body,cd),pts=[...drawnPoints(patch)];
      pool.push({tile:child,patch,parentPatches:new Map([[tileKey(parent),{data:pd,ocean:null}]]),center:new THREE.Vector3(...tileDirection(child,.5,.5)),bound:Math.min(1.8,2/2**L*1.42),pts});
    }
    const core=1+RB.renderHeightBoundM(body).minM/R;
    let falseResident=0,falseCandidate=0,bruteVisible=0,culledResident=0,bruteHidden=0;const camera=new THREE.PerspectiveCamera(65,16/9,1e-9,10);
    const kinds=['ground','2km','20km','orbit'];
    for(let k=0;k<POSES;k++){
      const kind=kinds[k%4],siteKey=['summit','deep','coast','land','random'][Math.floor(k/4)%5],site=sites[siteKey];
      const off=kind==='orbit'?site:site.map(v=>v+(rnd()-.5)*(kind==='ground'?2e-4:2e-3)),n=Math.hypot(...off),dir=off.map(v=>v/n);
      const ground=Math.max(0,sites.ts(dir).groundHeightM),alt=kind==='ground'?2:kind==='2km'?2000:kind==='20km'?20000:2*R;
      const eye=new THREE.Vector3(...dir).multiplyScalar(1+(ground+alt)/R);
      const target=rnd()<.6?pool[Math.floor(rnd()*pool.length)].center.clone().multiplyScalar(1+ground/R):eye.clone().add(new THREE.Vector3(...randDir()));
      camera.position.copy(eye);camera.up.set(...dir);camera.lookAt(target);camera.updateMatrixWorld(true);
      const frustum=new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
      const distance=eye.length(),direction=eye.clone().normalize(),P=new THREE.Vector3();
      for(const t of pool){
        let visible=false;
        for(const [x,y,z] of t.pts){
          P.set(x,y,z);if(!frustum.containsPoint(P))continue;
          // Hidden only when the segment eye->P passes strictly inside the lowest-ground sphere.
          const dx=x-eye.x,dy=y-eye.y,dz=z-eye.z,l2=dx*dx+dy*dy+dz*dz,s=Math.max(0,Math.min(1,-(eye.x*dx+eye.y*dy+eye.z*dz)/l2));
          const cx=eye.x+dx*s,cy=eye.y+dy*s,cz=eye.z+dz*s;
          if(s>0&&s<1&&Math.hypot(cx,cy,cz)<core*(1-1e-12))continue;
          visible=true;break;
        }
        const resident=RB.renderTileBounds(t.tile,t.center,t.bound,t.patch,new Map(),body,1,0,distance,direction);
        const candidate=RB.renderTileBounds(t.tile,t.center,t.bound,undefined,t.parentPatches,body,1,0,distance,direction);
        const shownResident=resident.horizon&&frustum.intersectsSphere(resident.sphere),shownCandidate=candidate.horizon&&frustum.intersectsSphere(candidate.sphere);
        if(visible){bruteVisible++;if(!shownResident)falseResident++;if(!shownCandidate)falseCandidate++;}
        else{bruteHidden++;if(!shownResident)culledResident++;}
      }
    }
    out[name]={poses:POSES,tiles:pool.length,bruteVisible,falseResident,falseCandidate,bruteHidden,culledResident};
    assert.equal(falseResident+falseCandidate,0,`${name}: false culls ${JSON.stringify(out[name])}`);
    assert.ok(bruteVisible>POSES/4,`${name}: the poses see tiles (${bruteVisible})`);
  }
  report.falseCulls=out;
});

test('landing finds a site on all four worlds and never above the summit ceiling',()=>{
  const out={};
  for(const {name,body} of WORLDS){
    const ts=terrainSampler(body),sea=0,ceiling=RB.landingCeilingM(body),ref=RB.landingReferenceM(body,sea),p99=RB.landPercentileM(body,.99,sea);
    assert.ok(ceiling<RB.renderHeightBoundM(body).maxM&&ref>0);
    const picks=[];
    for(let e=0;e<8;e++){
      const eye=new THREE.Vector3(...fibonacciDirection(e*61,512));let best=-Infinity,site=null;
      // main.ts exploreTerrain's loop with the terrain field as the walkable test (land at the dated sea).
      for(let i=0;i<384;i++){
        const y=1-2*(i+.5)/384,phi=i*2.399963229728653,r=Math.sqrt(1-y*y),d=new THREE.Vector3(Math.cos(phi)*r,y,Math.sin(phi)*r),h=ts(d.toArray()).groundHeightM;
        if(h<sea||h-sea>ceiling)continue;
        const score=d.dot(eye)*2+Math.min(1,(h-sea)/ref)*.12;
        if(score>best){best=score;site={h};}
      }
      assert.ok(site,`${name}: a landing site from eye ${e}`);
      assert.ok(site.h-sea<=ceiling&&site.h<p99,`${name}: site ${site.h} m is not a summit (ceiling ${ceiling}, p99 ${p99})`);
      picks.push(Math.round(site.h));
    }
    out[name]={ceilingM:ceiling,referenceM:ref,p99M:p99,siteHeightsM:picks};
  }
  report.landing=out;
});

test('cloud decks scale with gravity, follow the dated sea level and clear p99 land on the corpus',async()=>{
  // Through Vite's TS transform, like tests/volumetric-clouds.test.mjs.
  const vite=await createServer({configFile:false,optimizeDeps:{noDiscovery:true},server:{middlewareMode:true},appType:'custom'});
  let cloudLayerHeights,VolumetricClouds;
  try{({cloudLayerHeights,VolumetricClouds}=await vite.ssrLoadModule('/src/volumetric-clouds.ts'));}finally{await vite.close();}
  const corpus=[];
  for(let sx=0;corpus.length<160&&sx<400;sx++)for(const ref of sector(g0,[sx,0,0]).refs){
    for(const b of system(ref).planets)if(b.water>0&&b.type!=='Gas giant')corpus.push(b);
    if(corpus.length>=160)break;
  }
  for(const w of WORLDS)corpus.push(w.body);
  let worst=Infinity,minSh=Infinity,maxSh=0;
  for(const body of corpus){
    const params={hasAtmosphere:true,hasOcean:true,gasGiant:false,temperatureK:body.temperatureK,radiusM:body.radiusM,spinPeriodS:86400,
      surfaceGravityMS2:planetGeophysics(body).surfaceGravityMS2,landTopM:RB.landPercentileM(body,.99)};
    const p99=params.landTopM;if(!Number.isFinite(p99))continue;
    for(const seaLevelM of [0,-4500]){
      const h=cloudLayerHeights({...params,seaLevelM}),shell=createCloudShell({...params,seaLevelM},8,4);
      const shellTop=(shell.mesh.geometry.parameters.radius-1)*body.radiusM;shell.dispose();
      assert.ok(h.baseM<h.lowTopM&&h.lowTopM<h.highBaseM&&h.highBaseM<h.topM);
      assert.ok(h.topM>=p99+CLOUD_LAND_CLEARANCE_M-1e-6&&shellTop>=p99+CLOUD_LAND_CLEARANCE_M-1e-3,`${body.id}: deck ${h.topM}/${shellTop} vs p99 land ${p99}`);
      assert.ok(h.baseM>=seaLevelM,'the deck starts above the dated sea');
      worst=Math.min(worst,h.topM-p99);
    }
    const sh=cloudScaleHeightRatio(params);minSh=Math.min(minSh,sh);maxSh=Math.max(maxSh,sh);
  }
  // Low gravity raises the deck; airless bodies and gas giants keep sh = 1.
  const base={hasAtmosphere:true,hasOcean:true,temperatureK:288,radiusM:6e6,spinPeriodS:86400};
  assert.ok(cloudLayerHeights({...base,surfaceGravityMS2:3}).topM>cloudLayerHeights({...base,surfaceGravityMS2:9.81}).topM);
  assert.equal(cloudScaleHeightRatio({...base,hasAtmosphere:false,surfaceGravityMS2:3}),1);
  assert.equal(cloudScaleHeightRatio({...base,gasGiant:true,surfaceGravityMS2:3}),1);
  assert.deepEqual(cloudLayerHeights(base),{baseM:800,lowTopM:4200,highBaseM:6500,topM:8500},'defaults keep the reference deck');
  // The renderer moves the deck with the dated sea level each frame.
  const clouds=new VolumetricClouds({...base,surfaceGravityMS2:9.81},new NODE_THREE.Group());
  try{
    clouds.update('s','a',0n,new NODE_THREE.Vector3(1,0,0),-4500);
    assert.equal(clouds.diagnostics().layers.baseM,-4500+800);
    assert.ok(Math.abs(clouds.material.uniforms.heights.value.x-(-3.7))<1e-9);
  }finally{clouds.dispose();}
  report.clouds={bodies:corpus.length,minTopOverP99M:worst,shRange:[minSh,maxSh]};
});

test('seabed at -6 km: placeAt and contact-level tiles return the full-detail seabed bit-identical to terrainSampler',()=>{
  const {sys,body}=WORLDS[0],ts=terrainSampler(body);
  let dir=null;for(let i=0;i<4096&&!dir;i++){const d=fibonacciDirection(i,4096),h=ts(d).groundHeightM;if(h<-5800&&h>-6200)dir=d;}
  assert.ok(dir,'a -6 km seabed place');
  const expected=ts(dir).groundHeightM,ctx={sys,body,t:CATALOGUE_EPOCH_NS};
  for(const level of ['S0','S1','S2','S3','S4',0,10,22]){
    const p=placeAt(ctx,dir,level);
    assert.equal(p.exists,true);assert.equal(p.resolution,'full');
    assert.equal(p.groundHeightM,expected,`placeAt ${level}`);assert.equal(p.seabedHeightM,expected);
  }
  // Collision support tiles: every lattice vertex of the contact-level seabed
  // tile stores the sampler's own height (Float32), whatever the view chose.
  const L=Math.max(peakCorrectionMaxLevel(body.radiusM)+1,18),t=directionTile(dir,L),d=tile(body,t,0);
  for(let y=0;y<=32;y+=4)for(let x=0;x<=32;x+=4)assert.equal(d.surfaceHeight[y*33+x],Math.fround(ts(tileDirection(t,x/32,y/32)).groundHeightM));
  report.seabed={groundHeightM:expected,contactLevel:L};
});

test('open-ocean descent: seabed-distance selection draws fewer tiles than surface distance, and refines at the bottom',async()=>{
  const {body}=WORLDS[0],R=body.radiusM,ts=terrainSampler(body);
  // The deepest sampled place whose 300 km ring is all open water.
  let dir=null,depth=0;
  for(let i=0;i<2048;i++){
    const d=fibonacciDirection(i,2048),h=ts(d).groundHeightM;if(h>-4000||h>depth)continue;
    const up=d,ref=Math.abs(up[1])>.9?[1,0,0]:[0,1,0],e=[ref[1]*up[2]-ref[2]*up[1],ref[2]*up[0]-ref[0]*up[2],ref[0]*up[1]-ref[1]*up[0]],en=Math.hypot(...e),east=e.map(v=>v/en);
    const north=[up[1]*east[2]-up[2]*east[1],up[2]*east[0]-up[0]*east[2],up[0]*east[1]-up[1]*east[0]];
    let open=true;for(let k=0;k<16&&open;k++){const a=k/16*2*Math.PI,s=300000/R,q=up.map((v,j)=>v+(east[j]*Math.cos(a)+north[j]*Math.sin(a))*s);if(ts(q).groundHeightM>-200)open=false;}
    if(open){dir=d;depth=h;}
  }
  assert.ok(dir,'an open-ocean place');
  // Legacy selection distance: to max(sea level, ground), i.e. always the sea surface over water.
  const own=readFileSync(new URL('../src/planet-renderer.ts',import.meta.url),'utf8'),call='const near=seabedAwareNear(eye,nearest,elevation,!!resident?.ocean,this.body,snappedWaterLevelM);';
  assert.equal(own.split(call).length,2,'selection distance call site');
  const legacySource=own.replace(call,'const near=Math.max(1e-9,eye.distanceTo(new THREE.Vector3(...nearest).multiplyScalar(1+Math.max(this.body.water?snappedWaterLevelM*this.relief:-Infinity,elevation)/this.body.radiusM)));');
  const legacy=await rendererModule({prefix:'atlas-render-bounds-legacy-',rendererSource:legacySource});
  // Orbit to the sea surface, then down to 100 m above the seabed. Each stage
  // runs until the frontier has been unchanged for 20 frames (max 400).
  const stages=[2e6,5e5,1e5,2e4,1e4,5000,3000,600,depth+100];
  const run=async module=>{
    const fx=createRenderer(module,body),camera=new module.THREE.PerspectiveCamera(65,16/9,1e-9,4),rows=[];
    try{
      for(const alt of stages){
        const eye=dir.map(v=>v*(1+alt/R)),up=new module.THREE.Vector3(...dir),f=new module.THREE.Vector3(0,1,0).cross(up).normalize();
        camera.position.set(...eye);camera.up.copy(up);camera.lookAt(new module.THREE.Vector3(...eye).add(f.clone().multiplyScalar(Math.cos(.5)).addScaledVector(up,-Math.sin(.5))));camera.updateMatrixWorld(true);
        const frustum=new module.THREE.Frustum().setFromProjectionMatrix(new module.THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
        let still=0,last='',frames=0;
        for(;frames<600&&still<20;frames++){
          fx.renderer.update(eye,1080,65,1/60,false,[.6,.8,0],[frustum],undefined,null,0);await nextTurn();
          const sig=[...fx.renderer.leafIndex.keys()].sort().join();still=sig===last&&!fx.renderer.pending.size&&!fx.renderer.inbox.length?still+1:0;last=sig;
        }
        const d=fx.renderer.diagnostics(),under=[...fx.renderer.leafIndex.values()].find(t=>tileKey(directionTile(dir,t.level))===tileKey(t));
        rows.push({altitudeM:alt,frames,builds:fx.jobs.length,visible:d.visible,leaves:fx.renderer.leafIndex.size,resident:d.resident,frontierMaxLevel:d.frontierMaxLevel,levelUnderEye:under?.level??-1,vertices:d.vertices,lowFlight:d.lowFlightDetail,pressure:d.terrainPressure,pressureEntries:d.terrainPressureEntries,blocked:d.splitsBlockedByBytes,reservedMB:+(d.terrainReservedBytes/2**20).toFixed(1),budgetMB:+(d.terrainBudgetBytes/2**20).toFixed(1)});
      }
    }finally{fx.dispose();}
    return rows;
  };
  try{
    const current=await run(M.module),before=await run(legacy.module);
    report.descent={seabedM:depth,current,legacy:before};
    // Orbit to the sea surface: the frontier is byte-bound below 5 km under
    // both policies (same leaf count), so the tiles the seabed policy saves
    // are the ones it never generates: cumulative builds to 600 m.
    // Above ~5 km the seabed policy generates and draws fewer tiles; from
    // 5 km down both fill the terrain byte budget, and inside the 2 km
    // surface band both refine for the waves (equal by design).
    const at=(rows,a)=>rows.find(r=>r.altitudeM===a);
    assert.ok(at(current,1e4).builds<at(before,1e4).builds,`fewer tiles generated orbit to 10 km: ${at(current,1e4).builds} vs ${at(before,1e4).builds}`);
    assert.ok(at(current,1e4).visible<at(before,1e4).visible&&at(current,1e4).frontierMaxLevel<at(before,1e4).frontierMaxLevel,'10 km over deep water: fewer, coarser tiles');
    assert.ok(current.at(-1).levelUnderEye>before.at(-1).levelUnderEye,`100 m above the seabed the ground under the eye refines (L${current.at(-1).levelUnderEye} vs legacy L${before.at(-1).levelUnderEye})`);
  }finally{await legacy.cleanup();}
});
