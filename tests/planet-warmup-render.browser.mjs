import {chromium} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {acquireGpuLock} from './helpers/gpu-lock.mjs';
import {startDistPreview,stopServer} from './helpers/free-port.mjs';
import {CURRENT_VERSIONS,MODEL_MANIFEST_ID,encodeVersions} from '../src/time-nav.ts';
const out=process.env.ATLAS_RESULTS||'test-results/planet-warmup-render';await mkdir(out,{recursive:true});
const world=JSON.parse(await readFile('C:/LLM/IWSDK/Assets/_assetctl/life-presentation-20261009/baseline-flight/replay.json','utf8')).worlds[1],pose=world.views[0];
const dists=JSON.parse(process.env.WARMUP_DISTS),report={world:world.bodyId,pose,runs:[]};
let browser,lock;
try{
  lock=await acquireGpuLock({owner:'warmup settled rendering parity',capture:true,retryMs:30000});browser=await chromium.launch({headless:true,args:['--use-angle=d3d11','--enable-gpu']});
  for(let di=0;di<dists.length;di++){
    let server,context;
    try{
      server=await startDistPreview({dist:dists[di]});context=await browser.newContext({viewport:{width:1440,height:1000}});const page=await context.newPage();
      const run={dist:dists[di],build:server.build,errors:[]};report.runs.push(run);page.on('pageerror',e=>run.errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')run.errors.push(m.text());});
      const params=new URLSearchParams({seed:'LETHRA-001',g:'G001',system:world.bodyId.split('/planet/')[0],body:world.bodyId,date:world.date,wv:encodeVersions(CURRENT_VERSIONS),mv:MODEL_MANIFEST_ID});
      await page.goto(server.base+'?'+params);await page.waitForFunction(()=>window.__atlas?.ready&&window.__atlas.terrain?.tiles?.ready,undefined,{timeout:180000});
      await page.evaluate(p=>{window.__atlas.setExplorationPaused(true);window.__atlas.setPose(p.p,p.q,p.clearance);},pose);
      await page.waitForFunction(()=>{const a=window.__atlas,b=a.perfSample().backlog,f=a.terrain.tiles.forest?.detailedTrees;return b.terrainPending===0&&b.lifePending===0&&b.faunaTerrainPending===0&&f?.ready&&f.farAtlas?.families?.every(x=>x.state==='ready');},undefined,{timeout:180000});
      run.measurement=await page.evaluate(async()=>{
        const a=window.__atlas,d=a.renderDebug(),r=d.renderer,p=d.planet,buffer=r.renderBufferDirect,objects=p.shadowWarmupObjects.bind(p);
        const collect=async disabled=>{
          if(disabled)p.shadowWarmupObjects=()=>[];else p.shadowWarmupObjects=objects;
          const frames=[],calls=[];r.renderBufferDirect=function(camera,scene,geometry,material,object,group){calls.push({pass:camera===d.camera?'main':'shadow',name:object.name,type:object.type,triangles:(group?.count??geometry.index?.count??geometry.attributes.position?.count??0)/3*(object.isInstancedMesh?object.count:1)});return buffer.apply(this,arguments);};
          let previous=null;
          for(let i=0;i<120;i++)await new Promise(resolve=>requestAnimationFrame(()=>{if(previous!==null)frames.push({calls:calls.splice(0),profile:a.renderProfile.lastDrawCalls,triangles:a.renderProfile.lastTriangles,backlog:a.perfSample().backlog});else calls.length=0;previous=true;resolve();}));
          r.renderBufferDirect=buffer;return {disabled,frames,shadow:a.qualitySettings().shadowCache};
        };
        a.setProfiling(true);a.resetProfile();const enabled=await collect(false),disabled=await collect(true);p.shadowWarmupObjects=objects;
        const capture=p.shadowWarmupCaptureTarget?.(),cast=d.light.castShadow,target=r.getRenderTarget(),materials=new Map();
        for(const root of objects())root.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])materials.set(m,{side:m.side,version:m.version});});
        for(const root of objects())await r.compileAsync(root,d.camera,d.scene);
        const mutations=[...materials].filter(([m,s])=>m.side!==s.side||m.version!==s.version).map(([m,s])=>({name:m.name,type:m.type,before:s,after:{side:m.side,version:m.version}}));
        const restored={light:d.light.castShadow===cast,target:r.getRenderTarget()===target};
        a.setProfiling(false);return {enabled,disabled,mutations,restored,ids:a.terrain.tiles.faunaDrawn.map(x=>x.id),forest:a.terrain.tiles.forest.visible};
      });
      await page.screenshot({path:`${out}/${di}.png`});await writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({dist:di,errors:run.errors,mutations:run.measurement.mutations,restored:run.measurement.restored}));
    }finally{await context?.close();if(server)await stopServer(server.child);}
  }
}finally{await browser?.close();await lock?.release();await writeFile(out+'/report.json',JSON.stringify(report,null,2));}
