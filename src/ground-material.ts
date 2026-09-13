import * as THREE from 'three';
import {hash64,type V3} from './catalog.ts';
export const MATERIAL_VERSION='ground-material-1';
export const DETAIL_PERIOD_M=4096;
export function detailOrigin(anchor:V3,radius:number):V3{
  return anchor.map(x=>((x*radius)%DETAIL_PERIOD_M+DETAIL_PERIOD_M)%DETAIL_PERIOD_M) as V3;
}
/** Small periodic signal atlas, authored entirely in code. RGBA are scalar
 * grain, rounded gravel, rock fractures and fine sediment signals, not sRGB. */
export function detailPixels(size=256){
  const data=new Uint8Array(size*size*4),seed=Number(hash64(MATERIAL_VERSION)&0xffffffffn);
  const hash=(x:number,y:number,n:number)=>{let h=Math.imul(x,374761393)^Math.imul(y,668265263)^seed^n;h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296;};
  const mod=(x:number,n:number)=>(x%n+n)%n;
  const smooth=(x:number)=>x*x*(3-2*x);
  const field=(x:number,y:number,n:number)=>{
    const ix=Math.floor(x*n),iy=Math.floor(y*n),u=smooth(x*n-ix),v=smooth(y*n-iy);
    const a=hash(mod(ix,n),mod(iy,n),n),b=hash(mod(ix+1,n),mod(iy,n),n),c=hash(mod(ix,n),mod(iy+1,n),n),d=hash(mod(ix+1,n),mod(iy+1,n),n);
    return (a+(b-a)*u)*(1-v)+(c+(d-c)*u)*v;
  };
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const u=(x+.5)/size,v=(y+.5)/size,gx=u*24,gy=v*24,ix=Math.floor(gx),iy=Math.floor(gy);
    let first=10,second=10;
    for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){
      const cx=ix+i,cy=iy+j,dx=cx+hash(mod(cx,24),mod(cy,24),21)-gx,dy=cy+hash(mod(cx,24),mod(cy,24),39)-gy,d=dx*dx+dy*dy;
      if(d<first){second=first;first=d;}else if(d<second)second=d;
    }
    const grain=field(u,v,16)*.45+field(u,v,64)*.35+field(u,v,128)*.2;
    data.set([grain*255,Math.max(0,1-Math.sqrt(first)*1.5)*255,Math.min(1,(Math.sqrt(second)-Math.sqrt(first))*5)*255,field(u,v,128)*255],(y*size+x)*4);
  }
  return {data,width:size};
}
export function detailTexture(anisotropy=1){
  const p=detailPixels(),texture=new THREE.DataTexture(p.data,p.width,p.width);
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;
  texture.generateMipmaps=true;texture.anisotropy=anisotropy;texture.needsUpdate=true;
  return texture;
}
export const groundVertexHeader=`attribute vec4 groundWeights; uniform vec3 groundOrigin; uniform float atlasRadius;
varying vec3 groundPosition,groundNormal; varying vec4 groundMix;`;
export const groundVertex=`groundPosition=transformed*atlasRadius+groundOrigin; groundNormal=normal; groundMix=groundWeights;`;
export const groundFragmentHeader=`
uniform sampler2D groundAtlas; uniform float groundEnabled,groundPatch;
varying vec3 groundPosition,groundNormal; varying vec4 groundMix;
vec4 groundTri(vec3 p,vec3 w){return texture2D(groundAtlas,p.yz)*w.x+texture2D(groundAtlas,p.zx)*w.y+texture2D(groundAtlas,p.xy)*w.z;}
`;
export const groundColor=`
float groundFade=groundEnabled*groundPatch*(1.0-smoothstep(1500.0,6000.0,length(atlasSurface-atlasEye)*atlasRadius));
// The analytic baseline map still supplies all orbital colour. Detail is local.
vec3 groundAxis=pow(abs(normalize(groundNormal)),vec3(4.0));groundAxis/=dot(groundAxis,vec3(1.0));
vec4 groundW=max(groundMix,vec4(0.0));groundW/=max(.001,dot(groundW,vec4(1.0)));
vec4 groundCoarse=vec4(.5),groundFine=vec4(.5);
// Uniform branch keeps texture derivatives valid and skips six fetches on
// disabled or distant patches. Fine per-fragment distance fade stays smooth.
if(groundEnabled*groundPatch>.5){
  groundCoarse=groundTri(groundPosition/16.0,groundAxis);
  groundFine=groundTri(groundPosition,groundAxis);
}
float groundSignal=dot(groundW,vec4(groundFine.a,groundFine.r*.6+groundCoarse.r*.4,groundCoarse.b*.55+groundFine.g*.45,groundFine.a*.3+groundCoarse.r*.7));
float groundWater=atlasAir*step(length(atlasSurface),1.00000005);
groundFade*=1.0-groundWater;
diffuseColor.rgb*=mix(1.0,.52+groundSignal*.96,groundFade);
// Millimetre-scale grain stays subtle at eye height; centimetre amplitudes on
// sub-centimetre atlas features made grazing shores alternate black and gold.
float groundBump=dot(groundW,vec4(groundFine.a*.001,groundFine.r*.002+groundFine.g*.0025,groundCoarse.b*.02+groundFine.g*.004,groundFine.a*.0007))*groundFade;
`;
export const groundNormalCode=`
// Surface-gradient bump mapping: scale metre amplitudes into view-space units.
if(groundEnabled*groundPatch>.5){
vec3 gx=dFdx(-vViewPosition),gy=dFdy(-vViewPosition);
float metresToView=length(gx)/max(.000001,length(dFdx(groundPosition)));
vec3 gr1=cross(gy,normal),gr2=cross(normal,gx);
float gd=dot(gx,gr1);
vec3 gradient=sign(gd)*(dFdx(groundBump)*gr1+dFdy(groundBump)*gr2)*metresToView;
if(abs(gd)>1e-30)normal=normalize(abs(gd)*normal-gradient);
}
`;
