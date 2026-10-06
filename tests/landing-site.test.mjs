// landing-site-1 (round 2 LANDING-FIXES, backlog task 4): the landing rules
// main.ts runs (src/landing-site.ts) on the four render-bounds fixture worlds.
// - never on a summit: 0 of 256 picks at or above p99 land, at the datum sea
//   and at the dated low sea (60% water loss), with a negative control showing
//   the kept ceiling alone does pick summits (so the assert has teeth);
// - a flooded ground bookmark resolves deterministically by
//   FLOODED_GROUND_BOOKMARK (default 'hover', OPEN owner item), and the
//   'nearest-shore' alternative takes the nearest dry ring direction.
// Report: LANDING_SITE_REPORT=1 prints the measured table as one JSON line.
import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {rendererModule} from './terrain-renderer-fixture.mjs';
import {galaxies,refByAddress,system} from '../src/catalog.ts';
import {terrainSampler} from '../src/terrain.ts';
import {fibonacciDirection,levelForLoss} from '../src/ocean-volume.ts';
import {surfaceQuery} from '../src/world-surface.ts';
import {
  LANDING_SITE_VERSION,LANDING_SUMMIT_PERCENTILE,FLOODED_GROUND_BOOKMARK,FLOODED_BOOKMARK_HOVER_M,
  SHORE_SEARCH_STEP_M,SHORE_SEARCH_MAX_M,SHORE_RING_DIRECTIONS,
  landingHeightAllowed,landingCandidate,pickLandingSite,resolveGroundBookmark,NO_LANDING_SITE_MESSAGE,
} from '../src/landing-site.ts';

const g0=galaxies('LETHRA-001')[0];
const FIXTURE={Maithea:['G001/C2128,0,1/0',1],Selawyn:['G001/C2142,3,4/0',0],Raiva:['G001/C2143,4,3/0',1],Lethuris:['G001/C2142,6,1/1',1]};
const WORLDS=Object.entries(FIXTURE).map(([name,[a,i]])=>({name,body:system(refByAddress(g0,a)).planets[i]}));
const EYES=256,COUNT=384;
const report={};
let M,RB;
before(async()=>{M=await rendererModule({prefix:'atlas-landing-site-'});RB=M.module.rendererExports;});
after(async()=>{await M?.cleanup();if(process.env.LANDING_SITE_REPORT)console.log('LANDING_SITE_REPORT '+JSON.stringify(report));});

/** Summit picks over EYES eyes with the main.ts rule; summitM=Infinity is the
 * pre-landing-site-1 rule (kept ceiling only). */
function scan(heights,sea,ceiling,ref,summitM,p99){
  let summits=0,found=0,aboveCeiling=0,maxPick=-Infinity;const picks=[];
  for(let e=0;e<EYES;e++){
    const site=pickLandingSite({height:(d,i)=>heights[i]>=sea?heights[i]:null,eye:fibonacciDirection(e,EYES),seaLevelM:sea,ceilingM:ceiling,summitM,referenceM:ref,count:COUNT});
    if(!site)continue;found++;picks.push(site.index);maxPick=Math.max(maxPick,site.heightM);
    if(site.heightM>=p99)summits++;if(site.heightM-sea>ceiling)aboveCeiling++;
  }
  return {found,summits,aboveCeiling,maxPickM:Math.round(maxPick),picks};
}

test('landingHeightAllowed: dry, at most the ceiling over the sea, strictly below the summit',()=>{
  assert.equal(LANDING_SITE_VERSION,'landing-site-1');
  assert.equal(LANDING_SUMMIT_PERCENTILE,.99);
  assert.equal(landingHeightAllowed(-1,0,5000,3000),false,'under the sea');
  assert.equal(landingHeightAllowed(0,0,5000,3000),true,'at the sea');
  assert.equal(landingHeightAllowed(2999,0,5000,3000),true);
  assert.equal(landingHeightAllowed(3000,0,5000,3000),false,'at the summit height');
  assert.equal(landingHeightAllowed(-1500,-2000,5000,9000),true,'over a lowered sea');
  assert.equal(landingHeightAllowed(3000,-2000,5000,9000),true,'exactly the kept ceiling over the sea');
  assert.equal(landingHeightAllowed(3001,-2000,5000,9000),false,'above the kept ceiling');
  assert.equal(landingHeightAllowed(100,0,5000,NaN),true,'no land: no summit cap');
  assert.equal(landingHeightAllowed(NaN,0,5000,3000),false);
});

