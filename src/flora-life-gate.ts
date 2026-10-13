/** Shared conversion from the dated biosphere to Atlas' flora-field gate. */
import type {Species} from './biosphere-model.ts';
import type {BiosphereQueryStage} from './world-surface.ts';
import type {FloraKind, FloraStage} from './flora-field.ts';

export function toLifeStage(stage: BiosphereQueryStage): FloraStage {
  switch (stage) {
    case 'forming': case 'sterile': case 'microbial': case 'complex': return stage;
    default: return 'unformed';
  }
}

/** Flowers are ambient ground cover; an explicit empty list means no plants. */
export function floraKindsFromSpecies(species: readonly Species[]): readonly FloraKind[] {
  const kinds = new Set<FloraKind>();
  for (const s of species) if (s.kind === 'tree' || s.kind === 'shrub' || s.kind === 'grass') kinds.add(s.kind);
  if (kinds.size > 0) kinds.add('flower');
  return [...kinds];
}
