// Behavioural test of PlanetRendererOptions.presentationContinuity (decisions
// D1/D3, 2026-10-07, Opus-decided on Kasper's instruction;
// docs/transition-audit-2026-10-07.md F3/F5/F7/F12/F13).
//
// tests/life-cpu-digest.test.mjs is an optimisation-identity gate against
// e6a0b39 and runs with the option OFF, so it cannot see this feature. This
// file drives the same real renderer and life fixture (tests/life-scenario.mjs)
// with the option ON and a stepped clock (performance.now = frame * 1000/60,
// constant within a frame), because the near-rig cross-fade is timed by the
// wall clock and the identity scenario freezes it at 0.
//
// (a) the stepped-clock scenario is deterministic: two runs, identical digests;
// (b) walking and fast flight through the 80/95 m near-rig band produce real
//     cross-fades (a frame with `fading` and a rig weight strictly in (0,1)),
//     and the same slice with the option off produces none; no rig that is
//     still on screen (camera-visible, <= 110 m) is ever hard-dropped;
// (c) a hover alternating 340 m and 365 m keeps the life gate open on every
//     frame after entry when on (350 m in / 380 m out) and toggles when off;
// (d) the hidden-life invariants still hold with the option on;
// (e) an observer receding from a herd sees rigs fade out past the 95 m exit
//     with no hard drop; with the former 95 m candidate cut patched back in
//     (negative case) the same exits become hard drops.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {lifeRendererModule,runLifeScenario,digestPoses,moveAlong,SITE_A,DATE} from './life-scenario.mjs';

const LEGACY={faunaGenerator:'archive-quadruped'};
const ON={...LEGACY,presentationContinuity:true};
const CLOCK_STEP_MS=1000/60;
const EXIT_M=95,LISTED_M=EXIT_M+15;
// digestPoses() 'walk' (136) .. 'high' (307-314): walking, no-shadow, fast
// flight at 30 m/s (rigs fade in through the 80 m entry), hover, paused
// flight, the climb out of the life gate and the closed gate above 400 m.
const SLICE=[136,315];

/** Per frame: the near-rig fade state read straight from the renderer, and
 * every hard drop (`unlistedDrops`) of a member that was still on screen. */
function fadeProbe(){
  const frames=[],onScreenDrops=[];let previous=new Map(),drops=0;
  return {frames,onScreenDrops,onFrame(i,renderer){
    const d=renderer.faunaNear.diagnostics(),active=new Map(d.activeMembers.map(m=>[m.id,m]));
    const visible=new Map(renderer.faunaVisibleList.map(x=>[x.member.id,x]));
    if((d.unlistedDrops??0)>drops)for(const id of previous.keys()){
      const v=visible.get(id);
      if(!active.has(id)&&v?.cameraVisible&&v.distance<=LISTED_M)onScreenDrops.push({i,id,distanceM:v.distance});
    }
    drops=d.unlistedDrops??0;previous=active;
    frames.push({i,fading:d.fading===true,weights:d.activeMembers.map(m=>m.rigWeight).filter(w=>w!==undefined),
      fadingOutBeyondExit:d.activeMembers.filter(m=>m.fadingOut===true&&m.rigWeight>0&&m.rigWeight<1&&(visible.get(m.id)?.distance??0)>EXIT_M).length,
      unlistedDrops:drops});
  }};
}

