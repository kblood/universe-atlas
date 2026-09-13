export type RiverSurfaceBankInput={positions:Float64Array;indices:Uint32Array;waterM:Float32Array;depthM:Float32Array};
export type RiverSurfaceBankHit={distanceM:number;triangleIndex:number;barycentric:[number,number,number];nearestX:number;nearestZ:number;waterM:number;depthM:number;candidates:number};
const MAX_TRIANGLES=262144,MAX_BYTES=64*1024*1024,LEAF_SIZE=8;
const boxDistance2=(x:number,z:number,minX:number,minZ:number,maxX:number,maxZ:number)=>{const dx=x<minX?minX-x:x>maxX?x-maxX:0,dz=z<minZ?minZ-z:z>maxZ?z-maxZ:0;return dx*dx+dz*dz;};
/** A compact median BVH over final canonical wet-mesh triangles. The nearest
 * point to their union supplies the exact triangle/edge boundary for a dry bank. */
export class RiverSurfaceBank {
  readonly bounds:Float64Array; readonly children:Int32Array; readonly order:Uint32Array;
  readonly bytes:number; readonly buildTemporaryBytes:number; readonly maxNodes:number; maxDepth=0;
  private nodeCount=0; private readonly stack:Int32Array; readonly input:RiverSurfaceBankInput;
  private readonly result:RiverSurfaceBankHit={distanceM:Infinity,triangleIndex:-1,barycentric:[0,0,0],nearestX:0,nearestZ:0,waterM:0,depthM:0,candidates:0};
  constructor(input:RiverSurfaceBankInput){this.input=input;
    const {positions,indices,waterM,depthM}=input,triangles=indices.length/3;
    if(!Number.isInteger(triangles)||triangles<1||triangles>MAX_TRIANGLES||positions.length%2||waterM.length!==positions.length/2||depthM.length!==waterM.length)throw new Error('invalid or oversized river-surface bank input');
    for(let i=0;i<indices.length;i++)if(indices[i]>=waterM.length)throw new Error('river-surface bank index exceeds vertex data');
    for(let i=0;i<waterM.length;i++)if(!Number.isFinite(positions[i*2])||!Number.isFinite(positions[i*2+1])||!Number.isFinite(waterM[i])||!Number.isFinite(depthM[i])||depthM[i]<0)throw new Error('river-surface bank requires finite positions and nonnegative depth');
    const leaves=Math.ceil(triangles/LEAF_SIZE),nodes=2**(Math.ceil(Math.log2(leaves))+1)-1,estimated=positions.byteLength+indices.byteLength+waterM.byteLength+depthM.byteLength+triangles*(4*8+2*8+4)+nodes*(4*8+2*4+4);
    if(estimated>MAX_BYTES)throw new Error('river-surface bank exceeds bounded allocation');
    const triangleBounds=new Float64Array(triangles*4),centres=new Float64Array(triangles*2);this.order=new Uint32Array(triangles);
    for(let t=0;t<triangles;t++){const ia=indices[t*3]*2,ib=indices[t*3+1]*2,ic=indices[t*3+2]*2,ax=positions[ia],az=positions[ia+1],bx=positions[ib],bz=positions[ib+1],cx=positions[ic],cz=positions[ic+1],o=t*4,minX=Math.min(ax,bx,cx),minZ=Math.min(az,bz,cz),maxX=Math.max(ax,bx,cx),maxZ=Math.max(az,bz,cz);triangleBounds.set([minX,minZ,maxX,maxZ],o);centres[t*2]=(minX+maxX)/2;centres[t*2+1]=(minZ+maxZ)/2;this.order[t]=t;}
    this.buildTemporaryBytes=triangleBounds.byteLength+centres.byteLength;this.maxNodes=nodes;this.bounds=new Float64Array(nodes*4);this.children=new Int32Array(nodes*2);
    const build=(start:number,count:number,depth:number):number=>{const node=this.nodeCount++,bo=node*4;let minX=Infinity,minZ=Infinity,maxX=-Infinity,maxZ=-Infinity;for(let i=start;i<start+count;i++){const o=this.order[i]*4;minX=Math.min(minX,triangleBounds[o]);minZ=Math.min(minZ,triangleBounds[o+1]);maxX=Math.max(maxX,triangleBounds[o+2]);maxZ=Math.max(maxZ,triangleBounds[o+3]);}this.bounds.set([minX,minZ,maxX,maxZ],bo);this.maxDepth=Math.max(this.maxDepth,depth);if(count<=LEAF_SIZE){this.children[node*2]=-(start+1);this.children[node*2+1]=count;return node;}const axis=maxX-minX>=maxZ-minZ?0:1;this.order.subarray(start,start+count).sort((a,b)=>centres[a*2+axis]-centres[b*2+axis]||a-b);const leftCount=count>>1,left=build(start,leftCount,depth+1),right=build(start+leftCount,count-leftCount,depth+1);this.children[node*2]=left;this.children[node*2+1]=right;return node;};
    build(0,triangles,1);this.stack=new Int32Array(this.maxDepth+1);this.bytes=this.bounds.byteLength+this.children.byteLength+this.order.byteLength+this.stack.byteLength;
  }
  /** Returns a borrowed mutable result; copy it before issuing another query. */
  query(x:number,z:number,maxDistanceM=3000):RiverSurfaceBankHit|null{
    if(!Number.isFinite(x)||!Number.isFinite(z)||!Number.isFinite(maxDistanceM)||maxDistanceM<0)return null;
    let best=maxDistanceM*maxDistanceM,top=0,candidates=0,found=false;this.stack[top++]=0;const {positions,indices,waterM,depthM}=this.input,r=this.result;
    while(top){const node=this.stack[--top],bo=node*4;if(boxDistance2(x,z,this.bounds[bo],this.bounds[bo+1],this.bounds[bo+2],this.bounds[bo+3])>best)continue;const left=this.children[node*2],right=this.children[node*2+1];
      if(left>=0){const lo=left*4,ro=right*4,dl=boxDistance2(x,z,this.bounds[lo],this.bounds[lo+1],this.bounds[lo+2],this.bounds[lo+3]),dr=boxDistance2(x,z,this.bounds[ro],this.bounds[ro+1],this.bounds[ro+2],this.bounds[ro+3]);if(dl<dr){if(dr<=best)this.stack[top++]=right;if(dl<=best)this.stack[top++]=left;}else{if(dl<=best)this.stack[top++]=left;if(dr<=best)this.stack[top++]=right;}continue;}
      const start=-left-1;for(let oi=start;oi<start+right;oi++){const triangle=this.order[oi],ia=indices[triangle*3],ib=indices[triangle*3+1],ic=indices[triangle*3+2],a=ia*2,b=ib*2,c=ic*2,ax=positions[a],az=positions[a+1],bx=positions[b],bz=positions[b+1],cx=positions[c],cz=positions[c+1],abx=bx-ax,abz=bz-az,acx=cx-ax,acz=cz-az,det=abx*acz-abz*acx;if(Math.abs(det)<1e-14)continue;candidates++;let u=( (bx-x)*(cz-z)-(bz-z)*(cx-x) )/det,v=((cx-x)*(az-z)-(cz-z)*(ax-x))/det,w=1-u-v,qx=x,qz=z;
        if(u<0||v<0||w<0){let edgeBest=Infinity,eu=0,ev=0,ew=0,ex=ax,ez=az;for(let edge=0;edge<3;edge++){const px=edge===0?ax:edge===1?bx:cx,pz=edge===0?az:edge===1?bz:cz,rx=edge===0?bx:edge===1?cx:ax,rz=edge===0?bz:edge===1?cz:az,dx=rx-px,dz=rz-pz,t=Math.max(0,Math.min(1,((x-px)*dx+(z-pz)*dz)/(dx*dx+dz*dz||1))),sx=px+dx*t,sz=pz+dz*t,dd=(x-sx)*(x-sx)+(z-sz)*(z-sz);if(dd<edgeBest){edgeBest=dd;ex=sx;ez=sz;if(edge===0){eu=1-t;ev=t;ew=0;}else if(edge===1){eu=0;ev=1-t;ew=t;}else{eu=t;ev=0;ew=1-t;}}}u=eu;v=ev;w=ew;qx=ex;qz=ez;}
        const dx=x-qx,dz=z-qz,dist=dx*dx+dz*dz;if(dist<best||(dist===best&&(!found||triangle<r.triangleIndex))){best=dist;found=true;r.triangleIndex=triangle;r.nearestX=qx;r.nearestZ=qz;r.barycentric[0]=u;r.barycentric[1]=v;r.barycentric[2]=w;r.waterM=u*waterM[ia]+v*waterM[ib]+w*waterM[ic];r.depthM=u*depthM[ia]+v*depthM[ib]+w*depthM[ic];}
      }
    }
    if(!found)return null;r.distanceM=Math.sqrt(best);r.candidates=candidates;return r;
  }
}
export const buildRiverSurfaceBank=(input:RiverSurfaceBankInput)=>new RiverSurfaceBank(input);
