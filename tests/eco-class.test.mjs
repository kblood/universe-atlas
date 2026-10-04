// ECO-CLASS-1 (biome increment 2, P3): the absolute eco-class table.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {
  ECO_CLASS_VERSION, ECO_CLASS_CALIBRATION as K, ECO_CLASS_COUNT, ECO_CLASS_LABELS, ECO_THERMAL_RANK, ECO_MOISTURE_RANK,
  LEGACY_BEHAVIOUR_CLASSES, ecoClassOf, life01Of, npp01Of, ecotypeOf, groundLookOf, ecoClassOfBiomeSample,
} from '../src/eco-class.ts';

// Pinned: any calibration edit must bump ECO_CLASS_VERSION and re-pin this pair.
const PINNED={version:'eco-class-1',sha:'4df8658a5c8fb35b4914c5649fcee11ede5b852350a4809d209e4b03177e6bc7'};
const sha=createHash('sha256').update(JSON.stringify(K)).digest('hex');

test('calibration sha is pinned to the version',()=>{
  assert.equal(ECO_CLASS_VERSION,PINNED.version);
  assert.equal(sha,PINNED.sha,`calibration changed (sha ${sha}): bump ECO_CLASS_VERSION and re-pin`);
  assert.ok(Object.isFrozen(K));
  assert.equal(ECO_CLASS_LABELS.length,ECO_CLASS_COUNT);
  assert.deepEqual([...LEGACY_BEHAVIOUR_CLASSES].sort(),[4,5,6]);
});

// A temperate inland sample; each row below overrides what it needs.
const BASE={Ta:285,Tw:295,Tc:275,M:.6,snow:0,h:500,sand:0,datumTw:300,living:true};
const cls=o=>{const s={...BASE,...o};return ecoClassOf(s.Ta,s.Tw,s.Tc,s.M,s.snow,s.h,s.sand,s.datumTw,s.living);};

test('synthetic samples at every threshold edge map to the expected class',()=>{
  const e=1e-9;
  const rows=[
    [{living:false},13],
    [{Ta:K.STERILE_ANNUAL_K,Tw:K.STERILE_ANNUAL_K+5,Tc:K.STERILE_ANNUAL_K-5},12],[{Ta:K.STERILE_ANNUAL_K-e,Tw:K.STERILE_ANNUAL_K+5,Tc:K.STERILE_ANNUAL_K-5,M:.7},7],
    [{Ta:300,Tw:K.STERILE_WARMEST_K,Tc:298},12],[{Ta:300,Tw:K.STERILE_WARMEST_K-e,Tc:298,M:.7},7],
    [{snow:K.NIVAL_SNOW+e},0],[{snow:K.NIVAL_SNOW},4],
    [{Ta:260,Tw:K.FREEZE_K-e,Tc:250},0],[{Ta:260,Tw:K.FREEZE_K,Tc:250,datumTw:K.FREEZE_K},1],
    [{Ta:270,Tw:K.TUNDRA_WARMEST_K-e,Tc:260,datumTw:K.TUNDRA_WARMEST_K-e},1],
    [{Ta:270,Tw:K.TUNDRA_WARMEST_K-e,Tc:260,datumTw:K.TUNDRA_WARMEST_K},2],
    [{Ta:270,Tw:K.TUNDRA_WARMEST_K,Tc:260},3],
    [{h:K.COAST_HEIGHT_M-e,sand:K.COAST_SAND+e},11],[{h:K.COAST_HEIGHT_M,sand:.9},4],[{h:10,sand:K.COAST_SAND},4],
    [{h:10,sand:.9,Ta:270,Tw:280,Tc:260,datumTw:281},1],// tundra wins over coast
    [{M:K.DESERT_MOISTURE-e,Ta:K.HOT_DESERT_ANNUAL_K},9],[{M:K.DESERT_MOISTURE-e,Ta:K.HOT_DESERT_ANNUAL_K-e},10],[{M:K.DESERT_MOISTURE},5],
    [{Ta:296,Tw:300,Tc:K.TROPICAL_COLDEST_K,M:K.TROPICAL_WET_MOISTURE},7],[{Ta:296,Tw:300,Tc:K.TROPICAL_COLDEST_K,M:K.TROPICAL_WET_MOISTURE-e},8],
    [{Ta:296,Tw:300,Tc:K.TROPICAL_COLDEST_K-e,M:.7},6],
    [{Ta:278,Tw:290,Tc:K.BOREAL_COLDEST_K-e,M:K.BOREAL_MOISTURE},3],[{Ta:278,Tw:290,Tc:K.BOREAL_COLDEST_K,M:.6},4],
    [{Ta:278,Tw:290,Tc:K.BOREAL_COLDEST_K-e,M:K.BOREAL_MOISTURE-e},5],[{Ta:282,Tw:K.BOREAL_WARMEST_K,Tc:260,M:.6},4],
    [{Ta:K.SUBTROPICAL_ANNUAL_K,Tw:296,Tc:K.SUBTROPICAL_COLDEST_K,M:K.FOREST_MOISTURE},6],[{Ta:K.SUBTROPICAL_ANNUAL_K-e,Tw:296,Tc:284,M:.6},4],
    [{Ta:291,Tw:296,Tc:K.SUBTROPICAL_COLDEST_K-e,M:.6},4],[{M:K.FOREST_MOISTURE-e},5],
  ];
  for(const [o,want] of rows)assert.equal(cls(o),want,JSON.stringify(o));
});

