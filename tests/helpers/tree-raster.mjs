import {readFile} from 'node:fs/promises';
import {deflateSync} from 'node:zlib';
import {prepareTreeLODPair} from '../../src/tree-asset.ts';
import {forestVariantPoint,forestVariantRemovesLeaf,forestVariantTwist} from '../../src/tree-structural-variant.ts';
import {decodePngRgba} from './png-rgba.mjs';

/** CPU reference renderer for the packaged Oak/Pine GLBs. Orthographic, rest
 * wind, the same variant/card transform as the detailed vertex shader and the
 * foliage MASK cutoff on the level-zero atlas. Used only for measurement. */
const FILES={branching:['oak-lod0','oak-lod1'],spire:['conifer-lod0','conifer-lod1']};
const REFERENCE_M=16;

function readGlb(bytes){
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),jsonEnd=20+view.getUint32(12,true);
  const doc=JSON.parse(new TextDecoder().decode(bytes.subarray(20,jsonEnd)));
  return {doc,binary:bytes.subarray(jsonEnd+8,jsonEnd+8+view.getUint32(jsonEnd,true))};
}
function accessor({doc,binary},index){
  const a=doc.accessors[index],v=doc.bufferViews[a.bufferView],view=new DataView(binary.buffer,binary.byteOffset,binary.byteLength);
  const start=(v.byteOffset??0)+(a.byteOffset??0);
  if(a.componentType===5126){
    const n={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type],stride=v.byteStride??n*4,out=new Float32Array(a.count*n);
    for(let i=0;i<a.count;i++)for(let c=0;c<n;c++)out[i*n+c]=view.getFloat32(start+i*stride+c*4,true);
    return out;
  }
  const size=a.componentType===5125?4:a.componentType===5123?2:1,out=new Uint32Array(a.count);
  for(let i=0;i<a.count;i++)out[i]=size===4?view.getUint32(start+i*4,true):size===2?view.getUint16(start+i*2,true):view.getUint8(start+i);
  return out;
}
const cache=new Map();
export async function loadRasterTree(kind,lod){
  const key=`${kind}/${lod}`;if(cache.has(key))return cache.get(key);
  const [a,b]=await Promise.all(FILES[kind].map(name=>readFile(new URL(`../../public/assets/forest/desktop-v1/${kind}/${name}.glb`,import.meta.url))));
  const buffers=[a,b].map(x=>x.buffer.slice(x.byteOffset,x.byteOffset+x.byteLength));
  const {foliagePng}=prepareTreeLODPair(buffers[0],buffers[1]),atlas=decodePngRgba(foliagePng);
  const glb=readGlb(new Uint8Array(buffers[lod]));
  const parts=glb.doc.meshes[0].primitives.map(p=>({
    position:accessor(glb,p.attributes.POSITION),uv:accessor(glb,p.attributes.TEXCOORD_0),pivot:accessor(glb,p.attributes._LEAF_PIVOT),
    level:accessor(glb,p.attributes._BRANCH_LEVEL),index:accessor(glb,p.indices)}));
  const tree={kind,lod,bark:parts[0],foliage:parts[1],atlas};cache.set(key,tree);return tree;
}
/** Tree-frame metres after the shader transform (rest wind). */
export function deformedPositions(part,variant,heightM,cardScale){
  const n=part.position.length/3,out=new Float32Array(n*3),s=heightM/REFERENCE_M;
  for(let i=0;i<n;i++){
    const p=[part.position[i*3],part.position[i*3+1],part.position[i*3+2]];
    let r;
    if(part.level[i]>3.5){
      const q=[part.pivot[i*3],part.pivot[i*3+1],part.pivot[i*3+2]];
      const scale=forestVariantRemovesLeaf(variant,q)?0:cardScale;
      const pivot=forestVariantPoint(variant,[q[0]*s,q[1]*s,q[2]*s],heightM);
      const theta=forestVariantTwist(variant,q[1],REFERENCE_M),c=Math.cos(theta),sn=Math.sin(theta);
      const o=[p[0]-q[0],p[1]-q[1],p[2]-q[2]],t=[c*o[0]+sn*o[2],o[1],-sn*o[0]+c*o[2]];
      r=[pivot[0]+t[0]*scale,pivot[1]+t[1]*scale,pivot[2]+t[2]*scale];
    }else r=forestVariantPoint(variant,[p[0]*s,p[1]*s,p[2]*s],heightM);
    out.set(r,i*3);
  }
  return out;
}
/** Orthographic frame looking along -direction (direction points to the eye). */
export function viewBasis(direction){
  const [dx,dy,dz]=direction,l=Math.hypot(dx,dy,dz),f=[dx/l,dy/l,dz/l];
  let up=Math.abs(f[1])>.999?[0,0,-Math.sign(f[1])]:[0,1,0];
  const right=[up[1]*f[2]-up[2]*f[1],up[2]*f[0]-up[0]*f[2],up[0]*f[1]-up[1]*f[0]],rl=Math.hypot(...right);
  for(let i=0;i<3;i++)right[i]/=rl;
  up=[f[1]*right[2]-f[2]*right[1],f[2]*right[0]-f[0]*right[2],f[0]*right[1]-f[1]*right[0]];
  return {right,up,forward:f};
}
/** Returns per-pixel coverage (0..1 from ss×ss samples) and foliage fraction.
 * `frame` = {centerM:[x,y,z], halfSizeM}. */
