// Carving C1 copy of test-results/mountains/t6-wiring/m3-rows.mjs, changed ONLY in the rock inputs to the
// mountain-assembly-4 semantics (docs/fable-decision-carving-lattice-2026-10-07.md section 2b): the height is U + C
// (Catmull-Rom), the M5 rock term reads U + Cb, U + Cbx, U + Cby (the smoothed carving at the sample and the two
// +125 m offsets, U and belt held at the sample). Thresholds, seeds, sites and metrics unchanged.
// T6 copy of test-results/mountains/m5/integration-m3.mjs (main 9dcb1cf), unchanged except the output name: the eight M3
// rows on the OLD seeds 730201-730208 and the FRESH seeds 730301-730308 (fixed before measuring, decisions addendum 1
// item 3), each without and with the M5 rock term; no tuning.
// INTEGRATION, not an element test. Real M3, no threshold or seed tuning here.
import {writeFileSync} from 'node:fs';
import {ridgeValleyCarvingM,ridgeValleyCarvingSmoothM} from '../../../src/mountain-carving.ts';
import {rockDetailM,rockDetailSeed,carvedSlopeTan} from '../../../src/mountain-rock-detail.ts';
import {R,SITES,rampArgs} from '../../../scripts/mountain-render-carving.mjs';
import {measureSites,judgeM3,slopes,frame,localMap,q} from '../../../tests/helpers/mountain-metrics.mjs';
import {r1,coarseRows,fineSpectrum,offset,zero} from '../../../tests/helpers/mountain-rock-detail-fixture.mjs';
const smoke=process.env.M5_INTEGRATION_SMOKE==='1';
const sites=smoke?SITES.slice(0,1):SITES;
const out={note:'U and the belt flag are held at the sample for both +125 m slope offsets, exactly as the T6 wiring patch does (coordinator change after the Astra review; the round-4 run let U follow the envelope). No background in eight M3 rows; synthetic background added only in the same R1/R1d INFO, R1e/R2/R3-prime paths as the element test.',smoke,pools:{}};
for(const [name,start] of (smoke?[['m3',730201]]:[['m3',730201],['fresh',730301]])){
  const seeds=Array.from({length:smoke?1:8},(_,i)=>start+i),pool={};out.pools[name]=pool;
  for(const withRock of [false,true]){
    console.log(`${name}: measuring eight M3 rows ${withRock?'with':'without'} rock (block solves may take minutes)`);
    const started=new Set();
    const ts=d=>{
      // measureSites traverses sites in order. Nearest chart identifies the
      // current site and reports before its expensive first M3 block solve.
      let nearest=0,best=-Infinity;for(let i=0;i<sites.length;i++){const dot=d[0]*sites[i].d[0]+d[1]*sites[i].d[1]+d[2]*sites[i].d[2];if(dot>best){best=dot;nearest=i;}}
      if(!started.has(nearest)){started.add(nearest);console.log(`${name} ${withRock?'with':'without'} site ${nearest+1}/${sites.length} started`);}
const a=rampArgs(d);a[5]+=start-730201;const [x,y,w,u,b,s]=a,c=ridgeValleyCarvingM(...a),h=u+c;
      let detail=0;if(withRock){const hb=u+ridgeValleyCarvingSmoothM(x,y,w,u,b,s),hx=u+ridgeValleyCarvingSmoothM(x+125,y,w,u,b,s),hy=u+ridgeValleyCarvingSmoothM(x,y+125,w,u,b,s);detail=rockDetailM(x,y,hb,hx,hy,rockDetailSeed(s));} // U and belt held at the sample, as the T6 patch does
      return {groundHeightM:h+detail,ocean:false};};
    const core=[];
    const metrics=measureSites(ts,sites,R,{onRaster:(r,reg,i)=>{const map=localMap(sites[i].d,frame(sites[i].d),R),s=slopes(r,1),o=(r.n-1)*r.step/2;
      for(let k=0;k<s.length;k++){const x=1+k%(r.n-2),y=1+Math.floor(k/(r.n-2));if(Math.abs(R*Math.asin(map(x*r.step-o,y*r.step-o)[1]))<=19500)core.push(s[k]);}
      console.log(`${name} ${withRock?'with':'without'} site ${i+1}/${sites.length} complete`);}});
    metrics.E5_slopes.slope125P50=q(core,.5);metrics.E5_slopes.slope125Over30=100*core.filter(v=>v>30).length/core.length;
    pool[withRock?'with':'without']={metrics,rows:judgeM3(metrics)};
    writeFileSync(new URL(smoke?'m3-rows-smoke.json':'m3-rows.json',import.meta.url),JSON.stringify(out,null,2)+'\n');
  }
  // Same element metric definitions, now the height callback is real U+C.
  const height=(x,y,seed)=>{const u=3000*Math.max(0,1-Math.abs(y)/30000);return u+ridgeValleyCarvingM(x+offset(seed),y,30000,u,Math.abs(y)<30000?1:0,seed);};
  // Rock input exactly as the T6 patch builds it: U (and the belt flag) held at the sample for both +125 m offsets.
  const seedOf=new Map(seeds.map(seed=>[rockDetailSeed(seed),seed]));
  const heldU=(xo,y,h,hx,hy,rs)=>{const seed=seedOf.get(rs),u=3000*Math.max(0,1-Math.abs(y)/30000),b=Math.abs(y)<30000?1:0;
    return rockDetailM(xo,y,u+ridgeValleyCarvingSmoothM(xo,y,30000,u,b,seed),u+ridgeValleyCarvingSmoothM(xo+125,y,30000,u,b,seed),u+ridgeValleyCarvingSmoothM(xo,y+125,30000,u,b,seed),rs);}; // mountain-assembly-4: all three from Cb
  for(const [label,fn] of [['with',heldU],['without',zero]]){console.log(`${name}: R1/R1d INFO, R1e/R2/R3' ${label}`);pool[label].fine={...r1(seeds,fn,height),R2:coarseRows(seeds,fn,height),R3:fineSpectrum(seeds,fn,height)};}
  const beta0=pool.without.fine.R3.beta,limit=beta0-(beta0-2.617)/3;
  pool.R3prime={alpineFineBeta:2.617,limit,beta:pool.with.fine.R3.beta,pass:pool.with.fine.R3.beta>=2&&pool.with.fine.R3.beta<=limit};
  out.pools[name]=pool;writeFileSync(new URL(smoke?'m3-rows-smoke.json':'m3-rows.json',import.meta.url),JSON.stringify(out,null,2)+'\n');
}
console.log('M5_INTEGRATION '+JSON.stringify(out));
