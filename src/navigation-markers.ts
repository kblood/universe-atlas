import * as THREE from 'three';
/** Unresolved objects retain a small screen-space beacon at their true centre.
 * Mesh radius and collision geometry remain physical. */
export class NavigationMarkers {
  readonly points: THREE.Points;
  private positions: Float32Array;
  private radii: Float32Array;
  private sizes: Float32Array;
  private visibility: Float32Array;
  constructor(readonly entries: {object: THREE.Object3D; radius: () => number; color: string; pixels: number; visibility?: () => number}[]) {
    const count=entries.length, geometry=new THREE.BufferGeometry();
    this.positions=new Float32Array(count*3); this.radii=new Float32Array(count); this.sizes=new Float32Array(count);
    this.visibility=new Float32Array(count);
    const colors=new Float32Array(count*3);
    entries.forEach((e,i)=>{new THREE.Color(e.color).toArray(colors,i*3);this.sizes[i]=e.pixels;});
    geometry.setAttribute('position',new THREE.BufferAttribute(this.positions,3));
    geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
    geometry.setAttribute('radius',new THREE.BufferAttribute(this.radii,1));
    geometry.setAttribute('pixels',new THREE.BufferAttribute(this.sizes,1));
    geometry.setAttribute('visibility',new THREE.BufferAttribute(this.visibility,1));
    const material=new THREE.ShaderMaterial({
      uniforms:{screenHeight:{value:1000},pixelRatio:{value:1},alpha:{value:1}},
      vertexShader:`attribute vec3 color; attribute float radius,pixels,visibility;
        uniform float screenHeight,pixelRatio; varying vec3 tint; varying float fade;
        #include <common>
        #include <logdepthbuf_pars_vertex>
        void main(){vec4 mv=modelViewMatrix*vec4(position,1.0); gl_Position=projectionMatrix*mv;
          float diameter=radius*length(modelMatrix[0].xyz)*projectionMatrix[1][1]*screenHeight/max(0.00000001,-mv.z);
          fade=(1.0-smoothstep(pixels*.65,pixels*1.5,diameter))*visibility; tint=color;
          gl_PointSize=pixels*pixelRatio;
          #include <logdepthbuf_vertex>
        }`,
      fragmentShader:`uniform float alpha;varying vec3 tint;varying float fade;
        #include <common>
        #include <logdepthbuf_pars_fragment>
        void main(){float d=length(gl_PointCoord-.5);if(d>.5||fade<.005)discard;
          #include <logdepthbuf_fragment>
          float core=exp(-d*d*32.0), halo=exp(-d*d*12.0)*.24;
          gl_FragColor=vec4(tint,min(1.0,core+halo)*fade*alpha);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    });
    this.points=new THREE.Points(geometry,material); this.points.frustumCulled=false;
    this.points.name='Unresolved navigation beacons';
  }
  update(height: number,pixelRatio: number) {
    this.entries.forEach((e,i)=>{this.positions.set(e.object.position.toArray(),i*3);this.radii[i]=e.radius();this.visibility[i]=e.object.visible?(e.visibility?.()??1):0;});
    this.points.geometry.attributes.position.needsUpdate=true;
    this.points.geometry.attributes.radius.needsUpdate=true;
    this.points.geometry.attributes.visibility.needsUpdate=true;
    const u=(this.points.material as THREE.ShaderMaterial).uniforms;
    u.screenHeight.value=height;u.pixelRatio.value=pixelRatio;
  }
}
