import * as THREE from 'three';

/** Shadow-map reuse (desktop frame cost, task 4). A shadow map is a pure
 * function of the light camera, the shadow-map type/size and, for every
 * caster Three would draw, its world matrix, geometry contents, instance
 * data, material state and depth-material uniform values. This builds that
 * input as a flat numeric signature, in Three's own traversal order and with
 * Three's own visibility, layer, castShadow and light-frustum tests
 * (WebGLShadowMap.renderObject, r181), and reports whether it is identical to
 * the signature of the last map actually rendered. Identical input renders an
 * identical map, so skipping the render is exact. Rendering only: nothing here
 * reads or changes canonical content.
 *
 * Anything the signature cannot describe (onBeforeShadow hooks, batched
 * meshes, unknown uniform value types) makes the frame uncacheable, so the
 * cache can only fail towards re-rendering. */
export type UniformLookup=(material:THREE.Material)=>Record<string,{value:unknown}>|undefined;
export type ShadowCacheReason='hit'|'disabled'|'first'|'light'|'casters'|'uncacheable';
export type ShadowCacheStats={hits:number;misses:number;lastReason:ShadowCacheReason;lastCasters:number;lastLength:number;uncacheable:string|null};

const identities=new WeakMap<object,number>();
let nextIdentity=1;
/** Stable numeric identity for objects without an id (attributes, arrays). */
function identity(value:object){let id=identities.get(value);if(id===undefined){id=nextIdentity++;identities.set(value,id);}return id;}

const DEFAULT_ON_BEFORE_SHADOW=THREE.Object3D.prototype.onBeforeShadow;

class Signature{
  data=new Float64Array(8192);length=0;
  uncacheable:string|null=null;
  reset(){this.length=0;this.uncacheable=null;}
  push(v:number){
    if(this.length===this.data.length){const grown=new Float64Array(this.data.length*2);grown.set(this.data);this.data=grown;}
    this.data[this.length++]=v;
  }
  pushArray(values:ArrayLike<number>){for(let i=0;i<values.length;i++)this.push(values[i]!);}
  value(v:unknown,depth=0):void{
    if(typeof v==='number'){this.push(v);return;}
    if(typeof v==='boolean'){this.push(v?1:0);return;}
    if(v===null||v===undefined){this.push(-1.5e300);return;}
    if(typeof v!=='object'){this.fail(`uniform ${typeof v}`);return;}
    const o=v as Record<string,unknown>&{isTexture?:boolean;isVector2?:boolean;isVector3?:boolean;isVector4?:boolean;isColor?:boolean;isQuaternion?:boolean;isMatrix3?:boolean;isMatrix4?:boolean;elements?:ArrayLike<number>};
    if(o.isTexture){const t=v as THREE.Texture;this.push(t.id);this.push(t.version);return;}
    if(o.isVector2){const x=v as THREE.Vector2;this.push(x.x);this.push(x.y);return;}
    if(o.isVector3){const x=v as THREE.Vector3;this.push(x.x);this.push(x.y);this.push(x.z);return;}
    if(o.isVector4||o.isQuaternion){const x=v as THREE.Vector4;this.push(x.x);this.push(x.y);this.push(x.z);this.push(x.w);return;}
    if(o.isColor){const x=v as THREE.Color;this.push(x.r);this.push(x.g);this.push(x.b);return;}
    if(o.isMatrix3||o.isMatrix4){this.pushArray(o.elements!);return;}
    if(ArrayBuffer.isView(v)&&!(v instanceof DataView)){this.push(identity(v));this.pushArray(v as unknown as ArrayLike<number>);return;}
    if(Array.isArray(v)&&depth<2){this.push(v.length);for(const item of v)this.value(item,depth+1);return;}
    this.fail('uniform object');
  }
  fail(reason:string){if(!this.uncacheable)this.uncacheable=reason;}
  equals(other:Signature){
    if(this.length!==other.length)return false;
    const a=this.data,b=other.data;
    for(let i=0;i<this.length;i++){const x=a[i]!,y=b[i]!;if(x!==y&&!(x!==x&&y!==y))return false;}
    return true;
  }
  copyFrom(other:Signature){
    if(this.data.length<other.length)this.data=new Float64Array(other.data.length);
    this.data.set(other.data.subarray(0,other.length));this.length=other.length;this.uncacheable=other.uncacheable;
  }
}

