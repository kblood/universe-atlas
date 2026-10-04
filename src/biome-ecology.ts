/**
 * Deterministic ecological composition fixtures for the biome lab.
 *
 * Placements use absolute, flat X/Z metres.  This module deliberately has no
 * renderer or planet dependency: a future planet integration supplies its own
 * climate and cell-ownership rules.
 */
import type {EcoRoleId} from './eco-assemblages.ts';
export type BiomeId = 'woodland' | 'conifer' | 'grassland' | 'dry-scrub' |
  'wetland' | 'coast' | 'alpine' | 'volcanic' | 'regolith' |
  // Appended for ECO-CLASS-1 (BIOME2-ECO): one lab biome per eco class that had none.
  'tundra' | 'alpine-meadow' | 'boreal-taiga' | 'savanna' | 'rainforest' | 'hot-desert' | 'ice-margin';
export type ElementKind = 'tree' | 'shrub' | 'grass' | 'rock';
export type ElementRecipe = {
  id: string; name: string; kind: ElementKind; form: string;
  color: string; minSizeM: number; maxSizeM: number;
};
export type BiomeDefinition = {
  id: BiomeId; name: string; description: string; groundColor: string;
  elements: {recipeId: string; densityPerHa: number}[];
  fauna: {name: string; role: string; status: 'planned'}[];
  /** Optional ground patches painted by the lab only (snow gravel, ponds, red
   * soil, dune ripples). Never read by generateBiomePatch, so never in a digest. */
  groundAccent?: {color: string; cover: number; scaleM: number};
};
export type BiomePatchConfig = {
  seed: string; biome: BiomeId; blendBiome?: BiomeId;
  sizeM?: number; originX?: number; originZ?: number;
};
export type BiomePlacement = {
  id: string; recipeId: string; kind: ElementKind;
  x: number; z: number; sizeM: number; rotation: number; color: string;
};
export type BiomePatch = {
  version: string; config: BiomePatchConfig; placements: BiomePlacement[];
  counts: Record<ElementKind, number>; recipeCounts: Record<string, number>;
  areaHa: number; canopyCoverEstimate: number; groundCoverEstimate: number;
  rejected: {competition: number}; digest: string;
};

// Bumped from biome-ecology-1: the tie-break comparators below now use plain
// code-unit comparison instead of String.localeCompare, which collates by
// the platform/OS default locale (da-DK on this machine) rather than a fixed
// rule and is not guaranteed consistent even for the same locale across
// engines. See docs/universe-atlas-v1-spec.md §3 (sort keys must be
// deterministic across browsers). This is embedded in candidateKey(), so it
// also re-seeds every placement draw, not just the final ordering.
export const BIOME_ECOLOGY_VERSION = 'biome-ecology-2';
/** Plain code-unit string comparison: portable across locales/engines, unlike
 * String.prototype.localeCompare (collation is locale- and engine-dependent). */
