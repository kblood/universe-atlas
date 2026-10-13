// Creature-kit submodule generation (docs/creature-kit-consumption.md): Atlas's ignored compatibility outputs and
// built package must match their receipts and the exact Git submodule commit.
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {VENDOR_SCHEMA, VENDORED_PATHS, readVendor, vendorDrift} from '../scripts/sync-creature-kit.mjs';
const KIT_DIR=resolve(process.env.CREATURE_KIT_DIR||'external/creature-kit');

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

test('creature-kit submodule: the public HTTPS pin matches the generated receipt', () => {
  const url=execFileSync('git',['config','--file','.gitmodules','--get','submodule.external/creature-kit.url'],{encoding:'utf8'}).trim();
  assert.equal(url,'https://github.com/kblood/creature-kit.git');
  const commit=execFileSync('git',['-C',KIT_DIR,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
  assert.equal(commit,readVendor().kit.commit,'generated Atlas inputs must match the checked-out submodule commit');
});

test('creature-kit submodule: generated outputs match the checkout', () => {
  const rows = vendorDrift(undefined, KIT_DIR);
  assert.deepEqual(rows, [], rows.join('\n'));
});
