import type { CreatureArchetype, CreatureGenome } from './creature-model.ts';
import {
  COAT_MARK_BITS, COAT_ROLES, isCoatPattern, PIGMENT_FAMILIES,
  type CoatMarkName, type CoatRegion, type PigmentFamily, type ResolvedCoatPattern,
} from './fauna-coat-vocab.ts';
import {
  applyCoatDrift, COAT_CELLS_PER_BODY, COAT_GENOME_RANGES, coatCanonicalSamples, coatIndividualDrift, coatMinFeature, coatPatternProbe, coatRandom,
  defaultCoatGenome, evaluateCoat, linearToSrgb,
  type CoatGenome, type CoatRGB, type CoatSample,
} from './fauna-coat-fields.ts';

/** An additive rendering contract. A genome without this block keeps its v1
 * evaluation; a stored 'fauna-appearance-1' block keeps the v1 coat. */
export const FAUNA_APPEARANCE_VERSION = 'fauna-appearance-2';
export const FAUNA_APPEARANCE_LEGACY_VERSION = 'fauna-appearance-1';
export const MORPHOLOGY_FAMILIES = ['ungulate', 'cursorial', 'padded', 'long-neck', 'proboscidean', 'winged'] as const;
export type FaunaMorphologyFamily = typeof MORPHOLOGY_FAMILIES[number];
export interface FaunaMorphology {
  version: 'fauna-morphology-1';
  family: FaunaMorphologyFamily;
  footType: 'paw' | 'hoof' | 'broad-pad';
  /** Metres at the specimen's current growth stage. */
  trunkLength: number;
  wingSpan: number;
  /** Winged specimens are grounded speculative animals; flight is not simulated. */
  wingState: 'none' | 'folded';
}
export type FaunaSex = 'female' | 'male';
export interface FaunaAppearance {
  version: typeof FAUNA_APPEARANCE_VERSION | typeof FAUNA_APPEARANCE_LEGACY_VERSION;
  individualKey: string;
  markingSeed: number;
  /** The inherited (catalogue) pattern; the rendered pattern is `coat.pattern`. */
  pattern: CreatureGenome['pattern'];
  /** sRGB hex. base = near-body area-weighted coat mean (far LOD), marking = dark role, belly = belly role. */
  palette: { base: string; marking: string; belly: string };
  roughness: number;
  /** Species axes. dimorphism (0.15..0.7) scales the sex differences of this species. */
  profile: { mass: number; limb: number; neck: number; dimorphism: number; hornlessFemales: boolean };
  individual: { size: number; condition: number; muzzle: number; ears: number; sex: FaunaSex };
  /** maturity is 1 for adults and continuous 0.22..0.45 for juveniles.
   * lateral (v2) maps the body's z into the adult coat frame: 1 for adults,
   * adult/juvenile torso width-to-length for juveniles; absent in v1. */
  growth: { stage: 'adult' | 'juvenile'; maturity: number; lateral?: number };
  /** The individual's resolved coat at this growth stage (fauna-coat-1). */
  coat: CoatGenome;
  /** Pigment family and pattern shared by every species of one lineage. */
  lineage: { family: PigmentFamily; pattern: ResolvedCoatPattern };
}
export type CoatColor = [number, number, number];
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (lo: number, hi: number, v: number) => { const t = clamp((v - lo) / (hi - lo), 0, 1); return t * t * (3 - 2 * t); };
function hash(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619); }
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d); h ^= h >>> 15;
  return (h ^ h >>> 16) >>> 0;
}
const signed = (key: string) => hash(key) / 0xffffffff * 2 - 1;
const unit = (key: string) => hash(key) / 0x100000000;
function rgb(hex: string): CoatColor { return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255) as CoatColor; }
function hex(rgb: CoatColor): string { return '#' + rgb.map(v => Math.round(clamp(v, 0, 1) * 255).toString(16).padStart(2, '0')).join(''); }
function linear(hex: string): CoatColor { return rgb(hex).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4) as CoatColor; }
/** Linear RGB to sRGB hex. */
export function linearHexOf(c: readonly number[]): string { return hex([linearToSrgb(clamp(c[0]!, 0, 1)), linearToSrgb(clamp(c[1]!, 0, 1)), linearToSrgb(clamp(c[2]!, 0, 1))]); }

