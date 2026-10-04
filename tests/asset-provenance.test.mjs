// Asset provenance gate (backlog task 21, AGENTS.md: "an asset without provenance is not shippable").
//
// Every shipped binary asset (GLB/glTF, textures, audio, raw payloads) under public/ and under
// assets/ground-materials-v1/runtime must
//  1. be bound to a sidecar: a .json next to it (or, for the ground runtime textures, one directory
//     up) holding an object whose structured `sha256` field equals the file's hash. A hash that only
//     appears in prose or as a key does not bind. An `<file>.asset.json`, a family/mip manifest or an
//     authoring manifest all qualify, and
//  2. carry a real licence: the bound sidecars declare at least one licence expression and none of
//     them is NOASSERTION / NONE / empty / malformed. (A bound sidecar that declares no licence, such as
//     a revision record, is neutral as long as another bound sidecar declares a good one.)
// An extension that is neither an asset format nor documentation (.json/.txt/.md) is itself a violation,
// and so is a symbolic link; a missing scan root throws.
// The only escape is the explicit, dated ALLOWLIST below. Entries are exact paths, pin the asset's sha256,
// waive ONLY the licence rules (a missing sidecar or lost hash binding always fails), name the decision
// they wait for and expire. An expired, stale (file gone or already compliant), re-dated, byte-changed or
// malformed entry fails, so the list can only shrink. This test reads; it changes no asset.
// Not in the selection graph: it scans directories dynamically, so run it for ANY change under public/ or
// assets/ground-materials-v1 (npm run test:pkg -- tests/asset-provenance.test.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync,mkdirSync,readdirSync,readFileSync,rmSync,symlinkSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join,relative,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const REPO=fileURLToPath(new URL('../',import.meta.url));
// sidecarUp lets a directory of runtime files be bound by a sidecar that sits that many directories above it.
const SCAN_ROOTS=[{dir:'public',sidecarUp:0},{dir:'assets/ground-materials-v1/runtime',sidecarUp:1}];
// Anything that is not documentation or metadata must be an asset that needs provenance.
const ASSET_EXT=new Set(['.glb','.gltf','.png','.jpg','.jpeg','.webp','.gif','.avif','.ktx','.ktx2','.basis','.dds','.tga','.tif','.tiff','.svg','.hdr','.exr','.rgba8','.bin','.ogg','.wav','.mp3','.opus','.flac','.m4a','.aac','.mp4','.webm','.ttf','.otf','.woff','.woff2','.wasm']);
const NON_ASSET_EXT=new Set(['.json','.txt','.md']);
const BAD_LICENSE=new Set(['NOASSERTION','NONE','']);
const WAIVABLE=new Set(['noassertion','no-license']);
const DATE=/^\d{4}-\d{2}-\d{2}$/;
const realDate=v=>typeof v==='string'&&DATE.test(v)&&!Number.isNaN(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;

// Dated allowlist: each entry waits on the owner's licence decision (backlog task 1, "the project licence").
const WAIT='backlog task 1: owner licence decision for original Atlas assets (project LICENSE, EZ-Tree derivative statement)';
const FOREST='public/assets/forest/desktop-v1/';
const DEER='public/assets/fauna/deer-doe-v1/';
const A='NOASSERTION in asset sidecar; EZ-Tree geometry is MIT, Atlas textures original';
const M='NOASSERTION in foliage-mip manifest; derived from original Atlas leaf texture';
const D='NOASSERTION in authoring manifest; original Blender-authored review candidate (status proposal-needs-review)';
const REV='retained historical revision bytes; '+D;
const REV_A='23233caf7427587e88ce74a25a347297d8e67da0fd6b0fa7c811b0c544d5a6b3',REV_A_SIDE='5d4caf2e1e7ba6faef5b36b1f450ae6caf0520063666f00fa371919ca5a19b60';
const REV_B='757f6c47b7cd769c86b5e1159637119a567bd66a8af2a4f173a5af1dda5c30b6',REV_B_SIDE='513c7766b1d8fc56b93eb01a30149ccb903c0aab8a89b542ae1396e91e54517e';
export const ALLOWLIST=[
  [FOREST+'branching/oak-lod0.glb','4a18a1873cc4484d4d2bc4aecf872eb0ac6f02be33b85c4efd0baf3aaf9c0068',A],
  [FOREST+'branching/oak-lod1.glb','cd6a2f08a2b3546e7219062674f7ea7c087457c315452323dc26e578fab61fa9',A],
  [FOREST+'branching/foliage-mips.rgba8','489bbfbc31c1c7375907f606d80817e918b8660bb9de0d91480bb2d4978484c6',M],
  [FOREST+'spire/conifer-lod0.glb','58ead3644a84f91d0d30658c827be0c04d6ab0b5a42f468397cd2474a1c06e3d',A],
  [FOREST+'spire/conifer-lod1.glb','126cc179069cdeadf37bfa9fefa47b5be853040046be812a6e282e648f8d884b',A],
  [FOREST+'spire/foliage-mips.rgba8','1be67c71812a392451e90789c47667aeeb6c92d010f29f3f11735f4353e0e576',M],
  [DEER+'deer-doe.glb',REV_A,D],
  [DEER+`revisions/${REV_A}/${REV_A_SIDE}/deer-doe.glb`,REV_A,REV],
  [DEER+`revisions/${REV_B}/${REV_B_SIDE}/deer-doe.glb`,REV_B,REV],
].map(([path,sha256,note])=>({path,sha256,waives:['noassertion','no-license'],waitingOn:WAIT,note,since:'2026-10-04',reviewBy:'2026-12-31'}));

const sha256Of=bytes=>createHash('sha256').update(bytes).digest('hex');
function walk(dir,out=[],links=[]){
  for(const entry of readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name<b.name?-1:1)){
    const path=join(dir,entry.name);
    if(entry.isSymbolicLink())links.push(path);
    else if(entry.isDirectory())walk(path,out,links);
    else if(entry.isFile())out.push(path);
  }
  return out;
}
const ext=path=>{const i=path.lastIndexOf('.');return i<0?'':path.slice(i).toLowerCase();};
const posix=(root,path)=>relative(root,path).split(sep).join('/');

