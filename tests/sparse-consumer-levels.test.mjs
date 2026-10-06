// Mountains cost plan T4 (docs/mountains-opus-decisions-2026-10-05.md, task table row T4): the sparse-global
// terrainSampler consumers sample the S0 reduction (lod-ladder-2 level 0) and solve no M3 block when the mountains are
// wired. The mountains are staged on main (TERRAIN_MOUNTAINS_WIRED = false), so the wired run is a child process that
// loads src/terrain.ts with the constant flipped (tests/helpers/wire-mountains-hook.mjs); the callers themselves run
// unmodified, with their application arguments. Evidence: docs/mountains-t4-sparse-consumers-2026-10-06.md.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {TERRAIN_MOUNTAINS_WIRED} from '../src/terrain.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
// The child takes ~3 s. A caller that falls back to the truth sampler would solve thousands of blocks (one Maithea orbit
// bake on the truth: 4,075 blocks, ~10 min), so the child is bounded and a timeout names the likely cause.
const CHILD_TIMEOUT_MS = 120_000;
const run = () => {
  try {
    return JSON.parse(execFileSync(process.execPath, ['--import', './tests/helpers/wire-mountains.mjs', 'tests/helpers/sparse-consumers-wired.mjs'],
      {cwd: root, encoding: 'utf8', maxBuffer: 16 << 20, timeout: CHILD_TIMEOUT_MS}));
  } catch (e) {
    if (e.code === 'ETIMEDOUT' || e.signal) throw new Error(`wired child exceeded ${CHILD_TIMEOUT_MS} ms: a sparse-global caller probably samples the truth (M3 block solves) again`, {cause: e});
    throw e;
  }
};

test('wired: orbit bake, ocean hypsometry and surface survey solve 0 M3 blocks on all four worlds (negative control solves)', () => {
  const out = run();
  assert.equal(out.wired, true, 'the child runs with the mountains wired');
  assert.equal(out.worlds.length, 4);
  for (const w of out.worlds) {
    assert.equal(w.orbitSolves, 0, `${w.world}: orbit bake (planetSurface 1024 x 192) solves no block`);
    assert.equal(w.oceanSolves, 0, `${w.world}: oceanHypsometry solves no block`);
    assert.equal(w.surveySolves, 0, `${w.world}: surfaceSurvey solves no block`);
    assert.ok(w.sites > 0, `${w.world}: the survey still finds sites`);
    // The bake is the level-0 field bit for bit, and that field carries the massifs (the check is not vacuous).
    assert.equal(w.notLevel0, 0, `${w.world}: orbit elevation grid equals the level-0 sampler at every grid point`);
    assert.equal(w.level0Solves, 0, `${w.world}: the level-0 sampler solves no block`);
    assert.ok(w.raisedByMountains > 0, `${w.world}: the wired bake differs from the mountains-off field (${w.raisedByMountains} grid points raised)`);
    // Negative control: the truth sampler (no level) at a massif axis site does solve a block.
    assert.ok(w.truthSolves >= 1, `${w.world}: the truth sampler at a massif axis site solves a block (control)`);
  }
});

test('the wiring hook targets the real constant (a rename cannot leave the child silently unwired)', () => {
  const source = readFileSync(new URL('../src/terrain.ts', import.meta.url), 'utf8');
  assert.match(source, /^export const TERRAIN_MOUNTAINS_WIRED = (false|true);$/m);
  assert.equal(typeof TERRAIN_MOUNTAINS_WIRED, 'boolean');
});

test('the sparse-global callers pass level 0 (S0) and the dense/truth callers pass no level', () => {
  const src = p => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');
  const level0 = /terrainSampler\([^;\n]*\{lodLevel: ?0\}\)/;
  assert.match(src('terrain.ts').slice(src('terrain.ts').indexOf('export function planetSurface')), level0, 'orbit bake');
  assert.match(src('ocean-volume.ts'), level0, 'ocean hypsometry');
  assert.match(src('surface-survey.ts'), level0, 'surface survey');
  // Contract section 8: collision, physics and place queries keep the truth (no level).
  for (const p of ['world-surface.ts', 'place-query.ts', 'travel.ts']) assert.doesNotMatch(src(p), /lodLevel/, `${p} keeps the truth sampler`);
});
