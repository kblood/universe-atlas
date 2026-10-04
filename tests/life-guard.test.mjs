import test from 'node:test';
import assert from 'node:assert/strict';
import {LIFE_FILES} from './helpers/life-files.mjs';
import {touchedLifeFiles} from './helpers/life-guard.mjs';
test('life guard returns only LIFE_FILES and errors on invalid refs', () => {
  assert.ok(LIFE_FILES.length > 0 && LIFE_FILES.every(f => f.startsWith('src/')));
  assert.ok(touchedLifeFiles('HEAD').every(f => LIFE_FILES.includes(f)));
  assert.throws(() => touchedLifeFiles('atlas-deliberately-invalid-ref'), /git diff failed/);
});
