import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {raster,syntheticSampler} from './helpers/mountain-metrics.mjs';
import {SUMMIT_THRESHOLDS,summitRaster,measureSummits,poolSummits,judgeM4} from './helpers/mountain-summits.mjs';
// Section 2.6 audit below walks this file's local import graph.

test('CONTRACT: M4 reduced fixture and four measured negative controls',()=>{
  const local=summitRaster(),wide=summitRaster({step:250});
  const l=measureSummits(local),w=measureSummits(wide),positive=poolSummits([l],[w]);
  assert.ok(judgeM4(positive).every(r=>r.pass),JSON.stringify(positive));
  const dome=measureSummits(raster(syntheticSampler(5194907,'dome'),[1,0,0],5194907,385,125));
  const bare=measureSummits(summitRaster({bare:true}));
  const shifted=poolSummits([], [measureSummits(summitRaster({shift:32000,step:250}))]);
  // Allowed amplitude mutation: the bare U is computed 1% above its analytic maximum.
  const bound=measureSummits(summitRaster({bare:true,gain:1.01}));
  assert.equal(judgeM4(dome)[0].pass,false);assert.equal(judgeM4(bare)[0].pass,false);
  assert.equal(judgeM4(shifted)[1].pass,false);assert.equal(judgeM4(bound)[2].pass,false);
  assert.ok(shifted.topCount>0);assert.ok(bound.max>3000);
  // R2 needs the 100 highest summits: a wide raster reduced to one in-belt peak fails closed.
  const few=poolSummits([l],[{...w,peaks:w.peaks.filter(p=>p.inBelt).slice(0,1)}]);
  assert.equal(few.topCount,1);assert.equal(few.placementOfAvailable,1);assert.equal(judgeM4(few)[1].pass,false);
  console.log(JSON.stringify({positive,negative:{dome:dome.density,bare:bare.density,shiftPlacement:shifted.placement,shiftCount:shifted.topCount,boundMax:bound.max,boundViolations:bound.boundViolations}}));
  const digest=r=>createHash('sha256').update(Buffer.from(r.h.buffer,r.h.byteOffset,r.h.byteLength)).digest('hex');
  assert.equal(digest(local),digest(summitRaster({reverse:true})));
  // mountain-carving-3 (Catmull-Rom carving query): re-pinned, was 4e470f04b8ce224b32852d6a99b6ef15ef6faf360bc5758e1ecf62803d315386.
  assert.equal(digest(local),'3e9d3367610ecabddcc8210742237f728d60e91149787dda4fd374ef80b3ba52');
});

test('HARD: frozen rows, fail-closed judge and dependency source audit',()=>{
  assert.ok(Object.isFrozen(SUMMIT_THRESHOLDS)&&SUMMIT_THRESHOLDS.every(Object.isFrozen));
  assert.deepEqual(SUMMIT_THRESHOLDS.map(r=>[r.id,r.value]),[['density',8],['placement',.9],['boundViolations',0]]);
  for(const bad of [undefined,NaN,Infinity,-Infinity])assert.ok(judgeM4({density:bad,placement:bad,boundViolations:bad}).every(r=>!r.pass));
  // Grep import specifiers, including dynamic imports/re-exports and side-effect imports.
  const forbidden=s=>[...s.matchAll(/(?:from\s*|import\s*(?:\(\s*)?)["']([^"']+)["']/g)]
    .map(m=>m[1]).filter(p=>/terrain|climate|lod|landing|mountain-layout/i.test(p));
  // Walk the whole reachable local import graph (test -> helper -> M2, M3, harness -> ...).
  const seen=new Set(),queue=[new URL(import.meta.url)];
  while(queue.length){const url=queue.shift();if(seen.has(url.href))continue;seen.add(url.href);
    const source=readFileSync(url,'utf8');assert.deepEqual(forbidden(source),[],url.href);
    for(const m of source.matchAll(/(?:from\s*|import\s*(?:\(\s*)?)["'](\.{1,2}\/[^"'$]+)["']/g))queue.push(new URL(m[1],url));}
  for(const f of ['helpers/mountain-summits.mjs','helpers/mountain-metrics.mjs','src/mountain-envelope.ts','src/mountain-carving.ts'])
    assert.ok([...seen].some(u=>u.endsWith(f)),'import graph reaches '+f);
  for(const path of ['terrain.ts','climate.ts','lod.ts','landing.ts','mountain-layout.ts'])assert.equal(forbidden(`import x from '../src/${path}';`).length,1);
  // R4 exact union-find and border-censoring pins already live in mountain-metrics.test.mjs:
  // "HARD: exact two-peak prominence and border censoring" (highest is never counted).
});
