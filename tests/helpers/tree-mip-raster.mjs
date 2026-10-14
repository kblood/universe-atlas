import {readFile} from 'node:fs/promises';
import {deformedPositions,viewBasis} from './tree-raster.mjs';
import {sampleTreeFoliageTrilinearAlpha} from '#tree-kit/v1/assets';

/** CPU emulation of the GPU foliage pass at a given pixel footprint: one sample
 * per pixel centre, per-triangle mip level λ from the UV Jacobian (as the GPU's
 * dFdx/dFdy), GL_LINEAR_MIPMAP_LINEAR alpha on the packaged coverage mip chain
 * and an alpha test against `cutoff(λ)`. Orthographic; measurement only. */
export async function loadFoliageMipChain(kind,atlas){
  const dir=new URL(`../../public/assets/forest/desktop-v1/${kind}/`,import.meta.url);
  const manifest=JSON.parse(await readFile(new URL('foliage-mip-manifest.json',dir),'utf8')),data=await readFile(new URL('foliage-mips.rgba8',dir));
  return {manifest,levels:[{width:atlas.width,height:atlas.height,data:atlas.data},
    ...manifest.sidecar.levels.map(l=>({width:l.width,height:l.height,data:data.subarray(l.offset,l.offset+l.byteLength)}))]};
}
export function mipRasterArea(tree,levels,{cardScale,direction,frame,pixelM,heightM=16,cutoff}){
  const {right,up,forward}=viewBasis(direction),N=Math.ceil(2*frame.halfSizeM/pixelM),scale=1/pixelM,maxLevel=levels.length-1;
  const depth=new Float32Array(N*N).fill(-Infinity),kind=new Uint8Array(N*N);
  for(const [partIndex,part] of [[1,tree.bark],[2,tree.foliage]]){
    const p=deformedPositions(part,null,heightM,cardScale),n=p.length/3,sx=new Float32Array(n),sy=new Float32Array(n),sz=new Float32Array(n);
    for(let i=0;i<n;i++){const x=p[i*3]-frame.centerM[0],y=p[i*3+1]-frame.centerM[1],z=p[i*3+2]-frame.centerM[2];
      sx[i]=(x*right[0]+y*right[1]+z*right[2])*scale+N/2;sy[i]=N/2-(x*up[0]+y*up[1]+z*up[2])*scale;sz[i]=x*forward[0]+y*forward[1]+z*forward[2];}
    const idx=part.index,uv=part.uv;
    for(let t=0;t<idx.length;t+=3){
      const a=idx[t],b=idx[t+1],c=idx[t+2];
      const area=(sx[b]-sx[a])*(sy[c]-sy[a])-(sx[c]-sx[a])*(sy[b]-sy[a]);if(Math.abs(area)<1e-12)continue;
      let lambda=0,threshold=0;
      if(partIndex===2){
        const du1=uv[b*2]-uv[a*2],dv1=uv[b*2+1]-uv[a*2+1],du2=uv[c*2]-uv[a*2],dv2=uv[c*2+1]-uv[a*2+1];
        const x1=sx[b]-sx[a],y1=sy[b]-sy[a],x2=sx[c]-sx[a],y2=sy[c]-sy[a],det=x1*y2-x2*y1;
        const dudx=(du1*y2-du2*y1)/det,dvdx=(dv1*y2-dv2*y1)/det,dudy=(du2*x1-du1*x2)/det,dvdy=(dv2*x1-dv1*x2)/det;
        const rho=Math.max(Math.hypot(dudx*levels[0].width,dvdx*levels[0].height),Math.hypot(dudy*levels[0].width,dvdy*levels[0].height));
        lambda=Math.min(maxLevel,Math.max(0,Math.log2(Math.max(rho,1e-8))));threshold=cutoff(lambda);
      }
      const x0=Math.max(0,Math.floor(Math.min(sx[a],sx[b],sx[c]))),x1=Math.min(N-1,Math.ceil(Math.max(sx[a],sx[b],sx[c])));
      const y0=Math.max(0,Math.floor(Math.min(sy[a],sy[b],sy[c]))),y1=Math.min(N-1,Math.ceil(Math.max(sy[a],sy[b],sy[c])));
      for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
        const px=x+.5,py=y+.5;
        const w0=((sx[b]-px)*(sy[c]-py)-(sx[c]-px)*(sy[b]-py))/area,w1=((sx[c]-px)*(sy[a]-py)-(sx[a]-px)*(sy[c]-py))/area,w2=1-w0-w1;
        if(w0<0||w1<0||w2<0)continue;
        const d=w0*sz[a]+w1*sz[b]+w2*sz[c],o=y*N+x;if(d<=depth[o])continue;
        if(partIndex===2){const u=w0*uv[a*2]+w1*uv[b*2]+w2*uv[c*2],v=w0*uv[a*2+1]+w1*uv[b*2+1]+w2*uv[c*2+1];
          if(sampleTreeFoliageTrilinearAlpha(levels,u,v,lambda)<threshold)continue;}
        depth[o]=d;kind[o]=partIndex;
      }
    }
  }
  let covered=0;for(let i=0;i<N*N;i++)if(kind[i])covered++;
  return covered*pixelM*pixelM;
}

