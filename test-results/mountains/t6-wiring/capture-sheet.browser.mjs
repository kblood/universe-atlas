// Mountains T6 wiring sheet (2026-10-06): verbatim copy of test-results/mountains/assembly/capture-sheet.browser.mjs (the
// round 2 standard sheet), changes: the checkout root is --root (default main), owner label. Run once per checkout
// (main 9dcb1cf and the T6 branch) so the two sheets are an A/B pair at the same poses rule (the picks follow each
// checkout's own truth field). Evidence script, not part of the app.
// Derived from finish-round-2026-10-04/INT/sheets/capture-sheets.browser.mjs and P4-RELIEF r3 captures.
// Serves the committed main build (dist/) with vite preview on port 5289 (--strictPort), holds the
// machine-wide GPU lock, boots the body view (no ?walk= landing), reads the page's sun direction, then
// places sun-aware hover poses with __atlas.setPose:
//   orbit (3.2 R over the sub-solar side), lowland (equatorial lowland |lat|<15, 30-500 m, eye 120 m
//   2 km away), forest (mid-latitude 25-55 deg forestPotential, eye 80 m 1.5 km away), mountain (highest
//   lit land, eye 400 m over the ground 8 km away on its sun side), beach (Coastal sand with ocean 1.5 km
//   away, eye 2.5 km inland at 120 m), polar (|lat|>62 land, eye 200 m 3 km away), seabed (approach:
//   600 m above a lit 2.5-4.5 km-deep seabed, pitched down at a point 2.5 km ahead).
//   node <this> --tag final --out <dir> [--bodies Maithea,Lethuris,Raiva,Selawyn] [--views ...]
const MAIN=(process.argv.find((a,i,all)=>all[i-1]==='--root'))||'C:/LLM/IWSDK/universe-atlas';
const ROOT='file:///'+MAIN+'/';
const {chromium}=await import(ROOT+'node_modules/playwright/index.mjs');
const THREE=await import(ROOT+'node_modules/three/build/three.module.js');
import {spawn} from 'node:child_process';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
const {acquireGpuLock}=await import(ROOT+'tests/helpers/gpu-lock.mjs');
const {encodeVersions,CURRENT_VERSIONS}=await import(ROOT+'src/time-nav.ts');
const {galaxies,refByAddress,system}=await import(ROOT+'src/catalog.ts');
const {terrainSampler}=await import(ROOT+'src/terrain.ts');
const {biomeClassifier}=await import(ROOT+'src/surface-biomes.ts');

const args=Object.fromEntries(process.argv.slice(2).reduce((o,a,i,all)=>{if(a.startsWith('--'))o.push([a.slice(2),all[i+1]&&!all[i+1].startsWith('--')?all[i+1]:'1']);return o;},[]));
const port=Number(args.port||5299),dist=args.dist||MAIN+'/dist',tag=args.tag||'final',outDir=args.out;
const log=(...a)=>console.error(`[gate ${tag} ${new Date().toISOString().slice(11,19)}]`,...a);
const seed='LETHRA-001',galaxyId='G001',DATE=435084631200000032044300000n;
const g0=galaxies(seed)[0];
const FIXTURE={Maithea:['G001/C2128,0,1/0',1],Selawyn:['G001/C2142,3,4/0',0],Raiva:['G001/C2143,4,3/0',1],Lethuris:['G001/C2142,6,1/1',1]};
const wanted=(args.bodies||'Maithea,Lethuris,Raiva,Selawyn').split(',');
const lookPose=(eye,target,up)=>new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(eye,target,up)).toArray();
const fib=(i,n)=>{const y=1-2*(i+.5)/n,phi=i*2.399963229728653,r=Math.sqrt(1-y*y);return [Math.cos(phi)*r,y,Math.sin(phi)*r];};

