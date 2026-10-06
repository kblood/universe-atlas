import {performance} from 'node:perf_hooks';
import {waterWorlds} from '../../../../tests/terrain-climate-fixtures.mjs';
import {orogenLayout} from '../../../../src/mountain-layout.ts';
const body=waterWorlds()[Number(process.argv[2])];
if(!body)throw new Error('expected world index 0..3');
const layout=orogenLayout(body);layout.bandGrid(48000,32000);
const t=performance.now(),field=layout.coarseBandField(48000,32000),coldMs=performance.now()-t;
const m=performance.now();field.materialiseAll?.();
console.log(JSON.stringify({world:body.name,coldMs,materialiseAllMs:field.materialiseAll?performance.now()-m:null,bytes:field.bytes,activeCells:field.activeCells}));
