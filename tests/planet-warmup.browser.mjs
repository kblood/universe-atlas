/** Cold-context diagnostic comparison. No screenshots during measured windows. */
import {chromium} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {acquireGpuLock} from './helpers/gpu-lock.mjs';
import {startDistPreview,stopServer} from './helpers/free-port.mjs';
import {CURRENT_VERSIONS,MODEL_MANIFEST_ID,encodeVersions} from '../src/time-nav.ts';
const out=process.env.ATLAS_RESULTS||'test-results/planet-warmup';
const fixturePath=process.env.WARMUP_FIXTURE||'C:/LLM/IWSDK/Assets/_assetctl/life-presentation-20261009/baseline-flight/replay.json';
const fixture=JSON.parse(await readFile(fixturePath,'utf8'));
const dists=JSON.parse(process.env.WARMUP_DISTS||'[]');
if(dists.length!==2)throw new Error('WARMUP_DISTS needs baseline and candidate distributions');
await mkdir(out,{recursive:true});
const report={fixturePath,classification:'desktop diagnostic, cold contexts; no acceptance or savings claim',runs:[]};
const save=()=>writeFile(out+'/report.json',JSON.stringify(report,null,2));
let lock,browser;
try{
  lock=await acquireGpuLock({owner:'planet warmup cold comparison',capture:true,retryMs:30000});
  browser=await chromium.launch({headless:true,args:['--use-angle=d3d11','--enable-gpu']});
  for(let di=0;di<dists.length;di++){
    let server;
    try{
      server=await startDistPreview({dist:dists[di]});
      for(let wi=0;wi<fixture.worlds.length;wi++){
        const world=fixture.worlds[wi],pose=world.views.find(v=>v.clearance===20);
        const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();
        const run={dist:dists[di],build:server.build,world:world.bodyId,date:world.date,pose,errors:[],windows:[]};
        report.runs.push(run);
        page.on('pageerror',e=>run.errors.push(String(e)));
        page.on('console',msg=>{if(msg.type()==='error')run.errors.push(msg.text());});
        await page.addInitScript(()=>{
          window.__warmupProbe={gl:[],longTasks:[],frames:[],phase:'load'};
          const probe=window.__warmupProbe;
          new PerformanceObserver(list=>{for(const e of list.getEntries())probe.longTasks.push({start:e.startTime,duration:e.duration,phase:probe.phase});}).observe({type:'longtask',buffered:true});
          for(const proto of [WebGLRenderingContext.prototype,WebGL2RenderingContext.prototype])
            for(const name of ['compileShader','linkProgram','getProgramInfoLog','getShaderInfoLog','getProgramParameter']){
              const original=proto[name];proto[name]=function(...args){const start=performance.now();try{return original.apply(this,args);}finally{const ms=performance.now()-start;if(name!=='getProgramParameter'||ms>.5)probe.gl.push({name,start,ms,phase:probe.phase});}};
            }
          let previous;function tick(){const now=performance.now();if(previous!==undefined)probe.frames.push({start:previous,ms:now-previous,phase:probe.phase});previous=now;requestAnimationFrame(tick);}requestAnimationFrame(tick);
        });
        const params=new URLSearchParams({seed:'LETHRA-001',g:'G001',system:world.bodyId.split('/planet/')[0],body:world.bodyId,date:world.date,wv:encodeVersions(CURRENT_VERSIONS),mv:MODEL_MANIFEST_ID});
        console.log(JSON.stringify({phase:'load',dist:di,world:wi}));
        await page.goto(server.base+'?'+params);
        await page.waitForFunction(()=>window.__atlas?.ready&&window.__atlas.terrain?.tiles?.ready,undefined,{timeout:180000});
        const cdp=await context.newCDPSession(page);await cdp.send('Profiler.enable');await cdp.send('Profiler.setSamplingInterval',{interval:1000});await cdp.send('Profiler.start');
        await page.evaluate(()=>window.__atlas.setExplorationPaused(true));
        for(const [phase,clearance,ms] of [['pre-descent',1800,4000],['shadow-entry',600,4000],['cold-habitat',20,8000],['warm-habitat',20,8000]]){
          console.log(JSON.stringify({phase,dist:di,world:wi}));
          const result=await page.evaluate(async({phase,clearance,ms,pose})=>{
            const a=window.__atlas,p=window.__warmupProbe;p.phase=phase;
            if(phase!=='warm-habitat')a.setPose(pose.p,pose.q,clearance);
            a.setProfiling(true);a.resetProfile();
            const started=performance.now();await new Promise(resolve=>{function tick(){if(performance.now()-started>=ms)resolve();else requestAnimationFrame(tick);}requestAnimationFrame(tick);});
            const samples=p.frames.filter(f=>f.start>=started&&f.phase===phase).map(f=>f.ms).sort((x,y)=>x-y);
            const debug=a.renderDebug(),target=debug.renderer.getRenderTarget();
            const result={started,ended:performance.now(),samples:samples.length,p50:samples[Math.floor(samples.length*.5)],p95:samples[Math.floor(samples.length*.95)],max:samples.at(-1),profile:a.renderProfile,
              warmup:a.qualitySettings().shadowWarmup,clearance:a.travel.surface?.terrainClearance,lifePending:a.terrain.tiles.lifePending,faunaTerrainPending:a.terrain.tiles.faunaTerrainPending,
              screenTargetRestored:target===null,rendererCheckShaderErrors:debug.renderer.debug.checkShaderErrors};
            a.setProfiling(false);return result;
          },{phase,clearance,ms,pose});
          run.windows.push({phase,...result});await save();
        }
        run.snapshot=await page.evaluate(()=>{
          const a=window.__atlas,d=a.terrain.tiles,ids=d.faunaDrawn.map(x=>x.id),debug=a.renderDebug();
          return {travel:a.travel,ids,trace:a.faunaTrace(ids),forest:d.forest,flora:d.floraSubmittedCount,faunaNear:d.faunaNear,warmup:a.qualitySettings().shadowWarmup,
            quality:a.qualitySettings(),programCount:debug.renderer.info.programs.length,probe:window.__warmupProbe};
        });
        const {profile}=await cdp.send('Profiler.stop');await writeFile(`${out}/${di}-${wi}-cpu.json`,JSON.stringify(profile));
        await page.screenshot({path:`${out}/${di}-${wi}.png`});
        await context.close();await save();
      }
    }finally{if(server)await stopServer(server.child);}
  }
}finally{await browser?.close();await lock?.release();await save();}

