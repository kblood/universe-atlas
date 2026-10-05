// Shared deterministic mountain harness. Metric arithmetic follows the design prototype.
import {writeFileSync} from 'node:fs';
import {deflateSync,crc32} from 'node:zlib';

// ---------- small helpers ----------
const q=(a,p)=>{if(!a.length)return NaN;const s=Float64Array.from(a).sort();return s[Math.min(s.length-1,Math.floor(p*(s.length-1)))];};
const r0=v=>Math.round(v),r1=v=>Math.round(v*10)/10,r3=v=>Math.round(v*1000)/1000,r4=v=>Math.round(v*1e4)/1e4;
const deg=Math.PI/180;
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=v=>{const l=Math.hypot(v[0],v[1],v[2]);return [v[0]/l,v[1]/l,v[2]/l];};
/** Deterministic tangent frame at d (east-ish t1, north-ish t2). */
function frame(d){const a=Math.abs(d[1])<.9?[0,1,0]:[1,0,0];const t1=norm(cross(a,d));const t2=cross(d,t1);return {t1,t2};}
/** Gnomonic local raster: (x,y) metres in the tangent plane at d -> unit direction. */
const localMap=(d,f,R)=>(x,y)=>norm([d[0]*R+f.t1[0]*x+f.t2[0]*y,d[1]*R+f.t1[1]*x+f.t2[1]*y,d[2]*R+f.t1[2]*x+f.t2[2]*y]);
function raster(ts,d,R,n,step){const f=frame(d),map=localMap(d,f,R),h=new Float64Array(n*n),o=(n-1)/2*step;let land=0;
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){const s=ts(map(i*step-o,j*step-o));h[j*n+i]=s.groundHeightM;land+=!s.ocean;}
  return {h,n,step,landShare:land/(n*n)};}

// ---------- E5 slopes, E6 valleys, E3 crests ----------
function slopes(r,stride){const {h,n,step}=r,out=[];const s=step*stride;
  for(let j=stride;j<n-stride;j+=stride)for(let i=stride;i<n-stride;i+=stride){
    const gx=(h[j*n+i+stride]-h[j*n+i-stride])/(2*s),gy=(h[(j+stride)*n+i]-h[(j-stride)*n+i])/(2*s);
    out.push(Math.atan(Math.hypot(gx,gy))/deg);}
  return out;}
function windowRelief(r,km){const {h,n,step}=r,w=Math.round(km*1000/step),out=[];
  for(let j=0;j+w<=n;j+=w)for(let i=0;i+w<=n;i+=w){let mn=Infinity,mx=-Infinity;for(let y=j;y<j+w;y++)for(let x=i;x<i+w;x++){const v=h[y*n+x];if(v<mn)mn=v;if(v>mx)mx=v;}out.push(mx-mn);}
  return out;}
/** Crest pixels: higher than both neighbours at +-k along at least one of 4 axes, in the upper
 * half of the raster's height range. Flank angle = mean of the two flank slopes along the axis
 * with the largest drop. Sharpness = flank angle at k=250 m divided by flank angle at 1 km
 * (1 = straight V flanks, < 1 = rounded crest). */
function crests(r){const {h,n,step}=r;const k5=Math.round(500/step),k2=Math.round(250/step),k10=Math.round(1000/step);
  const hs=Float64Array.from(h).sort(),p50=hs[Math.floor(.5*(hs.length-1))];
  const ax=[[1,0],[0,1],[1,1],[1,-1]];const flank=[],sharp=[];let crest=0,total=0;
  for(let j=k10;j<n-k10;j++)for(let i=k10;i<n-k10;i++){const c=h[j*n+i];if(c<p50)continue;total++;
    let best=-1,bestAx=null;
    for(const [dx,dy] of ax){const a=h[(j+dy*k5)*n+i+dx*k5],b=h[(j-dy*k5)*n+i-dx*k5];if(c>a&&c>b){const drop=(c-a)+(c-b);if(drop>best){best=drop;bestAx=[dx,dy];}}}
    if(!bestAx)continue;crest++;
    const len=Math.hypot(bestAx[0],bestAx[1])*step;
    const fl=k=>{const a=h[(j+bestAx[1]*k)*n+i+bestAx[0]*k],b=h[(j-bestAx[1]*k)*n+i-bestAx[0]*k];return (Math.atan((c-a)/(k*len))+Math.atan((c-b)/(k*len)))/2/deg;};
    const f5=fl(k5),f2=fl(k2),f10=fl(k10);flank.push(f5);if(f10>1)sharp.push(f2/f10);}
  return {crestShare:total?crest/total:0,flank,sharp};}

