// M1 metrics only. Primary coherence and PNG encoding remain in MTN-0;
// the stricter positive-centre tensor population is measured here.
import {raster,coherence,q,frame} from './mountain-metrics.mjs';
import {fib} from '../terrain-climate-fixtures.mjs';
import {noise} from '../../src/catalog.ts';

export const LAYOUT_THRESHOLDS=Object.freeze({shareMin:.05,shareMax:.15,aspectMin:4,coherenceMin:.45,largeArea:.01});
const grids=new Map();
export function equirectGrid(w=1024,h=512){
  const key=`${w}/${h}`;if(grids.has(key))return grids.get(key);
  const xyz=new Float64Array(w*h*3),weights=new Float64Array(h);
  for(let y=0;y<h;y++){
    const phi=(y+.5)/h*Math.PI,s=Math.sin(phi);weights[y]=s;
    for(let x=0;x<w;x++){const theta=(x+.5)/w*2*Math.PI,k=(y*w+x)*3;
      xyz[k]=-Math.cos(theta)*s;xyz[k+1]=Math.cos(phi);xyz[k+2]=Math.sin(theta)*s;}
  }
  const grid={w,h,xyz,weights};grids.set(key,grid);return grid;
}

// Longitude wraps, latitude does not. Strict > .5 components; >= .5 area share.
export function layoutMap(sample,a0,{w=1024,h=512,baseline}={}){
  const grid=equirectGrid(w,h),{xyz,weights}=grid,N=w*h;
  const mask=new Float64Array(N),land=new Uint8Array(N),d=[0,0,0];
  let total=0,landArea=0,beltArea=0,coreArea=0,mainArea=0;
  for(let i=0;i<N;i++){
    const weight=weights[Math.floor(i/w)];total+=weight;
    for(let j=0;j<3;j++)d[j]=xyz[3*i+j];
    const alt=a0(d),b=sample(d,alt);mask[i]=b;
    if(alt>=0){land[i]=1;landArea+=weight;if(b>0)beltArea+=weight;if(b>=.5)coreArea+=weight;if(baseline?.(d))mainArea+=weight;}
  }
  const visited=new Uint8Array(N),queue=new Int32Array(N),components=[];
  for(let i=0;i<N;i++){
    if(visited[i]||!land[i]||!(mask[i]>.5))continue;
    let head=0,tail=1,area=0;queue[0]=i;visited[i]=1;
    const mean=[0,0,0],moment=new Float64Array(9);
    while(head<tail){const k=queue[head++],y=Math.floor(k/w),x=k-y*w,weight=weights[y];area+=weight;
      for(let a=0;a<3;a++){mean[a]+=weight*xyz[3*k+a];for(let b=0;b<3;b++)moment[3*a+b]+=weight*xyz[3*k+a]*xyz[3*k+b];}
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
        if((!dx&&!dy)||y+dy<0||y+dy>=h)continue;
        const j=(y+dy)*w+(x+dx+w)%w;
        if(!visited[j]&&land[j]&&mask[j]>.5){visited[j]=1;queue[tail++]=j;}
      }
    }
    if(area<=landArea*.001)continue;
    const len=Math.hypot(...mean),centre=mean.map(v=>v/len),{t1,t2}=frame(centre);
    const cov=(u,v)=>{let sum=0;for(let a=0;a<3;a++)for(let b=0;b<3;b++)sum+=u[a]*v[b]*(moment[3*a+b]/area-mean[a]*mean[b]/(area*area));return sum;};
    const a=cov(t1,t1),b=cov(t2,t2),c=cov(t1,t2),disc=Math.sqrt((a-b)*(a-b)+4*c*c),lo=(a+b-disc)/2;
    components.push({landShare:area/landArea,pixels:tail,aspect:lo>0?Math.sqrt((a+b+disc)/(2*lo)):Infinity,centre});
  }
  const large=components.filter(c=>c.landShare>LAYOUT_THRESHOLDS.largeArea),aspects=components.map(c=>c.aspect);
  return {grid,mask,land,landShare:landArea/total,beltShare:landArea?beltArea/landArea:null,coreShare:landArea?coreArea/landArea:null,
    mainShare:baseline&&landArea?mainArea/landArea:null,components:large,minAspect:large.length?Math.min(...large.map(c=>c.aspect)):null,
    informativeComponents:components,smallMinAspect:aspects.length?Math.min(...aspects):null,smallP10Aspect:aspects.length?q(aspects,.1):null,smallBelow4:aspects.filter(a=>a<4).length};
}

