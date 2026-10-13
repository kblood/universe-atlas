// Self-contained built creature-kit package. Update is local/offline: compile a
// committed checkout, copy declared package files, pin source+artifact hashes.
import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,mkdtempSync,readFileSync,readdirSync,writeFileSync,rmSync,realpathSync,lstatSync} from 'node:fs';
import {resolve,join,dirname,relative,sep,basename} from 'node:path';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {createRequire} from 'node:module';
export const KIT_PACKAGE_SCHEMA='creature-kit-built-package-1';
export const KIT_PACKAGE_ROOT='vendor/creature-kit/package';
const dependenciesRoot=(repo,kit)=>existsSync(join(kit,'node_modules/typescript/package.json'))&&existsSync(join(kit,'node_modules/three/package.json'))?kit:repo;
const lf=p=>readFileSync(p,'utf8').replace(/\r\n/g,'\n');
const sha=p=>createHash('sha256').update(lf(p)).digest('hex');
const git=(root,...args)=>execFileSync('git',['-C',root,...args],{encoding:'utf8'}).trim();
function files(root){return readdirSync(root,{recursive:true,withFileTypes:true}).filter(d=>d.isFile()).map(d=>relative(root,join(d.parentPath,d.name)).replace(/\\/g,'/')).sort();}
function inside(root,path){
  if(typeof path!=='string'||!path||path.includes('\\')||path.split('/').some(p=>!p||p==='.'||p==='..')||path.includes(':'))throw new Error(`invalid package-relative path ${path}`);
  const target=resolve(root,path),base=resolve(root)+sep;
  if(!target.toLowerCase().startsWith(base.toLowerCase()))throw new Error(`package path escaped root: ${path}`);
  const canonical=absolute=>{const suffix=[];let cursor=absolute;
    while(!existsSync(cursor)){if(lstatSync(cursor,{throwIfNoEntry:false}))throw new Error(`dangling path: ${cursor}`);suffix.unshift(basename(cursor));cursor=dirname(cursor);}
    return join(realpathSync.native(cursor),...suffix);};
  if(!canonical(target).toLowerCase().startsWith((canonical(resolve(root))+sep).toLowerCase()))throw new Error(`package path resolves outside root: ${path}`);
  return target;
}
function packageSources(kit){
  return ['package.json','tsconfig.json','tsconfig.build.json','README.md','PROVENANCE.md',
    ...files(join(kit,'src')).map(p=>'src/'+p),
    'scripts/export-creature.mjs',...files(join(kit,'assets/briefs')).map(p=>'assets/briefs/'+p)].sort();
}
function packageArtifacts(kit,sources){
  const built=[];
  for(const source of sources.filter(p=>p.startsWith('src/'))){
    if(!source.endsWith('.ts')||source.endsWith('.d.ts'))throw new Error(`unsupported library source ${source}`);
    const stem=source.slice(4,-3);built.push(`dist/${stem}.js`,`dist/${stem}.d.ts`);
  }
  return [...sources.filter(p=>!p.startsWith('tsconfig')), ...built].sort();
}
export function prepareKitPackage(repo,kit){
  const sources=packageSources(kit),dirty=git(kit,'status','--porcelain','--','src','package.json','tsconfig.json','tsconfig.build.json','README.md','PROVENANCE.md','scripts/export-creature.mjs','assets/briefs');
  if(dirty)throw new Error('kit package source must be committed before updating:\n'+dirty);
  const pkg=JSON.parse(lf(join(kit,'package.json'))),planet=pkg.exports?.['./planet'];
  const [major,minor]=String(pkg.version).split('.').map(Number);
  if(pkg.name!=='creature-kit'||pkg.license!=='UNLICENSED'||!/^\d+\.\d+\.\d+$/.test(pkg.version)||(major===0&&minor<2)||planet?.default!=='./dist/planet-v1/index.js'||planet?.types!=='./dist/planet-v1/index.d.ts')throw new Error('creature-kit >=0.2.0 with the versioned planet-v1 entry is required');
  const atlas=JSON.parse(lf(join(repo,'package.json'))),deps=dependenciesRoot(repo,kit),peer=JSON.parse(lf(join(deps,'node_modules/three/package.json')));
  const binding=atlas.imports?.['#creature-kit/planet'];
  if(binding?.default!==`./${KIT_PACKAGE_ROOT}/dist/planet-v1/index.js`||binding?.types!==`./${KIT_PACKAGE_ROOT}/dist/planet-v1/index.d.ts`)throw new Error('Atlas must bind the public built planet entry before updating');
  if(pkg.peerDependencies?.three!==atlas.dependencies?.three||pkg.peerDependencies.three!==`npm:${peer.name}@${peer.version}`)throw new Error('kit peer Three differs from Atlas; update dependency compatibility explicitly');
  const compiler=join(deps,'node_modules/typescript/bin/tsc');
  if(!existsSync(compiler))throw new Error('Atlas TypeScript compiler unavailable; install Atlas dependencies before preparing Creature Kit');
  const compilerVersion=JSON.parse(lf(join(deps,'node_modules/typescript/package.json'))).version;
  if(pkg.devDependencies?.typescript!==compilerVersion)throw new Error('kit TypeScript compiler version differs from its committed build contract');
  const sourceRows=sources.map(path=>({path,sha256:sha(inside(kit,path))}));
  // Every source must really exist in the pinned commit, including ignored or
  // accidentally untracked additions. A clean index alone is insufficient.
  for(const row of sourceRows){const committed=execFileSync('git',['-C',kit,'show',`HEAD:${row.path}`],{encoding:'utf8'}).replace(/\r\n/g,'\n');
    if(committed!==lf(inside(kit,row.path)))throw new Error(`package source differs from pinned commit: ${row.path}`);}
  const commit=git(kit,'rev-parse','HEAD');
  // Never trust an old dist directory. A fresh isolated emit must provide every
  // declared runtime/type artifact; noEmit/failed/incomplete builds cannot pin
  // stale code as the latest version.
  const build=resolve(mkdtempSync(join(tmpdir(),'creature-kit-package-')));
  try{
  execFileSync(process.execPath,[compiler,'-p',join(kit,'tsconfig.build.json'),'--outDir',build],{cwd:kit,stdio:'inherit'});
  if(git(kit,'rev-parse','HEAD')!==commit||sourceRows.some(row=>sha(inside(kit,row.path))!==row.sha256))throw new Error('kit source changed during build; retry from a committed snapshot');
  const paths=packageArtifacts(kit,sources),root=join(repo,KIT_PACKAGE_ROOT);
  const artifactPath=p=>p.startsWith('dist/')?inside(build,p.slice(5)):inside(kit,p);
  // Build and verify every input first; a stale dist file whose source was
  // removed is never copied. Only prior manifest-owned stale files are removed.
  const ts=createRequire(join(repo,'package.json'))(join(deps,'node_modules/typescript/lib/typescript.js'));
  for(const p of paths){if(!existsSync(artifactPath(p)))throw new Error(`missing fresh built package artifact ${p}`);
    if(p.startsWith('dist/')&&p.endsWith('.js')&&ts.createSourceFile(p,lf(artifactPath(p)),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS).parseDiagnostics.length)throw new Error(`malformed built JavaScript ${p}`);}
  const priorPath=join(repo,'vendor/creature-kit/PACKAGE.json');
  const prior=existsSync(priorPath)?JSON.parse(lf(priorPath)):null;
  for(const row of prior?.files??[])inside(root,row.path);
  const writes=paths.map(path=>({path:`${KIT_PACKAGE_ROOT}/${path}`,text:lf(artifactPath(path))}));
  const rows=writes.map(row=>({path:row.path.slice(KIT_PACKAGE_ROOT.length+1),sha256:createHash('sha256').update(row.text).digest('hex')}));
  const removes=(prior?.files??[]).filter(row=>!paths.includes(row.path)).map(row=>`${KIT_PACKAGE_ROOT}/${row.path}`);
  const manifest={schema:KIT_PACKAGE_SCHEMA,kit:{name:pkg.name,version:pkg.version,commit,license:pkg.license},
    entrypoints:{planet:planet},compiler:{typescript:compilerVersion},
    note:'Committed offline build; Atlas imports the public planet entry. Sources retained for provenance; edit in creature-kit and run sync-creature-kit --write.',
    sources:sourceRows,files:rows};
  writes.push({path:'vendor/creature-kit/PACKAGE.json',text:JSON.stringify(manifest,null,2)+'\n'});
  return {manifest,writes,removes};
  }finally{
    if(dirname(build)!==resolve(tmpdir())||!basename(build).startsWith('creature-kit-package-'))throw new Error('refusing cleanup outside package build staging');
    rmSync(build,{recursive:true,force:true});
  }
}
/** Preflight all reads before this transaction. On filesystem failure restore
 * every existing owned file; never remove unmanifested files or directories. */
