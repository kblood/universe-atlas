import {TUNING,loadVariant,r1,fineSpectrum,bandLimit,finePits,coarseRows} from '../../../tests/helpers/mountain-rock-detail-fixture.mjs';
import {writeFileSync} from 'node:fs';
const out=[];
for(const P of [200,220,240])for(const depth of [40,45,48])for(const rw of [.005,.015,.03]){
 const params={STRATA_PERIOD_M:P,BENCH_RISE:.4,BENCH_FALL:.08,RIB_WEIGHT:rw,STRATA_WEIGHT:1-rw,MAX_DEPTH_M:depth,KAPPA:.6};
 const m=await loadVariant(s=>Object.entries(params).reduce((s,[k,v])=>s.replace(new RegExp(k+': [\\d.]+'),k+': '+v),s));
 const r={params,R1e:r1(TUNING,m.rockDetailM).R1e.ratio,R3:fineSpectrum(TUNING,m.rockDetailM).beta,R4:bandLimit(TUNING.slice(0,4),m.rockDetailM),R6:finePits(TUNING,m.rockDetailM).newPitsPerKm2,coarse:coarseRows(TUNING,m.rockDetailM)};
 out.push(r);console.log(JSON.stringify(r));
}
writeFileSync(new URL('tuning-refine-round4.json',import.meta.url),JSON.stringify(out,null,2));
