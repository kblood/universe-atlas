import { type Body, type V3 } from './catalog.ts';
import { terrainSampler, mountainCarvingState, type SurfaceSample, type TerrainSamplerOptions } from './terrain.ts';
import {peakCorrectionMaxLevel,TILE_CLASS_LABELS,SNOW_LABELS,LOD_LADDER_VERSION} from './lod-ladder.ts';
import {conservativeRiverBedM} from './river-sample.ts';
import {biomeClassifier,materialBytes} from './surface-biomes.ts';
import {activeRenderedRiverRegion} from './inland-rivers.ts';

export const PATCH_SEGMENTS = 32;
export const PATCH_TEXTURE = 128;
export type Tile = { face: number; level: number; x: number; y: number };
export const tileKey = (t: Tile) => `${t.face}/${t.level}/${t.x}/${t.y}`;
/** Exact numeric tile identity: `((8+face)*2^L + y)*2^L + x`. Each level
 * occupies [8*4^L, 14*4^L), so codes are unique across faces and levels, and
 * every code stays below 2^53 through level 24 (14*4^24 < 2^52). Terrain
 * leaves never exceed level 24 (fineContactLevel is clamped to 24); deeper or
 * negative levels return -1, which is never a leaf's code. */
export const TILE_CODE_MAX_LEVEL=24;
export function tileCode(t:Tile){
  if(t.level<0||t.level>TILE_CODE_MAX_LEVEL)return -1;
  const n=2**t.level;return ((8+t.face)*n+t.y)*n+t.x;
}
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
/** Gnomonic cube-face projection. Forest patch rejection relies on its
 * 1-Lipschitz normalization bound; changing projection requires reviewing
 * forest-selection-cache.ts and its seam/corner equivalence fixtures. */
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
/** `waterLevelM` (new, additive, default `0` - the literal this already
 * hardcoded): docs/time-and-coordinates-contract.md §2.5/§2.6 - one of the
 * four sites that must move together with the sea level everywhere else in
 * this module, or a water world's visible clamp keeps pinning to the old
 * ocean-formation datum regardless of how far the real sea has receded. */
