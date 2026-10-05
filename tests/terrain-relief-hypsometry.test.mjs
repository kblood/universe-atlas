// P4-RELIEF (terrain-1.8.0-relief, docs/terrain-relief-v1.md): the R-CAL-1 relief
// field's acceptance gates. Physics is judged by numbers here; appearance is judged
// separately (Luna captures under test-results/relief-round-2026-10-03/P4-RELIEF/).
//
// Every band below is the plan's acceptance band (docs/terrain-relief-v1.md §5),
// never a loosened copy of a measured value. Owner decision 1 (2026-10-03): the
// Maithea snow share is accepted in 15-40%.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {galaxies,sector,system} from '../src/catalog.ts';
import {
  RELIEF_CALIBRATION,TERRAIN_VERSION,LANDFORM_SHAPE_VERSION,baseTerrainSampler,terrainSampler,terrainFloorSampler,
  reliefLayersSampler,terrainWindowMaxM,terrainUnitWindowMaxM,bodyHeightBoundM,reliefTextureRange,tectonicReliefOf,
} from '../src/terrain.ts';
import {biomeClassifier} from '../src/surface-biomes.ts';
import {temperateHabitat} from '../src/surface-climate.ts';
import {planetGeophysics} from '../src/planet-geophysics.ts';
import {fib,maithea,goldenTerrainBodies,waterWorlds} from './terrain-climate-fixtures.mjs';

const SNOW='Alpine / polar snow';
const quantile=(a,q)=>{const s=Float64Array.from(a).sort();return s[Math.floor(q*(s.length-1))];};
const identityBodies=()=>[maithea(),...goldenTerrainBodies().slice(0,5)];
/** Golden-generator catalogue bodies (all kinds and types), deterministic order. */
function catalogueBodies(){
  const refs=[];
  for(const g of galaxies('LETHRA-GOLDEN-001').slice(0,3))
    for(const c of [[266,0,0],[0,0,0],[-2,-1,-2],[12,-4,7]])refs.push(...sector(g,c).refs);
  return refs.slice(0,220).map(system).flatMap(s=>[...s.planets,...s.moons]);
}
function spearman(a,b){
  const rank=v=>{const idx=v.map((x,i)=>[x,i]).sort((p,q)=>p[0]-q[0]),r=new Array(v.length);idx.forEach(([,i],k)=>r[i]=k);return r;};
  const ra=rank(a),rb=rank(b),n=a.length,m=(n-1)/2;let num=0,da=0,db=0;
  for(let i=0;i<n;i++){num+=(ra[i]-m)*(rb[i]-m);da+=(ra[i]-m)*(ra[i]-m);db+=(rb[i]-m)*(rb[i]-m);}
  return num/Math.sqrt(da*db);
}

test('versions and the frozen R-CAL-1 calibration (any change is a TERRAIN_VERSION bump)',()=>{
  assert.equal(TERRAIN_VERSION,'terrain-1.8.1-grain');
  assert.equal(LANDFORM_SHAPE_VERSION,'planet-landforms-shape-2');
  assert.ok(Object.isFrozen(RELIEF_CALIBRATION));
  assert.equal(RELIEF_CALIBRATION.name,'R-CAL-1');
  const sha=createHash('sha256').update(JSON.stringify(RELIEF_CALIBRATION)).digest('hex');
  assert.equal(sha,'ec15e0e409caa3a0c94291789982f067f6f4257e437b90ac4f11231fd28e1ea3',`RELIEF_CALIBRATION changed (sha ${sha}); bump TERRAIN_VERSION and re-pin`);
});

test('coastline invariance: the sea-level-0 ocean flag equals the unchanged base field, 6 identity bodies x 20000 directions',()=>{
  const N=20000;let flips=0,ocean=0;
  for(const body of identityBodies()){
    const base=baseTerrainSampler(body),relief=terrainSampler(body);
    for(let i=0;i<N;i++){const d=fib(i,N),o=relief(d).ocean;flips+=o!==base(d).ocean;ocean+=o;}
  }
  assert.ok(ocean>10000,`ocean samples ${ocean}`);
  assert.equal(flips,0);
});

