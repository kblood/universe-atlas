import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=process.env.ATLAS_RESULTS||'test-results/planet-warmup';
const report=JSON.parse(await readFile(out+'/report.json','utf8')),summary={runs:[],parity:[]};
for(let i=0;i<report.runs.length;i++){
  const run=report.runs[i],profile=JSON.parse(await readFile(`${out}/${Math.floor(i/2)}-${i%2}-cpu.json`,'utf8'));
  const nodes=new Map(profile.nodes.map(n=>[n.id,n])),parents=new Map();
  for(const n of nodes.values())for(const c of n.children||[])parents.set(c,n.id);
  const inclusive=new Map();
  for(let j=0;j<profile.samples.length;j++)for(let id=profile.samples[j];id!==undefined;id=parents.get(id)){
    const name=nodes.get(id).callFrame.functionName;inclusive.set(name,(inclusive.get(name)||0)+(profile.timeDeltas[j]||0)/1000);
  }
  const waits=run.snapshot.probe.gl.filter(x=>x.ms>20).sort((a,b)=>b.ms-a.ms);
  summary.runs.push({build:run.build,world:run.world,errors:run.errors,ids:run.snapshot.ids.length,flora:run.snapshot.flora,
    warmup:run.snapshot.warmup,windows:run.windows.map(w=>({phase:w.phase,p95:w.p95,max:w.max,screenTargetRestored:w.screenTargetRestored,errorsEnabled:w.rendererCheckShaderErrors})),
    sampledInclusiveMs:{warm:inclusive.get('warm')||0,family:inclusive.get('family')||0,getProgramInfoLog:inclusive.get('getProgramInfoLog')||0},nativeWaits:waits});
}
for(let wi=0;wi<2;wi++){
  const a=report.runs[wi].snapshot,b=report.runs[wi+2].snapshot;
  const map=s=>new Map(s.trace.individuals.map(x=>[x.id,x]));const am=map(a),bm=map(b);
  const equalIds=JSON.stringify([...am.keys()].sort())===JSON.stringify([...bm.keys()].sort());
  let maxPositionDelta=0,poseDifferences=0,censusDifferences=0,cameraVisibleDifferences=0;
  for(const [id,x]of am){const y=bm.get(id);if(!y)continue;
    maxPositionDelta=Math.max(maxPositionDelta,Math.hypot(...x.position.map((v,j)=>v-y.position[j])));
    if(JSON.stringify(x.pose)!==JSON.stringify(y.pose))poseDifferences++;
    if(JSON.stringify(x.census.member)!==JSON.stringify(y.census.member))censusDifferences++;
    if(x.cameraVisible!==y.cameraVisible)cameraVisibleDifferences++;
  }
  summary.parity.push({world:report.runs[wi].world,equalIds,maxPositionDelta,poseDifferences,censusDifferences,cameraVisibleDifferences});
}
await writeFile(out+'/summary.json',JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));
for(const run of summary.runs){assert.deepEqual(run.errors,[]);assert(run.ids>0);for(const w of run.windows){assert(w.screenTargetRestored);assert(w.errorsEnabled);}}
for(const p of summary.parity){assert(p.equalIds);assert.equal(p.maxPositionDelta,0);assert.equal(p.poseDifferences,0);assert.equal(p.censusDifferences,0);assert.equal(p.cameraVisibleDifferences,0);}