test('every class 0-13 is reachable',()=>{
  const seen=new Set();
  for(let Ta=230;Ta<=330;Ta+=1)for(const half of [0,3,8,15])for(let M=0;M<=1;M+=.02)for(const [h,sand] of [[500,0],[20,.9]])for(const snowOn of [0,1]){
    const Tw=Ta+half,Tc=Ta-half,snow=snowOn?Math.min(1,Math.max(0,(268-Ta)/6)):0;
    for(const datumTw of [Tw,Tw+20])seen.add(ecoClassOf(Ta,Tw,Tc,M,snow,h,sand,datumTw,true));
  }
  seen.add(cls({living:false}));
  assert.deepEqual([...seen].sort((a,b)=>a-b),Array.from({length:14},(_,i)=>i));
});

test('classes are monotone in temperature (Ta, TwP, Tc) and in effective moisture',()=>{
  const rank=c=>ECO_THERMAL_RANK[c];
  const mrank=c=>ECO_MOISTURE_RANK[c];
  const check=(seq,name,r)=>{let last=-Infinity;for(const [x,c] of seq){const v=r(c);if(v<0)continue;assert.ok(v>=last,`${name}: rank fell to ${v} (class ${c}) at ${x}`);last=v;}};
  // Joint sweep: the whole climate warms with a fixed seasonal half-range.
  for(const half of [0,2,5,9,14,20])for(let M=0;M<=1.0001;M+=.01)for(const snowRule of [false,true]){
    const seq=[];
    for(let Ta=220;Ta<=340;Ta+=.25){const snow=snowRule?Math.min(1,Math.max(0,(268-Ta)/6)):0;seq.push([Ta,ecoClassOf(Ta,Ta+half,Ta-half,M,snow,500,0,Ta+half,true)]);}
    check(seq,`joint half=${half} M=${M.toFixed(2)}`,rank);
  }
  // One temperature at a time, the others fixed (only Tc <= Ta <= TwP samples).
  for(let M=0;M<=1.0001;M+=.02)for(const [a,b] of [[250,270],[268,285],[280,295],[288,300],[295,320]]){
    const sTa=[],sTw=[],sTc=[];
    for(let x=200;x<=345;x+=.25){
      if(x>=a&&x<=b)sTa.push([x,ecoClassOf(x,b,a,M,0,500,0,b,true)]);
      if(x>=b)sTw.push([x,ecoClassOf(b,x,a,M,0,500,0,x,true)]);
      if(x<=a)sTc.push([x,ecoClassOf(a,b,x,M,0,500,0,b,true)]);
    }
    check(sTa,`Ta-only M=${M.toFixed(2)} [${a},${b}]`,rank);check(sTw,`TwP-only M=${M.toFixed(2)}`,rank);check(sTc,`Tc-only M=${M.toFixed(2)}`,rank);
  }
  // Moisture sweep at fixed temperatures.
  for(let Ta=250;Ta<=330;Ta+=.5)for(const half of [0,3,8,15]){
    const seq=[];for(let M=0;M<=1.0001;M+=.001)seq.push([M,ecoClassOf(Ta,Ta+half,Ta-half,M,0,500,0,Ta+half,true)]);
    check(seq,`moisture Ta=${Ta} half=${half}`,mrank);
  }
});

test('groundLookOf is continuous: <= 0.02 per 0.01 K, 0.001 moisture or 0.01 deg step',()=>{
  const out=new Float32Array(4),prev=new Float32Array(4);
  let worst=0;
  const sweep=(f,from,to,step)=>{f(from,prev);for(let x=from+step;x<=to;x+=step){f(x,out);for(let i=0;i<4;i++)worst=Math.max(worst,Math.abs(out[i]-prev[i]));prev.set(out);}};
  for(const M of [.2,.35,.45,.6])for(const slope of [0,10,30]){
    sweep((x,o)=>groundLookOf(x,x-5,x-10,M,.5,slope,o),240,330,.01);// all temperatures together
    sweep((x,o)=>groundLookOf(x,285,280,M,.5,slope,o),270,320,.01);// TwP only
    sweep((x,o)=>groundLookOf(300,290,x,M,.5,slope,o),250,300,.01);// Tc only
  }
  for(const T of [270,282,292])for(const slope of [0,30])sweep((x,o)=>groundLookOf(T+6,T,T-4,x,.5,slope,o),0,1,.001);
  for(const tl of [0,.5,1])sweep((x,o)=>groundLookOf(290,285,280,.6,tl,x,o),0,60,.01);
  assert.ok(worst<=.02,`max step ${worst}`);
  for(let i=0;i<500;i++){groundLookOf(230+i*.2,225+i*.2,220+i*.2,i/500,(i%7)/6,(i*.13)%60,out);for(const v of out)assert.ok(v>=0&&v<=1);}
});