const ordCompare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export const ELEMENT_RECIPES: readonly ElementRecipe[] = Object.freeze(([
  {id: 'oak', name: 'Broadleaf oak', kind: 'tree', form: 'broadleaf', color: '#54733d', minSizeM: 6, maxSizeM: 13},
  {id: 'birch', name: 'Silver birch', kind: 'tree', form: 'broadleaf', color: '#789553', minSizeM: 5, maxSizeM: 11},
  {id: 'pine', name: 'Pine', kind: 'tree', form: 'conifer', color: '#315b3d', minSizeM: 7, maxSizeM: 15},
  {id: 'spruce', name: 'Spruce', kind: 'tree', form: 'conifer', color: '#254c38', minSizeM: 6, maxSizeM: 14},
  {id: 'willow', name: 'Wetland willow', kind: 'tree', form: 'broadleaf', color: '#647d42', minSizeM: 4, maxSizeM: 9},
  {id: 'hazel', name: 'Hazel bush', kind: 'shrub', form: 'rounded-bush', color: '#59743a', minSizeM: 0.7, maxSizeM: 2.2},
  {id: 'sage', name: 'Dry sage bush', kind: 'shrub', form: 'low-scrub', color: '#8b8b55', minSizeM: 0.45, maxSizeM: 1.5},
  {id: 'saltbush', name: 'Coastal saltbush', kind: 'shrub', form: 'low-scrub', color: '#89946b', minSizeM: 0.4, maxSizeM: 1.25},
  {id: 'alpine-shrub', name: 'Alpine cushion shrub', kind: 'shrub', form: 'cushion', color: '#68734c', minSizeM: 0.35, maxSizeM: 1.1},
  {id: 'meadow-grass', name: 'Meadow grass', kind: 'grass', form: 'tuft', color: '#91a94c', minSizeM: 0.25, maxSizeM: 0.8},
  {id: 'dry-grass', name: 'Dry bunch grass', kind: 'grass', form: 'tuft', color: '#b2a259', minSizeM: 0.2, maxSizeM: 0.65},
  {id: 'reed', name: 'Marsh reed', kind: 'grass', form: 'reed-clump', color: '#708942', minSizeM: 0.5, maxSizeM: 1.5},
  {id: 'beach-grass', name: 'Beach grass', kind: 'grass', form: 'tuft', color: '#a7a465', minSizeM: 0.2, maxSizeM: 0.7},
  {id: 'alpine-grass', name: 'Alpine grass', kind: 'grass', form: 'low-tuft', color: '#879657', minSizeM: 0.15, maxSizeM: 0.5},
  {id: 'rounded-rock', name: 'Rounded fieldstone', kind: 'rock', form: 'rounded', color: '#68706b', minSizeM: 0.35, maxSizeM: 2.2},
  {id: 'angular-rock', name: 'Angular rock', kind: 'rock', form: 'angular', color: '#777064', minSizeM: 0.35, maxSizeM: 2.8},
  {id: 'slab-rock', name: 'Layered slab', kind: 'rock', form: 'slab', color: '#6e6b61', minSizeM: 0.6, maxSizeM: 3.4},
  {id: 'volcanic-rock', name: 'Volcanic clinker', kind: 'rock', form: 'angular', color: '#383534', minSizeM: 0.3, maxSizeM: 2.6},
  {id: 'regolith-rock', name: 'Regolith fragment', kind: 'rock', form: 'angular', color: '#8d8476', minSizeM: 0.2, maxSizeM: 1.8},
  // Appended for ECO-CLASS-1 (BIOME2-ECO). Tree heights stay <= 16 m so every
  // footprint is within MAX_FOOTPRINT_M (4 m) and the 16 m competition halo.
  {id: 'dwarf-birch', name: 'Dwarf birch', kind: 'shrub', form: 'dwarf-shrub', color: '#8a5634', minSizeM: 0.25, maxSizeM: 0.7},
  {id: 'dwarf-willow', name: 'Dwarf willow', kind: 'shrub', form: 'dwarf-shrub', color: '#7c8c4c', minSizeM: 0.2, maxSizeM: 0.55},
  {id: 'sedge-tussock', name: 'Sedge tussock', kind: 'grass', form: 'tussock', color: '#9a8c54', minSizeM: 0.25, maxSizeM: 0.6},
  {id: 'lichen-rock', name: 'Lichen-crusted rock', kind: 'rock', form: 'lichen-rock', color: '#8c8a7e', minSizeM: 0.3, maxSizeM: 1.6},
  {id: 'cushion-plant', name: 'Cushion plant', kind: 'shrub', form: 'cushion-dome', color: '#6c8c42', minSizeM: 0.15, maxSizeM: 0.45},
  {id: 'acacia-umbrella', name: 'Umbrella acacia', kind: 'tree', form: 'umbrella', color: '#6b7c38', minSizeM: 5, maxSizeM: 11},
  {id: 'tall-grass', name: 'Tall savanna grass', kind: 'grass', form: 'tall-tuft', color: '#c8aa56', minSizeM: 0.7, maxSizeM: 1.6},
  {id: 'buttress-broadleaf', name: 'Buttress broadleaf', kind: 'tree', form: 'buttress', color: '#2d5a28', minSizeM: 11, maxSizeM: 16},
  {id: 'columnar-succulent', name: 'Columnar succulent', kind: 'tree', form: 'columnar', color: '#5b7a44', minSizeM: 2.5, maxSizeM: 7},
  {id: 'ephemeral-herb', name: 'Flowering herb', kind: 'grass', form: 'flower-herb', color: '#7c9846', minSizeM: 0.15, maxSizeM: 0.45},
  {id: 'moss-mat', name: 'Moss and lichen mat', kind: 'grass', form: 'mat', color: '#7b8850', minSizeM: 0.06, maxSizeM: 0.18},
  {id: 'taiga-spruce', name: 'Taiga spruce', kind: 'tree', form: 'spire', color: '#1e3e2d', minSizeM: 8, maxSizeM: 16},
  {id: 'termite-mound', name: 'Termite mound', kind: 'rock', form: 'mound', color: '#9a6340', minSizeM: 1.0, maxSizeM: 2.6},
  {id: 'understory-palm', name: 'Understory palm', kind: 'shrub', form: 'fan-palm', color: '#3c7832', minSizeM: 1.2, maxSizeM: 3.2},
  {id: 'thorn-scrub', name: 'Thorn scrub', kind: 'shrub', form: 'thorn', color: '#77703f', minSizeM: 0.5, maxSizeM: 1.6},
] as ElementRecipe[]).map(recipe => Object.freeze(recipe)));

