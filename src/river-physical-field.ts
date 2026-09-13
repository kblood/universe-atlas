import type {RiverRegion} from './river-types.ts';
import {buildRiverSurface, RIVER_PHYSICAL_SURFACE_VERSION, type RiverSurface} from './river-surface.ts';
import {buildRiverSurfaceBank, type RiverSurfaceBank} from './river-surface-bank.ts';

export {RIVER_PHYSICAL_SURFACE_VERSION};
export type RiverPhysicalField={surface:RiverSurface;bank:RiverSurfaceBank|null;retainedBytes:number;accountedCopiesBytes:number;rejected:string|null};
const fields=new WeakMap<RiverRegion,RiverPhysicalField>();
const sourceReserve=(surface:RiverSurface)=>surface.sources.reduce((n,s)=>n+(s.channelId.length*2)+16,0);
export function riverPhysicalField(region:RiverRegion):RiverPhysicalField{
 const cached=fields.get(region);if(cached)return cached;
 const surface=buildRiverSurface(region);let bank:RiverSurfaceBank|null=null,rejected=surface.diagnostics.rejected;
 if(!rejected&&surface.indices.length){try{bank=buildRiverSurfaceBank(surface);}catch(error){rejected=error instanceof Error?error.message:String(error);}}
 const retainedBytes=surface.diagnostics.canonicalBytes+surface.diagnostics.queryBytes+(bank?.bytes||0)+sourceReserve(surface);
 const field={surface,bank,rejected,retainedBytes,accountedCopiesBytes:retainedBytes*2};fields.set(region,field);return field;
}
