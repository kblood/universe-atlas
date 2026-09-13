import type {RiverChannel,RiverRegion,RiverSample} from './river-types.ts';
import {riverPhysicalField} from './river-physical-field.ts';

type Hit={channel:RiverChannel;segment:number;t:number;distance:number;x:number;z:number};
export type RiverFeature={distanceM:number;wetRadiusM:number;waterM:number;depthM:number;kind:'river'|'lake'};
type Index={cells:Map<string,[RiverChannel,number][]>;cell:number};
const indexes=new WeakMap<RiverRegion,Index>();
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
const key=(x:number,z:number)=>x+','+z;
function index(region:RiverRegion){let cached=indexes.get(region);if(cached)return cached;const cell=1200,cells=new Map<string,[RiverChannel,number][]>();for(const c of region.channels)for(let i=0;i<c.points.length-1;i++){const a=c.points[i],b=c.points[i+1],pad=Math.max(a.widthM,b.widthM)/2+3000;for(let z=Math.floor((Math.min(a.z,b.z)-pad)/cell);z<=Math.floor((Math.max(a.z,b.z)+pad)/cell);z++)for(let x=Math.floor((Math.min(a.x,b.x)-pad)/cell);x<=Math.floor((Math.max(a.x,b.x)+pad)/cell);x++){const k=key(x,z),v=cells.get(k)||[];v.push([c,i]);cells.set(k,v);}}cached={cells,cell};indexes.set(region,cached);return cached;}
function hit(region:RiverRegion,x:number,z:number):Hit|null{const ix=index(region),cellX=Math.floor(x/ix.cell),cellZ=Math.floor(z/ix.cell);let best:Hit|null=null,best2=Infinity;
  // Segments are inserted into every cell touched by their full 3 km influence,
  // so the containing cell is complete. Avoid nine overlapping-cell scans.
  for(const [channel,segment] of ix.cells.get(key(cellX,cellZ))||[]){const a=channel.points[segment],b=channel.points[segment+1],dx=b.x-a.x,dz=b.z-a.z,l=dx*dx+dz*dz,t=l?clamp(((x-a.x)*dx+(z-a.z)*dz)/l,0,1):0,px=a.x+dx*t,pz=a.z+dz*t,d2=(x-px)*(x-px)+(z-pz)*(z-pz),tie=d2===best2&&best&&(channel.id<best.channel.id||(channel.id===best.channel.id&&segment<best.segment));if(d2<best2||tie){best2=d2;best={channel,segment,t,distance:0,x:px,z:pz};}}
  if(best)best.distance=Math.sqrt(best2);return best;}
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
const smoothstep=(t:number)=>{t=clamp(t,0,1);return t*t*(3-2*t);};
function coordinates(region:RiverRegion,d:[number,number,number]):[number,number]|null{
  const projection=d[0]*region.origin[0]+d[1]*region.origin[1]+d[2]*region.origin[2];
  if(projection<=.5)return null;
  const scale=region.radiusM/projection,px=(d[0]*region.east[0]+d[1]*region.east[1]+d[2]*region.east[2])*scale,pz=(d[0]*region.north[0]+d[1]*region.north[1]+d[2]*region.north[2])*scale;
  return [px,pz];
}
/** Indexed nearest wet feature query shared by bounded display landforms. */
export function riverFeatureAt(region:RiverRegion,d:[number,number,number]):RiverFeature|null{
  const q=coordinates(region,d);if(!q)return null;const [px,pz]=q;
  if(px<region.boundsM[0]-3000||px>region.boundsM[2]+3000||pz<region.boundsM[1]-3000||pz>region.boundsM[3]+3000)return null;
  const ix=index(region),cellX=Math.floor(px/ix.cell),cellZ=Math.floor(pz/ix.cell);let bestOutward=Infinity,bestDistance=0,bestRadius=0,bestWater=0,bestDepth=0,bestKind:'river'|'lake'='river',bestId='',bestSegment=-1,found=false;
  const choose=(distance:number,radius:number,water:number,depth:number,kind:'river'|'lake',id:string,segment:number)=>{const outward=Math.max(0,distance-radius);let replace=outward<bestOutward;if(!replace&&outward===bestOutward&&found){
    // Only exact geometric ties need an ID comparison; avoid constructing a
    // candidate string in the ordinary indexed-hot-path case.
    const candidateKey=segment<0?id:id+'/'+segment,currentKey=bestSegment<0?bestId:bestId+'/'+bestSegment;replace=candidateKey<currentKey;
  }if(replace||!found){found=true;bestOutward=outward;bestDistance=distance;bestRadius=radius;bestWater=water;bestDepth=depth;bestKind=kind;bestId=id;bestSegment=segment;}};
  // Use wet-edge distance, not nearest centreline. Unequal-width parallel
  // channels otherwise switch the dry landform at a discontinuous bisector.
  for(const [channel,segment] of ix.cells.get(key(cellX,cellZ))||[]){const a=channel.points[segment],b=channel.points[segment+1],dx=b.x-a.x,dz=b.z-a.z,l=dx*dx+dz*dz,t=l?clamp(((px-a.x)*dx+(pz-a.z)*dz)/l,0,1):0,qx=a.x+dx*t,qz=a.z+dz*t;choose(Math.hypot(px-qx,pz-qz),lerp(a.widthM,b.widthM,t)/2,lerp(a.waterM,b.waterM,t),lerp(a.depthM,b.depthM,t),'river',channel.id,segment);}
  for(const l of region.lakes){const ca=Math.cos(l.angle),sa=Math.sin(l.angle),u=((px-l.x)*ca+(pz-l.z)*sa)/l.radiusXM,v=(-(px-l.x)*sa+(pz-l.z)*ca)/l.radiusZM,edge=Math.hypot(u,v),radius=Math.min(l.radiusXM,l.radiusZM);choose(edge*radius,radius,l.waterM,l.depthM,'lake',l.id,-1);}
  return found?{distanceM:bestDistance,wetRadiusM:bestRadius,waterM:bestWater,depthM:bestDepth,kind:bestKind}:null;
}
/** Conservative coarse-grid bed envelope. Every indexed segment or lake whose
 * wet footprint reaches this vertex is considered; the minimum endpoint bed
 * is safe for a linearly profiled ribbon, including channel junctions. */
