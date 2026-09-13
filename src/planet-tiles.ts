import { type Body, type V3 } from './catalog.ts';
import { terrainSampler } from './terrain.ts';
import {biomeClassifier,materialBytes} from './surface-biomes.ts';

export const PATCH_SEGMENTS = 32;
export const PATCH_TEXTURE = 64;
export type Tile = { face: number; level: number; x: number; y: number };
export const tileKey = (t: Tile) => `${t.face}/${t.level}/${t.x}/${t.y}`;
export function directionCoordinates(d: V3) {
  const [x,y,z]=d, ax=Math.abs(x),ay=Math.abs(y),az=Math.abs(z);
  const face=ax>=ay&&ax>=az?(x>=0?0:1):ay>=az?(y>=0?2:3):(z>=0?4:5);
  const a=Math.max(ax,ay,az)||1;
  const [u,v]=[[-z/a,y/a],[z/a,y/a],[x/a,-z/a],[x/a,z/a],[x/a,y/a],[-x/a,y/a]][face];
  return {face,u,v};
}
export function directionTile(d:V3,level:number):Tile {
  const {face,u,v}=directionCoordinates(d),n=2**level;
  return {face,level,x:Math.max(0,Math.min(n-1,Math.floor((u+1)*.5*n))),y:Math.max(0,Math.min(n-1,Math.floor((v+1)*.5*n)))};
}
export function tileNeighbour(t:Tile,edge:number):Tile {
  const [u,v]=[[-1e-5,.5],[1+1e-5,.5],[.5,-1e-5],[.5,1+1e-5]][edge];
  return directionTile(tileDirection(t,u,v),t.level);
}
export const children = (t: Tile): Tile[] => [0, 1, 2, 3].map(i => ({
  face: t.face, level: t.level + 1, x: t.x * 2 + (i % 2), y: t.y * 2 + (i >> 1),
}));
export function unit(v: V3): V3 {
  const length = Math.hypot(...v);
  return v.map(x => x / length) as V3;
}
// On each face cross(d/du,d/dv) points outward. Identical cube edge
// coordinates normalize identically, including at all eight cube corners.
export function cubeDirection(face: number, u: number, v: number): V3 {
  return unit(([
    [1, v, -u], [-1, v, u], [u, 1, -v],
    [u, -1, v], [u, v, 1], [-u, v, -1],
  ][face]) as V3);
}
export function tileDirection(t: Tile, u: number, v: number): V3 {
  const n = 2 ** t.level;
  return cubeDirection(t.face, (t.x + u) * 2 / n - 1, (t.y + v) * 2 / n - 1);
}
/** Closest face-coordinate projection for prioritising the camera's ground
 * patch. Unlike distance to an oversized bounding sphere, this does not assign
 * every large nearby tile the same infinite priority. */
export function closestTileDirection(t: Tile, eye: V3): V3 {
  const [x,y,z]=eye, a=Math.max(1e-12,Math.abs(eye[Math.floor(t.face/2)]));
  const [u,v]=[[-z/a,y/a],[z/a,y/a],[x/a,-z/a],[x/a,z/a],[x/a,y/a],[-x/a,y/a]][t.face];
  const n=2**t.level;
  return tileDirection(t,Math.max(0,Math.min(1,(u+1)*.5*n-t.x)),Math.max(0,Math.min(1,(v+1)*.5*n-t.y)));
}
export function visibleElevation(body: Body, elevation: number) {
  return body.water ? Math.max(0, elevation) : elevation;
}
/** Stable directional finite differences; never derive normals per mesh/face. */
export function surfaceNormal(body: Body, d: V3, sample = terrainSampler(body), relief = 1): V3 {
  const eps = 2 / body.radiusM;
  const h = (q: V3) => visibleElevation(body, sample(unit(q)).elevationM) * relief / body.radiusM;
  const grad = [0, 1, 2].map(i => {
    const a = [...d] as V3, b = [...d] as V3;
    a[i] += eps; b[i] -= eps;
    return (h(a) - h(b)) / (2 * eps);
  });
  return unit(d.map((v, i) => v - grad[i]) as V3);
}

