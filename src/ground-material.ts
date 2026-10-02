import * as THREE from 'three';
import {hash64,type V3} from './catalog.ts';
import {DRY_SURFACE_ROUGHNESS,WET_SURFACE_ROUGHNESS,groundRoughnessTarget} from './surface-roughness.ts';
export {groundRoughnessTarget} from './surface-roughness.ts';
export const MATERIAL_VERSION='ground-material-1';
export const DETAIL_PERIOD_M=4096;
export const GROUND_PBR_REPEAT_M=2;
export const GROUND_PBR_TEXTURE_SIZE=512;
export const GROUND_PBR_TEXTURE_BYTES=Math.ceil(4*GROUND_PBR_TEXTURE_SIZE*GROUND_PBR_TEXTURE_SIZE*4*4/3);
export const GROUND_ATLAS_BYTES=Math.ceil(256*256*4*(1+4/3));
export const GROUND_RESOURCE_BYTES=GROUND_ATLAS_BYTES+GROUND_PBR_TEXTURE_BYTES;
const SOIL_ALBEDO_ROUGHNESS_URL=new URL('../assets/ground-materials-v1/runtime/soil-albedo-roughness-512.png',import.meta.url).href;
const SOIL_NORMAL_URL=new URL('../assets/ground-materials-v1/runtime/soil-normal-512.png',import.meta.url).href;
const ROCK_ALBEDO_ROUGHNESS_URL=new URL('../assets/ground-materials-v1/runtime/rock-albedo-roughness-512.png',import.meta.url).href;
const ROCK_NORMAL_URL=new URL('../assets/ground-materials-v1/runtime/rock-normal-512.png',import.meta.url).href;

type GroundPbrShared={refs:number;ready:{value:number};failed:boolean;loaded:number;textures:THREE.Texture[];soilColor:THREE.Texture;soilNormal:THREE.Texture;rockColor:THREE.Texture;rockNormal:THREE.Texture};
let sharedGroundPbr:GroundPbrShared|null=null;
export type GroundPbrLease=Pick<GroundPbrShared,'ready'|'soilColor'|'soilNormal'|'rockColor'|'rockNormal'> & {release():void};
/** One shared set of 512px maps for every resident planet renderer. */
export function acquireGroundPbrTextures(anisotropy=1):GroundPbrLease{
  if(!sharedGroundPbr){
    const shared={} as GroundPbrShared;shared.refs=0;shared.ready={value:0};shared.failed=false;shared.loaded=0;shared.textures=[];sharedGroundPbr=shared;
    const loader=new THREE.TextureLoader();
    const make=(url:string,colorSpace:THREE.ColorSpace)=>{
      const texture=loader.load(url,()=>{if(shared.failed)return;if(++shared.loaded===4)shared.ready.value=1;},undefined,()=>{shared.failed=true;shared.ready.value=0;});
      texture.colorSpace=colorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=true;texture.anisotropy=Math.max(1,Math.min(4,anisotropy));
      shared.textures.push(texture);return texture;
    };
    shared.soilColor=make(SOIL_ALBEDO_ROUGHNESS_URL,THREE.SRGBColorSpace);
    shared.soilNormal=make(SOIL_NORMAL_URL,THREE.NoColorSpace);
    shared.rockColor=make(ROCK_ALBEDO_ROUGHNESS_URL,THREE.SRGBColorSpace);
    shared.rockNormal=make(ROCK_NORMAL_URL,THREE.NoColorSpace);
  }
  const lease=sharedGroundPbr;lease.refs++;
  let released=false;
  return {ready:lease.ready,soilColor:lease.soilColor,soilNormal:lease.soilNormal,rockColor:lease.rockColor,rockNormal:lease.rockNormal,release(){
    if(released)return;released=true;lease.refs=Math.max(0,lease.refs-1);
    if(lease.refs===0&&sharedGroundPbr===lease){for(const texture of lease.textures)texture.dispose();sharedGroundPbr=null;}
  }};
}

