/** Runtime evidence for finder animals and vegetation from flight, never walking.
 * Results are visual/functional diagnostics; frame timings are contended. */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {acquireGpuLock} from './helpers/gpu-lock.mjs';
import {startDistPreview,stopServer} from './helpers/free-port.mjs';
import {samplePlanetFrameWindow,samplePlanetCpuWindow} from './helpers/planet-frame-window.mjs';
import * as THREE from 'three';
import {CURRENT_VERSIONS,MODEL_MANIFEST_ID,encodeVersions} from '../src/time-nav.ts';
const out=process.env.ATLAS_RESULTS||'test-results/habitat-near';
await mkdir(out,{recursive:true});
const server=process.env.ATLAS_URL?null:await startDistPreview({dist:process.env.ATLAS_DIST||'dist'});
const base=process.env.ATLAS_URL||server.base;
const routeURL=params=>{const query=new URLSearchParams(params);for(const [key,value] of new URLSearchParams(process.env.HABITAT_QUERY||''))query.set(key,value);return base+'?'+query;};
let lock,browser,page,phase='start';
const report={ok:false,base,contention:['HABITAT_GPU_WINDOW','HABITAT_CPU_WINDOW','HABITAT_BOTH_WINDOWS'].some(key=>process.env[key]==='1')?'serialized desktop GPU window; no concurrent project CPU job by coordination, external host activity not excluded':'contended host; no performance acceptance',errors:[],worlds:[]};
const replay=process.env.HABITAT_REPLAY?JSON.parse(await readFile(process.env.HABITAT_REPLAY,'utf8')):null;
const nearReplay=process.env.HABITAT_NEAR_FIXTURE?JSON.parse(await readFile(process.env.HABITAT_NEAR_FIXTURE,'utf8')):null;
const skipTiming=process.env.HABITAT_SKIP_TIMING==='1';
const save=()=>writeFile(out+'/report.json',JSON.stringify(report,null,2));
const wait=(fn,arg,timeout=180000)=>page.waitForFunction(fn,arg,{timeout});
const waitLodIdle=async()=>{if(process.env.HABITAT_REQUIRE_LOD_IDLE==='1'||process.env.HABITAT_EXPECT_DEFAULT_PRESENTATION==='1')await wait(()=>{const p=window.__atlas.renderDebug().planet;return p?.faunaLod&&!p.faunaLod.running&&!p.faunaLod.pending&&p.faunaLod.idle;},undefined,180000);};
const snapshot=()=>page.evaluate(()=>{
  const a=window.__atlas,d=a?.terrain?.tiles,t=a?.travel,debug=a?.renderDebug(),p=debug?.planet;
  const center=t?.bodies?.find(b=>b.id===a.state.body?.id)?.positionM;
  const bodyRelativeM=center?t.position.map((v,i)=>v-center[i]):null;
  const ids=d?.faunaDrawn?.map(x=>x.id)||[];
  const meshCounts={};
  if(p)for(const kind of ['flora','fauna','forestNear','forestMiddle','forestFar']){
    let meshes=0,instances=0;const seen=new Set();
    for(const root of p.profilingObjects(kind))root.traverse(o=>{if(!o.isMesh||seen.has(o))return;seen.add(o);if(o.visible){meshes++;instances+=o.isInstancedMesh?o.count:1;}});
    meshCounts[kind]={meshes,instances};
  }
  const floraRanges={under22:0,from22to34:0,from34to55:0,from55to120:0,from120to240:0,beyond240:0};
  const floraKinds={};
  if(p){
    const mat=new debug.camera.matrixWorld.constructor(),instance=new mat.constructor(),camera=debug.camera.getWorldPosition(debug.camera.position.clone());
    const clip=mat.clone().multiplyMatrices(debug.camera.projectionMatrix,debug.camera.matrixWorldInverse);
    const frustum=new p.faunaTraceFrustum.constructor().setFromProjectionMatrix(clip),seen=new Set();
    for(const root of p.profilingObjects('flora'))root.traverse(mesh=>{
      if(!mesh.isInstancedMesh||seen.has(mesh))return;seen.add(mesh);
      for(let parent=mesh;parent;parent=parent.parent)if(!parent.visible)return;
      if(!mesh.geometry.boundingSphere)mesh.geometry.computeBoundingSphere();
      const ordinal=p.floraRenderer.meshes.indexOf(mesh),kind=['tree','flower','grass','shrub'][Math.floor(ordinal/3)]??'other';
      const kinds=floraKinds[kind]??={...Object.fromEntries(Object.keys(floraRanges).map(k=>[k,0]))};
      for(let i=0;i<mesh.count;i++){
        if((mesh.geometry.getAttribute('floraFade')?.getX(i)??1)<=0)continue;
        mesh.getMatrixAt(i,instance);mat.multiplyMatrices(mesh.matrixWorld,instance);
        const sphere=mesh.geometry.boundingSphere.clone().applyMatrix4(mat);if(!frustum.intersectsSphere(sphere))continue;
        const distance=sphere.center.distanceTo(camera)/(t.systemUnit||1);
        const key=distance<22?'under22':distance<34?'from22to34':distance<55?'from34to55':distance<120?'from55to120':distance<240?'from120to240':'beyond240';
        floraRanges[key]++;kinds[key]++;
      }
    });
  }
  return {status:document.getElementById('status')?.textContent,travel:t,camera:a?.camera,
    body:a?.state?.body,date:a?.date,walking:t?.walking,landing:t?.landing,clearanceM:t?.surface?.terrainClearance,
    bodyRelativeM,heading:t?.heading,tiles:d,faunaTrace:ids.length?a.faunaTrace(ids):null,faunaLod:a?.faunaLodTrace?.()??null,faunaPresentation:a?.faunaPresentation??null,forestAssets:a?.forestAssets,meshCounts,floraRanges,floraKinds,
    cameraDraws:window.__habitatCameraDraws,
    frame:debug?{calls:debug.renderer.info.render.calls,triangles:debug.renderer.info.render.triangles}:null};
});
async function capture(label){phase=label;const state=await snapshot();await writeFile(out+'/'+label+'.json',JSON.stringify(state,null,2));
  if(process.env.HABITAT_RECORD_BODY_DIGESTS==='1'){
    state.bodyDigests=await page.evaluate(async()=>{const result=[];for(const [id,entry] of window.__atlas.renderDebug().planet.faunaNear.cache){
      const g=entry.geometry,arrays=['position','normal','color','skinIndex','skinWeight'].map(name=>g.attributes[name].array).concat([g.index.array]);
      const bytes=new Uint8Array(arrays.reduce((sum,a)=>sum+a.byteLength,0));let offset=0;for(const a of arrays){bytes.set(new Uint8Array(a.buffer,a.byteOffset,a.byteLength),offset);offset+=a.byteLength;}
      const hash=await crypto.subtle.digest('SHA-256',bytes);result.push({id,genome:entry.plan.genome,digest:[...new Uint8Array(hash)].map(v=>v.toString(16).padStart(2,'0')).join('')});
    }return result;});await writeFile(out+'/'+label+'.json',JSON.stringify(state,null,2));
  }
  await page.screenshot({path:out+'/'+label+'.png'});console.log(JSON.stringify({phase,body:state.body?.name,clearanceM:state.clearanceM,
    flora:state.tiles?.floraSubmittedCount,fauna:state.tiles?.faunaDrawn?.length,forest:state.tiles?.forest?.visible,meshes:state.meshCounts}));return state;}