export function buildTile(body: Body, tile: Tile, relief = 1) {
  const sample = terrainSampler(body), n = PATCH_SEGMENTS, stride = n + 1;
  const classify=biomeClassifier(body),materials:number[]=[];
  const textureSize = tile.level >= 8 ? 128 : PATCH_TEXTURE;
  const positions: number[] = [], parents: number[] = [], normals: number[] = [], uvs: number[] = [], indices: number[] = [];
  const point = (u: number, v: number): V3 => {
    const d = tileDirection(tile, u, v);
    const r = 1 + visibleElevation(body, sample(d).elevationM) * relief / body.radiusM;
    return d.map(x => x * r) as V3;
  };
  // Centre all three coordinates on the surface. A sea-level anchor leaves
  // kilometre-sized height offsets even in metre-sized contact patches.
  const anchor = point(.5,.5);
  // Interpolate the actual parent triangles, not its analytic sphere. New
  // children start on that mesh and morph to their sampled elevation.
  const parentPoint = (u: number, v: number): V3 => {
    if (!tile.level) return point(u, v);
    const gx = u * n / 2, gy = v * n / 2;
    const ix = Math.min(n / 2 - 1, Math.floor(gx)), iy = Math.min(n / 2 - 1, Math.floor(gy));
    const a = gx - ix, b = gy - iy;
    const p00 = point(ix * 2 / n, iy * 2 / n), p11 = point((ix + 1) * 2 / n, (iy + 1) * 2 / n);
    const p = a >= b ? point((ix + 1) * 2 / n, iy * 2 / n) : point(ix * 2 / n, (iy + 1) * 2 / n);
    return p00.map((v, i) => a >= b
      ? v * (1 - a) + p[i] * (a - b) + p11[i] * b
      : v * (1 - b) + p[i] * (b - a) + p11[i] * a) as V3;
  };
  for (let y = 0; y <= n; y++) for (let x = 0; x <= n; x++) {
    const u = x / n, v = y / n, d = tileDirection(tile, u, v);
    positions.push(...point(u, v).map((p, i) => p - anchor[i]));
    parents.push(...parentPoint(u, v).map((p, i) => p - anchor[i]));
    const normal=surfaceNormal(body,d,sample,relief);
    normals.push(...normal);
    materials.push(...materialBytes(classify(d,sample(d).elevationM,normal.reduce((sum,x,j)=>sum+x*d[j],0)).weights));
    uvs.push((u * textureSize + 1) / (textureSize + 2), (v * textureSize + 1) / (textureSize + 2));
    if (x < n && y < n) {
      const a = y * stride + x;
      indices.push(a, a + 1, a + stride + 1, a, a + stride + 1, a + stride);
    }
  }
  // Conservative inward skirts hide T junctions while neighbours stream or
  // use different levels. They don't change the shared surface samples.
  // Deep planet-scale skirts cause raster interpolation artefacts when viewed
  // centimetres away. Bound fine skirts by patch width as well as global relief.
  const skirt = Math.min(.08, 4 / (2 ** tile.level * n) ** 2 + Math.min(36000/body.radiusM,8/2**tile.level)*relief);
  const edges = [Array.from({length: stride}, (_,i) => i), Array.from({length: stride}, (_,i) => i * stride + n), Array.from({length: stride}, (_,i) => n * stride + n - i), Array.from({length: stride}, (_,i) => (n - i) * stride)];
  for (const edge of edges) {
    let previous = -1;
    for (const a of edge) {
      const b = positions.length / 3;
      const d = unit(positions.slice(a * 3, a * 3 + 3).map((v, i) => v + anchor[i]) as V3);
      positions.push(...d.map((v, i) => positions[a * 3 + i] - v * skirt));
      parents.push(...d.map((v, i) => parents[a * 3 + i] - v * skirt));
      normals.push(...normals.slice(a * 3, a * 3 + 3));
      materials.push(...materials.slice(a*4,a*4+4));
      uvs.push(...uvs.slice(a * 2, a * 2 + 2));
      if (previous >= 0) indices.push(a - (a - previous), a, b, previous, b, b - 1);
      previous = a;
    }
  }
  const width = textureSize + 2, color = new Uint8Array(width * width * 4);
  for (let y = 0; y < width; y++) for (let x = 0; x < width; x++) {
    // Half-texel gutters sample the same field beyond each edge.
    const s = sample(tileDirection(tile, (x - .5) / textureSize, (y - .5) / textureSize));
    color.set([...s.color, 255], (y * width + x) * 4);
  }
  return { tile, anchor, positions: new Float32Array(positions), parents: new Float32Array(parents), normals: new Float32Array(normals), materials:new Uint8Array(materials), uvs: new Float32Array(uvs), indices: new Uint16Array(indices), color, width };
}
