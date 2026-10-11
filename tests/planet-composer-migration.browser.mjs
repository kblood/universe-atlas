/** Bounded runner; the collector reads new production hooks once they exist.
 * No browser starts without explicit coordinator start, approved pins and a
 * frozen built app. Source/ground/budget collection is intentionally separate
 * from this independent acceptance oracle. */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {acquireGpuLock} from './helpers/gpu-lock.mjs';
import {startDistPreview,stopServer} from './helpers/free-port.mjs';
import {requirePlanetComposerPins,auditPlanetCanonicalCensus,auditPlanetComposerSource,auditPlanetComposerOwnership,auditPlanetComposerFeet,auditPlanetComposerBudgets} from './helpers/planet-composer-acceptance.mjs';

assert.equal(process.env.PLANET_COMPOSER_VERIFY_START,'1','NOT RUN: coordinator must authorize a frozen candidate/window');
assert(process.env.PLANET_COMPOSER_POLICY,'NOT RUN: approved owner policy path required');
assert(process.env.PLANET_COMPOSER_COLLECTOR,'NOT RUN: actual new renderer-hook collector required');
const policy=requirePlanetComposerPins(JSON.parse(await readFile(resolve(process.env.PLANET_COMPOSER_POLICY),'utf8')));
const collector=await import(pathToFileURL(resolve(process.env.PLANET_COMPOSER_COLLECTOR)).href);
for(const name of ['enterOrdinaryHabitat','collect','independentKitSource','replaySeeks','moveObserver','sessionTransition','disposeAndRevisit'])assert.equal(typeof collector[name],'function','missing actual collector method: '+name);
const fixtures=JSON.parse(await readFile(new URL('./fixtures/planet-composer-migration-scenarios.json',import.meta.url),'utf8'));
const out=resolve(process.env.ATLAS_RESULTS||'C:/LLM/IWSDK/Assets/_assetctl/planet-composer-migration-20261011/independent-runtime');await mkdir(out,{recursive:true});
const require=createRequire('C:/LLM/IWSDK/universe-atlas/package.json'),{chromium}=require('playwright');
const report={scope:'functional/source/ground/ownership/owned-resource gates only; no timing or physical headset claim',class:'HARD+CONTRACT',policy,checks:[],worlds:[],errors:[],ok:false};let server,lock,browser,page;
const audit=async(snapshot,control)=>{
 const result={canonical:auditPlanetCanonicalCensus(control,snapshot.canonical),ownership:auditPlanetComposerOwnership(snapshot.ownership,snapshot.submittedIds),budgets:auditPlanetComposerBudgets(snapshot.measured,policy),sources:[]};
 assert(snapshot.automaticComposer===true&&snapshot.airborne===true,'ordinary airborne visit selects Composer');
 for(const source of snapshot.sources){const expected=await collector.independentKitSource(source.definition,source.id,policy);result.sources.push(auditPlanetComposerSource(source,expected,policy));}
 assert(result.sources.length>0,'actual source draw required; metadata-only collection cannot pass');
 assert(snapshot.feet,'actual deformed nonflat production-foot evidence is required');result.feet=auditPlanetComposerFeet(snapshot.feet,policy);
 return result;
};
try{
 server=process.env.ATLAS_URL?{base:process.env.ATLAS_URL}:await startDistPreview({root:process.env.ATLAS_BUILD_ROOT||'.',dist:process.env.ATLAS_DIST||'dist'});
 report.build=await(await fetch(new URL('build-info.json',server.base))).json();assert.equal(report.build.commit,process.env.ATLAS_EXPECT_SHA,'frozen candidate build');assert.equal(report.build.dirty,false);
 lock=await acquireGpuLock({owner:'independent planet Composer migration gates',capture:true,retryMs:10000,timeoutMs:60000});browser=await chromium.launch({headless:true,args:['--use-angle=d3d11','--enable-gpu']});page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>report.errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
 for(const scenario of fixtures.worlds){
  const arrival=await collector.enterOrdinaryHabitat(page,server.base,scenario,policy);assert(arrival.ordinaryUiUsed===true&&arrival.airborne===true,'no forced query, landing or walking prerequisite');
  const initial=await collector.collect(page,scenario,policy),control=initial.control;assert(control,'legacy canonical control collected independently');
  const world={bodyId:scenario.bodyId,arrival,initialAudit:await audit(initial,control),snapshots:[initial]};report.worlds.push(world);await page.screenshot({path:out+'/world-'+scenario.index+'-arrival.png'});
  const seeks=await collector.replaySeeks(page,scenario,policy);assert(seeks.a.worldNs===seeks.replayedA.worldNs);world.seekAudit=auditPlanetCanonicalCensus(seeks.a,seeks.replayedA);assert.deepEqual(seeks.a.rigPoseDigests,seeks.replayedA.rigPoseDigests,'exact A-B-A rig pose replay');assert(seeks.actualMotionChanged===true,'seekB must exercise actual motion');
  const moved=await collector.moveObserver(page,scenario,policy);assert(moved.reseededIds.length===0,'camera movement cannot reseed canonical IDs');world.movement=moved;
  const xr=await collector.sessionTransition(page,'xr-simulated',scenario,policy);world.xrAudit=await audit(xr.snapshot,xr.control);assert(xr.oldWorkerTerminated&&xr.oldBindingsCleared,'session disposal releases old resources');assert.equal(xr.snapshot.session,'xr-simulated');world.xrScope='renderer/session simulation only; physical Quest acceptance not done';
  const resumed=await collector.sessionTransition(page,'desktop',scenario,policy);world.desktopResume=await audit(resumed.snapshot,resumed.control);
  const revisit=await collector.disposeAndRevisit(page,server.base,scenario,policy);assert(revisit.oldWorkerTerminated&&revisit.oldBindingsCleared&&revisit.staleAdoptions===0,'no stale/cancelled source may adopt');world.revisitAudit=await audit(revisit.snapshot,revisit.control);assert(revisit.residencyPlateauWithinPins===true,'measured repeated-visit residency plateau');world.lifecycle=revisit;
  await writeFile(out+'/report.json',JSON.stringify(report,null,2));
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(await(await fetch(new URL('build-info.json',server.base))).json(),report.build);report.ok=true;
}catch(error){report.failure=String(error.stack||error);await page?.screenshot({path:out+'/failure.png'}).catch(()=>{});throw error;}finally{await browser?.close();await lock?.release();if(server?.child)await stopServer(server.child);await writeFile(out+'/report.json',JSON.stringify(report,null,2));}