// ---------------------------------------------------------------------------
// Lineage and species coat genomes (fauna-appearance-2).
// ---------------------------------------------------------------------------

type Weighted<T extends string> = readonly (readonly [T, number])[];
/** Pigment-family priors per archetype. Low-slung animals (padded or
 * proboscidean) also carry the olive-grey of armoured, wallowing forms, so
 * every pigment family occurs on planets. */
export const FAUNA_LINEAGE_FAMILIES: Readonly<Record<CreatureArchetype, Weighted<PigmentFamily>>> = {
  runner: [['tawny', 3], ['dun', 2], ['fawn', 2], ['rufous', 1]],
  browser: [['rufous', 3], ['fawn', 2], ['dun', 2], ['grey', 1]],
  'long-neck': [['ochre', 4], ['tawny', 2], ['fawn', 1]],
  'low-slung': [['grey', 3], ['sable', 2], ['dun', 2], ['olive', 1]],
};
/** Coat pattern priors per inherited catalogue pattern. A small roan share
 * keeps the frosted coats of grey and sable lineages in the planet set. */
export const FAUNA_LINEAGE_PATTERNS: Readonly<Record<CreatureGenome['pattern'], Weighted<ResolvedCoatPattern>>> = {
  plain: [['plain', .42], ['saddle', .24], ['dorsal-stripe', .19], ['piebald', .09], ['roan', .06]],
  spots: [['spots', .35], ['rosettes', .25], ['reticulated', .25], ['dapple', .15]],
  stripes: [['stripes', .4], ['bands', .25], ['brindle', .15], ['dorsal-stripe', .2]],
};
/** Region marks a species may toggle on or off its lineage's marks. */
export const FAUNA_SPECIES_MARKS: Readonly<Record<CreatureArchetype, readonly CoatMarkName[]>> = {
  runner: ['socks', 'mask', 'blaze', 'rump-patch', 'tail-tip', 'ear-tips'],
  browser: ['socks', 'mask', 'blaze', 'rump-patch', 'tail-tip', 'ear-tips'],
  'long-neck': ['socks', 'mask', 'blaze', 'rump-patch', 'tail-tip', 'ear-tips'],
  'low-slung': ['socks', 'mask', 'blaze', 'tail-rings', 'tail-tip', 'ear-tips'],
};

function pick<T extends string>(table: Weighted<T>, u: number, weight?: (value: T) => number): T {
  let total = 0;
  for (const [value, w] of table) total += w * (weight ? weight(value) : 1);
  let target = u * total;
  for (const [value, w] of table) { target -= w * (weight ? weight(value) : 1); if (target < 0) return value; }
  return table[table.length - 1]![0];
}

/** The catalogue identity of a lineage: inherited unchanged by descendants. */
export function faunaLineageKey(genome: CreatureGenome): string { return `${genome.archetype}/${genome.color}/${genome.pattern}/coat-lineage-v2`; }
/** The species channel of the v1 appearance (descendants change anatomy, so it differs per species). */
export function faunaSpeciesKey(genome: CreatureGenome): string {
  return `${genome.archetype}/${genome.torsoLength}/${genome.torsoWidth}/${genome.legLength}/${genome.neckLength}/${genome.color}/${genome.pattern}`;
}

export interface FaunaLineageCoat { family: PigmentFamily; pattern: ResolvedCoatPattern; marks: number; juvenileSpots: boolean }
/** Lineage family, pattern, base marks and juvenile-spot inheritance. */
export function faunaLineageCoat(genome: CreatureGenome): FaunaLineageCoat {
  const key = faunaLineageKey(genome), archetype = genome.archetype;
  const family = pick(FAUNA_LINEAGE_FAMILIES[archetype], unit(`${key}/family`));
  const pattern = pick(FAUNA_LINEAGE_PATTERNS[genome.pattern], unit(`${key}/pattern`), p => p === 'reticulated' && archetype === 'long-neck' ? 3 : 1);
  let marks = 0;
  for (const name of FAUNA_SPECIES_MARKS[archetype]) if (unit(`${key}/mark/${name}`) < .3) marks |= COAT_MARK_BITS[name];
  const juvenileSpots = (archetype === 'browser' || archetype === 'long-neck') && unit(`${key}/juvenile-spots`) < .6;
  return { family, pattern, marks, juvenileSpots };
}