function posesFor(body,S){
  const ts=terrainSampler(body),cls=biomeClassifier(body),R=body.radiusM,s=new THREE.Vector3(...S).normalize();
  const V=d=>new THREE.Vector3(...d),h=d=>ts(d.toArray()).groundHeightM,isOcean=d=>ts(d.toArray()).ocean;
  const elev=d=>Math.asin(Math.max(-1,Math.min(1,d.dot(s))))*180/Math.PI;
  const sunAz=u=>{const t=s.clone().sub(u.clone().multiplyScalar(s.dot(u)));return t.lengthSq()<1e-9?new THREE.Vector3(1,0,0):t.normalize();};
  const toward=(u,t,km)=>u.clone().applyAxisAngle(new THREE.Vector3().crossVectors(u,t).normalize(),km*1000/R).normalize();
  const rot=(u,t,a)=>t.clone().applyAxisAngle(u,a);
  const at=(dir,clear)=>dir.clone().multiplyScalar(R+Math.max(0,h(dir))+clear);
  const tgt=(dir,dh=0)=>dir.clone().multiplyScalar(R+Math.max(0,h(dir))+dh);
  const los=(ed,eh,td,th)=>{for(let k=1;k<20;k++){const t=k/20,q=ed.clone().lerp(td,t).normalize();if(Math.max(0,h(q))>eh+(th-eh)*t-10)return false;}return true;};
  /** Eye `km` from `dir` on its sun side (sun behind the camera), trying azimuth offsets. */
  const sunSide=(dir,kms,clear,dh)=>{const az=sunAz(dir),th=Math.max(0,h(dir))+dh;
    for(const off of [0,25,-25,50,-50,75,-75])for(const km of kms){const q=toward(dir,rot(dir,az,off*Math.PI/180),km);
      if(!los(q,Math.max(0,h(q))+clear,dir,th))continue;const e=at(q,clear);
      return {position:e.toArray(),heading:lookPose(e,tgt(dir,dh),q),clearanceM:clear,eyeDir:q.toArray(),offDeg:off,km};}
    const q=toward(dir,az,kms[0]),e=at(q,clear);return {position:e.toArray(),heading:lookPose(e,tgt(dir,dh),q),clearanceM:clear,eyeDir:q.toArray(),offDeg:0,km:kms[0],losBlocked:true};};
  const N=40000,land=[];let peak=null,peakH=-Infinity,deep=null,deepScore=-Infinity,polarLit=null,polarAny=null;
  for(let i=0;i<N;i++){const d=V(fib(i,N)),e=elev(d),lat=Math.asin(d.y)*180/Math.PI,sm=ts(d.toArray()),g=sm.groundHeightM;
    if(sm.ocean){if(e>25&&g<-2500&&g>-4500&&e>deepScore){deepScore=e;deep=d;}continue;}
    if(Math.abs(lat)>62){if(!polarAny)polarAny=d;if(e>3&&(!polarLit||e>polarLit.e))polarLit={d,e};}
    if(e<25)continue;
    if(Math.abs(lat)<53&&g>peakH){peakH=g;peak=d;}
    land.push({d,g,lat,e});}
  const picks={},poses={};
  const orbitEye=s.clone().multiplyScalar(3.2*R),orbitUp=Math.abs(s.y)>.9?new THREE.Vector3(1,0,0):new THREE.Vector3(0,1,0);
  poses.orbit={position:orbitEye.toArray(),heading:lookPose(orbitEye,new THREE.Vector3(),orbitUp),clearanceM:null};
  // lowland: equatorial, 30-500 m, not snow, prefer highest sun.
  const low=land.filter(p=>Math.abs(p.lat)<15&&p.g>30&&p.g<500).sort((a,b)=>b.e-a.e);
  for(const p of low){const c=cls(p.d.toArray(),p.g,1);if(c.name==='Alpine / polar snow')continue;const r=sunSide(p.d,[2,3],120,0);if(r.losBlocked)continue;poses.lowland=r;picks.lowland={dir:p.d.toArray(),groundM:p.g,lat:p.lat,sunElevDeg:p.e,class:c.name};break;}
  // forest: mid-latitude forestPotential with forest at 1.5 km all round.
  const mid=land.filter(p=>Math.abs(p.lat)>=25&&Math.abs(p.lat)<=55).sort((a,b)=>b.e-a.e);
  for(const p of mid){const c=cls(p.d.toArray(),p.g,1);if(!(c.forestPotential&&(c.forestSuitability01??1)>.6))continue;
    let ok=true;for(let k=0;k<8&&ok;k++){const q=toward(p.d,rot(p.d,sunAz(p.d),k*Math.PI/4),1.5);if(isOcean(q)||!cls(q.toArray(),h(q),1).forestPotential)ok=false;}if(!ok)continue;
    const r=sunSide(p.d,[1.5,2],80,0);poses.forest=r;picks.forest={dir:p.d.toArray(),groundM:p.g,lat:p.lat,sunElevDeg:p.e,class:c.name,suitability:c.forestSuitability01};break;}
  // mountain: highest lit land (|lat|<53).
  // v2 (after Luna's v1 FAILs: the v1 eye sat on the summit's own plateau, so the range read as flat):
  // the eye stands on ground at least 55% of the summit height lower, 18-45 km away on the sun side,
  // 300 m clearance, with a clear line of sight to the upper third of the summit.
  // The fib grid is coarse (about 40-160 km spacing), so climb to the real local summit first.
  if(peak){for(const radius of [80,20,5]){const base=peak.clone(),t0=sunAz(base);for(let k=0;k<500;k++){const q=toward(base,rot(base,t0,k*2.399963229728653),radius*Math.sqrt((k+.5)/500)),hq=h(q);if(hq>peakH){peakH=hq;peak=q;}}}}
  // v3: the steepest lit range instead of the highest point: for the 400 highest lit land samples (|lat|<53),
  // refine to the local summit, then find the lowest dry ground 8-20 km away with a clear line of sight to
  // the summit; take the site with the largest summit-minus-eye drop (visible relief).
  {const top=land.filter(p=>Math.abs(p.lat)<53).sort((a,b)=>b.g-a.g).slice(0,400);let bestV3=null;
    for(const p0 of top.filter((_,i)=>i%4===0)){let pk=p0.d,pH=p0.g;for(const radius of [25,6]){const base=pk.clone(),t0=sunAz(base);for(let k=0;k<160;k++){const q=toward(base,rot(base,t0,k*2.399963229728653),radius*Math.sqrt((k+.5)/160)),hq=h(q);if(hq>pH){pH=hq;pk=q;}}}
      const az=sunAz(pk);
      for(const off of [0,30,-30,60,-60,90,-90])for(const km of [8,11,14,17,20]){const q=toward(pk,rot(pk,az,off*Math.PI/180),km),hq=h(q);if(isOcean(q))continue;const drop=pH-hq;
        if(bestV3&&drop<=bestV3.drop)continue;if(!los(q,Math.max(0,hq)+250,pk,pH-50))continue;bestV3={pk,pH,q,hq,drop,off,km};}}
    if(bestV3){const {pk,pH,q,hq,drop,off,km}=bestV3,e=at(q,250),aim=pk.clone().multiplyScalar(R+hq+drop*.55);
      poses.mountainV3={position:e.toArray(),heading:lookPose(e,aim,q),clearanceM:250};
      picks.mountainV3={dir:pk.toArray(),groundM:pH,sunElevDeg:elev(pk),class:cls(pk.toArray(),pH,1).name,eyeDir:q.toArray(),eyeGroundM:hq,dropM:drop,offDeg:off,km,pose:'v3'};}}
  if(peak){const az=sunAz(peak);let best=null;const st={ocean:0,high:0,los:0};
    search: for(const off of [0,20,-20,40,-40,60,-60,80,-80,100,-100,120,-120,150,-150,180])for(const km of [18,22,26,30,36,45,55,70]){const q=toward(peak,rot(peak,az,off*Math.PI/180),km),hq=h(q);
      if(isOcean(q)){st.ocean++;continue;}if(hq>peakH-1500){st.high++;continue;}if(!los(q,Math.max(0,hq)+300,peak,peakH-50)){st.los++;continue;}best={q,hq,off,km};break search;}
    picks.mountainSearch=st;
    if(best){const e=at(best.q,300),aim=peak.clone().multiplyScalar(R+peakH*.6);poses.mountain={position:e.toArray(),heading:lookPose(e,aim,best.q),clearanceM:300};
      picks.mountain={dir:peak.toArray(),groundM:peakH,sunElevDeg:elev(peak),class:cls(peak.toArray(),peakH,1).name,eyeDir:best.q.toArray(),eyeGroundM:best.hq,offDeg:best.off,km:best.km,pose:'v2'};}
    else{const r=sunSide(peak,[8,10,14],400,-300);poses.mountain=r;picks.mountain={dir:peak.toArray(),groundM:peakH,sunElevDeg:elev(peak),pose:'v1-fallback'};}}
  // beach: Coastal sand with ocean within 1.5 km.
  let beachFallback=null;
  for(const p of [...land].sort((a,b)=>b.e-a.e)){const c=cls(p.d.toArray(),p.g,1);if(c.name!=='Coastal sand')continue;
    let sea=null,seaKm=0;for(const km of [1,2,3]){for(let k=0;k<16;k++){const br=k*Math.PI/8,q=toward(p.d,rot(p.d,sunAz(p.d),br),km);if(isOcean(q)){sea=br;seaKm=km;break;}}if(sea!==null)break;}if(sea===null)continue;
    const az=rot(p.d,sunAz(p.d),sea),inland=toward(p.d,az.clone().negate(),2),edge=toward(p.d,az,seaKm*.5),e=at(inland,150);
    const pose={position:e.toArray(),heading:lookPose(e,tgt(edge),inland),clearanceM:150},pick={dir:p.d.toArray(),groundM:p.g,lat:p.lat,sunElevDeg:p.e,seaKm};
    if(!los(inland,Math.max(0,h(inland))+150,edge,0)){beachFallback??={pose,pick:{...pick,losBlocked:true}};continue;}
    poses.beach=pose;picks.beach=pick;break;}
  if(!poses.beach&&beachFallback){poses.beach=beachFallback.pose;picks.beach=beachFallback.pick;}
  // polar: land above 62 deg latitude, sunlit if any.
  const pol=polarLit?.d??polarAny;
  if(pol){const r=sunSide(pol,[3,5],200,0);poses.polar=r;picks.polar={dir:pol.toArray(),groundM:h(pol),lat:Math.asin(pol.y)*180/Math.PI,sunElevDeg:elev(pol),lit:!!polarLit,class:cls(pol.toArray(),h(pol),1).name};}
  // seabed approach: 600 m above a lit 2.5-4.5 km deep seabed, looking at the floor 2.5 km ahead.
  if(deep){const g=h(deep),eye=deep.clone().multiplyScalar(R+g+600),ahead=toward(deep,sunAz(deep),2.5),target=ahead.clone().multiplyScalar(R+h(ahead));
    poses.seabed={position:eye.toArray(),heading:lookPose(eye,target,deep),clearanceM:null};picks.seabed={dir:deep.toArray(),groundM:g,eyeM:g+600,sunElevDeg:deepScore};}
  return {picks,poses};
}

