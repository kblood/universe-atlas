/** Bounded, deterministic inspector for the same flora candidates Atlas draws. */
import {AU, refByAddress, system, type V3} from './catalog.ts';
import {parseAddress, formatAddress, resolveGalaxy, type BodyAddress} from './address.ts';
import {starLifecycle, planetLifecycle} from './stellar-evolution.ts';
import {planetSnapshotAt, planetAgeMyr} from './world-surface.ts';
import {CATALOGUE_EPOCH_NS, UNIVERSE_END_NS, parseDate} from './world-time.ts';
import {CURRENT_VERSIONS, resolveTimeFromUrl, writeTimeToUrl} from './time-nav.ts';
import {biomeClassifier} from './surface-biomes.ts';
import {terrainSampler} from './terrain.ts';
import {floraAt, toMyr, type FloraBiomeSample} from './flora-field.ts';
import {floraKindsFromSpecies, toLifeStage} from './flora-life-gate.ts';
import {livingHabitatAt} from './living-habitat.ts';
import {surfaceCellAt, surfaceCellsWithin} from './surface-cell.ts';
import {floraGeometrySeed} from './flora-geometry-seed.ts';
export {floraGeometrySeed};

export type FloraReplay = {seed: string; body: string; dateNs: string; direction: V3; cellSizeM: 2 | 24};
export const DEFAULT_FLORA_REPLAY: FloraReplay = {
  seed: 'LETHRA-001', body: 'G001/C2456,274,-369/0/planet/1',
  dateNs: CATALOGUE_EPOCH_NS.toString(), direction: [-0.5950324922873922, -0.7724998919122458, 0.22191145248521035], cellSizeM: 24,
};
export function validateFloraReplay(value: unknown): FloraReplay {
  if (!value || typeof value !== 'object') throw new Error('Expected a flora replay object');
  const v = value as FloraReplay;
  if (typeof v.seed !== 'string' || !v.seed.trim() || v.seed.length > 80) throw new Error('Universe seed must contain 1–80 characters');
  const a = typeof v.body === 'string' ? parseAddress(v.body) : null;
  if (!a || !('slot' in a) || typeof a.slot !== 'string' || !/^planet\/\d+(?:\/moon\/\d+)?$/.test(a.slot)) throw new Error('Use a full planet or moon body address');
  if (typeof v.dateNs !== 'string' || !/^\d{1,120}$/.test(v.dateNs)) throw new Error('Date must be an exact non-negative nanosecond string');
  const t = parseDate(v.dateNs);
  if (t < 0n || t > UNIVERSE_END_NS) throw new Error('Date must be inside the navigable universe');
  if (!Array.isArray(v.direction) || v.direction.length !== 3 || !v.direction.every(Number.isFinite)) throw new Error('Direction must have three finite components');
  const length = Math.hypot(...v.direction);
  if (!(length > 0) || !Number.isFinite(length)) throw new Error('Surface direction cannot be zero');
  if (v.cellSizeM !== 2 && v.cellSizeM !== 24) throw new Error('Candidate spacing must be 2 or 24 metres');
  // Preserve already-unit directions on every round trip (including lattice centres).
  const direction = Math.abs(length - 1) < 1e-14 ? [...v.direction] as V3 : v.direction.map(x => x / length) as V3;
  return {seed: v.seed, body: formatAddress(a), dateNs: t.toString(), direction, cellSizeM: v.cellSizeM};
}
/** Accept an exported lab URL or an ordinary Atlas bookmark, including walk position. */
export function floraReplayFromUrl(url: string): FloraReplay {
  const q = new URL(url, 'https://atlas.invalid/').searchParams;
  const raw = q.get('direction') ?? q.get('walk');
  return validateFloraReplay({seed: q.get('seed') ?? DEFAULT_FLORA_REPLAY.seed,
    body: q.get('body') ?? DEFAULT_FLORA_REPLAY.body,
    dateNs: resolveTimeFromUrl(q).toString(),
    direction: raw ? raw.split(',').map(Number) : DEFAULT_FLORA_REPLAY.direction,
    cellSizeM: Number(q.get('cellSize') ?? DEFAULT_FLORA_REPLAY.cellSizeM)});
}
export function floraReplayUrl(value: FloraReplay, path = './surface-flora-lab.html'): string {
  const replay = validateFloraReplay(value);
  const q = new URLSearchParams({mode: 'atlas', seed: replay.seed, body: replay.body,
    direction: replay.direction.join(','), cellSize: String(replay.cellSizeM)});
  writeTimeToUrl(q, parseDate(replay.dateNs));
  const address = parseAddress(replay.body) as BodyAddress;
  const {slot: _slot, ...sysAddress} = address;
  q.set('system', formatAddress(sysAddress));
  q.set('g', formatAddress({clusterCell: address.clusterCell, groupCell: address.groupCell, galaxyOrdinal: address.galaxyOrdinal}));
  return path + '?' + q;
}
export function createFloraReplay(value: FloraReplay) {
  const replay = validateFloraReplay(value), address = parseAddress(replay.body) as BodyAddress;
  const galaxy = resolveGalaxy(replay.seed, address);
  if (!galaxy) throw new Error('Galaxy address does not exist for this universe seed');
  const {slot: _slot, ...sysAddress} = address;
  const ref = refByAddress(galaxy, formatAddress(sysAddress));
  if (!ref) throw new Error('System address does not exist for this universe seed');
  const sys = system(ref), body = [...sys.planets, ...sys.moons].find(b => b.id === replay.body);
  if (!body) throw new Error('Body address does not exist in this system');
  if (body.type === 'Gas giant') throw new Error('Gas giants have no solid flora field');
  const star = starLifecycle(replay.seed, {...sysAddress, slot: 'star/0'}, sys.stars[0]);
  const parent = body.kind === 'moon' ? sys.planets.find(b => b.id === body.parentId) : undefined;
  const parentContext = parent ? {starOrbitAu: parent.orbit ? parent.orbit.a / AU : 0,
    lifecycle: planetLifecycle(replay.seed, {...sysAddress, slot: parent.id.slice(ref.id.length + 1)}, parent, star)} : undefined;
  const planet = planetLifecycle(replay.seed, address, body, star, parentContext), t = parseDate(replay.dateNs);
  const snapshot = planetSnapshotAt(replay.seed, body.id, body, planet, star, t, CURRENT_VERSIONS, parent);
  const bio = snapshot.biosphere(), ageMyr = planetAgeMyr(planet, t);
  const gate = {stage: toLifeStage(bio.stage), availableKinds: floraKindsFromSpecies(bio.species)};
  // Renderer life habitat follows its 25 m sea bucket, not the unsnapped inspector sea.
  const waterLevelM = Math.round(snapshot.ocean.renderWaterLevelM / 25) * 25;
  const sample = terrainSampler(body, undefined, undefined, undefined, waterLevelM);
  const classify = biomeClassifier(body, waterLevelM);
  const surfaceAvailable = snapshot.state.stage === 'solid' || snapshot.state.stage === 'molten';
  const inspect = (direction: V3) => {
    const cell = surfaceCellAt(direction, body.radiusM, replay.cellSizeM);
    if (!surfaceAvailable) return {cell, biome: null, heightM: null, instance: {present: false} as ReturnType<typeof floraAt>};
    const local = livingHabitatAt(cell.direction, body.radiusM, sample, classify, replay.cellSizeM === 2 ? 1 : 4);
    // drawFlora prepares from Float32 habitat lanes and Float64 canonical directions.
    const packed: FloraBiomeSample = {...local.biome,
      weights: local.biome.weights.map(Math.fround) as [number, number, number, number],
      moisture: Math.fround(local.biome.moisture), slopeDeg: Math.fround(local.biome.slopeDeg)};
    const instance = floraAt(body.seed, body.id, cell.direction, packed, gate, toMyr(ageMyr));
    return {cell, biome: {...classify(cell.direction, local.surface.groundHeightM,
      Math.cos(local.biome.slopeDeg * Math.PI / 180)), ...local.biome}, heightM: local.surface.groundHeightM, instance};
  };
  // A local patch; sample fewer than 80 real cells instead of blocking on a planet-wide terrain scan.
  const candidates = surfaceCellsWithin(replay.direction, body.radiusM, replay.cellSizeM * 4, replay.cellSizeM).slice(0, 80);
  return {replay, body, snapshot, ageMyr, bio, gate, waterLevelM, inspect, candidates};
}
