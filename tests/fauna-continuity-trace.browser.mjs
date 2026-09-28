// Diagnostic trace for the close-fauna follow-up: follows one canonical
// individual through census, terrain stencil, dated position, range,
// camera/shadow visibility, budget, near rig and lighting at fixed date
// offsets, for two observers:
//   seek       - the follow-up fixture's path: land, then window.__atlas.seek()
//   stationary - a grounded observer restored from the same walk address at
//                each exact date (the saved-location contract), no seek.
// Usage: ATLAS_URL=http://127.0.0.1:5191/ ATLAS_HARDWARE=1 node tests/fauna-continuity-trace.browser.mjs
import { chromium } from 'playwright';
import * as THREE from 'three';
import { mkdir, writeFile } from 'node:fs/promises';
import { browserArgs } from './browser-options.mjs';
import { encodeVersions, CURRENT_VERSIONS } from '../src/time-nav.ts';

const base = process.env.ATLAS_URL || 'http://127.0.0.1:5191/';
const out = process.env.ATLAS_RESULTS || 'test-results/opus55-fauna/trace';
const phases = (process.env.TRACE_PHASES || 'seek,stationary').split(',');
const offsets = (process.env.TRACE_OFFSETS || '0,0.25,0.5,1,1.75,3,5,10').split(',').map(Number);
const bodyId = 'G001/C2128,0,1/0/planet/1';
const date = '435084631200000040194500000';
const targetId = `${bodyId}:fauna:562ff898`;
const local = new THREE.Vector3(4067765.96072781,-1507043.162624909,2860322.144626968);
const radius = 5194907.072465867;
const up = local.clone().normalize();
const ref = Math.abs(up.y) > .92 ? new THREE.Vector3(1,0,0) : new THREE.Vector3(0,1,0);
const tangent = new THREE.Vector3().crossVectors(ref,up).normalize();
const eye = local.clone().addScaledVector(tangent,8).addScaledVector(up,1.64);
const look = local.clone().addScaledVector(up,2.2);
const landingEye = eye.clone().normalize().multiplyScalar(radius+12);
const heading = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(landingEye,look,up));
const urlFor = t => {
  const params = new URLSearchParams({seed:'LETHRA-001',g:'G001',system:'G001/C2128,0,1/0',body:bodyId});
  params.set('walk',eye.toArray().join(','));params.set('heading',heading.toArray().join(','));
  params.set('date',t);params.set('wv',encodeVersions(CURRENT_VERSIONS));
  return `${base}?${params}`;
};
const at = s => (BigInt(date) + BigInt(Math.round(s * 1e9))).toString();
await mkdir(out,{recursive:true});
const browser = await chromium.launch({headless:true,args:browserArgs});
const errors = [];
const open = async t => {
  const page = await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.addInitScript(()=>{const def=Object.defineProperty;Object.defineProperty=function(o,k,d){const r=Reflect.apply(def,Object,[o,k,d]);if(o===window&&k==='__atlas'&&d?.value?.setExplorationPaused){d.value.setExplorationPaused(true);Object.defineProperty=def;}return r;};});
  await page.goto(urlFor(t),{waitUntil:'networkidle'});
  await page.waitForFunction(({id,t})=>{const a=window.__atlas;return a?.ready&&a.state.body?.id===id&&a.date.offsetNs===t&&a.travel.walking?.grounded&&a.terrain?.tiles?.faunaDrawn?.length>0&&a.terrain.tiles.lifePending===0&&a.terrain.tiles.faunaTerrainPending===0;},{id:bodyId,t},{timeout:240000});
  await page.waitForTimeout(600);
  return page;
};
const trees = async page => {
  if (!(await page.evaluate(()=>window.__atlas.forestAssets?.enabled))) await page.locator('#forest-detail').click();
  await page.waitForFunction(()=>{const x=window.__atlas?.forestAssets;return !!x&&!x.loading&&(x.ready||x.error);},null,{timeout:120000});
};
// Same look-drag as the follow-up fixture; aims at a radius-normalized body-local point + 2.2 m.
const aimAt = async (page, positionLocal) => {
  const bodyCenter = await page.evaluate(id=>window.__atlas.travel.bodies.find(x=>x.id===id).positionM,bodyId);
  const p = new THREE.Vector3(...positionLocal), target = p.clone().multiplyScalar(radius).add(new THREE.Vector3(...bodyCenter)).addScaledVector(p.clone().normalize(),2.2);
  const a = await page.evaluate(()=>({p:window.__atlas.travel.position,q:window.__atlas.travel.heading}));
  const v = target.clone().sub(new THREE.Vector3(...a.p)).applyQuaternion(new THREE.Quaternion(...a.q).invert());
  const yaw = Math.atan2(v.x,-v.z), pitch = Math.atan2(v.y,Math.hypot(v.x,v.z));
  const rect = await page.locator('#viewport canvas').boundingBox(), sx = rect.x+rect.width*.45, sy = rect.y+rect.height*.52;
  const drag = async (dx,dy)=>{const n=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))/180));for(let i=0;i<n;i++){const x=sx+Math.sign(dx)*Math.min(180,Math.abs(dx)-i*180),y=sy+Math.sign(dy)*Math.min(180,Math.abs(dy)-i*180);await page.mouse.move(sx,sy);await page.mouse.down();await page.mouse.move(x,y,{steps:4});await page.mouse.up();}};
  await drag(yaw/.003,0); await drag(0,-pitch/.003); await page.waitForTimeout(1200);
};
const read = page => page.evaluate(id=>{
  const a=window.__atlas,t=a.terrain.tiles,w=a.travel.walking;
  return {date:a.date.offsetNs,walking:w?{grounded:w.grounded,position:w.position}:null,clearanceM:a.travel.surface?.terrainClearance??null,
    trace:a.faunaTrace([id]),faunaDrawn:t.faunaDrawn.length,targetDrawn:t.faunaDrawn.some(x=>x.id===id),
    faunaNear:t.faunaNear.activeMembers.map(m=>m.id),lifePending:t.lifePending,faunaTerrainPending:t.faunaTerrainPending,
    lighting:a.surfaceLighting};
},targetId);
const clean = 'header,#breadcrumbs,#timeline,#panel,#labels,.view-caption,.view-actions,footer,#flight-hud,#flight-reticle,#compat-notice{display:none!important}';
const summarize = s => { const i=s.trace?.individuals?.[0]??{}; return {date:s.date,observer:s.walking?'grounded':`hover ${s.clearanceM?.toFixed(1)} m`,stage:i.stage,distanceM:i.distanceM,cameraVisible:i.cameraVisible,shadowVisible:i.shadowVisible,drawn:s.targetDrawn,rigged:i.rigged,gait:i.pose?.gait,groundReady:i.census?.groundReady,drawnCount:s.faunaDrawn}; };
const result = {base,bodyId,targetId,date,phases:{},errors};
try {
  if (phases.includes('seek')) {
    const page = await open(date);
    await page.addStyleTag({content:clean});
    const rows = [{offsetS:'landed',...(await read(page))}];
    for (const s of offsets) {
      const t = at(s);
      await page.evaluate(v=>window.__atlas.seek(v),t);
      await page.waitForFunction(v=>window.__atlas.date.offsetNs===v&&window.__atlas.terrain.tiles.lifePending===0&&window.__atlas.terrain.tiles.faunaTerrainPending===0,t,{timeout:120000});
      await page.waitForTimeout(600);
      rows.push({offsetS:s,...(await read(page))});
      if (s===1.75) await page.screenshot({path:`${out}/seek-plus-1.75s.png`});
    }
    await page.close();
    result.phases.seek = rows;
    console.table(rows.map(r=>({offsetS:r.offsetS,...summarize(r)})));
  }
  if (phases.includes('stationary')) {
    const rows = [];
    for (const s of offsets) {
      const page = await open(at(s));
      const restored = await read(page);
      const position = restored.trace?.individuals?.[0]?.position;
      if (position) { await trees(page); await aimAt(page, position); }
      rows.push({offsetS:s,restored:summarize(restored),...(await read(page))});
      if ([0,1.75,20].includes(s)) { await page.addStyleTag({content:clean}); await page.screenshot({path:`${out}/stationary-${s}s.png`}); }
      await page.close();
    }
    result.phases.stationary = rows;
    console.table(rows.map(r=>({offsetS:r.offsetS,...summarize(r)})));
  }
} finally {
  await writeFile(`${out}/trace.json`,JSON.stringify(result,null,2));
  await browser.close();
}
console.log(JSON.stringify({errors},null,2));
