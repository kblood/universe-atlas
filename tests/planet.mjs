import {chromium} from 'playwright';
import {browserArgs} from './browser-options.mjs';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.ATLAS_URL||'http://127.0.0.1:5186/';
const out=process.env.ATLAS_RESULTS||'test-results/planet';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:browserArgs});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const wait=fn=>page.waitForFunction(fn,undefined,{timeout:90000});
const read=()=>page.evaluate(()=>({terrain:window.__atlas.terrain,travel:window.__atlas.travel,sys:window.__atlas.state.sys,body:window.__atlas.state.body,stats:window.__atlas.stats}));
try {
  const query=new URLSearchParams({seed:'LETHRA-001',g:'G001',system:'G001/C2128,0,1/0',body:'G001/C2128,0,1/0/planet/1'});
  await page.goto(base+'?'+query);
  await wait(()=>window.__atlas?.ready&&window.__atlas.terrain?.tiles?.ready);
  await page.waitForTimeout(3000);
  const far=await read();
  assert.equal(far.terrain.tiles.projection,'cube-sphere');
  assert.ok(far.body.water>0,'ocean planet fixture');
  await page.screenshot({path:out+'/01-orbital-globe.png'});
  await page.locator('#approach').click();
  await wait(()=>window.__atlas.travel.active&&!window.__atlas.travel.autopilot&&window.__atlas.terrain.tiles.maxLevel>=3);
  await page.waitForTimeout(3000);
  const low=await read();
  const center=low.travel.bodies.find(b=>b.id===low.body.id).positionM;
  const altitude=t=>Math.hypot(...t.position.map((v,i)=>v-center[i]))-low.body.radiusM;
  assert.ok(altitude(low.travel)<101000&&altitude(low.travel)>29000);
  assert.equal(low.travel.sceneId,far.travel.sceneId);
  assert.deepEqual(low.travel.bodies.map(b=>b.objectId),far.travel.bodies.map(b=>b.objectId));
  assert.ok(low.terrain.tiles.resident<=256&&low.terrain.tiles.pending<=2);
  assert.equal(low.terrain.tiles.failures,0);
  await page.screenshot({path:out+'/02-low-orbit.png'});
  await page.locator('#hold-orbit').click();
  assert.ok((await read()).travel.orbitAssist);
  await page.mouse.move(650,400);
  await page.mouse.wheel(0,-850); // ~13x; complete a great circle in about 11 simulated seconds.
  const track=await page.evaluate(async()=>{
    const rows=[];
    for(let i=0;i<1000;i++){
      await new Promise(requestAnimationFrame);
      const a=window.__atlas,t=a.travel,b=a.state.body,c=t.bodies.find(x=>x.id===b.id).positionM;
      const p=t.position.map((v,j)=>v-c[j]),r=Math.hypot(...p);
      rows.push({latitude:Math.asin(p[1]/r)*180/Math.PI,r,heading:t.heading,resident:a.terrain.tiles.resident,visible:a.terrain.tiles.visible,pending:a.terrain.tiles.pending,faces:a.terrain.tiles.faces});
      if(rows.length>200&&Math.min(...rows.map(x=>x.latitude))< -88&&Math.max(...rows.map(x=>x.latitude))>88)break;
    }
    return rows;
  });
  const north=Math.max(...track.map(r=>r.latitude)),south=Math.min(...track.map(r=>r.latitude));
  assert.ok(north>88&&south< -88,`actual orbit crosses both poles: ${south} to ${north}`);
  const radii=track.map(t=>t.r);
  assert.ok(Math.max(...radii)-Math.min(...radii)<1,'assisted altitude stable to one metre');
  for(let i=1;i<track.length;i++)assert.ok(Math.abs(track[i].heading.reduce((s,v,j)=>s+v*track[i-1].heading[j],0))>.995,'no camera flips');
  assert.ok(track.every(t=>t.resident<=256&&t.pending<=2&&t.visible>0));
  await page.screenshot({path:out+'/03-polar-orbit.png'});
  await page.keyboard.press('w');
  assert.equal((await read()).travel.orbitAssist,null,'movement releases orbit');
  // Restore throttle and descend using the real UI.
  await page.mouse.wheel(0,850);
  await page.locator('#descend').click();
  await wait(()=>!window.__atlas.travel.autopilot);
  const descent=await read();
  assert.ok(altitude(descent.travel)<25000);
  assert.ok(descent.travel.clearance>=2900,'descent respects terrain floor');
  await page.screenshot({path:out+'/04-atmospheric-descent.png'});
  await page.keyboard.press('Escape');
  const moon=far.sys.moons.find(m=>m.type!=='Gas giant');
  assert.ok(moon,'fixture has an airless moon');
  const moonQuery=new URLSearchParams(query);moonQuery.set('body',moon.id);
  await page.goto(base+'?'+moonQuery);
  await wait(()=>window.__atlas?.ready&&window.__atlas.terrain?.tiles?.ready);
  await page.locator('#approach').click();
  await wait(()=>!window.__atlas.travel.autopilot&&window.__atlas.terrain.tiles.maxLevel>=3);
  await page.waitForTimeout(3000);
  const lunar=await read();
  assert.equal(lunar.body.id,moon.id);
  assert.ok(lunar.terrain.tiles.visible>0&&lunar.terrain.tiles.resident<=256);
  await page.screenshot({path:out+'/05-moon-orbit.png'});
  await page.locator('[data-level="universe"]').click();
  await wait(()=>window.__atlas.ready&&window.__atlas.state.level==='universe');
  assert.equal(await page.evaluate(()=>window.__atlas.terrain),null,'terrain disposed on departure');
  assert.deepEqual(errors,[]);
  const report={ok:true,base,planet:far.body.id,moon:moon.id,north,south,radiusDriftM:Math.max(...radii)-Math.min(...radii),far:far.terrain.tiles,low:low.terrain.tiles,descent:descent.terrain.tiles,moonTiles:lunar.terrain.tiles,peakCache:Math.max(...track.map(t=>t.resident)),errors};
  await writeFile(out+'/report.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify(report));
}catch(e){await page.screenshot({path:out+'/failure.png'});console.log(JSON.stringify(await read()));console.log(errors);throw e;}
finally{await browser.close();}
