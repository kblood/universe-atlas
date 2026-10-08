// Element-only analytic fixture; no M1-M4 constants. Seeds shift phase and offset only.
import * as rock from '../../src/mountain-rock-detail.ts';
import {bandPowers,betaFromOctaves,slopes,rasterFromArray,depressions,depressionPits,q} from './mountain-metrics.mjs';
export const TUNING=Array.from({length:8},(_,i)=>730501+i);
export const BURNT=Array.from({length:8},(_,i)=>730601+i);
export const BURNT2=Array.from({length:8},(_,i)=>730701+i);
export const BURNT3=Array.from({length:8},(_,i)=>730801+i);
export const GATE=Array.from({length:8},(_,i)=>730901+i);
export const offset=seed=>(seed-730500)*170000;
export function base(x,y,seed){
  const warp=180*Math.sin(y/6000+(seed-730500)*.7);
  const f=(x+offset(seed)+warp)/4000, t=f-Math.floor(f);
  const triangle=1-Math.abs(2*t-1);
  const p=Math.max(0,(triangle-.19)/.81);
  return 3000*Math.max(0,1-Math.abs(y)/30000)*(.45+.55*p);
}
export function slope(x,y,seed,fn=base){return rock.carvedSlopeTan(fn(x,y,seed),fn(x+125,y,seed),fn(x,y+125,seed));}
// Independent gradient fBm, beta 3.4 amplitude ratio per halving. The fixed scale
// amplitude 35 measures 1.9996726653 m RMS in the 250-500 m band using
// bandPowers on all tuning seeds, 1024 x 31.25 m at y = +/-6000.
function hash(x,y,s){let h=Math.imul(x,0x9e3779b1)^Math.imul(y,0x85ebca77)^s;h=Math.imul(h^(h>>>16),0x85ebca6b);return (h^(h>>>13))>>>0;}
function dot(h,x,y){return ((h&1?-x:x)+(h&2?-y:y))*.7071067811865475;}
function gn(x,y,s){const i=Math.floor(x),j=Math.floor(y),a=x-i,b=y-j,u=a*a*(3-2*a),v=b*b*(3-2*b);
  return (dot(hash(i,j,s),a,b)*(1-u)+dot(hash(i+1,j,s),a-1,b)*u)*(1-v)
    +(dot(hash(i,j+1,s),a,b-1)*(1-u)+dot(hash(i+1,j+1,s),a-1,b-1)*u)*v;}
export function background(x,y,seed){let sum=0,a=35,cell=500;for(let o=0;o<7;o++){sum+=a*gn((x+offset(seed))/cell,y/cell,seed+o*97);a*=2**(-1.2);cell/=2;}return sum;}
export function sample(x,y,seed,fn=rock.rockDetailM,height=base){const h=height(x,y,seed);return h+background(x,y,seed)+fn(x+offset(seed),y,h,height(x+125,y,seed),height(x,y+125,seed),rock.rockDetailSeed(seed));}
export function grid(seed,fn=rock.rockDetailM,{n=97,step=125,y0=0,height=base}={}){const h=new Float64Array(n*n);for(let j=0;j<n;j++)for(let i=0;i<n;i++)h[j*n+i]=sample((i-(n-1)/2)*step,y0+(j-(n-1)/2)*step,seed,fn,height);return rasterFromArray(h,n,step);}
// Square box means via a summed-area table. Even widths use an explicitly fixed
// [i-r,i+r) footprint for BOTH classes and every variant (4 and 16 pixels).
function boxes(h,n,width){const p=new Float64Array((n+1)*(n+1)),out=new Float64Array(n*n),s=n+1,r=width/2;
  for(let j=0;j<n;j++){let sum=0;for(let i=0;i<n;i++){sum+=h[j*n+i];p[(j+1)*s+i+1]=p[j*s+i+1]+sum;}}
  for(let j=r;j<n-r;j++)for(let i=r;i<n-r;i++)out[j*n+i]=(p[(j+r)*s+i+r]-p[(j-r)*s+i+r]-p[(j+r)*s+i-r]+p[(j-r)*s+i-r])/(width*width);
  return out;}
