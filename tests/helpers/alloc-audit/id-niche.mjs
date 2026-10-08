// Identity gate, path 1: compileNicheEvaluator plants()/animals(), f2f2c62 vs worktree, Object.is per output element,
// into both a Float32Array (the contract) and a Float64Array (exposes the unrounded double), over every living
// golden-corpus body (goldenAll, 282 Oceanic worlds) x 2 dates x 2000 locals (random + exact niche boundaries + NaN +
// reachable true/false/omitted).
import {pair, gate, rng, wtUrl} from './id-lib.mjs';
const {goldenAll} = await import(wtUrl('tests/helpers/body-chunks.mjs'));
const {generateBiosphere, biosphereAt, profileFromPhysicalProperties} = await import(wtUrl('src/biosphere-model.ts'));
const {base, wt, shas} = await pair('habitat-suitability.ts');
const g = gate('niche'), r = rng(0xA11C2);
const bodies = goldenAll().filter(b => profileFromPhysicalProperties(b, 'main-sequence') !== 'airless');
let speciesSets = 0, nonzero = 0, zeros = 0, plantsSeen = 0, animalsSeen = 0;
for (const body of bodies) {
  const profile = profileFromPhysicalProperties(body, 'main-sequence');
  const world = generateBiosphere('ALLOC-ID', profile, body.id);
  const births = world.species.map(s => s.birthMyr).sort((a, b) => a - b);
  for (const date of [births[Math.floor(births.length / 2)] + 1, births[births.length - 1] + 1]) {
    const dated = biosphereAt(world, date).species;
    if (!dated.length) continue;
    speciesSets++;
    const anchor = body.temperatureK;
    const eb = base.compileNicheEvaluator(dated, profile, anchor), ew = wt.compileNicheEvaluator(dated, profile, anchor);
    g.cmp(eb.plantIds.join(), ew.plantIds.join(), 'plantIds'); g.cmp(eb.animalIds.join(), ew.animalIds.join(), 'animalIds');
    const np = eb.plantIds.length, na = eb.animalIds.length; plantsSeen += np; animalsSeen += na;
    const o = {pb: new Float32Array(np), pw: new Float32Array(np), ab: new Float32Array(na), aw: new Float32Array(na),
      pb64: new Float64Array(np), pw64: new Float64Array(np), ab64: new Float64Array(na), aw64: new Float64Array(na)};
    const offset = ({temperate: 286, arid: 299, cold: 268})[profile] - anchor;
    for (let k = 0; k < 2000; k++) {
      const s = dated[Math.floor(r() * dated.length)].niche, u = r();
      let T = anchor - 45 + r() * 90, M = -0.05 + r() * 1.1, Sl = r() * 1.1;
      if (u < .05) T = s.minTempK - offset; else if (u < .1) T = s.maxTempK - offset; else if (u < .12) T = (s.minTempK + s.maxTempK) / 2 - offset;
      const v = r();
      if (v < .05) M = s.minMoisture; else if (v < .1) M = s.maxMoisture; else if (v < .12) M = (s.minMoisture + s.maxMoisture) / 2;
      const w = r();
      if (w < .05) Sl = s.maxSlope; else if (w < .08) Sl = 0;
      if (k % 997 === 0) T = NaN; if (k % 991 === 0) M = NaN;
      const q = r(), local = q < .4 ? {temperatureK: T, moisture: M, slope01: Sl} : {temperatureK: T, moisture: M, slope01: Sl, reachable: q < .9};
      eb.plants(local, o.pb); ew.plants(local, o.pw); eb.animals(local, o.ab); ew.animals(local, o.aw);
      eb.plants(local, o.pb64); ew.plants(local, o.pw64); eb.animals(local, o.ab64); ew.animals(local, o.aw64);
      g.calls += 4;
      g.cmpArr(o.pb, o.pw, np, 'plants32'); g.cmpArr(o.ab, o.aw, na, 'animals32');
      g.cmpArr(o.pb64, o.pw64, np, 'plants64'); g.cmpArr(o.ab64, o.aw64, na, 'animals64');
      for (let i = 0; i < np; i++) o.pw64[i] > 0 ? nonzero++ : zeros++;
      for (let i = 0; i < na; i++) o.aw64[i] > 0 ? nonzero++ : zeros++;
    }
  }
}
g.finish({shas, bodies: bodies.length, speciesSets, plantsSeen, animalsSeen, outputTally: {nonzero, zeros}, summary: {bodies: bodies.length, speciesSets, nonzero, zeros}});