const frameWindow=async()=>process.env.HABITAT_BOTH_WINDOWS==='1'?{externalGpu:await samplePlanetFrameWindow(page),native:await samplePlanetCpuWindow(page)}:process.env.HABITAT_CPU_WINDOW==='1'?samplePlanetCpuWindow(page):process.env.HABITAT_GPU_WINDOW==='1'?samplePlanetFrameWindow(page):page.evaluate(()=>new Promise(resolve=>{
  const intervals=[],longFrames=[];let previous=null,started=null,drain=2;
  function frame(){const now=performance.now();if(drain-->0){requestAnimationFrame(frame);return;}
    if(started===null){started=now;window.__atlas.setProfiling(true);window.__atlas.resetProfile();}
    if(previous!==null){const delta=now-previous;intervals.push(delta);if(delta>250)longFrames.push({deltaMs:delta,sample:window.__atlas.perfSample(),assets:window.__atlas.forestAssets});}previous=now;
    if(now-started<4000){requestAnimationFrame(frame);return;}
    intervals.sort((a,b)=>a-b);const profile=window.__atlas.renderProfile,sample=window.__atlas.perfSample(),assets=window.__atlas.forestAssets;
    window.__atlas.setProfiling(false);
    resolve({method:'2 drained frames then performance.now callback times; uncaptured 4s window',samples:intervals.length,
      p50Ms:intervals[Math.floor(intervals.length*.5)],p95Ms:intervals[Math.floor(intervals.length*.95)],maxMs:intervals.at(-1),longFrames,profile,sample,assets});
  }requestAnimationFrame(frame);
}));
async function observeDraws(){await page.evaluate(()=>{
  const debug=window.__atlas.renderDebug(),p=debug.planet,seen=new Set(),counts={flora:0,fauna:0,trees:0};
  const roots={flora:p.profilingObjects('flora'),fauna:p.profilingObjects('fauna'),
    // Far canopy keeps an empty sentinel draw: near/middle counts avoid
    // reporting that placeholder as an actual tree draw on open worlds.
    trees:['forestNear','forestMiddle'].flatMap(k=>p.profilingObjects(k))};
  for(const [kind,objects] of Object.entries(roots))for(const root of objects)root.traverse(object=>{
    if(!object.isMesh||seen.has(object))return;seen.add(object);const original=object.onAfterRender;
    object.onAfterRender=function(...args){original.apply(this,args);if(args[2]===debug.camera&&
      (object.isInstancedMesh?object.count>0:(object.geometry?.attributes?.position?.count||0)>0))counts[kind]++;};
  });window.__habitatCameraDraws=counts;
});}
try{
  lock=await acquireGpuLock({owner:'habitat-near flight-only evidence',capture:true,retryMs:30000});
  browser=await chromium.launch({headless:true,args:process.platform==='win32'?['--use-angle=d3d11','--enable-gpu']:['--enable-gpu']});
  page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
  page.on('pageerror',e=>report.errors.push(e.message));
  report.build=await fetch(new URL('build-info.json',base)).then(r=>r.json());
  if(process.env.HABITAT_EXPECT_DEFAULT_PRESENTATION==='1'){await page.goto(base);await wait(()=>window.__atlas?.faunaPresentation?.moduleStatus==='ready');report.ordinaryEntry={inputURL:base,presentation:await page.evaluate(()=>window.__atlas.faunaPresentation)};assert.equal(report.ordinaryEntry.presentation.lodMode,'float');assert.equal(report.ordinaryEntry.presentation.forestBarkSharing,true);assert.equal(report.ordinaryEntry.presentation.moduleError,null);}
  for(const index of (process.env.HABITAT_WORLD_INDICES||'0,1').split(',').map(Number)){
    phase='finder-'+index;
    const fixed=replay?.worlds.find(w=>w.index===index);
    const nearFixed=fixed??nearReplay?.worlds.find(w=>w.index===index);
    let finder;
    if(fixed){
      finder=fixed.finder;
      await page.goto(routeURL({seed:'LETHRA-001',g:'G001',system:fixed.bodyId.split('/planet/')[0],body:fixed.bodyId,date:fixed.date,wv:encodeVersions(CURRENT_VERSIONS),mv:MODEL_MANIFEST_ID}));
      await wait(id=>window.__atlas?.ready&&window.__atlas.state.body?.id===id&&window.__atlas.terrain?.tiles?.ready,fixed.bodyId);
      await page.evaluate(({pose,date})=>{const a=window.__atlas;a.setExplorationPaused(true);if(a.date.offsetNs!==date)a.seek(date);a.setPose(pose.p,pose.q,pose.clearance);},{pose:fixed.arrival,date:fixed.date});
    }else{
    await page.goto(routeURL({seed:'LETHRA-001',g:'G001'}));
    await wait(()=>window.__atlas?.ready&&window.__atlas.state.level==='galaxy');
    await page.locator('#find-animal-worlds').click();
    await wait(()=>document.querySelectorAll('[data-animal-world]').length===5);
    const rows=await page.locator('[data-animal-world]').evaluateAll(nodes=>nodes.map(n=>({id:n.dataset.animalWorld,text:n.textContent})));
    finder=rows[index];
    await page.locator('[data-animal-world]').nth(index).click();
    await wait(id=>window.__atlas?.ready&&window.__atlas.state.body?.id===id,rows[index].id);
    const requireForest=process.env.HABITAT_REQUIRE_FOREST==='1'&&index===1;
    if(process.env.HABITAT_REQUIRE_FOREST==='1')assert.match(finder.text,index===1?/forest-capable/:/open vegetation/);
    await page.locator(requireForest?'#find-forest':'#find-life').click();
    if(process.env.HABITAT_TRIAGE==='1')for(let tick=1;tick<=3;tick++){
      await page.waitForTimeout(5000);const state=await snapshot();await writeFile(out+`/route-${tick*5}s.json`,JSON.stringify(state,null,2));
      console.log(JSON.stringify({phase:'route-triage',seconds:tick*5,status:state.status,travel:state.travel,camera:state.camera}));
    }
    await wait(()=>{const a=window.__atlas,t=a?.travel;return !t?.walking&&!t?.landing&&!t?.surfaceJourney&&!t?.autopilot&&
      t?.terrainCruise!==null&&a?.terrain?.tiles?.surfaceReady&&t?.surface?.terrainClearance<=110;});
    }
    await observeDraws();
    await wait(()=>{const p=window.__atlas.renderDebug().planet,b=p?.backlog();return p?.surfaceReady&&b.lifePending===0&&b.faunaTerrainPending===0;},undefined,120000);
    await page.waitForTimeout(8000);
    await page.evaluate(()=>window.__atlas.setExplorationPaused(true));
    await waitLodIdle();
    const start=await capture(`world-${index}-arrival80`),r=start.body.radiusM;
    if(process.env.HABITAT_EXPECT_DEFAULT_PRESENTATION==='1'){assert.equal(start.faunaPresentation.lodMode,'float');assert.equal(start.faunaPresentation.forestBarkSharing,true);assert.equal(start.faunaPresentation.moduleStatus,'ready');assert.equal(start.faunaPresentation.moduleError,null);assert(start.faunaLod?.ownership.some(x=>x.tier.startsWith('lod')&&x.high>x.low),'ordinary URL actually draws derived animal skins');assert(start.faunaLod.lod.adapter.bindings>0);if(index===0)assert.equal(start.tiles.forest.allocatedBytes,0);if(index===1){assert.equal(start.tiles.forest.memoryAccounting.familyTextureCount,6);assert.equal(start.tiles.forest.barkTextures.entries,2);assert.equal(start.tiles.forest.barkTextures.leases,4);}}
    if(process.env.HABITAT_REQUIRE_FOREST==='1'&&index===1&&!fixed){
      assert.ok(start.tiles.forest.visible>0&&start.cameraDraws.trees>0,'Find forest habitat shows actual main-camera trees without landing');
    }
    const visible=new Set(start.faunaTrace?.individuals.filter(x=>x.cameraVisible&&x.drawnIndex!==null).map(x=>x.id));
    const target=nearFixed?.target??start.tiles.faunaDrawn.filter(x=>visible.has(x.id)).sort((a,b)=>
      (b.genome.torsoLength*b.genome.torsoWidth)-(a.genome.torsoLength*a.genome.torsoWidth))[0];
    assert.ok(target,'camera-visible canonical animal available for fixed near view');
    const world={index,finder,target,arrival:start,arrivalFrames:skipTiming||process.env.HABITAT_ROUTE_ONLY==='1'?null:await frameWindow(),views:[]};report.worlds.push(world);await save();
    if(nearFixed&&!fixed)await page.evaluate(date=>window.__atlas.seek(date),nearFixed.date);
    const at=new THREE.Vector3(...target.position).multiplyScalar(r),up=at.clone().normalize();
    const ref=Math.abs(up.y)>.92?new THREE.Vector3(1,0,0):new THREE.Vector3(0,1,0),tangent=new THREE.Vector3().crossVectors(ref,up).normalize();
    for(const clearance of process.env.HABITAT_ROUTE_ONLY==='1'?[]:[20,30]){
      const savedPose=nearFixed?.views.find(v=>v.clearance===clearance);
      const eye=savedPose?new THREE.Vector3(...savedPose.p):at.clone().addScaledVector(tangent,10).addScaledVector(up,clearance);
      const look=at.clone().addScaledVector(up,target.genome.legLength+target.genome.torsoHeight*.5);
      const heading=savedPose?new THREE.Quaternion(...savedPose.q):new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(eye,look,up));
      await page.evaluate(({p,q,h})=>window.__atlas.setPose(p,q,h),{p:eye.toArray(),q:heading.toArray(),h:clearance});
      await page.waitForTimeout(5000);
      await wait(()=>{const d=window.__atlas.terrain.tiles;return d.lifePending===0&&d.faunaTerrainPending===0;},undefined,120000);
      await waitLodIdle();
      const state=await capture(`world-${index}-animal-flight${clearance}`);
      assert.ok(!state.walking&&!state.landing,'near view remains flight-only');
      world.views.push({clearance,state,frames:skipTiming?null:await frameWindow()});await save();
    }
    if(process.env.HABITAT_SKIP_RANGE==='1')continue;
    const eye=new THREE.Vector3(...start.bodyRelativeM),rangeUp=eye.clone().normalize();
    const rangeRef=Math.abs(rangeUp.y)>.92?new THREE.Vector3(1,0,0):new THREE.Vector3(0,1,0);
    const rangeTangent=new THREE.Vector3().crossVectors(rangeRef,rangeUp).normalize();
    const rangeLook=eye.clone().addScaledVector(rangeTangent,200).addScaledVector(rangeUp,-50);
    const rangeHeading=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(eye,rangeLook,rangeUp));
    await page.evaluate(({p,q})=>window.__atlas.setPose(p,q,20),{p:eye.toArray(),q:rangeHeading.toArray()});
    await page.waitForTimeout(5000);await wait(()=>{const d=window.__atlas.terrain.tiles;return d.lifePending===0&&d.faunaTerrainPending===0;},undefined,120000);
    world.vegetationRange=await capture(`world-${index}-vegetation-range20`);
    world.rangeFrames=skipTiming||(process.env.HABITAT_ROUTE_ONLY==='1'&&index!==0)?null:await frameWindow();await save();
    if(process.env.HABITAT_EXPECT_EXTENDED_FLORA==='1'){
      const kinds=world.vegetationRange.floraKinds,far=(kinds.grass?.from55to120??0)+(kinds.flower?.from55to120??0);
      assert.ok(far>0&&world.vegetationRange.cameraDraws.flora>0,'fine flora beyond 55 m reaches the camera frustum and main render pass');
    }
  }
  assert.deepEqual(report.errors,[]);
  assert.deepEqual(await fetch(new URL('build-info.json',base)).then(r=>r.json()),report.build,'stable served build');
  report.ok=true;await save();
  await writeFile(out+'/replay.json',JSON.stringify({sourceBuild:report.build,worlds:report.worlds.map(w=>({index:w.index,finder:w.finder,
    bodyId:w.arrival.body.id,date:w.arrival.date.offsetNs,target:w.target,
    arrival:{p:w.arrival.bodyRelativeM,q:w.arrival.heading,clearance:80},
    views:w.views.map(v=>({clearance:v.clearance,p:v.state.bodyRelativeM,q:v.state.heading}))}))},null,2));
}catch(error){report.error=String(error);report.phase=phase;report.failure=page?await snapshot().catch(()=>null):null;await save();throw error;}
finally{await browser?.close().catch(()=>{});await lock?.release();if(server)await stopServer(server.child);}
