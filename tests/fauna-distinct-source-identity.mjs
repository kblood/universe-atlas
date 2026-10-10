import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {buildQuadrupedBody} from '../src/fauna-body-plan.ts';
const root='C:/LLM/IWSDK/Assets/_assetctl/animal-system-20261010/actual-distinct-128',raw=await readFile(root+'/corpus.json'),corpus=JSON.parse(raw),admission=JSON.parse(await readFile(root+'/admission-report.json','utf8'));
assert.equal(createHash('sha256').update(raw).digest('hex'),admission.corpusSha256);
const indices=[0,1,15,16,31,63,64,65,79,95,111,127],rows=[];
for(const index of indices){const row=corpus.rows[index],r=admission.rows.find(r=>r.id===row.id),body=buildQuadrupedBody(row.genome),hash=createHash('sha256');
 for(const key of ['positions','normals','colors','skinIndex','skinWeight','index'])hash.update(new Uint8Array(body[key].buffer,body[key].byteOffset,body[key].byteLength));
 const digest=hash.digest('hex');assert.equal(digest,r.sourceDigest,`${row.id} original source-body bytes`);assert(r.accepted&&r.admitted&&r.sourceGenomeExact);rows.push({id:row.id,index,digest,originalBodyBytesEqual:true});}
await writeFile(root+'/source-identity-sample.json',JSON.stringify({ok:true,scope:'12 predetermined actual individual sources spanning both worlds and close/middle admission; original f96 builder compared to cold Kit0.4 worker SHA. Remaining116 rows were not independently rebuilt here.',rows},null,2));console.log(JSON.stringify({ok:true,sampled:rows.length}));