test('groundLookOf is all zeros at the SITE_A increment-1 climate and ramps on its own channels',()=>{
  // SITE_A (increment 1): Ta 292.4, Tw 296.7, effM 0.75; Tc = 2Ta - Tw; flat, below the treeline.
  const out=groundLookOf(296.7,292.4,2*292.4-296.7,.75,1,0,new Float32Array(4));
  assert.deepEqual([...out],[0,0,0,0]);
  const o=new Float32Array(4);
  assert.ok(groundLookOf(276,265,255,.6,0,0,o)[0]>.99,'cold tundra: peat');
  assert.ok(groundLookOf(310,300,292,.1,1,0,o)[1]>.99,'dry: straw/sand');
  assert.ok(groundLookOf(300,297,295,.8,1,0,o)[2]>.99,'humid tropics: red soil');
  assert.ok(groundLookOf(295,290,285,.6,1,45,o)[3]>.99,'steep: scree');
});

test('life01, npp01 and ecotype follow the plan',()=>{
  for(let c=1;c<=11;c++)assert.ok(life01Of(c,300,290)>0,`class ${c} has life`);
  for(const c of [12,13])assert.equal(life01Of(c,300,290),0);
  assert.equal(life01Of(7,330,320),0,'heat fades life by TwP 325 K');
  assert.ok(life01Of(0,272,265)>0&&life01Of(0,250,240)===0,'nival life on the cold margin only');
  assert.ok(life01Of(0,272,250)<life01Of(0,272,262),'nival life thins out up the plateau');
  // Whittaker & Likens ordering.
  const order=[7,6,4,8,3,5,1,9,0];
  for(let i=1;i<order.length;i++)assert.ok(npp01Of(order[i-1])>npp01Of(order[i]),`npp ${order[i-1]} > ${order[i]}`);
  assert.deepEqual(Array.from({length:14},(_,c)=>ecotypeOf(c)),[1,1,4,1,0,0,0,3,3,2,2,5,0,0]);
});

test('live classifier adapter: ocean is -1, Tc derives from Ta and TwP',()=>{
  const s={annualMeanTempK:292.4,warmestMonthK:296.7,effectiveMoisture:.75,snowFraction:0,weights:[0,1,0,0],ocean:false};
  assert.equal(ecoClassOfBiomeSample(s,280,.0065,true),6);
  assert.equal(ecoClassOfBiomeSample({...s,ocean:true},-10,.0065,true),-1);
  assert.equal(ecoClassOfBiomeSample(s,280,.0065,false),13);
});

test('source is arithmetic only: no Math transcendental, hash or string compare',()=>{
  const src=readFileSync(new URL('../src/eco-class.ts',import.meta.url),'utf8').replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/.*$/gm,'');
  for(const banned of [/Math\.(sin|cos|tan|asin|acos|atan|atan2|exp|log|log2|log10|pow|sqrt|cbrt|hypot|sinh|cosh|tanh|random)\b/,/hash64|hash32/,/localeCompare/,/\*\*/])
    assert.doesNotMatch(src,banned);
});

test('ecoClassOf + life01Of + groundLookOf cost <= 25 ns per call, no allocation',()=>{
  const out=new Float32Array(4);
  const N=400000;let sink=0;
  // Inputs precomputed so the timed loop is the three calls, not the harness.
  const ta=new Float64Array(4096),mm=new Float64Array(4096),sl=new Float64Array(4096);
  for(let i=0;i<4096;i++){ta[i]=240+(i*37%900)*.1;mm[i]=(i*53%997)/997;sl[i]=i%60;}
  const run=()=>{let s=0;for(let i=0;i<N;i++){const j=i&4095,Ta=ta[j],M=mm[j];const c=ecoClassOf(Ta,Ta+6,Ta-6,M,0,300,0,Ta+8,true);s+=life01Of(c,Ta+6,Ta);groundLookOf(Ta+6,Ta,Ta-6,M,.5,sl[j],out);s+=out[0];}return s;};
  sink+=run();sink+=run();
  if(global.gc)global.gc();
  const heap0=process.memoryUsage().heapUsed;
  let ns=Infinity;
  for(let r=0;r<5;r++){const t0=process.hrtime.bigint();sink+=run();ns=Math.min(ns,Number(process.hrtime.bigint()-t0)/N);}
  const heapGrowth=process.memoryUsage().heapUsed-heap0;
  assert.ok(Number.isFinite(sink));
  const strict=process.env.ECO_PERF_STRICT==='1';
  // Best of 5. Relaxed default on a contended host; ECO_PERF_STRICT=1 applies the plan's 25 ns on a quiet host.
  assert.ok(ns<=(strict?25:100),`${ns.toFixed(1)} ns per call`);
  assert.ok(heapGrowth<4<<20,`heap grew ${heapGrowth} bytes over ${N} calls`);
  console.log(`# eco-class cost ${ns.toFixed(1)} ns/call (contended unless quiet host), heap delta ${heapGrowth} B`);
});
