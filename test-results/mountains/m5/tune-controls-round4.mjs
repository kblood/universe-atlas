import {TUNING,loadVariant,r1,fineSpectrum,bandLimit,finePits,coarseRows} from '../../../tests/helpers/mountain-rock-detail-fixture.mjs';
import {writeFileSync} from 'node:fs';
const out=[];
for(const P of [180,200,220,240,260,280,300])for(const depth of [45,55]){
 const params={STRATA_PERIOD_M:P,BENCH_RISE:.5,BENCH_FALL:.08,RIB_WEIGHT:.015,STRATA_WEIGHT:.985,MAX_DEPTH_M:depth,KAPPA:.6};
 const edit=s=>Object.entries(params).reduce((s,[k,v])=>s.replace(new RegExp(k+': [\\d.]+'),k+': '+v),s);
 const m=await loadVariant(edit),deep=await loadVariant(s=>edit(s).replace('MAX_DEPTH_M: '+depth,'MAX_DEPTH_M: '+depth*4).replace('KAPPA: 0.6','KAPPA: 2.4'));
 const r={params,R1e:r1(TUNING,m.rockDetailM).R1e.ratio,R3:fineSpectrum(TUNING,m.rockDetailM).beta,R4:bandLimit(TUNING.slice(0,4),m.rockDetailM),R6:finePits(TUNING,m.rockDetailM).newPitsPerKm2,coarse:coarseRows(TUNING,m.rockDetailM),deep:coarseRows(TUNING.slice(0,4),deep.rockDetailM)};
 out.push(r);console.log(JSON.stringify(r));
}
writeFileSync(new URL('tuning-controls-round4.json',import.meta.url),JSON.stringify(out,null,2));