/** Species dimorphism (0.15..0.7): stronger in horned ungulates and long-necked browsers. */
export function faunaSpeciesDimorphism(genome: CreatureGenome): { dimorphism: number; hornlessFemales: boolean } {
  const species = faunaSpeciesKey(genome), family = inheritedFaunaFamily(genome);
  const raw = .15 + .55 * unit(`${species}/dimorphism-v2`);
  const dimorphism = clamp(raw * (family === 'ungulate' || family === 'long-neck' ? 1.3 : 1), .15, .7);
  return { dimorphism, hornlessFemales: dimorphism > .55 && unit(`${species}/hornless-females-v2`) < .5 };
}

/** Species coat (adult, no individual drift), from stream `<speciesKey>/coat-v2`:
 * colour seed (hue +-0.04 via coatSpeciesColours), scale +-25%, contrast +-20%,
 * countershade 0.35..0.9, belly line +-0.1, a 0.25 toggle per archetype mark,
 * light marks with p 0.3, then warp and coverage. The draw order is append-only. */
export function faunaSpeciesCoat(genome: CreatureGenome): { lineage: FaunaLineageCoat; coat: CoatGenome } {
  const lineage = faunaLineageCoat(genome), rand = coatRandom(`${faunaSpeciesKey(genome)}/coat-v2`);
  const colourSeed = Math.floor(rand() * 4294967296) >>> 0;
  const scale = 1 + (rand() * 2 - 1) * .25, contrast = 1 + (rand() * 2 - 1) * .2;
  const countershade = .35 + rand() * .55, bellyLine = -.45 + (rand() * 2 - 1) * .1;
  let marks = lineage.marks;
  for (const name of FAUNA_SPECIES_MARKS[genome.archetype]) if (rand() < .25) marks ^= COAT_MARK_BITS[name];
  const markRole = rand() < .3 ? 'belly' as const : 'accent' as const;
  const warp = .35 + rand() * .4, threshold = (rand() * 2 - 1) * .1;
  if (lineage.juvenileSpots) marks |= COAT_MARK_BITS['juvenile-spots'];
  const coat = defaultCoatGenome(lineage.family, colourSeed, { pattern: lineage.pattern, marks, scale, contrast, countershade, bellyLine, markRole, warp, threshold, juvenileSpots: 0 });
  return { lineage, coat };
}

/** Area shares of the near body's coat regions per morphology family
 * (adult quadruped-body-4 skins, measured over 4 archetypes x 4 specimens;
 * ears, horns and structural parts excluded, as they follow the far colour),
 * and the mean hoof/pad darkening of the feet. */
export const FAUNA_FAR_REGION_SHARES: Readonly<Record<FaunaMorphologyFamily, { torso: number; neck: number; head: number; tail: number; upper: number; lower: number; foot: number; footHoof: number }>> = {
  ungulate: { torso: .428, neck: .055, head: .040, tail: .023, upper: .274, lower: .107, foot: .058, footHoof: .67 },
  cursorial: { torso: .393, neck: .041, head: .039, tail: .019, upper: .319, lower: .142, foot: .034, footHoof: .265 },
  padded: { torso: .492, neck: .038, head: .076, tail: .040, upper: .105, lower: .091, foot: .102, footHoof: .425 },
  'long-neck': { torso: .335, neck: .159, head: .029, tail: .017, upper: .305, lower: .108, foot: .038, footHoof: .661 },
  proboscidean: { torso: .367, neck: .036, head: .069, tail: .021, upper: .209, lower: .097, foot: .090, footHoof: .447 },
  winged: { torso: .219, neck: .036, head: .023, tail: .012, upper: .129, lower: .054, foot: .026, footHoof: .267 },
};
const HOOF: CoatRGB = [.035, .03, .026];
/** Area share of dorsal armour plates (low-slung bodies only). */
export function faunaArmorShare(genome: Pick<CreatureGenome, 'archetype' | 'armor'>): number { return genome.archetype === 'low-slung' && genome.armor > .05 ? clamp(.25 * genome.armor, 0, .2) : 0; }

const MEAN_SAMPLE: CoatSample = { x: 0, y: 0, z: 0, dorsal: 0, region: 'torso', along: 0 };
const MEAN_OUT = new Float64Array(3);
/** Far-LOD colour of a coat (linear): the canonical coat evaluated per
 * region, weighted by the family's near-body region shares, with hoof
 * darkening on the feet and the plate role on armour. This is coatMeanColor
 * re-weighted to the body the near LOD actually draws, so the far colour
 * stays within 0.04 of the near-body mean (tested). */
