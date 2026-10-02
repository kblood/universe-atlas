import type { CreatureArchetype, CreatureGenome } from './creature-model.ts';

/** An additive rendering contract. A genome without this block keeps its v1 evaluation. */
export const FAUNA_APPEARANCE_VERSION = 'fauna-appearance-1';
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
export interface FaunaAppearance {
  version: typeof FAUNA_APPEARANCE_VERSION;
  individualKey: string;
  markingSeed: number;
  pattern: CreatureGenome['pattern'];
  palette: { base: string; marking: string; belly: string };
  roughness: number;
  profile: { mass: number; limb: number; neck: number };
  individual: { size: number; condition: number; muzzle: number; ears: number };
  growth: { stage: 'adult' | 'juvenile'; maturity: number };
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
function rgb(hex: string): CoatColor { return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255) as CoatColor; }
function hex(rgb: CoatColor): string { return '#' + rgb.map(v => Math.round(clamp(v, 0, 1) * 255).toString(16).padStart(2, '0')).join(''); }
function linear(hex: string): CoatColor { return rgb(hex).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4) as CoatColor; }
const tint = (color: CoatColor, multiplier: number): CoatColor => color.map(v => clamp(v * multiplier, 0, 1)) as CoatColor;

/** Channels depend on identity, never date, camera, quality or life stage. */
export function createFaunaAppearance(genome: CreatureGenome, id: string, variant: number, stage: 'adult' | 'juvenile'): FaunaAppearance {
  const species = `${genome.archetype}/${genome.torsoLength}/${genome.torsoWidth}/${genome.legLength}/${genome.neckLength}/${genome.color}/${genome.pattern}`;
  const key = `${id}/${variant}/appearance-v1`;
  const mass = signed(`${species}/mass`), limb = signed(`${species}/limb`), neck = signed(`${species}/neck`);
  const inherited = rgb(genome.color), luminance = inherited[0] * .2126 + inherited[1] * .7152 + inherited[2] * .0722;
  // Keep inherited hue recognisable, with a restrained warm, short-coated surface.
  const base = inherited.map((v, i) => mix(v, luminance * [1.09, .99, .86][i]!, .32)) as CoatColor;
  const individualBase = tint(base, 1 + signed(`${key}/palette`) * .14);
  const marking = tint(individualBase, .48 + (signed(`${species}/contrast`) + 1) * .07);
  const belly = individualBase.map((v, i) => mix(v, [.78, .70, .56][i]!, .25)) as CoatColor;
  return {
    version: FAUNA_APPEARANCE_VERSION, individualKey: key, markingSeed: hash(`${key}/markings`), pattern: genome.pattern,
    palette: { base: hex(individualBase), marking: hex(marking), belly: hex(belly) }, roughness: .84 + signed(`${species}/roughness`) * .035,
    profile: { mass, limb, neck },
    individual: { size: signed(`${key}/size`), condition: signed(`${key}/condition`), muzzle: signed(`${key}/muzzle`), ears: signed(`${key}/ears`) },
    growth: { stage, maturity: stage === 'adult' ? 1 : .28 },
  };
}

/** A species keeps one morphology regardless of specimen, life stage or camera. */
export function inheritedFaunaFamily(genome: CreatureGenome): FaunaMorphologyFamily {
  if (genome.morphology) return genome.morphology.family;
  if (genome.archetype === 'browser') return 'ungulate';
  if (genome.archetype === 'runner') return 'cursorial';
  if (genome.archetype === 'long-neck') return 'long-neck';
  return hash(`${genome.torsoLength}/${genome.torsoWidth}/${genome.color}/family-v1`) % 4 === 0 ? 'proboscidean' : 'padded';
}

/** Relative growth scales at the reviewed juvenile stage (not years or world date).
 * Precocial browsers retain long legs; young long-necked animals have a shorter
 * neck. Heads and feet develop ahead of the trunk across all four families. */
export const FAUNA_JUVENILE_PROPORTIONS: Record<CreatureArchetype, { trunk: number; width: number; limb: number; neck: number; head: number; foot: number; ear: number }> = {
  browser: { trunk: .58, width: .55, limb: .69, neck: .53, head: .75, foot: .76, ear: .82 },
  runner: { trunk: .56, width: .56, limb: .63, neck: .57, head: .76, foot: .80, ear: .82 },
  'low-slung': { trunk: .59, width: .58, limb: .62, neck: .56, head: .75, foot: .78, ear: .80 },
  'long-neck': { trunk: .59, width: .56, limb: .71, neck: .43, head: .73, foot: .77, ear: .81 },
};

/** Vertex coat in linear light. Normalized bind-space coordinates keep the same
 * markings on adult and juvenile bodies. No maps, allocations of GPU resources,
 * random state, or added draw calls. The undefined branch preserves legacy coats. */
export function sampleFaunaCoat(genome: CreatureGenome, x: number, y: number, z: number, torsoY: number): CoatColor | undefined {
  const a = genome.appearance;
  if (!a) return undefined;
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
