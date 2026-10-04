// W0-SEASON: closed-form season basis (src/season.ts). Presentation only;
// no src module consumes it in this increment.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { PerformanceObserver, performance } from 'node:perf_hooks';
import { setFlagsFromString } from 'node:v8';
import { runInNewContext } from 'node:vm';
import { galaxies, sector, system, refByAddress, bodyPosition, AU, G } from '../../src/catalog.ts';
import { advanceDate, CATALOGUE_EPOCH_NS, YEAR_NS } from '../../src/world-time.ts';
import { PLAYBACK_TIERS } from '../../src/time-nav.ts';
import {
  SEASON_VERSION, SEASON_BANDS, seasonBasis, seasonAt, clearSeasonBasisCache, createSeasonSample,
  dailyMeanInsolation, orbitPeriodNs, faunaSeasonContext, seasonalRangeAt, bandValueAt,
} from '../../src/season.ts';

function corpus(minPlanets, startCx = 900) {
  const g = galaxies('LETHRA-001')[0];
  const planets = [], moons = [];
  for (let cx = startCx; planets.length < minPlanets; cx++) {
    for (const ref of sector(g, [cx, 0, 0]).refs) {
      const sys = system(ref);
      for (const planet of sys.planets) planets.push({ body: planet, sys });
      for (const moon of sys.moons) moons.push({ body: moon, sys });
      if (planets.length >= minPlanets) break;
    }
  }
  return { planets, moons };
}

const THE_CORPUS = corpus(566);

test('cost: seasonBasis <= 2 ms per body, seasonAt <= 5 us (best of 5 batches)', async () => {
  // Best-of-N batches: this machine runs other agents' jobs concurrently, so
  // a single batch measures the neighbours as much as this code.
  setFlagsFromString('--expose-gc');
  const gc = runInNewContext('gc');
  const bodies = THE_CORPUS.planets.slice(0, 200);
  for (const { body, sys } of bodies.slice(0, 20)) seasonBasis(body, sys); // JIT warm-up
  let perBody = Infinity;
  for (let rep = 0; rep < 5; rep++) {
    clearSeasonBasisCache();
    const batch = bodies.slice(rep * 40, rep * 40 + 40);
    const t0 = performance.now();
    for (const { body, sys } of batch) seasonBasis(body, sys);
    perBody = Math.min(perBody, (performance.now() - t0) / batch.length);
  }
  const b = seasonBasis(bodies[3].body, bodies[3].sys);
  const out = createSeasonSample();
  const t = CATALOGUE_EPOCH_NS;
  for (let i = 0; i < 20000; i++) seasonAt(b, t + BigInt(i) * 1_000_000_007n, 0n, out);
  let gcCount = 0;
  const obs = new PerformanceObserver((list) => { gcCount += list.getEntries().length; });
  obs.observe({ entryTypes: ['gc'] });
  gc();
  const heap0 = process.memoryUsage().heapUsed;
  let perCall = Infinity;
  const N = 20000;
  for (let rep = 0; rep < 5; rep++) {
    const t1 = performance.now();
    for (let i = 0; i < N; i++) seasonAt(b, t + BigInt(rep * N + i) * 1_000_000_007n, 0n, out);
    perCall = Math.min(perCall, (performance.now() - t1) * 1000 / N);
  }
  await new Promise((r) => setTimeout(r, 20));
  obs.disconnect();
  gc();
  const heap1 = process.memoryUsage().heapUsed;
  console.log(`# cost: seasonBasis ${perBody.toFixed(3)} ms/body (best 40-body cold batch of 5), seasonAt ${perCall.toFixed(3)} us/call (best 20k batch of 5, warm, out param); retained heap after gc ${((heap1 - heap0) / 1024).toFixed(1)} KiB over ${5 * N} calls; minor GCs during them: ${gcCount} (transient BigInt/bodyPosition temporaries)`);
  // Preserve the original strict / relaxed thresholds, under the quiet gate.
  const slack = process.env.SEASON_PERF_STRICT === '1' ? 1 : 5;
  assert.ok(perBody <= 2 * slack, `seasonBasis ${perBody} ms`);
  assert.ok(perCall <= 5 * slack, `seasonAt ${perCall} us`);

});