// Cache only input layers, shared by actual/no-rock/controls. Custom integration
// height callbacks own separate caches; no M1-M4 dependency enters this fixture.
const caches=new WeakMap();
export function layers(seed,n,step,y0=0,height=base){
  let cache=caches.get(height);if(!cache)caches.set(height,cache=new Map());
  const key=[seed,n,step,y0].join(':');if(cache.has(key))return cache.get(key);
  const h=new Float64Array(n*n),bg=new Float64Array(n*n),s=new Float64Array(n*n),hx=new Float64Array(n*n),hy=new Float64Array(n*n);
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){const k=j*n+i,x=(i-(n-1)/2)*step,y=y0+(j-(n-1)/2)*step;
    h[k]=height(x,y,seed);bg[k]=background(x,y,seed);hx[k]=height(x+125,y,seed);hy[k]=height(x,y+125,seed);s[k]=rock.carvedSlopeTan(h[k],hx[k],hy[k]);}
  const out={h,bg,s,hx,hy,n,step,y0,seed};cache.set(key,out);return out;
}
function composed(l,fn,detail=false,noBackground=false){const {h,bg,hx,hy,n,step,y0,seed}=l,out=new Float64Array(h.length),rs=rock.rockDetailSeed(seed);
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){const k=j*n+i,x=(i-(n-1)/2)*step+offset(seed),y=y0+(j-(n-1)/2)*step;
    const v=h[k]+(noBackground?0:bg[k])+fn(x,y,h[k],hx[k],hy[k],rs);out[k]=detail?v-h[k]:v;}return out;}
export function r1(seeds,fn=rock.rockDetailM,height=base){
  const sums=Array.from({length:3},()=>({ss:0,ff:0,ns:0,nf:0}));
  for(const seed of seeds){const n=257,l=layers(seed,n,31.25,seed%2?9000:-9000,height);
    const surface=composed(l,fn);
    for(let d=0;d<3;d++){const h=d?surface.map((v,k)=>v-l.h[k]):surface,a=boxes(h,n,4),b=boxes(h,n,16),o=sums[d],ba=d===2?boxes(l.bg,n,4):null,bb=d===2?boxes(l.bg,n,16):null;
      for(let j=8;j<n-8;j++)for(let i=8;i<n-8;i++){const k=j*n+i,s=l.s[k],v=a[k]-b[k];if(s>rock.MOUNTAIN_ROCK_DETAIL.SLOPE_FULL_TAN){o.ss+=v*v;o.ns++;}else if(s<rock.MOUNTAIN_ROCK_DETAIL.SLOPE_ZERO_TAN){const flat=d===2?ba[k]-bb[k]:v;o.ff+=flat*flat;o.nf++;}}}}
  const result=sums.map(({ss,ff,ns,nf})=>{const steepRms=Math.sqrt(ss/ns),flatRms=Math.sqrt(ff/nf);return {steepRms,flatRms,ratio:steepRms/flatRms,steepSamples:ns,flatSamples:nf};});
  return {R1:result[0],R1d:result[1],R1e:result[2]};}
export function fineSpectrum(seeds,fn=rock.rockDetailM,height=base){const powers=new Float64Array(4);
  for(const seed of seeds)for(const y of [-6000,6000]){const h=Float64Array.from({length:1024},(_,i)=>sample((i-512)*31.25,y,seed,fn,height)),p=bandPowers(h,31.25);
    for(let b=0;b<4;b++)powers[b]+=p.octave(125*2**b,250*2**b)/(seeds.length*2);}
  // Harness formula is fixed to slots 2..5: relocate fine slots, do not duplicate it.
  return {beta:betaFromOctaves([0,0,...powers]),octaveRms:Array.from(powers,Math.sqrt)};}
export function bandLimit(seeds,fn=rock.rockDetailM,direction="x"){let total=0,long=0;for(const [index,seed] of seeds.entries()){const y=173+index*5000;
  const p=bandPowers(Float64Array.from({length:1024},(_,i)=>{const x=(i-512)*31.25;const h=30000+(direction==="x"?x:y)*.7002075382097097;return fn(x+offset(seed),y,h,h+(direction==="x"?125*.7002075382097097:0),h+(direction==="y"?125*.7002075382097097:0),rock.rockDetailSeed(seed));}),31.25);
  total+=p.total;for(const f of p.freqPower.slice(1))if(f.wavelength>=1000)long+=f.power;}
  return long/total;}
