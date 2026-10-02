import {FAUNA_TEMPLATE_CONTROLS, type FaunaTemplateControl, type FaunaTemplateValues} from './fauna-template.ts';

/** An authored deer shape recipe, not a new anatomical family or a biological
 * population model. Change the version when changing coefficients or hashing. */
export const DEER_INDIVIDUAL_RECIPE = 'deer-individual-1';
export type TemplateRecipe = 'manual' | typeof DEER_INDIVIDUAL_RECIPE;
export interface TemplateIndividualIdentity {
  seed: string; profile: string; species: string; variant: number; growth: 'adult' | 'juvenile';
}

export function templateMorphLocks(value: string): FaunaTemplateControl[] {
  const requested = new Set(value.split(','));
  return FAUNA_TEMPLATE_CONTROLS.filter(id => requested.has(id));
}

// Independent named channels keep a later cosmetic channel from reshuffling anatomy.
function signed(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d); h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b); h ^= h >>> 16;
  return (h >>> 0) / 4294967295 * 2 - 1;
}

export function deerIndividualMorphs(identity: TemplateIndividualIdentity): Required<FaunaTemplateValues> {
  if (!Number.isInteger(identity.variant) || identity.variant < 0 || identity.variant > 3) throw new Error('Deer individual must be specimen 0..3');
  if (!['adult', 'juvenile'].includes(identity.growth)) throw new Error('Unknown deer growth stage');
  const speciesKey = JSON.stringify([DEER_INDIVIDUAL_RECIPE, identity.seed, identity.profile, identity.species]);
  const individualKey = JSON.stringify([speciesKey, identity.variant]);
  const latent = (channel: string) => .6 * signed(`${speciesKey}/${channel}`) + .4 * signed(`${individualKey}/${channel}`);
  const stock = latent('stock'), length = latent('length'), head = latent('head');
  const round = (v: number) => Math.round(v * 100) / 100;
  return {
    bodyCondition: round(.38 * stock - .1 * length + .16 * signed(`${individualKey}/condition`)),
    neckLength: round(.40 * length - .10 * stock + .10 * head),
    legLength: round(.42 * length - .16 * stock),
    muzzleLength: round(.24 * head + .12 * length),
    earSize: round(.28 * head + .12 * signed(`${individualKey}/ears`)),
    // The GLB juvenile target already changes head/body/limb proportions and joints.
    // Keep adult identity offsets; do not repeat growth scaling on those controls.
    juvenile: identity.growth === 'juvenile' ? 1 : 0,
  };
}

/** Locked numeric values survive every recipe application, including reseeding
 * and growth changes. A manually locked juvenile control therefore wins over stage. */
export function applyDeerIndividualRecipe(identity: TemplateIndividualIdentity, current: FaunaTemplateValues, locks: readonly FaunaTemplateControl[]): Required<FaunaTemplateValues> {
  const result = deerIndividualMorphs(identity);
  for (const id of locks) {
    const value = current[id] ?? 0;
    if (!Number.isFinite(value)) throw new Error(`Invalid locked trait ${id}`);
    result[id] = Math.max(id === 'juvenile' ? 0 : -1, Math.min(1, value));
  }
  return result;
}
