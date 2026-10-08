// R5-ATLAS-CLIMATE-M1 step 8 STOP evidence: numbers for tests/life-continuity-scenario.test.mjs:117 ("receding exits fade
// past 95 m") on whichever checkout runs it (its own tests/harness-sites.mjs SITE_A). Same poses and probe as the test
// (current arm only). Read-only. Usage (from a checkout root): node <this>
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=pathToFileURL(resolve('.')+'/').href;
const {lifeRendererModule,runLifeScenario,digestPoses,moveAlong,SITE_A}=await import(root+'tests/life-scenario.mjs');
const EXIT_M=95,SLICE0=136;
const start=digestPoses()[SLICE0],poses=[];let direction=start.direction,dateNs=start.dateNs;
for(let i=0;i<100;i++){dateNs+=BigInt(Math.round(1e9/60));direction=moveAlong(direction,start.yawDeg+180,25/60);poses.push({...start,direction,dateNs,phase:'recede'});}
const fixture=await lifeRendererModule({prefix:'atlas-life-diag-'}),frames=[];
try{
  await runLifeScenario(fixture.module,poses,{rendererOptions:{presentationContinuity:true},clockStepMs:1000/60,onFrame:(i,r)=>{
    const d=r.faunaNear.diagnostics(),vis=r.faunaVisibleList,dist=vis.map(x=>x.distance).sort((a,b)=>a-b);
    frames.push({i,active:d.activeMembers.length,fadingOut:d.activeMembers.filter(m=>m.fadingOut===true).length,
      fadingOutBeyondExit:d.activeMembers.filter(m=>m.fadingOut===true&&m.rigWeight>0&&m.rigWeight<1&&(vis.find(x=>x.member.id===m.id)?.distance??0)>EXIT_M).length,
      visible:vis.length,within110:dist.filter(x=>x<=110).length,nearestM:dist[0]??null,unlistedDrops:d.unlistedDrops??0});return false;}});
}finally{await fixture.cleanup();}
const pick=k=>frames.map(f=>f[k]);
console.log(JSON.stringify({site:SITE_A,startPhase:start.phase,startClearanceM:start.clearanceM,frames:frames.length,
  maxActiveRigs:Math.max(...pick('active')),framesWithFadingOut:frames.filter(f=>f.fadingOut>0).length,
  framesFadingOutBeyondExit:frames.filter(f=>f.fadingOutBeyondExit>0).length,maxVisible:Math.max(...pick('visible')),
  maxWithin110:Math.max(...pick('within110')),nearestMFirst:frames[0].nearestM,nearestMLast:frames.at(-1).nearestM,
  nearestMMin:Math.min(...pick('nearestM').filter(x=>x!==null)),unlistedDropsLast:frames.at(-1).unlistedDrops,
  sample:frames.filter((_,i)=>i%10===0)},null,1));
