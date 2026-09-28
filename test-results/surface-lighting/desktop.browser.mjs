import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { browserArgs } from '../../tests/browser-options.mjs';
import { encodeVersions, CURRENT_VERSIONS } from '../../src/time-nav.ts';

const base = process.env.ATLAS_URL || 'http://127.0.0.1:5197/';
const out = process.env.ATLAS_RESULTS || 'test-results/surface-lighting/desktop-run';
const bodyId = 'G001/C2128,0,1/0/planet/1';
const bodyDate = 435084631200000032044300000n;
const shiftedDate = bodyDate + 31_536_000_000_000_000n;
const sourceFiles = ['src/main.ts','src/surface-lighting.ts','src/terrain-shadow.ts','src/forest-material.ts',
  'src/planet-renderer.ts','src/planet-forest.ts','src/fauna-field-renderer.ts','test-results/surface-lighting/desktop.browser.mjs'];
const sha256 = async path => createHash('sha256').update(await readFile(path)).digest('hex');
await mkdir(out, { recursive: true });
const sourceStart = Object.fromEntries(await Promise.all(sourceFiles.map(async p => [p, await sha256(p)])));
const query = new URLSearchParams({ seed:'LETHRA-001', g:'G001', system:'G001/C2128,0,1/0', body:bodyId,
  date:bodyDate.toString(), wv:encodeVersions(CURRENT_VERSIONS), profile:'1' });
