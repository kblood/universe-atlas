import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {createFloraReplay, DEFAULT_FLORA_REPLAY, floraReplayUrl, floraReplayFromUrl,
  validateFloraReplay, floraGeometrySeed} from '../src/surface-flora-replay.ts';
import {floraKindsFromSpecies, toLifeStage} from '../src/flora-life-gate.ts';
import {floraAt, toMyr, buildFloraGeometryData} from '../src/flora-field.ts';
import {terrainSampler} from '../src/terrain.ts';
import {biomeClassifier} from '../src/surface-biomes.ts';
import {hashSeedString} from '../src/ocean-gerstner.ts';
import {CATALOGUE_EPOCH_NS, dateYears, yearsToDate} from '../src/world-time.ts';

test('replay links retain canonical direction, spacing, seed, body and exact nanoseconds', () => {
  const input = {...DEFAULT_FLORA_REPLAY, dateNs: (CATALOGUE_EPOCH_NS + 123456789n).toString(), cellSizeM: 2};
  const expected = validateFloraReplay(input), link = floraReplayUrl(input);
  assert.deepEqual(floraReplayFromUrl(link), expected);
  assert.equal(yearsToDate(dateYears(BigInt(expected.dateNs))).toString(), expected.dateNs);
  assert.equal(new URL(link, 'https://example.invalid/').searchParams.get('system'), input.body.split('/planet/')[0]);
  assert.deepEqual(floraReplayFromUrl(floraReplayUrl(floraReplayFromUrl(link))), expected);
});
test('imports body-fixed walk vectors and applies the documented legacy Atlas date conversion', () => {
  const q = new URLSearchParams({seed: DEFAULT_FLORA_REPLAY.seed, body: DEFAULT_FLORA_REPLAY.body,
    walk: '2,0,0', date: '12'});
  const imported = floraReplayFromUrl('./?' + q);
  assert.deepEqual(imported.direction, [1,0,0]);
  assert.equal(imported.dateNs, (CATALOGUE_EPOCH_NS + 12n).toString());
});
test('invalid direction, date, spacing and non-body addresses fail before expensive resolution', () => {
  for (const patch of [{direction: [0,0,0]}, {direction: [NaN,0,1]}, {dateNs: ''},
    {dateNs: '-1'}, {dateNs: '1.2'}, {cellSizeM: 32}, {body: 'G001'}, {seed: ''}]) {
    assert.throws(() => validateFloraReplay({...DEFAULT_FLORA_REPLAY, ...patch}));
  }
  assert.throws(() => createFloraReplay({...DEFAULT_FLORA_REPLAY, body: 'G001/C2456,274,-369/0/planet/99999'}), /Body address/);
});
test('shared species gate admits ambient flowers only with living plants', () => {
  assert.deepEqual(floraKindsFromSpecies([{kind:'animal'}, {kind:'tree'}, {kind:'grass'}, {kind:'tree'}]), ['tree','grass','flower']);
  assert.deepEqual(floraKindsFromSpecies([{kind:'animal'}]), []);
  for (const stage of ['unformed','accreting','molten','extinct']) assert.equal(toLifeStage(stage), 'unformed');
  for (const stage of ['forming','sterile','microbial','complex']) assert.equal(toLifeStage(stage), stage);
});
for (const cellSizeM of [2,24]) test(`${cellSizeM} m catalogue candidates agree with renderer slope, packed habitat and geometry seeds`, () => {
  const context = createFloraReplay({...DEFAULT_FLORA_REPLAY, cellSizeM}), {body, gate, ageMyr, waterLevelM} = context;
  assert.ok(context.candidates.length > 0 && context.candidates.length <= 80);
  assert.equal(context.bio.stage, 'complex');
  const sample = terrainSampler(body, undefined, undefined, undefined, waterLevelM);
  const classify = biomeClassifier(body, waterLevelM);
  const cells = context.candidates.slice(0, 8), answers = cells.map(c => context.inspect(c.direction));
  for (let i = 0; i < cells.length; i++) {
    const d = cells[i].direction, up = new Vector3(...d);
    const ref = Math.abs(up.y) > .92 ? new Vector3(1,0,0) : new Vector3(0,1,0);
    const right = new Vector3().crossVectors(ref, up).normalize(), forward = new Vector3().crossVectors(up, right).normalize();
    const h = (basis, metres) => sample(up.clone().addScaledVector(basis, metres/body.radiusM).normalize().toArray()).groundHeightM;
    const step = cellSizeM === 2 ? 1 : 4;
    const gx = (h(right,step)-h(right,-step))/(2*step), gz = (h(forward,step)-h(forward,-step))/(2*step);
    const ground = sample(d), raw = classify(d, ground.groundHeightM, 1/Math.sqrt(1+gx*gx+gz*gz));
    const packed = {...raw, weights:raw.weights.map(Math.fround), moisture:Math.fround(raw.moisture), slopeDeg:Math.fround(raw.slopeDeg)};
    assert.deepEqual(answers[i].instance, floraAt(body.seed, body.id, d, packed, gate, toMyr(ageMyr)));
    assert.equal(answers[i].heightM, ground.groundHeightM);
    assert.equal(answers[i].biome.slopeDeg, raw.slopeDeg);
    // Reordered queries and reopening the selected canonical cell cannot change identity.
    context.inspect(cells.at(-1).direction);
    assert.deepEqual(context.inspect(d), answers[i]);
    const reopened = createFloraReplay(floraReplayFromUrl(floraReplayUrl({...context.replay, direction:d})));
    assert.deepEqual(reopened.inspect(d), answers[i]);
  }
  assert.ok(context.candidates.some(c => context.inspect(c.direction).instance.present), 'recorded habitat must include real flora in this bounded patch');
  for (const kind of ['shrub','grass','flower']) {
    const seed = floraGeometrySeed(body.seed, kind);
    assert.equal(seed, hashSeedString(body.seed + '/flora/' + kind));
    const counts = [0,1,2].map(lod => buildFloraGeometryData(kind,lod,seed).triangleCount);
    assert.ok(counts[0] >= counts[1] && counts[1] >= counts[2]);
  }
});
test('same body before formation exposes no surface and no synthetic vegetation', () => {
  const context = createFloraReplay({...DEFAULT_FLORA_REPLAY, dateNs:'0'});
  assert.notEqual(context.bio.stage, 'complex');
  assert.deepEqual(context.inspect(context.candidates[0].direction).instance, {present:false});
  assert.equal(context.inspect(context.candidates[0].direction).heightM, null);
});
