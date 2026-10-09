import {test} from 'node:test';
import assert from 'node:assert/strict';
import {findAnimalWorlds, ANIMAL_WORLD_MAX_SYSTEMS, ANIMAL_WORLD_MAX_RESULTS} from '../src/animal-world-finder.ts';
import {galaxies, refByAddress, system, sector} from '../src/catalog.ts';
import {parseAddress} from '../src/address.ts';
import {starLifecycle, planetLifecycle, planetStateAt} from '../src/stellar-evolution.ts';
import {biosphereStateAt, planetEnvironmentAt} from '../src/world-surface.ts';
import {CURRENT_VERSIONS} from '../src/time-nav.ts';
import {CATALOGUE_EPOCH_NS, UNIVERSE_END_NS} from '../src/world-time.ts';
import {forestBodyEligible} from '../src/surface-biomes.ts';

const seed = 'LETHRA-001', galaxy = galaxies(seed)[0];
const reference = refByAddress(galaxy, 'G001/C2128,0,1/0');
const options = {seed, galaxy, refs: [reference], dateNs: CATALOGUE_EPOCH_NS, versions: CURRENT_VERSIONS};
const refs = [...new Map([reference, ...sector(galaxy, [266,0,0], 8).refs].map(ref => [ref.id, ref])).values()];

test('finds real animal-bearing planets at the exact catalogue date with resolvable IDs and counts', () => {
  const result = findAnimalWorlds(options);
  assert.ok(result.worlds.some(world => world.id === 'G001/C2128,0,1/0/planet/1'));
  assert.equal(result.dateNs, CATALOGUE_EPOCH_NS.toString());
  assert.equal(result.galaxyId, galaxy.id);
  assert.equal(result.scannedSystems, 1);
  assert.ok(result.worlds.length > 0 && result.worlds.length <= 5);
  for (const world of result.worlds) {
    const ref = refByAddress(galaxy, world.systemId), sys = system(ref), body = sys.planets.find(body => body.id === world.id);
    assert.ok(body && body.kind === 'planet' && body.type !== 'Gas giant');
    assert.equal(body.name, world.name); assert.equal(sys.name, world.systemName);
    const address = parseAddress(ref.id), star = starLifecycle(seed, {...address, slot: 'star/0'}, sys.stars[0]);
    const planet = planetLifecycle(seed, {...address, slot: body.id.split(ref.id + '/')[1]}, body, star);
    assert.equal(planetStateAt(planet, star, options.dateNs).stage, 'solid');
    assert.equal(planetEnvironmentAt(body, planet, star, options.dateNs).biosphereSuitable, true);
    const dated = biosphereStateAt(seed, body.id, body, options.dateNs, 'baseline', CURRENT_VERSIONS, star);
    assert.equal(world.stage, 'complex'); assert.equal(dated.stage, 'complex');
    assert.equal(world.animalSpeciesCount, dated.species.filter(species => species.kind === 'animal' && species.creature).length);
    assert.equal(world.plantSpeciesCount, dated.species.filter(species => species.kind !== 'animal').length);
    assert.equal(world.forestPossible, forestBodyEligible(body)&&dated.species.some(species=>species.kind==='tree'));
    assert.ok(world.animalSpeciesCount > 0);
    assert.ok(!sys.moons.some(moon => moon.id === world.id));
  }
});

test('cold Daunune offers open vegetation while temperate Maithea can offer forest habitat',()=>{
  const coldRef=refByAddress(galaxy,'G001/C2456,274,-369/0');
  const cold=findAnimalWorlds({...options,refs:[coldRef]}).worlds.find(world=>world.id===coldRef.id+'/planet/1');
  assert.ok(cold&&cold.animalSpeciesCount>0&&cold.plantSpeciesCount>0);
  assert.equal(cold.forestPossible,false);
  const temperate=findAnimalWorlds(options).worlds.find(world=>world.id==='G001/C2128,0,1/0/planet/1');
  assert.equal(temperate.forestPossible,true);
});

test('unformed and terminal future dates return no animals without changing the requested date', () => {
  for (const dateNs of [0n, UNIVERSE_END_NS]) {
    const result = findAnimalWorlds({...options, dateNs});
    assert.deepEqual(result.worlds, []);
    assert.equal(result.dateNs, dateNs.toString());
    assert.equal(result.scannedSystems, 1); assert.equal(result.exhausted, true);
    assert.equal(result.limitedBy, 'exhausted');
  }
});

test('deterministic bounded batches, result caps and exhausted supplied refs', () => {
  assert.equal(ANIMAL_WORLD_MAX_SYSTEMS, 512); assert.equal(ANIMAL_WORLD_MAX_RESULTS, 5);
  assert.deepEqual(findAnimalWorlds({...options, refs}), findAnimalWorlds({...options, refs}));
  const batch = findAnimalWorlds({...options, refs, maxSystems: 1, dateNs: 0n});
  assert.equal(batch.scannedSystems, 1); assert.equal(batch.nextIndex, 1);
  assert.equal(batch.exhausted, false); assert.equal(batch.limitedBy, 'systems');
  const next = findAnimalWorlds({...options, refs, maxSystems: 1, startIndex: batch.nextIndex, dateNs: 0n});
  assert.equal(next.nextIndex, 2); assert.equal(next.scannedSystems, 1);
  const capped = findAnimalWorlds({...options, refs, maxResults: 1});
  assert.equal(capped.worlds.length, 1); assert.equal(capped.scannedSystems, 1);
  assert.equal(capped.limitedBy, 'results'); assert.equal(capped.exhausted, false);
  const end = findAnimalWorlds({...options, refs, startIndex: refs.length});
  assert.deepEqual(end.worlds, []); assert.equal(end.scannedSystems, 0);
  assert.equal(end.exhausted, true); assert.equal(end.limitedBy, 'exhausted');
  assert.deepEqual(findAnimalWorlds({...options, refs: []}).worlds, []);
});

test('input seed, galaxy, refs and model versions remain unchanged', () => {
  const request = structuredClone(options), original = structuredClone(request);
  Object.freeze(request.versions); Object.freeze(request.galaxy); Object.freeze(request.refs[0]); Object.freeze(request.refs);
  findAnimalWorlds(request);
  assert.deepEqual(request, original);
});

test('invalid params and foreign, duplicated or forged refs fail explicitly', () => {
  for (const overrides of [{seed: ''}, {seed: 'OTHER'}, {dateNs: -1n}, {dateNs: UNIVERSE_END_NS + 1n},
    {dateNs: Number(CATALOGUE_EPOCH_NS)}, {maxSystems: 0}, {maxSystems: 513}, {maxSystems: 1.5},
    {maxResults: 0}, {maxResults: 6}, {startIndex: -1}, {startIndex: 2}, {versions: {}}, {refs: null},
    {galaxy: {...galaxy, seed: 'bad json'}}, {galaxy: {...galaxy, rotation: null}},
    {galaxy: {...galaxy, radiusLy: NaN}}, {galaxy: {...galaxy, type: 'Unknown'}}, {refs: [reference, reference]},
    {refs: [{...reference, galaxyId: 'G002'}]}, {refs: [{...reference, seed: 'FORGED'}]},
    {refs: [{...reference, ordinal: 999999}]}, {refs: [{...reference, id: 'G001/C2128,0,1/999999'}]}]) {
    assert.throws(() => findAnimalWorlds({...options, ...overrides}), /Invalid|different seed|duplicate/);
  }
});
