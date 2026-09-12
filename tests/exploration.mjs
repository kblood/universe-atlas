import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.ATLAS_URL||'http://127.0.0.1:5186/', out=process.env.ATLAS_RESULTS||'test-results/exploration';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const wait=f=>page.waitForFunction(f,undefined,{timeout:120000});
const visible=t=>t.z>0&&t.z<1&&t.x>200&&t.x<1080&&t.y>170&&t.y<690;
async function pixels(targets){
  const png=(await page.screenshot()).toString('base64');
  return page.evaluate(async({png,targets})=>{
    const bitmap=await createImageBitmap(new Blob([Uint8Array.from(atob(png),c=>c.charCodeAt(0))],{type:'image/png'}));
    const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;
    const c=canvas.getContext('2d');c.drawImage(bitmap,0,0);
    return targets.map(t=>{const p=c.getImageData(Math.round(t.x)-3,Math.round(t.y)-3,7,7).data;let peak=0;for(let i=0;i<p.length;i+=4)peak=Math.max(peak,p[i],p[i+1],p[i+2]);return {id:t.id,peak};});
  },{png,targets});
}
try{
  await page.goto(base+'?seed=LETHRA-001');await wait(()=>window.__atlas?.ready);
  await page.waitForTimeout(900);
  const galaxies=(await page.evaluate(()=>window.__atlas.navigationTargets)).filter(visible).slice(0,6);
  assert.ok(galaxies.length>=3);
  const galaxyPixels=await pixels(galaxies);
  assert.ok(galaxyPixels.every(t=>t.peak>50),'galaxies actually contribute visible pixels from the starting view');
  await page.screenshot({path:out+'/01-visible-universe.png'});
  await page.locator('[data-select="G001"]').click();await page.locator('#explore').click();
  await wait(()=>window.__atlas.ready&&window.__atlas.state.level==='galaxy');
  await page.waitForTimeout(900);
  const targets=await page.evaluate(()=>window.__atlas.mapTargets);
  targets.sort((a,b)=>Math.hypot(a.x-590,a.y-500)-Math.hypot(b.x-590,b.y-500));
  let target;
  for(const candidate of targets){
    await page.mouse.click(candidate.x,candidate.y);
    if(await page.evaluate(()=>window.__atlas.selected)===candidate.id){target=candidate;break;}
  }
  assert.ok(target,'a distinct rendered star can be selected in the dense galaxy');
  await page.locator('#toggle-flight').click();
  assert.equal(await page.evaluate(()=>window.__atlas.camera.viewOffset),0,'free flight uses the actual centre reticle');
  // Align using actual drag input and read-only projected positions. Never use
  // Fly to selection, teleport a camera, or write to the application's state.
  for(let i=0;i<6;i++){
    const t=await page.evaluate(id=>window.__atlas.mapTargets.find(t=>t.id===id),target.id);
    assert.ok(t);
    const dx=(t.x-720)/3.369,dy=(t.y-500)/3.369;
    if(Math.hypot(dx,dy)<.25)break;
    await page.mouse.move(720,500);await page.mouse.down();await page.mouse.move(720+dx,500+dy,{steps:4});await page.mouse.up();
    await page.waitForTimeout(150);
  }
  assert.equal(await page.evaluate(()=>window.__atlas.selected),target.id,'fine aiming does not select a different star on mouse release');
  await page.keyboard.down('w');
  await page.waitForTimeout(250);
  assert.equal(await page.evaluate(()=>window.__atlas.travel.autopilot),null);
  await wait(()=>window.__atlas.ready&&window.__atlas.state.level==='system'&&!window.__atlas.travel.crossing);
  await page.keyboard.up('w');
  assert.equal(await page.evaluate(()=>window.__atlas.state.sys.id),target.id,'manual W flight enters the aligned actual star');
  const arrival=await page.evaluate(()=>({travel:window.__atlas.travel,camera:window.__atlas.camera,view:window.__atlas.systemView}));
  assert.ok(arrival.view.bodies.every(b=>Math.hypot(...b.position.map((v,i)=>v-arrival.camera.position[i]))<arrival.camera.far),'system entry does not clip distant bodies');
  await page.waitForTimeout(900);
  const bodyTargets=(await page.evaluate(()=>window.__atlas.navigationTargets)).filter(visible);
  assert.ok(bodyTargets.length>0);
  const bodyPixels=await pixels(bodyTargets);
  assert.ok(bodyPixels.some(t=>t.peak>50),'unresolved system bodies render visible beacons at entry');
  await page.screenshot({path:out+'/02-manual-system-entry.png'});
  assert.ok(Number.isFinite(arrival.camera.near)&&arrival.camera.near>0&&arrival.camera.near<arrival.camera.far,'physical flight has a valid clipping range');
  const query=new URLSearchParams({seed:'LETHRA-001',g:'G001',system:'G001/C2128,0,1/0',body:'G001/C2128,0,1/0/planet/1'});
  await page.goto(base+'?'+query);await wait(()=>window.__atlas?.ready&&window.__atlas.terrain?.tiles?.ready);
  const before=await page.evaluate(()=>window.__atlas.travel);
  await page.locator('#terrain-flight').click();
  await wait(()=>window.__atlas.travel.terrainCruise===600);
  await wait(()=>window.__atlas.terrain.tiles.maxLevel>=8&&window.__atlas.terrain.tiles.pending===0);
  const start=await page.evaluate(()=>({travel:window.__atlas.travel,terrain:window.__atlas.terrain}));
  assert.equal(start.travel.sceneId,before.sceneId);
  assert.deepEqual(start.travel.bodies.map(b=>b.objectId),before.bodies.map(b=>b.objectId));
  assert.ok(start.travel.surface.terrainElevation>0,'terrain helper actually chooses land');
  assert.ok(Math.abs(start.travel.surface.terrainClearance-600)<1);
  await page.screenshot({path:out+'/03-atmospheric-terrain.png'});
  await page.mouse.move(720,400);await page.mouse.wheel(0,-800);
  await page.waitForTimeout(4500);
  const finish=await page.evaluate(()=>({travel:window.__atlas.travel,terrain:window.__atlas.terrain}));
  assert.ok(Math.hypot(...start.travel.position.map((v,i)=>v-finish.travel.position[i]))>1000,'surface flight actually traverses terrain');
  assert.ok(Math.abs(finish.travel.surface.terrainClearance-600)<1);
  assert.ok(finish.terrain.tiles.resident+finish.terrain.tiles.pending<=256);
  await page.screenshot({path:out+'/04-terrain-traversal.png'});
  await page.keyboard.down('w');
  await page.mouse.move(700,400);await page.mouse.down();await page.mouse.move(707,400);await page.mouse.up();
  const released=await page.evaluate(()=>window.__atlas.travel.position);await page.waitForTimeout(800);
  const moving=await page.evaluate(()=>window.__atlas.travel.position);await page.keyboard.up('w');
  assert.equal(await page.evaluate(()=>window.__atlas.travel.terrainCruise),null);
  assert.ok(Math.hypot(...moving.map((v,i)=>v-released[i]))>20,'releasing the mouse does not cancel a held W key');
  assert.deepEqual(errors,[]);
  const report={ok:true,base,manualStar:target.id,galaxyPixels,bodyPixels,terrainStart:start.terrain.tiles,terrainFinish:finish.terrain.tiles,clearance:finish.travel.surface.terrainClearance,errors};
  await writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}catch(e){await page.screenshot({path:out+'/failure.png'});console.log(await page.evaluate(()=>({state:window.__atlas?.state.level,travel:window.__atlas?.travel,terrain:window.__atlas?.terrain})));console.log(errors);throw e;}
finally{await browser.close();}
