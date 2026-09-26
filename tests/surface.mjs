import {chromium} from 'playwright';
import {browserArgs} from './browser-options.mjs';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {galaxies,refByAddress,system,bodyPosition} from '../src/catalog.ts';
import {CATALOGUE_EPOCH_NS} from '../src/world-time.ts';
import {terrainSampler} from '../src/terrain.ts';
import {surfaceNormal} from '../src/planet-tiles.ts';
import {surfaceQuery} from '../src/world-surface.ts';
import {starLifecycle,planetLifecycle,spinStateFor,dayNightAt} from '../src/stellar-evolution.ts';
import {parseAddress} from '../src/address.ts';
const base=process.env.ATLAS_URL||'http://127.0.0.1:5186/',out=process.env.ATLAS_RESULTS||'test-results/surface';
/** Resolves a landing point on `addr.body` that is BOTH walkable (dry,
 * unsubmerged, low slope — the same `!ocean && walkable && slope` definition
 * `prepareLanding()`/`surfaceQuery` use in src/main.ts) AND comfortably
 * sunlit at the app's default epoch (`CATALOGUE_EPOCH_NS`, since this test
 * passes no `?date=`). Computed fresh against the CURRENT catalog.ts/
 * terrain.ts/stellar-evolution.ts every run, not a frozen literal — so a
 * future catalogue/terrain/ihash revision that reshapes this body's geometry
 * (as `atlas-1.0.0 -> atlas-2.0.0` already did once, turning a
 * previously-verified-walkable literal into ocean and hanging the test at
 * its 240s timeout) makes this resolve a new valid point instead of
 * silently landing on invalid or unlit ground.
 *
 * Sun direction reproduces src/main.ts's `updatePlanetTiles`/
 * `spinCompensatedSunDirection`: the body-fixed terrain mesh is never
 * itself rotated, so a body's spin + axial tilt must be applied to the
 * incident sun direction via `dayNightAt` (contract §4.4), not to the
 * surface geometry — a plain `dot(normal, sunDirWorld)` ignoring spin is
 * wrong for any rotating body. */
