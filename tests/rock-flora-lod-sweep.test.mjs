// Transition audit F7 (docs/transition-audit-2026-10-07.md): rock and small
// flora LOD selection has hysteresis, and the far range cuts are faded
// (dithered coverage) instead of popping. Presentation only: placement and
// identity never read any of this.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  ROCK_TIERS,ROCK_LOD_RATIOS,ROCK_RANGE_FADE,rockLod,rockLodHysteretic,rockLodHysteresisM,rockCoverage,
} from '../src/rock-field.ts';
import {PlanetRocks,ROCK_LOD_MEMORY_M} from '../src/planet-rocks.ts';
import {
  FLORA_LOD0_DISTANCE_M,FLORA_LOD1_DISTANCE_M,FLORA_VISIBLE_DISTANCE_M,FLORA_RANGE_FADE_M,FLORA_FADE_ATTRIBUTE,
  pickFloraLodBand,pickFloraLodBandHysteretic,floraCoverage,
  FloraFieldRenderer,FloraCandidateBuffer,drawFloraCandidates,
} from '../src/flora-culling.ts';
import {FLORA_KIND_NAMES} from '../src/flora-field.ts';
import {moon,moonFamilies,CORNER,saturatedRecords,eyeAt,injectSaturated,flatSampler,rockClassifier} from './rock-saturated-fixture.mjs';

const DOLLY_MAX_M=300,STEP_M=.25;
/** Outward dolly 0..300 m with a +-1 m jitter on top (per-frame steps < 1.2 m). */
const jitteredDolly=()=>Array.from({length:DOLLY_MAX_M/STEP_M+1},(_,i)=>Math.max(0,i*STEP_M+Math.sin(i*.9)));
/** +-1 m oscillation around `centre` for 200 frames. */
const oscillation=centre=>Array.from({length:200},(_,i)=>centre+Math.sin(i*.9));

/** Runs a selector with memory over a distance sequence. `switches` counts
 * changes between drawn bands (0/1/2) on consecutive drawn frames; `backward`
 * counts returns to a nearer band while the trend is outward. */
function track(pick,distances){
  let prev=-1,switches=0,backward=0,maxBand=-1;const bands=[];
  for(const d of distances){
    const band=pick(prev,d);
    if(band>=0&&prev>=0&&band!==prev){switches++;if(band<maxBand)backward++;}
    if(band>maxBand)maxBand=band;prev=band;bands.push(band);
  }
  return {switches,backward,bands};
}
/** Coverage along a fine outward sweep: monotone, bounded per-step change. */
function coverageSweep(coverage,maxSlopePerM,maxM=DOLLY_MAX_M){
  let prev=coverage(0),worstRise=0,worstStep=0;const step=.01;
  for(let d=step;d<=maxM;d+=step){
    const c=coverage(d);worstRise=Math.max(worstRise,c-prev);worstStep=Math.max(worstStep,Math.abs(c-prev));prev=c;
  }
  return {worstRise,worstStep,limit:maxSlopePerM*step+1e-9};
}

// ---------------------------------------------------------------------------
// Rocks
// ---------------------------------------------------------------------------

const ROCK_CASES=ROCK_TIERS.flatMap(tier=>[tier.sizeMin,(tier.sizeMin+tier.sizeMax)/2,tier.sizeMax].map(diameterM=>({tier,diameterM})));

test('F7 rocks: a +-1 m jittered outward dolly switches each LOD boundary once (never back), and +-1 m oscillation at a boundary switches at most once',()=>{
  for(const {tier,diameterM} of ROCK_CASES){
    const pick=(prev,d)=>rockLodHysteretic(prev,d,diameterM,tier.rangeM);
    const dolly=track(pick,jitteredDolly());
    assert.equal(dolly.backward,0,`${tier.id} ${diameterM} m: went back to a nearer LOD`);
    const reach=Math.min(tier.rangeM,ROCK_LOD_RATIOS[2]*diameterM,DOLLY_MAX_M);
    const crossed=[0,1].filter(k=>{const b=ROCK_LOD_RATIOS[k]*diameterM;return b+rockLodHysteresisM(b)+1.5<reach;}).length;
    assert.equal(dolly.switches,crossed,`${tier.id} ${diameterM} m: ${dolly.switches} switches for ${crossed} boundaries`);
    for(const k of [0,1]){
      const b=ROCK_LOD_RATIOS[k]*diameterM;if(!(b+1<tier.rangeM))continue;
      const r=track(pick,oscillation(b));
      assert.ok(r.switches<=1,`${tier.id} ${diameterM} m at ${b.toFixed(2)} m: ${r.switches} switches`);
    }
  }
});

