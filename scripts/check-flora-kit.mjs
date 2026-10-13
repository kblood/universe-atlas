// Flora Kit is consumed directly from its pinned submodule; there are no
// generated source mirrors. --prepare permits an intentional pending pin update.
import {execFileSync} from 'node:child_process';
import {readFileSync, existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';

const root = fileURLToPath(new URL('../', import.meta.url));
const kit = resolve(root, 'external/flora-kit');
const git = (args, cwd = root) => execFileSync('git', args, {cwd, encoding:'utf8'}).trim();
const read = path => readFileSync(resolve(kit, path), 'utf8');

try {
  if (!existsSync(resolve(kit, 'package.json'))) {
    throw new Error('Flora Kit submodule is missing; clone with --recurse-submodules or run git submodule update --init external/flora-kit');
  }
  const pkg = JSON.parse(read('package.json'));
  if (pkg.name !== 'flora-kit' || pkg.version !== '0.1.0' || pkg.private !== true || pkg.license !== 'UNLICENSED') {
    throw new Error('unsupported Flora Kit package; review the v1 boundary before changing the version');
  }
  const commit = git(['rev-parse','HEAD'], kit);
  const indexed = git(['ls-files','--stage','--','external/flora-kit']);
  const pin = indexed.match(/^160000 ([a-f0-9]{40}) 0\s/);
  if (!pin) throw new Error('external/flora-kit must be a Git submodule in the Atlas index');
  if (!process.argv.includes('--prepare') && commit !== pin[1]) {
    throw new Error(`Flora Kit checkout ${commit} differs from Atlas index pin ${pin[1]}; review and stage the intentional submodule update`);
  }
  if (git(['status','--porcelain'], kit)) throw new Error('Flora Kit has uncommitted changes; commit in Flora Kit before consuming it');
  const atlasPackage = JSON.parse(readFileSync(resolve(root,'package.json'),'utf8'));
  for (const entry of ['field','culling']) {
    const target = pkg.exports[`./v1/${entry}`];
    if (target !== `./src/flora-${entry}.ts` || atlasPackage.imports[`#flora-kit/v1/${entry}`] !== `./external/flora-kit/${target.slice(2)}`) {
      throw new Error(`Flora Kit v1/${entry} import boundary has drifted`);
    }
  }
  const provenance = JSON.parse(read('docs/provenance.json'));
  for (const file of provenance.files) {
    const sha = createHash('sha256').update(read(file.path).replace(/\r\n/g,'\n')).digest('hex');
    if (sha !== file.sha256) throw new Error(`Flora Kit provenance drift: ${file.path}`);
  }
  console.log(`Flora Kit v${pkg.version} @ ${commit}: clean v1 source boundary${commit !== pin[1] ? ' (pending Atlas pin update)' : ', exact Atlas pin'}`);
} catch (error) {
  console.error(`check-flora-kit: ${error.message}`);
  process.exitCode = 1;
}
