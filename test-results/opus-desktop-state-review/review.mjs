import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawn,execFileSync} from 'node:child_process';
import path from 'node:path';
const out='test-results/opus-desktop-state-review';mkdirSync(out,{recursive:true});
const files=[
  'docs/desktop-realism-implementation-plan-2026-09-27.md',
  'docs/desktop-rendering-stage-c-2026-09-28.md',
  'docs/tree-forest-integration-2026-09-28.md',
  'docs/tree-foliage-minification-2026-09-28.md',
  'docs/canopy-runtime-integration-2026-09-28.md',
  'src/planet-forest.ts','src/tree-asset.ts','src/forest-tree-catalogue.ts','src/tree-species-recipe.ts',
  'test-results/tree-forest-integration/README.md',
  'test-results/tree-forest-live/second-run-failure.json',
];
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const inputs=files.map(file=>{const bytes=readFileSync(file);return {path:file,sha256:sha(bytes),content:bytes.toString('utf8')};});
const screenshots=[
  'test-results/tree-forest-integration/hardware-family-f-verified/detailed-forest-initial.png',
  'test-results/tree-forest-integration/hardware-family-f-verified/detailed-forest-after-movement.png',
];
const screenshotsMeta=screenshots.map(file=>({path:path.resolve(file),sha256:sha(readFileSync(file))}));
const prompt=`The user explicitly asks: "Have Opus 5.5 do a review of where this is at so far". Perform an independent CURRENT-STATE and DIRECTION review of Atlas desktop realism, not just another narrow code audit. Give your own take. You may use the Read tool to inspect the two supplied screenshot files; please actually inspect them before assessing visuals. No edits, commands, deployment, or additional agents. Source and evidence are supplied below. Return a practical review in about 1000-1500 words, with clear priority order and an explicit distinction between observed facts, inferences, and things unverified.

Full user objective: Implement the Atlas desktop realism and procedural life plan: consistent desktop rendering and measured performance, stable forest streaming and continuous canopy, deterministic species recipes with bounded structural variants and per-instance appearance, realistic terrain/vegetation assets and genome-compatible fauna. Preserve deterministic identity/time/physical scale; update docs and guide; commit progress in stages; use Luna 6 for testing/deployment assistance and genuine Opus 5.5 for reviews; deploy and validate committed stages. Desktop hardware floor remains open; Quest is later. User wants seamless orbit->atmosphere->low flight->walking, detail BEFORE landing, realistic forests/mountain ranges/terrain/clouds/animals with stable placement and moving fauna. They specifically questioned whether we were inventing tree methods rather than reusing existing ones. We admitted too much initial custom authoring and now use pinned EZ-Tree plus a tested Three.ez impostor reference. Do not shrink this objective to the prototype currently passing tests.

Current state at requested review:
- Source commit474c944 integrated explicit dev-loaded EZ-Tree-derived GLB family into actual canonical near/mid forest slots, dated species binding, per-instance brightness/wind, coverage/depth hooks, retained frame and shared atmosphere. Existing IDs/positions/yaw and10-22m heights preserved. One branching geometry family only; species physical traits/palettes/8 structuralvariants are not realized. Unsupported/spire/XR use legacy. Far crowns remain legacy. Family F is NOT packaged or enabled by default in production. This is an integration prototype.
- Publication9c0a821 documented it. Current LIVE release8e16776b20effaa1e2bd89a6de4b47654a1cae5e built clean; root confirmed livebuild stamp.8e additionally fixes an old publication bug: mixed file list read PNG asUTF8, corrupting old guide images. All295PNG now signature-valid and byte-identical to originals. No runtime change in that packaging fix.
-58focusedCPU/loader tests pass, tsc+Vite build pass. This is NOT the entire suite; historical cosmology/history failures remain outside these runs. Two genuine prior Opus source reviews found/fixed mid-session slot gaps and malformed catalogue exceptions. The followup found aerial composition and slot lifecycle correct but raised coldshadercompile, mixedhiddenvertexcost, incompleteuploaddiagnostics, errorcontainment and offcamera shadow concerns. No whole-game60fps or representative-midrange claim.
-Actual local game fixture on RTX5090D3D11 with leaf transmission.35: detailed counts[0,206]->[10,159] after316.87m; retained origin13->15; all8sampled IDs keep speciesId,recipe fingerprint,heightM,windPhase01 afterone-yearseekandreturn; all24vegetationmaterials have aerialhooks; GL0 and browsererrors[]. These are metadata/behavior checks, not pixelidenticalwind or visualacceptance. The supplied screenshots show this actual mixed detailed/legacy scene. All four snapshots also reported nearPresentNotInCensus=0,nearAbsentInCensus=0,farForcedClose=0. Shadowpass-specific tests absent in this gamefixture.
-Live guide passes9chapters at1440/390/320,92internaldestinations, timeera links/noJS/in-game link. Current liveverifier byteaudit passed470resources and295PNGs. BUT deployed actualgame smoke is unresolved: first attempt waitedonlyready and couldnotuseFindLife; second withcorrectdatedbookmarkreachedbody+settledcamera andclickedFindLife, then terrainCruise remainednullfor60s. Test used320px guideviewport forgame too. Cause unconfirmed (possible test/UIissue, possiblyruntime); Luna is collecting diagnostics, not claiming apppass. Include this uncertainty; do not label it a confirmed app regression or dismiss it as harnesswithout evidence.
-Screenshots from local integration are ALREADY PUBLIC documentation evidence. They contain legacy faceted trees alongside the new branching family; don't attribute every faceted crown to EZ-Tree. They are not screenshots of a new default production forest. Parent visual assessment: thin/sparse dark textured crowns and clear mismatch with legacycrowncoverage; actual scene still far from desktop realism.

Please evaluate:
1. Where are we relative to the FULL user's request, and what is actually shipped versus only proven in local tests?
2. Visual assessment from screenshots: canopy continuity, foliage/lighting, terrain, scale, animals, overallbelievability. Be clear that these2views do not cover orbit/clouds/allbiomes.
3. Are the architecture choices sound, and has the implementation/research/testing effort been prioritized well? Call out overengineering or stalled vertical progress if warranted. We need visible end-to-end improvement, not endless smaller passing labs.
4. Recommend the NEXT concrete deliverable and a short ordered path to production realism. Specify what to stop/defer. Prefer established techniques, existinggenerators and shared authored assets, boundeddeterministic variations. Current candidate nextstep is coverage-preserving alpha mips (Castaño/DirectXTex style) on existingsharedfoliagemap, followed by a separately measured real-MSAA alpha-to-coverage trial; neither addresses darkclosefoliage by itself. Challenge this order if another blocker matters more.
5. What limited but sufficient validation would justify enabling a realistic tree family in the game? Include full-game cost and normal user travel/date paths. No fabricatedperformancebudgets for unspecifiedhardware.

Screenshots to inspect with Read:
${screenshotsMeta.map(x=>x.path).join('\n')}

Source/evidence snapshots:
${inputs.map(x=>`FILE ${x.path}\n${x.content}`).join('\n\n')}`;
writeFileSync(`${out}/prompt.txt`,prompt);
writeFileSync(`${out}/inputs.json`,JSON.stringify({capturedAt:new Date().toISOString(),revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),gitStatus:execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),files:inputs.map(({content,...meta})=>meta),screenshots:screenshotsMeta},null,2));
const child=spawn('C:/Users/Caldor/.local/bin/claude.exe',['--print','--model','claude-opus-5-5','--effort','high','--output-format','json','--tools','Read','--allowedTools','Read','--strict-mcp-config','--disable-slash-commands','--no-session-persistence','--safe-mode','--permission-mode','dontAsk'],{windowsHide:true,stdio:['pipe','pipe','pipe']});
let stdout='',stderr='';child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');child.stdout.on('data',x=>stdout+=x);child.stderr.on('data',x=>stderr+=x);child.stdin.end(prompt);
child.on('error',error=>{writeFileSync(`${out}/error.txt`,String(error));process.exitCode=1;});
child.on('close',code=>{writeFileSync(`${out}/response.json`,stdout);writeFileSync(`${out}/stderr.txt`,stderr);console.log(JSON.stringify({code,bytes:stdout.length,stderrBytes:stderr.length}));if(code)process.exitCode=code;});