// A sidecar binds bytes only through a structured field: some object has sha256 === <hash>.
function bindsHash(value,hash){
  if(Array.isArray(value))return value.some(v=>bindsHash(v,hash));
  if(!value||typeof value!=='object')return false;
  if(typeof value.sha256==='string'&&value.sha256.toLowerCase()===hash)return true;
  return Object.values(value).some(v=>bindsHash(v,hash));
}
// Licence declarations anywhere in a sidecar: license:{expression}, license:"<string>", flat
// licenseExpression. A value that is not a string is reported as '' (invalid).
function licenseExpressions(value,out=[]){
  if(Array.isArray(value)){for(const v of value)licenseExpressions(v,out);}
  else if(value&&typeof value==='object'){
    const l=value.license;
    if(typeof l==='string')out.push(l);
    else if(l&&typeof l==='object'&&'expression' in l)out.push(typeof l.expression==='string'?l.expression:'');
    if('licenseExpression' in value)out.push(typeof value.licenseExpression==='string'?value.licenseExpression:'');
    for(const v of Object.values(value))licenseExpressions(v,out);
  }
  return out;
}

export function scanProvenance(root,{today,allowlist=[],roots=SCAN_ROOTS}={}){
  const violations=[],checked=[],used=new Set();
  const byPath=new Map(allowlist.map(entry=>[entry.path,entry]));
  const push=(path,rules,extra={})=>violations.push({path,rules,...extra});
  for(const scan of roots){
    const links=[];
    const files=walk(join(root,scan.dir),[],links); // a missing or unreadable root throws: the gate must not scan nothing
    for(const l of links)push(posix(root,l),['symlink']);
    const cache=new Map();
    const json=path=>{if(!cache.has(path)){let v;try{v=JSON.parse(readFileSync(path,'utf8'));}catch{v=null;}cache.set(path,v);}return cache.get(path);};
    for(const file of files){
      const e=ext(file),rel=posix(root,file);
      if(NON_ASSET_EXT.has(e))continue;
      if(!ASSET_EXT.has(e)){push(rel,['unclassified-extension']);continue;}
      const hash=sha256Of(readFileSync(file));
      checked.push(rel);
      const dirs=[];let d=dirname(file);
      for(let i=0;i<=scan.sidecarUp;i++){dirs.push(d);d=dirname(d);}
      const sidecars=dirs.flatMap(x=>readdirSync(x).filter(n=>n.endsWith('.json')).map(n=>join(x,n))).filter(p=>bindsHash(json(p),hash));
      const found=[];
      if(!sidecars.length)found.push('no-sidecar');
      else{
        const all=sidecars.flatMap(p=>licenseExpressions(json(p)));
        if(!all.length)found.push('no-license');
        else if(all.some(x=>BAD_LICENSE.has(x.trim().toUpperCase())))found.push('noassertion');
      }
      if(!found.length)continue;
      const entry=byPath.get(rel);
      const changed=!!(entry&&entry.sha256&&entry.sha256!==hash);
      if(entry&&!changed&&found.every(r=>WAIVABLE.has(r))){used.add(rel);continue;}
      push(rel,found,{sidecars:sidecars.map(p=>posix(root,p)),...(changed?{message:'allowlisted bytes changed: re-review and re-pin'}:{})});
    }
  }
  for(const entry of allowlist){
    const bad=[];
    if(!realDate(entry.since)||!realDate(entry.reviewBy))bad.push('allowlist entry needs real ISO since and reviewBy dates');
    else{
      if(entry.reviewBy<=entry.since)bad.push('allowlist reviewBy must be after since');
      if(today&&entry.reviewBy<today)bad.push('allowlist entry expired '+entry.reviewBy+': resolve or re-review');
      if(today&&entry.since>today)bad.push('allowlist entry dated in the future');
    }
    if(!entry.waitingOn||!entry.note)bad.push('allowlist entry must name what it waits on and a note');
    if(!/^[0-9a-f]{64}$/.test(entry.sha256??''))bad.push('allowlist entry must pin a sha256');
    if(!Array.isArray(entry.waives)||!entry.waives.length||!entry.waives.every(r=>WAIVABLE.has(r)))bad.push('allowlist may waive only licence rules');
    if(!checked.includes(entry.path))bad.push('stale allowlist entry: file no longer exists');
    else if(!used.has(entry.path)&&!violations.some(v=>v.path===entry.path))bad.push('stale allowlist entry: file is already compliant, remove it');
    for(const message of bad)push(entry.path,['allowlist'],{message});
  }
  return {violations,checked,allowlisted:[...used]};
}

