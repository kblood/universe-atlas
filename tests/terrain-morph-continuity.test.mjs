// Terrain LOD morph continuity (audit F1, docs/transition-audit-2026-10-07.md;
// docs/terrain-morph-continuity-2026-10.md). Rendering only.
//
// Drives the real PlanetRenderer leaf loop (in-process tile builder, fixed
// dt = 1/60 s) through settle -> descent (splits) -> sea-level seek (every
// resident leaf is rebuilt) -> climb (merges), once with
// PlanetRendererOptions.presentationContinuity on and once off, and checks the
// DRAWN surface frame by frame:
// - every drawn vertex of a patch that stays drawn moves at most
//   k * dh * dt / 0.22 per frame, dh = |position - parentPosition| of that
//   vertex, k = 1.5 (smoothstep's peak slope) inside a patch and 3 on an edge
//   (the edge blend is the product of two eased morphs, fractional locks);
// - a rebuilt resident patch inherits the morph of the patch it replaces and
//   its vertices move no more than the rebuilt data itself moved;
// - where the drawn tile under a fixed ground direction changes (a split or a
//   merge), the surface jumps by no more than the coarser tile's own
//   parent-to-grandparent difference there (its morph amplitude);
// - a merge is a reverse morph: the four children leave the frontier at
//   morph 0 and the parent enters at morph 1;
// - the morph is eased: its first and last step are small (C1 ends);
// - the CPU replica (`renderedGroundHeightM`) equals the shader formula
//   (patchMorphVertex, transliterated below and pinned to the GLSL text).
// Each check has its negative: with the option off the former steps
// (re-morph on rebuild, regrowth from the grandparent, linear ramp, 0/1 edge
// flips) must be reported, and a replica with the former 0/1 lock rule must
// disagree with the shader on fractional edges.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {rendererModule,maithea} from './terrain-renderer-fixture.mjs';
import {runScenario,SEA} from './terrain-leaf-scenario.mjs';
import {patchMorphVertex} from '../src/terrain-shadow.ts';
import {directionCoordinates,PATCH_SEGMENTS} from '../src/planet-tiles.ts';

const DT=1/60,MORPH_S=.22,STEP=DT/MORPH_S;
const K_INTERIOR=1.5,K_EDGE=3;
/** Absolute tolerance (m): float32 tile-relative positions and the ray/plane intersection. */
const TOL_M=.01;

const norm=a=>{const l=Math.hypot(...a);return a.map(v=>v/l);};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];

/** One fixed site (the leaf-loop digest's Maithea direction), looking 60 deg
 * down so the ground below the eye stays in view from 6000 m to 600 m. */
const SITE=norm([1,.02,.01]);
function morphPoses(){
  const poses=[];let altitudeM=6000,water=SEA.lowM;
  const push=(n,step=()=>{})=>{for(let i=0;i<n;i++){step(i);poses.push({direction:SITE,altitudeM,yawDeg:0,pitchDeg:-60,water});}};
  push(240);                                     // settle
  push(150,()=>{altitudeM-=5400/150;});          // descend 6000 -> 600 m: splits
  push(60);                                      // hold
  push(1,()=>{water=SEA.highM;});push(150);      // sea-level seek: resident leaves are rebuilt
  push(150,()=>{altitudeM+=19400/150;});         // climb 600 -> 20000 m: merges
  push(120);                                     // hold
  return poses;
}
/** Fixed ground directions around the nadir: 9 x 9, 0..400 m ahead, +-200 m across. */
function sampleDirections(R){
  const up=SITE,ref=Math.abs(up[1])>.9?[1,0,0]:[0,1,0],east=norm(cross(ref,up)),north=cross(up,east),out=[];
  for(let f=0;f<=400;f+=50)for(let l=-200;l<=200;l+=50)out.push(norm(up.map((v,i)=>v+north[i]*f/R+east[i]*l/R)));
  return out;
}

