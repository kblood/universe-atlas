import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
import {LIFE_FILES} from './life-files.mjs';
import {git, baseRef} from './test-selection.mjs';
import {runTests} from './test-runner.mjs';

export function touchedLifeFiles(base, root = process.cwd()) {
  const check = spawnSync('git', ['diff', '--quiet', base, '--', ...LIFE_FILES], {cwd: root});
  if (check.error || ![0, 1].includes(check.status)) throw check.error || new Error(`git diff failed: ${check.stderr}`);
  const changed = check.status ? git(['diff', '--name-only', '-z', base, '--', ...LIFE_FILES], root).split('\0') : [];
  const untracked = git(['ls-files', '--others', '--exclude-standard', '-z', '--', ...LIFE_FILES], root).split('\0');
  return [...new Set([...changed, ...untracked].filter(Boolean))];
}
if (process.argv[1] && resolve(process.argv[1]) === resolve('tests/helpers/life-guard.mjs')) {
  const args = process.argv.slice(2), i = args.indexOf('--base');
  if (i >= 0 && !args[i + 1]) throw new Error('--base needs a ref');
  const base = baseRef(i < 0 ? undefined : args[i + 1]), touched = touchedLifeFiles(base);
  if (!touched.length) console.log(`LIFE_FILES untouched vs ${base}: life-cpu-digest not needed`);
  else {
    console.log(`LIFE_FILES touched vs ${base}:\n${touched.join('\n')}\nRun: node --test tests/life-cpu-digest.test.mjs`);
    process.exitCode = args.includes('--run') ? await runTests(['tests/life-cpu-digest.test.mjs'], {slot: true}) : 1;
  }
}
