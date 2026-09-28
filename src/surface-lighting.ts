import * as THREE from 'three';

export const SURFACE_SHADOW = {widthM:320, depthM:1000, mapSize:2048, normalBiasM:.06} as const;
/** Linear sky-dome colour and the linear albedo of the surroundings. The lower
 * hemisphere radiates what that ground reflects: albedo x (direct sun on the
 * ground + sky dome). The previous code used the albedo itself as that
 * radiance, about a fifth of the reflected sunlight at midday, which left
 * shaded flanks, bellies, legs and trunks near black next to sunlit ground. */
export const SURFACE_SKY_COLOR = new THREE.Color('#b5cce3');
export const SURFACE_GROUND_ALBEDO = new THREE.Color('#697451');
export type SurfaceLightingFrame = {
  planet:THREE.Object3D; radiusM:number; eye:THREE.Vector3; sun:THREE.Vector3;
  altitudeM:number; atmosphere:boolean; enabled:boolean; immersive:boolean;
};

/** One local desktop shadow region. All dimensions are physical metres, even
 * while the renderer changes units during descent. It changes presentation,
 * never terrain sampling, canonical populations or the simulated clock. */
export class SurfaceLighting {
  readonly sky=new THREE.HemisphereLight(SURFACE_SKY_COLOR,SURFACE_GROUND_ALBEDO,0);
  readonly localFrustum=new THREE.Frustum();
  private up=new THREE.Vector3(); private center=new THREE.Vector3();
  private right=new THREE.Vector3(); private vertical=new THREE.Vector3();
  private axis=new THREE.Vector3(); private matrix=new THREE.Matrix4();
  private scale=new THREE.Vector3(); private anchor=new THREE.Vector3();
  private baselineAmbient:number;
  private active=false; private unitsPerM=1; private altitudeM=Infinity;
  readonly sun:THREE.DirectionalLight;
  private ambient:THREE.AmbientLight;
  constructor(sun:THREE.DirectionalLight,ambient:THREE.AmbientLight){
    this.sun=sun;this.ambient=ambient;
    this.baselineAmbient=ambient.intensity;
    sun.shadow.mapSize.setScalar(SURFACE_SHADOW.mapSize);
    sun.shadow.bias=-.000025;
    sun.shadow.camera.up.set(0,1,0);
    this.sky.name='Local atmospheric sky and ground fill';
  }
  disable(){
    this.active=false;this.sun.castShadow=false;this.sun.shadow.intensity=0;
    this.sky.intensity=0;this.sky.groundColor.copy(SURFACE_GROUND_ALBEDO);this.ambient.intensity=this.baselineAmbient;
  }
  update(frame:SurfaceLightingFrame):THREE.Frustum|null{
    const {planet,radiusM,eye,sun,altitudeM,enabled,immersive,atmosphere}=frame;
    this.disable();this.altitudeM=altitudeM;
    this.unitsPerM=this.scale.setFromMatrixScale(planet.matrixWorld).x/radiusM;
    if(!enabled||immersive||!Number.isFinite(altitudeM)||!Number.isFinite(this.unitsPerM)||this.unitsPerM<=0)return null;
    this.up.copy(eye).applyMatrix4(this.matrix.copy(planet.matrixWorld).invert()).normalize().transformDirection(planet.matrixWorld);
    const day=THREE.MathUtils.smoothstep(this.up.dot(sun),-.08,.2);
    const close=1-THREE.MathUtils.smoothstep(altitudeM,2500,6000);
    const fill=atmosphere&&this.sun.intensity>0?day*close:0;
    this.sky.position.copy(this.up);
    const skyIntensity=.7*fill*Math.min(4,Math.max(0,this.sun.intensity)/3);
    this.sky.intensity=skyIntensity;
    if(skyIntensity>0){
      // Hemisphere colours are scaled by one intensity, so express the ground
      // irradiance per unit of sky intensity. Linear RGB throughout.
      const direct=Math.max(0,this.up.dot(sun))*Math.max(0,this.sun.intensity)/skyIntensity;
      this.sky.groundColor.copy(this.sun.color).multiplyScalar(direct).add(this.sky.color).multiply(SURFACE_GROUND_ALBEDO);
    }
    this.ambient.intensity=this.baselineAmbient*(1-.6*fill);
    const strength=day*(1-THREE.MathUtils.smoothstep(altitudeM,300,700));
    if(strength<=0||this.sun.intensity<=0)return null;
    const unit=this.unitsPerM,half=SURFACE_SHADOW.widthM*.5*unit;
    this.center.copy(eye).addScaledVector(this.up,-altitudeM*unit);
    // Snap relative to the planet centre, not the rebased renderer origin.
    // Translating the scene therefore cannot change the shadow texel phase.
    this.anchor.setFromMatrixPosition(planet.matrixWorld);
    this.axis.set(0,1,0);if(Math.abs(sun.y)>.98)this.axis.set(1,0,0);
    this.right.crossVectors(this.axis,sun).normalize();
    this.vertical.crossVectors(sun,this.right).normalize();
    this.sun.shadow.camera.up.copy(this.vertical);
    const texel=2*half/SURFACE_SHADOW.mapSize;
    this.scale.copy(this.center).sub(this.anchor);
    const x=this.scale.dot(this.right),y=this.scale.dot(this.vertical);
    this.center.addScaledVector(this.right,Math.round(x/texel)*texel-x)
      .addScaledVector(this.vertical,Math.round(y/texel)*texel-y);
    this.sun.target.position.copy(this.center);
    this.sun.position.copy(this.center).addScaledVector(sun,SURFACE_SHADOW.depthM*.5*unit);
    this.sun.target.updateMatrixWorld();this.sun.updateMatrixWorld();
    const camera=this.sun.shadow.camera;
    camera.left=-half;camera.right=half;camera.bottom=-half;camera.top=half;
    camera.near=.1*unit;camera.far=SURFACE_SHADOW.depthM*unit;camera.updateProjectionMatrix();
    this.sun.shadow.normalBias=SURFACE_SHADOW.normalBiasM*unit;
    this.sun.shadow.intensity=strength;this.sun.castShadow=true;
    this.sun.shadow.updateMatrices(this.sun);
    this.localFrustum.setFromProjectionMatrix(this.matrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse).multiply(planet.matrixWorld));
    this.active=true;return this.localFrustum;
  }
  diagnostics(){return {active:this.active,altitudeM:this.altitudeM,unitsPerM:this.unitsPerM,
    widthM:SURFACE_SHADOW.widthM,depthM:SURFACE_SHADOW.depthM,mapSize:SURFACE_SHADOW.mapSize,
    shadowIntensity:this.sun.shadow.intensity,skyIntensity:this.sky.intensity,ambientIntensity:this.ambient.intensity,
    allocated:!!this.sun.shadow.map,
    // RGBA8 packed depth plus a conservative four-byte depth attachment.
    // Driver overhead is not included; the map is retained while basic is on.
    estimatedTargetBytes:this.sun.shadow.map?this.sun.shadow.map.width*this.sun.shadow.map.height*8:0};}
}