// ---------- E4 prominence ----------
/** Peaks (8-neighbour strict maxima) and their prominence by union-find in descending height.
 * Censoring (Astra review 2026-10-04): a peak's prominence is RESOLVED only if its component
 * never reached the raster border before its key saddle (and the saddle is interior). Otherwise
 * a higher col may exist outside the raster, so the value is an upper bound and the peak is
 * dropped. The highest component (never merges) is dropped too. Only resolved peaks are returned. */
function prominence(r){const {h,n}=r,N=n*n;const ord=Array.from({length:N},(_,i)=>i).sort((a,b)=>h[b]-h[a]||a-b);
  const parent=new Int32Array(N).fill(-1),top=new Int32Array(N),border=new Uint8Array(N);const find=x=>{while(parent[x]!==x){parent[x]=parent[parent[x]];x=parent[x];}return x;};
  const peaks=[];
  for(const p of ord){parent[p]=p;top[p]=p;const x=p%n,y=(p-x)/n;const onB=x===0||y===0||x===n-1||y===n-1;const roots=new Set();
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=n||yy>=n)continue;const q2=yy*n+xx;if(parent[q2]<0)continue;roots.add(find(q2));}
    if(!roots.size){border[p]=onB?1:0;continue;} // a new peak: its own component
    const rs=[...roots].sort((a,b)=>h[top[b]]-h[top[a]]||top[a]-top[b]);
    // p is the saddle between the components; every component but the highest ends here.
    for(let k=1;k<rs.length;k++){const t=top[rs[k]];if(!border[rs[k]]&&!onB)peaks.push({p:t,prom:h[t]-h[p]});}
    let b=onB?1:0;for(const rr of rs)b|=border[rr];
    for(const rr of rs){parent[rr]=rs[0];}parent[p]=rs[0];border[rs[0]]=b;}
  return peaks;}

// ---------- E3b drainage: closed depressions ----------
/** Priority-flood (Barnes et al. 2014) from the raster border: fill depth per cell. Eroded
 * mountains drain: closed depressions are rare and shallow. Noise relief is full of pits.
 * Returns the land share with fill depth > 10 m and the count of pits (strict 8-neighbour
 * minima on land) per 1000 km^2. */
function priorityFlood(r){const {h,n,step}=r,N=n*n;const filled=new Float64Array(N),done=new Uint8Array(N);
  const receiver=new Int32Array(N).fill(-1),order=[];
  const heap=[];const push=(i,v)=>{heap.push([v,i]);let k=heap.length-1;while(k>0){const p=(k-1)>>1;if(heap[p][0]<=heap[k][0])break;[heap[p],heap[k]]=[heap[k],heap[p]];k=p;}};
  const pop=()=>{const top=heap[0],last=heap.pop();if(heap.length){heap[0]=last;let k=0;for(;;){const a=2*k+1,b=a+1;let m=k;if(a<heap.length&&heap[a][0]<heap[m][0])m=a;if(b<heap.length&&heap[b][0]<heap[m][0])m=b;if(m===k)break;[heap[m],heap[k]]=[heap[k],heap[m]];k=m;}}return top;};
  for(let i=0;i<n;i++)for(const c of [i,(n-1)*n+i,i*n,i*n+n-1]){if(!done[c]){done[c]=1;filled[c]=h[c];push(c,h[c]);}}
  while(heap.length){const [v,c]=pop();order.push(c);const x=c%n,y=(c-x)/n;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if((!dx&&!dy)||xx<0||yy<0||xx>=n||yy>=n)continue;const k=yy*n+xx;if(done[k])continue;done[k]=1;receiver[k]=c;filled[k]=Math.max(h[k],v);push(k,filled[k]);}}
  return {filled,receiver,order};}
