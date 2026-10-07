// Transition audit F3 (docs/transition-audit-2026-10-07.md): the rock
// altitude gate has hysteresis. Hidden rocks turn on below
// ROCK_MAX_ALTITUDE_M - ROCK_ALTITUDE_HYSTERESIS_M; shown rocks stay on up to
// ROCK_MAX_ALTITUDE_M, which stays the hard exit (no tier can be in range above
// it), so nothing is drawn higher than before.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ROCK_MAX_ALTITUDE_M,ROCK_ALTITUDE_HYSTERESIS_M,ROCK_TIERS} from '../src/rock-field.ts';
import {altitudeGate} from '../src/planet-detail.ts';
import {PlanetRocks} from '../src/planet-rocks.ts';
import {moon,moonFamilies,CORNER,eyeAt,flatSampler,rockClassifier} from './rock-saturated-fixture.mjs';

const EXIT=ROCK_MAX_ALTITUDE_M,ENTER=ROCK_MAX_ALTITUDE_M-ROCK_ALTITUDE_HYSTERESIS_M;
const gate={surfaceSolid:true,families:moonFamilies},focus=new THREE.Vector3(...CORNER);
const hoverAt=(centre,i)=>centre+3*(.7*Math.sin(i*.7)+(i%2?.3:-.3));

/** Drives a real PlanetRocks through an altitude sequence (no frusta, so no
 * draw work) and counts gate transitions from its reported reason. */
function drive(altitudes){
  const rocks=new PlanetRocks({body:moon,sample:()=>flatSampler,classify:()=>rockClassifier});
  let on=null,transitions=0;const states=[];
  for(const altitudeM of altitudes){
    rocks.update({eye:eyeAt(moon,CORNER,altitudeM),focus,altitudeM,gate,relief:1,waterLevelM:0,frusta:[]});
    const reason=rocks.diagnostics().reason;assert.ok(reason==='ok'||reason==='altitude',reason);
    const now=reason==='ok';if(on!==null&&now!==on)transitions++;on=now;states.push(now);
  }
  rocks.dispose();
  return {transitions,on,states};
}

test('F3 rock gate: the exit is the old threshold (largest tier range); the enter sits a band below it',()=>{
  assert.equal(ROCK_MAX_ALTITUDE_M,Math.max(...ROCK_TIERS.map(t=>t.rangeM)));
  assert.equal(ROCK_MAX_ALTITUDE_M,960);
  assert.ok(ROCK_ALTITUDE_HYSTERESIS_M>6&&ROCK_ALTITUDE_HYSTERESIS_M<=100,`${ROCK_ALTITUDE_HYSTERESIS_M}`);
});

test('F3 rock gate: descending into a 200-frame hover at the enter altitude +- 3 m switches rocks on exactly once',()=>{
  const altitudes=[];for(let a=1400;a>ENTER+3;a-=20)altitudes.push(a);
  for(let i=0;i<200;i++)altitudes.push(hoverAt(ENTER,i));
  const r=drive(altitudes);
  assert.equal(r.transitions,1,`transitions ${r.transitions}`);assert.equal(r.on,true);
});

test('F3 rock gate: climbing into a 200-frame hover at 960 +- 3 m switches rocks off exactly once, never above 960',()=>{
  const altitudes=[];for(let a=2;a<EXIT-3;a+=40)altitudes.push(a);
  for(let i=0;i<200;i++)altitudes.push(hoverAt(EXIT,i));
  const r=drive(altitudes);
  assert.equal(r.transitions,1,`transitions ${r.transitions}`);assert.equal(r.on,false);
  altitudes.forEach((a,i)=>{if(a>=EXIT)assert.equal(r.states[i],false,`drawn at ${a} m`);});
});

test('F3 rock gate negative case: the old memoryless gate (exit == enter) oscillates on the same hover',()=>{
  for(const centre of [ENTER,EXIT]){
    let on=false,transitions=0;
    for(let i=0;i<200;i++){const next=altitudeGate(on,hoverAt(centre,i),centre,centre);if(next!==on)transitions++;on=next;}
    assert.ok(transitions>30,`old gate at ${centre} m: ${transitions} transitions`);
  }
  // exit == enter is exactly the pre-F3 test `altitudeM < ROCK_MAX_ALTITUDE_M`.
  for(const a of [0,959.999,960,960.001,NaN])for(const prev of [false,true])assert.equal(altitudeGate(prev,a,EXIT,EXIT),a<EXIT);
});
