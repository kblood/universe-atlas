// Read-only diagnostic: placeAt cost and carving block builds on a checkout root (argv[2]); N dirs (argv[3]).
import {pathToFileURL} from 'node:url';
const root=process.argv[2], N=+process.argv[3]||4000, imp=p=>import(pathToFileURL(`${root}/${p}`).href);
const {galaxies,refByAddress,system}=await imp('src/catalog.ts');const {CATALOGUE_EPOCH_NS}=await imp('src/world-time.ts');
const {fibonacciDirection}=await imp('src/ocean-volume.ts');const {placeAt}=await imp('src/place-query.ts');const C=await imp('src/mountain-carving.ts');
const sys=system(refByAddress(galaxies('LETHRA-001')[0],'G001/C2128,0,1/0')),body=sys.planets[1],ctx={sys,body,t:CATALOGUE_EPOCH_NS};
const dirs=Array.from({length:N},(_,i)=>fibonacciDirection(i*Math.floor(40000/N),40000));
for(let r=0;r<2;r++){const b0=C.carvingBuildStats.count,t0=performance.now();let slow=0,maxMs=0;
  for(const d of dirs){const t=performance.now();placeAt(ctx,d);const ms=performance.now()-t;if(ms>1)slow++;maxMs=Math.max(maxMs,ms);}
  console.log(JSON.stringify({root:root.split('/').pop(),round:r,N,usPerCall:+((performance.now()-t0)/N*1000).toFixed(1),blockBuilds:C.carvingBuildStats.count-b0,callsOver1ms:slow,maxCallMs:+maxMs.toFixed(1)}));}
