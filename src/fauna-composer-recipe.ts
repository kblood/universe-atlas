/** Versioned, bounded recipe for the experimental modular creature composer.
 * Every part is chosen independently. The recipe never names an asset path:
 * all geometry is procedural, so a shared link cannot load arbitrary files.
 * Units are metres; the creature faces +X with +Y up. */
export const COMPOSER_RECIPE_VERSION = 1;
export const COMPOSER_RECIPE_MAX_TEXT = 1200;

export const COMPOSER_LAYOUTS = ['limbless', 'biped', 'quadruped', 'sprawled', 'many-legged'] as const;
export const COMPOSER_CHOICES = {
  layout: COMPOSER_LAYOUTS,
  torso: ['slim', 'barrel', 'deep-chest', 'flat', 'annulated', 'segmented'],
  head: ['muzzle', 'jaws', 'beak', 'flat-face', 'blunt', 'mandibles'],
  horns: ['none', 'nasal', 'paired', 'ossicones', 'crest'],
  legs: ['pillar', 'plantigrade', 'digitigrade', 'unguligrade', 'arthropod'],
  feet: ['hoof', 'paw', 'claw', 'pad', 'hand', 'spike'],
  arms: ['none', 'small', 'grasping'],
  hands: ['hand', 'claw', 'pincer'],
  tail: ['none', 'stub', 'reptile', 'tufted', 'feather-fan', 'club'],
  armor: ['none', 'dome', 'plates', 'osteoderms', 'bands'],
  wings: ['none', 'feathered', 'membrane'],
  trunk: ['none', 'trunk'],
  palette: ['earth', 'savanna', 'reptile', 'plumage', 'slate', 'ink'],
} as const;
export type ComposerLayout = typeof COMPOSER_LAYOUTS[number];
type Choices = typeof COMPOSER_CHOICES;
export type ComposerChoiceKey = keyof Choices;

/** Numeric ranges: [min, max, step]. Lengths other than bodyLength are ratios of bodyLength. */
export const COMPOSER_RANGES = {
  legPairs: [0, 12, 1],
  bodyLength: [0.2, 6, 0.01],
  girth: [0.5, 1.6, 0.01],
  posture: [0, 1, 0.01],
  neckLength: [0, 1.5, 0.01],
  headSize: [0.5, 1.6, 0.01],
  snoutLength: [0, 1.5, 0.01],
  legLength: [0.1, 1.8, 0.01],
  armLength: [0.2, 1.4, 0.01],
  tailLength: [0, 2, 0.01],
  wingSpan: [0.5, 4, 0.01],
  trunkLength: [0.2, 1.4, 0.01],
  colorSeed: [0, 9999, 1],
} as const;
export type ComposerNumberKey = keyof typeof COMPOSER_RANGES;

export interface ComposerRecipe {
  version: typeof COMPOSER_RECIPE_VERSION;
  layout: ComposerLayout;
  /** Walking leg pairs. Fixed by layout except many-legged (3..12). */
  legPairs: number;
  /** Metres: torso length for legged plans; whole body length for limbless/many-legged. */
  bodyLength: number;
  girth: number;
  /** Bipeds: 0 horizontal (theropod) .. 1 upright (ape). Quadrupeds: shoulder rise. */
  posture: number;
  torso: Choices['torso'][number];
  neckLength: number;
  head: Choices['head'][number];
  headSize: number;
  snoutLength: number;
  horns: Choices['horns'][number];
  legs: Choices['legs'][number];
  legLength: number;
  feet: Choices['feet'][number];
  arms: Choices['arms'][number];
  armLength: number;
  hands: Choices['hands'][number];
  tail: Choices['tail'][number];
  tailLength: number;
  armor: Choices['armor'][number];
  wings: Choices['wings'][number];
  wingSpan: number;
  trunk: Choices['trunk'][number];
  trunkLength: number;
  palette: Choices['palette'][number];
  colorSeed: number;
}
export const COMPOSER_RECIPE_KEYS = ['layout', 'legPairs', 'bodyLength', 'girth', 'posture', 'torso', 'neckLength', 'head', 'headSize', 'snoutLength', 'horns',
  'legs', 'legLength', 'feet', 'arms', 'armLength', 'hands', 'tail', 'tailLength', 'armor', 'wings', 'wingSpan', 'trunk', 'trunkLength', 'palette', 'colorSeed'] as const;

/** A compatibility adjustment the composer applied. The chosen part stays in the
 * recipe; `effect` says what is actually built from it. */
