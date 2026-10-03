// Scripted life (fauna + understory flora) poses for the life digest test and
// the life CPU microbenchmark (docs/life-cpu-2026-09-29.md). Not a test file.
//
// Bundles PlanetRenderer with the life files taken either from the working
// tree or from a git revision, drives the real renderer through a fixed
// pose/date sequence at the harness's living inland site (SITE_A, DATE from
// tests/desktop-perf.browser.mjs), and digests every life output per frame:
// fauna instance matrices/colours/counts, the near-rig membership and bone
// palettes, flora instance matrices/counts, `faunaDrawn`, and the life
// diagnostics counters.
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,basename,relative} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {galaxies,refByAddress,system} from '../src/catalog.ts';
import {parseAddress} from '../src/address.ts';
import {starLifecycle,planetLifecycle} from '../src/stellar-evolution.ts';
import {planetSnapshotAt,planetAgeMyr,biosphereHistoryFor} from '../src/world-surface.ts';
import {CURRENT_VERSIONS} from '../src/time-nav.ts';
import {terrainSampler} from '../src/terrain.ts';
import {nextTurn} from './terrain-renderer-fixture.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));
/** Every file whose behaviour the life optimisation may change. */
import {LIFE_FILES} from './helpers/life-files.mjs';
export {LIFE_FILES} from './helpers/life-files.mjs';

export function gitSource(revision,path){
  try{return execFileSync('git',['show',`${revision}:${path}`],{cwd:root,encoding:'utf8',maxBuffer:16<<20,stdio:['ignore','pipe','ignore']});}
  catch{return null;}
}

/** Bundles the renderer; with `revision`, every LIFE_FILES entry that exists
 * at that revision replaces the working-tree file. `sharedSources` supplies
 * explicit source snapshots used identically by both comparison bundles; it
 * is for intentionally changed content models, never optimisation code.
 * Returns null when the revision is unavailable. */
export async function lifeRendererModule({prefix='atlas-life-',revision=null,patch={},sharedSources={}}={}){
  const replaced=new Map();
  if(revision){
    for(const path of LIFE_FILES){const s=gitSource(revision,path);if(s!==null)replaced.set(resolve(root,path),patch[path]?patch[path](s):s);}
    if(!replaced.size)return null;
  }
  for(const [path,source] of Object.entries(sharedSources))replaced.set(resolve(root,path),source);
  const directory=await mkdtemp(join(tmpdir(),prefix)),output=join(directory,'renderer.mjs');
  const plugins=[{name:'life-revision',setup(b){
    b.onLoad({filter:/\.ts$/},async args=>{const s=replaced.get(resolve(args.path));return s===undefined?undefined:{contents:s,loader:'ts',resolveDir:dirname(args.path)};});
  }}];
  await build({bundle:true,platform:'node',format:'esm',outfile:output,logLevel:'silent',plugins,stdin:{resolveDir:root,sourcefile:'life-fixture-entry.mjs',contents:`
    import * as THREE from 'three';
    import {buildTile,tileKey} from './src/planet-tiles.ts';
    import {PlanetRenderer} from './src/planet-renderer.ts';
    export {THREE,buildTile,tileKey,PlanetRenderer};
  `}});
  const module=await import(pathToFileURL(output).href);
  return {module,async cleanup(){
    const target=resolve(directory);
    if(dirname(target)!==resolve(tmpdir())||!basename(target).startsWith(prefix))throw new Error('refusing to remove '+target);
    await rm(target,{recursive:true,force:true});
  }};
}

