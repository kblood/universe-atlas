// eco-class, driver design: one sample of the tests/eco-class.test.mjs loop (ecoClassOf + life01Of + groundLookOf) per body call.
import {mod, runBodies, TREE} from './alloc-lib.mjs';
const {ecoClassOf, life01Of, groundLookOf} = await import(mod('eco-class.ts'));
const out = new Float32Array(4), N = 400000, acc = new Float64Array(1);
const ta = new Float64Array(4096), mm = new Float64Array(4096), sl = new Float64Array(4096);
for (let i = 0; i < 4096; i++) { ta[i] = 240 + (i * 37 % 900) * .1; mm[i] = (i * 53 % 997) / 997; sl[i] = i % 60; }
const cA = (a, b, c, m, x, y, z, w, l) => (a > 280 ? 3 : 1) + (l ? 0 : 1), cB = (c, w, a) => c * .1, cC = (w, a, c, m, v, s, o) => { o[0] = m * v; };
runBodies('ecoClass2@' + TREE, {
  control: i => { const j = i & 4095, Ta = ta[j], M = mm[j]; const c = cA(Ta, Ta + 6, Ta - 6, M, 0, 300, 0, Ta + 8, true); acc[0] += cB(c, Ta + 6, Ta); cC(Ta + 6, Ta, Ta - 6, M, .5, sl[j], out); acc[0] += out[0]; },
  real: i => { const j = i & 4095, Ta = ta[j], M = mm[j]; const c = ecoClassOf(Ta, Ta + 6, Ta - 6, M, 0, 300, 0, Ta + 8, true); acc[0] += life01Of(c, Ta + 6, Ta); groundLookOf(Ta + 6, Ta, Ta - 6, M, .5, sl[j], out); acc[0] += out[0]; },
  classOnly: i => { const j = i & 4095, Ta = ta[j], M = mm[j]; acc[0] += ecoClassOf(Ta, Ta + 6, Ta - 6, M, 0, 300, 0, Ta + 8, true); },
  lifeOnly: i => { const Ta = ta[i & 4095]; acc[0] += life01Of(i % 14, Ta + 6, Ta); },
  lookOnly: i => { const j = i & 4095, Ta = ta[j], M = mm[j]; groundLookOf(Ta + 6, Ta, Ta - 6, M, .5, sl[j], out); acc[0] += out[0]; },
}, N, 5, {sink: Number.isFinite(acc[0])});
