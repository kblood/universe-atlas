import { MORPHOLOGY_FAMILIES, type FaunaMorphologyFamily } from './fauna-appearance.ts';
/** Portable specimen identity and inspection state. Camera gestures are deliberately
 * excluded: shared links open the same named frame, measured in metres. */
export type LabMode = 'gallery' | 'anatomy' | 'arena' | 'ancestry' | 'skin';
export type SkinPose = 'dated' | 'idle' | 'walk' | 'feed';
export interface CreatureLabState {
  seed: string; profile: 'temperate' | 'arid' | 'cold' | 'airless'; species: string;
  mode: LabMode; variant: number; growth: 'adult' | 'juvenile';
  frame: 'body' | 'head'; family: 'inherited' | FaunaMorphologyFamily; view: 'three-quarter' | 'side' | 'front'; pose: SkinPose; time: number; date: number;
  compare: boolean; compareVariant: number; compareGrowth: 'adult' | 'juvenile';
  neutral: boolean; skeleton: boolean;
}
export const DEFAULT_LAB_STATE: Readonly<CreatureLabState> = Object.freeze({
  seed: 'LETHRA-BIOSPHERE-01', profile: 'temperate', species: '', mode: 'gallery',
  variant: 0, growth: 'adult', frame: 'body', family: 'inherited', view: 'three-quarter', pose: 'dated', time: 0, date: 0,
  compare: false, compareVariant: 1, compareGrowth: 'adult', neutral: false, skeleton: false,
});
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
    mode: choice('mode', ['gallery', 'anatomy', 'arena', 'ancestry', 'skin'], 'gallery'),
    variant: number('variant', 0, 0, 3, true), growth: choice('growth', ['adult', 'juvenile'], 'adult'),
    frame: choice('frame', ['body', 'head'], 'body'),
    family: choice('family', ['inherited', ...MORPHOLOGY_FAMILIES], 'inherited'),
    view: choice('view', ['three-quarter', 'side', 'front'], 'three-quarter'),
    pose: choice('pose', ['dated', 'idle', 'walk', 'feed'], 'dated'),
    time: number('time', 0, 0, 120), date: number('date', 0, -20000, 20000),
    compare: q.get('compare') === '1', compareVariant: number('compareVariant', 1, 0, 3, true),
    compareGrowth: choice('compareGrowth', ['adult', 'juvenile'], 'adult'),
    neutral: q.get('neutral') === '1', skeleton: q.get('skeleton') === '1',
  };
}
export function creatureLabUrl(base: string, state: CreatureLabState): string {
  const url = new URL(base); url.search = ''; url.hash = '';
  for (const [key, value] of Object.entries(state)) url.searchParams.set(key, typeof value === 'boolean' ? (value ? '1' : '0') : String(value));
  return url.href;
}
