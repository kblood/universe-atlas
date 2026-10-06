// render-bounds-1 (relief round 2026-10, P5-RENDER-BOUNDS) test suite, shared
// by two entry files (not a test file itself):
// - tests/render-bounds.test.mjs: the small working subset registered in
//   `npm test` (seconds);
// - tests/render-bounds-evidence.test.mjs: the plan's full sample counts and
//   the open-ocean descent, run explicitly (`npm run test:render-bounds-evidence`,
//   several minutes).
// Contract: conservative but tight tile bounds, the per-tile horizon, the
// seabed-distance detail policy, landing heights from the body's own height
// bound. (The cloud-deck part of plan (E) is deferred until P4 lowers relief.)
import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {rendererModule,createRenderer,nextTurn} from '../terrain-renderer-fixture.mjs';
import {galaxies,refByAddress,system} from '../../src/catalog.ts';
import {buildTile,readTileMetadata,directionTile,tileDirection,tileKey} from '../../src/planet-tiles.ts';
import {peakCorrectionMaxLevel} from '../../src/lod-ladder.ts';
import {terrainSampler} from '../../src/terrain.ts';
// T6 decisions 2 and 3: global site selection and the landing candidate heights read the level-0 field (main.ts
// exploreTerrain lands on level-0 candidates, landing-site decision 2); tile builds, containment, false-cull poses and
// the seabed placement keep the truth / each tile's own level.
import {statisticSampler} from './statistic-level.mjs';
import {oceanHypsometry,fibonacciDirection,levelForLoss} from '../../src/ocean-volume.ts';
import {oceanPatchCullProof} from '../../src/ocean-patch-culling.ts';
import {placeAt} from '../../src/place-query.ts';
import {CATALOGUE_EPOCH_NS} from '../../src/world-time.ts';
import {pickLandingSite,landingCandidate,LANDING_SUMMIT_PERCENTILE} from '../../src/landing-site.ts';

const RENDERER_SOURCE=new URL('../../src/planet-renderer.ts',import.meta.url);
const g0=galaxies('LETHRA-001')[0];
const FIXTURE={Maithea:['G001/C2128,0,1/0',1],Selawyn:['G001/C2142,3,4/0',0],Raiva:['G001/C2143,4,3/0',1],Lethuris:['G001/C2142,6,1/1',1]};
const WORLDS=Object.entries(FIXTURE).map(([name,[a,i]])=>{const sys=system(refByAddress(g0,a));return {name,sys,body:sys.planets[i]};});
const parentOf=t=>({face:t.face,level:t.level-1,x:Math.floor(t.x/2),y:Math.floor(t.y/2)});
const percentile=(v,p)=>{const s=[...v].sort((a,b)=>a-b);return s[Math.min(s.length-1,Math.floor(p*(s.length-1)+.5))];};

/** Sizes: tiles (containment children per world), ratioTiles (per world and
 * level), poses (false-cull poses per world), poolLevels/poolRepeats (false-cull
 * tile pool), landingEyes, descent (run the two-renderer open-ocean descent). */
