// Run tests/guide.mjs first with ATLAS_URL and ATLAS_RESULTS pointing to this
// directory's live-guide folder. Set ATLAS_REQUIRED_RESOURCES to a JSON array
// of the exact newly published paths supplied for this release, and
// ATLAS_FINAL_EVIDENCE_REPORT to the final reviewed browser report. Then audit
// publication bytes and the exact authorized clean commit. This verification
// harness is not a production entrypoint.
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
const baselineReceiptPath=path.resolve(out,'../tree-three-ez-live/live-publication-receipt.json');
const baselineReceipt=JSON.parse(await readFile(baselineReceiptPath,'utf8'));
const guideReportPath=path.join(out,'live-guide/guide-report.json');
const guideReport=JSON.parse(await readFile(guideReportPath,'utf8'));
assert.equal(baselineReceipt.expectedCommit,'6af378d30ff5f824bef3b3f2e48242a092d86077','runtime baseline must be the current 6af378d live release');
const finalReportPath=process.env.ATLAS_FINAL_EVIDENCE_REPORT;
assert.ok(finalReportPath,'ATLAS_FINAL_EVIDENCE_REPORT must name the final reviewed browser evidence report');
const requiredResources=JSON.parse(process.env.ATLAS_REQUIRED_RESOURCES||'null');
assert.ok(Array.isArray(requiredResources)&&requiredResources.length>0,'ATLAS_REQUIRED_RESOURCES must be a non-empty JSON array of exact published paths');
for(const resource of ['docs/leaf-diffuse-transmission-2026-09-28.md','docs/opus-leaf-transmission-review-2026-09-28.md','docs/tree-foliage-minification-2026-09-28.md'])
  assert.ok(requiredResources.includes(resource),`required resource list includes ${resource}`);
assert.ok(requiredResources.includes(finalReportPath),'required resource list includes the final reviewed browser report');
const finalReportAbsolute=path.resolve(dist,finalReportPath),finalReportRelative=path.relative(dist,finalReportAbsolute);
assert.ok(finalReportRelative&&!path.isAbsolute(finalReportRelative)&&finalReportRelative!=='..'&&!finalReportRelative.startsWith(`..${path.sep}`),'final report path stays inside dist');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

const buildResponse=await fetch(new URL('build-info.json',base));
assert.equal(buildResponse.status,200,'build-info.json HTTP status');
const liveBuildBytes=Buffer.from(await buildResponse.arrayBuffer()),localBuildBytes=await readFile(path.join(dist,'build-info.json'));
assert.ok(liveBuildBytes.equals(localBuildBytes),'live build-info.json matches the exact local dist bytes');
const liveBuild=JSON.parse(liveBuildBytes.toString('utf8'));
assert.equal(liveBuild.commit,expectedCommit,'live build equals exact authorized source SHA');
assert.equal(liveBuild.dirty,false,'live build came from a clean source checkout');

async function walk(dir){
  const entries=await readdir(dir,{withFileTypes:true}),found=[];
  for(const entry of entries){
    const absolute=path.join(dir,entry.name);
    if(entry.isDirectory())found.push(...await walk(absolute));
    else if(entry.isFile())found.push(absolute);
  }
  return found;
}

const auditedRoots=['guide','docs','src','assets/briefs','test-results/tree-foliage-temporal','test-results/tree-leaf-transmission','test-results/opus-leaf-transmission-review'];
const resourcesByPath=new Map();
for(const root of auditedRoots){
  for(const absolute of await walk(path.join(dist,root))){
    resourcesByPath.set(path.relative(dist,absolute).replaceAll(path.sep,'/'),absolute);
  }
}
for(const resource of requiredResources)assert.ok(resourcesByPath.has(resource),`required publication resource is in dist: ${resource}`);
const finalReport=JSON.parse(await readFile(finalReportAbsolute,'utf8'));
const finalScreenshots=[];
function collectScreenshots(value){
  if(typeof value==='string'&&/\.(png|jpe?g|webp)$/i.test(value))finalScreenshots.push(value);
  else if(Array.isArray(value))for(const item of value)collectScreenshots(item);
  else if(value&&typeof value==='object')for(const item of Object.values(value))collectScreenshots(item);
}
collectScreenshots(finalReport);
assert.ok(finalScreenshots.length>0,'selected final browser report has a nonempty screenshot list');
const renderingRoot=path.resolve(out,'../..'),reportDirectory=path.resolve(renderingRoot,path.dirname(finalReportPath));
for(const imagePath of finalScreenshots){
  const normalized=imagePath.replaceAll('\\','/'),absolute=path.isAbsolute(normalized)?path.resolve(normalized):path.resolve(reportDirectory,normalized),relativeImage=path.relative(reportDirectory,absolute);
  assert.ok(relativeImage&&!path.isAbsolute(relativeImage)&&relativeImage!=='..'&&!relativeImage.startsWith(`..${path.sep}`),`report image stays under its selected report directory: ${imagePath}`);
  const resource=`${path.posix.dirname(finalReportPath)}/${relativeImage.replaceAll(path.sep,'/')}`;
  assert.ok(resourcesByPath.has(resource),`final browser report image is included in dist: ${resource}`);
  if(!requiredResources.includes(resource))requiredResources.push(resource);
}

const resourcePaths=[...resourcesByPath.keys()].sort(),resources=new Array(resourcePaths.length);
let resourceCursor=0;
async function fetchResourceWorker(){
  while(resourceCursor<resourcePaths.length){
    const index=resourceCursor++,resourcePath=resourcePaths[index],local=await readFile(resourcesByPath.get(resourcePath));
    const response=await fetch(new URL(resourcePath,base)),remote=Buffer.from(await response.arrayBuffer());
    resources[index]={path:resourcePath,status:response.status,bytes:remote.length,localSha256:sha(local),remoteSha256:sha(remote),matches:response.status===200&&local.equals(remote)};
  }
}
await Promise.all(Array.from({length:6},()=>fetchResourceWorker()));
assert.ok(resources.every(item=>item.matches),'all guide/docs/brief/reference/browser resources match release dist byte-for-byte');

