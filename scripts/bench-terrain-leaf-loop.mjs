// Node microbenchmark for PlanetRenderer.update() terrain work
// (docs/terrain-budget-2026-09-29.md). Usage:
//   node scripts/bench-terrain-leaf-loop.mjs [revision ...]
// Each argument is a git revision of src/planet-renderer.ts, or `worktree`.
// Revisions run alternately in one process against the same cached tiles, so
// tile building is excluded and machine load affects both sides alike.
import {rendererModule,maithea} from '../tests/terrain-renderer-fixture.mjs';
import {runScenario,benchPoses,gitRendererSource,percentile} from '../tests/terrain-leaf-scenario.mjs';

const revisions=process.argv.slice(2).length?process.argv.slice(2):['worktree'];
const rounds=Number(process.env.BENCH_ROUNDS||3);
const body=maithea(),poses=benchPoses(),results=new Map();
const modules=new Map();
for(const revision of revisions){
  const source=revision==='worktree'?null:gitRendererSource(revision);
  if(revision!=='worktree'&&source===null)throw new Error(`no planet-renderer.ts at ${revision}`);
  modules.set(revision,await rendererModule({prefix:'atlas-leaf-bench-',rendererSource:source}));
}
try{
  for(let round=0;round<rounds;round++)for(const revision of revisions){
    const {timings,final}=await runScenario(modules.get(revision).module,body,poses,{deterministicClock:false});
    const bucket=results.get(revision)??new Map();results.set(revision,bucket);
    for(const {phase,ms} of timings)if(phase!=='settle'){(bucket.get(phase)??bucket.set(phase,[]).get(phase)).push(ms);}
    bucket.meta={visible:final.visible,resident:final.resident};
  }
  const rows=[];
  for(const [revision,bucket] of results)for(const [phase,values] of bucket)
    rows.push({revision,phase,frames:values.length,meanMs:+(values.reduce((a,b)=>a+b,0)/values.length).toFixed(3),p50Ms:+percentile(values,.5).toFixed(3),p95Ms:+percentile(values,.95).toFixed(3),maxMs:+Math.max(...values).toFixed(3),visible:bucket.meta.visible,resident:bucket.meta.resident});
  console.table(rows);
  console.log(JSON.stringify({node:process.version,rounds,rows}));
}finally{for(const {cleanup} of modules.values())await cleanup();}
