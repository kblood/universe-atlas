import {TUNING,loadVariant,r1,fineSpectrum,bandLimit,finePits,coarseRows,zero} from '../../../tests/helpers/mountain-rock-detail-fixture.mjs';
import {writeFileSync} from 'node:fs';
const out=[],without=fineSpectrum(TUNING,zero).beta;
for(const P of [100,130,160,200,240])for(const rise of [.35,.5,.7,.85])for(const rw of [0,.05,.15]){
 const K=.6,depth=(.59-K*1.539600717839002*rw)*P*rise/(1-rw);
 if(depth>200)continue;
 const params={STRATA_PERIOD_M:P,BENCH_RISE:rise,BENCH_FALL:.08,RIB_WEIGHT:rw,STRATA_WEIGHT:1-rw,MAX_DEPTH_M:depth,KAPPA:K};
 const m=await loadVariant(s=>Object.entries(params).reduce((s,[k,v])=>s.replace(new RegExp(k+': [\\d.]+'),k+': '+v),s));
 const r={params,R1e:r1(TUNING,m.rockDetailM).R1e.ratio,R3:fineSpectrum(TUNING,m.rockDetailM).beta,R4:bandLimit(TUNING.slice(0,4),m.rockDetailM),R6:finePits(TUNING,m.rockDetailM).newPitsPerKm2};
 if(r.R1e>=2&&r.R3<=without-(without-2.617)/3&&r.R4<=.2&&r.R6<=1)r.coarse=coarseRows(TUNING,m.rockDetailM);
 out.push(r);console.log(JSON.stringify(r));
}
writeFileSync(new URL('tuning-round4.json',import.meta.url),JSON.stringify({without,limit:without-(without-2.617)/3,results:out},null,2));