export function renderBoundsSuite({tiles,ratioTiles,poses,poolLevels,poolRepeats,landingEyes,descent}){
  const report=globalThis.__renderBoundsReport={};
  let M,RB,THREE;
  before(async()=>{M=await rendererModule({prefix:'atlas-render-bounds-'});RB=M.module.rendererExports;THREE=M.module.THREE;});
  after(async()=>{await M?.cleanup();if(process.env.RENDER_BOUNDS_REPORT)console.log('RENDER_BOUNDS_REPORT '+JSON.stringify(report));});

  // RENDER_BOUNDS_SEED: an out-of-sample stream (the margins were measured on
  // the default one).
  let seed=Number(process.env.RENDER_BOUNDS_SEED||0x2545f491);const rnd=()=>{seed^=seed<<13;seed>>>=0;seed^=seed>>>17;seed^=seed<<5;seed>>>=0;return seed/4294967296;};
  const randDir=()=>{const z=rnd()*2-1,a=rnd()*2*Math.PI,q=Math.sqrt(1-z*z);return [q*Math.cos(a),q*Math.sin(a),z];};
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
    const ts=terrainSampler(body),pick=statisticSampler(body),dirs=Array.from({length:4096},(_,i)=>fibonacciDirection(i,4096)),h=dirs.map(d=>pick(d).groundHeightM);
    let summit=0,deep=0,coast=0,land=0;
    for(let i=0;i<dirs.length;i++){if(h[i]>h[summit])summit=i;if(h[i]<h[deep])deep=i;if(Math.abs(h[i])<Math.abs(h[coast]))coast=i;if(h[i]>2000&&h[i]<6000&&!land)land=i;}
    return {ts,summit:dirs[summit],deep:dirs[deep],coast:dirs[coast],land:dirs[land||summit],random:randDir()};
  }
  /** main.ts exploreTerrain's site loop (no sun term), over `height(d)` with
   * the walkable test "land at the dated sea". Returns the picked height. */
  function landingPick(height,eye,sea,ceiling,ref){
    let best=-Infinity,site=null;
    for(let i=0;i<384;i++){
      const y=1-2*(i+.5)/384,phi=i*2.399963229728653,r=Math.sqrt(1-y*y),d=[Math.cos(phi)*r,y,Math.sin(phi)*r],h=height(d);
      if(h<sea||h-sea>ceiling)continue;
      const score=(d[0]*eye[0]+d[1]*eye[1]+d[2]*eye[2])*2+Math.min(1,(h-sea)/ref)*.12;
      if(score>best){best=score;site=h;}
    }
    return site;
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

  test(`candidate bounds contain every child tile built under a resident parent (0 violations, ${tiles} children per world)`,()=>{
    const out={};
    for(const {name,body} of WORLDS){
      // 1 mm: Float32 vertex storage relative to the tile anchor.
      const R=body.radiusM,{summit,coast}=sitesFor(body),tol=1e-3/R;let violations=0,checked=0;const worst=[];
      for(let k=0;k<tiles;k++){
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

  test(`candidate/tight sphere ratio p50 <= 1.5 at L10 and <= 2 at L14, L18 on all four worlds (${ratioTiles} tiles per level; legacy 20 km envelope for comparison)`,()=>{
    const out={};
    for(const {name,body} of WORLDS){
      const R=body.radiusM;out[name]={};
      for(const L of [10,14,18]){
        const ratios=[],legacy=[];
        for(let k=0;k<ratioTiles;k++){
          const child=directionTile(randDir(),L),parent=parentOf(child),pd=tile(body,parent),cd=tile(body,child);
          const patches=new Map([[tileKey(parent),{data:pd,ocean:null}]]);
          const center=new THREE.Vector3(...tileDirection(child,.5,.5));
          const candidate=RB.candidateTileSphere(child,center,patches,body,1,0).sphere.radius;
          const tight=RB.residentTileBounds(patchOf(body,cd),R).sphere.radius;
          ratios.push(candidate/tight);legacy.push((Math.min(1.8,2/2**L*1.42)+20000/R)/tight);
        }
        out[name][`L${L}`]={p50:percentile(ratios,.5),p90:percentile(ratios,.9),legacyP50:percentile(legacy,.5)};
        assert.ok(percentile(ratios,.5)<=(L===10?1.5:2),`${name} L${L} ratio p50 ${percentile(ratios,.5)}`);
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

  test(`0 false culls over ${poses} poses (ground, 2 km, 20 km, orbit) x 4 bodies against brute force`,()=>{
    const out={};
    for(const {name,body} of WORLDS){
      const R=body.radiusM,sites=sitesFor(body),pool=[];
      for(const key of ['summit','deep','coast','land','random'])for(const L of poolLevels)for(let j=0;j<poolRepeats;j++){
        const base=sites[key],d=j?base.map(v=>v+(rnd()-.5)*3/2**L):base,n=Math.hypot(...d),child=directionTile(d.map(v=>v/n),L),parent=parentOf(child);
        if(pool.some(p=>tileKey(p.tile)===tileKey(child)))continue;
        const cd=tile(body,child),pd=tile(body,parent),patch=patchOf(body,cd),pts=[...drawnPoints(patch)];
        pool.push({tile:child,patch,parentPatches:new Map([[tileKey(parent),{data:pd,ocean:null}]]),center:new THREE.Vector3(...tileDirection(child,.5,.5)),bound:Math.min(1.8,2/2**L*1.42),pts});
      }
      const core=1+RB.renderHeightBoundM(body).minM/R;
      let falseResident=0,falseCandidate=0,bruteVisible=0,culledResident=0,bruteHidden=0;const camera=new THREE.PerspectiveCamera(65,16/9,1e-9,10);
      const kinds=['ground','2km','20km','orbit'];
      for(let k=0;k<poses;k++){
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
      out[name]={poses,tiles:pool.length,bruteVisible,falseResident,falseCandidate,bruteHidden,culledResident};
      assert.equal(falseResident+falseCandidate,0,`${name}: false culls ${JSON.stringify(out[name])}`);
      assert.ok(bruteVisible>poses/4,`${name}: the poses see tiles (${bruteVisible})`);
    }
    report.falseCulls=out;
  });

  // Owner decision (relief round 2026-10-03): the HUD TERRAIN FLIGHT flip and
  // the direct-landing route stay at a fixed 19.5 km, independent of the
  // recalibrated relief bound (3-7 km after terrain-1.8.0). Astra INT review.
  test('HUD terrain-flight / direct-landing clearance is a fixed 19.5 km on all four worlds, not the relief bound',()=>{
    for(const {name,body} of WORLDS){
      assert.equal(M.module.PlanetRenderer.lowFlightClearanceM(body),19500,name);
      assert.equal(RB.LOW_FLIGHT_CLEARANCE_M,19500);
      assert.ok(RB.renderHeightBoundM(body).maxM<19500,`${name}: bound ${RB.renderHeightBoundM(body).maxM} is below the fixed flip, so tying them would move the HUD`);
    }
  });

  test('landing finds a site on all four worlds and never above the landing ceiling',()=>{
    const out={};
    for(const {name,body} of WORLDS){
      const ts=statisticSampler(body),sea=0,ceiling=RB.landingCeilingM(body),ref=RB.landingReferenceM(body,sea),p99=RB.landPercentileM(body,.99,sea);
      assert.ok(ceiling<RB.renderHeightBoundM(body).maxM&&ref>0);
      const picks=[];
      for(let e=0;e<8;e++){
        const site=landingPick(d=>ts(d).groundHeightM,fibonacciDirection(e*61,512),sea,ceiling,ref);
        assert.ok(site!==null,`${name}: a landing site from eye ${e}`);
        assert.ok(site-sea<=ceiling,`${name}: site ${site} m is above the landing ceiling ${ceiling}`);
        picks.push(site);
      }
      // Whether a pick is a summit (>= p99 land) is the OPEN item below, not asserted here.
      out[name]={ceilingM:ceiling,referenceM:ref,p99M:p99,siteHeightsM:picks.map(Math.round),atOrAboveP99:picks.filter(h=>h>=p99).length};
    }
    report.landing=out;
  });

  // Integration 2026-10-04 (relief-round/INT): on the P4 relief terrain the
  // kept ceiling (0.8 x body bound, 4.1-5.3 km over the sea) lies ABOVE p99
  // land (2.5-4.2 km) on all four worlds, so it alone does not exclude
  // summits (ceiling-only picks at or above p99: Maithea 2, Selawyn 6, Raiva 6,
  // Lethuris 2 of 256). The owner kept the formula; landing-site-1 adds the
  // summit cap (strictly below p99 land at the dated sea) and this case runs
  // the main.ts rule itself (src/landing-site.ts pickLandingSite).
  test(`landing at the datum sea never picks a summit (${landingEyes} eyes, all four worlds)`,()=>{
    const out=report.landingDatumSea={};
    for(const {name,body} of WORLDS){
      const ts=statisticSampler(body),sea=0,ceiling=RB.landingCeilingM(body),ref=RB.landingReferenceM(body,sea),p99=RB.landPercentileM(body,LANDING_SUMMIT_PERCENTILE,sea);
      const heights=Array.from({length:384},(_,i)=>ts(landingCandidate(i,384)).groundHeightM);
      let summits=0,found=0;
      for(let e=0;e<landingEyes;e++){
        const site=pickLandingSite({height:(d,i)=>heights[i]>=sea?heights[i]:null,eye:fibonacciDirection(e,landingEyes),seaLevelM:sea,ceilingM:ceiling,summitM:p99,referenceM:ref});
        if(site){found++;if(site.heightM>=p99||site.heightM-sea>ceiling)summits++;}
      }
      out[name]={ceilingM:ceiling,p99M:p99,found,summits};
    }
    for(const [name,{summits,found,p99M}] of Object.entries(out)){
      assert.equal(found,landingEyes,`${name}: a landing site from every eye`);
      assert.equal(summits,0,`${name}: ${summits}/${landingEyes} landing picks at or above p99 land ${p99M} m`);
    }
  });

  // Astra review 2026-10-03: 80% of the analytic body bound does not by itself
  // exclude real summits. "Summit" here = at or above the 99th percentile of
  // land at the dated sea. Two targeted cases, both through the main.ts rule
  // (landingCeilingM + landingReferenceM over the dated sea):
  // - dated sea: the current terrain with its sea lowered by 60% water loss;
  // - low relief: the same field and sea scaled to 30%, so every summit lies
  //   below the ceiling (the regime P4's lower relief produces).
  const lowEyes=landingEyes;
  test(`landing at a dated (lowered) sea never picks a summit (${lowEyes} eyes, Maithea and Lethuris)`,()=>{
    const out={};
    for(const {name,body} of WORLDS.filter(w=>w.name==='Maithea'||w.name==='Lethuris')){
      const ts=statisticSampler(body),sea=Math.round(levelForLoss(body,.6)/25)*25,ceiling=RB.landingCeilingM(body),ref=RB.landingReferenceM(body,sea),p99=RB.landPercentileM(body,.99,sea);
      assert.ok(sea<-1000,`${name}: the dated sea is lowered (${sea} m)`);
      let summits=0;const heights=[];
      for(let e=0;e<lowEyes;e++){const site=landingPick(d=>ts(d).groundHeightM,fibonacciDirection(e,lowEyes),sea,ceiling,ref);assert.ok(site!==null);heights.push(site);if(site>=p99||site-sea>ceiling)summits++;}
      out[name]={seaM:sea,ceilingM:ceiling,p99M:p99,maxPickM:Math.max(...heights),summits};
      assert.equal(summits,0,`${name}: ${summits}/${lowEyes} landing picks at or above p99 land ${p99} m (sea ${sea} m)`);
    }
    report.landingDatedSea=out;
  });
  // Low relief (landing-site-1): the kept ceiling excludes nothing here, so
  // before the summit cap the rule picked by proximity (P4 terrain x0.3 at the
  // dated sea: Maithea 2, Lethuris 2 of 256 at or above p99). The main.ts rule
  // takes the summit height of the field it lands on: here the p99 of the
  // scaled field at the scaled dated sea.
  test(`landing on low relief (field and dated sea x0.3) never picks a summit (${lowEyes} eyes)`,()=>{
    const out=report.landingLowRelief={};
    for(const {name,body} of WORLDS.filter(w=>w.name==='Maithea'||w.name==='Lethuris')){
      const ts=statisticSampler(body),scale=.3,sea=Math.round(levelForLoss(body,.6)/25)*25*scale,ceiling=RB.landingCeilingM(body);
      const land=Array.from({length:4096},(_,i)=>ts(fibonacciDirection(i,4096)).groundHeightM*scale).filter(h=>h>=sea).sort((a,b)=>a-b);
      const p99=land[Math.floor(.99*(land.length-1))],ref=Math.max(1,land[Math.floor(.9*(land.length-1))]-sea);
      assert.ok(land.at(-1)-sea<ceiling,`${name}: low relief lies wholly below the ceiling`);
      const heights=Array.from({length:384},(_,i)=>ts(landingCandidate(i,384)).groundHeightM*scale);
      let summits=0;
      for(let e=0;e<lowEyes;e++){
        const site=pickLandingSite({height:(d,i)=>heights[i]>=sea?heights[i]:null,eye:fibonacciDirection(e,lowEyes),seaLevelM:sea,ceilingM:ceiling,summitM:p99,referenceM:ref});
        assert.ok(site,`${name}: a low-relief landing site from eye ${e}`);if(site.heightM>=p99)summits++;
      }
      out[name]={seaM:sea,ceilingM:ceiling,landMaxAboveSeaM:Math.round(land.at(-1)-sea),p99M:p99,summits};
    }
    // Every body is measured (and reported) before the verdict.
    for(const [name,{summits,p99M}] of Object.entries(out))assert.equal(summits,0,`${name}: ${summits}/${lowEyes} low-relief landing picks at or above p99 land ${p99M} m`);
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

  test('byte-blocked refinement is confined to a seabed dive',()=>{
    const {body}=WORLDS[0],sea=-250,band=RB.OCEAN_SURFACE_DETAIL_M;
    // Over a deep seabed: submerged, at the surface and inside the surface band.
    for(const eye of [-13000,-1,sea,sea+band-1])assert.equal(RB.renderSeabedDive(body,eye,-13500,sea),true,`eye ${eye}`);
    // Above the band over water, anywhere over land, and on a dry body: never.
    assert.equal(RB.renderSeabedDive(body,sea+band,-13500,sea),false);
    assert.equal(RB.renderSeabedDive(body,sea+5,sea+1,sea),false,'coast/land under the eye');
    assert.equal(RB.renderSeabedDive({...body,water:0},-1,-13500,sea),false);
    // The standard view poses (orbit, 2.5 km horizon, 20 km flight, 150 m
    // ground) never meet it, so their streaming frontier is the established
    // one: test-results/relief-round-2026-10-03/P5-RENDER-BOUNDS/attribution/
    // and test-results/finish-round-2026-10-04/P5-FRONTIER/.
    const own=readFileSync(RENDERER_SOURCE,'utf8');
    assert.equal(own.split('||(seabedDive&&this.splitsBlockedByBytes>0)').length,2,'merge pressure gated');
    assert.equal(own.split('(this.pending.size+(seabedDive?4:1))*PENDING_TILE_BYTES').length,2,'split reserve gated');
  });

  if(descent)test('open-ocean descent: seabed-distance selection draws fewer tiles than surface distance, and refines at the bottom',async()=>{
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
    const own=readFileSync(RENDERER_SOURCE,'utf8'),call='const near=seabedAwareNear(eye,nearest,elevation,!!resident?.ocean,this.body,snappedWaterLevelM);';
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
}
