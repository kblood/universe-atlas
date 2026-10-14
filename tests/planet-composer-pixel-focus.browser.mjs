/** Saved failing phase/view replay; diagnostics only, no ordinary acceptance. */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createRequire} from 'node:module';
import {acquireGpuLock} from './helpers/gpu-lock.mjs';
import {startDistPreview,stopServer} from './helpers/free-port.mjs';
import {posedSourceRois} from './helpers/planet-composer-collector.mjs';
import {startPinnedKitReference} from './helpers/planet-composer-reference.mjs';
const previous=JSON.parse(await readFile(process.env.PLANET_FOOT_REPLAY,'utf8')),world=previous.worlds[0],date=previous.failureDiagnostics.worldNs,id=process.env.PLANET_FOOT_ID??'G001/C2456,274,-369/0/planet/1:fauna:32e5fe9d',ids=(process.env.PLANET_FOOT_IDS??id).split(';'),out=resolve(process.env.ATLAS_RESULTS);await mkdir(out,{recursive:true});
const require=createRequire('C:/LLM/IWSDK/universe-atlas/package.json'),{chromium}=require('playwright'),THREE=require('three'),report={scope:'saved actual camera/date near body projection diagnostic; not ordinary acceptance',ok:false,phases:[],errors:[]};let server,lock,browser,page,reference;
try{
 server=await startDistPreview({root:process.env.ATLAS_BUILD_ROOT,dist:process.env.ATLAS_DIST});report.build=await(await fetch(new URL('build-info.json',server.base))).json();assert.equal(report.build.commit,process.env.ATLAS_EXPECT_SHA);assert.equal(report.build.dirty,false);lock=await acquireGpuLock({owner:'actual saved foot-phase confirmation',capture:true});browser=await chromium.launch({headless:true,args:['--use-angle=d3d11','--enable-gpu']});const context=await browser.newContext({viewport:{width:1440,height:1000}});page=await context.newPage();page.on('pageerror',e=>report.errors.push(String(e)));reference=await startPinnedKitReference(context,{kitRoot:process.env.PLANET_COMPOSER_KIT,receiptPath:resolve(process.env.ATLAS_BUILD_ROOT,'vendor/creature-kit/creature-kit-manifest.json')});
 const query=new URLSearchParams({seed:'LETHRA-001',g:'G001',system:world.bodyId.split('/planet/')[0],body:world.bodyId,date});await page.goto(new URL('?'+query,server.base).href);await page.waitForFunction(body=>window.__atlas?.ready&&window.__atlas.state.body?.id===body,world.bodyId,{timeout:120000});
 const eye=new THREE.Vector3(...world.arrival.approach.eye),look=new THREE.Vector3(...world.arrival.approach.target),up=eye.clone().normalize(),q=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(eye,look,up));await page.evaluate(({p,q,date})=>{const a=window.__atlas;a.setExplorationPaused(true);a.seek(date);a.setPose(p,q,8);},{p:eye.toArray(),q:q.toArray(),date});
 await page.waitForFunction(ids=>{const p=window.__atlas.renderDebug().planet;return p?.surfaceReady&&p.backlog().lifePending===0&&p.backlog().faunaTerrainPending===0&&ids.every(id=>p.faunaComposer?.drawn.has(id)&&p.faunaComposer.actors.get(id)?.tier==='near');},ids,{timeout:180000});
 const rois=await posedSourceRois(page,ids);report.rois=rois;report.camera=world.arrival.approach;report.originalFirstConservativeId=ids[0];await page.screenshot({path:out+'/normal.png'});report.ok=rois.some(x=>x.right>x.x&&x.bottom>x.y);assert.deepEqual(report.errors,[]);
}catch(e){report.failure=String(e.stack??e);throw e;}finally{await reference?.close();await browser?.close();await lock?.release();if(server?.child)await stopServer(server.child);await writeFile(out+'/report.json',JSON.stringify(report,null,2));}
