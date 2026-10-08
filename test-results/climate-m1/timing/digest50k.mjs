// decision-5 gate 2: the surface-climate.test 50k-sample determinism digest (10 bodies x 5000, DIGEST_SRC copied
// verbatim) and the CLIMATE_CALIBRATION sha, on the fixed 3ab2eab tree (A) and the inlined tree (B).
// node digest50k.mjs <dirA> <dirB>
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const [dirA, dirB] = process.argv.slice(2);
const u = (d, f) => pathToFileURL(`${d}/src/${f}`).href;
function climateDigest(SC,bodies,perBody){
  const out={};
  for(const b of bodies){
    const s=SC.surfaceClimate(SC.climateForcingFor(b)),o=SC.createClimateSample(),buf=new Float64Array(perBody*18);
    for(let i=0;i<perBody;i++){
      const y=1-2*(i+.5)/perBody,p=i*2.399963229728653,r=Math.sqrt(1-y*y),h=((i*7919)%12000)-1000;
      s([Math.cos(p)*r,y,Math.sin(p)*r],h,o);
      const v=[o.insolation01,o.insolationHalfRange,o.annualMeanTempK,o.seasonalHalfRangeK,o.warmestMonthK,o.coldestMonthK,o.legacyMoisture,o.dryBelt01,o.effectiveMoisture,o.aridity01,o.snowFraction,o.treeline01,o.growingSeason01,o.forestSuitability01,o.climateCode,o.pdd,o.precipMm,o.petMm];
      buf.set(v,i*18);
    }
    out[b.id]=createHash('sha256').update(Buffer.from(buf.buffer)).digest('hex');
  }
  return out;
}
const res = {};
for (const [k, dir] of [['A_3ab2eab', dirA], ['B_inlined', dirB]]) {
  const SC = await import(u(dir, 'surface-climate.ts'));
  const {galaxies, refByAddress, sector, system} = await import(u(dir, 'catalog.ts'));
  const g = galaxies('LETHRA-001')[0], bodies = [system(refByAddress(g, 'G001/C2128,0,1/0')).planets[1]];
  for (const ref of sector(g, [266, 0, 0]).refs) { for (const b of system(ref).planets) if (SC.temperateHabitat(b) && bodies.length < 10 && !bodies.some(x => x.id === b.id)) bodies.push(b); if (bodies.length >= 10) break; }
  res[k] = {calibrationSha: createHash('sha256').update(JSON.stringify(SC.CLIMATE_CALIBRATION)).digest('hex'), version: SC.CLIMATE_VERSION, digest50k: climateDigest(SC, bodies, 5000)};
}
res.calibrationShaPinned = 'f56bf8ab95a9d0fc965e3ba9a0fc693ca8e1c301e75497e456bb5a103dddce6e';
res.pass = res.A_3ab2eab.calibrationSha === res.calibrationShaPinned && res.B_inlined.calibrationSha === res.calibrationShaPinned && res.A_3ab2eab.version === res.B_inlined.version && JSON.stringify(res.A_3ab2eab.digest50k) === JSON.stringify(res.B_inlined.digest50k);
console.log(JSON.stringify(res, null, 1));
