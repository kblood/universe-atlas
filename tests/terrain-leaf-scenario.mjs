// Scripted terrain poses for the leaf-loop digest test and the leaf-loop
// microbenchmark (docs/terrain-budget-2026-09-29.md). Not a test file.
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createRenderer,nextTurn,maithea} from './terrain-renderer-fixture.mjs';
import {terrainSampler} from '../src/terrain.ts';
import {loweredSeaLevels} from './helpers/harness-water.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));
/** A historical planet-renderer.ts from git, or null when the object is not
 * available (shallow clone, rewritten history). */
export function gitRendererSource(revision){
  try{return execFileSync('git',['show',`${revision}:src/planet-renderer.ts`],{cwd:root,encoding:'utf8',maxBuffer:16<<20,stdio:['ignore','pipe','ignore']});}
  catch{return null;}
}

const add=(a,b,s=1)=>[a[0]+b[0]*s,a[1]+b[1]*s,a[2]+b[2]*s];
const norm=a=>{const l=Math.hypot(...a);return [a[0]/l,a[1]/l,a[2]/l];};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];

/** The lowered sea the scenarios run at (relief round P6: was the literal
 * -4500 / -4475 m of the old metre ramp; now 60% of Maithea's ocean volume
 * lost on the relief seabed, -2425 / -2400 m; tests/helpers/harness-water.mjs). */
export const SEA=loweredSeaLevels(maithea());

/** Poses: `{direction, altitudeM, yawDeg, pitchDeg, water}` per frame. */
export function digestPoses(){
  const poses=[],d0=norm([1,.02,.01]);let direction=d0,altitudeM=8000,yawDeg=0,water=SEA.lowM;
  const push=(n,step=()=>{})=>{for(let i=0;i<n;i++){step(i);poses.push({direction,altitudeM,yawDeg,pitchDeg:-30,water});}};
  push(420);                                        // settle
  push(90,()=>{yawDeg+=1;});                        // turn 90 degrees
  push(120,()=>{direction=moveAlong(direction,yawDeg,60);}); // fast flight
  push(60,()=>{altitudeM-=5000/60;});               // descend into low flight
  push(80);                                         // hold
  push(1,()=>{water=SEA.highM;});push(220);             // stationary sea-level seek
  push(30,()=>{yawDeg-=1.5;});push(40);             // turn back, hold
  return poses;
}
export function benchPoses(){
  const poses=[],direction=norm([1,0,0]);let yawDeg=0;
  const push=(n,phase,step=()=>{})=>{for(let i=0;i<n;i++){step(i);poses.push({direction,altitudeM:2000,yawDeg,pitchDeg:-25,water:SEA.lowM,phase});}};
  push(900,'settle');
  push(400,'stationary');
  push(300,'turning',()=>{yawDeg+=.25;});
  return poses;
}
function tangentFrame(direction){
  const up=direction,ref=Math.abs(up[1])>.9?[1,0,0]:[0,1,0],east=norm(cross(ref,up)),north=cross(up,east);
  return {up,east,north};
}
function heading(direction,yawDeg){
  const {east,north}=tangentFrame(direction),y=yawDeg*Math.PI/180;
  return norm(add(north.map(v=>v*Math.cos(y)),east,Math.sin(y)));
}
function moveAlong(direction,yawDeg,metres){return norm(add(direction,heading(direction,yawDeg),metres/5194907.072465867));}

/** Runs `poses` and returns one digest per frame (plus the JSON of a frame on
 * request) and update() timings in ms. `deterministicClock` freezes
 * performance.now so selection time budgets can never break early. */
export async function runScenario(module,body,poses,{deterministicClock=true,detailFrames=new Set(),onFrame}={}){
  const {THREE}=module,fx=createRenderer(module,body),renderer=fx.renderer;
  const sample=terrainSampler(body,undefined,undefined,undefined,SEA.lowM);
  const camera=new THREE.PerspectiveCamera(65,16/9,1e-8,4);
  const savedNow=performance.now;
  const digests=[],details=new Map(),timings=[];
  try{
    for(let i=0;i<poses.length;i++){
      const pose=poses[i],ground=Math.max(SEA.lowM,sample(pose.direction).visibleHeightM);
      const eye=pose.direction.map(v=>v*(1+(ground+pose.altitudeM)/body.radiusM));
      const {up}=tangentFrame(pose.direction),forward=heading(pose.direction,pose.yawDeg),p=pose.pitchDeg*Math.PI/180;
      const look=add(forward.map(v=>v*Math.cos(p)),up,Math.sin(p));
      camera.position.set(...eye);camera.up.set(...up);camera.lookAt(...add(eye,look));camera.updateMatrixWorld(true);
      const frustum=new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
      const jobs=fx.jobs.length;
      if(deterministicClock)performance.now=()=>0;
      const started=savedNow.call(performance);
      renderer.update(eye,1080,65,1/60,false,[.6,.8,0],[frustum],undefined,null,pose.water);
      timings.push({phase:pose.phase,ms:savedNow.call(performance)-started});
      performance.now=savedNow;
      const state=frameState(renderer,fx.jobs.slice(jobs));
      const json=JSON.stringify(state);
      digests.push(createHash('sha256').update(json).digest('hex').slice(0,16));
      if(detailFrames.has(i))details.set(i,state);
      onFrame?.(i,renderer);
      await nextTurn();
    }
    return {digests,details,timings,final:renderer.diagnostics()};
  }finally{performance.now=savedNow;fx.dispose();}
}

/** Everything the leaf loop, eviction and admission produce for a frame. */
export function frameState(renderer,jobs){
  const q=v=>Number.isFinite(v)?Math.fround(v):String(v);
  const patches=[...renderer.patches.entries()].sort(([a],[b])=>a<b?-1:a>b?1:0).map(([key,p])=>[key,p.mesh.visible?1:0,p.ocean?(p.ocean.visible?1:0):-1,q(p.morph.value),p.edge.value.toArray().join(''),
    p.mesh.geometry.drawRange.count,p.detail.value,p.pbrDetail.value,p.localEye.value.toArray().map(q).join(','),p.waterBucket,p.touched,
    p.ocean?p.ocean.material.uniforms.oceanEyeM.value.toArray().map(q).join(',')+'@'+q(p.ocean.material.uniforms.oceanTime.value):'']);
  const d=renderer.diagnostics();
  return {leaves:[...renderer.leafIndex.keys()],active:[...renderer.active],pending:[...renderer.pending],jobs:jobs.map(j=>`${j.key}@${j.waterBucket}`),patches,
    residentBytes:renderer.residentBytes,surfaceReady:renderer.surfaceReady,groupVisible:renderer.group.visible,
    diag:[d.staleWaterPatches,d.underresolvedWaterTiles,d.frontierMaxLevel,d.maxLevel,d.skirtPatches,d.detailPatches,d.pbrDetailPatches,d.oceanDraws,d.vertices,d.terrainPressure,d.blockedAdmissions,d.blockedRefreshes]};
}

export function percentile(values,p){const s=[...values].sort((a,b)=>a-b);return s.length?s[Math.min(s.length-1,Math.floor(p*(s.length-1)+.5))]:NaN;}
