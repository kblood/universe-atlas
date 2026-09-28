import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const base=new URL(process.env.ATLAS_URL||'https://dionysus.dk/webxr/IWSDK/universe-atlas/');
const dist=path.resolve(process.env.ATLAS_DIST||'C:/LLM/IWSDK/universe-atlas/dist');
const expected=process.env.ATLAS_EXPECTED_COMMIT;
assert.match(expected||'',/^[a-f0-9]{40}$/);
const sha=b=>createHash('sha256').update(b).digest('hex');
async function walk(dir){const entries=await readdir(dir,{withFileTypes:true}),out=[];for(const e of entries){const p=path.join(dir,e.name);if(e.isDirectory())out.push(...await walk(p));else if(e.isFile())out.push(p);}return out;}
const build=JSON.parse(await readFile(path.join(dist,'build-info.json'),'utf8'));
assert.equal(build.commit,expected);assert.equal(build.dirty,false);
const root=path.join(dist,'assets/forest/desktop-v1');
const files=(await walk(root)).sort();
const results=[];
for(const file of files){const rel=path.relative(dist,file).replaceAll(path.sep,'/');const local=await readFile(file);const response=await fetch(new URL(rel,base));const remote=Buffer.from(await response.arrayBuffer());results.push({path:rel,status:response.status,bytes:local.length,localSha256:sha(local),liveSha256:sha(remote),matches:response.status===200&&local.equals(remote)});}
assert.ok(results.length>0);assert.ok(results.every(x=>x.matches),'each public forest package file must byte-match release dist');
const report={ok:true,checkedAt:new Date().toISOString(),base:base.href,expectedCommit:expected,build,packageRoot:'assets/forest/desktop-v1',fileCount:results.length,bytes:results.reduce((n,x)=>n+x.bytes,0),allMatchDist:true,files:results};
await mkdir(path.dirname(process.argv[1]),{recursive:true});
await writeFile(new URL('./package-byte-audit.json',import.meta.url),JSON.stringify(report,null,2));
console.log(`Live package byte audit passed: ${results.length} files, ${report.bytes} bytes.`);