test('landingCandidate is main.ts exploreTerrain\'s golden-angle sphere (unit, deterministic)',()=>{
  for(const i of [0,1,191,383]){const d=landingCandidate(i,COUNT);assert.ok(Math.abs(Math.hypot(...d)-1)<1e-12);assert.deepEqual(d,landingCandidate(i,COUNT));}
  assert.equal(landingCandidate(0,COUNT)[1],1-1/COUNT);
});

test(`never on a summit: 0/${EYES} picks at or above p99 land on four worlds at the datum and the dated low sea; the kept ceiling alone does pick summits`,()=>{
  const out=report.summit={};let controlSummits=0,cases=0;
  for(const {name,body} of WORLDS){
    // terrain-1.9.0-mountains (decisions addendum 4, decision 2): candidate heights in the cutoff's representation,
    // the level-0 field (main.ts landingSurfaceFor). Was the truth sampler (terrainSampler(body)); wired, that would
    // compare truth heights with the level-0 p99 and solve mountain blocks.
    const ts=terrainSampler(body,undefined,undefined,undefined,0,undefined,false,{lodLevel:0}),heights=Array.from({length:COUNT},(_,i)=>ts(landingCandidate(i,COUNT)).groundHeightM);
    const low=Math.round(levelForLoss(body,.6)/25)*25;
    out[name]={};
    for(const [label,sea] of [['datum',0],['datedLow',low]]){
      if(label==='datedLow'&&!(body.water&&low<0)){out[name][label]={skipped:`no lowered sea (water ${body.water}, level ${low} m)`};continue;}
      const ceiling=RB.landingCeilingM(body),ref=RB.landingReferenceM(body,sea),p99=RB.landPercentileM(body,LANDING_SUMMIT_PERCENTILE,sea);
      assert.ok(Number.isFinite(p99),`${name} ${label}: land exists`);
      const rule=scan(heights,sea,ceiling,ref,p99,p99),control=scan(heights,sea,ceiling,ref,Infinity,p99);
      // Determinism: the same inputs give the same picks.
      assert.deepEqual(scan(heights,sea,ceiling,ref,p99,p99).picks,rule.picks);
      const changed=rule.picks.filter((p,i)=>p!==control.picks[i]).length;
      out[name][label]={seaM:sea,ceilingM:Math.round(ceiling),p99M:Math.round(p99),found:rule.found,summits:rule.summits,maxPickM:rule.maxPickM,ceilingOnlySummits:control.summits,ceilingOnlyMaxPickM:control.maxPickM,eyesWhosePickMoved:changed};
      cases++;controlSummits+=control.summits;
      assert.equal(rule.found,EYES,`${name} ${label}: a site from every eye`);
      assert.equal(rule.aboveCeiling,0,`${name} ${label}: never above the kept ceiling`);
      assert.equal(rule.summits,0,`${name} ${label}: ${rule.summits}/${EYES} picks at or above p99 land ${p99} m`);
      // The cap only removes summit sites: an eye whose ceiling-only pick was
      // not a summit keeps exactly that pick.
      for(let e=0;e<EYES;e++)if(!(heightsOf(heights,control.picks[e])>=p99))assert.equal(rule.picks[e],control.picks[e],`${name} ${label}: eye ${e} pick unchanged`);
    }
  }
  assert.ok(cases>=6,`datum on 4 worlds plus a dated low sea on at least 2 (${cases})`);
  assert.ok(controlSummits>0,'negative control: the kept ceiling alone picks summits on this terrain');
});
const heightsOf=(h,i)=>h[i];