function depressions(r){const {h,n,step}=r;const {filled}=priorityFlood(r);
  let land=0,deep=0,pits=0;
  for(let y=1;y<n-1;y++)for(let x=1;x<n-1;x++){const k=y*n+x;if(h[k]<=0)continue;land++;if(filled[k]-h[k]>10)deep++;
    let lo=true;for(let dy=-1;dy<=1&&lo;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;if(h[(y+dy)*n+x+dx]<=h[k]){lo=false;break;}}pits+=lo;}
  return {fill10Share:land?deep/land:0,pitsPer1000km2:1000*pits/((n*step/1000)**2)};}

// ---------- E7 spectrum ----------
function fftPow(re){const N=re.length,im=new Float64Array(N);
  for(let i=1,j=0;i<N;i++){let bit=N>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;if(i<j){const t=re[i];re[i]=re[j];re[j]=t;}}
  for(let len=2;len<=N;len<<=1){const a=-2*Math.PI/len,wr=Math.cos(a),wi=Math.sin(a);
    for(let i=0;i<N;i+=len){let cr=1,ci=0;for(let k=0;k<len/2;k++){const ur=re[i+k],ui=im[i+k],vr=re[i+k+len/2]*cr-im[i+k+len/2]*ci,vi=re[i+k+len/2]*ci+im[i+k+len/2]*cr;
      re[i+k]=ur+vr;im[i+k]=ui+vi;re[i+k+len/2]=ur-vr;im[i+k+len/2]=ui-vi;const t=cr*wr-ci*wi;ci=cr*wi+ci*wr;cr=t;}}}
  const p=new Float64Array(N/2+1);for(let k=0;k<=N/2;k++)p[k]=re[k]*re[k]+im[k]*im[k];return p;}
const SPEC_N=2048,SPEC_STEP=62.5; // 128 km transects
/** Per-octave band variance (m^2) from Hann-windowed, linearly detrended transects.
 * Octave b covers wavelengths [125*2^b, 250*2^b) m, b = 0..9 (125 m .. 128 km). */
/** One-sided variance per FFT bin (DC excluded from total/octave), wavelengths in metres.
 * Input length must be a power of two. window may be 'hann' or 'none'.
 * octave uses [loM, hiM); input arrays are never mutated. */
