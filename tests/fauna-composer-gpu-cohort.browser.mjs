import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {withGpuLock} from './helpers/gpu-lock.mjs';
const input=process.env.COMPOSER_COHORT;if(!input)throw new Error('COMPOSER_COHORT must name an independently captured cohort');
const raw=await readFile(input,'utf8'),fixture=JSON.parse(raw),output=process.env.COMPOSER_GPU_COHORT_OUTPUT??'test-results/composer-gpu-cohort';await mkdir(output,{recursive:true});
const query=new URLSearchParams();if(process.env.COMPOSER_GPU_COHORT_LIFECYCLE_ONLY==='1')query.set('lifecycleOnly','1');if(process.env.COMPOSER_GPU_COHORT_WORKER)query.set('worker',process.env.COMPOSER_GPU_COHORT_WORKER);
await withGpuLock({owner:'composer-gpu-cohort-ownership',capture:true},async()=>{
 const browser=await chromium.launch({headless:true}),page=await browser.newPage(),errors=[];
 page.on('pageerror',e=>{errors.push(e.message);console.error(e.message);});page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 let timer;
 try{await page.goto((process.env.COMPOSER_GPU_COHORT_BASE_URL??'http://127.0.0.1:5194')+'/tests/fauna-composer-gpu-cohort.html?'+query);await page.waitForFunction(()=>window.__gpuCohort?.ready);
  timer=setInterval(async()=>{try{console.log(JSON.stringify(await page.evaluate(()=>window.__gpuCohort.live)));}catch{}},10000);
  const report=await page.evaluate(f=>window.__gpuCohort.run(f),fixture);report.input=input;report.sha256=createHash('sha256').update(raw).digest('hex');report.errors=errors;report.sourceBuild=fixture.sourceBuild;report.kitCommit=fixture.kitCommit;
  await writeFile(output+'/report.json',JSON.stringify(report,null,2));await page.screenshot({path:output+'/resource-scene.png'});assert.deepEqual(errors,[]);assert.equal(report.count,report.lifecycleOnly?0:fixture.candidates.length);
  console.log(JSON.stringify({count:report.count,lifecycle:report.lifecycle,phases:report.phases?.map(p=>({label:p.label,active:p.diagnostics.active,bytes:p.diagnostics.ownedBytes,peak:p.peakOwnedBytes,breakdown:p.breakdown})),errors},null,2));
 }catch(error){await writeFile(output+'/failure.json',JSON.stringify({error:String(error),errors,live:await page.evaluate(()=>window.__gpuCohort?.live).catch(()=>null)},null,2));throw error;}
 finally{clearInterval(timer);await browser.close();}
});