test('presentation continuity: stepped-clock scenario is deterministic, cross-fades, never hard-drops an on-screen rig, hides',async()=>{
  const fixture=await lifeRendererModule({prefix:'atlas-life-cont-'});
  try{
    const poses=digestPoses().slice(...SLICE);
    assert.equal(poses[0].phase,'walk');
    assert.ok(poses.some(p=>p.phase==='fast-flight')&&poses.filter(p=>p.clearanceM>=400).length>=5,'slice covers flight and the closed gate');
    const options={rendererOptions:ON,clockStepMs:CLOCK_STEP_MS};

    // (a) Determinism with the option on.
    const probe=fadeProbe();
    const a=await runLifeScenario(fixture.module,poses,{...options,onFrame:probe.onFrame});
    const b=await runLifeScenario(fixture.module,poses,options);
    assert.equal(a.digests.length,poses.length);
    const first=a.digests.findIndex((digest,i)=>digest!==b.digests[i]);
    assert.equal(first,-1,first<0?'':`continuity runs differ first at frame ${first} (digestPoses ${SLICE[0]+first}, ${poses[first].phase})`);

    // (b) Real cross-fades on, none off; exits that are still on screen fade.
    const fades=probe.frames.filter(f=>f.fading&&f.weights.some(w=>w>0&&w<1));
    assert.ok(fades.length>0,'a frame with a fading rig at a weight strictly between 0 and 1');
    assert.deepEqual(probe.onScreenDrops,[],'no camera-visible rig within 110 m is hard-dropped');
    const offProbe=fadeProbe();
    const off=await runLifeScenario(fixture.module,poses,{rendererOptions:LEGACY,clockStepMs:CLOCK_STEP_MS,onFrame:offProbe.onFrame});
    assert.equal(offProbe.frames.filter(f=>f.fading||f.weights.some(w=>w>0&&w<1)).length,0,'no fade with the option off');
    assert.ok(a.stats.maxRigs>=3&&off.stats.maxRigs>=3,`near rigs active (on ${a.stats.maxRigs}, off ${off.stats.maxRigs})`);
    assert.notDeepEqual(a.digests,off.digests,'the option changes the life output by design');

    // (d) Hidden-life invariants with the option on (cf. life-cpu-digest's S6 test).
    assert.ok(a.hidden.length>=5,`life gate closed on some frames (${a.hidden.length})`);
    for(const h of a.hidden){
      assert.deepEqual(h.floraCounts,[0,0,0],`frame ${h.i}: flora present/survivor/submitted`);
      assert.equal(h.floraMeshInstances,0,`frame ${h.i}: no flora instances drawn`);
      assert.equal(h.backlog[0],0,`frame ${h.i}: backlog floraSubmitted`);
      assert.equal(h.backlog[1],0,`frame ${h.i}: backlog faunaVisible`);
      assert.equal(h.faunaDrawn,0);
    }
    console.log(`# continuity slice: ${poses.length} frames, ${fades.length} mid-fade frames, ${a.hidden.length} hidden, off-camera hard drops ${probe.frames.at(-1).unlistedDrops}`);
  }finally{await fixture.cleanup();}
});

test('presentation continuity: 340/365 m hover keeps the life gate open (350 in / 380 out); off toggles',async()=>{
  const fixture=await lifeRendererModule({prefix:'atlas-life-hover-'});
  // The gate's outcome is whether update() runs updateLife or hideLife this
  // frame; at 340-365 m nothing is in draw range either way, so count calls.
  const proto=fixture.module.PlanetRenderer.prototype,saved={updateLife:proto.updateLife,hideLife:proto.hideLife};
  let shown=null;
  proto.updateLife=function(...args){shown=true;return saved.updateLife.apply(this,args);};
  proto.hideLife=function(...args){shown=false;return saved.hideLife.apply(this,args);};
  try{
    const poses=[];
    for(let i=0;i<24;i++)poses.push({direction:SITE_A,clearanceM:i%2?365:340,yawDeg:0,pitchDeg:-6,dateNs:DATE,shadow:true,phase:'hover'});
    const run=async rendererOptions=>{
      const gate=[];
      await runLifeScenario(fixture.module,poses,{rendererOptions,clockStepMs:CLOCK_STEP_MS,onFrame:()=>{gate.push(shown);return false;}});
      return gate;
    };
    const on=await run(ON),off=await run(LEGACY);
    assert.equal(on.length,poses.length);
    assert.equal(on[0],true,'entry at 340 m');
    assert.ok(on.every(Boolean),`on: life shown on every frame after entry (${on.map(Number).join('')})`);
    assert.deepEqual(off,poses.map(p=>p.clearanceM<350),`off: toggles with the 350 m threshold (${off.map(Number).join('')})`);
  }finally{Object.assign(proto,saved);await fixture.cleanup();}
});

