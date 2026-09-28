import * as THREE from 'three';

/** Shared approximation for local solid surfaces. This preserves the existing
 * terrain response; it is not a multiple-scattering atmosphere model. */
export const LOCAL_AERIAL_VERSION='local-aerial-1';
const attachedMaterials=new WeakSet<THREE.Material>();
export const localAerialGLSL=`
vec3 atlasApplyLocalAir(vec3 radiance,float distanceM,float eyeHeightM,float surfaceHeightM,float sunCosine,float enabled){
  float airHeight=max(0.0,(eyeHeightM+surfaceHeightM)*.5);
  float airFog=enabled*min(.92,1.0-exp(-distanceM/65000.0*exp(-airHeight/14000.0)));
  float daylight=smoothstep(-.15,.15,sunCosine);
  radiance=mix(radiance,mix(vec3(.020,.032,.055),vec3(.23,.43,.64),daylight),airFog);
  return mix(radiance,max(radiance,vec3(.007,.011,.018)),airFog);
}
`;

export function localAerialReference(radiance:readonly number[],distanceM:number,eyeHeightM:number,surfaceHeightM:number,sunCosine:number,enabled=1){
  const height=Math.max(0,(eyeHeightM+surfaceHeightM)*.5);
  const fog=enabled*Math.min(.92,1-Math.exp(-Math.max(0,distanceM)/65000*Math.exp(-height/14000)));
  const t=Math.max(0,Math.min(1,(sunCosine+.15)/.3)),day=t*t*(3-2*t);
  const night=[.020,.032,.055],noon=[.23,.43,.64],floor=[.007,.011,.018];
  return radiance.map((v,i)=>{const haze=night[i]+(noon[i]-night[i])*day,x=v+(haze-v)*fog;return x+(Math.max(x,floor[i])-x)*fog;});
}

/** Instance transforms remain in their existing local precision frames. The
 * GPU uses view-space distance; the planet-relative position is needed only
 * for kilometre-scale density and daylight, not fine terrain or collision.
 * Each supplied mesh must own its material (one material per batch is enough). */
export function attachLocalAerial(mesh:THREE.Mesh,planet:THREE.Object3D,radiusM:number,sun:{value:THREE.Vector3},enabled={value:1},eyeHeight?:{value:number},surfaceHit?:{local:string;view:string}){
  if(Array.isArray(mesh.material))throw new Error('Local aerial attachment expects one material per batch');
  const material=mesh.material;
  if(attachedMaterials.has(material))throw new Error('Local aerial material is already attached');
  attachedMaterials.add(material);
  const uniforms={
    atlasAirObjectToPlanet:{value:new THREE.Matrix4()},atlasAirRadius:{value:radiusM},
    atlasAirMetresPerViewUnit:{value:1},atlasAirEyeHeight:eyeHeight??{value:0},atlasAirSun:sun,
    atlasAirEnabled:enabled,
  };
  const compile=material.onBeforeCompile;
  const inheritedKey=material.customProgramCacheKey===THREE.Material.prototype.customProgramCacheKey?()=>compile.toString():material.customProgramCacheKey.bind(material);
  material.onBeforeCompile=(shader,renderer)=>{
    compile.call(material,shader,renderer);
    const missing=!shader.vertexShader.includes('#include <project_vertex>')?'project_vertex':!shader.fragmentShader.includes('#include <opaque_fragment>')?'opaque_fragment':null;
    if(missing){material.userData.localAerialVersion=`failed:${missing}`;return;}
    material.userData.localAerialVersion=LOCAL_AERIAL_VERSION;
    Object.assign(shader.uniforms,uniforms);
    shader.vertexShader='uniform mat4 atlasAirObjectToPlanet; varying vec3 atlasAirPlanetPosition,atlasAirViewPosition;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
      vec4 atlasAirLocalPosition=vec4(transformed,1.0);
      #ifdef USE_INSTANCING
        atlasAirLocalPosition=instanceMatrix*atlasAirLocalPosition;
      #endif
      atlasAirPlanetPosition=(atlasAirObjectToPlanet*atlasAirLocalPosition).xyz;
      atlasAirViewPosition=mvPosition.xyz;`);
    shader.fragmentShader=`uniform mat4 atlasAirObjectToPlanet;
      uniform float atlasAirRadius,atlasAirMetresPerViewUnit,atlasAirEyeHeight,atlasAirEnabled;
      uniform vec3 atlasAirSun;varying vec3 atlasAirPlanetPosition,atlasAirViewPosition;
      ${localAerialGLSL}\n`+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
      vec3 atlasSurfacePlanet=${surfaceHit?`(atlasAirObjectToPlanet*vec4(${surfaceHit.local},1.0)).xyz`:'atlasAirPlanetPosition'};
      outgoingLight=atlasApplyLocalAir(outgoingLight,length(${surfaceHit?.view??'atlasAirViewPosition'})*atlasAirMetresPerViewUnit,
        atlasAirEyeHeight,(length(atlasSurfacePlanet)-1.0)*atlasAirRadius,
        dot(normalize(atlasSurfacePlanet),atlasAirSun),atlasAirEnabled);
      #include <opaque_fragment>`);
  };
  material.customProgramCacheKey=()=>inheritedKey()+'/'+LOCAL_AERIAL_VERSION+'/'+(surfaceHit?`${surfaceHit.local}/${surfaceHit.view}`:'mesh');
  material.userData.localAerialVersion=LOCAL_AERIAL_VERSION;material.needsUpdate=true;
  const inversePlanet=new THREE.Matrix4(),eye=new THREE.Vector3(),scale=new THREE.Vector3();
  const before=mesh.onBeforeRender;
  mesh.onBeforeRender=(renderer,scene,camera,geometry,mat,group)=>{
    before.call(mesh,renderer,scene,camera,geometry,mat,group);
    inversePlanet.copy(planet.matrixWorld).invert();
    uniforms.atlasAirObjectToPlanet.value.multiplyMatrices(inversePlanet,mesh.matrixWorld);
    eye.setFromMatrixPosition(camera.matrixWorld).applyMatrix4(inversePlanet);
    if(!eyeHeight)uniforms.atlasAirEyeHeight.value=(eye.length()-1)*radiusM;
    scale.setFromMatrixScale(planet.matrixWorld);
    uniforms.atlasAirMetresPerViewUnit.value=radiusM/Math.max(1e-20,Math.abs(scale.x));
  };
  return uniforms;
}
