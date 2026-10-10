import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {FaunaBonePaletteWriter} from '../src/fauna-skinned-batch.ts';
const bodyPath=process.env.KIT_BODY_MODULE,genomePath=process.env.KIT_GENOME_MODULE,posePath=process.env.KIT_POSE_MODULE;
if(!bodyPath||!genomePath||!posePath)throw new Error('KIT_BODY_MODULE, KIT_GENOME_MODULE and KIT_POSE_MODULE must name frozen Atlas entrypoints');
const bodyModule=await import(pathToFileURL(bodyPath).href),genomeModule=await import(pathToFileURL(genomePath).href),poseModule=await import(pathToFileURL(posePath).href);
const corpus=JSON.parse(await readFile('C:/LLM/IWSDK/Assets/_assetctl/animal-system-20261010/canonical-review-corpus-plus-worlds/corpus.json','utf8'));
const writer=new FaunaBonePaletteWriter(),rows=[];
for(const row of corpus.rows){
  if(row.seed){const g=genomeModule.realisticIndividualCreatureGenome(genomeModule.generateCreatureGenome(row.seed,row.archetype),row.id,0,row.stage,row.family);assert.deepEqual(g,row.genome);}
  const body=bodyModule.buildQuadrupedBody(row.genome),hash=createHash('sha256');for(const field of ['positions','normals','colors','skinIndex','skinWeight','index'])hash.update(new Uint8Array(body[field].buffer,body[field].byteOffset,body[field].byteLength));
  const digest=hash.digest('hex');assert.equal(digest,row.sourceDigest);assert.deepEqual(body.plan,row.plan);
  for(const p of row.poses){const pose=poseModule.quadrupedPoseAt(body.plan,p.member,p.activity,()=>0,p.phase*10,{behaviour:p.behaviour}),palette=new Float32Array(352);writer.write(body.plan,pose,palette);assert.deepEqual(Array.from(palette),p.palette);}
  rows.push({id:row.id,sourceDigest:digest,genomeEqual:row.seed?true:'actual captured genome supplied unchanged',planEqual:true,canonicalPalettesEqual:3});
}
const out=process.env.ATLAS_RESULTS||'test-results/animal-kit-frozen-identity';await mkdir(out,{recursive:true});await writeFile(out+'/report.json',JSON.stringify({bodyPath,genomePath,posePath,corpusSourceCommit:corpus.sourceCommit,rows,ok:true},null,2));console.log(JSON.stringify({ok:true,specimens:rows.length,palettes:rows.length*3}));
