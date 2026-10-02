/**
 * Face, headgear and eye contract for the modular creature composer (fauna-composer-face-1).
 *
 * Pure: no rendering-library import, no randomness, no clock. Erasable TypeScript only (Node
 * type-strips src/*.ts), so no enums, namespaces or parameter properties. It does not
 * import the recipe module at runtime (the recipe module imports this one), so it
 * carries its own copy of the composer hash (faceHash === composerHash, tested).
 *
 * Vocabulary rules (append-only; renaming or reordering breaks encoded recipes):
 * - A face is the recipe's `head` value. 'proboscis' is the trunk face (elephant, tapir):
 *   a trunk is a nose, so it grows only from a proboscis face, and the recipe's `trunk`
 *   key is derived from the face.
 * - Headgear is built only where real animals carry it. FACE_HEADGEAR says, per face and
 *   chosen horn kind, what is built. The chosen kind stays in the recipe; a 'Horns'
 *   compatibility entry explains when the built kind differs.
 * - Eye types and iris colours resolve per face. 'auto' picks the pupil from the anatomy
 *   (never from colour), and the iris band from a hash of colorSeed and face.
 */

export const COMPOSER_FACE_VERSION = 'fauna-composer-face-1';

/** Eye types. 'auto' resolves per face (resolveComposerEyes). */
export const COMPOSER_EYE_TYPES = ['auto', 'round', 'horizontal', 'vertical-slit', 'compound', 'eyespot'] as const;
export type ComposerEyeType = typeof COMPOSER_EYE_TYPES[number];
export type BuiltEyeType = Exclude<ComposerEyeType, 'auto'>;

/** Iris colours. 'auto' resolves to one of the face's bands. */
export const COMPOSER_IRIS = ['auto', 'dark-brown', 'brown', 'amber', 'gold', 'yellow', 'orange', 'red', 'green', 'pale'] as const;
export type IrisId = typeof COMPOSER_IRIS[number];
export type BuiltIrisId = Exclude<IrisId, 'auto'>;
/** Starting linear-RGB iris table (WP4 may tune and then pin it). */
export const COMPOSER_IRIS_RGB: Readonly<Record<BuiltIrisId, readonly [number, number, number]>> = Object.freeze({
  'dark-brown': [0.035, 0.018, 0.008], brown: [0.09, 0.045, 0.015], amber: [0.40, 0.20, 0.03], gold: [0.55, 0.38, 0.06], yellow: [0.70, 0.55, 0.05],
  orange: [0.70, 0.25, 0.03], red: [0.50, 0.04, 0.02], green: [0.18, 0.28, 0.06], pale: [0.55, 0.55, 0.50],
});

/** Every face, in the recipe's head-choice order ('proboscis' appended). */
export const COMPOSER_FACES = ['muzzle', 'jaws', 'beak', 'flat-face', 'blunt', 'mandibles', 'proboscis'] as const;
export type ComposerFace = typeof COMPOSER_FACES[number];
export const COMPOSER_HORNS = ['none', 'nasal', 'paired', 'ossicones', 'crest'] as const;
export type ComposerHorn = typeof COMPOSER_HORNS[number];
/** The skull the rig and mesh build. Until WP5 builds a real proboscis face, it builds the muzzle skull. */
export type ComposerSkull = 'muzzle' | 'jaws' | 'beak' | 'flat-face' | 'blunt' | 'mandibles';
export function composerSkullOf(face: ComposerFace): ComposerSkull {
  return face === 'proboscis' ? 'muzzle' : face;
}

/** The recipe fields this module reads (a full ComposerRecipe satisfies it). */
export interface ComposerFaceInput {
  head: ComposerFace;
  horns: ComposerHorn;
  layout: string;
  legs: string;
  feet: string;
  bodyLength: number;
  colorSeed: number;
  eyes: ComposerEyeType;
  iris: IrisId;
}
export interface ComposerFaceConstraint { part: string; chosen: string; effect: string }

