import {execFileSync} from 'node:child_process';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url)),kit=resolve(root,'external/tree-kit');
const git=(args,cwd=root)=>execFileSync('git',args,{cwd,encoding:'utf8'}).trim();
const fail=message=>{throw new Error(message);};
try{
  if(!existsSync(resolve(kit,'package.json')))fail('Tree Kit is missing; clone Atlas with --recurse-submodules or run git submodule update --init external/tree-kit');
  const pkg=JSON.parse(readFileSync(resolve(kit,'package.json'),'utf8'));
  if(pkg.name!=='tree-kit'||pkg.version!=='0.1.0'||pkg.license!=='UNLICENSED')fail('Unsupported Tree Kit package; review its v1 API and provenance before changing the version');
  const commit=git(['rev-parse','HEAD'],kit),indexed=git(['ls-files','--stage','--','external/tree-kit']);
  const pin=indexed.match(/^160000 ([a-f0-9]{40}) 0\s/);
  if(!pin)fail('external/tree-kit must be a Git submodule in the Atlas index');
  if(!process.argv.includes('--prepare')&&commit!==pin[1])fail(`Tree Kit checkout ${commit} differs from Atlas index pin ${pin[1]}; stage an intentional submodule update`);
  if(git(['status','--porcelain'],kit))fail('Tree Kit has uncommitted changes; commit them in Tree Kit first');
  const atlas=JSON.parse(readFileSync(resolve(root,'package.json'),'utf8'));
  for(const [name,target] of Object.entries(pkg.exports??{})){
    if(!name.startsWith('./v1/'))continue;
    const subpath=name.slice(2),alias=`#tree-kit/${subpath}`;
    if(typeof target!=='string'||atlas.imports?.[alias]!==`./external/tree-kit/${target.slice(2)}`)fail(`Tree Kit import boundary drift at ${alias}`);
    if(!existsSync(resolve(kit,target)))fail(`Tree Kit API entry is missing: ${target}`);
  }
  for(const required of ['tree-asset-lab.html','src/tree-asset-lab.ts','PROVENANCE.md'])if(!existsSync(resolve(kit,required)))fail(`Tree Kit release file is missing: ${required}`);
  const provenance=readFileSync(resolve(kit,'PROVENANCE.md'),'utf8');
  if(!provenance.includes('Universe Atlas commit')||!provenance.includes('SHA-256'))fail('Tree Kit provenance must identify its source commit and include source checksums');
  console.log(`Tree Kit v${pkg.version} @ ${commit}: clean source API and Lab pin${commit!==pin[1]?' (pending Atlas index update)':', exact Atlas pin'}`);
}catch(error){console.error(`check-tree-kit: ${error.message}`);process.exitCode=1;}
