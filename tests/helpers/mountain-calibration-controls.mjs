// M3 row calibration controls (owner decision (a), 2026-10-05). Test/calibration only: never imported
// by src/. Pure, deterministic, no I/O except loading the frozen A0 fixture source.
//
// Positive controls (physically eroded):
//  - steadyStateStrip(): detachment-limited stream power at steady state (n=1, m=0.5, dt -> infinity)
//    on the section 2.3 ramp geometry: a periodic 384 km strip along the belt axis, base level fixed at
//    |across| >= 30 km, uplift uniform or tent-shaped (envelope). Flow network re-derived each
//    iteration by priority flood. Optional threshold hillslopes (Sc). Rescaled to a 3 km crest.
//  - resampledErodedControl(): the frozen MTN-4 eroded alpine control (mountain-eroded-control.mjs)
//    bilinearly resampled at sub-cell offsets, because the planet sampler never lands on a
//    construction grid.
// Negative controls: isotropic noise (alpine, dome, noiseCarve), straight mirrored fans (A0, the
// rejected first M3 carving, frozen in tests/fixtures/mountain-carving-a0-rejected.ts.txt), its
// parallel-comb B0, and the un-eroded alpine control.
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {syntheticSampler,rasterFromArray} from './mountain-metrics.mjs';
import {buildErodedControl,centralCrop} from './mountain-eroded-control.mjs';

export const CALIBRATION_CONTROLS_VERSION='mountain-m3-calibration-controls-1';
export const RAMP=Object.freeze({R:5194907,W:30000,crestM:3000,L:384000});
const {R,W,L}=RAMP;

function hash(i,j,k){let h=Math.imul(i,0x9e3779b1)^Math.imul(j,0x85ebca77)^Math.imul(k,0xc2b2ae3d);h=Math.imul(h^(h>>>16),0x85ebca6b);h=Math.imul(h^(h>>>13),0xc2b2ae35);return ((h^(h>>>16))>>>0)/4294967295;}

/** Steady-state stream-power ramp strip. Returns {h,nx,ny,s,L} with x = along (periodic), y = across. */
export function steadyStateStrip({uplift='uniform',seed=1,sc=0,step=250,iters=40,noise=0.02}={}){
  const s=step,nx=Math.round(L/s),ny=2*Math.round(34000/s)+1,N=nx*ny,yOf=j=>(j-(ny-1)/2)*s;
  const fixed=new Uint8Array(N),U=new Float64Array(N);
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const k=j*nx+i,y=Math.abs(yOf(j));fixed[k]=y>=W?1:0;
    U[k]=fixed[k]?0:uplift==='uniform'?1:(1-y/W);}
  const h=new Float64Array(N);for(let k=0;k<N;k++)if(!fixed[k]){const j=Math.floor(k/nx),i=k%nx;h[k]=(1-Math.abs(yOf(j))/W)*1+noise*hash(i,j,seed);}
  const hk=new Float64Array(N+8),hi=new Int32Array(N+8);let hn=0;
  const push=(v,c)=>{let k=hn++;while(k>0){const p=(k-1)>>1;if(hk[p]<=v)break;hk[k]=hk[p];hi[k]=hi[p];k=p;}hk[k]=v;hi[k]=c;};
  const pop=()=>{const c=hi[0];const v=hk[--hn],ci=hi[hn];let k=0;for(;;){let a=2*k+1;if(a>=hn)break;if(a+1<hn&&hk[a+1]<hk[a])a++;if(hk[a]>=v)break;hk[k]=hk[a];hi[k]=hi[a];k=a;}hk[k]=v;hi[k]=ci;return c;};
  const nb=(c,f)=>{const i=c%nx,j=(c-i)/nx;for(let dy=-1;dy<=1;dy++){const jj=j+dy;if(jj<0||jj>=ny)continue;for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const ii=(i+dx+nx)%nx;f(jj*nx+ii,dx&&dy?Math.SQRT2*s:s);}}};
  const order=new Int32Array(N),rcv=new Int32Array(N),rd=new Float64Array(N),acc=new Float64Array(N),done=new Uint8Array(N);
  const route=()=>{done.fill(0);hn=0;let o=0;
    for(let k=0;k<N;k++)if(fixed[k]){done[k]=1;push(h[k],k);rcv[k]=-1;}
    while(hn){const c=pop();order[o++]=c;nb(c,k=>{if(done[k])return;done[k]=1;if(h[k]<=h[c])h[k]=h[c]+1e-9*(1+Math.abs(h[c]));push(h[k],k);});}
    for(let k=0;k<N;k++){if(fixed[k])continue;let best=0,t=-1,td=0;nb(k,(m,d)=>{const sl=(h[k]-h[m])/d;if(sl>best){best=sl;t=m;td=d;}});rcv[k]=t;rd[k]=td;}
    acc.fill(1);for(let o2=N-1;o2>=0;o2--){const c=order[o2];if(rcv[c]>=0)acc[rcv[c]]+=acc[c];}};
  for(let it=0;it<iters;it++){route();
    for(let o=0;o<N;o++){const c=order[o];if(fixed[c])continue;h[c]=h[rcv[c]]+U[c]*rd[c]/Math.sqrt(acc[c]*s*s);}}
  let mx=0;for(let k=0;k<N;k++)mx=Math.max(mx,h[k]);const scale=RAMP.crestM/mx;for(let k=0;k<N;k++)h[k]*=scale;
  if(sc>0)for(let o=0;o<N;o++){const c=order[o];if(fixed[c])continue;h[c]=Math.min(h[c],h[rcv[c]]+sc*rd[c]);}
  return {h,nx,ny,s,L};
}

