import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {terrainSampler} from '../../src/terrain.ts';
import {waterWorlds,fib} from '../terrain-climate-fixtures.mjs';
import {axisSites} from './mountain-coarse-tiles.mjs';
import {orogenLayout} from '../../src/mountain-layout.ts';

// Test-only full-layout uncarved reference: change only the composition's carve argument
// and bypass the T1 accelerator. Production has no reference/mutation sampler flag.
const terrainSource=readFileSync(new URL('../../src/terrain.ts',import.meta.url),'utf8');
const needle='mountainRidgeTermM(ridgeTermM, o, a0, landFactor, tau, beltCarvingSeeds, carve)';
const beltCall='massifBeltSample(orogen, [d[0], d[1], d[2]], a0, orogenScratch)';
// The truth core's inline T1 voxel prefilter (skips massifBeltSample where it returns the empty sample).
export const voxelSkip='massifAll || (massifVoxels[v >>> 5] & (1 << (v & 31)))';
for(const hook of [needle,beltCall,voxelSkip])if(!terrainSource.includes(hook))throw new Error(`exact reference hook lost: ${hook}`);
const localImports=s=>s.replace(/from (['"])(\.\/[^'"]+)\1/g,(_,q,path)=>`from ${q}${new URL('../../src/'+path.slice(2),import.meta.url).href}${q}`);
const load=s=>import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(localImports(s))).toString('base64'));
const source=terrainSource.replace(needle, 'mountainRidgeTermM(ridgeTermM, o, a0, landFactor, tau, beltCarvingSeeds, false)')
  .replace(beltCall, 'orogen.sampleWithA0([d[0], d[1], d[2]], a0, orogenScratch)').replace(voxelSkip,'true');
export const exactTerrain=await load(source);
// Production with only the voxel prefilter bypassed (every land sample calls massifBeltSample).
export const unskippedTerrain=await load(terrainSource.replace(voxelSkip,'true'));
export const sampler=(body,options,exposeFloor=true)=>terrainSampler(body,[],undefined,false,0,undefined,exposeFloor,options);
export const exactSampler=body=>exactTerrain.terrainSampler(body,[],undefined,false,0,undefined,true,{mountains:true});
export {waterWorlds,fib,orogenLayout};
export function directions(body,total=50000){
  const dirs=Array.from({length:total},(_,i)=>fib(i,total));
  const sites=axisSites(body,{count:4});
  if(sites.length!==4)throw new Error(body.name+': missing four sites');
  for(const {d} of sites){
    const a=[d[1],-d[0],0],l=Math.hypot(...a),t=a.map(x=>x/l),v=[d[1]*t[2]-d[2]*t[1],d[2]*t[0]-d[0]*t[2],d[0]*t[1]-d[1]*t[0]];
    for(let y=-20;y<=20;y++)for(let x=-20;x<=20;x++){
      const p=d.map((q,k)=>q+1500*(x*t[k]+y*v[k])/body.radiusM),n=Math.hypot(...p);dirs.push(p.map(q=>q/n));
    }
  }
  return dirs;
}
export function lookup(field,d,absolute=false){
  const N=field.faceCells,B=N/8,ax=d.map(Math.abs);let k=ax[0]>=ax[1]&&ax[0]>=ax[2]?0:ax[1]>=ax[2]?1:2;
  const face=k*2+(d[k]>0?0:1),fx=(d[[1,0,0][k]]/ax[k]+1)*N/2,fy=(d[[2,2,1][k]]/ax[k]+1)*N/2;
  const i=Math.max(0,Math.min(N-1,Math.floor(fx))),j=Math.max(0,Math.min(N-1,Math.floor(fy))),block=field.blockTable[(face*B+(j>>>3))*B+(i>>>3)]-1,bit=(j&7)*8+(i&7);
  if(block<0||!(field.masks[2*block+(bit>>>5)]&(1<<(bit&31))))return [];
  const wx=fx-i,wy=fy-j,out=[];
  for(let c=field.offsets[block];c<field.offsets[block+1];c++){
    const p=c*81+(j&7)*9+(i&7),a=[0,1,9,10].map(n=>absolute?Math.abs(field.distances[p+n]):field.distances[p+n]);
    out.push({belt:field.candidates[c],sd:(a[0]*(1-wx)+a[1]*wx)*(1-wy)+(a[2]*(1-wx)+a[3]*wx)*wy});
  }
  return out;
}
export function statistics(body){
  const coarse=sampler(body,{mountains:true,lodLevel:0}),exact=exactSampler(body),field=orogenLayout(body).coarseBandField(48000,32000);
  const differences=[];let violations=0,oceanDifferences=0,inactiveDifferences=0,maxError=0;
  for(const d of directions(body)){
    const c=coarse(d),e=exact(d);differences.push(c.floorM-e.floorM);
    if(c.floorM<e.floorM)violations++;
    if(c.ocean!==e.ocean)oceanDifferences++;
    const at=lookup(field,d);
    if(!at.length&&JSON.stringify(c)!==JSON.stringify(e))inactiveDifferences++;
    const o=orogenLayout(body).sampleWithA0(d,1e9);
    if(o.belt>0&&o.halfWidthM>=32000&&Math.abs(o.axisDistanceM)<48000){
      const hit=at.find(x=>x.belt===o.beltIndex);
      if(hit)maxError=Math.max(maxError,Math.abs(hit.sd-o.axisDistanceM/Math.min(o.halfWidthM,48000)));
    }
  }
  differences.sort((a,b)=>a-b);
  return {count:differences.length,violations,oceanDifferences,inactiveDifferences,maxError,p50:differences[Math.floor(differences.length*.5)],p99:differences[Math.floor(differences.length*.99)],max:differences.at(-1)};
}
// Direct internal projection, exposed only in this test module copy.
let layoutSource=readFileSync(new URL('../../src/mountain-layout.ts',import.meta.url),'utf8');
layoutSource+=`\nexport function referenceDistance(b,d,R){const x=dot(d,b.tangent),z=dot(d,b.centre),py=dot(d,b.pole),u=x/(Math.sqrt(x*x+z*z)+z);transverse(b,d,R,u,x,z,py,py*R-offset(b,u)<0?-1:1);return trDistance;}\n`;
layoutSource=layoutSource.replace(/from (['"])(\.\/[^'"]+)\1/g,(_,q,path)=>`from ${q}${new URL('../../src/'+path.slice(2),import.meta.url).href}${q}`);
export const {referenceDistance}=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(layoutSource)).toString('base64'));
export function nodeDirection(face,i,j,N){const d=[0,0,0],k=face>>>1;d[k]=face&1?-1:1;d[[1,0,0][k]]=2*i/N-1;d[[2,2,1][k]]=2*j/N-1;const l=Math.sqrt(d[0]*d[0]+d[1]*d[1]+d[2]*d[2]);return d.map(v=>v/l);}
export function measureError(body,steps=4){
  const layout=orogenLayout(body),f=layout.coarseBandField(48000,32000),N=f.faceCells,B=N/8;
  let max=0,count=0,worst=null,boundary=Infinity;
  for(let q=0;q<f.blockTable.length;q++){
    const block=f.blockTable[q]-1;if(block<0)continue;
    const face=Math.floor(q/(B*B)),i0=q%B*8,j0=Math.floor(q/B)%B*8;
    for(let j=0;j<8;j++)for(let i=0;i<8;i++){
      const bit=j*8+i;if(!(f.masks[block*2+(bit>>>5)]&(1<<(bit&31))))continue;
      for(let c=f.offsets[block];c<f.offsets[block+1];c++){
        const b=layout.belts[f.candidates[c]],p=c*81+j*9+i,H=Math.min(b.halfWidthM,48000);
        for(let y=0;y<=steps;y++)for(let x=0;x<=steps;x++){
          const wx=x/steps,wy=y/steps,d=nodeDirection(face,i0+i+wx,j0+j+wy,N),z=d.reduce((a,v,k)=>a+v*b.centre[k],0),xx=d.reduce((a,v,k)=>a+v*b.tangent[k],0),u=xx/(Math.sqrt(xx*xx+z*z)+z);
          if(Math.abs(u/b.uLimit)>=1)continue;
          const exact=referenceDistance(b,d,body.radiusM)/H;if(Math.abs(exact)>1.25)continue;
          const a=f.distances,sd=(a[p]*(1-wx)+a[p+1]*wx)*(1-wy)+(a[p+9]*(1-wx)+a[p+10]*wx)*wy,error=Math.abs(sd-exact);count++;
          if(error>max){max=error;worst={belt:f.candidates[c],face,i:i0+i,j:j0+j,u:u/b.uLimit,exact,sd};}
        }
      }
    }
  }
  return {max,count,worst};
}
// Zero-margin mutation: exactly the production field/lookup, changing only the composition's delta argument.
let mutantSource=readFileSync(new URL('../../src/terrain.ts',import.meta.url),'utf8');
const deltaCall='massifCoarseRidgeTermM(main,sd,bs[k+8]';
if(!mutantSource.includes(deltaCall))throw new Error('mutation hook lost delta argument');
mutantSource=mutantSource.replace(deltaCall,'massifCoarseRidgeTermM(main,sd,0')
 .replace(/from (['"])(\.\/[^'"]+)\1/g,(_,q,path)=>`from ${q}${new URL('../../src/'+path.slice(2),import.meta.url).href}${q}`);
const mutantTerrain=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(mutantSource)).toString('base64'));
export const mutantSampler=body=>mutantTerrain.terrainSampler(body,[],undefined,false,0,undefined,true,{mountains:true,lodLevel:0});
export function boundaryChecks(body,check){
 const field=orogenLayout(body).coarseBandField(48000,32000),N=field.faceCells,B=N/8,coarse=sampler(body,{mountains:true,lodLevel:0}),plain=sampler(body,{mountains:false});let count=0;
 for(let q=0;q<field.blockTable.length;q++){
  const block=field.blockTable[q]-1;if(block<0)continue;const face=Math.floor(q/(B*B)),i0=q%B*8,j0=Math.floor(q/B)%B*8;
  for(let j=0;j<8;j++)for(let i=0;i<8;i++){
   const bit=j*8+i;if(!(field.masks[2*block+(bit>>>5)]&(1<<(bit&31))))continue;
   for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]){
    if(lookup(field,nodeDirection(face,i0+i+.5+dx,j0+j+.5+dy,N)).length)continue;
    for(const step of [0,.25,.5,.75,1]){
     const x=i0+i+(dx?(.5+.5*dx):step),y=j0+j+(dy?(.5+.5*dy):step),d=nodeDirection(face,x,y,N);check(coarse(d),plain(d));count++;
    }
   }
  }
 }
 return count;
}