function bandPowers(values,stepM,{detrend=true,window='hann'}={}){
  const SPEC_N=values.length,SPEC_STEP=stepM,x=values;
  if(SPEC_N<2||(SPEC_N&(SPEC_N-1))!==0)throw new RangeError('Expected a power-of-two sample count >= 2');
  if(!(stepM>0)||!Number.isFinite(stepM))throw new RangeError('Expected positive finite stepM');
  if(window!=='hann'&&window!=='none')throw new RangeError('Expected hann or none window');
  const w=new Float64Array(SPEC_N);let wss=0;for(let i=0;i<SPEC_N;i++){w[i]=window==='hann'?.5-.5*Math.cos(2*Math.PI*i/(SPEC_N-1)):1;wss+=w[i]*w[i];}
  if(wss===0)throw new RangeError('Window has zero energy');
  let sx=0,sy=0,sxx=0,sxy=0;for(let i=0;i<SPEC_N;i++){sx+=i;sy+=x[i];sxx+=i*i;sxy+=i*x[i];}
  const sl=detrend?(SPEC_N*sxy-sx*sy)/(SPEC_N*sxx-sx*sx):0,ic=detrend?(sy-sl*sx)/SPEC_N:0;
  const re=new Float64Array(SPEC_N);for(let i=0;i<SPEC_N;i++)re[i]=(x[i]-ic-sl*i)*w[i];
  const p=fftPow(re),freqPower=[{bin:0,wavelength:Infinity,power:p[0]/(SPEC_N*wss)}];let total=0;
  for(let k=1;k<=SPEC_N/2;k++){const lam=SPEC_N*SPEC_STEP/k;const v=2*p[k]/(SPEC_N*wss)/(k===SPEC_N/2?2:1);total+=v;
    freqPower.push({bin:k,wavelength:lam,power:v});}
  const octave=(loM,hiM)=>{let v=0;for(let k=1;k<freqPower.length;k++){const p=freqPower[k];if(p.wavelength>=loM&&p.wavelength<hiM)v+=p.power;}return v;};
  return {freqPower,octave,total};
}
function spectrum(ts,d,R,angles){const f=frame(d),map=localMap(d,f,R),bands=new Float64Array(10);let total=0;
  for(let a=0;a<angles;a++){const th=a*Math.PI/angles,c=Math.cos(th),s=Math.sin(th);const x=new Float64Array(SPEC_N);
    for(let i=0;i<SPEC_N;i++){const t=(i-SPEC_N/2)*SPEC_STEP;x[i]=ts(map(t*c,t*s)).groundHeightM;}
    const {freqPower}=bandPowers(x,SPEC_STEP);
    for(let k=1;k<=SPEC_N/2;k++){const {wavelength:lam,power:v}=freqPower[k];total+=v;
      const b=Math.floor(Math.log2(lam/125));if(b>=0&&b<10)bands[b]+=v;}}
  for(let b=0;b<10;b++)bands[b]/=angles;return {bands,total:total/angles};}

// ---------- E1 regional layout ----------
/** Structure-tensor orientation coherence of the height gradient, smoothed over `win` cells,
 * over land cells above the raster's land p50. 1 = perfectly parallel crests, 0 = isotropic. */
function coherence(r,win){const {h,n,step}=r;const gx=new Float64Array(n*n),gy=new Float64Array(n*n);
  for(let j=1;j<n-1;j++)for(let i=1;i<n-1;i++){gx[j*n+i]=(h[j*n+i+1]-h[j*n+i-1])/(2*step);gy[j*n+i]=(h[(j+1)*n+i]-h[(j-1)*n+i])/(2*step);}
  const land=[];for(let i=0;i<n*n;i++)if(h[i]>0)land.push(h[i]);const p50=q(land,.5);const out=[];
  for(let j=win;j<n-win;j+=win)for(let i=win;i<n-win;i+=win){if(!(h[j*n+i]>p50))continue;let a=0,b=0,c=0;
    for(let y=j-win;y<j+win;y++)for(let x=i-win;x<i+win;x++){const u=gx[y*n+x],v=gy[y*n+x];a+=u*u;b+=v*v;c+=u*v;}
    const tr=a+b;if(tr<=0)continue;const disc=Math.sqrt((a-b)*(a-b)+4*c*c);out.push(disc/tr);}
  return out;}

// ---------- PNG ----------
function writePng(path,w,hgt,rgb){const raw=Buffer.alloc((w*3+1)*hgt);for(let y=0;y<hgt;y++){raw[y*(w*3+1)]=0;rgb.copy(raw,y*(w*3+1)+1,y*w*3,(y+1)*w*3);}
  const chunk=(t,d)=>{const len=Buffer.alloc(4);len.writeUInt32BE(d.length);const td=Buffer.concat([Buffer.from(t),d]);const c=Buffer.alloc(4);c.writeUInt32BE(crc32(td)>>>0);return Buffer.concat([len,td,c]);};
  const ih=Buffer.alloc(13);ih.writeUInt32BE(w,0);ih.writeUInt32BE(hgt,4);ih[8]=8;ih[9]=2;ih[10]=0;ih[11]=0;ih[12]=0;
  writeFileSync(path,Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ih),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]));}