test('Maithea land hypsometry, snow, beaches and lowland (20000 directions, sea level 0)',()=>{
  const body=maithea(),tau=tectonicReliefOf(body),ts=terrainSampler(body),cls=biomeClassifier(body),N=20000;
  assert.ok(tau>.7&&tau<.9,`derived tau ${tau}`);
  const land=[];let snow=0,sand=0,lowland=0,rangeHi=0,rangeHiSnow=0,low=0,lowSnow=0;
  for(let i=0;i<N;i++){
    const d=fib(i,N),s=ts(d);if(s.ocean)continue;
    const h=s.groundHeightM,c=cls(d,h,1),isSnow=c.name===SNOW;land.push(h);
    snow+=isSnow;sand+=c.name==='Coastal sand';
    if((c.name==='Temperate ground'||c.name==='Dry upland')&&h<500)lowland++;
    if(Math.abs(d[1])<.866&&h>3000){rangeHi++;rangeHiSnow+=isSnow;}
    if(Math.abs(d[1])<.866&&h<1500){low++;lowSnow+=isSnow;}
  }
  const n=land.length,p=q=>quantile(land,q),pct=v=>100*v/n;
  const report={n,p10:p(.1),p50:p(.5),p90:p(.9),p99:p(.99),max:p(1),above4km:pct(land.filter(h=>h>4000).length),below500:pct(land.filter(h=>h<500).length),
    snow:pct(snow),sand:pct(sand),lowland:pct(lowland),rangeSnow:100*rangeHiSnow/rangeHi,lowSnow:100*lowSnow/low};
  console.log('# Maithea relief',JSON.stringify(report));
  const where=JSON.stringify(report);
  assert.ok(report.p10>=150&&report.p10<=300,where);
  assert.ok(report.p50>=350&&report.p50<=650,where);
  assert.ok(report.p90>=1800&&report.p90<=3300,where);
  assert.ok(report.p99>=3500&&report.p99<=6000,where);
  assert.ok(report.above4km>=1&&report.above4km<=6,where);
  assert.ok(report.below500>=45,where);
  assert.ok(report.max<=8800*tau+1000,where);
  // Owner decision 1: Maithea snow accepted in 15-40% (plan expectation 18-23% at derived tau).
  assert.ok(report.snow>=15&&report.snow<=40,where);
  assert.ok(rangeHi>100&&report.rangeSnow>=20,`snow on ranges: ${where}`);
  assert.ok(report.lowSnow<=5,`little snow on low land: ${where}`);
  assert.ok(report.sand>=.8&&report.sand<=3,`beaches: ${where}`);
  assert.ok(report.lowland>=30,`lowland/valleys: ${where}`);
});

test('seabed on the four water worlds: depth, trenches, shelf, detail at every depth, never reaching sea level',()=>{
  const N=16384;
  for(const body of waterWorlds()){
    const L=reliefLayersSampler(body),bands=[[0,200],[200,2000],[2000,6000],[6000,Infinity]].map(([lo,hi])=>({lo,hi,v:[]}));
    const depths=[];let shelf=0,reachesSea=0;
    for(let i=0;i<N;i++){
      const x=L(fib(i,N));if(!x.ocean)continue;
      depths.push(-x.groundHeightM);shelf+=x.groundHeightM>-200;reachesSea+=x.groundHeightM>=0;
      const depth=-x.smoothFloorM;for(const b of bands)if(depth>=b.lo&&depth<b.hi)b.v.push(x.groundHeightM-x.smoothFloorM);
    }
    const mean=depths.reduce((a,c)=>a+c,0)/depths.length,deep=-quantile(depths,.999);
    const sd=a=>{const m=a.reduce((s,v)=>s+v,0)/a.length;return Math.sqrt(a.reduce((s,v)=>s+(v-m)*(v-m),0)/a.length);};
    const report={body:body.name,n:depths.length,mean,deepest01:deep,shelf:100*shelf/depths.length,reachesSea,
      detailStd:bands.map(b=>[b.lo,b.v.length,b.v.length?sd(b.v):null])};
    console.log('# seabed',JSON.stringify(report));
    const where=JSON.stringify(report);
    assert.ok(mean>=3000&&mean<=4200,where);
    assert.ok(deep<=-9500&&deep>=-11500,where);
    assert.ok(report.shelf>=5&&report.shelf<=12,where);
    assert.equal(reachesSea,0,where);
    for(const b of bands){assert.ok(b.v.length>=30,`${body.name} band ${b.lo}: ${b.v.length} samples`);assert.ok(sd(b.v)>20,where);}
  }
});

