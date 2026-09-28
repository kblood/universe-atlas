import {Worker,isMainThread,parentPort} from 'node:worker_threads';
import {once} from 'node:events';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {packForestSelection,unpackForestSelection} from '../src/forest-selection-transfer.ts';

if(!isMainThread){
  let cells;
  parentPort.on('message',data=>{
    if(data.cells){cells=data.cells;parentPort.postMessage({ready:true});return;}
    if(data.mode==='objects')parentPort.postMessage({cells});
    else {const start=performance.now(),packed=packForestSelection(cells);parentPort.postMessage({packed,packMs:performance.now()-start},[packed.buffer]);}
  });
}else{
  const {createServer}=await import('vite');
  const vite=await createServer({configFile:false,optimizeDeps:{noDiscovery:true},server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
  const worker=new Worker(new URL(import.meta.url));
  try{
    const {ForestSelectionCache}=await vite.ssrLoadModule('/src/forest-selection-cache.ts');
    const cache=new ForestSelectionCache('TRANSFER-BENCH',6000000,18);
    const cells=cache.select([1,1,1].map(x=>x/Math.sqrt(3)),750,4500),expected=JSON.stringify(cells);
    let response=once(worker,'message');worker.postMessage({cells});await response;
    const samples={objects:[],packed:[]},packMs=[],decodeMs=[];
    for(let i=0;i<30;i++)for(const mode of i%2?['objects','packed']:['packed','objects']){
      response=once(worker,'message');const start=performance.now();worker.postMessage({mode});
      const [data]=await response,decodeStart=performance.now();
      const result=data.packed?unpackForestSelection(data.packed):data.cells,elapsed=performance.now()-start;
      if(i>=5){samples[mode].push(elapsed);if(data.packed){packMs.push(data.packMs);decodeMs.push(performance.now()-decodeStart);}}
      assert.equal(JSON.stringify(result),expected);
    }
    const stats=a=>{const sorted=[...a].sort((a,b)=>a-b);return {p50:sorted[Math.floor(sorted.length*.5)],p95:sorted[Math.floor(sorted.length*.95)],max:sorted.at(-1)};};
    const report={scope:'Node worker_threads response including worker pack and main decode, excluding selection; not browser/frame/GPU timing',node:process.version,cells:cells.length,transferBytes:cells.length*96,warmups:5,samples:25,roundTripMs:{objects:stats(samples.objects),packed:stats(samples.packed)},packMs:stats(packMs),decodeMs:stats(decodeMs),raw:samples,exactEquality:true};
    const out=process.env.ATLAS_RESULTS||'test-results/forest-selection-transfer';await mkdir(out,{recursive:true});await writeFile(`${out}/benchmark.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
  }finally{await worker.terminate();await vite.close();}
}
