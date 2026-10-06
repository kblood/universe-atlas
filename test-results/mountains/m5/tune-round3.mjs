import {TUNING,loadVariant,r1,fineSpectrum,bandLimit,finePits} from '../../../tests/helpers/mountain-rock-detail-fixture.mjs';
import {writeFileSync} from 'node:fs';
const results=[];
for(const L of [175,225,275])for(const W of [35,50,65])for(const sw of [.01,.04]){
 const K=(.59-sw*120/(.3849001794597505*160))/(1.539600717839002*(1-sw));
 const m=await loadVariant(s=>s.replace('GULLY_HALF_LENGTH_M: 275',`GULLY_HALF_LENGTH_M: ${L}`).replace('GULLY_HALF_WIDTH_M: 65',`GULLY_HALF_WIDTH_M: ${W}`).replace('STRATA_WEIGHT: 0.04',`STRATA_WEIGHT: ${sw}`).replace('RIB_WEIGHT: 0.96',`RIB_WEIGHT: ${1-sw}`).replace('KAPPA: 0.32',`KAPPA: ${K}`).replace('A_MIN: 0.5','A_MIN: 0.8'));
 const r={L,W,sw,K,R1d:r1(TUNING,m.rockDetailM).R1d.ratio,R3:fineSpectrum(TUNING,m.rockDetailM).beta,R4:bandLimit(TUNING.slice(0,4),m.rockDetailM),R6:finePits(TUNING,m.rockDetailM).newPitsPerKm2};results.push(r);console.log(r);
}
writeFileSync(new URL('tuning-sweep.json',import.meta.url),JSON.stringify(results,null,2));
