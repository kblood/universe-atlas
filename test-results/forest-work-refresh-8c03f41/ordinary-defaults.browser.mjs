import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {browserArgs} from '../../tests/browser-options.mjs';
const base=process.env.ATLAS_URL||'http://127.0.0.1:5199/';
const out=process.env.ATLAS_RESULTS||'test-results/forest-work-refresh-8c03f41';
const expected=process.env.ATLAS_EXPECTED_COMMIT;
assert.match(expected||'',/^[a-f0-9]{40}$/);
const stamp=await fetch(new URL('build-info.json',base)).then(r=>r.json());
assert.equal(stamp.commit,expected);assert.equal(stamp.dirty,false);
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:browserArgs});
try {
 const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1});
 const page=await context.newPage();
 const errors=[],forestRequests=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error'&&!m.text().startsWith('[vite] failed to connect to websocket.'))errors.push(m.text());});
 page.on('request',r=>{if(r.url().includes('/assets/forest/'))forestRequests.push(r.url());});
 await page.addInitScript(()=>localStorage.clear());
 await page.goto(base,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__atlas?.ready===true,null,{timeout:90000});
 const state=await page.evaluate(()=>({href:location.href,ready:window.__atlas.ready,level:window.__atlas.state?.level,body:window.__atlas.state?.body?.id,
  detailedForestEnabled:window.__atlas.forestAssets?.enabled,surfaceLighting:window.__atlas.surfaceLighting,
  localStorage:{trees:localStorage.getItem('trees'),lighting:localStorage.getItem('lighting')}}));
 await page.screenshot({path:`${out}/00-ordinary-url-default.png`,fullPage:true});
 assert.equal(state.detailedForestEnabled,false,'ordinary URL defaults to basic forest assets');
 assert.equal(state.surfaceLighting?.enabled,true,'ordinary URL defaults surface lighting on');
 assert.equal(forestRequests.length,0,'ordinary URL makes no detailed tree bundle requests');
 assert.deepEqual(errors,[]);
 await writeFile(`${out}/ordinary-defaults.json`,JSON.stringify({ok:true,expectedBuild:expected,servedBuild:stamp,state,forestRequests,errors},null,2));
} finally {await browser.close();}
