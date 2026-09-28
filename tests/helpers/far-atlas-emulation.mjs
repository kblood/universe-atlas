import * as THREE from 'three';
import {rasterTree} from './tree-raster.mjs';
import {forestFarAtlasSphere,FOREST_FAR_ATLAS_LAYOUT as L} from '../../src/forest-far-atlas.ts';
import {hemiTreeViewBlend,treeCaptureBasis,treeHemiCaptureViews} from '../../src/tree-impostor-views.ts';

/** CPU emulation of the far atlas: capture tiles with the reference raster in
 * each hemi view's basis, then reconstruct a view with the same plane
 * intersection, one parallax step and three-view blend as `treeAtlasView`.
 * Measurement/regression only; it is not browser evidence. */
const views=treeHemiCaptureViews(L.grid);
export function rasterGeometry(part){
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(part.position,3));g.setAttribute('_leaf_pivot',new THREE.BufferAttribute(part.pivot,3));
  g.setAttribute('_branch_level',new THREE.BufferAttribute(part.level,1));g.setIndex(new THREE.BufferAttribute(part.index,1));return g;
}
export function captureSphere(tree,variants,cardScale){
  return forestFarAtlasSphere([rasterGeometry(tree.bark),rasterGeometry(tree.foliage)],variants,cardScale);
}
/** One member's tile for view `index`: premultiplied coverage, leaf and
 * encoded front depth, v up (row 0 at the bottom, as in the GL target). */
export function captureTile(tree,{variant,cardScale,sphere,index}){
  const view=views[index],basis={right:view.right,up:view.up,forward:view.towardCamera};
  const r=sphere.radiusM,image=rasterTree(tree,{variant,cardScale,basis,frame:{centerM:sphere.centerM,halfSizeM:r},size:L.tile,ss:L.supersample});
  const n=L.tile,coverage=new Float32Array(n*n),leaf=new Float32Array(n*n),depth=new Float32Array(n*n);
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    const from=y*n+x,to=(n-1-y)*n+x,a=image.coverage[from];
    // Encoded as the GPU capture: (front offset / r) * 0.5 + 0.5, premultiplied.
    coverage[to]=a;leaf[to]=image.foliage[from];depth[to]=a>0?(image.front[from]/r*.5+.5*a):0;
  }
  return {coverage:mips(coverage),leaf:mips(leaf),depth:mips(depth)};
}
/** Box mip chain of a premultiplied tile map, as hardware generates. */
function mips(map){
  const chain=[map];
  for(let n=L.tile;n>1;n/=2){
    const src=chain[chain.length-1],m=n/2,out=new Float32Array(m*m);
    for(let y=0;y<m;y++)for(let x=0;x<m;x++)out[y*m+x]=(src[2*y*n+2*x]+src[2*y*n+2*x+1]+src[(2*y+1)*n+2*x]+src[(2*y+1)*n+2*x+1])/4;
    chain.push(out);
  }
  return chain;
}
function bilinearLevel(map,n,u,v){
  const x=u*n-.5,y=v*n-.5,x0=Math.floor(x),y0=Math.floor(y),fx=x-x0,fy=y-y0;
  const at=(i,j)=>map[Math.min(n-1,Math.max(0,j))*n+Math.min(n-1,Math.max(0,i))];
  return (at(x0,y0)*(1-fx)+at(x0+1,y0)*fx)*(1-fy)+(at(x0,y0+1)*(1-fx)+at(x0+1,y0+1)*fx)*fy;
}
/** Trilinear tap with the shader's tile margin at the coarser level. */
function sample(chain,u,v,lod=0){
  const margin=.5*2**Math.ceil(lod)/L.tile;u=Math.min(1-margin,Math.max(margin,u));v=Math.min(1-margin,Math.max(margin,v));
  const l0=Math.floor(lod),f=lod-l0,l1=Math.min(chain.length-1,l0+1);
  const a=bilinearLevel(chain[l0],L.tile>>l0,u,v);
  return f>0?a*(1-f)+bilinearLevel(chain[l1],L.tile>>l1,u,v)*f:a;
}
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
/** Orthographic reconstruction for `direction` (towards the eye), `size`²
 * pixels spanning the capture sphere, from tiles keyed by view index. The
 * default level matches the pixel footprint, as `treeAtlasLod` does. */
export function reconstruct(tiles,{direction,sphere,size=64,lod=Math.max(0,Math.log2(L.tile/size))}){
  const {views:indices,weights}=hemiTreeViewBlend(direction,L.grid),basis=treeCaptureBasis(direction),r=sphere.radiusM,c=sphere.centerM;
  const coverage=new Float32Array(size*size),leaf=new Float32Array(size*size);
  const rd=basis.towardCamera.map(x=>-x);
  for(let py=0;py<size;py++)for(let px=0;px<size;px++){
    const u=((px+.5)/size*2-1)*r,v=(1-(py+.5)/size*2)*r;
    const ro=[0,1,2].map(i=>c[i]+basis.right[i]*u+basis.up[i]*v+basis.towardCamera[i]*3*r);
    let a=0,l=0;
    for(let k=0;k<3;k++){
      const w=weights[k];if(w<=0)continue;
      const view=views[indices[k]],tile=tiles.get(indices[k]),den=dot(rd,view.towardCamera);if(Math.abs(den)<1e-4)continue;
      const plane=dot([c[0]-ro[0],c[1]-ro[1],c[2]-ro[2]],view.towardCamera);
      const uv=t=>{const p=[0,1,2].map(i=>ro[i]+rd[i]*t-c[i]);return [dot(p,view.right)/(2*r)+.5,dot(p,view.up)/(2*r)+.5];};
      let [su,sv]=uv(plane/den);if(su<0||su>1||sv<0||sv>1)continue;
      let cov=sample(tile.coverage,su,sv,lod);
      if(cov>1e-4){
        const t=(plane+(sample(tile.depth,su,sv,lod)/cov*2-1)*r)/den;[su,sv]=uv(t);
        if(su<0||su>1||sv<0||sv>1)continue;cov=sample(tile.coverage,su,sv,lod);
      }
      a+=w*cov;l+=w*sample(tile.leaf,su,sv,lod);
    }
    coverage[py*size+px]=a;leaf[py*size+px]=l;
  }
  return {coverage,leaf};
}
export function direct(tree,{variant,cardScale,sphere,direction,heightM=16,size=64}){
  const s=heightM/16,basis=treeCaptureBasis(direction);
  return rasterTree(tree,{variant,cardScale,heightM,basis:{right:basis.right,up:basis.up,forward:basis.towardCamera},
    frame:{centerM:sphere.centerM.map(x=>x*s),halfSizeM:sphere.radiusM*s},size,ss:4});
}
/** Box-downsample a size² map to `to`² (the far pixel footprint). */
export function downsample(map,size,to){
  const f=size/to,out=new Float32Array(to*to);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++)out[Math.floor(y/f)*to+Math.floor(x/f)]+=map[y*size+x]/(f*f);
  return out;
}
export function compare(a,b){
  let sa=0,sb=0,l1=0;for(let i=0;i<a.length;i++){sa+=a[i];sb+=b[i];l1+=Math.abs(a[i]-b[i]);}
  return {areaRatio:sa/sb,l1:l1/sb};
}
export const neededViews=direction=>hemiTreeViewBlend(direction,L.grid).views;
