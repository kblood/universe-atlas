import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawn,execFileSync} from 'node:child_process';
import path from 'node:path';
const out='test-results/opus-near-far-family-review';mkdirSync(out,{recursive:true});
const sourceFiles=['src/forest-impostor.ts','src/planet-canopy.ts','src/forest-tree-catalogue.ts','src/tree-asset.ts','src/tree-species-recipe.ts','src/planet-forest.ts','docs/tree-forest-integration-2026-09-28.md','docs/compact-tree-families-2026-09-28.md','docs/tree-ez-family-2026-09-28.md','docs/offline-foliage-mips-2026-09-28.md','docs/tree-species-asset-contract-2026-09-28.md','docs/opus-tree-family-review-2026-09-28.md','test-results/compact-tree-families/README.md'];
const acceptance='C:/LLM/IWSDK/universe-atlas-acceptance/test-results/offline-foliage-mips/browser-run-2e00837/';
const evidence=[{source:acceptance+'families-offline-mips-close.png',name:'families-offline-mips-close.png',kind:'image'},{source:acceptance+'offline-mid-390m.png',name:'offline-mid-390m.png',kind:'image'},{source:acceptance+'report.json',name:'offline-mips-report.json',kind:'report'}];
const sha=b=>createHash('sha256').update(b).digest('hex');
const files=sourceFiles.map(file=>{const b=readFileSync(file);return {path:file,sha256:sha(b),content:b.toString('utf8')};});
const evidenceMeta=evidence.map(e=>{copyFileSync(e.source,`${out}/${e.name}`);const b=readFileSync(`${out}/${e.name}`);return {source:e.source,path:path.resolve(`${out}/${e.name}`),kind:e.kind,bytes:b.length,sha256:sha(b)};});
const revision=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),status=execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim();
const prompt=`You are conducting a genuine focused source-and-evidence review as Claude Opus 5.5. Do not edit files or execute commands. Read the supplied current source/docs snapshots and the two actual-game screenshots before judging. Inspect the copied offline-mip report only for relevant conditions/results, not as proof of visual success.

Question: the near/middle detailed tree families now load locally and use the canonical dated catalogue, while the existing far representation remains the analytic individual-tree proxy in src/forest-impostor.ts. The user expects a coherent realistic forest and has explicitly rejected another standalone impostor system or more toy-like lab output. What is the smallest credible implementation that closes the visible near/far family mismatch using the existing analytic far renderer? Give a concrete design and a bounded implementation/test sequence.

Please answer these points:
1. From current code, trace authoritative dated species eligibility/binding, deterministic recipe/variant/appearance, detailed family and height assignment, and far individual proxy write/shape inputs. Identify exactly where paths diverge and which facts are incomplete or heuristics.
2. Assess deriving family-specific proxy crown dimensions/shapes/tints from loaded Oak/Pine family assets and the SAME dated catalogue. Recommend concrete parameters/data to derive or reuse (for example conservative family crown envelope from GLB bounds/branch-level attributes, species recipe crown width/height and structural variant, bark/foliage colors and stable appearance). Say where resolution should happen and how to avoid a second catalogue or date/lifecycle model.
3. Propose the smallest runtime change to extend the EXISTING analytic proxy while preserving canonical IDs, exact date cohort, near/far ownership, water/habitat suppression, per-cell transforms, origin rebases, culling bounds and shadow behavior. Discuss family/height unsupported by current local assets (10–22 m) and whether to fall back to legacy or fitted proxy. Include what to cache per resident/slot and invalidation triggers (catalogue/date, identity, water, family load/unload, rebase).
4. Bound CPU/GPU memory/update work. Do not propose per-frame GLB parsing or per-tree dynamic geometry. Be explicit about the analytic shader's current one-draw/static-attribute setup and whether params suffice or need a small bounded attribute extension. Give tests that compare exact IDs/heights/recipe fingerprints, near/far continuity at ownership boundary, visibility/water/date changes, capacity/fallback behavior.
5. State what remains approximate/unproven visually. Inputs do not establish realistic far silhouettes, correct Oak/Pine crown fidelity, all biome performance, or whole-game acceptance. Do not claim mip acceptance is a family match: offline report records RTX 5090 texture-storage/readback and GL success for local sidecars; close and 390m captures are input evidence only, family transition remains pending.

Context: local detailed-tree path is a dev integration, not published default. Candidate Oak family F and Pine family v1e are packaged locally, with offline foliage sidecars; runtime family loader and UI are implemented locally. The authored detailed family supports canonical height input only in 10–22 m; unsupported heights/species still use legacy. Current diagnostic names far path legacy-canonical-canopy. Latest docs say family shapes and far crowns differ. Submitted working tree also has uncommitted worklist/broadphase experiment; distinguish present source code from committed/deployed status and do not assume its performance or acceptance. Parent notes family MIP browser plumbing was validated in a separate capture; close-to-390m visual comparison/matched family acceptance is pending.

Input provenance is in inputs.json. The two exact images come verbatim from C:/LLM/IWSDK/universe-atlas-acceptance/test-results/offline-foliage-mips/browser-run-2e00837; report copied alongside. Give a concise review around 900-1400 words, observed facts vs recommendations, cite relevant source file/line locations from the snapshots, prioritize minimum coherent implementation, and call out highest-risk correctness gap. No new generator, capture-impostor system, or unrelated rewrite.

READ THESE SCREENSHOTS:
${evidenceMeta.filter(e=>e.kind==='image').map(e=>e.path).join('\n')}

SOURCE/DOCUMENT SNAPSHOTS FOLLOW:
${files.map(f=>`FILE ${f.path} (SHA-256 ${f.sha256})\n${f.content}`).join('\n\n')}

Copied report path: ${evidenceMeta.find(e=>e.kind==='report').path}`;
writeFileSync(`${out}/prompt.txt`,prompt);
writeFileSync(`${out}/inputs.json`,JSON.stringify({capturedAt:new Date().toISOString(),revision,gitStatus:status,files:files.map(({content,...m})=>m),evidence:evidenceMeta,promptSha256:sha(prompt),model:'claude-opus-5-5',providerExpected:'firstParty'},null,2)+'\n');
const child=spawn('C:/Users/Caldor/.local/bin/claude.exe',['--print','--model','claude-opus-5-5','--effort','high','--output-format','json','--tools','Read','--allowedTools','Read','--strict-mcp-config','--disable-slash-commands','--no-session-persistence','--safe-mode','--permission-mode','dontAsk'],{windowsHide:true,stdio:['pipe','pipe','pipe']});
let stdout='',stderr='';child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');child.stdout.on('data',s=>stdout+=s);child.stderr.on('data',s=>stderr+=s);child.stdin.end(prompt);
child.on('error',e=>{writeFileSync(`${out}/error.txt`,String(e));process.exitCode=1;});
child.on('close',code=>{writeFileSync(`${out}/response.json`,stdout);writeFileSync(`${out}/stderr.txt`,stderr);console.log(JSON.stringify({code,responseBytes:stdout.length,stderrBytes:stderr.length,revision,evidence:evidenceMeta.map(({path,sha256})=>({path,sha256}))}));if(code)process.exitCode=code;});