export function coarseRows(seeds,fn=rock.rockDetailM,height=base){const degrees=[],fill=[],pits=[],all=[],baseFill=[],basePits=[];let flat=0,steep=0,count=0;
  for(const seed of seeds){const l=layers(seed,161,125,0,height),r=rasterFromArray(composed(l,fn),161,125),s=slopes(r,1);for(const v of s)degrees.push(v);
    const dp=depressions(r),pp=depressionPits(r);fill.push(dp.fill10Share);pits.push(pp.pitsPer1000km2);all.push(pp.allPitsPer1000km2);
    for(const v of l.s){flat+=v<rock.MOUNTAIN_ROCK_DETAIL.SLOPE_ZERO_TAN;steep+=v>rock.MOUNTAIN_ROCK_DETAIL.SLOPE_FULL_TAN;count++;}
    if(!l.drain){const br=rasterFromArray(l.h,161,125);l.drain=[depressions(br).fill10Share,depressionPits(br).pitsPer1000km2];}
    baseFill.push(l.drain[0]);basePits.push(l.drain[1]);}
  return {p50:q(degrees,.5),p90:q(degrees,.9),fill10ShareP50:q(fill,.5),pits025Per1000km2P50:q(pits,.5),allPitsINFO:q(all,.5),base:{flatShare:flat/count,steepShare:steep/count,fill10ShareP50:q(baseFill,.5),pits025Per1000km2P50:q(basePits,.5)}};}
export const zero=()=>0;
export function rows(seeds,fn=rock.rockDetailM,height=base){return {...r1(seeds,fn,height),R2_R5:coarseRows(seeds,fn,height),R3:fineSpectrum(seeds,fn,height),R4:bandLimit(seeds.slice(0,4),fn),R4y:bandLimit(seeds.slice(0,4),fn,"y")};}

