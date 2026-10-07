// HARD: M3 carving F memo and halo purity. Production arithmetic is loaded from the source
// with only the frozen HALO/CACHE literals edited (or private names exported), so these
// variants test the shipped code paths.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {MOUNTAIN_CARVING as C,CARVING_POINT_MEMO} from '../src/mountain-carving.ts';
import {carvingDigest,carvingDigestArgs,CARVING_F_DIGEST} from './helpers/mountain-carving-digest.mjs';

const SOURCE=readFileSync(new URL('../src/mountain-carving.ts',import.meta.url),'utf8');
let variants=0;
function loadVariant(literals={},exports='export {build,block,cache,solve};'){
  let s=SOURCE;
  for(const [k,v] of Object.entries(literals)){const re=new RegExp('\\b'+k+':\\d+,');assert.match(s,re);s=s.replace(re,k+':'+v+',');}
  // A unique comment keeps every variant a separate module instance (own memo and scratch).
  return import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(s+'\n'+exports+'\n// variant '+(variants++))).toString('base64'));
}
const S=C.CORE+1;

test('HARD: halo agreement with a wider reference halo, narrow-halo negative control',async()=>{
  const prod=await loadVariant(),wide=await loadVariant({HALO:256}),narrow=await loadVariant({HALO:32});
  let narrowDiff=0;
  for(const [seed,id] of [[730201,0],[730204,-3]]){
    const a=prod.build(seed,30000,id).r,b=wide.build(seed,30000,id).r,c=narrow.build(seed,30000,id).r;
    assert.equal(a.length,(C.ROWS+1)*S);assert.deepEqual(a,b);
    for(let k=0;k<a.length;k++)if(a[k]!==c[k])narrowDiff++;
  }
  assert.ok(narrowDiff>100,'a 4 km halo must disagree: the test has teeth ('+narrowDiff+')');
  console.log('HALO '+JSON.stringify({production:C.HALO,reference:256,narrow:32,narrowDifferingValues:narrowDiff}));
});
test('HARD: neighbouring blocks share the seam column bit-exactly and the surface is continuous',async()=>{
  const m=await loadVariant(),{carvingFM}=m;
  for(const [seed,id,w] of [[730207,5,30000],[730203,-1,22000]]){
    const a=m.build(seed,w,id).r,b=m.build(seed,w,id+1).r;
    for(let j=0;j<=C.ROWS;j++)assert.equal(a[j*S+C.CORE],b[j*S],'row '+j);
    const d=2*w/C.ROWS,x=(id+1)*C.CORE*d;let maxJump=0;
    for(let j=1;j<C.ROWS;j+=7){const y=-w+(j+.3)*d,e=3000*(1-Math.abs(y)/w);
      maxJump=Math.max(maxJump,Math.abs(carvingFM(x-1e-7,y,w,e,1,seed)-carvingFM(x,y,w,e,1,seed)));}
    assert.ok(maxJump<1e-3,'seam jump '+maxJump);
  }
});
test('HARD: evicted (CACHE 1) and LRU-bounded memo reproduces the pinned digest',async()=>{
  const m=await loadVariant({CACHE:1});
  // Two passes over (seed, block) groups: every group change rebuilds under CACHE 1.
  const args=carvingDigestArgs(),group=i=>(i<2048?0:4)+(args[i][5]-730201)*2+(args[i][0]<0?0:1);
  const order=args.map((_,i)=>i).sort((a,b)=>group(a)-group(b)||a-b);
  const before=m.carvingBuildStats.count;
  assert.equal(carvingDigest(m.carvingFM,order),CARVING_F_DIGEST);
  const builds=m.carvingBuildStats.count-before;assert.ok(builds>=8,'evictions happened: '+builds);
  assert.ok(m.cache.length<=1);
  const lru=await loadVariant({CACHE:2},'export {block,cache};');
  for(const id of [0,1,0,2,0,3])lru.block(730201,30000,id);
  assert.deepEqual(lru.cache.map(b=>b.id),[0,3]);
  console.log('EVICTED '+JSON.stringify({builds,distinctBlocks:4}));
});
test('HARD: memo key is exact in half-width and normalised seed (key-mutation control)',async()=>{
  // Same block id at two close half-widths, interleaved, must equal fresh single-width modules.
  const pts=[[1000,500],[9000,-12000],[15000,20000]],ws=[30000,30000.5];
  const fresh={};for(const w of ws){const f=await loadVariant();fresh[w]=pts.map(([x,y])=>f.carvingFM(x,y,w,3000,1,730201));}
  const diffs=m=>{let d=0;for(let pass=0;pass<2;pass++)for(const w of pass?[...ws].reverse():ws)pts.forEach(([x,y],k)=>{if(m.carvingFM(x,y,w,3000,1,730201)!==fresh[w][k])d++;});return d;};
  assert.equal(diffs(await loadVariant({},'')),0);
  // Mutation control: dropping the width comparison from the lookup must be caught.
  const key='b.seed===seed&&b.w===w&&b.id===id';assert.ok(SOURCE.includes(key));
  const keyless=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(SOURCE.replace(key,'b.seed===seed&&b.id===id')+'\n// keyless '+(variants++))).toString('base64'));
  assert.ok(diffs(keyless)>0,'a width-blind key must be detected');
  // seed>>>0: -1 and 0xffffffff are the same seed.
  const e=await loadVariant();for(const [x,y] of pts)assert.equal(e.carvingFM(x,y,30000,3000,1,-1),e.carvingFM(x,y,30000,3000,1,0xffffffff));
});
test('HARD: persistent memo payload stays below 8.5 MB; per-solve transient arrays reported',async()=>{
  const m=await loadVariant();const b=m.build(730201,30000,0),s=m.solve(730201,30000,0);
  assert.ok(b.r instanceof Float32Array);assert.equal(b.r.length,(C.ROWS+1)*S);
  // The point-query cell memo (fixed typed arrays) counts against the same 8.5 MB.
  const pm=await loadVariant({},'export {pmSeed,pmW,pmCol,pmRow,pmUsed,pmV};');
  const pointMemo=[pm.pmSeed,pm.pmW,pm.pmCol,pm.pmRow,pm.pmUsed,pm.pmV].reduce((a,x)=>a+x.byteLength,0);
  assert.equal(pointMemo,2*CARVING_POINT_MEMO.SLOTS*37);
  const memo=C.CACHE*b.r.byteLength+pointMemo;assert.ok(memo<=8.5e6,'memo '+memo);
  // Transient per solve (freed after the build): 4 Float64 + 2 Uint8 + 4 Int32 domain arrays.
  const NN=(C.CORE+2*C.HALO+1)*(C.ROWS+1),transient=NN*(4*8+2+4*4);
  assert.equal(s.h.length,NN);
  console.log('MEMORY '+JSON.stringify({blockBytes:b.r.byteLength,blockMemoBytes:C.CACHE*b.r.byteLength,pointMemoBytes:pointMemo,memoBytes:memo,transientBytesPerSolve:transient}));
});
test('HARD: point-query cell memo is bit-identical to the block path (cold, warm, aged, interleaved; key control)',async()=>{
  // docs/placeat-regression-2026-10-07.md: inside enter/exitCarvingPointQuery retainedAt reads memoised cell corners.
  const args=carvingDigestArgs(),rev=args.map((_,i)=>args.length-1-i);
  const point=m=>(...a)=>{m.enterCarvingPointQuery();try{return m.carvingFM(...a);}finally{m.exitCarvingPointQuery();}};
  const m=await loadVariant({},'');
  const b0=m.carvingBuildStats.count;
  assert.equal(carvingDigest(point(m)),CARVING_F_DIGEST,'cold');
  const b1=m.carvingBuildStats.count,h1=m.carvingPointMemoStats.hits;
  assert.equal(carvingDigest(point(m),rev),CARVING_F_DIGEST,'warm, reversed');
  assert.ok(m.carvingPointMemoStats.hits-h1>1000,'warm pass hits the memo: '+(m.carvingPointMemoStats.hits-h1));
  // Interleaved point and block calls on one module instance.
  let n=0;const mixed=(...a)=>(n++&1?point(m)(...a):m.carvingFM(...a));
  assert.equal(carvingDigest(mixed),CARVING_F_DIGEST,'interleaved');
  // A 16-slot memo ages every 12 stores (the block memo keeps the fixture's 4 blocks).
  const aged=await loadVariant({SLOTS:16,FILL:12},'');
  for(const order of [null,rev])assert.equal(carvingDigest(point(aged),order),CARVING_F_DIGEST,'aged');
  assert.ok(aged.carvingPointMemoStats.stores>64&&aged.carvingPointMemoStats.hits>0,JSON.stringify(aged.carvingPointMemoStats));
  // Mutation control: a width-blind cell key must be caught. Cell-centre points (d = 125 m) fall in the same
  // lattice cell at both half-widths, so a width-blind memo returns the other width's corners.
  const pts=[[8,200],[72,260],[100,300],[40,150],[-20,330]].map(([c,j])=>[(c+.5)*125,(j+.5)*125-30000]),ws=[30000,30000.5];
  const fresh={};for(const w of ws){const f=await loadVariant();fresh[w]=pts.map(([x,y])=>f.carvingFM(x,y,w,3000,1,730201));}
  const diffs=mod=>{let d=0;const f=point(mod);for(let pass=0;pass<2;pass++)for(const w of pass?[...ws].reverse():ws)pts.forEach(([x,y],k)=>{if(f(x,y,w,3000,1,730201)!==fresh[w][k])d++;});return d;};
  assert.equal(diffs(await loadVariant({},'')),0);
  const key='&&pmW[k]===w)return k;';assert.ok(SOURCE.includes(key));
  const blind=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(SOURCE.replace(key,')return k;')+'\n// blind '+(variants++))).toString('base64'));
  assert.ok(diffs(blind)>0,'a width-blind cell key must be detected');
  console.log('POINT_MEMO '+JSON.stringify({coldBuilds:b1-b0,warmHits:m.carvingPointMemoStats.hits-h1,aged:aged.carvingPointMemoStats}));
});