// ---- Fixed content: the harness's living inland site and date -----------
export const seed='LETHRA-001';
const systemId='G001/C2128,0,1/0';
export const DATE=435084631200000032044300000n;
const sys=system(refByAddress(galaxies(seed)[0],systemId));
export const body=sys.planets[1];
const star=sys.stars[0],systemAddress=parseAddress(sys.ref.id);
const bodyAddress=value=>({...systemAddress,slot:value.id.slice(sys.ref.id.length+1)});
const starLc=starLifecycle(seed,bodyAddress(star),star),planetLc=planetLifecycle(seed,bodyAddress(body),body,starLc);
export const SITE_A=(()=>{const v=[4068880.8,-1511750.9,2855601.0],l=Math.hypot(...v);return v.map(x=>x/l);})();
const snapshotAt=t=>planetSnapshotAt(seed,body.id,body,planetLc,starLc,t,CURRENT_VERSIONS);
export const waterLevelAt=t=>snapshotAt(t).ocean.renderWaterLevelM;

/** main.ts `lifeGateContext` for this body at `t` (same construction). */
export function lifeContextAt(t){
  const snapshot=snapshotAt(t),st=snapshot.state;
  if(st.stage!=='molten'&&st.stage!=='solid')return null;
  const bio=snapshot.biosphere();
  const stage=['forming','sterile','microbial','complex'].includes(bio.stage)?bio.stage:'unformed';
  const kinds=new Set();for(const s of bio.species)if(s.kind==='tree'||s.kind==='shrub'||s.kind==='grass')kinds.add(s.kind);if(kinds.size)kinds.add('flower');
  const archetypes=new Set();for(const s of bio.species)if(s.creature)archetypes.add(s.creature.archetype);
  return {tMyr:planetAgeMyr(planetLc,t),floraStage:stage,floraAvailableKinds:[...kinds],treeSpecies:bio.species.filter(s=>s.kind==='tree'),
    faunaStage:stage,faunaAvailableArchetypes:[...archetypes],faunaSpecies:bio.species.filter(s=>!!s.creature).map(s=>({id:s.id,creature:s.creature})),
    rocks:st.stage==='solid'?{surfaceSolid:true,families:biosphereHistoryFor(seed,body.id,body,planetLc).rocks}:{surfaceSolid:false,families:[]}};
}

const add=(a,b,s=1)=>[a[0]+b[0]*s,a[1]+b[1]*s,a[2]+b[2]*s];
const norm=a=>{const l=Math.hypot(...a);return [a[0]/l,a[1]/l,a[2]/l];};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function tangentFrame(direction){
  const up=direction,ref=Math.abs(up[1])>.92?[1,0,0]:[0,1,0],east=norm(cross(ref,up)),north=cross(up,east);
  return {up,east,north};
}
function heading(direction,yawDeg){
  const {east,north}=tangentFrame(direction),y=yawDeg*Math.PI/180;
  return norm(add(north.map(v=>v*Math.cos(y)),east,Math.sin(y)));
}
function moveAlong(direction,yawDeg,metres){return norm(add(direction,heading(direction,yawDeg),metres/body.radiusM));}
const NS=1_000_000_000n,frameNs=s=>BigInt(Math.round(s*1e9));