export const BIOME_DEFINITIONS: readonly BiomeDefinition[] = Object.freeze(([
  {id: 'woodland', name: 'Temperate woodland', description: 'Broadleaf trees with an open grassy understory.', groundColor: '#536b38', elements: [{recipeId: 'oak', densityPerHa: 48}, {recipeId: 'birch', densityPerHa: 34}, {recipeId: 'hazel', densityPerHa: 100}, {recipeId: 'meadow-grass', densityPerHa: 145}, {recipeId: 'rounded-rock', densityPerHa: 18}], fauna: [{name: 'Canopy browser', role: 'foliage feeder', status: 'planned'}, {name: 'Ground forager', role: 'seed disperser', status: 'planned'}]},
  {id: 'conifer', name: 'Conifer forest', description: 'Tall, dark conifers with sparse stones and understory.', groundColor: '#354f36', elements: [{recipeId: 'pine', densityPerHa: 52}, {recipeId: 'spruce', densityPerHa: 38}, {recipeId: 'hazel', densityPerHa: 40}, {recipeId: 'meadow-grass', densityPerHa: 75}, {recipeId: 'slab-rock', densityPerHa: 20}], fauna: [{name: 'Cone eater', role: 'seed feeder', status: 'planned'}, {name: 'Forest hunter', role: 'predator', status: 'planned'}]},
  {id: 'grassland', name: 'Open grassland', description: 'Dense grass fixtures with scattered shrubs and fieldstones.', groundColor: '#8a9b48', elements: [{recipeId: 'meadow-grass', densityPerHa: 250}, {recipeId: 'hazel', densityPerHa: 40}, {recipeId: 'rounded-rock', densityPerHa: 24}], fauna: [{name: 'Grazing herd', role: 'grazer', status: 'planned'}, {name: 'Burrowing forager', role: 'soil engineer', status: 'planned'}]},
  {id: 'dry-scrub', name: 'Dry scrub', description: 'Low dry shrubs, bunch grass and exposed angular stone.', groundColor: '#a18c58', elements: [{recipeId: 'sage', densityPerHa: 145}, {recipeId: 'dry-grass', densityPerHa: 155}, {recipeId: 'angular-rock', densityPerHa: 42}], fauna: [{name: 'Drought browser', role: 'shrub feeder', status: 'planned'}, {name: 'Rock runner', role: 'insect eater', status: 'planned'}]},
  {id: 'wetland', name: 'Fresh wetland', description: 'Reeds and wet-tolerant trees along shallow ground.', groundColor: '#506f4a', elements: [{recipeId: 'reed', densityPerHa: 260}, {recipeId: 'willow', densityPerHa: 25}, {recipeId: 'meadow-grass', densityPerHa: 90}, {recipeId: 'rounded-rock', densityPerHa: 8}], fauna: [{name: 'Wading filter-feeder', role: 'water-edge feeder', status: 'planned'}, {name: 'Reed nester', role: 'insect eater', status: 'planned'}]},
  {id: 'coast', name: 'Windward coast', description: 'Salt-tolerant grasses, low shrubs and rounded shore stone.', groundColor: '#a7a276', elements: [{recipeId: 'beach-grass', densityPerHa: 210}, {recipeId: 'saltbush', densityPerHa: 70}, {recipeId: 'rounded-rock', densityPerHa: 55}], fauna: [{name: 'Shore scavenger', role: 'detritus feeder', status: 'planned'}, {name: 'Dune burrower', role: 'soil engineer', status: 'planned'}]},
  {id: 'alpine', name: 'Alpine slope', description: 'Low hardy plants among slabs and angular exposed rock.', groundColor: '#70785b', elements: [{recipeId: 'alpine-grass', densityPerHa: 135}, {recipeId: 'alpine-shrub', densityPerHa: 65}, {recipeId: 'slab-rock', densityPerHa: 65}, {recipeId: 'angular-rock', densityPerHa: 35}], fauna: [{name: 'Highland grazer', role: 'grazer', status: 'planned'}, {name: 'Cliff scavenger', role: 'predator', status: 'planned'}]},
  {id: 'volcanic', name: 'Volcanic field', description: 'Sterile clinker and fractured lava representation.', groundColor: '#403b39', elements: [{recipeId: 'volcanic-rock', densityPerHa: 150}, {recipeId: 'slab-rock', densityPerHa: 50}, {recipeId: 'angular-rock', densityPerHa: 38}], fauna: []},
  {id: 'regolith', name: 'Regolith plain', description: 'Sterile mineral fragments without living elements.', groundColor: '#81796f', elements: [{recipeId: 'regolith-rock', densityPerHa: 120}, {recipeId: 'angular-rock', densityPerHa: 30}], fauna: []},
  // Appended for ECO-CLASS-1 (BIOME2-ECO). Fauna stay 'planned'; their planet
  // role ids are in BIOME_ECO_LINKS below.
  {id: 'tundra', name: 'Arctic tundra', description: 'Treeless sedge tussocks, dwarf birch and willow, moss mats, lichen stones and meltwater ponds.', groundColor: '#6c674a', groundAccent: {color: '#3b4a4e', cover: 0.09, scaleM: 11}, elements: [{recipeId: 'sedge-tussock', densityPerHa: 300}, {recipeId: 'moss-mat', densityPerHa: 220}, {recipeId: 'dwarf-birch', densityPerHa: 130}, {recipeId: 'dwarf-willow', densityPerHa: 90}, {recipeId: 'lichen-rock', densityPerHa: 35}], fauna: [{name: 'Reindeer-like herd', role: 'migratory grazer', status: 'planned'}, {name: 'Musk-ox-like browser', role: 'heavy-coat browser', status: 'planned'}, {name: 'Arctic-fox-like runner', role: 'small predator', status: 'planned'}, {name: 'Wolf-like hunter', role: 'pack predator', status: 'planned'}]},
  {id: 'alpine-meadow', name: 'Alpine meadow', description: 'Short flowering turf and cushion plants among scree and slabs above the treeline.', groundColor: '#5c7c3a', groundAccent: {color: '#85857a', cover: 0.12, scaleM: 7}, elements: [{recipeId: 'alpine-grass', densityPerHa: 230}, {recipeId: 'ephemeral-herb', densityPerHa: 210}, {recipeId: 'cushion-plant', densityPerHa: 70}, {recipeId: 'slab-rock', densityPerHa: 40}, {recipeId: 'angular-rock', densityPerHa: 30}], fauna: [{name: 'Ibex-like climber', role: 'cliff grazer', status: 'planned'}, {name: 'Chamois-like runner', role: 'agile grazer', status: 'planned'}, {name: 'Snow-leopard-like stalker', role: 'ambush predator', status: 'planned'}]},
  {id: 'boreal-taiga', name: 'Boreal taiga', description: 'Dense narrow spruce spires over moss, pale lichen carpet and dwarf shrubs, with a few birches.', groundColor: '#33422e', groundAccent: {color: '#a3a88a', cover: 0.16, scaleM: 6}, elements: [{recipeId: 'taiga-spruce', densityPerHa: 160}, {recipeId: 'birch', densityPerHa: 14}, {recipeId: 'dwarf-birch', densityPerHa: 70}, {recipeId: 'moss-mat', densityPerHa: 220}, {recipeId: 'lichen-rock', densityPerHa: 15}], fauna: [{name: 'Moose-like browser', role: 'wetland browser', status: 'planned'}, {name: 'Lynx-like hunter', role: 'stalking predator', status: 'planned'}, {name: 'Bear-like forager', role: 'omnivore', status: 'planned'}]},
  {id: 'savanna', name: 'Savanna', description: 'Tall golden grass with scattered flat-topped umbrella trees, thorn scrub and termite mounds.', groundColor: '#a4884a', groundAccent: {color: '#8d653c', cover: 0.12, scaleM: 9}, elements: [{recipeId: 'tall-grass', densityPerHa: 420}, {recipeId: 'acacia-umbrella', densityPerHa: 7}, {recipeId: 'thorn-scrub', densityPerHa: 18}, {recipeId: 'termite-mound', densityPerHa: 4}, {recipeId: 'rounded-rock', densityPerHa: 6}], fauna: [{name: 'Giraffe-like browser', role: 'high browser', status: 'planned'}, {name: 'Antelope-like runner', role: 'fast grazer', status: 'planned'}, {name: 'Zebra-like grazer', role: 'bulk grazer', status: 'planned'}, {name: 'Elephant-like giant', role: 'ecosystem engineer', status: 'planned'}]},
  {id: 'rainforest', name: 'Tropical rainforest', description: 'Closed canopy of tall buttressed broadleaf trees over understory palms and herbs on red, leaf-littered soil.', groundColor: '#3a3220', groundAccent: {color: '#5c3b24', cover: 0.2, scaleM: 5}, elements: [{recipeId: 'buttress-broadleaf', densityPerHa: 120}, {recipeId: 'understory-palm', densityPerHa: 140}, {recipeId: 'ephemeral-herb', densityPerHa: 60}, {recipeId: 'rounded-rock', densityPerHa: 6}], fauna: [{name: 'Duiker-like browser', role: 'forest-floor browser', status: 'planned'}, {name: 'Forest-cat-like hunter', role: 'ambush predator', status: 'planned'}, {name: 'Forest-elephant-like giant', role: 'seed disperser', status: 'planned'}]},
  {id: 'hot-desert', name: 'Hot desert', description: 'Rippled sand with sparse columnar succulents, thorn scrub, dry sage and bare stone.', groundColor: '#cfac72', groundAccent: {color: '#e2c690', cover: 0.3, scaleM: 4}, elements: [{recipeId: 'columnar-succulent', densityPerHa: 9}, {recipeId: 'thorn-scrub', densityPerHa: 25}, {recipeId: 'sage', densityPerHa: 20}, {recipeId: 'ephemeral-herb', densityPerHa: 15}, {recipeId: 'angular-rock', densityPerHa: 30}, {recipeId: 'rounded-rock', densityPerHa: 15}], fauna: [{name: 'Camel-like browser', role: 'drought browser', status: 'planned'}, {name: 'Oryx-like runner', role: 'desert grazer', status: 'planned'}, {name: 'Fennec-like runner', role: 'nocturnal insect eater', status: 'planned'}]},
  {id: 'ice-margin', name: 'Ice margin', description: 'Snow and ice with exposed gravel, lichen-crusted boulders and scattered moss and cushion plants.', groundColor: '#dde3e6', groundAccent: {color: '#8b8d88', cover: 0.35, scaleM: 8}, elements: [{recipeId: 'lichen-rock', densityPerHa: 70}, {recipeId: 'angular-rock', densityPerHa: 55}, {recipeId: 'moss-mat', densityPerHa: 50}, {recipeId: 'cushion-plant', densityPerHa: 12}], fauna: [{name: 'Musk-ox-like browser', role: 'margin grazer', status: 'planned'}, {name: 'Ice-bear-like hunter', role: 'apex predator', status: 'planned'}]},
] as BiomeDefinition[]).map(biome => Object.freeze({...biome, elements: Object.freeze(biome.elements.map(element => Object.freeze(element))), fauna: Object.freeze(biome.fauna.map(member => Object.freeze(member)))}))) as unknown as readonly BiomeDefinition[];