/** Hillshade (sun az 315, el 35) times a neutral hypsometric tint; sea flat blue. No app colours. */
function hillshade(r,bound){const {h,n,step}=r,rgb=Buffer.alloc(n*n*3);const az=315*deg,el=35*deg;const lx=Math.cos(el)*Math.sin(az),ly=Math.cos(el)*Math.cos(az),lz=Math.sin(el);
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){const k=j*n+i,v=h[k];let R,G,B;
    if(v<0){R=40;G=70;B=110;}else{const i0=Math.max(0,i-1),i1=Math.min(n-1,i+1),j0=Math.max(0,j-1),j1=Math.min(n-1,j+1);
      const gx=(h[j*n+i1]-h[j*n+i0])/((i1-i0)*step),gy=(h[j1*n+i]-h[j0*n+i])/((j1-j0)*step);const l=Math.hypot(gx,gy,1);
      const sh=Math.max(0,(-gx*lx+gy*ly+lz)/l);const t=Math.min(1,v/bound);const base=150+80*t;const s=.25+.85*sh;R=G=B=Math.min(255,base*s);}
    const o=((n-1-j)*n+i)*3;rgb[o]=R;rgb[o+1]=G;rgb[o+2]=B;}
  return rgb;}

const add=(a,b)=>{for(const v of b)a.push(v);};
// ---------- synthetic controls (--synthetic alpine|dome) ----------
// Calibration controls for the metrics themselves (and the Luna plan): not Atlas terrain.
//  alpine: ridged multifractal of gradient noise, octaves 64 km .. 250 m, amplitude gain 0.71 per
//          octave (spectral exponent near 2, the textbook value for Earth topography), crest-weighted,
//          0..~4.5 km. A metric that cannot tell this from 'dome' has no teeth.
//  dome:   the same base height made of smooth 40 km swells plus a weak steep-spectrum fbm
//          (gain 0.35 per octave): soft low ridges by construction.
function gnoise(x,y,z,seed){const fade=t=>t*t*t*(t*(t*6-15)+10);const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z),fx=x-ix,fy=y-iy,fz=z-iz;
  const g=(i,j,k,dx,dy,dz)=>{let h=Math.imul(i,0x27d4eb2d)^Math.imul(j,0x165667b1)^Math.imul(k,0x1b873593)^seed;h=Math.imul(h^(h>>>15),0x2c1b3c6d);h^=h>>>12;h=Math.imul(h,0x297a2d39);h^=h>>>15;
    const a=(h&255)/255*2*Math.PI,b=((h>>>8)&255)/255*2-1,r=Math.sqrt(1-b*b);return Math.cos(a)*r*dx+Math.sin(a)*r*dy+b*dz;};
  const u=fade(fx),v=fade(fy),w=fade(fz);const L=(a,b,t)=>a+(b-a)*t;
  return L(L(L(g(ix,iy,iz,fx,fy,fz),g(ix+1,iy,iz,fx-1,fy,fz),u),L(g(ix,iy+1,iz,fx,fy-1,fz),g(ix+1,iy+1,iz,fx-1,fy-1,fz),u),v),
           L(L(g(ix,iy,iz+1,fx,fy,fz-1),g(ix+1,iy,iz+1,fx-1,fy,fz-1),u),L(g(ix,iy+1,iz+1,fx,fy-1,fz-1),g(ix+1,iy+1,iz+1,fx-1,fy-1,fz-1),u),v),w)*1.6;}