/** Planet sampler of a strip on the ramp chart (bilinear, periodic along). offx/offy (metres) shift
 * the chart so sample points do not land on the construction grid. */
export function stripSampler({h,nx,ny,s,L:len},{offx=0,offy=0}={}){
  return d=>{let c=R*Math.asin(d[1]),a=R*Math.atan2(d[2],d[0]);if(Math.abs(c)>=W)return {groundHeightM:0,ocean:false};
    a+=offx;c+=offy;if(Math.abs(c)>=W)return {groundHeightM:0,ocean:false};a=((a%len)+len)%len;
    const x=a/s,y=c/s+(ny-1)/2,ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,i0=ix%nx,i1=(ix+1)%nx;
    return {groundHeightM:(h[iy*nx+i0]*(1-fx)+h[iy*nx+i1]*fx)*(1-fy)+(h[(iy+1)*nx+i0]*(1-fx)+h[(iy+1)*nx+i1]*fx)*fy,ocean:false};};
}

const rampEnvelope=d=>{const c=R*Math.asin(d[1]);return RAMP.crestM*Math.max(0,1-Math.abs(c)/W);};
/** Isotropic noise CARVING on the ramp: envelope*(1-0.6*nn), nn the normalised alpine control. */
export function noiseCarveSampler(){const al=syntheticSampler(R,'alpine');
  return d=>{const nn=Math.min(1,Math.max(0,(al(d).groundHeightM-200)/4500));return {groundHeightM:rampEnvelope(d)*(1-0.6*nn),ocean:false};};}

/** The rejected first M3 carving (A0 straight mirrored fans, B0 parallel cosine combs), frozen. */
export async function loadRejectedA0(){
  let src=readFileSync(new URL('../fixtures/mountain-carving-a0-rejected.ts.txt',import.meta.url),'utf8');
  src=src.replace("'./det-math.ts'","'"+new URL('../../src/det-math.ts',import.meta.url).href+"'");
  return import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(src)).toString('base64'));
}
/** Ramp sampler for a carving function with the section 2.3 argument order. */
export function rampCarvingSampler(fn,seedBase=730201){
  return d=>{const across=R*Math.asin(d[1]),along=R*Math.atan2(d[2],d[0]),e=rampEnvelope(d);
    const h=e+fn(along,across,W,e,Math.abs(across)<W?1:0,(seedBase+Math.round(along/1e6))>>>0);return {groundHeightM:h,ocean:h<0};};
}

export const RESAMPLE_OFFSETS=Object.freeze([[0,0],[.5,0],[.296,.424],[.728,.136]]);
/** Frozen eroded (or un-eroded) alpine control resampled at a sub-cell offset, cropped like MTN-4. */
export function resampledErodedControl(site,[ox,oy],which='eroded'){
  const b=buildErodedControl(site),g=which==='eroded'?b.eroded:b.original,n=g.n,h=new Float64Array(n*n);
  for(let j=0;j<n-1;j++)for(let i=0;i<n-1;i++){const a=j*n+i;h[a]=(g.h[a]*(1-ox)+g.h[a+1]*ox)*(1-oy)+(g.h[a+n]*(1-ox)+g.h[a+n+1]*ox)*oy;}
  for(let i=0;i<n;i++){h[(n-1)*n+i]=g.h[(n-1)*n+i];h[i*n+n-1]=g.h[i*n+n-1];}
  return centralCrop(rasterFromArray(h,n,g.step));
}
