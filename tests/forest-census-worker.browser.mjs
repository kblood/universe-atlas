import {chromium} from 'playwright';
import {createServer} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createForestCensus} from '../src/forest-census.ts';
import {galaxies,refByAddress,system} from '../src/catalog.ts';

const out=process.env.ATLAS_RESULTS||'test-results/forest-census-worker';
await mkdir(out,{recursive:true});
const server=await createServer({configFile:false,root:process.cwd(),server:{host:'127.0.0.1',port:0},appType:'custom'});
await server.listen();const base=`http://127.0.0.1:${server.httpServer.address().port}`;
const browser=await chromium.launch({headless:true,args:['--disable-gpu']});
const page=await browser.newPage();const errors=[];
page.on('pageerror',error=>errors.push(String(error)));
const body=system(refByAddress(galaxies('LETHRA-001')[0],'G001/C2128,0,1/0')).planets[1];
const reference=await createForestCensus(body,0),n=reference.n;
// Ground direction captured by the existing live navigation fixture.
const d=[.7830496262,-.2907992331,.5497900408],u=-d[2]/d[0],v=d[1]/d[0];
const x=Math.floor((u+1)*n/16),y=Math.floor((v+1)*n/16);
const addresses=Array.from({length:16},(_,i)=>({face:0,n,x:x+i%4,y:y+Math.floor(i/4)}));
const normalize=patch=>({...patch,records:Array.from(patch.records)});
function complete(address){let p=reference.start(address);while(!p)p=reference.step();return normalize(p);}
const expected=addresses.map(complete);assert.ok(expected.some(p=>p.present>0),'real forest fixture');
let report;
try{
  await page.route(`${base}/census-test`,route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Forest census worker check</title>'}));
  await page.goto(`${base}/census-test`);
  await page.evaluate(()=>{
    window.messages=[];window.workerErrors=[];
    window.worker=new Worker('/src/forest-census-worker.ts',{type:'module'});
    window.worker.onmessage=({data})=>{
      if(data.patches)data.patches=data.patches.map(p=>({...p,records:Array.from(p.records)}));
      window.messages.push(data);
    };
    window.worker.onerror=event=>window.workerErrors.push(event.message);
  });
  const send=data=>page.evaluate(data=>window.worker.postMessage(data),data);
  const wait=async(type,generation,requestId)=>{
    await page.waitForFunction(({type,generation,requestId})=>window.workerErrors.length||window.messages.some(m=>m.type===type&&m.generation===generation&&(requestId===undefined||m.requestId===requestId)),{type,generation,requestId},{timeout:60000});
    const workerErrors=await page.evaluate(()=>window.workerErrors);assert.deepEqual(workerErrors,[]);
    return page.evaluate(({type,generation,requestId})=>window.messages.find(m=>m.type===type&&m.generation===generation&&(requestId===undefined||m.requestId===requestId)),{type,generation,requestId});
  };
  const collect=async(generation,requestId)=>{
    await page.waitForFunction(({generation,requestId})=>window.workerErrors.length||window.messages.some(m=>m.generation===generation&&m.requestId===requestId&&(m.type==='error'||m.done)),{generation,requestId},{timeout:60000});
    const packets=await page.evaluate(({generation,requestId})=>window.messages.filter(m=>m.generation===generation&&m.requestId===requestId),{generation,requestId});
    assert.ok(!packets.some(p=>p.type==='error'));assert.equal(packets.at(-1).done,true);return packets;
  };
  await send({type:'configure',generation:1,body,waterLevelM:0});
  const ready=await wait('ready',1);assert.equal(ready.context,reference.context);assert.equal(ready.n,n);
  await send({type:'patches',generation:1,requestId:1,addresses});
  const cold=await collect(1,1);assert.deepEqual(cold.flatMap(p=>p.patches),expected);
  assert.ok(cold.every(p=>p.patches.length<=8),'response batches bounded');
  await send({type:'patches',generation:1,requestId:2,addresses:[...addresses].reverse()});
  const warm=await collect(1,2);assert.deepEqual(warm.flatMap(p=>p.patches),[...expected].reverse());
  assert.equal(warm.at(-1).cache.hits,16);assert.equal(warm.at(-1).cache.sampledCandidates,cold.at(-1).cache.sampledCandidates);
  await send({type:'patches',generation:1,requestId:3,addresses:Array.from({length:64},(_,i)=>({face:0,n,x:x+i+40,y}))});
  await send({type:'cancel',generation:1,requestId:3});await wait('cancelled',1,3);
  const cancellationCount=await page.evaluate(()=>window.messages.length);await page.waitForTimeout(50);
  assert.equal(await page.evaluate(()=>window.messages.length),cancellationCount,'cancel stops future replies');
  await send({type:'patches',generation:1,requestId:4,addresses:Array(65).fill(addresses[0])});
  const rejected=await wait('error',1,4);assert.match(rejected.error,/batch limit/);
  await send({type:'patches',generation:1,requestId:5,addresses:[addresses[0]]});
  const recovered=await collect(1,5);assert.deepEqual(recovered[0].patches,[expected[0]]);
  await send({type:'configure',generation:2,body,waterLevelM:10});
  await send({type:'configure',generation:3,body,waterLevelM:3000});
  const wet=await wait('ready',3);assert.notEqual(wet.context,ready.context);
  const count=await page.evaluate(()=>window.messages.length);
  await send({type:'configure',generation:1,body,waterLevelM:0});
  await send({type:'patches',generation:1,requestId:10,addresses});await page.waitForTimeout(50);
  assert.equal(await page.evaluate(()=>window.messages.length),count,'old generations cannot alter active context');
  await send({type:'patches',generation:3,requestId:1,addresses});
  const flooded=await collect(3,1);assert.ok(flooded.flatMap(p=>p.patches).every(p=>p.present===0),'water context changes habitat');
  assert.deepEqual(await page.evaluate(()=>window.workerErrors),[]);assert.deepEqual(errors,[]);
  report={ok:true,scope:'Actual browser module worker; exact census and protocol checks, no renderer/visual claim',bodyId:body.id,patches:addresses.length,
    candidates:expected.reduce((s,p)=>s+p.candidates,0),present:expected.reduce((s,p)=>s+p.present,0),
    cold:cold.at(-1),warm:warm.at(-1),checks:['exact Node/browser equality','cache reuse and transfer ownership','bounded batches','cancellation','invalid batch recovery','context race','stale generation rejection','water invalidation'],errors};
  delete report.cold.patches;delete report.warm.patches;
  await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}catch(error){await writeFile(`${out}/failure.json`,JSON.stringify({error:String(error),errors,messages:await page.evaluate(()=>window.messages).catch(()=>null)},null,2));throw error;}
finally{await page.evaluate(()=>window.worker?.terminate()).catch(()=>{});await browser.close();await server.close();}
