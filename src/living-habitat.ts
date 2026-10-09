/** Confirm nearby runtime populations; never invent or move organisms. */
import {Vector3} from 'three';
import type {Body, V3} from './catalog.ts';
import {surfaceCellsWithin} from './surface-cell.ts';
import {faunaHerdAt, toSeconds, type FaunaBiosphereGate} from './fauna-runtime.ts';
import {prepareFlora, type FloraBiosphereGate, type FloraBiomeSample} from './flora-field.ts';
import {landingHeightAllowed} from './landing-site.ts';
export type LivingSurface = {groundHeightM: number; walkable?: boolean; wet?: boolean; ocean?: boolean};
type HabitatBiome = Omit<FloraBiomeSample, 'weights'> & {weights: readonly number[]};
export type LivingHabitatInput = {
  body: Body; candidates: readonly {direction: V3; score: number}[];
  /** Truth sampler and current dated sea, matching PlanetRenderer. */
  sample: (direction: V3) => LivingSurface;
  classify: (direction: V3, heightM: number, upDot: number) => HabitatBiome;
  faunaGate: FaunaBiosphereGate; floraGate: FloraBiosphereGate;
  seaLevelM: number; ceilingM: number; summitM: number;
  maxCandidates?: number; maxCells?: number;
};
export type LivingHabitatSite = {
  direction: V3; heightM: number; slopeDeg: number; herdId: string;
  animalCount: number; floraCount: number; shrubCount: number;
  checkedCandidates: number; checkedFaunaCells: number; checkedCells: number;
};
/** Same tangent basis and +/-4 m gradient as runtime fauna/shrub cells.
 * Call with stepM=1 for its fine 2 m flora cells. */
export function livingHabitatAt(direction: V3, radiusM: number, sample: LivingHabitatInput['sample'],
  classify: LivingHabitatInput['classify'], stepM = 4) {
  const up = new Vector3(...direction), ref = Math.abs(up.y) > .92 ? new Vector3(1,0,0) : new Vector3(0,1,0);
  const right = new Vector3().crossVectors(ref,up).normalize(), forward = new Vector3().crossVectors(up,right).normalize();
  const offset = (basis: Vector3, metres: number) => sample(up.clone().addScaledVector(basis,metres/radiusM).normalize().toArray() as V3).groundHeightM;
  const surface = sample(direction), gx = (offset(right,stepM)-offset(right,-stepM))/(2*stepM),
    gz = (offset(forward,stepM)-offset(forward,-stepM))/(2*stepM);
  const raw = classify(direction,surface.groundHeightM,1/Math.sqrt(1+gx*gx+gz*gz));
  const biome: FloraBiomeSample = {...raw, weights: raw.weights as readonly [number,number,number,number]};
  return {surface, biome};
}
/** Probe only a small shortlist, at most maxCells canonical fauna cells per
 * candidate. Return a real herd anchor with nearby runtime plants. No fallback
 * to an unchecked coarse point. Inputs, world fields and population seeds stay
 * unchanged. A null result means this bounded search found no confirmed patch. */
export function findLivingHabitat(input: LivingHabitatInput): LivingHabitatSite | null {
  const {body, sample, classify, faunaGate, floraGate, seaLevelM, ceilingM, summitM,
    maxCandidates = 12, maxCells = 200} = input;
  if (!Number.isFinite(body.radiusM) || body.radiusM <= 0 ||
    !Number.isInteger(maxCandidates) || maxCandidates < 1 || maxCandidates > 32 ||
    !Number.isInteger(maxCells) || maxCells < 1 || maxCells > 200) throw new Error('Invalid living habitat bounds');
  if (faunaGate.stage !== 'complex' || !faunaGate.species?.length || floraGate.stage !== 'complex' ||
    !floraGate.availableKinds?.some(kind => kind !== 'tree')) return null;
  const ranked = input.candidates.map((candidate,index) => ({...candidate,index}))
    .sort((a,b) => b.score-a.score || a.index-b.index).slice(0,maxCandidates);
  let checkedCandidates = 0, checkedFaunaCells = 0, checkedCells = 0;
  const dry = (s: LivingSurface) => s.walkable !== false && !s.wet && !s.ocean &&
    Number.isFinite(s.groundHeightM) && landingHeightAllowed(s.groundHeightM,seaLevelM,ceilingM,summitM);
  for (const candidate of ranked) {
    checkedCandidates++;
    let spent = 0;
    const cells = surfaceCellsWithin(candidate.direction,body.radiusM,96,32).slice(0,maxCells);
    for (const cell of cells) {
      if (spent >= maxCells) break;
      spent++; checkedCells++; checkedFaunaCells++;
      const habitat = livingHabitatAt(cell.direction,body.radiusM,sample,classify);
      if (!dry(habitat.surface)) continue;
      const herd = faunaHerdAt(body.seed,body.id,cell.direction,habitat.biome,faunaGate,toSeconds(0),cell.id);
      if (!herd.present || !herd.members.length) continue;
      let floraCount = 0, shrubCount = 0;
      for (const plantCell of surfaceCellsWithin(cell.direction,body.radiusM,48,24).slice(0,maxCells)) {
        if (spent >= maxCells) break;
        spent++; checkedCells++;
        const local = livingHabitatAt(plantCell.direction,body.radiusM,sample,classify);
        if (!dry(local.surface)) continue;
        const recipe = prepareFlora(body.seed,body.id,plantCell.direction,local.biome,floraGate);
        if (recipe.present && recipe.kind !== 'tree') {floraCount++; if (recipe.kind === 'shrub') {shrubCount++; break;}}
      }
      // Shrubs have the 120 m range needed for an 80 m observation hover;
      // fine grass/flowers alone would still be invisible at that altitude.
      if (!shrubCount) continue;
      return {direction: cell.direction, heightM: habitat.surface.groundHeightM, slopeDeg: habitat.biome.slopeDeg,
        herdId: cell.id, animalCount: herd.members.length, floraCount, shrubCount, checkedCandidates, checkedFaunaCells, checkedCells};
    }
  }
  return null;
}
