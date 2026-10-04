import {chromium} from 'playwright';
import {browserArgs} from './browser-options.mjs';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';

const base=process.env.ATLAS_URL||'http://127.0.0.1:5186/biome-lab.html';
const out=process.env.ATLAS_RESULTS||'test-results/biome-lab';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:browserArgs});
const errors=[];
const inspect=page=>page.evaluate(()=>window.__biomeLab&&({
  ready:window.__biomeLab.ready, config:window.__biomeLab.config,
  counts:window.__biomeLab.counts, recipeCounts:window.__biomeLab.recipeCounts,
  digest:window.__biomeLab.digest, coverage:window.__biomeLab.coverage,
  renderer:window.__biomeLab.renderer, accountedBytes:window.__biomeLab.accountedBytes,
  camera:window.__biomeLab.camera, geometryValidation:window.__biomeLab.geometryValidation,
}));
const waitForLab=page=>page.waitForFunction(()=>window.__biomeLab?.ready===true,undefined,{timeout:180000});
const nextFrame=page=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
const assertHealthy=async page=>{
  const state=await inspect(page);
  assert.ok(state?.ready); assert.match(state.digest,/\S+/);
  assert.ok(Object.values(state.counts).every(Number.isFinite));
  assert.ok(state.coverage.canopy>=0&&state.coverage.canopy<=1);
  assert.ok(state.coverage.ground>=0&&state.coverage.ground<=1);
  assert.ok(state.renderer.calls>0&&Number.isInteger(state.renderer.triangles)&&state.renderer.triangles>0);
  assert.ok(state.accountedBytes>0);
  assert.ok(state.geometryValidation.checked>0,'geometry validation inspected generated mesh data');
  assert.deepEqual(state.geometryValidation.failures,[],'generated mesh data has no invalid geometry');
  return state;
};
const changeSelect=async(page,selector,value)=>{await page.locator(selector).selectOption(value);};

try {
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  await page.goto(base,{waitUntil:'networkidle'}); await waitForLab(page);
  const initial=await assertHealthy(page);
  await page.locator('#overhead-view').click(); await nextFrame(page);
  await page.screenshot({path:path.join(out,'01-initial-overhead.png'),fullPage:true});

  const presets=await page.locator('#primary-biome option').evaluateAll(options=>options.map(option=>option.value));
  const expected=['woodland','conifer','grassland','dry-scrub','wetland','coast','alpine','volcanic','regolith',
    // ECO-CLASS-1 (BIOME2-ECO, 2026-10-04): one lab biome per eco class that had none.
    'tundra','alpine-meadow','boreal-taiga','savanna','rainforest','hot-desert','ice-margin'];
  assert.deepEqual([...presets].sort(),expected.sort(),'every specified habitat has a selectable lab preset');
  const presetResults=[];
  for(const preset of presets){
    await changeSelect(page,'#primary-biome',preset); await page.locator('#regenerate').click();
    await page.waitForFunction(primary=>window.__biomeLab?.ready&&window.__biomeLab.config.biome===primary,preset,{timeout:180000});
    await nextFrame(page);
    const state=await assertHealthy(page);
    if(preset==='volcanic'||preset==='regolith')assert.equal(state.counts.tree+state.counts.shrub+state.counts.grass,0,`${preset} does not render living elements`);
    presetResults.push({biome:preset,digest:state.digest,counts:state.counts,coverage:state.coverage,calls:state.renderer.calls,triangles:state.renderer.triangles});
    await page.locator('canvas').screenshot({path:path.join(out,`preset-${preset}.png`)});
  }
  await page.locator('#biome-seed').fill('browser-seed-ecotone');
  await changeSelect(page,'#primary-biome','woodland');
  await changeSelect(page,'#blend-biome','dry-scrub');
  await page.locator('#regenerate').click();
  await page.waitForFunction(()=>window.__biomeLab?.ready&&window.__biomeLab.config.seed==='browser-seed-ecotone',undefined,{timeout:180000});
  const blended=await assertHealthy(page);
  assert.notEqual(blended.digest,initial.digest,'regeneration applies a changed seed/configuration');
  assert.ok(Object.keys(blended.recipeCounts).length>0);
  assert.match(await page.locator('#recipe-counts').innerText(),/\S+/);
  assert.match(await page.locator('#fauna-list').innerText(),/planned/i);

  await page.locator('#overhead-view').click(); await page.waitForTimeout(300);
  await page.screenshot({path:path.join(out,'02-ecotone-overhead.png'),fullPage:true});
  await page.locator('#ground-view').click(); const cameraBefore=(await inspect(page)).camera;
  const canvas=page.locator('canvas'); await canvas.hover();
  const box=await canvas.boundingBox(); assert.ok(box,'renderer canvas is visible');
  await page.mouse.move(box.x+box.width*.45,box.y+box.height*.5); await page.mouse.down();
  await page.mouse.move(box.x+box.width*.63,box.y+box.height*.42,{steps:8}); await page.mouse.up();
  await page.mouse.wheel(0,-280); await page.waitForTimeout(300);
  assert.notDeepEqual((await inspect(page)).camera,cameraBefore,'pointer drag and wheel update the OrbitControls camera');
  await page.screenshot({path:path.join(out,'03-ecotone-ground.png'),fullPage:true});

  const download=page.waitForEvent('download'); await page.locator('#export-json').click();
  const exported=await download, exportPath=path.join(out,await exported.suggestedFilename());
  await exported.saveAs(exportPath);
  const json=JSON.parse(await readFile(exportPath,'utf8'));
  assert.equal(json.digest,(await inspect(page)).digest);
  assert.ok(json.version&&json.config&&json.counts&&json.recipeCounts);

  const before=await inspect(page);
  for(let i=0;i<3;i++){await page.locator('#regenerate').click();await page.waitForTimeout(150);}
  const after=await assertHealthy(page);
  assert.ok(after.accountedBytes<=before.accountedBytes*1.15,'regeneration does not accumulate geometry buffers');
  assert.ok(after.renderer.calls<=before.renderer.calls+8,'regeneration keeps draw calls bounded');
  assert.ok(after.renderer.memory.geometries<=before.renderer.memory.geometries+2,'rebuild disposes replaced geometries');
  assert.ok(after.renderer.memory.textures<=before.renderer.memory.textures+1,'rebuild does not leak textures');

  const narrow=await browser.newPage({viewport:{width:390,height:844}});
  narrow.on('pageerror',error=>errors.push(error.message));
  await narrow.goto(base,{waitUntil:'networkidle'}); await waitForLab(narrow); await assertHealthy(narrow);
  assert.ok(await narrow.locator('#regenerate').isVisible());
  await narrow.screenshot({path:path.join(out,'04-narrow.png'),fullPage:true});
  await narrow.close();
  assert.deepEqual(errors,[]);
  const report={ok:true,base,presets:presetResults,digest:after.digest,accountedBytes:after.accountedBytes,renderer:after.renderer,geometryValidation:after.geometryValidation,errors};
  await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report));
} catch(error) {
  console.log(JSON.stringify({base,errors}));
  throw error;
} finally { await browser.close(); }