// Same gradients, 20-cell windows and ten-cell stride as the primary harness.
// Every positive centre participates. Undefined zero-trace coherence is
// reported separately and conservatively contributes zero to the strict p50.
export function strictCoherence({h,n,step},win=10){
  const gx=new Float64Array(n*n),gy=new Float64Array(n*n),windows=[];
  let zeroTraceCount=0;
  for(let y=1;y<n-1;y++)for(let x=1;x<n-1;x++){
    const k=y*n+x;gx[k]=(h[k+1]-h[k-1])/(2*step);gy[k]=(h[k+n]-h[k-n])/(2*step);
  }
  for(let j=win;j<n-win;j+=win)for(let i=win;i<n-win;i+=win){
    if(!(h[j*n+i]>0))continue;
    let a=0,b=0,c=0;
    for(let y=j-win;y<j+win;y++)for(let x=i-win;x<i+win;x++){
      const u=gx[y*n+x],v=gy[y*n+x];a+=u*u;b+=v*v;c+=u*v;
    }
    if(a+b===0){zeroTraceCount++;windows.push(0);}
    else windows.push(Math.sqrt((a-b)*(a-b)+4*c*c)/(a+b));
  }
  return {windows,zeroTraceCount};
}
export function layoutCoherence(sample,R,{siteCount=8,probeCount=20000,n=193}={}){
  const sites=[],windows=[],strictWindows=[];let zeroTraceCount=0;
  for(let i=0;i<probeCount&&sites.length<siteCount;i++){
    const d=fib(i,probeCount);if(sample(d)<.5)continue;
    if(sites.some(p=>Math.acos(Math.max(-1,Math.min(1,p[0]*d[0]+p[1]*d[1]+p[2]*d[2])))*R<300000))continue;
    sites.push(d);
    const r=raster(v=>{const belt=sample(v);return {groundHeightM:belt,ocean:belt<=0};},d,R,n,2000);
    windows.push(...coherence(r,10));
    const strict=strictCoherence(r);strictWindows.push(...strict.windows);zeroTraceCount+=strict.zeroTraceCount;
  }
  return {p50:windows.length?q(windows,.5):null,windowCount:windows.length,
    strictP50:strictWindows.length?q(strictWindows,.5):null,strictWindowCount:strictWindows.length,zeroTraceCount,sites};
}

export function coastSafety(sample,a0,n){
  let violations=0;for(let i=0;i<n;i++){const d=fib(i,n);if(a0(d)<0&&sample(d)!==0)violations++;}return violations;
}
export function judgeLayout(m){
  if(m.gas)return m.nonzeroSamples===0?[]:['gas nonzero'];
  const failures=[];
  if(!(m.beltShare>=.05&&m.beltShare<=.15))failures.push('belt share');
  if(m.components.some(c=>!(c.aspect>=4)))failures.push('elongation');
  if(!(m.coherenceP50>=.45))failures.push('coherence');
  if(!(m.coherenceStrictP50>=.45))failures.push('strict coherence');
  if(m.coastViolations!==0)failures.push('coast safety');return failures;
}

