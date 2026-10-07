// Worker for the NEGATIVE CONTROL of the 200 m carving-lattice spectrum pin (tests/terrain-structural-spectrum.test.mjs):
// samples the same aligned fine rasters with the truth sampler, but in a worker thread whose src/mountain-carving.ts is
// the test-side triangle reference (tests/helpers/mountain-carving-triangle.mjs, module.registerHooks). Everything else
// (solve, build, stored cut values, M1/M2 composition, M5 rock) is the shipped code, so the two fields differ only by
// the carving interpolant. The main thread never loads the hooked module.
//   triangleRasters(jobs, n, stepM) -> Promise<Float64Array[]>  jobs: [{world, d, axis}] (world = water-world name)
import {isMainThread, parentPort, workerData, Worker} from 'node:worker_threads';
import {registerHooks} from 'node:module';

export function triangleRasters(jobs, n, stepM) {
  return new Promise((resolve, reject) => {
    const w = new Worker(new URL(import.meta.url), {workerData: {triangleSpectrum: true, jobs, n, stepM}});
    w.once('message', m => resolve(m));
    w.once('error', reject);
    w.once('exit', code => {if (code) reject(new Error('spectrum-triangle-worker exited ' + code));});
  });
}

if (!isMainThread && workerData?.triangleSpectrum) {
  const {loadSync} = await import('./mountain-carving-triangle.mjs');
  registerHooks({load: loadSync});
  const carving = await import('../../src/mountain-carving.ts');
  if (carving.TEST_REFERENCE_INTERPOLANT !== 'triangle') throw new Error('spectrum-triangle-worker: the triangle hook did not apply');
  const {mountainSampler} = await import('./mountain-coarse-tiles.mjs');
  const {alignedRaster} = await import('./terrain-spectrum.mjs');
  const {waterWorlds} = await import('../terrain-climate-fixtures.mjs');
  const bodies = new Map(waterWorlds().map(b => [b.name, b])), samplers = new Map();
  const {jobs, n, stepM} = workerData, rasters = [];
  for (const {world, d, axis} of jobs) {
    const body = bodies.get(world);
    if (!samplers.has(world)) samplers.set(world, mountainSampler(body));
    rasters.push(alignedRaster(samplers.get(world), d, body.radiusM, n, stepM, axis));
  }
  parentPort.postMessage({rasters, interpolant: carving.TEST_REFERENCE_INTERPOLANT, builds: carving.carvingBuildStats.count}, rasters.map(r => r.buffer));
}
