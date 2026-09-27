import {forestPopulationCells} from './planet-population.ts';
import {PLANET_DETAIL as B} from './planet-detail.ts';

self.onmessage=({data})=>{
  const started=performance.now();
  const cells=forestPopulationCells(data.seed,data.direction,data.radiusM,B.forestFootprintM+100,B.canopyFootprintM,B.forestCellM);
  self.postMessage({direction:data.direction,cells,selectionMs:performance.now()-started});
};
