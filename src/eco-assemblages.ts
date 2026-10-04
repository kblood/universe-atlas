/**
 * ECO_ASSEMBLAGES (eco-assemblages-1): what lives in each ECO-CLASS-1 class
 * (src/eco-class.ts). One entry per class 0-13: fauna roles mapped onto the 4
 * archetypes the planet renders today, understory flora kind weights, an
 * understory ecotype, a forest spire/branching bias and savanna tree cover.
 *
 * Pure data, unwired. Consumers: P5 forest (forestAffinity, savannaTreeCover),
 * P6 life (faunaRoles, herdMultiplier, floraKindWeights, understory). Classes
 * in LEGACY_BEHAVIOUR_CLASSES {4,5,6} keep their increment-1 LIFE behaviour;
 * their entries here mirror that behaviour and are informational until P6.
 *
 * Fauna rule: no new species, diets or bodies. A role is an ECOTYPE PHENOTYPE
 * of an existing archetype (browser, runner, low-slung, long-neck), with an
 * Earth analogue as the art-direction anchor. Designed by Opus 5.5
 * (docs/eco-class-v1.md §5).
 */
import type { CreatureArchetype } from './creature-model.ts';
import { ECO_CLASS_COUNT, ecotypeOf } from './eco-class.ts';

export const ECO_ASSEMBLAGES_VERSION = 'eco-assemblages-1';

/** Archetypes the planet fauna renders today (creature-model.ts ARCHETYPES). */
export const RENDERED_ARCHETYPES: readonly CreatureArchetype[] = Object.freeze(['browser', 'runner', 'low-slung', 'long-neck']);
/** Same order as flora-field.ts FLORA_KIND_NAMES (a test pins the order). */
export const ECO_FLORA_KIND_ORDER = Object.freeze(['tree', 'flower', 'grass', 'shrub'] as const);

export type UnderstoryEcotype = 'turf' | 'tussock' | 'dry-bunch' | 'dwarf-heath' | 'cushion' | 'thorn' | 'broadleaf-herb' | 'none';
/** Understory size factor per ecotype (art direction). */
export const UNDERSTORY_SCALE: Readonly<Record<UnderstoryEcotype, number>> = Object.freeze({
  turf: 1.0, tussock: 1.3, 'dry-bunch': 0.8, 'dwarf-heath': 0.4, cushion: 0.6, thorn: 0.9, 'broadleaf-herb': 1.1, none: 0,
});

export type FaunaMorphologyHint = 'ungulate' | 'cursorial' | 'padded' | 'long-neck' | 'proboscidean';

export const ECO_ROLE_IDS = Object.freeze([
  'nival.musk-ox-browser', 'nival.ice-bear-low-slung',
  'tundra.reindeer-browser', 'tundra.musk-ox-browser', 'tundra.arctic-fox-runner', 'tundra.wolf-low-slung',
  'alpine.ibex-browser', 'alpine.chamois-runner', 'alpine.snow-leopard-low-slung',
  'boreal.moose-browser', 'boreal.lynx-runner', 'boreal.bear-low-slung',
  'temperate-forest.deer-browser', 'temperate-forest.fox-runner', 'temperate-forest.boar-low-slung',
  'steppe.bison-browser', 'steppe.pronghorn-runner', 'steppe.badger-low-slung',
  'humid-subtropical.deer-browser', 'humid-subtropical.coyote-runner', 'humid-subtropical.marsh-tapir-low-slung',
  'tropical-wet.duiker-browser', 'tropical-wet.forest-cat-runner', 'tropical-wet.forest-elephant-low-slung',
  'savanna.giraffe-long-neck', 'savanna.antelope-runner', 'savanna.zebra-browser', 'savanna.elephant-low-slung',
  'hot-desert.camel-browser', 'hot-desert.oryx-runner', 'hot-desert.fennec-runner',
  'cold-desert.saiga-browser', 'cold-desert.corsac-runner', 'cold-desert.marmot-low-slung',
  'coast.coastal-browser', 'coast.shore-scavenger-runner', 'coast.dune-burrower-low-slung', 'coast.seal-haulout-low-slung',
] as const);
export type EcoRoleId = typeof ECO_ROLE_IDS[number];

