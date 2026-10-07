/** Canonical surface rocks and boulders: stable random-access placement.
 *
 * Identity is (body seed, body id, ROCK_FIELD_VERSION, tier, canonical cubemap
 * surface cell, slot). Nothing here reads the camera, visit order, date or
 * biosphere. Rock families are the body's existing biosphere-model.ts
 * `RockFamily` records, used read-only; this module never creates a second
 * rock catalogue and never touches plant, fauna or tree selection.
 *
 * Presence depends only on immutable geology (terrain height, slope and the
 * surface-biomes material weights) plus the dated ocean level supplied by the
 * caller. Life is irrelevant: barren and living worlds use the same rules.
 * Rocks are visual only: there is no collision contract (see diagnostics). */
import type {V3} from './catalog.ts';
import type {RockFamily} from './biosphere-model.ts';
import type {SurfaceCell} from './surface-cell.ts';

export const ROCK_FIELD_VERSION='atlas-rock-field-1';
export type RockForm=RockFamily['form'];
export const ROCK_FORMS:readonly RockForm[]=Object.freeze(['angular','layered','rounded']);
/** Shape variants per family. Bounded so shared geometry stays small. */
export const ROCK_VARIANTS=3;
export type RockTierId='scatter'|'boulder'|'outcrop';
/** `sizeMin/sizeMax` multiply the family's physical `scaleM` (diameter, m).
 * `presence` is the per-slot upper bound at the cube-face centre; cell area
 * compensation keeps density per square metre uniform across the cube. */
export type RockTier={readonly id:RockTierId;readonly cellSizeM:number;readonly slots:number;readonly presence:number;
  readonly rangeM:number;readonly marginM:number;readonly sizeMin:number;readonly sizeMax:number;
  readonly rescatterM:number;readonly residentCap:number};
export const ROCK_TIERS:readonly RockTier[]=Object.freeze([
  Object.freeze({id:'scatter',cellSizeM:6,slots:3,presence:.7,rangeM:64,marginM:12,sizeMin:.12,sizeMax:.48,rescatterM:10,residentCap:3000}),
  Object.freeze({id:'boulder',cellSizeM:16,slots:1,presence:.75,rangeM:280,marginM:32,sizeMin:.55,sizeMax:1.5,rescatterM:24,residentCap:2600}),
  Object.freeze({id:'outcrop',cellSizeM:64,slots:1,presence:.6,rangeM:960,marginM:128,sizeMin:1.6,sizeMax:3.4,rescatterM:96,residentCap:2000}),
] as RockTier[]);
/** Distance/diameter ratios for LOD 0/1/2; beyond the last a rock is ~1-2 px. */
export const ROCK_LOD_RATIOS=Object.freeze([40,150,560] as const);
/** A rock centre must sit this far above the dated sea surface. */
export const ROCK_SHORE_CLEARANCE_M=.3;
/** Slopes steeper than this cannot hold a loose rock in this model. */
export const ROCK_MAX_SLOPE_DEG=58;
/** Rendering is disabled once no tier can be within range of the eye. */
export const ROCK_MAX_ALTITUDE_M=Math.max(...ROCK_TIERS.map(t=>t.rangeM));
/** Altitude gate hysteresis (transition audit F3). Rocks that are hidden turn
 * on below ROCK_MAX_ALTITUDE_M - this; rocks that are shown stay on up to
 * ROCK_MAX_ALTITUDE_M, which stays the hard exit (above it no tier can be in
 * range). The band sits below the old threshold so nothing is drawn higher
 * than before. Presentation only: placement never reads it. */
export const ROCK_ALTITUDE_HYSTERESIS_M=40;
/** LOD hysteresis (transition audit F7). A rock keeps its previous LOD while
 * its distance stays within max(ROCK_LOD_HYSTERESIS x boundary,
 * ROCK_LOD_HYSTERESIS_MIN_M) beyond either edge of that LOD's band. The
 * absolute floor keeps a +-1 m oscillation from flipping small rocks, whose
 * boundaries are only a few metres out. */
