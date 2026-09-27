import * as THREE from 'three';
import type {RenderProfile} from './render-profile.ts';
import { cloudCoverAt, type CloudParams } from './planet-clouds.ts';
import { hash64, noise } from './catalog.ts';

/** Presentation version: catalogue and cloudCoverAt identities are unchanged. */
export const VOLUMETRIC_CLOUDS_VERSION = 'cloud-volume-2';
export const CLOUD_TARGET_BUDGET_BYTES=160*1024*1024;
export function supportedCloudSceneSamples(colour:readonly number[],depth:readonly number[],maxSamples:number){
  return [...new Set(colour)].filter(n=>Number.isInteger(n)&&n>0&&depth.includes(n)&&n<=maxSamples).sort((a,b)=>b-a);
}
export function cloudTargetBytesPerPixel(samples:number,resolution:number){return 12+12*samples+8*resolution*resolution;}
const WEATHER_WIDTH=128, WEATHER_HEIGHT=64;
const noiseDataCache=new Map<number,Uint8Array>();
export type CloudQuality = 'desktop' | 'immersive';
export const CLOUD_QUALITY = Object.freeze({
  desktop: { resolution: 1, steps: 64, lightSteps: 5 },
  immersive: { resolution: .5, steps: 32, lightSteps: 3 },
});

/** Analytic reference used by the cloud lab and regression checks. */
export function cloudTransmittance(extinctionPerM: number, distanceM: number) {
  return Math.exp(-Math.max(0, extinctionPerM) * Math.max(0, distanceM));
}
export function cloudLayerHeights(params: CloudParams) {
  const scale = params.gasGiant ? 7 : Math.min(1, Math.max(.12, params.radiusM / 2e6));
  return { baseM: 800 * scale, lowTopM: 4200 * scale, highBaseM: 6500 * scale, topM: 8500 * scale };
}

/** Tileable, integer-seeded noise. Generated code assets, no external textures. */
export function createCloudNoise(size = 48) {
  const hash = (x: number, y: number, z: number) => {
    let h = Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(z, 83492791) ^ 0x41a71;
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b); return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  };
  const mod = (v: number, n: number) => (v % n + n) % n;
  const noise = (x: number, y: number, z: number, n: number) => {
    const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
    const smooth = (v: number) => v * v * (3 - 2 * v);
    const a = smooth(x - ix), b = smooth(y - iy), c = smooth(z - iz);
    let value = 0;
    for (let k = 0; k < 2; k++) for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++)
      value += hash(mod(ix + i, n), mod(iy + j, n), mod(iz + k, n)) * (i ? a : 1-a) * (j ? b : 1-b) * (k ? c : 1-c);
    return value;
  };
  const cellular=(x:number,y:number,z:number,n:number)=>{
    const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z);let nearest=2;
    for(let k=-1;k<=1;k++)for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){
      const a=mod(ix+i,n),b=mod(iy+j,n),c=mod(iz+k,n);
      const dx=ix+i+hash(a,b,c)-x,dy=iy+j+hash(a+71,b+13,c+19)-y,dz=iz+k+hash(a+31,b+47,c+11)-z;
      nearest=Math.min(nearest,dx*dx+dy*dy+dz*dz);
    }
    return 1-Math.min(1,Math.sqrt(nearest));
  };
  const cached=noiseDataCache.get(size),data=cached??new Uint8Array(size * size * size * 4);
  if(!cached)for (let z = 0; z < size; z++) for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size, v = y / size, w = z / size;
    const i = ((z * size + y) * size + x) * 4;
    data[i] = Math.round(255 * (.8 * noise(u*6,v*6,w*6,6) + .2 * cellular(u*6,v*6,w*6,6)));
    data[i+1] = Math.round(255 * (.65*cellular(u*12,v*12,w*12,12)+.35*noise(u*24,v*24,w*24,24)));
    data[i+2] = Math.round(255 * noise(u*8,v*8,w*8,8)); data[i+3] = 255;
  }
  if(!cached)noiseDataCache.set(size,data);
  const texture = new THREE.Data3DTexture(data, size, size, size);
  texture.format = THREE.RGBAFormat;
  texture.minFilter = THREE.LinearMipmapLinearFilter;texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps=true;
  texture.wrapS = texture.wrapT = texture.wrapR = THREE.RepeatWrapping;
  texture.unpackAlignment = 1; texture.needsUpdate = true;
  return texture;
}

