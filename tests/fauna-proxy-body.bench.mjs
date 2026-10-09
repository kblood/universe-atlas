// Presentation cost report, not a quiet-host/device acceptance claim.
import * as THREE from 'three';
import {FaunaFieldRenderer,FAUNA_FIELD_CAPACITY} from '../src/fauna-field-renderer.ts';
import {generateCreatureGenome} from '../src/creature-model.ts';
const genomes=['browser','runner','low-slung','long-neck'].map(a=>generateCreatureGenome('PROXY-BODY-BENCH',a));
const keys=Array.from({length:FAUNA_FIELD_CAPACITY},()=>({})),parent=new THREE.Matrix4(),origin=new THREE.Vector3();
function run(bodyPlan,paused,distance){
  const field=new FaunaFieldRenderer({bodyPlan}),times=[];
  let frame=0;
  const update=()=>{
    field.beginFrame(origin);const time=paused?1:++frame/60;
    for(let i=0;i<FAUNA_FIELD_CAPACITY;i++){
      parent.makeTranslation((i%16)*4,0,Math.floor(i/16)*4);
      field.submit(genomes[i%genomes.length],parent,time,'walk',distance,keys[i],2);
    }
    field.endFrame();
  };
  try{
    for(let i=0;i<30;i++)update();
    for(let i=0;i<150;i++){const start=performance.now();update();times.push(performance.now()-start);}
    times.sort((a,b)=>a-b);
    return {bodyPlan,paused,distance,animals:field.count,drawBatches:field.group.children.length,
      p50Ms:times[75],p95Ms:times[142],allocatedBytes:field.allocatedBytes,
      submittedTriangles:field.group.children.reduce((n,m)=>n+m.count*m.geometry.index.count/3,0)};
  }finally{field.dispose();}
}
const rows=[];
for(const distance of [5,120,150])for(const paused of [false,true])for(const bodyPlan of [false,true])rows.push(run(bodyPlan,paused,distance));
console.log(JSON.stringify({node:process.version,rows},null,2));
