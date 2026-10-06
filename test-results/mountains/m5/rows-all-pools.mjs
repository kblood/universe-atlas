// Same row functions as the registered test. Constants are frozen; this is
// evidence only, never a selection of seeds or an acceptance substitute.
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {TUNING,BURNT,BURNT2,BURNT3,GATE,measurePool} from '../../../tests/helpers/mountain-rock-detail-fixture.mjs';
const out={};
for(const [name,seeds] of [['tuning',TUNING],['burnt',BURNT],['burnt2',BURNT2],['burnt3',BURNT3],['gate',GATE]]){
  console.log(`measuring ${name}`);out[name]=await measurePool(seeds);
}
const log=readFileSync(new URL('element.log',import.meta.url),'utf8');
const registered=JSON.parse(log.split(/\r?\n/).find(s=>s.startsWith('M5_ROWS ')).slice(8)).gate;
for(const key of ['actual','without','controls','controlSeeds'])assert.deepEqual(JSON.parse(JSON.stringify(out.gate[key])),registered[key],`gate cross-check ${key}`);
out.gateCrossCheck=true;
writeFileSync(new URL('rows-all-pools.json',import.meta.url),JSON.stringify(out,null,2)+'\n');
console.log('gate rows identical to registered test');
