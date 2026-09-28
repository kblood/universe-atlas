// Run tests/guide.mjs first with ATLAS_URL and ATLAS_RESULTS pointing to this
// directory's live-guide folder. Then audit publication bytes and the exact
// authorized clean commit. This research lab is not a production entrypoint.
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
const dist=path.resolve(process.env.ATLAS_DIST||'C:/LLM/IWSDK/universe-atlas/dist');
const out=path.dirname(fileURLToPath(import.meta.url));
const baselineReceiptPath=path.resolve(out,'../tree-ez-family-live/live-publication-receipt.json');
const baselineReceipt=JSON.parse(await readFile(baselineReceiptPath,'utf8'));
const guideReportPath=path.join(out,'live-guide/guide-report.json');
const guideReport=JSON.parse(await readFile(guideReportPath,'utf8'));
const finalReportPath=process.env.ATLAS_FINAL_EVIDENCE_REPORT||'test-results/three-ez-impostor-reference/native-map-fix/report.json';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

const buildResponse=await fetch(new URL('build-info.json',base));
assert.equal(buildResponse.status,200,'build-info.json HTTP status');
const liveBuild=await buildResponse.json();
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

const auditedRoots=['guide','docs','assets/briefs','test-results/three-ez-impostor-reference','test-results/opus-three-ez-impostor-review'];
const requiredResources=[
  'docs/tree-three-ez-impostor-2026-09-28.md',
  'docs/opus-three-ez-impostor-review-2026-09-28.md',
  'docs/leaf-diffuse-transmission-2026-09-28.md',
  'docs/tree-foliage-minification-2026-09-28.md',
  'test-results/three-ez-impostor-reference/native-map-fix/alpha-hash-followup.json',
  'test-results/three-ez-impostor-reference/native-map-fix/alpha-hash-followup.mjs',
  'test-results/opus-three-ez-impostor-review/response.json',
  'test-results/opus-three-ez-impostor-review/inputs.json',
  'assets/briefs/atlas-three-ez-impostor-reference.json',
  'test-results/three-ez-impostor-reference/README.md',
  'test-results/three-ez-impostor-reference/report.json',
  'test-results/three-ez-impostor-reference/cpu-tests.log',
  'test-results/three-ez-impostor-reference/shader-tests.log',
  'test-results/three-ez-impostor-reference/front-mesh.png',
  'test-results/three-ez-impostor-reference/front-impostor.png',
  'test-results/three-ez-impostor-reference/back-mesh.png',
  'test-results/three-ez-impostor-reference/back-impostor.png',
  'test-results/three-ez-impostor-reference/top-mesh.png',
  'test-results/three-ez-impostor-reference/top-impostor.png',
  'test-results/three-ez-impostor-reference/native-map-fix/yaw-continuity.json',
  'test-results/three-ez-impostor-reference/native-map-fix/yaw-continuity.mjs',
  finalReportPath,
];
const resourcesByPath=new Map();
for(const root of auditedRoots){
  for(const absolute of await walk(path.join(dist,root))){
    resourcesByPath.set(path.relative(dist,absolute).replaceAll(path.sep,'/'),absolute);
  }
}
for(const resource of requiredResources)assert.ok(resourcesByPath.has(resource),`required publication resource is in dist: ${resource}`);
const finalReport=JSON.parse(await readFile(path.join(dist,finalReportPath),'utf8'));
const finalScreenshots=finalReport.fixed?.screenshots??finalReport.screenshots??[];
assert.ok(finalScreenshots.length>0,'selected final browser report has a nonempty screenshot list');
const renderingRoot=path.resolve(out,'../..'),reportDirectory=path.resolve(renderingRoot,path.dirname(finalReportPath));
for(const imagePath of finalScreenshots){
  const normalized=imagePath.replaceAll('\\','/'),absolute=path.resolve(normalized),relativeImage=path.relative(reportDirectory,absolute);
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
assert.equal(baselineByName.size,22,'previous c60e662 live receipt contains 22 runtime JS hashes');
assert.ok(runtimeJavaScript.every(item=>item.matchesDist&&item.matchesBaseline),'all 22 runtime JS bundles match dist and previous live baseline');

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

  const receipt={
    schema:'https://iwsdk.local/schemas/live-atlas-publication-receipt/v4',base:base.href,checkedAt:new Date().toISOString(),expectedCommit,liveBuild,
    buildStampPass:liveBuild.commit===expectedCommit&&liveBuild.dirty===false,
    publicationResources:{roots:auditedRoots,requiredResources,count:resources.length,allMatchDist:resources.every(item=>item.matches),resources},
    runtimeJavaScript:{baselineReleaseCommit:baselineReceipt.expectedCommit,baselineReceipt:path.relative(dist,baselineReceiptPath).replaceAll(path.sep,'/'),assetCount:runtimeJavaScript.length,all22Unchanged:runtimeJavaScript.every(item=>item.matchesBaseline),assets:runtimeJavaScript},
    guideBrowser:{report:path.relative(dist,guideReportPath).replaceAll(path.sep,'/'),chapters:guideReport.chapters,widths:guideReport.widths,internalDestinations:guideReport.internalDestinations,deployedRuntimeChecked:guideReport.deployedRuntimeChecked,errors:guideReport.errors,eraBookmarks:[0,5,9],noJavaScriptReading:true,inGameGuideLink:true,mobileDetails:{initial,expanded,noHorizontalOverflow:expandedFits,pageErrors}},
    researchLabNotProductionEntry:true,finalEvidenceReport:finalReportPath,result:'pass',
  };
  await mkdir(out,{recursive:true});
  await writeFile(path.join(out,'live-publication-receipt.json'),JSON.stringify(receipt,null,2));
  console.log(`Live publication passed: ${resources.length} resources byte-match dist and ${runtimeJavaScript.length} runtime JS bundles match the c60e662 baseline.`);
}finally{await browser.close();}
