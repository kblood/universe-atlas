// Node-only M2 integration. Unwired replica; no production terrain modifications.
import {mkdirSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {performance} from 'node:perf_hooks';
import assert from 'node:assert/strict';
import {hash64,macroHeightCode,noise} from '../src/catalog.ts';
import {RELIEF_CALIBRATION as RC,terrainSampler,baseTerrainSampler,reliefLayersSampler,bodyHeightBoundM,tectonicReliefOf} from '../src/terrain.ts';
import {planetLandforms} from '../src/planet-landforms.ts';
import {orogenLayout,continentalA0} from '../src/mountain-layout.ts';
import {massifEnvelopeM,maxEnvelopeM,composeRidgeTermM,MASSIF_ENVELOPE as C,MASSIF_ENVELOPE_VERSION} from '../src/mountain-envelope.ts';
import {waterWorlds,fib} from '../tests/terrain-climate-fixtures.mjs';
import {bandPowers,raster,hillshade,writePng,q} from '../tests/helpers/mountain-metrics.mjs';

const clamp=(v,lo=0,hi=1)=>Math.max(lo,Math.min(hi,v));
const ss=(lo,hi,v)=>{const t=(v-lo)/(hi-lo),c=t<0?0:t>1?1:t;return c*c*(3-2*c);};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>{const n=Math.hypot(...a);return a.map(v=>v/n);};
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const move=(d,t,m,R)=>d.map((v,i)=>v*Math.cos(m/R)+t[i]*Math.sin(m/R));

/** Replica follows terrain.ts expression order, including legacy detail subtraction. */
export function envelopeWorld(body){
  const code=Number(hash64(body.seed+'/macro-v1') & 0xffffffffn),R=body.radiusM,sc=Math.min(1,R/2e6);
  const n=(d,f,s)=>noise(d[0]*f+13,d[1]*f+37,d[2]*f+19,code+s);
  const sea=.37+body.water*.22,tau=tectonicReliefOf(body),bound=bodyHeightBoundM(body).maxM;
  const layout=orogenLayout(body),a0=continentalA0(body),landforms=planetLandforms(body);
  const sample=(d)=>{
    const macro=macroHeightCode(code,d),coast=macro+(n(d,42,5)-.5)*.012+(n(d,90,6)-.5)*.003;
    const rb=1-Math.abs(n(d,30,7)*2-1),ridges=rb*rb*rb*rb*rb;
    const fine=(n(d,80,8)-.5)*380+(n(d,155,9)-.5)*95,landFactor=clamp((coast-sea)*12);
    const legacyElevationSum=(coast-sea)*47000+ridges*2800*landFactor+fine*landFactor;
    let elevationM=clamp(legacyElevationSum,-16000,18000)*Math.min(1,R/2e6);
    const legacyFloor=elevationM,landDetail=clamp(elevationM/700);
    if(landDetail>0){const hb=1-Math.abs(n(d,R/6500,71)*2-1),hills=hb*hb*hb;
      const gullies=n(d,R/1400,72),rocks=n(d,R/260,73);
      elevationM+=(hills*620+gullies*130+rocks*22)*landDetail;}
    const rawBaseM=elevationM,detailM=rawBaseM-legacyFloor,alt=(coast-sea)*47000;
    const belt=layout.sampleWithA0(d,alt);
    if(alt<0){
      const m0=-alt,F=-(m0/(1+m0/RC.HS)+RC.HAB*ss(RC.A1,RC.A2,m0)+RC.HTR*ss(RC.A3,RC.A4,m0));
      const smoothFloorM=clamp(F,-16000,18000)*Math.min(1,R/2e6),depth=-smoothFloorM;
      const amp=RC.SEABED_DETAIL_SHELF_M+(RC.SEABED_DETAIL_DEEP_M-RC.SEABED_DETAIL_SHELF_M)*ss(0,RC.SEABED_DETAIL_RAMP_M,depth);
      const hb=1-Math.abs(n(d,R/RC.SEABED_HILL_WAVELENGTH_M,75)*2-1);
      const shape=(hb*hb-.35)*2.0+(n(d,R/RC.SEABED_GULLY_WAVELENGTH_M,76)-.5)*1.4,S=amp*shape,half=depth*.5;
      const floorM=smoothFloorM+(S>half?half:S<-half?-half:S);
      return {belt,alt,landFactor,U:0,main:{groundHeightM:floorM,floorM},compose:()=>({groundHeightM:floorM,floorM})};
    }
    const comp=alt/(1+alt/RC.HC);let fineT=fine*landFactor;if(fineT<-.5*comp)fineT=-.5*comp;
    const mainTerm=tau*RC.KB*2800*ridges*ss(RC.BT0,RC.BT1,ridges)*landFactor;
    const u=massifEnvelopeM(belt.belt,belt.axisDistanceM,belt.halfWidthM,alt,landFactor,tau,'water');
    function ground(ridgeTerm){
      const F=comp+tau*(RC.HUP*ss(RC.B1,RC.B2,alt)+RC.HHI*ss(RC.B3,RC.B4,alt))+ridgeTerm+fineT;
      const floorM=clamp(F,-16000,18000)*Math.min(1,R/2e6),upland=ss(RC.HM0,RC.HM1,floorM);
      const elevationM=floorM+tau*detailM*(RC.WLOW+(1-RC.WLOW)*upland),landformScale=tau*upland;
      return {floorM,groundHeightM:landformScale>0?elevationM+landformScale*landforms(d,elevationM,rawBaseM,bound):elevationM};
    }
    return {belt,alt,landFactor,U:u,main:ground(mainTerm),compose:(gain=C.GAIN)=>ground(composeRidgeTermM(mainTerm,belt.belt,belt.halfWidthM,u*(gain/C.GAIN)))};
  };
  // U-only renders do not evaluate terrain, detail, landforms or colour.
  const envelope=d=>{const coast=macroHeightCode(code,d)+(n(d,42,5)-.5)*.012+(n(d,90,6)-.5)*.003;
    const alt=(coast-sea)*47000,b=layout.sampleWithA0(d,alt);
    return massifEnvelopeM(b.belt,b.axisDistanceM,b.halfWidthM,alt,clamp((coast-sea)*12),tau,'water')*sc;};
  return {sample,envelope,layout,a0,tau,bound,sc,R};
}
export function hypsometry(values){return {n:values.length,p10:q(values,.1),p50:q(values,.5),p90:q(values,.9),p99:q(values,.99),max:q(values,1),above4km:100*values.filter(h=>h>4000).length/values.length,below500:100*values.filter(h=>h<500).length/values.length};}
function hypFailures(h,tau){return [
  ['p10',h.p10>=150&&h.p10<=300],['p50',h.p50>=350&&h.p50<=650],['p90',h.p90>=1800&&h.p90<=3300],
  ['p99',h.p99>=3500&&h.p99<=6000],['above4km',h.above4km>=1&&h.above4km<=6],['below500',h.below500>=45],['max',h.max<=8800*tau+1000],
].filter(([,pass])=>!pass).map(([name])=>name);}
function spectrum(values){const p=bandPowers(values,250,{window:'none',detrend:false});return {sub32kmRmsShare:p.total?Math.sqrt(p.octave(0,32000)/p.total):0,totalPower:p.total};}
function profilePng(file,rows){
  const w=769,h=321,rgb=Buffer.alloc(w*h*3,245),top=Math.max(1,...rows.flatMap(r=>r.slice(1)));
  const pixel=(x,y,c)=>{if(x>=0&&x<w&&y>=0&&y<h)for(let j=0;j<3;j++)rgb[(y*w+x)*3+j]=c[j];};
  for(let x=0;x<w;x++)pixel(x,h-21,[80,80,80]);
  for(const [series,color] of [[1,[25,110,220]],[2,[220,65,30]],[3,[80,80,80]]]){
    let old=null;for(let i=0;i<rows.length;i++){
      const x=Math.round(i*(w-1)/(rows.length-1)),y=h-21-Math.round(rows[i][series]/top*(h-40));
      if(old){const steps=Math.max(Math.abs(x-old[0]),Math.abs(y-old[1]),1);for(let j=0;j<=steps;j++)pixel(Math.round(old[0]+(x-old[0])*j/steps),Math.round(old[1]+(y-old[1])*j/steps),color);}old=[x,y];
    }
  }writePng(file,w,h,rgb);return {file,yMaxM:top,xMinM:rows[0][0],xMaxM:rows.at(-1)[0],series:{blue:'U * radius scale',red:'composed floor',gray:'main floor'}};
}
async function run(){
  const start=performance.now(),dir='test-results/mountains/M2';mkdirSync(dir,{recursive:true});
  assert.equal(C.RIDGE_EQUIVALENT_WATER_M,RC.KB*2800,'R-CAL-1 ridge amplitude identity');
  const gains=[.6,.8,1],rows=[],renders=[];
  const synR=6e6,synW=C.MIN_HALF_WIDTH_M;
  const synthetic=raster(d=>{const distance=synR*Math.asin(d[1]);return {groundHeightM:massifEnvelopeM(Math.abs(distance)<synW?1:0,distance,synW,1000,1,1,'water'),ocean:false};},[1,0,0],synR,385,1000);
  writePng(`${dir}/synthetic-envelope.png`,385,385,hillshade(synthetic,maxEnvelopeM(1,'water')));renders.push(`${dir}/synthetic-envelope.png`);
  for(const body of waterWorlds()){
    console.log(`Measuring ${body.name}`);
    const world=envelopeWorld(body),ts=terrainSampler(body),base=baseTerrainSampler(body),layers=reliefLayersSampler(body);
    const row={name:body.name,id:body.id,tau:world.tau,boundM:world.bound,identityMismatches:0,identityDirections:0,a0Mismatches:0,outsideBeltDiffs:0,outsideBeltDirections:0,coastFlips:0,boundViolations:0,failures:[]};
    function checked(d){const s=world.sample(d),main=ts(d).groundHeightM;row.identityDirections++;if(!Object.is(s.main.groundHeightM,main)){
      row.identityMismatches++;writeFileSync(`${dir}/report.json`,JSON.stringify({class:'CONTRACT',aborted:'replica identity',row,d,replica:s.main.groundHeightM,main},null,2));throw new Error(`${body.name} replica identity mismatch`);
    }
      const h=s.compose().groundHeightM;
      if(s.belt.belt===0||s.belt.halfWidthM<C.MIN_HALF_WIDTH_M){row.outsideBeltDirections++;if(!Object.is(h,main))row.outsideBeltDiffs++;}
      row.boundViolations+=h>world.bound;
      return s;
    }
    for(let i=0;i<2000;i++){const d=fib(i,2000);if(world.a0(d)*world.sc!==layers(d).continentalM)row.a0Mismatches++;checked(d);}
    if(row.a0Mismatches){writeFileSync(`${dir}/report.json`,JSON.stringify({class:'CONTRACT',aborted:'a0 identity',row},null,2));throw new Error('a0 identity mismatch');}
    const mainHyp=[],gainHyp=gains.map(()=>[]);
    for(let i=0;i<20000;i++){const d=fib(i,20000),s=checked(d);if(s.main.groundHeightM>=0)mainHyp.push(s.main.groundHeightM);
      gains.forEach((g,j)=>{const h=s.compose(g).groundHeightM;if(h>=0)gainHyp[j].push(h);});}
    row.main=hypsometry(mainHyp);row.gainSweep=gains.map((gain,j)=>({gain,hypsometry:hypsometry(gainHyp[j])}));
    const mainLand=[],beltLand=gains.map(()=>[]),allMax=gains.map(()=>-Infinity);
    for(let i=0;i<102500;i++){
      const d=fib(i,102500),s=checked(d),h=s.compose().groundHeightM;
      if(s.main.groundHeightM>=0)mainLand.push(s.main.groundHeightM);
      row.coastFlips+=(h<0)!==base(d).ocean;
      gains.forEach((g,j)=>{const hg=g===C.GAIN?h:s.compose(g).groundHeightM;if(hg>=0){allMax[j]=Math.max(allMax[j],hg);if(s.belt.belt>0&&s.belt.halfWidthM>=C.MIN_HALF_WIDTH_M)beltLand[j].push(hg);}});
    }
    row.mainRatio=q(mainLand,.99)/world.bound;
    row.gainSweep.forEach((r,j)=>{r.beltSamples=beltLand[j].length;r.beltP99M=q(beltLand[j],.99);r.beltRatio=r.beltP99M/world.bound;r.composedMaxM=allMax[j];r.metric2Failures=body.name==='Maithea'?hypFailures(r.hypsometry,world.tau):[];r.metric3Pass=r.beltRatio>=.6&&r.beltRatio<=.9&&r.beltRatio>=row.mainRatio;});
    const chosen=row.gainSweep.find(r=>r.gain===C.GAIN);row.composed=chosen.hypsometry;row.beltRatio=chosen.beltRatio;row.beltSamples=chosen.beltSamples;row.composedMaxM=chosen.composedMaxM;
    if(chosen.metric2Failures.length)row.failures.push('metric 2: '+chosen.metric2Failures.join(', '));
    if(!chosen.metric3Pass)row.failures.push('metric 3: belt p99 ratio');
    row.excludedBelts=world.layout.belts.map((b,index)=>({index,rank:b.rank,halfWidthM:b.halfWidthM})).filter(b=>b.halfWidthM<C.MIN_HALF_WIDTH_M);
    const sites=[];
    for(let i=0;i<20000&&sites.length<4;i++){const d=fib(i,20000),b=world.layout.sample(d);if(b.belt>=.5&&b.halfWidthM>=C.MIN_HALF_WIDTH_M&&sites.every(s=>Math.acos(clamp(dot(d,s.d),-1,1))*world.R>=300000))sites.push({d,b});}
    assert.equal(sites.length,4,'four real-field sites');row.spectra=[];
    for(const [index,site] of sites.entries()){
      const transverse=norm(cross(site.d,site.b.axis));
      const values=Float64Array.from({length:8192},(_,i)=>{const d=move(site.d,transverse,(i-4096)*250,world.R);checked(d);return world.envelope(d);});
      row.spectra.push({class:'INFO',index,d:site.d,beltIndex:site.b.beltIndex,halfWidthM:site.b.halfWidthM,...spectrum(values)});
      if(index===0){
        const r=raster(d=>{checked(d);return {groundHeightM:world.envelope(d),ocean:false};},site.d,world.R,385,1000);
        const file=`${dir}/${body.name}-envelope.png`;writePng(file,385,385,hillshade(r,maxEnvelopeM(world.tau,'water')*world.sc));renders.push(file);
        const profile=Array.from({length:769},(_,i)=>{const m=(i-384)*500,d=move(site.d,transverse,m,world.R),s=checked(d);return [m,world.envelope(d),s.compose().floorM,s.main.floorM];});
        row.profile=profilePng(`${dir}/${body.name}-profile.png`,profile);renders.push(row.profile.file);
      }
    }
    for(const k of ['coastFlips','boundViolations','outsideBeltDiffs'])if(row[k])row.failures.push(k);
    rows.push(row);console.log(JSON.stringify(row));
  }
  let checksum=0;for(let i=0;i<10000;i++)checksum+=massifEnvelopeM(.75,i%32000,32000,1000,1,.8,'water');
  const t=performance.now();for(let i=0;i<100000;i++)checksum+=massifEnvelopeM(.75,i%32000,32000,1000,1,.8,'water');
  const cost={class:'INFO',calls:100000,warmup:10000,nsPerCall:(performance.now()-t)*1e6/100000,checksum,cpuQuiet:false};
  const report={version:MASSIF_ENVELOPE_VERSION,constants:C,class:'CONTRACT',hypsometryDirections:20000,coastDirectionsPerWorld:102500,classes:{unit:'HARD',hypsometryMaithea:'CONTRACT',hypsometryOther:'INFO',ratio:'CONTRACT',identity:'CONTRACT',coast:'CONTRACT',bound:'CONTRACT',realSpectrum:'INFO',renders:'VISUAL-ADVISORY',cost:'INFO'},rows,renders,cost,wallMs:performance.now()-start,failures:rows.filter(r=>r.failures.length).map(r=>({name:r.name,failures:r.failures}))};
  writeFileSync(`${dir}/report.json`,JSON.stringify(report,null,2)+'\n');console.log(`CONTRACT ${report.failures.length?'FAIL':'PASS'}; ${report.wallMs/1000}s; ${dir}/report.json`);process.exitCode=report.failures.length?1:0;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await run();
