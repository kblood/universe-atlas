// Three independent children per revision/path; baseline failures are required.
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const evidence = {node: process.version, baseline: 'f2f2c62', rounds: []};
for (let round = 1; round <= 3; round++) {
  for (const tree of round % 2 ? ['base', 'wt'] : ['wt', 'base']) {
    for (const harness of ['h2-eco-class.mjs', 'h-niche.mjs', 'h-flora.mjs']) {
      const child = spawnSync(process.execPath, ['--expose-gc', fileURLToPath(new URL(harness, import.meta.url))], {
        encoding: 'utf8', env: {...process.env, ALLOC_TREE: tree}, timeout: 120000});
      assert.equal(child.status, tree === 'base' ? 1 : 0, child.stdout + child.stderr);
      const result = JSON.parse(child.stdout.split('\n').find(line => line.startsWith('RESULT ')).slice(7));
      assert.ok(result.control.bytesPerCall < 1 && result.control2.bytesPerCall < 1);
      assert.ok(tree === 'base' ? result.real.bytesPerCall >= 4 : result.real.bytesPerCall < 4);
      evidence.rounds.push({round, tree, harness, status: child.status, ...result});
      console.log(`round ${round} ${tree} ${harness}: ${result.real.bytesPerCall} B/call; controls ${result.control.bytesPerCall}/${result.control2.bytesPerCall}; exit ${child.status}`);
    }
  }
}
evidence.identity = [];
for (const harness of ['id-eco.mjs', 'id-niche.mjs', 'id-flora.mjs']) {
  const child = spawnSync(process.execPath, [fileURLToPath(new URL(harness, import.meta.url))], {encoding: 'utf8', timeout: 120000});
  assert.equal(child.status, 0, child.stdout + child.stderr);
  const result = JSON.parse(child.stdout.split('\n').find(line => line.startsWith('IDENTITY ')).slice(9));
  evidence.identity.push(result);
  console.log(`${result.name}: ${result.comparisons} identity comparisons, ${result.differences} differences`);
}
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(evidence, null, 2) + '\n');