// The rock dolly runs 0..300 m, extended to just past the tier range for the
// outcrop tier (960 m), so every tier's cut is inside the sweep.
const rockSweepM=tier=>Math.max(DOLLY_MAX_M,tier.rangeM+10);

test('F7 rocks: summed coverage is monotone along a 0..300 m dolly (outcrops: to their range), with a bounded per-metre step, and 0 wherever rockLod is -1',()=>{
  for(const {tier,diameterM} of ROCK_CASES){
    const range=tier.rangeM,last=ROCK_LOD_RATIOS[2]*diameterM;
    // Product of two smoothsteps of widths .1R and .1L: slope <= 1.5/w1 + 1.5/w2.
    const s=coverageSweep(d=>rockCoverage(d,diameterM,range),1.5/(ROCK_RANGE_FADE*range)+1.5/(ROCK_RANGE_FADE*last),rockSweepM(tier));
    assert.ok(s.worstRise<=1e-12,`${tier.id} ${diameterM}: coverage rose by ${s.worstRise}`);
    assert.ok(s.worstStep<=s.limit,`${tier.id} ${diameterM}: step ${s.worstStep} > ${s.limit}`);
    for(let d=0;d<=rockSweepM(tier);d+=.5){
      if(rockLod(d,diameterM,range)<0)assert.equal(rockCoverage(d,diameterM,range),0,`coverage beyond the cut at ${d}`);
      if(d<=(1-ROCK_RANGE_FADE)*Math.min(range,last))assert.equal(rockCoverage(d,diameterM,range),1,`full coverage inside at ${d}`);
    }
  }
});

test('F7 rocks negative case: the old hard switch flips under +-1 m oscillation, goes back on a jittered dolly, and pops coverage at the cut',()=>{
  let flips=0,back=0,pops=0;
  for(const {tier,diameterM} of ROCK_CASES){
    const hard=(_prev,d)=>rockLod(d,diameterM,tier.rangeM);
    back+=track(hard,jitteredDolly()).backward;
    for(const k of [0,1]){const b=ROCK_LOD_RATIOS[k]*diameterM;if(b+1<tier.rangeM)flips=Math.max(flips,track(hard,oscillation(b)).switches);}
    const hardCoverage=d=>rockLod(d,diameterM,tier.rangeM)<0?0:1;
    const s=coverageSweep(hardCoverage,1.5/(ROCK_RANGE_FADE*tier.rangeM)+1.5/(ROCK_RANGE_FADE*ROCK_LOD_RATIOS[2]*diameterM),rockSweepM(tier));
    if(s.worstStep>s.limit)pops++;
  }
  assert.ok(flips>30,`hard switch flips ${flips} times in 200 frames`);
  assert.ok(back>=5,`hard switch went back ${back} times`);
  assert.equal(pops,ROCK_CASES.length,'every case pops at its cut');
});

