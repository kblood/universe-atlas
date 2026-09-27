import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { browserArgs } from './browser-options.mjs';

const base = process.env.ATLAS_URL || 'http://127.0.0.1:5186/';
const out = process.env.ATLAS_RESULTS || 'test-results/cloud-xr-smoke';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, args: browserArgs });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error' && !m.text().startsWith('[vite] failed to connect to websocket.')) errors.push(m.text()); });
try {
  const iwer = await readFile('node_modules/iwer/build/iwer.min.js', 'utf8');
  await page.addInitScript({ content: iwer + ';window.xrDevice=new IWER.XRDevice(IWER.metaQuest3);window.xrDevice.installRuntime({forceInstall:true});window.xrDevice.stereoEnabled=true;' });
  if (typeof page.routeWebSocket === 'function') await page.routeWebSocket('**/*', ws => ws.close());
  await page.goto(base + 'tests/cloud-comparison.html', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__cloudLab?.volume);
  await page.evaluate(async () => {
    const renderer=window.__cloudLab.renderer;
    const mode=document.querySelector('#mode');mode.value='volume';mode.dispatchEvent(new Event('change',{bubbles:true}));
    renderer.xr.enabled=true;
    const session=await navigator.xr.requestSession('immersive-vr',{requiredFeatures:['local-floor']});
    await renderer.xr.setSession(session);
    window.__cloudLab.volume.enabled=true;
  });
  await page.waitForFunction(() => window.__cloudLab.volume.diagnostics().eyes===2, undefined, { timeout: 20000 });
  await page.waitForTimeout(700);
  const result=await page.evaluate(()=>({
    diagnostics:window.__cloudLab.volume.diagnostics(),
    drawingBuffer:(()=>{const gl=window.__cloudLab.renderer.getContext();return {width:gl.drawingBufferWidth,height:gl.drawingBufferHeight};})(),
    presenting:window.__cloudLab.renderer.xr.isPresenting,
  }));
  assert.equal(result.presenting,true);
  assert.equal(result.diagnostics.eyes,2);
  assert.equal(result.diagnostics.targets.length,2);
  assert.equal(result.diagnostics.cloudTargets.length,2);
  assert.ok(result.diagnostics.estimatedBytes<=result.diagnostics.targetBudgetBytes);
  assert.deepEqual(errors,[],'emulated XR browser/WebGL errors');
  await writeFile(`${out}/report.json`,JSON.stringify({ok:true,emulator:'IWER Meta Quest 3 stereo (emulated; not device validation)',...result,errors},null,2));
  console.log(JSON.stringify({ok:true,emulator:'IWER Meta Quest 3 stereo (emulated; not device validation)',...result,errors},null,2));
} catch(error) {
  console.log(JSON.stringify(await page.evaluate(()=>({presenting:window.__cloudLab?.renderer.xr.isPresenting,diagnostics:window.__cloudLab?.volume.diagnostics(),status:window.__cloudLab?.status.textContent})).catch(()=>null),null,2));
  await page.screenshot({path:`${out}/failure.png`});
  throw error;
} finally { await browser.close(); }
