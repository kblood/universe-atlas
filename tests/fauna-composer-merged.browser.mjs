import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {withGpuLock} from './helpers/gpu-lock.mjs';
const output=process.env.COMPOSER_MERGED_RESULTS??'C:/LLM/IWSDK/Assets/_assetctl/planet-composer-merged-20261011';
await mkdir(output,{recursive:true});
await withGpuLock({owner:'planet-composer-merged-visual',capture:true},async()=>{
 const browser=await chromium.launch({headless:true});
 try{const page=await browser.newPage({viewport:{width:1100,height:760}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text());});
  await page.goto('http://127.0.0.1:5194/tests/fauna-composer-merged.html');await page.waitForFunction(()=>window.__mergedReview?.ready,{timeout:60000});
  await page.evaluate(()=>window.__mergedReview.render('baseline'));await page.screenshot({path:output+'/baseline.png'});
  await page.evaluate(()=>window.__mergedReview.render('merged'));await page.screenshot({path:output+'/merged.png'});
  const report=await page.evaluate(()=>{const {render,...report}=window.__mergedReview;return report;});report.errors=errors;
  await writeFile(output+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
  assert.equal(errors.length,0);assert.ok(report.comparison.mean<.03,`merged pixel error ${report.comparison.mean}`);assert.equal(report.budget.draws,1);assert.ok(report.mergedStats.calls<report.baselineStats.calls);
 }finally{await browser.close();}
});
