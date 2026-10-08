import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

test('coat allocation stays below 20 B/sample with a valid GC-counted no-op control',t=>{
  const script=fileURLToPath(new URL('../fauna-coat-allocation.bench.mjs',import.meta.url));
  const run=spawnSync(process.execPath,['--expose-gc',script],{encoding:'utf8',timeout:120000});
  t.diagnostic(run.stdout.trim());
  assert.equal(run.status,0,`${run.error??''}\n${run.stderr}`);
});
