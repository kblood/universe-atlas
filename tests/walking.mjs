import {chromium} from 'playwright';
import {browserArgs} from './browser-options.mjs';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {CATALOGUE_EPOCH_NS} from '../src/world-time.ts';
import {encodeVersions,CURRENT_VERSIONS} from '../src/time-nav.ts';
import {galaxies,refByAddress,system} from '../src/catalog.ts';
import {terrainSampler} from '../src/terrain.ts';
import {surfaceNormal} from '../src/planet-tiles.ts';
import {surfaceQuery} from '../src/world-surface.ts';
const base=process.env.ATLAS_URL||'http://127.0.0.1:5186/',out=process.env.ATLAS_RESULTS||'test-results/walking';
const address={seed:'LETHRA-001',g:'G001',system:'G001/C2128,0,1/0',body:'G001/C2128,0,1/0/planet/1'};
/** ATLAS_WALK_FAST used to skip straight to a hardcoded walk= literal
 * (-5135592.775016434,826577.7020637528,112840.23451522976) to avoid the UI
 * choreography (timeline open/fill/apply/reset, then #walk-surface) the
 * non-fast path uses. The `atlas-1.0.0 -> atlas-2.0.0` catalog.ts `ihash`
 * rewrite reshaped this body's geometry and that literal now resolves to
 * ocean (surfaceQuery reports ocean:true, walkable:false) — stale ground,
 * the same class of bug tests/surface.mjs's resolveLitLandingPoint already
 * guards against. This mirrors that pattern (live-resolved against the
 * CURRENT catalogue/terrain, Fibonacci-sphere search filtered on
 * walkability), but this test never screenshots ground material under
 * sunlight, so unlike resolveLitLandingPoint it skips the illumination/date
 * ranking entirely: walkability plus a sane slope/elevation is enough, and
 * it stops at the first qualifying candidate instead of scanning for the
 * best one, to stay fast. */