// A flooded ground bookmark (relief round OPEN item 12). The bookmark sampler
// is world-surface surfaceQuery at a fixed sea, as main.ts surfaceSample is.
const MAITHEA=WORLDS[0].body;
const floodSampler=(body,levelM)=>{const q=surfaceQuery(body,[{dateNs:0n,levelM}]);return d=>{const s=q(d,0n);return {walkable:s.walkable,visibleHeightM:s.visibleHeightM};};};
/** A Maithea ocean direction whose nearest dry land is a few km away (a
 * coastal bookmark the datum sea flooded), and an open-ocean one. */
function floodedSites(){
  const sample=floodSampler(MAITHEA,0),ts=terrainSampler(MAITHEA),R=MAITHEA.radiusM;let coastal=null,open=null;
  // Cheap pre-filter: dry ground somewhere on a 4 km ring (8 azimuths).
  const nearLand=d=>{const up=d,ref=Math.abs(up[1])>.9?[1,0,0]:[0,1,0],e=[ref[1]*up[2]-ref[2]*up[1],ref[2]*up[0]-ref[0]*up[2],ref[0]*up[1]-ref[1]*up[0]],en=Math.hypot(...e),east=e.map(v=>v/en),north=[up[1]*east[2]-up[2]*east[1],up[2]*east[0]-up[0]*east[2],up[0]*east[1]-up[1]*east[0]],a=4000/R;
    for(let k=0;k<8;k++){const b=k/8*2*Math.PI,q=up.map((v,j)=>v*Math.cos(a)+(east[j]*Math.cos(b)+north[j]*Math.sin(b))*Math.sin(a));if(ts(q).groundHeightM>=0)return true;}return false;};
  for(let i=0;i<20000&&(!coastal||!open);i++){
    const d=fibonacciDirection(i,20000),s=sample(d);if(s.walkable)continue;
    const h=ts(d).groundHeightM;
    if(!coastal&&h>-400&&nearLand(d)){const r=resolveGroundBookmark(d,sample,R,'nearest-shore');if(r.kind==='shore'&&r.distanceM>=1500&&r.distanceM<=5000)coastal=d;}
    if(!open&&h<-4000){const r=resolveGroundBookmark(d,sample,R,'nearest-shore');if(r.kind==='hover')open=d;}
  }
  return {sample,coastal,open};
}
let SITES;const sites=()=>SITES??=floodedSites();

test('flooded ground bookmark, default policy: keeps the saved place and hovers above the water',()=>{
  assert.equal(FLOODED_GROUND_BOOKMARK,'hover','documented default until the owner answers');
  const {sample,coastal}=sites();assert.ok(coastal,'a coastal flooded bookmark on Maithea');
  const r=resolveGroundBookmark(coastal,sample,MAITHEA.radiusM);
  assert.equal(r.kind,'hover');assert.deepEqual(r.direction,coastal.map(v=>v/Math.hypot(...coastal)));
  assert.equal(r.eyeHeightM,0+FLOODED_BOOKMARK_HOVER_M,'40 m over the datum sea surface');
  // A lowered (dated) sea moves the hover with the water surface.
  const lowSample=floodSampler(MAITHEA,-120),low=resolveGroundBookmark(coastal,lowSample,MAITHEA.radiusM);
  if(low.kind==='hover')assert.equal(low.eyeHeightM,-120+FLOODED_BOOKMARK_HOVER_M);else assert.equal(low.kind,'walk');
  (report.flooded??={}).hover={direction:r.direction,eyeHeightM:r.eyeHeightM};
});