// The production gate uses the real clock; only synthetic tests inject a date.
const todayIso=()=>new Date().toISOString().slice(0,10);

test('every shipped asset has a hash-bound sidecar and a real licence, or a live dated, byte-pinned allowlist entry',()=>{
  const result=scanProvenance(REPO,{today:todayIso(),allowlist:ALLOWLIST});
  assert.ok(result.checked.length>=13,'scan found the shipped assets (a vacuous scan must not pass)');
  assert.ok(result.checked.some(p=>p.startsWith('assets/ground-materials-v1/runtime/')),'ground runtime textures are scanned');
  assert.deepEqual(result.violations,[]);
  assert.deepEqual(result.allowlisted.sort(),ALLOWLIST.map(e=>e.path).sort(),'the allowlist is exactly the set of non-compliant assets');
});

test('allowlist is explicit: exact public/ paths, no wildcards, unique, dated, pinned',()=>{
  const seen=new Set();
  for(const entry of ALLOWLIST){
    assert.ok(entry.path.startsWith('public/'),entry.path);
    assert.ok(!/[*?]/.test(entry.path),'no wildcard entries: '+entry.path);
    assert.ok(!seen.has(entry.path),'duplicate '+entry.path);seen.add(entry.path);
    assert.ok(realDate(entry.since)&&realDate(entry.reviewBy)&&entry.reviewBy>entry.since);
    assert.match(entry.sha256,/^[0-9a-f]{64}$/);
  }
});

