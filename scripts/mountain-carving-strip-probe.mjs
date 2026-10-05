// Probe (not a candidate): drainage-tree-first strip on the section 2.3 ramp. Whole periodic strip,
// so NOT tile-independent; it tells us whether this family can pass the eight rows at all.
import {measureSites,judgeM3,hillshade,writePng,raster,flowAccumulationD8} from '../tests/helpers/mountain-metrics.mjs';
const arg=(k,d)=>{const i=process.argv.indexOf('--'+k);return i>0?process.argv[i+1]:d;};
const R=5194907,W=30000,s=+arg('step',125),L=384000,nx=Math.round(L/s),ny=2*Math.round(31000/s)+1,N=nx*ny;
const seed=+arg('seed',1),tilt=+arg('tilt',1),noiseAmp=+arg('noise',400),Sc=+arg('sc',0.75),m=+arg('m',0.5),reroute=+arg('reroute',0),conn=+arg('conn',8);
const OFFX=+arg('offx',0),OFFY=+arg('offy',0);const WAND=+arg('wander',0);const FOOT=+arg('foot',0);const scAt=k=>FOOT>0?Sc*Math.min(1,3000*e0[k]/FOOT):Sc;const ANI=+arg('aniso',1);const yOf=j=>(j-(ny-1)/2)*s;
function hash(i,j,k){let h=Math.imul(i,0x9e3779b1)^Math.imul(j,0x85ebca77)^Math.imul(k,0xc2b2ae3d)^Math.imul(seed,0x27d4eb2d);h=Math.imul(h^(h>>>16),0x85ebca6b);h=Math.imul(h^(h>>>13),0xc2b2ae35);return ((h^(h>>>16))>>>0)/4294967295;}
// periodic value noise (smoothstep) on lattice spacing lam (lam divides L)
function vnoise(a,c,lam,o){const lx=lam*ANI,P=Math.round(L/lx),x=a/lx,y=c/lam,ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;const u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);
  const g=(i,j)=>hash(((i%P)+P)%P,j,o)*2-1;return (g(ix,iy)*(1-u)+g(ix+1,iy)*u)*(1-v)+(g(ix,iy+1)*(1-u)+g(ix+1,iy+1)*u)*v;}
const fixed=new Uint8Array(N),e0=new Float64Array(N),init=new Float64Array(N);
for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const k=j*nx+i,c=yOf(j),a=i*s;e0[k]=Math.max(0,1-Math.abs(c)/W);fixed[k]=e0[k]===0?1:0;
  let n=0,amp=1,norm=0;for(let o=0;o<6;o++){const lam=8000/2**o;n+=amp*vnoise(a,c,lam,o+1);norm+=amp;amp*=.6;}
  const wd=WAND*(vnoise(a,0,48000,99)*.7+vnoise(a,0,24000,98)*.3),ew=WAND?Math.max(0,1-Math.abs(c-wd)/W):e0[k];init[k]=fixed[k]?0:tilt*3000*ew+noiseAmp*n/norm;}
const hk=new Float64Array(N+8),hi=new Int32Array(N+8);let hn=0;
const push=(v,c)=>{let k=hn++;while(k>0){const p=(k-1)>>1;if(hk[p]<=v)break;hk[k]=hk[p];hi[k]=hi[p];k=p;}hk[k]=v;hi[k]=c;};
let curV=0;const pop=()=>{const c=hi[0];curV=hk[0];const v=hk[--hn],ci=hi[hn];let k=0;for(;;){let a=2*k+1;if(a>=hn)break;if(a+1<hn&&hk[a+1]<hk[a])a++;if(hk[a]>=v)break;hk[k]=hk[a];hi[k]=hi[a];k=a;}hk[k]=v;hi[k]=ci;return c;};
const nb=(c,f)=>{const i=c%nx,j=(c-i)/nx;for(let dy=-1;dy<=1;dy++){const jj=j+dy;if(jj<0||jj>=ny)continue;for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;if(conn===4&&dx&&dy)continue;const ii=(i+dx+nx)%nx;f(jj*nx+ii,dx&&dy?Math.SQRT2*s:s);}}};
const K16=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1],[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]];
const nb16=(c,f)=>{const i=c%nx,j=(c-i)/nx;for(const [dx,dy] of K16){const jj=j+dy;if(jj<0||jj>=ny)continue;f(jj*nx+((i+dx+nx)%nx),s*Math.sqrt(dx*dx+dy*dy));}};
const order=new Int32Array(N),rcv=new Int32Array(N),rd=new Float64Array(N),acc=new Float64Array(N),done=new Uint8Array(N);
// Tree = flood parent of a priority flood over `key` from the margin (lakes drain through their spill).
function treeFlood(key){done.fill(0);hn=0;let o=0;rcv.fill(-1);
  for(let k=0;k<N;k++)if(fixed[k]){done[k]=1;push(-1,k);}
  while(hn){const c=pop();order[o++]=c;nb(c,(k,d)=>{if(done[k])return;done[k]=1;rcv[k]=c;rd[k]=d;push(Math.max(key[k],curV),k);});}
  acc.fill(1);for(let q=N-1;q>=0;q--){const c=order[q];if(rcv[c]>=0)acc[rcv[c]]+=acc[c];}}