test('flooded ground bookmark, nearest-shore policy: the first dry ring direction, deterministic; open ocean hovers',()=>{
  const {sample,coastal,open}=sites();assert.ok(coastal&&open);
  const R=MAITHEA.radiusM,r=resolveGroundBookmark(coastal,sample,R,'nearest-shore');
  assert.equal(r.kind,'shore');assert.equal(sample(r.direction).walkable,true,'the shore site is walkable');
  assert.deepEqual(resolveGroundBookmark(coastal,sample,R,'nearest-shore'),r,'deterministic');
  // Its ground distance is the ring radius, and every nearer ring is flooded.
  const u=coastal.map(v=>v/Math.hypot(...coastal)),ang=Math.acos(Math.min(1,u[0]*r.direction[0]+u[1]*r.direction[1]+u[2]*r.direction[2]));
  assert.ok(Math.abs(ang*R-r.distanceM)<1,`ring distance ${r.distanceM} vs ${ang*R}`);
  assert.equal(r.distanceM%SHORE_SEARCH_STEP_M,0);
  const nearer=r.distanceM-SHORE_SEARCH_STEP_M;
  if(nearer>0){const back=resolveGroundBookmark(coastal,d=>({...sample(d),walkable:sample(d).walkable&&Math.acos(Math.min(1,u[0]*d[0]+u[1]*d[1]+u[2]*d[2]))*R<nearer+1}),R,'nearest-shore');assert.equal(back.kind,'hover','no dry direction on a nearer ring');}
  // A walkable bookmark walks where it was saved, whatever the policy.
  const dry=resolveGroundBookmark(r.direction,sample,R,'nearest-shore');assert.equal(dry.kind,'walk');
  // Open ocean with no dry ring inside the search radius: hover.
  const o=resolveGroundBookmark(open,sample,R,'nearest-shore');assert.equal(o.kind,'hover');assert.equal(o.eyeHeightM,FLOODED_BOOKMARK_HOVER_M);
  assert.equal(SHORE_SEARCH_MAX_M/SHORE_SEARCH_STEP_M*SHORE_RING_DIRECTIONS,3840,'bounded search: 3840 samples at most');
  report.flooded.shore={distanceM:r.distanceM,direction:r.direction.map(v=>+v.toFixed(9))};
});