export interface ComposerConstraint { part: string; chosen: string; effect: string }

const base: ComposerRecipe = {
  version: 1, layout: 'quadruped', legPairs: 2, bodyLength: 1, girth: 1, posture: 0.2, torso: 'slim', neckLength: 0.4, head: 'muzzle', headSize: 1, snoutLength: 0.6,
  horns: 'none', legs: 'digitigrade', legLength: 0.8, feet: 'paw', arms: 'none', armLength: 0.6, hands: 'hand', tail: 'tufted', tailLength: 0.6,
  armor: 'none', wings: 'none', wingSpan: 2, trunk: 'none', trunkLength: 0.8, palette: 'earth', colorSeed: 1,
};
const preset = (p: Partial<ComposerRecipe>): Readonly<ComposerRecipe> => Object.freeze({ ...base, ...p });

/** Starting points inspired by real animals. Every field stays editable. */
export const COMPOSER_PRESETS = {
  dinosaur: preset({ layout: 'biped', legPairs: 1, bodyLength: 1.6, girth: 1.05, posture: 0.12, torso: 'deep-chest', neckLength: 0.45, head: 'jaws', headSize: 1.35, snoutLength: 1,
    horns: 'crest', legs: 'digitigrade', legLength: 1.05, feet: 'claw', arms: 'small', armLength: 0.38, hands: 'claw', tail: 'reptile', tailLength: 1.6, palette: 'reptile', colorSeed: 17 }),
  turtle: preset({ layout: 'sprawled', bodyLength: 0.55, girth: 1.1, posture: 0, torso: 'flat', neckLength: 0.35, head: 'beak', headSize: 0.9, snoutLength: 0.25,
    legs: 'pillar', legLength: 0.42, feet: 'pad', tail: 'stub', tailLength: 0.25, armor: 'dome', palette: 'reptile', colorSeed: 211 }),
  giraffe: preset({ layout: 'quadruped', bodyLength: 1.5, girth: 0.9, posture: 0.7, torso: 'slim', neckLength: 1.5, head: 'muzzle', headSize: 0.85, snoutLength: 0.8,
    horns: 'ossicones', legs: 'unguligrade', legLength: 1.45, feet: 'hoof', tail: 'tufted', tailLength: 0.6, palette: 'savanna', colorSeed: 37 }),
  bird: preset({ layout: 'biped', legPairs: 1, bodyLength: 0.22, girth: 1.2, posture: 0.45, torso: 'barrel', neckLength: 0.45, head: 'beak', headSize: 1.2, snoutLength: 0.55,
    legs: 'digitigrade', legLength: 0.85, feet: 'claw', tail: 'feather-fan', tailLength: 0.9, wings: 'feathered', wingSpan: 3.2, palette: 'plumage', colorSeed: 5 }),
  ostrich: preset({ layout: 'biped', legPairs: 1, bodyLength: 0.8, girth: 1.1, posture: 0.3, torso: 'barrel', neckLength: 1.5, head: 'beak', headSize: 0.75, snoutLength: 0.45,
    legs: 'digitigrade', legLength: 1.8, feet: 'claw', tail: 'feather-fan', tailLength: 0.4, wings: 'feathered', wingSpan: 1.3, palette: 'ink', colorSeed: 88 }),
  rhinoceros: preset({ layout: 'quadruped', bodyLength: 2.1, girth: 1.4, posture: 0.1, torso: 'barrel', neckLength: 0.2, head: 'muzzle', headSize: 1.15, snoutLength: 0.75,
    horns: 'nasal', legs: 'pillar', legLength: 0.5, feet: 'pad', tail: 'tufted', tailLength: 0.25, armor: 'osteoderms', palette: 'slate', colorSeed: 61 }),
  ape: preset({ layout: 'biped', legPairs: 1, bodyLength: 0.6, girth: 1.15, posture: 0.85, torso: 'deep-chest', neckLength: 0.1, head: 'flat-face', headSize: 1.1, snoutLength: 0.35,
    legs: 'plantigrade', legLength: 1.05, feet: 'hand', arms: 'grasping', armLength: 1.25, hands: 'hand', tail: 'none', tailLength: 0, palette: 'ink', colorSeed: 143 }),
  worm: preset({ layout: 'limbless', legPairs: 0, bodyLength: 1.1, girth: 1, posture: 0, torso: 'annulated', neckLength: 0, head: 'blunt', headSize: 1, snoutLength: 0.2,
    legs: 'pillar', feet: 'pad', tail: 'none', tailLength: 0, palette: 'earth', colorSeed: 401 }),
  centipede: preset({ layout: 'many-legged', legPairs: 11, bodyLength: 0.55, girth: 0.9, posture: 0, torso: 'segmented', neckLength: 0, head: 'mandibles', headSize: 1, snoutLength: 0.3,
    legs: 'arthropod', legLength: 0.2, feet: 'spike', tail: 'none', tailLength: 0, armor: 'bands', palette: 'ink', colorSeed: 909 }),
  // Named hybrids show independent composition; they are starting points, not species.
  'shelled-giraffe-bird': preset({ layout: 'biped', legPairs: 1, bodyLength: 0.9, girth: 1.2, posture: 0.3, torso: 'barrel', neckLength: 1.3, head: 'beak', headSize: 0.9, snoutLength: 0.5,
    horns: 'ossicones', legs: 'unguligrade', legLength: 1.3, feet: 'hoof', tail: 'stub', tailLength: 0.3, armor: 'dome', wings: 'feathered', wingSpan: 1.6, palette: 'savanna', colorSeed: 2718 }),
  'trunked-centipede': preset({ layout: 'many-legged', legPairs: 7, bodyLength: 1.4, girth: 1.3, posture: 0, torso: 'segmented', neckLength: 0.3, head: 'muzzle', headSize: 1, snoutLength: 0.4,
    horns: 'nasal', legs: 'pillar', legLength: 0.24, feet: 'pad', tail: 'tufted', tailLength: 0.2, armor: 'bands', trunk: 'trunk', trunkLength: 1, palette: 'slate', colorSeed: 3141 }),
  'winged-ape-rhino': preset({ layout: 'quadruped', bodyLength: 1.2, girth: 1.25, posture: 0.25, torso: 'deep-chest', neckLength: 0.15, head: 'flat-face', headSize: 1.1, snoutLength: 0.5,
    horns: 'nasal', legs: 'plantigrade', legLength: 0.7, feet: 'hand', arms: 'grasping', armLength: 0.8, hands: 'hand', tail: 'club', tailLength: 0.8, wings: 'membrane', wingSpan: 2.4, palette: 'earth', colorSeed: 1618 }),
} satisfies Record<string, Readonly<ComposerRecipe>>;
export type ComposerPresetId = keyof typeof COMPOSER_PRESETS;
export const COMPOSER_PRESET_IDS = Object.keys(COMPOSER_PRESETS) as ComposerPresetId[];
export const COMPOSER_PRESET_LABELS: Record<ComposerPresetId, string> = {
  dinosaur: 'Dinosaur-like', turtle: 'Turtle-like', giraffe: 'Giraffe-like', bird: 'Bird-like', ostrich: 'Ostrich-like', rhinoceros: 'Rhinoceros-like', ape: 'Ape-like',
  worm: 'Worm-like', centipede: 'Centipede-like', 'shelled-giraffe-bird': 'Hybrid: shelled giraffe-bird', 'trunked-centipede': 'Hybrid: trunked centipede',
  'winged-ape-rhino': 'Hybrid: winged ape-rhino',
};
export function composerPreset(id: ComposerPresetId): ComposerRecipe {
  if (typeof id !== 'string' || !Object.hasOwn(COMPOSER_PRESETS, id)) throw new Error(`Unknown composer preset: ${String(id).slice(0, 40)}`);
  return { ...COMPOSER_PRESETS[id] };
}
export function isComposerPresetId(id: unknown): id is ComposerPresetId { return typeof id === 'string' && Object.hasOwn(COMPOSER_PRESETS, id); }

