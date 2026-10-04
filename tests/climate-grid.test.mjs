import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildClimateGrid,buildClimateGridFromMask,landProxyHeightM,sampleClimateGrid,createClimateGridSample,CLIMATE_GRID_VERSION} from '../src/climate-grid.ts';
import {RELIEF_CALIBRATION as R,tectonicReliefOf} from '../src/terrain.ts';
import {hash64,macroHeightCode} from '../src/catalog.ts';
import {climateForcingFor,surfaceClimate,createClimateSample} from '../src/surface-climate.ts';
import {maithea,fib} from './terrain-climate-fixtures.mjs';
const NX=128,NY=64,N=NX*NY,step=Math.PI/64;
const params={moistureSeed:123,water:.6,radiusM:6371000,obliquityRad:.4,itczSinLat:0,hadleyEdgeDeg:30,zonalAnnualK:new Float64Array(65).fill(288)};
const profile=tau=>({kind:'relief',tau,hc:R.HC,hup:R.HUP,b1:R.B1,b2:R.B2,hhi:R.HHI,b3:R.B3,b4:R.B4});
const direction=(x,y)=>{const lat=-Math.PI/2+(y+.5)*step,lon=-Math.PI+(x+.5)*step;return [Math.cos(lat)*Math.cos(lon),Math.sin(lat),Math.cos(lat)*Math.sin(lon)];};
const mask=(fn)=>{const ocean=new Uint8Array(N),heightM=new Float64Array(N);for(let y=0;y<NY;y++)for(let x=0;x<NX;x++){const h=fn(x,y);ocean[y*NX+x]=h<0?1:0;heightM[y*NX+x]=Math.max(0,h);}return {ocean,heightM};};
const sample=(g,x,y)=>sampleClimateGrid(g,direction(x,y),createClimateGridSample());
// Meridional continent at columns 50..77 (about 6300 km wide at 43.6 deg) with a
// 2-cell 3000 m ridge at 63..64; `flat` is the same continent without the ridge.
const continent=mask(x=>x>=50&&x<=77?(x>=63&&x<=64?3000:0):-1);
const flat=mask(x=>x>=50&&x<=77?0:-1);
const west=buildClimateGridFromMask(params,continent);
const east=buildClimateGridFromMask({...params,hadleyEdgeDeg:60},continent);
const westFlat=buildClimateGridFromMask(params,flat);
const eastFlat=buildClimateGridFromMask({...params,hadleyEdgeDeg:60},flat);

