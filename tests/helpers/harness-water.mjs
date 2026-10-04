// Lowered-sea harness levels on the relief seabed (relief round 2026-10-03,
// P6-HARNESS-REPIN). Before surface-8 the harnesses pinned -4500/-4475 m:
// the old linear metre ramp's Maithea level at the catalogue date (61-68% of
// the volume lost). On the terrain-1.8.0 seabed -4500 m is 94.5% lost, an
// almost empty ocean, and the dated sea at the catalogue epoch is exactly 0.
// The harnesses now state a LOST-VOLUME FRACTION and resolve it through
// ocean-volume.ts levelForLoss on the body's own seabed, so they keep
// exercising a lowered sea with exposed shelf and a real deep ocean.
import {levelForLoss} from '../../src/ocean-volume.ts';

/** The lost ocean-volume fraction every lowered-sea harness exercises. */
export const HARNESS_OCEAN_LOSS=0.6;
/** The renderer's shared sea-level bucket (planet-renderer WATER_LEVEL_BUCKET_M,
 * world-surface snapWaterLevel). */
export const WATER_BUCKET_M=25;

const snap=levelM=>{const s=Math.round(levelM/WATER_BUCKET_M)*WATER_BUCKET_M;return s===0?0:s;};

/** `lowM`: the snapped level at `lossFraction`; `highM`: one bucket higher
 * (the "sea-level seek" partner). Maithea at 0.6: -2425 / -2400 m. */
export function loweredSeaLevels(body,lossFraction=HARNESS_OCEAN_LOSS){
  const lowM=snap(levelForLoss(body,lossFraction));
  return {lossFraction,lowM,highM:lowM+WATER_BUCKET_M};
}

/** Dated harnesses: the first whole `yearNs` step after `fromNs` whose dated
 * (snapped) sea is at or below `targetM`, by bisection on the year count. The
 * dated sea only falls after the catalogue epoch, and a whole number of the
 * body's orbital years keeps the sun direction of `fromNs`. Returns null if
 * the sea never gets that low before `untilNs`. */
export function firstDateAtOrBelow(levelAt,targetM,fromNs,yearNs,untilNs){
  let lo=0n,hi=(untilNs-fromNs)/yearNs;
  if(hi<=0n||levelAt(fromNs+hi*yearNs)>targetM)return null;
  if(levelAt(fromNs)<=targetM)return fromNs;
  while(hi-lo>1n){const mid=(lo+hi)/2n;if(levelAt(fromNs+mid*yearNs)<=targetM)hi=mid;else lo=mid;}
  return fromNs+hi*yearNs;
}

/** Two dates (whole orbital years after `fromNs`) whose dated sea levels are
 * exactly `loweredSeaLevels(body)` low and high. Returns null if either date
 * is missing or if a single year step skips a bucket (the first year at or
 * below the target is then already below it), so no caller can get an
 * inexact pair. */
export function datedLoweredSea(body,levelAt,fromNs,yearNs,untilNs,lossFraction=HARNESS_OCEAN_LOSS){
  const {lowM,highM}=loweredSeaLevels(body,lossFraction);
  const dateHighNs=firstDateAtOrBelow(levelAt,highM,fromNs,yearNs,untilNs);
  const dateLowNs=firstDateAtOrBelow(levelAt,lowM,fromNs,yearNs,untilNs);
  if(dateHighNs===null||dateLowNs===null)return null;
  const levelLowM=levelAt(dateLowNs),levelHighM=levelAt(dateHighNs);
  if(levelLowM!==lowM||levelHighM!==highM)return null;
  return {lossFraction,lowM,highM,dateLowNs,dateHighNs,levelLowM,levelHighM};
}