// ---- The shader formula (patchMorphVertex), transliterated. ----
// GLSL (terrain-shadow.ts; byte-identical in the ocean shell):
//   gridUV=(uv*(patchTexels+2.0)-1.0)/patchTexels;
//   lockEdge=max(max((1-step(.00001,gx))*E.x, step(.99999,gx)*E.y), max((1-step(.00001,gy))*E.z, step(.99999,gy)*E.w));
//   patchBlend=patchMorph*(1.0-lockEdge); transformed=mix(parentPosition,position,patchBlend);
const PATCH_MORPH_GLSL=`vec2 gridUV=(uv*(patchTexels+2.0)-1.0)/patchTexels;
float lockEdge=max(max((1.0-step(.00001,gridUV.x))*patchEdges.x,step(.99999,gridUV.x)*patchEdges.y),max((1.0-step(.00001,gridUV.y))*patchEdges.z,step(.99999,gridUV.y)*patchEdges.w));
float patchBlend=patchMorph*(1.0-lockEdge);
vec3 transformed=mix(parentPosition,position,patchBlend);`;
const glslStep=(edge,x)=>x<edge?0:1;
function shaderBlend(data,j,morph,E){
  const texels=data.width-2,gx=(data.uvs[2*j]*(texels+2)-1)/texels,gy=(data.uvs[2*j+1]*(texels+2)-1)/texels;
  const lockEdge=Math.max(Math.max((1-glslStep(.00001,gx))*E[0],glslStep(.99999,gx)*E[1]),Math.max((1-glslStep(.00001,gy))*E[2],glslStep(.99999,gy)*E[3]));
  return {blend:morph*(1-lockEdge),edge:gx<.00001||gx>=.99999||gy<.00001||gy>=.99999};
}
/** The former CPU rule (0/1 locks): a negative control for the replica check. */
function steppedBlend(data,j,morph,E){
  const n=PATCH_SEGMENTS,x=j%(n+1),y=Math.floor(j/(n+1));
  const lock=(x===0&&E[0]>0)||(x===n&&E[1]>0)||(y===0&&E[2]>0)||(y===n&&E[3]>0);
  return {blend:lock?0:morph,edge:lock};
}
const mix=(a,b,t)=>a*(1-t)+b*t;
function drawnVertex(data,j,blend){
  const o=3*j;return [0,1,2].map(k=>data.anchor[k]+mix(data.parents[o+k],data.positions[o+k],blend));
}
/** Drawn height (m) of patch `p` along unit direction `d`, through the index
 * buffer's triangle, with `blendOf(data,j)` as the per-vertex morph weight. */
function drawnHeight(p,d,R,blendOf){
  const t=p.tile,n=PATCH_SEGMENTS,{u,v}=directionCoordinates(d),cells=2**t.level;
  const gx=Math.max(0,Math.min(n,((u+1)*.5*cells-t.x)*n)),gy=Math.max(0,Math.min(n,((v+1)*.5*cells-t.y)*n));
  const ix=Math.min(n-1,Math.floor(gx)),iy=Math.min(n-1,Math.floor(gy)),c=6*(iy*n+ix),idx=p.data.indices;
  const tri=gx-ix>=gy-iy?[idx[c],idx[c+1],idx[c+2]]:[idx[c+3],idx[c+4],idx[c+5]];
  const [w0,w1,w2]=tri.map(j=>drawnVertex(p.data,j,blendOf(p.data,j)));
  const N=cross(w1.map((x,i)=>x-w0[i]),w2.map((x,i)=>x-w0[i]));
  return (dot(N,w0)/dot(N,d)-1)*R;
}
const shaderHeight=(p,d,R,morph,E)=>drawnHeight(p,d,R,(data,j)=>shaderBlend(data,j,morph,E).blend);

