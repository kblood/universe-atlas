// Cost plan T4 (3): wall time of every default `npm test` file, mountains off (as on main) vs WIRED (load hook
// tests/helpers/wire-mountains.mjs, the same constant flip the T6 wiring makes). Each file runs as its own process
// (`node [--import hook] <file>`), a pool of `jobs` processes per pass, the off pass first, then the wired pass.
// Failures are expected in the wired pass (pins move with the wiring); only wall time is compared here.
//   node test-results/mountains/t4/suite-walltime.mjs <out.json> [jobs=4] [timeoutMin=40]
import {spawn} from 'node:child_process';
import {readFileSync, writeFileSync} from 'node:fs';
const [out, jobsArg = '4', timeoutArg = '40'] = process.argv.slice(2);
const files = JSON.parse(readFileSync('package.json', 'utf8')).scripts.test.split(/\s+/).filter(x => x.endsWith('.mjs') && x.startsWith('tests/') && !x.startsWith('tests/helpers/'));
const runOne = (file, wired) => new Promise(res => {
  const t0 = performance.now(), args = [...(wired ? ['--import', './tests/helpers/wire-mountains.mjs'] : []), file];
  const p = spawn(process.execPath, args, {stdio: ['ignore', 'ignore', 'pipe']});let err = '';p.stderr.on('data', d => {if (err.length < 4000) err += d;});
  const timer = setTimeout(() => p.kill(), +timeoutArg * 60000);
  p.on('close', code => {clearTimeout(timer);res({ms: Math.round(performance.now() - t0), code, err: code ? err.slice(-600) : undefined});});
});
async function pass(wired) {
  const result = {}, queue = [...files];
  await Promise.all(Array.from({length: +jobsArg}, async () => {for (let f; (f = queue.shift());) {result[f] = await runOne(f, wired);process.stderr.write(`${wired ? 'wired' : 'off'} ${f} ${result[f].ms} ms exit ${result[f].code}\n`);}}));
  return result;
}
const off = await pass(false), wired = await pass(true);
const rows = files.map(f => ({file: f, offMs: off[f].ms, wiredMs: wired[f].ms, ratio: +(wired[f].ms / off[f].ms).toFixed(2), offExit: off[f].code, wiredExit: wired[f].code, wiredErr: wired[f].err}));
const doubled = rows.filter(r => r.ratio > 2);
writeFileSync(out, JSON.stringify({jobs: +jobsArg, files: files.length, offTotalMs: rows.reduce((s, r) => s + r.offMs, 0), wiredTotalMs: rows.reduce((s, r) => s + r.wiredMs, 0), doubled, rows}, null, 1) + '\n');
console.log(JSON.stringify({files: files.length, doubled: doubled.map(r => [r.file, r.offMs, r.wiredMs, r.ratio])}));
