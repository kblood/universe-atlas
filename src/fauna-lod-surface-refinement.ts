/** Experimental worker-only refinement of one loaded body. Source arrays are
 * borrowed and never transferred or changed. Moved vertices carry triangle /
 * barycentric provenance, not a claim of exact source-vertex attributes. */
import type {QuadrupedBodyData} from './fauna-body-plan.ts';
import type {FaunaBodyLodLevel} from './fauna-body-lod.ts';
import {faunaBodyLodSourceParts} from './fauna-body-lod.ts';
import {buildFaunaBodyLodCandidates} from './fauna-body-lod-candidates.ts';

export const FAUNA_SURFACE_REFINEMENT_VERSION='fauna-surface-refinement-2';
export interface FaunaSurfaceRefinementOptions {
  targets?:readonly number[];passes?:number;strength?:number;
  /** Per-pass movement bound as a fraction of source diagonal. */
  maxMoveFraction?:number;
  /** Worker cancellation uses a shared atomic flag (nonzero = cancelled).
   * Ordinary AbortSignal messages cannot interrupt synchronous worker code. */
  cancelFlag?:Int32Array;
}
export interface FaunaSurfaceRefinedLevel extends Omit<FaunaBodyLodLevel,'sourceVertex'> {
  resampled:true;initialSourceVertex:Uint32Array;statsRole:'base-decimation-only';
  sourceTriangle:Uint32Array;barycentric:Float32Array;
  refinement:{movedVertices:number;lockedPositions:number;rejectedMoves:number;passes:number;maxDisplacementM:number;maxDiscardedSkinWeight:number};
}
type Cancel=()=>void;
/** Closest point on a triangle, including edge/corner regions. Output xyz,
 * barycentric abc, squared distance. No allocation inside triangle queries. */
function closest(s:QuadrupedBodyData,t:number,x:number,y:number,z:number,out:Float64Array){
  const p=s.positions,ia=s.index[t*3]!*3,ib=s.index[t*3+1]!*3,ic=s.index[t*3+2]!*3;
  const ax=p[ia]!,ay=p[ia+1]!,az=p[ia+2]!,abx=p[ib]!-ax,aby=p[ib+1]!-ay,abz=p[ib+2]!-az,acx=p[ic]!-ax,acy=p[ic+1]!-ay,acz=p[ic+2]!-az;
  const apx=x-ax,apy=y-ay,apz=z-az,d1=abx*apx+aby*apy+abz*apz,d2=acx*apx+acy*apy+acz*apz;
  let a=1,b=0,c=0;
  if(!(d1<=0&&d2<=0)){
    const bpx=apx-abx,bpy=apy-aby,bpz=apz-abz,d3=abx*bpx+aby*bpy+abz*bpz,d4=acx*bpx+acy*bpy+acz*bpz;
    if(d3>=0&&d4<=d3){a=0;b=1;}
    else {
      const vc=d1*d4-d3*d2;
      if(vc<=0&&d1>=0&&d3<=0){b=d1/(d1-d3);a=1-b;}
      else {
        const cpx=apx-acx,cpy=apy-acy,cpz=apz-acz,d5=abx*cpx+aby*cpy+abz*cpz,d6=acx*cpx+acy*cpy+acz*cpz;
        if(d6>=0&&d5<=d6){a=0;c=1;}
        else {
          const vb=d5*d2-d1*d6;
          if(vb<=0&&d2>=0&&d6<=0){c=d2/(d2-d6);a=1-c;}
          else {
            const va=d3*d6-d5*d4;
            if(va<=0&&d4-d3>=0&&d5-d6>=0){c=(d4-d3)/((d4-d3)+(d5-d6));a=0;b=1-c;}
            else {const denominator=va+vb+vc;if(denominator>0){b=vb/denominator;c=vc/denominator;a=1-b-c;}}
          }
        }
      }
    }
  }
  out[0]=ax+b*abx+c*acx;out[1]=ay+b*aby+c*acy;out[2]=az+b*abz+c*acz;
  out[3]=a;out[4]=b;out[5]=c;out[6]=(x-out[0]!)**2+(y-out[1]!)**2+(z-out[2]!)**2;
}
/** One deterministic median BVH per original semantic part. Node allocation
 * <=2*sourceTriangles; typed temporary footprint <=~9.4MiB at the source limit.
 * No Three/GPU dependency and no retained spatial index in the returned chain. */