/** Frames: `{direction, clearanceM, yawDeg, pitchDeg, dateNs, shadow, phase}`. */
export function digestPoses(){
  const poses=[];let direction=SITE_A,clearanceM=1.7,yawDeg=0,pitchDeg=-6,dateNs=DATE,shadow=true;
  const push=(n,phase,step=()=>{})=>{for(let i=0;i<n;i++){step(i);poses.push({direction,clearanceM,yawDeg,pitchDeg,dateNs,shadow,phase});}};
  push(12,'paused-still');
  push(40,'realtime-still',()=>{dateNs+=frameNs(1/60);});
  push(45,'realtime-turn',()=>{dateNs+=frameNs(1/60);yawDeg+=1.5;});
  push(20,'paused-turn',()=>{yawDeg+=2;});
  push(8,'paused-still-2');
  push(1,'seek+20s',()=>{dateNs+=20n*NS;});push(10,'paused-after-seek');
  push(40,'walk',()=>{dateNs+=frameNs(1/60);direction=moveAlong(direction,yawDeg,1.6/60);});
  push(20,'no-shadow',()=>{shadow=false;dateNs+=frameNs(1/60);yawDeg-=3;});
  push(1,'shadow-on',()=>{shadow=true;});
  push(60,'fast-flight',()=>{dateNs+=frameNs(1/60);clearanceM=40;pitchDeg=-15;direction=moveAlong(direction,yawDeg,30/60);});
  push(20,'paused-hover',()=>{});
  push(20,'paused-flight',()=>{direction=moveAlong(direction,yawDeg,30/60);});   // harness S3 flight: paused date, moving eye
  push(10,'climb-out',()=>{clearanceM+=60;});                          // crosses the 350 m life gate
  push(8,'high',()=>{dateNs+=frameNs(1/60);});
  push(10,'descend',()=>{clearanceM=Math.max(1.7,clearanceM-70);});
  push(30,'return-realtime',()=>{dateNs+=frameNs(1/60);yawDeg+=1;});
  push(5,'teleport-15km',()=>{clearanceM=15000;});                   // harness S6: setPose from the ground
  push(3,'teleport-ground',()=>{clearanceM=1.7;});
  push(30,'paused-walk',()=>{direction=moveAlong(direction,yawDeg,1.6/60);yawDeg+=.5;}); // harness S3 walk
  // tMyr is whole Myr: +1 Myr keeps the living species (no life-signature reset) but changes every flora scale.
  push(1,'seek+1Myr',()=>{dateNs+=1_000_000n*31_557_600n*NS;});push(6,'paused-after-Myr');
  push(1,'seek-back',()=>{dateNs=DATE+3n*NS;});push(15,'paused-end');
  return poses;
}
export function benchPoses(){
  const poses=[];let direction=SITE_A,yawDeg=0,dateNs=DATE;
  const push=(n,phase,step=()=>{},clearanceM=1.7,pitchDeg=-6)=>{for(let i=0;i<n;i++){step(i);poses.push({direction,clearanceM,yawDeg,pitchDeg,dateNs,shadow:true,phase});}};
  push(240,'paused');
  push(240,'realtime',()=>{dateNs+=frameNs(1/60);});
  push(240,'turn',()=>{dateNs+=frameNs(1/60);yawDeg+=1.5;});
  push(240,'walk',()=>{dateNs+=frameNs(1/60);direction=moveAlong(direction,yawDeg,1.6/60);});
  // Exploration-paused movement (the harness's S2 turn and S3 walk run at a paused date).
  push(240,'paused-turn',()=>{yawDeg+=1.5;});
  push(240,'paused-walk',()=>{direction=moveAlong(direction,yawDeg,1.6/60);});
  return poses;
}

const tileCache=globalThis.__atlasLifeTileCache??=new Map();
/** A renderer whose terrain Worker is an in-process builder (memoized per
 * tile and water level). Forest/canopy workers never answer: they do not
 * feed the life layer, and a tile answer would be garbage to them. */
function createRenderer(module,body){
  const {THREE,buildTile,PlanetRenderer}=module;
  const respond=({data,worker})=>{
    if(worker.terminated)return;
    const key=`${body.id}|${data.key}|${data.relief}|${data.waterLevelM??0}`;
    let result=tileCache.get(key);
    if(!result){result=buildTile(data.body,data.tile,data.relief,data.waterLevelM??0);tileCache.set(key,result);}
    worker.onmessage?.({data:{key:data.key,result,waterBucket:data.waterBucket}});
  };
  class InlineWorker{
    onmessage=null;onerror=null;terminated=false;
    postMessage(data){if(data&&data.tile&&data.body)queueMicrotask(()=>respond({data,worker:this}));}
    terminate(){this.terminated=true;}
  }
  const SavedWorker=globalThis.Worker;globalThis.Worker=InlineWorker;
  const nativeTextureLoad=THREE.TextureLoader.prototype.load;
  THREE.TextureLoader.prototype.load=function(_url,onLoad){
    const texture=new THREE.DataTexture(new Uint8Array([128,128,128,255]),1,1,THREE.RGBAFormat);
    texture.needsUpdate=true;onLoad?.(texture);return texture;
  };
  const host=new THREE.Mesh(new THREE.SphereGeometry(1,8,8),new THREE.MeshBasicMaterial());
  let renderer;
  try{renderer=new PlanetRenderer(body,host,body.radiusM,1,1);}
  finally{THREE.TextureLoader.prototype.load=nativeTextureLoad;}
  return {renderer,dispose(){renderer.dispose();host.geometry.dispose();host.material.dispose();globalThis.Worker=SavedWorker;}};
}

