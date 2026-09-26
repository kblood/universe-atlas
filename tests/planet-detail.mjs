import {chromium} from 'playwright';
import {browserArgs} from './browser-options.mjs';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.ATLAS_URL||'http://127.0.0.1:5187/';
const out=process.env.ATLAS_RESULTS||'test-results/planet-detail';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:browserArgs});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const wait=(fn,timeout=120000)=>page.waitForFunction(fn,null,{timeout});
const snapshot=()=>page.evaluate(()=>({terrain:window.__atlas.terrain.tiles,travel:window.__atlas.travel,stats:window.__atlas.stats}));
try{
  await page.goto(base+'?seed=LETHRA-001&g=G001&system=G001/C2128,0,1/0&body=G001/C2128,0,1/0/planet/1');
  await wait(()=>window.__atlas?.ready);
  await page.locator('#find-life').click();
  await wait(()=>window.__atlas.travel.terrainCruise);
  await wait(()=>window.__atlas.terrain.tiles.surfaceReady&&window.__atlas.terrain.tiles.forest.visible>200);
  await page.waitForTimeout(5000);
  const flying=await snapshot();
  assert.equal(flying.travel.walking,null);
  assert.ok(flying.terrain.forest.visible>200,'forest is visible before landing');
  assert.ok(flying.terrain.forest.cached<=12000,'bounded population cache');
  await page.screenshot({path:out+'/01-forest-in-flight.png'});
  await page.keyboard.press('w');
  await page.keyboard.down('q');
  await wait(()=>window.__atlas.travel.surface.terrainClearance<230);
  await page.keyboard.up('q');
  await page.waitForTimeout(5000);
  const low=await snapshot();
  assert.equal(low.travel.walking,null);
  assert.ok(low.terrain.faunaVisibleCount>0,'animals appear during low flight');
  assert.ok(low.terrain.floraPresentCount>0,'ordinary habitat ground cover is populated');
  await page.screenshot({path:out+'/02-wildlife-before-landing.png'});
  await page.keyboard.down('q');
  await wait(()=>window.__atlas.travel.walking,240000);
  await page.keyboard.up('q');await page.waitForTimeout(3000);
  const landed=await snapshot();
  await page.screenshot({path:out+'/03-automatic-touchdown.png'});
  assert.ok(landed.terrain.forest.visible>0);
  assert.ok(landed.terrain.reservedCombinedBytes<=landed.terrain.budgetBytes);
  assert.deepEqual(errors,[]);
  const report={ok:true,base,flying,low,landed,errors};
  await writeFile(out+'/report.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify({ok:true,forest:flying.terrain.forest,lowFauna:low.terrain.faunaVisibleCount,
    lowPlants:low.terrain.floraPresentCount,walking:landed.travel.walking,errors}));
}catch(error){await page.screenshot({path:out+'/failure.png'});await writeFile(out+'/failure.json',JSON.stringify(await snapshot(),null,2));throw error;}
finally{await browser.close();}