export function faunaFarCoatMean(coat: CoatGenome, family: FaunaMorphologyFamily, armorShare = 0): CoatRGB {
  const sums: Record<string, [number, number, number, number]> = {};
  const add = (key: string, w: number) => { const t = sums[key] ??= [0, 0, 0, 0]; t[0] += MEAN_OUT[0]! * w; t[1] += MEAN_OUT[1]! * w; t[2] += MEAN_OUT[2]! * w; t[3] += w; };
  const groups: Partial<Record<CoatRegion, string>> = { torso: 'torso', neck: 'neck', head: 'head', muzzle: 'head', ear: 'head', tail: 'tail', 'tail-tip': 'tail', 'limb-upper': 'upper', 'limb-lower': 'lower', foot: 'foot' };
  for (const s of coatCanonicalSamples()) {
    evaluateCoat(coat, s, MEAN_OUT, 0);
    add(groups[s.region] ?? 'torso', s.weight);
    if (armorShare > 0 && s.region === 'torso' && s.dorsal > .3) {
      Object.assign(MEAN_SAMPLE, s); MEAN_SAMPLE.region = 'armor';
      evaluateCoat(coat, MEAN_SAMPLE, MEAN_OUT, 0); add('armor', s.weight);
    }
  }
  const shares = FAUNA_FAR_REGION_SHARES[family], out: CoatRGB = [0, 0, 0];
  const parts: [string, number][] = [['torso', shares.torso], ['neck', shares.neck], ['head', shares.head], ['tail', shares.tail], ['upper', shares.upper], ['lower', shares.lower], ['foot', shares.foot]];
  const total = parts.reduce((n, [, w]) => n + w, 0), coatShare = 1 - armorShare;
  for (const [key, w] of parts) {
    const t = sums[key]!, share = w / total * coatShare;
    for (let i = 0; i < 3; i++) {
      const mean = t[i]! / t[3]!;
      out[i]! += share * (key === 'foot' ? mix(mean, HOOF[i]!, shares.footHoof) : mean);
    }
  }
  if (armorShare > 0) { const t = sums.armor!; for (let i = 0; i < 3; i++) out[i]! += armorShare * t[i]! / t[3]!; }
  return out;
}
/** Memoised per individual and family, so the adult and juvenile genomes and
 * repeated specimen requests share one canonical evaluation (about 0.3-1 ms). */
const FAR_MEANS = new Map<string, CoatRGB>();
export function faunaFarCoatMeanCached(key: string, coat: CoatGenome, family: FaunaMorphologyFamily, armorShare: number): CoatRGB {
  const id = `${key}|${family}|${armorShare}`, cached = FAR_MEANS.get(id);
  if (cached) return cached;
  const mean = faunaFarCoatMean(coat, family, armorShare);
  if (FAR_MEANS.size >= 4096) FAR_MEANS.clear();
  FAR_MEANS.set(id, mean);
  return mean;
}

/** An individual's adult coat: the species coat with its individual drift. */
export function faunaAdultCoat(speciesCoat: CoatGenome, individualKey: string): CoatGenome { return applyCoatDrift(speciesCoat, coatIndividualDrift(`${individualKey}/coat`, 1)); }

/** Juvenile-spot strength: full up to maturity 0.3, gone by 0.7. */
export function faunaJuvenileSpotStrength(maturity: number): number { return 1 - smooth(.3, .7, maturity); }

/** Channels depend on identity, never date, camera, quality or life stage
 * (stage only sets maturity and the juvenile coat). */