function tree(key){const f=Float64Array.from(key);done.fill(0);hn=0;let o=0;rcv.fill(-1);
  for(let k=0;k<N;k++)if(fixed[k]){done[k]=1;f[k]=0;push(-1,k);}
  while(hn){const c=pop();order[o++]=c;nb(c,(k,d)=>{if(done[k])return;done[k]=1;if(f[k]<=f[c])f[k]=f[c]+1e-6;push(f[k],k);});}
  for(let k=0;k<N;k++){if(fixed[k])continue;let best=0,t=-1,td=0;nb(k,(q,d)=>{const sl=(f[k]-f[q])/d;if(sl>best){best=sl;t=q;td=d;}});rcv[k]=t;rd[k]=td;}
  acc.fill(1);for(let q=N-1;q>=0;q--){const c=order[q];if(rcv[c]>=0)acc[rcv[c]]+=acc[c];}}
const Ac=+arg('ac',0)*1e6;
// hillslopes: multi-source Dijkstra from channel cells (A>=Ac) with cost Sc*distance (octagonal metric)
const dist=new Float64Array(N);
function hillslopes(){if(!(Ac>0))return;hn=0;for(let k=0;k<N;k++){if(fixed[k]||acc[k]*s*s>=Ac){dist[k]=h[k];push(h[k],k);}else dist[k]=Infinity;}
  while(hn){const v=hk[0],c=pop();if(v>dist[c])continue;nb16(c,(k,d)=>{const nv=v+scAt(k)*d;if(nv<dist[k]){dist[k]=nv;push(nv,k);}});}
  for(let k=0;k<N;k++)h[k]=dist[k];}
let h=new Float64Array(N);
function heights(K){for(let q=0;q<N;q++){const c=order[q];if(fixed[c]){h[c]=0;continue;}h[c]=h[rcv[c]]+rd[c]*Math.min(scAt(c),K/Math.pow(acc[c]*s*s,m));}}
// choose K so that p99 of h/e0 over the core ~ 1 (sim relief matches the envelope), by bisection
function fitK(){const H=()=>{};let lo=1e-3,hi2=1e6;for(let it=0;it<22;it++){const K=Math.sqrt(lo*hi2);heights(K);hillslopes();const r=[];for(let k=0;k<N;k+=7)if(e0[k]>.35)r.push(h[k]/(3000*e0[k]));r.sort((a,b)=>a-b);const p=r[Math.floor(+arg('pfit',.9)*(r.length-1))];if(p>1)hi2=K;else lo=K;}return Math.sqrt(lo*hi2);}
tree(init);let K=fitK();heights(K);hillslopes();
for(let r=0;r<reroute;r++){tree(h.slice());K=fitK();heights(K);hillslopes();}
const fin=new Float64Array(N);let clipped=0,core=0;for(let k=0;k<N;k++){fin[k]=Math.min(h[k],3000*e0[k]);if(e0[k]>.35){core++;clipped+=h[k]>=3000*e0[k];}}
// sampler (bilinear) on the sphere chart used by the harness ramp
function ts(d){let c=R*Math.asin(d[1]);let a=R*Math.atan2(d[2],d[0]);if(Math.abs(c)>=W)return {groundHeightM:0,ocean:false};
  a=a+OFFX;c=c+OFFY;if(Math.abs(c)>=W)return {groundHeightM:0,ocean:false};a=((a%L)+L)%L;const x=a/s,y=c/s+(ny-1)/2,ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,i0=ix%nx,i1=(ix+1)%nx;
  const v=(fin[iy*nx+i0]*(1-fx)+fin[iy*nx+i1]*fx)*(1-fy)+(fin[(iy+1)*nx+i0]*(1-fx)+fin[(iy+1)*nx+i1]*fx)*fy;return {groundHeightM:v,ocean:false};}
const SITES=Array.from({length:8},(_,k)=>({d:[Math.cos(k*1e6/R),0,Math.sin(k*1e6/R)]}));
let first=null;const met=measureSites(ts,SITES,R,{onRaster:(r,reg,si)=>{if(si===0)first=r;}});
const rows=Object.fromEntries(judgeM3(met).map(r=>[r.id,[r.actual,r.pass?'P':'F']]));
console.log(JSON.stringify({seed,tilt,noiseAmp,Sc,m,reroute,conn,K:+K.toPrecision(4),clippedCoreShare:+(clipped/core).toFixed(3),rows}));
const out=arg('png',null);if(out){writePng(out+'-site0.png',first.n,first.n,hillshade(first,5000));
  const w=Math.min(nx,Math.round(96000/s)),y0=0,rgb=Buffer.alloc(w*ny*3),lx=Math.cos(35*Math.PI/180)*Math.sin(315*Math.PI/180),ly=Math.cos(35*Math.PI/180)*Math.cos(315*Math.PI/180),lz=Math.sin(35*Math.PI/180);
  for(let j=0;j<ny;j++)for(let i=0;i<w;i++){const k=j*nx+i;const gx=(fin[j*nx+(i+1)%nx]-fin[j*nx+(i-1+nx)%nx])/(2*s),gy=(fin[Math.min(ny-1,j+1)*nx+i]-fin[Math.max(0,j-1)*nx+i])/(2*s);
    const l=Math.hypot(gx,gy,1),sh=Math.max(0,(-gx*lx+gy*ly+lz)/l),v=Math.min(255,(150+80*fin[k]/5000)*(.25+.85*sh));const o=((ny-1-j)*w+i)*3;rgb[o]=rgb[o+1]=rgb[o+2]=v;}
  writePng(out+'-strip.png',w,ny,rgb);}
