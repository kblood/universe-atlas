import { MORPHOLOGY_FAMILIES, type FaunaMorphologyFamily } from './fauna-appearance.ts';
import {DEER_INDIVIDUAL_RECIPE, templateMorphLocks, type TemplateRecipe} from './fauna-template-phenotype.ts';
import {COMPOSER_RECIPE_MAX_TEXT} from './fauna-composer-recipe.ts';
import {FAUNA_REVIEW_PRESET_IDS, type FaunaReviewPresetId} from './fauna-review-environment.ts';
/** Portable specimen identity and inspection state. Camera gestures are deliberately
 * excluded: shared links open the same named frame, measured in metres. */
export type LabMode = 'gallery' | 'anatomy' | 'arena' | 'ancestry' | 'skin' | 'composer';
export const COMPOSER_LAB_MOTIONS = ['neutral', 'idle', 'walk', 'display'] as const;
export type ComposerLabMotion = typeof COMPOSER_LAB_MOTIONS[number];
export type SkinPose = 'dated' | 'neutral' | 'idle' | 'walk' | 'feed';
/** Composer herd sizes: one animal, or a herd of individuals of the same species. */
export const COMPOSER_HERD_SIZES = [1, 6, 9, 12] as const;
export type ComposerHerdSize = typeof COMPOSER_HERD_SIZES[number];
/** Modes whose links carry the review lighting preset. */
const LIGHT_MODES: readonly LabMode[] = ['composer', 'skin'];
export interface CreatureLabState {
  seed: string; profile: 'temperate' | 'arid' | 'cold' | 'airless'; species: string;
  mode: LabMode; variant: number; growth: 'adult' | 'juvenile';
  frame: 'body' | 'head'; family: 'inherited' | FaunaMorphologyFamily; view: 'three-quarter' | 'side' | 'front'; pose: SkinPose; time: number; date: number;
  compare: boolean; compareVariant: number; compareGrowth: 'adult' | 'juvenile';
  neutral: boolean; skeleton: boolean; source: 'procedural' | 'blender-reference'; assetHash: string; sidecarHash: string; replayVersion: 1 | 2;
  templateRecipe: TemplateRecipe; morphLocks: string;
  bodyCondition: number; neckLength: number; legLength: number; muzzleLength: number; earSize: number; juvenile: number;
  /** Modular composer (mode 'composer' only): encoded recipes are decoded and validated by the Lab. */
  recipe: string; compareRecipe: string; composerSeed: string; motion: ComposerLabMotion;
  /** Composer herd size (composer only; comparison always shows one animal per recipe). */
  herd: ComposerHerdSize;
  /** Review lighting preset (composer and planet-skin modes). */
  light: FaunaReviewPresetId;
}
export const DEFAULT_LAB_STATE: Readonly<CreatureLabState> = Object.freeze({
  seed: 'LETHRA-BIOSPHERE-01', profile: 'temperate', species: '', mode: 'gallery',
  variant: 0, growth: 'adult', frame: 'body', family: 'inherited', view: 'three-quarter', pose: 'dated', time: 0, date: 0,
  compare: false, compareVariant: 1, compareGrowth: 'adult', neutral: false, skeleton: false, source: 'procedural', assetHash: '', sidecarHash: '', replayVersion: 1,
  templateRecipe: 'manual', morphLocks: '',
  bodyCondition: 0, neckLength: 0, legLength: 0, muzzleLength: 0, earSize: 0, juvenile: 0,
  recipe: '', compareRecipe: '', composerSeed: 'composer-1', motion: 'walk', herd: 1, light: 'studio',
});
/** Composer-only keys: never written by other modes; repeated values reject a composer link. */
const COMPOSER_KEYS = ['recipe', 'compareRecipe', 'composerSeed', 'motion', 'herd'] as const;
/** Keys a composer link writes; everything else keeps its default on replay. */
const COMPOSER_URL_KEYS = ['mode', ...COMPOSER_KEYS, 'compare', 'time', 'view', 'neutral', 'skeleton', 'light'] as const;
const isHerdSize = (value: string | null) => (COMPOSER_HERD_SIZES as readonly number[]).some(n => String(n) === value);
export function parseCreatureLabState(search: string | URLSearchParams): CreatureLabState {
  const q = typeof search === 'string' ? new URLSearchParams(search) : search;
  const choice = <T extends string>(key: string, values: readonly T[], fallback: T): T => {
    const value = q.get(key); return values.includes(value as T) ? value as T : fallback;
  };
  const number = (key: string, fallback: number, min: number, max: number, integer = false) => {
    const raw = q.get(key); if (!raw?.trim()) return fallback;
    const value = Number(raw); if (!Number.isFinite(value)) return fallback;
    const bounded = Math.max(min, Math.min(max, value)); return integer ? Math.floor(bounded) : bounded;
  };
  const clean = (key: string, fallback: string, length: number) =>
    q.get(key)?.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, length) || fallback;
  return {
    seed: clean('seed', DEFAULT_LAB_STATE.seed, 160),
    profile: choice('profile', ['temperate', 'arid', 'cold', 'airless'], 'temperate'),
    species: clean('species', '', 240),
    mode: choice('mode', ['gallery', 'anatomy', 'arena', 'ancestry', 'skin', 'composer'], 'gallery'),
    variant: number('variant', 0, 0, 3, true), growth: choice('growth', ['adult', 'juvenile'], 'adult'),
    frame: choice('frame', ['body', 'head'], 'body'),
    family: choice('family', ['inherited', ...MORPHOLOGY_FAMILIES], 'inherited'),
    view: choice('view', ['three-quarter', 'side', 'front'], 'three-quarter'),
    pose: choice('pose', ['dated', 'neutral', 'idle', 'walk', 'feed'], 'dated'),
    time: number('time', 0, 0, 120), date: number('date', 0, -20000, 20000),
    compare: q.get('compare') === '1', compareVariant: number('compareVariant', 1, 0, 3, true),
    compareGrowth: choice('compareGrowth', ['adult', 'juvenile'], 'adult'),
    neutral: q.get('neutral') === '1', skeleton: q.get('skeleton') === '1',
    source: choice('source', ['procedural', 'blender-reference'], 'procedural'),
    assetHash: /^[a-f0-9]{64}$/i.test(q.get('assetHash') || '') ? q.get('assetHash')!.toLowerCase() : '',
    sidecarHash: /^[a-f0-9]{64}$/i.test(q.get('sidecarHash') || '') ? q.get('sidecarHash')!.toLowerCase() : '',
    replayVersion: q.get('replayVersion') === '2' ? 2 : 1,
    templateRecipe: choice('templateRecipe', ['manual', DEER_INDIVIDUAL_RECIPE], 'manual'),
    morphLocks: templateMorphLocks((q.get('morphLocks') || '').slice(0, 512)).join(','),
    bodyCondition: number('bodyCondition', 0, -1, 1), neckLength: number('neckLength', 0, -1, 1),
    legLength: number('legLength', 0, -1, 1), muzzleLength: number('muzzleLength', 0, -1, 1),
    earSize: number('earSize', 0, -1, 1), juvenile: number('juvenile', 0, 0, 1),
    // One character over the limit is kept so the decoder can reject oversize text visibly instead of truncating it into another animal.
    recipe: (q.get('recipe') || '').slice(0, COMPOSER_RECIPE_MAX_TEXT + 1), compareRecipe: (q.get('compareRecipe') || '').slice(0, COMPOSER_RECIPE_MAX_TEXT + 1),
    composerSeed: clean('composerSeed', DEFAULT_LAB_STATE.composerSeed, 160),
    motion: choice('motion', COMPOSER_LAB_MOTIONS, 'walk'),
    herd: isHerdSize(q.get('herd')) ? Number(q.get('herd')) as ComposerHerdSize : 1,
    light: choice('light', FAUNA_REVIEW_PRESET_IDS, 'studio'),
  };
}
/** Visible notices for link values that were replaced by a default rather than rejected
 * (an unsupported herd size or lighting preset). Empty when the link is used as written. */
