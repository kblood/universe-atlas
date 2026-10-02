// CPU-only; required actual before/after/head025 assets plus frozen baseline.
// node tests/fauna-template-shoulder-compare.mjs before after head025 frozen-before.json report.json
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {inspectShoulderAsset,compareShoulderAssets} from './helpers/fauna-shoulder-preservation.mjs';
import {signature,hash} from './helpers/fauna-neck-preservation.mjs';
const[beforeDir,afterDir,headDir,baselinePath,reportPath,...extra]=process.argv.slice(2);
if(!beforeDir||!afterDir||!headDir||!baselinePath||!reportPath||extra.length)throw Error('Required before-dir after-dir head025-dir frozen-before.json report.json; no tolerance/scope override flags');
const[before,after,head,baseline]=await Promise.all([inspectShoulderAsset(beforeDir),inspectShoulderAsset(afterDir),inspectShoulderAsset(headDir),fs.readFile(baselinePath,'utf8').then(JSON.parse)]);
for(const a of[before,after,head])assert.equal(a.sidecar.id,'atlas-deer-doe-v1','This anatomical region audit is specific to the authored deer');
assert.equal(head.sourceSha256,'9459a4b5a82dafaaad4746412f742b540325297bcc23408f09c5018bb2f360b3','Head reference must be the actual immutable025 export named in the shoulder handoff');
const result=compareShoulderAssets(before,after,head);
if(signature(before.files)!==signature(baseline.files))result.failures.push({name:'originalCandidateFilesUnchanged'});
const runtimeHashes={};for(const name of['fauna-template-motion.ts','fauna-template-browse.ts'])runtimeHashes[name]=hash(await fs.readFile(new URL('../src/'+name,import.meta.url)));
if(signature(runtimeHashes)!==signature(baseline.runtimeHashes))result.failures.push({name:'unchangedGaitAndBrowseRuntime',detail:{expected:baseline.runtimeHashes,actual:runtimeHashes}});
const compact=a=>({directory:a.directory,sourceSha256:a.sourceSha256,sidecarSha256:a.sidecarSha256,files:a.files});
const report={...result,ok:result.failures.length===0,auditVersion:'deer-shoulder-preservation-1',before:compact(before),after:compact(after),head025Reference:compact(head),runtimeHashes,weightSource:'Raw GLB JOINTS_0/WEIGHTS_0; loader-normalized values never compared',
 scope:'Only largest connected coat component inside the approved open X(.10,.78), Y(actual elbow,1.35) envelope can change. Hind-chain influences and all separate components/other material parts override the envelope. Exact neutral positions, all POSITION morph deltas, and oriented fully protected triangles; mixed triangles retain the oriented pattern of exact protected corners while editable corners use a wildcard. Exact protected raw weights: ULP distances reported diagnostically, never accepted as an implicit allowance. All27 anchors/inverse binds/defaults and full sidecar bytes exact; head025 anterior region plus separate head-weighted attachments checked independently. Original candidate files and gait/browse source bytes frozen.',
 limitations:'Geometry means POSITION and morph POSITION; UV, color, normal/tangent arrays and embedded/external rebakes are reported separately and may change under the approved rebake instruction. No shaded appearance equivalence claim. Mixed-triangle editable-corner placement and interior topology are not constrained beyond the envelope; unchanged whole-body topology/deformation/contact/bounds audits remain mandatory. Region limits are task-specific, not general deer anatomy or visual acceptance.'};
await fs.mkdir(path.dirname(path.resolve(reportPath)),{recursive:true});await fs.writeFile(reportPath,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({ok:report.ok,failures:report.failures,diagnostics:report.diagnostics.map(({beforeMixedTriangles,afterMixedTriangles,...row})=>row),head025:report.head025,report:reportPath}));assert.ok(report.ok,'Bounded shoulder preservation failed');