/** Online checks over one run; returns the violations and what was exercised. */
function analyzer(R){
  const v={vertex:[],replace:[],jump:[],mergeEntry:[],ease:[],replica:[]};
  const stats={frames:0,splitEvents:0,mergeEvents:0,reverseFrames:0,replacements:0,fractionalEdgeFrames:0,
    sampleSplits:0,sampleMerges:0,sampleUnpaired:0,steppedReplicaDiffers:0,checkedVertexFrames:0,maxMergeJumpM:0,maxSplitJumpM:0,maxLevelMismatchM:0};
  const samples=sampleDirections(R);
  let prev=null;
  return {v,stats,frame(i,renderer){
    // Nothing is drawn before the tile set replaces the orbital preview.
    if(!renderer.surfaceReady){prev=null;return;}
    stats.frames++;
    const patches=renderer.patches,drawn=new Map(),morphs=new Map();
    for(const key of renderer.leafIndex.keys()){const p=patches.get(key);if(p)morphs.set(key,{p,morph:p.morph.value});}
    let fractional=false;
    for(const key of renderer.active){
      const p=patches.get(key),edges=p.edge.value.toArray();
      if(edges.some(e=>e>0&&e<1))fractional=true;
      drawn.set(key,{p,morph:p.morph.value,edges});
    }
    if(fractional)stats.fractionalEdgeFrames++;
    if(renderer.reverseMerges?.size)stats.reverseFrames++;
    // Keep each sample's patch object: a merged child's patch may be released
    // in the merge frame, but its data stays on the object for the comparison.
    const heights=samples.map(d=>{const r=renderer.renderedGroundHeightM(d);return r&&{...r,p:patches.get(r.tile)};});
    // Replica == shader formula (and the former 0/1 rule as a control).
    heights.forEach((r,s)=>{
      if(!r)return;
      const p=patches.get(r.tile),E=p.edge.value.toArray(),js=shaderHeight(p,samples[s],R,p.morph.value,E);
      if(!(Math.abs(js-r.heightM)<=1e-3))v.replica.push({frame:i,tile:r.tile,replica:r.heightM,shader:js});
      const stepped=drawnHeight(p,samples[s],R,(data,j)=>steppedBlend(data,j,p.morph.value,E).blend);
      if(Math.abs(stepped-js)>1e-3)stats.steppedReplicaDiffers++;
    });
    if(prev){
      // Vertices of patches drawn in both frames.
      for(const [key,cur] of drawn){
        const old=prev.drawn.get(key);if(!old)continue;
        const n=(PATCH_SEGMENTS+1)**2;
        if(old.p===cur.p){
          if(old.morph===cur.morph&&old.edges.every((e,k)=>e===cur.edges[k]))continue;
          stats.checkedVertexFrames++;
          const data=cur.p.data;
          for(let j=0;j<n;j++){
            const a=shaderBlend(data,j,old.morph,old.edges),b=shaderBlend(data,j,cur.morph,cur.edges);
            const o=3*j,amp=Math.hypot(data.positions[o]-data.parents[o],data.positions[o+1]-data.parents[o+1],data.positions[o+2]-data.parents[o+2])*R;
            const moved=Math.abs(b.blend-a.blend)*amp,limit=(b.edge||a.edge?K_EDGE:K_INTERIOR)*STEP*amp+TOL_M;
            if(moved>limit){v.vertex.push({frame:i,key,vertex:j,edge:a.edge,movedM:moved,limitM:limit,blend:[a.blend,b.blend]});break;}
          }
        }else{
          // The same tile, rebuilt between the frames.
          if(prev.morphs.has(key)&&morphs.has(key)){
            stats.replacements++;
            if(cur.morph<old.morph)v.replace.push({frame:i,key,old:old.morph,cur:cur.morph});
          }
          const A=old.p.data,B=cur.p.data;
          for(let j=0;j<n;j++){
            const wa=drawnVertex(A,j,shaderBlend(A,j,old.morph,old.edges).blend),wb=drawnVertex(B,j,shaderBlend(B,j,cur.morph,cur.edges).blend);
            const o=3*j,abs=(data,k,arr)=>data.anchor[k]+arr[o+k];
            const dPos=Math.hypot(...[0,1,2].map(k=>abs(B,k,B.positions)-abs(A,k,A.positions)))*R;
            const dPar=Math.hypot(...[0,1,2].map(k=>abs(B,k,B.parents)-abs(A,k,A.parents)))*R;
            const amp=Math.hypot(...[0,1,2].map(k=>B.positions[o+k]-B.parents[o+k]))*R;
            const moved=Math.hypot(...[0,1,2].map(k=>wb[k]-wa[k]))*R,limit=Math.max(dPos,dPar)+K_EDGE*STEP*amp+TOL_M;
            if(moved>limit){v.replace.push({frame:i,key,vertex:j,movedM:moved,limitM:limit,morph:[old.morph,cur.morph]});break;}
          }
        }
      }
      // Frontier events.
      const entered=[...morphs.keys()].filter(k=>!prev.morphs.has(k)),left=new Set([...prev.morphs.keys()].filter(k=>!morphs.has(k)));
      for(const key of entered){
        const [face,level,x,y]=key.split('/').map(Number);if(!level)continue;
        const kids=[0,1,2,3].map(c=>`${face}/${level+1}/${2*x+(c&1)}/${2*y+(c>>1)}`);
        const parent=`${face}/${level-1}/${x>>1}/${y>>1}`;
        if(kids.every(k=>left.has(k))){
          stats.mergeEvents++;
          const kidMorphs=kids.map(k=>prev.morphs.get(k).morph),entry=morphs.get(key).morph;
          if(entry!==1||kidMorphs.some(m=>m!==0))v.mergeEntry.push({frame:i,key,entry,kidMorphs});
        }else if(left.has(parent)){
          stats.splitEvents++;
          // Eased start: the first frame's step is far below the linear dt/0.22.
          const m=morphs.get(key).morph;if(m>.25*STEP)v.ease.push({frame:i,key,first:m});
        }
      }
      // Eased end: the last step into 1 is small too.
      for(const [key,{p,morph}] of morphs){
        const o=prev.morphs.get(key);
        if(o&&o.p===p&&morph===1&&o.morph<1&&1-o.morph>.25*STEP)v.ease.push({frame:i,key,last:o.morph});
      }
      // Fixed ground directions whose drawn tile changed (one level apart).
      // P = the coarser tile, K = the finer one. A split draws K at its first
      // step where P was drawn; a merge draws P where K was drawn. Allowed:
      //   split: (1 - morph_P) * amp_P + 1.5 * dt/0.22 * amp_K + delta
      //   merge: delta (the children left at morph 0, the parent enters at 1)
      // amp_X = |X full - X parent shape| at the direction (amp_P is the
      // brief's "parent-to-grandparent difference"); delta = |K's parent shape
      // - P's full shape| there, the cross-level data mismatch of the two
      // built tiles (not a morph effect; reported as maxLevelMismatchM).
      heights.forEach((r,s)=>{
        const q=prev.heights[s];if(!r||!q||r.tile===q.tile||Math.abs(r.level-q.level)!==1)return;
        const split=r.level>q.level,P=split?q.p:r.p,K=split?r.p:q.p;if(!P||!K){stats.sampleUnpaired++;return;}
        const d=samples[s],zero=[0,0,0,0],full=(p,m)=>shaderHeight(p,d,R,m,zero);
        const ampP=Math.abs(full(P,1)-full(P,0)),ampK=Math.abs(full(K,1)-full(K,0)),delta=Math.abs(full(K,0)-full(P,1));
        stats.maxLevelMismatchM=Math.max(stats.maxLevelMismatchM,delta);
        const jump=Math.abs(r.heightM-q.heightM);
        const limit=(split?(1-q.morph)*ampP+K_INTERIOR*STEP*ampK:0)+delta+TOL_M;
        if(split){stats.sampleSplits++;stats.maxSplitJumpM=Math.max(stats.maxSplitJumpM,jump);}
        else{stats.sampleMerges++;stats.maxMergeJumpM=Math.max(stats.maxMergeJumpM,jump);}
        if(jump>limit)v.jump.push({frame:i,sample:s,from:q.tile,to:r.tile,jumpM:jump,limitM:limit,ampP,ampK,delta});
      });
    }
    prev={drawn,morphs,heights};
  }};
}

