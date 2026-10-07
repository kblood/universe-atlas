// Transition audit F3 (docs/transition-audit-2026-10-07.md): the ground-life
// altitude gate (flora + fauna) has hysteresis, so a flight that holds the
// threshold no longer flickers all life on and off.
// The renderer wiring (planet-renderer.ts, ground-life branch) is a needs:
// line of this change; this test pins the gate it is to call.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PLANET_DETAIL,altitudeGate} from '../src/planet-detail.ts';

const ENTER=PLANET_DETAIL.groundLifeAltitudeM,EXIT=PLANET_DETAIL.groundLifeAltitudeExitM;
/** Runs the gate over an altitude sequence; returns states and transitions. */
function run(altitudes,enter,exit,on=false){
  const states=[];let transitions=0;
  for(const a of altitudes){const next=altitudeGate(on,a,enter,exit);if(next!==on)transitions++;on=next;states.push(on);}
  return {states,transitions,on};
}
/** Descend from 600 m to the gate, then hover at gate +- 3 m for 200 frames. */
function hover(centre,amp=3,frames=200){
  const out=[];for(let a=600;a>centre+amp;a-=10)out.push(a);
  for(let i=0;i<frames;i++)out.push(centre+amp*(.7*Math.sin(i*.7)+(i%2?.3:-.3)));
  return out;
}

test('F3 life gate: constants keep the old enter threshold and add an exit above it',()=>{
  assert.equal(ENTER,350,'enter threshold is the old 350 m gate');
  assert.ok(EXIT>ENTER+6,'the band is wider than a +-3 m hover');
});

test('F3 life gate: hovering at 350 +- 3 m for 200 frames makes exactly one transition',()=>{
  const altitudes=hover(ENTER);
  assert.ok(altitudes.slice(-200).some(a=>a>=ENTER)&&altitudes.slice(-200).some(a=>a<ENTER),'the hover straddles the threshold');
  const r=run(altitudes,ENTER,EXIT);
  assert.equal(r.transitions,1,`transitions ${r.transitions}`);
  assert.equal(r.on,true,'life is on after descending into the band');
  // Climbing back out: one more transition, at the exit altitude.
  const climb=[];for(let a=340;a<=500;a+=2)climb.push(a);
  let on=true,offAt=null;for(const a of climb){const next=altitudeGate(on,a,ENTER,EXIT);if(on&&!next)offAt=a;on=next;}
  assert.equal(offAt,EXIT,'switches off where the altitude reaches the exit');
  // Climbing from the ground into a hover at the exit altitude +- 3 m also switches once.
  const up=[];for(let a=0;a<EXIT-3;a+=10)up.push(a);
  for(let i=0;i<200;i++)up.push(EXIT+3*(.7*Math.sin(i*.7)+(i%2?.3:-.3)));
  const u=run(up,ENTER,EXIT,false);
  assert.equal(u.transitions,2,'on near the ground, then off once in the exit hover');assert.equal(u.on,false);
});

test('F3 life gate negative case: with exit == enter (the old gate) the same hover oscillates',()=>{
  const r=run(hover(ENTER),ENTER,ENTER);
  assert.ok(r.transitions>30,`old gate transitions ${r.transitions}`);
  // exit == enter is exactly the old memoryless test altitudeM < groundLifeAltitudeM.
  for(const a of [-10,0,349.999,350,350.001,380,1e6,NaN])for(const prev of [false,true])
    assert.equal(altitudeGate(prev,a,ENTER,ENTER),a<ENTER);
});

test('F3 altitude gate: outside the band the state is the memoryless one; bad bands are refused',()=>{
  for(const prev of [false,true]){
    assert.equal(altitudeGate(prev,ENTER-1,ENTER,EXIT),true);
    assert.equal(altitudeGate(prev,EXIT,ENTER,EXIT),false);
    assert.equal(altitudeGate(prev,NaN,ENTER,EXIT),false);
  }
  assert.equal(altitudeGate(false,ENTER+1,ENTER,EXIT),false);assert.equal(altitudeGate(true,ENTER+1,ENTER,EXIT),true);
  assert.throws(()=>altitudeGate(false,0,EXIT,ENTER),RangeError);
});