export function visibleElevation(body: Body, elevation: number, waterLevelM: number = 0) {
  return body.water ? Math.max(waterLevelM, elevation) : elevation;
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
  // Inland rivers are withdrawn (inland-rivers.ts): no bank palette.
  if(!activeRenderedRiverRegion(body)||s.wet||s.influence<=0)return base;
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

/**
 * `waterLevelM` (new, additive, default `0` - the literal every field below
 * already hardcoded): docs/time-and-coordinates-contract.md §2.5/§2.6 - the
 * caller-resolved global sea level (`world-surface.ts`'s `waterLevelAt`,
 * keyed from `stellar-evolution.ts`'s `waterKeysFor`, evaluated at the real
 * epoch - see that module's own trap warning about an omitted `date`
 * clamping to the ocean-formation level). Threaded into the rock/colour
 * sampler, the biome classifier and the ocean shell's radius below so all
 * three stay in agreement about where the shoreline is at this `t` (the
 * same requirement `terrainSampler`'s own doc comment states). Tile-cache
 * staleness (this function's caller may still hand back a stale resident
 * tile built at an earlier sea level) is out of this package's ownership —
 * see this task's report.
 */
export function buildTile(body: Body, tile: Tile, relief = 1, waterLevelM: number = 0, samplerOptions: Omit<TerrainSamplerOptions,'lodLevel'> = {}) {
  // Level pass-through (lod-ladder-2, cost plan T3): the tile samples at its own level; its parent mesh (the
  // morph start) samples at the parent's level, so parent and child keep the carving state of their own level
  // (docs/mountains-opus-decisions-2026-10-05.md, addendum item 1). Where both levels have the same state the
  // child's sampler and caches serve the parent too (bit-identical to one sampler); only at the switch level
  // L = carvingFromLevel does the parent get its own sampler and its own caches.
  const childOptions={...samplerOptions,lodLevel:tile.level},parentOptions={...samplerOptions,lodLevel:Math.max(0,tile.level-1)};
  const sample = terrainSampler(body, undefined, undefined, undefined, waterLevelM, undefined, false, childOptions), n = PATCH_SEGMENTS, stride = n + 1;
  const splitParent=tile.level>0&&mountainCarvingState(body,childOptions)!==mountainCarvingState(body,parentOptions);
  const parentSample=splitParent?terrainSampler(body, undefined, undefined, undefined, waterLevelM, undefined, false, parentOptions):sample;
  const classify=biomeClassifier(body,waterLevelM),materials:number[]=[];
  // Near-contact patches are only a few metres wide. Their ground-detail atlas
  // supplies the fine grain, so retaining a 130² macro-colour texture there
  // wastes worker time and resident bytes without adding visible geography.
  // At L14 a patch is roughly 630 m across on Maithea: 64 macro texels still
  // give a 10 m substrate colour field. Geometry carries banks and cliffs,
  // while the shared ground atlas supplies the metre-scale grain at landing.
  const textureSize = tile.level>=20?32:tile.level>=14?64:tile.level>=8?128:PATCH_TEXTURE;
  const positions: number[] = [], parents: number[] = [], normals: number[] = [], surfaceRoughness:number[]=[], uvs: number[] = [], indices: number[] = [];
  const surfaceHeight:number[] = [], parentHeight:number[] = [];
  // A level-only bound is intentionally used instead of a tile-centre metric:
  // the same global direction on a cube edge must receive the same envelope
  // from either face, and a child parent endpoint must match that parent's
  // own grid.  The factor bounds cube normalization and a diagonal triangle.
  const footprintForLevel=(level:number)=>Math.min(2800,4*Math.SQRT2*body.radiusM/(2**level*PATCH_SEGMENTS));
  const childFootprint=footprintForLevel(tile.level),parentFootprint=tile.level?footprintForLevel(tile.level-1):childFootprint;
  // Null while inland rivers are withdrawn: no conservative river-bed carve.
  const riverRegion=activeRenderedRiverRegion(body);
  const heightAt=(d:V3,footprintM:number,s:SurfaceSample=sample(d))=>{
    if(!riverRegion||footprintM<=8)return s.groundHeightM;
    // Coarse valley widening is a bed envelope, never a water lift or ground
    // mask.  The 3 km query bound matches river-sample's indexed halo. At
    // levels whose conservative radius exceeds that bound (L0–8 on Maithea),
    // renderer selection must refine a visible inland-water region before it
    // claims exposure; this bounded tile field does not promise coverage there.
    // Preserve the full conservative bed inside the footprint, then blend its
    // outer support back to this vertex's sampled ground. This removes the
    // old coarse-grid vertical apron without lifting water or changing fine
    // contact terrain.
    const radius=Math.min(2800,footprintM),bed=conservativeRiverBedM(riverRegion,d,radius,s.groundHeightM);
    return bed===null?s.groundHeightM:Math.min(s.groundHeightM,bed);
  };
  type LatticePoint={point:V3;height:number;sample:SurfaceSample;direction:V3};
  const childPoints=new Map<string,LatticePoint>(),parentPoints=new Map<string,LatticePoint>();
  // Every caller uses this tile's 33x33 binary-fraction lattice (plus its
  // half-cell centres for the coarse peak correction).  Two short-lived maps
  // are needed only while a river region is active, because parent endpoints
  // then have a different conservative footprint; without one, heightAt does
  // not read the footprint, so both endpoints share one cache.
  const sharedFootprints=!riverRegion||childFootprint===parentFootprint;
  // At the carving switch level the parent path has its own sampler, so it also has its own cache (a cache
  // keyed without the level would hand the parent the child's carved samples).
  const parentLevelPoints=new Map<string,LatticePoint>();
  const point = (u: number, v: number, footprintM=childFootprint, parentPath=false): LatticePoint => {
    // Halo coordinates are intentionally outside [0, n]. A numeric row-major
    // key aliases e.g. (-1,1) with (n,0), which silently corrupts edge normal
    // samples; the signed pair remains unique for this short-lived cache. The
    // key counts half cells, so cell centres share the cache with vertices.
    const ownSampler=parentPath&&splitParent;
    const x=Math.round(u*2*n),y=Math.round(v*2*n),key=`${x},${y}`,cache=ownSampler?parentLevelPoints:!sharedFootprints&&footprintM===parentFootprint?parentPoints:childPoints;
    const existing=cache.get(key);if(existing)return existing;
    const d = tileDirection(tile, u, v),s=(ownSampler?parentSample:sample)(d),height=heightAt(d,footprintM,s),r = 1 + height * relief / body.radiusM;
    const result={point:d.map(value => value * r) as V3,height,sample:s,direction:d};cache.set(key,result);return result;
  };
  // Peak-preserving coarse heights (docs/lod-ladder-contract-v1.md §3). At
  // levels up to the last S1 level (Maithea L9) a vertex stores its point
  // sample plus a bounded, non-negative max-preserving correction read from
  // the four adjacent cell centres (the next finer level's own lattice
  // points). Only + - * / min max on samples, so the rule is deterministic,
  // order-independent and identical for a vertex seen from either tile.
  // Ocean vertices and vertices on a cube-face edge keep their point sample
  // (the first preserves the coastline sign exactly; the second keeps both
  // faces bit-identical along their shared edge). Normals, classes and the
  // colour map keep reading point samples.
  const correctionMaxLevel=peakCorrectionMaxLevel(body.radiusM),faceCells=2**tile.level*n;
  const onCubeEdge=(gx:number,gy:number)=>gx<=0||gy<=0||gx>=faceCells||gy>=faceCells;
  // Raw heights on a half-cell grid (child-lattice coordinates x2, halo of
  // two parent cells) and memoised corrected vertices: each sample is taken
  // once and each correction evaluated once per tile, by numeric index.
  // The parent path (step 2) is the only caller with parentPath; it gets its own grid only at the switch level.
  const G=2*n+9,O=4,rawGrids=new Map<number,Float64Array>(),parentLevelGrids=new Map<number,Float64Array>(),corrected=new Map<number,Float64Array>();
  const rawAt=(hx:number,hy:number,footprintM:number,parentPath=false)=>{
    const grids=parentPath&&splitParent?parentLevelGrids:rawGrids;
    let grid=grids.get(footprintM);if(!grid){grid=new Float64Array(G*G).fill(NaN);grids.set(footprintM,grid);}
    const i=(hy+O)*G+hx+O;let h=grid[i];
    if(h!==h){h=point(hx/(2*n),hy/(2*n),footprintM,parentPath).height;grid[i]=h;}
    return h;
  };
  /** Height of the lattice vertex at child-lattice coordinates (x, y) for a
   * tile of `step` child cells per cell (1: this tile, 2: its parent). */
  const correctedHeight=(x:number,y:number,step:number,footprintM:number)=>{
    const key=step*1e6+footprintM;let memo=corrected.get(key);
    if(!memo){memo=new Float64Array((n+1)*(n+1)).fill(NaN);corrected.set(key,memo);}
    const mi=y*(n+1)+x;if(memo[mi]===memo[mi])return memo[mi];
    const at=(i:number,j:number)=>rawAt(2*i,2*j,footprintM,step===2),p=at(x,y);
    let lift=p;
    if(!onCubeEdge(tile.x*n+x,tile.y*n+y)&&!(body.water&&p<waterLevelM)){
      const h=step/2;let max=p,min=p;
      for(let k=0;k<4;k++){
        const cx=x-(k&1?0:step),cy=y-(k&2?0:step),c=at(cx+h,cy+h);
        max=Math.max(max,c);min=Math.min(min,c);
        // Peak transfer: a cell-interior summit lifts that cell's highest corner.
        const top=Math.max(at(cx,cy),at(cx+step,cy),at(cx,cy+step),at(cx+step,cy+step));
        if(p===top&&c>top)lift=Math.max(lift,c);
      }
      // Slope-weighted max correction: zero in a local minimum, growing toward
      // the local maximum, never above the highest of the five samples. A
      // vertex whose footprint reaches the sea (any centre below sea level)
      // keeps its point sample, so the interpolated coastline stays where the
      // point-sampled lattice puts it.
      if(body.water&&min<waterLevelM)lift=p;
      else if(max>min)lift=Math.max(lift,p+(p-min)/(max-min)*(max-p));
    }
    memo[mi]=lift;return lift;
  };
  const vertex=(x:number,y:number,step:number,footprintM:number):{point:V3;height:number}=>{
    // step 2 is the parent's lattice (parentPoint): it samples at the parent's level.
    const raw=point(x/n,y/n,footprintM,step===2);
    const level=tile.level-(step===2?1:0);
    if(level>correctionMaxLevel)return raw;
    const height=correctedHeight(x,y,step,footprintM);if(height===raw.height)return raw;
    const r=1+height*relief/body.radiusM;
    return {point:raw.direction.map(value=>value*r) as V3,height};
  };
  const vertexPoint=(x:number,y:number,step:number,footprintM:number):V3=>vertex(x,y,step,footprintM).point;
  // Centre all three coordinates on the surface. A sea-level anchor leaves
  // kilometre-sized height offsets even in metre-sized contact patches.
  const anchor = point(.5,.5,childFootprint).point;
  // Interpolate the actual parent triangles, not its analytic sphere. New
  // children start on that mesh and morph to their sampled elevation.
  const parentPoint = (u: number, v: number): V3 => {
    if (!tile.level) return vertexPoint(Math.round(u*n),Math.round(v*n),1,parentFootprint);
    const gx = u * n / 2, gy = v * n / 2;
    const ix = Math.min(n / 2 - 1, Math.floor(gx)), iy = Math.min(n / 2 - 1, Math.floor(gy));
    const a = gx - ix, b = gy - iy;
    const p00 = vertexPoint(ix * 2, iy * 2,2,parentFootprint), p11 = vertexPoint((ix + 1) * 2, (iy + 1) * 2,2,parentFootprint);
    const p = a >= b ? vertexPoint((ix + 1) * 2, iy * 2,2,parentFootprint) : vertexPoint(ix * 2, (iy + 1) * 2,2,parentFootprint);
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
      const d=point(u,v).direction,axis=Math.abs(d[1])<.9?[0,1,0] as V3:[1,0,0] as V3,tangent=unit(cross(axis,d)),bitangent=unit(cross(d,tangent)),step=2/(2**tile.level*n),at=(t:V3,sign:number)=>{const q=unit(d.map((value,i)=>value+t[i]*step*sign) as V3),height=heightAt(q,childFootprint),r=1+height*relief/body.radiusM;return q.map(value=>value*r) as V3;},west=at(tangent,-1),east=at(tangent,1),south=at(bitangent,-1),north=at(bitangent,1);
      normal=unit(cross(east.map((q,i)=>q-west[i]) as V3,north.map((q,i)=>q-south[i]) as V3));
    }
    if(normal[0]*centre[0]+normal[1]*centre[1]+normal[2]*centre[2]<0)normal=normal.map(q=>-q) as V3;
    return normal;
  };
  const substrateColor=(weights:number[])=>{
    const palette=[[160,141,94],[72,91,52],[104,96,84],[220,229,232]];
    return palette[0].map((_,channel)=>Math.floor(weights.reduce((sum,w,i)=>sum+w*palette[i][channel],0)));
  };
  const meta=tileMetaAccumulator(waterLevelM);
  for (let y = 0; y <= n; y++) for (let x = 0; x <= n; x++) {
    const u = x / n, v = y / n, d = point(u,v,childFootprint).direction;
    const childSample=vertex(x,y,1,childFootprint),child=childSample.point,parent=parentPoint(u,v);
    positions.push(...child.map((p, i) => p - anchor[i]));
    parents.push(...parent.map((p, i) => p - anchor[i]));
    const normal=childNormal(x,y);
    normals.push(...normal);
    // The lattice point's own sample (cached by point()); bit-identical to a
    // fresh sample(d), without sampling every vertex twice.
    const s=point(u,v,childFootprint).sample;
    surfaceRoughness.push(Math.max(0,Math.min(1,s.roughness)));
    const classified=classify(d,s.groundHeightM,normal.reduce((sum,x,j)=>sum+x*d[j],0)),base=classified.weights;
    materials.push(...materialBytes(regionalBankWeights(body,s,base)));
    meta.vertex(x,y,childSample.height,s,classified);
    surfaceHeight.push(childSample.height*relief);
    parentHeight.push(heightOf(parent));
    uvs.push((u * textureSize + 1) / (textureSize + 2), (v * textureSize + 1) / (textureSize + 2));
    if (x < n && y < n) {
      const a = y * stride + x;
      indices.push(a, a + 1, a + stride + 1, a, a + stride + 1, a + stride);
    }
  }
  // Coarse tiles already sampled their cell centres for the peak correction:
  // they also bound the tile summit (metadata maxH/peakDir), at no extra cost.
  if(tile.level<=correctionMaxLevel)for(let cy=0;cy<n;cy++)for(let cx=0;cx<n;cx++){
    const c=point((cx+.5)/n,(cy+.5)/n,childFootprint);meta.centre(cx+.5,cy+.5,c.height,c.sample);
  }
  const metadata=meta.encode(tile.level<=correctionMaxLevel);
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
  // Bound the measured morph error well below this tile's own physical
  // footprint. A hydrology-adjacent boundary, or a neighbour that has not
  // finished streaming in yet, occasionally reports a child/parent
  // separation of hundreds to thousands of metres (observed up to ~5 km),
  // which built an oversized skirt "curtain" rendered as a bright
  // rectangular seam/arc cutting across nearby terrain and visible from a
  // distance. A skirt's job is only to paper over a thin sub-pixel crack, so
  // it is capped to a small absolute depth: large enough to hide an ordinary
  // LOD gap, far too shallow to read as a wall from any normal viewing angle.
  const skirtDepthM=Math.max(.25,Math.min(boundaryMorphErrorM,childFootprint,40)+.25),skirt=skirtDepthM/body.radiusM;
  for (const edge of edges) {
    let previous = -1;
    for (const a of edge) {
      const b = positions.length / 3;
      const d = unit(positions.slice(a * 3, a * 3 + 3).map((v, i) => v + anchor[i]) as V3);
      positions.push(...d.map((v, i) => positions[a * 3 + i] - v * skirt));
      parents.push(...d.map((v, i) => parents[a * 3 + i] - v * skirt));
      normals.push(...normals.slice(a * 3, a * 3 + 3));
      surfaceRoughness.push(surfaceRoughness[a]);
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
    // One direction per texel (it was computed twice): bit-identical, cheaper.
    const d=tileDirection(tile,(x-.5)/textureSize,(y-.5)/textureSize),s = sample(d);
    // Preserve the established dry geography palette. Only wet texels need a
    // bed colour, and use a deliberately inexpensive radial classification:
    // texture generation must not run six finite-difference terrain samples
    // per texel merely to obtain a shading normal.
    const rgb=s.wet?substrateColor(regionalBankWeights(body,s,classify(d,s.groundHeightM,1).weights)):s.color.map(Math.floor);
    color.set([...rgb,255], (y * width + x) * 4);
  }
  // The base grid is a shared ocean topology. It deliberately has no skirts;
  // root can cull it from conservative tile bounds without changing coverage.
  const oceanPositions:number[]|undefined=body.water?[]:undefined,oceanParents:number[]|undefined=body.water?[]:undefined;
  // Global sea level is one scalar per body per `t` (contract §2.5/§2.6), so
  // the shell is a UNIFORM radius scale, never a per-vertex or non-spherical
  // change: the old implicit `×1` (unit sphere, i.e. `waterLevelM=0`) becomes
  // `×(1 + waterLevelM/body.radiusM)`, matching the exact `r = 1 + height *
  // relief / body.radiusM` convention the land mesh above already uses.
  // Baked into this tile's own build rather than applied as a renderer-side
  // uniform: `planet-renderer.ts` (out of this package's ownership for this
  // change) consumes `oceanPositions`/`oceanParents` as plain vertex buffers
  // with no separate sea-level transform, so moving the shell here is the
  // only mechanism available without editing that file. See this task's
  // report for the resulting tile-cache staleness consequence.
  const seaRadius=1+waterLevelM/body.radiusM;
  if(oceanPositions&&oceanParents)for(let y=0;y<=n;y++)for(let x=0;x<=n;x++){
    const u=x/n,v=y/n,d=point(u,v,childFootprint).direction,sea=d.map(value=>value*seaRadius) as V3;
    oceanPositions.push(...sea.map((p,i)=>p-anchor[i]));
    const rawParent=tile.level?(() => {
      const gx=u*n/2,gy=v*n/2,ix=Math.min(n/2-1,Math.floor(gx)),iy=Math.min(n/2-1,Math.floor(gy)),a=gx-ix,b=gy-iy;
      // Lattice directions from the point cache (every one already sampled).
      const dir=(i:number,j:number)=>point(i*2/n,j*2/n,childFootprint).direction;
      const p00=dir(ix,iy),p11=dir(ix+1,iy+1),q=a>=b?dir(ix+1,iy):dir(ix,iy+1);
      return p00.map((value,i)=>a>=b?value*(1-a)+q[i]*(a-b)+p11[i]*b:value*(1-b)+q[i]*(b-a)+p11[i]*a) as V3;
    })():d;
    const p=rawParent.map(value=>value*seaRadius) as V3;
    oceanParents.push(...p.map((value,i)=>value-anchor[i]));
  }
  return { tile, anchor, positions: new Float32Array(positions), parents: new Float32Array(parents), surfaceHeight:new Float32Array(surfaceHeight), parentHeight:new Float32Array(parentHeight), normals: new Float32Array(normals), materials:new Uint8Array(materials), surfaceRoughness:new Float32Array(surfaceRoughness), uvs: new Float32Array(uvs), indices: new Uint16Array(indices), color, width, skirtDepthM, meta:metadata, oceanPositions:oceanPositions&&new Float32Array(oceanPositions), oceanParents:oceanParents&&new Float32Array(oceanParents) };
}

/** Tile metadata layout (TILE_META_BYTES = 64, little-endian), built from the
 * lattice samples and classifier calls buildTile already makes:
 *   f32 @0  minH        lowest stored vertex height (m, before `relief`)
 *   f32 @4  maxH        highest of the stored vertices and, on coarse tiles,
 *                       the cell-centre samples inside the tile (tile summit)
 *   f32 @8  floorMin    lowest regional floor (terrain floorM), NaN if absent
 *   f32 @12 floorMax    highest regional floor, NaN if absent
 *   f32 @16 windowMax   highest (point height - floorM), NaN if absent
 *   f32 @20 snowlineM   lowest snow-labelled land vertex height, NaN if none
 *   f32 @24 treelineM   highest forestPotential vertex height, NaN if none
 *   f32 @28 peakU, @32 peakV   tile-local position of maxH
 *   f32 @36 waterLevelM the sea level the tile was built at
 *   u16 @40 lattice vertex count (1089), @42 ocean, @44 snow, @46 forest counts
 *   u16 @48..54 counts of the four most common classes
 *   u8  @56..59 their TILE_CLASS_LABELS ids (255 = unused)
 *   u8  @60 metadata version (1), @61 flags (1: floor present, 2: peak-corrected
 *   heights), @62..63 reserved (0).
 * Float32 storage rounds monotonically, so minH <= every stored Float32 vertex
 * height <= maxH still holds exactly. */
export const TILE_META_BYTES=64;
export const TILE_META_VERSION=1;
type ClassifiedVertex={name:string;ocean:boolean;forestPotential:boolean};
function tileMetaAccumulator(waterLevelM:number){
  let minH=Infinity,maxH=-Infinity,peakU=NaN,peakV=NaN,floorMin=Infinity,floorMax=-Infinity,windowMax=-Infinity,floorSeen=false;
  let snowline=Infinity,treeline=-Infinity,count=0,ocean=0,snow=0,forest=0;
  const classCounts=new Array(TILE_CLASS_LABELS.length).fill(0);
  const n=PATCH_SEGMENTS;
  const floor=(height:number,s:SurfaceSample)=>{
    const f=(s as SurfaceSample&{floorM?:number}).floorM;
    if(typeof f!=='number'||!Number.isFinite(f))return;
    floorSeen=true;floorMin=Math.min(floorMin,f);floorMax=Math.max(floorMax,f);windowMax=Math.max(windowMax,height-f);
  };
  const summit=(u:number,v:number,height:number)=>{if(height>maxH){maxH=height;peakU=u/n;peakV=v/n;}};
  return {
    vertex(x:number,y:number,height:number,s:SurfaceSample,c:ClassifiedVertex){
      count++;minH=Math.min(minH,height);summit(x,y,height);
      floor(s.groundHeightM,s);
      if(c.ocean)ocean++;
      const id=TILE_CLASS_LABELS.indexOf(c.name);if(id>=0)classCounts[id]++;
      if(!c.ocean&&SNOW_LABELS.includes(c.name)){snow++;snowline=Math.min(snowline,s.groundHeightM);}
      if(c.forestPotential){forest++;treeline=Math.max(treeline,s.groundHeightM);}
    },
    centre(u:number,v:number,height:number,s:SurfaceSample){summit(u,v,height);floor(s.groundHeightM,s);},
    encode(corrected:boolean){
      const bytes=new Uint8Array(TILE_META_BYTES),view=new DataView(bytes.buffer);
      const f32=[minH,maxH,floorSeen?floorMin:NaN,floorSeen?floorMax:NaN,floorSeen?windowMax:NaN,
        Number.isFinite(snowline)?snowline:NaN,Number.isFinite(treeline)?treeline:NaN,peakU,peakV,waterLevelM];
      f32.forEach((value,i)=>view.setFloat32(i*4,value,true));
      [count,ocean,snow,forest].forEach((value,i)=>view.setUint16(40+i*2,value,true));
      // Top four classes by count; ties keep the lower label id (fixed order).
      const top=classCounts.map((value,id)=>({value,id})).filter(e=>e.value>0).sort((a,b)=>b.value-a.value||a.id-b.id).slice(0,4);
      for(let i=0;i<4;i++){view.setUint16(48+i*2,top[i]?.value??0,true);view.setUint8(56+i,top[i]?.id??255);}
      view.setUint8(60,TILE_META_VERSION);view.setUint8(61,(floorSeen?1:0)|(corrected?2:0));
      return bytes;
    },
  };
}
export type TileMetadata={
  version:number;ladderVersion:string;minH:number;maxH:number;floorMin:number;floorMax:number;windowMax:number;
  snowlineM:number;treelineM:number;peakUV:[number,number];peakDir:V3;waterLevelM:number;
  latticeCount:number;oceanCount:number;snowCount:number;forestCount:number;
  oceanShare:number;snowShare:number;forestShare:number;
  classHistogram:{name:string;count:number;share:number}[];floorPresent:boolean;peakCorrected:boolean;
};
/** Decodes buildTile's `meta` bytes. Shares are exact count / latticeCount. */
export function readTileMetadata(tile:Tile,meta:Uint8Array):TileMetadata{
  if(meta.byteLength!==TILE_META_BYTES)throw new Error(`tile metadata must be ${TILE_META_BYTES} bytes`);
  const view=new DataView(meta.buffer,meta.byteOffset,meta.byteLength),f=(i:number)=>view.getFloat32(i*4,true),u16=(o:number)=>view.getUint16(o,true);
  const latticeCount=u16(40),oceanCount=u16(42),snowCount=u16(44),forestCount=u16(46),flags=view.getUint8(61);
  const classHistogram:TileMetadata['classHistogram']=[];
  for(let i=0;i<4;i++){const id=view.getUint8(56+i),c=u16(48+i*2);if(id!==255&&c>0)classHistogram.push({name:TILE_CLASS_LABELS[id],count:c,share:c/latticeCount});}
  const peakUV:[number,number]=[f(7),f(8)];
  return {version:view.getUint8(60),ladderVersion:LOD_LADDER_VERSION,minH:f(0),maxH:f(1),floorMin:f(2),floorMax:f(3),windowMax:f(4),
    snowlineM:f(5),treelineM:f(6),peakUV,peakDir:tileDirection(tile,peakUV[0],peakUV[1]),waterLevelM:f(9),
    latticeCount,oceanCount,snowCount,forestCount,oceanShare:oceanCount/latticeCount,snowShare:snowCount/latticeCount,forestShare:forestCount/latticeCount,
    classHistogram,floorPresent:!!(flags&1),peakCorrected:!!(flags&2)};
}
