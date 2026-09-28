import {chromium} from 'playwright';
import {createServer} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const out=process.env.ATLAS_RESULTS||'test-results/canopy-water-host';await mkdir(out,{recursive:true});
const server=await createServer({configFile:false,root:process.cwd(),server:{host:'127.0.0.1',port:0},appType:'custom'});
await server.listen();const base=`http://127.0.0.1:${server.httpServer.address().port}`;
const browser=await chromium.launch({headless:true,args:['--disable-gpu']});const page=await browser.newPage(),errors=[];
page.on('pageerror',e=>errors.push(String(e)));
try{
  await page.route(`${base}/test`,r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>Canopy water integration</title>'}));await page.goto(`${base}/test`);
  const result=await page.evaluate(async()=>{
    const [{PlanetCanopy},catalog,THREE]=await Promise.all([import('/src/planet-canopy.ts'),import('/src/catalog.ts'),import('/node_modules/three/build/three.module.js')]);
    const body=catalog.system(catalog.refByAddress(catalog.galaxies('LETHRA-001')[0],'G001/C2128,0,1/0')).planets[1];
    const ground=new THREE.Vector3(.7830496262,-.2907992331,.5497900408).normalize().toArray(),eye=new THREE.Vector3(...ground),origin=new THREE.Vector3();
    const host=new PlanetCanopy(body);let frames=0;
    const settle=async(water)=>{
      const start=performance.now();let scheduledDirtyBytes=0,maxSelectionSliceMs=0,maxInstallMs=0;
      while(performance.now()-start<120000){
        host.prepare(eye,ground,100,water,true,false,origin);host.finish();frames++;
        const d=host.diagnostics();scheduledDirtyBytes+=d.uploadBytes;maxSelectionSliceMs=Math.max(maxSelectionSliceMs,d.selectionApplySliceMs);maxInstallMs=Math.max(maxInstallMs,d.installMs);
        if(d.failures)throw new Error('Host failure '+JSON.stringify(d));
        // Test-only inspection: requestCursor is intentionally private runtime state.
        if(d.ready&&d.selectedPatches>0&&!d.selectionPending&&!d.reusePending&&!d.jobsInFlight&&!d.queuedPatches&&host.requestCursor>=host.order.length)return {ms:performance.now()-start,scheduledDirtyBytes,maxSelectionSliceMs,maxInstallMs,diagnostics:d};
        await new Promise(r=>setTimeout(r,4));
      }
      throw new Error('Host settle timed out '+JSON.stringify(host.diagnostics()));
    };
    try{
      const cold=await settle(0),before=new Map();
      // Capture only patches whose recorded interval proves reuse at 25 m.
      for(const [key,p] of host.installed)if(p.waterInterval&&25>p.waterInterval[0]&&25<=p.waterInterval[1])before.set(key,{start:p.range.start,count:p.range.count,ids:p.ids.slice(),records:Array.from(host.renderer.positions.array.slice(p.range.start*4,(p.range.start+p.ids.length)*4))});
      const shifted=await settle(25);let changedSlots=0,changedPositions=0;
      for(const [key,old] of before){const p=host.installed.get(key);if(!p||p.range.start!==old.start||JSON.stringify(p.ids)!==JSON.stringify(old.ids))changedSlots++;
        if(p&&JSON.stringify(Array.from(host.renderer.positions.array.slice(p.range.start*4,(p.range.start+p.ids.length)*4)))!==JSON.stringify(old.records))changedPositions++;}
      const stationary=await settle(25);
      return {cold,shifted,stationary,eligibleReuse:before.size,changedSlots,changedPositions,frames};
    }finally{host.dispose();}
  });
  assert.ok(result.cold.diagnostics.trees>100000);assert.ok(result.eligibleReuse>0);
  assert.equal(result.shifted.diagnostics.reusedPatches,result.eligibleReuse);
  assert.equal(result.changedSlots,0);assert.equal(result.changedPositions,0);assert.equal(result.shifted.scheduledDirtyBytes,0);assert.equal(result.stationary.scheduledDirtyBytes,0);assert.deepEqual(errors,[]);
  const files=['src/planet-canopy.ts','src/forest-census.ts','src/forest-census-worker.ts','src/forest-water-validity.ts','src/terrain.ts'];
  const sourceHashes=Object.fromEntries(files.map(f=>[f,createHash('sha256').update(readFileSync(f)).digest('hex')]));
  const report={ok:true,scope:'Actual browser host and module Worker, 4.5 km fixture, no WebGL draw or dated-world visual claim',counterCaveat:'scheduledDirtyBytes and diagnostics.uploadBytes describe scheduled ranges; without GPU consumption, cold ranges accumulate and repeat. They are not transferred GPU bytes.',sourceHashes,...result,errors};
  await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}catch(e){await writeFile(`${out}/failure.json`,JSON.stringify({error:String(e),errors},null,2));throw e;}
finally{await browser.close();await server.close();}
