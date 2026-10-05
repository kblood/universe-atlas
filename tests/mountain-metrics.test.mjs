import test from 'node:test';
import assert from 'node:assert/strict';
import {
  frame,localMap,raster,rasterFromArray,slopes,windowRelief,crests,prominence,
  depressions,depressionPits,coherence,axisCoherence,bandPowers,spectrum,betaFromOctaves,belowWavelength,
  hillshade,flowAccumulationD8,syntheticSampler,measureSites,MOUNTAIN_THRESHOLDS,MOUNTAIN_THRESHOLDS_SUPERSEDED,judgeM3,
} from './helpers/mountain-metrics.mjs';

// HARD: fixed-direction subset, R=5194907 m, local 129² at 125 m (16 km),
// regional 193² at 2 km and four full 128 km spectral transects. No terrain imports.
// Full four-site doc controls: alpine/dome slope p50 27.4/5.3, pits 2108/0,
// beta 2.14/3.92. Full equality is checked separately by the CLI comparison.
// The axis-coherence footprint is 2x2 here (the row uses 4x4) to keep the HARD subset fast.
const R=5194907,sites=[{d:[1,0,0]}],opts={n:129,axisSub:2};
const controls=Object.fromEntries(['alpine','dome'].map(kind=>
  [kind,measureSites(syntheticSampler(R,kind),sites,R,opts)]));
const pins={
  alpine:{slope125Over30:41.8,slope125P50:27.2,flank500mP50:16,relief8kmP50:1451,
    beta500mTo8km:1.96,fill10ShareP50:0.221,pits025Per1000km2P50:757.6,axisCoherence40kmP50:0.011},
  dome:{slope125Over30:0,slope125P50:2.6,flank500mP50:0.3,relief8kmP50:390,
    beta500mTo8km:4.11,fill10ShareP50:0,pits025Per1000km2P50:0,axisCoherence40kmP50:0.032},
};
for(const kind of ['alpine','dome'])test(`HARD: ${kind} measured subset reproduces exact pins`,()=>{
  assert.deepEqual(Object.fromEntries(judgeM3(controls[kind]).map(r=>[r.id,r.actual])),pins[kind]);
});
const failures={slope125Over30:'dome',slope125P50:'dome',flank500mP50:'dome',
  relief8kmP50:'dome',beta500mTo8km:'dome',fill10ShareP50:'alpine',
  pits025Per1000km2P50:'alpine',axisCoherence40kmP50:'alpine'};
