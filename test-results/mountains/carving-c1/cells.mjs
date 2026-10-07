// Count distinct point-memo cells touched by the placeAt perf set (40,000 Fibonacci dirs, WORLDS[0]).
import {pathToFileURL} from 'node:url';
const root=process.argv[2];
const imp=p=>import(pathToFileURL(root+'/'+p).href);
const {galaxies,refByAddress,system}=await imp('src/catalog.ts');
const {CATALOGUE_EPOCH_NS}=await imp('src/world-time.ts');
const {fibonacciDirection}=await imp('src/ocean-volume.ts');
const {placeAt}=await imp('src/place-query.ts');
const M=await imp('src/mountain-carving.ts');
const g0=galaxies('LETHRA-001')[0];const sys=system(refByAddress(g0,'G001/C2128,0,1/0')),body=sys.planets[1];
const ctx={sys,body,t:CATALOGUE_EPOCH_NS},N=40000,dirs=Array.from({length:N},(_,i)=>fibonacciDirection(i,N));
for(let pass=0;pass<2;pass++){const b=M.carvingBuildStats.count,s=M.carvingPointMemoStats.stores,h=M.carvingPointMemoStats.hits,t=performance.now();
  for(const d of dirs)placeAt(ctx,d);
  console.log(JSON.stringify({pass,builds:M.carvingBuildStats.count-b,stores:M.carvingPointMemoStats.stores-s,hits:M.carvingPointMemoStats.hits-h,evictions:M.carvingPointMemoStats.evictions??null,s:((performance.now()-t)/1000).toFixed(1)}));}