export type FaunaRole = Readonly<{
  id: EcoRoleId; archetype: CreatureArchetype; weight: number;
  /** Earth analogue(s) the phenotype is art-directed after. */
  earthAnchor: string;
  /** Preferred composer morphology family (a hint for P6, not a new body). */
  morphology: FaunaMorphologyHint;
  /** eco-class ecotype (0 neutral, 1 cold, 2 arid, 3 humid-warm, 4 alpine, 5 coast). */
  ecotype: number;
}>;

export type EcoAssemblage = Readonly<{
  ecoClass: number;
  faunaRoles: readonly FaunaRole[];
  /** Herd density multiplier. TUNABLE ART DIRECTION, not ecology. */
  herdMultiplier: number;
  /** Understory flora weights in ECO_FLORA_KIND_ORDER (tree, flower, grass, shrub). */
  floraKindWeights: readonly [number, number, number, number];
  /** 'forest-gated': the tree weight applies only where the continuous forest
   * may own trees (forestPotential); 'always': a sparse tree layer (savanna);
   * 'none': the tree weight is 0. */
  treeWeightSource: 'forest-gated' | 'always' | 'none';
  understory: UnderstoryEcotype;
  understoryScale: number;
  /** -1 favours branching crowns, +1 favours spires. */
  forestAffinity: number;
  /** Fraction of ground under scattered tree crowns (savanna only, 0.05-0.20). */
  savannaTreeCover: number;
}>;

const role = (ecoClass: number, id: EcoRoleId, archetype: CreatureArchetype, weight: number, morphology: FaunaMorphologyHint, earthAnchor: string): FaunaRole =>
  Object.freeze({ id, archetype, weight, earthAnchor, morphology, ecotype: ecotypeOf(ecoClass) });
const entry = (ecoClass: number, faunaRoles: FaunaRole[], herdMultiplier: number, floraKindWeights: [number, number, number, number],
  treeWeightSource: EcoAssemblage['treeWeightSource'], understory: UnderstoryEcotype, forestAffinity: number, savannaTreeCover = 0): EcoAssemblage =>
  Object.freeze({ ecoClass, faunaRoles: Object.freeze(faunaRoles), herdMultiplier, floraKindWeights: Object.freeze(floraKindWeights) as EcoAssemblage['floraKindWeights'],
    treeWeightSource, understory, understoryScale: UNDERSTORY_SCALE[understory], forestAffinity, savannaTreeCover });

/** Legacy flora mirror of flora-field.ts pickKind (tree .34 forest / .05, shrub .22 / .12, grass .55, flower .18 moist / .06). */
const LEGACY_FOREST_FLORA: [number, number, number, number] = [0.34, 0.18, 0.55, 0.22];
const LEGACY_OPEN_FLORA: [number, number, number, number] = [0.05, 0.06, 0.55, 0.12];

