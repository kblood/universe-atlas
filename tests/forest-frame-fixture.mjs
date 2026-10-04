// Shared Node fixture for forest frame-cost work (not a test file itself).
// Bundles PlanetForest + PlanetCanopy with esbuild (optionally substituting a
// historical revision of selected source files), replaces both forest workers
// with in-process responders, freezes performance.now() within a frame so
// every time-sliced loop is count-bounded (deterministic), and drives the
// renderer's exact forest.update call over scripted poses at the perf
// harness's living inland site (SITE_A, LETHRA-001 planet 1, harness date).
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,basename} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {build} from 'esbuild';
import {HARNESS_DATE,SITE_A as HARNESS_SITE_A} from './harness-sites.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));
export const FOREST_DATE=HARNESS_DATE;
/** Harness SITE_A: the shared living inland site (tests/harness-sites.mjs). */
export const SITE_A=[...HARNESS_SITE_A];

export function gitSource(revision,path){
  try{return execFileSync('git',['show',`${revision}:${path}`],{cwd:root,encoding:'utf8',maxBuffer:16<<20,stdio:['ignore','pipe','ignore']});}
  catch{return null;}
}

/** Bundle the forest. `sources` maps repo-relative paths (e.g.
 * 'src/planet-forest.ts') to replacement contents; every other import
 * resolves to the working tree. */
export async function forestModule({prefix='atlas-forest-fixture-',sources={}}={}){
  const directory=await mkdtemp(join(tmpdir(),prefix)),output=join(directory,'forest.mjs');
  const replaced=new Map(Object.entries(sources).map(([path,contents])=>[resolve(root,path),contents]));
  const plugins=replaced.size?[{name:'forest-revision',setup(b){
    b.onLoad({filter:/\.ts$/},async args=>{const contents=replaced.get(resolve(args.path));return contents===undefined?undefined:{contents,loader:'ts',resolveDir:dirname(resolve(args.path))};});
  }}]:[];
  await build({bundle:true,platform:'node',format:'esm',outfile:output,logLevel:'silent',plugins,stdin:{resolveDir:root,sourcefile:'forest-fixture-entry.mjs',contents:`
    import * as THREE from 'three';
    export {THREE};
    export {PlanetForest} from './src/planet-forest.ts';
    export {PlanetCanopy} from './src/planet-canopy.ts';
    export {createForestCensus} from './src/forest-census.ts';
    export {forestPatchAddresses} from './src/forest-patch-selection.ts';
    export {ForestSelectionCache} from './src/forest-selection-cache.ts';
    export {packForestSelection} from './src/forest-selection-transfer.ts';
    export {PLANET_DETAIL} from './src/planet-detail.ts';
    export {terrainSampler} from './src/terrain.ts';
    export {galaxies,refByAddress,system} from './src/catalog.ts';
    export {parseAddress} from './src/address.ts';
    export {starLifecycle,planetLifecycle} from './src/stellar-evolution.ts';
    export {planetSnapshotAt} from './src/world-surface.ts';
    export {CURRENT_VERSIONS} from './src/time-nav.ts';
    export {TREE_ALLOMETRY_VERSION} from './src/tree-allometry.ts';
    export {SURFACE_SHADOW} from './src/surface-lighting.ts';
  `}});
  const module=await import(pathToFileURL(output).href);
  return {module,async cleanup(){
    const target=resolve(directory);
    if(dirname(target)!==resolve(tmpdir())||!basename(target).startsWith(prefix))throw new Error('refusing to remove '+target);
    await rm(target,{recursive:true,force:true});
  }};
}

const shared=globalThis.__atlasForestFixture??={census:new Map(),selection:new Map(),species:new Map(),ground:new Map()};

/** Body, dated species and snapped harness water level (computed once per process). */
export function world(m){
  if(shared.world)return shared.world;
  const seed='LETHRA-001',sys=m.system(m.refByAddress(m.galaxies(seed)[0],'G001/C2128,0,1/0')),body=sys.planets[1],star=sys.stars[0];
  const systemAddress=m.parseAddress(sys.ref.id),address=v=>({...systemAddress,slot:v.id.slice(sys.ref.id.length+1)});
  const starLife=m.starLifecycle(seed,address(star),star),life=m.planetLifecycle(seed,address(body),body,starLife);
  const snapshot=date=>m.planetSnapshotAt(seed,body.id,body,life,starLife,date,m.CURRENT_VERSIONS);
  const species=date=>{
    const key=String(date);
    if(!shared.species.has(key))shared.species.set(key,snapshot(date).biosphere().species.filter(s=>s.kind==='tree'));
    return shared.species.get(key);
  };
  const water=Math.round(snapshot(FOREST_DATE).ocean.renderWaterLevelM/25)*25;
  return shared.world={seed,body,species,water};
}

