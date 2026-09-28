// Run tests/guide.mjs first with ATLAS_URL and ATLAS_RESULTS set to this
// directory's live-guide folder. This audits a clean release against its exact
// local dist; unlike older receipts it makes no claim that runtime chunks are
// unchanged from a previous release.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile,readdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {browserArgs} from '../../tests/browser-options.mjs';

const base=new URL(process.env.ATLAS_URL||'https://dionysus.dk/webxr/IWSDK/universe-atlas/');
const expectedCommit=process.env.ATLAS_SOURCE_COMMIT;
assert.ok(expectedCommit,'ATLAS_SOURCE_COMMIT must be the exact authorized clean release SHA');
assert.match(expectedCommit,/^[a-f0-9]{40}$/,'ATLAS_SOURCE_COMMIT must be a full Git SHA');
const dist=path.resolve(process.env.ATLAS_DIST||'C:/LLM/IWSDK/universe-atlas/dist');
const out=path.dirname(fileURLToPath(import.meta.url));
const guideReportPath=path.join(out,'live-guide/guide-report.json');
const guideReport=JSON.parse(await readFile(guideReportPath,'utf8'));
const provenancePath='test-results/tree-forest-integration/hardware-family-f-verified/provenance.json';
const provenanceAbsolute=path.resolve(dist,provenancePath);
const provenance=JSON.parse(await readFile(provenanceAbsolute,'utf8'));
const requiredResources=JSON.parse(process.env.ATLAS_REQUIRED_RESOURCES||'null');
assert.ok(Array.isArray(requiredResources)&&requiredResources.length>0,'ATLAS_REQUIRED_RESOURCES must be a non-empty JSON array of exact published paths');
for(const resource of ['docs/tree-forest-integration-2026-09-28.md','test-results/tree-forest-integration/README.md',
  'test-results/tree-forest-integration/cpu.log','test-results/tree-forest-integration/acceptance.browser.mjs',
  'test-results/tree-forest-integration/hardware-family-f-verified/report.json'])
  assert.ok(requiredResources.includes(resource),`required resources include ${resource}`);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

const buildResponse=await fetch(new URL('build-info.json',base));
assert.equal(buildResponse.status,200,'build-info.json HTTP status');
const liveBuildBytes=Buffer.from(await buildResponse.arrayBuffer()),localBuildBytes=await readFile(path.join(dist,'build-info.json'));
assert.ok(liveBuildBytes.equals(localBuildBytes),'live build-info.json matches exact deployment checkout dist bytes');
const liveBuild=JSON.parse(liveBuildBytes.toString('utf8'));
assert.equal(liveBuild.commit,expectedCommit,'live build equals exact authorized source SHA');
assert.equal(liveBuild.dirty,false,'live build came from a clean source checkout');

async function walk(dir){
  const entries=await readdir(dir,{withFileTypes:true}),found=[];
  for(const entry of entries){
    const absolute=path.join(dir,entry.name);
    if(entry.isDirectory())found.push(...await walk(absolute));else if(entry.isFile())found.push(absolute);
  }
  return found;
}
const auditedRoots=['guide','docs','src','tests','assets/briefs','test-results/tree-forest-integration'];
const localResources=new Map();
for(const root of auditedRoots)for(const absolute of await walk(path.join(dist,root)))
  localResources.set(path.relative(dist,absolute).replaceAll(path.sep,'/'),absolute);
const allPngs=(await walk(dist)).filter(file=>file.toLowerCase().endsWith('.png'));
for(const absolute of allPngs){
  const bytes=await readFile(absolute),relative=path.relative(dist,absolute).replaceAll(path.sep,'/');
  assert.deepEqual([...bytes.subarray(0,8)],[0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a],`PNG signature is preserved in dist: ${relative}`);
  localResources.set(relative,absolute);
}
for(const resource of requiredResources)assert.ok(localResources.has(resource),`required publication resource is in dist: ${resource}`);

