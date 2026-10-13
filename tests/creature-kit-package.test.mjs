import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,mkdtempSync,mkdirSync,readFileSync,readdirSync,writeFileSync,rmSync} from 'node:fs';
import {join,resolve,dirname,basename} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {build as esbuildBuild} from 'esbuild';
import {writeVendor,VENDORED_PATHS,vendorDrift} from '../scripts/sync-creature-kit.mjs';
const ROOT=fileURLToPath(new URL('..',import.meta.url));
const realTs=join(ROOT,'node_modules/typescript/lib/typescript.js');
const write=(root,path,text)=>{const target=join(root,path);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,text);};
const git=(root,...args)=>execFileSync('git',['-C',root,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
const commit=root=>{git(root,'add','.');git(root,'-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-m','fixture');};
function fixture(){
  const temporary=resolve(mkdtempSync(join(tmpdir(),'kit-package-test-'))),repo=join(temporary,'atlas'),kit=join(temporary,'kit');
  mkdirSync(repo);mkdirSync(kit);
  const peer=JSON.parse(readFileSync(join(ROOT,'node_modules/three/package.json'),'utf8'));
  const alias=`npm:${peer.name}@${peer.version}`;
  write(repo,'package.json',JSON.stringify({name:'atlas-fixture',type:'module',dependencies:{three:alias},imports:{'#creature-kit/planet':{types:'./vendor/creature-kit/package/dist/planet-v1/index.d.ts',default:'./vendor/creature-kit/package/dist/planet-v1/index.js'}}}));
  write(repo,'src/creature-model.ts',"export {generateCreatureGenome} from '#creature-kit/planet';\n");
  for(const p of VENDORED_PATHS)write(kit,p,p.endsWith('.ts')?'export const placeholder=1;\n':p.endsWith('.json')?'{}\n':'// fixture\n');
  write(kit,'src/planet-v1/index.ts',"export function generateCreatureGenome(){return {version:'original-fixture'};}\n");
  write(kit,'package.json',JSON.stringify({name:'creature-kit',version:'0.2.0',type:'module',license:'UNLICENSED',peerDependencies:{three:alias},devDependencies:{typescript:'5.9.3'},exports:{'./planet':{types:'./dist/planet-v1/index.d.ts',default:'./dist/planet-v1/index.js'}}}));
  for(const p of ['tsconfig.json','tsconfig.build.json'])write(kit,p,'{}\n');
  for(const p of ['README.md','PROVENANCE.md'])write(kit,p,'fixture provenance\n');
  write(kit,'.gitignore','node_modules/\ndist/\n');
  write(kit,'node_modules/three/package.json',JSON.stringify(peer));
  write(kit,'node_modules/typescript/package.json','{"version":"5.9.3"}');
  write(kit,'node_modules/typescript/lib/typescript.js','module.exports=require('+JSON.stringify(realTs)+');');
  // Controlled compiler double exercises emit failure/staleness/malformed
  // output. It never runs or replaces a real kit checkout/compiler.
  write(kit,'node_modules/typescript/bin/tsc',`const fs=require('fs'),path=require('path');
    if(process.env.KIT_BUILD_FIXTURE==='failed')process.exit(7);
    if(process.env.KIT_BUILD_FIXTURE==='stale')process.exit(0);
    const out=process.argv[process.argv.indexOf('--outDir')+1];
    for(const f of fs.readdirSync('src',{recursive:true}).filter(f=>f.endsWith('.ts'))){const target=path.join(out,f.slice(0,-3));fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target+'.js',process.env.KIT_BUILD_FIXTURE==='malformed'?'const = ;':fs.readFileSync(path.join('src',f)));fs.writeFileSync(target+'.d.ts','export declare const placeholder: number;');}
  `);
  git(kit,'init');commit(kit);
  const clean=()=>{if(dirname(temporary)!==resolve(tmpdir())||!basename(temporary).startsWith('kit-package-test-'))throw new Error('unsafe fixture cleanup');rmSync(temporary,{recursive:true,force:true});};
  return {repo,kit,clean};
}
function snapshot(root){const h=createHash('sha256');for(const d of readdirSync(root,{recursive:true,withFileTypes:true}).filter(d=>d.isFile()).sort((a,b)=>join(a.parentPath,a.name).localeCompare(join(b.parentPath,b.name)))){const p=join(d.parentPath,d.name);h.update(p.slice(root.length));h.update(readFileSync(p));}return h.digest('hex');}
function enableLab(f){
  const pkg=JSON.parse(readFileSync(join(f.kit,'package.json'),'utf8'));pkg.version='0.3.0';pkg.devDependencies.vite='7.3.6';write(f.kit,'package.json',JSON.stringify(pkg));
  for(const p of ['planet-skin.html','creature-lab.html','vite.config.mjs','src/planet-main.ts'])write(f.kit,`apps/creature-lab/${p}`,'export const fixtureVersion=1;\n');
  write(f.kit,'node_modules/vite/package.json','{"version":"7.3.6"}');
  write(f.kit,'node_modules/vite/bin/vite.js',`const fs=require('fs'),path=require('path'),mode=process.env.KIT_LAB_FIXTURE;
    if(mode==='failed')process.exit(7);if(mode==='stale')process.exit(0);
    const out=process.argv[process.argv.indexOf('--outDir')+1];fs.mkdirSync(path.join(out,'assets'),{recursive:true});
    for(const p of ['planet-skin.html','creature-lab.html'])fs.writeFileSync(path.join(out,p),'<html>'+String.fromCharCode(13,13,10)+'<script type="module" src="./assets/lab.js"></script></html>');
    if(mode!=='missingasset')fs.writeFileSync(path.join(out,'assets/lab.js'),mode==='malformed'?'const = ;':fs.readFileSync('apps/creature-lab/src/planet-main.ts'));
  `);
  commit(f.kit);
}

test('Kit 0.7 primary Composer entry is required and recorded without losing archived entries',()=>{
  const f=fixture();try{
    enableLab(f);
    const pkg=JSON.parse(readFileSync(join(f.kit,'package.json'),'utf8'));pkg.version='0.7.0';write(f.kit,'package.json',JSON.stringify(pkg));commit(f.kit);
    const before=snapshot(f.repo);
    assert.throws(()=>writeVendor(f.repo,f.kit),/primary entry/);assert.equal(snapshot(f.repo),before);
    write(f.kit,'apps/creature-lab/index.html','export const fixturePrimary=1;\n');commit(f.kit);
    assert.throws(()=>writeVendor(f.repo,f.kit),/index.html/);assert.equal(snapshot(f.repo),before);
    const builder=join(f.kit,'node_modules/vite/bin/vite.js');
    writeFileSync(builder,readFileSync(builder,'utf8').replace("['planet-skin.html','creature-lab.html']","['index.html','planet-skin.html','creature-lab.html']").replace("'<html>'+","'<html><a href=\"./\">Animal Lab</a>'+"));
    writeVendor(f.repo,f.kit);
    const receipt=JSON.parse(readFileSync(join(f.repo,'vendor/creature-kit/LAB.json'),'utf8'));
    assert.equal(receipt.entry,'index.html');
    for(const p of ['index.html','planet-skin.html','creature-lab.html'])assert.ok(receipt.files.some(row=>row.path===p));
    assert.deepEqual(vendorDrift(f.repo,f.kit),[]);
  }finally{f.clean();}
});

test('Kit 0.3 standalone Lab updates with the runtime release and fails closed on missing/dirty/failed/stale/malformed app input',()=>{
  for(const failure of ['missing','dirty','failed','stale','missingasset','malformed','outdated']){
    const f=fixture();try{
      enableLab(f);writeVendor(f.repo,f.kit);assert.deepEqual(vendorDrift(f.repo,f.kit),[]);const before=snapshot(f.repo);
      assert.equal(JSON.parse(readFileSync(join(f.repo,'vendor/creature-kit/LAB.json'))).kit.commit,git(f.kit,'rev-parse','HEAD'));
      if(failure==='missing'){git(f.kit,'rm','apps/creature-lab/planet-skin.html');commit(f.kit);}
      if(failure==='dirty')write(f.kit,'apps/creature-lab/src/planet-main.ts','export const dirty=1;\n');
      if(failure==='outdated'){const pkg=JSON.parse(readFileSync(join(f.kit,'package.json')));pkg.version='0.2.9';write(f.kit,'package.json',JSON.stringify(pkg));commit(f.kit);}
      process.env.KIT_LAB_FIXTURE=failure;
      assert.throws(()=>writeVendor(f.repo,f.kit),undefined,failure);assert.equal(snapshot(f.repo),before,`${failure}: package/Lab update changed Atlas`);
    }finally{delete process.env.KIT_LAB_FIXTURE;f.clean();}
  }
  const f=fixture();try{
    enableLab(f);writeVendor(f.repo,f.kit);const before=readFileSync(join(f.repo,'public/animal-lab/assets/lab.js'),'utf8');
    write(f.kit,'apps/creature-lab/src/planet-main.ts','export const fixtureVersion=2;\n');commit(f.kit);writeVendor(f.repo,f.kit);
    assert.notEqual(readFileSync(join(f.repo,'public/animal-lab/assets/lab.js'),'utf8'),before);assert.deepEqual(vendorDrift(f.repo,f.kit),[]);
    write(f.repo,'public/animal-lab/assets/lab.js','export const drift=1;');assert.ok(vendorDrift(f.repo).some(row=>row.includes('animal-lab/assets/lab.js: artifact hash drift')));
  }finally{f.clean();}
});
test('Kit Lab regeneration removes orphaned hashed Vite chunks from older receipts',()=>{
  const f=fixture();try{
    enableLab(f);
    write(f.repo,'public/animal-lab/assets/benchmark-BBxzvL12.js','// orphaned generated chunk\n');
    writeVendor(f.repo,f.kit);
    assert.equal(existsSync(join(f.repo,'public/animal-lab/assets/benchmark-BBxzvL12.js')),false);
    assert.deepEqual(vendorDrift(f.repo,f.kit),[]);
  }finally{f.clean();}
});
test('one committed kit update changes the actual factory consumed through the built package seam',()=>{
  const f=fixture();try{
    writeVendor(f.repo,f.kit);assert.deepEqual(vendorDrift(f.repo,f.kit),[]);
    const consumed=()=>execFileSync(process.execPath,['--input-type=module','-e',"import {generateCreatureGenome} from './src/creature-model.ts';console.log(generateCreatureGenome().version);"],{cwd:f.repo,encoding:'utf8'}).trim();
    assert.equal(consumed(),'original-fixture');
    const pkg=JSON.parse(readFileSync(join(f.kit,'package.json'),'utf8'));pkg.version='0.2.1';write(f.kit,'package.json',JSON.stringify(pkg));
    write(f.kit,'src/planet-v1/index.ts',"export function generateCreatureGenome(){return {version:'upgraded-fixture'};}\n");commit(f.kit);
    assert.ok(vendorDrift(f.repo,f.kit).length>0,'latest checkout change must be visible before update');
    writeVendor(f.repo,f.kit);assert.equal(consumed(),'upgraded-fixture');assert.deepEqual(vendorDrift(f.repo,f.kit),[]);
  }finally{f.clean();}
});
test('missing, dirty, failed, stale and malformed inputs preserve every current Atlas byte',()=>{
  for(const failure of ['missing','dirty','failed','stale','malformed']){
    const f=fixture();try{
      writeVendor(f.repo,f.kit);const before=snapshot(f.repo);
      if(failure==='missing'){git(f.kit,'rm',VENDORED_PATHS.at(-1));commit(f.kit);}
      if(failure==='dirty')write(f.kit,'src/planet-v1/index.ts','export const uncommitted=1;\n');
      if(failure==='stale')write(f.kit,'dist/planet-v1/index.js',"export const stale='must-not-be-used';\n");
      process.env.KIT_BUILD_FIXTURE=failure;
      assert.throws(()=>writeVendor(f.repo,f.kit),undefined,failure);
      assert.equal(snapshot(f.repo),before,`${failure}: update partially changed Atlas`);
    }finally{delete process.env.KIT_BUILD_FIXTURE;f.clean();}
  }
});
test('artifact edits and peer-version mismatch are detected rather than hidden by a new pin',()=>{
  const f=fixture();try{
    writeVendor(f.repo,f.kit);write(f.repo,'vendor/creature-kit/package/dist/planet-v1/index.js','export const drift=1;\n');
    assert.ok(vendorDrift(f.repo).some(row=>row.includes('artifact hash drift')));
    writeVendor(f.repo,f.kit);const before=snapshot(f.repo);
    const pkg=JSON.parse(readFileSync(join(f.kit,'package.json'),'utf8'));pkg.peerDependencies.three='npm:super-three@0.999.0';write(f.kit,'package.json',JSON.stringify(pkg));commit(f.kit);
    assert.throws(()=>writeVendor(f.repo,f.kit),/peer Three/);assert.equal(snapshot(f.repo),before);
  }finally{f.clean();}
});
test('generated Kit receipt cannot shadow package.json during esbuild package-scope resolution',async()=>{
  const f=fixture();try{
    write(f.repo,'vendor/creature-kit/PACKAGE.json','{"legacy":"case-collision"}\n');
    writeVendor(f.repo,f.kit);
    const vendor=JSON.parse(readFileSync(join(f.repo,'vendor/creature-kit/VENDOR.json'),'utf8'));
    assert.equal(vendor.builtPackage.manifest,'vendor/creature-kit/creature-kit-manifest.json');
    assert.equal(existsSync(join(f.repo,'vendor/creature-kit/PACKAGE.json')),false,'legacy colliding receipt is removed');
    await esbuildBuild({absWorkingDir:f.repo,bundle:true,platform:'node',format:'esm',write:false,
      entryPoints:['src/creature-model.ts']});
  }finally{f.clean();}
});
