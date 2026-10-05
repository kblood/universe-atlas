// Mountain element metrics (design/mountains prototype, docs/mountains-design-2026-10-04.md).
// Pure geometry, Node only, no browser, no GPU. Not part of npm test.
//
//   node scripts/mountain-metrics.mjs [--root <checkout>] [--out <file.json>] [--png <dir>] [--sites 8]
//
// --root defaults to this checkout. Point it at another checkout (read-only import) to compare
// a candidate field, e.g. the held RELIEF-PRESENT worktree.
//
// For each standard water world (Maithea, Selawyn, Raiva, Lethuris) it measures, on the current
// terrainSampler field:
//   E0 sites      deterministic mountain sites: the K highest well-separated land samples
//   E1 layout     regional 384 km raster at 2 km: orientation coherence of the height gradient in
//                 40 km windows (belts read linear; an isotropic maze reads low)
//   E2 envelope   hypsometry p50/p90/p99/max and the relief ratio (p99 land / height bound)
//   E3 crests     48 km raster at 125 m: crest flank angle (mean slope 500 m either side of a
//                 crest pixel), crest share, crest-curvature sharpness
//   E3b drainage  priority-flood closed-depression share (fill > 10 m) and pit density
//   E4 summits    peaks and topographic prominence (union-find on the 125 m raster)
//   E5 slopes     slope histogram at the 125 m and 1 km baselines
//   E6 valleys    local relief in 4 / 8 / 16 km windows
//   E7 spectrum   RMS height per octave (Hann-windowed transects, 62.5 m spacing, 128 km),
//                 and per LOD level the share of height variance above the tile lattice's
//                 Nyquist wavelength (2 x tileEdge/32), i.e. what a point-sampled coarse tile
//                 cannot represent and can only alias.
// --png writes hillshade PNGs (the single-element geometry render; no app renderer involved).
// --synthetic alpine|dome measures a synthetic calibration control instead of Atlas terrain.
// Site element names in this prototype predate the design doc's element numbering; the doc maps them.
import {mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {dirname,resolve,join} from 'node:path';

const argv=process.argv.slice(2);
const arg=(k,def)=>{const i=argv.indexOf('--'+k);return i<0?def:(argv[i+1]&&!argv[i+1].startsWith('--')?argv[i+1]:'1');};
const here=dirname(fileURLToPath(import.meta.url));
const ROOT=resolve(arg('root',join(here,'..')));
const imp=p=>import(pathToFileURL(join(ROOT,p)).href);
const {terrainSampler,bodyHeightBoundM,tectonicReliefOf,TERRAIN_VERSION}=await imp('src/terrain.ts');
const {fib,waterWorlds}=await imp('tests/terrain-climate-fixtures.mjs');
const K=Number(arg('sites',8));
const PNG_DIR=arg('png',null);
const OUT=arg('out',null);

import { measureSites, syntheticSampler, hillshade, writePng, q, r0, r1, r3, deg } from '../tests/helpers/mountain-metrics.mjs';
const SYN=arg('synthetic',null);

// ---------- per world ----------
const out={root:ROOT,terrainVersion:TERRAIN_VERSION,sites:K,worlds:{}};
if(PNG_DIR)mkdirSync(PNG_DIR,{recursive:true});
for(const body of SYN?waterWorlds().slice(0,1):waterWorlds()){
  const t0=Date.now();
  const ts=SYN?syntheticSampler(body.radiusM,SYN):terrainSampler(body),R=body.radiusM,bound=SYN?{maxM:5000}:bodyHeightBoundM(body),tau=SYN?1:tectonicReliefOf(body);
  // E2 envelope + E0 sites
  const N=20000,land=[];for(let i=0;i<N;i++){const d=fib(i,N),s=ts(d);if(!s.ocean)land.push({d,h:s.groundHeightM});}
  const H=land.map(x=>x.h);
  const envelope={landShare:r3(land.length/N),p50:r0(q(H,.5)),p90:r0(q(H,.9)),p99:r0(q(H,.99)),max:r0(q(H,1)),boundMaxM:r0(bound.maxM),
    reliefRatioP99:r3(q(H,.99)/bound.maxM),tau:r3(tau),above3km:r1(100*H.filter(h=>h>3000).length/H.length)};
  const sorted=[...land].sort((a,b)=>b.h-a.h),sites=[];const minSep=300e3/R; // radians
  for(const x of sorted){if(sites.length>=K)break;if(sites.every(s=>Math.acos(Math.min(1,s.d[0]*x.d[0]+s.d[1]*x.d[1]+s.d[2]*x.d[2]))>minSep))sites.push(x);}
  const measured=measureSites(ts,sites,R,{onRaster:(r,reg,si)=>{
    if(PNG_DIR&&si<2){for(const [grid,km] of [[r,48],[reg,384]])writePng(join(PNG_DIR,`${SYN?"synthetic-"+SYN:body.name}-site${si}-${km}km.png`),grid.n,grid.n,hillshade(grid,bound.maxM));}
  }});
  out.worlds[SYN?"synthetic-"+SYN:body.name]={radiusM:r0(R),envelope,
    sites:sites.map(s=>({h:r0(s.h),lat:r1(Math.asin(s.d[1])/deg)})),
    ...measured,seconds:r1((Date.now()-t0)/1000)};
  console.error(body.name,JSON.stringify(out.worlds[SYN?"synthetic-"+SYN:body.name]));}
const json=JSON.stringify(out,null,1);
if(OUT){mkdirSync(dirname(resolve(OUT)),{recursive:true});writeFileSync(OUT,json);}else console.log(json);
