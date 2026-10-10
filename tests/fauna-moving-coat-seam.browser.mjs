/** Same actual reticulated animal; natural near/LOD hysteresis, no forced rigs. */
import {chromium} from 'playwright';
import * as THREE from 'three';
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {startDistPreview,stopServer} from './helpers/free-port.mjs';
import {acquireGpuLock} from './helpers/gpu-lock.mjs';
import {CURRENT_VERSIONS,MODEL_MANIFEST_ID,encodeVersions} from '../src/time-nav.ts';
const out=process.env.ATLAS_RESULTS||'test-results/fauna-moving-coat-seam';await mkdir(out,{recursive:true});const world=JSON.parse(await readFile('C:/LLM/IWSDK/Assets/_assetctl/life-presentation-20261009/baseline-flight/replay.json','utf8')).worlds[0];
const date=String(BigInt(world.date)+BigInt(process.env.FAUNA_COAT_OFFSET_SECONDS||0)*1000000000n);
let server,browser,lock;const report={ok:false,errors:[],frames:[],target:world.target.id,scope:'natural production near-rig hysteresis of the same reticulated genotype, paired94m camera plus moving snapshots; visual review required'};
try{server=await startDistPreview({dist:process.env.ATLAS_DIST});report.build=server.build;lock=await acquireGpuLock({owner:'actual moving near to LOD coat seam',capture:true,retryMs:30000});browser=await chromium.launch({headless:true,args:['--use-angle=d3d11','--enable-gpu']});const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>report.errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
 const params=new URLSearchParams({seed:'LETHRA-001',g:'G001',system:world.bodyId.split('/planet/')[0],body:world.bodyId,date:world.date,wv:encodeVersions(CURRENT_VERSIONS),mv:MODEL_MANIFEST_ID,'fauna-lod-prototype':'float'});await page.goto(server.base+'?'+params);await page.waitForFunction(()=>window.__atlas?.ready&&window.__atlas.terrain.tiles.ready,undefined,{timeout:180000});
 const radius=await page.evaluate(()=>window.__atlas.state.body.radiusM),at=new THREE.Vector3(...world.target.position).multiplyScalar(radius),up=at.clone().normalize(),ref=Math.abs(up.y)>.92?new THREE.Vector3(1,0,0):new THREE.Vector3(0,1,0),tangent=new THREE.Vector3().crossVectors(ref,up).normalize();
 const pose=height=>{const eye=at.clone().addScaledVector(tangent,0).addScaledVector(up,height),look=at.clone().addScaledVector(up,world.target.genome.legLength+world.target.genome.torsoHeight*.5);return {p:eye.toArray(),q:new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(eye,look,up)).toArray(),clearance:height};};
 const capture=async(label,moving=false)=>{const state=await page.evaluate(id=>{const a=window.__atlas,trace=a.faunaTrace([id]),owners=a.faunaLodTrace()?.ownership.filter(x=>x.id===id)||[];return {date:a.date.offsetNs,trace,owners,travel:a.travel,quality:a.qualitySettings().renderQuality};},world.target.id);await page.screenshot({path:out+'/'+label+'.png'});report.frames.push({label,moving,state});await writeFile(out+'/report.json',JSON.stringify(report,null,2));return state;};
 for(const [label,height] of [['near30',30],['near94',94],['far110',110],['lod94',94]]){await page.evaluate(({p,date})=>{const a=window.__atlas;a.setRenderQuality('high');a.setExplorationPaused(true);a.seek(date);a.setPose(p.p,p.q,p.clearance);},{p:pose(height),date});await page.waitForTimeout(6000);
  await page.waitForFunction(()=>{const p=window.__atlas.renderDebug().planet,d=p.faunaLod.diagnostics();return d.coldJobs===0&&d.pendingResults===0&&p.faunaLod.idle&&window.__atlas.perfSample().backlog.faunaTerrainPending===0;},undefined,{timeout:180000});const state=await capture(label);
  if(label==='near94')assert(state.owners.some(x=>x.tier==='near'));if(label==='lod94')assert(state.owners.some(x=>x.tier.startsWith('lod')));
  if(label==='near94'||label==='lod94'){await page.evaluate(()=>window.__atlas.setExplorationPaused(false));for(let i=1;i<=3;i++){await page.waitForTimeout(400);await capture(label+'-moving'+i,true);}await page.evaluate(()=>window.__atlas.setExplorationPaused(true));}
 }assert.deepEqual(report.errors,[]);report.ok=true;
}finally{await browser?.close();await lock?.release();if(server)await stopServer(server.child);await writeFile(out+'/report.json',JSON.stringify(report,null,2));}
