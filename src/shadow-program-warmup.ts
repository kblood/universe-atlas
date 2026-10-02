import * as THREE from 'three';

/** Shadow-variant program warm-up (desktop frame cost, task 4). Three's
 * program key includes the number of shadow-casting directional lights, so
 * the frame on which the sun starts casting (descending through ~700 m)
 * recompiles every lit material in use. This compiles those variants
 * beforehand with KHR_parallel_shader_compile, once per program family, by
 * enabling the light's castShadow only for the duration of the synchronous
 * part of `compileAsync`. Rendering only: nothing is drawn and no material,
 * uniform or scene content changes. */
export type ShadowWarmupRenderer={
  compileAsync(object:THREE.Object3D,camera:THREE.Camera,scene:THREE.Scene):Promise<unknown>;
  shadowMap:{type:THREE.ShadowMapType};
};
export class ShadowProgramWarmup{
  private families=new Set<string>();
  readonly stats={compiles:0,objects:0,families:0,failures:0};
  constructor(private renderer:ShadowWarmupRenderer,private light:THREE.Light){}
  /** A program family: material type and program cache key plus the object
   * flags that select a different program (instancing, skinning). */
  family(object:THREE.Object3D,material:THREE.Material){
    const o=object as THREE.Mesh&{isInstancedMesh?:boolean;isSkinnedMesh?:boolean};
    return `${material.type}|${material.customProgramCacheKey()}|${o.isInstancedMesh?1:0}|${o.isSkinnedMesh?1:0}|${this.renderer.shadowMap.type}`;
  }
  /** Compile the shadowed variants for objects whose families are new. */
  warm(objects:readonly THREE.Object3D[],camera:THREE.Camera,scene:THREE.Scene){
    const pending:THREE.Object3D[]=[],fresh=new Set<string>();
    for(const object of objects){
      let add=false;
      object.traverse(o=>{
        const mesh=o as THREE.Mesh;if(!(mesh.isMesh&&mesh.material))return;
        for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material]){
          const family=this.family(o,material);
          if(!this.families.has(family)&&!fresh.has(family)){fresh.add(family);add=true;}
        }
      });
      if(add)pending.push(object);
    }
    if(!pending.length)return 0;
    for(const family of fresh)this.families.add(family);
    const casting=this.light.castShadow;this.light.castShadow=true;
    // A failed warm-up only means the variant compiles on first use, as before.
    try{for(const object of pending){try{void this.renderer.compileAsync(object,camera,scene).catch(()=>{});}catch{this.stats.failures++;}}}
    finally{this.light.castShadow=casting;}
    this.stats.compiles++;this.stats.objects+=pending.length;this.stats.families=this.families.size;
    return pending.length;
  }
  /** Forget compiled families (context loss). */
  reset(){this.families.clear();this.stats.families=0;}
}
