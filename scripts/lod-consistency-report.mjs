// LOD ladder consistency report (docs/lod-ladder-contract-v1.md). Reproducible, not part of npm test;
// tests/lod-consistency.test.mjs imports the metric helpers below.
//
//   node scripts/lod-consistency-report.mjs [--before <checkout root>] [--k 16] [--bench 1] [--json out.json]
//
// Columns: PLAN = plan.measuredBasis.lodShipped (shipped main as measured by the relief plan),
// BEFORE = the same metrics measured now on --before (a checkout without this package, e.g. main),
// AFTER = this checkout. Heights are buildTile's stored lattice heights (surfaceHeight, relief 1) at both
// levels of a pair, so a coarse level is judged exactly as streamed. Colour and class follow the plan's
// cross-level method (terrain colour on a grid at the texture's resolution; snow by bilinear snow weight
// > .5; biome name re-classified at the interpolated height; ocean by the sign of the interpolated height).
import {pathToFileURL,fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {writeFileSync} from 'node:fs';

export const PLAN_LOD_SHIPPED={
  build:{L4_L12:[22.3,24.4],L14_L18:[9.2,10.1],bytesCoarse:180820,bytesFine:130644},
  cross:{
    Maithea:{6:{p50:97,p99:761,max:1564,rgbP50:6.7,rgbP99:33.8,snow:.41,name:.42,ocean:.05},8:{p50:18,p99:168,max:477,rgbP50:.7,rgbP99:5.2,snow:.02,name:0,ocean:.03},
      10:{p50:3,p99:33,max:101,rgbP50:0,rgbP99:.4,snow:0,name:0,ocean:0},12:{p50:0,p99:5,max:21},14:{p50:0,p99:1,max:3}},
    Lethuris:{6:{p50:139,p99:980,max:1669,rgbP99:43.4}},
  },
  retention:{Maithea:{6:{snowKept:98.4,snowFalse:3.9,forestKept:97.6,peakKept:70,summitP50:205,summitMax:661},8:{peakKept:91,summitP50:68,summitMax:196},10:{peakKept:97,summitP50:8,summitMax:60}},
    Lethuris:{6:{peakKept:54},8:{peakKept:78}}},
};

export const fib=(i,n)=>{const y=1-2*(i+.5)/n,p=i*2.399963229728653,r=Math.sqrt(1-y*y);return [Math.cos(p)*r,y,Math.sin(p)*r];};
const quantile=(a,q)=>{if(!a.length)return NaN;const s=Float64Array.from(a).sort();return s[Math.floor(q*(s.length-1))];};
export const SNOW='Alpine / polar snow';
/** The relief plan's median convention for tile summit loss (sorted[length >> 1]). */
const upperMedian=a=>{if(!a.length)return NaN;const s=Float64Array.from(a).sort();return s[s.length>>1];};

/** Loads the modules a measurement needs from a checkout root (file URL or path). */
export async function loadCheckout(root){
  const text=root instanceof URL?root.href:String(root);
  const base=text.startsWith('file:')?(text.endsWith('/')?text:text+'/'):pathToFileURL(resolve(text)+'/').href;
  const [tiles,terrain,biomes,fixtures]=await Promise.all(['src/planet-tiles.ts','src/terrain.ts','src/surface-biomes.ts','tests/terrain-climate-fixtures.mjs'].map(p=>import(base+p)));
  return {root:base,...tiles,terrainSampler:terrain.terrainSampler,biomeClassifier:biomes.biomeClassifier,waterWorlds:fixtures.waterWorlds};
}

/** Plan cross-level selection: the first k directions of fib(i*53 % 4000) with ground above -300 m. */
export function crossDirections(ts,k){const dirs=[];for(let i=0;dirs.length<k&&i<4000;i++){const d=fib(i*53%4000,4000);if(ts(d).groundHeightM>-300)dirs.push(d);}return dirs;}
/** Plan edge-tile selection: land directions on a snowline (snow .2-.95) or with forest potential. */
export function edgeDirections(ts,cls,k){const dirs=[];for(let i=0;i<4000;i+=7){const d=fib(i,4000);const s=ts(d);if(s.groundHeightM>0){const c=cls(d,s.groundHeightM,1);if((c.snowFraction>.2&&c.snowFraction<.95)||c.forestPotential)dirs.push(d);}if(dirs.length>=k)break;}return dirs;}

/** Bilinear interpolation of a (m+1)^2 row-major grid at tile-local (u, v). */
function bilinear(g,m,u,v,f){const gx=Math.min(m-1e-9,u*m),gy=Math.min(m-1e-9,v*m),ix=Math.floor(gx),iy=Math.floor(gy),a=gx-ix,b=gy-iy,s=m+1;
  const p=(i,j)=>f(g[j*s+i]);return p(ix,iy)*(1-a)*(1-b)+p(ix+1,iy)*a*(1-b)+p(ix,iy+1)*(1-a)*b+p(ix+1,iy+1)*a*b;}

/** The class a coarse lattice carries at (u, v): the label with the largest bilinear weight among the
 * four corner vertices (ties: the earlier corner). Classes are reduced as classes (coverage), never
 * re-derived from the coarse height. */
function carriedName(g,m,u,v){const gx=Math.min(m-1e-9,u*m),gy=Math.min(m-1e-9,v*m),ix=Math.floor(gx),iy=Math.floor(gy),a=gx-ix,b=gy-iy,s=m+1;
  const w=new Map();for(const [i,j,k] of [[ix,iy,(1-a)*(1-b)],[ix+1,iy,a*(1-b)],[ix,iy+1,(1-a)*b],[ix+1,iy+1,a*b]]){const name=g[j*s+i].name;w.set(name,(w.get(name)||0)+k);}
  let best=null,bw=-1;for(const [name,k] of w)if(k>bw){best=name;bw=k;}return best;}

/** Cross-level pair metrics: coarse tile `P` (level L) bilinear at its child's lattice vs the child
 * (level L+1, the child containing direction d). Returns raw arrays/counters for pooling. */
export function crossPair(m,body,ts,cls,d,L,acc,{tileCache}={}){
  const n=m.PATCH_SEGMENTS,P=m.directionTile(d,L),C=m.directionTile(d,L+1);
  const build=t=>{const key=m.tileKey(t);let r=tileCache?.get(key);if(!r){r=m.buildTile(body,t);tileCache?.set(key,r);}return r;};
  const pt=build(P),ct=build(C);
  const lattice=(t,data)=>{const g=[];for(let y=0;y<=n;y++)for(let x=0;x<=n;x++){const dd=m.tileDirection(t,x/n,y/n),s=ts(dd),c=cls(dd,s.groundHeightM,1);g.push({h:data.surfaceHeight[y*(n+1)+x],raw:s.groundHeightM,snowW:c.weights[3],name:c.name,forest:c.forestPotential?1:0});}return g;};
  const pg=lattice(P,pt),cg=lattice(C,ct);
  const colourGrid=(t,res)=>{const g=[];for(let y=0;y<=res;y++)for(let x=0;x<=res;x++)g.push(ts(m.tileDirection(t,x/res,y/res)).color);return g;};
  const tp=L>=14?64:128,tc=L+1>=20?32:L+1>=14?64:128;
  const ox=C.x-P.x*2,oy=C.y-P.y*2;
  for(let y=0;y<=n;y++)for(let x=0;x<=n;x++){
    const u=(ox+x/n)/2,v=(oy+y/n)/2,c=cg[y*(n+1)+x];
    if(x%2===0&&y%2===0){ // shared vertex: exact ocean-flag identity (coastline invariance)
      const p=pg[(oy*n/2+y/2)*(n+1)+(ox*n/2+x/2)];acc.shared++;if((p.h<0)!==(c.h<0))acc.sharedOcean++;continue;
    }
    acc.n++;const hp=bilinear(pg,n,u,v,o=>o.h);acc.dh.push(Math.abs(hp-c.h));
    if((hp<0)!==(c.h<0))acc.ocean++;
    if(c.raw>=0){acc.land++;
      if((bilinear(pg,n,u,v,o=>o.snowW)>.5)!==(c.snowW>.5))acc.snow++;
      if((bilinear(pg,n,u,v,o=>o.forest)>.5)!==(c.forest>.5))acc.forest++;
      if(cls(m.tileDirection(C,x/n,y/n),hp,1).name!==c.name)acc.name++;
      if(carriedName(pg,n,u,v)!==c.name)acc.carried++;}
  }
  if(acc.colour){const pc=colourGrid(P,tp),cc=colourGrid(C,tc);
    for(let y=1;y<=tc;y+=2)for(let x=1;x<=tc;x+=2){const u=(ox+x/tc)/2,v=(oy+y/tc)/2,c=cc[y*(tc+1)+x];
      const rgb=[0,1,2].map(i=>bilinear(pc,tp,u,v,o=>o[i]));acc.rgb.push(Math.hypot(rgb[0]-c[0],rgb[1]-c[1],rgb[2]-c[2]));}}
  return {parent:pt,child:ct};
}
export const newCrossAcc=(colour=true)=>({colour,dh:[],rgb:[],n:0,land:0,ocean:0,snow:0,forest:0,name:0,carried:0,shared:0,sharedOcean:0});
export function summariseCross(a){return {p50:quantile(a.dh,.5),p99:quantile(a.dh,.99),max:quantile(a.dh,1),rgbP50:quantile(a.rgb,.5),rgbP99:quantile(a.rgb,.99),
  snow:100*a.snow/Math.max(1,a.land),forest:100*a.forest/Math.max(1,a.land),name:100*a.name/Math.max(1,a.land),carriedName:100*a.carried/Math.max(1,a.land),ocean:100*a.ocean/Math.max(1,a.n),sharedOceanMismatch:a.sharedOcean,shared:a.shared,samples:a.n};}

/** Coarse-retention metrics on one tile (plan coarse-retention-edges method): the coarse surface is the
 * stored lattice bilinear; the reference is a dense 97^2 sample inside the tile. */
export function retentionTile(m,body,ts,cls,d,L,acc,M=96){
  const n=m.PATCH_SEGMENTS,t=m.directionTile(d,L),data=m.buildTile(body,t),g=[];
  for(let y=0;y<=n;y++)for(let x=0;x<=n;x++){const dd=m.tileDirection(t,x/n,y/n),s=ts(dd),c=cls(dd,s.groundHeightM,1);g.push({h:data.surfaceHeight[y*(n+1)+x],sw:c.weights[3],f:c.forestPotential?1:0});}
  const pts=[];let tmax=-1e9;
  for(let y=0;y<=M;y++)for(let x=0;x<=M;x++){const u=(x+.5)/(M+1),v=(y+.5)/(M+1),dd=m.tileDirection(t,u,v),s=ts(dd);if(s.groundHeightM<0)continue;const c=cls(dd,s.groundHeightM,1);pts.push({u,v,h:s.groundHeightM,snow:c.name===SNOW,f:c.forestPotential});tmax=Math.max(tmax,s.groundHeightM);}
  if(!pts.length)return;
  const sorted=pts.map(p=>p.h).sort((a,b)=>a-b),p90=sorted[Math.floor(.9*(sorted.length-1))];
  let cmax=-1e9;for(const q of g)cmax=Math.max(cmax,q.h);acc.summitLoss.push(tmax-cmax);
  if(data.meta&&m.readTileMetadata){const meta=m.readTileMetadata(t,data.meta);acc.metaSummitLoss.push(tmax-meta.maxH);}
  for(const p of pts){acc.land++;const cs=bilinear(g,n,p.u,p.v,o=>o.sw)>.5,cf=bilinear(g,n,p.u,p.v,o=>o.f)>.5,ch=bilinear(g,n,p.u,p.v,o=>o.h);
    acc.bias.push(ch-p.h);
    if(p.snow){acc.snowTrue++;if(cs)acc.snowKept++;}else if(cs)acc.snowFalse++;
    if(p.f){acc.forestTrue++;if(cf)acc.forestKept++;}else if(cf)acc.forestFalse++;
    if(p.h>=p90){acc.peak++;if(ch>=p90)acc.peakKept++;}else if(ch>=p90)acc.peakFalse++;}
}
export const newRetentionAcc=()=>({land:0,snowTrue:0,snowKept:0,snowFalse:0,forestTrue:0,forestKept:0,forestFalse:0,peak:0,peakKept:0,peakFalse:0,summitLoss:[],metaSummitLoss:[],bias:[]});
export function summariseRetention(a){const pct=(x,y)=>100*x/Math.max(1,y);return {snowKept:pct(a.snowKept,a.snowTrue),snowFalse:pct(a.snowFalse,a.land),forestKept:pct(a.forestKept,a.forestTrue),forestFalse:pct(a.forestFalse,a.land),
  peakKept:pct(a.peakKept,a.peak),peakFalseOfPeakArea:pct(a.peakFalse,a.peak),summitP50:upperMedian(a.summitLoss),summitMax:quantile(a.summitLoss,1),
  metaSummitP50:upperMedian(a.metaSummitLoss),metaSummitMax:quantile(a.metaSummitLoss,1),meanBiasM:a.bias.reduce((s,x)=>s+x,0)/Math.max(1,a.bias.length),tiles:a.summitLoss.length};}

/** Interleaved A/B build-time benchmark (same process, alternating, so machine load hits both). */
export function benchBuild(mods,body,dirs,levels,rounds=3){
  const out={};
  for(const m of mods)m.buildTile(body,m.directionTile(dirs[0],6));
  for(const L of levels){const ms=mods.map(()=>[]),bytes=mods.map(()=>0);
    for(let r=0;r<rounds;r++)for(const d of dirs)for(let i=0;i<mods.length;i++){const k=(i+r)%mods.length,m=mods[k],t=m.directionTile(d,L);
      const t0=performance.now(),res=m.buildTile(body,t);ms[k].push(performance.now()-t0);
      if(r===0){let b=0;for(const v of Object.values(res))if(v&&v.buffer instanceof ArrayBuffer)b+=v.byteLength;bytes[k]+=b;}}
    out[L]=mods.map((_,i)=>({meanMs:ms[i].reduce((a,c)=>a+c,0)/ms[i].length,p50Ms:quantile(ms[i],.5),bytesPerTile:bytes[i]/dirs.length}));}
  return out;
}

const fmt=(v,d=0)=>v===undefined||v===null||Number.isNaN(v)?'-':typeof v==='number'?v.toFixed(d):String(v);

async function main(){
  const args=Object.fromEntries(process.argv.slice(2).reduce((o,a,i,all)=>{if(a.startsWith('--'))o.push([a.slice(2),all[i+1]&&!all[i+1].startsWith('--')?all[i+1]:'1']);return o;},[]));
  const K=Number(args.k||16),after=await loadCheckout(new URL('../',import.meta.url)),before=args.before?await loadCheckout(args.before):null;
  const columns=before?[['BEFORE',before],['AFTER',after]]:[['AFTER',after]];
  const report={plan:PLAN_LOD_SHIPPED,k:K,cross:{},retention:{},build:null,started:new Date().toISOString()};
  const bodies=after.waterWorlds().filter(b=>b.name==='Maithea'||b.name==='Lethuris');
  console.log(`LOD consistency report (K=${K}); PLAN = plan.measuredBasis.lodShipped`);
  for(const body of bodies){
    report.cross[body.name]={};report.retention[body.name]={};
    console.log(`\n== ${body.name}: cross-level, coarse lattice bilinear at the child lattice vs child (heights m, RGB, disagreement %)`);
    console.log('pair     col    |dh| p50/p99/max      RGB p50/p99   snow%  name%(reclassified at coarse h) carried-name%  forest% ocean%  sharedOceanMismatch  tol p99/max(m) tol RGB');
    for(const L of [6,8,10,12,14]){
      for(const [label,m] of columns){
        const ts=m.terrainSampler(body),cls=m.biomeClassifier(body),acc=newCrossAcc();
        for(const d of crossDirections(ts,K))crossPair(m,body,ts,cls,d,L,acc);
        const s=summariseCross(acc);(report.cross[body.name][L]??={})[label]=s;
        const edge=after.tileEdgeM?after.tileEdgeM(body.radiusM,L):Math.PI/2*body.radiusM/2**L;
        console.log(`L${L}->${L+1} ${label.padEnd(6)} ${fmt(s.p50)}/${fmt(s.p99)}/${fmt(s.max)}`.padEnd(40)+` ${fmt(s.rgbP50,1)}/${fmt(s.rgbP99,1)}`.padEnd(14)+` ${fmt(s.snow,2).padStart(5)}  ${fmt(s.name,2).padStart(5)}  ${fmt(s.carriedName,2).padStart(5)}  ${fmt(s.forest,2).padStart(6)}  ${fmt(s.ocean,2).padStart(5)}  ${String(s.sharedOceanMismatch).padStart(6)}/${s.shared}`.padEnd(40)+` ${fmt(Math.max(5,.03*edge))}/${fmt(.08*edge)}  ${L<=6?12:L<=9?4:1}`);
      }
      const p=PLAN_LOD_SHIPPED.cross[body.name]?.[L];if(p)console.log(`L${L}->${L+1} PLAN   ${fmt(p.p50)}/${fmt(p.p99)}/${fmt(p.max)}`.padEnd(40)+` ${fmt(p.rgbP50,1)}/${fmt(p.rgbP99,1)}`.padEnd(14)+` ${fmt(p.snow,2).padStart(5)}  ${fmt(p.name,2).padStart(5)}          ${fmt(p.ocean,2).padStart(5)}`);
    }
    console.log(`\n== ${body.name}: coarse retention on edge tiles (dense 97^2 reference inside each tile)`);
    console.log('level col    snow kept/false+  forest kept/false+  peak kept (false+ of peak area)  summit loss p50/max  metadata maxH loss p50/max  mean bias');
    for(const L of [6,8,10]){
      for(const [label,m] of columns){
        const ts=m.terrainSampler(body),cls=m.biomeClassifier(body),acc=newRetentionAcc();
        for(const d of edgeDirections(ts,cls,K))retentionTile(m,body,ts,cls,d,L,acc);
        const s=summariseRetention(acc);(report.retention[body.name][L]??={})[label]=s;
        console.log(`L${L}    ${label.padEnd(6)} ${fmt(s.snowKept,1)}/${fmt(s.snowFalse,1)}`.padEnd(30)+`${fmt(s.forestKept,1)}/${fmt(s.forestFalse,1)}`.padEnd(20)+`${fmt(s.peakKept,1)}% (${fmt(s.peakFalseOfPeakArea,1)}%)`.padEnd(33)+`${fmt(s.summitP50)}/${fmt(s.summitMax)}`.padEnd(21)+`${fmt(s.metaSummitP50)}/${fmt(s.metaSummitMax)}`.padEnd(28)+fmt(s.meanBiasM));
      }
      const p=PLAN_LOD_SHIPPED.retention[body.name]?.[L];if(p)console.log(`L${L}    PLAN   ${fmt(p.snowKept,1)}/${fmt(p.snowFalse,1)}`.padEnd(30)+`${fmt(p.forestKept,1)}`.padEnd(20)+`${fmt(p.peakKept,1)}%`.padEnd(33)+`${fmt(p.summitP50)}/${fmt(p.summitMax)}`);
    }
  }
  if(args.bench&&before){
    const body=bodies[0],ts=after.terrainSampler(body),dirs=[];for(let i=0;dirs.length<(Number(args.benchK)||12)&&i<4000;i++){const d=fib(i*37%4000,4000);if(ts(d).groundHeightM>0)dirs.push(d);}
    const levels=[4,6,8,9,10,12,14,16,18];report.build=benchBuild([before,after],body,dirs,levels,Number(args.rounds)||3);
    console.log(`\n== build time, ${body.name}, interleaved A/B in one process (${dirs.length} tiles x ${Number(args.rounds)||3} rounds); plan shipped L4-L12 22.3-24.4 ms, L14-L18 9.2-10.1 ms`);
    console.log('level  BEFORE mean/p50 ms  AFTER mean/p50 ms  growth(mean)  bytes BEFORE/AFTER');
    for(const L of levels){const [b,a]=report.build[L];console.log(`L${L}`.padEnd(7)+`${fmt(b.meanMs,1)}/${fmt(b.p50Ms,1)}`.padEnd(20)+`${fmt(a.meanMs,1)}/${fmt(a.p50Ms,1)}`.padEnd(19)+`${fmt(100*(a.meanMs/b.meanMs-1),1)}%`.padEnd(14)+`${fmt(b.bytesPerTile)}/${fmt(a.bytesPerTile)}`);}
  }
  report.finished=new Date().toISOString();
  if(args.json)writeFileSync(args.json,JSON.stringify(report,null,1));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
