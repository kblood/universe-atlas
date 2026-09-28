import {FOREST_CELL_M} from './planet-population.ts';
/** Distances are physical metres. These are presentation/streaming budgets,
 * except forestCellM, the frozen population-address input re-exported below. */
export const PLANET_DETAIL = Object.freeze({
  forestRadiusM: 4000,
  forestFootprintM: 650,
  canopyFootprintM: 4500,
  canopyCellM: 140,
  canopyCapacity: 8192,
  forestPrepareAltitudeM: 3500,
  forestStreamAltitudeM: 5500,
  forestCellM: FOREST_CELL_M,
  forestNearM: 110,
  forestCapacity: 4096,
  forestNearCapacity: 192,
  forestOriginRebaseM: 256,
  placementSamplesPerFrame: 48,
  placementBudgetMs: 2,
  populationCacheLimit: 24000,
  groundLifeAltitudeM: 350,
  flightDetailAltitudeM: 6000,
  touchdownPrepareM: 350,
  touchdownM: 125,
});

export function forestLod(distanceM: number): 0 | 1 | -1 {
  return distanceM<PLANET_DETAIL.forestNearM?0:distanceM<PLANET_DETAIL.forestRadiusM?1:-1;
}
