// Life CPU microbenchmark (docs/life-cpu-2026-09-29.md): drawFauna/drawFlora
// per phase at the harness's living site, working tree vs a git revision.
// Usage: node tests/life-cpu-bench.mjs [revision=e6a0b39] [repeats=3]
import {lifeRendererModule,runLifeScenario,benchPoses,percentile} from './life-scenario.mjs';
const revision=process.argv[2]??'e6a0b39',repeats=Number(process.argv[3]??3);
const variants=[['reference '+revision,await lifeRendererModule({prefix:'atlas-life-bench-ref-',revision})],['working tree',await lifeRendererModule({prefix:'atlas-life-bench-cur-'})]];
const poses=benchPoses(),rows={};
try{
  for(let r=0;r<repeats;r++)for(const [name,v] of (r%2?[...variants].reverse():variants)){
    const {timings}=await runLifeScenario(v.module,poses,{deterministicClock:false,lifeOnly:true,onFrame:()=>false});
    for(const t of timings){const k=`${name}|${t.phase}`;(rows[k]??={fauna:[],flora:[],life:[]});rows[k].fauna.push(t.fauna);rows[k].flora.push(t.flora);rows[k].life.push(t.ms);}
  }
  console.log('variant | phase | fauna p50/p95 ms | flora p50/p95 ms | updateLife p50/p95 ms');
  for(const [k,v] of Object.entries(rows)){const [n,p]=k.split('|');const f=x=>`${percentile(x,.5).toFixed(3)} / ${percentile(x,.95).toFixed(3)}`;console.log(`${n} | ${p} | ${f(v.fauna)} | ${f(v.flora)} | ${f(v.life)}`);}
}finally{for(const [,v] of variants)await v.cleanup();}