function syntheticSampler(R,kind){return d=>{const P=(lam,o)=>[d[0]*R/lam+o,d[1]*R/lam+o*.7,d[2]*R/lam+o*1.3];let h;
  if(kind==='alpine'){let sum=0,amp=1,w=1,norm=0;for(let o=0;o<9;o++){const lam=64000/2**o,[x,y,z]=P(lam,o*3.1);let v=1-Math.abs(gnoise(x,y,z,o*977));v=v<0?0:v;v*=v;v*=w;sum+=v*amp;norm+=amp;w=Math.min(1,v*1.8+.15);amp*=.71;}
    h=200+4300*sum/norm*1.25;}
  else{const [x,y,z]=P(40000,0);let sw=.5+.5*gnoise(x,y,z,11);let f=0,amp=1,norm=0;for(let o=0;o<7;o++){const [a,b,c]=P(16000/2**o,o*2.3);f+=amp*gnoise(a,b,c,o*331);norm+=amp;amp*=.35;}
    h=200+3600*sw*sw+400*f/norm;}
  return {groundHeightM:h,ocean:h<0};};}



function belowWavelength(specBands,lamN){let v=0;for(let b=0;b<10;b++){const lo=125*2**b,hi=250*2**b;
      if(hi<=lamN)v+=specBands[b];else if(lo<lamN)v+=specBands[b]*Math.log2(lamN/lo);}return v;}

function betaFromOctaves(specBands){
  const lo=[2,3,4,5].map(b=>Math.log2(Math.sqrt(specBands[b])));let sl=0;{const xs=[0,1,2,3],mx=1.5,my=lo.reduce((a,c)=>a+c,0)/4;let nn=0,dd=0;for(let i=0;i<4;i++){nn+=(xs[i]-mx)*(lo[i]-my);dd+=(xs[i]-mx)**2;}sl=nn/dd;}
  return 1+2*sl;
}
/** sites are {d: unitDirection}; opts optionally overrides n/stepM, regionalN/regionalStepM,
 * angles, or supplies onRaster(local, regional, siteIndex). Defaults reproduce the prototype.
 * Percentiles pool pixels; spectra average power; drainage takes per-site medians. */
