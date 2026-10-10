/** Off-frame source-preserving candidates. The production worker selects joint
 * constrained QEM; spatial clustering remains a review experiment. Copied coat
 * samples do not promise matching interpolated appearance; production uses
 * the separately validated raw field material and paired image review. */
import type {QuadrupedBodyData} from './fauna-body-plan.ts';
import {buildFaunaBodyLodChain,faunaBodyLodValidateSource,faunaBodyLodSourceParts,type FaunaBodyLodLevel} from './fauna-body-lod.ts';
import {COMPOSER_LOD_CONSTRAINTS_VERSION} from './fauna-composer-lod.ts';

export const FAUNA_LOD_CANDIDATE_VERSION='fauna-lod-candidates-2';
export type FaunaLodCandidateMethod='joint-constrained-qem'|'skin-coat-adaptive-cluster';
export interface FaunaLodCandidateOptions {targets?:readonly number[];methods?:readonly FaunaLodCandidateMethod[]}
export interface FaunaLodCandidateChain {
  method:FaunaLodCandidateMethod;version:string;optionsHash:string;
  anchorVertices:Uint32Array;levels:FaunaBodyLodLevel[];
  provenance:{geometryChecksum:string;sourceVersion:string;constraintVersion:string;options:string;hashKind:'fnv1a-diagnostic'};
}
const METHODS:readonly FaunaLodCandidateMethod[]=['joint-constrained-qem','skin-coat-adaptive-cluster'];
function digest(bytes:Iterable<number>):string {let h=2166136261;for(const b of bytes)h=Math.imul(h^b,16777619);return(h>>>0).toString(16).padStart(8,'0');}
const textHash=(s:string)=>digest(new TextEncoder().encode(s));
function constraints(source:QuadrupedBodyData){
  const n=source.vertexCount,protectedVertices=new Uint8Array(n),vertexImportance=new Float32Array(n).fill(1);
  // Four source quadruped feet: lower-leg joint plus its foot joint. Select
  // extremal existing samples instead of locking entire feet at low budgets.
  for(const bone of [12,15,18,21]){
    const vertices:number[]=[];
    for(let v=0;v<n;v++){
      let foot=0,lower=0;for(let k=0;k<4;k++){const i=v*4+k;if(source.skinIndex[i]===bone)foot+=source.skinWeight[i]!;if(source.skinIndex[i]===bone-1)lower+=source.skinWeight[i]!;}
      if(foot>=96)vertices.push(v);
      if(foot+lower>=96)vertexImportance[v]=2;
    }
    for(const axis of [0,1,2])for(const sign of [-1,1]){
      let best=-1,value=-Infinity;for(const v of vertices){const x=sign*source.positions[v*3+axis]!;if(x>value){best=v;value=x;}}
      if(best>=0)protectedVertices[best]=1;
    }
  }
  // Protect neither all colour seams nor an entire coat. Increase removal cost
  // near actual source colour gradients, retaining meaningful mark samples.
  for(let i=0;i<source.index.length;i+=3)for(let k=0;k<3;k++){
    const a=source.index[i+k]!,b=source.index[i+(k+1)%3]!;let d=0;
    for(let c=0;c<3;c++)d+=Math.abs(source.colors[a*3+c]!-source.colors[b*3+c]!)/255;
    vertexImportance[a]=Math.max(vertexImportance[a]!,1+d*.5);vertexImportance[b]=Math.max(vertexImportance[b]!,1+d*.5);
  }
  return {protectedVertices,vertexImportance,anchors:Uint32Array.from(Array.from(protectedVertices).flatMap((v,i)=>v?[i]:[]))};
}
const lowerBound=(a:Uint32Array,x:number)=>{let lo=0,hi=a.length;while(lo<hi){const m=(lo+hi)>>>1;if(a[m]!<x)lo=m+1;else hi=m;}return lo;};
function gather<T extends Float32Array|Uint8Array>(a:T,ids:Uint32Array,lanes:number):T{
  const out=(a instanceof Float32Array?new Float32Array(ids.length*lanes):new Uint8Array(ids.length*lanes)) as T;
  for(let i=0;i<ids.length;i++)for(let k=0;k<lanes;k++)out[i*lanes+k]=a[ids[i]!*lanes+k]!;
  return out;
}
/** Source-sample clustering: no averaging of phenotype, coat or skin weights.
 * Part/major-bone/coat-bin separation stops unrelated appendages merging. Grid
 * search is bounded to 18 passes per target. Levels are independent, not nested.
 * A coarse grid can lose small features: droppedFeatures exposes that failure. */