export function createFaunaAppearance(genome: CreatureGenome, id: string, variant: number, stage: 'adult' | 'juvenile'): FaunaAppearance {
  const species = faunaSpeciesKey(genome);
  const key = `${id}/${variant}/appearance-v1`;
  const mass = signed(`${species}/mass`), limb = signed(`${species}/limb`), neck = signed(`${species}/neck`);
  const { lineage, coat: speciesCoat } = faunaSpeciesCoat(genome);
  const { dimorphism, hornlessFemales } = faunaSpeciesDimorphism(genome);
  // The individual coat drift supersedes the v1 +-14% brightness channel.
  const adultCoat = faunaAdultCoat(speciesCoat, key);
  const maturity = stage === 'adult' ? 1 : .22 + .23 * unit(`${key}/maturity-v2`);
  const coat: CoatGenome = stage === 'adult' ? adultCoat : {
    ...adultCoat,
    juvenileSpots: adultCoat.marks & COAT_MARK_BITS['juvenile-spots'] ? faunaJuvenileSpotStrength(maturity) : 0,
    greying: 0,
  };
  // The far-LOD palette is the adult coat's exact mean, so it never depends on stage.
  const mean = faunaFarCoatMeanCached(`${species}|${faunaLineageKey(genome)}|${key}`, adultCoat, inheritedFaunaFamily(genome), faunaArmorShare(genome));
  return {
    version: FAUNA_APPEARANCE_VERSION, individualKey: key, markingSeed: hash(`${key}/markings`), pattern: genome.pattern,
    palette: { base: linearHexOf(mean), marking: linearHexOf(adultCoat.colours.accent), belly: linearHexOf(adultCoat.colours.belly) },
    roughness: .84 + signed(`${species}/roughness`) * .035,
    profile: { mass, limb, neck, dimorphism, hornlessFemales },
    individual: { size: signed(`${key}/size`), condition: signed(`${key}/condition`), muzzle: signed(`${key}/muzzle`), ears: signed(`${key}/ears`), sex: unit(`${key}/sex-v2`) < .5 ? 'male' : 'female' },
    growth: { stage, maturity, lateral: 1 },
    coat,
    lineage: { family: lineage.family, pattern: lineage.pattern },
  };
}

/** Errors in a stored v2 coat genome (shape and ranges only). */
export function faunaCoatErrors(coat: CoatGenome | undefined): string[] {
  if (!coat || typeof coat !== 'object' || coat.version !== 'fauna-coat-1') return ['invalid coat genome'];
  const errors: string[] = [];
  if (!isCoatPattern(coat.pattern) || (coat.pattern as string) === 'auto') errors.push('invalid coat pattern');
  for (const [field, [lo, hi]] of Object.entries(COAT_GENOME_RANGES)) {
    const value = (coat as unknown as Record<string, number>)[field];
    if (!Number.isFinite(value) || value! < lo || value! > hi) errors.push(`coat ${field} out of range`);
  }
  if (!Number.isInteger(coat.seed) || coat.seed < 0 || coat.seed > 0xffffffff) errors.push('invalid coat seed');
  if (coat.markRole !== 'accent' && coat.markRole !== 'belly') errors.push('invalid coat mark role');
  if (!coat.colours || !COAT_ROLES.every(role => Array.isArray(coat.colours[role]) && coat.colours[role].length === 3 && coat.colours[role].every(v => Number.isFinite(v) && v >= 0 && v <= 1))) errors.push('invalid coat colours');
  return errors;
}
export function isPigmentFamily(value: unknown): value is PigmentFamily { return typeof value === 'string' && (PIGMENT_FAMILIES as readonly string[]).includes(value); }

/** A species keeps one morphology regardless of specimen, life stage or camera. */
export function inheritedFaunaFamily(genome: CreatureGenome): FaunaMorphologyFamily {
  if (genome.morphology) return genome.morphology.family;
  if (genome.archetype === 'browser') return 'ungulate';
  if (genome.archetype === 'runner') return 'cursorial';
  if (genome.archetype === 'long-neck') return 'long-neck';
  return hash(`${genome.torsoLength}/${genome.torsoWidth}/${genome.color}/family-v1`) % 4 === 0 ? 'proboscidean' : 'padded';
}

/** Relative growth scales at the reviewed juvenile stage (maturity 0.28, not
 * years or world date). Precocial browsers retain long legs; young long-necked
 * animals have a shorter neck. Heads and feet develop ahead of the trunk.
 * fauna-appearance-2 interpolates these by (1 - maturity) / 0.72. */