import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
const SOURCE=readFileSync(new URL('../../src/mountain-rock-detail.ts',import.meta.url),'utf8');
export const loadVariant=(edit)=>import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(edit(SOURCE))).toString('base64'));
const gullyLine='const gully = gullies(alongM, acrossM, ex, ey, seed);';
export const speckleEdit=s=>s.replace('const shape = Math.max(0, Math.min(1, C.STRATA_WEIGHT * strata + C.RIB_WEIGHT * gully));','const shape = hash(Math.floor(alongM / 31.25), Math.floor(acrossM / 31.25), 0, seed) / 4294967295;');
const oldSource=readFileSync(new URL('../mountain-rock-detail.test.mjs',import.meta.url),'utf8').split('const ROUND2_SOURCE = String.raw`')[1].split('`;')[0];
const oldModule=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(oldSource)).toString('base64'));
export const round2=(x,y,h,hx,hy,seed)=>oldModule.rockDetailM(x,y,h,rock.carvedSlopeTan(h,hx,hy),seed);
export function finePits(seeds,fn=rock.rockDetailM,height=base){
  let fresh=0,baseCount=0,area=0;
  for(const seed of seeds){const n=257,l=layers(seed,n,31.25,seed%2?9000:-9000,height),h=composed(l,fn,false,true);
    const strict=(a,k)=>{for(const d of [-n-1,-n,-n+1,-1,1,n-1,n,n+1])if(!(a[k]<a[k+d]))return false;return true;};
    for(let j=1;j<n-1;j++)for(let i=1;i<n-1;i++){const k=j*n+i,b=strict(l.h,k);baseCount+=b;fresh+=!b&&strict(h,k);}
    area+=(n-2)*(n-2)*31.25*31.25/1e6;
  }return {newPitsPerKm2:fresh/area,basePitsPerKm2:baseCount/area,newPits:fresh,basePits:baseCount,areaKm2:area};
}
export function downhill(seeds,fn=rock.rockDetailM){
  const ratios=[],excess=[],smoothExamples=[];let kinkExcess=0,smoothExcess=0;
  for(let i=0;ratios.length<20000;i++){
    const seed=seeds[i%seeds.length],x=i*7919%400000-200000,y=i*3571%39000-19500,h=base(x,y,seed),hx=base(x+125,y,seed),hy=base(x,y+125,seed),gx=(hx-h)/125,gy=(hy-h)/125,s=Math.hypot(gx,gy);
    if(!(s>rock.MOUNTAIN_ROCK_DETAIL.SLOPE_ZERO_TAN))continue;
    const ex=-gx/s,ey=-gy/s,at=(xx,yy)=>fn(xx+offset(seed),yy,base(xx,yy,seed),base(xx+125,yy,seed),base(xx,yy+125,seed),rock.rockDetailSeed(seed));
    const ratio=(at(x+.5*ex,y+.5*ey)-at(x-.5*ex,y-.5*ey))/s;ratios.push(ratio);
    if(ratio>.6){const tx=(base(x+.5,y,seed)-base(x-.5,y,seed)),ty=base(x,y+.5,seed)-base(x,y-.5,seed),lag=Math.hypot(tx-gx,ty-gy),kink=lag>.01;
      if(kink)kinkExcess++;else {smoothExcess++;if(smoothExamples.length<8)smoothExamples.push({seed,x,y,ratio,gradientLag:lag});}if(excess.length<8)excess.push({seed,x,y,ratio,gradientLag:lag,kink});}
  }return {count:ratios.length,p50:q(ratios,.5),p99:q(ratios,.99),max:Math.max(...ratios),above06:kinkExcess+smoothExcess,kinkExcess,smoothExcess,examples:excess,smoothExamples};
}
export async function measurePool(seeds){
  const controlSeeds=seeds.slice(0,4),actual=rows(seeds),without=rows(seeds,zero);
  const always=await loadVariant(s=>s.replace('const weight = rockSlopeWeight(slopeTan);','const weight = 1;'));
  const deep=await loadVariant(s=>s.replace(/MAX_DEPTH_M: [\d.]+/,`MAX_DEPTH_M: ${4*rock.MOUNTAIN_ROCK_DETAIL.MAX_DEPTH_M}`).replace(/KAPPA: [\d.]+/,`KAPPA: ${4*rock.MOUNTAIN_ROCK_DETAIL.KAPPA}`));
  const equalOld=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(oldSource.replace('GAIN: 0.5','GAIN: 1'))).toString('base64'));
  const equal=(x,y,h,hx,hy,seed)=>equalOld.rockDetailM(x,y,h,rock.carvedSlopeTan(h,hx,hy),seed);
  const speckle=await loadVariant(s=>speckleEdit(s).replace('const result = -weight * depth * shape;','const result = -4 * weight * depth * shape;'));
  const shallow=await loadVariant(s=>s.replace('const result = -weight * depth * shape;','const result = -0.1 * weight * depth * shape;'));
  // Extra smooth 4 km gradient-noise octave (the frozen round-2 noise helper).
  const noiseCode=oldSource.slice(oldSource.indexOf('function gradient('),oldSource.indexOf('function ribs('));
  const long=await loadVariant(s=>s.replace('const shape = Math.max(0, Math.min(1, C.STRATA_WEIGHT * strata + C.RIB_WEIGHT * gully));','const shape = (strata + 4 * (1 - Math.abs(noise(alongM / 4000, acrossM / 4000, 99, seed)))) / 5;')+'\n'+noiseCode);
  const reversed=await loadVariant(s=>s.replace('const strata = bench(t, riserWidthM * slopeTan / C.STRATA_PERIOD_M);','const strata = (3 * C.STRATA_PERIOD_M * C.BENCH_RISE / (C.MAX_DEPTH_M * C.STRATA_WEIGHT)) * bench(t, riserWidthM * slopeTan / C.STRATA_PERIOD_M);'));
  actual.R6=finePits(seeds);actual.R7=downhill(seeds);
  const kernel=await loadVariant(s=>s+'\nexport {gullies};');let sum=0,count=0;
  for(const seed of seeds)for(let j=0;j<128;j++)for(let i=0;i<128;i++){sum+=kernel.gullies(offset(seed)+(i-64)*37.5,(j-64)*37.5,-1,0,rock.rockDetailSeed(seed));count++;}
  actual.meanGully={mean:sum/count,count,planeSlopeTan:.7002075382097097,direction:[-1,0]};
  return {actual,without,controlSeeds,controls:{shallowR1:r1(controlSeeds,shallow.rockDetailM),alwaysWeightR1:r1(controlSeeds,always.rockDetailM),alwaysWeightR5:coarseRows(controlSeeds,always.rockDetailM),depth4R2:coarseRows(controlSeeds,deep.rockDetailM),equalGainsR3:fineSpectrum(controlSeeds,equal),speckleR3:fineSpectrum(controlSeeds,speckle.rockDetailM),longR4:bandLimit(controlSeeds,long.rockDetailM),reversedR5:coarseRows(controlSeeds,reversed.rockDetailM),round2R6:finePits(seeds,round2),round2R7:downhill(seeds,round2)}};
}

