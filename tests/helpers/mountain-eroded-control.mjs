// Test-only, pure offline control. No candidate dependency or file I/O.
import {raster, rasterFromArray, syntheticSampler, flowAccumulationD8} from './mountain-metrics.mjs';

export const ERODED_CONTROL_VERSION = 'mountain-eroded-control-1';
export const ERODED_CONTROL = Object.freeze({radiusM:5194907,n:1025,stepM:125,cropN:385,steps:3,kDt:0.8,m:0.5,nExponent:1,diffusion:0});
export const CONTROL_SITES = Object.freeze([[1,0,0],[0,1,0],[0,0,1],[-1,0,0]].map(d=>Object.freeze({d:Object.freeze(d)})));

// Receiver accumulation exceeds donor accumulation, including on filled flats:
// descending accumulation is an outlet-to-upstream topological ordering.
// Fill is part of each step; the implicit incision starts from this filled h.
export function erodeRaster(input) {
  let r=rasterFromArray(input.h,input.n,input.step);
  for(let pass=0;pass<ERODED_CONTROL.steps;pass++){
    const {filled,receiver,accumulation}=flowAccumulationD8(r),h=filled.slice();
    const order=Array.from({length:h.length},(_,i)=>i).sort((a,b)=>accumulation[b]-accumulation[a]||a-b);
    for(const i of order){const p=receiver[i];if(p<0)continue;
      const dx=i%r.n-p%r.n,dy=Math.floor(i/r.n)-Math.floor(p/r.n);
      const dist=r.step*Math.sqrt(dx*dx+dy*dy),A=accumulation[i]*r.step*r.step;
      const F=ERODED_CONTROL.kDt*Math.sqrt(A)/dist;
      h[i]=(filled[i]+F*h[p])/(1+F);
    }
    r=rasterFromArray(h,r.n,r.step);
  }
  return r;
}

export function centralCrop(r,n=ERODED_CONTROL.cropN){
  if(n>r.n||(r.n-n)%2)throw new RangeError('Expected centred integer crop');
  const o=(r.n-n)/2,h=new Float64Array(n*n);
  for(let y=0;y<n;y++)h.set(r.h.subarray((y+o)*r.n+o,(y+o)*r.n+o+n),y*n);
  return rasterFromArray(h,n,r.step);
}

export function buildErodedControl(site=0,n=ERODED_CONTROL.n){
  const original=raster(syntheticSampler(ERODED_CONTROL.radiusM,'alpine'),CONTROL_SITES[site].d,ERODED_CONTROL.radiusM,n,ERODED_CONTROL.stepM);
  return {original,eroded:erodeRaster(original)};
}
