import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {hash64,noise,macroHeightCode} from '../src/catalog.ts';
import {buildOrogenLayout,continentalA0,constructionA0} from '../src/mountain-layout.ts';
import {coarseMarginH,MASSIF_COARSE_MARGIN,massifCoarseRidgeTermM,coarseBeltValue,massifEnvelopeM,composeRidgeTermM,envelopeBlendWeight} from '../src/mountain-envelope.ts';
import {waterWorlds,fib,orogenLayout,sampler,exactSampler,directions,lookup,statistics,measureError,nodeDirection,referenceDistance,positiveBelts,referenceLayout,oldMaxSampler,mutantSampler,boundaryChecks,unskippedTerrain,voxelSkip} from './helpers/mountain-coarse-field.mjs';
import {pick,samples,tierBodies,tierNote} from './helpers/tier.mjs';
const worlds=waterWorlds(),ss=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
const arrays=['blockTable','masks','offsets','candidates','distances','scalars'];
// Unused nodes are zero-filled. Only corners of active cells belong to the field.
function nodeIsRead(f,block,i,j){
  for(let y=Math.max(0,j-1);y<=Math.min(7,j);y++)for(let x=Math.max(0,i-1);x<=Math.min(7,i);x++){
    const bit=y*8+x;if(f.masks[block*2+(bit>>>5)]&(1<<(bit&31)))return true;
  }
  return false;
}
const sameFields=(a,b)=>{assert.deepEqual(Object.keys(a),Object.keys(b));for(const k of Object.keys(a)){if(Array.isArray(a[k]))a[k].forEach((v,i)=>assert.ok(Object.is(v,b[k][i]),k));else assert.ok(Object.is(a[k],b[k]),k);}};