const DEFAULT_SIZE_M = 128;
const MIN_SIZE_M = 32;
const MAX_SIZE_M = 256;
const MAX_SEED_LENGTH = 128;
const CELL_M = 8;
const DENSITY_PER_HA_PER_SLOT = 10000 / (CELL_M * CELL_M);
const MAX_CANDIDATE_SLOTS = 3;
const COMPETITION_HALO_M = 16;
const MAX_CANDIDATES = 100_000;
const COVERAGE_SAMPLE_M = 2;
const MAX_FOOTPRINT_M = 4;
const MAX_ABSOLUTE_COORDINATE_M = 1_000_000;
const MAX_BLEND_COORDINATE_M = MAX_ABSOLUTE_COORDINATE_M + MAX_SIZE_M + COMPETITION_HALO_M;
const recipeById = new Map(ELEMENT_RECIPES.map(recipe => [recipe.id, recipe]));
const biomeById = new Map(BIOME_DEFINITIONS.map(biome => [biome.id, biome]));
const kinds: readonly ElementKind[] = ['tree', 'shrub', 'grass', 'rock'];

function hash32(value: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) { h ^= value.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d); h ^= h >>> 15; h = Math.imul(h, 0x846ca68b);
  return (h ^ (h >>> 16)) >>> 0;
}
function random01(key: string): number { return (hash32(key) + 0.5) / 4294967296; }
function clamp01(value: number): number { return Math.max(0, Math.min(1, value)); }
function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = clamp01((value - edge0) / (edge1 - edge0)); return t * t * (3 - 2 * t);
}
function hex64(value: string): string {
  let h = 0xcbf29ce484222325n;
  for (let i = 0; i < value.length; i++) { h ^= BigInt(value.charCodeAt(i)); h = BigInt.asUintN(64, h * 0x100000001b3n); }
  return h.toString(16).padStart(16, '0');
}
function finiteNumber(value: number | undefined, fallback: number, name: string): number {
  if (value === undefined) return fallback;
  if (!Number.isFinite(value)) throw new Error(`${name} must be finite`);
  return value;
}
type NormalizedConfig = BiomePatchConfig & {sizeM: number; originX: number; originZ: number};
function normalizedConfig(config: BiomePatchConfig): NormalizedConfig {
  if (!config || typeof config !== 'object') throw new Error('Biome patch config is required');
  if (typeof config.seed !== 'string' || config.seed.length === 0 || config.seed.length > MAX_SEED_LENGTH) throw new Error(`seed must be a non-empty string up to ${MAX_SEED_LENGTH} characters`);
  if (!biomeById.has(config.biome)) throw new Error(`Unknown biome: ${String(config.biome)}`);
  if (config.blendBiome !== undefined && !biomeById.has(config.blendBiome)) throw new Error(`Unknown blend biome: ${String(config.blendBiome)}`);
  const sizeM = finiteNumber(config.sizeM, DEFAULT_SIZE_M, 'sizeM');
  if (sizeM < MIN_SIZE_M || sizeM > MAX_SIZE_M) throw new Error(`sizeM must be between ${MIN_SIZE_M} and ${MAX_SIZE_M}`);
  const originX = finiteNumber(config.originX, 0, 'originX'), originZ = finiteNumber(config.originZ, 0, 'originZ');
  if (Math.abs(originX) > MAX_ABSOLUTE_COORDINATE_M || Math.abs(originZ) > MAX_ABSOLUTE_COORDINATE_M) throw new Error(`origins must be within ${MAX_ABSOLUTE_COORDINATE_M} metres of the canonical domain`);
  return {seed: config.seed, biome: config.biome, ...(config.blendBiome ? {blendBiome: config.blendBiome} : {}), sizeM, originX, originZ};
}