test('aquaplanet and dry world: exact constants at all vertices and 1000 samples',()=>{
 for(const dry of [false,true]){const g=buildClimateGridFromMask({...params,water:dry?0:.6},mask(()=>-1));assert.equal(g.version,CLIMATE_GRID_VERSION);
 assert.ok(g.precipMul.every(v=>v===1));assert.ok(g.oceanness.every(v=>v===(dry?0:1)));
 for(let i=0;i<1000;i++){const s=sampleClimateGrid(g,fib(i,1000),createClimateGridSample());assert.equal(s.precipMul,1);assert.equal(s.oceanness01,dry?0:1);}}
 const g=buildClimateGrid({...params,water:0});assert.ok(g.oceanness.every(v=>v===0));assert.ok(g.precipMul.every(v=>v===1));
});
test('ridge shadow beyond a flat-ground control; trades reverse which side is dry; flat continentality',()=>{
 // Rows 47/16 are 43.59 degrees N/S: west winds at edge=30, trades at edge=60.
 // Samples are the flat cells one column outside either ridge edge (61 and 66).
 // They are close enough together that continental drying alone stays ABOVE
 // 0.6x (flat control), so only the ridge can push the lee side below it.
 for(const y of [47,16]){
  const wLeft=sample(west,61,y).precipMul,wRight=sample(west,66,y).precipMul;
  const eLeft=sample(east,61,y).precipMul,eRight=sample(east,66,y).precipMul;
  assert.ok(wRight<=.6*wLeft,`west ${y}: ${wLeft} -> ${wRight}`);assert.ok(eLeft<=.6*eRight,`east ${y}: ${eRight} -> ${eLeft}`);
  const fwLeft=sample(westFlat,61,y).precipMul,fwRight=sample(westFlat,66,y).precipMul;
  const feLeft=sample(eastFlat,61,y).precipMul,feRight=sample(eastFlat,66,y).precipMul;
  assert.ok(fwRight>.6*fwLeft,`flat west ${y} must not reach the threshold: ${fwLeft} -> ${fwRight}`);
  assert.ok(feLeft>.6*feRight,`flat east ${y} must not reach the threshold: ${feRight} -> ${feLeft}`);
  // The ridge itself removes at least 30% of the lee rain the flat continent keeps.
  assert.ok(wRight<=.7*fwRight,`ridge lee ${wRight} vs flat lee ${fwRight}`);assert.ok(eLeft<=.7*feLeft,`ridge lee ${eLeft} vs flat lee ${feLeft}`);
  // The symmetric continent/ridge has reflected precipitation within cube interpolation error.
  assert.ok(Math.abs(wLeft-eRight)<.03);assert.ok(Math.abs(wRight-eLeft)<.03);
 }
 // Continentality on the flat control, so the ridge cannot contribute.
 const y=47,dx=step*params.radiusM/1000*Math.cos(-Math.PI/2+(y+.5)*step);
 const coast=51,inland=coast+2000/dx;
 assert.ok(sample(westFlat,inland,y).precipMul<=.6*sample(westFlat,coast,y).precipMul);
});
function checkSeams(g,n=10000){const a=createClimateGridSample(),b=createClimateGridSample();for(let i=0;i<n;i++){
 const axis=i%3,s=i%2?1:-1,t=i%4<2?1:-1,q=i%7===0?(i%2?1:-1):2*((i*7919%10001)/10000)-1;
 const d=[q,q,q],e=[q,q,q],j=(axis+1)%3;d[axis]=s*(1+1e-8);d[j]=t;e[axis]=s;e[j]=t*(1+1e-8);
 sampleClimateGrid(g,d,a);sampleClimateGrid(g,e,b);assert.ok(Math.abs(a.precipMul-b.precipMul)<=1e-3,`rain seam ${i}`);assert.ok(Math.abs(a.oceanness01-b.oceanness01)<=1e-3,`ocean seam ${i}`);
}}
test('10000 edge/corner pairs are continuous; corrupted face fails the same assertion',()=>{
 checkSeams(west);const broken={...west,precipMul:west.precipMul.slice()};broken.precipMul.fill(5,0,33*33);assert.throws(()=>checkSeams(broken),assert.AssertionError);
});
test('build bytes are repeatable and depend on macro seed; grid memory <=64 KiB',()=>{
 const a=buildClimateGrid(params),b=buildClimateGrid(params),c=buildClimateGrid({...params,moistureSeed:456});
 for(const key of ['precipMul','oceanness']){assert.deepEqual(new Uint8Array(a[key].buffer),new Uint8Array(b[key].buffer));assert.notDeepEqual(new Uint8Array(a[key].buffer),new Uint8Array(c[key].buffer));}
 assert.ok(a.precipMul.byteLength+a.oceanness.byteLength<=64*1024);checkSeams(a);
});
test('raster distances within 15% of brute force, including adversarial oceans',t=>{
 const cases=[
  ['wrapped patch',(x,y)=>((x<3||x>125)&&y>=27&&y<=36)],
  ['long thin meridian',(x,y)=>x===63&&y>=3&&y<=60],
  ['wrap seam only',(x,y)=>x===127&&y>=27&&y<=36],
  ['single south polar cell',(x,y)=>x===17&&y===0],
  ['single north polar cell',(x,y)=>x===109&&y===63],
  ['single equatorial cell',(x,y)=>x===64&&y===32],
  ['long thin equatorial ocean',(x,y)=>y===32&&x>=12&&x<=115],
 ];
 let worst=0;
 for(const [name,fn] of cases){
 const m=mask((x,y)=>fn(x,y)?-1:0);m.distanceKm=new Float64Array(N);buildClimateGridFromMask(params,m);
 const ocean=[];for(let k=0;k<N;k++)if(m.ocean[k])ocean.push(direction(k%NX,Math.floor(k/NX)));
 let caseWorst=0;for(let k=0;k<N;k++){if(m.ocean[k])continue;const d=direction(k%NX,Math.floor(k/NX));let exact=Infinity;
 for(const o of ocean)exact=Math.min(exact,Math.acos(Math.max(-1,Math.min(1,d[0]*o[0]+d[1]*o[1]+d[2]*o[2])))*params.radiusM/1000);
 const error=Math.abs(m.distanceKm[k]/exact-1);caseWorst=Math.max(caseWorst,error);assert.ok(error<=.15,`${name} ${k}: ${error}`);}
 worst=Math.max(worst,caseWorst);t.diagnostic(`${name}: worst relative error ${caseWorst}`);
 }
 t.diagnostic(`Overall worst relative error: ${worst}`);
});
test('land proxy matches terrain floor, is monotone and handles legacy units and radius clamp',()=>{
 const ss=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
 for(const tau of [.6,1,2.6])for(const radius of [1e6,6371000]){let prev=0;for(const a of [0,100,4000,7500,10000,11000,14000,16000,40000]){
 const floor=a/(1+a/R.HC)+tau*(R.HUP*ss(R.B1,R.B2,a)+R.HHI*ss(R.B3,R.B4,a));const h=landProxyHeightM(a,radius,profile(tau));assert.equal(h,Math.min(18000,floor)*Math.min(1,radius/2e6));assert.ok(h>=prev);prev=h;}}
 assert.equal(landProxyHeightM(1000,1e6,{kind:'linear',metresPerUnit:23500}),250);
 assert.equal(landProxyHeightM(40000,1e6,{kind:'linear',metresPerUnit:47000}),9000);
});
test('real catalogue world with relief profile: bounded finite fields and deep ocean ~1',()=>{
 const body=maithea(),forcing=climateForcingFor(body),climate=surfaceClimate(forcing),out=createClimateSample(),annual=new Float64Array(65);
 for(let k=0;k<=64;k++){const y=k/64;annual[k]=climate([Math.sqrt(1-y*y),y,0],0,out).annualMeanTempK;}
 const p={...params,water:body.water,radiusM:body.radiusM,moistureSeed:Number(hash64(body.seed+'/macro-v1')&0xffffffffn),zonalAnnualK:annual,land:profile(tectonicReliefOf(body))};
 const g=buildClimateGrid(p);assert.ok(g.precipMul.every(v=>Number.isFinite(v)&&v>=.15&&v<=1.6));assert.ok(g.oceanness.every(v=>Number.isFinite(v)&&v>=0&&v<=1));
 let checked=0;for(let y=4;y<60;y+=4)for(let x=0;x<128;x+=4){const d=direction(x,y);if(macroHeightCode(p.moistureSeed,d)<.37+.22*p.water-.1){assert.ok(sample(g,x,y).oceanness01>.9);checked++;}}assert.ok(checked>10);
});
test('no-ocean rows have zero maritime influence and floor rain; ITCZ crossing the Hadley edge reverses winds in both hemispheres',()=>{
 const g=buildClimateGridFromMask(params,mask(()=>0));assert.ok(g.oceanness.every(v=>v===0));assert.ok(g.precipMul.every(v=>Math.abs(v-.15)<1e-7));
 // Hadley edge held at 30 deg. Rows 47/16 sit at 43.59 deg N/S. ITCZ at 0 or 10 deg
 // leaves them 43.6/33.6 deg away (westerlies, east side dry); at 20 deg they are
 // 23.6 deg away (inside the trades, west side dry). Only the ITCZ moves.
 const itcz=deg=>buildClimateGridFromMask({...params,itczSinLat:Math.sin(deg*Math.PI/180)},continent);
 for(const [deg,trades] of [[0,false],[10,false],[20,true]]){const grid=itcz(deg);
  for(const y of [47,16]){const left=sample(grid,61,y).precipMul,right=sample(grid,66,y).precipMul;
   if(trades)assert.ok(left<=.6*right,`ITCZ ${deg} row ${y}: trades should dry the west, ${right} -> ${left}`);
   else assert.ok(right<=.6*left,`ITCZ ${deg} row ${y}: westerlies should dry the east, ${left} -> ${right}`);}}
});
test('source determinism and import boundaries; sampler contains no allocations or hashing',()=>{
 const src=readFileSync(new URL('../src/climate-grid.ts',import.meta.url),'utf8');const code=src.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');
 const imports=[...code.matchAll(/from\s+['"]([^'"]+)['"]/g)].map(m=>m[1]);assert.ok(imports.length>0&&imports.every(p=>p==='./catalog.ts'||p==='./det-math.ts'));
 assert.doesNotMatch(code,/Math\.(pow|sin|cos|tan|asin|acos|atan|atan2|exp|log\w*|cbrt|hypot|random)\b|\*\*|localeCompare|\bDate\b/);
 assert.doesNotMatch(code.slice(code.indexOf('export function sampleClimateGrid')),/\bnew\b|hash64|=>/);
});

