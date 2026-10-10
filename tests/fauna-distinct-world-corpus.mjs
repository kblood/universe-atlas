/** Preserve actual runtime individual genomes for a genuinely distinct admission workload. */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root='C:/LLM/IWSDK/Assets/_assetctl/animal-system-20261010',input=process.env.FAUNA_WORLD_RECEIPT||root+'/kit-production-route/report.json';
const raw=await readFile(input),receipt=JSON.parse(raw),rows=[];
for(const world of receipt.worlds){const state=world.views.find(v=>v.clearance===20).state,animals=[...state.tiles.faunaDrawn].sort((a,b)=>a.id.localeCompare(b.id));
 assert(animals.length>=64);for(const animal of animals.slice(0,64))rows.push({id:animal.id,planetId:state.body.id,date:state.date.offsetNs,genome:animal.genome,position:animal.position,
  genomeDigest:createHash('sha256').update(JSON.stringify(animal.genome)).digest('hex')});}
assert.equal(rows.length,128);assert.equal(new Set(rows.map(r=>r.id)).size,128);assert.equal(new Set(rows.map(r=>r.genomeDigest)).size,128,'actual individual genomes must be distinct');
const out=process.env.ATLAS_RESULTS||root+'/actual-distinct-128';await mkdir(out,{recursive:true});
await writeFile(out+'/corpus.json',JSON.stringify({scope:'128 actual supplied individual genomes from dated production draw census; no new founder generation or additional phenotyping',sourceReceipt:input,sourceReceiptSha256:createHash('sha256').update(raw).digest('hex'),sourceBuild:receipt.build,rows},null,2));
console.log(JSON.stringify({ok:true,individuals:128,distinctGenomes:128,out}));