function interpolatedNoise(seed: string, channel: string, x: number, z: number, periodM: number): number {
  const gx = Math.floor(x / periodM), gz = Math.floor(z / periodM);
  const tx = (x / periodM) - gx, tz = (z / periodM) - gz;
  const sx = tx * tx * (3 - 2 * tx), sz = tz * tz * (3 - 2 * tz);
  const at = (ix: number, iz: number) => random01(`${seed}/${channel}/${ix}/${iz}`) * 2 - 1;
  const a = at(gx, gz) * (1 - sx) + at(gx + 1, gz) * sx;
  const b = at(gx, gz + 1) * (1 - sx) + at(gx + 1, gz + 1) * sx;
  return a * (1 - sz) + b * sz;
}

/** Secondary-biome weight. The boundary is global at X=0, perturbed by seed
 * noise; it is never derived from a camera or from a requested patch edge. */
export function biomeBlendAt(config: BiomePatchConfig, x: number, z: number): number {
  const normalized = normalizedConfig(config);
  if (!Number.isFinite(x) || !Number.isFinite(z)) throw new Error('Blend coordinates must be finite');
  if (Math.abs(x) > MAX_BLEND_COORDINATE_M || Math.abs(z) > MAX_BLEND_COORDINATE_M) throw new Error('Blend coordinates exceed the canonical domain');
  if (!normalized.blendBiome) return 0;
  const coarse = interpolatedNoise(normalized.seed, 'blend', x, z, 24);
  const fine = interpolatedNoise(normalized.seed, 'blend-fine', x, z, 8);
  const boundaryOffset = coarse * 7 + fine * 2;
  return smoothstep(-14, 14, x + boundaryOffset);
}