async function run(module,continuity){
  const body=maithea(),a=analyzer(body.radiusM);
  await runScenario(module,body,morphPoses(),{rendererOptions:{presentationContinuity:continuity},onFrame:(i,renderer)=>a.frame(i,renderer)});
  return a;
}
let runs=null;
function scenarioRuns(){
  return runs??=(async()=>{
    const fixture=await rendererModule({prefix:'atlas-morph-'});
    try{return {on:await run(fixture.module,true),off:await run(fixture.module,false)};}
    finally{await fixture.cleanup();}
  })();
}
const brief=list=>JSON.stringify(list.slice(0,4));

test('the JS shader formula is the GLSL the terrain, depth and ocean materials draw',()=>{
  assert.equal(patchMorphVertex.replace(/\r\n/g,'\n'),PATCH_MORPH_GLSL);
  const ocean=readFileSync(new URL('../src/ocean-water-material.ts',import.meta.url),'utf8').replace(/\r\n/g,'\n');
  assert.ok(ocean.includes(PATCH_MORPH_GLSL.split('\n')[1].replace('float lockEdge','  float lockEdge')),'ocean lockEdge line');
  assert.ok(ocean.includes('vec3 transformed=mix(parentPosition,position,patchMorph*(1.0-lockEdge));'),'ocean morph line');
});

