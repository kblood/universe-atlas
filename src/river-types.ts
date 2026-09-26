import type {V3} from './catalog.ts';
// Bumped alongside drainage-2: the regional-search candidate angle (river-
// generation.ts) and the catchment ranking/flow routing it builds on
// (drainage.ts) now use deterministic cross-engine math (src/det-math.ts)
// instead of native Math.atan2/Math.hypot/Math.acos for decision-feeding
// values, per docs/universe-atlas-v1-spec.md §3.
export const RIVER_VERSION='river-region-2';
// Geometry/profile records remain v1; the queried lake-bank interpolation has
// its own revision so exports do not imply that old bank samples are identical.
export const RIVER_SURFACE_VERSION='river-surface-3';
export type RiverPoint={x:number;z:number;waterM:number;widthM:number;depthM:number;distanceM:number};
export type RiverChannel={id:string;name:string;points:RiverPoint[];parentId:string|null};
export type RiverLake={id:string;name:string;x:number;z:number;radiusXM:number;radiusZM:number;angle:number;waterM:number;depthM:number};
export type RiverSite={id:string;name:string;kind:'river-bank'|'lake-shore'|'mouth';direction:V3;elevationM:number;lookDirection:V3};
export type RiverRegion={
 version:typeof RIVER_VERSION;id:string;parentCatchmentId:string;bodyId:string;bodySeed:string;radiusM:number;
 origin:V3;east:V3;north:V3;boundsM:[number,number,number,number];
 channels:RiverChannel[];lakes:RiverLake[];sites:RiverSite[];
 stats:{samples:number;lengthM:number;maxCutM:number;maxFillM:number;buildAlgorithm:string};
};
export type RiverSample={rockHeightM:number;waterLevelM:number|null;wet:boolean;bank:number;channelId:string|null;waterKind:'river'|'lake'|null;flow:[number,number];influence:number};
