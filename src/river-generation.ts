import {rng,type Body,type V3} from './catalog.ts';
import type {Catchment} from './drainage.ts';
import {baseTerrainSampler} from './terrain.ts';
import {RIVER_VERSION,type RiverChannel,type RiverLake,type RiverPoint,type RiverRegion,type RiverSite} from './river-types.ts';
import {sampleRiverRegion} from './river-sample.ts';

const dot=(a:V3,b:V3)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a:V3,b:V3):V3=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=(a:V3):V3=>{const n=Math.hypot(...a);return [a[0]/n,a[1]/n,a[2]/n];};
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;

/** Convert stable metre coordinates in a pole-safe outlet tangent frame to a sphere direction. */
export function riverDirection(region:RiverRegion,x:number,z:number):V3 {
  return norm(region.origin.map((v,i)=>v+(region.east[i]*x+region.north[i]*z)/region.radiusM) as V3);
}
export function riverCoordinates(region:RiverRegion,d:V3):[number,number] {
  // The gnomonic projection is well conditioned over this deliberately small region.
  const scale=region.radiusM/Math.max(.35,dot(d,region.origin));
  return [dot(d,region.east)*scale,dot(d,region.north)*scale];
}

const point=(x:number,z:number,waterM:number,widthM:number,depthM:number,distanceM:number):RiverPoint=>({x,z,waterM,widthM,depthM,distanceM});
const length=(p:RiverPoint[])=>p.slice(1).reduce((n,q,i)=>n+Math.hypot(q.x-p[i].x,q.z-p[i].z),0);
const channel=(id:string,name:string,points:RiverPoint[],parentId:string|null):RiverChannel=>({id,name,points,parentId});

/**
 * Builds a small physical proposal from the coarse outlet. It intentionally uses
 * terrain with hydrology removed: coarse drainage must never observe its own river.
 */
