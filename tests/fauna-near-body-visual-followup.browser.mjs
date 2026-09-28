import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { mkdir, writeFile } from 'node:fs/promises';
import { browserArgs } from './browser-options.mjs';
import { encodeVersions, CURRENT_VERSIONS } from '../src/time-nav.ts';

// Close-fauna follow-up at a saved canonical ground address.
//
// Date motion is observed by a STATIONARY grounded observer: the saved walk
// address is restored at each exact date. An in-page seek is not a
// stationary observation - seeking while grounded releases the walker into
// the documented 160 m observation hover (docs/walking-and-time.md,
// time-and-coordinates-contract.md §3.3). The previous revision seeked
// in-page and then read `travel.walking.position` from the released (null)
// walker, which threw at the shifted date. That hover path is still checked
// below, and must report the same canonical individual at the same position.
const base = process.env.ATLAS_URL || 'http://127.0.0.1:5217/';
const out = process.env.ATLAS_RESULTS || 'test-results/combined-visual-acceptance-c9ba64f/framed-followup';
const bodyId = 'G001/C2128,0,1/0/planet/1';
const radius = 5194907.072465867;
const date = '435084631200000040194500000';
const targetId = `${bodyId}:fauna:562ff898`;
const local = new THREE.Vector3(4067765.96072781,-1507043.162624909,2860322.144626968);
await mkdir(out,{recursive:true});
const up=local.clone().normalize();
const ref=Math.abs(up.y)>.92?new THREE.Vector3(1,0,0):new THREE.Vector3(0,1,0);
const tangent=new THREE.Vector3().crossVectors(ref,up).normalize();
const eye=local.clone().addScaledVector(tangent,8).addScaledVector(up,1.64);
const look=local.clone().addScaledVector(up,2.2);
const landingEye=eye.clone().normalize().multiplyScalar(radius+12);
const heading=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(landingEye,look,up));
const urlFor=t=>{const params=new URLSearchParams({seed:'LETHRA-001',g:'G001',system:'G001/C2128,0,1/0',body:bodyId});
  params.set('walk',eye.toArray().join(','));params.set('heading',heading.toArray().join(','));params.set('date',t);params.set('wv',encodeVersions(CURRENT_VERSIONS));return `${base}?${params}`;};