type Candidate = BiomePlacement & {footprintM: number; priority: number};
function footprintM(recipe: ElementRecipe, sizeM: number): number {
  if (recipe.kind === 'tree') return sizeM * 0.25;
  if (recipe.kind === 'shrub') return sizeM * 0.34;
  // Grass has a small exclusion root so nearby clumps can make a continuous
  // field. Its wider visible blade footprint is used only by coverage below.
  if (recipe.kind === 'grass') return Math.max(0.16, sizeM * 0.28);
  return sizeM * 0.38;
}
/** Projected radius used by the coverage sample grid and the lab's visible
 * recipe footprint. Grass is a clump/patch of blades, not one organism. */
export function recipeFootprintM(recipe: ElementRecipe, sizeM: number): number {
  if (recipe.kind === 'grass') return Math.max(1.75, sizeM * 3.2);
  return footprintM(recipe, sizeM);
}
function densityMap(definition: BiomeDefinition): Map<string, number> { return new Map(definition.elements.map(element => [element.recipeId, element.densityPerHa])); }
function candidateKey(seed: string, recipeId: string, cellX: number, cellZ: number, slot: number): string { return `${BIOME_ECOLOGY_VERSION}/${seed}/${recipeId}/${cellX}/${cellZ}/${slot}`; }

/**
 * Generates all candidates in a fixed halo before resolving competition. This
 * gives a candidate the same neighbours whether it was requested in a 32 m
 * patch or as part of a 256 m patch. Candidate IDs use grid cell coordinates,
 * recipe, slot and seed, so neither output extent nor render ordering affects
 * identity.
 */
export function generateBiomePatch(config: BiomePatchConfig): BiomePatch {
  const c = normalizedConfig(config);
  const primary = biomeById.get(c.biome)!;
  const secondary = c.blendBiome ? biomeById.get(c.blendBiome)! : undefined;
  const primaryDensity = densityMap(primary);
  const secondaryDensity = secondary ? densityMap(secondary) : new Map<string, number>();
  const recipeIds = [...new Set([...primaryDensity.keys(), ...secondaryDensity.keys()])].sort();
  const startX = Math.floor((c.originX - COMPETITION_HALO_M) / CELL_M);
  const endX = Math.floor((c.originX + c.sizeM + COMPETITION_HALO_M) / CELL_M);
  const startZ = Math.floor((c.originZ - COMPETITION_HALO_M) / CELL_M);
  const endZ = Math.floor((c.originZ + c.sizeM + COMPETITION_HALO_M) / CELL_M);
  const cellCount = (endX - startX + 1) * (endZ - startZ + 1);
  const slots = recipeIds.reduce((sum, id) => sum + Math.min(MAX_CANDIDATE_SLOTS, Math.ceil(Math.max(primaryDensity.get(id) ?? 0, secondaryDensity.get(id) ?? 0) / DENSITY_PER_HA_PER_SLOT)), 0);
  if (cellCount * slots > MAX_CANDIDATES) throw new Error('Biome patch candidate work exceeds the fixed limit');
  const candidates: Candidate[] = [];
  for (const recipeId of recipeIds) {
    const recipe = recipeById.get(recipeId)!;
    const slotCount = Math.min(MAX_CANDIDATE_SLOTS, Math.ceil(Math.max(primaryDensity.get(recipeId) ?? 0, secondaryDensity.get(recipeId) ?? 0) / DENSITY_PER_HA_PER_SLOT));
    for (let cellZ = startZ; cellZ <= endZ; cellZ++) for (let cellX = startX; cellX <= endX; cellX++) for (let slot = 0; slot < slotCount; slot++) {
      const key = candidateKey(c.seed, recipeId, cellX, cellZ, slot);
      const x = (cellX + random01(`${key}/x`)) * CELL_M;
      const z = (cellZ + random01(`${key}/z`)) * CELL_M;
      const blend = biomeBlendAt(c, x, z);
      const density = (primaryDensity.get(recipeId) ?? 0) * (1 - blend) + (secondaryDensity.get(recipeId) ?? 0) * blend;
      if (random01(`${key}/occupancy`) >= density / (DENSITY_PER_HA_PER_SLOT * slotCount)) continue;
      const sizeM = recipe.minSizeM + (recipe.maxSizeM - recipe.minSizeM) * random01(`${key}/size`);
      candidates.push({id: key, recipeId, kind: recipe.kind, x, z, sizeM, rotation: random01(`${key}/rotation`) * Math.PI * 2, color: recipe.color, footprintM: footprintM(recipe, sizeM), priority: random01(`${key}/priority`)});
    }
  }
  candidates.sort((a, b) => a.priority - b.priority || ordCompare(a.id, b.id));
  // A candidate loses to any overlapping higher-priority candidate, whether or
  // not that higher candidate itself loses elsewhere. This priority rule is
  // local (rather than a sequential greedy walk), so the halo fully determines
  // every interior decision and requests are overlap/order independent.
  const candidateBins = new Map<string, Candidate[]>();
  for (const candidate of candidates) {
    const key = `${Math.floor(candidate.x / CELL_M)},${Math.floor(candidate.z / CELL_M)}`;
    const bin = candidateBins.get(key); if (bin) bin.push(candidate); else candidateBins.set(key, [candidate]);
  }
  const output: BiomePlacement[] = [], coveragePlacements: BiomePlacement[] = [];
  let competition = 0;
  for (const candidate of candidates) {
    let blocked = false;
    const candidateCellX = Math.floor(candidate.x / CELL_M), candidateCellZ = Math.floor(candidate.z / CELL_M);
    const range = Math.ceil((candidate.footprintM + MAX_FOOTPRINT_M) / CELL_M);
    for (let z = candidateCellZ - range; z <= candidateCellZ + range && !blocked; z++) for (let x = candidateCellX - range; x <= candidateCellX + range && !blocked; x++) for (const winner of candidateBins.get(`${x},${z}`) ?? []) {
      // Herbaceous clumps occupy their own layer and can live under a tree
      // canopy. Structural props still compete for a shared ground footprint.
      if ((winner.kind === 'grass') !== (candidate.kind === 'grass')) continue;
      if (winner.priority > candidate.priority || (winner.priority === candidate.priority && winner.id >= candidate.id)) continue;
      const dx = candidate.x - winner.x, dz = candidate.z - winner.z, radius = candidate.footprintM + winner.footprintM;
      if (dx * dx + dz * dz < radius * radius) { blocked = true; break; }
    }
    const insidePatch = candidate.x >= c.originX && candidate.x < c.originX + c.sizeM && candidate.z >= c.originZ && candidate.z < c.originZ + c.sizeM;
    if (blocked) { if (insidePatch) competition++; continue; }
    coveragePlacements.push(candidate);
    if (insidePatch) {
      const {footprintM: _footprintM, priority: _priority, ...placement} = candidate;
      output.push(placement);
    }
  }
  output.sort((a, b) => ordCompare(a.id, b.id));
  const counts: Record<ElementKind, number> = {tree: 0, shrub: 0, grass: 0, rock: 0};
  const recipeCounts: Record<string, number> = {};
  for (const placement of output) { counts[placement.kind]++; recipeCounts[placement.recipeId] = (recipeCounts[placement.recipeId] ?? 0) + 1; }
  const areaHa = c.sizeM * c.sizeM / 10000;
  const coverage = estimateCoverage(c, coveragePlacements);
  const publicConfig: BiomePatchConfig = {seed: c.seed, biome: c.biome, ...(c.blendBiome ? {blendBiome: c.blendBiome} : {}), sizeM: c.sizeM, originX: c.originX, originZ: c.originZ};
  const digestInput = `${BIOME_ECOLOGY_VERSION}|${JSON.stringify(publicConfig)}|${output.map(p => `${p.id},${p.x.toFixed(5)},${p.z.toFixed(5)},${p.sizeM.toFixed(5)}`).join('|')}`;
  return {version: BIOME_ECOLOGY_VERSION, config: publicConfig, placements: output, counts, recipeCounts, areaHa, canopyCoverEstimate: coverage.canopy, groundCoverEstimate: coverage.ground, rejected: {competition}, digest: hex64(digestInput)};
}