export function conservativeRiverBedM(region:RiverRegion,d:[number,number,number],footprintM:number,baseHeightM?:number):number|null{
  const q=coordinates(region,d);if(!q)return null;const [px,pz]=q;
  const support=baseHeightM===undefined?footprintM:Math.min(3000,footprintM*2);
  if(px<region.boundsM[0]-support||px>region.boundsM[2]+support||pz<region.boundsM[1]-support||pz>region.boundsM[3]+support)return null;
  const ix=index(region),cellX=Math.floor(px/ix.cell),cellZ=Math.floor(pz/ix.cell);let bed:number|null=null;
  // index() inserts each segment into every cell inside its 3 km halo. The
  // tile envelope clamps footprintM to 2.8 km, so this one cell contains every
  // potentially overlapping segment without a global channel scan.
  for(const [channel,segment] of ix.cells.get(key(cellX,cellZ))||[]){
    const a=channel.points[segment],b=channel.points[segment+1],dx=b.x-a.x,dz=b.z-a.z,l=dx*dx+dz*dz,t=l?clamp(((px-a.x)*dx+(pz-a.z)*dz)/l,0,1):0,qx=a.x+dx*t,qz=a.z+dz*t,distance=Math.hypot(px-qx,pz-qz),radius=Math.max(a.widthM,b.widthM)/2;
    const outside=Math.max(0,distance-radius);if(outside>support)continue;
    const floor=Math.min(a.waterM-a.depthM,b.waterM-b.depthM),fade=baseHeightM===undefined||outside<=footprintM?1:(()=>{const t=clamp((outside-footprintM)/Math.max(1e-9,support-footprintM),0,1);return 1-t*t*(3-2*t);})();
    bed=Math.min(bed??Infinity,baseHeightM===undefined?floor:baseHeightM+(floor-baseHeightM)*fade);
  }
  for(const lake of region.lakes){
    const ca=Math.cos(lake.angle),sa=Math.sin(lake.angle),u=(px-lake.x)*ca+(pz-lake.z)*sa,v=-(px-lake.x)*sa+(pz-lake.z)*ca,edge=Math.hypot(u/lake.radiusXM,v/lake.radiusZM),outside=Math.max(0,(edge-1)*Math.min(lake.radiusXM,lake.radiusZM));
    // This is a conservative lower bound on ellipse distance: the normalized
    // ellipse norm is 1/rMin-Lipschitz. It avoids a max-radius circular moat
    // along the short axis while retaining every potentially overlapping lake.
    if(outside>support)continue;
    const floor=lake.waterM-lake.depthM,fade=baseHeightM===undefined||outside<=footprintM?1:(()=>{const t=clamp((outside-footprintM)/Math.max(1e-9,support-footprintM),0,1);return 1-t*t*(3-2*t);})();
    bed=Math.min(bed??Infinity,baseHeightM===undefined?floor:baseHeightM+(floor-baseHeightM)*fade);
  }
  return bed;
}
/** Original river-region-1 field. Region construction keeps using this exact
 * sampler so existing generated region exports, site heights and addresses do
 * not change when a render-query correction is introduced. */
