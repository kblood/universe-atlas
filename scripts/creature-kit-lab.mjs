// Standalone Kit Lab delivery, built from the same committed source as its
// library. Every input is checked before the combined update writes Atlas.
import {createHash} from 'node:crypto';
import {existsSync,mkdtempSync,readFileSync,readdirSync,rmSync} from 'node:fs';
import {join,resolve,relative,dirname,basename} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
export const KIT_LAB_ROOT='public/animal-lab';
export const KIT_LAB_RECEIPT='vendor/creature-kit/LAB.json';
// Vite's HTML injection can leave CRCRLF when the source uses CRLF. Normalize
// runs before hashing/writing so the deployed receipt is idempotent on Windows.
const normalize=text=>text.replace(/\r+\n/g,'\n');
const lf=path=>normalize(readFileSync(path,'utf8'));
const digest=text=>createHash('sha256').update(text).digest('hex');
const git=(kit,...args)=>execFileSync('git',['-C',kit,...args],{encoding:'utf8'}).trim();
const files=root=>readdirSync(root,{recursive:true,withFileTypes:true}).filter(d=>d.isFile()).map(d=>relative(root,join(d.parentPath,d.name)).replace(/\\/g,'/')).sort();
function safePath(root,path){
  if(typeof path!=='string'||!path||path.includes('\\')||path.includes(':')||path.split('/').some(p=>!p||p==='.'||p==='..'))throw new Error(`invalid Kit Lab path ${path}`);
  return join(root,path);
}
export function prepareKitLab(repo,kit,packageManifest){
  // Earlier releases did not contain the standalone canonical page.
  const [major,minor]=packageManifest.kit.version.split('.').map(Number);if(major===0&&minor<3){
    if(existsSync(join(repo,KIT_LAB_RECEIPT)))throw new Error('Kit release predates installed standalone Lab; restore the prior Atlas version commit instead');
    return {writes:[],removes:[]};
  }
  const app='apps/creature-lab';
  if(git(kit,'status','--porcelain','--',app))throw new Error('Kit Lab sources must be committed before updating');
  const paths=git(kit,'ls-files','--',app).split('\n').filter(Boolean).sort();
  for(const p of [app+'/planet-skin.html',app+'/creature-lab.html',app+'/vite.config.mjs',app+'/src/planet-main.ts'])if(!paths.includes(p))throw new Error(`missing committed Kit Lab source ${p}`);
  if((major>0||minor>=7)&&!paths.includes(app+'/index.html'))throw new Error('missing committed Kit Animal Lab primary entry');
  const sources=paths.map(path=>{
    const text=lf(safePath(kit,path)),committed=normalize(execFileSync('git',['-C',kit,'show',`HEAD:${path}`],{encoding:'utf8'}));
    if(text!==committed)throw new Error(`Kit Lab source differs from pinned commit: ${path}`);
    return {path,sha256:digest(text)};
  });
  const pkg=JSON.parse(lf(join(kit,'package.json'))),vitePkg=JSON.parse(lf(join(kit,'node_modules/vite/package.json')));
  if(pkg.devDependencies?.vite!==vitePkg.version)throw new Error('Kit Lab Vite version differs from its committed build contract');
  const stage=resolve(mkdtempSync(join(tmpdir(),'creature-kit-lab-')));
  try{
    execFileSync(process.execPath,[join(kit,'node_modules/vite/bin/vite.js'),'build','--config',join(kit,app,'vite.config.mjs'),'--outDir',stage,'--emptyOutDir'],{cwd:kit,stdio:'inherit'});
    if(git(kit,'rev-parse','HEAD')!==packageManifest.kit.commit||[...sources,...packageManifest.sources].some(row=>digest(lf(safePath(kit,row.path)))!==row.sha256))throw new Error('Kit source changed during Lab build; retry from committed source');
    const entries=['planet-skin.html','creature-lab.html'];if(major>0||minor>=7)entries.push('index.html');
    const artifacts=files(stage);for(const entry of entries)if(!artifacts.includes(entry))throw new Error(`missing fresh Kit Lab entry ${entry}`);
    if(!artifacts.some(p=>p.endsWith('.js')))throw new Error('missing fresh Kit Lab JavaScript');
    const ts=createRequire(join(kit,'package.json'))(join(kit,'node_modules/typescript/lib/typescript.js'));
    for(const path of artifacts.filter(p=>p.endsWith('.js')))if(ts.createSourceFile(path,lf(join(stage,path)),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS).parseDiagnostics.length)throw new Error(`malformed Kit Lab JavaScript ${path}`);
    const writes=artifacts.map(path=>{safePath(stage,path);if(!/\.(?:html|js|css)$/.test(path))throw new Error(`unsupported Kit Lab artifact ${path}`);return {path:`${KIT_LAB_ROOT}/${path}`,text:lf(join(stage,path))};});
    for(const entry of entries){
      const html=lf(join(stage,entry));
      for(const match of html.matchAll(/(?:src|href)="([^"]+)"/g)){
        const target=match[1].split(/[?#]/)[0];if(!target)continue;if(/^(?:https?:|\/\/)/.test(target))throw new Error('Kit Lab entry must be self-contained');
        const path=target.replace(/^\.\//,'');if(!artifacts.includes(path))throw new Error(`Kit Lab entry references missing artifact ${target}`);
      }
    }
    const receiptPath=join(repo,KIT_LAB_RECEIPT),previous=existsSync(receiptPath)?JSON.parse(lf(receiptPath)):null;
    for(const row of previous?.files??[])safePath(join(repo,KIT_LAB_ROOT),row.path);
    const receipt={schema:'creature-kit-lab-1',kit:packageManifest.kit,vite:vitePkg.version,entry:entries.includes('index.html')?'index.html':'planet-skin.html',sources,files:writes.map(row=>({path:row.path.slice(KIT_LAB_ROOT.length+1),sha256:digest(row.text)}))};
    writes.push({path:KIT_LAB_RECEIPT,text:JSON.stringify(receipt,null,2)+'\n'});
    return {writes,removes:(previous?.files??[]).filter(row=>!artifacts.includes(row.path)).map(row=>`${KIT_LAB_ROOT}/${row.path}`)};
  }finally{
    if(dirname(stage)!==resolve(tmpdir())||!basename(stage).startsWith('creature-kit-lab-'))throw new Error('refusing cleanup outside Kit Lab staging');
    rmSync(stage,{recursive:true,force:true});
  }
}
export function kitLabDrift(repo,kit=null){
  const path=join(repo,KIT_LAB_RECEIPT);if(!existsSync(path)){
    const pkg=JSON.parse(lf(join(repo,'vendor/creature-kit/package/package.json'))),[major,minor]=pkg.version.split('.').map(Number);
    return major>0||minor>=3?['standalone Kit Lab receipt missing']:[];
  }
  const receipt=JSON.parse(lf(path)),rows=[],root=join(repo,KIT_LAB_ROOT),pkg=JSON.parse(lf(join(repo,'vendor/creature-kit/PACKAGE.json')));
  if(receipt.schema!=='creature-kit-lab-1'||receipt.kit.commit!==pkg.kit.commit||receipt.kit.version!==pkg.kit.version)rows.push('Kit Lab version/commit differs from runtime package');
  for(const row of receipt.files){const target=safePath(root,row.path);if(!existsSync(target)||digest(lf(target))!==row.sha256)rows.push(`animal-lab/${row.path}: artifact hash drift`);}
  for(const path of existsSync(root)?files(root):[])if(!receipt.files.some(row=>row.path===path))rows.push(`animal-lab/${path}: unmanifested artifact`);
  if(kit)for(const row of receipt.sources){const target=safePath(kit,row.path);if(!existsSync(target)||digest(lf(target))!==row.sha256)rows.push(`kit/${row.path}: Lab source changed; run update`);}
  return rows;
}
