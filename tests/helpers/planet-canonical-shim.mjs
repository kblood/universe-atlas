/** Compile only the named historical herd/clock API from immutable git blobs.
 * This is a QA reference, never the production renderer or another population. */
import assert from 'node:assert/strict';
import {resolve,relative} from 'node:path';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
export const CANONICAL_ATLAS_PIN='f56fc9311bcd3c69c1341842a496a713584bee3f';
const sha=b=>createHash('sha256').update(b).digest('hex');
export async function prepareCanonicalShim(baselineRoot='C:/LLM/IWSDK/universe-atlas'){
 const require=createRequire(resolve(baselineRoot,'package.json')),esbuild=require('esbuild'),sources=new Map(),sourceRoot=resolve(baselineRoot,'src'),entry='export {faunaHerdAt,faunaMemberActivityAtWorldNs,faunaMemberActivityExactAtWorldNs,faunaRigSecondsAt,toSeconds} from "./fauna-runtime.ts";';
 const result=await esbuild.build({stdin:{contents:entry,resolveDir:sourceRoot,sourcefile:'canonical-f56-entry.mjs',loader:'js'},bundle:true,write:false,format:'esm',platform:'browser',target:'es2022',minify:false,treeShaking:true,metafile:true,plugins:[{name:'immutable-canonical-reference',setup(build){
  build.onResolve({filter:/^(three|#creature-kit\/planet)$/},args=>({path:args.path==='#creature-kit/planet'?'baseline-creature-kit/planet':'three',external:true}));
  build.onLoad({filter:/\.ts$/},args=>{const rel=relative(baselineRoot,args.path).replaceAll('\\','/');assert(rel.startsWith('src/')&&!rel.includes('../'),'only fixed baseline source tree');const bytes=execFileSync('git',['show',CANONICAL_ATLAS_PIN+':'+rel],{cwd:baselineRoot});sources.set(rel,{path:rel,sha256:sha(bytes)});return {contents:bytes.toString('utf8'),loader:'ts',resolveDir:resolve(args.path,'..')};});
 }}]});
 const module=Buffer.from(result.outputFiles[0].contents),receiptBytes=execFileSync('git',['show',CANONICAL_ATLAS_PIN+':vendor/creature-kit/PACKAGE.json'],{cwd:baselineRoot}),baselineKit=JSON.parse(receiptBytes),metadata={schema:'independent-canonical-browser-shim-1',atlasCommit:CANONICAL_ATLAS_PIN,entryExports:['faunaHerdAt','faunaMemberActivityAtWorldNs','faunaMemberActivityExactAtWorldNs','faunaRigSecondsAt','toSeconds'],sourceFiles:[...sources.values()].sort((a,b)=>a.path.localeCompare(b.path)),entrySha256:sha(entry),moduleSha256:sha(module),baselineKitPackageSha256:sha(receiptBytes),baselineKit:baselineKit.kit,compiler:{name:'esbuild',version:esbuild.version,target:'es2022',treeShaking:true}};
 const out='C:/LLM/IWSDK/Assets/_assetctl/planet-composer-migration-20261011/reference-canonical-f56';await mkdir(out,{recursive:true});await writeFile(out+'/canonical-f56.js',module);await writeFile(out+'/receipt.json',JSON.stringify(metadata,null,2));return {module,metadata,baselineKit};
}