class SourceSurface {
  readonly order:Uint32Array;readonly bounds:Float64Array;readonly left:Int32Array;readonly right:Int32Array;
  readonly start:Uint32Array;readonly count:Uint32Array;readonly centres:Float64Array;
  readonly roots:number[]=[];readonly firstTriangle:Int32Array;readonly vertexPart:Int16Array;readonly triangleBones:Uint32Array;
  private nodes=0;private scratch=new Float64Array(7);
  constructor(readonlySource:QuadrupedBodyData,check:Cancel){
    this.source=readonlySource;const s=readonlySource,t=s.triangleCount,capacity=t*2;
    this.order=Uint32Array.from({length:t},(_,i)=>i);this.bounds=new Float64Array(capacity*6);
    this.left=new Int32Array(capacity).fill(-1);this.right=new Int32Array(capacity).fill(-1);this.start=new Uint32Array(capacity);this.count=new Uint32Array(capacity);this.centres=new Float64Array(t*3);
    this.triangleBones=new Uint32Array(t);
    this.firstTriangle=new Int32Array(s.vertexCount).fill(-1);this.vertexPart=new Int16Array(s.vertexCount).fill(-1);
    const parts=faunaBodyLodSourceParts(s);
    for(let part=0;part<parts.length;part++){
      const p=parts[part]!;
      for(let tri=p.firstTriangle;tri<p.firstTriangle+p.triangles;tri++){
        if((tri&255)===0)check();
        for(let c=0;c<3;c++){let sum=0;for(let k=0;k<3;k++)sum+=s.positions[s.index[tri*3+k]!*3+c]!;this.centres[tri*3+c]=sum/3;}
        for(let k=0;k<3;k++){const v=s.index[tri*3+k]!;for(let j=0;j<4;j++)if(s.skinWeight[v*4+j]!>0)this.triangleBones[tri]=this.triangleBones[tri]!|(1<<s.skinIndex[v*4+j]!);if(this.firstTriangle[v]===-1){this.firstTriangle[v]=tri;this.vertexPart[v]=part;}else if(this.vertexPart[v]!==part)this.vertexPart[v]=-2;}
      }
      this.roots[part]=p.triangles?this.build(p.firstTriangle,p.firstTriangle+p.triangles,check):-1;
    }
  }
  get byteLength():number{return [this.order,this.bounds,this.left,this.right,this.start,this.count,this.centres,this.firstTriangle,this.vertexPart,this.triangleBones,this.scratch].reduce((sum,a)=>sum+a.byteLength,0);}
  private source:QuadrupedBodyData;
  private build(begin:number,end:number,check:Cancel):number{
    check();const node=this.nodes++,b=node*6;this.start[node]=begin;this.count[node]=end-begin;
    this.bounds.set([Infinity,Infinity,Infinity,-Infinity,-Infinity,-Infinity],b);
    for(let i=begin;i<end;i++){const tri=this.order[i]!;for(let k=0;k<3;k++)for(let c=0;c<3;c++){
      const x=this.source.positions[this.source.index[tri*3+k]!*3+c]!;this.bounds[b+c]=Math.min(this.bounds[b+c]!,x);this.bounds[b+3+c]=Math.max(this.bounds[b+3+c]!,x);
    }}
    if(end-begin>8){
      let axis=0;for(let c=1;c<3;c++)if(this.bounds[b+c+3]!-this.bounds[b+c]!>this.bounds[b+axis+3]!-this.bounds[b+axis]!)axis=c;
      this.order.subarray(begin,end).sort((a,d)=>this.centres[a*3+axis]!-this.centres[d*3+axis]!||a-d);
      const middle=(begin+end)>>>1;this.left[node]=this.build(begin,middle,check);this.right[node]=this.build(middle,end,check);
    }
    return node;
  }
  query(part:number,x:number,y:number,z:number,result:Float64Array,majorBone:number):number{
    let best=Infinity,triangle=-1;const b=this.bounds;
    const boxDistance=(node:number)=>{const i=node*6;return Math.max(b[i]!-x,0,x-b[i+3]!)**2+Math.max(b[i+1]!-y,0,y-b[i+4]!)**2+Math.max(b[i+2]!-z,0,z-b[i+5]!)**2;};
    const visit=(node:number)=>{
      if(node<0||boxDistance(node)>best)return;
      const left=this.left[node]!,right=this.right[node]!;
      if(left>=0){if(boxDistance(left)<=boxDistance(right)){visit(left);visit(right);}else{visit(right);visit(left);}return;}
      for(let i=this.start[node]!;i<this.start[node]!+this.count[node]!;i++){
        const t=this.order[i]!;if(!(this.triangleBones[t]!&(1<<majorBone)))continue;closest(this.source,t,x,y,z,this.scratch);
        if(this.scratch[6]!<best||this.scratch[6]===best&&t<triangle){best=this.scratch[6]!;triangle=t;result.set(this.scratch);}
      }
    };
    visit(this.roots[part]??-1);return triangle;
  }
}
const positionKey=(p:Float32Array,v:number)=>`${p[v*3]}/${p[v*3+1]}/${p[v*3+2]}`;
function refine(source:QuadrupedBodyData,base:FaunaBodyLodLevel,anchors:Uint32Array,surface:SourceSurface,passes:number,strength:number,maxMove:number,check:Cancel):FaunaSurfaceRefinedLevel{
  const n=base.vertexCount,positions=base.positions.slice(),normals=base.normals.slice(),colors=base.colors.slice(),skinIndex=base.skinIndex.slice(),skinWeight=base.skinWeight.slice();
  const sourceTriangle=new Uint32Array(n),barycentric=new Float32Array(n*3),locked=new Uint8Array(n),anchorKeys=new Set(Array.from(anchors,v=>positionKey(source.positions,v)));
  const groups=new Map<string,number[]>(),adj=Array.from({length:n},()=>new Set<number>()),faces=Array.from({length:n},()=>[] as number[]);
  for(let v=0;v<n;v++){
    const initial=base.sourceVertex[v]!,tri=surface.firstTriangle[initial]!;sourceTriangle[v]=tri;
    for(let k=0;k<3;k++)if(source.index[tri*3+k]===initial)barycentric[v*3+k]=1;
    const key=positionKey(positions,v);if(!groups.has(key))groups.set(key,[]);groups.get(key)!.push(v);
    if(anchorKeys.has(key)||surface.vertexPart[initial]!<0)locked[v]=1;
  }
  for(let t=0;t<base.triangleCount;t++)for(let k=0;k<3;k++){const a=base.index[t*3+k]!,b=base.index[t*3+(k+1)%3]!;adj[a]!.add(b);adj[b]!.add(a);faces[a]!.push(t);}
  // Seam duplicates share positions; conflicting semantic parts stay locked.
  for(const group of groups.values()){
    const part=surface.vertexPart[base.sourceVertex[group[0]!]!]!;
    if(group.some(v=>locked[v]||surface.vertexPart[base.sourceVertex[v]!]!==part))for(const v of group)locked[v]=1;
  }
  const weights=new Float64Array(source.plan.bones.length),bestIndices=new Uint8Array(4),bestWeights=new Float64Array(4),fractions=new Float64Array(4),point=new Float64Array(7);
  let rejectedMoves=0,maxDiscardedSkinWeight=0;
  function sample(v:number,tri:number){
    sourceTriangle[v]=tri;for(let k=0;k<3;k++)barycentric[v*3+k]=point[k+3]!;
    const bary=barycentric.subarray(v*3,v*3+3);
    // Reconstruct from the stored Float32 barycentrics, so provenance actually
    // reproduces the published positions and attributes rather than a hidden
    // higher-precision projection. Normalise their small rounding error.
    const total=bary[0]!+bary[1]!+bary[2]!;weights.fill(0);
    for(let c=0;c<3;c++){let p=0,normal=0,color=0;for(let k=0;k<3;k++){const s=source.index[tri*3+k]!,w=bary[k]!/total;p+=source.positions[s*3+c]!*w;normal+=source.normals[s*3+c]!*w;color+=source.colors[s*3+c]!*w;}positions[v*3+c]=p;normals[v*3+c]=normal;colors[v*3+c]=Math.round(color);}
    const length=Math.hypot(normals[v*3]!,normals[v*3+1]!,normals[v*3+2]!);if(length>0)for(let c=0;c<3;c++)normals[v*3+c]=normals[v*3+c]!/length;
    for(let k=0;k<3;k++){const s=source.index[tri*3+k]!,w=bary[k]!/total;for(let j=0;j<4;j++)weights[source.skinIndex[s*4+j]!]=weights[source.skinIndex[s*4+j]!]!+source.skinWeight[s*4+j]!*w;}
    bestWeights.fill(-1);bestIndices.fill(0);
    for(let bone=0;bone<weights.length;bone++)for(let k=0;k<4;k++)if(weights[bone]!>bestWeights[k]!){for(let j=3;j>k;j--){bestWeights[j]=bestWeights[j-1]!;bestIndices[j]=bestIndices[j-1]!;}bestWeights[k]=weights[bone]!;bestIndices[k]=bone;break;}
    const sum=bestWeights.reduce((a,b)=>a+Math.max(b,0),0);maxDiscardedSkinWeight=Math.max(maxDiscardedSkinWeight,Math.max(0,1-sum/255));let remaining=255;
    for(let k=0;k<4;k++){const scaled=Math.max(0,bestWeights[k]!)*255/sum,quantised=Math.floor(scaled);skinIndex[v*4+k]=bestIndices[k]!;skinWeight[v*4+k]=quantised;remaining-=quantised;fractions[k]=scaled-quantised;}
    while(remaining>0){let k=0;for(let j=1;j<4;j++)if(fractions[j]!>fractions[k]!)k=j;skinWeight[v*4+k]=skinWeight[v*4+k]!+1;fractions[k]=-1;remaining--;}
  }
  function validMove(group:number[],x:number,y:number,z:number):boolean{
    const members=new Set(group);
    for(const v of group)for(const t of faces[v]!){
      const ids=[base.index[t*3]!,base.index[t*3+1]!,base.index[t*3+2]!],before=ids.map(id=>[positions[id*3]!,positions[id*3+1]!,positions[id*3+2]!]),after=ids.map((id,i)=>members.has(id)?[x,y,z]:before[i]!);
      const normal=(p:number[][])=>{const a=p[0]!,b=p[1]!,c=p[2]!,ux=b[0]!-a[0]!,uy=b[1]!-a[1]!,uz=b[2]!-a[2]!,vx=c[0]!-a[0]!,vy=c[1]!-a[1]!,vz=c[2]!-a[2]!;return [uy*vz-uz*vy,uz*vx-ux*vz,ux*vy-uy*vx];};
      const a=normal(before),b=normal(after),aa=a.reduce((s,x)=>s+x*x,0),bb=b.reduce((s,x)=>s+x*x,0),dot=a[0]!*b[0]!+a[1]!*b[1]!+a[2]!*b[2]!;
      const reference=normal(ids.map(id=>[base.positions[id*3]!,base.positions[id*3+1]!,base.positions[id*3+2]!])),rr=reference.reduce((sum,x)=>sum+x*x,0),rd=reference[0]!*b[0]!+reference[1]!*b[1]!+reference[2]!*b[2]!;
      if(bb<aa*.04||dot<Math.sqrt(aa*bb)*.5||rd<Math.sqrt(rr*bb)*.3)return false;
    }
    return true;
  }
  for(let pass=0;pass<passes;pass++)for(const group of groups.values()){
    check();const v=group[0]!;if(locked[v])continue;
    const neighbors=new Set<number>();for(const id of group)for(const neighbor of adj[id]!)if(!group.includes(neighbor))neighbors.add(neighbor);
    if(!neighbors.size)continue;
    let x=0,y=0,z=0;for(const id of neighbors){x+=positions[id*3]!;y+=positions[id*3+1]!;z+=positions[id*3+2]!;}
    x=x/neighbors.size-positions[v*3]!;y=y/neighbors.size-positions[v*3+1]!;z=z/neighbors.size-positions[v*3+2]!;
    const nx=normals[v*3]!,ny=normals[v*3+1]!,nz=normals[v*3+2]!,dot=x*nx+y*ny+z*nz;
    x=(x-dot*nx)*strength;y=(y-dot*ny)*strength;z=(z-dot*nz)*strength;
    const length=Math.hypot(x,y,z),scale=length>maxMove?maxMove/length:1;
    let dominantLane=0;for(let k=1;k<4;k++)if(base.skinWeight[v*4+k]!>base.skinWeight[v*4+dominantLane]!)dominantLane=k;
    const tri=surface.query(surface.vertexPart[base.sourceVertex[v]!]!,positions[v*3]!+x*scale,positions[v*3+1]!+y*scale,positions[v*3+2]!+z*scale,point,base.skinIndex[v*4+dominantLane]!);
    if(tri>=0){const bary=[Math.fround(point[3]!),Math.fround(point[4]!),Math.fround(point[5]!)],sum=bary[0]!+bary[1]!+bary[2]!;for(let c=0;c<3;c++){let p=0;for(let k=0;k<3;k++)p+=source.positions[source.index[tri*3+k]!*3+c]!*bary[k]!/sum;point[c]=Math.fround(p);}}
    if(tri<0||Math.hypot(point[0]!-positions[v*3]!,point[1]!-positions[v*3+1]!,point[2]!-positions[v*3+2]!)>maxMove||!validMove(group,point[0]!,point[1]!,point[2]!)){rejectedMoves++;continue;}
    for(const id of group)sample(id,tri);
  }
  let movedVertices=0,maxDisplacementM=0,lockedPositions=0;
  for(let v=0;v<n;v++){const d=Math.hypot(positions[v*3]!-base.positions[v*3]!,positions[v*3+1]!-base.positions[v*3+1]!,positions[v*3+2]!-base.positions[v*3+2]!);if(d>0)movedVertices++;if(locked[v])lockedPositions++;maxDisplacementM=Math.max(maxDisplacementM,d);}
  const {sourceVertex,...rest}=base;
  return {...rest,positions,normals,colors,skinIndex,skinWeight,resampled:true,statsRole:'base-decimation-only',initialSourceVertex:sourceVertex,sourceTriangle,barycentric,
    refinement:{movedVertices,lockedPositions,rejectedMoves,passes,maxDisplacementM,maxDiscardedSkinWeight},byteLength:base.byteLength+sourceTriangle.byteLength+barycentric.byteLength};
}
export function buildFaunaSurfaceRefinedLodChain(source:QuadrupedBodyData,options:FaunaSurfaceRefinementOptions={}){
  if(source.plan.bones.length!==22)throw new Error('fauna surface refinement: canonical22-bone source required');
  const passes=options.passes??2,strength=options.strength??.25,maxMoveFraction=options.maxMoveFraction??.02;
  if(!Number.isInteger(passes)||passes<1||passes>4||!Number.isFinite(strength)||strength<=0||strength>.5||!Number.isFinite(maxMoveFraction)||maxMoveFraction<=0||maxMoveFraction>.05)throw new Error('fauna surface refinement: passes1..4, strength(0,.5], maxMoveFraction(0,.05] required');
  const flag=options.cancelFlag;if(flag&&(!(flag instanceof Int32Array)||!(typeof SharedArrayBuffer!=='undefined'&&flag.buffer instanceof SharedArrayBuffer)||flag.length!==1))throw new Error('fauna surface refinement: shared one-element Int32 cancellation flag required');
  const check=()=>{if(flag&&Atomics.load(flag,0)!==0)throw new Error('fauna surface refinement: cancelled');};check();
  const base=buildFaunaBodyLodCandidates(source,{targets:options.targets??[1500,750,500],methods:['joint-constrained-qem']});check();
  const surface=new SourceSurface(source,check),lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
  for(let v=0;v<source.vertexCount;v++)for(let c=0;c<3;c++){lo[c]=Math.min(lo[c]!,source.positions[v*3+c]!);hi[c]=Math.max(hi[c]!,source.positions[v*3+c]!);}
  const diagonal=Math.hypot(hi[0]!-lo[0]!,hi[1]!-lo[1]!,hi[2]!-lo[2]!);
  const levels=base.chains[0]!.levels.map(level=>refine(source,level,base.chains[0]!.anchorVertices,surface,passes,strength,diagonal*maxMoveFraction,check));
  const refinementOptions=JSON.stringify({passes,strength,maxMoveFraction,projection:'nearest-original-semantic-part-triangle-with-initial-major-joint-support',skin:'barycentric-top4-largest-remainder255',normal:'barycentric-normalised',colour:'barycentric-rounded-uint8',perMoveFaceCosine:.5,baseFaceCosine:.3,minRelativeFaceArea:.04,bvhLeafTriangles:8});
  let hash=2166136261;for(const byte of new TextEncoder().encode(base.chains[0]!.optionsHash+refinementOptions))hash=Math.imul(hash^byte,16777619);
  return {source,version:FAUNA_SURFACE_REFINEMENT_VERSION,method:'joint-qem-source-surface-refinement' as const,optionsHash:(hash>>>0).toString(16).padStart(8,'0'),spatialIndexTemporaryBytes:surface.byteLength,retainedDerivedBytes:levels.reduce((sum,l)=>sum+l.byteLength,0)+base.chains[0]!.anchorVertices.byteLength,levels,
    anchorVertices:base.chains[0]!.anchorVertices,provenance:{...base.chains[0]!.provenance,baseMethodVersion:base.chains[0]!.version,baseOptionsHash:base.chains[0]!.optionsHash,refinementOptions,sourceVertexClaim:'initial correspondence only; moved attributes are barycentrically resampled'}};
}