test('scenario exercises splits, reverse merges, rebuilt leaves and fractional edges',async()=>{
  const {on,off}=await scenarioRuns();
  if(process.env.ATLAS_MORPH_EXPLORE){
    console.log('on',JSON.stringify(on.stats),Object.fromEntries(Object.entries(on.v).map(([k,l])=>[k,l.length])));
    console.log('off',JSON.stringify(off.stats),Object.fromEntries(Object.entries(off.v).map(([k,l])=>[k,l.length])));
    for(const [k,l] of Object.entries(on.v))if(l.length)console.log('on',k,brief(l));
    for(const [k,l] of Object.entries(off.v))if(l.length)console.log('off',k,brief(l));
  }
  assert.ok(on.stats.splitEvents>0&&on.stats.sampleSplits>0,`splits ${JSON.stringify(on.stats)}`);
  assert.ok(on.stats.mergeEvents>0&&on.stats.sampleMerges>0,`merges ${JSON.stringify(on.stats)}`);
  assert.ok(on.stats.reverseFrames>=Math.floor(1/STEP),`merges ran as reverse morphs (${on.stats.reverseFrames} frames)`);
  assert.ok(on.stats.replacements>0&&off.stats.replacements>0,'the sea-level seek rebuilt drawn leaves');
  assert.ok(on.stats.fractionalEdgeFrames>0,'fractional edge locks occurred');
});

test('per-frame vertex displacement stays below k*dh*dt/0.22 (negative: option off)',async()=>{
  const {on,off}=await scenarioRuns();
  assert.ok(on.stats.checkedVertexFrames>0);
  assert.equal(on.v.vertex.length,0,brief(on.v.vertex));
  // Off: rebuilt leaves re-morph and neighbour edges flip their 0/1 lock in one frame.
  assert.ok(off.v.vertex.length+off.v.replace.length>0,'the former steps are detected');
});

test('a rebuilt resident patch inherits its morph (negative: option off re-morphs)',async()=>{
  const {on,off}=await scenarioRuns();
  assert.equal(on.v.replace.length,0,brief(on.v.replace));
  assert.ok(off.v.replace.some(e=>e.old!==undefined&&e.cur<e.old),`off re-morphs: ${brief(off.v.replace)}`);
});

test('a merge is a reverse morph: children leave at 0, the parent enters at 1 (negative: option off)',async()=>{
  const {on,off}=await scenarioRuns();
  assert.equal(on.v.mergeEntry.length,0,brief(on.v.mergeEntry));
  assert.ok(off.stats.mergeEvents>0&&off.v.mergeEntry.length===off.stats.mergeEvents,`off: every merge regrows (${off.v.mergeEntry.length}/${off.stats.mergeEvents})`);
});

test('no split or merge jumps by more than the coarser tile\'s parent-to-grandparent difference (negative: option off)',async()=>{
  const {on,off}=await scenarioRuns();
  assert.equal(on.v.jump.length,0,brief(on.v.jump));
  assert.ok(off.v.jump.length>0,'off: a merge draws the grandparent shape');
});

test('the morph is eased: C1 at both ends (negative: option off is linear)',async()=>{
  const {on,off}=await scenarioRuns();
  assert.equal(on.v.ease.length,0,brief(on.v.ease));
  assert.ok(off.v.ease.length>0,'off: linear first step dt/0.22');
});

test('the CPU replica equals the shader formula (negative: the former 0/1 lock rule)',async()=>{
  const {on,off}=await scenarioRuns();
  assert.equal(on.v.replica.length,0,brief(on.v.replica));
  assert.equal(off.v.replica.length,0,brief(off.v.replica));
  assert.ok(on.stats.steppedReplicaDiffers>0,'a 0/1-lock replica disagrees with the shader on fractional edges');
});
