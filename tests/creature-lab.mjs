import {chromium} from 'playwright';
import {browserArgs} from './browser-options.mjs';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
const base=process.env.ATLAS_URL||'http://127.0.0.1:5186/creature-lab.html';
const out=process.env.ATLAS_RESULTS||'test-results/creature-lab';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:browserArgs});
const errors=[];
const inspect=p=>p.evaluate(()=>{
  const d=window.__creatureLab;
  return d&&{ready:d.ready,error:d.error,world:d.world,dated:d.dated,mode:d.mode,
    selectedSpeciesId:d.selectedSpeciesId,time:d.time,gait:d.gait,playing:d.playing,
    terrain:d.terrain,actorCount:d.actorCount,poses:d.poses,renderer:d.renderer,
    cpuMs:d.cpuMs,displayedSpeciesIds:d.displayedSpeciesIds};
});
async function settle(p){
  await p.waitForFunction(()=>window.__creatureLab?.ready,undefined,{timeout:30000});
  await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const d=await inspect(p);assert.ok(!d.error,d.error);return d;
}
const shot=(p,name)=>p.screenshot({path:path.join(out,name+'.png')});
async function select(p,id,value){await p.locator('#'+id).selectOption(String(value));return settle(p);}
async function number(p,id,value){await p.locator('#'+id).fill(String(value));await p.locator('#'+id).press('Tab');return settle(p);}
try{
  const context=await browser.newContext({viewport:{width:1500,height:1000},recordVideo:{dir:path.join(out,'video'),size:{width:1200,height:800}}});
  const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await p.goto(base,{waitUntil:'networkidle'});let d=await settle(p);
  assert.equal(d.mode,'gallery');assert.equal(d.actorCount,12);
  assert.equal(new Set(d.displayedSpeciesIds).size,12);await shot(p,'01-gallery');
  const firstId=d.displayedSpeciesIds[0];
  await p.locator('#creature-labels button').first().click();d=await settle(p);
  assert.equal(d.mode,'anatomy');assert.equal(d.selectedSpeciesId,firstId);
  await select(p,'mode','gallery');
  const creatures=d.world.species.filter(s=>s.creature),worldDigest=d.world.digest;
  const samples=[];
  for(const archetype of ['browser','runner','low-slung','long-neck']){
    const lineage=creatures.filter(s=>s.creature.archetype===archetype);
    const last=lineage.find(s=>!lineage.some(a=>a.parentId===s.id));
    await select(p,'species',last.id);d=await select(p,'mode','ancestry');
    const chain=[];let a=last;while(a){chain.unshift(a.id);a=creatures.find(s=>s.id===a.parentId);}
    assert.deepEqual(d.displayedSpeciesIds,chain,'ancestry renders actual complete parent chain');
    assert.equal(d.actorCount,3);await shot(p,'ancestry-'+archetype);
    await select(p,'mode','anatomy');await p.locator('#skeleton').check();await p.locator('#neutral').check();d=await settle(p);
    assert.equal(d.actorCount,1);assert.ok(d.poses[0].jointCount>=12);
    await shot(p,'anatomy-'+archetype);samples.push({archetype,renderer:d.renderer});
  }
  await p.locator('#neutral').uncheck();await p.locator('#skeleton').uncheck();
  await select(p,'mode','arena');await select(p,'crowd','1');
  const motion=[];
  for(const terrain of ['flat','slope','steps']){
    await select(p,'terrain',terrain);
    for(const gait of ['walk','run']){
      await select(p,'gait',gait);const a=await number(p,'time',.4),b=await number(p,'time',.9);
      assert.ok(b.poses[0].root[0]>a.poses[0].root[0],'root progresses through arena');
      assert.notDeepEqual(b.poses[0].feet,a.poses[0].feet,'articulated feet actually move');
      assert.ok(b.poses[0].maxPenetration<.08,'feet do not sink through supported terrain');
      assert.ok(b.poses[0].maxReachError<.1,'reachable contact targets');
      const replay=await number(p,'time',.4);assert.deepEqual(replay.poses,a.poses,'A-B-A pose replay');
      motion.push({terrain,gait,pose:b.poses[0]});await shot(p,terrain+'-'+gait);
    }
  }
  await select(p,'terrain','flat');await select(p,'gait','walk');await number(p,'time',0);
  await p.locator('#play').click();await p.waitForTimeout(2000);d=await inspect(p);assert.ok(d.playing&&d.time>1);await p.locator('#play').click();
  await select(p,'gait','run');await p.locator('#play').click();await p.waitForTimeout(2000);await p.locator('#play').click();
  await p.locator('#reset').click();d=await settle(p);assert.equal(d.time,0);
  d=await select(p,'crowd','16');assert.equal(d.actorCount,16);await number(p,'time',1);
  await p.locator('#play').click();await p.waitForTimeout(1200);d=await inspect(p);await p.locator('#play').click();
  assert.ok(Number.isFinite(d.cpuMs)&&d.cpuMs>=0);const crowd={renderer:d.renderer,cpuMs:d.cpuMs};await shot(p,'08-crowd');
  const downloadPromise=p.waitForEvent('download');await p.locator('#export-json').click();const download=await downloadPromise;await download.saveAs(path.join(out,'export.json'));
  const exported=JSON.parse(await readFile(path.join(out,'export.json'),'utf8'));assert.ok(exported.world);assert.equal(exported.world.digest,worldDigest);
  assert.equal(exported.individuals.length,16);
  assert.equal(exported.settings.growth,'adult');
  assert.ok(exported.individuals.every(i=>i.genome.version&&i.id&&i.speciesId));
  assert.notDeepEqual(exported.individuals[0].genome,exported.individuals[1].genome,'export preserves actual crowd variants');
  const before=d.dated.dateMyr;
  d=await number(p,'date-myr',d.world.formationMyr-1);assert.equal(d.actorCount,0);await shot(p,'09-unformed');
  await number(p,'date-myr',before);d=await settle(p);assert.ok(d.actorCount>0);
  const resources=[];
  for(let i=0;i<4;i++){await p.locator('#seed').fill('CREATURE-RESOURCE-'+i);await p.locator('#regenerate').click();d=await settle(p);resources.push({...d.renderer.memory});}
  assert.ok(resources.at(-1).geometries<=resources[0].geometries+40,'previous rigs are disposed');
  d=await select(p,'profile','airless');assert.equal(d.actorCount,0);await shot(p,'10-airless');
  await p.setViewportSize({width:390,height:844});await select(p,'profile','temperate');
  d=await settle(p);await select(p,'species',d.world.species.filter(s=>s.creature).at(-1).id);
  d=await select(p,'mode','ancestry');assert.equal(d.actorCount,3);
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await shot(p,'11-mobile');
  assert.deepEqual(errors,[]);
  await writeFile(path.join(out,'report.json'),JSON.stringify({ok:true,base,samples,motion,crowd,resources,errors},null,2));
  await context.close();console.log(JSON.stringify({ok:true,base,crowd,resources,errors}));
}finally{await browser.close();}
