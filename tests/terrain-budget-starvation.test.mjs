// Regression for the rock receipt's "stale sea after a date seek while
// hovering still" (docs/rock-acceptance-2026-09-28.md, Unresolved;
// docs/terrain-budget-2026-09-29.md). A stationary low-flight hover over
// Maithea saturates the real terrain byte budget. Before the fix, resident
// protected tiles filled the budget (99.99%), a same-key water-bucket rebuild
// was charged as a new tile, and 349 visible patches stayed stale forever.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {rendererModule,maithea,createRenderer,nextTurn} from './terrain-renderer-fixture.mjs';
import {terrainSampler} from '../src/terrain.ts';

test('saturated terrain budget: a stationary sea-level change refreshes every visible patch within budget, also after the budget shrinks',async()=>{
  const {module,cleanup}=await rendererModule({prefix:'atlas-terrain-budget-'});
  const body=maithea(),fx=createRenderer(module,body),renderer=fx.renderer,P=module.PENDING_TILE_BYTES;
  const ground=terrainSampler(body,undefined,undefined,undefined,-4500)([1,0,0]).visibleHeightM;
  // 2 km above ground: low-flight detail (drawLimit 390), no frustum, so the
  // whole horizon-visible frontier competes for the byte budget.
  const eye=[1+(ground+2000)/body.radiusM,0,0],sun=[1,0,0];
  let budgetOverride=null;
  const frame=async water=>{renderer.update(eye,1080,65,1/60,false,sun,[],undefined,null,water);await nextTurn();return renderer.diagnostics();};
  const withinBudget=(d,label)=>{
    assert.ok(d.terrainReservedBytes<=d.terrainBudgetBytes,`${label}: terrain reservation ${d.terrainReservedBytes} exceeds ${d.terrainBudgetBytes}`);
    if(budgetOverride===null)assert.ok(d.reservedCombinedBytes<=d.budgetBytes,`${label}: combined reservation ${d.reservedCombinedBytes} exceeds ${d.budgetBytes}`);
  };
  try{
    // 1. Settle at -4500 m until nothing is pending for 60 consecutive frames.
    let d,quiet=0,blockedSplits=0;
    for(let i=0;i<3000&&quiet<60;i++){d=await frame(-4500);blockedSplits=Math.max(blockedSplits,d.splitsBlockedByBytes);quiet=d.pending===0&&i>30?quiet+1:0;withinBudget(d,`settle ${i}`);}
    assert.equal(quiet,60,'initial frontier settles');
    assert.equal(d.staleWaterPatches,0);
    assert.ok(d.lowFlightDetail&&d.visible>200,`fixture is a large low-flight frontier (visible ${d.visible})`);
    assert.ok(blockedSplits>0,'the byte budget, not the leaf cap, bounds refinement');
    assert.ok(d.terrainResidentBytes>d.terrainBudgetBytes*.9&&d.terrainResidentBytes<=d.terrainSplitCeilingBytes,
      `refinement stops at the split ceiling: resident ${d.terrainResidentBytes} ceiling ${d.terrainSplitCeilingBytes}`);
    assert.equal(d.refreshReserveBytes,renderer.workers.length*2*P,'refresh reserve is maxInFlight worst-case tiles');
    assert.equal(d.terrainPressure,false);
    const frontier=JSON.stringify(d.debug.activeTileIds);

    // 2. Stationary seek to the next water bucket: every visible patch must
    // refresh without any selection change, and reservation stays in budget.
    const seek=async(water,label)=>{
      let frames=0,stalePeak=0,blocked=0;
      for(;frames<1200;frames++){
        d=await frame(water);withinBudget(d,`${label} frame ${frames}`);
        stalePeak=Math.max(stalePeak,d.staleWaterPatches);blocked+=d.blockedRefreshes;
        if(d.staleWaterPatches===0&&d.pending===0&&frames>0)break;
      }
      return {frames,stalePeak,blocked,final:d.staleWaterPatches};
    };
    const first=await seek(-4475,'seek -4475');
    assert.ok(first.stalePeak>200,`seek makes the frontier stale (${first.stalePeak})`);
    assert.equal(first.final,0,`stale patches resolve (${JSON.stringify(first)})`);
    assert.equal(first.blocked,0,'no same-key refresh is byte-blocked at the split ceiling');
    // Two installs per frame is the resolution rate: 60 fps -> 3 s is 180 frames.
    assert.ok(first.frames<=Math.ceil(first.stalePeak/2)+30,`resolved in ${first.frames} frames for ${first.stalePeak} patches`);
    assert.equal(JSON.stringify(d.debug.activeTileIds),frontier,'a stationary refresh leaves the drawn frontier unchanged');

    // 3. Shrink the budget below the resident frontier while stationary. The
    // renderer must merge and evict without any camera change, leave pressure
    // below the exit fraction, then still refresh a new sea level in budget.
    budgetOverride=Math.floor(d.terrainResidentBytes*.85);
    Object.defineProperty(renderer,'terrainBudgetBytes',{configurable:true,get:()=>budgetOverride});
    let recovered=-1,entered=false,exitResident=null,quietFrames=0,wasPressure=false;
    for(let i=0;i<2400;i++){
      d=await frame(-4475);entered||=d.terrainPressure;
      if(wasPressure&&!d.terrainPressure)exitResident??=d.terrainResidentBytes;
      wasPressure=d.terrainPressure;
      if(exitResident!==null)withinBudget(d,`post-pressure ${i}`);
      quietFrames=entered&&!d.terrainPressure&&d.pending===0?quietFrames+1:0;
      if(quietFrames>=30){recovered=i;break;}
    }
    assert.ok(entered,'stationary budget shrink enters pressure');
    assert.ok(recovered>=0,`pressure resolves while stationary (resident ${d.terrainResidentBytes} budget ${budgetOverride})`);
    assert.ok(exitResident<budgetOverride*.9,`pressure exits below the 0.90 fraction (${exitResident/budgetOverride})`);
    assert.ok(d.terrainResidentBytes<=d.terrainSplitCeilingBytes,'refinement regrows only to the split ceiling');
    const second=await seek(-4450,'seek -4450 after shrink');
    assert.equal(second.final,0,`stale patches resolve under the shrunk budget (${JSON.stringify(second)})`);
    // Hysteresis: a stationary view settles; it does not cycle 0.90 <-> 0.94.
    let settled=null,changes=0,pressureFrames=0;
    for(let i=0;i<240;i++){
      d=await frame(-4450);withinBudget(d,`post-shrink hold ${i}`);
      pressureFrames+=d.terrainPressure?1:0;
      const ids=JSON.stringify(d.debug.activeTileIds);
      if(i>=120){if(settled!==null&&ids!==settled)changes++;settled=ids;}
    }
    assert.equal(pressureFrames,0,'no pressure re-entry while stationary');
    assert.equal(changes,0,'drawn frontier is stable while stationary');
  }finally{fx.dispose();await cleanup();}
});
