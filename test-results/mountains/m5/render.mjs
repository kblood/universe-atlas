// CPU-only visual evidence. This does not judge or tune the held-out candidate.
import {grid,zero} from '../../../tests/helpers/mountain-rock-detail-fixture.mjs';
import {hillshade,writePng,rasterFromArray} from '../../../tests/helpers/mountain-metrics.mjs';
import {MOUNTAIN_ROCK_DETAIL as C} from '../../../src/mountain-rock-detail.ts';
const seed=730901,options={n:385,step:31.25,y0:9000};
const before=grid(seed,zero,options),after=grid(seed,undefined,options);
for(const [name,r] of [['without',before],['with',after]])writePng(new URL(name+'.png',import.meta.url),r.n,r.n,hillshade(r,3000));
const delta=rasterFromArray(after.h.map((v,i)=>v-before.h[i]),after.n,after.step),rgb=Buffer.alloc(delta.h.length*3);
for(let i=0;i<delta.h.length;i++){const v=Math.round(255*Math.max(0,Math.min(1,-delta.h[i]/C.MAX_DEPTH_M)));rgb[3*i]=rgb[3*i+1]=rgb[3*i+2]=v;}
writePng(new URL('rock-depth.png',import.meta.url),delta.n,delta.n,rgb);
console.log(JSON.stringify({seed,extentM:12000,stepM:31.25,depthMap:`black=0 m, white=${C.MAX_DEPTH_M} m incision`,files:['without.png','with.png','rock-depth.png']}));
