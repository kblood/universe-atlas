import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import * as field from '#flora-kit/v1/field';
import * as culling from '#flora-kit/v1/culling';
import * as legacyField from '../src/flora-field.ts';
import * as legacyCulling from '../src/flora-culling.ts';

test('Atlas legacy flora imports resolve to the same versioned Kit implementations', () => {
  assert.equal(legacyField.floraAt, field.floraAt);
  assert.equal(legacyField.prepareFlora, field.prepareFlora);
  assert.equal(legacyCulling.FloraFieldRenderer, culling.FloraFieldRenderer);
  assert.equal(legacyCulling.drawFloraCandidates, culling.drawFloraCandidates);
  for (const name of ['field','culling']) {
    const source = readFileSync(new URL(`../src/flora-${name}.ts`,import.meta.url),'utf8');
    assert.equal(source.replace(/\r\n/g,'\n').trim(), `// Compatibility import; canonical implementation lives in the pinned Flora Kit.\nexport * from '#flora-kit/v1/${name}';`);
  }
});

test('Flora Kit is clean and matches the exact Atlas submodule pin and provenance', () => {
  const root = new URL('../',import.meta.url);
  const result = execFileSync(process.execPath,['scripts/check-flora-kit.mjs'],{cwd:root,encoding:'utf8'});
  assert.match(result,/exact Atlas pin/);
});