function cluster(source:QuadrupedBodyData,target:number,mask:Uint8Array):FaunaBodyLodLevel{
  const n=source.vertexCount,sourceParts=faunaBodyLodSourceParts(source),vertexPart=new Int16Array(n).fill(-1);
  for(let p=0;p<sourceParts.length;p++){const part=sourceParts[p]!;for(let i=part.firstTriangle*3;i<(part.firstTriangle+part.triangles)*3;i++)vertexPart[source.index[i]!]=p;}
  const bone=new Uint8Array(n),coat=new Uint16Array(n),lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
  for(let v=0;v<n;v++){
    let max=-1;for(let k=0;k<4;k++){const i=v*4+k;if(source.skinWeight[i]!>max){max=source.skinWeight[i]!;bone[v]=source.skinIndex[i]!;}}
    coat[v]=(source.colors[v*3]!>>6)*16+(source.colors[v*3+1]!>>6)*4+(source.colors[v*3+2]!>>6);
    for(let c=0;c<3;c++){lo[c]=Math.min(lo[c]!,source.positions[v*3+c]!);hi[c]=Math.max(hi[c]!,source.positions[v*3+c]!);}
  }
  const span=Math.max(...hi.map((x,c)=>x-lo[c]!));
  function pass(cell:number){
    const groups=new Map<string,{v:number;cost:number}>(),keys:string[]=new Array(n);
    for(let v=0;v<n;v++){
      const cells=[0,1,2].map(c=>Math.floor((source.positions[v*3+c]!-lo[c]!)/cell));
      const key=mask[v]?`anchor/${v}`:`${vertexPart[v]}/${bone[v]}/${coat[v]}/${cells.join('/')}`;keys[v]=key;
      let cost=0;for(let c=0;c<3;c++){const delta=source.positions[v*3+c]!-(lo[c]!+(cells[c]!+.5)*cell);cost+=delta*delta;}
      const prior=groups.get(key);if(!prior||cost<prior.cost)groups.set(key,{v,cost});
    }
    const representative=Uint32Array.from(keys,key=>groups.get(key)!.v),tris:number[]=[];const counts=new Uint32Array(sourceParts.length);
    let part=0;const seen=new Set<string>();
    for(let t=0;t<source.triangleCount;t++){
      while(part+1<sourceParts.length&&t>=sourceParts[part+1]!.firstTriangle)part++;
      const a=representative[source.index[t*3]!]!,b=representative[source.index[t*3+1]!]!,c=representative[source.index[t*3+2]!]!;
      if(a===b||b===c||a===c)continue;
      const canonical=[a,b,c].sort((x,y)=>x-y).join('/');if(seen.has(canonical))continue;
      // Never admit a triangle whose replacement reverses its source face.
      const normal=(x:number,y:number,z:number)=>{
        const ax=source.positions[y*3]!-source.positions[x*3]!,ay=source.positions[y*3+1]!-source.positions[x*3+1]!,az=source.positions[y*3+2]!-source.positions[x*3+2]!;
        const bx=source.positions[z*3]!-source.positions[x*3]!,by=source.positions[z*3+1]!-source.positions[x*3+1]!,bz=source.positions[z*3+2]!-source.positions[x*3+2]!;
        return [ay*bz-az*by,az*bx-ax*bz,ax*by-ay*bx];
      };
      const before=normal(source.index[t*3]!,source.index[t*3+1]!,source.index[t*3+2]!),after=normal(a,b,c);
      if(before[0]!*after[0]!+before[1]!*after[1]!+before[2]!*after[2]!<=0)continue;
      seen.add(canonical);tris.push(a,b,c);counts[part]=counts[part]!+1;
    }
    return {representative,tris,counts};
  }
  let best=pass(span/64),low=span/4096,high=span*2;
  for(let i=0;i<18;i++){
    const cell=Math.sqrt(low*high),trial=pass(cell),count=trial.tris.length/3;
    if(count<=target&&count>best.tris.length/3||best.tris.length/3>target&&count<best.tris.length/3)best=trial;
    if(count>target)low=cell;else high=cell;
  }
  const ids=Uint32Array.from([...new Set(best.tris)].sort((a,b)=>a-b)),remap=new Int32Array(n).fill(-1);ids.forEach((v,i)=>remap[v]=i);
  const index=Uint32Array.from(best.tris,v=>remap[v]!),positions=gather(source.positions,ids,3),normals=gather(source.normals,ids,3),colors=gather(source.colors,ids,3),skinIndex=gather(source.skinIndex,ids,4),skinWeight=gather(source.skinWeight,ids,4);
  let cursor=0;const parts=sourceParts.map((p,i)=>{const result={...p,firstTriangle:cursor,triangles:best.counts[i]!};cursor+=result.triangles;return result;});
  const appendageVertices=source.plan.appendages.reduce((sum,a)=>sum+(a.kind==='ear'?50:16),0),structuralStart=source.bodyVertexCount+appendageVertices;
  const faceFeatures=source.faceFeatures.map(f=>{const p=parts.find(p=>p.label===`${f.kind}/${f.side}`)!;return {...f,firstVertex:lowerBound(ids,f.firstVertex),vertexCount:lowerBound(ids,f.firstVertex+f.vertexCount)-lowerBound(ids,f.firstVertex),firstTriangle:p.firstTriangle,triangleCount:p.triangles};});
  // Representatives address output vertices, as in the existing QEM adapter.
  // An unused cluster gets the nearest retained source sample of its major bone.
  let maxRestDisplacement=0,maxWeightChange=0;
  for(let v=0;v<n;v++){
    let chosen=best.representative[v]!;
    if(remap[chosen]!<0){
      let distance=Infinity;chosen=ids[0]!;
      for(const r of ids){if(bone[r]!==bone[v])continue;let d=0;for(let c=0;c<3;c++)d+=(source.positions[v*3+c]!-source.positions[r*3+c]!)**2;if(d<distance){distance=d;chosen=r;}}
    }
    let d=0,w=0;for(let c=0;c<3;c++)d+=(source.positions[v*3+c]!-source.positions[chosen*3+c]!)**2;
    for(let k=0;k<4;k++)w+=Math.abs(source.skinWeight[v*4+k]!-source.skinWeight[chosen*4+k]!)/255;
    maxRestDisplacement=Math.max(maxRestDisplacement,Math.sqrt(d));maxWeightChange=Math.max(maxWeightChange,w);
    best.representative[v]=remap[chosen]!;
  }
  const triangleCount=index.length/3,reached=triangleCount<=target;
  return {...source,positions,normals,colors,skinIndex,skinWeight,index,vertexCount:ids.length,triangleCount,faceFeatures,
    bodyVertexCount:lowerBound(ids,source.bodyVertexCount),bodyTriangleCount:parts[0]!.triangles,
    structuralVertexCount:lowerBound(ids,structuralStart+source.structuralVertexCount)-lowerBound(ids,structuralStart),structuralTriangleCount:parts.find(p=>p.part==='structural')?.triangles??0,
    target,reached,withinBudget:reached&&ids.length<=target,sourceVertex:ids,representative:best.representative,parts,
    stats:{collapses:n-ids.length,mirroredPairs:0,asymmetricCollapses:0,relaxation:0,maxPlaneError:0,maxWeightChange,maxRestDisplacement,mirrorKept:0},
    droppedFeatures:parts.filter((p,i)=>sourceParts[i]!.triangles>0&&!p.triangles).map(p=>p.label),appendagesPresent:parts.every(p=>!['ear','horn','structural'].includes(p.part)||p.triangles>0),
    byteLength:[positions,normals,colors,skinIndex,skinWeight,index,ids,best.representative].reduce((sum,a)=>sum+a.byteLength,0)};
}
export function buildFaunaBodyLodCandidates(source:QuadrupedBodyData,options:FaunaLodCandidateOptions={}){
  const targets=options.targets??[1500,750,500],methods=options.methods??METHODS;
  if(!methods.length||new Set(methods).size!==methods.length||methods.some(m=>!METHODS.includes(m)))throw new Error('fauna lod candidates: unknown or duplicate method');
  // Existing adapter validates source and targets; baseline is also a useful
  // same-source control and its digest records all original attribute bytes.
  const baseline=buildFaunaBodyLodChain(source,{targets}),c=constraints(source),optionsText=JSON.stringify({targets,footThreshold:96,footImportance:2,coatEdgeImportance:.5,colour:.03,skin:.1,clusterCoatBits:2,clusterPasses:18,mask:digest(c.protectedVertices),importance:digest(new Uint8Array(c.vertexImportance.buffer))});
  const chains:FaunaLodCandidateChain[]=methods.map(method=>({method,version:`${FAUNA_LOD_CANDIDATE_VERSION}/${method}`,optionsHash:textHash(method+optionsText),anchorVertices:c.anchors,
    provenance:{geometryChecksum:baseline.provenance.geometryChecksum,sourceVersion:source.plan.version,constraintVersion:COMPOSER_LOD_CONSTRAINTS_VERSION,options:optionsText,hashKind:'fnv1a-diagnostic'},
    levels:method==='joint-constrained-qem'?buildFaunaBodyLodChain(source,{targets,reducer:{protectedVertices:c.protectedVertices,vertexImportance:c.vertexImportance,colour:.03,skin:.1}}).levels:targets.map(t=>cluster(source,t,c.protectedVertices))}));
  return {source,version:FAUNA_LOD_CANDIDATE_VERSION,baseline,chains};
}

/** Runtime worker path: exact revision-2 constrained reducer without building
 * the unrelated baseline comparison. Source and constraint arithmetic match the
 * review API; the baseline remains available there for paired evidence. */
export function buildFaunaJointConstrainedLodChain(source:QuadrupedBodyData,targets:readonly number[]=[1500,750]){
  faunaBodyLodValidateSource(source);
  const c=constraints(source);
  return buildFaunaBodyLodChain(source,{targets,reducer:{protectedVertices:c.protectedVertices,vertexImportance:c.vertexImportance,colour:.03,skin:.1}});
}