export function sampleLegacyRiverRegion(region:RiverRegion,d:[number,number,number],baseHeightM:number):RiverSample{
  const x=d[0]*region.east[0]+d[1]*region.east[1]+d[2]*region.east[2],z=d[0]*region.north[0]+d[1]*region.north[1]+d[2]*region.north[2];
  // Coordinates above are tangent-linear; scale corrects the small gnomonic projection.
  const projection=d[0]*region.origin[0]+d[1]*region.origin[1]+d[2]*region.origin[2];
  // The tangent chart has no meaningful far-side coordinate. Reject it before
  // the denominator clamp can alias the antipode onto the river mouth.
  if(projection<=.5)return {rockHeightM:baseHeightM,waterLevelM:null,wet:false,bank:0,channelId:null,waterKind:null,flow:[0,0],influence:0};
  const scale=region.radiusM/projection,px=x*scale,pz=z*scale;
  const outside=px<region.boundsM[0]-3000||px>region.boundsM[2]+3000||pz<region.boundsM[1]-3000||pz>region.boundsM[3]+3000;
  if(outside)return {rockHeightM:baseHeightM,waterLevelM:null,wet:false,bank:0,channelId:null,waterKind:null,flow:[0,0],influence:0};
  let lakeHit:null|{water:number;depth:number;edge:number;radius:number;id:string}=null;for(const l of region.lakes){const ca=Math.cos(l.angle),sa=Math.sin(l.angle),u=((px-l.x)*ca+(pz-l.z)*sa)/l.radiusXM,v=(-(px-l.x)*sa+(pz-l.z)*ca)/l.radiusZM,r=Math.hypot(u,v),radius=Math.min(l.radiusXM,l.radiusZM);if(r<=1+3000/radius&&(!lakeHit||r<lakeHit.edge))lakeHit={water:l.waterM,depth:l.depthM,edge:r,radius,id:l.id};}
  const h=hit(region,px,pz);let water:number|null=null,depth=0,dist=Infinity,width=0,id:string|null=null,flow:[number,number]=[0,0],kind:RiverSample['waterKind']=null;
  if(h){const a=h.channel.points[h.segment],b=h.channel.points[h.segment+1];water=lerp(a.waterM,b.waterM,h.t);depth=lerp(a.depthM,b.depthM,h.t);width=lerp(a.widthM,b.widthM,h.t)/2;dist=h.distance;id=h.channel.id;flow=[b.x-a.x,b.z-a.z];const n=Math.hypot(...flow);flow=n?[flow[0]/n,flow[1]/n]:[0,0];kind='river';}
  // Lake owns its full bowl and bank corridor. This prevents an overlapping
  // main-channel bank from replacing the ellipse at the shoreline.
  const lakeCorridor=lakeHit?clamp(Math.max(100,Math.abs(baseHeightM-lakeHit.water)*4),100,3000):0;
  const lakeActive=!!lakeHit&&(lakeHit.edge<=1||(lakeHit.edge-1)*lakeHit.radius<lakeCorridor);
  if(lakeActive&&(!h||lakeHit!.edge<=1||h.distance>Math.max(h.channel.points[h.segment].widthM,h.channel.points[h.segment+1].widthM)/2+3000)){water=lakeHit!.water;depth=lakeHit!.depth;dist=lakeHit!.edge; width=1;id=lakeHit!.id;flow=[0,0];kind='lake';}
  if(water===null)return {rockHeightM:baseHeightM,waterLevelM:null,wet:false,bank:0,channelId:null,waterKind:null,flow:[0,0],influence:0};
  const wet=kind==='lake'?dist<=1:dist<=width,edge=kind==='lake'?dist:dist/Math.max(width,.01);
  // A parabolic bowl reaches the water exactly at the wet boundary. Beyond it,
  // a 5-depth bank corridor starts at that same elevation and smoothly returns
  // to the baseline, avoiding a dry below-water trench or a hard shoreline.
  const corridor=clamp(Math.max(100,Math.abs(baseHeightM-water)*4),100,3000),outward=kind==='lake'?(edge-1)*(lakeHit?.radius||1):dist-Math.max(width,.01);
  const bank=wet?1:clamp(1-outward/corridor,0,1),influence=wet?1:bank;
  const bowl=water-depth*Math.max(0,1-edge*edge);
  const smooth=bank*bank*(3-2*bank),rock=wet?bowl:water+(baseHeightM-water)*(1-smooth);
  return {rockHeightM:rock,waterLevelM:wet?water:null,wet,bank,channelId:id,waterKind:wet?kind:null,flow,influence};
}

