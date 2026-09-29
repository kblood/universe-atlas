/** Static quality constants that shape desktop frame cost. Runtime values
 * (pixel ratio, drawing buffer, URL toggles, cloud allocation) are merged by
 * main.ts `__atlas.qualitySettings()`. Read-only diagnostics; nothing here
 * changes canonical content. */
import {PLANET_DETAIL} from './planet-detail.ts';
import {SURFACE_SHADOW} from './surface-lighting.ts';
import {CLOUD_QUALITY,CLOUD_TARGET_BUDGET_BYTES} from './volumetric-clouds.ts';
import {TILE_CACHE_LIMIT,TILE_DRAW_LIMIT,LIFE_SLOT_CAPACITY} from './planet-renderer.ts';
import {TOTAL_BUDGET_BYTES,LIFE_RESERVE_BYTES,WATER_ENVIRONMENT_RESERVE_BYTES} from './renderer-memory.ts';
import {FAUNA_FIELD_CAPACITY,FAUNA_FIELD_VISIBLE_M,FAUNA_FIELD_EYE_DETAIL_M} from './fauna-field-renderer.ts';
import {FAUNA_NEAR_RIG_EXIT_M} from './fauna-near-rig.ts';
import {FAUNA_LOD0_DISTANCE_M,FAUNA_LOD1_DISTANCE_M,FAUNA_VISIBLE_DISTANCE_M,FAUNA_LOD0_MAX_CONCURRENT_RIGS,FAUNA_LOD1_INSTANCE_BUDGET,FAUNA_LOD2_INSTANCE_BUDGET} from './fauna-runtime.ts';
import {ROCK_TIERS} from './rock-field.ts';
import {ROCK_BUDGET_BYTES,ROCK_WORK_BUDGET_MS,ROCK_DRAW_UNITS_PER_FRAME,ROCK_CELLS_PER_FRAME,ROCK_SAMPLES_PER_FRAME} from './planet-rocks.ts';

export function staticQualitySettings(){
  return {
    planetDetail:{...PLANET_DETAIL},
    terrain:{tileCacheLimit:TILE_CACHE_LIMIT,tileDrawLimit:TILE_DRAW_LIMIT,
      note:'contact/low-flight raise cache to 768 and draw to 450 (contact) or 390 (low flight) in PlanetRenderer.update'},
    memory:{coreBudgetBytes:TOTAL_BUDGET_BYTES,cloudTargetBudgetBytes:CLOUD_TARGET_BUDGET_BYTES,lifeReserveBytes:LIFE_RESERVE_BYTES,waterEnvironmentReserveBytes:WATER_ENVIRONMENT_RESERVE_BYTES},
    shadow:{...SURFACE_SHADOW},
    cloudsProfile:{desktop:{...CLOUD_QUALITY.desktop},immersive:{...CLOUD_QUALITY.immersive}},
    flora:{slotCapacity:LIFE_SLOT_CAPACITY},
    fauna:{fieldCapacity:FAUNA_FIELD_CAPACITY,fieldVisibleM:FAUNA_FIELD_VISIBLE_M,fieldEyeDetailM:FAUNA_FIELD_EYE_DETAIL_M,nearRigExitM:FAUNA_NEAR_RIG_EXIT_M,
      lod0DistanceM:FAUNA_LOD0_DISTANCE_M,lod1DistanceM:FAUNA_LOD1_DISTANCE_M,visibleDistanceM:FAUNA_VISIBLE_DISTANCE_M,
      lod0MaxConcurrentRigs:FAUNA_LOD0_MAX_CONCURRENT_RIGS,lod1InstanceBudget:FAUNA_LOD1_INSTANCE_BUDGET,lod2InstanceBudget:FAUNA_LOD2_INSTANCE_BUDGET},
    rocks:{tiers:ROCK_TIERS.map(t=>({...t})),budgetBytes:ROCK_BUDGET_BYTES,workBudgetMs:ROCK_WORK_BUDGET_MS,drawUnitsPerFrame:ROCK_DRAW_UNITS_PER_FRAME,
      cellsPerFrame:ROCK_CELLS_PER_FRAME,samplesPerFrame:ROCK_SAMPLES_PER_FRAME},
  };
}
