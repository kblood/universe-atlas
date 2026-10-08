// Riser LOD step 5 (docs/mountain-riser-lod-2026-10-07.md section 5): copy of the strata step-8 probe
// (strata-datum docs/quiet-window-2026-10-07/gate-strata/step8/provenance/probe-strata.browser.mjs) plus EQUAL-LOD
// verification: with --match <probe json of the reference arm>, a still whose station targetLevel differs from the
// reference still at the same clearance is re-settled at the same pose (wait + settle) and its level re-read; the still
// is taken after that ONE re-settle (coordinator 2026-10-07); the final level and every attempt are recorded (lodMatch true/false).
// Original header:
// Strata stage 1, Addendum A step 8: GPU probe stills (+ optional descent) per arm, derived from
// docs/quiet-window-2026-10-07/gate-c1/step2/provenance/probe-c1.browser.mjs (same fixture seed/date, free-port preview,
// GPU lock, setPose/perfSample API, side light, pitch 35 deg, settle rule). Changes: any world (fixture map of
// scripts/luna-capture/capture-massif.browser.mjs), a station = FROZEN_MASSIF_TILE_SET entry chosen by a rule fixed
// before capture, file names carry the station label. Capture only.
//   node probe-strata.browser.mjs --root <checkout> --tag <main|branch|rockoff> --out <dir> --tileset <mountain-tile-set.mjs>
//        --world <Maithea|Selawyn|Raiva|Lethuris> --label <name> --candidates <idx,idx,...> --rule <axis|nearest10>
//        [--clearances ...] [--descent 1] [--descent-like <probe json>] [--width 1920 --height 1080]
// rule fixed (riser step 5) = the single given candidate, whatever its sun elevation (recorded).
// Rules (pre-registered in ../README.md before any frame): axis = among the candidates the highest sun elevation in
// [5, 15] deg (C1's rule); nearest10 = candidates in the given order, the first with sun elevation in [3, 40] deg.
const arg=(n,d)=>{const i=process.argv.indexOf('--'+n);return i>0&&process.argv[i+1]&&!process.argv[i+1].startsWith('--')?process.argv[i+1]:d;};
const MAIN=arg('root'),tag=arg('tag'),outDir=arg('out'),TILESET=arg('tileset'),name=arg('world'),label=arg('label'),rule=arg('rule');
const candidates=(arg('candidates')||'').split(',').filter(Boolean).map(Number);
if(!MAIN||!tag||!outDir||!TILESET||!name||!label||!rule||!candidates.length)throw new Error('--root --tag --out --tileset --world --label --candidates --rule required');
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
import {createHash} from 'node:crypto';
const W=+arg('width',1920),H=+arg('height',1080),PITCH=+arg('pitch',35);
const clearances=arg('clearances','6000,4200,3000,2100,1500,1050,750,520,360').split(',').map(Number);
const log=(...a)=>console.error(`[probe ${label} ${tag} ${new Date().toISOString().slice(11,19)}]`,...a);
const FIXTURE={Maithea:['G001/C2128,0,1/0',1],Selawyn:['G001/C2142,3,4/0',0],Raiva:['G001/C2143,4,3/0',1],Lethuris:['G001/C2142,6,1/1',1]};
const seed='LETHRA-001',galaxyId='G001',DATE=435084631200000032044300000n;
const sys=system(refByAddress(galaxies(seed)[0],FIXTURE[name][0])),body=sys.planets[FIXTURE[name][1]],R=body.radiusM;
const V=d=>new THREE.Vector3(...d).normalize();
const toward=(u,t,m)=>u.clone().applyAxisAngle(new THREE.Vector3().crossVectors(u,t).normalize(),m/R).normalize();
const tangentTo=(u,p)=>{const t=p.clone().sub(u.clone().multiplyScalar(p.dot(u)));return t.normalize();};
await mkdir(outDir,{recursive:true});
const server=await startDistPreview({root:MAIN,dist:MAIN+'/dist'});
process.on('exit',()=>stopServer(server.child));
log('serving',server.build.commit,server.build.subject??'');
const report={tag,label,world:name,rule,candidates,root:MAIN,build:server.build,tileSet:{path:TILESET,source:FROZEN_MASSIF_TILE_SET_SOURCE},viewport:[W,H],pitchDeg:PITCH,clearances,started:new Date().toISOString(),stills:[],descent:[]};
const lock=await acquireGpuLock({owner:`opus55 riser-lod step 5 probe ${label} ${tag}`,log,retryMs:5000});
const MATCH=arg('match')?JSON.parse(readFileSync(arg('match'),'utf8')):null;
report.match=arg('match')??null;
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
  report.versions=await page.evaluate(()=>window.__atlas.versions).catch(()=>null);
  const S=V(await page.evaluate(()=>{const {light,planet}=window.__atlas.renderDebug();const p=light.getWorldPosition(light.position.clone()),t=light.target.getWorldPosition(light.position.clone());
    planet.group.worldToLocal(p);planet.group.worldToLocal(t);const v=p.sub(t).normalize();return [v.x,v.y,v.z];}));
  report.sunDir=S.toArray();
  const elev=d=>Math.asin(Math.max(-1,Math.min(1,d.dot(S))))*180/Math.PI;
  const cands=candidates.map(idx=>{const e=FROZEN[name][idx];return {idx,kind:e.kind,v:V(e.d),e:elev(V(e.d))};});
  report.candidateSunElevs=cands.map(c=>({idx:c.idx,kind:c.kind,e:+c.e.toFixed(3)}));
  const pick=rule==='fixed'?cands[0]:rule==='axis'?cands.filter(a=>a.e>=5&&a.e<=15).sort((a,b)=>b.e-a.e||a.idx-b.idx)[0]:cands.find(a=>a.e>=3&&a.e<=40);
  if(!pick)throw new Error(`no ${name} candidate lit under rule ${rule}: ${JSON.stringify(report.candidateSunElevs)}`);
  const t=pick.v,az=tangentTo(t,S),view=az.clone().applyAxisAngle(t,Math.PI/2);
  report.station={tileSetIndex:pick.idx,kind:pick.kind,dir:t.toArray(),sunElevDeg:pick.e,viewAzimuthFromSunDeg:90};
  log('station',pick.idx,pick.kind,'sun elev',pick.e.toFixed(2));
  await page.evaluate(()=>window.__atlas.setSystemVisible('clouds',false));
  const p=PITCH*Math.PI/180;
  const poseFor=c=>{const d=c/Math.tan(p),q=toward(t,view.clone().negate(),d);
    const fwdH=tangentTo(q,t),f=fwdH.clone().multiplyScalar(Math.cos(p)).sub(q.clone().multiplyScalar(Math.sin(p)));
    const eye=q.clone().multiplyScalar(R),heading=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(eye,eye.clone().add(f),q)).toArray();
    return {position:eye.toArray(),heading,clearanceM:c,eyeDir:q.toArray(),horizontalM:d};};
  const levels=async()=>{const dg=await page.evaluate(()=>{const d=window.__atlas.renderDebug().planet.diagnostics();return {maxLevel:d.maxLevel,frontierMaxLevel:d.frontierMaxLevel,active:d.debug.activeTileIds};});
    let targetLevel=null;const set=new Set(dg.active);for(let L=24;L>=0;L--){if(set.has(tileKey(directionTile(t.toArray(),L)))){targetLevel=L;break;}}
    const hist={};for(const k of dg.active){const L=k.split('/')[1];hist[L]=(hist[L]??0)+1;}
    return {maxLevel:dg.maxLevel,frontierMaxLevel:dg.frontierMaxLevel,targetLevel,activeLevelHistogram:hist,activeSetSha:createHash('sha256').update([...dg.active].sort().join('|')).digest('hex').slice(0,16)};};
  const settle=async ms=>{const t0=Date.now();try{await page.waitForFunction(()=>{const b=window.__atlas.perfSample().backlog;return !!b&&b.surfaceReady&&b.terrainPending===0;},null,{timeout:ms,polling:250});return Date.now()-t0;}catch{return -1;}};
  for(const c of clearances){
    const pose=poseFor(c);let err=null;
    try{await page.evaluate(q=>window.__atlas.setPose(q.position,q.heading,q.clearanceM),pose);}catch(e){err=String(e.message||e);}
    await page.waitForTimeout(6000);const settledMs=err?-1:await settle(90000);await page.waitForTimeout(3000);
    let lv=await levels();const attempts=[];
    const want=MATCH?.stills.find(x=>x.clearanceM===c)?.targetLevel;
    for(let k=0;MATCH&&want!=null&&lv.targetLevel!==want&&k<1;k++){ // coordinator 2026-10-07: re-settle and re-capture ONCE
      attempts.push({attempt:k,targetLevel:lv.targetLevel});
      await page.waitForTimeout(6000);await settle(90000);await page.waitForTimeout(3000);lv=await levels();
    }
    const lodMatch=MATCH&&want!=null?lv.targetLevel===want:null;
    const sample=await page.evaluate(()=>window.__atlas.perfSample()).catch(()=>null);
    const file=`${outDir}/${label}-c${c}-${tag}.png`;await page.screenshot({path:file});
    report.stills.push({clearanceM:c,file,settledMs,setPoseError:err,...lv,referenceTargetLevel:want??null,lodMatch,lodAttempts:attempts,appClearanceM:sample?.clearanceM??null,pose});
    log('still',c,'m settled',settledMs,'ms levels',JSON.stringify(lv));
  }
  if(arg('descent','1')==='1'){
    const like=arg('descent-like')?JSON.parse(readFileSync(arg('descent-like'),'utf8')).descentPlan:null;
    if(arg('descent-like')&&!like)throw new Error('descent-like report has no descentPlan');
    const hi=like?{clearanceM:like.fromClearanceM}:report.stills.find(s=>s.targetLevel===11)??report.stills[Math.floor(clearances.length/2)];
    const lo=like?{clearanceM:like.toClearanceM}:[...report.stills].reverse().find(s=>s.targetLevel===13)??report.stills.at(-1);
    const pose=poseFor(hi.clearanceM);
    await page.evaluate(q=>window.__atlas.setPose(q.position,q.heading,q.clearanceM),pose);
    await page.waitForTimeout(4000);await settle(90000);await page.waitForTimeout(2000);
    const rate=(hi.clearanceM-lo.clearanceM)/3;
    report.descentPlan={fromClearanceM:hi.clearanceM,toClearanceM:lo.clearanceM,minDescentMps:rate,seconds:3};
    await page.evaluate(m=>window.__atlas.setPerfMotion(m),{clearanceM:lo.clearanceM,descentPerS:1e-6,minDescentMps:rate});
    const t0=Date.now();
    for(let k=0;k<=6;k++){const due=t0+k*500;const wait=due-Date.now();if(wait>0)await page.waitForTimeout(wait);
      const file=`${outDir}/${label}-descent-${String(k).padStart(2,'0')}-${tag}.png`;const ts=Date.now()-t0;await page.screenshot({path:file});
      const lv=await levels(),sample=await page.evaluate(()=>window.__atlas.perfSample()).catch(()=>null);
      report.descent.push({k,tMs:ts,file,...lv,appClearanceM:sample?.clearanceM??null,terrainPending:sample?.backlog?.terrainPending??null});}
    await page.evaluate(()=>window.__atlas.setPerfMotion(null));
  }
  report.errors=errors.slice(0,30);
  await context.close();
}finally{try{await browser?.close();}catch{}await lock.release();stopServer(server.child);}
report.finished=new Date().toISOString();
await writeFile(`${outDir}/probe-${label}-${tag}.json`,JSON.stringify(report,null,1));
log('done');process.exit(0);
