// T6: wall time and exit of every default `npm test` file, main (off) vs this wired tree. Each file runs as its own
// process (`node <file>`, cwd = the tree), a pool of `jobs` processes per pass, main first, then wired.
//   node test-results/mountains/t6-wiring/suite-walltime.mjs <out.json> <mainRoot> [jobs=4] [timeoutMin=4] [onlyFilesCsv]
// Run under ONE test-slot level: node tests/helpers/test-slot.mjs -- node <this> ...
import {spawn} from 'node:child_process';
import {readFileSync, writeFileSync} from 'node:fs';
const [out, mainRoot, jobsArg = '4', timeoutArg = '4', only = ''] = process.argv.slice(2);
const wiredRoot = process.cwd();
const listed = JSON.parse(readFileSync('package.json', 'utf8')).scripts.test.split(/\s+/).filter(x => x.endsWith('.mjs') && x.startsWith('tests/') && !x.startsWith('tests/helpers/'));
const files = only ? only.split(',') : listed;
const runOne = (file, cwd) => new Promise(res => {
  const t0 = performance.now();
  const p = spawn(process.execPath, [file], {cwd, stdio: ['ignore', 'pipe', 'pipe']});let err = '';
  const keep = d => {err += d;if (err.length > 20000) err = err.slice(-12000);};
  p.stdout.on('data', keep);p.stderr.on('data', keep);
  let killed = false;const timer = setTimeout(() => {killed = true;p.kill();}, +timeoutArg * 60000);
  p.on('close', code => {clearTimeout(timer);res({ms: Math.round(performance.now() - t0), code, killed, err: code ? err.slice(-3000) : undefined});});
});
async function pass(cwd, label, list) {
  const result = {}, queue = [...list];
  await Promise.all(Array.from({length: +jobsArg}, async () => {for (let f; (f = queue.shift());) {
    result[f] = await runOne(f, cwd);process.stderr.write(`${label} ${f} ${result[f].ms} ms exit ${result[f].code}${result[f].killed ? ' KILLED' : ''}\n`);}}));
  return result;
}
const off = mainRoot === '-' ? {} : await pass(mainRoot, 'off', files), wired = await pass(wiredRoot, 'wired', files);
const rows = files.map(f => ({file: f, offMs: off[f]?.ms, wiredMs: wired[f].ms, ratio: off[f] ? +(wired[f].ms / off[f].ms).toFixed(2) : null,
  offExit: off[f]?.code, wiredExit: wired[f].code, killed: wired[f].killed, wiredErr: wired[f].err}));
writeFileSync(out, JSON.stringify({jobs: +jobsArg, timeoutMin: +timeoutArg, files: files.length,
  offTotalMs: rows.reduce((s, r) => s + (r.offMs ?? 0), 0), wiredTotalMs: rows.reduce((s, r) => s + r.wiredMs, 0),
  doubled: rows.filter(r => r.ratio > 2).map(r => [r.file, r.offMs, r.wiredMs, r.ratio]),
  failing: rows.filter(r => r.wiredExit !== 0).map(r => [r.file, r.wiredExit, r.killed]), rows}, null, 1) + '\n');
console.log(JSON.stringify({files: files.length, failing: rows.filter(r => r.wiredExit !== 0).map(r => r.file)}));