test('F7 rocks: published LODs switch at most once per rock while the eye oscillates +-1 m (PlanetRocks wiring)',()=>{
  const ALL=new THREE.Frustum(...Array.from({length:6},()=>new THREE.Plane(new THREE.Vector3(1,0,0),10)));
  const gate={surfaceSolid:true,families:moonFamilies},focus=new THREE.Vector3(...CORNER),eye0=eyeAt(moon,CORNER);
  const r=moon.radiusM,east=new THREE.Vector3(-CORNER[1],CORNER[0],0).normalize();
  const rocks=new PlanetRocks({body:moon,sample:()=>flatSampler,classify:()=>rockClassifier,drawUnitsPerFrame:Infinity});
  rocks.update({eye:eye0,focus,altitudeM:1.7,gate,relief:1,waterLevelM:0,frusta:[]});
  injectSaturated(rocks,saturatedRecords());
  // Period 40 frames: per-frame motion <= 0.16 m, inside ROCK_LOD_MEMORY_M.
  const eyes=Array.from({length:200},(_,i)=>eye0.clone().addScaledVector(east,Math.sin(i*2*Math.PI/40)/r));
  assert.ok(2*Math.PI/40<ROCK_LOD_MEMORY_M);
  const last=new Map(),changes=new Map();let frames=0;
  // Stateless reference: how many rocks the old rockLod would flip between the two extremes.
  const statelessFlips=new Set();
  const lodAt=(eye,record,k,tier)=>{const o=k*6,d=Math.hypot(record.cull[o]-eye.x,record.cull[o+1]-eye.y,record.cull[o+2]-eye.z)*r;return rockLod(d,record.cull[o+3],tier.rangeM);};
  const extremes=[eye0.clone().addScaledVector(east,1/r),eye0.clone().addScaledVector(east,-1/r)];
  rocks.tiers.forEach((state,t)=>{for(const record of state.residents.values())for(let k=0;k<record.rocks.length;k++){
    const a=lodAt(extremes[0],record,k,ROCK_TIERS[t]),b=lodAt(extremes[1],record,k,ROCK_TIERS[t]);if(a>=0&&b>=0&&a!==b)statelessFlips.add(record.rocks[k].id);}});
  assert.ok(statelessFlips.size>20,`oscillation straddles LOD boundaries for ${statelessFlips.size} rocks`);
  for(const eye of eyes){
    rocks.update({eye,focus,altitudeM:1.7,gate,relief:1,waterLevelM:0,frusta:[ALL],shadowFrustum:null});
    const d=rocks.diagnostics();assert.equal(d.work.draw.pending,false);frames++;
    const now=new Map(rocks.publishedRocks().map(s=>{const at=s.lastIndexOf('@');return [s.slice(0,at),Number(s.slice(at+1))];}));
    for(const [id,lod] of now){const before=last.get(id);if(before!==undefined&&before!==lod)changes.set(id,(changes.get(id)??0)+1);}
    last.clear();for(const [id,lod] of now)last.set(id,lod);
  }
  // Under the old memoryless rule each of these rocks flips twice per period (10 periods).
  for(const id of statelessFlips)assert.ok((changes.get(id)??0)<=1,`rock ${id} switched LOD ${changes.get(id)} times`);
  const worst=Math.max(0,...changes.values());
  assert.ok(worst<=1,`worst per-rock LOD switches ${worst} over ${frames} frames`);
  rocks.dispose();
});

// ---------------------------------------------------------------------------
// Small flora
// ---------------------------------------------------------------------------

test('F7 flora: a +-1 m jittered outward dolly switches each band once, and +-1 m oscillation at 22/55 m switches at most once',()=>{
  const dolly=track(pickFloraLodBandHysteretic,jitteredDolly());
  assert.equal(dolly.backward,0);assert.equal(dolly.switches,2);
  for(const b of [FLORA_LOD0_DISTANCE_M,FLORA_LOD1_DISTANCE_M])assert.ok(track(pickFloraLodBandHysteretic,oscillation(b)).switches<=1,`at ${b} m`);
  // Without memory it is exactly the old banding.
  for(let d=0;d<=DOLLY_MAX_M;d+=.125)assert.equal(pickFloraLodBandHysteretic(-1,d),pickFloraLodBand(d));
});

test('F7 flora: coverage is monotone along a 0..300 m dolly, bounded per metre, 1 inside the fade and 0 beyond the range',()=>{
  const s=coverageSweep(floraCoverage,1.5/FLORA_RANGE_FADE_M);
  assert.ok(s.worstRise<=1e-12,`rise ${s.worstRise}`);assert.ok(s.worstStep<=s.limit,`step ${s.worstStep} > ${s.limit}`);
  assert.equal(floraCoverage(FLORA_VISIBLE_DISTANCE_M-FLORA_RANGE_FADE_M),1);
  assert.equal(floraCoverage(FLORA_VISIBLE_DISTANCE_M),0);assert.equal(floraCoverage(FLORA_VISIBLE_DISTANCE_M+.01),0);
});