export function layoutDistanceAccuracy(layout,R){
  const offset=(b,u)=>b.bendM*(u/b.uLimit)**2+b.amplitudeM*(2*noise(u*2/b.wavelength+13,37,19,b.noiseSeed)-1);
  // Solve F=0 and |d|=1 at fixed u. Normalising an offset great-circle
  // point would change u and pole.d, so would test the wrong centreline.
  const point=(b,u)=>{
    const y=offset(b,u)/R,r=Math.sqrt(1-y*y),z=r*(1-u*u)/(1+u*u),x=r*2*u/(1+u*u);
    return b.centre.map((v,j)=>v*z+b.tangent[j]*x+b.pole[j]*y);
  };
  const steps=4000,lines=layout.belts.map(b=>Array.from({length:steps+1},(_,i)=>point(b,(2*i/steps-1)*b.uLimit)));
  let count=0,maxErrorM=0,maxErrorWidth=0,worst=null;const errors=[];
  for(let i=0;i<100000&&count<2000;i++){
    // Coprime permutation distributes the first 2000 positives across the
    // entire sphere instead of stopping in the northern Fibonacci prefix.
    const d=fib((i*7919)%100000,100000),s=layout.sample(d);if(s.belt<=0)continue;count++;
    const b=layout.belts[s.beltIndex],line=lines[s.beltIndex];let best=Infinity,index=0;
    const chord=p=>p.reduce((sum,v,j)=>sum+(v-d[j])**2,0);
    for(let j=0;j<line.length;j++){const dist=chord(line[j]);if(dist<best){best=dist;index=j;}}
    // Refine the winning dense interval to remove discretisation error.
    let lo=(2*Math.max(0,index-1)/steps-1)*b.uLimit,hi=(2*Math.min(steps,index+1)/steps-1)*b.uLimit;
    for(let j=0;j<36;j++){const u=lo+(hi-lo)/3,v=hi-(hi-lo)/3;if(chord(point(b,u))<chord(point(b,v)))hi=v;else lo=u;}
    best=Math.min(best,chord(point(b,(lo+hi)/2)));
    const actual=2*R*Math.asin(Math.min(1,Math.sqrt(best)/2)),error=Math.abs(Math.abs(s.axisDistanceM)-actual);
    maxErrorM=Math.max(maxErrorM,error);
    errors.push(error/s.halfWidthM);
    const u=(lo+hi)/2,slope=(offset(b,u+1e-5)-offset(b,u-1e-5))/(2e-5*R)*(1+u*u)/2;
    if(error/s.halfWidthM>maxErrorWidth){maxErrorWidth=error/s.halfWidthM;worst={direction:d,beltIndex:s.beltIndex,axisDistanceM:s.axisDistanceM,actualM:actual,halfWidthM:s.halfWidthM,distanceWidth:actual/s.halfWidthM,slope};}
  }
  return {count,centrelineSteps:steps,maxErrorM,maxErrorWidth,p99ErrorWidth:q(errors,.99),toleranceWidth:.01,pass:count===2000&&maxErrorWidth<=.01,worst};
}

export function layoutCurvature(layout,R){
  let max=0,boundMax=0,worst=null;
  for(const [beltIndex,b] of layout.belts.entries()){
    boundMax=Math.max(boundMax,b.curvatureWidthBound);
    const point=u=>{const y=(b.bendM*(u/b.uLimit)**2+b.amplitudeM*(2*noise(u*2/b.wavelength+13,37,19,b.noiseSeed)-1))/R;
      const r=Math.sqrt(1-y*y);return [r*2*u/(1+u*u),y,r*(1-u*u)/(1+u*u)];};
    const h=1e-5;
    for(let i=1;i<4096;i++){
      const u=(2*i/4096-1)*b.uLimit,p=point(u),a=point(u-h),c=point(u+h);
      const v=p.map((_,j)=>(c[j]-a[j])/(2*h)),acc=p.map((x,j)=>(c[j]-2*x+a[j])/(h*h));
      const cross=[v[1]*acc[2]-v[2]*acc[1],v[2]*acc[0]-v[0]*acc[2],v[0]*acc[1]-v[1]*acc[0]];
      const kw=Math.hypot(...cross)/Math.hypot(...v)**3*b.halfWidthM/R;
      if(kw>max){max=kw;worst={beltIndex,u};}
      if(kw>b.curvatureWidthBound+1e-6)throw new Error('Centreline curvature exceeds analytic bound');
    }
  }
  return {max,boundMax,limit:.2,steps:4096,worst};
}

