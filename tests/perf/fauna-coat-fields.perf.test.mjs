import test from 'node:test';
import assert from 'node:assert/strict';
import {coatCanonicalSamples, defaultCoatGenome, evaluateCoat} from '../../src/fauna-coat-fields.ts';
import {COAT_PATTERNS} from '../../src/fauna-coat-vocab.ts';
const RESOLVED = COAT_PATTERNS.filter(p => p !== 'auto');
const median = list => { const a = [...list].sort((x, y) => x - y); return a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2; };

test('performance sanity (strict 2 us / 3 ms budgets are measured by fauna-coat-swatches.mjs)', () => {
  const samples = coatCanonicalSamples(), o = new Float64Array(3), genomes = RESOLVED.map(pattern => defaultCoatGenome('tawny', 1, {pattern, marks: 255}));
  for (let i = 0; i < 10000; i++) evaluateCoat(genomes[i % genomes.length], samples[i & 511], o);
  const per = [];
  for (let b = 0; b < 30; b++) {
    const g = genomes[b % genomes.length], t0 = process.hrtime.bigint();
    for (let i = 0; i < 1000; i++) evaluateCoat(g, samples[(i * 7 + b) & 511], o);
    per.push(Number(process.hrtime.bigint() - t0) / 1e6);
  }
  // Lenient bound so a loaded CI machine does not flake; the swatch report records the real median.
  assert.ok(median(per) <= 8, `median ${median(per)} us per sample`);
});
