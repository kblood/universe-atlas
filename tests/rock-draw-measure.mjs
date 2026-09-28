/** CPU-only draw/cull traversal and record-heap measurement on the saturated
 * rock fixture (7,600 cells, 13,600 rocks). Not part of `npm test`.
 *
 *   node --expose-gc tests/rock-draw-measure.mjs [--json]
 *
 * Scenarios, frames (240) and warm-up (40) match
 * tests/rock-draw-measure-baseline.mjs, which measures commit 4c392e6.
 *
 * The numbers are scoped fixture data for this Node process. They are not
 * GPU, browser, device or game frame timings. */
import os from 'node:os';
import * as THREE from 'three';
import {PlanetRocks,ROCK_DRAW_UNITS_PER_FRAME,ROCK_RECORD_BYTES,ROCK_CELL_RECORD_BYTES} from '../src/planet-rocks.ts';
import {terrainSampler} from '../src/terrain.ts';
import {biomeClassifier} from '../src/surface-biomes.ts';
import {moon,moonFamilies,CORNER,unit,saturatedRecords,fixtureCounts,cameraFrustum,eyeAt,injectSaturated,flatSampler,rockClassifier} from './rock-saturated-fixture.mjs';

const gate={surfaceSolid:true,families:moonFamilies},focus=new THREE.Vector3(...CORNER),eye0=eyeAt(moon,CORNER);
const ALL=new THREE.Frustum(...Array.from({length:6},()=>new THREE.Plane(new THREE.Vector3(1,0,0),10)));
const east=new THREE.Vector3(-CORNER[1],CORNER[0],0).normalize();
const stat=values=>{const a=[...values].sort((x,y)=>x-y),q=p=>a[Math.min(a.length-1,Math.floor(p*a.length))];
  return {n:a.length,min:+a[0].toFixed(3),median:+q(.5).toFixed(3),p95:+q(.95).toFixed(3),max:+a[a.length-1].toFixed(3),mean:+(a.reduce((s,x)=>s+x,0)/a.length).toFixed(3)};};
function rig(drawUnitsPerFrame){
  const rocks=new PlanetRocks({body:moon,sample:()=>flatSampler,classify:()=>rockClassifier,drawUnitsPerFrame});
  rocks.update({eye:eye0,focus,altitudeM:1.7,gate,relief:1,waterLevelM:0,frusta:[]});
  return rocks;
}
const scenarios=[
  ['all-in-frustum, eye jitter 10 cm, shadow all',i=>({eye:eye0.clone().addScaledVector(east,(i%2)*.1/moon.radiusM),frusta:[ALL],shadow:ALL})],
  ['perspective 90deg yaw 2deg/frame, shadow all',i=>({eye:eye0,frusta:[cameraFrustum(moon,eye0,i*Math.PI/90)],shadow:ALL})],
  ['perspective 90deg yaw 2deg/frame, no shadow',i=>({eye:eye0,frusta:[cameraFrustum(moon,eye0,i*Math.PI/90)],shadow:null})],
  ['stereo XR yaw 2deg/frame, shadow all',i=>({eye:eye0,frusta:[cameraFrustum(moon,eye0,i*Math.PI/90-.03),cameraFrustum(moon,eye0,i*Math.PI/90+.03)],shadow:ALL})],
];
function run(records,name,view,drawUnitsPerFrame,frames=240,warm=40){
  const rocks=rig(drawUnitsPerFrame);injectSaturated(rocks,records);
  const ms=[],units=[],latency=[],publish=[];let d,deferred0=0;
  for(let i=0;i<frames;i++){
    const v=view(i);
    rocks.update({eye:v.eye,focus,altitudeM:1.7,gate,relief:1,waterLevelM:0,frusta:v.frusta,shadowFrustum:v.shadow});
    d=rocks.diagnostics();
    if(i===warm-1)deferred0=d.work.draw.publishDeferred;
    if(i<warm)continue;
    ms.push(d.work.draw.ms);units.push(d.work.draw.units);publish.push(d.work.draw.publishInstances);
    if(d.work.draw.published)latency.push(d.work.draw.lastJobFrames);
  }
  rocks.dispose();
  return {name,drawUnitsPerFrame,drawMs:stat(ms),unitsPerFrame:stat(units),jobFrames:latency.length?stat(latency):null,publishes:latency.length,publishDeferred:d.work.draw.publishDeferred-deferred0,publishInstancesMax:Math.max(...publish),
    lastPublished:{drawn:d.drawn,nearUnculled:d.nearUnculled,nearDrops:d.nearDrops,cameraCulled:d.cameraCulled,shadowOnly:d.shadowOnly,budgetDrops:d.budgetDrops}};
}
/** Retained heap after adoption: cells with no rocks, then fully occupied. */
function heap(records){
  if(!globalThis.gc)return null;
  const measure=occupied=>{
    const rocks=rig();
    const input=records.map(t=>({cells:t.cells.map(c=>({id:`${c.id}`,direction:[...c.direction]})),rocks:occupied?t.rocks.map(list=>list.map(x=>structuredClone(x))):t.cells.map(()=>[])}));
    for(let i=0;i<3;i++)globalThis.gc();
    const used=()=>{const m=process.memoryUsage();return m.heapUsed+m.arrayBuffers;};
    const before=used();
    injectSaturated(rocks,input);input.length=0;
    for(let i=0;i<3;i++)globalThis.gc();
    const after=used();
    rocks.dispose();
    return after-before;
  };
  const {cells,rocks}=fixtureCounts(records);
  const empty=measure(false),full=measure(true);
  return {cells,rocks,emptyCellsDelta:empty,fullDelta:full,measuredCellBytes:Math.round(empty/cells),measuredRockBytes:Math.round((full-empty)/rocks),
    estimateCellBytes:ROCK_CELL_RECORD_BYTES,estimateRockBytes:ROCK_RECORD_BYTES,
    note:'V8 heapUsed + arrayBuffers deltas after forced GC; cell cost includes the SurfaceCell, Map entry and record; the synthetic source arrays are retained through the runtime rock as in production'};
}
/** Real canonical pipeline on the barren moon: settle, then one unbounded
 * job to size a natural scene's draw work in units. */
