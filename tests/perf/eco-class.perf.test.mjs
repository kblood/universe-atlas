// ECO-CLASS-1 cost (moved from tests/eco-class.test.mjs, 2026-10-07, docs/test-fixes-2026-10-07.md): wall-clock
// budgets live in the perf tier (npm run test:perf: test slot, CPU-quiet gate, --test-concurrency=1), like every other
// timing cap in docs/test-policy.md "Timing audit". Thresholds unchanged: the relaxed 100 ns regression guard and the
// OPEN 25 ns acceptance criterion (ECO_PERF_STRICT=1, quiet host). The GC-counted allocation check stays in
// tests/eco-class.test.mjs.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ecoClassOf, life01Of, groundLookOf} from '../../src/eco-class.ts';

/** Best-of-5 ns per (ecoClassOf + life01Of + groundLookOf) sample and heap growth. */
function measureEcoCost(){
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
  return {ns,heapGrowth,N};
}

// Regression guard only: a 100 ns ceiling that holds on a contended host. It is
// NOT the plan's 25 ns acceptance criterion, which stays OPEN (quiet-host
// measurement) and is the separate test below.
// Net heap growth cannot prove absence of transient allocations; this is a
// growth bound alongside the timing guard. The functional gate counts GC bytes
// against a no-op control and rejects the pre-optimization implementation.
test('eco-class cost regression guard: <= 100 ns per sample (relaxed, not the 25 ns criterion), bounded net heap growth',()=>{
  const {ns,heapGrowth,N}=measureEcoCost();
  assert.ok(ns<=100,`${ns.toFixed(1)} ns per call`);
  assert.ok(heapGrowth<4<<20,`heap grew ${heapGrowth} bytes over ${N} calls`);
  console.log(`# eco-class cost ${ns.toFixed(1)} ns/call (contended unless quiet host), heap delta ${heapGrowth} B`);
});

// Acceptance criterion (OPEN owner item): <= 25 ns on a quiet host. Skipped
// unless ECO_PERF_STRICT=1, so a contended run never reports it as passed.
const STRICT=process.env.ECO_PERF_STRICT==='1';
test('eco-class cost acceptance: <= 25 ns per sample on a quiet host',
  {skip:STRICT?false:'OPEN: quiet-host measurement pending; run with ECO_PERF_STRICT=1 on a quiet host'},()=>{
  const {ns}=measureEcoCost();
  assert.ok(ns<=25,`${ns.toFixed(1)} ns per call`);
});
