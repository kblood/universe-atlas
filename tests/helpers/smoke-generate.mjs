// Baseline test durations are CPU-cost estimates under parallel load, not file wall time.
import {readFileSync, writeFileSync} from 'node:fs';
import {registeredTests} from './test-selection.mjs';
const baseline = process.argv[2] || 'test-results/baseline/full-npm-test-main.log';
const rows = readFileSync(baseline, 'utf8').split(/\r?\n/).flatMap(line => {
  const m = line.match(/^[✔✖]\s+(.*?)\s+\(([\d.]+)ms\)/);
  return m ? [{title: m[1], seconds: Number(m[2]) / 1000}] : [];
});
const files = registeredTests().filter(f => !/digest|\/perf\//.test(f)).flatMap(file => {
  const source = readFileSync(file, 'utf8');
  const titles = [...source.matchAll(/\btest\(\s*(['"])(.*?)\1/g)].map(m => m[2]);
  const matches = rows.filter(r => titles.includes(r.title));
  // Exclude unmapped/dynamically titled files: never assume missing measurements are free.
  if (!titles.length || titles.some(t => !rows.some(r => r.title === t))) return [];
  const seconds = matches.reduce((sum, r) => sum + r.seconds, 0);
  return seconds < 2 ? [{file, seconds: +seconds.toFixed(6)}] : [];
}).sort((a, b) => a.seconds - b.seconds).slice(0, 101);
writeFileSync('tests/smoke.json', JSON.stringify({generatedAt: new Date().toISOString(), source: baseline, measurement: 'sum of matched baseline test durations per file, seconds (parallel-load cost estimate)', files}, null, 2) + '\n');
console.log(`Generated ${files.length} measured files; estimated sum ${files.reduce((n, f) => n + f.seconds, 0).toFixed(2)} s`);