export function rasterTree(tree,{variant=null,heightM=REFERENCE_M,cardScale=1,direction=[1,0,0],frame,size=256,ss=2}){
  const {right,up}=viewBasis(direction),N=size*ss,depth=new Float32Array(N*N).fill(-Infinity),kind=new Uint8Array(N*N);
  const {forward}=viewBasis(direction);
  const scale=N/(2*frame.halfSizeM);
  const {atlas}=tree;
  for(const [partIndex,part] of [[1,tree.bark],[2,tree.foliage]]){
    const p=deformedPositions(part,variant,heightM,cardScale),n=p.length/3,sx=new Float32Array(n),sy=new Float32Array(n),sz=new Float32Array(n);
    for(let i=0;i<n;i++){
      const x=p[i*3]-frame.centerM[0],y=p[i*3+1]-frame.centerM[1],z=p[i*3+2]-frame.centerM[2];
      sx[i]=(x*right[0]+y*right[1]+z*right[2])*scale+N/2;sy[i]=N/2-(x*up[0]+y*up[1]+z*up[2])*scale;sz[i]=x*forward[0]+y*forward[1]+z*forward[2];
    }
    const idx=part.index,uv=part.uv;
    for(let t=0;t<idx.length;t+=3){
      const a=idx[t],b=idx[t+1],c=idx[t+2];
      const area=(sx[b]-sx[a])*(sy[c]-sy[a])-(sx[c]-sx[a])*(sy[b]-sy[a]);if(Math.abs(area)<1e-12)continue;
      const x0=Math.max(0,Math.floor(Math.min(sx[a],sx[b],sx[c]))),x1=Math.min(N-1,Math.ceil(Math.max(sx[a],sx[b],sx[c])));
      const y0=Math.max(0,Math.floor(Math.min(sy[a],sy[b],sy[c]))),y1=Math.min(N-1,Math.ceil(Math.max(sy[a],sy[b],sy[c])));
      for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
        const px=x+.5,py=y+.5;
        const w0=((sx[b]-px)*(sy[c]-py)-(sx[c]-px)*(sy[b]-py))/area,w1=((sx[c]-px)*(sy[a]-py)-(sx[a]-px)*(sy[c]-py))/area,w2=1-w0-w1;
        if(w0<0||w1<0||w2<0)continue;
        const d=w0*sz[a]+w1*sz[b]+w2*sz[c],o=y*N+x;if(d<=depth[o])continue;
        if(partIndex===2){
          const u=w0*uv[a*2]+w1*uv[b*2]+w2*uv[c*2],v=w0*uv[a*2+1]+w1*uv[b*2+1]+w2*uv[c*2+1];
          const tx=Math.min(atlas.width-1,Math.max(0,Math.floor((u-Math.floor(u))*atlas.width)));
          const ty=Math.min(atlas.height-1,Math.max(0,Math.floor((v-Math.floor(v))*atlas.height)));
          if(atlas.data[(ty*atlas.width+tx)*4+3]<128)continue;
        }
        depth[o]=d;kind[o]=partIndex;
      }
    }
  }
  const coverage=new Float32Array(size*size),foliage=new Float32Array(size*size);
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){
    const k=kind[y*N+x];if(!k)continue;const o=Math.floor(y/ss)*size+Math.floor(x/ss);
    coverage[o]+=1/(ss*ss);if(k===2)foliage[o]+=1/(ss*ss);
  }
  return {size,coverage,foliage};
}
/** Grayscale (or RGB triplets) 8-bit PNG writer for evidence images. */
export function encodePng(width,height,rgb){
  const raw=Buffer.alloc((width*3+1)*height);
  for(let y=0;y<height;y++){raw[y*(width*3+1)]=0;for(let i=0;i<width*3;i++)raw[y*(width*3+1)+1+i]=rgb[y*width*3+i];}
  const crcTable=Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
  const crc=buf=>{let c=0xffffffff;for(const b of buf)c=crcTable[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;};
  const chunk=(name,data)=>{const len=Buffer.alloc(4);len.writeUInt32BE(data.length);const body=Buffer.concat([Buffer.from(name,'ascii'),data]);
    const c=Buffer.alloc(4);c.writeUInt32BE(crc(body));return Buffer.concat([len,body,c]);};
  const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(width,0);ihdr.writeUInt32BE(height,4);ihdr[8]=8;ihdr[9]=2;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
}