/** Per-pixel geometric normal of the visible surface (cards flipped toward the
 * viewer, as DoubleSide shading does) with the base-level MASK test. kind 2 = leaf. */
export function normalRaster(tree,{direction,frame,N,cardScale,heightM=16}){
  const {right,up,forward}=viewBasis(direction),scale=N/(2*frame.halfSizeM),atlas=tree.atlas;
  const depth=new Float32Array(N*N).fill(-Infinity),normal=new Float32Array(N*N*3),kind=new Uint8Array(N*N);
  for(const [partIndex,part] of [[1,tree.bark],[2,tree.foliage]]){
    const p=deformedPositions(part,null,heightM,cardScale),n=p.length/3,sx=new Float32Array(n),sy=new Float32Array(n),sz=new Float32Array(n);
    for(let i=0;i<n;i++){const x=p[i*3]-frame.centerM[0],y=p[i*3+1]-frame.centerM[1],z=p[i*3+2]-frame.centerM[2];
      sx[i]=(x*right[0]+y*right[1]+z*right[2])*scale+N/2;sy[i]=N/2-(x*up[0]+y*up[1]+z*up[2])*scale;sz[i]=x*forward[0]+y*forward[1]+z*forward[2];}
    const idx=part.index,uv=part.uv;
    for(let t=0;t<idx.length;t+=3){
      const a=idx[t],b=idx[t+1],c=idx[t+2];
      const area=(sx[b]-sx[a])*(sy[c]-sy[a])-(sx[c]-sx[a])*(sy[b]-sy[a]);if(Math.abs(area)<1e-12)continue;
      const e1=[p[b*3]-p[a*3],p[b*3+1]-p[a*3+1],p[b*3+2]-p[a*3+2]],e2=[p[c*3]-p[a*3],p[c*3+1]-p[a*3+1],p[c*3+2]-p[a*3+2]];
      let nn=[e1[1]*e2[2]-e1[2]*e2[1],e1[2]*e2[0]-e1[0]*e2[2],e1[0]*e2[1]-e1[1]*e2[0]];const length=Math.hypot(...nn);if(!length)continue;
      nn=nn.map(x=>x/length);if(nn[0]*forward[0]+nn[1]*forward[1]+nn[2]*forward[2]<0)nn=nn.map(x=>-x);
      const x0=Math.max(0,Math.floor(Math.min(sx[a],sx[b],sx[c]))),x1=Math.min(N-1,Math.ceil(Math.max(sx[a],sx[b],sx[c])));
      const y0=Math.max(0,Math.floor(Math.min(sy[a],sy[b],sy[c]))),y1=Math.min(N-1,Math.ceil(Math.max(sy[a],sy[b],sy[c])));
      for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
        const px=x+.5,py=y+.5;
        const w0=((sx[b]-px)*(sy[c]-py)-(sx[c]-px)*(sy[b]-py))/area,w1=((sx[c]-px)*(sy[a]-py)-(sx[a]-px)*(sy[c]-py))/area,w2=1-w0-w1;
        if(w0<0||w1<0||w2<0)continue;
        const d=w0*sz[a]+w1*sz[b]+w2*sz[c],o=y*N+x;if(d<=depth[o])continue;
        if(partIndex===2){const u=w0*uv[a*2]+w1*uv[b*2]+w2*uv[c*2],v=w0*uv[a*2+1]+w1*uv[b*2+1]+w2*uv[c*2+1];
          const tx=Math.min(atlas.width-1,Math.max(0,Math.floor((u-Math.floor(u))*atlas.width))),ty=Math.min(atlas.height-1,Math.max(0,Math.floor((v-Math.floor(v))*atlas.height)));
          if(atlas.data[(ty*atlas.width+tx)*4+3]<128)continue;}
        depth[o]=d;kind[o]=partIndex;normal.set(nn,o*3);
      }
    }
  }
  return {N,kind,normal};
}
