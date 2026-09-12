import {chromium} from 'playwright';
import {browserArgs} from './browser-options.mjs';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.ATLAS_URL||'http://127.0.0.1:5186/',out=process.env.ATLAS_RESULTS||'test-results/walking';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:browserArgs});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
if(process.env.ATLAS_WORKER_FAULT)await page.addInitScript(()=>{
  const NativeWorker=window.Worker;let failed=false;
  window.Worker=class extends NativeWorker{
    constructor(url,options){super(url,options);if(String(url).includes('planet-worker')&&!failed){failed=true;setTimeout(()=>this.dispatchEvent(new ErrorEvent('error',{cancelable:true,message:'injected terrain-worker fault'})),50);}}
  };
});
const snapshot=()=>page.evaluate(()=>({travel:window.__atlas?.travel,terrain:window.__atlas?.terrain,date:window.__atlas?.date}));
try{
  await page.goto(base+'?seed=LETHRA-001&g=G001&system=G001%2FC2128%2C0%2C1%2F0&body=G001%2FC2128%2C0%2C1%2F0%2Fplanet%2F1'+(process.env.ATLAS_WALK_FAST?'&walk=-5135592.775016434,826577.7020637528,112840.23451522976':''));
  await page.waitForFunction(()=>window.__atlas?.ready&&window.__atlas?.terrain?.tiles?.ready,undefined,{timeout:120000});
  if(!process.env.ATLAS_WALK_FAST){
    const relative=()=>page.evaluate(()=>{const a=window.__atlas,t=a.travel,c=t.bodies.find(b=>b.id===a.state.body.id).positionM;return t.position.map((v,i)=>v-c[i]);});
    await page.locator('#timeline summary').click();await page.locator('#date-years').fill('1');
    await page.waitForFunction(()=>!window.__atlas.camera.animating);
    const before=await relative();await page.locator('#time-apply').click();
    const after=await relative(),drift=Math.hypot(...after.map((v,i)=>v-before[i]));console.log(JSON.stringify({inspectionBefore:before,inspectionAfter:after,drift}));
    assert.ok(drift<.01,'orbital inspection follows the planet when seeking');
    await page.locator('#time-reset').click();await page.locator('#timeline summary').click();
    await page.locator('#walk-surface').click();
  }
  for(let i=0;i<120;i++){
    await page.waitForTimeout(2000);
    const s=await snapshot();
    if(i%10===0)console.log(JSON.stringify({elapsed:i*2,landing:s.travel.landing,walk:s.travel.walking,tiles:s.terrain?.tiles}));
    if(s.travel.walking?.grounded&&!s.travel.walking.waiting)break;
  }
  const start=await snapshot();assert.ok(start.travel.walking?.grounded,'landed with collision');
  assert.ok(start.terrain.tiles.accountedBytes<start.terrain.tiles.budgetBytes);
  await page.screenshot({path:out+'/01-landed.png'});
  await page.keyboard.down('w');await page.waitForFunction(()=>window.__atlas.travel.walking?.travelledM>8,undefined,{timeout:30000});await page.keyboard.up('w');
  const moved=await snapshot();assert.ok(moved.travel.walking.travelledM>5);assert.ok(moved.travel.walking.contactMismatchM<.05);
  await page.keyboard.press('Space');
  await page.waitForFunction(()=>window.__atlas.travel.walking?.grounded===false,undefined,{timeout:10000});
  const jumping=await snapshot();assert.equal(jumping.travel.walking.grounded,false);
  await page.waitForFunction(()=>window.__atlas.travel.walking?.grounded,undefined,{timeout:20000});
  await page.screenshot({path:out+'/02-walked.png'});
  await page.waitForTimeout(1200);const savedURL=page.url();assert.ok(savedURL.includes('walk='));
  await page.reload();
  await page.waitForFunction(()=>window.__atlas.travel.walking?.grounded,undefined,{timeout:240000});
  const restored=await snapshot();
  console.log('Restored ground location; sampling frame times.');
  assert.ok(Math.hypot(...restored.travel.walking.position.map((v,i)=>v-moved.travel.walking.position[i]))<5,'restore retains surface location');
  const performanceSample=await page.evaluate(async()=>{
    const canvas=document.querySelector('canvas'),gl=canvas.getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info');
    const rows=[];let last=performance.now();
    for(let i=0;i<180;i++){await new Promise(requestAnimationFrame);const now=performance.now();rows.push({frameMs:now-last,terrainMs:window.__atlas.terrain.tiles.updateMs});last=now;}
    const percentile=(key,p)=>rows.map(r=>r[key]).sort((a,b)=>a-b)[Math.floor((rows.length-1)*p)];
    return {renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),frames:rows.length,frameMedianMs:percentile('frameMs',.5),frameP95Ms:percentile('frameMs',.95),terrainMedianMs:percentile('terrainMs',.5),terrainP95Ms:percentile('terrainMs',.95)};
  });
  console.log(JSON.stringify({performanceSample}));
  await page.locator('#timeline summary').click();await page.locator('#date-years').fill('13800000000.1');await page.locator('#time-apply').click();
  const sought=await snapshot();assert.equal(sought.travel.walking,null);assert.notEqual(sought.date.offsetNs,'0');
  await page.locator('#time-reset').click();assert.equal((await snapshot()).date.offsetNs,'0');
  const moon=await page.evaluate(()=>window.__atlas.state.sys.moons[0]);assert.ok(moon);
  console.log('Landing on moon north pole: '+moon.id);
  await page.goto(base+'?'+new URLSearchParams({seed:'LETHRA-001',g:'G001',system:'G001/C2128,0,1/0',body:moon.id,walk:`0,${moon.radiusM+1000},0`,date:sought.date.offsetNs}));
  await page.waitForFunction(()=>window.__atlas.travel.walking?.grounded,undefined,{timeout:240000});
  const moonStart=await snapshot();assert.equal(moonStart.date.offsetNs,sought.date.offsetNs);
  await page.keyboard.down('w');await page.waitForFunction(()=>window.__atlas.travel.walking?.travelledM>8,undefined,{timeout:30000});await page.keyboard.up('w');
  if(process.env.ATLAS_LONG_WALK){
    await page.keyboard.down('Shift');await page.keyboard.down('w');
    await page.waitForFunction(()=>window.__atlas.travel.walking?.travelledM>90,undefined,{timeout:120000});
    await page.keyboard.up('w');await page.keyboard.up('Shift');
  }
  const moonWalk=await snapshot();assert.ok(moonWalk.travel.walking.contactMismatchM<.05);
  await page.screenshot({path:out+'/03-moon-pole.png'});
  await page.locator('#walk-surface').click();
  await page.waitForFunction(()=>!window.__atlas.travel.walking&&!window.__atlas.travel.landing,undefined,{timeout:60000});
  const takeoff=await snapshot();assert.ok(takeoff.travel.active);assert.ok(takeoff.travel.surface.terrainClearance>150);
  for(const level of ['system','galaxy','universe']){
    await page.locator(`#breadcrumbs [data-level="${level}"]`).click();
    await page.waitForFunction(level=>window.__atlas.ready&&window.__atlas.state.level===level,level,{timeout:120000});
    assert.equal((await snapshot()).date.offsetNs,sought.date.offsetNs,'date retained in '+level);
  }
  if(process.env.ATLAS_WORKER_FAULT)assert.ok(start.terrain.tiles.failuresTotal>0,'injected worker failure recovered');
  assert.deepEqual(errors,[]);
  const report={ok:true,base,start,moved,jumping,restored,sought,moonStart,moonWalk,takeoff,performanceSample,errors};
  await writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({ok:true,walk:moved.travel.walking,performanceSample}));
}catch(error){const s=await snapshot();console.log(JSON.stringify({walk:s.travel.walking,landing:s.travel.landing,surface:s.travel.surface,terrain:s.terrain?.tiles,date:s.date}));console.log(errors);await page.screenshot({path:out+'/failure.png'});throw error;}
finally{await browser.close();}