export const ECO_ASSEMBLAGES: readonly EcoAssemblage[] = Object.freeze([
  // 0 nival / ice margin: only the hardiest large mammals on the cold margin.
  entry(0, [
    role(0, 'nival.musk-ox-browser', 'browser', 2, 'ungulate', 'musk ox on the ice-sheet margin'),
    role(0, 'nival.ice-bear-low-slung', 'low-slung', 1, 'padded', 'polar bear'),
  ], 0.2, [0, 0.05, 0.70, 0.25], 'none', 'cushion', 1),
  // 1 arctic tundra
  entry(1, [
    role(1, 'tundra.reindeer-browser', 'browser', 3, 'ungulate', 'reindeer / caribou'),
    role(1, 'tundra.musk-ox-browser', 'browser', 1, 'ungulate', 'musk ox (heavy-coat ecotype)'),
    role(1, 'tundra.arctic-fox-runner', 'runner', 2, 'cursorial', 'arctic fox'),
    role(1, 'tundra.wolf-low-slung', 'low-slung', 1, 'padded', 'arctic wolf / grizzly'),
  ], 0.35, [0, 0.15, 0.55, 0.30], 'none', 'tussock', 0.8),
  // 2 alpine meadow (above the local treeline, trees would grow at the datum)
  entry(2, [
    role(2, 'alpine.ibex-browser', 'browser', 3, 'ungulate', 'ibex / yak'),
    role(2, 'alpine.chamois-runner', 'runner', 1, 'cursorial', 'chamois'),
    role(2, 'alpine.snow-leopard-low-slung', 'low-slung', 1, 'padded', 'snow leopard'),
  ], 0.35, [0, 0.30, 0.50, 0.20], 'none', 'cushion', 0.5),
  // 3 boreal taiga
  entry(3, [
    role(3, 'boreal.moose-browser', 'browser', 2, 'ungulate', 'moose'),
    role(3, 'boreal.lynx-runner', 'runner', 2, 'cursorial', 'lynx / grey wolf'),
    role(3, 'boreal.bear-low-slung', 'low-slung', 1, 'padded', 'brown bear'),
  ], 0.5, [0.34, 0.08, 0.32, 0.30], 'forest-gated', 'dwarf-heath', 0.9),
  // 4 temperate forest (LEGACY behaviour class)
  entry(4, [
    role(4, 'temperate-forest.deer-browser', 'browser', 3, 'ungulate', 'red deer / roe deer'),
    role(4, 'temperate-forest.fox-runner', 'runner', 1, 'cursorial', 'red fox'),
    role(4, 'temperate-forest.boar-low-slung', 'low-slung', 1, 'padded', 'wild boar / badger'),
  ], 1.0, LEGACY_FOREST_FLORA, 'forest-gated', 'turf', 0),
  // 5 temperate grassland / steppe (LEGACY behaviour class)
  entry(5, [
    role(5, 'steppe.bison-browser', 'browser', 3, 'ungulate', 'bison / wild horse'),
    role(5, 'steppe.pronghorn-runner', 'runner', 2, 'cursorial', 'pronghorn'),
    role(5, 'steppe.badger-low-slung', 'low-slung', 1, 'padded', 'badger'),
  ], 1.0, LEGACY_OPEN_FLORA, 'always', 'turf', 0),
  // 6 humid subtropical forest (LEGACY behaviour class)
  entry(6, [
    role(6, 'humid-subtropical.deer-browser', 'browser', 3, 'ungulate', 'white-tailed deer'),
    role(6, 'humid-subtropical.coyote-runner', 'runner', 1, 'cursorial', 'coyote'),
    role(6, 'humid-subtropical.marsh-tapir-low-slung', 'low-slung', 1, 'padded', 'tapir / capybara'),
  ], 1.0, LEGACY_FOREST_FLORA, 'forest-gated', 'turf', -0.2),
  // 7 tropical wet forest
  entry(7, [
    role(7, 'tropical-wet.duiker-browser', 'browser', 2, 'ungulate', 'duiker / okapi'),
    role(7, 'tropical-wet.forest-cat-runner', 'runner', 1, 'cursorial', 'jaguar / ocelot'),
    role(7, 'tropical-wet.forest-elephant-low-slung', 'low-slung', 2, 'proboscidean', 'forest elephant / tapir'),
  ], 1.0, [0.34, 0.22, 0.30, 0.38], 'forest-gated', 'broadleaf-herb', -0.9),
  // 8 savanna
  entry(8, [
    role(8, 'savanna.giraffe-long-neck', 'long-neck', 2, 'long-neck', 'giraffe'),
    role(8, 'savanna.antelope-runner', 'runner', 3, 'cursorial', 'gazelle / impala'),
    role(8, 'savanna.zebra-browser', 'browser', 2, 'ungulate', 'zebra / wildebeest'),
    role(8, 'savanna.elephant-low-slung', 'low-slung', 1, 'proboscidean', 'savanna elephant'),
  ], 0.9, [0.05, 0.10, 0.70, 0.15], 'always', 'tussock', -0.8, 0.12),
  // 9 hot desert
  entry(9, [
    role(9, 'hot-desert.camel-browser', 'browser', 1, 'ungulate', 'dromedary camel'),
    role(9, 'hot-desert.oryx-runner', 'runner', 2, 'cursorial', 'oryx / addax'),
    role(9, 'hot-desert.fennec-runner', 'runner', 1, 'cursorial', 'fennec fox'),
  ], 0.25, [0, 0.20, 0.10, 0.45], 'none', 'thorn', -0.5),
  // 10 cold desert / dry steppe
  entry(10, [
    role(10, 'cold-desert.saiga-browser', 'browser', 2, 'ungulate', 'saiga / Bactrian camel'),
    role(10, 'cold-desert.corsac-runner', 'runner', 2, 'cursorial', 'corsac fox / onager'),
    role(10, 'cold-desert.marmot-low-slung', 'low-slung', 1, 'padded', 'steppe marmot / badger'),
  ], 0.25, [0, 0.12, 0.40, 0.40], 'none', 'dry-bunch', 0.2),
  // 11 coast
  entry(11, [
    role(11, 'coast.coastal-browser', 'browser', 1, 'ungulate', 'Sitka deer on the strand'),
    role(11, 'coast.shore-scavenger-runner', 'runner', 2, 'cursorial', 'strandline fox / jackal'),
    role(11, 'coast.dune-burrower-low-slung', 'low-slung', 1, 'padded', 'badger / wombat in dunes'),
    role(11, 'coast.seal-haulout-low-slung', 'low-slung', 1, 'padded', 'seal / sea lion haul-out'),
  ], 0.6, [0, 0.10, 0.55, 0.35], 'none', 'dry-bunch', 0),
  // 12 sterile hot ground: nothing lives.
  entry(12, [], 0, [0, 0, 0, 0], 'none', 'none', 0),
  // 13 non-vegetated (no air or water, volcanic): nothing lives.
  entry(13, [], 0, [0, 0, 0, 0], 'none', 'none', 0),
]);

