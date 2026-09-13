import { type Body, type V3 } from './catalog.ts';
import { terrainSampler } from './terrain.ts';
import {conservativeRiverBedM} from './river-sample.ts';
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
const clamp=(v:number,a=0,b=1)=>Math.max(a,Math.min(b,v));
type RegionalMaterialSample={wet:boolean;bank:number;influence:number};
/**
 * The regional field gives a normalized dry-bank blend, rather than an
 * invented distance from the shoreline. Keep a small pebbly/sandy margin at
 * bank=1, then return a temperate inland bank to soil as that shared field
 * fades. Snow and already-rocky ground retain their normal material choice.
 */
export function regionalBankWeights(body:Body,s:RegionalMaterialSample,base:number[]):number[]{
  if(!body.hydrology||s.wet||s.influence<=0)return base;
  const snow=base[3],rock=base[2];
  const habitat=body.water>0&&body.temperatureK>=250&&body.temperatureK<=325&&body.type!=='Ice world'&&body.type!=='Volcanic world';
  if(!habitat||snow>.2||rock>.55)return base;
  // `bank` is one at the water edge and decreases monotonically across the
  // sampler's own corridor. Its fourth power keeps that edge visually narrow.
  const shore=clamp(s.bank)**4;
  const preservedRock=Math.max(rock,.08+.12*shore),available=Math.max(0,1-snow-preservedRock);
  const sand=.12+.5*shore;
  const regional=[available*sand,available*(1-sand),preservedRock,snow];
  // The sampler owns the corridor falloff. Apply it to the material target as
  // well, so an arbitrarily small positive influence cannot abruptly replace
  // baseline ground at the regional boundary.
  return base.map((weight,i)=>weight+(regional[i]-weight)*clamp(s.influence));
}
/** Legacy analytic normal query retained for non-tile callers. Tile meshes use
 * their actual cached child lattice below, including conservative coarse beds. */
