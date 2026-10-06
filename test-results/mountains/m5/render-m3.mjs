// CPU-only visual evidence on the REAL M3 ramp (seed 730201, site 1 region), without and with M5.
// U and the belt flag are held at the sample for the +125 m slope offsets, as the T6 patch does. Not a gate.
import {ridgeValleyCarvingM} from '../../../src/mountain-carving.ts';
import {rockDetailM,rockDetailSeed} from '../../../src/mountain-rock-detail.ts';
import {hillshade,writePng,rasterFromArray} from '../../../tests/helpers/mountain-metrics.mjs';
const seed=730201,n=385,step=31.25,x0=1000,y0=6000,rs=rockDetailSeed(seed);
const U=y=>3000*Math.max(0,1-Math.abs(y)/30000);
const carved=(x,y)=>{const u=U(y);return u+ridgeValleyCarvingM(x,y,30000,u,Math.abs(y)<30000?1:0,seed);};
const a=new Float64Array(n*n),b=new Float64Array(n*n);
for(let j=0;j<n;j++)for(let i=0;i<n;i++){const x=x0+(i-(n-1)/2)*step,y=y0+(j-(n-1)/2)*step,h=carved(x,y);
  a[j*n+i]=h;const u=U(y),bl=Math.abs(y)<30000?1:0;b[j*n+i]=h+rockDetailM(x,y,h,u+ridgeValleyCarvingM(x+125,y,30000,u,bl,seed),u+ridgeValleyCarvingM(x,y+125,30000,u,bl,seed),rs);}
for(const [name,h] of [['m3-without',a],['m3-with',b]])writePng(new URL(name+'.png',import.meta.url),n,n,hillshade(rasterFromArray(h,n,step),3000));
let min=0;for(let k=0;k<a.length;k++)min=Math.min(min,b[k]-a[k]);
console.log(JSON.stringify({seed,extentM:12000,stepM:step,centre:[x0,y0],minDetailM:min,files:['m3-without.png','m3-with.png']}));
