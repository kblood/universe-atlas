/** Baseline (commit 4c392e6) CPU draw/cull traversal measurement on the
 * saturated rock fixture (7,600 cells, 13,600 rocks). It only runs against
 * the 4c392e6 PlanetRocks API (private `tiers[t].residents` Map,
 * `runtimeRock`, `residentsVersion`, `work.drawMs`), so run it inside a clean
 * extract of that commit, never against the current source:
 *
 *   git archive 4c392e6 | tar -x -C <dir>
 *   cp tests/rock-saturated-fixture.mjs tests/rock-draw-measure-baseline.mjs <dir>/tests/
 *   (junction <dir>/node_modules to an installed node_modules)
 *   cd <dir> && node tests/rock-draw-measure-baseline.mjs
 *
 * Scenarios, frame count and warm-up match tests/rock-draw-measure.mjs. Every
 * measured frame changes the baseline draw key, so each is a full traversal
 * of all wanted resident cells. Scoped Node fixture data; not GPU, browser,
 * device or game frame timings. */
import os from 'node:os';
import * as THREE from 'three';
import {PlanetRocks} from '../src/planet-rocks.ts';
import {moon,moonFamilies,CORNER,saturatedRecords,fixtureCounts,cameraFrustum,eyeAt,flatSampler,rockClassifier} from './rock-saturated-fixture.mjs';

const gate={surfaceSolid:true,families:moonFamilies},focus=new THREE.Vector3(...CORNER),eye0=eyeAt(moon,CORNER);
const ALL=new THREE.Frustum(...Array.from({length:6},()=>new THREE.Plane(new THREE.Vector3(1,0,0),10)));
const east=new THREE.Vector3(-CORNER[1],CORNER[0],0).normalize();
const stat=values=>{const a=[...values].sort((x,y)=>x-y),q=p=>a[Math.min(a.length-1,Math.floor(p*a.length))];
  return {n:a.length,min:+a[0].toFixed(3),median:+q(.5).toFixed(3),p95:+q(.95).toFixed(3),max:+a[a.length-1].toFixed(3),mean:+(a.reduce((s,x)=>s+x,0)/a.length).toFixed(3)};};
const scenarios=[
  ['all-in-frustum, eye jitter 10 cm, shadow all',i=>({eye:eye0.clone().addScaledVector(east,(i%2)*.1/moon.radiusM),frusta:[ALL],shadow:ALL})],
  ['perspective 90deg yaw 2deg/frame, shadow all',i=>({eye:eye0,frusta:[cameraFrustum(moon,eye0,i*Math.PI/90)],shadow:ALL})],
  ['perspective 90deg yaw 2deg/frame, no shadow',i=>({eye:eye0,frusta:[cameraFrustum(moon,eye0,i*Math.PI/90)],shadow:null})],
  ['stereo XR yaw 2deg/frame, shadow all',i=>({eye:eye0,frusta:[cameraFrustum(moon,eye0,i*Math.PI/90-.03),cameraFrustum(moon,eye0,i*Math.PI/90+.03)],shadow:ALL})],
];
/** Baseline-API equivalent of the fixture's injectSaturated. */
function inject(rocks,records){
  records.forEach(({cells,rocks:perCell},t)=>{
    const s=rocks.tiers[t];
    s.wanted=cells;s.queue=[];s.queueIndex=0;s.valid=true;s.center.copy(focus);s.truncated=0;
    s.residents=new Map(cells.map((c,i)=>[c.id,{tier:t,cell:c,rocks:perCell[i].map(x=>rocks.runtimeRock(x))}]));
  });
  rocks.residentsVersion++;
}
function run(records,name,view,frames=240,warm=40){
  const rocks=new PlanetRocks({body:moon,sample:()=>flatSampler,classify:()=>rockClassifier});
  rocks.update({eye:eye0,focus,altitudeM:1.7,gate,relief:1,waterLevelM:0,frusta:[]});
  inject(rocks,records);
  const draw=[],update=[];let d,rebuilds0=0;
  for(let i=0;i<frames;i++){
    const v=view(i);
    rocks.update({eye:v.eye,focus,altitudeM:1.7,gate,relief:1,waterLevelM:0,frusta:v.frusta,shadowFrustum:v.shadow});
    d=rocks.diagnostics();
    if(i===warm-1)rebuilds0=d.work.rebuilds;
    if(i<warm)continue;
    draw.push(d.work.drawMs);update.push(d.work.updateMs);
  }
  if(d.work.cells||d.work.rescatters!==1)throw new Error('baseline fixture did process/rescatter work during measurement');
  const out={name,drawMs:stat(draw),updateMs:stat(update),fullRebuilds:d.work.rebuilds-rebuilds0,
    lastFrame:{drawn:d.drawn,cameraCulled:d.cameraCulled,shadowOnly:d.shadowOnly,budgetDrops:d.budgetDrops}};
  rocks.dispose();
  return out;
}
const records=saturatedRecords();
const report={commit:'4c392e6e31db9932cb45cfe2c22bff266d4a483a',node:process.version,platform:process.platform,arch:process.arch,cpu:os.cpus()[0]?.model??'unknown',
  fixture:fixtureCounts(records),frames:240,warm:40,results:scenarios.map(([name,view])=>run(records,name,view))};
if(process.argv.includes('--json'))console.log(JSON.stringify(report,null,2));
else{
  const {results,...head}=report;console.log(JSON.stringify(head));
  for(const r of results)console.log(JSON.stringify(r));
}
