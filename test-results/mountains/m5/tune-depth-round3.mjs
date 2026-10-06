import {TUNING,loadVariant,r1,fineSpectrum,bandLimit,finePits,coarseRows} from '../../../tests/helpers/mountain-rock-detail-fixture.mjs';
import {writeFileSync} from 'node:fs';
const results=[];
for(const K of [.12,.18,.24])for(const sw of [.04,.2,.4]){
 const P=sw===.04?160:sw===.2?200:300;
 const m=await loadVariant(s=>s.replace('STRATA_WEIGHT: 0.04',`STRATA_WEIGHT: ${sw}`).replace('RIB_WEIGHT: 0.96',`RIB_WEIGHT: ${1-sw}`).replace('KAPPA: 0.32',`KAPPA: ${K}`).replace('STRATA_PERIOD_M: 160',`STRATA_PERIOD_M: ${P}`));
 const r={K,sw,P,bound:K*1.539600717839002*(1-sw)+sw*120/(.3849001794597505*P),R1d:r1(TUNING,m.rockDetailM).R1d.ratio,R3:fineSpectrum(TUNING,m.rockDetailM).beta,R4:bandLimit(TUNING.slice(0,4),m.rockDetailM),R6:finePits(TUNING,m.rockDetailM).newPitsPerKm2};results.push(r);console.log(r);
}
writeFileSync(new URL('tuning-depth-sweep.json',import.meta.url),JSON.stringify(results,null,2));
