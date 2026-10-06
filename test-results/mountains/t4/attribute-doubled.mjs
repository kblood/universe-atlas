// T4 target 3: re-run each doubled wired test file with the block counter preloaded (cap CAP_S s), 4 at a time.
import {spawn} from 'node:child_process';
import {readFileSync, writeFileSync} from 'node:fs';
const a = JSON.parse(readFileSync('test-results/mountains/t4/suite-walltime.json', 'utf8')), queue = a.doubled.map(r => r.file), out = {};
const run = f => new Promise(res => {const p = spawn(process.execPath, ['--import', './tests/helpers/wire-mountains.mjs', '--import', './test-results/mountains/t4/count-blocks-preload.mjs', f], {stdio: ['ignore', 'ignore', 'pipe']});let e = '';p.stderr.on('data', d => e += d);p.on('close', () => {const m = [...e.matchAll(/^BLOCKS (.*)$/gm)].pop();res(m ? JSON.parse(m[1]) : null);});});
await Promise.all(Array.from({length: 4}, async () => {for (let f; (f = queue.shift());) {out[f] = await run(f);console.error(f, JSON.stringify(out[f]));}}));
writeFileSync('test-results/mountains/t4/doubled-blocks.json', JSON.stringify(out, null, 1) + '\n');