// The gate must have teeth: prove each rule fires on a synthetic tree.
function fixture(build){
  const root=mkdtempSync(join(tmpdir(),'atlas-prov-'));
  try{return build(root);}finally{rmSync(root,{recursive:true,force:true});}
}
const put=(root,rel,data)=>{const p=join(root,rel);mkdirSync(dirname(p),{recursive:true});writeFileSync(p,data);return p;};
const sidecarFor=(bytes,expression)=>JSON.stringify({asset:{license:{expression}},content:{files:[{path:'x',sha256:sha256Of(bytes)}]}});
const ROOTS=[{dir:'public',sidecarUp:0}];
const scan=(root,o={})=>scanProvenance(root,{today:'2026-10-05',roots:ROOTS,...o});

test('negative: missing sidecar, NOASSERTION, absent licence and hash drift each fail; a compliant asset passes',()=>fixture(root=>{
  const good=Buffer.from('good'),bare=Buffer.from('bare'),noa=Buffer.from('noa'),nolic=Buffer.from('nolic'),drift=Buffer.from('drift');
  put(root,'public/a/good.glb',good);put(root,'public/a/good.glb.asset.json',sidecarFor(good,'CC0-1.0'));
  put(root,'public/b/bare.png',bare);
  put(root,'public/c/noa.glb',noa);put(root,'public/c/noa.asset.json',sidecarFor(noa,'NOASSERTION'));
  put(root,'public/d/nolic.ogg',nolic);put(root,'public/d/m.json',JSON.stringify({sha256:sha256Of(nolic)}));
  put(root,'public/e/drift.glb',drift);put(root,'public/e/drift.glb.asset.json',sidecarFor(Buffer.from('other bytes'),'MIT'));
  put(root,'public/f/readme.txt','not an asset');
  const {violations,checked}=scan(root);
  assert.equal(checked.length,5);
  assert.deepEqual(Object.fromEntries(violations.map(v=>[v.path,v.rules.join(',')])),
    {'public/b/bare.png':'no-sidecar','public/c/noa.glb':'noassertion','public/d/nolic.ogg':'no-license','public/e/drift.glb':'no-sidecar'});
}));

test('negative: a hash in prose or as a key does not bind; a malformed licence value fails',()=>fixture(root=>{
  const prose=Buffer.from('prose'),keyed=Buffer.from('keyed'),weird=Buffer.from('weird');
  put(root,'public/p/x.glb',prose);put(root,'public/p/note.json',JSON.stringify({license:{expression:'MIT'},notes:`derived from ${sha256Of(prose)}`}));
  put(root,'public/k/x.glb',keyed);put(root,'public/k/m.json',JSON.stringify({license:{expression:'MIT'},[sha256Of(keyed)]:true}));
  put(root,'public/w/x.glb',weird);put(root,'public/w/m.json',JSON.stringify({sha256:sha256Of(weird),license:{expression:{}}}));
  assert.deepEqual(Object.fromEntries(scan(root).violations.map(v=>[v.path,v.rules.join(',')])),
    {'public/p/x.glb':'no-sidecar','public/k/x.glb':'no-sidecar','public/w/x.glb':'noassertion'});
}));