export function buildRiverRegion(body:Body,catchment:Catchment):RiverRegion {
  if(!body.water||body.type==='Gas giant')throw new Error('River region requires an ocean-bearing solid body');
  if(catchment.id.indexOf(body.id+'/')!==0)throw new Error('Catchment does not belong to body');
  const origin=norm(catchment.mouth.direction),up:V3=Math.abs(origin[1])>.92?[1,0,0]:[0,1,0];
  const east=norm(cross(up,origin)),north=norm(cross(origin,east));
  const id=catchment.id+'/'+RIVER_VERSION, random=rng(body.seed+'/'+id), baseline=baseTerrainSampler(body);
  const provisional={radiusM:body.radiusM,origin,east,north} as RiverRegion;
  let evaluations=0;const height=(x:number,z:number)=>{evaluations++;return baseline(riverDirection(provisional,x,z)).elevationM;};
  const n=49, max=32000, candidates:{a:number;reach:number;score:number}[]=[];
  // A deterministic <= 97² regional search. Each ray is subsequently refined at 100 m.
  for(let iy=0;iy<n;iy++)for(let ix=0;ix<n;ix++){
    const x=((ix/(n-1))*2-1)*max,z=((iy/(n-1))*2-1)*max;
    const reach=Math.hypot(x,z);if(reach<14000||reach>max||z<2000)continue;
    const a=Math.atan2(x,z), h=height(x,z), top=Math.min(h-9,reach*.0065);if(top<55)continue;
    let margin=Infinity;
    for(let k=0;k<=24;k++){const t=k/24, px=Math.sin(a)*reach*t+Math.sin(a*3)*850*Math.sin(Math.PI*t),pz=Math.cos(a)*reach*t; margin=Math.min(margin,height(px,pz)-top*t);}
    if(margin>=12)candidates.push({a,reach,score:h+margin*2-reach*.002});
  }
  candidates.sort((a,b)=>b.score-a.score||a.a-b.a);
  const best=candidates[0];if(!best)throw new Error('No feasible coastal river route in bounded regional search');
  const count=Math.max(129,Math.ceil(best.reach/80)+1), mainPoints:RiverPoint[]=[],meander=(850+random()*150)*Math.sin(best.a*3.1);
  const headWater=clamp(Math.min(height(Math.sin(best.a)*best.reach,Math.cos(best.a)*best.reach)-9,best.reach*.0065),55,240);
  let cut=0,fill=0;
  for(let i=0;i<count;i++){
    const t=1-i/(count-1),curve=Math.sin(Math.PI*t)*meander;
    const x=Math.sin(best.a)*best.reach*t+Math.cos(best.a)*curve,z=Math.cos(best.a)*best.reach*t-Math.sin(best.a)*curve;
    const water=headWater*t,source=i===0,depth=source?.02:clamp(2.2+(1-t)*3.8,2.2,6),width=source?.02:clamp(8+(1-t)*18,8,26),base=height(x,z);fill=Math.max(fill,water-depth-base);cut=Math.max(cut,base-(water-depth));
    mainPoints.push(point(x,z,water,width,depth,0));
  }
  // Extend past the coarse dry outlet to a real baseline-ocean sample.
  let ocean:{x:number;z:number}|null=null, oceanScore=Infinity;
  for(let a=0;a<32;a++)for(let r=400;r<=12000;r+=400){const angle=a*Math.PI*2/32,x=Math.cos(angle)*r,z=Math.sin(angle)*r,h=height(x,z);if(h<=0&&r<oceanScore){ocean={x,z};oceanScore=r;}}
  if(!ocean)throw new Error('No baseline ocean crossing near coarse mouth');
  const tail=mainPoints.at(-1)!;for(let i=1,steps=Math.ceil(Math.hypot(ocean.x-tail.x,ocean.z-tail.z)/80);i<=steps;i++){const t=i/steps;mainPoints.push(point(lerp(tail.x,ocean.x,t),lerp(tail.z,ocean.z,t),0,26,6,0));}
  // The channel is head-to-mouth and has strictly non-increasing water elevation.
  for(let i=1;i<mainPoints.length;i++)mainPoints[i].distanceM=mainPoints[i-1].distanceM+Math.hypot(mainPoints[i].x-mainPoints[i-1].x,mainPoints[i].z-mainPoints[i-1].z);
  if(cut>750||fill>750)throw new Error('Coastal route exceeds bounded terrain correction');
  const main=channel(id+'/main',catchment.name.replace(/ Basin$/,'')+' River',mainPoints,null);
  const junction=Math.floor(mainPoints.length*.57),j=mainPoints[junction],side=best.a+(random()<.5?1:-1)*(1.0+random()*.35),tribPoints:RiverPoint[]=[];
  const tribReach=clamp(best.reach*.32,7000,12000),tribHead=height(j.x+Math.sin(side)*tribReach,j.z+Math.cos(side)*tribReach)-8;
  if(tribHead<=j.waterM+12)throw new Error('No feasible tributary above main channel');
  const tribCount=Math.ceil(tribReach/80)+1;for(let i=0;i<tribCount;i++){const t=1-i/(tribCount-1),x=j.x+Math.sin(side)*tribReach*t,z=j.z+Math.cos(side)*tribReach*t,water=j.waterM+(tribHead-j.waterM)*t,source=i===0,depth=source?.02:2.1+(1-t)*1.5,width=source?.02:5+(1-t)*7,base=height(x,z);fill=Math.max(fill,water-depth-base);cut=Math.max(cut,base-(water-depth));tribPoints.push(point(x,z,water,width,depth,0));}
  for(let i=1;i<tribPoints.length;i++)tribPoints[i].distanceM=tribPoints[i-1].distanceM+Math.hypot(tribPoints[i].x-tribPoints[i-1].x,tribPoints[i].z-tribPoints[i-1].z);
  const tributary=channel(id+'/tributary-1',catchment.name.replace(/ Basin$/,'')+' Fork',tribPoints,main.id);
  const lakePoint=mainPoints[Math.floor((count-1)*.76)],lakeSide=best.a+(random()<.5?1:-1)*Math.PI/2,lakeAngle=Math.atan2(Math.cos(lakeSide),Math.sin(lakeSide));
  // Its ellipse overlaps the channel by roughly 100 m; both use this main-point level.
  const lake:RiverLake={id:id+'/lake-1',name:catchment.name.replace(/ Basin$/,'')+' Lake',x:lakePoint.x+Math.cos(lakeAngle)*320,z:lakePoint.z+Math.sin(lakeAngle)*320,radiusXM:420,radiusZM:610,angle:lakeAngle,waterM:lakePoint.waterM,depthM:5.5};
  // A lake is part of the main channel, never a crossing with a different surface.
  const lakeChannelPoints=mainPoints.filter(p=>{const ca=Math.cos(lake.angle),sa=Math.sin(lake.angle),u=((p.x-lake.x)*ca+(p.z-lake.z)*sa)/lake.radiusXM,v=(-(p.x-lake.x)*sa+(p.z-lake.z)*ca)/lake.radiusZM;return u*u+v*v<=1.02;});
  const lakeStart=Math.max(0,mainPoints.indexOf(lakeChannelPoints[0])-1),lakeEnd=Math.min(mainPoints.length-1,mainPoints.indexOf(lakeChannelPoints.at(-1)!)+1);lake.waterM=Math.min(...mainPoints.slice(lakeStart,lakeEnd+1).map(p=>p.waterM));for(let i=lakeStart;i<=lakeEnd;i++)mainPoints[i].waterM=lake.waterM;
  for(let a=0;a<32;a++)for(const f of [0,.5,1]){const x=lake.x+Math.cos(lake.angle)*lake.radiusXM*f*Math.cos(a)-Math.sin(lake.angle)*lake.radiusZM*f*Math.sin(a),z=lake.z+Math.sin(lake.angle)*lake.radiusXM*f*Math.cos(a)+Math.cos(lake.angle)*lake.radiusZM*f*Math.sin(a),bed=lake.waterM-lake.depthM*(1-f*f),base=height(x,z);cut=Math.max(cut,base-bed);fill=Math.max(fill,bed-base);}
  if(cut>750||fill>750)throw new Error('River beds or lake bowl exceed bounded terrain correction');
  const site=(suffix:string,name:string,kind:RiverSite['kind'],x:number,z:number,lookX:number,lookZ:number,elevationM:number):RiverSite=>({id:id+'/'+suffix,name,kind,direction:riverDirection(provisional,x,z),elevationM,lookDirection:riverDirection(provisional,lookX,lookZ)});
  const draft:RiverRegion={version:RIVER_VERSION,id,parentCatchmentId:catchment.id,bodyId:body.id,bodySeed:body.seed,radiusM:body.radiusM,origin,east,north,boundsM:[-max-3000,-max-3000,max+3000,max+3000],channels:[main,tributary],lakes:[lake],sites:[],stats:{samples:0,lengthM:0,maxCutM:0,maxFillM:0,buildAlgorithm:'coastal-ray-grid-49x49-v1'}};
  const finalHeight=(x:number,z:number)=>{const d=riverDirection(draft,x,z);return sampleRiverRegion(draft,d,height(x,z)).rockHeightM;};
  const slope=(x:number,z:number)=>Math.atan(Math.hypot(finalHeight(x+5,z)-finalHeight(x-5,z),finalHeight(x,z+5)-finalHeight(x,z-5))/10)*180/Math.PI;
  const closeDry=(x:number,z:number,dx:number,dz:number)=>{let best:{x:number;z:number;slope:number;height:number}|null=null;for(let r=5;r<=15;r+=1){const qx=x+dx*r,qz=z+dz*r,d=riverDirection(draft,qx,qz),base=height(qx,qz),s=sampleRiverRegion(draft,d,base),angle=slope(qx,qz);if(!s.wet&&!baseline(d).ocean&&angle<=28&&(!best||angle<best.slope))best={x:qx,z:qz,slope:angle,height:s.rockHeightM};}if(!best)throw new Error('No walkable dry bank site within 5–15 m of water');return best;};
  const bank=mainPoints[Math.floor(mainPoints.length*.42)],dx=mainPoints[Math.floor(mainPoints.length*.43)].x-bank.x,dz=mainPoints[Math.floor(mainPoints.length*.43)].z-bank.z,sideX=-dz/Math.hypot(dx,dz),sideZ=dx/Math.hypot(dx,dz);
  const shoreX=lake.x+Math.cos(lake.angle)*lake.radiusXM,shoreZ=lake.z+Math.sin(lake.angle)*lake.radiusXM;
  const bankSite=closeDry(bank.x,bank.z,sideX,sideZ),shoreSite=closeDry(shoreX,shoreZ,Math.cos(lake.angle),Math.sin(lake.angle)),mouth=mainPoints[count-1],mouthSite=closeDry(mouth.x,mouth.z,sideX,sideZ);
  const sites=[site('bank',main.name+' Bank','river-bank',bankSite.x,bankSite.z,bank.x,bank.z,bankSite.height),site('lake-shore',lake.name+' Shore','lake-shore',shoreSite.x,shoreSite.z,lake.x,lake.z,shoreSite.height),site('mouth',main.name+' Mouth','mouth',mouthSite.x,mouthSite.z,mouth.x,mouth.z,mouthSite.height)];
  // Validate the final shared field at every refined profile and at both wet/bank
  // boundaries. These are the real reported corrections, including lake and fork.
  const measure=(x:number,z:number)=>{const d=riverDirection(draft,x,z),base=height(x,z),rock=sampleRiverRegion(draft,d,base).rockHeightM;cut=Math.max(cut,base-rock);fill=Math.max(fill,rock-base);};
  for(const c of [main,tributary])for(let i=0;i<c.points.length;i++){const p=c.points[i],q=c.points[Math.min(c.points.length-1,i+1)],r=c.points[Math.max(0,i-1)],dx=q.x-r.x,dz=q.z-r.z,n=Math.hypot(dx,dz)||1,nx=-dz/n,nz=dx/n,half=p.widthM/2;for(const offset of [0,half,half+100,half+3000]){measure(p.x+nx*offset,p.z+nz*offset);measure(p.x-nx*offset,p.z-nz*offset);}}
  for(let i=0;i<48;i++){const a=i*Math.PI*2/48,ca=Math.cos(lake.angle),sa=Math.sin(lake.angle);for(const f of [0,.5,1,1.25])measure(lake.x+ca*lake.radiusXM*f*Math.cos(a)-sa*lake.radiusZM*f*Math.sin(a),lake.z+sa*lake.radiusXM*f*Math.cos(a)+ca*lake.radiusZM*f*Math.sin(a));}
  if(cut>750||fill>750)throw new Error('Final river field exceeds bounded terrain correction');
  const extent=[...mainPoints,...tribPoints].reduce((b,p)=>[Math.min(b[0],p.x-3000),Math.min(b[1],p.z-3000),Math.max(b[2],p.x+3000),Math.max(b[3],p.z+3000)], [lake.x-lake.radiusXM-3000,lake.z-lake.radiusZM-3000,lake.x+lake.radiusXM+3000,lake.z+lake.radiusZM+3000]);
  return {version:RIVER_VERSION,id,parentCatchmentId:catchment.id,bodyId:body.id,bodySeed:body.seed,radiusM:body.radiusM,origin,east,north,boundsM:extent as [number,number,number,number],channels:[main,tributary],lakes:[lake],sites,stats:{samples:evaluations,lengthM:length(mainPoints)+length(tribPoints),maxCutM:Math.max(0,cut),maxFillM:Math.max(0,fill),buildAlgorithm:'coastal-ray-grid-49x49-v1'}};
}
