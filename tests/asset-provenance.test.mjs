// Asset provenance gate (backlog task 21, AGENTS.md: "an asset without provenance is not shippable").
//
// Every binary asset under public/ (GLB/glTF, textures, audio, raw payloads) must
//  1. be bound to a sidecar: a sibling .json in the same directory that records the
//     file's exact sha256 (an `<file>.asset.json`, a family/mip manifest or an
//     authoring manifest all qualify), and
//  2. carry a real licence: every licence expression found in the bound sidecars is
//     present and is not NOASSERTION / NONE.
// The only escape is the explicit, dated ALLOWLIST below. Allowlist entries are exact
// paths, name the decision they wait for, and expire: an expired, stale (file gone or
// already compliant) or malformed entry fails the test, so the list can only shrink.
// Nothing here changes any asset; it only reads.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync,mkdirSync,readdirSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join,relative,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const REPO=fileURLToPath(new URL('../',import.meta.url));
const SCAN_ROOTS=['public'];
const ASSET_EXT=new Set(['.glb','.gltf','.png','.jpg','.jpeg','.webp','.ktx2','.basis','.hdr','.exr','.rgba8','.bin','.ogg','.wav','.mp3','.opus','.flac']);
const BAD_LICENSE=new Set(['NOASSERTION','NONE','']);
const DATE=/^\d{4}-\d{2}-\d{2}$/;

// Dated allowlist. Each entry waits on the owner's project/asset licence decision
// (backlog task 1 OWNER-DECISIONS, "the project licence") and must be re-reviewed by reviewBy.
const WAIT='backlog task 1: owner licence decision for original Atlas assets (project LICENSE, EZ-Tree derivative statement)';
const FOREST='public/assets/forest/desktop-v1/';
const DEER='public/assets/fauna/deer-doe-v1/';
const DEER_REV_A=DEER+'revisions/23233caf7427587e88ce74a25a347297d8e67da0fd6b0fa7c811b0c544d5a6b3/5d4caf2e1e7ba6faef5b36b1f450ae6caf0520063666f00fa371919ca5a19b60/deer-doe.glb';
const DEER_REV_B=DEER+'revisions/757f6c47b7cd769c86b5e1159637119a567bd66a8af2a4f173a5af1dda5c30b6/513c7766b1d8fc56b93eb01a30149ccb903c0aab8a89b542ae1396e91e54517e/deer-doe.glb';
export const ALLOWLIST=[
  [FOREST+'branching/oak-lod0.glb','NOASSERTION in asset sidecar; EZ-Tree geometry is MIT, Atlas textures original'],
  [FOREST+'branching/oak-lod1.glb','NOASSERTION in asset sidecar; EZ-Tree geometry is MIT, Atlas textures original'],
  [FOREST+'branching/foliage-mips.rgba8','NOASSERTION in foliage-mip manifest; derived from original Atlas leaf texture'],
  [FOREST+'spire/conifer-lod0.glb','NOASSERTION in asset sidecar; EZ-Tree geometry is MIT, Atlas textures original'],
  [FOREST+'spire/conifer-lod1.glb','NOASSERTION in asset sidecar; EZ-Tree geometry is MIT, Atlas textures original'],
  [FOREST+'spire/foliage-mips.rgba8','NOASSERTION in foliage-mip manifest; derived from original Atlas leaf texture'],
  [DEER+'deer-doe.glb','NOASSERTION in authoring manifest; original Blender-authored review candidate'],
  [DEER_REV_A,'retained historical revision bytes; NOASSERTION in authoring manifest'],
  [DEER_REV_B,'retained historical revision bytes; NOASSERTION in authoring manifest'],
].map(([path,note])=>({path,waitingOn:WAIT,note,since:'2026-10-04',reviewBy:'2026-12-31'}));

const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
function walk(dir,out=[]){
  for(const entry of readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name<b.name?-1:1)){
    const path=join(dir,entry.name);
    if(entry.isDirectory())walk(path,out);else if(entry.isFile())out.push(path);
  }
  return out;
}
const ext=path=>{const i=path.lastIndexOf('.');return i<0?'':path.slice(i).toLowerCase();};
const posix=(root,path)=>relative(root,path).split(sep).join('/');

