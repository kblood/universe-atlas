import {readFileSync,writeFileSync,copyFileSync,mkdirSync} from 'node:fs';
import {execFileSync,spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
const out='test-results/opus-forest-work-capture-review';
const target='96997ec2114dc4ccf207fd5f53700dea8823afc7';
const sourceFiles=[
 'src/forest-ordered-work.ts','src/forest-patch-broadphase.ts','src/planet-forest.ts','src/planet-canopy.ts',
 'src/forest-presentation.ts','src/forest-census.ts','src/forest-census-worker.ts',
 'src/tree-captured-impostor.ts','src/tree-impostor-capture.ts','src/tree-impostor-filter.ts','src/tree-impostor-views.ts','src/tree-asset.ts','src/tree-impostor-lab.ts',
 'tests/forest-ordered-work.test.mjs','tests/forest-patch-broadphase.test.mjs','tests/planet-canopy-invalidation.test.mjs','tests/planet-canopy.test.mjs','tests/tree-impostor-capture.test.mjs'
];
const sourceSnapshots=sourceFiles.map(file=>{
 const b=execFileSync('git',['show',target+':'+file],{maxBuffer:20*1024*1024});
 return {path:file,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex'),content:b.toString('utf8')};
});
const supplementFiles=['src/planet-forest.ts','tests/planet-canopy-invalidation.test.mjs'];
const supplement=supplementFiles.map(file=>{
 const b=execFileSync('git',['show','98d8ff0:'+file],{maxBuffer:20*1024*1024});
 return {path:file,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex'),content:b.toString('utf8')};
});
const docs=['docs/captured-family-relighting-2026-09-28.md','test-results/family-capture/README.md','test-results/forest-work-refresh-96997ec/README.md','test-results/forest-work-refresh-96997ec/refresh-comparison.json'];
const docSnapshots=docs.map(file=>{const b=readFileSync(file);return {path:file,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex'),content:b.toString('utf8')};});
const files=[
 'test-results/family-capture/sidecar-surface-v1/report.json','test-results/family-capture/sidecar-surface-v1.log',
 'test-results/family-capture/sidecar-relight-v1/report.json','test-results/family-capture/sidecar-relight-v1.log',
 'test-results/family-capture/oak-capture-manifest.json','test-results/family-capture/pine-capture-manifest.json',
 'test-results/forest-work-refresh-96997ec/README.md','test-results/forest-work-refresh-96997ec/refresh-comparison.json','test-results/forest-work-refresh-96997ec/report.json',
 'test-results/forest-work-refresh-96997ec/stationary-6s.cpuprofile',
 'test-results/forest-work-refresh-96997ec/02-loaded-normal-ui.png','test-results/forest-work-refresh-96997ec/02b-date-return.png','test-results/forest-work-refresh-96997ec/05-retry-success.png',
 'test-results/family-capture/sidecar-grid17-relight-v1/report.json',
 'test-results/family-capture/sidecar-grid17-relight-v1/oak-coverage-weighted-mesh.png','test-results/family-capture/sidecar-grid17-relight-v1/oak-coverage-weighted-capture.png'
];
for(const d of ['sidecar-surface-v1','sidecar-relight-v1'])for(const name of [
 'oak-legacy-unassociated-mesh.png','oak-legacy-unassociated-capture.png','oak-coverage-weighted-mesh.png','oak-coverage-weighted-capture.png',
 'pine-legacy-unassociated-mesh.png','pine-legacy-unassociated-capture.png','pine-coverage-weighted-mesh.png','pine-coverage-weighted-capture.png'
])files.push('test-results/family-capture/'+d+'/'+name);
const evidence=files.map(file=>{
 const dest=path.join(out,'evidence',file.replaceAll('/','__'));mkdirSync(path.dirname(dest),{recursive:true});copyFileSync(file,dest);
 const b=readFileSync(dest);return {source:file,path:path.resolve(dest),bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')};
});
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const status=execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim();
const changed=execFileSync('git',['diff','--name-only',target+'..HEAD'],{encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);
const prompt=[
'Perform a focused source and evidence review of exact source commit '+target.slice(0,7)+'. The source snapshot below is obtained with git show at that exact commit. Review only the requested forest-work and captured-tree areas; do not edit code, run commands/builds, use GPU, or do broad generator research.',
'',
'Forest work: review per-patch invalidation journaling, bounded-key overflow behavior, snapshot/ack semantics (especially later same-key edits surviving an older ack), global invalidation superseding local keys, canonical cell ordering, and how the frozen movement-eye anchor is refreshed. Check motion reversal and stale skipped work, partial ordered-index edits, unresolved/pending-selection/hydrology/water/failure/hidden fallback conditions, ownership/retained ID-slot interactions, and whether any acknowledgement or skipped-state transition can lose work or starve.',
'',
'Captured-tree experiment: review per-view relighting contracts in tree-captured-impostor and its capture/loader/shader path: material inputs, normal/depth/class semantics, alpha and filtering, relight light/view sampling, shader reconstruction, log depth, shadow/aerial hooks, memory/update boundaries and cleanup. Distinguish code implemented from experimental assumptions. Compare sidecar-surface-v1 with sidecar-relight-v1 numerically and visually, identify gates still failing, and state whether the single relight view corrects the observed issue or merely trades errors. The grid17 experiment is a one-family follow-up: address the reported normal-distribution hypothesis (averaging normals may not preserve E[max(N·L,0)]), its measured brightness/coverage/depth/memory trade, and whether another grid-density step is justified.',
'',
'Acceptance evidence: the 96997ec normal UI/profile run served the exact clean build. It reports date return identity 16/16, near/far matched samples 16/16, controlled asset failure preserving the basic forest and retry success, no unexpected browser errors and GL error 0. In the 6-second stationary window: 0 full far-work refreshes/rebuilds, 79 incremental broadphase queries visiting 879 groups total, and 72 ordered-index membership changes; canopy revision advanced 879. Compared with d5, timing p50/p95 improved in this capture, but the documented comparison has different visible counts/pose and is descriptive only. Do not claim causal speedup.',
'',
'Supplemental post-target fix: commit 98d8ff0 changes the no-canopy epoch case and adds focused tests. Review only as a clearly labeled follow-up; do not attribute it to 96997ec. It makes absent canopy stable at epoch -1 while a present object without revision API remains conservative NaN.',
'',
'Prior visual gates remain open: sidecar reports are isolated 16 m LOD1 comparisons, not forest acceptance. Surface-v1 and relight-v1 have zero GL errors but are not fully visually correct. Inspect exact values and images rather than inferring success from shader compile. No production adoption conclusion.',
'',
'Exact source target: '+target+'. Evidence snapshot HEAD: '+head+'. Changed paths since target: '+JSON.stringify(changed)+'. Working tree status: '+JSON.stringify(status)+'.',
'',
'Evidence image paths:',
evidence.filter(x=>/\.png$/i.test(x.source)).map(x=>x.path).join('\n'),
'',
'Exact source snapshots and hashes:',
sourceSnapshots.map(f=>'SOURCE '+f.path+' bytes='+f.bytes+' sha256='+f.sha256+'\n'+f.content).join('\n\n'),
'',
'Supplemental 98d8ff0 source/test snapshots and hashes (not part of target):',
supplement.map(f=>'SUPPLEMENT '+f.path+' bytes='+f.bytes+' sha256='+f.sha256+'\n'+f.content).join('\n\n'),
'',
'Documentation snapshots and hashes:',
docSnapshots.map(f=>'DOC '+f.path+' bytes='+f.bytes+' sha256='+f.sha256+'\n'+f.content).join('\n\n'),
'',
'Raw reports/images are preserved under '+path.resolve(out)+'; file hashes/source locations are in inputs.json. Provide prioritized concrete findings, cite source/test paths, and avoid unsupported visual or performance claims.'
].join('\n');
writeFileSync(path.join(out,'prompt.txt'),prompt);
const inputs={capturedAt:new Date().toISOString(),targetCommit:target,evidenceHead:head,changedPathsSinceTarget:changed,workingTreeStatus:status,
 sourceSnapshots:sourceSnapshots.map(({content,...x})=>x),supplementalCommit:'98d8ff0',supplement:supplement.map(({content,...x})=>x),
 docSnapshots:docSnapshots.map(({content,...x})=>x),evidence,promptSha256:createHash('sha256').update(prompt).digest('hex'),
 model:'claude-opus-5-5',providerExpected:'firstParty'};
writeFileSync(path.join(out,'inputs.json'),JSON.stringify(inputs,null,2)+'\n');
const child=spawn('C:/Users/Caldor/.local/bin/claude.exe',['--print','--model','claude-opus-5-5','--effort','high','--output-format','json','--tools','Read','--allowedTools','Read','--strict-mcp-config','--disable-slash-commands','--no-session-persistence','--safe-mode','--permission-mode','dontAsk'],{windowsHide:true,stdio:['pipe','pipe','pipe']});
let stdout='',stderr='';child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');child.stdout.on('data',x=>stdout+=x);child.stderr.on('data',x=>stderr+=x);child.stdin.end(prompt);
child.on('error',e=>{writeFileSync(path.join(out,'error.txt'),String(e));process.exitCode=1;});
child.on('close',code=>{writeFileSync(path.join(out,'response.json'),stdout);writeFileSync(path.join(out,'stderr.txt'),stderr);console.log(JSON.stringify({code,responseBytes:stdout.length,stderrBytes:stderr.length,target,head,evidenceFiles:evidence.length,promptSha256:inputs.promptSha256}));if(code)process.exitCode=code;});
