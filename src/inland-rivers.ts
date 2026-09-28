import type {Body} from './catalog.ts';
import type {RiverRegion} from './river-types.ts';

/**
 * Inland rivers are temporarily withdrawn from the Atlas. This module is the
 * one production boundary for that decision.
 *
 * Regional lakes are not an independent feature: every inland lake is a
 * `RiverRegion.lakes` entry created by river-generation.ts, so its bowl, water
 * surface and reflection are withdrawn together with the channels. Dated
 * global oceans do not come from a RiverRegion and are unaffected.
 *
 * While disabled, no application path builds canonical hydrology, carves a
 * channel/lake bowl, samples inland wetness, tints a bank, renders river/lake
 * water or gates contact terrain on hydrology — even if a stale Body object
 * still carries `hydrology`/`canonicalRivers`. The river source modules stay
 * in the tree as archived algorithms; their historical Node tests opt back in
 * through `setArchivedInlandRiversForTesting`, which application code must
 * never call (tests/inland-rivers-disabled.test.mjs checks this).
 */
let archivedInlandRivers = false;

export function inlandRiversEnabled(): boolean { return archivedInlandRivers; }

/** Test-only: re-enables the archived river pipeline in the current process
 * so the historical river algorithm tests keep exercising it unchanged. */
export function setArchivedInlandRiversForTesting(enabled: boolean): void { archivedInlandRivers = enabled; }

/** Regions production terrain may read. Empty while rivers are withdrawn. */
export function activeRiverRegions(body: Pick<Body, 'canonicalRivers' | 'hydrology'>): RiverRegion[] {
  if (!archivedInlandRivers) return [];
  return body.canonicalRivers ?? (body.hydrology ? [body.hydrology] : []);
}

/** The single region selected for rich water/reflection/dressing render. */
export function activeRenderedRiverRegion(body: Pick<Body, 'hydrology'>): RiverRegion | null {
  return archivedInlandRivers ? body.hydrology ?? null : null;
}

export const INLAND_RIVERS_UNAVAILABLE = 'Inland rivers and their regional lakes are currently unavailable.';
/** Shown when an old `?river=` bookmark opens the ordinary body view. */
export const INLAND_RIVERS_UNAVAILABLE_NOTICE = `${INLAND_RIVERS_UNAVAILABLE} This river link opens the ordinary world instead.`;
