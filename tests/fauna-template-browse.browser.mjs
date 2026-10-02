// Direct candidate review; never stages assets or changes the public default.
// ATLAS_URL=http://127.0.0.1:5193/ node tests/fauna-template-browse.browser.mjs <candidate-directory> <fresh-output-directory> [--preflight] [--throat-only]
import assert from 'node:assert/strict';
import {readFile, readdir, mkdir, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join, resolve, relative, dirname, isAbsolute, sep} from 'node:path';
import {chromium} from 'playwright';
import {browserArgs} from './browser-options.mjs';
import {withGpuLock} from './helpers/gpu-lock.mjs';
import {FAUNA_REVIEW_SHADOWS} from '../src/fauna-review-lighting.ts';
import {validateFaunaTemplateSidecar} from '../src/fauna-template.ts';

const[directory,outputDirectory,...options]=process.argv.slice(2);
assert.ok(directory&&outputDirectory,'Required candidate directory and fresh review output directory');
assert.ok(options.every(option=>['--preflight','--throat-only'].includes(option)),'Unknown browse review option');
const source=resolve(directory),output=resolve(outputDirectory),inside=relative(source,output);
assert.ok(inside==='..'||inside.startsWith(`..${sep}`)||isAbsolute(inside),'Review output must be outside the preserved candidate directory');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
async function sourceHashes(){
  const entries=await readdir(source,{withFileTypes:true}),result={};
  for(const entry of entries.filter(e=>e.isFile()).sort((a,b)=>a.name.localeCompare(b.name)))result[entry.name]=hash(await readFile(join(source,entry.name)));
  return result;
}
const before=await sourceHashes(),sidecarBytes=await readFile(join(source,'fauna-template.json')),sidecar=JSON.parse(sidecarBytes);
assert.deepEqual(validateFaunaTemplateSidecar(sidecar),[],'Valid actual candidate sidecar required');
const glb=await readFile(join(source,sidecar.runtime)),expectedHash=hash(glb),expectedSidecarHash=hash(sidecarBytes);
const phenotypes=[
  {name:'adult',controls:{}},
  {name:'adult-short-neck',controls:{neckLength:-1}},
  {name:'adult-long-neck',controls:{neckLength:1}},
  {name:'juvenile',controls:{juvenile:1}},
  {name:'juvenile-long-neck',controls:{juvenile:1,neckLength:1}},
];
const poses=[{name:'neutral',time:0},{name:'lowered',time:3},{name:'returning',time:6.8}],frames=options.includes('--throat-only')?['throat']:['side','head','throat'];
const plan={source,output,expectedHash,expectedSidecarHash,phenotypes,poses,frames,materials:['textured','neutral'],screenshots:phenotypes.length*poses.length*frames.length*2,shadowMapSize:FAUNA_REVIEW_SHADOWS.mapSize};
assert.equal(plan.shadowMapSize,2048,'Use the shared accepted review shadow setup');
if(options.includes('--preflight')){console.log(JSON.stringify({ok:true,cpuOnly:true,...plan,sourceHashes:before},null,2));}
else{
  await mkdir(dirname(output),{recursive:true});await mkdir(output);
  await writeFile(join(output,'review-helper-source.mjs'),await readFile(new URL('./helpers/fauna-template-performance-scene.mjs',import.meta.url)));
  await writeFile(join(output,'browse-driver-source.ts'),await readFile(new URL('../src/fauna-template-browse.ts',import.meta.url)));
  await writeFile(join(output,'browser-fixture-source.mjs'),await readFile(new URL('./fauna-template-browse.browser.mjs',import.meta.url)));
  const errors=[],report={ok:false,...plan,sourceHashesBefore:before,sourceHashesAfter:null,sourcePreserved:false,cases:[],errors,
    scope:'Real candidate GLB and sidecar, no skin-weight override. Screenshots need separate anatomical/visual acceptance; no headset or biological-realism certification.',
    visualAcceptance:'pending human review',
    driverSourceSha256:hash(await readFile(new URL('../src/fauna-template-browse.ts',import.meta.url))),
    helperSourceSha256:hash(await readFile(new URL('./helpers/fauna-template-performance-scene.mjs',import.meta.url)))};
  try{
    await withGpuLock({owner:'fauna-template-browse-browser',timeoutMs:60000,retryMs:2000,staleMs:Infinity},async()=>{
      const browser=await chromium.launch({headless:true,args:browserArgs});
      const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
      try{
        page.on('pageerror',error=>errors.push(error.message));
        page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
        const base=new URL('.',process.env.ATLAS_URL||'http://127.0.0.1:5193/');
        const url=new URL('__fauna-browse-review.html',base).href,module=new URL('tests/helpers/fauna-template-performance-scene.mjs',base).href;
        const glbUrl=new URL(`__fauna-browse-assets/${expectedHash}/${sidecar.runtime}`,base).href;
        const sidecarUrl=new URL(`__fauna-browse-assets/${expectedSidecarHash}/fauna-template.json`,base).href;
        const served={glb:0,sidecar:0};
        await page.route(glbUrl,route=>{served.glb++;return route.fulfill({contentType:'model/gltf-binary',body:glb});});
        await page.route(sidecarUrl,route=>{served.sidecar++;return route.fulfill({contentType:'application/json',body:sidecarBytes});});
        await page.route(url,route=>route.fulfill({contentType:'text/html',body:`<!doctype html><html><head><link rel="icon" href="data:,"><title>Actual deer browse review</title></head><body><script type="module">import {createFaunaPerformanceScene} from ${JSON.stringify(module)};window.createBrowseScene=createFaunaPerformanceScene;</script></body></html>`}));
        await page.goto(url,{waitUntil:'networkidle'});await page.waitForFunction(()=>typeof window.createBrowseScene==='function');
        report.fixture=await page.evaluate(async options=>{window.browseScene=await window.createBrowseScene(options);return window.browseScene.metadata;},{glbUrl,sidecarUrl,expectedHash,expectedSidecarHash,shadowMapSize:FAUNA_REVIEW_SHADOWS.mapSize});
        assert.equal(report.fixture.sourceHash,expectedHash);assert.equal(report.fixture.sidecarHash,expectedSidecarHash);
        assert.ok(served.glb>0&&served.sidecar>0,'Both preserved candidate byte streams must actually load');report.servedCandidateRoutes=served;
        for(const phenotype of phenotypes){
          for(const neutralMaterial of [false,true])for(const pose of poses)for(const frame of frames){
            const result=await page.evaluate(options=>window.browseScene.reviewBrowse(options),{controls:phenotype.controls,time:pose.time,frame,neutralMaterial});
            assert.equal(result.sourceHash,expectedHash);assert.equal(result.sidecarHash,expectedSidecarHash);assert.equal(result.weightOverride,false);
            assert.ok(result.pose.actualMuzzle.every(Number.isFinite));assert.ok(result.pose.reachResidualM<1e-5,'Actual muzzle FK residual, not a visual realism score');
            for(const hoof of Object.values(result.hoofDiagnostics))assert.ok(hoof.maxDisplacementFromGroundedNeutralM<1e-6,'Neck posing must preserve actual planted hoof vertices');
            const filename=`${phenotype.name}-${neutralMaterial?'neutral-material':'textured'}-${pose.name}-${frame}.png`;
            await page.screenshot({path:join(output,filename)});
            report.cases.push({phenotype:phenotype.name,poseName:pose.name,screenshot:filename,...result});
          }
          console.log(JSON.stringify({completedPhenotype:phenotype.name,captures:report.cases.length,planned:plan.screenshots}));
        }
        report.teardown=await page.evaluate(()=>window.browseScene.dispose());assert.deepEqual(errors,[]);report.ok=true;
      }finally{await page.evaluate(()=>window.browseScene?.dispose()).catch(()=>{});await browser.close();}
    });
  }catch(error){report.error=error.stack??String(error);process.exitCode=1;}
  finally{
    report.sourceHashesAfter=await sourceHashes();report.sourcePreserved=JSON.stringify(before)===JSON.stringify(report.sourceHashesAfter);
    if(!report.sourcePreserved){report.ok=false;report.error=(report.error??'')+'\nCandidate source files changed during review';process.exitCode=1;}
    await writeFile(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
  }
  console.log(JSON.stringify({ok:report.ok,sourcePreserved:report.sourcePreserved,expectedHash,expectedSidecarHash,captures:report.cases.length,output,error:report.error}));
}