const roundStep = (value: number, step: number) => step >= 1 ? Math.round(value) : Math.round(value / step) * step;
const fix = (value: number) => Number(value.toFixed(4));
/** Layout-fixed leg pair counts. */
export function composerLegPairRange(layout: ComposerLayout): [number, number] {
  if (!(COMPOSER_LAYOUTS as readonly string[]).includes(layout)) throw new Error(`Unknown composer layout: ${String(layout).slice(0, 40)}`);
  return layout === 'limbless' ? [0, 0] : layout === 'biped' ? [1, 1] : layout === 'quadruped' || layout === 'sprawled' ? [2, 2] : [3, 12];
}

/** Bounds every field. Out-of-range or unknown values are replaced and listed in `issues`. */
export function normalizeComposerRecipe(input: unknown): { recipe: ComposerRecipe; issues: string[] } {
  const issues: string[] = [];
  const record = !!input && typeof input === 'object' && !Array.isArray(input);
  const source = (record ? input : {}) as Record<string, unknown>;
  if (!record) issues.push('Recipe was not a plain object; defaults used.');
  if (record && 'version' in source && source.version !== COMPOSER_RECIPE_VERSION) issues.push(`Recipe version ${String(source.version).slice(0, 12)} is not supported; fields were read as version ${COMPOSER_RECIPE_VERSION}.`);
  const recipe = { ...base } as ComposerRecipe;
  const r = recipe as unknown as Record<string, unknown>;
  for (const key of Object.keys(COMPOSER_CHOICES) as ComposerChoiceKey[]) {
    if (!(key in source)) continue;
    const value = source[key], allowed = COMPOSER_CHOICES[key] as readonly string[];
    if (typeof value === 'string' && allowed.includes(value)) r[key] = value;
    else issues.push(`Unknown ${key} "${String(value).slice(0, 40)}"; using ${String(r[key])}.`);
  }
  for (const key of Object.keys(COMPOSER_RANGES) as ComposerNumberKey[]) {
    if (!(key in source)) continue;
    const [min, max, step] = COMPOSER_RANGES[key];
    const raw = source[key], value = typeof raw === 'number' ? raw : typeof raw === 'string' && raw.trim() ? Number(raw) : NaN;
    if (!Number.isFinite(value)) { issues.push(`${key} is not a finite number; using ${String(r[key])}.`); continue; }
    const bounded = fix(Math.max(min, Math.min(max, roundStep(value, step))));
    if (Math.abs(bounded - value) > step * 0.5 + 1e-9) issues.push(`${key} ${value} limited to ${bounded}.`);
    r[key] = bounded;
  }
  const [lo, hi] = composerLegPairRange(recipe.layout);
  if (recipe.legPairs < lo || recipe.legPairs > hi) {
    const next = Math.max(lo, Math.min(hi, recipe.legPairs));
    if ('legPairs' in source) issues.push(`${recipe.layout} body uses ${lo === hi ? lo : `${lo}-${hi}`} leg pairs; ${recipe.legPairs} set to ${next}.`);
    recipe.legPairs = next;
  }
  recipe.version = COMPOSER_RECIPE_VERSION;
  return { recipe, issues };
}