/** Coverage uses 2 m centre samples. Tree crown discs contribute canopy;
 * tree, shrub and grass footprint discs contribute ground cover. Rocks are
 * deliberately omitted. This is a deterministic projected-footprint estimate,
 * not renderer-visible coverage or an ecological measurement. */
function estimateCoverage(config: NormalizedConfig, placements: BiomePlacement[]): {canopy: number; ground: number} {
  type Footprint = {x: number; z: number; radius: number};
  const canopy: Footprint[] = [], ground: Footprint[] = [];
  for (const placement of placements) {
    const recipe = recipeById.get(placement.recipeId)!;
    const radius = recipeFootprintM(recipe, placement.sizeM);
    if (placement.kind === 'tree') canopy.push({x: placement.x, z: placement.z, radius});
    if (placement.kind === 'shrub' || placement.kind === 'grass') ground.push({x: placement.x, z: placement.z, radius});
  }
  const binFootprints = (items: Footprint[]) => {
    const bins = new Map<string, Footprint[]>();
    for (const item of items) {
      const key = `${Math.floor(item.x / CELL_M)},${Math.floor(item.z / CELL_M)}`;
      const bin = bins.get(key); if (bin) bin.push(item); else bins.set(key, [item]);
    }
    return bins;
  };
  const canopyBins = binFootprints(canopy), groundBins = binFootprints(ground);
  const coverageBinRange = Math.ceil(Math.max(...ELEMENT_RECIPES.map(recipe => recipeFootprintM(recipe, recipe.maxSizeM))) / CELL_M) + 1;
  const contains = (bins: Map<string, Footprint[]>, x: number, z: number) => {
    const cellX = Math.floor(x / CELL_M), cellZ = Math.floor(z / CELL_M);
    for (let oz = -coverageBinRange; oz <= coverageBinRange; oz++) for (let ox = -coverageBinRange; ox <= coverageBinRange; ox++) for (const item of bins.get(`${cellX + ox},${cellZ + oz}`) ?? []) {
      const dx = x - item.x, dz = z - item.z;
      if (dx * dx + dz * dz <= item.radius * item.radius) return true;
    }
    return false;
  };
  let canopyCovered = 0, groundCovered = 0, samples = 0;
  for (let z = config.originZ + COVERAGE_SAMPLE_M / 2; z < config.originZ + config.sizeM; z += COVERAGE_SAMPLE_M) for (let x = config.originX + COVERAGE_SAMPLE_M / 2; x < config.originX + config.sizeM; x += COVERAGE_SAMPLE_M) {
    samples++; if (contains(canopyBins, x, z)) canopyCovered++; if (contains(groundBins, x, z)) groundCovered++;
  }
  return {canopy: samples ? canopyCovered / samples : 0, ground: samples ? groundCovered / samples : 0};
}

