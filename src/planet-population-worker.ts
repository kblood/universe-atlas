import {ForestSelectionCache} from './forest-selection-cache.ts';
import {PLANET_DETAIL as B} from './planet-detail.ts';
import {packForestSelection} from './forest-selection-transfer.ts';
let cache:ForestSelectionCache|null=null,cacheKey='';

self.onmessage=({data})=>{
  const started=performance.now();
  const key=JSON.stringify([data.seed,data.radiusM,B.forestCellM]);
  if(!cache||key!==cacheKey){cache=new ForestSelectionCache(data.seed,data.radiusM,B.forestCellM);cacheKey=key;}
  const cells=cache.select(data.direction,B.forestFootprintM+100,B.canopyFootprintM);
  const selectionMs=performance.now()-started,packStarted=performance.now();
  const packed=packForestSelection(cells),packMs=performance.now()-packStarted;
  // Only the fresh response buffer is transferred. Resident cache arrays stay
  // owned by this worker and remain usable by the next selection.
  self.postMessage({requestId:data.requestId,direction:data.direction,packed,selectionMs,packMs,cache:cache.diagnostics()},[packed.buffer]);
};
