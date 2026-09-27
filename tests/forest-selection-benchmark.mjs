import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {forestPopulationCells} from '../src/planet-population.ts';
import {ForestSelectionCache} from '../src/forest-selection-cache.ts';
const radius=6000000,seed='CACHE-EARTH-SCALE',near=750,far=4500;
const normalize=v=>v.map(x=>x/Math.hypot(...v));
const digest=cells=>createHash('sha256').update(JSON.stringify(cells)).digest('hex');
const report={runtime:process.version,radiusM:radius,nearM:near,farM:far,seed,views:[],scope:'Node population selection only; not browser frame or GPU performance'};
for(const raw of [[0,0,1],[1,1,0],[1,1,1]]){
  const c=normalize(raw),cache=new ForestSelectionCache(seed,radius,18);
  let start=performance.now();const reference=forestPopulationCells(seed,c,radius,near,far,18),referenceMs=performance.now()-start;
  start=performance.now();const cold=cache.select(c,near,far),coldMs=performance.now()-start;
  assert.equal(digest(cold),digest(reference));
  const coldCache=cache.diagnostics(),warmMs=[];
  for(let i=0;i<5;i++){start=performance.now();const cells=cache.select(c,near,far);warmMs.push(performance.now()-start);assert.equal(digest(cells),digest(reference));}
  const moved=normalize([c[0]+50/radius,c[1],c[2]]);
  start=performance.now();const movedCells=cache.select(moved,near,far),movedMs=performance.now()-start;
  assert.equal(digest(movedCells),digest(forestPopulationCells(seed,moved,radius,near,far,18)));
  report.views.push({direction:c,cells:cold.length,referenceMs,coldMs,coldCache,warmMs,moved50mMs:movedMs,movedCache:cache.diagnostics(),digest:digest(cold)});
}
const out=process.env.ATLAS_RESULTS||'test-results/forest-selection-cache';await mkdir(out,{recursive:true});
await writeFile(`${out}/benchmark.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
