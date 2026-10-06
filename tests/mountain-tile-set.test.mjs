// Massif tile set (T6; docs/mountains-opus-decisions-2026-10-05.md Q6 item 2 and addendum item 2): the frozen 12
// directions per world are real mountain terrain. M1 only (orogen layout, a0), no heights, no block solves.
// The INFO cells measured on this set (test-results/mountains/t6-wiring/massif-tile-set.mjs, docs/mountains-t6-wiring-
// 2026-10-06.md) are report-only: no ceiling is set from them and no merge is blocked by them (A3 OPEN for Kasper).
import test from 'node:test';
import assert from 'node:assert/strict';
import {waterWorlds} from './terrain-climate-fixtures.mjs';
import {MASSIF_ENVELOPE} from '../src/mountain-envelope.ts';
import {FROZEN_MASSIF_TILE_SET, TILE_SET_WORLDS, massifTileSet, tileEvidence, tileSetLevels} from './helpers/mountain-tile-set.mjs';

const bodies = Object.fromEntries(waterWorlds().map(b => [b.name, b]));

test('HARD: the M1-only rule reproduces the frozen massif tile set (12 per world: 8 axis, 2 flank, 2 belt-end)', () => {
  for (const name of TILE_SET_WORLDS) {
    const r = massifTileSet(bodies[name]), frozen = FROZEN_MASSIF_TILE_SET[name];
    assert.equal(r.set.length, 12, name);
    assert.deepEqual(r.set.map(s => s.kind), [...Array(8).fill('axis'), 'flank', 'flank', 'belt-end', 'belt-end'], name);
    assert.deepEqual(r.set.map(s => ({kind: s.kind, d: s.d})), frozen, `${name}: frozen directions`);
    assert.deepEqual(r.replaced, [], `${name}: no direction needed replacing when frozen`);
  }
});

test('HARD: every tile of the set, at every evaluated level, has a sample with |axisDistanceM| < 48 km on a massif', () => {
  for (const name of TILE_SET_WORLDS) {
    const body = bodies[name];
    for (const s of FROZEN_MASSIF_TILE_SET[name]) for (const L of tileSetLevels(body)) {
      const e = tileEvidence(body, s.d, L);
      assert.ok(e.massifSamples > 0 && e.minAbsAxisDistanceM < MASSIF_ENVELOPE.MAX_HALF_WIDTH_M, `${name} ${s.kind} ${e.tile}: ${JSON.stringify(e)}`);
    }
    // Flank tiles really are off-axis (the set is not axis-only).
    const flank = FROZEN_MASSIF_TILE_SET[name].filter(s => s.kind === 'flank').map(s => tileEvidence(body, s.d, 14));
    assert.ok(flank.every(e => e.minAbsAxisDistanceM > 20_000), `${name}: flank tiles lie >= 20 km off the axis`);
  }
});

test('HARD: negative control: a direction far from every belt fails the massif evidence', () => {
  // A direction on no belt (M1 belt = 0 on the whole tile) has no massif sample at a fine level.
  const body = bodies.Maithea, lay = tileEvidence;
  let found = null;
  for (let i = 0; i < 200 && !found; i++) {const z = -1 + 2 * (i + .5) / 200, r = Math.sqrt(1 - z * z), d = [r * Math.cos(2.4 * i), z, r * Math.sin(2.4 * i)];
    const e = lay(body, d, 12);if (e.massifSamples === 0 && e.centreBelt === 0) found = e;}
  assert.ok(found, 'a non-massif tile exists and is rejected by the evidence rule');
});