// Collect licence expressions anywhere inside a sidecar: `license:{expression}` objects
// and flat `licenseExpression` strings. Returns [] when none is declared.
function licenseExpressions(value,out=[]){
  if(Array.isArray(value)){for(const v of value)licenseExpressions(v,out);}
  else if(value&&typeof value==='object'){
    if(value.license&&typeof value.license==='object'&&'expression' in value.license)out.push(String(value.license.expression??''));
    if(typeof value.licenseExpression==='string')out.push(value.licenseExpression);
    for(const v of Object.values(value))licenseExpressions(v,out);
  }
  return out;
}

export function scanProvenance(root,{today,allowlist=[],roots=SCAN_ROOTS}={}){
  const violations=[],checked=[];
  const used=new Set(),byPath=new Map(allowlist.map(entry=>[entry.path,entry]));
  const asks=[];
  for(const scanRoot of roots){
    let files;try{files=walk(join(root,scanRoot));}catch{continue;}
    const jsonCache=new Map();
    const json=path=>{if(!jsonCache.has(path)){let v=null;try{v=JSON.parse(readFileSync(path,'utf8'));}catch{}jsonCache.set(path,v);}return jsonCache.get(path);};
    for(const file of files){
      if(!ASSET_EXT.has(ext(file)))continue;
      const rel=posix(root,file),hash=sha256(readFileSync(file));
      checked.push(rel);
      const sidecars=readdirSync(dirname(file)).filter(name=>name.endsWith('.json')).map(name=>join(dirname(file),name))
        .filter(path=>readFileSync(path,'utf8').includes(hash));
      const found=[];
      if(!sidecars.length)found.push('no-sidecar');
      else{
        const expressions=sidecars.flatMap(path=>licenseExpressions(json(path)??{}));
        if(!expressions.length)found.push('no-license');
        else if(expressions.some(e=>BAD_LICENSE.has(e.trim().toUpperCase())))found.push('noassertion');
      }
      if(!found.length)continue;
      const entry=byPath.get(rel);
      if(entry){used.add(rel);continue;}
      violations.push({path:rel,rules:found,sidecars:sidecars.map(p=>posix(root,p))});
    }
  }
  for(const entry of allowlist){
    const bad=[];
    if(!DATE.test(entry.since??'')||!DATE.test(entry.reviewBy??''))bad.push('allowlist entry needs ISO since and reviewBy dates');
    else if(today&&entry.reviewBy<today)bad.push(`allowlist entry expired ${entry.reviewBy}: resolve or re-review`);
    if(!entry.waitingOn||!entry.note)bad.push('allowlist entry must name what it waits on and a note');
    if(!used.has(entry.path)&&!checked.includes(entry.path))bad.push('stale allowlist entry: file no longer exists');
    else if(!used.has(entry.path))bad.push('stale allowlist entry: file is already compliant, remove it');
    for(const message of bad)violations.push({path:entry.path,rules:['allowlist'],message});
  }
  return {violations,checked,allowlisted:[...used]};
}

const todayIso=()=>process.env.ATLAS_PROVENANCE_TODAY||new Date().toISOString().slice(0,10);

test('every public/ asset has a hash-bound sidecar and a real licence, or a live dated allowlist entry',()=>{
  const result=scanProvenance(REPO,{today:todayIso(),allowlist:ALLOWLIST});
  assert.ok(result.checked.length>=9,'scan found the shipped assets (a vacuous scan must not pass)');
  assert.deepEqual(result.violations,[]);
  assert.deepEqual(result.allowlisted.sort(),ALLOWLIST.map(e=>e.path).sort(),'the allowlist is exactly the set of non-compliant assets');
});

test('allowlist is explicit: exact public/ paths, no wildcards, unique, dated',()=>{
  const seen=new Set();
  for(const entry of ALLOWLIST){
    assert.ok(entry.path.startsWith('public/'),entry.path);
    assert.ok(!/[*?]/.test(entry.path),'no wildcard entries: '+entry.path);
    assert.ok(!seen.has(entry.path),'duplicate '+entry.path);seen.add(entry.path);
    assert.match(entry.since,DATE);assert.match(entry.reviewBy,DATE);assert.ok(entry.reviewBy>entry.since);
  }
});

