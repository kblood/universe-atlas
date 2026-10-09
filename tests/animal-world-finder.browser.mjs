import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {acquireGpuLock} from './helpers/gpu-lock.mjs';
import {startDistPreview,stopServer} from './helpers/free-port.mjs';
const out=process.env.ATLAS_RESULTS||'test-results/animal-world-finder-browser';
await mkdir(out,{recursive:true});
const server=process.env.ATLAS_URL?null:await startDistPreview({dist:'dist'});
const base=process.env.ATLAS_URL||server.base;
let lock,browser,page;
const errors=[],requests=[];
try{
  lock=await acquireGpuLock({owner:'animal-world-finder browser',capture:true,retryMs:30000});
  browser=await chromium.launch({headless:true,args:process.platform==='win32'?['--use-angle=d3d11','--enable-gpu']:['--enable-gpu']});
  page=await browser.newPage({viewport:{width:1440,height:1000}});
  page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>requests.push(r.url()));
  await page.goto(base+'?seed=LETHRA-001&g=G001');
  await page.waitForFunction(()=>window.__atlas?.ready&&window.__atlas.state.level==='galaxy',undefined,{timeout:90000});
  await page.locator('#find-animal-worlds').click();
  await page.waitForFunction(()=>document.querySelectorAll('[data-animal-world]').length>0,undefined,{timeout:60000});
  const initial=await page.locator('[data-animal-world]').evaluateAll(nodes=>nodes.map(n=>({id:n.dataset.animalWorld,text:n.textContent})));
  assert.equal(initial.length,5);
  for(const row of initial){assert.ok(row.id.startsWith('G001/'));assert.ok(row.id.includes('/planet/'));assert.ok(!row.id.includes('/moon/'));assert.match(row.text,/[1-9]\d* animal species/);}
  await page.screenshot({path:out+'/01-planets-with-animals.png'});
  await page.locator('#more-animal-worlds').click();
  await page.waitForFunction(previous=>{const rows=[...document.querySelectorAll('[data-animal-world]')];return rows.length>0&&rows[0].dataset.animalWorld!==previous;},initial[0].id,{timeout:60000});
  const more=await page.locator('[data-animal-world]').evaluateAll(nodes=>nodes.map(n=>n.dataset.animalWorld));
  assert.ok(more.every(id=>!initial.some(row=>row.id===id)),'next page does not repeat systems');
  await page.locator('#timeline > summary').click();
  await page.locator('#time-reset').click();
  await page.waitForFunction(()=>document.querySelectorAll('[data-animal-world]').length===0);
  await page.locator('#timeline > summary').click();
  await page.locator('#find-animal-worlds').click();
  await page.waitForFunction(()=>document.querySelectorAll('[data-animal-world]').length===5,undefined,{timeout:60000});
  const replay=await page.locator('[data-animal-world]').evaluateAll(nodes=>nodes.map(n=>n.dataset.animalWorld));
  assert.deepEqual(replay,initial.map(r=>r.id),'reference-date replay returns the same planets');
  await page.locator('[data-animal-world]').first().click();
  await page.waitForFunction(id=>window.__atlas?.ready&&window.__atlas.state.level==='body'&&window.__atlas.state.body?.id===id,initial[0].id,{timeout:90000});
  assert.ok(await page.locator('#find-life').isVisible(),'visited animal planet offers living-habitat navigation');
  await page.screenshot({path:out+'/02-visited-animal-planet.png'});
  assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
  await writeFile(out+'/report.json',JSON.stringify({ok:true,base,initial,more,replay,visited:initial[0].id,errors,requests},null,2));
  console.log(JSON.stringify({ok:true,worlds:initial.length,visited:initial[0].id}));
}catch(error){await page?.screenshot({path:out+'/failure.png'}).catch(()=>{});await writeFile(out+'/failure.json',JSON.stringify({error:String(error),errors,requests},null,2));throw error;}
finally{await browser?.close().catch(()=>{});await lock?.release();if(server)await stopServer(server.child);}
