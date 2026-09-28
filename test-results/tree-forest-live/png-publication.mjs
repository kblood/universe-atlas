import {readFile,readdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import path from 'node:path';
const dist=path.resolve(process.env.ATLAS_DIST??'dist');
const source=path.resolve(process.env.ATLAS_SOURCE??'.');
const signature=Buffer.from('89504e470d0a1a0a','hex');
const sha=b=>createHash('sha256').update(b).digest('hex');
async function walk(dir){const results=[];for(const e of await readdir(dir,{withFileTypes:true})){
  const p=path.join(dir,e.name);if(e.isDirectory())results.push(...await walk(p));else if(e.isFile()&&p.toLowerCase().endsWith('.png'))results.push(p);
}return results;}
const images=[];
for(const absolute of await walk(dist)){
  const relative=path.relative(dist,absolute),built=await readFile(absolute);
  assert.ok(built.subarray(0,8).equals(signature),`PNG signature ${relative}`);
  let original=null,originalPath=null;
  for(const candidate of [path.join(source,relative),path.join(source,'public',relative)]){
    try{original=await readFile(candidate);originalPath=path.relative(source,candidate);break;}
    catch(error){if(error.code!=='ENOENT')throw error;}
  }
  assert.ok(original,`published PNG has an inspectable source: ${relative}`);
  assert.ok(built.equals(original),`published PNG is byte-identical to source: ${relative}`);
  images.push({path:relative.replaceAll(path.sep,'/'),source:originalPath.replaceAll(path.sep,'/'),bytes:built.length,sha256:sha(built),matchesSource:true});
}
assert.ok(images.length>0);
const report={checkedAt:new Date().toISOString(),dist,source,images:images.length,allSignaturesValid:true,allMatchSource:true,results:images};
await writeFile(new URL('./png-publication.json',import.meta.url),JSON.stringify(report,null,2));
console.log(`${images.length} published PNGs have valid signatures and match their source bytes.`);
