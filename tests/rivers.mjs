import {chromium} from 'playwright';
import {browserArgs} from './browser-options.mjs';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {surfaceQuery} from '../src/world-surface.ts';

const base=process.env.ATLAS_URL||'http://127.0.0.1:5186/';
const out=process.env.ATLAS_RESULTS||'test-results/rivers';
const query=new URLSearchParams({seed:'LETHRA-001',g:'G001',system:'G001/C2128,0,1/0',body:'G001/C2128,0,1/0/planet/1'});
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:browserArgs});
const page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
if(process.env.ATLAS_RIVER_FAULT)await page.addInitScript(()=>{
  const NativeWorker=window.Worker;let failed=false;
  window.Worker=class extends NativeWorker{
    constructor(url,options){
      super(url,options);
      if(!failed&&!sessionStorage.getItem('atlas-river-faulted')&&String(url).includes('river-worker')){
        failed=true;sessionStorage.setItem('atlas-river-faulted','1');
        setTimeout(()=>this.dispatchEvent(new ErrorEvent('error',{cancelable:true,message:'injected river-worker fault'})),25);
      }
    }
  };
});
const wait=(fn,timeout=180000,arg)=>page.waitForFunction(fn,arg,{timeout});
const snapshot=()=>page.evaluate(()=>({river:window.__atlas?.river,terrain:window.__atlas?.terrain,travel:window.__atlas?.travel,state:window.__atlas?.state,date:window.__atlas?.date,stats:window.__atlas?.stats}));
const radialDistance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
function shoreGap(body,position,lookDirection){
  const radius=body.radiusM,d=position.map(v=>v/Math.hypot(...position)),dot=d.reduce((n,v,i)=>n+v*lookDirection[i],0);
  const tangent=lookDirection.map((v,i)=>v-d[i]*dot),length=Math.hypot(...tangent);
  if(!length)return Infinity;
  const query=surfaceQuery(body),step=.25;
  for(let metres=0;metres<=30;metres+=step){
    const a=metres/radius,c=Math.cos(a),s=Math.sin(a);
    const next=d.map((v,i)=>v*c+tangent[i]/length*s);
    if(query(next).wet)return metres;
  }
  return Infinity;
}
async function clickRiverSite(kind){
  const site=await page.evaluate(kind=>{
    const region=window.__atlas.river.region,site=region.sites.find(site=>site.kind===kind);
    if(site)document.querySelector(`[data-river-site="${CSS.escape(site.id)}"]`)?.click();
    return site;
  },kind);
  assert.ok(site,`region provides a ${kind} destination`);
  await wait(()=>window.__atlas.travel.riverJourney!==null,60000);
  await wait(()=>window.__atlas.travel.riverJourney===null,180000);
  return site;
}
async function performanceSample(){
  return page.evaluate(async()=>{
    const canvas=document.querySelector('canvas'),gl=canvas?.getContext('webgl2'),ext=gl?.getExtension('WEBGL_debug_renderer_info');
    const rows=[];let previous=performance.now();
    for(let i=0;i<120;i++){
      await new Promise(requestAnimationFrame);const now=performance.now(),tiles=window.__atlas.terrain?.tiles;
      rows.push({frameMs:now-previous,terrainMs:tiles?.updateMs||0});previous=now;
    }
    const percentile=(key,p)=>rows.map(row=>row[key]).sort((a,b)=>a-b)[Math.floor((rows.length-1)*p)];
    return {renderer:gl?(ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)):'unavailable',frames:rows.length,frameMedianMs:percentile('frameMs',.5),frameP95Ms:percentile('frameMs',.95),terrainMedianMs:percentile('terrainMs',.5),terrainP95Ms:percentile('terrainMs',.95)};
  });
}

