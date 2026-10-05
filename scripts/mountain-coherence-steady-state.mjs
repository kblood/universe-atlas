// Coherence well-posedness probe (round 4). Steady-state stream power on the section 2.3 ramp, then all
// eight rows via measureSites (bilinear sampler, grid-aligned sites). --uplift uniform|envelope.
// Coherence well-posedness probe: is coherence >= 0.35 reachable by a PHYSICALLY eroded linear range
// on the section 2.3 ramp geometry? Stream-power steady state (n=1, m=0.5) on a periodic-along strip,
// base level fixed at the belt margin (|across| >= W). Measured with the harness's own coherence()
// on a 193x193 raster at 2 km point samples, exactly as measureSites builds the regional raster.
import {coherence,q,hillshade,writePng,measureSites,judgeM3} from '../tests/helpers/mountain-metrics.mjs';
const arg=(k,d)=>{const i=process.argv.indexOf('--'+k);return i>0?process.argv[i+1]:d;};
const W=30000,s=+arg('step',250),L=384000,nx=Math.round(L/s),ny=2*Math.round(34000/s)+1;
const seed=+arg('seed',1),uplift=arg('uplift','uniform'),iters=+arg('iters',40),noiseAmp=+arg('noise',0.02);
const N=nx*ny,yOf=j=>(j-(ny-1)/2)*s;
function hash(i,j,k){let h=Math.imul(i,0x9e3779b1)^Math.imul(j,0x85ebca77)^Math.imul(k,0xc2b2ae3d);h=Math.imul(h^(h>>>16),0x85ebca6b);h=Math.imul(h^(h>>>13),0xc2b2ae35);return ((h^(h>>>16))>>>0)/4294967295;}
const fixed=new Uint8Array(N),U=new Float64Array(N);
for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const k=j*nx+i,y=Math.abs(yOf(j));fixed[k]=y>=W?1:0;
  U[k]=fixed[k]?0:uplift==='uniform'?1:(1-y/W);}
let h=new Float64Array(N);for(let k=0;k<N;k++)if(!fixed[k]){const j=Math.floor(k/nx),i=k%nx;h[k]=(1-Math.abs(yOf(j))/W)*1+noiseAmp*hash(i,j,seed);}
// typed binary heap
const hk=new Float64Array(N+8),hi=new Int32Array(N+8);let hn=0;
const push=(v,c)=>{let k=hn++;while(k>0){const p=(k-1)>>1;if(hk[p]<=v)break;hk[k]=hk[p];hi[k]=hi[p];k=p;}hk[k]=v;hi[k]=c;};
const pop=()=>{const c=hi[0];const v=hk[--hn],ci=hi[hn];let k=0;for(;;){let a=2*k+1;if(a>=hn)break;if(a+1<hn&&hk[a+1]<hk[a])a++;if(hk[a]>=v)break;hk[k]=hk[a];hi[k]=hi[a];k=a;}hk[k]=v;hi[k]=ci;return c;};
const nb=(c,f)=>{const i=c%nx,j=(c-i)/nx;for(let dy=-1;dy<=1;dy++){const jj=j+dy;if(jj<0||jj>=ny)continue;for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const ii=(i+dx+nx)%nx;f(jj*nx+ii,dx&&dy?Math.SQRT2*s:s);}}};
const order=new Int32Array(N),rcv=new Int32Array(N),rd=new Float64Array(N),acc=new Float64Array(N),done=new Uint8Array(N);
function route(){done.fill(0);hn=0;let o=0;
  for(let k=0;k<N;k++)if(fixed[k]){done[k]=1;push(h[k],k);rcv[k]=-1;}
  while(hn){const c=pop();order[o++]=c;nb(c,(k)=>{if(done[k])return;done[k]=1;if(h[k]<=h[c])h[k]=h[c]+1e-9*(1+Math.abs(h[c]));push(h[k],k);});}
  for(let k=0;k<N;k++){if(fixed[k])continue;let best=0,t=-1,td=0;nb(k,(m,d)=>{const sl=(h[k]-h[m])/d;if(sl>best){best=sl;t=m;td=d;}});rcv[k]=t;rd[k]=td;}
  acc.fill(1);for(let o2=N-1;o2>=0;o2--){const c=order[o2];if(rcv[c]>=0)acc[rcv[c]]+=acc[c];}
}
// dt -> infinity: h_i = h_rcv + U_i * dist / (A^m) (n=1, m=.5, K=1). Network re-derived each iteration.
let prevR=null,changed=0;
for(let it=0;it<iters;it++){route();
  for(let o=0;o<N;o++){const c=order[o];if(fixed[c])continue;const A=acc[c]*s*s;h[c]=h[rcv[c]]+U[c]*rd[c]/Math.sqrt(A);}
  if(prevR){changed=0;for(let k=0;k<N;k++)changed+=rcv[k]!==prevR[k];}
  prevR=Int32Array.from(rcv);
  if(it%5===4||it===iters-1)console.error(`iter ${it} receivers changed ${changed}`);
}
// threshold hillslopes optional: cap the slope to the receiver at Sc (applied in order after rescale)
let mx=0;for(let k=0;k<N;k++)mx=Math.max(mx,h[k]);const scale=3000/mx;for(let k=0;k<N;k++)h[k]*=scale;
const Sc=+arg('sc',0);if(Sc>0){for(let o=0;o<N;o++){const c=order[o];if(fixed[c])continue;h[c]=Math.min(h[c],h[rcv[c]]+Sc*rd[c]);}}
// regional raster: 193x193, 2 km, y = across, x = along (periodic)
// Regional 193x193 raster at 2 km; y = across, x = along (periodic). box=0: point sample (harness).
// box=b>0: area mean over a b km square (low-pass), still sampled every 2 km - diagnostic only.
const n=193,st=2000,sub=st/s;
function regional(boxM){const R=new Float64Array(n*n),hw=Math.round(boxM/s/2);
  for(let j=0;j<n;j++){const y=(j-96)*st;const jj=Math.round(y/s+(ny-1)/2);
    for(let i=0;i<n;i++){if(jj<0||jj>=ny){R[j*n+i]=0;continue;}const ii=(i*sub)%nx;
      if(!hw){R[j*n+i]=h[jj*nx+ii];continue;}let sum=0,c=0;
      for(let dy=-hw;dy<=hw;dy++){const y2=jj+dy;const v=y2<0||y2>=ny?0:null;for(let dx=-hw;dx<=hw;dx++){sum+=v===null?h[y2*nx+((ii+dx+nx)%nx)]:0;c++;}}
      R[j*n+i]=sum/c;}}
  return R;}
