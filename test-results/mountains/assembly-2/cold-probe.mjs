// Cold-streaming probe: per-phase timings with block-build counts, staged so a slow phase shows up early.
import {performance} from 'node:perf_hooks';
import {waterWorlds,fib} from '../../../tests/terrain-climate-fixtures.mjs';
import {terrainSampler} from '../../../src/terrain.ts';
import * as tiles from '../../../src/planet-tiles.ts';
import {orogenLayout} from '../../../src/mountain-layout.ts';
import {massifHalfWidthM,MASSIF_ENVELOPE} from '../../../src/mountain-envelope.ts';
import {carvingBuildStats} from '../../../src/mountain-carving.ts';
const world=waterWorlds().find(b=>b.name===(process.argv[2]||'Maithea')),ts=terrainSampler(world),lay=orogenLayout(world);
const inM=o=>o.belt!==0&&o.halfWidthM>=MASSIF_ENVELOPE.MIN_HALF_WIDTH_M&&Math.abs(o.axisDistanceM)<massifHalfWidthM(o.halfWidthM);
let sink=0;
const phase=(name,fn)=>{const b=carvingBuildStats.count,t=performance.now();const extra=fn();console.log(name,((performance.now()-t)/1000).toFixed(2),'s builds',carvingBuildStats.count-b,extra??'');};
const fibs=n=>Array.from({length:n},(_,i)=>fib(i,n));
for(const n of [1000,4096]){const ds=fibs(n);phase(`fib ${n} (in-massif ${ds.filter(d=>inM(lay.sample(d))).length})`,()=>{for(const d of ds)sink+=ts(d).groundHeightM;});}
// Tile vertex counts in massif per level (no sampling).
for(let L=0;L<=5;L++){let v=0,m=0;const n=tiles.PATCH_SEGMENTS;for(let f=0;f<6;f++)for(let y=0;y<(1<<L);y++)for(let x=0;x<(1<<L);x++){const t={face:f,level:L,x,y};for(let j=0;j<=n;j++)for(let i=0;i<=n;i++){v++;if(inM(lay.sample(tiles.tileDirection(t,i/n,j/n))))m++;}}console.log(`L${L} vertices ${v} in-massif ${m}`);}
phase('L0 tiles',()=>{for(let f=0;f<6;f++)sink+=tiles.buildTile(world,{face:f,level:0,x:0,y:0}).surfaceHeight[0];});
phase('L1 tiles',()=>{for(let f=0;f<6;f++)for(let y=0;y<2;y++)for(let x=0;x<2;x++)sink+=tiles.buildTile(world,{face:f,level:1,x,y}).surfaceHeight[0];});
console.log(sink>0);