export function surfaceNormal(body: Body, d: V3, sample = terrainSampler(body), relief = 1): V3 {
  const eps = 2 / body.radiusM;
  // Terrain and contact geometry use the actual bed; water owns its surface.
  // The metre-based direction step remains unchanged at poles and cube seams.
  const h = (q: V3) => sample(unit(q)).groundHeightM * relief / body.radiusM;
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
  // Near-contact patches are only a few metres wide. Their ground-detail atlas
  // supplies the fine grain, so retaining a 130² macro-colour texture there
  // wastes worker time and resident bytes without adding visible geography.
  // At L14 a patch is roughly 630 m across on Maithea: 64 macro texels still
  // give a 10 m substrate colour field. Geometry carries banks and cliffs,
  // while the shared ground atlas supplies the metre-scale grain at landing.
  const textureSize = tile.level>=20?32:tile.level>=14?64:tile.level>=8?128:PATCH_TEXTURE;
  const positions: number[] = [], parents: number[] = [], normals: number[] = [], uvs: number[] = [], indices: number[] = [];
  const surfaceHeight:number[] = [], parentHeight:number[] = [];
  // A level-only bound is intentionally used instead of a tile-centre metric:
  // the same global direction on a cube edge must receive the same envelope
  // from either face, and a child parent endpoint must match that parent's
  // own grid.  The factor bounds cube normalization and a diagonal triangle.
  const footprintForLevel=(level:number)=>Math.min(2800,4*Math.SQRT2*body.radiusM/(2**level*PATCH_SEGMENTS));
  const childFootprint=footprintForLevel(tile.level),parentFootprint=tile.level?footprintForLevel(tile.level-1):childFootprint;
  const heightAt=(d:V3,footprintM:number)=>{
    const s=sample(d);
    if(!body.hydrology||footprintM<=8)return s.groundHeightM;
    // Coarse valley widening is a bed envelope, never a water lift or ground
    // mask.  The 3 km query bound matches river-sample's indexed halo. At
    // levels whose conservative radius exceeds that bound (L0–8 on Maithea),
    // renderer selection must refine a visible inland-water region before it
    // claims exposure; this bounded tile field does not promise coverage there.
    // Preserve the full conservative bed inside the footprint, then blend its
    // outer support back to this vertex's sampled ground. This removes the
    // old coarse-grid vertical apron without lifting water or changing fine
    // contact terrain.
    const radius=Math.min(2800,footprintM),bed=conservativeRiverBedM(body.hydrology,d,radius,s.groundHeightM);
    return bed===null?s.groundHeightM:Math.min(s.groundHeightM,bed);
  };
  type LatticePoint={point:V3;height:number};
  const childPoints=new Map<string,LatticePoint>(),parentPoints=new Map<string,LatticePoint>();
  // Every caller uses this tile's 33x33 binary-fraction lattice.  Keep two
  // short-lived maps because parent endpoints have a different conservative
  // footprint; this avoids recomputing indexed hydrology queries four times
  // per parent interpolation without sharing mutable output arrays.
  const point = (u: number, v: number, footprintM=childFootprint): LatticePoint => {
    // Halo coordinates are intentionally outside [0, n]. A numeric row-major
    // key aliases e.g. (-1,1) with (n,0), which silently corrupts edge normal
    // samples; the signed pair remains unique for this short-lived cache.
    const x=Math.round(u*n),y=Math.round(v*n),key=`${x},${y}`,cache=footprintM===parentFootprint?parentPoints:childPoints;
    const existing=cache.get(key);if(existing)return existing;
    const d = tileDirection(tile, u, v),height=heightAt(d,footprintM),r = 1 + height * relief / body.radiusM;
    const result={point:d.map(value => value * r) as V3,height};cache.set(key,result);return result;
  };
  // Centre all three coordinates on the surface. A sea-level anchor leaves
  // kilometre-sized height offsets even in metre-sized contact patches.
  const anchor = point(.5,.5,childFootprint).point;
  // Interpolate the actual parent triangles, not its analytic sphere. New
  // children start on that mesh and morph to their sampled elevation.
  const parentPoint = (u: number, v: number): V3 => {
    if (!tile.level) return point(u, v, parentFootprint).point;
    const gx = u * n / 2, gy = v * n / 2;
    const ix = Math.min(n / 2 - 1, Math.floor(gx)), iy = Math.min(n / 2 - 1, Math.floor(gy));
    const a = gx - ix, b = gy - iy;
    const p00 = point(ix * 2 / n, iy * 2 / n,parentFootprint).point, p11 = point((ix + 1) * 2 / n, (iy + 1) * 2 / n,parentFootprint).point;
    const p = a >= b ? point((ix + 1) * 2 / n, iy * 2 / n,parentFootprint).point : point(ix * 2 / n, (iy + 1) * 2 / n,parentFootprint).point;
    return p00.map((v, i) => a >= b
      ? v * (1 - a) + p[i] * (a - b) + p11[i] * b
      : v * (1 - b) + p[i] * (b - a) + p11[i] * a) as V3;
  };
  const heightOf=(p:V3)=>(Math.hypot(...p)-1)*body.radiusM;
  const cross=(a:V3,b:V3):V3=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const childNormal=(x:number,y:number):V3=>{
    const u=x/n,v=y/n,centre=point(u,v).point;
    let normal:V3;
    if(x>0&&x<n&&y>0&&y<n){
      const west=point((x-1)/n,v).point,east=point((x+1)/n,v).point,south=point(u,(y-1)/n).point,north=point(u,(y+1)/n).point;
      normal=unit(cross(east.map((q,i)=>q-west[i]) as V3,north.map((q,i)=>q-south[i]) as V3));
    }else{
      // A cube-face coordinate step changes its tangent scale at an edge. Use
      // one level-consistent geodesic halo there, so either face asks for the
      // same four physical samples at its shared border/corners.
      const d=tileDirection(tile,u,v),axis=Math.abs(d[1])<.9?[0,1,0] as V3:[1,0,0] as V3,tangent=unit(cross(axis,d)),bitangent=unit(cross(d,tangent)),step=2/(2**tile.level*n),at=(t:V3,sign:number)=>{const q=unit(d.map((value,i)=>value+t[i]*step*sign) as V3),height=heightAt(q,childFootprint),r=1+height*relief/body.radiusM;return q.map(value=>value*r) as V3;},west=at(tangent,-1),east=at(tangent,1),south=at(bitangent,-1),north=at(bitangent,1);
      normal=unit(cross(east.map((q,i)=>q-west[i]) as V3,north.map((q,i)=>q-south[i]) as V3));
    }
    if(normal[0]*centre[0]+normal[1]*centre[1]+normal[2]*centre[2]<0)normal=normal.map(q=>-q) as V3;
    return normal;
  };
  const substrateColor=(weights:number[])=>{
    const palette=[[160,141,94],[72,91,52],[104,96,84],[220,229,232]];
    return palette[0].map((_,channel)=>Math.floor(weights.reduce((sum,w,i)=>sum+w*palette[i][channel],0)));
  };
  for (let y = 0; y <= n; y++) for (let x = 0; x <= n; x++) {
    const u = x / n, v = y / n, d = tileDirection(tile, u, v);
    const childSample=point(u,v,childFootprint),child=childSample.point,parent=parentPoint(u,v);
    positions.push(...child.map((p, i) => p - anchor[i]));
    parents.push(...parent.map((p, i) => p - anchor[i]));
    const normal=childNormal(x,y);
    normals.push(...normal);
    const s=sample(d);
    const base=classify(d,s.groundHeightM,normal.reduce((sum,x,j)=>sum+x*d[j],0)).weights;
    materials.push(...materialBytes(regionalBankWeights(body,s,base)));
    surfaceHeight.push(childSample.height*relief);
    parentHeight.push(heightOf(parent));
    uvs.push((u * textureSize + 1) / (textureSize + 2), (v * textureSize + 1) / (textureSize + 2));
    if (x < n && y < n) {
      const a = y * stride + x;
      indices.push(a, a + 1, a + stride + 1, a, a + stride + 1, a + stride);
    }
  }
  const edges = [Array.from({length: stride}, (_,i) => i), Array.from({length: stride}, (_,i) => i * stride + n), Array.from({length: stride}, (_,i) => n * stride + n - i), Array.from({length: stride}, (_,i) => (n - i) * stride)];
  // A skirt only needs to cover the measured child/parent morph separation at
  // this patch boundary. The old level-only formula was 4x a fine patch span
  // in the reported lake, creating a large visible curtain. Keep a 25 cm
  // streaming fallback, while retaining the actual (possibly larger) morph
  // bound needed before an adjacent patch has settled.
  let boundaryMorphErrorM=0;
  for(const edge of edges)for(const i of edge){
    const offset=i*3;
    boundaryMorphErrorM=Math.max(boundaryMorphErrorM,Math.hypot(positions[offset]-parents[offset],positions[offset+1]-parents[offset+1],positions[offset+2]-parents[offset+2])*body.radiusM);
  }
  const skirtDepthM=Math.max(.25,boundaryMorphErrorM+.25),skirt=skirtDepthM/body.radiusM;
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
      surfaceHeight.push(surfaceHeight[a]);
      parentHeight.push(parentHeight[a]);
      if (previous >= 0) indices.push(a - (a - previous), a, b, previous, b, b - 1);
      previous = a;
    }
  }
  const width = textureSize + 2, color = new Uint8Array(width * width * 4);
  for (let y = 0; y < width; y++) for (let x = 0; x < width; x++) {
    // Half-texel gutters sample the same field beyond each edge.
    const s = sample(tileDirection(tile, (x - .5) / textureSize, (y - .5) / textureSize));
    // Preserve the established dry geography palette. Only wet texels need a
    // bed colour, and use a deliberately inexpensive radial classification:
    // texture generation must not run six finite-difference terrain samples
    // per texel merely to obtain a shading normal.
    const d=tileDirection(tile,(x-.5)/textureSize,(y-.5)/textureSize);
    const rgb=s.wet?substrateColor(regionalBankWeights(body,s,classify(d,s.groundHeightM,1).weights)):s.color.map(Math.floor);
    color.set([...rgb,255], (y * width + x) * 4);
  }
  // The base grid is a shared ocean topology. It deliberately has no skirts;
  // root can cull it from conservative tile bounds without changing coverage.
  const oceanPositions:number[]|undefined=body.water?[]:undefined,oceanParents:number[]|undefined=body.water?[]:undefined;
  if(oceanPositions&&oceanParents)for(let y=0;y<=n;y++)for(let x=0;x<=n;x++){
    const u=x/n,v=y/n,d=tileDirection(tile,u,v),sea=d;
    oceanPositions.push(...sea.map((p,i)=>p-anchor[i]));
    const p=tile.level?(() => {
      const gx=u*n/2,gy=v*n/2,ix=Math.min(n/2-1,Math.floor(gx)),iy=Math.min(n/2-1,Math.floor(gy)),a=gx-ix,b=gy-iy;
      const p00=tileDirection(tile,ix*2/n,iy*2/n),p11=tileDirection(tile,(ix+1)*2/n,(iy+1)*2/n),q=a>=b?tileDirection(tile,(ix+1)*2/n,iy*2/n):tileDirection(tile,ix*2/n,(iy+1)*2/n);
      return p00.map((value,i)=>a>=b?value*(1-a)+q[i]*(a-b)+p11[i]*b:value*(1-b)+q[i]*(b-a)+p11[i]*a) as V3;
    })():sea;
    oceanParents.push(...p.map((value,i)=>value-anchor[i]));
  }
  return { tile, anchor, positions: new Float32Array(positions), parents: new Float32Array(parents), surfaceHeight:new Float32Array(surfaceHeight), parentHeight:new Float32Array(parentHeight), normals: new Float32Array(normals), materials:new Uint8Array(materials), uvs: new Float32Array(uvs), indices: new Uint16Array(indices), color, width, skirtDepthM, oceanPositions:oceanPositions&&new Float32Array(oceanPositions), oceanParents:oceanParents&&new Float32Array(oceanParents) };
}