export const ROCK_LOD_HYSTERESIS=.05;
export const ROCK_LOD_HYSTERESIS_MIN_M=1.5;
/** Coverage fade at the far cuts (tier range and the last LOD ratio), as a
 * fraction of the cut distance: coverage goes 1 -> 0 by a smoothstep over the
 * last 10%, so a rock is fully dithered out where it used to pop. */
export const ROCK_RANGE_FADE=.1;

/** Minimal dated gate the renderer receives from main.ts. `surfaceSolid` is
 * the planet lifecycle's solid stage; it does not depend on any biosphere. */
export type RockGate={surfaceSolid:boolean;families:readonly RockFamily[]};
export type RockSample={groundHeightM:number;ocean?:boolean;wet?:boolean};
export type RockSampler=(direction:V3)=>RockSample;
export type RockClassification={weights:ArrayLike<number>;slopeDeg:number;moisture:number;ocean:boolean};
export type RockClassifier=(direction:V3,heightM:number,upDot:number)=>RockClassification;
export type RockBodyKey={seed:string;id:string;water:number};

/** One canonical rock. Directions are unit vectors; heights are metres. */
export type RockInstance={
  id:string;tier:RockTierId;cellId:string;slot:number;
  familyId:string;form:RockForm;variant:number;
  direction:V3;groundHeightM:number;up:V3;yaw:number;
  /** Physical horizontal diameter (m) before aspect. */
  diameterM:number;aspect:V3;
  /** Metres moved along `up` into the ground (partial embedding). */
  sinkM:number;
  /** Per-instance albedo multiplier around the family colour. */
  tint:V3;
};