test('main.ts wires the landing rules: summit-capped site pick and the flooded-bookmark resolver in prepareLanding',()=>{
  const src=readFileSync(new URL('../src/main.ts',import.meta.url),'utf8').replace(/\r\n/g,'\n');
  assert.ok(src.includes('const landSummit=landPercentileM(body,LANDING_SUMMIT_PERCENTILE,landSea);'));
  // Decision 2 (addendum 4): the candidate search reads the level-0 landing surface, the landing itself the truth.
  const explore=src.slice(src.indexOf('function exploreTerrain('),src.indexOf('function startTerrainCruise('));
  assert.ok(explore.includes('const sample=landingSurfaceFor(body), sun='),'landing candidates use the level-0 surface');
  assert.ok(!/\bsurfaceFor\(/.test(explore),'no truth sampler in the candidate search');
  assert.ok(src.includes('planetSnapshotFor(sys, body, date).landingSurface(direction)'));
  assert.ok(src.includes('summitM:landSummit,referenceM:landRef'),'the plain site pick is pickLandingSite with the summit cap');
  assert.ok(src.includes('!landingHeightAllowed(s.groundHeightM,landSea,landCeiling,landSummit)'),'the living-habitat pick has the summit cap too');
  assert.ok(src.includes('if(!s.walkable&&savedPoint){'),'a restored bookmark is resolved before the terrain-search fallback');
  assert.ok(src.includes('const flooded=resolveGroundBookmark(d.toArray() as V3,'));
  // The terrain search remains only for a non-bookmark landing over water.
  assert.equal(src.split('if(!s.walkable){if(exploreTerrain())landAfterCruise=true;return;}').length,2);
});

test('landing surface (decision 2): surfaceQuery at level 0 is the level-0 field on a massif and solves no M3 block; the truth differs there',async()=>{
  const {axisSites}=await import('./helpers/mountain-coarse-tiles.mjs'),{carvingBuildStats}=await import('../src/mountain-carving.ts');
  const body=MAITHEA,sites=axisSites(body,{count:4}).map(s=>s.d),level0=terrainSampler(body,undefined,undefined,undefined,0,undefined,false,{lodLevel:0});
  const query=surfaceQuery(body,[{dateNs:0n,levelM:0}],{lodLevel:0}),before=carvingBuildStats.count,landing=sites.map(d=>query(d,0n).groundHeightM);
  assert.equal(carvingBuildStats.count,before,'no block solve for a landing candidate');
  sites.forEach((d,i)=>assert.ok(Object.is(landing[i],level0(d).groundHeightM)));
  // Negative control: on the massif axis the truth is carved below the level-0 upper envelope at some site.
  const truth=surfaceQuery(body,[{dateNs:0n,levelM:0}]),lower=sites.filter((d,i)=>truth(d,0n).groundHeightM<landing[i]).length;
  assert.ok(lower>0,`truth below level 0 at ${lower} of ${sites.length} axis sites`);
});

// No eligible site: pickLandingSite returns null (all wet, or all at a summit),
// and main.ts then starts no journey and arms no landAfterCruise.
const NO_SITE={eye:[0,1,0],seaLevelM:0,ceilingM:5000,summitM:3000,referenceM:1000,count:COUNT};
test('no eligible site: all-wet candidates give null',()=>{
  let asked=0;
  assert.equal(pickLandingSite({...NO_SITE,height:()=>{asked++;return null;}}),null,'every candidate unwalkable (flooded)');
  assert.equal(asked,COUNT,'every candidate was examined');
  assert.equal(pickLandingSite({...NO_SITE,seaLevelM:100,height:()=>99}),null,'every candidate below a raised dated sea');
  assert.notEqual(pickLandingSite({...NO_SITE,height:(d,i)=>i===7?10:null}),null,'control: one dry candidate is found');
});
test('no eligible site: every candidate rejected by the summit cap gives null; the ceiling alone would have landed',()=>{
  const height=(d,i)=>3000+i%500; // dry, under the 5000 m ceiling, all at/above the 3000 m summit
  assert.equal(pickLandingSite({...NO_SITE,height}),null);
  const control=pickLandingSite({...NO_SITE,summitM:Infinity,height});
  assert.notEqual(control,null,'control: without the summit cap a summit is picked');
  assert.ok(control.heightM>=3000);
});
test('main.ts: a null site ends the landing request (message, no journey, no landAfterCruise)',()=>{
  const src=readFileSync(new URL('../src/main.ts',import.meta.url),'utf8').replace(/\r\n/g,'\n');
  assert.ok(NO_LANDING_SITE_MESSAGE.length>0);
  const start=src.indexOf('function exploreTerrain('),end=src.indexOf('function startTerrainCruise(');
  assert.ok(start>0&&end>start);
  const body=src.slice(start,end);
  assert.ok(body.startsWith('function exploreTerrain(preferred?:THREE.Vector3,preferLife=false):boolean {'));
  const nullBranch=body.indexOf('if(!site){announce(NO_LANDING_SITE_MESSAGE);panel();return false;}'),journey=body.indexOf('surfaceJourney={');
  assert.ok(nullBranch>0&&journey>nullBranch,'the null branch returns before any surfaceJourney is created');
  assert.ok(!/if\(site\)destination=/.test(body),'no fallback to the eye direction on a null site');
  assert.ok(!/\breturn;/.test(body),'every exit of exploreTerrain returns a boolean');
  assert.ok(body.trimEnd().endsWith('return true;\n}'),'true only after a journey started');
  // Every caller that arms landAfterCruise does so only when a journey started.
  assert.equal((src.match(/landAfterCruise=true/g)||[]).length,2);
  assert.equal((src.match(/if\(exploreTerrain\(\)\)landAfterCruise=true;/g)||[]).length,2);
  assert.ok(!/exploreTerrain\([^)]*\);\s*landAfterCruise=true/.test(src),'no unconditional exploreTerrain();landAfterCruise=true');
});