const integrationReportPath='test-results/tree-forest-integration/hardware-family-f-verified/report.json';
const integrationReport=JSON.parse(await readFile(localResources.get(integrationReportPath),'utf8'));
assert.equal(integrationReport.ok,true,'the published browser integration report records a pass');
assert.equal(integrationReport.glError,0,'the published browser integration report records no WebGL error');
assert.deepEqual(integrationReport.errors,[],'the published browser integration report records no page/console errors');
const artifactHashes=provenance.artifactsSha256;
assert.ok(artifactHashes&&typeof artifactHashes==='object','provenance receipt lists the preserved run artifacts');
const artifactPaths=Object.keys(artifactHashes).map(item=>item.startsWith('tree-forest-integration/')?`test-results/${item}`:`test-results/tree-forest-integration/${item}`);
const reportImages=artifactPaths.filter(item=>/\.(png|jpe?g|webp)$/i.test(item));
assert.equal(reportImages.length,4,'provenance lists the four named final browser screenshots');
const verifiedProvenanceArtifacts=[];
for(const [manifestKey,expectedHash] of Object.entries(artifactHashes)){
  const resource=manifestKey.startsWith('tree-forest-integration/')?`test-results/${manifestKey}`:`test-results/tree-forest-integration/${manifestKey}`;
  assert.ok(localResources.has(resource),`provenance artifact is included in release dist: ${resource}`);
  const local=await readFile(localResources.get(resource));
  const textArtifact=/\.(json|md)$/.test(resource),rawSha256=sha(local);
  const lfSha256=textArtifact?sha(Buffer.from(local.toString('utf8').replaceAll('\r\n','\n'))):null;
  const normalizedText=textArtifact&&rawSha256!==expectedHash;
  assert.equal(normalizedText?lfSha256:rawSha256,expectedHash,`published source artifact matches provenance: ${resource}`);
  verifiedProvenanceArtifacts.push({path:resource,manifestSha256:expectedHash,rawSha256,lfSha256,comparison:normalizedText?'LF-normalized text (autocrlf)': 'raw bytes'});
  if(!requiredResources.includes(resource))requiredResources.push(resource);
}

const paths=[...localResources.keys()].sort(),resources=new Array(paths.length);let cursor=0;
async function fetchWorker(){while(cursor<paths.length){const index=cursor++,resourcePath=paths[index],local=await readFile(localResources.get(resourcePath));
  const response=await fetch(new URL(resourcePath,base)),remote=Buffer.from(await response.arrayBuffer());
  resources[index]={path:resourcePath,status:response.status,bytes:remote.length,localSha256:sha(local),remoteSha256:sha(remote),matches:response.status===200&&local.equals(remote)};
}}
await Promise.all(Array.from({length:6},fetchWorker));
assert.ok(resources.every(item=>item.matches),'all published guide, docs, source, fixture and integration evidence bytes match dist');
console.log(`Publication byte audit passed: ${resources.length} local resources, including ${allPngs.length} signature-checked PNGs.`);

const localJs=(await walk(path.join(dist,'assets'))).filter(file=>file.endsWith('.js'));
assert.ok(localJs.length>0,'release dist contains production JavaScript chunks');
const runtimeJavaScript=[];
for(const absolute of localJs){const name=path.basename(absolute),local=await readFile(absolute),response=await fetch(new URL(`assets/${name}`,base)),remote=Buffer.from(await response.arrayBuffer());
  runtimeJavaScript.push({name,status:response.status,sha256:sha(remote),localSha256:sha(local),matchesDist:response.status===200&&local.equals(remote)});}
assert.ok(runtimeJavaScript.every(item=>item.matchesDist),'every production JavaScript asset matches release dist');

assert.equal(guideReport.chapters,9,'guide check covered all chapters');
assert.deepEqual(guideReport.widths,[1440,390,320],'guide check covered desktop and mobile widths');
assert.ok(guideReport.internalDestinations>0,'guide check followed same-origin destinations');
assert.equal(guideReport.deployedRuntimeChecked,true,'guide check opened the deployed app and in-game guide');
assert.deepEqual(guideReport.errors,[],'guide check recorded no browser/link errors');
const gameSmokePath=path.join(out,'game-smoke/report.json');
const gameSmoke=JSON.parse(await readFile(gameSmokePath,'utf8'));
assert.equal(gameSmoke.expectedCommit,expectedCommit,'separate desktop game smoke tested the exact published commit');
assert.equal(gameSmoke.build.commit,expectedCommit);assert.equal(gameSmoke.build.dirty,false);
assert.equal(gameSmoke.ok,true,'1440px desktop game smoke passed');
assert.match(gameSmoke.renderer,/NVIDIA GeForce RTX 5090/,'game smoke used the RTX 5090');
assert.equal(gameSmoke.glError,0);assert.deepEqual(gameSmoke.errors,[]);assert.deepEqual(gameSmoke.candidateRequests,[]);
const warmedForest=gameSmoke.phases.find(phase=>phase.name==='legacy-forest-warmed')?.state?.forest;
assert.ok(warmedForest?.visible>0&&warmedForest.fullCanopy?.trees>100000,'production legacy forest rendered and census completed');
assert.equal(warmedForest.fullCanopy.failures,0);
assert.equal(warmedForest.detailedTrees.ready,false,'no experimental tree family was loaded in the game smoke');
console.log('Guide report and separate RTX game-smoke report passed; checking live no-JS/mobile guide behavior.');

