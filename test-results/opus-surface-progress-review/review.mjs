import {readFileSync,writeFileSync,mkdirSync,copyFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawn,execFileSync} from 'node:child_process';
import path from 'node:path';
const out='test-results/opus-surface-progress-review';mkdirSync(out,{recursive:true});
const files=[
 'docs/desktop-realism-implementation-plan-2026-09-27.md',
 'docs/desktop-state-review-assessment-2026-09-28.md',
 'docs/surface-lighting-2026-09-28.md',
 'docs/tree-forest-integration-2026-09-28.md',
 'src/surface-lighting.ts','src/terrain-shadow.ts','src/forest-material.ts',
 'src/life-shadow-priority.ts','src/tree-foliage-mips.ts',
 'src/planet-forest.ts','src/planet-renderer.ts','src/planet-canopy.ts',
 'src/forest-tree-catalogue.ts','src/tree-species-recipe.ts',
 'test-results/surface-lighting/README.md',
];
const sha=b=>createHash('sha256').update(b).digest('hex');
const inputs=files.map(file=>{const b=readFileSync(file);return {path:file,sha256:sha(b),content:b.toString('utf8')};});
const images=['legacy-detailed-close.png','legacy-basic-close.png','family-default-mips-close.png','family-coverage-mips-close.png'];
const screenshots=images.map(name=>{const source=`test-results/surface-lighting/revised-run-2/${name}`,target=`${out}/${name}`;copyFileSync(source,target);return {source,path:path.resolve(target),sha256:sha(readFileSync(target))};});
const liveReport='test-results/surface-lighting/revised-run-2/report.json';
let extra='Latest revised browser run is still finishing. Its final acceptance is pending. The supplied close images already exist, and are frozen copies.';
if(existsSync(liveReport)){copyFileSync(liveReport,`${out}/luna-report.json`);extra='Revised browser report is available with Read at '+path.resolve(`${out}/luna-report.json`)+'. Inspect it for current measurements; do not assume every assertion means visual acceptance.';}
const prompt=`The user requests: Have Opus 5.5 do a review of where this is at so far. You previously reviewed revision 8e16776; this is an updated independent progress and direction review after local surface lighting, retained life packing, canopy lookup caching, and foliage mip integration. Read the FOUR supplied actual-game screenshots using Read before judging visuals. You may read current source/evidence files but cannot edit or execute commands. Return roughly 900-1400 words with your own priorities, observed facts versus hypotheses, concrete blockers and next deliverable. No completion percentage.

Full objective remains realistic desktop planets with seamless orbit/atmosphere/flight/walking, stable visible forests and animated deterministic fauna BEFORE landing, deterministic dated species/physical scale, bounded performance, normal asset loading, documentation and committed tested deployment. Quest later, no hardware floor chosen. User asks whether tree methods are established: current trees reuse pinned MIT EZ-Tree, Oak reference seed35729; Pine family is being adapted separately. Do not describe custom runtime integration as a newly invented botanical generator.

Status/limits:
- LIVE remains clean 8e16776; desktop Find Life and publication checks now passed (470 resources/295 PNG/9 chapters). New lighting and optimizations reviewed here are LOCAL, not published.
- Current committed runtime is 898a87f, HEAD8278952 is evidence only. Untracked forest-patch-broadphase helper is work in progress and NOT imported, exclude it from implemented features.
- Existing tests:69 initial lighting-related focused tests; later48 life/mip tests and52 canopy cache tests, not additive unique totals. TS/Vite build passes. Historical unrelated cosmology/history failures mean no whole-suite claim.
- Shared hemisphere fill and one local2048 shadow map,320m width1000m depth,32MiB estimated retained target. Terrain morph/edge-lock and tree coverage/wind shadow hooks match color. XR profile disabled but allocated shadow target remains retained. Lateral map-edge fade remains unimplemented.
- Current expensive CPU forest iteration still scans ~18k candidates. New per-frame currentPatch cache and retained life packing are integrated, actual gain pending. Initial close run measured ~53ms median frame and34ms planet CPU on RTX5090; GPU pass sum~11ms. These are full-mode sequential short samples, not isolated shadow cost or final hardware spec.
- Luna's latest first revised run found lifePackBuilds213->253 across five750ms samples in detailed mode although life/terrain/forest pending0 and stable counts683visible/18161cached. Basic mode held344 across all five samples. Cache hits16449, misses5621. Assertion stopped that first harness, preserved failure.json; continuation records this as unresolved data and continues asset checks. Identify plausible invalidation causes from source if useful; do not claim root cause proven.
- Detailed tree family F is development-loaded only, branching support only, canonical10-22m heights; physical species dimensions/structural variants and matching far canopy remain unfinished. Conifer candidate2LODs~13,168/3,476tri,2materials4textures8attributes, about16m; CPU validation only, no actual-game visual acceptance yet. It reuses upstream Pine and authored deterministic needle atlas.
- Foliage alpha coverage mip installation opt-in and synchronous CPU work during asset loading; no worker yet. Same map shared color/depth, per-atlas-cell coverage until tail. Actual close default vs coverage screenshots supplied; no implication pixel-identical frame/date across all images. Review alpha-density vs realism, lighting/scale/legacy mismatch. Current recipe dimensions cannot just scale whole trees nonuniformly because physical leaf cards would stretch.
- Proposed next code work: conservative patch-group forest broadphase skipping only complete current-water census groups entirely>=650m while preserving order and hysteresis; compact separate branching/spire family instance pools to avoid doubling hidden4096-slot batches. These are PROPOSALS, not implemented. Challenge whether this sequence best serves user-visible progress.

${extra}

Please assess current visual realism honestly, architecture/performance priorities, source-level correctness risks in these changes, and the minimum coherent normal-game deliverable before further publish. Prioritize only evidence-backed findings, with file/line references where possible; distinguish review from tests. Do not demand unrelated tech rewrites or further isolated labs unless justified. Include what should be stopped/deferred. These four views do not verify clouds, orbital travel, all biomes, fauna movement or date continuity.

Screenshots (Read each):
${screenshots.map(x=>x.path).join('\n')}

Source/evidence snapshot:
${inputs.map(x=>`FILE ${x.path}\n${x.content}`).join('\n\n')}`;
writeFileSync(`${out}/prompt.txt`,prompt);
writeFileSync(`${out}/inputs.json`,JSON.stringify({capturedAt:new Date().toISOString(),revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),gitStatus:execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),files:inputs.map(({content,...m})=>m),screenshots,promptSha256:sha(prompt)},null,2)+'\n');
const child=spawn('C:/Users/Caldor/.local/bin/claude.exe',['--print','--model','claude-opus-5-5','--effort','high','--output-format','json','--tools','Read','--allowedTools','Read','--strict-mcp-config','--disable-slash-commands','--no-session-persistence','--safe-mode','--permission-mode','dontAsk'],{windowsHide:true,stdio:['pipe','pipe','pipe']});
let stdout='',stderr='';child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');child.stdout.on('data',s=>stdout+=s);child.stderr.on('data',s=>stderr+=s);child.stdin.end(prompt);
child.on('error',e=>{writeFileSync(`${out}/error.txt`,String(e));process.exitCode=1;});
child.on('close',code=>{writeFileSync(`${out}/response.json`,stdout);writeFileSync(`${out}/stderr.txt`,stderr);console.log(JSON.stringify({code,responseBytes:stdout.length,stderrBytes:stderr.length}));if(code)process.exitCode=code;});