function resolveLitLandingPoint(addr){
  const g=galaxies(addr.seed).find(x=>x.id===addr.g);
  if(!g)throw new Error('resolveLitLandingPoint: galaxy not found: '+addr.g);
  const ref=refByAddress(g,addr.system);
  if(!ref)throw new Error('resolveLitLandingPoint: system not found: '+addr.system);
  const sys=system(ref);
  const body=[...sys.stars,...sys.planets,...sys.moons].find(b=>b.id===addr.body);
  if(!body)throw new Error('resolveLitLandingPoint: body not found: '+addr.body);
  const star=sys.stars[0],epoch=CATALOGUE_EPOCH_NS;
  const bodyAddress=(b)=>({...parseAddress(sys.ref.id),slot:b.id.slice(sys.ref.id.length+1)});
  const starLc=starLifecycle(addr.seed,bodyAddress(star),star);
  const planetLc=planetLifecycle(addr.seed,bodyAddress(body),body,starLc,undefined);
  const spin=spinStateFor(body);
  const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
  const norm=(v)=>{const m=Math.hypot(...v);return [v[0]/m,v[1]/m,v[2]/m];};
  const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  const rawSun=norm(sub(bodyPosition(star,sys,epoch),bodyPosition(body,sys,epoch)));
  const sample=terrainSampler(body),query=surfaceQuery(body),N=200000;
  let best=null;
  for(let i=0;i<N;i++){
    const y=1-2*(i+.5)/N,phi=i*2.399963229728653,r=Math.sqrt(Math.max(0,1-y*y));
    const d=[Math.cos(phi)*r,y,Math.sin(phi)*r],s=sample(d);
    // Bounded to ordinary ground-level dry land (the invalidated literal
    // this replaces was rockHeightM~78m) rather than an extreme alpine
    // peak — walkability itself doesn't care about altitude, but an
    // unrepresentative site risks confounding the ground-material pixel
    // diff with something altitude-related (snow biome, fog falloff).
    if(s.ocean||s.elevationM<=0||s.elevationM>800)continue;
    const q=query(d,0n);if(!q.walkable)continue;
    const normal=surfaceNormal(body,d,sample),slopeDeg=Math.acos(Math.max(-1,Math.min(1,dot(d,normal))))*180/Math.PI;
    if(slopeDeg>12)continue;
    const illum=dayNightAt(spin,planetLc.formationNs,epoch,normal,rawSun).illumination;
    if(illum<.5)continue;
    if(!best||illum>best.illum)best={d,illum,slopeDeg,elevationM:s.elevationM,rockHeightM:q.rockHeightM};
  }
  if(!best)throw new Error('resolveLitLandingPoint: no walkable+sunlit candidate found on '+addr.body);
  const radiusOut=body.radiusM+best.rockHeightM+.92;
  return {point:best.d.map(v=>v*radiusOut),illum:best.illum,slopeDeg:best.slopeDeg,elevationM:best.elevationM,rockHeightM:best.rockHeightM};
}
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:browserArgs});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const address={seed:'LETHRA-001',g:'G001',system:'G001/C2128,0,1/0',body:'G001/C2128,0,1/0/planet/1'};
const pixels=async(a,b)=>page.evaluate(async([aa,bb])=>{
  const load=async(src)=>{const img=new Image();img.src=src;await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);return ctx.getImageData(0,0,c.width,c.height).data;};
  const [x,y]=await Promise.all([load(aa),load(bb)]);let delta=0,changed=0;
  for(let i=0;i<x.length;i+=4){const d=(Math.abs(x[i]-y[i])+Math.abs(x[i+1]-y[i+1])+Math.abs(x[i+2]-y[i+2]))/3;delta+=d;if(d>2)changed++;}
  return {meanRGBDelta:delta/(x.length/4),changedFraction:changed/(x.length/4)};
},[a,b].map(x=>'data:image/png;base64,'+x.toString('base64')));
try{
  // Resolved live (see resolveLitLandingPoint above) instead of a frozen
  // literal: must be BOTH walkable dry land (prior literal only satisfied
  // this — rockHeightM~78m — and was itself already broken once by a
  // catalog VERSION bump, atlas-1.0.0 -> atlas-2.0.0, that turned it into
  // ocean and hung the test at 240s) AND comfortably sunlit, since the
  // detail toggle below only visibly changes PBR albedo/roughness/normals
  // under incident light. The prior literal landed at illumination 0 (true
  // night side, confirmed via dayNightAt) — real signal on the shader fix
  // (delta 0.0 -> 1.83) but structurally incapable of clearing the >3
  // threshold there.
  const landingSite=resolveLitLandingPoint(address);
  console.log('resolved landing site: '+JSON.stringify(landingSite));
  assert.ok(landingSite.illum>.5,'resolved landing site is comfortably sunlit');
  await page.goto(base+'?'+new URLSearchParams({...address,walk:landingSite.point.join(',')}));
  await page.waitForFunction(()=>window.__atlas?.travel.walking?.grounded,undefined,{timeout:240000});
  await page.waitForTimeout(6000);
  const before=await page.evaluate(()=>window.__atlas.travel.walking);
  const terrain=await page.evaluate(()=>window.__atlas.terrain.tiles);
  assert.ok(terrain.detailPatches>0);assert.ok(terrain.skirtPatches<terrain.visible);
  await page.screenshot({path:out+'/01-detail-on.png'});
  const groundOn=await page.screenshot({clip:{x:600,y:600,width:300,height:150}});
  await page.locator('#surface-detail').click();
  await page.waitForTimeout(1000);
  assert.equal(await page.evaluate(()=>window.__atlas.terrain.tiles.surfaceDetail),false);
  await page.screenshot({path:out+'/02-detail-off.png'});
  const groundOff=await page.screenshot({clip:{x:600,y:600,width:300,height:150}});
  const groundPixels=await pixels(groundOn,groundOff);
  assert.ok(groundPixels.meanRGBDelta>3&&groundPixels.changedFraction>.5,'detail visibly changes actual rendered ground');
  assert.ok(page.url().includes('detail=0'));
  const after=await page.evaluate(()=>window.__atlas.travel.walking);
  assert.ok(Math.hypot(...before.position.map((v,i)=>v-after.position[i]))<.01,'material toggle preserves physical ground');
  await page.reload();
  await page.waitForFunction(()=>window.__atlas?.travel.walking?.grounded,undefined,{timeout:240000});
  assert.equal(await page.evaluate(()=>window.__atlas.terrain.tiles.surfaceDetail),false,'detail preference survives a cold URL restore');
  await page.locator('#surface-detail').click();
  await page.locator('#surface-survey summary').click();
  await page.locator('#survey-surface').click();
  await page.waitForFunction(()=>window.__atlas.surfaceSurvey?.length>0,undefined,{timeout:60000});
  const sites=await page.evaluate(()=>window.__atlas.surfaceSurvey);
  assert.equal(await page.locator('[data-surface-site]').count(),sites.length);
  await page.screenshot({path:out+'/03-destinations.png'});
  const coast=sites.find(s=>s.category==='Coast');assert.ok(coast);
  await page.locator(`[data-surface-site="${coast.id}"]`).click();
  await page.waitForFunction(()=>window.__atlas.travel.terrainCruise===600,undefined,{timeout:180000});
  await page.locator('#walk-surface').click();
  await page.waitForFunction(()=>window.__atlas.travel.walking?.grounded,undefined,{timeout:240000});
  const landed=await page.evaluate(()=>window.__atlas.travel.walking);
  const radius=Math.hypot(...landed.position),siteMissM=Math.hypot(...landed.position.map((v,i)=>v/radius-coast.direction[i]))*radius;
  assert.ok(siteMissM<2000,'named coast flight reaches the actual surveyed direction');
  await page.waitForTimeout(5000);await page.screenshot({path:out+'/04-coastal-ground.png'});
  await page.goto(base+'?'+new URLSearchParams(address));
  await page.waitForFunction(()=>window.__atlas?.ready&&window.__atlas.terrain?.tiles?.ready&&!window.__atlas.camera.animating,undefined,{timeout:120000});
  await page.waitForTimeout(3000);
  const orbitTerrain=await page.evaluate(()=>window.__atlas.terrain.tiles);
  assert.equal(orbitTerrain.detailPatches,0,'orbital patches skip detail texture reads');
  const orbitOn=await page.screenshot({clip:{x:550,y:250,width:450,height:400}});
  await page.locator('#surface-detail').click();await page.waitForTimeout(500);
  const orbitOff=await page.screenshot({clip:{x:550,y:250,width:450,height:400}});
  const orbitPixels=await pixels(orbitOn,orbitOff);assert.ok(orbitPixels.meanRGBDelta<.1,'orbital appearance remains unchanged');
  await page.locator('#surface-survey summary').click();await page.locator('#survey-surface').click();
  await page.waitForFunction(()=>window.__atlas.surfaceSurvey?.length>0,undefined,{timeout:60000});
  assert.deepEqual(await page.evaluate(()=>window.__atlas.surfaceSurvey),sites,'cold reload reproduces named sites');
  const downloadPromise=page.waitForEvent('download');await page.locator('#export').click();
  const download=await downloadPromise;await download.saveAs(out+'/survey-export.json');
  const exported=JSON.parse(await readFile(out+'/survey-export.json','utf8'));
  assert.equal(exported.surfaceSurvey.version,'surface-survey-1');assert.deepEqual(exported.surfaceSurvey.sites,sites);
  console.log(JSON.stringify({sites,groundPixels,orbitPixels,siteMissM,errors}));
  await writeFile(out+'/report.json',JSON.stringify({ok:true,base,before,after,terrain,orbitTerrain,groundPixels,orbitPixels,siteMissM,landed,sites,errors},null,2));
  assert.deepEqual(errors,[]);
}catch(error){await page.screenshot({path:out+'/failure.png'});console.log(JSON.stringify(await page.evaluate(()=>window.__atlas.travel)));throw error;}
finally{await browser.close();}
