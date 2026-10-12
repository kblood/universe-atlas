import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
import {withGpuLock} from './helpers/gpu-lock.mjs';
import {startDistPreview,stopServer} from './helpers/free-port.mjs';
const root=process.cwd(),out=process.env.ATLAS_RESULTS??resolve(root,'test-results','animal-optimizations-world',new Date().toISOString().replace(/[:.]/g,'-'));
const scenarios=JSON.parse(await readFile(new URL('./fixtures/planet-composer-migration-scenarios.json',import.meta.url),'utf8')).worlds;
await mkdir(out,{recursive:true});let server;const report={ok:false,worlds:[],errors:[]};
try{
 server=await startDistPreview({root,dist:root+'/dist'});
 await withGpuLock({owner:'animal-optimizations-normal-world',timeoutMs:600000,retryMs:10000},async()=>{
  const browser=await chromium.launch({headless:true,args:['--use-angle=d3d11','--enable-gpu']});
  try{
   const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>report.errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
   const capture=()=>page.evaluate(()=>{
    const a=window.__atlas,p=a.renderDebug().planet,r=p.faunaComposer,d=r.diagnostics();
    const near=[...r.drawn].map(id=>r.snapshotOf(id)).filter(s=>s&&r.desired.get(s.id)?.cameraVisible&&r.desired.get(s.id)?.distanceM<35);
    let exactNear=0,maxError=0;for(const id of r.drawn){const c=r.desired.get(id),cached=p.faunaComposerDefinitions.get(id);if(!cached||cached.key!==c.sourceKey||cached.definition!==c.definition||JSON.stringify(cached.genome)!==JSON.stringify(p.faunaGenomeOf(c.member)))throw Error('Canonical genome/definition/ID handoff differs');}for(const s of near){const c=r.desired.get(s.id),expected=r.options.pose(s.graph,c,true);for(const field of ['positions','quaternions','radialScale','chordScale'])for(let i=0;i<s.pose[field].length;i++)maxError=Math.max(maxError,Math.abs(s.pose[field][i]-expected[field][i]));if(s.presentation!==null)throw Error('Near animal unexpectedly interpolated');exactNear++;}
    return {bodyId:a.state.body.id,date:String(p.faunaTraceNs),groundRevision:p.lifePackBuilds,canonicalIds:p.faunaVisibleList.map(x=>x.member.id).sort(),genomes:p.faunaVisibleList.map(x=>({id:x.member.id,genome:p.faunaGenomeOf(x.member)})),visible:r.drawn.size,exactNear,maxNearPoseError:maxError,ownedBytes:d.ownedBytes,maxBytes:d.maxBytes,poseFailures:d.poseFailures,lastError:d.lastError,temporalSamples:d.temporalSamples,temporalFrames:d.temporalFrames,temporalBudgetFallbacks:d.temporalBudgetFallbacks,fastBoneMatrices:d.fastBoneMatrices,uploadedPaletteBytes:d.actualPaletteUploadedBytes,terrain:p.backlog(),airborne:!a.travel.walking&&!a.travel.landing};
   });
   for(const scenario of scenarios){
    await page.goto(server.base+'?seed=LETHRA-001&g=G001');await page.waitForFunction(()=>window.__atlas?.ready&&window.__atlas.state.level==='galaxy',{},{timeout:60000});
    await page.click('#find-animal-worlds');await page.waitForFunction(()=>document.querySelectorAll('[data-animal-world]').length===5);await page.click(`[data-animal-world="${scenario.bodyId}"]`);
    await page.waitForFunction(id=>window.__atlas?.state.body?.id===id,scenario.bodyId,{timeout:60000});await page.click('#find-life');
    await page.waitForFunction(()=>{const a=window.__atlas,t=a?.travel;return !t?.walking&&!t?.landing&&!t?.surfaceJourney&&!t?.autopilot&&t?.terrainCruise!==null&&a.terrain?.tiles?.surfaceReady&&t.surface.terrainClearance<=110;},{},{timeout:180000});
    await page.evaluate(()=>window.__atlas.setExplorationPaused(true));await page.waitForFunction(()=>{const p=window.__atlas?.renderDebug().planet,r=p?.faunaComposer;return p?.faunaVisibleList.some(x=>x.cameraVisible&&r?.drawn.has(x.member.id));},{},{timeout:120000});
    const approach=await page.evaluate(()=>{const a=window.__atlas,d=a.renderDebug(),p=d.planet,r=p.faunaComposer,item=p.faunaVisibleList.find(x=>x.cameraVisible&&r.drawn.has(x.member.id));if(!item)throw Error('No camera-visible animal after ordinary habitat arrival');const at=item.position.clone().multiplyScalar(p.body.radiusM),up=at.clone().normalize(),ref=up.clone().set(0,1,0);if(Math.abs(up.y)>.92)ref.set(1,0,0);const tangent=up.clone().crossVectors(ref,up).normalize(),eye=at.clone().addScaledVector(tangent,12).addScaledVector(up,8),defined=p.faunaComposerDefinitions.get(item.member.id).definition,look=at.clone().addScaledVector(up,defined.phenotype.dimensions.legReach+defined.phenotype.dimensions.torsoHeight*.5),matrix=d.camera.matrixWorld.clone().lookAt(eye,look,up),q=d.camera.quaternion.clone().setFromRotationMatrix(matrix);a.setPose(eye.toArray(),q.toArray(),8);return {id:item.member.id,definition:defined};});
    await page.waitForFunction(id=>{const p=window.__atlas.renderDebug().planet,r=p.faunaComposer,c=r?.desired.get(id);return c?.cameraVisible&&c.distanceM<35&&r.snapshotOf(id)?.pose;},approach.id,{timeout:120000});
    const before=await capture();assert(before.exactNear>0);assert.equal(before.maxNearPoseError,0);assert(before.airborne);assert(before.ownedBytes<=before.maxBytes);
    await page.evaluate(()=>window.__atlas.setExplorationPaused(false));await page.waitForTimeout(10000);const animated=await capture();const oldGenomes=new Map(before.genomes.map(x=>[x.id,JSON.stringify(x.genome)]));for(const g of animated.genomes)if(oldGenomes.has(g.id))assert.equal(JSON.stringify(g.genome),oldGenomes.get(g.id));assert.notEqual(animated.date,before.date);assert.equal(animated.maxNearPoseError,0);assert.equal(animated.poseFailures,0);assert(animated.ownedBytes<=animated.maxBytes);assert(animated.temporalFrames>0);
    await page.evaluate(()=>window.__atlas.setExplorationPaused(true));await page.screenshot({path:resolve(out,`world-${scenario.index}.png`)});
    const liveIds=await page.evaluate(()=>{const p=window.__atlas.renderDebug().planet;return p.faunaVisibleList.filter(x=>x.cameraVisible).map(x=>x.member.id);});assert(liveIds.length>0);
    await page.evaluate(()=>{window.__oldAnimalBackend=window.__atlas.renderDebug().planet.faunaComposer;});await page.click('#back');
    await page.waitForFunction(()=>window.__oldAnimalBackend.disposed,{},{timeout:10000});
    const disposal=await page.evaluate(()=>{const r=window.__oldAnimalBackend;return {ownedBytes:r.ownedBytes,actors:r.actors.size,entries:r.entries.size,ready:r.ready.size,running:!!r.running,attached:!!r.group.parent};});assert.deepEqual(disposal,{ownedBytes:0,actors:0,entries:0,ready:0,running:false,attached:false});
    report.worlds.push({disposal,scenario:scenario.bodyId,ordinaryFinderVisitHabitat:true,approach,before,animated});await writeFile(resolve(out,'progress.json'),JSON.stringify({worlds:report.worlds.length},null,2));
   }
   assert.deepEqual(report.errors,[]);report.ok=true;
  }finally{await browser.close();}
 });
}catch(error){report.failure=String(error.stack);process.exitCode=1;}finally{if(server?.child)stopServer(server.child);await writeFile(resolve(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({ok:report.ok,out,failure:report.failure,worlds:report.worlds.length}));}
