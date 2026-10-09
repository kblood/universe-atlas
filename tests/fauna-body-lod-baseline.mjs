/** Descriptive Node cost/geometry baseline for loaded-body LOD prototypes. */
import * as THREE from 'three';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {FaunaFieldRenderer,FAUNA_FIELD_CAPACITY} from '../src/fauna-field-renderer.ts';
import {generateCreatureGenome} from '../src/creature-model.ts';
import {buildQuadrupedBody,quadrupedBodyBytes} from '../src/fauna-body-plan.ts';
const out=process.env.ATLAS_RESULTS||'test-results/fauna-body-lod-baseline';await mkdir(out,{recursive:true});
const fixture=JSON.parse(await readFile(process.env.HABITAT_REPLAY||'C:/LLM/IWSDK/Assets/_assetctl/life-presentation-20261009/baseline-flight/replay.json','utf8'));
const samples=[...fixture.worlds.map(w=>({name:w.finder.text,genome:w.target.genome})),
  ...['browser','runner','low-slung','long-neck'].map(archetype=>({name:archetype,genome:generateCreatureGenome('LOADED-BODY-LOD-BASELINE',archetype)}))];
const report={node:process.version,classification:'shared-slot descriptive CPU baseline; not quiet-host acceptance',samples:[],frames:[]};
const mat=new THREE.Matrix4(),origin=new THREE.Vector3();
for(const sample of samples){
  const f=new FaunaFieldRenderer({bodyPlan:true});f.beginFrame(origin);f.submit(sample.genome,mat,1,'idle',30,{},2);f.endFrame();
  const batches=f.group.children.map(m=>({name:m.name,parts:m.count,vertices:m.geometry.attributes.position.count,
    triangles:(m.geometry.index?.count||m.geometry.attributes.position.count)/3,submittedTriangles:m.count*(m.geometry.index?.count||m.geometry.attributes.position.count)/3}));
  const started=performance.now(),body=buildQuadrupedBody(sample.genome),buildMs=performance.now()-started;
  report.samples.push({...sample,batches,primitiveTriangles:batches.reduce((n,b)=>n+b.submittedTriangles,0),
    fullBody:{triangles:body.triangleCount,bodyTriangles:body.bodyTriangleCount,appendTriangles:body.triangleCount-body.bodyTriangleCount,
      vertices:body.vertexCount,bytes:quadrupedBodyBytes(body),buildMs,bones:body.plan.bones.length}});f.dispose();
}
const keys=Array.from({length:FAUNA_FIELD_CAPACITY},()=>({}));
for(const paused of [false,true])for(const distance of [30,80,120]){
  const f=new FaunaFieldRenderer({bodyPlan:true}),times=[];let frame=0;
  const update=()=>{f.beginFrame(origin);const t=paused?1:++frame/60;
    for(let i=0;i<FAUNA_FIELD_CAPACITY;i++){mat.makeTranslation((i%16)*4,0,Math.floor(i/16)*4);f.submit(samples[i%samples.length].genome,mat,t,'walk',distance,keys[i],2);}f.endFrame();};
  for(let i=0;i<20;i++)update();for(let i=0;i<60;i++){const t=performance.now();update();times.push(performance.now()-t);}
  times.sort((a,b)=>a-b);
  report.frames.push({paused,distance,animals:f.count,batches:f.group.children.length,p50Ms:times[30],p95Ms:times[56],
    submittedTriangles:f.group.children.reduce((n,m)=>n+m.count*(m.geometry.index?.count||m.geometry.attributes.position.count)/3,0),
    reportedAllocatedBytes:f.allocatedBytes});f.dispose();
}
await writeFile(out+'/report.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({samples:report.samples.map(s=>({name:s.name,primitiveTriangles:s.primitiveTriangles,fullBody:s.fullBody})),frames:report.frames},null,2));
