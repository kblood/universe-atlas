// Footprint-reduction prototype (design/mountains, docs/mountains-design-2026-10-04.md, element E7).
// Pure Node, no browser. Not part of npm test.
//
//   node scripts/mountain-lod-footprint.mjs [--root <checkout>] [--k 4] [--out file.json]
//
// Re-measures the lod-consistency colour and class rows on the test's own tile selection
// (stratifiedEdgeDirections, 12 tiles, Maithea and Lethuris, pairs L6->7 and L8->9) twice:
//   point:     colour/class read at the grid point (what buildTile and the pinned test do today);
//   footprint: colour/class = the mean over k x k sub-samples covering the texel / lattice cell
//              (the contract's "coverage-weighted mean of the finer level", lod-ladder-contract §3).
// The point column must reproduce the test's measured values (that validates the emulation). The
// footprint column shows how much of each pinned row is aliasing of sub-texel / sub-lattice energy
// rather than LOD disagreement. Heights are not touched (buildTile's peak correction stays as is).
import {writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {dirname,resolve,join} from 'node:path';
const argv=process.argv.slice(2);
const arg=(k,def)=>{const i=argv.indexOf('--'+k);return i<0?def:argv[i+1];};
const here=dirname(fileURLToPath(import.meta.url));
const ROOT=resolve(arg('root',join(here,'..')));
const K=Number(arg('k',4));
const rep=await import(pathToFileURL(join(here,'lod-consistency-report.mjs')).href);
const m=await rep.loadCheckout(ROOT);
const q=(a,p)=>{const s=Float64Array.from(a).sort();return s[Math.floor(p*(s.length-1))];};
const r2=v=>Math.round(v*100)/100;
function bilinear(g,n,u,v,f){const gx=Math.min(n-1e-9,u*n),gy=Math.min(n-1e-9,v*n),ix=Math.floor(gx),iy=Math.floor(gy),a=gx-ix,b=gy-iy,s=n+1;
  const p=(i,j)=>f(g[j*s+i]);return p(ix,iy)*(1-a)*(1-b)+p(ix+1,iy)*a*(1-b)+p(ix,iy+1)*(1-a)*b+p(ix+1,iy+1)*a*b;}
const SNOW_W=3;
/** Grid of colour (res) or class weights (lattice) on tile t; mode 'point' | 'footprint'. */
function colourGrid(ts,t,res,mode){const g=[];for(let y=0;y<=res;y++)for(let x=0;x<=res;x++){
  if(mode==='point'){g.push(ts(m.tileDirection(t,x/res,y/res)).color);continue;}
  const c=[0,0,0];for(let j=0;j<K;j++)for(let i=0;i<K;i++){const s=ts(m.tileDirection(t,(x+(i+.5)/K-.5)/res,(y+(j+.5)/K-.5)/res)).color;c[0]+=s[0];c[1]+=s[1];c[2]+=s[2];}
  g.push(c.map(v=>v/(K*K)));}return g;}
function classGrid(ts,cls,t,n,mode){const g=[];for(let y=0;y<=n;y++)for(let x=0;x<=n;x++){
  const at=(u,v)=>{const d=m.tileDirection(t,u,v),s=ts(d);if(s.groundHeightM<0)return {land:0,snow:0,forest:0};const c=cls(d,s.groundHeightM,1);return {land:1,snow:c.weights[SNOW_W],forest:c.forestPotential?1:0};};
  if(mode==='point'){g.push(at(x/n,y/n));continue;}
  const a={land:0,snow:0,forest:0};for(let j=0;j<K;j++)for(let i=0;i<K;i++){const o=at((x+(i+.5)/K-.5)/n,(y+(j+.5)/K-.5)/n);a.land+=o.land;a.snow+=o.snow;a.forest+=o.forest;}
  g.push({land:a.land/(K*K),snow:a.snow/(K*K),forest:a.forest/(K*K)});}return g;}
const out={root:ROOT,k:K,worlds:{}};
for(const body of m.waterWorlds().filter(b=>b.name==='Maithea'||b.name==='Lethuris')){
  const ts=m.terrainSampler(body),cls=m.biomeClassifier(body),picks=rep.stratifiedEdgeDirections(ts,cls),dirs=Object.values(picks).flat();
  out.worlds[body.name]={};
  for(const L of [6,8]){const row={};
    for(const mode of ['point','footprint']){const rgb=[];let land=0,snow=0,forest=0;
      for(const d of dirs){const P=m.directionTile(d,L),C=m.directionTile(d,L+1),ox=C.x-P.x*2,oy=C.y-P.y*2;
        // colour rows exactly as crossPair: 128-texel grids on both levels, child odd texels
        const tp=128,tc=128,pc=colourGrid(ts,P,tp,mode),cc=colourGrid(ts,C,tc,mode);
        for(let y=1;y<=tc;y+=2)for(let x=1;x<=tc;x+=2){const u=(ox+x/tc)/2,v=(oy+y/tc)/2,c=cc[y*(tc+1)+x];const p=[0,1,2].map(i=>bilinear(pc,tp,u,v,o=>o[i]));rgb.push(Math.hypot(p[0]-c[0],p[1]-c[1],p[2]-c[2]));}
        // class rows: lattice 32, child non-shared vertices, land by the child's point height
        const n=m.PATCH_SEGMENTS,pg=classGrid(ts,cls,P,n,mode),cg=classGrid(ts,cls,C,n,mode);
        for(let y=0;y<=n;y++)for(let x=0;x<=n;x++){if(x%2===0&&y%2===0)continue;const c=cg[y*(n+1)+x];
          if(ts(m.tileDirection(C,x/n,y/n)).groundHeightM<0)continue;land++;const u=(ox+x/n)/2,v=(oy+y/n)/2;
          if((bilinear(pg,n,u,v,o=>o.snow)>.5)!==(c.snow>.5))snow++;
          if((bilinear(pg,n,u,v,o=>o.forest)>.5)!==(c.forest>.5))forest++;}}
      row[mode]={rgbP50:r2(q(rgb,.5)),rgbP99:r2(q(rgb,.99)),snow:r2(100*snow/land),forest:r2(100*forest/land)};}
    out.worlds[body.name][`L${L}`]=row;console.error(body.name,L,JSON.stringify(row));}}
const json=JSON.stringify(out,null,1);const o=arg('out',null);
if(o){mkdirSync(dirname(resolve(o)),{recursive:true});writeFileSync(o,json);}else console.log(json);