export type BuiltHeadgear = 'none' | 'nasal' | 'paired' | 'ossicones' | 'crest';
export interface HeadgearBuild { built: BuiltHeadgear; effect: string | null }
const keep = (built: BuiltHeadgear): HeadgearBuild => ({built, effect: null});
const omit = (effect: string): HeadgearBuild => ({built: 'none', effect});
const MAMMAL_CREST = 'Not built: mammal skulls carry no bony crest.';
const BEAK_HORN = 'Not built: birds and turtles never grow horns; only a casque (Crest).';
const flat = (effect: string): Record<ComposerHorn, HeadgearBuild> => ({none: keep('none'), nasal: omit(effect), paired: omit(effect), ossicones: omit(effect), crest: omit(effect)});
/** What is built for each face and chosen horn kind. `effect` is null exactly when built === chosen
 * (beak + crest builds the crest as a casque; the UI labels that option 'Crest or casque'). */
export const FACE_HEADGEAR: Readonly<Record<ComposerFace, Readonly<Record<ComposerHorn, HeadgearBuild>>>> = Object.freeze({
  muzzle: {none: keep('none'), nasal: keep('nasal'), paired: keep('paired'), ossicones: keep('ossicones'),
    crest: omit(`${MAMMAL_CREST} Choose Paired horns or Ossicones.`)},
  proboscis: {none: keep('none'), paired: keep('paired'),
    nasal: omit('Not built: a trunk face has no nose bones to carry a horn.'),
    ossicones: omit('Not built: ossicones grow only on giraffe-like muzzles.'),
    crest: omit(MAMMAL_CREST)},
  jaws: {none: keep('none'), nasal: keep('nasal'), paired: keep('paired'), crest: keep('crest'),
    ossicones: {built: 'paired', effect: 'Built as brow horns: ossicones grow only on giraffe-like muzzles.'}},
  beak: {none: keep('none'), crest: keep('crest'),
    nasal: {built: 'crest', effect: 'Built as a casque: a beak carries a casque, not a nose horn.'},
    paired: omit(BEAK_HORN), ossicones: omit(BEAK_HORN)},
  'flat-face': flat('Not built: primate faces carry no horns.'),
  blunt: flat('Not built: a worm head has no skull to carry horns.'),
  mandibles: flat('Not built: arthropod heads carry no bony horns.'),
});
export function composerHeadgearBuild(recipe: Pick<ComposerFaceInput, 'head' | 'horns'>): HeadgearBuild {
  const row = FACE_HEADGEAR[recipe.head], cell = row?.[recipe.horns];
  return cell ? {...cell} : keep('none');
}

const VERTEBRATE_EYES: readonly BuiltEyeType[] = ['round', 'horizontal', 'vertical-slit'];
/** Explicit eye types each face can build ('auto' is always allowed). */
export const FACE_EYES: Readonly<Record<ComposerFace, readonly BuiltEyeType[]>> = Object.freeze({
  muzzle: VERTEBRATE_EYES, proboscis: VERTEBRATE_EYES, jaws: VERTEBRATE_EYES, beak: VERTEBRATE_EYES, 'flat-face': VERTEBRATE_EYES,
  blunt: ['eyespot'], mandibles: ['compound'],
});

/** Eye placement profile per face (or face sub-case): gaze yaw from the midline in degrees, and the eye
 * radius factor k (er = k x craniumHeight x eyeScale x eyeRel). WP4 reads these.
 * Compound eyes and eyespots take their size from their own face geometry: k 0 means "not k-sized". */