export const FAUNA_JUVENILE_PROPORTIONS: Record<CreatureArchetype, { trunk: number; width: number; limb: number; neck: number; head: number; foot: number; ear: number }> = {
  browser: { trunk: .58, width: .55, limb: .69, neck: .53, head: .75, foot: .76, ear: .82 },
  runner: { trunk: .56, width: .56, limb: .63, neck: .57, head: .76, foot: .80, ear: .82 },
  'low-slung': { trunk: .59, width: .58, limb: .62, neck: .56, head: .75, foot: .78, ear: .80 },
  'long-neck': { trunk: .59, width: .56, limb: .71, neck: .43, head: .73, foot: .77, ear: .81 },
};
/** The maturity at which FAUNA_JUVENILE_PROPORTIONS were authored. */
export const FAUNA_REFERENCE_JUVENILE_MATURITY = .28;

// ---------------------------------------------------------------------------
// Sampling.
// ---------------------------------------------------------------------------

/** Body-plan region names accepted by sampleFaunaCoat (coat regions pass through). */
export type FaunaBodyRegion = 'torso' | 'neck' | 'head' | 'tail' | 'upper' | 'lower' | 'foot' | 'armor';
/** Optional surface detail for one sample. dorsal: the surface normal's
 * vertical component (default from height); along: 0..1 within the region,
 * proximal to distal; cellM: the mesh's vertex spacing in metres, which widens
 * mark edges and bounds the pattern scale so marks span several vertices. */
export interface FaunaCoatSurface { dorsal?: number; along?: number; cellM?: number }

const REGION_MAP: Readonly<Record<string, CoatRegion>> = {
  torso: 'torso', neck: 'neck', head: 'head', tail: 'tail', upper: 'limb-upper', lower: 'limb-lower', foot: 'foot', armor: 'armor',
  muzzle: 'muzzle', ear: 'ear', 'limb-upper': 'limb-upper', 'limb-lower': 'limb-lower', 'tail-tip': 'tail-tip', horn: 'horn', wing: 'wing', eye: 'eye',
};
/** Pattern feature constants for the vertex-density clamp: the mark (cell,
 * stripe period) spans `k / (cells per body x scale)` torso lengths and must
 * cover at least four mesh cells. Spots use coatMinFeature (spot diameter)
 * exactly; thin lines (reticulation, rosette rings) are carried by the
 * footprint instead of being clamped away. Roan, saddle and dorsal stripes are
 * not cellular and need no clamp. */
const CLAMP_FEATURE: Partial<Record<ResolvedCoatPattern, number>> = {
  rosettes: .5, reticulated: .67, dapple: .67, stripes: .67, bands: .67, brindle: .67, piebald: .67,
};
/** Largest pattern scale whose marks span 4 cells of `cell` torso lengths. */
export function faunaCoatMaxScale(coat: CoatGenome, cell: number): number {
  const need = 4 * cell;
  if (!(need > 0)) return Infinity;
  if (coat.pattern === 'spots') return coatMinFeature({ ...coat, marks: 0, scale: 1 }) / need;
  const k = CLAMP_FEATURE[coat.pattern], cells = COAT_CELLS_PER_BODY[coat.pattern];
  return k === undefined || !(cells > 0) ? Infinity : k / (cells * need);
}
let clampSource: CoatGenome | undefined, clampCell = NaN, clampResult: CoatGenome | undefined;
function clampedCoat(coat: CoatGenome, cell: number): CoatGenome {
  if (coat === clampSource && cell === clampCell) return clampResult!;
  const max = faunaCoatMaxScale(coat, cell);
  clampSource = coat; clampCell = cell;
  clampResult = coat.scale > max ? { ...coat, scale: max } : coat;
  return clampResult;
}

const SAMPLE: CoatSample = { x: 0, y: 0, z: 0, dorsal: 0, region: 'torso', along: 0, footprint: 0 };
const OUT = new Float64Array(3);

/** Fills SAMPLE in torso-length units (x forward, y from the torso axis, z signed). */
function prepare(genome: CreatureGenome, x: number, y: number, z: number, torsoY: number, region: string | undefined, surface: FaunaCoatSurface | undefined): CoatGenome {
  const a = genome.appearance!, TL = Math.max(genome.torsoLength, 1e-3);
  SAMPLE.x = x / TL; SAMPLE.y = (y - torsoY) / TL; SAMPLE.z = z / TL * (a.growth.lateral ?? 1);
  SAMPLE.dorsal = surface?.dorsal !== undefined && Number.isFinite(surface.dorsal) ? clamp(surface.dorsal, -1, 1) : clamp(2 * (y - torsoY) / Math.max(genome.torsoHeight, .05), -1, 1);
  SAMPLE.region = (region !== undefined && REGION_MAP[region]) || 'torso';
  SAMPLE.along = surface?.along !== undefined && Number.isFinite(surface.along) ? clamp(surface.along, 0, 1) : 0;
  const cell = surface?.cellM !== undefined && surface.cellM > 0 ? surface.cellM / TL : 0;
  SAMPLE.footprint = cell;
  return cell > 0 ? clampedCoat(a.coat, cell) : a.coat;
}