export function applyKitUpdate(repo,writes,removes=[]){
  const paths=[...new Set([...writes.map(row=>row.path),...removes])];
  const previous=new Map(paths.map(path=>{const target=inside(repo,path);return [path,existsSync(target)?readFileSync(target):null];}));
  try{
    for(const row of writes){const target=inside(repo,row.path);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,row.text);}
    for(const path of removes){const target=inside(repo,path);if(existsSync(target))rmSync(target);}
  }catch(error){
    for(const [path,bytes] of previous){const target=inside(repo,path);if(bytes===null){if(existsSync(target))rmSync(target);}else writeFileSync(target,bytes);}
    throw error;
  }
}
export function kitPackageDrift(repo,kit=null){
  const rows=[],manifestPath=join(repo,'vendor/creature-kit/PACKAGE.json');
  if(!existsSync(manifestPath))return ['built creature-kit package manifest missing'];
  const manifest=JSON.parse(lf(manifestPath)),root=join(repo,KIT_PACKAGE_ROOT);
  if(manifest.schema!==KIT_PACKAGE_SCHEMA)rows.push('built package schema mismatch');
  for(const row of manifest.files){const target=inside(root,row.path);if(!existsSync(target)||sha(target)!==row.sha256)rows.push(`package/${row.path}: artifact hash drift`);}
  const actual=files(root);for(const path of actual)if(!manifest.files.some(row=>row.path===path))rows.push(`package/${path}: unmanifested artifact`);
  const pkg=JSON.parse(lf(join(root,'package.json'))),atlas=JSON.parse(lf(join(repo,'package.json'))),binding=atlas.imports?.['#creature-kit/planet'];
  if(pkg.version!==manifest.kit.version||pkg.name!==manifest.kit.name||pkg.license!==manifest.kit.license)rows.push('built package identity/version/license drift');
  if(pkg.exports?.['./planet']?.default!==manifest.entrypoints.planet.default||pkg.exports?.['./planet']?.types!==manifest.entrypoints.planet.types)rows.push('built planet entrypoint drift');
  if(binding?.default!==`./${KIT_PACKAGE_ROOT}/dist/planet-v1/index.js`||binding?.types!==`./${KIT_PACKAGE_ROOT}/dist/planet-v1/index.d.ts`)rows.push('Atlas planet package import is not the pinned public entry');
  if(kit){
    const currentSources=packageSources(kit);
    if(JSON.stringify(currentSources)!==JSON.stringify(manifest.sources.map(row=>row.path)))rows.push('kit package source file set changed; run update');
    for(const row of manifest.sources){const target=inside(kit,row.path);if(!existsSync(target)||sha(target)!==row.sha256)rows.push(`kit/${row.path}: package source changed; run update`);}
    if(git(kit,'rev-parse','HEAD')!==manifest.kit.commit)rows.push('kit package commit changed; run update for the latest committed version');
  }
  return rows;
}
