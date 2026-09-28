import {chromium} from 'playwright';
import {createServer} from 'vite';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {browserArgs} from './browser-options.mjs';
const out=process.env.ATLAS_RESULTS||'test-results/forest-impostor-field';await mkdir(out,{recursive:true});
const server=await createServer({configFile:false,root:process.cwd(),server:{host:'127.0.0.1',port:0},appType:'custom'});await server.listen();
const base=`http://127.0.0.1:${server.httpServer.address().port}`,browser=await chromium.launch({headless:true,args:browserArgs}),page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
  await page.route(`${base}/field-test`,r=>r.fulfill({contentType:'text/html',body:'<!doctype html><style>body{margin:0}</style><script type="module" src="/tests/forest-impostor-field-lab.mjs"></script>'}));
  await page.goto(`${base}/field-test`);await page.waitForFunction(()=>window.fieldReady,{}, {timeout:120000});assert.deepEqual(errors,[]);
  const report={...await page.evaluate(()=>window.fieldLab.summary),samples:[],scope:'Isolated full population and coarse terrain lab; no live streaming, shadows, aerial perspective, wind or game frame-time claim'};
  assert.ok(report.trees>140000&&report.trees<160000,'real full forest fixture');
  for(const height of [120,1200])for(const useFar of [false,true]){
    const result=await page.evaluate(async({useFar,height})=>window.fieldLab.benchmark(useFar,height),{useFar,height});report.samples.push(result);
    await page.screenshot({path:`${out}/${useFar?'impostor':'reference'}-${height}m.png`});console.log(JSON.stringify(result));
  }
  assert.deepEqual(errors,[]);report.ok=true;report.errors=errors;
  report.recordedAt=new Date().toISOString();report.source={baseCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),files:[]};
  for(const path of ['src/forest-impostor.ts','src/tree-shape.ts','src/forest-patch-selection.ts','src/forest-census.ts','tests/forest-impostor-field-lab.mjs','tests/forest-impostor-field-worker.mjs','tests/forest-impostor-field.browser.mjs'])report.source.files.push({path,sha256:createHash('sha256').update(await readFile(path)).digest('hex')});
  await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));
}catch(error){await writeFile(`${out}/failure.json`,JSON.stringify({error:String(error),errors},null,2));throw error;}
finally{await page.evaluate(()=>window.fieldLab?.dispose()).catch(()=>{});await browser.close();await server.close();}