// Measured family references (docs/tree-families-2026-09-28.md), in the
// planet-forest-tree-assets.test.mjs fixture shape.
const REFERENCE={
  branching:{referenceHeightM:16,crownRadiusM:4.252,cardExtentM:1.299,trunkRadiusM:.308,skeletonRadiusM:5.34,skeletonHeightM:14.72,maxLeafOffsetM:1.3,variantScale:1.14,variantLeanFraction:.045,cardScaleMax:2.7},
  spire:{referenceHeightM:16,crownRadiusM:3.304,cardExtentM:1.299,trunkRadiusM:.312,skeletonRadiusM:4.1,skeletonHeightM:15.2,maxLeafOffsetM:1.3,variantScale:1.14,variantLeanFraction:.045,cardScaleMax:2.7},
};
/** Detailed-family loader with typed-array batches so a digest can hash
 * every submitted instance field (matrix, height, phase, variant, ratios,
 * appearance, coverage, seed). */
export function familyLoader(m){
  const batches=[];let next=0;
  const loader=async(_a,_b,received)=>{
    const kind=next++%2===0?'branching':'spire',R={version:m.TREE_ALLOMETRY_VERSION,...REFERENCE[kind]};
    const family={forestCoverage:received.forestCoverage,maxRadiusM:20,
      canopyPresentation:{enabled:true,lod1Profile:{referenceHeightM:16,maxLeafOffsetM:.5,
        bands:Array.from({length:4},(_,i)=>({centerM:[0,i*4+2,0],radiusM:2,halfHeightM:1.5,populated:true,count:4}))},
        conservativeBounds:{radiusM:20},barkLinearRgb:[.1,.08,.06],foliageLinearRgb:[.03,.08,.02],allometry:R,
        structuralVariants:received.structuralVariants,foliageProjectedAreaM2:[0,40,60,20],trunk:{heightM:14,baseRadiusM:.3,topRadiusM:.2}},
      setDate(){},
      createBatch(lod,capacity){
        const W=28,data=new Float64Array(capacity*W);
        const batch={lod,capacity,kind,group:new m.THREE.Group(),data,W,count:0,initialized:0,writes:0,
          setInstance(i,matrix,heightM,phase,variant=0,allometry={crownRatio:1,trunkRatio:1}){
            if(i>batch.initialized)throw new Error(`batch slot gap ${i}`);if(i===batch.initialized)batch.initialized++;
            batch.count=Math.max(batch.count,i+1);data.set(matrix.elements,i*W);data.set([heightM,phase,variant,allometry.crownRatio,allometry.trunkRatio],i*W+16);batch.writes++;},
          setAppearance(i,bark,foliage){data.set([...bark,...foliage],i*W+21);batch.writes++;},
          setCoverage(i,coverage,seed){if(data[i*W+27]!==coverage||data[i*W+20]!==seed+1){data[i*W+27]=coverage;data[i*W+20]=seed+1;batch.writes++;}},
          setCount(count){if(count>batch.initialized)throw new Error('batch count exceeds initialized slots');batch.count=count;},
          dispose(){batch.group.removeFromParent();}};
        batches.push(batch);return batch;
      },dispose(){}};
    return family;
  };
  return {loader,batches};
}

/** In-process stand-ins for planet-population-worker.ts and forest-census-worker.ts.
 * Replies are queued and delivered by `pump()` between frames. */