const browser = await chromium.launch({headless:true,args:browserArgs});
const page = await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
const errors=[];
page.on('pageerror',e=>errors.push(`page: ${e.message}`));
page.on('crash',()=>errors.push('page: renderer crashed'));
page.on('console',m=>{if(m.type()==='error'&&!m.text().startsWith('[vite] failed to connect to websocket.'))errors.push(`console: ${m.text()}`);});
if(typeof page.routeWebSocket==='function')await page.routeWebSocket('**/*',socket=>socket.close());
const waitFor=(fn,timeout=180000,arg)=>page.waitForFunction(fn,arg,{timeout});
const state=()=>page.evaluate(()=>{
  const a=window.__atlas,t=a?.terrain?.tiles,f=t?.forest;
  return {ready:a?.ready,bodyId:a?.state?.body?.id,date:a?.date?.offsetNs,level:a?.state?.level,
    position:a?.travel?.position,heading:a?.travel?.heading,travel:{active:a?.travel?.active,domain:a?.travel?.domain,
      terrainCruise:a?.travel?.terrainCruise,clearanceM:a?.travel?.surface?.terrainClearance,systemUnit:a?.travel?.systemUnit},
    lighting:a?.surfaceLighting,star:a?.starVisual,forest:f?{visible:f.visible,near:f.near,cached:f.cached,pending:f.pending,
      fullCanopy:f.fullCanopy,selectionPending:f.selectionPending,workerFailures:f.workerFailures}:null,
    terrain:t?{pending:t.pending,failures:t.failures,floraPresent:t.floraPresentCount,faunaVisible:t.faunaVisibleCount,
      faunaTerrainPending:t.faunaTerrainPending,waterBucket:t.waterBucket}:null,
    renderer:a?.stats?{draws:a.stats.draws,triangles:a.stats.triangles,geometries:a.stats.geometries,textures:a.stats.textures}:null,
    profile:a?.renderProfile};
});
const canvasPng=async name=>{
  const url=await page.evaluate(async()=>{await new Promise(requestAnimationFrame);const c=document.querySelector('canvas');return c?.toDataURL('image/png')||null;});
  assert.ok(url?.startsWith('data:image/png;base64,'),'canvas PNG capture is available');
  const bytes=Buffer.from(url.slice(url.indexOf(',')+1),'base64');
  await writeFile(`${out}/${name}.png`,bytes);
  return url;
};
const profile=async()=>{
  await page.evaluate(()=>{window.__atlas.setProfiling(true);window.__atlas.resetProfile();});
  await page.waitForTimeout(1200); // warm the selected lighting mode before collecting samples
  await page.evaluate(()=>window.__atlas.resetProfile());
  await page.waitForTimeout(8000);
  const diagnostics=await page.evaluate(()=>window.__atlas.renderProfile);
  const stateNow=await state();
  return {warmupMs:1200,sampleWindowMs:8000,diagnostics,frameStats:stateNow.renderer};
};
let report={ok:false,base,bodyId,date:bodyDate.toString(),viewport:[1440,1000],sourceStart,errors,phases:[]};
try{
  await page.goto(`${base}?${query}`,{waitUntil:'domcontentloaded'});
  await waitFor(id=>window.__atlas?.ready&&window.__atlas.state.level==='body'&&window.__atlas.state.body?.id===id&&!window.__atlas.camera.animating,180000,bodyId);
  await page.locator('#find-life').click();
  await waitFor(()=>window.__atlas.travel.terrainCruise!==null,180000);
  await page.keyboard.down('q');
  await waitFor(()=>window.__atlas.travel.surface?.terrainClearance<200,180000);
  await page.keyboard.up('q');
  await waitFor(()=>window.__atlas.terrain?.tiles?.forest?.visible>100,180000);
  await page.evaluate(()=>window.__atlas.setExplorationPaused(true));
  await waitFor(()=>window.__atlas.terrain?.tiles?.forest?.selectionPending===false&&
    window.__atlas.terrain.tiles.forest.pending===0&&window.__atlas.terrain.tiles.pending===0&&
    window.__atlas.terrain.tiles.faunaTerrainPending===0,120000);
  await page.waitForTimeout(1200);
  const before=await state();
  assert.equal(before.bodyId,bodyId);
  assert.ok(before.travel.clearanceM<300,`near-ground lighting region active range; clearance=${before.travel.clearanceM}`);
  assert.ok(before.forest.visible>0,'legacy forest is visible for lighting comparison');
  assert.equal(before.lighting.enabled,true,'detailed lighting starts enabled');
  assert.ok(await page.locator('#surface-lighting').isVisible(),'surface-lighting control is available');
  const onPng=await canvasPng('lighting-detailed');
  await page.screenshot({path:`${out}/lighting-detailed-ui.png`});
  const onProfile=await profile();
  const onState=await state();
  report.phases.push({name:'detailed-lighting-low-flight',state:onState,profile:onProfile});

  await page.locator('#surface-lighting').click();
  await waitFor(()=>window.__atlas.surfaceLighting.enabled===false,10000);
  await page.waitForTimeout(1200);
  const offState=await state();
  const offPng=await canvasPng('lighting-basic');
  await page.screenshot({path:`${out}/lighting-basic-ui.png`});
  const offProfile=await profile();
  report.phases.push({name:'basic-lighting-same-camera',state:await state(),profile:offProfile});
  report.visualComparison=await page.evaluate(async([a,b])=>{
    const decode=async src=>{const im=new Image();im.src=src;await im.decode();const c=document.createElement('canvas');c.width=im.width;c.height=im.height;
      const x=c.getContext('2d');x.drawImage(im,0,0);return {width:im.width,height:im.height,data:x.getImageData(0,0,im.width,im.height).data};};
    const A=await decode(a),B=await decode(b);let changed=0,sum=0,max=0;
    for(let i=0;i<A.data.length;i+=4){let d=Math.max(Math.abs(A.data[i]-B.data[i]),Math.abs(A.data[i+1]-B.data[i+1]),Math.abs(A.data[i+2]-B.data[i+2]));sum+=d;max=Math.max(max,d);if(d>3)changed++;}
    return {width:A.width,height:A.height,pixels:A.width*A.height,changedPixelsOver3:changed,changedFraction:changed/(A.width*A.height),meanMaxChannelDelta:sum/(A.width*A.height),maxChannelDelta:max};
  },[onPng,offPng]);
  report.cameraComparison={positionDeltaM:Math.hypot(...onState.position.map((x,i)=>x-offState.position[i])),
    headingDelta:Math.hypot(...onState.heading.map((x,i)=>x-offState.heading[i]))};

  // Check that the date path keeps lighting valid without changing the observer location.
  await page.evaluate(date=>{window.__atlas.setExplorationPaused(true);window.__atlas.seek(date);},shiftedDate.toString());
  await waitFor(date=>window.__atlas.date.offsetNs===date&&window.__atlas.terrain?.tiles?.pending===0&&
    window.__atlas.terrain.tiles.staleWaterPatches===0,180000,shiftedDate.toString());
  await page.waitForTimeout(1200);
  const dated=await state();report.phases.push({name:'basic-lighting-after-one-year-seek',state:dated});
  await page.locator('#surface-lighting').click();
  await waitFor(()=>window.__atlas.surfaceLighting.enabled===true,10000);
  await page.waitForTimeout(1200);
  const datedOn=await state();
  await canvasPng('lighting-dated-detailed');
  report.phases.push({name:'detailed-lighting-after-date-seek',state:datedOn});
  report.dateDeltaNs=(BigInt(dated.date)-BigInt(bodyDate)).toString();
  report.cameraAfterDateSeek={positionDeltaM:Math.hypot(...dated.position.map((x,i)=>x-onState.position[i])),
    lightDiagnostics:datedOn.lighting};
  report.renderer=await page.evaluate(()=>{const gl=document.querySelector('canvas')?.getContext('webgl2'),ext=gl?.getExtension('WEBGL_debug_renderer_info');return ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unavailable';});
  report.glError=await page.evaluate(()=>document.querySelector('canvas')?.getContext('webgl2')?.getError()??null);
  report.errors=errors;
  const sourceEnd=Object.fromEntries(await Promise.all(sourceFiles.map(async p=>[p,await sha256(p)])));
  report.sourceIntegrity={unchanged:Object.keys(sourceStart).every(p=>sourceStart[p]===sourceEnd[p]),start:sourceStart,end:sourceEnd};
  report.ok=report.glError===0&&errors.length===0&&report.cameraComparison.positionDeltaM<0.01;
  await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));
  assert.equal(report.glError,0,'no WebGL error');
  assert.deepEqual(errors,[],'no browser or console errors');
  console.log(JSON.stringify({ok:report.ok,renderer:report.renderer,visualComparison:report.visualComparison,
    cameraComparison:report.cameraComparison,lighting:report.phases.map(p=>({name:p.name,lighting:p.state.lighting,forest:p.state.forest?.visible,profileSamples:p.profile?.diagnostics?.statistics})),
    sourceIntegrity:report.sourceIntegrity},null,2));
} catch(error){
  report.ok=false;report.failure=String(error);report.errors=errors;
  report.current=await state().catch(()=>null);
  const sourceEnd=Object.fromEntries(await Promise.all(sourceFiles.map(async p=>[p,await sha256(p).catch(()=>null)])));
  report.sourceIntegrity={unchanged:Object.keys(sourceStart).every(p=>sourceStart[p]===sourceEnd[p]),start:sourceStart,end:sourceEnd};
  await writeFile(`${out}/failure.json`,JSON.stringify(report,null,2));
  await page.screenshot({path:`${out}/failure-page.png`}).catch(()=>{});
  throw error;
}finally{await page.keyboard.up('q').catch(()=>{});await page.close().catch(()=>{});await browser.close();}
