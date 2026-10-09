/** Uncaptured same-pose timing diagnosis; no screenshots or population scans in windows. */
import {chromium} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {acquireGpuLock} from './helpers/gpu-lock.mjs';
import {startDistPreview,stopServer} from './helpers/free-port.mjs';
import {CURRENT_VERSIONS,MODEL_MANIFEST_ID,encodeVersions} from '../src/time-nav.ts';
const out=process.env.ATLAS_RESULTS||'test-results/habitat-profile';await mkdir(out,{recursive:true});
const fixture=JSON.parse(await readFile('test-results/habitat-near-before/replay.json','utf8')).worlds[0],pose=fixture.views.find(v=>v.clearance===20);
const dists=JSON.parse(process.env.HABITAT_PROFILE_DISTS||'[]'),report={pose,fixture,windows:[],classification:'diagnostic; no performance acceptance'};
for(const dist of dists){let server,lock,browser;
  try{
    server=await startDistPreview({dist});lock=await acquireGpuLock({owner:'habitat uncaptured timing '+dist,capture:true,retryMs:30000});
    browser=await chromium.launch({headless:true,args:['--use-angle=d3d11','--enable-gpu']});const page=await browser.newPage({viewport:{width:1440,height:1000}});
    const params=new URLSearchParams({seed:'LETHRA-001',g:'G001',system:fixture.bodyId.split('/planet/')[0],body:fixture.bodyId,date:fixture.date,wv:encodeVersions(CURRENT_VERSIONS),mv:MODEL_MANIFEST_ID});
    await page.goto(server.base+'?'+params);await page.waitForFunction(()=>window.__atlas?.ready&&window.__atlas.terrain?.tiles?.ready,undefined,{timeout:120000});
    const cdp=process.env.HABITAT_CPU_TRACE==='1'?await page.context().newCDPSession(page):null;
    if(cdp){await cdp.send('Profiler.enable');await cdp.send('Profiler.setSamplingInterval',{interval:1000});await cdp.send('Profiler.start');}
    await page.evaluate(p=>{window.__atlas.setExplorationPaused(true);window.__atlas.setPose(p.p,p.q,p.clearance);},pose);
    await page.waitForFunction(()=>{const d=window.__atlas.terrain.tiles;return d.lifePending===0&&d.faunaTerrainPending===0;},undefined,{timeout:120000});
    const result=await page.evaluate(()=>new Promise(resolve=>{
      const a=window.__atlas,p=a.renderDebug().planet,intervals=[],longFrames=[];let previous=null,started=null,drain=2;
      function frame(){const now=performance.now();if(drain-->0){requestAnimationFrame(frame);return;}
        if(started===null){started=now;a.setProfiling(true);a.resetProfile();}
        if(previous!==null){const delta=now-previous;intervals.push(delta);if(delta>250)longFrames.push({deltaMs:delta,sample:a.perfSample(),assets:a.forestAssets,
          forest:{backlog:p.forest.backlog(),placementMs:p.forest.placementMs,selectionMs:p.forest.selectionMs,farWork:p.forest.farWorkDiagnostics}});}previous=now;
        if(now-started<8000){requestAnimationFrame(frame);return;}
        intervals.sort((x,y)=>x-y);const data={samples:intervals.length,p50:intervals[Math.floor(intervals.length*.5)],p95:intervals[Math.floor(intervals.length*.95)],max:intervals.at(-1),
          longFrames,profile:a.renderProfile,sample:a.perfSample(),assets:a.forestAssets,forest:p.forest.diagnostics()};a.setProfiling(false);resolve(data);
      }requestAnimationFrame(frame);
    }));
    report.windows.push({dist,build:server.build,result});await writeFile(out+'/report.json',JSON.stringify(report,null,2));
    if(cdp){const {profile}=await cdp.send('Profiler.stop');await writeFile(out+'/cpu-profile.json',JSON.stringify(profile));
      const weights=new Map();for(let i=0;i<profile.samples.length;i++)weights.set(profile.samples[i],(weights.get(profile.samples[i])||0)+(profile.timeDeltas[i]||0));
      const top=profile.nodes.map(n=>({function:n.callFrame.functionName,url:n.callFrame.url,line:n.callFrame.lineNumber,ms:(weights.get(n.id)||0)/1000})).sort((a,b)=>b.ms-a.ms).slice(0,15);
      await writeFile(out+'/cpu-top.json',JSON.stringify(top,null,2));console.log(JSON.stringify({cpuTop:top}));}
    console.log(JSON.stringify({dist,samples:result.samples,p95:result.p95,max:result.max,longFrames:result.longFrames.length}));
  }finally{await browser?.close();await lock?.release();if(server)await stopServer(server.child);}
}