// --dry <report.json>: Node only, recompute the picks from the sun directions a previous run recorded.
if(args.dry){const rep=JSON.parse(await readFile(args.dry,'utf8'));for(const name of wanted){const [addr,i]=FIXTURE[name],body=system(refByAddress(g0,addr)).planets[i],sun=rep.bodies[name]?.sunDir;if(!sun)continue;
  const {picks}=posesFor(body,sun);console.log(name,JSON.stringify(args.views?Object.fromEntries(args.views.split(',').map(v=>[v,picks[v]])):picks));}process.exit(0);}
const base=`http://127.0.0.1:${port}/`;
const preview=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port',String(port),'--strictPort','--outDir',dist],{cwd:MAIN,stdio:['ignore','pipe','pipe']});
let previewLog='';preview.stdout.on('data',d=>previewLog+=d);preview.stderr.on('data',d=>previewLog+=d);
process.on('exit',()=>{try{preview.kill();}catch{}});
const expected=JSON.parse(await readFile(dist+'/build-info.json','utf8'));
let served=null;
for(let i=0;i<60&&!served;i++){try{const r=await fetch(base+'build-info.json');const info=await r.json();if(info.builtAt===expected.builtAt)served=info;else throw new Error('other');}catch{await new Promise(r=>setTimeout(r,500));}}
if(!served){preview.kill();throw new Error(`preview on ${port} does not serve ${dist}:\n${previewLog}`);}
log('serving',served.commit,served.subject);
const report={tag,dist,build:served,bodies:{},started:new Date().toISOString()};
await mkdir(outDir,{recursive:true});
const lock=await acquireGpuLock({owner:`opus55 mountains T6 wiring sheet ${wanted.join(',')} port ${port}`,log,retryMs:30000});
let browser=null;
try{
  browser=await chromium.launch({headless:true,args:['--use-angle=d3d11','--enable-gpu','--force-device-scale-factor=1','--disable-renderer-backgrounding','--disable-background-timer-throttling','--disable-backgrounding-occluded-windows']});
  for(const name of wanted){
    const [addr,i]=FIXTURE[name],sys=system(refByAddress(g0,addr)),body=sys.planets[i];
    const context=await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1});
    const page=await context.newPage();const errors=[];
    page.on('pageerror',e=>errors.push(`page: ${e.message}`));page.on('console',m=>{if(m.type()==='error')errors.push(`console: ${m.text()}`);});
    const url=`${base}?${new URLSearchParams({seed,g:galaxyId,system:sys.ref.id,body:body.id,date:DATE.toString(),wv:encodeVersions(CURRENT_VERSIONS)})}`;
    const row={bodyId:body.id,radiusM:body.radiusM,url,build:served.commit,shots:{}};
    try{
      await page.goto(url,{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>window.__atlas?.ready,null,{timeout:180000,polling:200});
      await page.waitForTimeout(4000);
      row.sunDir=await page.evaluate(()=>{const {light,planet}=window.__atlas.renderDebug();const p=light.getWorldPosition(light.position.clone()),t=light.target.getWorldPosition(light.position.clone());
        planet.group.worldToLocal(p);planet.group.worldToLocal(t);const v=p.sub(t).normalize();return [v.x,v.y,v.z];});
      const plan=posesFor(body,row.sunDir);row.picks=plan.picks;row.poses=plan.poses;
      log(name,'views',Object.keys(plan.poses).join(','));
      for(const [view,pose] of Object.entries(plan.poses).filter(([v])=>!args.views||args.views.split(',').includes(v))){
        const t0=Date.now();let ok=true,err=null;
        try{await page.evaluate(p=>window.__atlas.setPose(p.position,p.heading,p.clearanceM??undefined),pose);}catch(e){ok=false;err=String(e.message||e);}
        let settledMs=-1;
        if(ok&&view!=='orbit')await page.waitForTimeout(6000);
        if(ok){try{await page.waitForFunction(()=>{const b=window.__atlas.perfSample().backlog;return !!b&&b.surfaceReady&&b.terrainPending===0;},null,{timeout:view==='orbit'?25000:90000,polling:250});settledMs=Date.now()-t0;}catch{settledMs=-1;}}
        await page.waitForTimeout(3000);
        const file=`${outDir}/${name.toLowerCase()}-${view}-${tag}.png`;await page.screenshot({path:file});
        row.shots[view]={file,settledMs,setPoseError:err,backlog:await page.evaluate(()=>window.__atlas.perfSample().backlog).catch(()=>null)};
        // --noclouds: also the same frame with the cloud layer hidden (render-only debug toggle; labelled in the file name).
        if(args.noclouds||(args['noclouds-views']||'').split(',').includes(view)){try{await page.evaluate(()=>window.__atlas.setSystemVisible('clouds',false));await page.waitForTimeout(2000);
          const f2=`${outDir}/${name.toLowerCase()}-${view}-noclouds-${tag}.png`;await page.screenshot({path:f2});row.shots[view].noClouds=f2;}finally{await page.evaluate(()=>window.__atlas.setSystemVisible('clouds',true)).catch(()=>{});}}
        log(name,view,'settled',settledMs,'ms',err??'');
      }
    }catch(e){row.error=String(e.message||e);log(name,'ERROR',row.error);}
    row.errors=errors.slice(0,20);report.bodies[name]=row;
    await context.close();
  }
}finally{try{await browser?.close();}catch{}await lock.release();preview.kill();}
report.finished=new Date().toISOString();
await writeFile(`${outDir}/capture-${tag}-${wanted.join('-')}.json`,JSON.stringify(report,null,1));
log('done');process.exit(0);
