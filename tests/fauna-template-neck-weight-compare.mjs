// Required actual candidate paths and a frozen before-file receipt. CPU only.
// node tests/fauna-template-neck-weight-compare.mjs before after frozen-before.json report.json [--allow-export-normalization-ulp]
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {inspectNeckAsset,compareNeckAssets,signature} from './helpers/fauna-neck-preservation.mjs';
const[beforeDir,afterDir,baselinePath,reportPath,...options]=process.argv.slice(2);
if(!beforeDir||!afterDir||!baselinePath||!reportPath)throw Error('Required before/after directories, frozen-before hash receipt and output report');
if(options.length>1||options.some(v=>v!=='--allow-export-normalization-ulp'))throw Error('Unknown comparison option');
const allowExportNormalizationUlp=options.includes('--allow-export-normalization-ulp');
const[before,after,baseline]=await Promise.all([inspectNeckAsset(beforeDir),inspectNeckAsset(afterDir),fs.readFile(baselinePath,'utf8').then(JSON.parse)]);
const result=compareNeckAssets(before,after,{allowExportNormalizationUlp});
if(signature(before.files)!==signature(baseline.files))result.failures.push({name:'originalCandidateFilesUnchanged',detail:'All original top-level source/GLB/maps/sidecar/manifest files must match frozen hashes'});
let sourceJustification=null;
if(allowExportNormalizationUlp){const manifest=JSON.parse(await fs.readFile(path.join(afterDir,'authoring-manifest.json'))),audit=manifest.axialFieldAudit;
 if(audit?.protectedVerticesChanged!==0||audit?.hindBearingVerticesChanged!==0)result.failures.push({name:'sourceProtectedWeightReceipt',detail:'axialFieldAudit must explicitly assert protectedVerticesChanged:0 and hindBearingVerticesChanged:0'});
 if(after.files['fauna-authoring-source.py']?.sha256!==manifest.authoringCodeSha256)result.failures.push({name:'sourceSnapshotMatchesManifest'});
 sourceJustification={reason:'Explicit optional exported-only one-float32-ULP storage envelope. Authoring receipt must prove exact protected source dictionaries; raw exact comparison remains separately reported. No new/dropped positive bone keys permitted.',authoringCodeSha256:manifest.authoringCodeSha256,protectedVerticesChanged:audit?.protectedVerticesChanged,hindBearingVerticesChanged:audit?.hindBearingVerticesChanged,maxUlps:1};
}
const compact=a=>({directory:a.directory,sourceSha256:a.sourceSha256,sidecarSha256:a.sidecarSha256,files:a.files,parts:a.parts.map(p=>({name:p.name,vertices:p.records.length,triangles:p.triangles.length,metadataSha256:signature(p.metadata),rawAttributeHashes:p.rawAttributeHashes}))});
const report={...result,ok:result.failures.length===0,weightSource:'Raw GLB JOINTS_0/WEIGHTS_0, never loader-normalized weights',allowExportNormalizationUlp,sourceJustification,
 scope:'Neck weights only on the original largest connected skin and inside the existing authored neck gate. All positive limb-bearing vertices, central abdomen, other connected components and all other parts protected. Exact sidecar bytes, semantic nonweight triangle geometry/winding/all morph channels/UV, neutral rig/binds, materials and embedded/external maps. All original candidate top-level files frozen. Default protected weights exact; optional one-ULP storage allowance requires source preservation receipts and identical positive bone keys. At most four nonnegative influences, sum1 within2e-7. No physical deformation or topology gates changed; this is preservation, not visual acceptance.',before:compact(before),after:compact(after)};
await fs.mkdir(path.dirname(path.resolve(reportPath)),{recursive:true});await fs.writeFile(reportPath,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({ok:report.ok,diagnostics:report.diagnostics,failures:report.failures.slice(0,12),failureCount:report.failures.length,report:reportPath}));assert.ok(report.ok,'Neck-only preservation failed');