const shifted=(BigInt(date)+1750000000n).toString();
const browser=await chromium.launch({headless:true,args:browserArgs});
const errors=[];let phase='start';let page=null;
const cleanShot='header,#breadcrumbs,#timeline,#panel,#labels,.view-caption,.view-actions,footer,#flight-hud,#flight-reticle,#compat-notice{display:none!important}';
const checkpoint=async()=>{const s=await page?.evaluate(id=>{const a=window.__atlas;return a?{ready:a.ready,date:a.date?.offsetNs,grounded:a.travel?.walking?.grounded??null,position:a.travel?.walking?.position??null,trace:a.faunaTrace?.([id])??null,faunaDrawn:a.terrain?.tiles?.faunaDrawn?.length,faunaNear:a.terrain?.tiles?.faunaNear,forestAssets:a.forestAssets,surfaceLighting:a.surfaceLighting,tiles:{lifePending:a.terrain?.tiles?.lifePending,faunaTerrainPending:a.terrain?.tiles?.faunaTerrainPending,terrainPending:a.terrain?.tiles?.pending}}:null},targetId).catch(()=>null);await writeFile(`${out}/progress.json`,JSON.stringify({phase,state:s,errors},null,2));return s;};
const wait=async(name,predicate,timeout=150000,arg)=>{phase=name;await checkpoint();await page.waitForFunction(predicate,arg,{timeout});return checkpoint();};
/** Restore the saved ground address at an exact date, with detailed trees. */
const openGrounded=async(t,label)=>{
  if(page)await page.close();
  page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  phase=`navigate-saved-canonical-ground-address-${label}`;await page.addInitScript(()=>{const def=Object.defineProperty;Object.defineProperty=function(t,k,d){const r=Reflect.apply(def,Object,[t,k,d]);if(t===window&&k==='__atlas'&&d?.value?.setExplorationPaused){d.value.setExplorationPaused(true);Object.defineProperty=def;}return r;}});
  await page.goto(urlFor(t),{waitUntil:'networkidle'});
  await wait(`body-ready-${label}`,id=>window.__atlas?.ready&&window.__atlas.state.body?.id===id&&window.__atlas.terrain?.tiles?.ready,180000,bodyId);
  await wait(`exact-date-and-grounded-${label}`,t=>window.__atlas.date.offsetNs===t&&window.__atlas.travel.walking?.grounded,180000,t);
  await wait(`visible-population-settled-${label}`,()=>window.__atlas.terrain.tiles.faunaDrawn.length>0&&window.__atlas.terrain.tiles.lifePending===0&&window.__atlas.terrain.tiles.faunaTerrainPending===0,90000);
  const treeBefore=await page.evaluate(()=>window.__atlas.forestAssets);
  if(!treeBefore?.enabled)await page.locator('#forest-detail').click();
  let treeAfter=await page.evaluate(()=>window.__atlas.forestAssets);
  if(!treeAfter?.enabled)throw new Error(`Trees button did not enable detail: ${JSON.stringify(treeAfter)}`);
  if(treeAfter.loading){await page.waitForFunction(()=>{const x=window.__atlas?.forestAssets;return !!x&&!x.loading&&(x.ready||x.error);},null,{timeout:90000});treeAfter=await page.evaluate(()=>window.__atlas.forestAssets);}
  if(!treeAfter.ready)throw new Error(`Detailed trees unavailable: ${JSON.stringify(treeAfter)}`);
  return {treeBefore,treeAfter};
};
/** Stage-by-stage canonical record of the target (present even when it is not drawn). */
const traceTarget=()=>page.evaluate(id=>{const a=window.__atlas,t=a.faunaTrace([id]);return {date:a.date.offsetNs,walker:a.travel.walking?.position??null,grounded:a.travel.walking?.grounded??false,clearanceM:a.travel.surface?.terrainClearance??null,frame:t?.frame??null,target:t?.individuals?.[0]??null,drawn:a.terrain.tiles.faunaDrawn.some(x=>x.id===id),near:a.terrain.tiles.faunaNear}},targetId);
const aimAt=async(targetM)=>{
  const a=await page.evaluate(()=>({p:window.__atlas.travel.position,q:window.__atlas.travel.heading,fov:window.__atlas.camera.fov}));
  const v=new THREE.Vector3(...targetM).sub(new THREE.Vector3(...a.p)).applyQuaternion(new THREE.Quaternion(...a.q).invert());
  const yaw=Math.atan2(v.x,-v.z),pitch=Math.atan2(v.y,Math.hypot(v.x,v.z));
  const rect=await page.locator('#viewport canvas').boundingBox();if(!rect)throw new Error('no canvas');
  const sx=rect.x+rect.width*.45,sy=rect.y+rect.height*.52;
  const hit=await page.evaluate(({x,y})=>document.elementFromPoint(x,y)?.closest('#viewport canvas')!==null,{x:sx,y:sy});
  if(!hit)throw new Error(`Look drag misses canvas at ${sx},${sy}`);
  const drag=async(dx,dy)=>{const steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))/180));for(let i=0;i<steps;i++){const x=sx+Math.sign(dx)*Math.min(180,Math.abs(dx)-i*180),y=sy+Math.sign(dy)*Math.min(180,Math.abs(dy)-i*180);await page.mouse.move(sx,sy);await page.mouse.down();await page.mouse.move(x,y,{steps:4});await page.mouse.up();}};
  await drag(yaw/.003,0);await drag(0,-pitch/.003);await page.waitForTimeout(300);
  const now=await page.evaluate(()=>({p:window.__atlas.travel.position,q:window.__atlas.travel.heading,fov:window.__atlas.camera.fov,date:window.__atlas.date.offsetNs,grounded:window.__atlas.travel.walking?.grounded}));
  const d=new THREE.Vector3(...targetM).sub(new THREE.Vector3(...now.p)).applyQuaternion(new THREE.Quaternion(...now.q).invert());const z=-d.z,hy=Math.tan(now.fov*Math.PI/360),hx=hy*1440/1000;
  return {yaw,pitch,position:now.p,heading:now.q,date:now.date,grounded:now.grounded,depthM:z,ndc:[d.x/(z*hx),d.y/(z*hy)]};
};
const bodyCenter=()=>page.evaluate(id=>window.__atlas.travel.bodies.find(x=>x.id===id).positionM,bodyId);
const aimAtCanonical=async position=>aimAt(new THREE.Vector3(...await bodyCenter()).add(new THREE.Vector3(...position).multiplyScalar(radius)).addScaledVector(new THREE.Vector3(...position).normalize(),2.2).toArray());
const distanceM=(a,b)=>new THREE.Vector3(...a).sub(new THREE.Vector3(...b)).multiplyScalar(radius).length();
try{
  const trees=await openGrounded(date,'base');
  const initial=await page.evaluate(({id})=>{const a=window.__atlas;const item=a.terrain.tiles.faunaDrawn.find(x=>x.id===id);return {date:a.date.offsetNs,body:a.state.body.id,bodyCenterM:a.travel.bodies.find(x=>x.id===a.state.body.id).positionM,walker:a.travel.walking,heading:a.travel.heading,cam:a.travel.position,target:item,trace:a.faunaTrace([id]),faunaNear:a.terrain.tiles.faunaNear,surfaceLighting:a.surfaceLighting,tiles:{lifePending:a.terrain.tiles.lifePending,faunaTerrainPending:a.terrain.tiles.faunaTerrainPending}}},{id:targetId});
  await writeFile(`${out}/grounded-source.json`,JSON.stringify({requestedDate:date,targetId,initial},null,2));
  await writeFile(`${out}/forest-assets.json`,JSON.stringify({before:trees.treeBefore,after:trees.treeAfter},null,2));
  const targetMeters=new THREE.Vector3(...initial.bodyCenterM).add(local).addScaledVector(up,2.2).toArray();
  const aimed=await aimAt(targetMeters);await writeFile(`${out}/framed-state.json`,JSON.stringify({targetId,targetMeters,aimed,faunaNear:await page.evaluate(()=>window.__atlas.terrain.tiles.faunaNear)},null,2));
  await page.waitForTimeout(1200);
  const targetAfterAim=await page.evaluate(id=>({present:window.__atlas.terrain.tiles.faunaDrawn.some(x=>x.id===id),drawn:window.__atlas.terrain.tiles.faunaDrawn.length,near:window.__atlas.terrain.tiles.faunaNear}),targetId);
  await writeFile(`${out}/target-after-aim.json`,JSON.stringify(targetAfterAim,null,2));
  await page.addStyleTag({content:cleanShot});
  await page.screenshot({path:`${out}/01-fauna-framed.png`});
  const basePose=await traceTarget();

  // Documented grounded-seek policy: the observer moves to hover, the
  // canonical individual keeps its identity and exact dated position.
  phase='in-page-seek-hover';
  await page.evaluate(t=>window.__atlas.seek(t),shifted);
  await page.waitForFunction(t=>window.__atlas?.date.offsetNs===t&&window.__atlas.terrain.tiles.lifePending===0&&window.__atlas.terrain.tiles.faunaTerrainPending===0,shifted,{timeout:90000});
  await page.waitForTimeout(600);
  const hoverPose=await traceTarget();

  // Stationary grounded observer at the shifted date, then back again.
  await openGrounded(shifted,'shifted');
  const shiftedPose=await traceTarget();
  const shiftedAim=shiftedPose.target?.position?await aimAtCanonical(shiftedPose.target.position):null;
  await page.waitForTimeout(1200);await page.addStyleTag({content:cleanShot});await page.screenshot({path:`${out}/date-plus-1.75s.png`});
  const shiftedAfterAim=await traceTarget();
  await openGrounded(date,'returned');
  const returnedPose=await traceTarget();
  const returnedAim=returnedPose.target?.position?await aimAtCanonical(returnedPose.target.position):null;
  await page.waitForTimeout(1200);await page.addStyleTag({content:cleanShot});await page.screenshot({path:`${out}/date-return.png`});
  const returnedAfterAim=await traceTarget();
  const dateMotion={base:basePose,hover:hoverPose,shifted:shiftedPose,shiftedAfterAim,returned:returnedPose,returnedAfterAim,shiftedAim,returnedAim,
    rootDisplacementM:shiftedPose.target?.position&&basePose.target?.position?distanceM(shiftedPose.target.position,basePose.target.position):null,
    hoverVsGroundedM:hoverPose.target?.position&&shiftedPose.target?.position?distanceM(hoverPose.target.position,shiftedPose.target.position):null,
    returnPositionErrorM:returnedPose.target?.position&&basePose.target?.position?distanceM(returnedPose.target.position,basePose.target.position):null};
  await writeFile(`${out}/date-motion.json`,JSON.stringify(dateMotion,null,2));
  const repeated=await page.evaluate(()=>({date:window.__atlas.date.offsetNs,drawn:window.__atlas.terrain.tiles.faunaDrawn.map(x=>({id:x.id,position:x.position})),near:window.__atlas.terrain.tiles.faunaNear,lighting:window.__atlas.surfaceLighting,position:window.__atlas.travel.walking.position}));
  await writeFile(`${out}/paused-snapshot.json`,JSON.stringify(repeated,null,2));
  assert.equal(repeated.date,date,'world date remains exact');
  assert.ok(targetAfterAim.present,'saved canonical fauna individual becomes visible after aiming at it');
  assert.ok(repeated.near.active>0,'close fauna activates a near rig');
  assert.ok(aimed.depthM>0&&Math.abs(aimed.ndc[0])<0.65&&Math.abs(aimed.ndc[1])<0.65,'animal center is framed with border');
  assert.equal(hoverPose.grounded,false,'an in-page seek from the ground moves to observation hover');
  assert.ok(hoverPose.clearanceM>150&&hoverPose.clearanceM<170,'observation hover is 160 m above ground');
  for(const [label,pose] of [['hover',hoverPose],['shifted',shiftedPose],['returned',returnedPose]])
    assert.ok(pose.target?.position,`${label}: canonical individual is resident with a dated position (${pose.target?.stage})`);
  assert.ok(shiftedPose.grounded&&returnedPose.grounded,'date motion is observed from the saved grounded address');
  assert.ok(dateMotion.hoverVsGroundedM<1e-6,'observer relocation does not move the canonical individual');
  assert.ok(dateMotion.returnPositionErrorM<1e-6,'exact date restore reproduces the position');
  assert.ok(shiftedAfterAim.drawn&&returnedAfterAim.drawn,'the stationary observer still draws the individual at both dates');
  // Motion is judged against the individual's own dated schedule, not assumed.
  const sameIdleWindow=basePose.target.pose.gait==='idle'&&shiftedPose.target.pose.gait==='idle'&&Math.abs(shiftedPose.target.pose.stateS-basePose.target.pose.stateS-1.75)<1e-6;
  if(sameIdleWindow)assert.ok(dateMotion.rootDisplacementM<1e-6,'an idle window keeps the individual in place');
  else assert.ok(dateMotion.rootDisplacementM>0,'a walking individual advances along its path');
  const beforeDetail=await page.evaluate(()=>({date:window.__atlas.date.offsetNs,position:window.__atlas.travel.walking.position,lighting:window.__atlas.surfaceLighting,detail:document.querySelector('#surface-detail')?.textContent}));
  await page.screenshot({path:`${out}/02-ground-detail-on.png`});
  await page.locator('style').last().evaluate(node=>node.remove());
  await page.locator('#surface-detail').click();
  await page.waitForTimeout(500);
  const afterToggle=await page.evaluate(()=>({date:window.__atlas.date.offsetNs,position:window.__atlas.travel.walking.position,lighting:window.__atlas.surfaceLighting,detail:document.querySelector('#surface-detail')?.textContent}));
  await page.addStyleTag({content:cleanShot});
  await page.screenshot({path:`${out}/03-ground-detail-toggled.png`});
  await writeFile(`${out}/ground-toggle.json`,JSON.stringify({before:beforeDetail,after:afterToggle,errors},null,2));
  assert.equal(afterToggle.date,beforeDetail.date);assert.deepEqual(afterToggle.position,beforeDetail.position);assert.deepEqual(afterToggle.lighting,beforeDetail.lighting);
  const visibility=[];
  for(const [label,ms] of [['near',0],['handoff-inner',9000],['handoff-outer',2500]]){
    if(ms){await page.keyboard.down('s');await page.keyboard.down('Shift');await page.waitForTimeout(ms);await page.keyboard.up('Shift');await page.keyboard.up('s');await page.waitForTimeout(500);}
    const sample=await page.evaluate(({id,r})=>{const a=window.__atlas,w=a.travel.walking,p=a.terrain.tiles.faunaDrawn.find(x=>x.id===id),t=a.faunaTrace([id]).individuals[0];const target=(p?.position??t.position)?.map(v=>v*r);return {date:a.date.offsetNs,walker:w.position,targetId:id,targetPresent:!!p,stage:t.stage,cameraVisible:t.cameraVisible??null,rigged:t.rigged??null,targetPosition:target,distanceM:target?Math.hypot(...target.map((v,i)=>v-w.position[i])):null,faunaNear:a.terrain.tiles.faunaNear,drawn:a.terrain.tiles.faunaDrawn.length,grounded:w.grounded,lighting:a.surfaceLighting}},{id:targetId,r:radius});visibility.push({label,sample});await writeFile(`${out}/handoff-${label}.json`,JSON.stringify(sample,null,2));await page.screenshot({path:`${out}/handoff-${label}.png`});}
  await writeFile(`${out}/handoff-sequence.json`,JSON.stringify(visibility,null,2));
  // While the individual stays in view it is drawn by exactly one representation.
  for(const {label,sample} of visibility)if(sample.cameraVisible&&sample.distanceM<=600)assert.ok(sample.targetPresent,`${label}: in-view individual is drawn (${sample.stage})`);
  const summary={ok:true,base,bodyId,targetId,date,initial,aimed,near:repeated.near,dateMotion:{rootDisplacementM:dateMotion.rootDisplacementM,hoverVsGroundedM:dateMotion.hoverVsGroundedM,returnPositionErrorM:dateMotion.returnPositionErrorM,baseGait:basePose.target.pose.gait,shiftedGait:shiftedPose.target.pose.gait},groundToggle:{before:beforeDetail,after:afterToggle},visibility,errors,limitations:['date is paused during walk samples','date motion uses exact-date restores of the saved walk address; an in-page seek is checked separately at hover']};
  await writeFile(`${out}/report.json`,JSON.stringify(summary,null,2));
  assert.deepEqual(errors,[],'no page or console errors');
  console.log(JSON.stringify(summary,null,2));
}catch(e){await checkpoint();await page?.screenshot({path:`${out}/failure.png`}).catch(()=>{});await writeFile(`${out}/failure.json`,JSON.stringify({phase,error:String(e),errors},null,2));throw e;}finally{await browser.close();}
