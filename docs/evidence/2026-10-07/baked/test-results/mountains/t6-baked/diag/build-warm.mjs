// Cold vs warm coarse-field build in one fresh process (coordinator diag).
import {waterWorlds} from '../../../../tests/terrain-climate-fixtures.mjs';
import {orogenLayout, buildOrogenLayout, continentalA0} from '../../../../src/mountain-layout.ts';
const body = waterWorlds().find(b => b.name === (process.argv[2] || 'Lethuris'));
const t0 = performance.now(), lay = orogenLayout(body), t1 = performance.now();lay.bandGrid(48000, 32000);const t2 = performance.now();
lay.coarseBandField(48000, 32000);const t3 = performance.now();
const lay2 = buildOrogenLayout({seed: body.seed, radiusM: body.radiusM, a0: continentalA0(body)});lay2.bandGrid(48000, 32000);
const t4 = performance.now();lay2.coarseBandField(48000, 32000);const t5 = performance.now();
console.log(body.name, 'layout', (t1 - t0).toFixed(1), 'grid', (t2 - t1).toFixed(1), 'field cold', (t3 - t2).toFixed(1), 'field warm', (t5 - t4).toFixed(1));