/** Vertex coat in linear light. Torso-normalised bind-space coordinates keep
 * the same markings on adult and juvenile bodies; z is signed, so the flanks
 * differ. No maps, GPU resources, random state or added draw calls. The
 * undefined branch preserves legacy coats; a v1 appearance keeps its v1 coat. */
export function sampleFaunaCoat(genome: CreatureGenome, x: number, y: number, z: number, torsoY: number, region?: FaunaBodyRegion | CoatRegion, surface?: FaunaCoatSurface): CoatColor | undefined {
  const a = genome.appearance;
  if (!a) return undefined;
  if (a.version !== FAUNA_APPEARANCE_VERSION || !a.coat) return sampleLegacyCoat(genome, x, y, z, torsoY);
  evaluateCoat(prepare(genome, x, y, z, torsoY, region, surface), SAMPLE, OUT, 0);
  return [OUT[0]!, OUT[1]!, OUT[2]!];
}

const PROBE = new Float64Array(5);
/** Review/test probe: the raw pattern mark (0..1) the coat draws at a point,
 * before region strength and colour; 0 for legacy appearances. */
export function faunaCoatMark(genome: CreatureGenome, x: number, y: number, z: number, torsoY: number, region?: FaunaBodyRegion | CoatRegion, surface?: FaunaCoatSurface): number {
  const a = genome.appearance;
  if (!a || a.version !== FAUNA_APPEARANCE_VERSION || !a.coat) return 0;
  const coat = prepare(genome, x, y, z, torsoY, region, surface);
  if (coat.pattern === 'plain') return 0;
  // Pattern probe: identical placement to evaluateCoat.
  coatPatternProbe(coat, SAMPLE, PROBE);
  return PROBE[0]!;
}

/** The v1 coat (fauna-appearance-1), unchanged. */
function sampleLegacyCoat(genome: CreatureGenome, x: number, y: number, z: number, torsoY: number): CoatColor {
  const a = genome.appearance!;
  const u = x / genome.torsoLength, v = (y - torsoY) / genome.torsoHeight, w = Math.abs(z) / genome.torsoWidth;
  const phase = (a.markingSeed >>> 0) / 0x100000000 * Math.PI * 2;
  let marking = 0;
  if (a.pattern === 'stripes') {
    const wave = Math.sin(u * 32 + Math.sin(v * 4 + phase) * .65 + w * 1.5 + phase);
    marking = smooth(.44, .72, wave) * (1 - smooth(.6, 1.3, Math.abs(v)));
  } else if (a.pattern === 'spots') {
    // Jittered staggered cells avoid a visibly regular checkerboard of spots.
    const su = u * 10, sv = v * 6 + w * .7;
    const ix = Math.floor(su), iy = Math.floor(sv);
    let distance = 2;
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      const cx = ix + dx, cy = iy + dy, cell = `${a.markingSeed}/${cx}/${cy}`;
      const ox = .5 + signed(`${cell}/x`) * .22, oy = .5 + signed(`${cell}/y`) * .22;
      distance = Math.min(distance, Math.hypot(su - cx - ox, sv - cy - oy));
    }
    marking = (1 - smooth(.20, .34, distance)) * (1 - smooth(.7, 1.4, Math.abs(v)));
  }
  const base = linear(a.palette.base), marks = linear(a.palette.marking), belly = linear(a.palette.belly);
  const underside = 1 - smooth(-.42, .06, v);
  const dorsal = 1 - .10 * smooth(.02, .55, v);
  // Very small analytic mottling provides restrained coat variation at every LOD.
  const grain = 1 + .018 * Math.sin(u * 69 + v * 23 + phase) * Math.sin(w * 37 - v * 41);
  return base.map((b, i) => clamp(mix(mix(b, marks[i]!, marking * .78), belly[i]!, underside * .62) * dorsal * grain, 0, 1)) as CoatColor;
}
