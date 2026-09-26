import {hash64,type Body,type V3} from './catalog.ts';
import {terrainSampler,TERRAIN_VERSION} from './terrain.ts';
import {cubeDirection} from './planet-tiles.ts';
import {acosDet,atan2Det,hypotDet} from './det-math.ts';

export const DRAINAGE_VERSION='drainage-2';
/** Of the 12 major catchments ranked below (area desc, then outlet index asc
 * — both pure functions of seed + body address, never of request time), the
 * largest RIVER_CANDIDATE_COUNT canonically "have a river": requesting any of
 * their addresses always produces the same physical region regardless of
 * when or in what order it is asked for (see river-worker.ts, which uses
 * this to bound automatic destination selection — never basin existence). A
 * user can still explicitly address any of the 12 drainage catchments from
 * the drainage browser or a direct ?river=<id> link; this constant only
 * bounds the "Find rivers" auto-pick pool. Chosen prototype budget, not a
 * claim that a real coastline has exactly 8 rivers. */
export const RIVER_CANDIDATE_COUNT=8;
export const DRAINAGE_GRID=64;
export type DrainageSite={direction:V3;elevationM:number};
export type Catchment={id:string;name:string;outlet:number;head:number;areaKm2:number;lengthKm:number;depressionKm2:number;headwater:DrainageSite;mouth:DrainageSite};
export type SphereGrid={directions:Float64Array;areas:Float64Array;offsets:Uint32Array;neighbours:Uint32Array;triangles:Uint32Array};
const dot=(a:V3,b:V3)=>a.reduce((s,x,i)=>s+x*b[i],0);
const direction=(v:Float64Array,i:number)=>Array.from(v.subarray(i*3,i*3+3)) as V3;
const normalize=(v:V3)=>{const r=Math.hypot(...v);return v.map(x=>x/r) as V3;};

/** Shared integer cube vertices: seams/corners have one owner. Areas are spherical
 * triangle areas, distributed to vertices, not equal face-UV cell weights. */
export function sphereGrid(n:number):SphereGrid{
  if(!Number.isInteger(n)||n<2||n>128)throw new Error('Drainage grid must be 2–128');
  const ids=new Map<string,number>(),dirs:number[]=[],areas:number[]=[],adj:Set<number>[]=[],triangles:number[]=[];
  const vertex=(face:number,x:number,y:number)=>{
    const u=2*x-n,v=2*y-n;
    const cube=([[n,v,-u],[-n,v,u],[u,n,-v],[u,-n,v],[u,v,n],[-u,v,-n]][face]);
    const key=cube.join(',');let id=ids.get(key);
    if(id===undefined){id=ids.size;ids.set(key,id);dirs.push(...cubeDirection(face,u/n,v/n));areas.push(0);adj.push(new Set());}
    return id;
  };
  const join=(a:number,b:number)=>{adj[a].add(b);adj[b].add(a);};
  const triangle=(a:number,b:number,c:number)=>{
    triangles.push(a,b,c);
    const p=dirs.slice(a*3,a*3+3) as V3,q=dirs.slice(b*3,b*3+3) as V3,r=dirs.slice(c*3,c*3+3) as V3;
    const determinant=p[0]*(q[1]*r[2]-q[2]*r[1])+p[1]*(q[2]*r[0]-q[0]*r[2])+p[2]*(q[0]*r[1]-q[1]*r[0]);
    // Spherical-triangle area feeds catchment area totals, which rank the
    // canonical top-K catchments — a branch-affecting decision, so this uses
    // the deterministic atan2 rather than native Math.atan2.
    const area=2*atan2Det(Math.abs(determinant),1+dot(p,q)+dot(q,r)+dot(r,p));
    for(const i of [a,b,c])areas[i]+=area/3;
  };
  for(let face=0;face<6;face++)for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    const a=vertex(face,x,y),b=vertex(face,x+1,y),c=vertex(face,x+1,y+1),d=vertex(face,x,y+1);
    for(const [i,j] of [[a,b],[b,c],[c,d],[d,a],[a,c],[b,d]])join(i,j);
    triangle(a,b,c);triangle(a,c,d);
  }
  const offsets=new Uint32Array(ids.size+1),neighbours:number[]=[];
  adj.forEach((a,i)=>{offsets[i]=neighbours.length;neighbours.push(...[...a].sort((x,y)=>x-y));});offsets[ids.size]=neighbours.length;
  return {directions:new Float64Array(dirs),areas:new Float64Array(areas),offsets,neighbours:new Uint32Array(neighbours),triangles:new Uint32Array(triangles)};
}