/** Compatibility rules applied when building. Chosen parts are kept in the
 * recipe; each entry reports how the builder adapts a combination. */
export function composerConstraints(recipe: ComposerRecipe): ComposerConstraint[] {
  const out: ComposerConstraint[] = [];
  const legged = recipe.layout !== 'limbless';
  if (!legged) {
    out.push({ part: 'Legs and feet', chosen: `${recipe.legs} / ${recipe.feet}`, effect: 'Not built: a limbless body has no legs. It crawls on its belly instead.' });
    if (recipe.neckLength > 0) out.push({ part: 'Neck', chosen: recipe.neckLength.toFixed(2), effect: 'A limbless body has no separate neck; the front of the body is raised and lengthened instead.' });
  }
  if (recipe.layout === 'many-legged' && recipe.legs !== 'arthropod' && recipe.legLength > 0.45)
    out.push({ part: 'Leg length', chosen: recipe.legLength.toFixed(2), effect: 'Shortened to 0.45 body lengths so neighbouring leg pairs do not cross.' });
  if (recipe.armor === 'dome' && (recipe.layout === 'limbless' || recipe.layout === 'many-legged'))
    out.push({ part: 'Shell', chosen: 'dome', effect: 'Covers only the middle third so the long flexible body can still bend.' });
  if (recipe.armor === 'dome' && recipe.wings !== 'none')
    out.push({ part: 'Wings', chosen: recipe.wings, effect: 'Wing roots are moved to the shell rim instead of the back.' });
  if (recipe.armor === 'plates' && recipe.layout === 'many-legged')
    out.push({ part: 'Armor', chosen: 'plates', effect: 'One plate per body segment.' });
  if (recipe.trunk === 'trunk' && (recipe.head === 'beak' || recipe.head === 'mandibles'))
    out.push({ part: 'Trunk', chosen: 'trunk', effect: `Grows from above the ${recipe.head === 'beak' ? 'beak' : 'mandibles'}; it does not replace the mouth.` });
  if (recipe.horns === 'nasal' && recipe.trunk === 'trunk')
    out.push({ part: 'Horn', chosen: 'nasal', effect: 'Moved back onto the forehead to leave room for the trunk.' });
  if (recipe.arms !== 'none' && recipe.layout !== 'biped')
    out.push({ part: 'Arms', chosen: recipe.arms, effect: recipe.layout === 'limbless' ? 'Attached behind the head; the body still crawls.' : 'Added as an extra pair in front of the walking legs; they do not touch the ground.' });
  if (recipe.arms === 'none' && recipe.hands !== 'hand')
    out.push({ part: 'Hands', chosen: recipe.hands, effect: 'Not built because no arms are selected.' });
  if (recipe.wings !== 'none') {
    const limit = composerWingSpanLimit(recipe);
    if (recipe.wingSpan > limit) out.push({ part: 'Wing span', chosen: recipe.wingSpan.toFixed(2), effect: `Limited to ${limit.toFixed(2)} body lengths so folded wings stay off the ground.` });
    out.push({ part: 'Wings', chosen: recipe.wings, effect: 'Grounded display and folding only. Flight is not simulated.' });
  }
  if (recipe.tail === 'none' && recipe.tailLength > 0)
    out.push({ part: 'Tail length', chosen: recipe.tailLength.toFixed(2), effect: 'Ignored because no tail is selected.' });
  if (recipe.feet === 'spike' && recipe.layout !== 'many-legged' && legged)
    out.push({ part: 'Feet', chosen: 'spike', effect: 'Pointed tips carry the weight on a very small contact area.' });
  if (recipe.layout === 'biped' && recipe.posture > 0.6 && recipe.tail !== 'none' && recipe.tailLength > 1)
    out.push({ part: 'Tail', chosen: recipe.tail, effect: 'An upright body lets a long tail rest along the ground.' });
  return out;
}
/** Folded wings must clear the ground: span is bounded by body height. */
export function composerWingSpanLimit(recipe: ComposerRecipe): number {
  return recipe.layout === 'limbless' ? 1.5 : recipe.layout === 'many-legged' || recipe.layout === 'sprawled' ? 2 : 4;
}