if (ECO_ASSEMBLAGES.length !== ECO_CLASS_COUNT) throw new Error('ECO_ASSEMBLAGES must have one entry per eco class');

const roleById = new Map<string, FaunaRole>();
for (const assemblage of ECO_ASSEMBLAGES) for (const r of assemblage.faunaRoles) roleById.set(r.id, r);

/** The planet role with this id, or undefined. */
export function ecoRole(id: string): FaunaRole | undefined { return roleById.get(id); }

/**
 * The classes that violate the 'no empty biome' rule: a class 0-11 without at
 * least one role of weight > 0 on a rendered archetype, or without non-zero
 * understory flora weight. Pure check, used by the test (and its negative case
 * on a copy of the table).
 */
export function emptyEcoClasses(table: readonly EcoAssemblage[] = ECO_ASSEMBLAGES): number[] {
  const empty: number[] = [];
  for (let c = 0; c <= 11; c++) {
    const a = table[c];
    const fauna = !!a && a.faunaRoles.some(r => r.weight > 0 && RENDERED_ARCHETYPES.includes(r.archetype));
    const flora = !!a && (a.floraKindWeights[1] + a.floraKindWeights[2] + a.floraKindWeights[3] > 0 || (a.treeWeightSource !== 'none' && a.floraKindWeights[0] > 0));
    if (!fauna || !flora) empty.push(c);
  }
  return empty;
}
