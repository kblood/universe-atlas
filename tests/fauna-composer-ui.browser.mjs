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
  let s0;
  // ---- Face round (recipe v3): Face/Eyes/Iris controls, option hints, legacy trunk links, Head and face framing.
  const optionTexts=key=>page.$$eval(`#composer-${key} option`,os=>os.map(o=>({value:o.value,text:o.textContent})));
  const textOf=async(key,value)=>(await optionTexts(key)).find(o=>o.value===value)?.text;
  const lab=async()=>page.evaluate(()=>window.__creatureLab.specimenUrl);
  assert((await optionTexts('head')).some(o=>o.value==='proboscis'),'Face select offers Proboscis');
  assert.equal(await page.locator('#composer-trunk').count(),0,'no Trunk control');
  assert.equal((await page.locator('label:has(#composer-head)').innerText()).split('\n')[0].trim().startsWith('Face'),true);
  assert.match(await page.locator('label:has(#composer-eyes)').innerText(),/^Eyes \(pupil\)/);
  assert.match(await page.locator('label:has(#composer-iris)').innerText(),/^Iris colour/);
  assert.match(await page.locator('label:has(#composer-horns)').innerText(),/^Horns and headgear/);
  await page.selectOption('#composer-preset','giraffe');s0=await settle();
  assert(await page.locator('#composer-trunkLength').isDisabled(),'Proboscis length disabled on a muzzle');assert.equal((await page.locator('#composer-trunkLength-why').innerText()).trim(),'Only a Proboscis face has a trunk.');
  assert.match(await textOf('eyes','auto'),/^Automatic \(horizontal bar, (dark brown|brown)\)$/,'giraffe auto eye resolves to a horizontal bar');
  await page.selectOption('#composer-head','proboscis');s0=await settle();
  assert.equal(s0.actors[0].recipe.head,'proboscis');assert.equal(s0.actors[0].recipe.trunk,'trunk');assert(s0.actors[0].details.parts.some(p=>p.part==='trunk'),'giraffe + Proboscis builds a trunk part');
  assert(!(await page.locator('#composer-trunkLength').isDisabled()),'Proboscis length enabled on a proboscis face');
  assert.match(await textOf('horns','nasal'),/ — not built on this face$/);await shoot('face-giraffe-proboscis');
  // beak face: per-option headgear hints
  await page.selectOption('#composer-preset','bird');s0=await settle();
  for(const v of ['paired','ossicones'])assert.match(await textOf('horns',v),/ — not built on this face$/,`beak ${v}`);
  assert.match(await textOf('horns','nasal'),/ — built as a casque$/);assert.equal(await textOf('horns','crest'),'Crest or casque');
  for(const v of ['compound','eyespot'])assert.match(await textOf('eyes',v),/ — built as round$/,`beak eye ${v}`);
  // hint rendering: strip every hinted option text, re-render (edit-target change re-runs showControls), compare
  const hintedState=async()=>({url:await lab(),values:await page.$$eval('#composer-horns,#composer-eyes,#composer-iris',els=>els.map(e=>e.value)),texts:await Promise.all(['horns','eyes','iris'].map(optionTexts)),builds:(await state()).builds});
  const hinted=await hintedState();
  await page.evaluate(()=>{for(const id of ['composer-horns','composer-eyes','composer-iris'])for(const o of document.getElementById(id).options)o.textContent=o.value;});
  const stripped=await hintedState();assert.equal(stripped.url,hinted.url,'link byte-identical without hints');
  await page.dispatchEvent('#composer-edit-target','change');await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>r())));
  const rerendered=await hintedState();
  assert.equal(rerendered.url,hinted.url,'link byte-identical after re-rendering hints');assert.deepEqual(rerendered.values,hinted.values,'selection unchanged');assert.deepEqual(rerendered.texts,hinted.texts,'hints restored');assert.equal(rerendered.builds,hinted.builds,'re-rendering hints never rebuilds');
  evidence.push({check:'hint-toggle',url:hinted.url,builds:hinted.builds,beakHorns:hinted.texts[0],beakEyes:hinted.texts[1],beakIris:hinted.texts[2]});
  await shoot('face-bird-hints');await page.locator('fieldset:has(#composer-horns)').screenshot({path:join(output,'panel-head-and-neck-bird.png')});
  // flat face + nasal: disclosed, not built
  await page.selectOption('#composer-preset','ape');await settle();await page.selectOption('#composer-horns','nasal');s0=await settle();
  assert.equal(s0.actors[0].recipe.horns,'nasal','the chosen horn stays in the recipe');
  assert(!s0.actors[0].details.parts.some(p=>p.part==='horn'),'no horn part on a primate face');
  assert.match(await page.locator('#composer-constraints').innerText(),/Not built: primate faces carry no horns\./);
  assert.equal(await page.locator('#composer-horns').inputValue(),'nasal');await shoot('face-ape-nasal-disclosed');await page.locator('fieldset:has(#composer-horns)').screenshot({path:join(output,'panel-head-and-neck-ape-nasal.png')});await page.locator('#composer-constraints').screenshot({path:join(output,'panel-constraints-ape-nasal.png')});
  // centipede: compound eyes, iris has no effect
  await page.selectOption('#composer-preset','centipede');await settle();
  assert.equal(await textOf('iris','auto'),'Automatic (no iris)');assert.match(await textOf('iris','red'),/ — no effect on this face$/);assert.match(await textOf('eyes','round'),/ — built as compound$/);
  // legacy v1 trunk links through the real Lab
  const v1=JSON.parse(await readFile(new URL('./fixtures/composer-v1-links.json',import.meta.url),'utf8')).presets;
  const openLink=async text=>{const u=new URL(target.href);u.search='';u.searchParams.set('mode','composer');u.searchParams.set('recipe',text);await page.goto(u.href,{waitUntil:'networkidle'});return settle();};
  let legacy=await openLink(v1.find(p=>p.id==='turtle').text.replace('trunk_none','trunk_trunk'));
  assert.equal(legacy.actors[0].recipe.head,'beak');assert.equal(legacy.actors[0].recipe.trunk,'none');
  assert(await page.locator('#composer-issues').isVisible());const issuesText=await page.locator('#composer-issues').innerText();
  assert.match(issuesText,/This link was adjusted:/);assert.match(issuesText,/Trunk: removed/);await shoot('legacy-v1-beak-trunk');await page.locator('#composer-issues').screenshot({path:join(output,'panel-issues-legacy-beak-trunk.png')});evidence.push({check:'legacy-beak-trunk',issues:legacy.issues});
  legacy=await openLink(v1.find(p=>p.id==='giraffe').text.replace('trunk_none','trunk_trunk'));
  assert.equal(await page.locator('#composer-head').inputValue(),'proboscis','v1 muzzle+trunk shows Face = Proboscis');assert(legacy.actors[0].details.parts.some(p=>p.part==='trunk'));
  assert.match(await page.locator('#composer-issues').innerText(),/Trunk: now a face type/);await shoot('legacy-v1-muzzle-trunk');evidence.push({check:'legacy-muzzle-trunk',issues:legacy.issues});
  await page.goto(target.href,{waitUntil:'networkidle'});await page.waitForSelector('#composer-preset',{state:'visible',timeout:30000});await pause();
  // Head and face framing: the head bounds fill >= 40% of the viewport height
  const headFill=()=>page.evaluate(()=>{const c=window.__creatureLab.camera,h=window.__creatureLab.composer.headEnvelope,V=c.matrixWorldInverse,P=c.projectionMatrix;
   const mul=(m,v)=>[0,1,2,3].map(r=>m[r]*v[0]+m[4+r]*v[1]+m[8+r]*v[2]+m[12+r]*v[3]);let y0=Infinity,y1=-Infinity,x0=Infinity,x1=-Infinity;
   for(const x of [h.min[0],h.max[0]])for(const y of [h.min[1],h.max[1]])for(const z of [h.min[2],h.max[2]]){const p=mul(P,mul(V,[x,y,z,1]));y0=Math.min(y0,p[1]/p[3]);y1=Math.max(y1,p[1]/p[3]);x0=Math.min(x0,p[0]/p[3]);x1=Math.max(x1,p[0]/p[3]);}
   return {heightFraction:(y1-y0)/2,widthFraction:(x1-x0)/2,inside:y0>=-1.001&&y1<=1.001&&x0>=-1.001&&x1<=1.001,head:h,camera:c.position,target:c.target};});
  assert.equal(await page.locator('#composer-focus').inputValue(),'body');
  const framing=[];
  for(const [id,label] of [['ape','ape'],['worm','worm'],['rhinoceros','pachyderm'],['trunked-centipede','proboscis']]){
   await page.selectOption('#composer-focus','body');await page.selectOption('#composer-preset',id);await settle();const body=await headFill();
   await page.selectOption('#composer-focus','head');s0=await settle();assert.equal(s0.focus,'head');const fill=await headFill();
   for(const view of ['three-quarter','side','front']){await page.selectOption('#composer-view',view);await settle();const f=await headFill();framing.push({id,label,view,body:body.heightFraction,...f});
    assert(f.heightFraction>=.4,`${label} ${view}: head fills ${(f.heightFraction*100).toFixed(1)}% of the viewport height`);assert(f.inside,`${label} ${view}: head inside the frame`);
    await page.locator('#viewport').screenshot({path:join(output,`head-frame-${label}-${view}.png`)});}
   await page.selectOption('#composer-view','three-quarter');assert(fill.heightFraction>body.heightFraction,`${label}: head framing is closer than whole-animal framing`);
  }
  assert.equal(new URL(await lab()).searchParams.has('focus'),false,'framing is not stored in the link');
  await page.selectOption('#composer-focus','body');await settle();evidence.push({check:'head-frame',framing});
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
