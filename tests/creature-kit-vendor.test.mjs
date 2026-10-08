// Creature-kit vendoring (docs/creature-kit-consumption.md): the composer files Atlas runs are a sha-pinned copy of
// creature-kit (C:/LLM/IWSDK/creature-kit). This test needs no kit checkout: it fails when a vendored file in Atlas no
// longer matches vendor/creature-kit/VENDOR.json (someone edited kit-owned code inside Atlas), or when the vendored set
// stops covering the composer core. With CREATURE_KIT_DIR set it also checks that kit checkout against the pins.
// Fix a failure by changing the file in creature-kit, committing there, and running:
//   node scripts/sync-creature-kit.mjs --write --kit <creature-kit dir>
import test from 'node:test';
import assert from 'node:assert/strict';
import {VENDOR_SCHEMA, VENDORED_PATHS, readVendor, vendorDrift} from '../scripts/sync-creature-kit.mjs';

// the 12 creature-core modules of tests/creature-core-boundary.test.mjs, plus the exporter, the LOD reducer and the CLI
const MUST_VENDOR = [
  'fauna-coat-fields', 'fauna-coat-vocab', 'fauna-composer-eye-catalogue', 'fauna-composer-eye', 'fauna-composer-face-geometry',
  'fauna-composer-face', 'fauna-composer-individual', 'fauna-composer-mesh', 'fauna-composer-recipe', 'fauna-composer-rig',
  'fauna-composer-species', 'fauna-composer', 'fauna-composer-export', 'fauna-composer-lod',
].map(m => `src/${m}.ts`).concat(['scripts/export-creature.mjs']);

test('creature-kit vendor: VENDOR.json names a kit commit, the UNLICENSED licence and covers the composer core', () => {
  const v = readVendor();
  assert.equal(v.schema, VENDOR_SCHEMA);
  assert.equal(v.kit.name, 'creature-kit');
  assert.match(v.kit.commit, /^[0-9a-f]{40}$/);
  assert.equal(v.kit.license, 'UNLICENSED', 'owner decision A13, 2026-10-07');
  for (const p of MUST_VENDOR) assert.ok(VENDORED_PATHS.includes(p), `${p} must be vendored from the kit`);
  assert.deepEqual(v.files.map(f => f.path), [...VENDORED_PATHS], 'VENDOR.json lists exactly VENDORED_PATHS, in order');
});

test('creature-kit vendor: every vendored Atlas file matches its VENDOR.json sha256', () => {
  const rows = vendorDrift();
  assert.deepEqual(rows, [], `vendored creature-kit files drifted:\n${rows.join('\n')}\n`
    + 'Edit kit-owned files in C:/LLM/IWSDK/creature-kit, commit there, then: node scripts/sync-creature-kit.mjs --write --kit <dir>');
});

test('creature-kit vendor: the kit checkout at CREATURE_KIT_DIR matches the pins', {skip: process.env.CREATURE_KIT_DIR ? false : 'CREATURE_KIT_DIR is not set'}, () => {
  const rows = vendorDrift(undefined, process.env.CREATURE_KIT_DIR);
  assert.deepEqual(rows, [], rows.join('\n'));
});
