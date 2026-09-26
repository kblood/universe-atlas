import {chromium} from 'playwright';
import {browserArgs} from './browser-options.mjs';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.ATLAS_URL||'http://127.0.0.1:5190/';
const out=process.env.ATLAS_RESULTS||'test-results/free-flight';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:browserArgs});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],crossings=[];
page.on('pageerror',e=>errors.push(e.message));
const wait=fn=>page.waitForFunction(fn,null,{timeout:90000});
async function verify(domain){
  await page.waitForFunction(d=>window.__atlas.travel.domain===d&&!window.__atlas.ready,domain,{timeout:90000});
  const before=await page.evaluate(()=>window.__atlas.travel);
  await page.waitForTimeout(100);
  const after=await page.evaluate(()=>window.__atlas.travel);
  assert.equal(after.active,true);assert.equal(after.autopilot,null);assert.equal(after.cruise,false);
  assert.ok(Math.hypot(...after.position.map((v,i)=>v-before.position[i]))>0,'held forward moves during '+domain+' blend');
  await wait(()=>window.__atlas.ready);
  assert.equal(await page.evaluate(()=>window.__atlas.travel.active),true);
  await page.keyboard.up('w');await page.keyboard.press('Shift');
  crossings.push({domain,before:before.position,after:after.position});
}
try{
  await page.goto(base+'?seed=LETHRA-001');await wait(()=>window.__atlas?.ready);
  await page.locator('[data-select="G001"]').click();await page.locator('#fly-target').click();
  await wait(()=>window.__atlas.appearance.galaxyPreview.some(g=>g.radii<8&&g.radii>6));
  await page.keyboard.down('w');await verify('galaxy');
  await page.screenshot({path:out+'/galaxy.png'});
  await page.goto(base+'?seed=LETHRA-001&g=G001');await wait(()=>window.__atlas?.ready);await page.waitForTimeout(1000);
  let target;
  for(const t of await page.evaluate(()=>window.__atlas.mapTargets)){
    await page.mouse.click(t.x,t.y);
    if(await page.evaluate(()=>window.__atlas.selected)===t.id){target=t;break;}
  }
  assert.ok(target);await page.locator('#approach-star').click();await wait(()=>window.__atlas.ready);
  await page.locator('#fly-target').click();await wait(()=>window.__atlas.appearance.target?.distanceLy<.2);
  await page.keyboard.down('w');await verify('system');
  await page.screenshot({path:out+'/system.png'});assert.deepEqual(errors,[]);
  await writeFile(out+'/report.json',JSON.stringify({ok:true,base,crossings,errors},null,2));console.log(JSON.stringify({ok:true,crossings,errors}));
}catch(error){await page.screenshot({path:out+'/failure.png'});throw error;}finally{await browser.close();}
