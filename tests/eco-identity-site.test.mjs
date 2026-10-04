// ECO-CLASS-1 identity at the harness site (biome increment 2, P3).
// The LIVE classifier (surface-biomes + terrain at the catalogue sea) puts the
// harness's living inland site SITE_A, and its robustness rings, in the
// LEGACY_BEHAVIOUR_CLASSES {4,5,6}, so increment-2 life consumers keep their
// increment-1 behaviour there. Re-run by P1 at M3 and by the coordinator
// after each merge. Never retune physics to pass it: move the site with the
// deterministic search (tests/harness-sites.mjs) or stop for an owner decision.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {galaxies,refByAddress,system} from '../src/catalog.ts';
import {terrainSampler} from '../src/terrain.ts';
import {biomeClassifier} from '../src/surface-biomes.ts';
import {climateForcingFor} from '../src/surface-climate.ts';
import {LEGACY_BEHAVIOUR_CLASSES,ECO_CLASS_CALIBRATION as K,ecoClassOfBiomeSample,groundLookOf} from '../src/eco-class.ts';
import {HARNESS_SEED,HARNESS_SYSTEM_ID,HARNESS_BODY_ID,SITE_A,SITE_RULE} from './harness-sites.mjs';

const body=system(refByAddress(galaxies(HARNESS_SEED)[0],HARNESS_SYSTEM_ID)).planets[1];
const sample=terrainSampler(body),classify=biomeClassifier(body),lapse=climateForcingFor(body).lapseKPerM;
const norm=v=>{const l=Math.hypot(...v);return v.map(x=>x/l);};
const d0=[...SITE_A],ax=Math.abs(d0[1])<.9?[0,1,0]:[1,0,0];
const u=norm([ax[1]*d0[2]-ax[2]*d0[1],ax[2]*d0[0]-ax[0]*d0[2],ax[0]*d0[1]-ax[1]*d0[0]]);
const v=[d0[1]*u[2]-d0[2]*u[1],d0[2]*u[0]-d0[0]*u[2],d0[0]*u[1]-d0[1]*u[0]];
function at(d){const t=sample(d),r=classify(d,t.groundHeightM,1);return {cls:ecoClassOfBiomeSample(r,t.groundHeightM,lapse,true),r,h:t.groundHeightM};}
function ring(radiusM,n){const out=[];for(let k=0;k<n;k++){const a=k*2*Math.PI/n,s=radiusM/body.radiusM;out.push(at(norm(d0.map((x,i)=>x+(u[i]*Math.cos(a)+v[i]*Math.sin(a))*s))));}return out;}
const histogram=pts=>{const h={};for(const p of pts)h[p.cls]=(h[p.cls]||0)+1;return h;};

test('the harness body is Maithea at the catalogue sea',()=>{
  assert.equal(body.id,HARNESS_BODY_ID);
  assert.equal(body.name,'Maithea');
});

test('SITE_A centre is a legacy-behaviour class, and its live ground look is all zeros',()=>{
  const c=at(d0);
  assert.ok(LEGACY_BEHAVIOUR_CLASSES.has(c.cls),`SITE_A class ${c.cls}`);
  const ta=c.r.annualMeanTempK,tw=c.r.warmestMonthK,tc=2*ta-tw;
  // Measured 2026-10-04 on terrain-1.8.0-relief / surface-climate-1.1: class 6,
  // Tc 290.60 K, 0.55 K below the tropical boundary. Report the margin so a
  // climate change that eats it is visible before the class flips.
  console.log(`# SITE_A class ${c.cls}, h ${c.h.toFixed(1)} m, Ta ${ta.toFixed(2)} K, Tc ${tc.toFixed(2)} K, tropical margin ${(K.TROPICAL_COLDEST_K-tc).toFixed(3)} K`);
  const look=groundLookOf(tw,ta,tc,c.r.effectiveMoisture,c.r.treeline01,c.r.slopeDeg,new Float32Array(4));
  assert.deepEqual([...look],[0,0,0,0],'P4 groundLook must reproduce the legacy fragment path at the harness site');
});

test('SITE_A robustness rings (SITE_RULE 500/1000/2000 m) and the 5 and 10 km rings are all legacy-behaviour classes',()=>{
  for(const r of SITE_RULE.ringsM){const pts=ring(r,SITE_RULE.ringSamples);assert.ok(pts.every(p=>LEGACY_BEHAVIOUR_CLASSES.has(p.cls)),`${r} m ring ${JSON.stringify(histogram(pts))}`);}
  for(const r of [5000,10000]){const pts=ring(r,64);assert.ok(pts.every(p=>LEGACY_BEHAVIOUR_CLASSES.has(p.cls)),`${r} m ring ${JSON.stringify(histogram(pts))}`);}
});

// The biome2 plan (P3, measured pre-relief on b0f3882) asked for a 60 km ring
// of 64 points. After terrain-1.8.0-relief SITE_A moved 11.6 km and the coast
// lies inside 60 km: measured 2026-10-04 {6:25, 7:18, 11:6, ocean:15}; the
// 20 km ring is {6:59, 7:5}. Physics is not retuned to fit; the ring radius is
// an owner/BIOME2-REPLAN decision (docs/eco-class-v1.md §6).
test('SITE_A 60 km ring of 64 points is all legacy-behaviour classes',
  {todo:'OPEN (owner / BIOME2-REPLAN): post-relief 60 km ring crosses the coast and the tropical boundary {6:25,7:18,11:6,ocean:15}; ring radius to be re-baselined'},()=>{
  const pts=ring(60000,64);
  assert.ok(pts.every(p=>LEGACY_BEHAVIOUR_CLASSES.has(p.cls)),JSON.stringify(histogram(pts)));
});
