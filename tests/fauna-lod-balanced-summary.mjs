import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';

const path = resolve(process.argv[2]);
const report = JSON.parse(await readFile(path, 'utf8'));
const rows = report.runs.flatMap(run => run.windows.map(w => {
  const p = w.timing.profile;
  const state = snapshot => ({ date: snapshot.date, ids: snapshot.ids.length,
    coldJobs: snapshot.lod?.lod?.coldJobs ?? 0,
    workerActive: snapshot.lod?.lod?.adapter?.workerActive ?? false,
    poolActive: (snapshot.lod?.lod?.adapter?.close?.active ?? 0) + (snapshot.lod?.lod?.adapter?.middle?.active ?? 0) });
  return { order: run.order, enabled: run.enabled, world: run.world,
    moving: w.moving, before: state(w.before), after: state(w.after),
    settings: { quality: w.beforeSettings.quality, pixelRatio: w.beforeSettings.pixelRatio,
      drawingBuffer: w.beforeSettings.drawingBuffer, hardware: w.beforeSettings.hardware,
      shadow: w.beforeSettings.shadow },
    cpu: p.statistics['cpu/frameWorkMs'], gpu: p.statistics['gpu/framePassSumMs'],
    faunaCpu: p.statistics['cpu/system/faunaMs'],
    skippedQueries: p.skippedQueries, disjointQueries: p.disjointQueries };
}));
const pairs = rows.filter(r => !r.enabled).map(off => {
  const on = rows.find(r => r.enabled && r.order === off.order && r.world === off.world && r.moving === off.moving);
  return { order: off.order, world: off.world, moving: off.moving,
    sameInitialDate: off.before.date === on.before.date,
    onMinusOffMs: { cpuP50: on.cpu.p50-off.cpu.p50, cpuP95: on.cpu.p95-off.cpu.p95,
      gpuP50: on.gpu.p50-off.gpu.p50, gpuP95: on.gpu.p95-off.gpu.p95 },
    coldJobDuringOn: on.before.coldJobs !== 0 || on.after.coldJobs !== 0 || on.before.workerActive || on.after.workerActive };
});
const summary = { ok: report.ok, errors: report.errors, build: report.build, browser: report.browser,
  scope: report.scope,
  limitations: ['Moving windows share initial date/pose, but natural wall-clock end dates differ.',
    'Cold worker activity in moving Anitar windows is included; steady pool-only cost is not isolated.',
    'Single desktop GPU; no physical XR or universal hardware performance claim.'],
  verdict: 'No default performance win: moving Anitar CPU/GPU medians and tails increase in both orders; Daunune paused CPU tail changes sign by order.',
  rows, pairs };
await writeFile(resolve(dirname(path), 'summary.json'), JSON.stringify(summary, null, 2)+'\n');
console.log(JSON.stringify({ ok: summary.ok, windows: rows.length, pairs: pairs.length, verdict: summary.verdict }));