test('presentation continuity: receding exits fade past 95 m; the former 95 m candidate cut hard-drops them (negative)',async()=>{
  // Start of the 'walk' phase, then back away from the view at 25 m/s
  // (realtime date) so the herd ahead recedes through 80/95/110 m in view.
  const start=digestPoses()[SLICE[0]],poses=[];
  let direction=start.direction,dateNs=start.dateNs;
  const RECEDE_FRAMES=360; // 150 m ≥ 80 m entry + 15 m listed band + margin, so any rig that was active at the start crosses 95 m in view whatever the site
  for(let i=0;i<RECEDE_FRAMES;i++){dateNs+=BigInt(Math.round(1e9/60));direction=moveAlong(direction,start.yawDeg+180,25/60);poses.push({...start,direction,dateNs,phase:'recede'});}
  const source=readFileSync(new URL('../src/planet-renderer.ts',import.meta.url),'utf8');
  const widened='if(item.distance>FAUNA_NEAR_RIG_EXIT_M){if(item.distance>FAUNA_NEAR_RIG_EXIT_M+15)break;if(!this.faunaNear.holds(item.member.id))continue;}';
  assert.equal(source.split(widened).length,2,'widened near-candidate cut anchor');
  const run=async sharedSources=>{
    const fixture=await lifeRendererModule({prefix:'atlas-life-recede-',sharedSources});
    try{const probe=fadeProbe();await runLifeScenario(fixture.module,poses,{rendererOptions:ON,clockStepMs:CLOCK_STEP_MS,onFrame:(i,r)=>{probe.onFrame(i,r);return false;}});return probe;}
    finally{await fixture.cleanup();}
  };
  const current=await run({});
  assert.ok(current.frames.some(f=>f.fadingOutBeyondExit>0),'a rig keeps fading out past the 95 m exit');
  assert.equal(current.frames.at(-1).unlistedDrops,0,'no hard drop while receding');
  // Negative: the former cut (`item.distance>FAUNA_NEAR_RIG_EXIT_M` -> break) with the option on.
  const former=await run({'src/planet-renderer.ts':source.replace(widened,'if(item.distance>FAUNA_NEAR_RIG_EXIT_M)break;')});
  assert.equal(former.frames.some(f=>f.fadingOutBeyondExit>0),false,'former cut: nothing is listed past 95 m');
  assert.ok(former.frames.at(-1).unlistedDrops>0,`former cut: the receding exit is a hard drop (${former.frames.at(-1).unlistedDrops})`);
});

// FAUNA-NEAR-DROP reproducer (climate-m1-decision-4 ruling 2, 2026-10-08; Opus-decided on Kasper's instruction,
// overrulable). The receding path above, 360 frames, but from the harness site as it was before surface-climate-2
// moved SITE_A. Frozen here on purpose: tests/harness-sites.mjs SITE_A_M before R5-ATLAS-CLIMATE-M1 (main c6526d0;
// kept there as SITE_A_CLIMATE1_M), not imported, so the reproducer cannot move with a future site change. On main
// c6526d0 the option-on renderer hard-drops 3 camera-visible rigs INSIDE the 95 m exit (frames 150/155/156 at
// 89.6/91.1/86.6 m), identically with and without the widened cut: a second drop path, not the 95 m cut.
// Hypothesis (not established): eviction when the 6-rig active cap is full and a nearer candidate enters.
// The owner removes `todo` in the fix. docs/surface-climate-v2.md section 6d.
const SITE_A_PRE_M1_M=Object.freeze([4075043.7,-1510938.2,2845723.8]);
test('presentation continuity: no camera-visible rig is hard-dropped inside the 95 m exit on a 360-frame recede from the pre-M1 site',
  {todo:'FAUNA-NEAR-DROP: visible rig hard-dropped inside the 95 m exit (pre-existing on main; see docs/surface-climate-v2.md §6d)'},async t=>{
  const l=Math.hypot(...SITE_A_PRE_M1_M),site=SITE_A_PRE_M1_M.map(x=>x/l);
  // digestPoses()[SLICE[0]] is the first 'walk' pose: one 1.6/60 m step from the site at the walk yaw; only its
  // direction depends on the site, so rebuild that step from the frozen site and keep everything else.
  const walk=digestPoses()[SLICE[0]],start={...walk,direction:moveAlong(site,walk.yawDeg,1.6/60)},poses=[];
  let direction=start.direction,dateNs=start.dateNs;
  for(let i=0;i<360;i++){dateNs+=BigInt(Math.round(1e9/60));direction=moveAlong(direction,start.yawDeg+180,25/60);poses.push({...start,direction,dateNs,phase:'recede'});}
  const fixture=await lifeRendererModule({prefix:'atlas-life-neardrop-'});
  try{
    const probe=fadeProbe();
    await runLifeScenario(fixture.module,poses,{rendererOptions:ON,clockStepMs:CLOCK_STEP_MS,onFrame:(i,r)=>{probe.onFrame(i,r);return false;}});
    const inside=probe.onScreenDrops.filter(d=>d.distanceM<EXIT_M);
    t.diagnostic(`near-drop ${JSON.stringify(inside.map(d=>({frame:d.i,distanceM:+d.distanceM.toFixed(1)})))}`);
    assert.deepEqual(inside,[],`camera-visible rigs hard-dropped inside ${EXIT_M} m`);
  }finally{await fixture.cleanup();}
});
