import { test } from 'node:test';
import assert from 'node:assert/strict';
import { surfaceCellsWithin, surfaceCellAt } from '../src/surface-cell.ts';
import { faunaGroundHeight } from '../src/fauna-ground.ts';

test('canonical neighbourhoods include every cell across face seams and corners', () => {
  const radius = 320, spacing = 32, n = 20, all = new Map();
  for (let f = 0; f < 6; f++) for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const a = (x + .5) * 2 / n - 1, b = (y + .5) * 2 / n - 1;
    const p = [[1,b,a],[-1,b,-a],[a,1,b],[a,-1,-b],[a,b,1],[-a,b,-1]][f];
    const cell = surfaceCellAt(p, radius, spacing); all.set(cell.id, cell);
  }
  for (const raw of [[1,0,0],[1,1,0],[1,1,1],[-1,1,1],[.97,1,.98]]) {
    const d = raw.map(v => v / Math.hypot(...raw));
    const expected = [...all.values()].filter(c => Math.hypot(...c.direction.map((v,i) => v-d[i])) * radius <= 65 + 1e-10).map(c => c.id).sort();
    const actual = surfaceCellsWithin(d, radius, 65, spacing).map(c => c.id).sort();
    assert.deepEqual(actual, expected);
    assert.equal(new Set(actual).size, actual.length);
  }
});

test('herd terrain stencil exactly interpolates a sloping plane and bounds edges', () => {
  const grid = new Float64Array(49);
  for (let z=0; z<7; z++) for(let x=0; x<7; x++) grid[z*7+x] = 100 + (x*8-24)*.2 + (z*8-24)*.3;
  for (const [x,z] of [[0,0],[2.3,-9.1],[-24,-24],[24,24]])
    assert.ok(Math.abs(faunaGroundHeight(grid,x,z) - (100+x*.2+z*.3)) < 1e-12);
  assert.equal(faunaGroundHeight(grid,30,40), faunaGroundHeight(grid,24,24));
});
