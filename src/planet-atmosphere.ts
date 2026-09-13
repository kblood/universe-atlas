import * as THREE from 'three';
import {type Body} from './catalog.ts';
import {atmosphereHeightM} from './planet-flight.ts';

/** Small single-scattering approximation for the orbital milestone. Not a
 * Bruneton LUT implementation; parameters are deliberately explicit. */
export class PlanetAtmosphere {
  readonly mesh: THREE.Mesh;
  readonly uniforms: { [key: string]: {value: any} };
  constructor(body: Body) {
    const depth = atmosphereHeightM(body) / body.radiusM;
    this.uniforms = {
      eye: {value: new THREE.Vector3(0,0,4)}, sun: {value: new THREE.Vector3(1,0,0)},
      outer: {value: 1 + depth}, scaleHeight: {value: depth / 8},
    };
    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms, transparent: true, depthWrite: false, side: THREE.BackSide,
      vertexShader: `varying vec3 p;
        #include <common>
        #include <logdepthbuf_pars_vertex>
        void main(){ p=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
          #include <logdepthbuf_vertex>
        }`,
      fragmentShader: `uniform vec3 eye; uniform vec3 sun; uniform float outer; uniform float scaleHeight; varying vec3 p;
        #include <common>
        #include <logdepthbuf_pars_fragment>
        void main(){
          #include <logdepthbuf_fragment>
          vec3 ray=normalize(p-eye); float b=dot(eye,ray);
          float disc=b*b-dot(eye,eye)+outer*outer;
          if(disc<=0.0) discard;
          float start=max(0.0,-b-sqrt(disc)), finish=-b+sqrt(disc);
          float ground=b*b-dot(eye,eye)+1.0;
          if(ground>0.0){ float hit=-b-sqrt(ground); if(hit>0.0) finish=min(finish,hit); }
          float stepSize=max(0.0,finish-start)/8.0; float density=0.0; float lit=0.0;
          for(int i=0;i<8;i++){
            vec3 q=eye+ray*(start+(float(i)+0.5)*stepSize);
            float weight=exp(-max(0.0,length(q)-1.0)/scaleHeight)*stepSize/scaleHeight;
            density+=weight; lit+=weight*smoothstep(-0.12,0.15,dot(normalize(q),sun));
          }
          float day=lit/max(density,0.00001);
          float opacity=1.0-exp(-density*(length(eye)<outer?2.5:0.14));
          vec3 color=mix(vec3(0.025,0.045,0.09),vec3(0.22,0.48,0.82),lit/max(density,0.00001));
          gl_FragColor=vec4(color,opacity*(length(eye)<outer?mix(.2,.995,day):.88));
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(1 + depth, 64, 32), material);
    this.mesh.name = 'Orbital atmosphere';
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1;
  }
  update(eye: THREE.Vector3, sun: THREE.Vector3) {
    this.uniforms.eye.value.copy(eye); this.uniforms.sun.value.copy(sun).normalize();
  }
  dispose() { this.mesh.geometry.dispose(); (this.mesh.material as THREE.Material).dispose(); }
}