const vertex = `varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;
const fragment = `
precision highp sampler3D;
uniform sampler2D sceneColor, sceneDepth, weather;
uniform sampler3D shape;
uniform mat4 inverseProjection;
uniform mat3 viewToPlanet;
uniform vec3 eyeKm, sun, windOffset, frontOffset;
uniform vec4 heights;
uniform float radiusKm, farPlane, renderUnitsPerKm, steps, lightSteps, coverageScale, extinctionScale, pixelCone, moisture;
uniform bool logarithmicDepth, cloudsEnabled, gasGiant;
varying vec2 vUv;
const float PI=3.14159265359;
float integrationFootprint=0.;
vec2 sphere(vec3 p,vec3 d,float r){
  float b=dot(p,d), c=(length(p)-r)*(length(p)+r), h=b*b-c;
  if(h<0.)return vec2(1.,-1.);h=sqrt(h);return vec2(-b-h,-b+h);
}
float coverage(vec3 p){
  vec3 n=normalize(p);
  vec2 uv=vec2(atan(n.z,-n.x)/(2.*PI),acos(clamp(n.y,-1.,1.))/PI);
  float climate=texture2D(weather,uv).r;
  if(gasGiant)return clamp(climate*coverageScale,0.,1.);
  float angle=windOffset.x/5040.*2.*PI;
  vec3 fronts=vec3(cos(angle)*n.x-sin(angle)*n.z,n.y,sin(angle)*n.x+cos(angle)*n.z)*1.6+frontOffset;
  fronts+=(textureLod(shape,fronts*.37,0.).rgb-.5)*.45;
  float macro=textureLod(shape,fronts,0.).b*.65+textureLod(shape,fronts*2.+.31,0.).b*.25+textureLod(shape,fronts*4.+.73,0.).b*.10;
  // The coarse climate map modulates a continuous 3D front field. Thresholding
  // the low-resolution equirectangular map alone exposed a latitude/longitude grid.
  return clamp(smoothstep(.38,.66,macro)*coverageScale,0.,1.)*moisture;
}
float density(vec3 p,bool detail){
  float h=length(p)-radiusKm;
  if(h<heights.x||h>heights.w)return 0.;
  float cover=coverage(p); if(cover<.015)return 0.;
  vec3 q=vec3(.8*p.x+.6*p.z,p.y,-.6*p.x+.8*p.z)+windOffset;
  float footprint=max(max(.001,distance(p,eyeKm)*pixelCone),integrationFootprint);
  float lod=max(0.,log2(footprint/(18./48.)));
  vec4 n=textureLod(shape,q*vec3(1.,2.,1.)/18.,lod);
  // Regional structure survives orbital sampling while individual billows filter out.
  vec3 warp=(textureLod(shape,q/2520.,0.).rgb-.5)*300.;
  vec3 region=(q+warp)/2520.;
  float regional=textureLod(shape,region,max(0.,log2(footprint/(2520./48.)))).b*.65+textureLod(shape,region*2.+.37,max(0.,log2(footprint/(1260./48.)))).b*.35;
  cover*=.4+.6*smoothstep(.25,.70,regional);
  float lowHeight=(h-heights.x)/(heights.y-heights.x);
  float low=smoothstep(0.,.08,lowHeight)*(1.-smoothstep(.65,1.,lowHeight));
  // A rounded top with a flatter condensation base; broad weather permits clear gaps.
  float threshold=.66-cover*.40 + .13*smoothstep(.2,1.,lowHeight);
  float closeBody=smoothstep(threshold,threshold+.14,n.r);
  float farBody=pow(smoothstep(.04,.65,cover),2.)*.4;
  float body=mix(closeBody,farBody,smoothstep(.4,4.,footprint))*low;
  if(detail&&body>0.)body=max(0.,body-(textureLod(shape,q/7.,max(0.,log2(footprint/(7./48.)))).g-.35)*.22*(1.-smoothstep(.1,.8,footprint)));
  float highHeight=(h-heights.z)/(heights.w-heights.z);
  float high=smoothstep(0.,.12,highHeight)*(1.-smoothstep(.82,1.,highHeight));
  float wisps=smoothstep(.58,.78,textureLod(shape,q*vec3(1.,4.,.35)/24.,max(0.,log2(footprint/(24./48.)))).b)*high*cover*.12;
  return max(0.,body+wisps)*extinctionScale;
}
float hg(float c,float g){return (1.-g*g)/(4.*PI*pow(max(.001,1.+g*g-2.*g*c),1.5));}
float sunTransmission(vec3 p){
  // A solid planet occludes sunlight, including on the night side of the deck.
  vec2 ground=sphere(p,sun,radiusKm); if(ground.y>=ground.x&&ground.x>0.)return 0.;
  float distance=max(0.,sphere(p,sun,radiusKm+heights.w).y);
  float lightLength=min(distance,18.),tau=0.;
  // Resolve the first tens of metres: uniform kilometre steps skipped the
  // current billow and made sunlit and shadowed interiors equally white.
  for(int j=0;j<5;j++){
    if(float(j)>=lightSteps)break;
    float a=pow(float(j)/lightSteps,3.)*lightLength,b=pow((float(j)+1.)/lightSteps,3.)*lightLength;
    tau+=density(p+sun*(a+b)*.5,false)*(b-a);
  }
  return exp(-tau);
}
void main(){
  vec4 scene=texture2D(sceneColor,vUv);
  if(!cloudsEnabled){gl_FragColor=vec4(0.);}
  else{
    vec4 nearRay=inverseProjection*vec4(vUv*2.-1.,0.,1.);
    vec3 cameraRay=normalize(nearRay.xyz/nearRay.w), ray=normalize(viewToPlanet*cameraRay);
    float depth=texture2D(sceneDepth,vUv).r, limit=1e15;
    if(depth<.9999999){
      float viewDistance;
      if(logarithmicDepth)viewDistance=exp2(depth*log2(farPlane+1.))-1.;
      else{vec4 p=inverseProjection*vec4(vUv*2.-1.,depth*2.-1.,1.);viewDistance=-p.z/p.w;}
      limit=viewDistance/max(.00001,-cameraRay.z)/renderUnitsPerKm;
    }
    vec2 bounds=sphere(eyeKm,ray,radiusKm+heights.w);
    float start=max(0.,bounds.x),finish=min(bounds.y,limit);
    vec2 planet=sphere(eyeKm,ray,radiusKm);
    if(planet.y>=planet.x&&planet.x>0.)finish=min(finish,planet.x);
    // Skip the empty interior of the cloud shell; at most two intervals remain.
    vec2 inner=sphere(eyeKm,ray,radiusKm+heights.x);
    float nearEnd=finish,farStart=finish;
    if(inner.y>=inner.x&&inner.y>start&&inner.x<finish){nearEnd=clamp(inner.x,start,finish);farStart=clamp(inner.y,start,finish);}
    float firstLength=max(0.,nearEnd-start),total=firstLength+max(0.,finish-farStart);
    vec3 radiance=vec3(0.);float trans=1.;
    if(total>0.){
      float exponent=length(eyeKm)<radiusKm+heights.w?2.:1.;
      float jitter=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))));
      float phase=mix(hg(dot(ray,sun),.72),hg(dot(ray,sun),-.2),.18)*4.*PI;
      for(int i=0;i<64;i++){
        if(float(i)>=steps||trans<.008)break;
        float left=pow(float(i)/steps,exponent)*total,right=pow((float(i)+1.)/steps,exponent)*total;
        float ds=right-left,travel=mix(left,right,.2+.6*jitter);
        integrationFootprint=ds*.2;
        float t=travel<firstLength?start+travel:farStart+travel-firstLength;
        vec3 p=eyeKm+ray*t;
        float rho=density(p,true);if(rho<.0001)continue;
        float attenuation=exp(-rho*ds), sunlight=sunTransmission(p);
        float day=smoothstep(-.12,.08,dot(normalize(p),sun));
        // Approximate higher scattering orders: broad, less directional light.
        float multi=.32*sqrt(sunlight)+.12*pow(sunlight,.25);
        vec3 direct=vec3(1.,.96,.89)*(sunlight*min(phase,6.)*.55+multi*.6)*day;
        float sunset=1.-smoothstep(0.,.25,max(0.,dot(normalize(p),sun)));
        direct*=mix(vec3(1.),vec3(1.,.48,.22),sunset*.75);
        vec3 ambient=mix(vec3(.008,.012,.022),vec3(.10,.14,.21),day);
        vec3 lighting=direct+ambient;
        // Conservative aerial perspective: keep far clouds in the sky's colour family.
        float haze=1.-exp(-max(0.,t)*.0015);
        lighting=mix(lighting,vec3(.24,.36,.55)*day,haze*.65);
        radiance+=trans*(1.-attenuation)*lighting;
        trans*=attenuation;
      }
    }
    gl_FragColor=vec4(radiance,1.-trans);
  }
}`;

const resolveFragment=fragment.slice(0,fragment.indexOf('void main(){'))+`
uniform sampler2D cloudColor;
uniform vec2 cloudSize;
void main(){
  vec4 background=texture2D(sceneColor,vUv);
  float depth=texture2D(sceneDepth,vUv).r;
  if(cloudsEnabled&&depth<.9999999){
    vec4 clip=inverseProjection*vec4(vUv*2.-1.,0.,1.);
    vec3 cameraRay=normalize(clip.xyz/clip.w),ray=normalize(viewToPlanet*cameraRay);
    float viewDistance;
    if(logarithmicDepth)viewDistance=exp2(depth*log2(farPlane+1.))-1.;
    else{vec4 p=inverseProjection*vec4(vUv*2.-1.,depth*2.-1.,1.);viewDistance=-p.z/p.w;}
    vec3 p=eyeKm+ray*(viewDistance/max(.00001,-cameraRay.z)/renderUnitsPerKm);
    float h=length(p)-radiusKm;
    if(h<heights.w&&h>-.1){
      float start=max(0.,sphere(p,sun,radiusKm+heights.x).y);
      vec3 entry=p+sun*start;
      float shade=sunTransmission(entry);
      // Scene lighting does not expose separate direct/ambient buffers yet.
      // Preserve ambient illumination instead of blackening shadowed terrain.
      float daylight=smoothstep(0.,.2,dot(normalize(p),sun));
      background.rgb*=mix(1.,.68+.32*shade,daylight);
    }
  }
  vec2 grid=vUv*cloudSize-.5,base=floor(grid),f=fract(grid);
  vec4 cloud=vec4(0.);float weight=0.;
  // Depth-aware spatial resolve preserves terrain edges without frame history.
  for(int y=0;y<2;y++)for(int x=0;x<2;x++){
    vec2 uv=(base+vec2(float(x),float(y))+.5)/cloudSize;
    float d=texture2D(sceneDepth,uv).r;
    float w=(x==0?1.-f.x:f.x)*(y==0?1.-f.y:f.y);
    w*=exp(-abs(d-depth)*1600.)+.0001;
    cloud+=texture2D(cloudColor,uv)*w;weight+=w;
  }
  cloud/=max(weight,.00001);
  gl_FragColor=vec4(cloud.rgb+(1.-cloud.a)*background.rgb,background.a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/** Depth-aware cloud pass. Capture each XR eye separately; no shared eye history,
 * no temporal accumulation, and no seed/state changes on origin shifts. */
export class VolumetricClouds {
  readonly material: THREE.ShaderMaterial;
  readonly scene = new THREE.Scene();
  readonly resolveScene = new THREE.Scene();
  readonly resolveMaterial: THREE.ShaderMaterial;
  readonly resolveMesh: THREE.Mesh;
  readonly mesh: THREE.Mesh;
  readonly weather: THREE.DataTexture;
  readonly noise = createCloudNoise();
  enabled = true;
  coverageScale = 1;
  extinctionScale = 2.2;
  /** Desktop AA experiment. Zero preserves the existing capture. Selection is
   * limited to sample counts supported by both colour and depth renderbuffers. */
  sceneSamples:0|2|4=0;
  private effectiveSceneSamples=0;
  private samplesContext:WebGL2RenderingContext|null=null;
  private supportedSceneSamples:number[]=[];
  private targets: THREE.WebGLRenderTarget[] = [];
  private cloudTargets: THREE.WebGLRenderTarget[] = [];
  private lastWeatherKey = '';
  private inverseGroup = new THREE.Matrix4();
  private stateSun = new THREE.Vector3(1,0,0);
  private wind = new THREE.Vector3();
  private captures: { camera: THREE.Camera; target: THREE.WebGLRenderTarget }[] = [];
  private disposed = false;
  private sceneResolutionScale=1;
  private targetBudgetBytes=CLOUD_TARGET_BUDGET_BYTES;
  readonly params: CloudParams;
  readonly group: THREE.Object3D;
  constructor(params: CloudParams, group: THREE.Object3D) {
    this.params=params;this.group=group;
    this.enabled=params.hasAtmosphere&&(params.hasOcean||!!params.gasGiant);
    this.weather = new THREE.DataTexture(new Uint8Array(WEATHER_WIDTH*WEATHER_HEIGHT*4),WEATHER_WIDTH,WEATHER_HEIGHT);
    this.weather.wrapS=THREE.RepeatWrapping;this.weather.minFilter=this.weather.magFilter=THREE.LinearFilter;
    const h=cloudLayerHeights(params);
    this.material=new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:fragment,
      uniforms:{sceneColor:{value:null},sceneDepth:{value:null},weather:{value:this.weather},shape:{value:this.noise},
        inverseProjection:{value:new THREE.Matrix4()},viewToPlanet:{value:new THREE.Matrix3()},
        eyeKm:{value:new THREE.Vector3()},sun:{value:this.stateSun},windOffset:{value:this.wind},frontOffset:{value:new THREE.Vector3()},gasGiant:{value:!!params.gasGiant},
        heights:{value:new THREE.Vector4(h.baseM,h.lowTopM,h.highBaseM,h.topM).multiplyScalar(.001)},
        radiusKm:{value:params.radiusM*.001},farPlane:{value:1e9},renderUnitsPerKm:{value:1},
        steps:{value:64},lightSteps:{value:5},coverageScale:{value:1},extinctionScale:{value:2.2},pixelCone:{value:.002},
        moisture:{value:params.hasAtmosphere&&(params.hasOcean||params.gasGiant)?(params.gasGiant?1:Math.exp(-(((params.temperatureK-280)/70)**2))):0},
        logarithmicDepth:{value:true},cloudsEnabled:{value:true}},depthTest:false,depthWrite:false,toneMapped:false});
    this.mesh=new THREE.Mesh(new THREE.PlaneGeometry(2,2),this.material);this.mesh.frustumCulled=false;
    const configureView=(camera:THREE.Camera)=>{
      const index=Math.max(0,this.captures.findIndex(v=>v.camera===camera));
      const entry=this.captures[index];if(!entry)return;
      const c=entry.camera as THREE.PerspectiveCamera,u=this.material.uniforms;
      u.sceneColor.value=entry.target.texture;u.sceneDepth.value=entry.target.depthTexture;
      u.inverseProjection.value.copy(c.projectionMatrixInverse);u.farPlane.value=c.far;
      const frame=new THREE.Matrix4().multiplyMatrices(this.inverseGroup,c.matrixWorld);
      u.viewToPlanet.value.setFromMatrix4(new THREE.Matrix4().extractRotation(frame));
      u.eyeKm.value.setFromMatrixPosition(frame).multiplyScalar(this.params.radiusM*.001);
      u.pixelCone.value=2/Math.max(1e-6,c.projectionMatrix.elements[5])/Math.max(1,this.cloudTargets[index]?.height??entry.target.height*.5);
    };
    this.mesh.onBeforeRender=(_r,_s,camera)=>configureView(camera);
    this.scene.add(this.mesh);
    this.resolveMaterial=new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:resolveFragment,
      uniforms:{...this.material.uniforms,cloudColor:{value:null},cloudSize:{value:new THREE.Vector2()}},depthTest:false,depthWrite:false});
    this.resolveMesh=new THREE.Mesh(new THREE.PlaneGeometry(2,2),this.resolveMaterial);this.resolveMesh.frustumCulled=false;
    this.resolveMesh.onBeforeRender=(_r,_s,camera)=>{
      configureView(camera);
      const i=Math.max(0,this.captures.findIndex(v=>v.camera===camera)),entry=this.captures[i];if(!entry)return;
      const u=this.resolveMaterial.uniforms,target=this.cloudTargets[i];
      u.sceneColor.value=entry.target.texture;u.sceneDepth.value=entry.target.depthTexture;u.cloudColor.value=target.texture;
      u.cloudSize.value.set(target.width,target.height);
    };
    this.resolveScene.add(this.resolveMesh);
  }
  update(seed:string,address:string,time:bigint,sun:THREE.Vector3) {
    this.stateSun.copy(sun).normalize();
    // Exact bigint reduction keeps far-future dates finite and replayable.
    // 5040 km is a common period of all shape, erosion and regional noise tiles.
    const period=504_000_000_000_000n,phase=Number((time%period+period)%period)/Number(period);
    this.wind.set(phase*5040,0,0);
    const interval=5_000_000_000n,bucket=time/interval-(time<0n&&time%interval!==0n?1n:0n),weatherDate=bucket*interval;
    const key=seed+'/'+address+'/'+bucket;
    if(key===this.lastWeatherKey)return;this.lastWeatherKey=key;
    const data=this.weather.image.data as Uint8Array;
    const weatherSeed=Number(hash64(seed+'/'+address+'/regional-weather')&0xffffffffn);
    this.material.uniforms.frontOffset.value.set((weatherSeed&255)/17,((weatherSeed>>>8)&255)/19,((weatherSeed>>>16)&255)/23);
    const weatherPhase=Number((weatherDate%period+period)%period)/Number(period)*Math.PI*2;
    for(let y=0;y<WEATHER_HEIGHT;y++)for(let x=0;x<WEATHER_WIDTH;x++){
      const theta=(x+.5)/WEATHER_WIDTH*Math.PI*2,phi=(y+.5)/WEATHER_HEIGHT*Math.PI;
      const d:[number,number,number]=[-Math.cos(theta)*Math.sin(phi),Math.cos(phi),Math.sin(theta)*Math.sin(phi)];
      const sample=cloudCoverAt(seed,address,this.params,d,weatherDate);
      const rotated=[Math.cos(weatherPhase)*d[0]-Math.sin(weatherPhase)*d[2],d[1],Math.sin(weatherPhase)*d[0]+Math.cos(weatherPhase)*d[2]];
      const fronts=noise(rotated[0]*5+11,rotated[1]*5+31,rotated[2]*5+17,weatherSeed);
      // Retain the dated availability/climate field; temperate decks use regional
      // fronts rather than the original gas-giant-like latitude bands alone.
      const cover=this.params.gasGiant?sample.coverage:Math.max(0,Math.min(1,(fronts*.72+sample.coverage*.28-.18)*1.6))*(sample.coverage>0?1:0);
      const i=(y*WEATHER_WIDTH+x)*4;data[i]=data[i+1]=data[i+2]=Math.round(cover*255);data[i+3]=255;
    }
    this.weather.needsUpdate=true;
  }
  render(renderer:THREE.WebGLRenderer,scene:THREE.Scene,camera:THREE.PerspectiveCamera,profile?:RenderProfile) {
    if(this.disposed)return false;
    const xr=renderer.xr.enabled,presenting=renderer.xr.isPresenting;
    const oldTarget=renderer.getRenderTarget(),oldAuto=renderer.autoClear;
    const oldInfoAuto=renderer.info.autoReset;
    const oldViewport=renderer.getViewport(new THREE.Vector4()),oldScissor=renderer.getScissor(new THREE.Vector4()),oldScissorTest=renderer.getScissorTest();
    if(presenting&&renderer.xr.cameraAutoUpdate)renderer.xr.updateCamera(camera);
    const views:THREE.Camera[]=presenting?[...renderer.xr.getCamera().cameras]:[camera];
    while(this.targets.length>views.length)this.targets.pop()!.dispose();
    while(this.cloudTargets.length>views.length)this.cloudTargets.pop()!.dispose();
    if(!views.length)return false;
    const quality=CLOUD_QUALITY[presenting?'immersive':'desktop'];
    this.targetBudgetBytes=presenting?96*1024*1024:CLOUD_TARGET_BUDGET_BYTES;
    const size=renderer.getDrawingBufferSize(new THREE.Vector2());
    const nativePixels=views.reduce((sum,view)=>{const v=(view as THREE.PerspectiveCamera&{viewport?:THREE.Vector4}).viewport;return sum+(presenting?v!.z*v!.w:size.x*size.y);},0);
    if(this.sceneSamples>0&&!presenting){
      const gl=renderer.getContext() as WebGL2RenderingContext;
      if(gl!==this.samplesContext){
        this.samplesContext=gl;
        const colour=Array.from(gl.getInternalformatParameter(gl.RENDERBUFFER,gl.RGBA16F,gl.SAMPLES) as Int32Array);
        const depth=Array.from(gl.getInternalformatParameter(gl.RENDERBUFFER,gl.DEPTH_COMPONENT24,gl.SAMPLES) as Int32Array);
        this.supportedSceneSamples=supportedCloudSceneSamples(colour,depth,renderer.capabilities.maxSamples);
      }
      this.effectiveSceneSamples=this.supportedSceneSamples.find(n=>n<=this.sceneSamples)??0;
    }else this.effectiveSceneSamples=0;
    // Resolved colour/depth (12), multisample renderbuffers (12 per sample),
    // and the cloud integration target. This remains an allocation estimate.
    const bytesPerScenePixel=cloudTargetBytesPerPixel(this.effectiveSceneSamples,quality.resolution);
    this.sceneResolutionScale=Math.min(1,Math.sqrt((this.targetBudgetBytes-2*1024*1024)/(bytesPerScenePixel*Math.max(1,nativePixels))));
    this.group.updateWorldMatrix(true,false);this.inverseGroup.copy(this.group.matrixWorld).invert();
    const worldScale=this.group.getWorldScale(new THREE.Vector3()).x;
    const u=this.material.uniforms;
    u.renderUnitsPerKm.value=worldScale/this.params.radiusM*1000;
    u.steps.value=quality.steps;u.lightSteps.value=quality.lightSteps;
    u.coverageScale.value=this.coverageScale;u.extinctionScale.value=this.extinctionScale;
    u.logarithmicDepth.value=renderer.capabilities.logarithmicDepthBuffer;u.cloudsEnabled.value=this.enabled;
    this.captures=[];
    try{
      if(oldInfoAuto)renderer.info.reset();renderer.info.autoReset=false;
      renderer.xr.enabled=false;renderer.autoClear=true;
      for(let i=0;i<views.length;i++){
        const view=views[i] as THREE.PerspectiveCamera & {viewport?:THREE.Vector4};
        const width=Math.max(1,Math.ceil((presenting?view.viewport!.z:size.x)*this.sceneResolutionScale*quality.resolution));
        const height=Math.max(1,Math.ceil((presenting?view.viewport!.w:size.y)*this.sceneResolutionScale*quality.resolution));
        // Preserve scene resolution within the shared target memory cap.
        const fullWidth=Math.round(width/quality.resolution),fullHeight=Math.round(height/quality.resolution);
        if(!this.targets[i]||this.targets[i].samples!==this.effectiveSceneSamples){
          this.targets[i]?.dispose();
          const target=new THREE.WebGLRenderTarget(fullWidth,fullHeight,{type:THREE.HalfFloatType,depthBuffer:true});
          target.samples=this.effectiveSceneSamples;target.resolveDepthBuffer=true;
          target.depthTexture=new THREE.DepthTexture(fullWidth,fullHeight,THREE.UnsignedIntType);this.targets[i]=target;
        }
        const target=this.targets[i];if(target.width!==fullWidth||target.height!==fullHeight)target.setSize(fullWidth,fullHeight);
        renderer.setRenderTarget(target);renderer.setScissorTest(false);
        if(profile)profile.pass('sceneCapture',()=>renderer.render(scene,view));else renderer.render(scene,view);
        this.captures.push({camera:view,target});
        if(!this.cloudTargets[i])this.cloudTargets[i]=new THREE.WebGLRenderTarget(width,height,{type:THREE.HalfFloatType,depthBuffer:false});
        const cloudTarget=this.cloudTargets[i];if(cloudTarget.width!==width||cloudTarget.height!==height)cloudTarget.setSize(width,height);
        renderer.setRenderTarget(cloudTarget);
        if(profile)profile.pass('cloudIntegration',()=>renderer.render(this.scene,view));else renderer.render(this.scene,view);
      }
      renderer.xr.enabled=xr;renderer.setRenderTarget(oldTarget);
      renderer.setViewport(oldViewport);renderer.setScissor(oldScissor);renderer.setScissorTest(oldScissorTest);
      if(profile)profile.pass('cloudResolve',()=>renderer.render(this.resolveScene,camera));else renderer.render(this.resolveScene,camera);
    }finally{
      renderer.xr.enabled=xr;renderer.autoClear=oldAuto;renderer.info.autoReset=oldInfoAuto;renderer.setRenderTarget(oldTarget);
      renderer.setViewport(oldViewport);renderer.setScissor(oldScissor);renderer.setScissorTest(oldScissorTest);
    }
    return true;
  }
  get allocatedBytes(){return this.targets.reduce((n,t)=>n+t.width*t.height*12*(1+t.samples),0)+this.cloudTargets.reduce((n,t)=>n+t.width*t.height*8,0)+Math.ceil(this.noise.image.data!.byteLength*(1+8/7))+this.weather.image.data!.byteLength*2;}
  diagnostics(){return {version:VOLUMETRIC_CLOUDS_VERSION,enabled:this.enabled,representation:'raymarched-volume',temporalHistory:false,steps:this.material.uniforms.steps.value,lightSteps:this.material.uniforms.lightSteps.value,requestedSceneSamples:this.sceneSamples,effectiveSceneSamples:this.effectiveSceneSamples,supportedSceneSamples:this.supportedSceneSamples,estimatedTargetBytes:this.targets.reduce((n,t)=>n+t.width*t.height*12*(1+t.samples),0)+this.cloudTargets.reduce((n,t)=>n+t.width*t.height*8,0),estimatedBytes:this.allocatedBytes,targetBudgetBytes:this.targetBudgetBytes,sceneResolutionScale:this.sceneResolutionScale,eyes:this.captures.length,targets:this.targets.map(t=>({width:t.width,height:t.height,samples:t.samples})),cloudTargets:this.cloudTargets.map(t=>({width:t.width,height:t.height})),layers:cloudLayerHeights(this.params)};}
  dispose(){if(this.disposed)return;this.disposed=true;for(const t of [...this.targets,...this.cloudTargets])t.dispose();this.weather.dispose();this.noise.dispose();this.material.dispose();this.resolveMaterial.dispose();this.mesh.geometry.dispose();this.resolveMesh.geometry.dispose();}
}
