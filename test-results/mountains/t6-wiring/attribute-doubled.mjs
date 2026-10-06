// T6: re-run each default test file that more than doubled (suite-walltime-3.json) with the M3 block counter preloaded
// (test-results/mountains/t4/count-blocks-preload.mjs; the mountains are wired now, no hook), 4 at a time.
//   node tests/helpers/test-slot.mjs -- node test-results/mountains/t6-wiring/attribute-doubled.mjs
import {spawn} from 'node:child_process';
import {readFileSync, writeFileSync} from 'node:fs';
const a = JSON.parse(readFileSync('test-results/mountains/t6-wiring/suite-walltime-3.json', 'utf8')), queue = a.doubled.map(r => r[0]), out = {};
const run = f => new Promise(res => {const p = spawn(process.execPath, ['--import', './test-results/mountains/t4/count-blocks-preload.mjs', f], {stdio: ['ignore', 'ignore', 'pipe']});let e = '';p.stderr.on('data', d => e += d);p.on('close', () => {const m = [...e.matchAll(/^BLOCKS (.*)$/gm)].pop();res(m ? JSON.parse(m[1]) : null);});});
await Promise.all(Array.from({length: 4}, async () => {for (let f; (f = queue.shift());) {out[f] = await run(f);console.error(f, JSON.stringify(out[f]));}}));
writeFileSync('test-results/mountains/t6-wiring/doubled-blocks.json', JSON.stringify(out, null, 1) + '\n');