try{
  await page.goto(base+'?'+query);
  await wait(()=>window.__atlas?.ready&&window.__atlas.terrain?.tiles?.ready);
  await page.locator('#river-find').click();console.log('rivers: generation started');
  if(process.env.ATLAS_RIVER_FAULT){
    await wait(()=>window.__atlas.river?.status==='error');
    await page.locator('#river-retry').click();
  }
  await wait(()=>window.__atlas.river?.status==='ready'&&window.__atlas.terrain?.tiles?.ready,240000);
  const ready=await snapshot(),region=ready.river.region,regionHash=hash(region);
  assert.equal(region.version,'river-region-1');assert.ok(region.channels.length&&region.lakes.length);
  console.log(`rivers: generation ready (${region.id})`);
  await page.screenshot({path:out+'/01-river-inspect.png'});

  const downloadPromise=page.waitForEvent('download');
  await page.locator('#river-export').click();
  const download=await downloadPromise,downloadPath=await download.path();
  assert.ok(downloadPath,'river export has a temporary download path');
  const exportHash=createHash('sha256').update(await readFile(downloadPath)).digest('hex');
  assert.equal(exportHash,hash(region),'export serializes the displayed immutable region');

  const bank=await clickRiverSite('river-bank');
  const arrival=await snapshot(),center=arrival.travel.bodies.find(body=>body.id===arrival.state.body.id).positionM;
  const relative=arrival.travel.position.map((v,i)=>v-center[i]),angularMiss=Math.acos(Math.max(-1,Math.min(1,relative.reduce((n,v,i)=>n+v*bank.direction[i],0)/Math.hypot(...relative))));
  assert.ok(angularMiss*arrival.state.body.radiusM<=2,`bank arrival angular miss ${angularMiss*arrival.state.body.radiusM}m`);
  assert.ok(Math.abs(Math.hypot(...relative)-arrival.state.body.radiusM-surfaceQuery(arrival.state.body)(bank.direction).visibleHeightM-180)<1,'bank arrival holds 180m above visible ground');
  console.log(`rivers: bank arrival (${(angularMiss*arrival.state.body.radiusM).toFixed(2)}m miss)`);

  await page.locator('#walk-surface').click();
  await wait(()=>window.__atlas.travel.walking?.grounded&&!window.__atlas.travel.walking?.waiting,240000);
  console.log('rivers: bank landed');
  await page.screenshot({path:out+'/02-bank-grounded.png'});
  const landed=await snapshot(),walkStart=landed.travel.walking.travelledM;
  await page.keyboard.down('w');await page.waitForTimeout(10000);await page.keyboard.up('w');
  const stopped=await snapshot(),stoppedPosition=stopped.travel.walking.position,body=stopped.state.body;
  const stoppedDirection=stoppedPosition.map(v=>v/Math.hypot(...stoppedPosition));
  assert.equal(surfaceQuery(body)(stoppedDirection).wet,false,'walker never enters the river after looking toward it');
  const gap=shoreGap(body,stoppedPosition,bank.lookDirection);
  assert.ok(gap<=8,`walker stops near the shore (${gap.toFixed(2)}m)`);
  assert.ok(stopped.travel.walking.travelledM-walkStart<100,'water approach blocks within the ten-second walk window');

  const alongStart=stopped.travel.walking.travelledM;
  await page.keyboard.down('d');await wait(start=>window.__atlas.travel.walking?.travelledM>start+8,30000,alongStart);await page.keyboard.up('d');
  const along=await snapshot();
  assert.ok(along.travel.walking.contactMismatchM<.05,'bank collision matches settled visible terrain');
  await page.screenshot({path:out+'/03-bank-walk.png'});
  const water=along.terrain.tiles.river,environment=along.terrain.tiles.environment;
  assert.ok(water?.withinBudget&&water.accountedBytes<=water.budgetBytes,'water stays within its resident geometry budget');
  assert.ok(environment?.withinBudget&&environment.accountedBytes<=environment.budgetBytes,'bank dressing stays within its instance budget');
  const combinedBytes=along.terrain.tiles.accountedBytes+water.accountedBytes+environment.accountedBytes;
  assert.ok(combinedBytes<256*1024*1024,'terrain, water, and dressing stay within the combined 256 MiB budget');
  const compatible=body.water>0&&body.temperatureK>=250&&body.temperatureK<=325&&body.type!=='Ice world'&&body.type!=='Gas giant';
  if(compatible){assert.ok(environment.instances>0,'temperate bank has visible dressing instances');assert.ok(environment.counts.trunk>0,'temperate bank includes trees');}
  const performance=await performanceSample();
  const savedPosition=along.travel.walking.position,savedUrl=page.url();
  assert.ok(new URL(savedUrl).searchParams.has('river')&&new URL(savedUrl).searchParams.has('walk'),'walking URL persists the river address and pose');

  await page.reload();
  await wait(()=>window.__atlas.river?.status==='ready'&&window.__atlas.travel.walking?.grounded,240000);
  const restored=await snapshot();
  assert.equal(hash(restored.river.region),regionHash,'cold restore regenerates the exact same region');
  assert.ok(radialDistance(restored.travel.walking.position,savedPosition)<5,'cold restore returns within five metres of the saved bank pose');
  console.log('rivers: cold restore ready');
  await page.locator('#timeline summary').click();await page.locator('#date-years').fill('13800000000.1');await page.locator('#time-apply').click();
  await wait(()=>window.__atlas.date.offsetNs!=='0');
  assert.equal(hash((await snapshot()).river.region),regionHash,'date seeking does not reinterpret reference hydrology');
  await page.locator('#timeline summary').click();

  // Seeking from a walking pose deliberately returns to observation hover;
  // land once to prove the regional surface remains usable, then take off.
  await page.locator('#walk-surface').click();
  await wait(()=>window.__atlas.travel.walking?.grounded&&!window.__atlas.travel.walking?.waiting,240000);
  await page.locator('#walk-surface').click();
  await wait(()=>!window.__atlas.travel.walking&&!window.__atlas.travel.landing,60000);
  // Restore reference daylight for an inspectable lake-shore screenshot after
  // independently proving that date seeking preserves the regional geography.
  await page.locator('#timeline summary').click();
  await page.locator('#time-reset').click();
  await wait(()=>window.__atlas.date.offsetNs==='0');
  await page.locator('#timeline summary').click();
  const lake=await clickRiverSite('lake-shore');
  console.log('rivers: lake arrival');
  await page.locator('#walk-surface').click();
  await wait(()=>window.__atlas.travel.walking?.grounded&&!window.__atlas.travel.walking?.waiting,240000);
  await page.screenshot({path:out+'/04-lake-shore-grounded.png'});
  await page.locator('#walk-surface').click();
  await wait(()=>!window.__atlas.travel.walking&&!window.__atlas.travel.landing,60000);
  await page.locator('#river-inspect').click();await page.waitForTimeout(1400);
  await page.screenshot({path:out+'/05-lake-inspect.png'});
  const beforeDeparture=await snapshot();

  // Start another independent build, then leave before its worker can install.
  const fresh=new URLSearchParams(query);await page.goto(base+'?'+fresh);
  await wait(()=>window.__atlas?.ready&&window.__atlas.terrain?.tiles?.ready);
  await page.locator('#river-find').click();await wait(()=>window.__atlas.river?.status==='building',60000);
  await page.locator('[data-level="system"]').click();
  await wait(()=>window.__atlas.ready&&window.__atlas.state.level==='system',120000);
  const departed=await snapshot();
  assert.equal(departed.terrain,null,'terrain tiles dispose when departing during river generation');
  assert.equal(departed.river,null,'regional state is cancelled and disposed on departure');
  assert.deepEqual(errors,[]);
  const report={ok:true,hardware:process.env.ATLAS_HARDWARE||'swiftshader',regionHash,exportHash,bank:bank.id,lake:lake.id,arrival:{angularMissM:angularMiss*arrival.state.body.radiusM},shoreGapM:gap,combinedBytes,readyTerrain:ready.terrain?.tiles,riverRender:ready.river.render,bankTerrain:along.terrain?.tiles,lakeTerrain:beforeDeparture.terrain?.tiles,performance,departed:{terrain:departed.terrain,river:departed.river},errors};
  await writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}catch(error){
  const state=await snapshot(),failure={message:String(error),stack:error instanceof Error?error.stack:null,url:page.url(),state,errors};
  await writeFile(out+'/failure.json',JSON.stringify(failure,null,2));
  console.log(`rivers: failure ${String(error)}`);
  await page.screenshot({path:out+'/failure.png'});throw error;
}finally{await browser.close();}
