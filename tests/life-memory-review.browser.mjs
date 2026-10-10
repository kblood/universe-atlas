import {chromium} from 'playwright';
import {build} from 'esbuild';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {acquireGpuLock} from './helpers/gpu-lock.mjs';
import {startDistPreview,stopServer} from './helpers/free-port.mjs';
import {CURRENT_VERSIONS,MODEL_MANIFEST_ID,encodeVersions} from '../src/time-nav.ts';
const out=process.env.ATLAS_RESULTS||'test-results/life-memory-review';await mkdir(out,{recursive:true});
const fixtures=JSON.parse(await readFile('C:/LLM/IWSDK/Assets/_assetctl/life-presentation-20261009/baseline-flight/replay.json','utf8'));
const bundle=await build({entryPoints:['tests/helpers/life-memory-review.mjs'],bundle:true,format:'iife',globalName:'LifeMemoryReview',write:false});
const report={poseFixtureBuild:fixtures.sourceBuild,runs:[]};let browser,lock,server;
try{
  server=await startDistPreview({dist:process.env.ATLAS_DIST||'dist'});report.sampledAppBuild=server.build;
  lock=await acquireGpuLock({owner:'aggregate life memory review',capture:true,retryMs:30000});browser=await chromium.launch({headless:true,args:['--use-angle=d3d11','--enable-gpu']});
  for(const world of fixtures.worlds){
    const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),run={world:world.bodyId,date:world.date,errors:[]};report.runs.push(run);
    page.on('pageerror',e=>run.errors.push(String(e)));
    const params=new URLSearchParams({seed:'LETHRA-001',g:'G001',system:world.bodyId.split('/planet/')[0],body:world.bodyId,date:world.date,wv:encodeVersions(CURRENT_VERSIONS),mv:MODEL_MANIFEST_ID});
    await page.goto(server.base+'?'+params);await page.waitForFunction(()=>window.__atlas?.ready&&window.__atlas.terrain?.tiles?.ready,undefined,{timeout:180000});
    await page.evaluate(p=>{window.__atlas.setExplorationPaused(true);window.__atlas.setPose(p.p,p.q,p.clearance);},world.views[0]);
    // Allow the first update to admit life/terrain work before testing queues.
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    await page.waitForFunction(()=>{const a=window.__atlas,b=a.perfSample().backlog,f=a.forestAssets;return b.terrainPending===0&&b.lifePending===0&&b.faunaTerrainPending===0&&!f.loading;},undefined,{timeout:180000});
    await page.addScriptTag({content:bundle.outputFiles[0].text});
    run.memory=await page.evaluate(candidateTypedBytes=>{
      const a=window.__atlas,p=a.renderDebug().planet,d=a.terrain.tiles,collect=kind=>{const meshes=new Set();for(const root of p.profilingObjects(kind))root.traverse(o=>{if(o.isMesh)meshes.add(o);});return [...meshes];};
      const hostArrays=[],seen=new Set();
      const typed=(value,depth=0)=>{if(!value||depth>6||seen.has(value))return;seen.add(value);if(ArrayBuffer.isView(value)){hostArrays.push(value);return;}if(Array.isArray(value)){for(const v of value)typed(v,depth+1);}else if(Object.getPrototypeOf(value)===Object.prototype)for(const v of Object.values(value))typed(v,depth+1);};
      for(const resident of p.lifeResidents.values()){typed(resident.ground);typed(resident.floraPose);typed(resident.floraRecipe);}
      for(const slot of p.faunaNear.slots)typed(slot.pose);
      const memory=LifeMemoryReview.lifeMemoryReview({floraMeshes:collect('flora'),faunaMeshes:collect('fauna'),
        faunaCachedGeometry:[...p.faunaNear.cache.values()].map(x=>x.geometry),hostArrays,skeletons:p.faunaNear.slots.map(s=>s.skeleton),
        forestAccounting:p.forest.diagnostics().memoryAccounting,reportedFaunaBytes:d.faunaAllocatedBytes,lifeReserveBytes:d.lifeReserveBytes,
        coreAccountedBytes:d.coreAccountedBytes??d.accountedBytes,coreReservedCombinedBytes:d.reservedCombinedBytes,candidateTypedBytes});
      const forest=p.forest.diagnostics(),forestMeshes=new Set();for(const kind of ['forestNear','forestMiddle','forestFar'])for(const root of p.profilingObjects(kind))root.traverse(o=>{if(o.isMesh)forestMeshes.add(o);});
      const ids=d.faunaDrawn.map(x=>x.id);
      return {...memory,runtime:{forestResourceState:forest.resourceState??'allocated',forestAllocatedBytes:forest.allocatedBytes,
        forestMeshCount:forestMeshes.size,forestWorker:!!p.forest.worker,canopyWorker:!!p.forest.fullCanopy?.worker,
        trees:forest.visible,treeSamples:p.forest.detailedSamples(),faunaTrace:a.faunaTrace(ids),flora:d.floraSubmittedCount}};
    },Number(process.env.CANDIDATE_TYPED_BYTES||0));
    await context.close();await writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({world:run.world,cpu:run.memory.lifeRetainedCpuBytes,gpu:run.memory.lifeGpuEstimateBytes}));
  }
}finally{await browser?.close();await lock?.release();if(server)await stopServer(server.child);await writeFile(out+'/report.json',JSON.stringify(report,null,2));}