/** Deterministic string hash and PRNG shared by seeding and colours. */
export function composerHash(text: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d); h ^= h >>> 15; h = Math.imul(h, 0x846ca68b);
  return (h ^ (h >>> 16)) >>> 0;
}
export function composerRandom(seed: string): () => number {
  let state = composerHash(seed) || 1;
  return () => { state = (state + 0x6d2b79f5) >>> 0; let t = state; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** Seeded structural combination: each part is drawn independently, so the
 * result mixes anatomy from different presets rather than choosing one. */
export function randomComposerRecipe(seed: string): ComposerRecipe {
  const rand = composerRandom(`composer-random-v1/${String(seed).slice(0, 160)}`);
  const pick = <T>(list: readonly T[], weights?: number[]): T => {
    if (!weights) return list[Math.floor(rand() * list.length) % list.length]!;
    const total = weights.reduce((a, b) => a + b, 0); let x = rand() * total;
    for (let i = 0; i < list.length; i++) { x -= weights[i]!; if (x <= 0) return list[i]!; }
    return list[list.length - 1]!;
  };
  const range = (key: ComposerNumberKey, lo?: number, hi?: number) => { const [min, max, step] = COMPOSER_RANGES[key]; const a = lo ?? min, b = hi ?? max; return fix(roundStep(a + (b - a) * rand(), step)); };
  const layout = pick(COMPOSER_LAYOUTS, [1, 2.2, 2.2, 1.3, 1.3]);
  const [lo, hi] = composerLegPairRange(layout);
  const legs = layout === 'many-legged' ? pick(COMPOSER_CHOICES.legs, [1, 0.5, 0.4, 0.3, 2.5]) : pick(COMPOSER_CHOICES.legs, [1, 1, 1.2, 1, 0.4]);
  const r: ComposerRecipe = {
    version: 1, layout, legPairs: lo + Math.floor(rand() * (hi - lo + 1)),
    bodyLength: layout === 'limbless' || layout === 'many-legged' ? range('bodyLength', 0.4, 2) : range('bodyLength', 0.3, 2.4),
    girth: range('girth', 0.75, 1.4), posture: range('posture'),
    torso: layout === 'limbless' ? pick(['annulated', 'slim', 'segmented'] as const) : layout === 'many-legged' ? pick(['segmented', 'annulated', 'flat'] as const) : pick(['slim', 'barrel', 'deep-chest', 'flat'] as const),
    neckLength: layout === 'limbless' ? 0 : range('neckLength', 0, 1.5), head: pick(COMPOSER_CHOICES.head), headSize: range('headSize', 0.7, 1.4), snoutLength: range('snoutLength', 0.1, 1.2),
    horns: pick(COMPOSER_CHOICES.horns, [2.5, 1, 1, 1, 1]), legs,
    legLength: layout === 'many-legged' ? range('legLength', 0.12, 0.4) : layout === 'sprawled' ? range('legLength', 0.3, 0.7) : range('legLength', 0.4, 1.6),
    feet: legs === 'arthropod' ? pick(['spike', 'claw', 'hand'] as const, [3, 1, 0.5]) : pick(COMPOSER_CHOICES.feet, [1, 1, 1, 1, 0.6, 0.3]),
    arms: pick(COMPOSER_CHOICES.arms, layout === 'biped' ? [1, 1, 1.5] : [3, 0.5, 1]), armLength: range('armLength', 0.3, 1.2), hands: pick(COMPOSER_CHOICES.hands),
    tail: pick(COMPOSER_CHOICES.tail, [0.8, 0.8, 1.5, 1, 0.8, 0.6]), tailLength: range('tailLength', 0.2, 1.6),
    armor: pick(COMPOSER_CHOICES.armor, [2, 1, 0.8, 0.8, 0.8]), wings: pick(COMPOSER_CHOICES.wings, [2.2, 1, 1]), wingSpan: range('wingSpan', 1, 3),
    trunk: pick(COMPOSER_CHOICES.trunk, [3, 1]), trunkLength: range('trunkLength', 0.4, 1.2), palette: pick(COMPOSER_CHOICES.palette), colorSeed: Math.floor(rand() * 10000),
  };
  if (r.tail === 'none') r.tailLength = 0;
  return normalizeComposerRecipe(r).recipe;
}

const NUMBER_KEYS = new Set<string>(Object.keys(COMPOSER_RANGES));
/** Compact, URL-safe text: `v1*layout_biped*bodyLength_1.6*...` (form-encoding leaves `*`, `_`, `.`, `-` intact). */
export function encodeComposerRecipe(recipe: ComposerRecipe): string {
  const { recipe: r } = normalizeComposerRecipe(recipe);
  return [`v${COMPOSER_RECIPE_VERSION}`, ...COMPOSER_RECIPE_KEYS.map(key => `${key}_${String(r[key])}`)].join('*');
}
/** Decodes shared text. An unsupported version or oversized text is an error
 * (nothing is built); unknown or out-of-range fields are bounded and listed. */
export function decodeComposerRecipe(text: string): { recipe: ComposerRecipe | null; issues: string[]; error: string | null } {
  if (typeof text !== 'string' || !text.trim()) return { recipe: null, issues: [], error: 'Empty composer recipe.' };
  if (text.length > COMPOSER_RECIPE_MAX_TEXT) return { recipe: null, issues: [], error: `Composer recipe is longer than ${COMPOSER_RECIPE_MAX_TEXT} characters.` };
  const [version, ...pairs] = text.split('*');
  if (version !== `v${COMPOSER_RECIPE_VERSION}`) return { recipe: null, issues: [], error: `Unsupported composer recipe version "${String(version).slice(0, 12)}".` };
  const source: Record<string, unknown> = {}, issues: string[] = [];
  for (const pair of pairs) {
    const split = pair.indexOf('_'), key = split > 0 ? pair.slice(0, split) : pair, value = split > 0 ? pair.slice(split + 1) : '';
    if (!(COMPOSER_RECIPE_KEYS as readonly string[]).includes(key)) { issues.push(`Ignored unknown recipe field "${key.slice(0, 24)}".`); continue; }
    if (key in source) { issues.push(`Repeated recipe field "${key}"; first value kept.`); continue; }
    source[key] = NUMBER_KEYS.has(key) ? (value.trim() ? Number(value) : NaN) : value;
  }
  const normalized = normalizeComposerRecipe(source);
  return { recipe: normalized.recipe, issues: [...issues, ...normalized.issues], error: null };
}
export function composerRecipesEqual(a: ComposerRecipe, b: ComposerRecipe): boolean {
  return a.version === COMPOSER_RECIPE_VERSION && b.version === COMPOSER_RECIPE_VERSION && COMPOSER_RECIPE_KEYS.every(key => a[key] === b[key]);
}
