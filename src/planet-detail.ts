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
  /** Ground life (flora + fauna) turns on below this altitude... */
  groundLifeAltitudeM: 350,
  /** ...and, once on, stays on until the eye climbs above this one
   * (hysteresis, transition audit F3; see `altitudeGate`). */
  groundLifeAltitudeExitM: 380,
  flightDetailAltitudeM: 6000,
  touchdownPrepareM: 350,
  touchdownM: 125,
});

export function forestLod(distanceM: number): 0 | 1 | -1 {
  return distanceM<PLANET_DETAIL.forestNearM?0:distanceM<PLANET_DETAIL.forestRadiusM?1:-1;
}

/** Altitude gate with hysteresis (transition audit F3). A gate that is off
 * turns on below `enterM`; a gate that is on stays on until the altitude
 * reaches `exitM`. With `exitM > enterM`, hovering anywhere in the band keeps
 * the previous state, so a flight holding the threshold no longer flickers.
 * `exitM === enterM` is the old memoryless gate (`altitudeM < enterM`).
 * A non-finite altitude is off, as `altitudeM < enterM` was. */
export function altitudeGate(prevOn: boolean, altitudeM: number, enterM: number, exitM: number): boolean {
  if (!(exitM >= enterM)) throw new RangeError(`altitude gate exit ${exitM} must not be below enter ${enterM}`);
  return altitudeM < (prevOn ? exitM : enterM);
}
