import { chromium } from 'playwright';
import { browserArgs } from './browser-options.mjs';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { galaxies, refByAddress, system, AU, LY } from '../src/catalog.ts';

const base=process.env.ATLAS_URL||'http://127.0.0.1:5186/';
const out=process.env.ATLAS_RESULTS||'test-results/visual-continuity';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:browserArgs});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const wait=fn=>page.waitForFunction(fn,null,{timeout:90000});
const ready=()=>wait(()=>window.__atlas?.ready);
const continuation=[];
async function checkContinuation(domain){
  await page.waitForFunction(domain=>window.__atlas.travel.domain===domain&&window.__atlas.travel.cruise&&!window.__atlas.ready,domain,{timeout:90000});
  const before=await page.evaluate(()=>({position:window.__atlas.travel.position,active:window.__atlas.travel.active}));
  await page.waitForTimeout(100);
  const after=await page.evaluate(()=>({position:window.__atlas.travel.position,active:window.__atlas.travel.active}));
  assert.ok(before.active&&after.active,domain+': flight survives the frame change');
  assert.ok(Math.hypot(...after.position.map((v,i)=>v-before.position[i]))>0,domain+': movement continues during the blend');
  continuation.push({domain,before,after});
  // Brake without leaving free flight before measuring the optical handoff.
  await page.keyboard.press('Shift');
}
async function sample(name){
  // Label text must not count as light from the star.
  await page.addStyleTag({content:'#labels { visibility:hidden !important; }'});
  const target=await page.evaluate(()=>window.__atlas.appearance.target);
  assert.ok(target,'selected star has a projected position');
  const png=await page.screenshot({path:`${out}/${name}.png`});
  const pixels=await page.evaluate(async({png,target})=>{
    const image=await createImageBitmap(new Blob([Uint8Array.from(atob(png),c=>c.charCodeAt(0))],{type:'image/png'}));
    const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
    const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
    const size=33,c=16,data=ctx.getImageData(Math.round(target.x)-c,Math.round(target.y)-c,size,size).data;
    const light=i=>Math.max(data[i*4],data[i*4+1],data[i*4+2]);
    let seed=c*size+c,peak=0;
    for(let y=c-3;y<=c+3;y++)for(let x=c-3;x<=c+3;x++)if(light(y*size+x)>peak){seed=y*size+x;peak=light(seed);}
    const seen=new Set(),queue=[seed];let minX=size,maxX=0,minY=size,maxY=0;
    while(queue.length){const i=queue.pop();if(seen.has(i)||light(i)<48)continue;seen.add(i);
      const x=i%size,y=Math.floor(i/size);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
      if(x)queue.push(i-1);if(x<size-1)queue.push(i+1);if(y)queue.push(i-size);if(y<size-1)queue.push(i+size);
    }
    return {peak,area:seen.size,width:seen.size?maxX-minX+1:0,height:seen.size?maxY-minY+1:0};
  },{png:png.toString('base64'),target});
  assert.ok(pixels.peak>50&&pixels.area>0,`${name}: star must contribute visible pixels: ${JSON.stringify({target,pixels})}`);
  return {name,...target,...pixels};
}
try{
  await page.goto(base+'?seed=LETHRA-001');await ready();
  await page.evaluate(()=>{
    window.visualSamples=[];
    const record=()=>{const a=window.__atlas;if(a)window.visualSamples.push({level:a.state.level,
      crossing:a.travel.crossings,preview:a.appearance.galaxyPreview});
      if(window.visualSamples.length<6000)requestAnimationFrame(record);};record();
  });
  await page.locator('[data-select="G001"]').click();
  await page.locator('#fly-target').click();
  await wait(()=>window.__atlas.appearance.galaxyPreview.some(g=>g.radii<11&&g.radii>6));
  await page.screenshot({path:out+'/01-before-galaxy-entry.png'});
  await checkContinuation('galaxy');
  await wait(()=>window.__atlas.travel.crossings===1&&window.__atlas.ready&&!window.__atlas.travel.autopilot);
  const entry=await page.evaluate(()=>({position:window.__atlas.space.positionLy,radius:window.__atlas.state.galaxy.radiusLy,
    samples:window.visualSamples.flatMap(s=>s.level==='universe'?s.preview:[])}));
  assert.ok(Math.hypot(...entry.position)/entry.radius>4.5,'galaxy loads well outside its disk');
  assert.ok(entry.samples.some(s=>s.mix===1&&s.radii>6),'same catalogue stars are fully visible before the boundary');
  assert.ok(entry.samples.every(s=>s.stars>8000));
  await page.screenshot({path:out+'/02-after-galaxy-entry.png'});
  await page.keyboard.press('Escape');
  // Fit the galaxy to select a visible single-star system, avoiding binary
  // splitting as a confounding effect in the optical point comparison.
  await page.goto(base+'?seed=LETHRA-001&g=G001');await ready();await page.waitForTimeout(1000);
  const galaxy=galaxies('LETHRA-001')[0];let target;
  for(const candidate of await page.evaluate(()=>window.__atlas.mapTargets)){
    const ref=refByAddress(galaxy,candidate.id);if(!ref||system(ref).stars.length!==1)continue;
    await page.mouse.click(candidate.x,candidate.y);
    if(await page.evaluate(()=>window.__atlas.selected)===candidate.id){target=candidate;break;}
  }
  assert.ok(target,'a visible single-star system is selectable');
  await page.locator('#approach-star').click();await ready();
  const samples=[await sample('03-star-at-local-range')];
  for(const distance of [1,.15]){
    await page.locator('#fly-target').click();
    await page.waitForFunction(d=>window.__atlas.appearance.target?.distanceLy<d,distance,{timeout:90000});
    await page.keyboard.press('Escape');await page.waitForTimeout(120);
    samples.push(await sample(`04-star-${distance}-ly`));
  }
  assert.ok(samples[2].pointDiameter>samples[0].pointDiameter*1.8,'optical diameter grows over the approach');
  assert.ok(samples[2].area>samples[0].area*2,'rendered star footprint actually grows');
  await page.locator('#fly-target').click();
  await checkContinuation('system');
  await wait(()=>window.__atlas.travel.crossings===1&&window.__atlas.ready&&!window.__atlas.travel.autopilot);
  await page.keyboard.press('Escape');await page.waitForTimeout(120);
  const arrived=await sample('05-after-system-entry');samples.push(arrived);
  assert.equal(arrived.id,target.id,'same system identity survives the handoff');
  assert.ok(arrived.distanceLy*LY/AU>3000,'system loads while primary is unresolved, thousands of AU away');
  assert.ok(arrived.pointDiameter/samples[2].pointDiameter<1.2,'no fixed-size marker jump at entry');
  assert.ok(arrived.area/samples[2].area<1.8,'rendered stellar footprint stays comparable across entry');
  const markers=await page.evaluate(()=>window.__atlas.appearance.markerVisibility);
  assert.equal(markers[0],0,'physical star has one optical point, no duplicate beacon');
  assert.deepEqual(errors,[]);
  const report={ok:true,base,galaxyEntryRadii:Math.hypot(...entry.position)/entry.radius,
    preparedCatalogueBeforeEntry:true,continuation,samples,markerVisibility:markers,errors};
  await writeFile(out+'/report.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify(report));
}catch(error){await page.screenshot({path:out+'/failure.png'});throw error;}
finally{await browser.close();}