function installWorkers(m,{censusRangeM}){
  const queue=[];const workers=[];const stats={selectionReplies:[]};
  class InlineWorker{
    onmessage=null;onerror=null;onmessageerror=null;terminated=false;
    constructor(url){this.kind=String(url).includes('census')?'census':'population';this.census=null;workers.push(this);}
    postMessage(data){queue.push({worker:this,data});}
    terminate(){this.terminated=true;}
  }
  const reply=(worker,data)=>{if(!worker.terminated)worker.onmessage?.({data});};
  async function handle({worker,data}){
    if(worker.terminated)return;
    if(worker.kind==='population'){
      const key=JSON.stringify([data.seed,data.radiusM,data.direction]);
      let cells=shared.selection.get(key);
      if(!cells){
        shared.selectionCache??=new m.ForestSelectionCache(data.seed,data.radiusM,m.PLANET_DETAIL.forestCellM);
        cells=shared.selectionCache.select(data.direction,m.PLANET_DETAIL.forestFootprintM+100,m.PLANET_DETAIL.canopyFootprintM);
        shared.selection.set(key,cells);
      }
      const packed=m.packForestSelection(cells);
      const t0=process.hrtime.bigint();
      reply(worker,{requestId:data.requestId,direction:data.direction,packed,selectionMs:0,packMs:0,cache:null});
      stats.selectionReplies.push(Number(process.hrtime.bigint()-t0)/1e6);return;
    }
    if(data.type==='configure'){
      const cacheKey=String(data.waterLevelM);
      let census=shared.census.get(cacheKey);
      if(!census){census=await m.createForestCensus(data.body??worker.body,data.waterLevelM);shared.census.set(cacheKey,census);}
      if(data.body)worker.body=data.body;
      worker.census=census;worker.generation=data.generation;
      reply(worker,{type:'ready',generation:data.generation,context:census.context,family:census.family,n:census.n});return;
    }
    if(data.generation!==worker.generation)return;
    const census=worker.census;
    if(data.type==='select'){
      const addresses=m.forestPatchAddresses(data.center,worker.body.radiusM,Math.min(data.rangeM,censusRangeM));
      const packed=new Float64Array(addresses.length*4);addresses.forEach((a,i)=>packed.set([a.face,a.n,a.x,a.y],i*4));
      reply(worker,{type:'selection',generation:data.generation,requestId:data.requestId,context:census.context,packed,selectionMs:0});return;
    }
    if(data.type==='patches'){
      const results=[];
      for(const address of data.addresses){let r=census.start(address);while(!r)r=census.step(64);results.push(r);}
      for(let i=0;i<results.length||i===0;i+=8)
        reply(worker,{type:'patches',generation:data.generation,requestId:data.requestId,context:census.context,patches:results.slice(i,i+8),done:i+8>=results.length});
    }
  }
  return {InlineWorker,workers,stats,async pump(){
    for(let guard=0;queue.length&&guard<10000;guard++)await handle(queue.shift());
  }};
}

const add=(a,b,s)=>[a[0]+b[0]*s,a[1]+b[1]*s,a[2]+b[2]*s];
const norm=a=>{const l=Math.hypot(...a);return [a[0]/l,a[1]/l,a[2]/l];};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];

/** A scripted forest frame driver. Poses are
 * {eastM,northM,clearanceM,bearingDeg,pitchDeg,date?,water?,jitter?}. */
