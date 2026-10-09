/** Bounded catalogue search, ordered by supplied galaxy refs then planet order.
 * Uses dated biosphere gates only: no terrain, landing, census or renderer scan.
 * Counts describe living species histories, not a guaranteed animal at a landing.
 */
import {refByAddress, system, type Galaxy, type SystemRef} from './catalog.ts';
import {parseAddress, type SystemAddress, type WorldVersions} from './address.ts';
import {starLifecycle, starStateAt} from './stellar-evolution.ts';
import {biosphereStateAt} from './world-surface.ts';
import {UNIVERSE_END_NS} from './world-time.ts';
import {forestBodyEligible} from './surface-biomes.ts';

export const ANIMAL_WORLD_MAX_SYSTEMS = 512;
export const ANIMAL_WORLD_MAX_RESULTS = 5;
export type AnimalWorld = {
  id: string; name: string; systemId: string; systemName: string;
  animalSpeciesCount: number; plantSpeciesCount: number; forestPossible:boolean; stage: 'complex';
};
export type AnimalWorldSearchOptions = {
  seed: string; galaxy: Galaxy; refs: readonly SystemRef[]; dateNs: bigint;
  versions: WorldVersions; maxSystems?: number; maxResults?: number; startIndex?: number;
};
export type AnimalWorldSearchResult = {
  galaxyId: string; dateNs: string; worlds: AnimalWorld[];
  scannedSystems: number; totalSystems: number; nextIndex: number;
  /** Every provided system was visited without stopping at the result cap.
   * This never means the entire procedural galaxy was searched. */
  exhausted: boolean; limitedBy: 'results' | 'systems' | 'exhausted';
};
function integer(value: number, min: number, max: number, name: string) {
  if (!Number.isSafeInteger(value) || value < min || value > max) throw new Error(`Invalid ${name}`);
}
const vector = (value: unknown) => Array.isArray(value) && value.length === 3 && value.every(Number.isFinite);
const versionKeys: (keyof WorldVersions)[] = ['time','space','cosmology','catalog','history','surface','terrain','biosphere','galaxyHistory'];
/** Pure result at the exact seed/date. Pagination is by system index; a
 * system reaching the result cap is consumed, so this is a finder rather
 * than a complete planet enumeration API. No inputs or model values mutate. */
export function findAnimalWorlds(options: AnimalWorldSearchOptions): AnimalWorldSearchResult {
  if (!options || typeof options !== 'object') throw new Error('Invalid animal-world search options');
  const {seed, galaxy, refs, dateNs, versions, maxSystems = ANIMAL_WORLD_MAX_SYSTEMS,
    maxResults = ANIMAL_WORLD_MAX_RESULTS, startIndex = 0} = options;
  if (typeof seed !== 'string' || !seed.length || !galaxy || typeof galaxy.id !== 'string' ||
    !/^G\d+$/.test(galaxy.id) || typeof galaxy.seed !== 'string' ||
    !Number.isFinite(galaxy.radiusLy) || galaxy.radiusLy <= 0 || !vector(galaxy.position) || !vector(galaxy.rotation) ||
    !['Spiral','Barred spiral','Elliptical','Irregular'].includes(galaxy.type) ||
    !Number.isSafeInteger(galaxy.arms) || galaxy.arms < 1 ||
    ![galaxy.phase, galaxy.pitch, galaxy.tint].every(Number.isFinite)) throw new Error('Invalid seed or galaxy');
  let galaxyKey;
  try {galaxyKey = JSON.parse(galaxy.seed);} catch {throw new Error('Invalid galaxy seed');}
  if (!Array.isArray(galaxyKey) || galaxyKey[0] !== seed) throw new Error('Galaxy belongs to a different seed');
  if (typeof dateNs !== 'bigint' || dateNs < 0n || dateNs > UNIVERSE_END_NS) throw new Error('Invalid dateNs');
  if (!versions || versionKeys.some(key => typeof versions[key] !== 'string' || !versions[key])) throw new Error('Invalid versions');
  if (!Array.isArray(refs)) throw new Error('Invalid galaxy refs');
  integer(maxSystems, 1, ANIMAL_WORLD_MAX_SYSTEMS, 'maxSystems');
  integer(maxResults, 1, ANIMAL_WORLD_MAX_RESULTS, 'maxResults');
  integer(startIndex, 0, refs.length, 'startIndex');
  const seen = new Set<string>();
  for (const ref of refs) {
    if (!ref || typeof ref.id !== 'string' || ref.galaxyId !== galaxy.id ||
      !ref.id.startsWith(galaxy.id + '/') || seen.has(ref.id)) throw new Error('Invalid or duplicate galaxy ref');
    seen.add(ref.id);
  }
  const worlds: AnimalWorld[] = [];
  let nextIndex = startIndex, scannedSystems = 0, hitResults = false;
  while (nextIndex < refs.length && scannedSystems < maxSystems && !hitResults) {
    const supplied = refs[nextIndex], canonical = refByAddress(galaxy, supplied.id);
    if (!canonical || supplied.seed !== canonical.seed || supplied.ordinal !== canonical.ordinal ||
      !Array.isArray(supplied.cell) || supplied.cell.length !== 3 ||
      supplied.cell.some((value: number, i: number) => value !== canonical.cell[i])) throw new Error(`Invalid catalogue ref: ${supplied.id}`);
    nextIndex++; scannedSystems++;
    const address = parseAddress(canonical.id) as SystemAddress, sys = system(canonical);
    const star = starLifecycle(seed, {...address, slot: 'star/0'}, sys.stars[0]);
    if (starStateAt(star, dateNs).stage !== 'main-sequence') continue;
    for (const body of sys.planets) {
      if (body.kind !== 'planet' || body.type === 'Gas giant' || !(body.water > 0)) continue;
      const life = biosphereStateAt(seed, body.id, body, dateNs, 'baseline', versions, star);
      if (life.stage !== 'complex' || !life.surfaceAvailable) continue;
      let animalSpeciesCount = 0, plantSpeciesCount = 0;
      for (const species of life.species) {
        if (species.kind === 'animal' && species.creature) animalSpeciesCount++;
        else if (species.kind !== 'animal') plantSpeciesCount++;
      }
      if (!animalSpeciesCount) continue;
      worlds.push({id: body.id, name: body.name, systemId: canonical.id, systemName: sys.name,
        animalSpeciesCount, plantSpeciesCount,
        forestPossible:forestBodyEligible(body)&&life.species.some(s=>s.kind==='tree'),stage: 'complex'});
      if (worlds.length >= maxResults) {hitResults = true; break;}
    }
  }
  const exhausted = !hitResults && nextIndex >= refs.length;
  return {galaxyId: galaxy.id, dateNs: dateNs.toString(), worlds, scannedSystems,
    totalSystems: refs.length, nextIndex, exhausted,
    limitedBy: hitResults ? 'results' : exhausted ? 'exhausted' : 'systems'};
}