test('private continental kernels are Object.is identical: 20,000 directions x four worlds',()=>{
  // constructionA0 (private kernels, layout construction) and continentalA0 (catalog kernels, per-sample `sample`).
  for(const body of worlds){const a0=continentalA0(body),c0=constructionA0(body),code=Number(hash64(body.seed+'/macro-v1')&0xffffffffn),sea=.37+body.water*.22;
    for(let i=0;i<20000;i++){const d=fib(i,20000),n=(f,s)=>noise(d[0]*f+13,d[1]*f+37,d[2]*f+19,code+s),macro=macroHeightCode(code,d),expected=body.water?(macro+(n(42,5)-.5)*.012+(n(90,6)-.5)*.003-sea)*47000:(macro-.46)*44000;
      assert.ok(Object.is(a0(d),expected));assert.ok(Object.is(c0(d),expected));}
  }
});
// Tier (docs/test-tiers-2026-10-07.md): default/gate run every direction below. smoke/work keep every Fibonacci
// direction the prefilter SKIPS (cheap: no block solve), cap the ones it CALLS (each a fresh M3 block solve) and the
// rasters, and add the frozen tier-set directions. Same assertions; a subset pass is "not yet failed".
const PREFILTER=pick({smoke:{called:8,rasters:1},work:{called:64,rasters:4},default:null});
test('HARD: the truth core\'s inline voxel prefilter changes no value (Object.is, every field, four worlds)',t=>{
  // Production against production with only the prefilter bypassed; 6,000 Fibonacci directions plus four 41x41
  // axis rasters per world (the rasters sit on massif axes, so both branches of the prefilter run).
  let skipped=0,called=0;
  for(const body of tierBodies(worlds)){
    const fast=sampler(body,{mountains:true}),slow=unskippedTerrain.terrainSampler(body,[],undefined,false,0,undefined,true,{mountains:true});
    const g=orogenLayout(body).bandGrid(48000,32000),K=128,H=K/2;
    let list=directions(body,6000);
    if(PREFILTER){
      const inGrid=d=>{const v=(Math.max(0,Math.min(K-1,Math.floor((d[0]+1)*H)))*K+Math.max(0,Math.min(K-1,Math.floor((d[1]+1)*H))))*K+Math.max(0,Math.min(K-1,Math.floor((d[2]+1)*H)));return g.all||(g.voxels[v>>>5]&(1<<(v&31)));};
      const fibs=list.slice(0,6000),called=fibs.filter(inGrid).slice(0,PREFILTER.called);
      list=[...fibs.filter(d=>!inGrid(d)),...called,...list.slice(6000,6000+41*41*PREFILTER.rasters),...samples(body.name).map(e=>e.d)];
      t.diagnostic(tierNote(`${body.name}: ${list.length} directions (${called.length} called Fibonacci, ${PREFILTER.rasters} raster(s), tier set)`));
    }
    for(const d of list){
      sameFields(fast(d),slow(d));
      const v=(Math.max(0,Math.min(K-1,Math.floor((d[0]+1)*H)))*K+Math.max(0,Math.min(K-1,Math.floor((d[1]+1)*H))))*K+Math.max(0,Math.min(K-1,Math.floor((d[2]+1)*H)));
      if(g.all||(g.voxels[v>>>5]&(1<<(v&31))))called++;else skipped++;
    }
  }
  assert.ok(skipped>1000&&called>1000,`both prefilter branches exercised (skipped ${skipped}, called ${called})`);
  assert.ok(readFileSync(new URL('../src/terrain.ts',import.meta.url),'utf8').includes(voxelSkip));
});
test('g² lemma on dense grid, and conservative composition with exact distances / zero margin',()=>{
  for(let i=0;i<=500;i++)for(let j=0;j<=500;j++){const v=i/500,g=j/500;assert.ok(envelopeBlendWeight(v*g)+1e-15>=g*g*envelopeBlendWeight(v));}
  for(const main of [0,100,900,3640,9000])for(const a0 of [0,1,25,50,99,100,4000])for(const lf of [0,.01,.5,1])for(const tau of [0,.25,1,2])for(const W of [32000,48000,220000])for(let i=-40;i<=40;i++)for(const u of [0,.74,.8,.9,.939,.94,.955,.97,.98,.99,1,1.01]){
    const sd=i/32,dist=Math.abs(sd)*Math.min(W,48000),v=coarseBeltValue(dist,W,u),belt=v*ss(0,100,a0),exact=composeRidgeTermM(main,belt,dist,W,massifEnvelopeM(belt,dist,W,a0,lf,tau,'water')),coarse=massifCoarseRidgeTermM(main,sd,0,W,u,a0,lf,tau);
    assert.ok(coarse>=exact,`${coarse} < ${exact}: ${[main,a0,lf,tau,W,sd,u]}`);
    assert.ok(coarse>=0);
  }
  assert.ok(Object.is(massifCoarseRidgeTermM(-0,2,.16,48000,0,1000,1,1),-0));
});
test('coarse margin is frozen, symmetric, and clamped at the ramp endpoints',()=>{
  assert.ok(Object.isFrozen(MASSIF_COARSE_MARGIN));
  assert.deepEqual(MASSIF_COARSE_MARGIN,{INTERIOR_H:.002,END_H:.2,RAMP_FROM:.94,RAMP_TO:.99});
  for(const u of [0,.5,.94])assert.equal(coarseMarginH(u),.002);
  for(const u of [.99,1,2])assert.equal(coarseMarginH(u),.2);
  for(const u of [.94,.955,.97,.98,.99])assert.equal(coarseMarginH(u),coarseMarginH(-u));
});
for(const body of worlds){
  test(`${body.name}: sparse field bytes deterministic across independent builds and sample orders`,()=>{
    const make=()=>buildOrogenLayout({seed:body.seed,radiusM:body.radiusM,a0:continentalA0(body)}),a=make(),b=make();
    for(let i=0;i<32;i++)a.sample(fib(i,32));
    const af=a.coarseBandField(48000,32000),bf=b.coarseBandField(48000,32000);
    for(let i=31;i>=0;i--)b.sample(fib(i,32));
    assert.equal(a.coarseBandField(48000,32000),af);assert.equal(b.coarseBandField(48000,32000),bf);
    for(let k=8;k<af.scalars.length;k+=9)assert.equal(af.scalars[k],MASSIF_COARSE_MARGIN.END_H);
    assert.equal(af.faceCells,a.bandGrid(48000,32000).faceCells/2);assert.ok(af.bytes<=8*1024*1024);
    for(const k of arrays)assert.deepEqual(Buffer.from(af[k].buffer),Buffer.from(bf[k].buffer),k);
    // One read corner per block/candidate against the independent eager node expression.
    const N=af.faceCells,B=N/8;
    let checked=0;
    for(let q=0;q<af.blockTable.length;q++){
      const block=af.blockTable[q]-1;if(block<0)continue;
      let n=0;while(n<81&&!nodeIsRead(af,block,n%9,Math.floor(n/9)))n++;
      assert.ok(n<81);
      const d=nodeDirection(Math.floor(q/(B*B)),q%B*8+n%9,Math.floor(q/B)%B*8+Math.floor(n/9),N);
      for(let c=af.offsets[block];c<af.offsets[block+1];c++){
        const belt=a.belts[af.candidates[c]],expected=Math.fround(referenceDistance(belt,d,body.radiusM)/Math.min(belt.halfWidthM,48000));
        assert.ok(Object.is(af.distances[c*81+n],expected));checked++;
      }
    }
    assert.ok(checked>0);
  });
  test(`${body.name}: signed-distance measured enclosure, edges, node M1 expressions, and active boundary continuity`,t=>{
    const f=orogenLayout(body).coarseBandField(48000,32000),N=f.faceCells,B=N/8,layout=orogenLayout(body),seen=new Map(),coarse=sampler(body,{mountains:true,lodLevel:0});let matched=0,nodeChecks=0;
    for(let q=0;q<f.blockTable.length;q++){
      const block=f.blockTable[q]-1;if(block<0)continue;const face=Math.floor(q/(B*B)),i0=q%B*8,j0=Math.floor(q/B)%B*8;
      if(i0!==0&&j0!==0&&i0+8!==N&&j0+8!==N)continue;
      for(let j=0;j<=8;j++)for(let i=0;i<=8;i++){
        if(!nodeIsRead(f,block,i,j))continue;
        const x=i0+i,y=j0+j;if(x!==0&&y!==0&&x!==N&&y!==N)continue;
        const d=nodeDirection(face,x,y,N);
        for(let c=f.offsets[block];c<f.offsets[block+1];c++){
          const belt=f.candidates[c],key=belt+':'+d.join(','),value=f.distances[c*81+j*9+i];
          if(seen.has(key)){assert.ok(Object.is(value,seen.get(key)));matched++;}else seen.set(key,value);
        }
        const o=layout.sampleWithA0(d,1e9);
        if(o.belt){const b=layout.belts[o.beltIndex],x=d.reduce((v,a,k)=>v+a*b.tangent[k],0),z=d.reduce((v,a,k)=>v+a*b.centre[k],0),u=x/(Math.sqrt(x*x+z*z)+z);
          assert.ok(Object.is(coarseBeltValue(Math.abs(o.axisDistanceM),b.halfWidthM,u/b.uLimit),o.belt));nodeChecks++;}
        // Approach the same edge from the two owning cube faces.
        const k=face>>>1,axis=x===0||x===N?[1,0,0][k]:[2,2,1][k];
        const move=(which)=>{const p=[...d];p[which]*=1+1e-9;const l=Math.hypot(...p);return p.map(v=>v/l);};
        assert.ok(Math.abs(coarse(move(k)).floorM-coarse(move(axis)).floorM)<.05,'face continuity');
      }
    }
    assert.ok(matched>0,'shared face-edge nodes');
    for(let i=0;i<4096;i++){
      const d=fib(i,4096),o=layout.sampleWithA0(d,1e9);if(!o.belt)continue;
      const b=layout.belts[o.beltIndex],x=d.reduce((s,v,k)=>s+v*b.tangent[k],0),z=d.reduce((s,v,k)=>s+v*b.centre[k],0),u=x/(Math.sqrt(x*x+z*z)+z);
      assert.ok(Object.is(coarseBeltValue(Math.abs(o.axisDistanceM),b.halfWidthM,u/b.uLimit),o.belt));nodeChecks++;
    }
    assert.ok(nodeChecks>0);
    const {bins,...error}=measureError(body);
    assert.ok(error.ratio<=.5,`2x measured margin: ${error.ratio}`);
    for(const bin of bins)assert.ok(bin.ratio<=.5,`${body.name} |u/U| [${bin.from},${bin.to}): ${bin.ratio}`);
    assert.ok(error.interiorOnlyRatio>.5,'no-end-ramp negative control must fail the 2x enclosure');
    t.diagnostic(`INFO ${body.name} dense interpolation ${JSON.stringify(error)}; ${bins.filter(b=>b.count).length} .0025-wide bins checked`);
  });
  test(`${body.name}: >=50,000 Fibonacci + 4 x 41² rasters, upper floor, inactive identity, ocean flags, mutation`,t=>{
    const stats=statistics(body);t.diagnostic(`INFO ${body.name} coarse - exact uncarved floor ${JSON.stringify(stats)}`);
    assert.equal(stats.violations,0);assert.equal(stats.oceanDifferences,0);assert.equal(stats.inactiveDifferences,0);
    // Prototype p99 5.7-9.4 m; max 21.8 / 21.8 / 23.4 / 51.5 m (M/S/R/L).
    // Maximum +25%, rounded up to the next 50 m, leaves a 100 m ceiling.
    assert.ok(stats.p99<=50);assert.ok(stats.max<=100);
    const coarse=sampler(body,{mountains:true,lodLevel:0}),exact=exactSampler(body),mutant=mutantSampler(body),field=orogenLayout(body).coarseBandField(48000,32000);
    const oldMax=oldMaxSampler(body),reference=referenceLayout(body);
    assert.deepEqual(reference.belts,orogenLayout(body).belts,'copied layout uses production construction inputs');
    let mutation=0,outside=0,belowOldMax=0,positive=0;
    for(const d of directions(body)){
      const e=exact(d),n=positiveBelts(reference,d,body.radiusM);
      assert.ok(n<=1,'all belt footprints, including narrow belts, are disjoint');positive+=n;
      if(coarse(d).floorM<oldMax(d).floorM)belowOldMax++;
      if(mutant(d).floorM<e.floorM)mutation++;
      if(!lookup(field,d).length){sameFields(coarse(d),e);outside++;}
    }
    assert.ok(positive>0);assert.ok(belowOldMax>0,'removing main from the maximum lowers an in-massif floor');
    t.diagnostic(`INFO ${body.name} below old max ${belowOldMax}; positive belt directions ${positive}`);
    assert.ok(outside>0);assert.ok(mutation>0,'zero-margin mutation must violate the floor bound');t.diagnostic(`INFO zero-margin floor violations ${mutation}`);
    assert.ok(boundaryChecks(body,sameFields)>0,'active boundaries return main exactly');
  });
  test(`${body.name}: separate plain and mountain cores identical outside massifs, 4096 directions, both floor modes`,()=>{
    for(const expose of [false,true]){
      const make=mountains=>sampler(body,{mountains},expose);
      const a=make(false),b=make(true),layout=orogenLayout(body);let checked=0;
      for(let i=0;checked<4096;i++){const d=fib(i,8192),o=layout.sample(d);if(o.belt&&o.halfWidthM>=32000&&Math.abs(o.axisDistanceM)<48000)continue;sameFields(a(d),b(d));checked++;}
    }
  });
}