const emptySample=(baseHeightM:number):RiverSample=>({rockHeightM:baseHeightM,waterLevelM:null,wet:false,bank:0,channelId:null,waterKind:null,flow:[0,0],influence:0});
/** Final canonical river mesh query. Region construction deliberately keeps
 * using sampleLegacyRiverRegion; this only changes runtime terrain ownership. */
export function samplePhysicalRiverRegion(region:RiverRegion,d:[number,number,number],baseHeightM:number):RiverSample{
  const q=coordinates(region,d);if(!q)return emptySample(baseHeightM);const [px,pz]=q;
  if(px<region.boundsM[0]-3000||px>region.boundsM[2]+3000||pz<region.boundsM[1]-3000||pz>region.boundsM[3]+3000)return emptySample(baseHeightM);
  const field=riverPhysicalField(region),surface=field.surface;
  if(field.rejected||!surface.indices.length)return sampleLegacyRiverRegion(region,d,baseHeightM);
  const wet=surface.query(px,pz);
  if(wet)return {rockHeightM:wet.waterM-wet.depthM,waterLevelM:wet.waterM,wet:true,bank:1,channelId:wet.sourceId,waterKind:'river',flow:wet.flow,influence:1};
  const nearest=field.bank?.query(px,pz,3000);if(!nearest)return emptySample(baseHeightM);
  const corridor=clamp(Math.max(100,Math.abs(baseHeightM-nearest.waterM)*4),100,3000),bank=clamp(1-nearest.distanceM/corridor,0,1);
  if(!bank)return emptySample(baseHeightM);
  const triangle=nearest.triangleIndex,sourceIndex=surface.triangleSourceIds[triangle],source=surface.sources[sourceIndex],ia=surface.indices[triangle*3],ib=surface.indices[triangle*3+1],ic=surface.indices[triangle*3+2],[u,v,w]=nearest.barycentric,fx=surface.flow[ia*2]*u+surface.flow[ib*2]*v+surface.flow[ic*2]*w,fz=surface.flow[ia*2+1]*u+surface.flow[ib*2+1]*v+surface.flow[ic*2+1]*w,n=Math.hypot(fx,fz)||1,rock=lerp(nearest.waterM-nearest.depthM,baseHeightM,smoothstep(nearest.distanceM/corridor));
  return {rockHeightM:rock,waterLevelM:null,wet:false,bank,channelId:source?.channelId||null,waterKind:null,flow:[fx/n,fz/n],influence:bank};
}

