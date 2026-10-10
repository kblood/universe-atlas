/** Immutable old-source oracle survives cherry-picking this harness into new Kit code. */
import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const referenceCommit='f96a8c156ee4aaf304de9a129d06a6b1633c6452';
const files=['fauna-body-plan.ts','fauna-face.ts','fauna-appearance.ts','fauna-structural-appendages.ts','fauna-coat-fields.ts','fauna-coat-vocab.ts','creature-model.ts'];
export async function prepareFaunaReferenceBody(){
 const snapshot=process.env.FAUNA_REFERENCE_SNAPSHOT||'C:/LLM/IWSDK/Assets/_assetctl/animal-system-20261010/f96-body-browser-reference',served='test-results/f96-body-browser-reference';await mkdir(snapshot,{recursive:true});await mkdir(served,{recursive:true});
 let manifest;try{manifest=JSON.parse(await readFile(snapshot+'/manifest.json','utf8'));}catch(error){if(error.code!=='ENOENT')throw error;manifest={referenceCommit,files:{}};
  for(const file of files){const result=spawnSync('git',['show',referenceCommit+':src/'+file],{encoding:null,maxBuffer:4*1024*1024});if(result.status!==0)throw new Error('Original f96 source snapshot required; git history unavailable for '+file);
   await writeFile(snapshot+'/'+file,result.stdout);manifest.files[file]=createHash('sha256').update(result.stdout).digest('hex');}await writeFile(snapshot+'/manifest.json',JSON.stringify(manifest,null,2));}
 if(manifest.referenceCommit!==referenceCommit)throw new Error('Wrong original body reference version');
 for(const file of files){const bytes=await readFile(snapshot+'/'+file);if(createHash('sha256').update(bytes).digest('hex')!==manifest.files[file])throw new Error('Original body snapshot drift '+file);await copyFile(snapshot+'/'+file,served+'/'+file);}
 return {url:'/test-results/f96-body-browser-reference/fauna-body-plan.ts',manifest};
}