export function creatureLabInputNotices(search: string | URLSearchParams): string[] {
  const q = typeof search === 'string' ? new URLSearchParams(search) : search, out: string[] = [];
  if (q.get('mode') === 'composer' && q.has('herd') && !isHerdSize(q.get('herd')))
    out.push(`Herd size "${q.get('herd')!.slice(0, 12)}" is not available (choose 1, 6, 9 or 12); showing 1 animal.`);
  if (LIGHT_MODES.includes(q.get('mode') as LabMode) && q.has('light') && !(FAUNA_REVIEW_PRESET_IDS as readonly string[]).includes(q.get('light')!))
    out.push(`Lighting "${q.get('light')!.slice(0, 24)}" is not available; using Studio.`);
  return out;
}
/** A repeated lighting parameter is ambiguous and rejects composer and planet-skin links. */
export function creatureLabLightInputError(search: string | URLSearchParams): string | null {
  const q = typeof search === 'string' ? new URLSearchParams(search) : search;
  return LIGHT_MODES.includes(q.get('mode') as LabMode) && q.getAll('light').length > 1 ? 'Invalid link: repeated light' : null;
}
/** Composer links are rejected, not reinterpreted, when identity parameters repeat or the motion is unknown.
 * Recipe text errors (version, size) are reported by decodeComposerRecipe. */