const baselineByName=new Map(baselineReceipt.runtimeJavaScript.assets.map(item=>[item.name,item.sha256]));
const localJsPaths=(await walk(path.join(dist,'assets'))).filter(file=>file.endsWith('.js'));
const runtimeJavaScript=[];
for(const absolute of localJsPaths){
  const name=path.basename(absolute),local=await readFile(absolute),response=await fetch(new URL(`assets/${name}`,base)),remote=Buffer.from(await response.arrayBuffer()),baselineSha256=baselineByName.get(name);
  runtimeJavaScript.push({name,status:response.status,sha256:sha(remote),localSha256:sha(local),baselineSha256,matchesDist:response.status===200&&local.equals(remote),matchesBaseline:!!baselineSha256&&sha(remote)===baselineSha256});
}
assert.equal(runtimeJavaScript.length,22,'game runtime JavaScript bundle count');
assert.equal(baselineByName.size,22,'6af378d live receipt contains 22 runtime JS hashes');
assert.ok(runtimeJavaScript.every(item=>item.matchesDist&&item.matchesBaseline),'all 22 runtime JS bundles match dist and the 6af378d live baseline');

assert.equal(guideReport.chapters,9,'guide browser test covered all chapters');
assert.deepEqual(guideReport.widths,[1440,390,320],'guide browser test covered desktop, mobile, narrow mobile');
assert.ok(guideReport.internalDestinations>0,'guide browser test followed internal destinations');
assert.equal(guideReport.deployedRuntimeChecked,true,'guide browser test exercised the deployed application');
assert.deepEqual(guideReport.errors,[],'guide browser test recorded no page, response or link errors');

const browser=await chromium.launch({headless:true,args:browserArgs});
try{
  const page=await browser.newPage({viewport:{width:320,height:800}}),pageErrors=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  await page.goto(new URL('guide/life.html',base).href);
  const initial=await page.locator('details').evaluateAll(nodes=>nodes.map(node=>({summary:node.querySelector('summary')?.textContent?.trim(),open:node.open})));
  assert.ok(initial.length>0,'life guide details are readable without JavaScript');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'life guide fits at 320px');
  await page.locator('details summary').first().click();
  const expanded=await page.locator('details').evaluateAll(nodes=>nodes.map(node=>({summary:node.querySelector('summary')?.textContent?.trim(),open:node.open})));
  assert.equal(expanded[0].open,true,'details can expand at mobile width');
  const expandedFits=await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);
  assert.equal(expandedFits,true,'expanded life guide has no horizontal overflow');
  assert.deepEqual(pageErrors,[],'mobile guide has no page errors');

  await page.goto(new URL('guide/time.html',base).href);
  await page.locator('#era-explorer').waitFor({state:'visible'});
  assert.equal(await page.locator('#era-select option').count(),10,'time chapter has all ten era anchors');
  for(const index of [0,5,9]){
    await page.locator('#era-select').selectOption(String(index));
    const target=new URL(await page.locator('#era-visit').getAttribute('href'),page.url());
    assert.ok(target.pathname.endsWith('/'),'era anchor links to the game route');
    assert.ok(target.searchParams.get('wv')?.startsWith('atlas-time-2,'),`era ${index} carries the exact time bookmark`);
    assert.ok(target.searchParams.has('mv')&&target.searchParams.has('bv'),`era ${index} preserves the camera and body bookmark`);
    assert.equal(await page.locator('#era-slider').inputValue(),String(index),`era ${index} updates its matching time control`);
  }

  const receipt={
    schema:'https://iwsdk.local/schemas/live-atlas-publication-receipt/v4',base:base.href,checkedAt:new Date().toISOString(),expectedCommit,liveBuild,
    buildStampPass:liveBuild.commit===expectedCommit&&liveBuild.dirty===false,buildInfoBytesMatch:true,
    publicationResources:{roots:auditedRoots,requiredResources,count:resources.length,allMatchDist:resources.every(item=>item.matches),resources},
    runtimeJavaScript:{baselineReleaseCommit:baselineReceipt.expectedCommit,baselineReceipt:path.relative(dist,baselineReceiptPath).replaceAll(path.sep,'/'),assetCount:runtimeJavaScript.length,all22UnchangedFrom6af378d:runtimeJavaScript.every(item=>item.matchesBaseline),assets:runtimeJavaScript},
    guideBrowser:{report:path.relative(dist,guideReportPath).replaceAll(path.sep,'/'),chapters:guideReport.chapters,widths:guideReport.widths,internalDestinations:guideReport.internalDestinations,deployedRuntimeChecked:guideReport.deployedRuntimeChecked,errors:guideReport.errors,exactEraAnchors:[0,5,9],noJavaScriptReading:true,inGameGuideLink:true,mobileDetails:{initial,expanded,noHorizontalOverflow:expandedFits,pageErrors}},
    researchLabNotProductionEntry:true,finalEvidenceReport:finalReportPath,result:'pass',
  };
  await mkdir(out,{recursive:true});
  await writeFile(path.join(out,'live-publication-receipt.json'),JSON.stringify(receipt,null,2));
  console.log(`Live publication passed: build stamp and ${resources.length} resources byte-match dist; ${runtimeJavaScript.length} runtime JS bundles match the 6af378d baseline.`);
}finally{await browser.close();}
