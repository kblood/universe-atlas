import {ForestSelectionCache} from './forest-selection-cache.ts';
import {PLANET_DETAIL as B} from './planet-detail.ts';
let cache:ForestSelectionCache|null=null,cacheKey='';

self.onmessage=({data})=>{
  const started=performance.now();
  const key=JSON.stringify([data.seed,data.radiusM,B.forestCellM]);
  if(!cache||key!==cacheKey){cache=new ForestSelectionCache(data.seed,data.radiusM,B.forestCellM);cacheKey=key;}
  const cells=cache.select(data.direction,B.forestFootprintM+100,B.canopyFootprintM);
  self.postMessage({requestId:data.requestId,direction:data.direction,cells,selectionMs:performance.now()-started,cache:cache.diagnostics()});
};