function resolveFastWalkPoint(addr){
  const g=galaxies(addr.seed).find(x=>x.id===addr.g);
  if(!g)throw new Error('resolveFastWalkPoint: galaxy not found: '+addr.g);
  const ref=refByAddress(g,addr.system);
  if(!ref)throw new Error('resolveFastWalkPoint: system not found: '+addr.system);
  const sys=system(ref);
  const body=[...sys.stars,...sys.planets,...sys.moons].find(b=>b.id===addr.body);
  if(!body)throw new Error('resolveFastWalkPoint: body not found: '+addr.body);
  const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  const sample=terrainSampler(body),query=surfaceQuery(body),N=20000;
  for(let i=0;i<N;i++){
    const y=1-2*(i+.5)/N,phi=i*2.399963229728653,r=Math.sqrt(Math.max(0,1-y*y));
    const d=[Math.cos(phi)*r,y,Math.sin(phi)*r],s=sample(d);
    // Same ordinary dry-land band as resolveLitLandingPoint (elevation
    // 0-800m): walkable land, not an extreme alpine peak.
    if(s.ocean||s.elevationM<=0||s.elevationM>800)continue;
    const q=query(d,0n);if(!q.walkable)continue;
    const normal=surfaceNormal(body,d,sample),slopeDeg=Math.acos(Math.max(-1,Math.min(1,dot(d,normal))))*180/Math.PI;
    if(slopeDeg>12)continue;
    return d.map(v=>v*(body.radiusM+q.rockHeightM+.92));
  }
  throw new Error('resolveFastWalkPoint: no walkable+shallow candidate found on '+addr.body);
}
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:browserArgs});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
if(process.env.ATLAS_WORKER_FAULT)await page.addInitScript(()=>{
  const NativeWorker=window.Worker;let failed=false;
  window.Worker=class extends NativeWorker{
    constructor(url,options){super(url,options);if(String(url).includes('planet-worker')&&!failed){failed=true;setTimeout(()=>this.dispatchEvent(new ErrorEvent('error',{cancelable:true,message:'injected terrain-worker fault'})),50);}}
  };
});
const snapshot=()=>page.evaluate(()=>({travel:window.__atlas?.travel,terrain:window.__atlas?.terrain,date:window.__atlas?.date}));
try{
  const fastWalk=process.env.ATLAS_WALK_FAST?resolveFastWalkPoint(address):null;
  if(fastWalk)console.log('resolved ATLAS_WALK_FAST landing point: '+JSON.stringify(fastWalk));
  await page.goto(base+'?'+new URLSearchParams({seed:address.seed,g:address.g,system:address.system,body:address.body})
    +(fastWalk?'&walk='+fastWalk.join(','):''));
  await page.waitForFunction(()=>window.__atlas?.ready&&window.__atlas?.terrain?.tiles?.ready,undefined,{timeout:120000});
  if(!process.env.ATLAS_WALK_FAST){
    const relative=()=>page.evaluate(()=>{const a=window.__atlas,t=a.travel,c=t.bodies.find(b=>b.id===a.state.body.id).positionM;return t.position.map((v,i)=>v-c[i]);});
    await page.locator('#timeline summary').click();await page.locator('#date-years').fill('1');
    await page.waitForFunction(()=>!window.__atlas.camera.animating);
    const before=await relative();await page.locator('#time-apply').click();
    const after=await relative(),drift=Math.hypot(...after.map((v,i)=>v-before[i]));console.log(JSON.stringify({inspectionBefore:before,inspectionAfter:after,drift}));
    assert.ok(drift<.01,'orbital inspection follows the planet when seeking');
    await page.locator('#time-reset').click();await page.locator('#timeline summary').click();
    await page.locator('#walk-surface').click();
  }
  for(let i=0;i<120;i++){
    await page.waitForTimeout(2000);
    const s=await snapshot();
    if(i%10===0)console.log(JSON.stringify({elapsed:i*2,landing:s.travel.landing,walk:s.travel.walking,tiles:s.terrain?.tiles}));
    if(s.travel.walking?.grounded&&!s.travel.walking.waiting)break;
  }
  const start=await snapshot();assert.ok(start.travel.walking?.grounded,'landed with collision');
  assert.ok(start.terrain.tiles.accountedBytes<start.terrain.tiles.budgetBytes);
  await page.screenshot({path:out+'/01-landed.png'});
  await page.keyboard.down('w');await page.waitForFunction(()=>window.__atlas.travel.walking?.travelledM>8,undefined,{timeout:30000});await page.keyboard.up('w');
  const moved=await snapshot();assert.ok(moved.travel.walking.travelledM>5);assert.ok(moved.travel.walking.contactMismatchM<.05);
  await page.keyboard.press('Space');
  await page.waitForFunction(()=>window.__atlas.travel.walking?.grounded===false,undefined,{timeout:10000});
  const jumping=await snapshot();assert.equal(jumping.travel.walking.grounded,false);
  await page.waitForFunction(()=>window.__atlas.travel.walking?.grounded,undefined,{timeout:20000});
  await page.screenshot({path:out+'/02-walked.png'});
  await page.waitForTimeout(1200);const savedURL=page.url();assert.ok(savedURL.includes('walk='));
  await page.reload();
  await page.waitForFunction(()=>window.__atlas.travel.walking?.grounded,undefined,{timeout:240000});
  const restored=await snapshot();
  console.log('Restored ground location; sampling frame times.');
  assert.ok(Math.hypot(...restored.travel.walking.position.map((v,i)=>v-moved.travel.walking.position[i]))<5,'restore retains surface location');
  const performanceSample=await page.evaluate(async()=>{
    const canvas=document.querySelector('canvas'),gl=canvas.getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info');
    const rows=[];let last=performance.now();
    for(let i=0;i<180;i++){await new Promise(requestAnimationFrame);const now=performance.now();rows.push({frameMs:now-last,terrainMs:window.__atlas.terrain.tiles.updateMs});last=now;}
    const percentile=(key,p)=>rows.map(r=>r[key]).sort((a,b)=>a-b)[Math.floor((rows.length-1)*p)];
    return {renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),frames:rows.length,frameMedianMs:percentile('frameMs',.5),frameP95Ms:percentile('frameMs',.95),terrainMedianMs:percentile('terrainMs',.5),terrainP95Ms:percentile('terrainMs',.95)};
  });
  console.log(JSON.stringify({performanceSample}));
  await page.locator('#timeline summary').click();await page.locator('#date-years').fill('13800000000.1');await page.locator('#time-apply').click();
  const sought=await snapshot();assert.equal(sought.travel.walking,null);assert.notEqual(sought.date.offsetNs,'0');
  // offsetNs is the raw absolute epoch (nanoseconds since the Big Bang, t=0n),
  // never an offset from the catalogue — atlas-time-2 (world-time.ts). A
  // "reset to now" therefore lands on CATALOGUE_EPOCH_NS, not '0': '0' would
  // be the Big Bang itself, not "now". Pins the exact instant rather than a
  // sentinel, which is strictly stronger than the old (stale, atlas-time-1)
  // '0' expectation.
  await page.locator('#time-reset').click();assert.equal((await snapshot()).date.offsetNs,CATALOGUE_EPOCH_NS.toString());
  const moon=await page.evaluate(()=>window.__atlas.state.sys.moons[0]);assert.ok(moon);
  console.log('Landing on moon north pole: '+moon.id);
  // `wv` is REQUIRED whenever `date` carries an absolute (atlas-time-2) epoch.
  // Per contract §6.2, a URL with no version bundle is BY DEFINITION a legacy
  // bookmark, so `resolveTimeFromUrl` correctly adds CATALOGUE_EPOCH_NS to its
  // `date`. Omitting `wv` here while passing an absolute value therefore double-
  // offset the restore by exactly one catalogue epoch (~13.787 Gyr) and this
  // assertion failed against a CORRECT app. The app's own `persist()` always
  // attaches `wv` via `writeTimeToUrl`; a hand-built URL must do the same.
  await page.goto(base+'?'+new URLSearchParams({seed:'LETHRA-001',g:'G001',system:'G001/C2128,0,1/0',body:moon.id,walk:`0,${moon.radiusM+1000},0`,date:sought.date.offsetNs,wv:encodeVersions(CURRENT_VERSIONS)}));
  await page.waitForFunction(()=>window.__atlas.travel.walking?.grounded,undefined,{timeout:240000});
  const moonStart=await snapshot();assert.equal(moonStart.date.offsetNs,sought.date.offsetNs);
  await page.keyboard.down('w');await page.waitForFunction(()=>window.__atlas.travel.walking?.travelledM>8,undefined,{timeout:30000});await page.keyboard.up('w');
  if(process.env.ATLAS_LONG_WALK){
    await page.keyboard.down('Shift');await page.keyboard.down('w');
    await page.waitForFunction(()=>window.__atlas.travel.walking?.travelledM>90,undefined,{timeout:120000});
    await page.keyboard.up('w');await page.keyboard.up('Shift');
  }
  const moonWalk=await snapshot();assert.ok(moonWalk.travel.walking.contactMismatchM<.05);
  await page.screenshot({path:out+'/03-moon-pole.png'});
  await page.locator('#walk-surface').click();
  await page.waitForFunction(()=>!window.__atlas.travel.walking&&!window.__atlas.travel.landing,undefined,{timeout:60000});
  const takeoff=await snapshot();assert.ok(takeoff.travel.active);assert.ok(takeoff.travel.surface.terrainClearance>150);
  for(const level of ['system','galaxy','universe']){
    await page.locator(`#breadcrumbs [data-level="${level}"]`).click();
    await page.waitForFunction(level=>window.__atlas.ready&&window.__atlas.state.level===level,level,{timeout:120000});
    assert.equal((await snapshot()).date.offsetNs,sought.date.offsetNs,'date retained in '+level);
  }
  if(process.env.ATLAS_WORKER_FAULT)assert.ok(start.terrain.tiles.failuresTotal>0,'injected worker failure recovered');
  assert.deepEqual(errors,[]);
  const report={ok:true,base,start,moved,jumping,restored,sought,moonStart,moonWalk,takeoff,performanceSample,errors};
  await writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({ok:true,walk:moved.travel.walking,performanceSample}));
// The diagnostic block is isolated so it can never replace the real failure:
// a dead/unready page makes snapshot() throw, and that TypeError used to
// propagate in place of the underlying TimeoutError, reporting the wrong cause.
}catch(error){try{const s=await snapshot();console.log(JSON.stringify({walk:s?.travel?.walking,landing:s?.travel?.landing,surface:s?.travel?.surface,terrain:s?.terrain?.tiles,date:s?.date}));}catch(diagnosticError){console.log(JSON.stringify({diagnosticsUnavailable:String(diagnosticError)}));}console.log(errors);try{await page.screenshot({path:out+'/failure.png'});}catch{}throw error;}
finally{await browser.close();}