export async function createForestScene(m,{censusRangeM=1600,families=true}={}){
  const w=world(m),{body}=w,r=body.radiusM,THREE=m.THREE;
  const {InlineWorker,pump,stats}=installWorkers(m,{censusRangeM});
  const savedWorker=globalThis.Worker,savedNow=performance.now;
  let clock=1000;performance.now=()=>clock;globalThis.Worker=InlineWorker;
  const fam=familyLoader(m);
  const forest=new m.PlanetForest(body,fam.loader);
  if(families)await forest.loadTreeFamilies(['branching','spire'].map(kind=>({kind,lod0:new ArrayBuffer(8),lod1:new ArrayBuffer(8)})));
  const up0=SITE_A,ref=Math.abs(up0[1])>.92?[1,0,0]:[0,1,0],east0=norm(cross(ref,up0)),north0=norm(cross(up0,east0));
  const sampler=new Map();
  const ground=(water,direction)=>{
    if(!sampler.has(water))sampler.set(water,m.terrainSampler(body,undefined,undefined,undefined,water));
    return sampler.get(water)(direction).visibleHeightM;
  };
  const camera=new THREE.PerspectiveCamera(48,2560/1440,.02/r,1e7/r),shadowCamera=new THREE.OrthographicCamera();
  const shadowFrustum=new THREE.Frustum(),matrix=new THREE.Matrix4();
  const sun=norm([.3,.8,.52]);
  function frame(pose){
    const water=pose.water??w.water,date=pose.date??FOREST_DATE;
    const up=norm(add(add(up0,east0,(pose.eastM??0)/r),north0,(pose.northM??0)/r));
    const g=ground(water,up),clearance=pose.clearanceM??1.7;
    const eyeArray=up.map(v=>v*(1+(g+clearance)/r)),eye=new THREE.Vector3(...eyeArray);
    const east=norm(cross(ref,up)),bearing=(pose.bearingDeg??0)*Math.PI/180,pitch=(pose.pitchDeg??-6)*Math.PI/180;
    const forward=new THREE.Vector3(...east).applyAxisAngle(new THREE.Vector3(...up),bearing).normalize();
    const look=eye.clone().addScaledVector(forward,Math.cos(pitch)*100/r).addScaledVector(new THREE.Vector3(...up),Math.sin(pitch)*100/r);
    camera.position.copy(eye);camera.up.set(...up);camera.lookAt(look);camera.updateMatrixWorld(true);
    const frusta=[new THREE.Frustum().setFromProjectionMatrix(matrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse))];
    if(pose.jitter)for(const plane of frusta[0].planes)plane.constant+=pose.jitter;
    let shadow=null;
    if(clearance<700){
      const half=160/r;shadowCamera.left=-half;shadowCamera.right=half;shadowCamera.bottom=-half;shadowCamera.top=half;
      shadowCamera.near=.1/r;shadowCamera.far=1000/r;shadowCamera.updateProjectionMatrix();
      const center=new THREE.Vector3(...up).multiplyScalar(1+g/r);
      shadowCamera.position.copy(center).addScaledVector(new THREE.Vector3(...sun),500/r);shadowCamera.up.set(0,1,0);shadowCamera.lookAt(center);shadowCamera.updateMatrixWorld(true);
      shadow=shadowFrustum.setFromProjectionMatrix(matrix.multiplyMatrices(shadowCamera.projectionMatrix,shadowCamera.matrixWorldInverse));
    }
    const species=pose.speciesDrop?w.species(date).slice(0,-pose.speciesDrop):w.species(date);
    return {eye,groundDirection:up,altitudeM:clearance,water,date,frusta,shadow,species};
  }
  let frames=0;
  async function step(pose,{time}={}){
    const f=frame(pose);
    clock+=1000/60;frames++;
    let ms=0;
    if(time){const t0=process.hrtime.bigint();forest.update(f.eye,f.groundDirection,f.altitudeM,true,f.water,false,f.frusta,f.date,f.species,f.shadow);ms=Number(process.hrtime.bigint()-t0)/1e6;}
    else forest.update(f.eye,f.groundDirection,f.altitudeM,true,f.water,false,f.frusta,f.date,f.species,f.shadow);
    await pump();
    return ms;
  }
  /** Run still frames at `pose` until the forest selection, placement queue
   * and census window have settled (or `maxFrames`). */
  async function settle(pose,maxFrames=2000){
    let quiet=0;
    for(let i=0;i<maxFrames;i++){
      await step(pose);
      const d=forest.diagnostics(),c=d.fullCanopy;
      const busy=d.pending||d.selectionPending||!c||!c.ready||c.queuedPatches||c.jobsInFlight||c.selectionPending||c.selectionApplyPending||c.presentation.pending||c.rebasePending;
      quiet=busy?0:quiet+1;if(quiet>=3)return i+1;
    }
    return maxFrames;
  }
  return {forest,step,settle,frame,stats,batches:fam.batches,world:w,get frames(){return frames;},
    dispose(){forest.dispose();globalThis.Worker=savedWorker;performance.now=savedNow;}};
}

// ---- Digest -----------------------------------------------------------------
function hashWords(h,array,count){
  const view=new Uint32Array(array.buffer,array.byteOffset,Math.floor(Math.min(array.byteLength,count*array.BYTES_PER_ELEMENT)/4));
  for(let i=0;i<view.length;i++)h=Math.imul(h^view[i],0x01000193)>>>0;
  return h;
}
function hashText(h,text){for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),0x01000193)>>>0;return h;}
const unordered=ids=>{let sum=0,xor=0;for(const id of ids){const h=hashText(0x811c9dc5,id);sum=(sum+h)>>>0;xor^=h;}return `${sum.toString(16)}:${xor.toString(16)}`;};

/** Everything the forest frame produces for the GPU and for its own next
 * frame: legacy batches (slot order, every instance channel, update ranges,
 * count, visibility), detailed family pools and batch data, the far canopy's
 * ownership and static channels, retained hysteresis sets, and the
 * non-timing diagnostics. Timing fields are excluded. */