function canonicalRiverEdgeDistance(region:RiverRegion,x:number,z:number){const field=riverPhysicalField(region);if(field.rejected||!field.surface.indices.length)return Infinity;return field.bank?.query(x,z,3000)?.distanceM??Infinity;}

/**
 * Surface-query revision for lake shores. The legacy selector gives a nearby
 * river priority immediately outside an ellipse, even when its bank is many
 * metres above the lake. A lake owns its bowl and a finite dry collar; within
 * that collar its bank blends into the legacy river/baseline field. This pins
 * both sides of the wet boundary to the lake level without extending water or
 * regional influence beyond the existing bounded corridor.
 */
export function sampleRiverRegion(region:RiverRegion,d:[number,number,number],baseHeightM:number):RiverSample{
  const fallback=samplePhysicalRiverRegion(region,d,baseHeightM);
  const x=d[0]*region.east[0]+d[1]*region.east[1]+d[2]*region.east[2],z=d[0]*region.north[0]+d[1]*region.north[1]+d[2]*region.north[2],projection=d[0]*region.origin[0]+d[1]*region.origin[1]+d[2]*region.origin[2];
  if(projection<=.5)return fallback;
  const scale=region.radiusM/projection,px=x*scale,pz=z*scale;
  let lake:null|{water:number;depth:number;edge:number;radius:number;id:string}=null;
  for(const l of region.lakes){
    const ca=Math.cos(l.angle),sa=Math.sin(l.angle),u=((px-l.x)*ca+(pz-l.z)*sa)/l.radiusXM,v=(-(px-l.x)*sa+(pz-l.z)*ca)/l.radiusZM,edge=Math.hypot(u,v),radius=Math.min(l.radiusXM,l.radiusZM);
    if(edge<=1+3000/radius&&(!lake||edge<lake.edge))lake={water:l.waterM,depth:l.depthM,edge,radius,id:l.id};
  }
  if(!lake)return fallback;
  const lakeCorridor=clamp(Math.max(100,Math.abs(baseHeightM-lake.water)*4),100,3000),outward=Math.max(0,(lake.edge-1)*lake.radius);
  const wet=lake.edge<=1;
  if(wet){
    const bowl=lake.water-lake.depth*Math.max(0,1-lake.edge*lake.edge);
    return {rockHeightM:bowl,waterLevelM:lake.water,wet:true,bank:1,channelId:lake.id,waterKind:'lake',flow:[0,0],influence:1};
  }
  // A dry lake collar must never cover an already-wet channel outside the
  // ellipse. That channel owns its physical water and retains its own bank.
  if(fallback.wet)return fallback;
  // A nearby river is a second boundary condition. Give the lake full weight
  // at its ellipse, taper it to zero at that river's wet edge, and use smooth
  // endpoint slopes. This prevents a lake collar from lifting a dry riverbank
  // while still avoiding the old lake-edge handoff to a distant river bank.
  const riverEdge=canonicalRiverEdgeDistance(region,px,pz);
  if(outward>=lakeCorridor)return fallback;
  const ratio=Number.isFinite(riverEdge)?outward/Math.max(1e-9,outward+riverEdge):0,riverConstraint=1-ratio*ratio*(3-2*ratio);
  const bank=clamp(1-outward/lakeCorridor,0,1)*riverConstraint,smooth=bank*bank*(3-2*bank),lakeRock=lake.water+(baseHeightM-lake.water)*(1-smooth);
  // Both the lake shape and blend have zero slope at the shoreline. The collar
  // therefore meets the water without a step, then hands off continuously to
  // any nearby dry river bank or the untouched baseline.
  const blend=smooth;
  const useLake=bank>=fallback.bank;
  return {rockHeightM:lerp(fallback.rockHeightM,lakeRock,blend),waterLevelM:null,wet:false,bank:Math.max(bank,fallback.bank),channelId:useLake?lake.id:fallback.channelId,waterKind:null,flow:useLake?[0,0]:fallback.flow,influence:Math.max(bank,fallback.influence)};
}
