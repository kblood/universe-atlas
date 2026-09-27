import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { browserArgs } from './browser-options.mjs';

const base = process.env.ATLAS_URL || 'http://127.0.0.1:5186/';
const out = process.env.ATLAS_RESULTS || 'test-results/cloud-comparison';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, args: browserArgs });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error' && !m.text().startsWith('[vite] failed to connect to websocket.')) errors.push(m.text()); });
const scenarioMap = [
  ['orbit', 'orbital'], ['flight', 'flight'], ['inside', 'inside'],
  ['surface', 'surface'], ['nightside', 'night'],
];
const requestedViews = process.env.CLOUD_VIEWS?.split(',');
const scenarios = requestedViews ? scenarioMap.filter(([view]) => requestedViews.includes(view)) : scenarioMap;
async function select(selector, value) {
  await page.locator(selector).selectOption(value);
  await page.waitForTimeout(450);
}
async function pixelDelta(a, b, region = null) {
  return page.evaluate(async ({ urls, region }) => {
    const rgba = async (url) => {
      const image = new Image(); image.src = url; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true }); ctx.drawImage(image, 0, 0);
      return {data:ctx.getImageData(0, 0, canvas.width, canvas.height).data,width:canvas.width,height:canvas.height};
    };
    const [xx, yy] = await Promise.all([rgba(urls[0]), rgba(urls[1])]),x=xx.data,y=yy.data;
    let total = 0, changed = 0, pixels = 0;
    const box=region||{x:0,y:0,width:xx.width,height:xx.height};
    for (let row=box.y;row<box.y+box.height;row++) for(let col=box.x;col<box.x+box.width;col++) {
      const i=(row*xx.width+col)*4;
      const d = (Math.abs(x[i]-y[i]) + Math.abs(x[i+1]-y[i+1]) + Math.abs(x[i+2]-y[i+2])) / 3;
      total += d; pixels++; if (d > 2) changed++;
    }
    return { meanRGBDelta: total / pixels, changedFraction: changed / pixels, pixels };
  }, {urls:[`data:image/png;base64,${a.toString('base64')}`, `data:image/png;base64,${b.toString('base64')}`],region});
}
try {
  if (typeof page.routeWebSocket === 'function') await page.routeWebSocket('**/*', ws => ws.close());
  await page.goto(base + 'tests/cloud-comparison.html', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__cloudLab?.volume && window.__cloudLab.renderer.capabilities.isWebGL2, undefined, { timeout: 30000 });
  const rows = [];
  const images = new Map();
  for (const [view, tag] of scenarios) {
    await select('#viewpoint', view);
    for (const [mode, label] of [['shell', 'shell'], ['volume', 'volume'], ['clear', 'clear']]) {
      await select('#mode', mode);
      const status = await page.evaluate(() => ({
        diagnostics: window.__cloudLab.volume.diagnostics(),
        shaderFeatures: { regional: window.__cloudLab.volume.material.fragmentShader.includes('float regional=textureLod'), footprintLod: window.__cloudLab.volume.material.fragmentShader.includes('float footprint='), mipSampling: window.__cloudLab.volume.material.fragmentShader.includes('textureLod') },
        uniforms: (() => {
          const u = window.__cloudLab.volume.material.uniforms;
          return { enabled: u.cloudsEnabled.value, eyeKm: u.eyeKm.value.toArray(), sun: u.sun.value.toArray(),
            renderUnitsPerKm: u.renderUnitsPerKm.value, coverageScale: u.coverageScale.value,
            extinctionScale: u.extinctionScale.value, heightsKm: u.heights.value.toArray(), radiusKm: u.radiusKm.value,
            inverseProjection: u.inverseProjection.value.elements, viewToPlanet: u.viewToPlanet.value.elements };
        })(),
        weather: (() => { const d=window.__cloudLab.volume.weather.image.data; let s=0,m=0,n=255; for(let i=0;i<d.length;i+=4){s+=d[i];m=Math.max(m,d[i]);n=Math.min(n,d[i]);}return {mean:s/(d.length/4),max:m,min:n}; })(),
        renderer: window.__cloudLab.renderer.getContext().getParameter(window.__cloudLab.renderer.getContext().RENDERER),
        unmaskedRenderer: (() => { const gl=window.__cloudLab.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');return ext?{vendor:gl.getParameter(ext.UNMASKED_VENDOR_WEBGL),renderer:gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)}:null; })(),
        frameCount: window.__cloudLab.renderer.info.render.frame,
        cloudTarget: (()=>{const lab=window.__cloudLab,r=lab.renderer,t=lab.volume['cloudTargets'][0];if(!t)return null;const w=t.width,h=t.height,b=new Uint16Array(w*h*4);try{r.readRenderTargetPixels(t,0,0,w,h,b);const f=x=>{const s=(x>>15)?-1:1,e=(x>>10)&31,m=x&1023;if(e===0)return s*Math.pow(2,-14)*(m/1024);if(e===31)return s*(m?NaN:Infinity);return s*Math.pow(2,e-15)*(1+m/1024);};let max=0,sum=0,n=0;for(let i=3;i<b.length;i+=4){const a=f(b[i]);if(Number.isFinite(a)){max=Math.max(max,a);sum+=a;n++;}}return {width:w,height:h,maxAlpha:max,meanAlpha:sum/n};}catch(e){return {error:String(e)}}})(),
      }));
      const path = `${out}/${tag}-${label}.png`;
      const png = await page.screenshot({ path });
      images.set(`${view}:${mode}`, png);
      if (view === 'flight' && mode === 'volume') {
        await page.waitForTimeout(200);
        const repeat = await page.screenshot();
        rows.push({ view, mode, repeatFrameDelta: await pixelDelta(png, repeat) });
      }
      rows.push({ view, mode, ...status, image: path });
    }
    if (images.has(`${view}:volume`) && images.has(`${view}:clear`)) {
      const volumeVsClear = await pixelDelta(images.get(`${view}:volume`), images.get(`${view}:clear`));
      rows.push({ view, volumeVsClear });
      if (view === 'surface') rows.push({ view, terrainOcclusion: await pixelDelta(images.get('surface:volume'), images.get('surface:clear'), { x: 300, y: 885, width: 1140, height: 115 }) });
    }
  }
  const variants=[];
  for(const [view,tag] of [['orbit','orbital'],['flight','flight'],['inside','inside'],['surface','surface']]){
    await select('#viewpoint',view);await select('#mode','volume');
    for(const [name,cover,extinction] of [['balanced',.68,.72],['soft',.68,.24],['broken',.42,.24]]){
      await page.evaluate(([c,e])=>{window.__cloudLab.volume.coverageScale=c;window.__cloudLab.volume.extinctionScale=e;},[cover,extinction]);
      await page.waitForTimeout(350);
      const path=`${out}/${tag}-volume-${name}.png`,png=await page.screenshot({path});
      variants.push({view,name,coverageScale:cover,extinctionScale:extinction,image:path,vsDefault:images.has(`${view}:volume`)?await pixelDelta(png,images.get(`${view}:volume`)):null,
        diagnostics:await page.evaluate(()=>window.__cloudLab.volume.diagnostics())});
    }
  }
  await page.evaluate(()=>{window.__cloudLab.volume.coverageScale=1;window.__cloudLab.volume.extinctionScale=2.2;});
  const temporal = [];
  await select('#viewpoint', 'flight'); await select('#mode', 'volume');
  const initial = await page.screenshot();
  await page.locator('#date').evaluate(e=>{e.value='3790';e.dispatchEvent(new Event('input',{bubbles:true}));}); await page.waitForTimeout(500);
  const advected = await page.screenshot(); temporal.push({ intervalSeconds: 90, pixelDelta: await pixelDelta(initial, advected) });
  await page.locator('#date').evaluate(e=>{e.value='3700';e.dispatchEvent(new Event('input',{bubbles:true}));}); await page.waitForTimeout(500);
  const replay = await page.screenshot(); temporal.push({ replayPixelDelta: await pixelDelta(initial, replay) });
  const performance = {};
  for (const view of ['orbit', 'inside', 'surface']) {
    await select('#viewpoint', view);
    await select('#mode', 'volume');
    performance[view] = await page.evaluate(async () => {
      const lab=window.__cloudLab,gl=lab.renderer.getContext(),ext=gl.getExtension('EXT_disjoint_timer_query_webgl2');
      const original=lab.volume.render.bind(lab.volume);
      if(!ext){
        const deltas=[];let previous=performance.now(),rafId;
        const tick=now=>{deltas.push(now-previous);previous=now;rafId=requestAnimationFrame(tick);};
        rafId=requestAnimationFrame(tick);await new Promise(resolve=>setTimeout(resolve,2500));cancelAnimationFrame(rafId);
        const sorted=deltas.slice(60).sort((a,b)=>a-b),at=p=>sorted[Math.min(sorted.length-1,Math.floor((sorted.length-1)*p))]||0;
        lab.volume.render=original;
        return {method:'warm RAF frame interval (GPU timer extension unavailable)',frames:sorted.length,medianMs:at(.5),p95Ms:at(.95),maxMs:sorted.at(-1)||0};
      }
      const pending=[],gpuMs=[],cpuMs=[],rafDeltas=[];let previous=performance.now(),rafId,disjoint=0,capturing=true;
      lab.volume.render=(...args)=>{
        if(!capturing)return original(...args);
        const query=gl.createQuery(),start=performance.now();
        gl.beginQuery(ext.TIME_ELAPSED_EXT,query);
        try{return original(...args);}finally{gl.endQuery(ext.TIME_ELAPSED_EXT);pending.push(query);cpuMs.push(performance.now()-start);}
      };
      const tick=now=>{rafDeltas.push(now-previous);previous=now;rafId=requestAnimationFrame(tick);};rafId=requestAnimationFrame(tick);
      const started=performance.now();
      while(performance.now()-started<5000 || pending.length){
        if(performance.now()-started>=5000)capturing=false;
        for(let i=pending.length-1;i>=0;i--){const q=pending[i];if(gl.getQueryParameter(q,gl.QUERY_RESULT_AVAILABLE)){
          const ns=gl.getQueryParameter(q,gl.QUERY_RESULT);if(gl.getParameter(ext.GPU_DISJOINT_EXT))disjoint++;else gpuMs.push(ns/1e6);
          gl.deleteQuery(q);pending.splice(i,1);
        }}
        await new Promise(resolve=>setTimeout(resolve,0));
      }
      cancelAnimationFrame(rafId);lab.volume.render=original;
      const summarize=values=>{const s=values.slice(60).sort((a,b)=>a-b),at=p=>s[Math.min(s.length-1,Math.floor((s.length-1)*p))]||0;return {frames:s.length,medianMs:at(.5),p95Ms:at(.95),maxMs:s.at(-1)||0};};
      return {method:'EXT_disjoint_timer_query_webgl2 around volume.render (capture + raymarch + resolve)',gpu:summarize(gpuMs),cpuSubmission:summarize(cpuMs),rafFrameInterval:summarize(rafDeltas),disjointQueries:disjoint};
    });
  }
  const resizeBudget = [];
  for (const size of [{width:3840,height:2160},{width:1280,height:720}]) {
    await page.setViewportSize(size);
    await page.waitForTimeout(700);
    const memory=await page.evaluate(()=>window.__cloudLab.volume.diagnostics());
    resizeBudget.push({size,...memory});
    assert.ok(memory.estimatedBytes<=memory.targetBudgetBytes,`cloud render targets exceed memory budget at ${size.width}x${size.height}`);
  }
  const result = { base, renderer: rows[0]?.unmaskedRenderer, rows, variants, temporal, performance, errors };
  result.resizeBudget=resizeBudget;
  await writeFile(`${out}/report.json`, JSON.stringify(result, null, 2));
  assert.deepEqual(errors, [], 'browser and WebGL errors');
  assert.ok(rows.some(r => r.mode === 'volume' && r.diagnostics?.representation === 'raymarched-volume'));
  assert.ok(temporal[0].pixelDelta.meanRGBDelta > 0, 'cloud advection changes the rendered image with time');
  assert.ok(temporal[1].replayPixelDelta.meanRGBDelta < .1, 'seeking back to the same date reproduces the same image');
  console.log(JSON.stringify({ ok: true, renderer: result.renderer, temporal, performance, repeatedFrame: rows.find(r => r.repeatFrameDelta)?.repeatFrameDelta, errors }, null, 2));
} catch (error) {
  await page.screenshot({ path: `${out}/failure.png` });
  await writeFile(`${out}/failure-state.json`, JSON.stringify(await page.evaluate(() => ({ status: window.__cloudLab?.status?.textContent, diagnostics: window.__cloudLab?.volume?.diagnostics() })).catch(() => null), null, 2));
  throw error;
} finally {
  await browser.close();
}