function natural(name,direction){
  const sample=terrainSampler(moon),classify=biomeClassifier(moon),d=unit(direction),h=sample(d).groundHeightM,g=1+(h+1.7)/moon.radiusM;
  const eye=new THREE.Vector3(d[0]*g,d[1]*g,d[2]*g),focusN=new THREE.Vector3(...d),rocks=new PlanetRocks({body:moon,sample:()=>sample,classify:()=>classify,drawUnitsPerFrame:Infinity});
  let frames=0,diag;
  for(;frames<5000;frames++){rocks.update({eye,focus:focusN,altitudeM:1.7,gate,relief:1,waterLevelM:0,frusta:[ALL],shadowFrustum:ALL});diag=rocks.diagnostics();
    if(diag.tiers.every(t=>t.pending===0&&t.wanted>0)&&!diag.work.draw.pending&&!diag.work.draw.stale)break;}
  const job=view=>{rocks.update({eye,focus:focusN,altitudeM:1.7,gate,relief:1,waterLevelM:0,...view});return rocks.diagnostics().work.draw.units;};
  const all=job({frusta:[cameraFrustum(moon,eye,.1)],shadowFrustum:ALL}),perspective=job({frusta:[cameraFrustum(moon,eye,.2)],shadowFrustum:null});
  const out={name,settleFrames:frames+1,cells:diag.tiers.reduce((a,t)=>a+t.wanted,0),rocks:diag.tiers.reduce((a,t)=>a+t.rocks,0),
    unitsPerspectiveShadow:all,unitsPerspectiveNoShadow:perspective,framesAtDefaultBudget:Math.ceil(all/ROCK_DRAW_UNITS_PER_FRAME)};
  rocks.dispose();return out;
}
const records=saturatedRecords();
const report={node:process.version,platform:process.platform,arch:process.arch,cpu:os.cpus()[0]?.model??'unknown',fixture:fixtureCounts(records),
  results:[],natural:[natural('moon face-centre',[.02,.03,1]),natural('moon near cube corner',CORNER)],heap:heap(records)};
for(const [name,view] of scenarios){
  report.results.push(run(records,name,view,ROCK_DRAW_UNITS_PER_FRAME));
  report.results.push(run(records,name,view,Infinity));
}
if(process.argv.includes('--json'))console.log(JSON.stringify(report,null,2));
else{
  console.log(JSON.stringify({node:report.node,platform:report.platform,arch:report.arch,cpu:report.cpu,...report.fixture}));
  for(const r of report.results)console.log(JSON.stringify(r));
  for(const r of report.natural)console.log(JSON.stringify(r));
  console.log(JSON.stringify({heap:report.heap}));
}
