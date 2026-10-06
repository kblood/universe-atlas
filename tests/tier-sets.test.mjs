// Frozen tier sample sets (docs/test-tiers-2026-10-07.md): tests/tier-sets.json must equal a fresh in-process
// regeneration (M1 + level-0 field only, 0 M3 block solves), so a set cannot drift silently with the code.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {generateTierSets, SMOKE_CAP} from '../scripts/tier-sets/generate.mjs';

test('HARD: tests/tier-sets.json equals its regeneration (generator sha, input versions, every entry), <= 50 smoke entries per world', () => {
  const file = JSON.parse(readFileSync(new URL('./tier-sets.json', import.meta.url), 'utf8'));
  const {history, ...frozen} = file;
  const fresh = generateTierSets();
  assert.ok(Array.isArray(history) && history.length && history.at(-1).sha256 === file.sha256, 'history ledger records the current sha');
  try {assert.deepEqual(frozen, fresh);} catch (e) {
    throw new Error(`tier sets stale: npm run tier-sets:generate -- --reason <text> (${e.message.split('\n')[0]})`);
  }
  for (const [world, rows] of Object.entries(fresh.smoke)) {
    assert.ok(rows.length > 0 && rows.length <= SMOKE_CAP, `${world}: ${rows.length} smoke entries`);
    for (const k of ['axis', 'flank', 'belt-end', 'face-edge', 'switch', 'rock', 'coast', 'ocean', 'outside'])
      assert.ok(rows.some(r => r.kind === k), `${world}: no ${k} entry`);
  }
});