export function forestDigest(forest,batches,{detail=false}={}){
  const parts={};
  const attr=a=>{let h=hashWords(0x811c9dc5,a.array,a.array.length);return `${h.toString(16)}|${a.version}|${JSON.stringify(a.updateRanges)}`;};
  const meshes=[...forest.meshes,forest.canopy];
  parts.legacy=meshes.map((mesh,i)=>{
    const g=mesh.geometry;
    return [mesh.count,mesh.visible,forest.updates[i].residents.map(x=>x.cell.id).join(','),attr(mesh.instanceMatrix),attr(mesh.instanceColor),
      attr(g.getAttribute('instanceCoverage')),attr(g.getAttribute('instanceForestSeed')),attr(g.getAttribute('instanceTreeAllometry'))].join(' ');
  });
  parts.detailed=[...forest.assets.entries.values()].map(entry=>entry.pools.map((pool,lod)=>{
    const b=entry.batches[lod];
    return [entry.kind,lod,b.group.visible,b.count,pool.items.map(x=>x.cell.id).join(','),hashWords(0x811c9dc5,b.data,b.count*b.W).toString(16)].join(' ');
  }));
  const c=forest.fullCanopy;
  if(c){
    const rr=c.renderer,n=rr.mesh.geometry.instanceCount;
    parts.canopy=[c.group.visible,n,attr(rr.ownership),hashWords(0x811c9dc5,rr.positions.array,n*4).toString(16),hashWords(0x811c9dc5,rr.parameters.array,n*4).toString(16),
      JSON.stringify(rr.positions.updateRanges),JSON.stringify(rr.parameters.updateRanges)].join(' ');
    const cd=c.diagnostics();
    parts.canopyDiag=[cd.nearPresentNotInCensus,cd.nearAbsentInCensus,cd.farForcedClose,cd.installedThisFrame,cd.uploadBytes,cd.presentation.retagged,cd.trees,cd.patches].join(',');
  }
  parts.retained=[forest.retainedNear.size,unordered(forest.retainedNear),forest.retainedMiddle.size,unordered(forest.retainedMiddle)].join(' ');
  const d=forest.diagnostics();
  parts.diag=JSON.stringify([d.visible,d.near,d.cached,d.pending,d.farOwnedSkipped,d.matrixWrites,d.colorWrites,d.coverageWrites,d.scheduledUploadBytes,
    d.originVersion,d.originRebased,d.detailedTrees.visible,d.detailedTrees.allometry.near,d.detailedTrees.catalogueVersion,d.farCanonicalTrees,
    d.farWork.activeCells,d.farWork.skippedCells]);
  const text=Object.entries(parts).map(([k,v])=>`${k}=${JSON.stringify(v)}`).join('\n');
  const digest=hashText(0x811c9dc5,text).toString(16)+hashText(0x9747b28c,text).toString(16);
  return detail?{digest,parts}:digest;
}

/** Settle, still, turn, walk, sub-ulp frustum jitter, date and sea-level
 * changes, low flight across several reselections, the altitude-fade band,
 * hidden altitude, and a return to the ground. */
export function digestPoses(){
  const poses=[],push=(n,f)=>{for(let i=0;i<n;i++)poses.push(f(i));};
  const ground={clearanceM:1.7};
  push(30,()=>ground);
  push(60,i=>({...ground,bearingDeg:(i+1)*1.5}));
  push(10,()=>({...ground,bearingDeg:90}));
  push(60,i=>({...ground,bearingDeg:90,eastM:(i+1)*1.6/60}));
  push(10,i=>({...ground,bearingDeg:90,eastM:1.6,jitter:i%2?1e-13:-1e-13}));
  push(30,i=>({...ground,bearingDeg:90-i*3,eastM:1.6+i*.7}));
  // A later date, then a changed dated catalogue. This site's tree species are
  // stable over any plausible shift (checked +-100 Myr), so the catalogue change
  // is forced by presenting the dated list without its last species.
  push(10,()=>({...ground,eastM:22.6,date:FOREST_DATE+3n*1000000n*365n*86400n*1000000000n}));
  push(20,()=>({...ground,eastM:22.6,date:FOREST_DATE+3n*1000000n*365n*86400n*1000000000n,speciesDrop:1}));
  push(10,()=>({...ground,eastM:22.6}));
  // Sea level one bucket up: habitat refresh, census reconfigure.
  push(60,()=>({...ground,eastM:22.6,waterDelta:25}));
  push(20,()=>({...ground,eastM:22.6}));
  push(30,i=>({clearanceM:1.7+i*4,eastM:22.6,pitchDeg:-10}));
  push(180,i=>({clearanceM:120,pitchDeg:-10,eastM:22.6,northM:(i+1)*40/60}));
  push(40,i=>({clearanceM:120+i*85,pitchDeg:-25,eastM:22.6,northM:120}));
  push(20,()=>({clearanceM:3300,pitchDeg:-35,eastM:22.6,northM:120}));
  push(10,()=>({clearanceM:3700,pitchDeg:-35,eastM:22.6,northM:120}));
  push(10,()=>({clearanceM:6000,pitchDeg:-35,eastM:22.6,northM:120}));
  push(40,i=>({clearanceM:Math.max(1.7,3300-i*85),pitchDeg:-15,eastM:22.6,northM:120}));
  push(30,()=>({clearanceM:1.7,eastM:22.6,northM:120,bearingDeg:200}));
  return poses;
}