test('dry worlds: the p1..p99 span follows tau (Spearman > 0.6); Earth-g low-vigour spans 4-9 km',()=>{
  const dry=[];
  for(const g of galaxies('LETHRA-GOLDEN-001').slice(0,3))for(const r of sector(g,[0,0,0]).refs.slice(0,60))
    for(const p of system(r).planets)if(p.type!=='Gas giant'&&!(p.water>0))dry.push(p);
  const rows=dry.slice(0,60).map(b=>{
    const ts=terrainSampler(b),geo=planetGeophysics(b),h=[];
    for(let i=0;i<2500;i++)h.push(ts(fib(i,2500)).groundHeightM);
    return {tau:geo.tectonicRelief,g:geo.surfaceGravityMS2,vigour:geo.tectonicVigour01,span:quantile(h,.99)-quantile(h,.01)};
  });
  assert.equal(rows.length,60);
  const rho=spearman(rows.map(r=>r.span),rows.map(r=>r.tau));
  const earth=rows.filter(r=>r.g>7.5&&r.g<12.5&&r.vigour<.55);
  console.log('# dry worlds',JSON.stringify({rho,spanKm:[.1,.5,.9].map(q=>quantile(rows.map(r=>r.span),q)/1000),earthLowVigourKm:earth.map(r=>r.span/1000)}));
  assert.ok(rho>.6,`Spearman(span, tau) ${rho}`);
  assert.ok(earth.length>0,'the sample contains Earth-g low-vigour dry worlds');
  for(const r of earth)assert.ok(r.span>=4000&&r.span<=9000,JSON.stringify(r));
});

test('corpus of 132 habitable water planets: snow share median <= 20%, at most 20 above 90%, colder anchors are snowier',()=>{
  const rows=[];
  for(const g of galaxies('LETHRA-GOLDEN-001').slice(0,3))for(const r of sector(g,[0,0,0]).refs.slice(0,120))
    for(const p of system(r).planets)if(p.type!=='Gas giant'&&p.water>0&&temperateHabitat(p))rows.push(p);
  assert.equal(rows.length,132);
  const N=2500,out=[];
  for(const b of rows){
    const ts=terrainSampler(b),c=biomeClassifier(b);let n=0,sn=0;
    for(let i=0;i<N;i++){const d=fib(i,N),s=ts(d);if(s.ocean)continue;n++;sn+=c(d,s.groundHeightM,1).name===SNOW;}
    if(n>50)out.push({T:b.temperatureK,snow:sn/n});
  }
  const shares=out.map(r=>r.snow),median=quantile(shares,.5),over90=shares.filter(s=>s>.9).length;
  const bins=[[250,265],[265,275],[275,285],[285,295],[295,326]].map(([lo,hi])=>quantile(out.filter(r=>r.T>=lo&&r.T<hi).map(r=>r.snow),.5));
  console.log('# corpus snow',JSON.stringify({n:out.length,median,over90,binMedians:bins}));
  assert.ok(median<=.2,`median ${median}`);
  assert.ok(over90<=20,`above 90%: ${over90}`);
  for(let i=1;i<bins.length;i++)assert.ok(bins[i]<=bins[i-1],`snow median falls as anchor temperature rises: ${bins}`);
});

test('window invariant 0 <= h - floorM <= terrainWindowMaxM(body) (tau-aware) on the identity bodies and the four water worlds',()=>{
  const N=20000,bodies=[...identityBodies(),...waterWorlds().slice(1)];
  for(const body of bodies){
    const s=terrainFloorSampler(body),bound=terrainWindowMaxM(body);
    assert.ok(Math.abs(bound-tectonicReliefOf(body)*terrainUnitWindowMaxM(body))<1e-9);
    let bad=0,max=0;
    for(let i=0;i<N;i++){const x=s(fib(i,N)),w=x.groundHeightM-x.floorM;if(x.windowM!==w||!(w>=0&&w<=bound))bad++;if(w>max)max=w;}
    assert.equal(bad,0,`${body.name}: window max ${max} of ${bound}`);
  }
});

test('bodyHeightBoundM contains every sample: 60 catalogue bodies x 20000 directions (all kinds); the orbit texture range is that bound',()=>{
  const all=catalogueBodies(),pick=[];
  for(const type of [...new Set(all.map(b=>b.type))])pick.push(...all.filter(b=>b.type===type).slice(0,10));
  // 4 water worlds + 10 per type (Volcanic, Rocky, Oceanic, Ice, Gas giant, Airless moon), first 60.
  const bodies=[...waterWorlds(),...pick.filter(b=>!waterWorlds().some(w=>w.id===b.id))].slice(0,60);
  assert.equal(bodies.length,60);
  const N=20000;let outside=0;
  for(const body of bodies){
    const ts=terrainSampler(body),{minM,maxM}=bodyHeightBoundM(body),range=reliefTextureRange(body);
    assert.ok(minM<=maxM);
    if(maxM>minM)assert.deepEqual(range,{minM,maxM});
    for(let i=0;i<N;i++){const h=ts(fib(i,N)).groundHeightM;if(!(h>=minM&&h<=maxM))outside++;}
  }
  assert.equal(outside,0);
});