export const FACE_EYE_PROFILE = Object.freeze({
  'flat-face': {gazeYawDeg: 15, k: 0.13},
  'muzzle-carnivore': {gazeYawDeg: 35, k: 0.13},
  'muzzle-grazer': {gazeYawDeg: 65, k: 0.14},
  'jaws-upright': {gazeYawDeg: 45, k: 0.13},
  'jaws-sprawled': {gazeYawDeg: 70, k: 0.13},
  proboscis: {gazeYawDeg: 70, k: 0.07},
  beak: {gazeYawDeg: 75, k: 0.16},
  mandibles: {gazeYawDeg: 90, k: 0},
  blunt: {gazeYawDeg: 20, k: 0},
} as const satisfies Record<string, {gazeYawDeg: number; k: number}>);
export type ComposerEyeProfileId = keyof typeof FACE_EYE_PROFILE;

/** Grazer proxy: hooves, tip-toe hooved legs, or pillar legs (rhino-like herbivores). */
const grazer = (r: Pick<ComposerFaceInput, 'legs' | 'feet'>) => r.feet === 'hoof' || r.legs === 'unguligrade' || r.legs === 'pillar';
const sprawledJaws = (r: Pick<ComposerFaceInput, 'layout'>) => r.layout === 'sprawled' || r.layout === 'limbless';
export function composerEyeProfileId(r: Pick<ComposerFaceInput, 'head' | 'layout' | 'legs' | 'feet'>): ComposerEyeProfileId {
  switch (r.head) {
    case 'muzzle': return grazer(r) ? 'muzzle-grazer' : 'muzzle-carnivore';
    case 'jaws': return sprawledJaws(r) ? 'jaws-sprawled' : 'jaws-upright';
    default: return r.head;
  }
}

/** The eye type 'auto' builds. Depends on anatomy only (face, layout, legs, feet, body length), never on colour. */
export function composerAutoEyeType(r: Pick<ComposerFaceInput, 'head' | 'layout' | 'legs' | 'feet' | 'bodyLength'>): BuiltEyeType {
  switch (r.head) {
    case 'mandibles': return 'compound';
    case 'blunt': return 'eyespot';
    case 'beak': case 'flat-face': case 'proboscis': return 'round';
    case 'muzzle':
      if (r.feet === 'hoof' || r.legs === 'unguligrade') return 'horizontal';
      if (r.legs === 'pillar') return 'round';
      return r.bodyLength < 0.9 ? 'vertical-slit' : 'round';
    case 'jaws': return sprawledJaws(r) ? 'vertical-slit' : 'round';
    default: return 'round';
  }
}

/** Iris bands 'auto' chooses from, per face and built pupil. Empty: the eye has no iris. */
export function composerIrisBands(r: Pick<ComposerFaceInput, 'head' | 'layout'>, built: BuiltEyeType): readonly BuiltIrisId[] {
  if (built === 'compound' || built === 'eyespot') return [];
  switch (r.head) {
    case 'muzzle': return built === 'vertical-slit' ? ['amber', 'gold'] : ['dark-brown', 'brown'];
    case 'proboscis': return ['dark-brown'];
    case 'jaws': return ['gold', 'amber', 'orange', 'green'];
    case 'beak': return r.layout === 'sprawled' ? ['dark-brown', 'green'] : ['yellow', 'orange', 'red', 'dark-brown'];
    case 'flat-face': return ['dark-brown', 'brown'];
    default: return ['dark-brown'];
  }
}

/** Same algorithm as composerHash (fauna-composer-recipe.ts); duplicated to keep this module import-free. */
export function faceHash(text: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d); h ^= h >>> 15; h = Math.imul(h, 0x846ca68b);
  return (h ^ (h >>> 16)) >>> 0;
}

