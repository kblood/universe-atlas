/** PlanetRenderer's combined memory budget and accounting, kept free of
 * renderer state so it can be checked directly. */
import {GROUND_RESOURCE_BYTES} from './ground-material.ts';
import {ROCK_BUDGET_BYTES} from './planet-rocks.ts';

export const TOTAL_BUDGET_BYTES=256*1024*1024;
// RiverWater has its own 16 MiB cap and the retained environment allocation is
// reserved here, so terrain admission cannot consume their headroom.
export const WATER_ENVIRONMENT_RESERVE_BYTES=28*1024*1024;
export const LIFE_RESERVE_BYTES=16*1024*1024;
// Surface rocks reserve their declared worst-case ceiling (geometry, instance
// buffers, staging, estimated records and per-update transients). Shared PBR
// textures are not part of it: they are GROUND_RESOURCE_BYTES, counted once.
export const ROCK_RESERVE_BYTES=ROCK_BUDGET_BYTES;
// The four PBR maps are physically shared across renderer leases, but each
// renderer reserves their full mip-chain cost so its local budget remains safe
// if its lifetime outlasts the lease that first initiated the shared load.
export const TERRAIN_BUDGET_BYTES=TOTAL_BUDGET_BYTES-WATER_ENVIRONMENT_RESERVE_BYTES-LIFE_RESERVE_BYTES-ROCK_RESERVE_BYTES-GROUND_RESOURCE_BYTES;
// n=32: 108336 bytes of geometry, doubled for CPU/GPU, plus a 130x130 RGBA
// map with the existing conservative 7/3 mip allocation.
export const PENDING_TILE_BYTES=108336*2+Math.ceil(67600*7/3);
export const RENDERER_MEMORY_BUDGET=Object.freeze({coreBytes:TOTAL_BUDGET_BYTES,terrainBytes:TERRAIN_BUDGET_BYTES,waterEnvironmentReserveBytes:WATER_ENVIRONMENT_RESERVE_BYTES,
  lifeReserveBytes:LIFE_RESERVE_BYTES,rockReserveBytes:ROCK_RESERVE_BYTES,groundResourceBytes:GROUND_RESOURCE_BYTES,pendingTileBytes:PENDING_TILE_BYTES});
/** Combined renderer memory.
 * - `accountedBytes`: what is allocated now. That is resident terrain, the
 *   ground atlas plus the shared PBR set (once), the ocean normal atlas when
 *   counted here, and rock-owned bytes (geometry, instances, staging, estimated
 *   records). Rock-owned bytes never include the shared PBR lease.
 * - `reservedCombinedBytes`: admission's view. That is resident terrain plus the
 *   fixed reserves (water environment, life, rocks), allocated cloud targets
 *   and pending tile reservations. Terrain admission keeps it within the core
 *   budget. */
export function rendererMemoryAccounting(p:{residentBytes:number;oceanNormalBytes:number;rockOwnedBytes:number;cloudAllocatedBytes:number;pendingTiles:number}){
  return {accountedBytes:p.residentBytes+GROUND_RESOURCE_BYTES+p.oceanNormalBytes+p.rockOwnedBytes,
    reservedCombinedBytes:p.residentBytes+GROUND_RESOURCE_BYTES+WATER_ENVIRONMENT_RESERVE_BYTES+LIFE_RESERVE_BYTES+ROCK_RESERVE_BYTES+p.cloudAllocatedBytes+p.pendingTiles*PENDING_TILE_BYTES};
}
