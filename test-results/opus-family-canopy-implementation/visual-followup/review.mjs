import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawn,execFileSync} from 'node:child_process';
import path from 'node:path';
const out='test-results/opus-family-canopy-implementation/visual-followup';mkdirSync(out,{recursive:true});
const src=[
 {source:'C:/LLM/IWSDK/universe-atlas-acceptance/test-results/forest-asset-loading/normal-ui-ee26efa/02-loaded-normal-ui.png',name:'actual-game-loaded-normal-ui.png',kind:'image'},
 {source:'C:/LLM/IWSDK/universe-atlas-acceptance/test-results/forest-asset-loading/normal-ui-ee26efa/failure.json',name:'actual-game-run-record.json',kind:'report'},
 {source:'test-results/family-canopy/shader-ee26efa/families.png',name:'isolated-family-proxy-families.png',kind:'image'},
 {source:'test-results/family-canopy/shader-ee26efa/report.json',name:'isolated-family-proxy-report.json',kind:'report'}
];
const docs=['docs/authored-tree-distance-design-2026-09-28.md','docs/authored-tree-capture-2026-09-28.md','docs/family-canopy-2026-09-28.md','docs/tree-foliage-minification-2026-09-28.md','docs/opus-near-far-family-assessment-2026-09-28.md','docs/opus-5.5-tree-reconstruction-review-2026-09-28.md'];
const sourceFiles=['src/forest-impostor.ts','src/planet-canopy.ts','src/planet-forest.ts','src/tree-canopy-bounds.ts','src/tree-canopy-profile.ts','src/forest-tree-catalogue.ts','src/tree-asset.ts'];
const files=docs.map(file=>{const b=readFileSync(file);return {path:file,sha256:createHash('sha256').update(b).digest('hex'),bytes:b.length,content:b.toString('utf8')};});
const sources=sourceFiles.filter(file=>{try{readFileSync(file);return true;}catch{return false;}}).map(file=>{const b=readFileSync(file);return {path:file,sha256:createHash('sha256').update(b).digest('hex'),bytes:b.length,content:b.toString('utf8')};});
const evidence=src.map(x=>{copyFileSync(x.source,`${out}/${x.name}`);const b=readFileSync(`${out}/${x.name}`);return {source:x.source,path:path.resolve(`${out}/${x.name}`),kind:x.kind,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')};});
const revision=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),status=execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim();
const prompt=`This is a visual strategy follow-up to the source review saved at test-results/opus-family-canopy-implementation/review.md and the earlier paired-mip review under test-results/opus-near-far-family-review/. Read those, the included capture/design docs, the latest committed source snapshot, and both screenshots before answering. No source edits, commands, web research, builds, or GPU work.

Question: based on the actual-game screenshot and isolated family proxy render, is it credible to reach the user's desktop realism goal by calibrating the current 4-band analytic ellipsoid/cone proxy, or should the next prototype reuse and repair the already-existing actual-geometry capture/impostor pipeline? Give the smallest useful next visual gate. Do not propose a new tree generator or a third rendering system.

Images:
${evidence.filter(x=>x.kind==='image').map(x=>x.path).join('\n')}
Reports:
${evidence.filter(x=>x.kind==='report').map(x=>x.path).join('\n')}

Evidence qualifications from the records:
- The actual-game screenshot is served build ee26efa and was taken after loading the normal Trees UI. Its test run later failed at a hidden time-day-forward click; recorded browser errors are empty. This is an actual rendered frame, but the harness did not complete date navigation/acceptance. The screenshot is from local integration, not deployment.
- The isolated shader report says its scope was actual-family shader compile/render, not game acceptance. It records ok:true, but dirty:true, with source hashes in the report; preserve that distinction.
- The latest source checkpoint is 0e6e346. It includes a conservative AABB proxy-bounds correction, strict shared sidecar eligibility, derivative AA for Oak, atomic family validation, and fair retag cursor behavior. The supplied actual-game screenshot and isolated proxy render predate those corrections; assess them as evidence about the representation's shape/coverage, not as a test of 0e6e346.
- No fresh 600 m game screenshot is supplied. For a reference projection, at 1440 vertical pixels and 60-degree vertical FOV, a 16 m tree at 600 m is about 33 pixels high (10 m about 21 px; 22 m about 46 px). Treat this as the target size calculation, not evidence of capture quality.
- The existing capture prototype has a full-sphere 9×9, 128 px, 16 m source, but native intermediate-direction silhouette IoU was about .7203; 22 m/32 px has zero leaf-class coverage. It is not currently a winner or ready for integration. Its source/design docs describe corrections such as more useful view elevations, bounded height bins, alpha/normal/depth fixes and hemisphere lighting. Assess what to reuse/fix, not a wholesale new architecture.
- The current analytic approach preserves canonical individuals and ownership but draws band ellipsoids/cones and a legacy trunk; it cannot reproduce individual card holes, normal maps, or detailed lighting response. The uploaded image is evidence only, not a calibrated quality measurement.

Please make a decisive but bounded recommendation. Compare the two existing paths on realistic constraints: 32 px projected trees, per-view silhouette/coverage, pine sparsity, per-tree identity and ownership, current static slot buffers, height-class correctness, shader complexity, and memory. Consider the 0e6e346 improvements, but do not treat them as visually validated by pre-correction screenshots. Recommend one concrete next experiment preserving current canonical IDs, height/yaw/date and ownership buffers. Ideally specify a matched test at exact 16 m and one 32-pixel/600 m target, captured-axis plus an intermediate view, same LOD1 source, same light/date, and a second 10 or 22 m validation only if justified. State a reasonable measured decision criterion (silhouette/coverage/root/depth/error and budget) or explain why current evidence is insufficient. Do not claim “realism acceptance,” production readiness, or frame-rate improvement. Around 500–900 words; distinguish what screenshots show from inference.

Exact source/evidence hashes and snapshot status are recorded in inputs.json. Current source/docs snapshot:
${files.map(f=>`FILE ${f.path} SHA-256 ${f.sha256}\n${f.content}`).join('\n\n')}
Latest committed source checkpoint 0e6e346:
${sources.map(f=>`SOURCE ${f.path} SHA-256 ${f.sha256}\n${f.content}`).join('\n\n')}

For the prior analytic source, use the exact fbe3c26 snapshot embedded in test-results/opus-family-canopy-implementation/prompt.txt. For the capture pipeline, consult the current files named by the design/capture docs if needed; no other lab is part of this request.`;
writeFileSync(`${out}/prompt.txt`,prompt);
writeFileSync(`${out}/inputs.json`,JSON.stringify({capturedAt:new Date().toISOString(),revision,gitStatus:status,sourceCheckpoint:'0e6e346',screenshotBuild:'ee26efa',evidence,files:files.map(({content,...x})=>x),sources:sources.map(({content,...x})=>x),analyticReview:'test-results/opus-family-canopy-implementation/review.md',analyticSnapshot:'test-results/opus-family-canopy-implementation/prompt.txt',promptSha256:createHash('sha256').update(prompt).digest('hex'),model:'claude-opus-5-5',providerExpected:'firstParty'},null,2)+'\n');
const child=spawn('C:/Users/Caldor/.local/bin/claude.exe',['--print','--model','claude-opus-5-5','--effort','high','--output-format','json','--tools','Read','--allowedTools','Read','--strict-mcp-config','--disable-slash-commands','--no-session-persistence','--safe-mode','--permission-mode','dontAsk'],{windowsHide:true,stdio:['pipe','pipe','pipe']});let stdout='',stderr='';child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');child.stdout.on('data',s=>stdout+=s);child.stderr.on('data',s=>stderr+=s);child.stdin.end(prompt);child.on('error',e=>{writeFileSync(`${out}/error.txt`,String(e));process.exitCode=1;});child.on('close',code=>{writeFileSync(`${out}/response.json`,stdout);writeFileSync(`${out}/stderr.txt`,stderr);console.log(JSON.stringify({code,responseBytes:stdout.length,stderrBytes:stderr.length,revision,evidence:evidence.map(({path,sha256})=>({path,sha256}))}));if(code)process.exitCode=code;});