// The two core literals (src/terrain.ts) must stay textually identical outside their two declared hunks: the
// per-core setup (field vs orogen layout) and the ridge-term hunk (baked lookup vs exact M1+M2+M3). The split
// exists for V8 code quality only (docs/mountains-t6-baked-coarse-2026-10-06.md); a fix in one core must land in both.
test('HARD: baseTerrainCore and mountainTerrainCore are identical outside the setup and ridge-term hunks',()=>{
  const src=readFileSync(new URL('../src/terrain.ts',import.meta.url),'utf8').replace(/\r\n/g,'\n');
  const core=name=>{
    const start=src.indexOf(`\nfunction ${name}(`),end=src.indexOf('\n}\n',start);
    assert.ok(start>=0&&end>start,name);
    let text=src.slice(start,end).replace(`function ${name}(`,'function CORE(');
    const cut=(from,to)=>{const a=text.indexOf(from),b=text.indexOf(to,a);assert.ok(a>=0&&b>a,`${name}: ${from}`);text=text.slice(0,a)+'<HUNK>'+text.slice(b);};
    cut('\n  const tau = reliefOn ? tectonicReliefOf(body) : 1;\n','\n  const kd = dryFloorScale(tau);');
    cut('\n          let ridgeTermM = tau * RC.KB','\n          const F = comp + tau * (RC.HUP');
    return text;
  };
  const base=core('baseTerrainCore'),mountain=core('mountainTerrainCore');
  assert.equal((base.match(/<HUNK>/g)||[]).length,2);
  assert.equal(base,mountain);
});
