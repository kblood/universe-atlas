import test from 'node:test';
import assert from 'node:assert/strict';
import {generateCreatureGenome, realisticIndividualCreatureGenome} from '../../src/creature-model.ts';
import {sampleFaunaCoat} from '../../src/fauna-appearance.ts';
import {quadrupedBodyBuildSteps} from '../../src/fauna-body-plan.ts';
const ARCHETYPES = ['browser', 'runner', 'low-slung', 'long-neck'];
// Preserve the original strict and relaxed budgets, now measured in isolation.
const PERF_STRICT = process.env.FAUNA_PERF_STRICT === '1';
const perfCap = budgetMs => PERF_STRICT ? budgetMs : budgetMs * 2;

test('far-LOD mean cost: 512 new realistic genomes of warm species stay within about 15 ms', t => {
  // The reviewer's bench: 12 founders (incl. one piebald and one bands species,
  // the two patterns that also sample their own layout), warmed, then 512 new
  // individuals; the best of nine bursts damps scheduler and GC noise left by
  // the tests before it (a collection between bursts when --expose-gc is on).
  const founders = Array.from({ length: 12 }, (_, i) => generateCreatureGenome(`BENCH-${i}`, ARCHETYPES[i % 4]));
  let start = performance.now();
  for (let i = 0; i < 20; i++) realisticIndividualCreatureGenome(founders[i % 12], `warm-${i}`, i % 4, 'adult');
  const coldMs = performance.now() - start, bursts = [];
  for (let r = 0; r < 9; r++) {
    globalThis.gc?.();
    start = performance.now();
    for (let i = 0; i < 512; i++) realisticIndividualCreatureGenome(founders[i % 12], `herd-${r}-${i}`, i % 4, i % 5 === 0 ? 'juvenile' : 'adult');
    bursts.push(performance.now() - start);
  }
  t.diagnostic(JSON.stringify({ strict: PERF_STRICT, capMs: perfCap(15), coldTwelveSpeciesMs: +coldMs.toFixed(1), burstsMs: bursts.map(b => +b.toFixed(1)) }));
  assert.ok(Math.min(...bursts) <= perfCap(15), `512 genomes took ${Math.min(...bursts)} ms (cap ${perfCap(15)} ms, strict ${PERF_STRICT})`);
});

test('96 corpus bodies: coat CPU and step timing caps', t => {
  let longestStep = 0, minYields = Infinity, maxTriangles = 0, maxGrid = 0, maxCoatMs = 0, sumCoatMs = 0, n = 0;
  for (const archetype of ARCHETYPES) for (let species = 0; species < 3; species++) for (let individual = 0; individual < 4; individual++) for (const stage of ['adult', 'juvenile']) {
    const seed = `FAUNA-CORPUS/${archetype}/${species}`;
    const g = realisticIndividualCreatureGenome(generateCreatureGenome(seed, archetype), `${seed}/member`, individual, stage);
    const steps = quadrupedBodyBuildSteps(g);
    let body, yields = 0, last = performance.now();
    for (;;) {
      const next = steps.next(), now = performance.now();
      longestStep = Math.max(longestStep, now - last); last = now;
      if (next.done) { body = next.value; break; }
      yields++;
    }
    minYields = Math.min(minYields, yields);
    maxTriangles = Math.max(maxTriangles, body.triangleCount);
    maxGrid = Math.max(maxGrid, body.grid.reduce((a, b) => a * b, 1));
    // Added coat CPU: one full per-vertex coat evaluation pass over this body,
    // the best of three passes (damps scheduler and GC noise).
    const surface = { dorsal: 0, along: .5, cellM: body.cellM };
    let coatMs = Infinity;
    for (let pass = 0; pass < 3; pass++) {
      const start = performance.now();
      for (let v = 0; v < body.vertexCount; v++) { surface.dorsal = body.normals[v * 3 + 1]; sampleFaunaCoat(g, body.positions[v * 3], body.positions[v * 3 + 1], body.positions[v * 3 + 2], body.plan.torsoY, 'torso', surface); }
      coatMs = Math.min(coatMs, performance.now() - start);
    }
    maxCoatMs = Math.max(maxCoatMs, coatMs); sumCoatMs += coatMs; n++;
  }
  t.diagnostic(JSON.stringify({ strict: PERF_STRICT, coatCapMs: perfCap(20), specimens: n, longestStepMs: +longestStep.toFixed(1), minYields, maxTriangles, maxGrid, maxCoatMs: +maxCoatMs.toFixed(2), meanCoatMs: +(sumCoatMs / n).toFixed(2) }));
  assert.ok(longestStep < 250, `longest step ${longestStep} ms`);
  assert.ok(maxCoatMs <= perfCap(20), `coat CPU ${maxCoatMs} ms (cap ${perfCap(20)} ms, strict ${PERF_STRICT})`);
});
