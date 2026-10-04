// Surface-climate calibration report generator (reproducible; not part of npm test).
// Usage (from the repo root): node scripts/climate-calibration-report.mjs [outDir]
// outDir defaults to test-results/climate-calibration/ under the repo root. Imports this checkout's src/;
// writes report.json, report.txt, per-field equirect PNGs and contact-sheet.png into outDir.
// Origin: W0-CLIMATE evidence script (test-results/biome-climate-2026-10/W0-CLIMATE/calibration-report.mjs),
// with the Maithea calibration sites (from biome-plan-2026-10-02/sites.json) inlined so it runs standalone.
import {writeFileSync,mkdirSync} from 'node:fs';
import {deflateSync} from 'node:zlib';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const ROOT=new URL('../',import.meta.url);
const SRC=new URL('src/',ROOT).href;
const {galaxies,refByAddress,sector,system}=await import(SRC+'catalog.ts');
const {terrainSampler}=await import(SRC+'terrain.ts');
// The 'legacy' column is the frozen surface-biomes-1 classifier, not the live
// (surface-biomes-2-climate) one, which already reads this climate.
const {legacyClassifier:biomeClassifier}=await import(new URL('tests/helpers/surface-biomes-1-legacy.mjs',ROOT).href);
const {spinStateFor}=await import(SRC+'stellar-evolution.ts');
const SC=await import(SRC+'surface-climate.ts');
const {SITE_A,SITE_A_LEGACY}=await import(new URL('tests/harness-sites.mjs',ROOT).href);
const outArg=process.argv[2];
const OUT=outArg?pathToFileURL(resolve(outArg)+'/'):new URL('test-results/climate-calibration/',ROOT);
mkdirSync(OUT,{recursive:true});
const D=180/Math.PI;
const g0=galaxies('LETHRA-001')[0];
const maithea=system(refByAddress(g0,'G001/C2128,0,1/0')).planets[1];
const fib=(i,n)=>{const y=1-2*(i+.5)/n,p=i*2.399963229728653,r=Math.sqrt(1-y*y);return [Math.cos(p)*r,y,Math.sin(p)*r];};
const pct=(a,b)=>b?+(100*a/b).toFixed(1):null;
const quant=(arr,q)=>{const s=[...arr].sort((a,b)=>a-b);return s[Math.min(s.length-1,Math.floor(q*(s.length-1)+.5))];};
const bodyInfo=b=>{const f=SC.climateForcingFor(b),tilt=spinStateFor(b).axialTiltRad;return {id:b.id,name:b.name,type:b.type,temperatureK:b.temperatureK,water:+b.water.toFixed(3),radiusKm:+(b.radiusM/1000).toFixed(0),
  gravityMS2:+f.surfaceGravityMS2.toFixed(2),lapseKPerKm:+(f.lapseKPerM*1000).toFixed(2),axialTiltDeg:+(tilt*D).toFixed(1),effectiveObliquityDeg:+(f.obliquityRad*D).toFixed(1)};};