function measureSites(ts,sites,R,opts={}){
  // Per site rasters
  const agg={slope125:[],slope1k:[],rel4:[],rel8:[],rel16:[],flank:[],sharp:[],crestShare:[],peaks300:0,peaks1000:0,promMax:[],areaKm2:0,coh:[],cohCrest:[],land48:[],fill10:[],pits:[]};
  const specBands=new Float64Array(10);let specTotal=0;
  for(let si=0;si<sites.length;si++){const d=sites[si].d;
    const r=raster(ts,d,R,opts.n??385,opts.stepM??125);agg.land48.push(r.landShare);
    add(agg.slope125,slopes(r,1));add(agg.slope1k,slopes(r,8));
    add(agg.rel4,windowRelief(r,4));add(agg.rel8,windowRelief(r,8));add(agg.rel16,windowRelief(r,16));
    const c=crests(r);add(agg.flank,c.flank);add(agg.sharp,c.sharp);agg.crestShare.push(c.crestShare);
    const pk=prominence(r);agg.peaks300+=pk.filter(p=>p.prom>=300).length;agg.peaks1000+=pk.filter(p=>p.prom>=1000).length;agg.promMax.push(Math.max(0,...pk.map(p=>p.prom)));
    agg.areaKm2+=(r.n*r.step/1000)**2;const dp=depressions(r);agg.fill10.push(dp.fill10Share);agg.pits.push(dp.pitsPer1000km2);
    const reg=raster(ts,d,R,opts.regionalN??193,opts.regionalStepM??2000);add(agg.coh,coherence(reg,10));
    const sp=spectrum(ts,d,R,opts.angles??4);for(let b=0;b<10;b++)specBands[b]+=sp.bands[b]/sites.length;specTotal+=sp.total/sites.length;
    opts.onRaster?.(r,reg,si);}
  const octaves={};for(let b=0;b<10;b++)octaves[`${125*2**b}-${250*2**b}m`]=r0(Math.sqrt(specBands[b]));
  // ESTIMATE of the transect variance at wavelengths shorter than each level's Nyquist: the height
  // lattice (2*edge/32) and the colour texture (2*edge/128). The straddling octave is split by
  // uniform power in log wavelength, so these are estimates, not FFT-bin integrals.
  const aboveNyquist={};for(const L of [6,8,10,12]){const lamN=2*ladderEdge(R,L)/32,lamC=2*ladderEdge(R,L)/128,v=belowWavelength(specBands,lamN),vc=belowWavelength(specBands,lamC);
    aboveNyquist[`L${L}`]={nyquistWavelengthM:r0(lamN),rmsAboveM:r0(Math.sqrt(v)),shareOfVariance:r3(v/specTotal),
      colourNyquistWavelengthM:r0(lamC),colourRmsAboveM:r0(Math.sqrt(vc)),colourShareOfVariance:r4(vc/specTotal)};}
  // Spectral exponent beta (P(k) ~ k^-beta) from the octave RMS between 500 m and 8 km: RMS per octave scales by 2^((1-beta)/2) per halving of wavelength.
  const beta=betaFromOctaves(specBands);
  const pct=(a,t)=>r1(100*a.filter(v=>v>t).length/a.length);
  return {
    E1_layout:{coherence40kmWindowP50:r3(q(agg.coh,.5)),coherence40kmWindowP90:r3(q(agg.coh,.9))},
    E3_crests:{crestShareP50:r3(q(agg.crestShare,.5)),flank500mP50:r1(q(agg.flank,.5)),flank500mP90:r1(q(agg.flank,.9)),sharpness250v1kP50:r3(q(agg.sharp,.5))},
    E4_summits:{peaksProm300Per1000km2:r1(1000*agg.peaks300/agg.areaKm2),peaksProm1000Per1000km2:r1(1000*agg.peaks1000/agg.areaKm2),maxProminenceP50:r0(q(agg.promMax,.5)),maxProminenceMax:r0(Math.max(...agg.promMax))},
    E5_slopes:{slope125P50:r1(q(agg.slope125,.5)),slope125P90:r1(q(agg.slope125,.9)),slope125Over30:pct(agg.slope125,30),slope125Over40:pct(agg.slope125,40),slope1kP50:r1(q(agg.slope1k,.5)),slope1kP90:r1(q(agg.slope1k,.9))},
    E6_valleys:{relief4kmP50:r0(q(agg.rel4,.5)),relief8kmP50:r0(q(agg.rel8,.5)),relief8kmP90:r0(q(agg.rel8,.9)),relief16kmP50:r0(q(agg.rel16,.5))},
    E3b_drainage:{fill10ShareP50:r3(q(agg.fill10,.5)),pitsPer1000km2P50:r1(q(agg.pits,.5))},
    E7_spectrum:{beta500mTo8km:Math.round(beta*100)/100,rmsTotalM:r0(Math.sqrt(specTotal)),octaveRmsM:octaves,aboveNyquist},
    landShare48km:r3(q(agg.land48,.5))};
}

export { frame, localMap, raster, slopes, windowRelief, crests, prominence, depressions, coherence, bandPowers, spectrum, betaFromOctaves, belowWavelength, hillshade, writePng, syntheticSampler, measureSites, q, r0, r1, r3, r4, deg };

/** Copy a square synthetic height array. Nonnegative heights are land. */
export function rasterFromArray(h,n,stepM){
  if(!Number.isInteger(n)||n<2||h.length!==n*n)throw new RangeError('Expected n*n heights, n >= 2');
  if(!(stepM>0)||!Number.isFinite(stepM))throw new RangeError('Expected positive finite stepM');
  const heights=Float64Array.from(h);let land=0;
  for(const v of heights){if(!Number.isFinite(v))throw new RangeError('Expected finite heights');land+=v>=0;}
  return {h:heights,n,step:stepM,landShare:land/(n*n)};
}

