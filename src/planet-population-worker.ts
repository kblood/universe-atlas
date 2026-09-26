import {populationCells} from './planet-population.ts';
import {PLANET_DETAIL as B} from './planet-detail.ts';

self.onmessage=({data})=>{
  const started=performance.now();
  const cells=populationCells(data.seed,data.direction,data.radiusM,B.forestFootprintM,B.forestCellM);
  cells.push(...populationCells(data.seed,data.direction,data.radiusM,B.canopyFootprintM,B.canopyCellM)
    .map(cell=>({...cell,id:'canopy/'+cell.id})));
  self.postMessage({direction:data.direction,cells,selectionMs:performance.now()-started});
};
