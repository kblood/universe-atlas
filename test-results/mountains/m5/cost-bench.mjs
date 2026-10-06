// Real warm-resident M3 cost; run in the coordinator's CPU-quiet slot.
import {writeFileSync} from 'node:fs';
import {ridgeValleyCarvingM,carvingBuildStats} from '../../../src/mountain-carving.ts';
import {rockDetailM,rockDetailSeed,carvedSlopeTan} from '../../../src/mountain-rock-detail.ts';
import {q} from '../../../tests/helpers/mountain-metrics.mjs';
const seed=730201,rs=rockDetailSeed(seed),count=1000000;
// One 12 km region fits the warm memo. U is held at each centre for offsets,
// exactly as the proposed assembly patch does. Warm all three lookups first.
const inputs=Array.from({length:4096},(_,i)=>{const x=(i%64)*187.5-6000,y=Math.floor(i/64)*187.5-6000;return [x,y,30000,3000*(1-Math.abs(y)/30000),1,seed];});
let sink=0;const call=(a,full)=>{const c=ridgeValleyCarvingM(...a);if(!full)return c;
  const [x,y,w,u,b,s]=a,cx=ridgeValleyCarvingM(x+125,y,w,u,b,s),cy=ridgeValleyCarvingM(x,y+125,w,u,b,s);
  return c+rockDetailM(x,y,u+c,u+cx,u+cy,rs);};
for(const a of inputs)sink+=call(a,true);
const warmBuilds=carvingBuildStats.count,alone=[],combined=[];
function round(full){const start=process.hrtime.bigint();for(let i=0;i<count;i++)sink+=call(inputs[i&4095],full);return Number(process.hrtime.bigint()-start)/count;}
for(let r=-3;r<15;r++){let a,b;if(r%2){b=round(true);a=round(false);}else{a=round(false);b=round(true);}if(r>=0){alone.push(a);combined.push(b);}console.log(`round ${r}: alone=${a.toFixed(2)} combined=${b.toFixed(2)} ns`);}
const result={count,rounds:15,aloneNs:alone,combinedNs:combined,aloneMedianNs:q(alone,.5),combinedMedianNs:q(combined,.5),addonMedianNs:q(combined.map((v,i)=>v-alone[i]),.5),warmBuilds,extraBuilds:carvingBuildStats.count-warmBuilds,budgetNs:214,sink};
result.addonBudgetPass=result.addonMedianNs<=214;
writeFileSync(new URL('cost-bench.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log('M5_REAL_COST '+JSON.stringify(result));
if(result.extraBuilds!==0)throw new Error('Benchmark was not warm resident');
if(!result.addonBudgetPass){console.error(`M5 add-on ${result.addonMedianNs} ns exceeds the 214 ns budget`);process.exitCode=1;}