export interface ResolvedComposerEyes {
  /** The recipe's eye choice ('auto' or an explicit type). */
  chosen: ComposerEyeType;
  /** The eye type actually built. */
  built: BuiltEyeType;
  /** True when the choice was 'auto'. */
  auto: boolean;
  /** The recipe's iris choice ('auto' or an explicit colour). */
  iris: IrisId;
  /** The iris colour actually built; null for compound eyes and eyespots (no iris). */
  irisBuilt: BuiltIrisId | null;
  gazeYawDeg: number;
  k: number;
  /** Why the built eye differs from an explicit choice; null when it does not. */
  effect: string | null;
}
const NO_COMPOUND = 'compound eyes belong to arthropod heads.';
const NO_EYESPOT = 'eyespots belong to worm heads.';
/** Resolves the eye and iris actually built. Pure; colorSeed only picks the iris band. */
export function resolveComposerEyes(r: ComposerFaceInput): ResolvedComposerEyes {
  const auto = composerAutoEyeType(r), chosen = r.eyes;
  let built: BuiltEyeType = auto, effect: string | null = null;
  if (chosen !== 'auto') {
    if (FACE_EYES[r.head]?.includes(chosen)) built = chosen;
    else if (r.head === 'mandibles') effect = 'Built as compound: arthropod heads have compound eyes.';
    else if (r.head === 'blunt') effect = 'Built as eyespot: a worm head has only pigment eyespots.';
    else effect = `Built as ${auto}: ${chosen === 'compound' ? NO_COMPOUND : NO_EYESPOT}`;
  }
  const bands = composerIrisBands(r, built);
  let irisBuilt: BuiltIrisId | null = null;
  if (bands.length) irisBuilt = r.iris === 'auto' ? bands[faceHash(`face-eye-v1/${r.colorSeed}/${r.head}`) % bands.length]! : r.iris;
  const profile = FACE_EYE_PROFILE[composerEyeProfileId(r)];
  return {chosen, built, auto: chosen === 'auto', iris: r.iris, irisBuilt, gazeYawDeg: profile.gazeYawDeg, k: profile.k, effect};
}

/** Face compatibility entries: horns not built (or built as another kind), an eye type the face cannot have,
 * and an iris colour on an eye without an iris. */
export function composerFaceConstraints(r: ComposerFaceInput): ComposerFaceConstraint[] {
  const out: ComposerFaceConstraint[] = [];
  const hg = composerHeadgearBuild(r);
  if (hg.built !== r.horns) out.push({part: 'Horns', chosen: r.horns, effect: hg.effect!});
  const eyes = resolveComposerEyes(r);
  if (eyes.effect) out.push({part: 'Eyes', chosen: r.eyes, effect: eyes.effect});
  if (r.iris !== 'auto' && eyes.irisBuilt === null) out.push({part: 'Iris colour', chosen: r.iris, effect: 'Iris colour has no effect: compound eyes and eyespots have no iris.'});
  return out;
}

const LEGACY_FACES: readonly string[] = ['muzzle', 'jaws', 'beak', 'flat-face', 'blunt', 'mandibles'];
/** Legacy (recipe v1/v2) migration of the trunk into the face. Mutates `source` (pass a copy) and appends
 * the explanation to `issues`. A trunk on a muzzle (or on a missing/unknown head, which built a muzzle)
 * becomes Face = Proboscis; a trunk on any other face is removed and the face kept. */
export function migrateLegacyFace(source: Record<string, unknown>, issues: string[]): void {
  if (source.trunk !== 'trunk') return;
  const head = typeof source.head === 'string' && LEGACY_FACES.includes(source.head) ? source.head : 'muzzle';
  if (head === 'muzzle') {
    source.head = 'proboscis';
    issues.push('Trunk: now a face type; this muzzle became Face = Proboscis.');
  } else {
    source.trunk = 'none';
    issues.push(`Trunk: removed. A trunk is a nose and only grows on a mammal muzzle; this ${head} face is kept. Choose Face -> Proboscis for a trunk.`);
  }
}

/** The anatomy the species key hashes: a proboscis face projects to the legacy muzzle (+ derived trunk),
 * so migrated muzzle+trunk links keep their species key and herds. */
export function composerAnatomyProjection<T extends {head: string}>(recipe: T): T {
  return recipe.head === 'proboscis' ? {...recipe, head: 'muzzle'} : recipe;
}
