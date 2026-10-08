// Niche evaluator (habitat-suitability.ts compileNicheEvaluator, "no allocation per call"): evaluator alone on
// precomputed climate inputs, plus the stock bench's runEv / runClimateOnly loops as written (they build a [x,y,z]
// literal per iteration, so their difference is what the bench's niche figure subtracts).
import {src, mod, runCases, TREE} from './alloc-lib.mjs';
import {maithea, fibInputs} from './fixtures.mjs';
const {climateForcingFor, surfaceClimate, createClimateSample} = await import(src('surface-climate.ts'));
const {generateBiosphere, biosphereAt} = await import(src('biosphere-model.ts'));
const {compileNicheEvaluator} = await import(mod('habitat-suitability.ts'));
const N = 200000, {dirs, heights} = fibInputs(N);
const sample = surfaceClimate(climateForcingFor(maithea)), out = createClimateSample(), acc = new Float64Array(1);
const T = new Float64Array(N), M = new Float64Array(N);
for (let i = 0; i < N; i++) { sample([dirs[i * 3], dirs[i * 3 + 1], dirs[i * 3 + 2]], heights[i], out); T[i] = out.annualMeanTempK; M[i] = out.effectiveMoisture; }
const world = generateBiosphere('BENCH', 'temperate', maithea.id);
void biosphereAt(world, Math.max(...world.species.map(s => s.birthMyr)) + 1);
const ev = compileNicheEvaluator(world.species, 'temperate', maithea.temperatureK);
const pOut = new Float32Array(ev.plantIds.length), aOut = new Float32Array(ev.animalIds.length), local = {temperatureK: 0, moisture: 0, slope01: .2, reachable: true};
const ctl = {plants: (l, o) => { o[0] = l.temperatureK * .001; return o; }, animals: (l, o) => { o[0] = l.moisture * .5; return o; }};
runCases('nicheEvaluator@' + TREE, {
  control: () => { for (let i = 0; i < N; i++) { local.temperatureK = T[i]; local.moisture = M[i]; ctl.plants(local, pOut); ctl.animals(local, aOut); acc[0] += pOut[0] + aOut[0]; } },
  real: () => { for (let i = 0; i < N; i++) { local.temperatureK = T[i]; local.moisture = M[i]; ev.plants(local, pOut); ev.animals(local, aOut); acc[0] += pOut[0] + aOut[0]; } },
  benchRunEv: () => { for (let i = 0; i < N; i++) { sample([dirs[i * 3], dirs[i * 3 + 1], dirs[i * 3 + 2]], heights[i], out); local.temperatureK = out.annualMeanTempK; local.moisture = out.effectiveMoisture; ev.plants(local, pOut); ev.animals(local, aOut); acc[0] += pOut[0] + aOut[0]; } },
  benchClimateOnly: () => { for (let i = 0; i < N; i++) { sample([dirs[i * 3], dirs[i * 3 + 1], dirs[i * 3 + 2]], heights[i], out); acc[0] += out.annualMeanTempK; } },
}, N, 15, {species: ev.plantIds.length + ev.animalIds.length, sink: Number.isFinite(acc[0])});
