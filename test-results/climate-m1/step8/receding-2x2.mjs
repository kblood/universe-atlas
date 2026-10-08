// R5-ATLAS-CLIMATE-M1, climate-m1-decision-3 ruling 1 gates 1-2: the receding-exit scenario of
// tests/life-continuity-scenario.test.mjs:117 at RECEDE_FRAMES=360, both arms (current renderer and the former 95 m cut)
// on whichever checkout runs it (its own SITE_A). fadeProbe and the poses are copied verbatim from the test; the
// assertions are evaluated, not changed. Read-only. Usage (from a checkout root): node <this> <label>
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=pathToFileURL(resolve('.')+'/').href;
const {lifeRendererModule,runLifeScenario,digestPoses,moveAlong,SITE_A}=await import(root+'tests/life-scenario.mjs');
const ON={presentationContinuity:true},CLOCK_STEP_MS=1000/60,EXIT_M=95,LISTED_M=EXIT_M+15,SLICE=[136,315],RECEDE_FRAMES=360;
function fadeProbe(){ // verbatim from the test
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
const start=digestPoses()[SLICE[0]],poses=[];
let direction=start.direction,dateNs=start.dateNs;
for(let i=0;i<RECEDE_FRAMES;i++){dateNs+=BigInt(Math.round(1e9/60));direction=moveAlong(direction,start.yawDeg+180,25/60);poses.push({...start,direction,dateNs,phase:'recede'});}
const source=readFileSync(new URL('src/planet-renderer.ts',root),'utf8');
const widened='if(item.distance>FAUNA_NEAR_RIG_EXIT_M){if(item.distance>FAUNA_NEAR_RIG_EXIT_M+15)break;if(!this.faunaNear.holds(item.member.id))continue;}';
const run=async sharedSources=>{
  const fixture=await lifeRendererModule({prefix:'atlas-life-2x2-',sharedSources});
  try{const probe=fadeProbe();await runLifeScenario(fixture.module,poses,{rendererOptions:ON,clockStepMs:CLOCK_STEP_MS,onFrame:(i,r)=>{probe.onFrame(i,r);return false;}});return probe;}
  finally{await fixture.cleanup();}
};
const sum=p=>({framesFadingOutBeyondExit:p.frames.filter(f=>f.fadingOutBeyondExit>0).length,firstFadePast95Frame:p.frames.find(f=>f.fadingOutBeyondExit>0)?.i??null,unlistedDropsLast:p.frames.at(-1).unlistedDrops,onScreenDrops:p.onScreenDrops.length,onScreenDropDetail:p.onScreenDrops.map(d=>({frame:d.i,distanceM:+d.distanceM.toFixed(1)}))});
const current=sum(await run({})),former=sum(await run({'src/planet-renderer.ts':source.replace(widened,'if(item.distance>FAUNA_NEAR_RIG_EXIT_M)break;')}));
const checks={currentFadesPast95:current.framesFadingOutBeyondExit>0,currentNoHardDrop:current.unlistedDropsLast===0,
  formerNothingPast95:former.framesFadingOutBeyondExit===0,formerHardDrops:former.unlistedDropsLast>0};
console.log(JSON.stringify({label:process.argv[2]||'',site:SITE_A,recedeFrames:RECEDE_FRAMES,current,former,checks,pass:Object.values(checks).every(Boolean)}));