for(const [id,kind] of Object.entries(failures))test(`CONTRACT: ${kind} fails ${id}`,()=>{
  assert.equal(judgeM3(controls[kind]).find(r=>r.id===id).pass,false);
});
test('HARD: negative controls cover every M3 row; dome passes drainage',()=>{
  assert.deepEqual(Object.keys(failures).sort(),MOUNTAIN_THRESHOLDS.map(r=>r.id).sort());
  for(const id of ['fill10ShareP50','pits025Per1000km2P50']){
    const row=judgeM3(controls.dome).find(r=>r.id===id);
    assert.equal(row.pass,true);assert.equal(row.calibrated,true);
  }
  assert.ok(judgeM3({}).every(r=>!r.pass));
  for(const row of MOUNTAIN_THRESHOLDS){
    for(const value of Array.isArray(row.value)?row.value:[row.value])
      assert.equal(judgeM3({[row.id]:value}).find(r=>r.id===row.id).pass,true);
  }
});
test('HARD: FFT-bin sinusoid concentrates variance in its wavelength octave',()=>{
  const values=Float64Array.from({length:1024},(_,i)=>Math.sin(2*Math.PI*16*i/1024));
  const copy=values.slice(),p=bandPowers(values,10);
  assert.ok(p.octave(500,1000)/p.total>=0.95);
  assert.equal(p.freqPower[16].wavelength,640);
  const plain=bandPowers(values,10,{detrend:false,window:'none'});
  assert.ok(Math.abs(plain.total-0.5)<1e-12);
  assert.ok(Math.abs(plain.freqPower[16].power-0.5)<1e-12);
  assert.equal(plain.octave(640,641),plain.freqPower[16].power);
  assert.ok(plain.octave(639,640)<1e-20);
  assert.deepEqual(values,copy);
  assert.deepEqual(bandPowers(values,10).freqPower,p.freqPower);
  assert.throws(()=>bandPowers([1,2,3],1),RangeError);
});
test('HARD: exact two-peak prominence and border censoring',()=>{
  const h=new Float64Array(49);h[8]=9;h[9]=h[10]=4;h[11]=7;
  assert.deepEqual(prominence(rasterFromArray(h,7,1)),[{p:11,prom:3}]);
  h[4]=6; // Lower peak reaches the border at 6 before its key saddle at 4.
  assert.deepEqual(prominence(rasterFromArray(h,7,1)),[]);
});
test('HARD: a closed pit has exact fill depth and drainage metrics',()=>{
  const h=new Float64Array(25).fill(21);h[12]=1;
  const r=rasterFromArray(h,5,1000),flow=flowAccumulationD8(r);
  assert.deepEqual(depressions(r),{fill10Share:1/9,pitsPer1000km2:40});
  assert.equal(flow.filled[12]-r.h[12],20);
  assert.deepEqual(flow.filled,new Float64Array(25).fill(21));
  let outlets=0;
  for(let c=0;c<25;c++){
    if(flow.receiver[c]<0)outlets+=flow.accumulation[c];
    let k=c,steps=0;while(flow.receiver[k]>=0){k=flow.receiver[k];assert.ok(++steps<25,'acyclic flat routing');}
  }
  assert.equal(outlets,25);
  assert.deepEqual(flowAccumulationD8(r),flow);
});
test('HARD: tilted plane drains all cells to the low border',()=>{
  const r=rasterFromArray(Array.from({length:25},(_,i)=>10-Math.floor(i/5)),5,1);
  const flow=flowAccumulationD8(r);
  for(let y=0;y<5;y++)for(let x=0;x<5;x++){
    const c=y*5+x;assert.equal(flow.accumulation[c],y+1);
    assert.equal(flow.receiver[c],y===4?-1:c+5);
  }
  assert.equal(flow.accumulation.slice(20).reduce((a,b)=>a+b,0),25);
});
test('HARD: geometry primitives, spectral fit and split-octave arithmetic',()=>{
  const d=[1,0,0],f=frame(d),map=localMap(d,f,1000);
  assert.deepEqual(map(0,0),d);
  assert.ok(Math.abs(Math.hypot(...map(100,200))-1)<1e-15);
  assert.deepEqual(raster(()=>({groundHeightM:10,ocean:false}),d,1000,3,125),rasterFromArray(new Array(9).fill(10),3,125));
  const plane=rasterFromArray(Array.from({length:81},(_,i)=>1000+(i%9)*125),9,125);
  assert.ok(slopes(plane,1).every(v=>v===45));
  assert.deepEqual(windowRelief(plane,0.5),[375,375,375,375]);
  const bands=Float64Array.from({length:10},(_,b)=>2**b);
  assert.equal(betaFromOctaves(bands),2);
  assert.equal(belowWavelength(bands,125),0);
  assert.equal(belowWavelength(bands,500),3);
  assert.equal(belowWavelength(bands,125*Math.sqrt(2)),Math.log2(Math.sqrt(2)));
});
test('HARD: aggregate and raster metrics are deterministic and do not mutate inputs',()=>{
  assert.deepEqual(measureSites(syntheticSampler(R,'alpine'),sites,R,opts),controls.alpine);
  const r=raster(syntheticSampler(R,'alpine'),sites[0].d,R,33,125),copy=r.h.slice();
  for(const metric of [r=>slopes(r,1),r=>windowRelief(r,1),crests,prominence,depressions,r=>coherence(r,4),r=>hillshade(r,5000)])
    assert.deepEqual(metric(r),metric(r));
  assert.deepEqual(r.h,copy);
  const sampler=syntheticSampler(R,'dome');
  assert.deepEqual(spectrum(sampler,sites[0].d,R,1),spectrum(sampler,sites[0].d,R,1));
});
// Owner decision (a), 2026-10-05: rows 7 and 8 calibrated against eroded positive controls
// (docs/mountain-m3-calibration-v1.md). The superseded rows stay on record and as INFO metrics.
test('CONTRACT: calibrated rows 7/8 replace the superseded rows; the other six are unchanged',()=>{
  assert.deepEqual(MOUNTAIN_THRESHOLDS.map(r=>r.id),['slope125Over30','slope125P50','flank500mP50',
    'relief8kmP50','beta500mTo8km','fill10ShareP50','pits025Per1000km2P50','axisCoherence40kmP50']);
  assert.deepEqual(MOUNTAIN_THRESHOLDS.map(r=>r.value).slice(0,6),[25,20,12,1500,[2.0,2.6],0.05]);
  assert.equal(MOUNTAIN_THRESHOLDS[6].op,'<=');assert.equal(MOUNTAIN_THRESHOLDS[6].value,50);
  assert.equal(MOUNTAIN_THRESHOLDS[7].op,'between');assert.deepEqual(MOUNTAIN_THRESHOLDS[7].value,[0.14,0.64]);
  assert.deepEqual(MOUNTAIN_THRESHOLDS_SUPERSEDED.map(r=>[r.id,r.op,r.value]),
    [['pitsPer1000km2P50','<=',50],['coherence40kmWindowP50','>=',0.35]]);
  // The superseded metrics are still reported (INFO), bit-identical to their pre-calibration pins.
  const info=k=>[controls[k].E3b_drainage.pitsPer1000km2P50,controls[k].E1_layout.coherence40kmWindowP50];
  assert.deepEqual(info('alpine'),[1899.9,0.135]);assert.deepEqual(info('dome'),[7.7,0.412]);
});
test('HARD: depression-area pit gate counts a one-cell pit only when its basin reaches 0.25 km2',()=>{
  const h=new Float64Array(81).fill(50);h[40]=10;
  const fine=rasterFromArray(h,9,125),coarse=rasterFromArray(h,9,1000);
  assert.deepEqual(depressionPits(fine),{pitsPer1000km2:0,allPitsPer1000km2:1000/(9*.125)**2,minAreaM2:250000});
  assert.deepEqual(depressionPits(coarse),{pitsPer1000km2:1000/81,allPitsPer1000km2:1000/81,minAreaM2:250000});
  // A 5x5 basin (25 cells = 0.39 km2 at 125 m) around the pit counts.
  const b=new Float64Array(81).fill(50);for(let y=2;y<7;y++)for(let x=2;x<7;x++)b[y*9+x]=20+Math.abs(x-4)+Math.abs(y-4);
  assert.equal(depressionPits(rasterFromArray(b,9,125)).pitsPer1000km2,1000/(9*.125)**2);
  assert.equal(depressionPits(rasterFromArray(b,9,125),400000).pitsPer1000km2,0);
});
test('CONTRACT: axis coherence has teeth on both sides (isotropic low, parallel comb high)',()=>{
  // Valleys across the axis, constant along-strike: a comb (the parallel-groove failure).
  const comb=d=>({groundHeightM:2000+800*Math.cos(2*Math.PI*R*d[2]/16000),ocean:false});
  const S=axisCoherence(comb,sites[0].d,R,{n:65,sub:2}),p50=[...S].sort((a,b)=>a-b)[Math.floor((S.length-1)/2)];
  assert.ok(p50>0.9,`comb ${p50}`);
  assert.equal(judgeM3({axisCoherence40kmP50:p50}).find(r=>r.id==='axisCoherence40kmP50').pass,false);
  // Rotating the stated axis by 90 degrees turns the same comb into strike-parallel relief: S < 0.
  const T=axisCoherence(comb,sites[0].d,R,{n:65,sub:2,axis:[0,1]});
  assert.ok(T.length>0&&T.every(v=>v<-0.8),`rotated ${T}`);
  assert.equal(judgeM3(controls.alpine).find(r=>r.id==='axisCoherence40kmP50').pass,false);
});