/** One camera + optional shadow frustum per pose (module-local THREE). */
function frame(THREE,pose,sample,camera){
  const ground=Math.max(-1e9,sample(pose.direction).visibleHeightM);
  const eye=pose.direction.map(v=>v*(1+(ground+pose.clearanceM)/body.radiusM));
  const {up}=tangentFrame(pose.direction),forward=heading(pose.direction,pose.yawDeg),p=pose.pitchDeg*Math.PI/180;
  const look=add(forward.map(v=>v*Math.cos(p)),up,Math.sin(p));
  camera.position.set(...eye);camera.up.set(...up);camera.lookAt(...add(eye,look));camera.updateMatrixWorld(true);
  const frustum=new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
  let shadow=null;
  if(pose.shadow){
    // A sun-aligned orthographic box around the eye, like the app's CSM-less shadow camera.
    const r=body.radiusM,s=new THREE.OrthographicCamera(-400/r,400/r,400/r,-400/r,0,2000/r);
    const sun=norm([.35,.8,.2]);s.position.set(...add(eye,sun,1000/r));s.up.set(...up);s.lookAt(...eye);s.updateMatrixWorld(true);s.updateProjectionMatrix();
    shadow=new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(s.projectionMatrix,s.matrixWorldInverse));
  }
  return {eye,frustum,shadow};
}

/** Settles life at the first pose: queue drained, herd stencils complete. */
function settleLife(renderer,update){
  for(let i=0;i<4000&&(renderer.lifeQueueIndex<renderer.lifeQueue.length||renderer.faunaGroundQueue.length);i++){renderer.processLifeQueue();}
  update();
}

const f32=v=>Math.fround(v);
/** Every life output of the frame, as JSON-stable data. */
export function lifeState(renderer){
  const hex=(a,n)=>Buffer.from(a.buffer,a.byteOffset,n*a.BYTES_PER_ELEMENT).toString('base64');
  const fauna=renderer.faunaRenderer,faunaMeshes=fauna.group.children.filter(m=>m.isInstancedMesh).map(m=>[m.name,m.count,m.visible?1:0,hex(m.instanceMatrix.array,m.count*16),m.instanceColor?hex(m.instanceColor.array,m.count*3):'']);
  const flora=renderer.floraRenderer.meshes.map(m=>[m.count,m.visible?1:0,hex(m.instanceMatrix.array,m.count*16)]);
  const near=renderer.faunaNear.group.children.filter(m=>m.visible).map(m=>[m.name,m.matrix.elements.map(f32).join(','),m.skeleton.bones.map(b=>b.matrixWorld.elements.map(f32).join(',')).join(';'),m.geometry.name]);
  const d=renderer.diagnostics();
  return {faunaMeshes,flora,near,nearIds:d.faunaNear.activeMembers.map(m=>`${m.id}:${m.poseState}:${m.phase}`),
    faunaGroup:[fauna.group.visible?1:0,...fauna.group.position.toArray().map(f32)],floraGroup:[renderer.floraGroup.visible?1:0,...renderer.floraGroup.position.toArray().map(f32)],
    faunaDrawn:d.faunaDrawn.map(x=>`${x.id}|${x.cell}|${x.position.join(',')}|${x.genome?.archetype}`),
    counts:[d.faunaCulledCount,d.faunaBudgetDrops,d.faunaRigCount,d.floraSlotCount,d.floraPresentCount,d.floraSurvivorCount,d.floraSubmittedCount,d.faunaAnchorCount,d.lifePending,d.lifeResidentCells,d.faunaTerrainPending,
      renderer.faunaVisibleCount,renderer.faunaCameraVisibleCount,d.lifePackBuilds,d.floraRecipeBuilds],
    backlog:(()=>{const b=renderer.backlog();return [b.floraSubmitted,b.faunaVisible,b.faunaNearRigs];})()};
}