/**
 * ECO-CLASS-1 links (BIOME2-ECO, append-only): which eco classes each lab
 * biome illustrates, and the planet role (src/eco-assemblages.ts ECO_ROLE_IDS)
 * of each lab fauna entry, index for index. Classes 12/13 are lifeless.
 * tests/biome-ecology.test.mjs fails if a class 0-11 has no lab biome or a lab
 * fauna role has no planet role.
 */
export const BIOME_ECO_LINKS: Readonly<Record<BiomeId, Readonly<{ecoClasses: readonly number[]; faunaRoleIds: readonly EcoRoleId[]}>>> = Object.freeze({
  woodland: Object.freeze({ecoClasses: Object.freeze([4, 6]), faunaRoleIds: Object.freeze(['temperate-forest.deer-browser', 'temperate-forest.boar-low-slung'] as EcoRoleId[])}),
  conifer: Object.freeze({ecoClasses: Object.freeze([4]), faunaRoleIds: Object.freeze(['boreal.moose-browser', 'boreal.lynx-runner'] as EcoRoleId[])}),
  grassland: Object.freeze({ecoClasses: Object.freeze([5]), faunaRoleIds: Object.freeze(['steppe.bison-browser', 'steppe.badger-low-slung'] as EcoRoleId[])}),
  'dry-scrub': Object.freeze({ecoClasses: Object.freeze([10]), faunaRoleIds: Object.freeze(['cold-desert.saiga-browser', 'cold-desert.corsac-runner'] as EcoRoleId[])}),
  wetland: Object.freeze({ecoClasses: Object.freeze([4, 6]), faunaRoleIds: Object.freeze(['humid-subtropical.marsh-tapir-low-slung', 'humid-subtropical.coyote-runner'] as EcoRoleId[])}),
  coast: Object.freeze({ecoClasses: Object.freeze([11]), faunaRoleIds: Object.freeze(['coast.shore-scavenger-runner', 'coast.dune-burrower-low-slung'] as EcoRoleId[])}),
  alpine: Object.freeze({ecoClasses: Object.freeze([2]), faunaRoleIds: Object.freeze(['alpine.ibex-browser', 'alpine.snow-leopard-low-slung'] as EcoRoleId[])}),
  volcanic: Object.freeze({ecoClasses: Object.freeze([12, 13]), faunaRoleIds: Object.freeze([] as EcoRoleId[])}),
  regolith: Object.freeze({ecoClasses: Object.freeze([13]), faunaRoleIds: Object.freeze([] as EcoRoleId[])}),
  tundra: Object.freeze({ecoClasses: Object.freeze([1]), faunaRoleIds: Object.freeze(['tundra.reindeer-browser', 'tundra.musk-ox-browser', 'tundra.arctic-fox-runner', 'tundra.wolf-low-slung'] as EcoRoleId[])}),
  'alpine-meadow': Object.freeze({ecoClasses: Object.freeze([2]), faunaRoleIds: Object.freeze(['alpine.ibex-browser', 'alpine.chamois-runner', 'alpine.snow-leopard-low-slung'] as EcoRoleId[])}),
  'boreal-taiga': Object.freeze({ecoClasses: Object.freeze([3]), faunaRoleIds: Object.freeze(['boreal.moose-browser', 'boreal.lynx-runner', 'boreal.bear-low-slung'] as EcoRoleId[])}),
  savanna: Object.freeze({ecoClasses: Object.freeze([8]), faunaRoleIds: Object.freeze(['savanna.giraffe-long-neck', 'savanna.antelope-runner', 'savanna.zebra-browser', 'savanna.elephant-low-slung'] as EcoRoleId[])}),
  rainforest: Object.freeze({ecoClasses: Object.freeze([7]), faunaRoleIds: Object.freeze(['tropical-wet.duiker-browser', 'tropical-wet.forest-cat-runner', 'tropical-wet.forest-elephant-low-slung'] as EcoRoleId[])}),
  'hot-desert': Object.freeze({ecoClasses: Object.freeze([9]), faunaRoleIds: Object.freeze(['hot-desert.camel-browser', 'hot-desert.oryx-runner', 'hot-desert.fennec-runner'] as EcoRoleId[])}),
  'ice-margin': Object.freeze({ecoClasses: Object.freeze([0]), faunaRoleIds: Object.freeze(['nival.musk-ox-browser', 'nival.ice-bear-low-slung'] as EcoRoleId[])}),
});