/** D8 steepest descent on the priority-flood surface. Border cells without
 * a lower neighbour are outlets.
 * Equal downhill slopes choose the lowest row-major index. Flats follow the flood
 * parent (deterministic heap/discovery order), so every path reaches an outlet.
 * accumulation counts cells including self; receiver is -1 at outlets. */
export function flowAccumulationD8(r){
  const {n,step}=r,{filled,receiver,order}=priorityFlood(r),N=n*n;
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    const c=y*n+x;let best=0,target=-1;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
      if((!dx&&!dy)||x+dx<0||x+dx>=n||y+dy<0||y+dy>=n)continue;
      const k=(y+dy)*n+x+dx,slope=(filled[c]-filled[k])/(step*Math.hypot(dx,dy));
      if(slope>best||(slope===best&&slope>0&&k<target)){best=slope;target=k;}
    }
    if(target>=0)receiver[c]=target;
  }
  const rank=new Int32Array(N);for(let i=0;i<N;i++)rank[order[i]]=i;
  const descending=Array.from({length:N},(_,i)=>i).sort((a,b)=>filled[b]-filled[a]||rank[b]-rank[a]);
  const accumulation=new Float64Array(N).fill(1);
  for(const c of descending)if(receiver[c]>=0)accumulation[receiver[c]]+=accumulation[c];
  return {filled,receiver,accumulation,n,step};
}

/** Section 2.3: fixed 3 km / 60 km ramp, belt core, eight seeds.
 * slope125Over30 is percent; fill10ShareP50 is a fraction. */
export const MOUNTAIN_THRESHOLDS=Object.freeze([
  {id:'slope125Over30',op:'>=',value:25,rationale:'Belt-core percent: alpine 42.7; d3 17.4; main 2.2',calibrated:true},
  {id:'slope125P50',op:'>=',value:20,rationale:'Degrees: alpine 27.4; d3 16.3; main 11.3',calibrated:true},
  {id:'flank500mP50',op:'>=',value:12,rationale:'Degrees: alpine 14.7; d3 9.6; main 6.5; dome 0.4',calibrated:true},
  {id:'relief8kmP50',op:'>=',value:1500,rationale:'Metres at a 3 km envelope: alpine 1767; main Maithea 1466',calibrated:true},
  {id:'beta500mTo8km',op:'between',value:Object.freeze([2.0,2.6]),rationale:'Alpine 2.14; d3 2.78-2.99; main 3.36-3.49; Earth about 2 (literature)',calibrated:true},
  {id:'fill10ShareP50',op:'<=',value:0.05,rationale:'UNCALIBRATED: main 5-23%; d3 23-32%; noise 31%',calibrated:false},
  {id:'pitsPer1000km2P50',op:'<=',value:50,rationale:'UNCALIBRATED: main 147-453; d3 570-700; noise 2108',calibrated:false},
  {id:'coherence40kmWindowP50',op:'>=',value:0.35,rationale:'With axis input: isotropic d3 0.12-0.15; noise 0.135; main 0.24-0.30',calibrated:true},
].map(Object.freeze));

/** Accept measureSites output or flat threshold-id keys. Missing/nonfinite values
 * fail closed. Uncalibrated drainage rows rank candidates, not accept them. */
export function judgeM3(metrics){
  const flat={...metrics.E5_slopes,...metrics.E3_crests,...metrics.E6_valleys,
    ...metrics.E7_spectrum,...metrics.E3b_drainage,...metrics.E1_layout,...metrics};
  return MOUNTAIN_THRESHOLDS.map(row=>{
    const actual=flat[row.id];
    const pass=Number.isFinite(actual)&&(row.op==='>='?actual>=row.value:
      row.op==='<='?actual<=row.value:actual>=row.value[0]&&actual<=row.value[1]);
    return {...row,actual,pass};
  });
}
const ladderEdge=(R,L)=>Math.PI/2*R/2**L;