/** Runs `poses` through `module`'s renderer; returns per-frame digests and,
 * on request, frame states. `deterministicClock` freezes performance.now so
 * time-sliced queues and rig builds cannot depend on host speed. */
export async function runLifeScenario(module,poses,{deterministicClock=true,detailFrames=new Set(),lifeOnly=false,onFrame}={}){
  const {THREE}=module,fx=createRenderer(module,body),renderer=fx.renderer;
  const water=waterLevelAt(poses[0].dateNs),sample=terrainSampler(body,undefined,undefined,undefined,Math.round(water/25)*25);
  const camera=new THREE.PerspectiveCamera(48,16/9,1e-9,4);
  const savedNow=performance.now;const contexts=new Map();
  const context=t=>{const key=t/(1_000_000n*NS);let c=contexts.get(key);if(!c){c=lifeContextAt(t);contexts.set(key,c);}return c;};
  const digests=[],details=new Map(),timings=[],hidden=[];
  const stats={maxDrawn:0,maxRigs:0,maxFlora:0,hiddenFrames:0,packBuilds:0};
  const run=(pose)=>{
    const {eye,frustum,shadow}=frame(THREE,pose,sample,camera);
    const life=context(pose.dateNs);
    if(lifeOnly){
      // Microbenchmark path: only the life layer, as update() calls it.
      renderer.lifeContext=life;
      const e=new THREE.Vector3(...eye),focus=e.clone().normalize().multiplyScalar(1+sample(pose.direction).groundHeightM/body.radiusM);
      renderer.updateLife(e,focus,frustum,pose.dateNs,shadow);
    }else renderer.update(eye,1080,48,1/60,false,[.35,.8,.2],[frustum],pose.dateNs,life,water,shadow);
  };
  try{
    if(deterministicClock)performance.now=()=>0;
    run(poses[0]);settleLife(renderer,()=>run(poses[0]));
    performance.now=savedNow;
    for(let i=0;i<poses.length;i++){
      if(deterministicClock)performance.now=()=>0;
      const started=savedNow.call(performance);
      run(poses[i]);
      timings.push({phase:poses[i].phase,ms:savedNow.call(performance)-started,fauna:renderer.drawFaunaMs,flora:renderer.drawFloraMs,life:renderer.lifeMs});
      performance.now=savedNow;
      if(!onFrame||onFrame(i,renderer)!==false){
        const state=lifeState(renderer),json=JSON.stringify(state);
        stats.maxDrawn=Math.max(stats.maxDrawn,state.faunaDrawn.length);stats.maxRigs=Math.max(stats.maxRigs,state.near.length);
        stats.maxFlora=Math.max(stats.maxFlora,state.counts[6]);stats.packBuilds=state.counts[13];
        if(poses[i].clearanceM>=400){stats.hiddenFrames++;hidden.push({i,floraCounts:state.counts.slice(4,7),floraMeshInstances:state.flora.reduce((n,m)=>n+m[0],0),backlog:state.backlog,faunaDrawn:state.faunaDrawn.length});}
        digests.push(createHash('sha256').update(json).digest('hex').slice(0,16));
        if(detailFrames.has(i))details.set(i,state);
      }
      if(!lifeOnly)await nextTurn();
    }
    return {digests,details,timings,stats,hidden,final:renderer.diagnostics()};
  }finally{performance.now=savedNow;fx.dispose();}
}
export function percentile(values,p){const s=[...values].sort((a,b)=>a-b);return s.length?s[Math.min(s.length-1,Math.floor(p*(s.length-1)+.5))]:NaN;}
export {relative};