const res={step:s,seed,uplift,iters,changed,sc:Sc};
for(const b of [0,2000,4000,8000]){const coh=coherence({h:regional(b),n,step:st},10);res['coh_box'+b/1000+'km']=+q(coh,.5).toFixed(3);res.windows=coh.length;}
console.log(JSON.stringify(res));
const out=arg('png',null);if(out){// whole strip hillshade, along x (first 192 km), across y
  const w=Math.min(nx,Math.round(192000/s)),rgb=Buffer.alloc(w*ny*3);const lx=Math.cos(35*Math.PI/180)*Math.sin(315*Math.PI/180),ly=Math.cos(35*Math.PI/180)*Math.cos(315*Math.PI/180),lz=Math.sin(35*Math.PI/180);
  for(let j=0;j<ny;j++)for(let i=0;i<w;i++){const k=j*nx+i;const gx=(h[j*nx+(i+1)%nx]-h[j*nx+(i-1+nx)%nx])/(2*s),gy=(h[Math.min(ny-1,j+1)*nx+i]-h[Math.max(0,j-1)*nx+i])/(2*s);
    const l=Math.hypot(gx,gy,1),sh=Math.max(0,(-gx*lx+gy*ly+lz)/l),v=Math.min(255,(150+80*h[k]/5000)*(.25+.85*sh));const o=((ny-1-j)*w+i)*3;rgb[o]=rgb[o+1]=rgb[o+2]=v;}
  writePng(out,w,ny,rgb);}
if(arg('dump',null)){const fs=await import('node:fs');fs.writeFileSync(arg('dump'),Buffer.from(h.buffer));console.error('dump',nx,ny,s);}
{const R0=5194907;function ts(d){const c=R0*Math.asin(d[1]);let a=R0*Math.atan2(d[2],d[0]);if(Math.abs(c)>=W)return {groundHeightM:0,ocean:false};
  a=((a%L)+L)%L;const x=a/s,y=c/s+(ny-1)/2,ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,i0=ix%nx,i1=(ix+1)%nx;
  return {groundHeightM:(h[iy*nx+i0]*(1-fx)+h[iy*nx+i1]*fx)*(1-fy)+(h[(iy+1)*nx+i0]*(1-fx)+h[(iy+1)*nx+i1]*fx)*fy,ocean:false};}
 const SITES=Array.from({length:8},(_,k)=>({d:[Math.cos(k*1e6/R0),0,Math.sin(k*1e6/R0)]}));
 const met=measureSites(ts,SITES,R0);console.log('ROWS '+JSON.stringify(Object.fromEntries(judgeM3(met).map(r=>[r.id,[r.actual,r.pass?'P':'F']]))));}