// --- deterministic hashing -------------------------------------------------
function fnv(text:string):number{let h=2166136261>>>0;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function finalize(h:number):number{h^=h>>>16;h=Math.imul(h,0x7feb352d);h^=h>>>15;h=Math.imul(h,0x846ca68b);return (h^(h>>>16))>>>0;}
/** Independent uniform channel in [0,1) derived from a base key hash. */
function channel(base:number,index:number):number{return finalize((base^Math.imul(index+1,0x9e3779b9))>>>0)/4294967296;}
export function rockKey(body:RockBodyKey,tier:RockTierId,cellId:string,slot:number):string{
  return `${ROCK_FIELD_VERSION}|${body.seed}|${body.id}|${tier}|${cellId}|${slot}`;
}
const clamp01=(x:number)=>Math.max(0,Math.min(1,x));

// --- canonical cell geometry ----------------------------------------------
const FACES=['x+','x-','y+','y-','z+','z-'] as const;
type Face=typeof FACES[number];
/** Inverse of surface-cell.ts's projection for a face and cube (u,v). */
export function faceDirection(face:Face,u:number,v:number):V3{
  const raw:V3=face==='x+'?[1,v,u]:face==='x-'?[-1,v,-u]:face==='y+'?[u,1,v]:face==='y-'?[u,-1,-v]:face==='z+'?[u,v,1]:[-u,v,-1];
  const l=Math.hypot(raw[0],raw[1],raw[2]);return [raw[0]/l,raw[1]/l,raw[2]/l];
}
export function parseCellId(cellId:string):{face:Face;ix:number;iy:number}{
  const [face,x,y]=cellId.split('/');
  if(!(FACES as readonly string[]).includes(face)||!/^\d+$/.test(x??'')||!/^\d+$/.test(y??''))throw new RangeError(`Invalid surface cell id: ${cellId}`);
  return {face:face as Face,ix:Number(x),iy:Number(y)};
}
/** Cube-cell count per face edge, identical to surface-cell.ts. */
export function cellsPerFace(radiusM:number,cellSizeM:number){return Math.max(1,Math.ceil(2*radiusM/cellSizeM));}
/** Deterministic point strictly inside a canonical cell, plus the cell's
 * solid-angle factor relative to a face-centre cell (1 at the centre). */
export function pointInCell(cellId:string,radiusM:number,cellSizeM:number,a:number,b:number){
  const {face,ix,iy}=parseCellId(cellId),n=cellsPerFace(radiusM,cellSizeM),w=2/n;
  const u=(ix+.02+.96*a)*w-1,v=(iy+.02+.96*b)*w-1;
  const cu=(ix+.5)*w-1,cv=(iy+.5)*w-1,q=1+cu*cu+cv*cv;
  return {direction:faceDirection(face,u,v),areaFactor:1/(q*Math.sqrt(q))};
}
/** Tangent basis matching planet-renderer.ts's life-layer basis. */
export function tangentBasis(d:V3):{east:V3;north:V3}{
  const ref:V3=Math.abs(d[1])>.92?[1,0,0]:[0,1,0];
  let e:V3=[ref[1]*d[2]-ref[2]*d[1],ref[2]*d[0]-ref[0]*d[2],ref[0]*d[1]-ref[1]*d[0]];
  const el=Math.hypot(...e);e=[e[0]/el,e[1]/el,e[2]/el];
  const nr:V3=[d[1]*e[2]-d[2]*e[1],d[2]*e[0]-d[0]*e[2],d[0]*e[1]-d[1]*e[0]];
  return {east:e,north:nr};
}
function offsetDirection(d:V3,east:V3,north:V3,x:number,z:number,radiusM:number):V3{
  const p:V3=[d[0]+(east[0]*x+north[0]*z)/radiusM,d[1]+(east[1]*x+north[1]*z)/radiusM,d[2]+(east[2]*x+north[2]*z)/radiusM];
  const l=Math.hypot(...p);return [p[0]/l,p[1]/l,p[2]/l];
}

// --- geology suitability ---------------------------------------------------
/** Family order is by canonical id, never by array position. Unknown forms
 * are ignored rather than invented. */
export function canonicalRockFamilies(families:readonly RockFamily[]):RockFamily[]{
  return families.filter(f=>f&&typeof f.id==='string'&&(ROCK_FORMS as readonly string[]).includes(f.form))
    .slice().sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
}
export function rockFamiliesSignature(families:readonly RockFamily[]):string{
  return canonicalRockFamilies(families).map(f=>[f.id,f.form,f.color,f.scaleM,f.elongation,f.layers,f.roughness].join(':')).join(',');
}
/** How strongly the ground holds loose rock, in [0,1]. Barren (waterless)
 * ground keeps a regolith floor: impact and weathering debris everywhere. */
export function rockSuitability(c:RockClassification,barren:boolean):number{
  if(c.ocean||!(c.slopeDeg<ROCK_MAX_SLOPE_DEG))return 0;
  const w=c.weights,sand=w[0]??0,veg=w[1]??0,rock=w[2]??0,snow=w[3]??0;
  let ground=rock+sand*.28+veg*.14+snow*.1;
  if(barren)ground=Math.max(ground,.55);
  const slope=c.slopeDeg<=35?1:1-.65*clamp01((c.slopeDeg-35)/(ROCK_MAX_SLOPE_DEG-35));
  return clamp01(ground*slope);
}
/** Relative family weights for the three canonical forms at a site. */
export function rockFormWeights(c:RockClassification,barren:boolean):Record<RockForm,number>{
  const w=c.weights,sand=w[0]??0,veg=w[1]??0,rock=w[2]??0,snow=w[3]??0,s=c.slopeDeg,m=clamp01(c.moisture);
  return {
    // Frost-shattered talus and impact ejecta favour fresh fracture faces.
    angular:.4+1.6*rock+clamp01((s-15)/25)+.6*snow+(barren?.6:0),
    // Bedded slabs expose on moderate slopes and in dry country.
    layered:.35+1.2*clamp01(1-Math.abs(s-22)/18)+.6*(1-m)*(barren?.3:1),
    // Transported, weathered cobbles and erratics on gentle, sandy or wet ground.
    rounded:.4+1.4*sand+.8*veg*m+.6*clamp01((12-s)/12)+(barren?.2:0),
  };
}
export function rockLod(distanceM:number,diameterM:number,rangeM:number):0|1|2|-1{
  if(!(distanceM<=rangeM))return -1;
  const ratio=distanceM/Math.max(1e-3,diameterM);
  return ratio<ROCK_LOD_RATIOS[0]?0:ratio<ROCK_LOD_RATIOS[1]?1:ratio<ROCK_LOD_RATIOS[2]?2:-1;
}
/** Hysteresis margin (m) around an LOD boundary at `boundaryM`. */
export function rockLodHysteresisM(boundaryM:number):number{return Math.max(ROCK_LOD_HYSTERESIS*boundaryM,ROCK_LOD_HYSTERESIS_MIN_M);}
/** `rockLod` with memory (transition audit F7). `prev` is the LOD the rock
 * was last drawn at (-1: none). The range and last-ratio cuts stay exactly
 * those of `rockLod` (they are faded by `rockCoverage`, not held); between
 * LOD 0, 1 and 2 a rock keeps `prev` while its distance is inside prev's band
 * widened by `rockLodHysteresisM` at each inner boundary. With prev = -1 this
 * is `rockLod`. */
export function rockLodHysteretic(prev:number,distanceM:number,diameterM:number,rangeM:number):0|1|2|-1{
  const lod=rockLod(distanceM,diameterM,rangeM);
  if(lod<0||!(prev===0||prev===1||prev===2)||prev===lod)return lod;
  const d=Math.max(1e-3,diameterM);
  const lo=prev===0?0:ROCK_LOD_RATIOS[prev-1]!*d,hi=prev===2?Infinity:ROCK_LOD_RATIOS[prev]!*d;
  const keepLo=prev===0?-Infinity:lo-rockLodHysteresisM(lo),keepHi=prev===2?Infinity:hi+rockLodHysteresisM(hi);
  return distanceM>=keepLo&&distanceM<keepHi?prev:lod;
}
function smoothstep(edge0:number,edge1:number,x:number){const t=clamp01((x-edge0)/(edge1-edge0));return t*t*(3-2*t);}
/** Drawn coverage of a rock in [0,1] (transition audit F7): 1 inside, then a
 * smoothstep to 0 over the last ROCK_RANGE_FADE of the tier range and of the
 * last LOD ratio. It is the product of two non-increasing terms, so it never
 * rises with distance, and it is 0 wherever `rockLod` is -1. */
export function rockCoverage(distanceM:number,diameterM:number,rangeM:number):number{
  if(!(distanceM<=rangeM))return 0;
  const lastM=ROCK_LOD_RATIOS[2]*Math.max(1e-3,diameterM);
  if(!(distanceM<lastM))return 0;
  return (1-smoothstep(rangeM*(1-ROCK_RANGE_FADE),rangeM,distanceM))*(1-smoothstep(lastM*(1-ROCK_RANGE_FADE),lastM,distanceM));
}

export type RockCellContext={
  body:RockBodyKey;radiusM:number;families:readonly RockFamily[];
  sample:RockSampler;classify:RockClassifier;waterLevelM:number;
};
export type RockCellResult={rocks:RockInstance[];samples:number};
/** Every rock owned by one canonical cell. Pure: the same inputs always give
 * the same list regardless of call order, camera, or neighbouring cells. */
export function rocksForCell(ctx:RockCellContext,tier:RockTier,cellId:string):RockCellResult{
  const families=canonicalRockFamilies(ctx.families),rocks:RockInstance[]=[];let samples=0;
  if(!families.length)return {rocks,samples};
  const barren=!(ctx.body.water>0);
  for(let slot=0;slot<tier.slots;slot++){
    const id=rockKey(ctx.body,tier.id,cellId,slot),base=fnv(id);
    const at=pointInCell(cellId,ctx.radiusM,tier.cellSizeM,channel(base,0),channel(base,1));
    const gate=channel(base,2),pMax=tier.presence*at.areaFactor;
    // Cheap rejection before any terrain work; the same draw is reused below.
    if(gate>=pMax)continue;
    const sizeRoll=channel(base,3),d=at.direction,{east,north}=tangentBasis(d);
    const s0=ctx.sample(d);samples++;
    if(s0.ocean||s0.wet||!Number.isFinite(s0.groundHeightM))continue;
    // Waterless bodies have no sea surface; their datum may lie above ground.
    if(!barren&&!(s0.groundHeightM>=ctx.waterLevelM+ROCK_SHORE_CLEARANCE_M))continue;
    // Family scale is only known after selection; sample slope at a nominal
    // footprint that is fixed per tier, so family choice cannot move it.
    const step=Math.max(.5,Math.min(6,tier.cellSizeM*.12));
    const hE=ctx.sample(offsetDirection(d,east,north,step,0,ctx.radiusM)).groundHeightM;
    const hN=ctx.sample(offsetDirection(d,east,north,0,step,ctx.radiusM)).groundHeightM;samples+=2;
    const gx=(hE-s0.groundHeightM)/step,gz=(hN-s0.groundHeightM)/step,upDot=1/Math.sqrt(1+gx*gx+gz*gz);
    const c=ctx.classify(d,s0.groundHeightM,upDot);
    if(c.ocean)continue;
    const suit=rockSuitability(c,barren);
    if(!(gate<pMax*suit))continue;
    const weights=rockFormWeights(c,barren);
    let total=0;for(const f of families)total+=weights[f.form];
    let pick=channel(base,4)*total,family=families[families.length-1]!;
    for(const f of families){pick-=weights[f.form];if(pick<0){family=f;break;}}
    const scale=Math.max(.05,Math.min(5,family.scaleM));
    const diameterM=scale*(tier.sizeMin+(tier.sizeMax-tier.sizeMin)*sizeRoll*sizeRoll);
    const variant=Math.min(ROCK_VARIANTS-1,Math.floor(channel(base,5)*ROCK_VARIANTS));
    // Up blends the radial direction toward the local terrain normal. Layered
    // slabs follow the slope most closely (bedding), rounded ones least.
    const follow=family.form==='layered'?.9:family.form==='angular'?.75:.65;
    const nx=-gx*upDot,nz=-gz*upDot;
    const tiltA=(channel(base,6)-.5)*(family.form==='angular'?.26:.12),tiltB=(channel(base,7)-.5)*(family.form==='angular'?.26:.12);
    const tx=nx*follow+tiltA,tz=nz*follow+tiltB;
    let up:V3=[d[0]+east[0]*tx+north[0]*tz,d[1]+east[1]*tx+north[1]*tz,d[2]+east[2]*tx+north[2]*tz];
    const ul=Math.hypot(...up);up=[up[0]/ul,up[1]/ul,up[2]/ul];
    const elong=Math.max(.35,Math.min(2.7,family.elongation));
    const jx=.9+.2*channel(base,8),jy=.85+.3*channel(base,9),jz=.9+.2*channel(base,10);
    const aspect:V3=[Math.sqrt(elong)*jx,jy,jz/Math.sqrt(elong)];
    // Partial embedding: a form fraction of height plus the downhill gap the
    // remaining (un-followed) slope would expose under the rock's half-width.
    const heightFrac=family.form==='layered'?.52:family.form==='angular'?.56:.48;
    const halfWidth=.5*diameterM*Math.max(aspect[0],aspect[2]);
    const slopeGap=halfWidth*Math.tan(Math.acos(Math.min(1,upDot)))*(1-follow);
    const sinkFrac=(family.form==='rounded'?.26:family.form==='angular'?.18:.12)+.1*channel(base,11);
    const sinkM=diameterM*heightFrac*jy*sinkFrac+slopeGap;
    const bright=.84+.26*channel(base,12),hue=(channel(base,13)-.5)*.06;
    rocks.push({id,tier:tier.id,cellId,slot,familyId:family.id,form:family.form,variant,
      direction:d,groundHeightM:s0.groundHeightM,up,yaw:channel(base,14)*Math.PI*2,
      diameterM,aspect,sinkM,tint:[bright*(1+hue),bright,bright*(1-hue)]});
  }
  return {rocks,samples};
}

/** The exact canonical cell set of surface-cell.ts's `surfaceCellsWithin`
 * (same conservative face bounds and exact chord filter, same ids and
 * nearest-first order with id tie-break), with distances computed once
 * instead of inside the sort comparator: that comparator dominated rescatter
 * cost for thousands of rock cells. Tests assert set and order equality. */
export function canonicalCellsWithin(direction:V3,radiusM:number,rangeM:number,cellSizeM:number):SurfaceCell[]{
  if(!(radiusM>0)||!Number.isFinite(radiusM)||!(cellSizeM>0)||!Number.isFinite(cellSizeM)||rangeM<0||!Number.isFinite(rangeM))throw new RangeError('Invalid surface cell region');
  const length=Math.hypot(...direction);if(!length||!Number.isFinite(length))throw new RangeError('Invalid surface direction');
  const x=direction[0]/length,y=direction[1]/length,z=direction[2]/length,n=cellsPerFace(radiusM,cellSizeM);
  const angular=Math.min(2,rangeM/radiusM),out:{cell:SurfaceCell;distance:number}[]=[];
  const faces=[{id:'x+',axis:x,u:z,v:y},{id:'x-',axis:-x,u:-z,v:y},{id:'y+',axis:y,u:x,v:z},{id:'y-',axis:-y,u:x,v:-z},{id:'z+',axis:z,u:x,v:y},{id:'z-',axis:-z,u:-x,v:y}] as const;
  for(const f of faces){
    if(f.axis<1/Math.sqrt(3)-angular)continue;
    const axisMin=Math.max(.01,f.axis-angular),span=angular*(1/axisMin+Math.max(Math.abs(f.u),Math.abs(f.v))/(axisMin*axisMin));
    const u=f.u/f.axis,v=f.v/f.axis;
    const loX=Math.max(0,Math.floor((u-span+1)*n/2)),hiX=Math.min(n-1,Math.floor((u+span+1)*n/2));
    const loY=Math.max(0,Math.floor((v-span+1)*n/2)),hiY=Math.min(n-1,Math.floor((v+span+1)*n/2));
    for(let iy=loY;iy<=hiY;iy++)for(let ix=loX;ix<=hiX;ix++){
      const a=(ix+.5)*2/n-1,b=(iy+.5)*2/n-1;
      const raw:V3=f.id==='x+'?[1,b,a]:f.id==='x-'?[-1,b,-a]:f.id==='y+'?[a,1,b]:f.id==='y-'?[a,-1,-b]:f.id==='z+'?[a,b,1]:[-a,b,-1];
      const l=Math.hypot(...raw),d:V3=[raw[0]/l,raw[1]/l,raw[2]/l];
      const distance=Math.hypot(d[0]-x,d[1]-y,d[2]-z);
      if(distance>angular+1e-14)continue;
      out.push({cell:{id:`${f.id}/${ix}/${iy}`,direction:d},distance});
    }
  }
  out.sort((a,b)=>a.distance-b.distance||a.cell.id.localeCompare(b.cell.id));
  return out.map(o=>o.cell);
}
/** Canonical cells for a tier around a ground focus, nearest first. The
 * result is truncated to the tier's resident cap (reported by callers). */
export function rockCellsNear(direction:V3,radiusM:number,tier:RockTier,rangeM=tier.rangeM+tier.marginM):{cells:SurfaceCell[];truncated:number}{
  const all=canonicalCellsWithin(direction,radiusM,rangeM,tier.cellSizeM);
  return all.length>tier.residentCap?{cells:all.slice(0,tier.residentCap),truncated:all.length-tier.residentCap}:{cells:all,truncated:0};
}

/** Order-independent digest of a rock list, for replay/seek acceptance. */
export function rockCensusDigest(rocks:Iterable<RockInstance>):{count:number;digest:string;forms:Record<RockForm,number>}{
  const records:string[]=[],forms:Record<RockForm,number>={angular:0,layered:0,rounded:0};
  for(const r of rocks){records.push([r.id,r.familyId,r.variant,r.diameterM.toFixed(4),r.groundHeightM.toFixed(3),r.sinkM.toFixed(4)].join('|'));forms[r.form]++;}
  const text=records.sort().join('\n');
  return {count:records.length,digest:fnv(text).toString(16).padStart(8,'0')+finalize(fnv(text+'/rock')).toString(16).padStart(8,'0'),forms};
}