const browser=await chromium.launch({headless:true,args:browserArgs});
let verificationPage=null,stage='mobile-life-guide',observedErrors=[];
try{
  const page=await browser.newPage({viewport:{width:320,height:800}}),pageErrors=[];
  verificationPage=page;observedErrors=pageErrors;
  page.on('pageerror',e=>pageErrors.push(`page: ${e.message}`));
  page.on('console',message=>{if(message.type()==='error')pageErrors.push(`console: ${message.text()}`);});
  await page.goto(new URL('guide/life.html',base).href);
  const initial=await page.locator('details').evaluateAll(nodes=>nodes.map(n=>({summary:n.querySelector('summary')?.textContent?.trim(),open:n.open})));
  assert.ok(initial.length>0,'life guide details render without JavaScript');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'life chapter fits at 320px');
  await page.locator('details summary').first().click();
  const expanded=await page.locator('details').evaluateAll(nodes=>nodes.map(n=>({summary:n.querySelector('summary')?.textContent?.trim(),open:n.open})));
  assert.equal(expanded[0].open,true,'life guide details expand');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'expanded guide fits at 320px');
  assert.deepEqual(pageErrors,[],'mobile life guide has no page errors');

  await page.goto(new URL('guide/time.html',base).href);
  await page.locator('#era-explorer').waitFor({state:'visible'});
  assert.equal(await page.locator('#era-select option').count(),10,'all ten dated era anchors are present');
  for(const index of [0,5,9]){
    await page.locator('#era-select').selectOption(String(index));
    const target=new URL(await page.locator('#era-visit').getAttribute('href'),page.url());
    assert.ok(target.pathname.endsWith('/'),'era visits the game route');
    assert.ok(target.searchParams.get('wv')?.startsWith('atlas-time-2,'),`era ${index} contains versioned time bookmark`);
    assert.ok(target.searchParams.has('mv')&&target.searchParams.has('bv'),`era ${index} preserves camera/body bookmark`);
  }

  const receipt={schema:'https://iwsdk.local/schemas/live-atlas-publication-receipt/v5',base:base.href,checkedAt:new Date().toISOString(),expectedCommit,liveBuild,
    buildStampPass:true,buildInfoBytesMatch:true,publicationResources:{roots:auditedRoots,includeAllDistPng:true,pngCount:allPngs.length,allPngSignaturesValid:true,requiredResources,count:resources.length,allMatchDist:true,resources},
    productionJavaScript:{assetCount:runtimeJavaScript.length,allMatchDist:true,assets:runtimeJavaScript},
    guideBrowser:{report:'test-results/tree-forest-live/live-guide/guide-report.json',chapters:guideReport.chapters,widths:guideReport.widths,internalDestinations:guideReport.internalDestinations,errors:guideReport.errors,exactEraAnchors:[0,5,9],lifeDetails:{initial,expanded},inGameGuideLink:true},
    productionTreeAssetGuard:{rejected:gameSmoke.loader,candidateFamilyRequests:gameSmoke.candidateRequests,normalGameReady:true,detailedFamilyLoaded:warmedForest.detailedTrees.ready,legacyForest:{visible:warmedForest.visible,near:warmedForest.near,farTrees:warmedForest.fullCanopy.trees,failures:warmedForest.fullCanopy.failures},renderer:gameSmoke.renderer,glError:gameSmoke.glError,pageErrors:gameSmoke.errors,report:'test-results/tree-forest-live/game-smoke/report.json'},
    integrationEvidence:{report:integrationReportPath,imageCount:reportImages.length,provenanceArtifacts:verifiedProvenanceArtifacts},result:'pass'};
  await mkdir(out,{recursive:true});
  await writeFile(path.join(out,'live-publication-receipt.json'),JSON.stringify(receipt,null,2));
  console.log(`Live publication passed: exact clean build; ${resources.length} resources byte-match dist; ${runtimeJavaScript.length} JS assets match dist; production tree loader is guarded.`);
}catch(error){
  await mkdir(out,{recursive:true});
  const browserState=await verificationPage?.evaluate(()=>({ready:window.__atlas?.ready,state:window.__atlas?.state,camera:window.__atlas?.camera,
    date:window.__atlas?.date,lifeGate:window.__atlas?.lifeGate,forest:window.__atlas?.terrain?.tiles?.forest})).catch(()=>null);
  const failureScreenshot=path.join(out,'failure-guide-mobile.png');
  await verificationPage?.screenshot({path:failureScreenshot,fullPage:true}).catch(()=>{});
  await writeFile(path.join(out,'failure.json'),JSON.stringify({checkedAt:new Date().toISOString(),expectedCommit,liveBuild,stage,
    url:verificationPage?.url()??null,browserState,failureScreenshot:verificationPage?path.basename(failureScreenshot):null,
    errors:observedErrors,failure:String(error)},null,2));
  throw error;
}finally{await browser.close();}