test('F7 flora negative case: the old hard banding flips under +-1 m oscillation and pops coverage at 120 m',()=>{
  const hard=(_prev,d)=>pickFloraLodBand(d);
  for(const b of [FLORA_LOD0_DISTANCE_M,FLORA_LOD1_DISTANCE_M])assert.ok(track(hard,oscillation(b)).switches>30,`at ${b} m`);
  const dolly=track(hard,jitteredDolly());
  assert.ok(dolly.backward>=1&&dolly.switches>2,`hard banding: ${dolly.switches} switches (${dolly.backward} back) for 2 boundaries`);
  const s=coverageSweep(d=>pickFloraLodBand(d)<0?0:1,1.5/FLORA_RANGE_FADE_M);
  assert.ok(s.worstStep>s.limit,'the hard cut is a coverage step');
});

test('F7 flora: owners keep their band through drawFloraCandidates while the camera oscillates +-1 m; fade reaches the instance buffer',()=>{
  const renderer=new FloraFieldRenderer(()=>new THREE.BoxGeometry(1,1,1),()=>new THREE.MeshLambertMaterial());
  const box=1e5,planes=new Float32Array([1,0,0,box,-1,0,0,box,0,1,0,box,0,-1,0,box,0,0,1,box,0,0,-1,box]);
  const plants=[],matrix=new THREE.Matrix4();
  // Plants at each inner boundary, spread around, plus some inside the range fade.
  for(const distance of [FLORA_LOD0_DISTANCE_M,FLORA_LOD1_DISTANCE_M,FLORA_VISIBLE_DISTANCE_M-6])
    for(let k=0;k<8;k++)plants.push({x:distance+(k-3.5)*.1,kind:FLORA_KIND_NAMES[k%FLORA_KIND_NAMES.length],owner:{}});
  const run=withOwners=>{
    const buffer=new FloraCandidateBuffer(64),changes=new Map(),last=new Map();
    for(let i=0;i<200;i++){
      const camera={x:Math.sin(i*.9),y:0,z:0};
      buffer.clear();
      for(const p of plants){matrix.makeTranslation(p.x,0,0);buffer.push(p.kind,p.x,0,0,.2,matrix.elements,withOwners?p.owner:null);}
      drawFloraCandidates(buffer,renderer,camera,planes);
      plants.forEach((p,j)=>{const d=Math.abs(p.x-camera.x),band=pickFloraLodBandHysteretic(withOwners?(last.get(j)??-1):-1,d);
        if(withOwners){assert.equal(p.owner.floraLod,band,'owner holds the drawn band');}
        const before=last.get(j);if(before!==undefined&&before>=0&&band>=0&&before!==band)changes.set(j,(changes.get(j)??0)+1);last.set(j,band);});
    }
    return Math.max(0,...changes.values());
  };
  assert.ok(run(true)<=1,'with owners: at most one switch per plant');
  for(const p of plants)delete p.owner.floraLod;
  assert.ok(run(false)>20,'negative case: without owners (old banding) plants flip every few frames');
  // Coverage of a plant in the range fade reaches the bucket's instance attribute.
  const buffer=new FloraCandidateBuffer(4);matrix.makeTranslation(FLORA_VISIBLE_DISTANCE_M-6,0,0);
  buffer.push('grass',FLORA_VISIBLE_DISTANCE_M-6,0,0,.2,matrix.elements,{});
  drawFloraCandidates(buffer,renderer,{x:0,y:0,z:0},planes);
  const bucket=renderer.bucketFor('grass',2),fade=bucket.mesh.geometry.getAttribute(FLORA_FADE_ATTRIBUTE);
  assert.equal(bucket.instanceCount,1);assert.ok(Math.abs(fade.array[0]-floraCoverage(FLORA_VISIBLE_DISTANCE_M-6))<1e-6);
  assert.ok(fade.array[0]>0&&fade.array[0]<1);
  // The bucket material carries the dither; its program key says so.
  assert.match(bucket.mesh.material.customProgramCacheKey(),/atlas-flora-fade-1$/);
  const shader={vertexShader:'#include <begin_vertex>',fragmentShader:'#include <clipping_planes_fragment>',uniforms:{}};
  bucket.mesh.material.onBeforeCompile(shader);
  assert.match(shader.vertexShader,/attribute float floraFade/);assert.match(shader.fragmentShader,/discard/);
});