/** Land statistics for one body and one lapse choice (undefined = per-planet gravity lapse). */
function landStats(body,n,lapses,withBands=false){
  const sample=terrainSampler(body),classify=biomeClassifier(body),o=SC.createClimateSample();
  const climates=lapses.map(l=>({l,s:SC.surfaceClimate(SC.climateForcingFor(body,l===undefined?undefined:{lapseKPerM:l}))}));
  const land=[];
  for(let i=0;i<n;i++){const d=fib(i,n),t=sample(d);if(!t.ocean)land.push([d,t.groundHeightM]);}
  const res={samples:n,land:land.length,landShare:pct(land.length,n),medianLandHeightM:land.length?Math.round(quant(land.map(x=>x[1]),.5)):null};
  let legacySnow=0,legacyForest=0;const legacyBands={};
  for(const [d,h] of land){const b=classify(d,h);legacySnow+=b.weights[3]>.6;legacyForest+=b.forestPotential;
    if(withBands){const band=Math.min(75,Math.floor(Math.asin(Math.abs(d[1]))*D/15)*15);(legacyBands[band]??={land:0,forest:0});legacyBands[band].land++;legacyBands[band].forest+=b.forestPotential;}}
  res.legacy={snowGt06:pct(legacySnow,land.length),forestPotential:pct(legacyForest,land.length)};
  if(withBands)res.legacy.forestByBand=Object.fromEntries(Object.entries(legacyBands).map(([k,v])=>[k,pct(v.forest,v.land)]));
  res.variants={};
  for(const {l,s} of climates){
    let snow=0,forest=0;const bands={};
    for(const [d,h] of land){s(d,h,o);snow+=o.snowFraction>.6;forest+=o.forestSuitability01>.5;
      if(withBands){const band=Math.min(75,Math.floor(Math.asin(Math.abs(d[1]))*D/15)*15);(bands[band]??={land:0,forest:0,snow:0});bands[band].land++;bands[band].forest+=o.forestSuitability01>.5;bands[band].snow+=o.snowFraction>.6;}}
    const key=l===undefined?'gravity':String(l*1000)+'K/km';
    res.variants[key]={snowGt06:pct(snow,land.length),forestSuitable:pct(forest,land.length)};
    if(withBands){res.variants[key].forestByBand=Object.fromEntries(Object.entries(bands).map(([k,v])=>[k,pct(v.forest,v.land)]));res.variants[key].snowByBand=Object.fromEntries(Object.entries(bands).map(([k,v])=>[k,pct(v.snow,v.land)]));}
  }
  return res;
}
function snowlines(body,lapses){
  const out={};
  for(const l of lapses){const f=SC.climateForcingFor(body,l===undefined?undefined:{lapseKPerM:l}),key=l===undefined?'gravity':String(l*1000)+'K/km';
    out[key]=Object.fromEntries([0,45,70].map(lat=>{const x=Math.sin(lat/D);return [lat+'deg',{onsetM:Math.round(SC.isothermHeightM(f,x,SC.CLIMATE_CALIBRATION.T_SNOW_K)),heavyM:Math.round(SC.isothermHeightM(f,x,SC.CLIMATE_CALIBRATION.T_SNOW_K-.6*SC.CLIMATE_CALIBRATION.SNOW_RAMP_K))}];}));}
  return out;
}
const LAPSES=[undefined,.004,.005,.0065];
const report={generated:new Date().toISOString(),climateVersion:SC.CLIMATE_VERSION,calibration:SC.CLIMATE_CALIBRATION};

// --- Maithea ---
const tM=performance.now();
report.maithea={body:bodyInfo(maithea),land:landStats(maithea,60000,LAPSES,true),snowlines:snowlines(maithea,LAPSES)};
report.maithea.ms=Math.round(performance.now()-tM);