// The gate must have teeth: prove each rule fires on a synthetic tree.
function fixture(build){
  const root=mkdtempSync(join(tmpdir(),'atlas-prov-'));
  try{return build(root);}finally{rmSync(root,{recursive:true,force:true});}
}
function put(root,rel,data){const p=join(root,rel);mkdirSync(dirname(p),{recursive:true});writeFileSync(p,data);return p;}
const sidecarFor=(bytes,expression)=>JSON.stringify({asset:{license:{expression}},content:{files:[{path:'x',sha256:sha256(bytes)}]}});

test('negative: missing sidecar, NOASSERTION, absent licence and hash drift each fail; a compliant asset passes',()=>fixture(root=>{
  const good=Buffer.from('good'),bare=Buffer.from('bare'),noa=Buffer.from('noa'),nolic=Buffer.from('nolic'),drift=Buffer.from('drift');
  put(root,'public/a/good.glb',good);put(root,'public/a/good.glb.asset.json',sidecarFor(good,'CC0-1.0'));
  put(root,'public/b/bare.png',bare);
  put(root,'public/c/noa.glb',noa);put(root,'public/c/noa.asset.json',sidecarFor(noa,'NOASSERTION'));
  put(root,'public/d/nolic.ogg',nolic);put(root,'public/d/m.json',JSON.stringify({sha256:sha256(nolic)}));
  put(root,'public/e/drift.glb',drift);put(root,'public/e/drift.glb.asset.json',sidecarFor(Buffer.from('other bytes'),'MIT'));
  put(root,'public/f/readme.txt','not an asset');
  const {violations,checked}=scanProvenance(root,{today:'2026-10-04'});
  assert.equal(checked.length,5);
  const by=Object.fromEntries(violations.map(v=>[v.path,v.rules.join(',')]));
  assert.deepEqual(by,{'public/b/bare.png':'no-sidecar','public/c/noa.glb':'noassertion','public/d/nolic.ogg':'no-license','public/e/drift.glb':'no-sidecar'});
}));

test('negative: a mixed sidecar set fails when any bound sidecar says NOASSERTION',()=>fixture(root=>{
  const bytes=Buffer.from('mixed');
  put(root,'public/m/x.glb',bytes);put(root,'public/m/x.glb.asset.json',sidecarFor(bytes,'MIT'));put(root,'public/m/family.json',sidecarFor(bytes,'NOASSERTION'));
  assert.deepEqual(scanProvenance(root,{today:'2026-10-04'}).violations.map(v=>v.rules[0]),['noassertion']);
}));

test('negative: allowlist suppresses once, then expiry, staleness and bad dates fail',()=>fixture(root=>{
  const bytes=Buffer.from('listed');
  put(root,'public/l/listed.glb',bytes);put(root,'public/l/listed.asset.json',sidecarFor(bytes,'NOASSERTION'));
  const entry={path:'public/l/listed.glb',waitingOn:'owner',note:'n',since:'2026-10-04',reviewBy:'2026-12-31'};
  assert.deepEqual(scanProvenance(root,{today:'2026-10-05',allowlist:[entry]}).violations,[]);
  assert.match(scanProvenance(root,{today:'2027-01-01',allowlist:[entry]}).violations[0].message,/expired/);
  assert.match(scanProvenance(root,{today:'2026-10-05',allowlist:[{...entry,reviewBy:'soon'}]}).violations[0].message,/ISO/);
  assert.match(scanProvenance(root,{today:'2026-10-05',allowlist:[{...entry,path:'public/l/gone.glb'}]}).violations.map(v=>v.message).join('|'),/stale allowlist entry: file no longer exists/);
  put(root,'public/l/listed.asset.json',sidecarFor(bytes,'CC0-1.0'));
  assert.match(scanProvenance(root,{today:'2026-10-05',allowlist:[entry]}).violations[0].message,/already compliant/);
}));
