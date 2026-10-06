// Diagnostic: steady-state CPU profile of the orbit bake (warm-up bakes not profiled), self time per function.
//   node test-results/mountains/t4/orbit-steady-profile.mjs <root> <world> [warm=3] [profiled=4] [top=30]
import {pathToFileURL} from 'node:url';
import {Session} from 'node:inspector/promises';
const [root, world, warm = '3', prof = '4', top = '30'] = process.argv.slice(2);
const T = await import(pathToFileURL(`${root}/src/terrain.ts`).href), F = await import(pathToFileURL(`${root}/tests/terrain-climate-fixtures.mjs`).href);
const body = F.waterWorlds().find(b => b.name === world);
for (let i = 0; i < +warm; i++) T.planetSurface(body, 1024, 192);
const s = new Session();s.connect();await s.post('Profiler.enable');await s.post('Profiler.setSamplingInterval', {interval: 100});await s.post('Profiler.start');
const t0 = performance.now();for (let i = 0; i < +prof; i++) T.planetSurface(body, 1024, 192);const ms = performance.now() - t0;
const {profile: p} = await s.post('Profiler.stop');
const byId = new Map(p.nodes.map(n => [n.id, n])), self = new Map();let total = 0;
for (let i = 0; i < p.samples.length; i++) {const cf = byId.get(p.samples[i]).callFrame, k = `${cf.functionName || '(anon)'} ${cf.url.split('/').pop()}:${cf.lineNumber + 1}`;self.set(k, (self.get(k) || 0) + p.timeDeltas[i]);total += p.timeDeltas[i];}
console.log(`${world} ${root.split('/').pop()} ms/bake ${(ms / +prof).toFixed(1)} profiled total ${(total / 1000).toFixed(0)} ms`);
for (const [k, v] of [...self].sort((a, b) => b[1] - a[1]).slice(0, +top)) console.log((v / 1000 / +prof).toFixed(1).padStart(7), 'ms/bake', k);
