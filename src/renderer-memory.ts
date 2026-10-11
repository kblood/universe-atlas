/** PlanetRenderer's combined memory budget and accounting, kept free of
 * renderer state so it can be checked directly. */
import {GROUND_RESOURCE_BYTES} from './ground-material.ts';
import {ROCK_BUDGET_BYTES} from './planet-rocks.ts';

export const TOTAL_BUDGET_BYTES=256*1024*1024;
// RiverWater has its own 16 MiB cap and the retained environment allocation is
// reserved here, so terrain admission cannot consume their headroom.
export const WATER_ENVIRONMENT_RESERVE_BYTES=28*1024*1024;
export const LEGACY_LIFE_RESERVE_BYTES=16*1024*1024;
/** Shared Composer admission80MiB, measured one-job-worker reserve40MiB,
 * staged/receiving results16MiB and flora16MiB. Total core stays256MiB: terrain receives the
 * remaining budget. These ceilings require the migration's live resource gate. */
export const LIFE_RESERVE_BYTES=152*1024*1024;
// Surface rocks reserve their declared worst-case ceiling (geometry, instance
// buffers, staging, estimated records and per-update transients). Shared PBR
// textures are not part of it: they are GROUND_RESOURCE_BYTES, counted once.
export const ROCK_RESERVE_BYTES=ROCK_BUDGET_BYTES;
// The four PBR maps are physically shared across renderer leases, but each
// renderer reserves their full mip-chain cost so its local budget remains safe
// if its lifetime outlasts the lease that first initiated the shared load.
export const TERRAIN_BUDGET_BYTES=TOTAL_BUDGET_BYTES-WATER_ENVIRONMENT_RESERVE_BYTES-LIFE_RESERVE_BYTES-ROCK_RESERVE_BYTES-GROUND_RESOURCE_BYTES;
/** Reserve only resources whose owners exist. Ocean-only worlds still retain
 * their shared normal atlas; they cannot allocate an absent river/environment. */
export function terrainBudgetForReservations(waterEnvironmentReserveBytes=WATER_ENVIRONMENT_RESERVE_BYTES,cloudAllocatedBytes=0){
  if(!Number.isFinite(waterEnvironmentReserveBytes)||waterEnvironmentReserveBytes<0||waterEnvironmentReserveBytes>WATER_ENVIRONMENT_RESERVE_BYTES||!Number.isFinite(cloudAllocatedBytes)||cloudAllocatedBytes<0)throw new Error('Invalid terrain resource reservation');
  return TOTAL_BUDGET_BYTES-waterEnvironmentReserveBytes-LIFE_RESERVE_BYTES-ROCK_RESERVE_BYTES-GROUND_RESOURCE_BYTES-cloudAllocatedBytes;
}
// n=32: 108336 bytes of geometry, doubled for CPU/GPU, plus a 130x130 RGBA
// map with the existing conservative 7/3 mip allocation.
export const PENDING_TILE_BYTES=108336*2+Math.ceil(67600*7/3);
/** Terrain byte-pressure policy (docs/terrain-budget-2026-09-29.md).
 * - New tiles (a key with no resident copy) are admitted only below
 *   `budget - refreshReserveBytes(inFlight)`. The reserve is `inFlight`
 *   worst-case pending tiles, so a same-key rebuild (a resident tile baked at a
 *   stale sea-level bucket) can always reserve its replacement beside the
 *   resident copy while `install` releases that copy.
 * - Ordinary (non-contact) splits that need new tiles stop at
 *   `TERRAIN_SPLIT_FRACTION` of the budget. Pressure starts only above that
 *   same fraction (a shrunk budget, or mandatory contact support) and ends
 *   below `TERRAIN_PRESSURE_EXIT_FRACTION`. Refinement therefore cannot re-enter
 *   pressure on its own, and a stationary view does not oscillate. */
export const TERRAIN_SPLIT_FRACTION=.94;
export const TERRAIN_PRESSURE_ENTER_FRACTION=.94;
export const TERRAIN_PRESSURE_EXIT_FRACTION=.90;
export const refreshReserveBytes=(inFlight:number)=>Math.max(1,inFlight)*PENDING_TILE_BYTES;
export function terrainAdmission(p:{budgetBytes:number;residentBytes:number;pendingTiles:number;inFlight:number}){
  const reserve=refreshReserveBytes(p.inFlight),next=p.residentBytes+(p.pendingTiles+1)*PENDING_TILE_BYTES;
  return {refreshReserveBytes:reserve,admissionCeilingBytes:p.budgetBytes-reserve,splitCeilingBytes:p.budgetBytes*TERRAIN_SPLIT_FRACTION,
    newTileFits:next<=p.budgetBytes-reserve,refreshFits:next<=p.budgetBytes};
}
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
export function rendererMemoryAccounting(p:{residentBytes:number;oceanNormalBytes:number;rockOwnedBytes:number;cloudAllocatedBytes:number;pendingTiles:number;waterEnvironmentReserveBytes?:number}){
  const waterReserve=p.waterEnvironmentReserveBytes??WATER_ENVIRONMENT_RESERVE_BYTES;
  return {accountedBytes:p.residentBytes+GROUND_RESOURCE_BYTES+p.oceanNormalBytes+p.rockOwnedBytes,
    reservedCombinedBytes:p.residentBytes+GROUND_RESOURCE_BYTES+waterReserve+LIFE_RESERVE_BYTES+ROCK_RESERVE_BYTES+p.cloudAllocatedBytes+p.pendingTiles*PENDING_TILE_BYTES};
}
