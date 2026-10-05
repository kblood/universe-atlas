// Mountains assembly (step A, docs/mountains-assembly-2026-10-05.md): M4 rows R1-R3 on the REAL parameters of
// the four water worlds, after decision (g) (fixed M3 carving width) and massif-envelope-2.
//   node scripts/mountain-assembly-summits.mjs [outDir] [mainRoot]
// Part 1 (the M4 measurement, same method as scripts/mountain-render-summits.mjs real pairs): a straight belt
//   with the world's tau and real M1 belt half-width, composed exactly as terrain.ts does inside a belt
//   (mountainRidgeTermM with main's term 0), 8 seeds x (48 km local @125 m + 96 km wide @250 m), at the axis
//   and at y = .4 x the massif half-width. Core = |y| <= .65 x massif half-width; R2 in-belt = M1 belt >= .5
//   inside the massif (beltAt with the massif half-width, the stricter of the two).
//   Whole core (the R1 row): one 513 x 125 m raster per seed spanning the full core band at the axis.
// Part 2 (INFO, the assembled field): groundHeightM of terrainSampler on up to 8 real belt sites per world
//   (land, belt >= .5, on the axis, >= 300 km apart), 48 km @125 m rasters in the belt's own frame; the same
//   rasters on main (mainRoot, read-only) for comparison. Prominence >= 300 m; core = |axisDistance| <= .65 x
//   massif half-width.
import {mkdirSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {performance} from 'node:perf_hooks';
import {measureSummits,poolSummits,judgeM4,beltAt} from '../tests/helpers/mountain-summits.mjs';
import {prominence,rasterFromArray} from '../tests/helpers/mountain-metrics.mjs';
import {waterWorlds,fib} from '../tests/terrain-climate-fixtures.mjs';
import {terrainSampler,tectonicReliefOf,bodyHeightBoundM,TERRAIN_VERSION} from '../src/terrain.ts';
import {orogenLayout} from '../src/mountain-layout.ts';
import {maxEnvelopeM,massifHalfWidthM} from '../src/mountain-envelope.ts';
import {mountainRidgeTermM} from '../src/mountain-assembly.ts';

const dir=process.argv[2]||'test-results/mountains/assembly-2/m4',mainRoot=process.argv[3]||'C:/LLM/IWSDK/universe-atlas';
mkdirSync(dir,{recursive:true});const t0=performance.now();
const main=await import(pathToFileURL(`${mainRoot}/src/terrain.ts`).href);
const report={terrainVersion:TERRAIN_VERSION,mainTerrainVersion:main.TERRAIN_VERSION,synthetic:[],assembled:[]};
const save=()=>writeFileSync(`${dir}/report.json`,JSON.stringify(report,null,1)+'\n');

function composedRaster({site,w,tau,step,y0,n=385}){
  const h=new Float64Array(n*n),m=massifHalfWidthM(w),seeds=[730201+site],c=(n-1)/2;
  for(let p=0;p<h.length;p++){
    const x=site*1e6+(p%n-c)*step,y=y0+(Math.floor(p/n)-c)*step;
    h[p]=mountainRidgeTermM(0,{belt:beltAt(y,w),axisDistanceM:y,halfWidthM:w,beltIndex:0,alongM:x},1000,1,tau,seeds);
  }
  return {...rasterFromArray(h,n,step),site,w:m,tau,y0};
}
const compact=({peaks,...rest})=>rest;
for(const world of waterWorlds()){
  const tau=tectonicReliefOf(world),layout=orogenLayout(world),bodyBound=bodyHeightBoundM(world).maxM;let site;
  for(let i=0;i<20000;i++){const d=fib(i,20000),b=layout.sample(d);if(b.belt>=.5&&b.halfWidthM>=32000){site={d,b};break;}}
  const w=site.b.halfWidthM,m=massifHalfWidthM(w);
  for(const offset of [0,.4]){
    const ls=[],ws=[];let bodyViolations=0;
    for(let s=0;s<8;s++){
      const local=composedRaster({site:s,w,tau,step:125,y0:offset*m}),wide=composedRaster({site:s,w,tau,step:250,y0:offset*m});
      ls.push(measureSummits(local));ws.push(measureSummits(wide));
      for(const r of [local,wide])for(const h of r.h)if(!Number.isFinite(h)||h>bodyBound)bodyViolations++;
    }
    const pooled=poolSummits(ls,ws),rows=judgeM4(pooled);
    const row={class:'CONTRACT (M4 rows on real parameters)',world:world.name,tau,beltHalfWidthM:w,massifHalfWidthM:m,y0:offset*m,
      density:pooled.density,placement:pooled.placement,topCount:pooled.topCount,max:pooled.max,maxEnvelope:maxEnvelopeM(tau,'water'),
      boundViolations:pooled.boundViolations,bodyBound,bodyViolations,pass:rows.map(r=>({row:r.row,actual:r.actual,pass:r.pass})),
      perSeed:ls.map((l,i)=>({seed:730201+i,...compact(l)}))};
    report.synthetic.push(row);save();
    if(offset===0){
      // The whole belt core in one raster: 513 x 125 m = 64 km across >= 2 x .65 x 48 km = 62.4 km, so the
      // density is over the entire core band (the 48 km rasters above cover its centre or one flank only).
      const whole=[];for(let s=0;s<8;s++)whole.push(measureSummits(composedRaster({site:s,w,tau,step:125,y0:0,n:513})));
      const count=whole.reduce((a,r)=>a+r.count,0),area=whole.reduce((a,r)=>a+r.areaKm2,0);
      row.wholeCore={n:513,step:125,count,areaKm2:area,density:count*1000/area,pass:count*1000/area>=8};save();
      console.log(`M4 ${world.name} WHOLE CORE (64 km raster, 8 seeds): R1 ${(count*1000/area).toFixed(2)} over ${area.toFixed(0)} km2 ${count*1000/area>=8?'PASS':'FAIL'}`);
    }
    console.log(`M4 ${world.name} tau ${tau.toFixed(3)} w ${(w/1000).toFixed(1)} km massif ${(m/1000).toFixed(0)} km y=${offset}m: R1 ${pooled.density.toFixed(2)} R2 ${pooled.placement} R3 ${pooled.boundViolations} max ${pooled.max.toFixed(0)}/${maxEnvelopeM(tau,'water').toFixed(0)} body ${bodyViolations} ${rows.every(r=>r.pass)?'PASS':'FAIL'}`);
  }
}

// Part 2: assembled field.
const unit=v=>{const l=Math.hypot(...v);return v.map(x=>x/l);};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
for(const world of waterWorlds()){
  const R=world.radiusM,layout=orogenLayout(world),tsB=terrainSampler(world),tsA=main.terrainSampler(world),sites=[];
  for(let i=0;i<20000&&sites.length<8;i++){
    const d=fib(i,20000),o=layout.sample(d);
    if(o.belt<.5||o.halfWidthM<32000||Math.abs(o.axisDistanceM)>3000)continue;
    if(tsA(d).groundHeightM<=0)continue;
    if(sites.some(s=>Math.acos(Math.min(1,s.d[0]*d[0]+s.d[1]*d[1]+s.d[2]*d[2]))*R<300000))continue;
    sites.push({i,d,axis:[...o.axis],beltIndex:o.beltIndex,halfWidthM:o.halfWidthM});
  }
  const per=[];
  for(const s of sites){
    const n=385,step=125,across=unit(cross(s.d,s.axis)),hB=new Float64Array(n*n),hA=new Float64Array(n*n),core=new Uint8Array(n*n);
    let coreCells=0,coreLand=0;
    for(let p=0;p<n*n;p++){
      const x=(p%n-192)*step,y=(Math.floor(p/n)-192)*step,q=unit(s.d.map((v,j)=>v+(x*s.axis[j]+y*across[j])/R));
      const o=layout.sample(q);hB[p]=tsB(q).groundHeightM;hA[p]=tsA(q).groundHeightM;
      if(o.beltIndex===s.beltIndex&&Math.abs(o.axisDistanceM)<=.65*massifHalfWidthM(o.halfWidthM)){core[p]=1;coreCells++;if(hB[p]>0)coreLand++;}
    }
    const count=h=>prominence(rasterFromArray(h,n,step)).filter(p=>p.prom>=300&&core[p.p]).length,areaKm2=coreCells*step*step/1e6;
    const cB=count(hB),cA=count(hA);
    let maxB=-Infinity,maxA=-Infinity;for(let p=0;p<n*n;p++){maxB=Math.max(maxB,hB[p]);maxA=Math.max(maxA,hA[p]);}
    per.push({fib:s.i,beltIndex:s.beltIndex,halfWidthM:s.halfWidthM,areaKm2,coreLandShare:coreCells?coreLand/coreCells:0,
      branch:{count:cB,density:areaKm2?cB*1000/areaKm2:NaN,maxM:maxB},main:{count:cA,density:areaKm2?cA*1000/areaKm2:NaN,maxM:maxA}});
  }
  const area=per.reduce((a,p)=>a+p.areaKm2,0),sum=k=>per.reduce((a,p)=>a+p[k].count,0);
  const row={class:'INFO',world:world.name,sites:per.length,areaKm2:area,branchDensity:sum('branch')*1000/area,mainDensity:sum('main')*1000/area,perSite:per};
  report.assembled.push(row);save();
  console.log(`ASSEMBLED ${world.name}: ${per.length} sites, core ${area.toFixed(0)} km2, density branch ${row.branchDensity.toFixed(2)} vs main ${row.mainDensity.toFixed(2)} per 1000 km2`);
}
report.seconds=(performance.now()-t0)/1000;save();
// Gate: R1 on the whole core (offset-0 rows carry it); R2 and R3 on every raster. The 48 km axis and flank
// rasters' own R1 values are INFO (each covers only part of the core).
const gate=report.synthetic.flatMap(r=>[...(r.wholeCore?[{world:r.world,row:'R1 whole core',pass:r.wholeCore.pass}]:[]),
  ...r.pass.filter(x=>x.row!=='R1').map(x=>({world:r.world,row:`${x.row} y0=${r.y0}`,pass:x.pass}))]);
const fails=gate.filter(g=>!g.pass);report.gate=gate;save();
console.log(`wall ${report.seconds.toFixed(1)} s; M4 gate rows on real parameters: ${gate.length-fails.length}/${gate.length} pass`+(fails.length?' FAIL '+JSON.stringify(fails):''));
process.exitCode=fails.length?1:0;
