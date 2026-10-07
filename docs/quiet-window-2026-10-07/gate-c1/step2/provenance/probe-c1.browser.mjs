// GATE-C1 GPU probe pair (Fable decision carving lattice section 1 "promotion trigger" and 2c(3) visual STOP).
// Minimal capture derived from scripts/luna-capture/capture-massif.browser.mjs (same fixture, seed, date, free-port
// preview, GPU lock, setPose/perfSample API). Capture only, no Luna. Run once per arm (main 581a484, branch).
//   node probe-c1.browser.mjs --root <checkout> --tag <main|branch> --out <dir> --tileset <mountain-tile-set.mjs>
//        [--clearances 5000,3500,...] [--descent 1] [--width 1920 --height 1080]
// Target: the Maithea FROZEN_MASSIF_TILE_SET axis station whose sun elevation (page sun direction, fixed date) is the
// highest in [5, 15] deg (same station on both arms: frozen tile set, same date). View: side light (view azimuth = sun
// azimuth + 90 deg), camera pitched down PITCH deg, eye on the line of sight to the station, so a smaller clearance
// moves the eye down that line toward the station (the descent path). The heading is terrain-independent (pure sphere
// geometry), the eye is snapped radially by setPose(clearanceM) to each arm's own terrain. Stills are taken settled
// (surfaceReady and terrainPending 0), clouds hidden (render-only toggle). Then an optional real-time descent: 3 s of
// perf motion from the L11-ish still down toward the L13-ish clearance, a frame every 0.5 s.
const arg=(n,d)=>{const i=process.argv.indexOf('--'+n);return i>0&&process.argv[i+1]&&!process.argv[i+1].startsWith('--')?process.argv[i+1]:d;};
const MAIN=arg('root'),tag=arg('tag'),outDir=arg('out'),TILESET=arg('tileset');
if(!MAIN||!tag||!outDir||!TILESET)throw new Error('--root --tag --out --tileset required');
const ROOT='file:///'+MAIN.replace(/\\/g,'/')+'/';
const {chromium}=await import(ROOT+'node_modules/playwright/index.mjs');
const THREE=await import(ROOT+'node_modules/three/build/three.module.js');
const {startDistPreview,stopServer}=await import(ROOT+'tests/helpers/free-port.mjs');
const {acquireGpuLock}=await import(ROOT+'tests/helpers/gpu-lock.mjs');
const {encodeVersions,CURRENT_VERSIONS}=await import(ROOT+'src/time-nav.ts');
const {galaxies,refByAddress,system}=await import(ROOT+'src/catalog.ts');
const {directionTile,tileKey}=await import(ROOT+'src/planet-tiles.ts');
const {FROZEN_MASSIF_TILE_SET:FROZEN,FROZEN_MASSIF_TILE_SET_SOURCE}=await import('file:///'+TILESET.replace(/\\/g,'/'));
import {mkdir,writeFile} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
const W=+arg('width',1920),H=+arg('height',1080),PITCH=+arg('pitch',35);
const clearances=arg('clearances','6000,4200,3000,2100,1500,1050,750,520,360').split(',').map(Number);
const log=(...a)=>console.error(`[probe ${tag} ${new Date().toISOString().slice(11,19)}]`,...a);
const seed='LETHRA-001',galaxyId='G001',DATE=435084631200000032044300000n,name='Maithea',FIX=['G001/C2128,0,1/0',1];
const sys=system(refByAddress(galaxies(seed)[0],FIX[0])),body=sys.planets[FIX[1]],R=body.radiusM;
const V=d=>new THREE.Vector3(...d).normalize();
const toward=(u,t,m)=>u.clone().applyAxisAngle(new THREE.Vector3().crossVectors(u,t).normalize(),m/R).normalize();
const tangentTo=(u,p)=>{const t=p.clone().sub(u.clone().multiplyScalar(p.dot(u)));return t.normalize();};
await mkdir(outDir,{recursive:true});
const dist=MAIN+'/dist';
const server=await startDistPreview({root:MAIN,dist});
process.on('exit',()=>stopServer(server.child));
log('serving',server.build.commit,server.build.subject??'');
const report={tag,root:MAIN,build:server.build,tileSet:{path:TILESET,source:FROZEN_MASSIF_TILE_SET_SOURCE},viewport:[W,H],pitchDeg:PITCH,clearances,started:new Date().toISOString(),stills:[],descent:[]};
const lock=await acquireGpuLock({owner:`opus55 GATE-C1 probe ${tag}`,log,retryMs:5000});
let browser=null;
try{
  browser=await chromium.launch({headless:true,args:['--use-angle=d3d11','--enable-gpu','--force-device-scale-factor=1','--disable-renderer-backgrounding','--disable-background-timer-throttling','--disable-backgrounding-occluded-windows']});
  const context=await browser.newContext({viewport:{width:W,height:H},deviceScaleFactor:1});
  const page=await context.newPage();const errors=[];
  page.on('pageerror',e=>errors.push(`page: ${e.message}`));page.on('console',m=>{if(m.type()==='error')errors.push(`console: ${m.text()}`);});
  const url=`${server.base}?${new URLSearchParams({seed,g:galaxyId,system:sys.ref.id,body:body.id,date:DATE.toString(),wv:encodeVersions(CURRENT_VERSIONS)})}`;
  report.url=url;
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__atlas?.ready,null,{timeout:180000,polling:200});
  await page.waitForTimeout(4000);
  report.terrainVersion=await page.evaluate(()=>window.__atlas.versions?.terrain??null).catch(()=>null);
  report.versions=await page.evaluate(()=>window.__atlas.versions).catch(()=>null);
  const S=V(await page.evaluate(()=>{const {light,planet}=window.__atlas.renderDebug();const p=light.getWorldPosition(light.position.clone()),t=light.target.getWorldPosition(light.position.clone());
    planet.group.worldToLocal(p);planet.group.worldToLocal(t);const v=p.sub(t).normalize();return [v.x,v.y,v.z];}));
  report.sunDir=S.toArray();
  const elev=d=>Math.asin(Math.max(-1,Math.min(1,d.dot(S))))*180/Math.PI;
  const axis=(FROZEN[name]||[]).map((e,idx)=>({idx,kind:e.kind,v:V(e.d)})).filter(e=>e.kind==='axis').map(e=>({...e,e:elev(e.v)}));
  report.axisSunElevs=axis.map(a=>({idx:a.idx,e:+a.e.toFixed(3)}));
  const pick=axis.filter(a=>a.e>=5&&a.e<=15).sort((a,b)=>b.e-a.e||a.idx-b.idx)[0];
  if(!pick)throw new Error('no Maithea axis station lit at 5..15 deg');
  const t=pick.v,az=tangentTo(t,S),view=az.clone().applyAxisAngle(t,Math.PI/2);
  report.station={tileSetIndex:pick.idx,dir:t.toArray(),sunElevDeg:pick.e,viewAzimuthFromSunDeg:90};
  log('station',pick.idx,'sun elev',pick.e.toFixed(2));
  await page.evaluate(()=>window.__atlas.setSystemVisible('clouds',false));
  const p=PITCH*Math.PI/180;
  const poseFor=c=>{const d=c/Math.tan(p),q=toward(t,view.clone().negate(),d);
    const fwdH=tangentTo(q,t),f=fwdH.clone().multiplyScalar(Math.cos(p)).sub(q.clone().multiplyScalar(Math.sin(p)));
    const eye=q.clone().multiplyScalar(R),heading=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(eye,eye.clone().add(f),q)).toArray();
    return {position:eye.toArray(),heading,clearanceM:c,eyeDir:q.toArray(),horizontalM:d};};
  const levels=async()=>{const dg=await page.evaluate(()=>{const d=window.__atlas.renderDebug().planet.diagnostics();return {maxLevel:d.maxLevel,frontierMaxLevel:d.frontierMaxLevel,active:d.debug.activeTileIds};});
    let targetLevel=null;const set=new Set(dg.active);for(let L=24;L>=0;L--){if(set.has(tileKey(directionTile(t.toArray(),L)))){targetLevel=L;break;}}
    return {maxLevel:dg.maxLevel,frontierMaxLevel:dg.frontierMaxLevel,targetLevel};};
  const settle=async ms=>{const t0=Date.now();try{await page.waitForFunction(()=>{const b=window.__atlas.perfSample().backlog;return !!b&&b.surfaceReady&&b.terrainPending===0;},null,{timeout:ms,polling:250});return Date.now()-t0;}catch{return -1;}};
  for(const c of clearances){
    const pose=poseFor(c);let err=null;
    try{await page.evaluate(q=>window.__atlas.setPose(q.position,q.heading,q.clearanceM),pose);}catch(e){err=String(e.message||e);}
    await page.waitForTimeout(6000);const settledMs=err?-1:await settle(90000);await page.waitForTimeout(3000);
    const lv=await levels(),sample=await page.evaluate(()=>window.__atlas.perfSample()).catch(()=>null);
    const file=`${outDir}/maithea-c${c}-${tag}.png`;await page.screenshot({path:file});
    report.stills.push({clearanceM:c,file,settledMs,setPoseError:err,...lv,appClearanceM:sample?.clearanceM??null,pose});
    log('still',c,'m settled',settledMs,'ms levels',JSON.stringify(lv));
  }
  if(arg('descent','1')==='1'){
    // --descent-from/--descent-to fix the path across arms (taken from the first arm's stills); else picked here.
    // --descent-like <first arm's probe json> reuses that arm's descent plan (same path on both arms).
    const like=arg('descent-like')?JSON.parse(readFileSync(arg('descent-like'),'utf8')).descentPlan:null;
    if(arg('descent-like')&&!like)throw new Error('descent-like report has no descentPlan');
    const hi=like?{clearanceM:like.fromClearanceM}:report.stills.find(s=>s.targetLevel===11)??report.stills[Math.floor(clearances.length/2)];
    const lo=like?{clearanceM:like.toClearanceM}:[...report.stills].reverse().find(s=>s.targetLevel===13)??report.stills.at(-1);
    const pose=poseFor(hi.clearanceM);
    await page.evaluate(q=>window.__atlas.setPose(q.position,q.heading,q.clearanceM),pose);
    await page.waitForTimeout(4000);await settle(90000);await page.waitForTimeout(2000);
    // constant-rate descent from hi to lo clearance in 3 s (vertical at the eye point, heading fixed)
    const rate=(hi.clearanceM-lo.clearanceM)/3;
    report.descentPlan={fromClearanceM:hi.clearanceM,toClearanceM:lo.clearanceM,minDescentMps:rate,seconds:3};
    await page.evaluate(m=>window.__atlas.setPerfMotion(m),{clearanceM:lo.clearanceM,descentPerS:1e-6,minDescentMps:rate});
    const t0=Date.now();
    for(let k=0;k<=6;k++){const due=t0+k*500;const wait=due-Date.now();if(wait>0)await page.waitForTimeout(wait);
      const file=`${outDir}/maithea-descent-${String(k).padStart(2,'0')}-${tag}.png`;const ts=Date.now()-t0;await page.screenshot({path:file});
      const lv=await levels(),sample=await page.evaluate(()=>window.__atlas.perfSample()).catch(()=>null);
      report.descent.push({k,tMs:ts,file,...lv,appClearanceM:sample?.clearanceM??null,terrainPending:sample?.backlog?.terrainPending??null});}
    await page.evaluate(()=>window.__atlas.setPerfMotion(null));
  }
  report.errors=errors.slice(0,30);
  await context.close();
}finally{try{await browser?.close();}catch{}await lock.release();stopServer(server.child);}
report.finished=new Date().toISOString();
await writeFile(`${outDir}/probe-${tag}.json`,JSON.stringify(report,null,1));
log('done');process.exit(0);
