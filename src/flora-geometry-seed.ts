import {hashSeedString} from './ocean-gerstner.ts';
import type {FloraKind} from './flora-field.ts';
/** Atlas batches one geometry per body, kind and LOD; individual seeds describe placement. */
export function floraGeometrySeed(bodySeed: string, kind: FloraKind): number {
  return hashSeedString(bodySeed + '/flora/' + kind);
}
