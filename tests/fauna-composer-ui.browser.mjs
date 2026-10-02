import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {chromium} from 'playwright';
import {browserArgs} from './browser-options.mjs';
import {withGpuLock} from './helpers/gpu-lock.mjs';
const target=new URL(process.env.ATLAS_URL||'http://127.0.0.1:5205/creature-lab.html?mode=composer');target.searchParams.set('mode','composer');
const output=process.env.ATLAS_RESULTS||'test-results/fauna-opus-modular-001/independent-ui-001';
await mkdir(output,{recursive:false});
const presets=['dinosaur','turtle','giraffe','bird','ostrich','rhinoceros','ape','worm','centipede','shelled-giraffe-bird','trunked-centipede','winged-ape-rhino'];
const errors=[],evidence=[];
const snapshot=async()=>Object.fromEntries(await Promise.all(['fauna-composer.ts','fauna-composer-recipe.ts','fauna-composer-rig.ts','fauna-composer-mesh.ts','creature-lab-composer.ts','creature-lab.ts','creature-lab-state.ts'].map(async name=>[name,createHash('sha256').update(await readFile(new URL(`../src/${name}`,import.meta.url))).digest('hex')])));
const sourceBefore=await snapshot();
await withGpuLock({owner:'composer-independent-ui',timeoutMs:60000,staleMs:Infinity},async()=>{
 const browser=await chromium.launch({headless:true,args:browserArgs});let activePage;
 try {
  const context=await browser.newContext({viewport:{width:1440,height:1080}}),page=await context.newPage();
  activePage=page;
  page.on('pageerror',e=>errors.push(e.message));
  const state=()=>page.evaluate(()=>JSON.parse(JSON.stringify(window.__creatureLab.composer)));
  const settle=async()=>{await page.waitForFunction(()=>window.__creatureLab?.composer&&(window.__creatureLab.composer.error||(window.__creatureLab.composer.actors.length&&!window.__creatureLab.composer.building)),null,{timeout:60000});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));const s=await state();assert.equal(s.error,null);assert(s.actors.length>0);return s;};
  const pause=async()=>{const s=await settle();if(s.playing)await page.click('#composer-play');assert.equal((await settle()).playing,false);};
  const shoot=name=>page.screenshot({path:join(output,`${name}.png`),fullPage:true});
  await page.goto(target.href,{waitUntil:'networkidle'});await page.waitForSelector('#composer-preset',{state:'visible',timeout:30000});await pause();
  for(const id of presets){await page.selectOption('#composer-preset',id);const s=await settle();assert.equal(s.actors[0].preset,id);assert(s.actors[0].details.withinBudget);assert(s.actors[0].bounds.min.concat(s.actors[0].bounds.max).every(Number.isFinite));await shoot(`preset-${id}`);evidence.push({check:'preset',id,state:s});}
  // Independent editing must retain the rest of the selected recipe.
  await page.selectOption('#composer-preset','turtle');const before=await settle();await page.selectOption('#composer-head','mandibles');let s=await settle();assert.equal(s.actors[0].recipe.head,'mandibles');for(const [key,value]of Object.entries(before.actors[0].recipe))if(key!=='head')assert.deepEqual(s.actors[0].recipe[key],value,`head preserves ${key}`);
  await page.locator('#composer-neckLength').fill('1.3');await page.selectOption('#composer-wings','feathered');s=await settle();assert.equal(s.actors[0].recipe.neckLength,1.3);assert.equal(s.actors[0].recipe.armor,'dome');assert.equal(s.actors[0].recipe.wings,'feathered');assert.match(await page.locator('#composer-constraints').innerText(),/shell|rim/i);await shoot('manual-shell-neck-wings');
  await page.selectOption('#composer-layout','limbless');s=await settle();assert.equal(s.actors[0].recipe.legPairs,0);assert.match(await page.locator('#composer-constraints').innerText(),/limbless|no legs|belly/i);await shoot('visible-layout-constraint');
  // Fixed seed repeat and explicit manual URL state are authoritative.
  await page.locator('#composer-seed').fill('independent-seed-2718');await page.click('#composer-randomize');const random=await settle();await page.click('#composer-randomize');assert.equal((await settle()).actors[0].encoded,random.actors[0].encoded);
  await page.click('#composer-next-seed');const next=await settle();assert.notEqual(next.actors[0].encoded,random.actors[0].encoded);
  // Coat and Individual controls, plausible species and a herd, through the real DOM.
  assert.equal((await page.locator('#composer-randomize').innerText()).trim(),'Wild hybrid');
  await page.click('#composer-random-species');const plausible=await settle();assert.equal(plausible.generator,'plausible');assert.match(await page.locator('#caption-title').innerText(),/^Plausible /);
  await page.click('#composer-next-seed');const plausible2=await settle();assert.equal(plausible2.generator,'plausible','New seed repeats the last generator');assert.notEqual(plausible2.actors[0].encoded,plausible.actors[0].encoded);await shoot('plausible-species');
  await page.selectOption('#composer-preset','ostrich');let o=await settle();await page.click('#composer-next-individual');o=await settle();assert.equal(o.actors[0].preset,'ostrich','an individual keeps the preset');assert.equal(o.actors[0].recipe.individualSeed,1);
  await page.locator('#composer-mark-ear-tips').check();o=await settle();assert.equal(o.actors[0].recipe.marks&32,32);assert.equal(o.actors[0].preset,null,'markings are part of the species');
  await page.selectOption('#composer-preset','ostrich');await page.selectOption('#composer-herd','6');o=await settle();assert.equal(o.actors.length,6);assert.equal(new Set(o.actors.map(a=>a.individual.seed)).size,6);assert.match(await page.locator('#status').innerText(),/herd of 6/);await shoot('herd-ostrich-6');evidence.push({check:'herd',herd:o.herdStats,seeds:o.actors.map(a=>a.individual.seed)});
  await page.selectOption('#composer-herd','1');await settle();
  await page.selectOption('#composer-preset','shelled-giraffe-bird');await page.locator('#composer-compare').check();await page.selectOption('#composer-edit-target','second');await page.selectOption('#composer-preset','winged-ape-rhino');s=await settle();assert.equal(s.actors.length,2);assert.notEqual(s.actors[0].encoded,s.actors[1].encoded);const first=s.actors[0].encoded;
  await page.selectOption('#composer-head','beak');s=await settle();assert.equal(s.actors[0].encoded,first,'second edits do not mutate first');assert.equal(s.actors[1].recipe.head,'beak');
  await page.selectOption('#composer-motion','walk');await page.locator('#composer-time').fill('0.37');await pause();const poseA=await settle();await page.locator('#composer-time').fill('0.83');await settle();await page.locator('#composer-time').fill('0.37');const poseReplay=await settle();assert.deepEqual(poseReplay.actors.map(a=>a.pose.positions),poseA.actors.map(a=>a.pose.positions),'absolute pose A-B-A');
  await page.click('#composer-play');await page.waitForFunction(t=>window.__creatureLab.composer.time>t+.02,poseReplay.time,{timeout:5000});await page.click('#composer-play');const paused=await settle();await page.waitForTimeout(180);assert.equal((await state()).time,paused.time,'paused time stays fixed');
  // Force standard clipboard-denied path so the visible copied link is testable.
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('Intentional clipboard-denied fixture');}}}));
  await page.click('#share-specimen');await page.waitForSelector('#share-link',{state:'visible'});const link=await page.locator('#share-link').inputValue();const shared=await settle();assert.equal(shared.playing,false);assert.equal(new URL(link).searchParams.get('mode'),'composer');assert(new URL(link).searchParams.get('compareRecipe'));await shoot('comparison-shared');
  await page.goto(link,{waitUntil:'networkidle'});const replay=await settle();assert.equal(replay.playing,false);assert.equal(replay.time,shared.time);assert.equal(replay.motion,shared.motion);assert.equal(replay.compare,true);assert.deepEqual(replay.actors.map(a=>a.encoded),shared.actors.map(a=>a.encoded));assert.deepEqual(replay.actors.map(a=>a.pose.positions),shared.actors.map(a=>a.pose.positions));
  await page.selectOption('#composer-edit-target','second');assert.equal(await page.locator('#composer-head').inputValue(),replay.actors[1].recipe.head,'replayed DOM values match second recipe');await page.locator('#neutral').check();await page.locator('#skeleton').check();await settle();await shoot('comparison-neutral-skeleton');await page.locator('#neutral').uncheck();await page.locator('#skeleton').uncheck();
  await page.setViewportSize({width:390,height:844});await shoot('mobile-comparison');assert(await page.locator('#composer-preset').isVisible());await page.setViewportSize({width:1440,height:1080});
  // Malformed version and duplicate identity must reject visibly, then recover via preset.
  for(const kind of ['version','duplicate']){const bad=new URL(link);if(kind==='version')bad.searchParams.set('recipe','v999*layout_biped');else bad.searchParams.append('recipe',bad.searchParams.get('recipe'));await page.goto(bad.href,{waitUntil:'networkidle'});await page.waitForFunction(()=>!!window.__creatureLab?.composer?.error,null,{timeout:10000});const rejected=await state();assert.equal(rejected.actors.length,0);assert(await page.locator('#notice').isVisible());assert((await page.locator('#notice').innerText()).length>5);await shoot(`rejected-${kind}`);await page.selectOption('#composer-preset','turtle');assert((await settle()).actors.length>0);evidence.push({check:'invalid-recovery',kind,rejected});}
  await page.locator('#composer-compare').uncheck();await page.selectOption('#composer-preset','turtle');await settle();const memBefore=await page.evaluate(()=>window.__creatureLab.renderer.memory);
  for(let i=0;i<3;i++){await page.selectOption('#composer-preset','centipede');await settle();await page.selectOption('#composer-preset','turtle');await settle();}
  const memAfter=await page.evaluate(()=>window.__creatureLab.renderer.memory);assert.deepEqual(memAfter,memBefore,'rebuild resource residency stabilizes');
  await page.selectOption('#mode','gallery');await page.waitForFunction(()=>window.__creatureLab.composer===null);await page.selectOption('#mode','composer');await settle();
  evidence.push({check:'full-replay',shared,replay,memBefore,memAfter,link});assert.deepEqual(errors,[]);
  await writeFile(join(output,'report.json'),JSON.stringify({passed:true,target:target.href,errors,evidence,sourceBefore,sourceAfter:await snapshot(),sourceHashMeaning:'Local workspace snapshots; deployed bundle provenance must be supplied independently by build manifest',visualAcceptance:false},null,2));
 }catch(error){const current=await activePage?.evaluate(()=>({composer:window.__creatureLab?.composer,body:document.body.innerText.slice(0,6000)})).catch(()=>null);await activePage?.screenshot({path:join(output,'failure.png'),fullPage:true}).catch(()=>{});await writeFile(join(output,'failure.json'),JSON.stringify({error:String(error),errors,evidence,current,sourceBefore,sourceAfter:await snapshot()},null,2));throw error;}finally{await browser.close();}
});
console.log('Composer UI technical assertions pass; inspect screenshots separately. GPU clear.');