test('negative: any bound NOASSERTION fails, even beside a licensed sidecar or an unrelated MIT',()=>fixture(root=>{
  const bytes=Buffer.from('mixed'),str=Buffer.from('str');
  put(root,'public/m/x.glb',bytes);put(root,'public/m/x.glb.asset.json',sidecarFor(bytes,'MIT'));put(root,'public/m/family.json',sidecarFor(bytes,'NOASSERTION'));
  put(root,'public/s/x.glb',str);put(root,'public/s/m.json',JSON.stringify({sha256:sha256Of(str),license:'NOASSERTION',other:{license:{expression:'MIT'}}}));
  assert.deepEqual(scan(root).violations.map(v=>v.rules[0]),['noassertion','noassertion']);
}));

test('negative: unclassified extensions, symlinks and a missing scan root fail instead of passing silently',()=>fixture(root=>{
  put(root,'public/u/model.xyz','dds');put(root,'public/u/ok.txt','fine');
  let linked=true;try{symlinkSync(join(root,'public/u/ok.txt'),join(root,'public/u/link.txt'));}catch{linked=false;}
  const rules=scan(root).violations.map(v=>v.path+':'+v.rules[0]);
  assert.ok(rules.includes('public/u/model.xyz:unclassified-extension'));
  if(linked)assert.ok(rules.includes('public/u/link.txt:symlink'));
  assert.throws(()=>scanProvenance(root,{today:'2026-10-05',roots:[{dir:'public/nope',sidecarUp:0}]}),/ENOENT/);
}));

test('negative: an ancestor sidecar binds only when sidecarUp allows it',()=>fixture(root=>{
  const bytes=Buffer.from('tex');
  put(root,'bundle/runtime/t.png',bytes);put(root,'bundle/b.asset.json',sidecarFor(bytes,'CC0-1.0'));
  assert.deepEqual(scanProvenance(root,{today:'2026-10-05',roots:[{dir:'bundle/runtime',sidecarUp:1}]}).violations,[]);
  assert.equal(scanProvenance(root,{today:'2026-10-05',roots:[{dir:'bundle/runtime',sidecarUp:0}]}).violations[0].rules[0],'no-sidecar');
}));

test('negative: allowlist waives only licence rules, pins bytes, expires, and cannot go stale',()=>fixture(root=>{
  const bytes=Buffer.from('listed');
  const p=put(root,'public/l/listed.glb',bytes);put(root,'public/l/listed.asset.json',sidecarFor(bytes,'NOASSERTION'));
  const entry={path:'public/l/listed.glb',sha256:sha256Of(bytes),waives:['noassertion'],waitingOn:'owner',note:'n',since:'2026-10-04',reviewBy:'2026-12-31'};
  assert.deepEqual(scan(root,{allowlist:[entry]}).violations,[]);
  const msgs=o=>scan(root,o).violations.map(v=>v.message||v.rules.join(',')).join('|');
  assert.match(msgs({today:'2027-01-01',allowlist:[entry]}),/expired/);
  assert.match(msgs({today:'2026-10-01',allowlist:[entry]}),/future/);
  assert.match(msgs({allowlist:[{...entry,reviewBy:'soon'}]}),/real ISO/);
  assert.match(msgs({allowlist:[{...entry,reviewBy:'2026-99-31'}]}),/real ISO/);
  assert.match(msgs({allowlist:[{...entry,sha256:undefined}]}),/pin a sha256/);
  assert.match(msgs({allowlist:[{...entry,waives:['no-sidecar']}]}),/only licence rules/);
  assert.match(msgs({allowlist:[{...entry,path:'public/l/gone.glb'}]}),/file no longer exists/);
  // replaced bytes: the entry no longer covers them
  writeFileSync(p,'replacement bytes');
  assert.match(msgs({allowlist:[entry]}),/no-sidecar|bytes changed/);
  writeFileSync(p,bytes);
  // the allowlist never waives a lost sidecar
  rmSync(join(root,'public/l/listed.asset.json'));
  assert.match(msgs({allowlist:[entry]}),/no-sidecar/);
  // already compliant: the entry must be removed
  put(root,'public/l/listed.asset.json',sidecarFor(bytes,'CC0-1.0'));
  assert.match(msgs({allowlist:[entry]}),/already compliant/);
}));