export function groundPbrMaterialWeights(soil:number,rock:number){
  const s=Math.max(0,Number.isFinite(soil)?soil:0),r=Math.max(0,Number.isFinite(rock)?rock:0),sum=s+r;
  return {coverage:Math.min(1,sum),rockMix:sum>1e-8?r/sum:0};
}
/** GLSL equivalent of surfaceWetnessFromRoughness/groundRoughnessTarget. */
export const groundRoughnessCode=`
float groundBiomeRoughness=dot(groundW,vec4(.96,.92,.84,.73));
float groundSurfaceWetness=clamp((${DRY_SURFACE_ROUGHNESS}-groundSurfaceRoughnessV)/(${DRY_SURFACE_ROUGHNESS}-${WET_SURFACE_ROUGHNESS}),0.0,1.0);
float groundPbrDryRoughness=mix(groundBiomeRoughness,groundPbrRoughness,.68*groundPbrMixWeight);
float groundWetAdjustedRoughness=mix(groundPbrDryRoughness,${WET_SURFACE_ROUGHNESS},groundSurfaceWetness);
roughnessFactor=mix(roughnessFactor,groundWetAdjustedRoughness,groundFade);`;
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
export const groundVertexHeader=`attribute vec4 groundWeights; attribute float groundSurfaceRoughness; uniform vec3 groundOrigin; uniform float atlasRadius;
varying vec3 groundPosition,groundNormal; varying vec4 groundMix; varying float groundSurfaceRoughnessV;`;
export const groundVertex=`groundPosition=transformed*atlasRadius+groundOrigin; groundNormal=normal; groundMix=groundWeights; groundSurfaceRoughnessV=groundSurfaceRoughness;`;
export const groundFragmentHeader=`
uniform sampler2D groundAtlas,groundSoilColorRoughness,groundSoilNormal,groundRockColorRoughness,groundRockNormal; uniform float groundEnabled,groundPatch,groundPbrPatch,groundPbrReady,groundHabitat; uniform mat3 normalMatrix;
varying vec3 groundPosition,groundNormal; varying vec4 groundMix; varying float groundSurfaceRoughnessV;
// Explicit-gradient triplanar fetches: the gradients are taken in uniform
// control flow (dx/dy of the same coordinates the implicit form would use), so
// the fetches may sit behind per-fragment weight tests and are skipped where
// their weight is exactly zero without changing any sampled value.
vec4 groundTri(vec3 p,vec3 w,vec3 dx,vec3 dy){return textureGrad(groundAtlas,p.yz,dx.yz,dy.yz)*w.x+textureGrad(groundAtlas,p.zx,dx.zx,dy.zx)*w.y+textureGrad(groundAtlas,p.xy,dx.xy,dy.xy)*w.z;}
vec4 groundPbrTri(sampler2D t,vec3 p,vec3 w,vec3 dx,vec3 dy){return textureGrad(t,p.yz,dx.yz,dy.yz)*w.x+textureGrad(t,p.zx,dx.zx,dy.zx)*w.y+textureGrad(t,p.xy,dx.xy,dy.xy)*w.z;}
vec3 groundPbrNormalAxisX(vec3 c,float side){vec3 n=normalize(c*2.0-1.0);n.xy*=.78;return normalize(vec3(side*n.z,n.x,n.y));}
vec3 groundPbrNormalAxisY(vec3 c,float side){vec3 n=normalize(c*2.0-1.0);n.xy*=.78;return normalize(vec3(n.y,side*n.z,n.x));}
vec3 groundPbrNormalAxisZ(vec3 c,float side){vec3 n=normalize(c*2.0-1.0);n.xy*=.78;return normalize(vec3(n.x,n.y,side*n.z));}
vec3 groundPbrTriNormal(sampler2D t,vec3 p,vec3 w,vec3 n,vec3 dx,vec3 dy){
 vec3 x=groundPbrNormalAxisX(textureGrad(t,p.yz,dx.yz,dy.yz).rgb,n.x<0.0?-1.0:1.0);
 vec3 y=groundPbrNormalAxisY(textureGrad(t,p.zx,dx.zx,dy.zx).rgb,n.y<0.0?-1.0:1.0);
 vec3 z=groundPbrNormalAxisZ(textureGrad(t,p.xy,dx.xy,dy.xy).rgb,n.z<0.0?-1.0:1.0);
 return normalize(x*w.x+y*w.y+z*w.z);
}
`;
export const groundColor=`
float groundFade=groundEnabled*groundPatch*(1.0-smoothstep(1500.0,6000.0,length(atlasLocalM-atlasLocalEyeM)));
// The analytic baseline map still supplies all orbital colour. Detail is local.
vec3 groundAxis=pow(abs(normalize(groundNormal)),vec3(4.0));groundAxis/=dot(groundAxis,vec3(1.0));
vec4 groundW=max(groundMix,vec4(0.0));groundW/=max(.001,dot(groundW,vec4(1.0)));
vec4 groundCoarse=vec4(.5),groundFine=vec4(.5),groundMacro=vec4(.5);
float groundPbrMixWeight=0.0,groundPbrRoughness=.9;
vec4 groundSoilPbr=vec4(1.0),groundRockPbr=vec4(1.0),groundSoilMean=vec4(1.0),groundRockMean=vec4(1.0),groundPbrColor=vec4(1.0);
vec3 groundPbrObjectNormal=normalize(groundNormal);
// Screen-space gradients of the ground position, taken in uniform control flow.
vec3 groundDx=dFdx(groundPosition),groundDy=dFdy(groundPosition);
// The uniform branch skips the fetches on disabled or distant patches; inside
// it, fragments past the fine distance fade (weight exactly zero) skip them too.
if(groundEnabled*groundPatch>.5&&groundFade>0.0){
  groundCoarse=groundTri(groundPosition/16.0,groundAxis,groundDx/16.0,groundDy/16.0);
  groundFine=groundTri(groundPosition,groundAxis,groundDx,groundDy);
  groundMacro=groundTri(groundPosition/256.0,groundAxis,groundDx/256.0,groundDy/256.0);
}
// Sand keeps the atlas grain and pebbles; only soil and rock sample the photographs.
float groundSoilRockWeight=groundW.y+groundW.z;
float groundPbrRockMix=groundW.z/max(groundSoilRockWeight,.0001);
float groundPbrFade=1.0-smoothstep(600.0,1800.0,length(atlasLocalM-atlasLocalEyeM));
groundPbrMixWeight=groundPbrReady*groundPbrPatch*groundPbrFade*min(1.0,groundSoilRockWeight);
// Every PBR term is scaled by groundPbrMixWeight or by a rock/soil mix, so a
// fragment whose weight is exactly zero keeps the defaults above bit-for-bit.
if(groundEnabled*groundPatch>.5&&groundPbrPatch>.5&&groundPbrReady>.5&&groundPbrMixWeight>0.0){
  vec3 groundPbrPos=groundPosition/${GROUND_PBR_REPEAT_M.toFixed(1)},groundPbrDx=groundDx/${GROUND_PBR_REPEAT_M.toFixed(1)},groundPbrDy=groundDy/${GROUND_PBR_REPEAT_M.toFixed(1)};
  vec3 soilN=groundPbrObjectNormal,rockN=groundPbrObjectNormal;
  if(groundPbrRockMix<1.0){
    groundSoilPbr=groundPbrTri(groundSoilColorRoughness,groundPbrPos,groundAxis,groundPbrDx,groundPbrDy);
    groundSoilMean=textureLod(groundSoilColorRoughness,vec2(.5),16.0);
    soilN=groundPbrTriNormal(groundSoilNormal,groundPbrPos,groundAxis,groundNormal,groundPbrDx,groundPbrDy);
  }
  if(groundPbrRockMix>0.0){
    groundRockPbr=groundPbrTri(groundRockColorRoughness,groundPbrPos,groundAxis,groundPbrDx,groundPbrDy);
    groundRockMean=textureLod(groundRockColorRoughness,vec2(.5),16.0);
    rockN=groundPbrTriNormal(groundRockNormal,groundPbrPos,groundAxis,groundNormal,groundPbrDx,groundPbrDy);
  }
  groundPbrColor=mix(groundSoilPbr,groundRockPbr,groundPbrRockMix);
  groundPbrRoughness=groundPbrColor.a;
  groundPbrObjectNormal=normalize(mix(soilN,rockN,groundPbrRockMix));
}
float groundSignal=dot(groundW,vec4(groundFine.a,groundFine.r*.6+groundCoarse.r*.4,groundCoarse.b*.55+groundFine.g*.45,groundFine.a*.3+groundCoarse.r*.7));
// Metre-scale patches break up the uniform orbital tint without introducing a
// new height field or stretching a photograph over the planet. All periods
// divide the 4096 m anchor period so neighboring tiles agree at their seams.
// Climate reaches walking height through the macro colour itself (no new
// attribute): a green-dominant base colour (moist, temperate) grows turf; a
// saturated but weakly green or brown one (dry) dries to pale straw. The
// thresholds sit between the measured olive dry-upland colour (green margin
// about .19 in linear RGB) and the moist lowland/coast colours (.55-.71).
float groundMaxC=max(diffuseColor.r,max(diffuseColor.g,diffuseColor.b)),groundMinC=min(diffuseColor.r,min(diffuseColor.g,diffuseColor.b));
float greenness=smoothstep(.12,.40,(diffuseColor.g-max(diffuseColor.r,diffuseColor.b))/max(diffuseColor.g,.001));
float dryness=groundHabitat*groundW.y*(1.0-greenness)*smoothstep(.25,.50,(groundMaxC-groundMinC)/max(groundMaxC,.001));
float turf=groundHabitat*groundW.y*smoothstep(.40,.61,groundMacro.r)*greenness;
vec3 turfColor=mix(vec3(.072,.089,.031),vec3(.105,.145,.050),groundCoarse.r);
vec3 dirtColor=diffuseColor.rgb*mix(vec3(.72,.69,.61),vec3(1.05,1.01,.88),groundMacro.a);
// Pale straw: luminance-normalised hue (1.20,.99,.62), lifted 45% (cured grass and dry soil are bright).
dirtColor=mix(dirtColor,dot(dirtColor,vec3(.2126,.7152,.0722))*vec3(1.74,1.44,.90),.75*dryness);
vec3 groundAlbedo=mix(dirtColor,turfColor,turf*.72);
// Habitable-world sand is pale quartz beach whatever the inland palette; other
// worlds keep their own sand colour from the macro map.
groundAlbedo=mix(groundAlbedo,vec3(.46,.38,.25)*mix(.90,1.08,groundMacro.a),groundHabitat*smoothstep(0.0,.6,groundW.x));
float pebble=smoothstep(.63,.84,groundFine.g)*(groundW.x*.35+groundW.y*.12);
groundAlbedo=mix(groundAlbedo,vec3(.22,.21,.18),pebble);
// Ratio detail (the planet-rocks precedent): the photographs add only relative
// detail around their own 1x1-mip mean, so the climate palette stays
// authoritative instead of one brown soil photo painting every biome.
if(groundPbrMixWeight>0.0&&groundSoilRockWeight>.001){
  groundAlbedo*=mix(vec3(1.0),clamp(groundPbrColor.rgb/max(mix(groundSoilMean.rgb,groundRockMean.rgb,groundPbrRockMix),vec3(.03)),vec3(.45),vec3(1.7)),.68*groundPbrMixWeight);
}
// Snow reads slightly cool rather than as warm sand.
groundAlbedo=mix(groundAlbedo,groundAlbedo*vec3(.96,.98,1.02),groundW.w);
diffuseColor.rgb=mix(diffuseColor.rgb,groundAlbedo*(.82+groundSignal*.32),groundFade);
// Millimetre-scale grain stays subtle at eye height; centimetre amplitudes on
// sub-centimetre atlas features made grazing shores alternate black and gold.
float groundFootprint=max(length(groundDx),length(groundDy));
float fineNormalFade=1.0-smoothstep(.008,.08,groundFootprint);
float groundBump=(dot(groundW,vec4(groundFine.a*.001,groundFine.r*.002+groundFine.g*.0025,groundFine.g*.004,groundFine.a*.0007))*fineNormalFade+groundW.z*groundCoarse.b*.012)*groundFade;
`;
export const groundNormalCode=`
// Surface-gradient bump mapping: scale metre amplitudes into view-space units.
if(groundEnabled*groundPatch>.5){
vec3 groundPbrViewNormal=normalize(normalMatrix*groundPbrObjectNormal);
normal=normalize(mix(normal,groundPbrViewNormal,.78*groundPbrMixWeight));
vec3 gx=dFdx(-vViewPosition),gy=dFdy(-vViewPosition);
float metresToView=length(gx)/max(.000001,length(dFdx(groundPosition)));
vec3 gr1=cross(gy,normal),gr2=cross(normal,gx);
float gd=dot(gx,gr1);
vec3 gradient=sign(gd)*(dFdx(groundBump)*gr1+dFdy(groundBump)*gr2)*metresToView;
if(abs(gd)>1e-30){
  vec3 perturb=gradient/abs(gd);
  // A grazing sample must not turn its normal beneath the surface. Small
  // surface texture is bounded independently from the true terrain normal.
  perturb*=min(1.0,.35/max(.00001,length(perturb)));
  normal=normalize(normal-perturb);
}
}
`;
