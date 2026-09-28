import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,stat,readFile,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {browserArgs} from '../../tests/browser-options.mjs';

const base=process.env.ATLAS_URL??'http://127.0.0.1:5197/';
const out=resolve(process.env.ATLAS_RESULTS??'test-results/tree-leaf-transmission/browser-final');
const browser=await chromium.launch({headless:true,args:browserArgs});
const page=await browser.newPage({viewport:{width:1024,height:768},deviceScaleFactor:1});
const errors=[],failedRequests=[];
page.on('pageerror',error=>errors.push(error.message));
page.on('console',message=>{if(message.type()==='error'&&!message.text().startsWith('[vite] failed to connect to websocket.'))errors.push(message.text());});
page.on('requestfailed',request=>failedRequests.push(`${request.url()}: ${request.failure()?.errorText}`));
await mkdir(out,{recursive:true});
const report={url:base,output:out,viewport:{width:1024,height:768},hardwareEnabled:!!process.env.ATLAS_HARDWARE,
  scope:'Synthetic 256x256 linear-light shader calibration only; not tree realism, performance, or game acceptance.',
  errors,failedRequests,probes:[],screenshots:[],limitations:['No GPU performance claims.','The fixture uses one flat plane and synthetic lighting to isolate shader behavior.']};
for(const rel of ['../../src/tree-leaf-transmission.ts','../../src/leaf-transmission-lab.ts','../../leaf-transmission-lab.html']){
  const path=fileURLToPath(new URL(rel,import.meta.url)),bytes=await readFile(path),info=await stat(path);
  (report.source??={})[rel]={sha256:createHash('sha256').update(bytes).digest('hex'),mtime:info.mtime.toISOString()};
}
const url=new URL('leaf-transmission-lab.html',base).href;
try{
  if(typeof page.routeWebSocket==='function')await page.routeWebSocket('**/*',socket=>socket.close());
  await page.goto(url,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>!!window.__leafTransmissionLab,{timeout:30000});
  const renderer=await page.evaluate(()=>{
    const gl=window.__leafTransmissionLab.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');
    return {renderer:gl.getParameter(gl.RENDERER),vendor:gl.getParameter(gl.VENDOR),unmasked:ext?{renderer:gl.getParameter(ext.UNMASKED_RENDERER_WEBGL),vendor:gl.getParameter(ext.UNMASKED_VENDOR_WEBGL)}:null};
  });
  report.renderer=renderer;
  const probes=async cases=>page.evaluate(async cases=>{
    const lab=window.__leafTransmissionLab,out=[];
    const summarize=(result)=>{
      const pixels=result.pixels,center=result.center;let sum=0,max=0,covered=0;
      for(let i=0;i<pixels.length;i+=4){const v=.2126*pixels[i]+.7152*pixels[i+1]+.0722*pixels[i+2];sum+=v;if(v>max)max=v;if(pixels[i+3]>.001)covered++;}
      return {effective:result.effective,center,finite:result.finite,glError:result.glError,meanLuma:sum/(pixels.length/4),maxLuma:max,coveredPixels:covered,pixels};
    };
    for(const item of cases)out.push({name:item.name,result:summarize(lab.probe(item.options))});
    return out;
  },cases);
  const capture=async name=>{const path=join(out,name);await page.screenshot({path,fullPage:false});report.screenshots.push(path);};
  const compare=(a,b)=>{
    assert.equal(a.length,b.length);let max=0,sum=0,nonzero=0;
    for(let i=0;i<a.length;i++){const d=Math.abs(a[i]-b[i]);max=Math.max(max,d);sum+=d;if(d>1e-7)nonzero++;}
    return {maxAbs:max,meanAbs:sum/a.length,nonzeroValues:nonzero};
  };
  const checked=async cases=>{
    const results=await probes(cases);
    for(const item of results){assert.equal(item.result.finite,true,`${item.name}: finite readback`);assert.equal(item.result.glError,0,`${item.name}: no WebGL error`);}
    report.probes.push(...results.map(({name,result})=>({name,effective:result.effective,center:result.center,meanLuma:result.meanLuma,maxLuma:result.maxLuma,coveredPixels:result.coveredPixels,finite:result.finite,glError:result.glError})));
    return results;
  };

  const lightTypes=['directional','point','spot','area','hemi','ambient','probe','environment'];
  const zeroPairs=[];
  for(const light of lightTypes)zeroPairs.push({name:`plain-${light}`,options:{adapter:false,factor:0,light,specular:0}},{name:`adapted-zero-${light}`,options:{adapter:true,factor:0,light,specular:0}});
  const lightResults=await checked(zeroPairs);
  const lightParity={};
  for(let i=0;i<lightTypes.length;i++){
    const plain=lightResults[2*i].result.pixels,adapted=lightResults[2*i+1].result.pixels;
    lightParity[lightTypes[i]]=compare(plain,adapted);
    assert.ok(lightParity[lightTypes[i]].maxAbs<1e-7,`${lightTypes[i]} factor-zero adapter matches plain shader within float readback precision`);
  }
  report.zeroFactorLightParity=lightParity;

  const directionCases=[];
  for(const backLight of [false,true])for(const factor of [0,.5,1])directionCases.push({name:`directional-${backLight?'back':'front'}-T${factor}`,options:{adapter:true,light:'directional',backLight,backView:false,factor,tint:[1,1,1],specular:0}});
  const directional=await checked(directionCases);
  const directionMetrics={};
  for(let side=0;side<2;side++){
    const offset=side*3,baseResult=directional[offset].result,half=directional[offset+1].result,full=directional[offset+2].result;
    directionMetrics[side?'backLight':'frontLight']={T0:baseResult.meanLuma,T05:half.meanLuma,T1:full.meanLuma,centerT0:baseResult.center,centerT1:full.center};
  }
  assert.ok(directionMetrics.backLight.T1>directionMetrics.backLight.T0+1e-4,'opposite-side directional light contributes at full transmission');
  assert.ok(directionMetrics.frontLight.T1<directionMetrics.frontLight.T0-1e-4,'front diffuse contribution is reduced at full transmission');
  report.directionalTransmission=directionMetrics;
  await capture('directional-back-T1.png');

  const reverse=await checked([
    {name:'front-view-backlight-T1',options:{light:'directional',backLight:true,factor:1,specular:0}},
    {name:'back-view-backlight-T1',options:{light:'directional',backLight:true,backView:true,factor:1,specular:0}},
    {name:'back-view-frontlight-T1',options:{light:'directional',backLight:false,backView:true,factor:1,specular:0}},
  ]);
  report.faceFlip={frontViewBackLight:reverse[0].result.meanLuma,backViewBackLight:reverse[1].result.meanLuma,backViewFrontLight:reverse[2].result.meanLuma};
  assert.ok(report.faceFlip.backViewBackLight<1e-7,'light on the viewed back side is transmitted away from the surface');
  assert.ok(Math.abs(report.faceFlip.backViewFrontLight-report.faceFlip.frontViewBackLight)<1e-7,
    'camera face flipping preserves the opposite-side transmission response');

  const ambient=await checked([
    {name:'ambient-plain',options:{adapter:false,light:'ambient',factor:0,specular:0}},
    {name:'ambient-T1-white',options:{adapter:true,light:'ambient',factor:1,tint:[1,1,1],specular:0}},
    {name:'environment-T0',options:{light:'environment',factor:0,specular:0}},
    {name:'environment-T1-red-tint',options:{light:'environment',factor:1,tint:[1,0,0],specular:0}},
    {name:'environment-black-plain-specular',options:{adapter:false,light:'environment',baseColor:[0,0,0],factor:0,specular:1}},
    {name:'environment-black-adapted-specular',options:{adapter:true,light:'environment',baseColor:[0,0,0],factor:1,tint:[1,0,0],specular:1}},
  ]);
  report.ambientWhiteParity=compare(ambient[0].result.pixels,ambient[1].result.pixels);
  assert.ok(report.ambientWhiteParity.maxAbs<1e-6,'symmetric white ambient remains unchanged at T=1');
  report.environmentTintDelta=compare(ambient[2].result.pixels,ambient[3].result.pixels);
  assert.ok(report.environmentTintDelta.meanAbs>1e-5,'nonuniform environment responds to the opposite-hemisphere tint');
  report.environmentBlackSpecularParity=compare(ambient[4].result.pixels,ambient[5].result.pixels);
  assert.ok(report.environmentBlackSpecularParity.maxAbs<1e-7,'transmission does not replace environment specular over a black base');

  const oppositeBranches=[];
  for(const light of ['area','hemi','probe','environment'])oppositeBranches.push(
    {name:`plain-backview-${light}`,options:{adapter:false,light,backView:true,backLight:false,factor:0,specular:0}},
    {name:`transmission-backview-${light}`,options:{adapter:true,light,backView:true,backLight:false,factor:1,tint:[1,1,1],specular:0}},
  );
  const branchResults=await checked(oppositeBranches);
  report.oppositeHemisphereBranches=[];
  for(let i=0;i<oppositeBranches.length;i+=2){
    const plain=branchResults[i].result,through=branchResults[i+1].result;
    const delta=compare(plain.pixels,through.pixels);
    report.oppositeHemisphereBranches.push({light:oppositeBranches[i].options.light,plainMeanLuma:plain.meanLuma,transmissionMeanLuma:through.meanLuma,delta});
    assert.ok(delta.meanAbs>1e-6,`${oppositeBranches[i].options.light} opposite hemisphere produces a measurable response`);
  }

  const continuity=await checked([0,1e-8,1e-6,1e-4,.001].map(factor=>({name:`directional-front-T${factor}`,options:{light:'directional',factor,specular:0}})));
  report.smallFactorContinuity=continuity.map(({name,result},i)=>({name,meanLuma:result.meanLuma,maxDifferenceFromZero:i?compare(result.pixels,continuity[0].result.pixels).maxAbs:0}));
  assert.ok(report.smallFactorContinuity[1].maxDifferenceFromZero<1e-5,'tiny positive transmission has no visible branch discontinuity');

  const blackBase=await checked([
    {name:'black-base-plain-specular',options:{adapter:false,light:'directional',baseColor:[0,0,0],factor:0,specular:1}},
    {name:'black-base-adapted-specular',options:{adapter:true,light:'directional',baseColor:[0,0,0],factor:1,specular:1}},
  ]);
  report.blackBaseSpecular=compare(blackBase[0].result.pixels,blackBase[1].result.pixels);
  assert.equal(report.blackBaseSpecular.maxAbs,0,'transmission subset leaves specular response unchanged over black base color');

  const stressCases=[];
  for(const light of ['directional','point','spot'])for(const blocker of [false,true])stressCases.push({name:`shadow-${light}-blocker${blocker}`,options:{light,shadows:true,blocker,backLight:false,factor:.5,specular:.2}});
  stressCases.push(
    {name:'normalmap-grazing-T0',options:{light:'directional',angle:1.15,normalMap:true,factor:0,specular:.3}},
    {name:'normalmap-grazing-T1',options:{light:'directional',angle:1.15,normalMap:true,factor:1,tint:[.8,1,.7],specular:.3}},
    {name:'specular-zero-T0',options:{light:'directional',factor:0,specular:0}},
    {name:'specular-one-T0',options:{light:'directional',factor:0,specular:1}},
    {name:'specular-zero-T1',options:{light:'directional',factor:1,specular:0}},
    {name:'specular-one-T1',options:{light:'directional',factor:1,specular:1}},
    {name:'grazing-normalmap-off-T1',options:{light:'directional',backLight:true,angle:1.15,normalMap:false,factor:1,specular:0}},
    {name:'grazing-normalmap-on-T1',options:{light:'directional',backLight:true,angle:1.15,normalMap:true,factor:1,specular:0}},
    {name:'leaf-self-shadow-off',options:{light:'directional',backLight:true,shadows:true,castShadow:false,factor:1,specular:0}},
    {name:'leaf-self-shadow-on',options:{light:'directional',backLight:true,shadows:true,castShadow:true,factor:1,specular:0}},
    {name:'leaf-self-shadow-bias035-off',options:{light:'directional',backLight:true,shadows:true,shadowNormalBias:.035,shadowBias:-.0001,castShadow:false,factor:1,specular:0,roughness:.84,normalScale:.55}},
    {name:'leaf-self-shadow-bias035-on',options:{light:'directional',backLight:true,shadows:true,shadowNormalBias:.035,shadowBias:-.0001,castShadow:true,factor:1,specular:0,roughness:.84,normalScale:.55}},
  );
  for(const light of ['directional','point','spot'])for(const blocker of [false,true])stressCases.push({name:`transmitted-shadow-${light}-blocker${blocker}`,options:{light,shadows:true,blocker,backLight:true,factor:1,specular:0}});
  const stress=await checked(stressCases);
  report.shadowBlockerMetrics=stress.slice(0,6).map(({name,result})=>({name,meanLuma:result.meanLuma,center:result.center}));
  report.normalMapGrazing={T0:stress[6].result.meanLuma,T1:stress[7].result.meanLuma};
  report.specularRetention={
    withSpecular0:compare(stress[8].result.pixels,stress[10].result.pixels),
    withSpecular1:compare(stress[9].result.pixels,stress[11].result.pixels),
    T0specularDelta:compare(stress[8].result.pixels,stress[9].result.pixels),
  };
  const transmissionDelta=(a,b,c,d)=>{
    let max=0,sum=0;
    for(let i=0;i<a.length;i++){const error=Math.abs((b[i]-a[i])-(d[i]-c[i]));max=Math.max(max,error);sum+=error;}
    return {maxAbs:max,meanAbs:sum/a.length};
  };
  report.specularDifferenceInvariant=transmissionDelta(stress[8].result.pixels,stress[10].result.pixels,stress[9].result.pixels,stress[11].result.pixels);
  assert.ok(report.specularDifferenceInvariant.maxAbs<1e-6,'the T0-to-T1 diffuse delta does not alter specular content');
  assert.ok(report.specularRetention.withSpecular0.meanAbs>0,'transmission changes diffuse under zero specular');
  assert.ok(report.specularRetention.withSpecular1.meanAbs>0,'transmission changes diffuse with specular enabled');
  assert.ok(report.specularRetention.T0specularDelta.meanAbs>0,'the host specular-intensity control remains observable');
  report.grazingGeometricNormalParity=compare(stress[12].result.pixels,stress[13].result.pixels);
  assert.ok(report.grazingGeometricNormalParity.maxAbs<1e-6,'full transmission follows the pre-normal-map geometric surface for backside lighting');
  report.leafSelfShadowDelta=compare(stress[14].result.pixels,stress[15].result.pixels);
  report.leafSelfShadowBias035Delta=compare(stress[16].result.pixels,stress[17].result.pixels);
  report.transmittedShadowBlockerMetrics=stress.slice(18).map(({name,result})=>({name,meanLuma:result.meanLuma,center:result.center}));
  for(const light of ['directional','point','spot']){
    const a=stress.find(x=>x.name===`shadow-${light}-blockerfalse`).result.pixels;
    const b=stress.find(x=>x.name===`shadow-${light}-blockertrue`).result.pixels;
    report.shadowBlockerMetrics.find(x=>x.name===`shadow-${light}-blockertrue`).blockerDelta=compare(a,b);
    const ta=stress.find(x=>x.name===`transmitted-shadow-${light}-blockerfalse`).result.pixels;
    const tb=stress.find(x=>x.name===`transmitted-shadow-${light}-blockertrue`).result.pixels;
    report.transmittedShadowBlockerMetrics.find(x=>x.name===`transmitted-shadow-${light}-blockertrue`).blockerDelta=compare(ta,tb);
    const unblocked=stress.find(x=>x.name===`transmitted-shadow-${light}-blockerfalse`).result;
    const blocked=stress.find(x=>x.name===`transmitted-shadow-${light}-blockertrue`).result;
    assert.ok(unblocked.center.some(value=>value>1e-4),`${light} backlit transmission reaches the center without the occluder`);
    assert.ok(blocked.center.every(value=>value<1e-7),`${light} blocker shadows the center of the transmitted backlight`);
  }
  report.errors=errors;report.failedRequests=failedRequests;
  assert.deepEqual(errors,[]);assert.deepEqual(failedRequests,[]);
  await writeFile(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
}catch(error){
  report.errors=errors;report.failedRequests=failedRequests;report.failure=String(error);
  await writeFile(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');throw error;
}finally{await browser.close();}
