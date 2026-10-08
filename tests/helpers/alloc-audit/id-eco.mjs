// Identity gate, path 2: ecoClassOf, life01Of, groundLookOf (into Float32Array AND number[], which exposes the full
// double), npp01Of, ecoRamp, ecoClassOfBiomeSample: f2f2c62 vs worktree, Object.is, 1.5M random samples spanning every
// class plus every calibration threshold / ramp endpoint hit exactly (and +-1 ulp), NaN, +-Infinity, -0, and
// out-of-range / fractional class ids for life01Of.
import {pair, gate, rng} from './id-lib.mjs';
const {base: B, wt: W, shas} = await pair('eco-class.ts');
const g = gate('eco-class'), r = rng(0xEC0C1A55);
const K = B.ECO_CLASS_CALIBRATION;
const KV = [...new Set(Object.values(K))];
const ulp = (x, d) => { const f = new Float64Array([x]), u = new BigInt64Array(f.buffer); u[0] += BigInt(d) * (x >= 0 ? 1n : -1n); return f[0]; };
const specials = [NaN, Infinity, -Infinity, -0, 0, 1, -1];
const pickT = () => { const u = r(); if (u < .06) { const k = KV[Math.floor(r() * KV.length)]; const v = r(); return v < .33 ? k : v < .66 ? ulp(k, 1) : ulp(k, -1); } if (u < .065) return specials[Math.floor(r() * specials.length)]; return 200 + r() * 160; };
const pickM = () => { const u = r(); if (u < .08) { const k = KV[Math.floor(r() * KV.length)]; return u < .04 ? k : ulp(k, u < .06 ? 1 : -1); } if (u < .085) return specials[Math.floor(r() * specials.length)]; return -0.1 + r() * 1.2; };
const pickS = () => { const u = r(); if (u < .08) return [6, 22, 38, 0, 90, ulp(22, 1), ulp(6, -1), ulp(38, -1)][Math.floor(r() * 8)]; if (u < .085) return specials[Math.floor(r() * specials.length)]; return r() * 70; };
const classTally = new Array(15).fill(0), lookNonZero = [0, 0, 0, 0];
const ob = new Float32Array(4), ow = new Float32Array(4), ab = [0, 0, 0, 0], aw = [0, 0, 0, 0];
const SAMPLES = 1_500_000;
for (let k = 0; k < SAMPLES; k++) {
  const Ta = pickT(), mode = r();
  const Tw = mode < .7 ? Ta + r() * 30 : pickT();
  const Tc = mode < .5 ? 2 * Ta - Tw : mode < .8 ? Ta - r() * 30 : pickT();
  const M = pickM(), snow = r() < .1 ? [0, .6, ulp(.6, 1), 1, NaN][Math.floor(r() * 5)] : r() * .8;
  const h = r() < .1 ? [120, ulp(120, -1), 0, -0, -50][Math.floor(r() * 5)] : -200 + r() * 5000;
  const sand = r() < .1 ? [.5, ulp(.5, 1), 0, 1][Math.floor(r() * 4)] : r();
  const datum = r() < .2 ? pickT() : Tw + r() * 20, living = r() < .95;
  const cb = B.ecoClassOf(Ta, Tw, Tc, M, snow, h, sand, datum, living), cw = W.ecoClassOf(Ta, Tw, Tc, M, snow, h, sand, datum, living);
  g.cmp(cb, cw, 'ecoClassOf'); classTally[cb]++;
  const cls = r() < .97 ? cb : [-1, 14, 1.5, NaN, -0, 100, 13.999][Math.floor(r() * 7)];
  g.cmp(B.life01Of(cls, Tw, Ta), W.life01Of(cls, Tw, Ta), 'life01Of');
  g.cmp(B.npp01Of(cls), W.npp01Of(cls), 'npp01Of');
  const tl = r() < .1 ? [0, 1, -0.5, 1.5, NaN][Math.floor(r() * 5)] : r(), sl = pickS();
  B.groundLookOf(Tw, Ta, Tc, M, tl, sl, ob); W.groundLookOf(Tw, Ta, Tc, M, tl, sl, ow); g.cmpArr(ob, ow, 4, 'groundLookOf f32');
  B.groundLookOf(Tw, Ta, Tc, M, tl, sl, ab); W.groundLookOf(Tw, Ta, Tc, M, tl, sl, aw); g.cmpArr(ab, aw, 4, 'groundLookOf f64');
  for (let c = 0; c < 4; c++) if (aw[c] > 0 && aw[c] < 1) lookNonZero[c]++;
  g.cmp(B.ecoRamp(Ta, 270, 290), W.ecoRamp(Ta, 270, 290), 'ecoRamp');
  if ((k & 7) === 0) { const sm = {annualMeanTempK: Ta, warmestMonthK: Tw, effectiveMoisture: M, snowFraction: snow, weights: [sand], ocean: r() < .1};
    g.cmp(B.ecoClassOfBiomeSample(sm, h, .0065, living), W.ecoClassOfBiomeSample(sm, h, .0065, living), 'ecoClassOfBiomeSample'); }
  g.calls += 5;
}
g.finish({shas, samples: SAMPLES, classTally, lookInteriorTally: lookNonZero, summary: {samples: SAMPLES, classTally: classTally.join(','), lookInterior: lookNonZero.join(',')}});