export function creatureLabComposerInputError(search: string | URLSearchParams): string | null {
  const q = typeof search === 'string' ? new URLSearchParams(search) : search;
  if (q.get('mode') !== 'composer') return null;
  for (const key of [...COMPOSER_KEYS, 'light']) if (q.getAll(key).length > 1) return `Invalid composer link: repeated ${key}`;
  if (q.has('motion') && !(COMPOSER_LAB_MOTIONS as readonly string[]).includes(q.get('motion')!)) return `Invalid composer link: unknown motion "${q.get('motion')!.slice(0, 24)}"`;
  return null;
}
/** Parsing remains tolerant for legacy callers; the Lab must reject malformed
 * requested pins before loading, rather than silently downgrading integrity. */
export function creatureLabReplayInputError(search: string | URLSearchParams): string | null {
  const q = typeof search === 'string' ? new URLSearchParams(search) : search;
  for (const key of ['assetHash', 'sidecarHash', 'replayVersion']) if (q.getAll(key).length > 1) return `Invalid specimen revision: repeated ${key}`;
  if (q.has('replayVersion') && !['1', '2'].includes(q.get('replayVersion')!)) return 'Unsupported specimen replay version';
  for (const key of ['assetHash', 'sidecarHash']) if (q.get(key) && !/^[a-f0-9]{64}$/i.test(q.get(key)!)) return `Invalid specimen revision: ${key} must be a SHA-256 hash`;
  if ((q.get('replayVersion') === '2' || q.get('sidecarHash')) && q.get('source') === 'blender-reference' && (!q.get('assetHash') || !q.get('sidecarHash'))) return 'Invalid specimen revision: replay version 2 requires both GLB and sidecar hashes';
  return null;
}
export function creatureLabTemplateMismatch(expected: Pick<CreatureLabState, 'assetHash' | 'sidecarHash'>, actual: {sourceHash: string | null; sidecarHash: string | null}): string | null {
  if (expected.assetHash && expected.assetHash !== actual.sourceHash) return 'Reference version mismatch: this link names a different GLB revision.';
  if (expected.sidecarHash && expected.sidecarHash !== actual.sidecarHash) return 'Reference version mismatch: this link names different morph and joint data (sidecar revision).';
  return null;
}
export function creatureLabUrl(base: string, state: CreatureLabState): string {
  const url = new URL(base); url.search = ''; url.hash = '';
  const composer = state.mode === 'composer';
  for (const [key, value] of Object.entries(state)) {
    if (composer ? !(COMPOSER_URL_KEYS as readonly string[]).includes(key) : (COMPOSER_KEYS as readonly string[]).includes(key)) continue;
    if (key === 'compareRecipe' && !state.compare) continue;
    if (key === 'light' && !LIGHT_MODES.includes(state.mode)) continue;
    url.searchParams.set(key, typeof value === 'boolean' ? (value ? '1' : '0') : String(value));
  }
  return url.href;
}