/** Priority-Flood on a closed spherical graph, seeded by sampled oceans. The
 * fill field is analytical conditioning; it NEVER replaces the rock field.
 * Rank breaks flat ties without epsilon elevations or request-order state. */
export function routeDrainage(grid:SphereGrid,height:Float64Array,wet:Uint8Array){
  const count=height.length;
  if(grid.areas.length!==count||wet.length!==count||height.some(x=>!Number.isFinite(x)))throw new Error('Invalid drainage samples');
  const filled=height.slice(),rank=new Uint32Array(count),receiver=new Int32Array(count).fill(-1),seen=new Uint8Array(count),order=new Uint32Array(count),heap:number[]=[];
  const less=(a:number,b:number)=>filled[a]<filled[b]||(filled[a]===filled[b]&&a<b);
  const push=(v:number)=>{let i=heap.length;heap.push(v);while(i){const p=(i-1)>>1;if(!less(v,heap[p]))break;heap[i]=heap[p];i=p;}heap[i]=v;};
  const pop=()=>{const v=heap[0],last=heap.pop()!;if(heap.length){let i=0;while(i*2+1<heap.length){let c=i*2+1;if(c+1<heap.length&&less(heap[c+1],heap[c]))c++;if(!less(heap[c],last))break;heap[i]=heap[c];i=c;}heap[i]=last;}return v;};
  let roots=0;
  for(let i=0;i<count;i++)if(wet[i]){seen[i]=1;filled[i]=Math.max(0,height[i]);push(i);roots++;}
  // A dry closed sphere needs an explicit terminal basin; there is no map edge
  // to masquerade as an ocean. The UI does not call this an active river world.
  if(!roots){let low=0;for(let i=1;i<count;i++)if(height[i]<height[low])low=i;seen[low]=1;push(low);roots=1;}
  let visited=0;
  while(heap.length){
    const i=pop();rank[i]=visited;order[visited++]=i;
    for(let k=grid.offsets[i];k<grid.offsets[i+1];k++){
      const j=grid.neighbours[k];if(seen[j])continue;
      seen[j]=1;filled[j]=Math.max(height[j],filled[i]);receiver[j]=i;push(j);
    }
  }
  if(visited!==count)throw new Error('Disconnected drainage topology');
  // Prefer steepest conditioned descent. On flats retain the deterministic
  // flood-tree receiver, which is already guaranteed to have an earlier rank.
  for(const i of order){
    if(receiver[i]<0)continue;
    let best=receiver[i],slope=0;
    for(let k=grid.offsets[i];k<grid.offsets[i+1];k++){
      const j=grid.neighbours[k];if(rank[j]>=rank[i])continue;
      // Chord length feeds the steepest-descent slope comparison just below —
      // a branch-affecting flow-routing decision — so it uses the
      // deterministic hypot rather than native Math.hypot.
      const chord=hypotDet(...[0,1,2].map(c=>grid.directions[i*3+c]-grid.directions[j*3+c]));
      const s=(filled[i]-filled[j])/chord;
      if(s>slope||(s===slope&&s>0&&j<best)){slope=s;best=j;}
    }
    receiver[i]=best;
  }
  const accumulated=grid.areas.slice(),outlet=new Int32Array(count).fill(-1);
  for(const i of order){if(!wet[i])outlet[i]=receiver[i]<0||wet[receiver[i]]?i:outlet[receiver[i]];}
  for(let k=count-1;k>=0;k--){const i=order[k],j=receiver[i];if(j>=0)accumulated[j]+=accumulated[i];}
  return {filled,rank,receiver,accumulated,outlet,roots};
}

