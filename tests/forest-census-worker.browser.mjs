import {chromium} from 'playwright';
import {createServer} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createForestCensus} from '../src/forest-census.ts';
import {forestPatchAddresses} from '../src/forest-patch-selection.ts';
import {populationCells,FOREST_CELL_M} from '../src/planet-population.ts';
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
const rawDirection=[.7830496262,-.2907992331,.5497900408],length=Math.hypot(...rawDirection),d=rawDirection.map(v=>v/length),u=-d[2]/d[0],v=d[1]/d[0];
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
      if(data.packed){data.packedType=data.packed.constructor.name;data.packedLength=data.packed.length;data.packed=Array.from(data.packed);}
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
    const packets=await page.evaluate(({generation,requestId})=>window.messages.filter(m=>m.generation===generation&&m.requestId===requestId&&(m.type==='patches'||m.type==='error')),{generation,requestId});
    assert.ok(!packets.some(p=>p.type==='error'));assert.equal(packets.at(-1).done,true);
    for(const packet of packets.filter(p=>p.type==='patches'))assert.ok(packet.maxSliceMs<50,`worker slice ${packet.maxSliceMs}ms exceeds generous bound`);
    return packets;
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
  const longAddresses=Array.from({length:64},(_,i)=>({face:0,n,x:x+100+i,y}));
  const longExpected=longAddresses.map(complete);
  const protocolStart=await page.evaluate(()=>window.messages.length);
  await send({type:'patches',generation:1,requestId:6,addresses:longAddresses});
  // The independent selection counter may use the same ID as the active patch job.
  const selectionRange=1200;
  const expectedSelection=forestPatchAddresses(d,body.radiusM,selectionRange);
  const selectionCellCandidates=populationCells(body.seed,d,body.radiusM,selectionRange,FOREST_CELL_M);
  assert.ok(selectionCellCandidates.length>0,'coverage fixture must include production-selected population cells');
  const selectedByWorker=async(requestId,rangeM=selectionRange,center=d)=>{
    await send({type:'select',generation:1,requestId,center,rangeM});
    await page.waitForFunction(({requestId})=>window.messages.some(m=>(m.type==='selection'||m.type==='error')&&m.generation===1&&m.requestId===requestId),{requestId},{timeout:60000});
    return page.evaluate(({requestId})=>window.messages.find(m=>(m.type==='selection'||m.type==='error')&&m.generation===1&&m.requestId===requestId),{requestId});
  };
  const selected=await selectedByWorker(6);
  assert.equal(selected.type,'selection');assert.equal(selected.context,ready.context);
  assert.equal(selected.packedType,'Float64Array');assert.equal(selected.packedLength%4,0);
  assert.equal(selected.packed.length,selected.packedLength);
  const packedAddresses=[];
  for(let i=0;i<selected.packed.length;i+=4){
    const [face,grid,xp,yp]=selected.packed.slice(i,i+4);
    assert.ok(Number.isInteger(face)&&face>=0&&face<=5);
    assert.equal(grid,n);
    assert.ok(Number.isInteger(xp)&&xp>=0&&xp<Math.ceil(n/8));
    assert.ok(Number.isInteger(yp)&&yp>=0&&yp<Math.ceil(n/8));
    packedAddresses.push({face,n:grid,x:xp,y:yp});
  }
  assert.deepEqual(packedAddresses,expectedSelection,'packed selection preserves deterministic patch addresses');
  const selectedKeys=new Set(packedAddresses.map(a=>`${a.face}/${a.n}/${a.x}/${a.y}`));
  for(const cell of selectionCellCandidates){
    const [face,grid,ix,iy]=cell.id.split('/').map(Number);
    assert.ok(selectedKeys.has(`${face}/${grid}/${Math.floor(ix/8)}/${Math.floor(iy/8)}`),`selected patch covers ${cell.id}`);
  }
  const invalidSelection=await selectedByWorker(7,body.radiusM*.2);
  assert.equal(invalidSelection.type,'error');assert.equal(invalidSelection.phase,'selection');
  assert.equal(invalidSelection.generation,1);assert.equal(invalidSelection.requestId,7);
  const staleSelection=await selectedByWorker(8,selectionRange,[1,0,0]);
  assert.equal(staleSelection.type,'selection','a valid newer selection recovers after selection failure');
  await send({type:'select',generation:2,requestId:9,center:d,rangeM:selectionRange});
  await page.waitForFunction(()=>window.messages.some(m=>m.type==='error'&&m.phase==='selection'&&m.generation===2&&m.requestId===9),null,{timeout:60000});
  const futureSelectionError=await page.evaluate(()=>window.messages.find(m=>m.type==='error'&&m.phase==='selection'&&m.generation===2&&m.requestId===9));
  assert.equal(futureSelectionError.requestId,9);
  await send(null);
  await send({type:'unknown-census-message',generation:1,requestId:77});
  await send({type:'patches',generation:1,requestId:0,addresses:[]});
  await send({type:'patches',generation:'bad',requestId:78,addresses:[]});
  await page.waitForFunction(({protocolStart})=>window.messages.slice(protocolStart).filter(m=>m.type==='error'&&m.phase==='protocol').length>=4,{protocolStart},{timeout:60000});
  const protocolErrors=await page.evaluate(({protocolStart})=>window.messages.slice(protocolStart).filter(m=>m.type==='error'&&m.phase==='protocol'),{protocolStart});
  assert.equal(protocolErrors.length,4);assert.ok(protocolErrors.every(m=>m.requestId===null),'protocol errors must not impersonate the live request');
  const protocolProtected=await collect(1,6);assert.deepEqual(protocolProtected.flatMap(p=>p.patches),longExpected,
    'malformed envelopes must not cancel an unrelated live census job');
  const supersededA=Array.from({length:64},(_,i)=>({face:0,n,x:x+300+i,y}));
  const supersedingB=[{face:0,n,x:x+500,y}];const expectedB=supersedingB.map(complete);
  await send({type:'patches',generation:1,requestId:7,addresses:supersededA});
  await send({type:'patches',generation:1,requestId:8,addresses:supersedingB});
  const supersession=await collect(1,8);assert.deepEqual(supersession.flatMap(p=>p.patches),expectedB);
  await page.waitForTimeout(50);
  assert.equal(await page.evaluate(()=>window.messages.some(m=>m.generation===1&&m.requestId===7&&m.done)),false,
    'newer patch work implicitly supersedes the earlier request');
  await send({type:'patches',generation:1,requestId:9,addresses:Array.from({length:64},(_,i)=>({face:0,n,x:x+600+i,y}))});
  await send({type:'patches',generation:1,requestId:10,addresses:Array(65).fill(addresses[0])});
  const invalidNewer=await wait('error',1,10);assert.equal(invalidNewer.phase,'request');
  await page.waitForTimeout(50);
  assert.equal(await page.evaluate(()=>window.messages.some(m=>m.generation===1&&m.requestId===9&&m.done)),false,
    'a newer well-formed envelope supersedes even when its batch is invalid');
  await send({type:'patches',generation:1,requestId:11,addresses:[addresses[0]]});
  const afterRejected=await collect(1,11);assert.deepEqual(afterRejected.flatMap(p=>p.patches),[expected[0]]);
  await send({type:'configure',generation:2,body,waterLevelM:10});
  await send({type:'configure',generation:3,body,waterLevelM:3000});
  const wet=await wait('ready',3);assert.notEqual(wet.context,ready.context);
  const count=await page.evaluate(()=>window.messages.length);
  await send({type:'configure',generation:1,body,waterLevelM:0});
  await send({type:'patches',generation:1,requestId:10,addresses});await page.waitForTimeout(50);
  assert.equal(await page.evaluate(()=>window.messages.length),count,'old generations cannot alter active context');
  await send({type:'patches',generation:3,requestId:1,addresses});
  const flooded=await collect(3,1);assert.ok(flooded.flatMap(p=>p.patches).every(p=>p.present===0),'water context changes habitat');
  const completedCount=await page.evaluate(()=>window.messages.length);
  await send({type:'cancel',generation:3,requestId:1});await page.waitForTimeout(50);
  assert.equal(await page.evaluate(()=>window.messages.length),completedCount,'cancel after done is silent');
  await page.evaluate(()=>{
    window.preReadyMessages=[];window.preReadyErrors=[];window.preReadyWorker=new Worker('/src/forest-census-worker.ts',{type:'module'});
    window.preReadyWorker.onmessage=({data})=>window.preReadyMessages.push(data);
    window.preReadyWorker.onerror=event=>window.preReadyErrors.push(event.message);
  });
  const sendPreReady=data=>page.evaluate(data=>window.preReadyWorker.postMessage(data),data);
  const waitPreReady=async(predicate)=>{
    await page.waitForFunction(()=>window.preReadyErrors.length||window.preReadyMessages.some(m=>m.type==='error'&&m.phase==='request'),null,{timeout:60000});
    const item=await page.evaluate(predicate);assert.deepEqual(await page.evaluate(()=>window.preReadyErrors),[]);return item;
  };
  await sendPreReady({type:'patches',generation:1,requestId:1,addresses:[addresses[0]]});
  const beforeReady=await waitPreReady(()=>window.preReadyMessages.find(m=>m.type==='error'&&m.phase==='request'));
  assert.equal(beforeReady.requestId,1,'patches before ready should receive a request-scoped error');
  await sendPreReady({type:'configure',generation:2,body:{...body,radiusM:NaN},waterLevelM:0});
  await page.waitForFunction(()=>window.preReadyMessages.some(m=>m.type==='error'&&m.phase==='configure'&&m.generation===2),null,{timeout:60000});
  const configureError=await page.evaluate(()=>window.preReadyMessages.find(m=>m.type==='error'&&m.phase==='configure'&&m.generation===2));
  assert.equal(configureError.requestId,0);
  await sendPreReady({type:'configure',generation:3,body,waterLevelM:0});
  await page.waitForFunction(()=>window.preReadyMessages.some(m=>m.type==='ready'&&m.generation===3),null,{timeout:60000});
  const recoveredReady=await page.evaluate(()=>window.preReadyMessages.find(m=>m.type==='ready'&&m.generation===3));
  assert.equal(recoveredReady.context,reference.context,'a newer valid configure recovers after configure failure');
  await sendPreReady({type:'patches',generation:3,requestId:1,addresses:[addresses[0]]});
  await page.waitForFunction(()=>window.preReadyMessages.some(m=>m.type==='patches'&&m.generation===3&&m.requestId===1&&m.done),null,{timeout:60000});
  const preReadyRecovery=await page.evaluate(()=>window.preReadyMessages.filter(m=>m.type==='patches'&&m.generation===3&&m.requestId===1));
  assert.deepEqual(preReadyRecovery.flatMap(p=>p.patches).map(normalize),[expected[0]]);
  assert.deepEqual(await page.evaluate(()=>window.workerErrors),[]);assert.deepEqual(errors,[]);
  report={ok:true,scope:'Actual browser module worker; exact census and protocol checks, no renderer/visual claim',bodyId:body.id,patches:addresses.length,
    candidates:expected.reduce((s,p)=>s+p.candidates,0),present:expected.reduce((s,p)=>s+p.present,0),
    cold:cold.at(-1),warm:warm.at(-1),selection:{requestId:6,patchRequestId:6,rangeM:selectionRange,patches:selected.packed.length/4,cellsChecked:selectionCellCandidates.length,selectionMs:selected.selectionMs},
    checks:['exact Node/browser equality','address+offset identity reconstruction','cache reuse and transfer ownership','bounded batches and <50ms max-slice bound','selection counter independent from patch counter','packed selection grid validation','production-cell coverage by selected patches','selection errors preserve active patch job','future-generation selection error preserves active patch job','cancellation','cancel after done silent','request/phase error attribution','protocol faults preserve live job','A-to-B supersession','invalid newer batch supersedes','pre-ready request rejection','configure error recovery','context race','stale generation rejection','water invalidation'],
    limitations:['A worker-internal step exception with already completed patches was not induced: production exposes no fault-injection hook. The class-level step throw/recovery path is covered by the Node census test.'],errors};
  delete report.cold.patches;delete report.warm.patches;
  await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}catch(error){await writeFile(`${out}/failure.json`,JSON.stringify({error:String(error),errors,messages:await page.evaluate(()=>window.messages).catch(()=>null),preReadyMessages:await page.evaluate(()=>window.preReadyMessages).catch(()=>null)},null,2));throw error;}
finally{await page.evaluate(()=>{window.worker?.terminate();window.preReadyWorker?.terminate();}).catch(()=>{});await browser.close();await server.close();}