// --- Sites ---
// Maithea calibration sites (direction + legacy ground height), inlined from biome-plan-2026-10-02/sites.json.
const SITES={"equatorLowland":{"d":[0.823489606008632,-0.17756666666666665,0.5388273820850579],"elev":303.24955029626767},"midLatForest":{"d":[0.769211347528793,-0.5823133333333332,0.2631066032146682],"elev":1555.5035896199242},"dryUpland":{"d":[0.8730463406926187,-0.3999933333333334,0.2789183039746887],"elev":259.1803911416989},"highMountain":{"d":[0.7040483064066647,0.029326666666666612,0.7095462838096817],"elev":18065.57578707872},"midLatSnowMountain":{"d":[0.5231706598848948,-0.8075000000000001,0.2724632280429847],"elev":3975.100446910822},"polar":{"d":[0.34535062107191883,-0.9275800000000001,0.14257731981363617],"elev":688.3077559521448},"coast":{"d":[0.804750833710838,-0.25150000000000006,0.5377023764516121],"elev":92.6497795489498}};
const mSample=terrainSampler(maithea),mClassify=biomeClassifier(maithea),mClimate=SC.surfaceClimate(SC.climateForcingFor(maithea)),o=SC.createClimateSample();
const sites=Object.entries(SITES).map(([name,s])=>{const b=mClassify(s.d,s.elev);return {name,d:s.d,h:s.elev,legacyBiome:b.name,legacyForest:b.forestPotential};});
{ // forest-census fixture search (tests/forest-census.test.mjs livingPatch): first forestPotential direction
  for(let i=0;i<1024;i++){const d=fib(i,1024);const h=mSample(d).groundHeightM;if(mClassify(d,h).forestPotential){sites.push({name:'forestCensusFixture',d,h,legacyBiome:mClassify(d,h).name,legacyForest:true});break;}}
  // The shared harness living site (tests/harness-sites.mjs; moved in the relief round P6) and its pre-relief position.
  for(const [name,d] of [['lifeSITE_A',[...SITE_A]],['lifeSITE_A_legacy',[...SITE_A_LEGACY]]]){const h=mSample(d).groundHeightM;sites.push({name,d,h,legacyBiome:mClassify(d,h).name,legacyForest:mClassify(d,h).forestPotential});}
}
report.sites=sites.map(s=>{mClimate(s.d,s.h,o);return {name:s.name,latDeg:+(Math.asin(Math.abs(s.d[1]))*D).toFixed(1),heightM:Math.round(s.h),legacyBiome:s.legacyBiome,legacyForest:s.legacyForest,
  annualMeanTempK:+o.annualMeanTempK.toFixed(1),seasonalHalfRangeK:+o.seasonalHalfRangeK.toFixed(1),warmestMonthK:+o.warmestMonthK.toFixed(1),snowFraction:+o.snowFraction.toFixed(2),
  effectiveMoisture:+o.effectiveMoisture.toFixed(3),aridity01:+o.aridity01.toFixed(2),treeline01:+o.treeline01.toFixed(2),growingSeason01:+o.growingSeason01.toFixed(2),forestSuitability01:+o.forestSuitability01.toFixed(2),climateCode:o.climateCode};});

// --- Corpus: life-eligible catalogue rocky planets (temperateHabitat), first 2000 systems of G001 ---
const corpus=[];let systems=0;
for(let sx=266;systems<2000;sx++)for(const ref of sector(g0,[sx,0,0]).refs){if(systems>=2000)break;systems++;for(const b of system(ref).planets)if(SC.temperateHabitat(b))corpus.push(b);}
report.corpus={systems,eligibleBodies:corpus.length,samplesPerBody:8000,rows:[]};
const tC=performance.now();
for(const b of corpus){const s=landStats(b,8000,LAPSES);report.corpus.rows.push({...bodyInfo(b),landShare:s.landShare,medianLandHeightM:s.medianLandHeightM,legacySnow:s.legacy.snowGt06,legacyForest:s.legacy.forestPotential,
  snow:Object.fromEntries(Object.entries(s.variants).map(([k,v])=>[k,v.snowGt06])),forest:Object.fromEntries(Object.entries(s.variants).map(([k,v])=>[k,v.forestSuitable]))});}
report.corpus.ms=Math.round(performance.now()-tC);
const withLand=report.corpus.rows.filter(r=>r.landShare>=1);
report.corpus.withLand=withLand.length;
const dist=vals=>{const h=Array(10).fill(0);for(const v of vals)h[Math.min(9,Math.floor(v/10))]++;return {min:quant(vals,0),p10:quant(vals,.1),median:quant(vals,.5),p90:quant(vals,.9),max:quant(vals,1),mean:+(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1),histogram10pct:h};};
report.corpus.snowShareDistribution=Object.fromEntries(['legacy','gravity','4K/km','5K/km','6.5K/km'].map(k=>[k,dist(withLand.map(r=>k==='legacy'?r.legacySnow:r.snow[k]))]));
report.corpus.forestShareDistribution=Object.fromEntries(['legacy','gravity','6.5K/km'].map(k=>[k,dist(withLand.map(r=>k==='legacy'?r.legacyForest:r.forest[k]))]));
report.corpus.gravityRange={min:quant(withLand.map(r=>r.gravityMS2),0),median:quant(withLand.map(r=>r.gravityMS2),.5),max:quant(withLand.map(r=>r.gravityMS2),1)};
report.corpus.lapseRange={min:quant(withLand.map(r=>r.lapseKPerKm),0),median:quant(withLand.map(r=>r.lapseKPerKm),.5),max:quant(withLand.map(r=>r.lapseKPerKm),1)};
// Snow share by gravity tercile and by obliquity class (emergence check).
const terc=[...withLand].sort((a,b)=>a.gravityMS2-b.gravityMS2),third=Math.ceil(terc.length/3);
report.corpus.byGravityTercile=[0,1,2].map(i=>{const part=terc.slice(i*third,(i+1)*third);return {gravityMS2:[part[0].gravityMS2,part[part.length-1].gravityMS2],n:part.length,medianSnow:quant(part.map(r=>r.snow.gravity),.5),medianSnowFixed6p5:quant(part.map(r=>r.snow['6.5K/km']),.5)};});
report.corpus.byObliquity=[[0,30],[30,54.7],[54.7,90.1]].map(([lo,hi])=>{const part=withLand.filter(r=>r.effectiveObliquityDeg>=lo&&r.effectiveObliquityDeg<hi);return {range:[lo,hi],n:part.length,medianSnow:part.length?quant(part.map(r=>r.snow.gravity),.5):null};});