export function buildDrainage(body:Body,n=DRAINAGE_GRID){
  const grid=sphereGrid(n),sample=terrainSampler({...body,hydrology:undefined}),count=grid.areas.length;
  const height=new Float64Array(count),wet=new Uint8Array(count);
  for(let i=0;i<count;i++){const s=sample(direction(grid.directions,i));height[i]=s.elevationM;wet[i]=s.ocean?1:0;}
  const flow=routeDrainage(grid,height,wet),radius2=body.radiusM**2;
  const totals=new Map<number,{area:number;depression:number}>(),upstream=new Int32Array(count).fill(-1);
  for(let i=0;i<count;i++){
    const mouth=flow.outlet[i];if(mouth<0)continue;
    const t=totals.get(mouth)||{area:0,depression:0};t.area+=grid.areas[i];if(flow.filled[i]-height[i]>5)t.depression+=grid.areas[i];totals.set(mouth,t);
    const r=flow.receiver[i];if(r>=0&&!wet[r]&&(upstream[r]<0||flow.accumulated[i]>flow.accumulated[upstream[r]]||(flow.accumulated[i]===flow.accumulated[upstream[r]]&&i<upstream[r])))upstream[r]=i;
  }
  const top=[...totals].sort((a,b)=>b[1].area-a[1].area||a[0]-b[0]).slice(0,12);
  const site=(i:number):DrainageSite=>({direction:direction(grid.directions,i),elevationM:height[i]});
  const catchments:Catchment[]=top.map(([mouth,t])=>{
    let head=mouth,length=0;
    while(upstream[head]>=0){const j=upstream[head];length+=acosDet(dot(direction(grid.directions,head),direction(grid.directions,j)))*body.radiusM;head=j;}
    // Refine an outlet onto the existing dry coastal side, without changing its
    // coarse graph ownership. Keep a little inland clearance for landing.
    let mouthSite=site(mouth);const target=flow.receiver[mouth];
    if(target>=0&&wet[target]&&height[mouth]>12){
      let a=mouthSite.direction,b=direction(grid.directions,target);
      for(let k=0;k<26;k++){const mid=normalize(a.map((v,j)=>(v+b[j])*.5) as V3);if(sample(mid).elevationM>12)a=mid;else b=mid;}
      mouthSite={direction:a,elevationM:sample(a).elevationM};
    }
    const id=body.id+'/'+DRAINAGE_VERSION+'/n'+n+'/outlet/'+mouth,h=hash64(body.seed+'/'+id);
    const a=['Arden','Boreal','Cinder','Dawn','Eiren','Fallow','Gilden','Haven','Ilyra','Juniper','Korin','Lumen','Merrow','Nerith','Orien','Vesper'];
    const b=['Aster','Bracken','Cairn','Delta','Ember','Flint','Gale','Hollow','Iris','Jasper','Kestrel','Larch','Morrow','Nacre','Ochre','Pale'];
    return {id,name:a[Number(h%16n)]+' '+b[Number((h>>8n)%16n)]+' Basin',outlet:mouth,head,areaKm2:t.area*radius2/1e6,lengthKm:length/1000,depressionKm2:t.depression*radius2/1e6,headwater:site(head),mouth:mouthSite};
  });
  return {version:DRAINAGE_VERSION,geologyVersion:TERRAIN_VERSION,gridSize:n,bodyId:body.id,bodySeed:body.seed,radiusM:body.radiusM,...grid,height,wet,...flow,catchments,
    stats:{nodes:count,edges:grid.neighbours.length/2,oceanNodes:wet.reduce((a,b)=>a+b,0),catchments:totals.size,landKm2:[...totals.values()].reduce((a,b)=>a+b.area,0)*radius2/1e6,meanSpacingKm:Math.sqrt(4*Math.PI*radius2/count)/1000}};
}
export type Drainage=ReturnType<typeof buildDrainage>;

export function drainageBytes(data:Drainage){return Object.values(data).reduce<number>((n,v)=>n+(ArrayBuffer.isView(v)?v.byteLength:0),0);}