export class ShadowMapCache{
  enabled=true;
  readonly stats:ShadowCacheStats={hits:0,misses:0,lastReason:'first',lastCasters:0,lastLength:0,uncacheable:null};
  private current=new Signature();
  private rendered=new Signature();
  private hasRendered=false;
  private lightLength=0;
  private casters=0;
  private camera:THREE.Camera|null=null;
  private frustum:THREE.Frustum|null=null;
  private light:THREE.Light|null=null;
  constructor(private uniformsOf:UniformLookup=()=>undefined){}
  /** Forget the last rendered map (context loss, external shadow writes). */
  invalidate(){this.hasRendered=false;}
  /** Call immediately before Three would render the shadow maps for `lights`
   * (world matrices already updated). True: the maps in place are exactly what
   * this render would produce, so it may be skipped. False: render, and this
   * signature becomes the reference for later frames. */
  canSkip(lights:readonly THREE.Light[],scene:THREE.Object3D,camera:THREE.Camera,type:THREE.ShadowMapType):boolean{
    const s=this.current;s.reset();this.casters=0;this.camera=camera;
    s.push(type);s.push(lights.length);s.push(camera.layers.mask);
    for(const light of lights){
      const shadow=(light as THREE.DirectionalLight).shadow as THREE.LightShadow|undefined;
      if(!shadow){s.push(-1);continue;}
      if(!(shadow as THREE.DirectionalLightShadow).isDirectionalLightShadow){s.fail('non-directional shadow');continue;}
      if(!shadow.map){s.fail('unallocated map');continue;}
      s.push(light.id);s.push(shadow.map.texture.id);s.push(shadow.map.width);s.push(shadow.map.height);
      s.push(shadow.mapSize.x);s.push(shadow.mapSize.y);s.push(shadow.autoUpdate?1:0);
      // Same matrices Three derives in WebGLShadowMap.render; idempotent.
      shadow.updateMatrices(light);
      s.pushArray(shadow.camera.matrixWorldInverse.elements);s.pushArray(shadow.camera.projectionMatrix.elements);
      {const c=shadow.camera as THREE.OrthographicCamera;s.push(c.far);s.push(c.near);}
      this.lightLength=s.length;
      this.light=light;this.frustum=shadow.getFrustum();
      this.visit(scene);
      s.push(-7);
    }
    let reason:ShadowCacheReason;
    if(!this.enabled)reason='disabled';
    else if(s.uncacheable)reason='uncacheable';
    else if(!this.hasRendered)reason='first';
    else if(s.equals(this.rendered))reason='hit';
    else{
      reason='casters';
      const a=s.data,b=this.rendered.data;
      for(let i=0;i<Math.min(this.lightLength,this.rendered.length);i++){const x=a[i]!,y=b[i]!;if(x!==y&&!(x!==x&&y!==y)){reason='light';break;}}
    }
    this.stats.lastReason=reason;this.stats.lastCasters=this.casters;this.stats.lastLength=s.length;this.stats.uncacheable=s.uncacheable;
    if(reason==='hit'){this.stats.hits++;return true;}
    this.stats.misses++;
    if(s.uncacheable){this.hasRendered=false;return false;}
    this.rendered.copyFrom(s);this.hasRendered=true;
    return false;
  }
  private visit(object:THREE.Object3D){
    if(object.visible===false)return;
    const s=this.current,camera=this.camera!;
    const o=object as THREE.Mesh&{isLine?:boolean;isPoints?:boolean;isInstancedMesh?:boolean;isBatchedMesh?:boolean;isSkinnedMesh?:boolean};
    if(object.layers.test(camera.layers)&&(o.isMesh||o.isLine||o.isPoints)&&object.castShadow&&(!object.frustumCulled||this.frustum!.intersectsObject(object))){
      this.casters++;
      if(object.onBeforeShadow!==DEFAULT_ON_BEFORE_SHADOW)s.fail('onBeforeShadow');
      if(o.isBatchedMesh)s.fail('batched mesh');
      s.push(-3);s.push(object.id);s.pushArray(object.matrixWorld.elements);
      const geometry=o.geometry;
      s.push(geometry.id);s.push(geometry.drawRange.start);s.push(geometry.drawRange.count);
      const index=geometry.index;if(index){s.push(identity(index));s.push(index.version);s.push(index.count);}else s.push(-1);
      for(const name in geometry.attributes){
        const attribute=geometry.attributes[name] as THREE.BufferAttribute|THREE.InterleavedBufferAttribute;
        if((attribute as THREE.InterleavedBufferAttribute).isInterleavedBufferAttribute){const data=(attribute as THREE.InterleavedBufferAttribute).data;s.push(identity(data));s.push(data.version);}
        else{s.push(identity(attribute));s.push((attribute as THREE.BufferAttribute).version);}
      }
      s.push(geometry.groups.length);for(const g of geometry.groups){s.push(g.start);s.push(g.count);s.push(g.materialIndex??0);}
      if(o.isInstancedMesh){const m=object as THREE.InstancedMesh;s.push(m.count);s.push(identity(m.instanceMatrix));s.push(m.instanceMatrix.version);}
      if(o.isSkinnedMesh){const m=object as THREE.SkinnedMesh;s.push(m.skeleton.bones.length);s.pushArray(m.skeleton.boneMatrices??[]);s.pushArray(m.bindMatrix.elements);}
      if(o.morphTargetInfluences)s.pushArray(o.morphTargetInfluences);
      const materials=Array.isArray(o.material)?o.material:[o.material];
      for(const material of materials)this.material(object,material);
    }
    const children=object.children;
    for(let i=0;i<children.length;i++)this.visit(children[i]!);
  }
  private material(object:THREE.Object3D,material:THREE.Material|undefined){
    const s=this.current;
    if(!material){s.push(-2);return;}
    const m=material as THREE.MeshStandardMaterial&{clipShadows?:boolean;wireframe?:boolean};
    s.push(identity(material));s.push(material.version);s.push(material.visible?1:0);s.push(material.side);s.push(material.shadowSide??-1);
    s.push(material.alphaTest);s.push(material.alphaToCoverage?1:0);s.push(m.wireframe?1:0);
    s.value(m.map??null);s.value(m.alphaMap??null);s.value(m.displacementMap??null);
    s.push(m.displacementScale??0);s.push(m.displacementBias??0);
    if(material.clippingPlanes?.length)s.fail('clipping planes');
    const light=this.light as THREE.PointLight|null;
    const custom=light?.isPointLight?object.customDistanceMaterial:object.customDepthMaterial;
    if(custom){
      s.push(-4);s.push(identity(custom));s.push(custom.version);
      const uniforms=this.uniformsOf(custom);
      if(!uniforms)s.push(-5);
      else for(const name in uniforms)s.value(uniforms[name]?.value);
    }
  }
  diagnostics(){return {enabled:this.enabled,...this.stats};}
}