// --- Equirect PNGs ---
const crcTable=new Uint32Array(256).map((_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
const crc=buf=>{let c=0xffffffff;for(const b of buf)c=crcTable[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;};
const chunk=(type,data)=>{const len=Buffer.alloc(4);len.writeUInt32BE(data.length);const td=Buffer.concat([Buffer.from(type),data]);const c=Buffer.alloc(4);c.writeUInt32BE(crc(td));return Buffer.concat([len,td,c]);};
function png(w,h,rgb){const raw=Buffer.alloc((w*3+1)*h);for(let y=0;y<h;y++){raw[y*(w*3+1)]=0;rgb.copy(raw,y*(w*3+1)+1,y*w*3,(y+1)*w*3);}
  const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(w,0);ihdr.writeUInt32BE(h,4);ihdr[8]=8;ihdr[9]=2;ihdr[10]=0;ihdr[11]=0;ihdr[12]=0;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);}
const lerp=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*Math.max(0,Math.min(1,t)));
const ramp=(stops,t)=>{t=Math.max(0,Math.min(1,t));const n=stops.length-1,i=Math.min(n-1,Math.floor(t*n));return lerp(stops[i],stops[i+1],t*n-i);};
const OCEAN=[18,28,56];
const FIELDS={
  annualMeanTempK:(o,ocean)=>{const c=ramp([[40,40,140],[70,140,220],[235,235,235],[240,170,60],[180,30,30]],(o.annualMeanTempK-220)/100);return ocean?c.map(v=>v*.45):c;},
  snowFraction:(o,ocean)=>ocean?OCEAN:lerp([110,92,64],[245,248,250],o.snowFraction),
  effectiveMoisture:(o,ocean)=>{const c=ramp([[170,130,70],[200,190,120],[90,160,80],[30,90,60]],(o.effectiveMoisture-.2)/.6);return ocean?c.map(v=>v*.45):c;},
  forestSuitability01:(o,ocean)=>ocean?OCEAN:lerp([72,70,66],[24,150,50],o.forestSuitability01),
};
const W=512,H=256;
function maps(body,tag){
  const sample=terrainSampler(body),s=SC.surfaceClimate(SC.climateForcingFor(body)),oo=SC.createClimateSample();
  const bufs=Object.fromEntries(Object.keys(FIELDS).map(k=>[k,Buffer.alloc(W*H*3)]));
  for(let y=0;y<H;y++){const lat=Math.PI/2-(y+.5)/H*Math.PI;for(let x=0;x<W;x++){const lon=(x+.5)/W*2*Math.PI-Math.PI;
    const d=[Math.cos(lat)*Math.cos(lon),Math.sin(lat),Math.cos(lat)*Math.sin(lon)],t=sample(d);s(d,t.ocean?0:t.groundHeightM,oo);
    for(const [k,f] of Object.entries(FIELDS)){const c=f(oo,t.ocean);bufs[k].set(c.map(v=>Math.round(Math.max(0,Math.min(255,v)))),(y*W+x)*3);}}}
  const files=[];for(const [k,b] of Object.entries(bufs)){const name=`${tag}-${k}.png`;writeFileSync(new URL(name,OUT),png(W,H,b));files.push(name);}
  return {bufs,files};
}
const pickHighObl=[...withLand].filter(r=>r.effectiveObliquityDeg>54.7&&r.landShare>=15&&r.temperatureK>=285).sort((a,b)=>b.effectiveObliquityDeg-a.effectiveObliquityDeg)[0];
const pickLowG=[...withLand].filter(r=>r.landShare>=15).sort((a,b)=>a.gravityMS2-b.gravityMS2)[0];
const pickHighG=[...withLand].filter(r=>r.landShare>=15).sort((a,b)=>b.gravityMS2-a.gravityMS2)[0];
const picks=[['maithea',maithea],['corpus-high-obliquity',corpus.find(b=>b.id===pickHighObl.id)],['corpus-low-gravity',corpus.find(b=>b.id===pickLowG.id)],['corpus-high-gravity',corpus.find(b=>b.id===pickHighG.id)]];
report.pngs=[];
const sheet=Buffer.alloc(4*256*4*128*3).fill(0); // 4 fields across (256 px each) x 4 worlds down (128 px)
picks.forEach(([tag,body],row)=>{const {bufs,files}=maps(body,tag);report.pngs.push({tag,body:bodyInfo(body),files});
  Object.keys(FIELDS).forEach((k,col)=>{for(let y=0;y<128;y++)for(let x=0;x<256;x++)for(let c=0;c<3;c++)sheet[((row*128+y)*1024+col*256+x)*3+c]=bufs[k][((y*2)*W+x*2)*3+c];});});
writeFileSync(new URL('contact-sheet.png',OUT),png(1024,512,sheet));
report.contactSheet={file:'contact-sheet.png',columns:Object.keys(FIELDS),rows:picks.map(p=>p[0])};

writeFileSync(new URL('report.json',OUT),JSON.stringify(report,null,1));
// Compact text summary.
const L=[];const p=(...a)=>L.push(a.join(' '));
p('Maithea',JSON.stringify(report.maithea.body));
p('  land',report.maithea.land.land,'of',report.maithea.land.samples,'median land height',report.maithea.land.medianLandHeightM,'m');
p('  legacy snow>0.6',report.maithea.land.legacy.snowGt06+'%','legacy forestPotential',report.maithea.land.legacy.forestPotential+'%');
for(const [k,v] of Object.entries(report.maithea.land.variants))p('  ',k.padEnd(9),'snow>0.6',String(v.snowGt06).padStart(5)+'%','forestSuitable>0.5',String(v.forestSuitable).padStart(5)+'%','forest by 15deg band',JSON.stringify(v.forestByBand),'snow by band',JSON.stringify(v.snowByBand));
p('  legacy forest by band',JSON.stringify(report.maithea.land.legacy.forestByBand));
for(const [k,v] of Object.entries(report.maithea.snowlines))p('  snowline',k.padEnd(9),JSON.stringify(v));
p('Sites');for(const s of report.sites)p('  ',JSON.stringify(s));
p('Corpus',systems,'systems',corpus.length,'eligible bodies',withLand.length,'with >=1% land');
p('  gravity',JSON.stringify(report.corpus.gravityRange),'lapse K/km',JSON.stringify(report.corpus.lapseRange));
for(const [k,v] of Object.entries(report.corpus.snowShareDistribution))p('  snow>0.6',k.padEnd(8),JSON.stringify(v));
for(const [k,v] of Object.entries(report.corpus.forestShareDistribution))p('  forest',k.padEnd(8),JSON.stringify(v));
p('  by gravity tercile',JSON.stringify(report.corpus.byGravityTercile));
p('  by obliquity',JSON.stringify(report.corpus.byObliquity));
p('PNGs',JSON.stringify(report.pngs.map(x=>({tag:x.tag,name:x.body.name,obl:x.body.effectiveObliquityDeg,g:x.body.gravityMS2,T:x.body.temperatureK}))));
writeFileSync(new URL('report.txt',OUT),L.join('\n')+'\n');
console.log(L.join('\n'));
