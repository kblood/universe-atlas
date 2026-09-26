import * as THREE from 'three';

/**
 * Deterministic, precomputed lookup-texture atmosphere shell.
 *
 * Ported from C:\LLM\IWSDK\nms\src\platform\heroAtmosphereSurface.ts (the
 * sky-view LUT texture + shell mesh/material) and the LUT generator it
 * imports from C:\LLM\IWSDK\nms\shared\heroContent.ts (fillSkyViewLut).
 *
 * nms's M8 hero scene is a fixed diorama with one baked sun and needs no
 * ground/orbit distinction, so its shader samples the LUT directly by view
 * direction and calls it done. Universe Atlas needs the shell to read
 * correctly from orbit (a bright limb, reddening toward sunset) AND from
 * standing on the ground (a thin day-lit or night-dark haze, with a real
 * moving day/night terminator) -- Atlas's PREVIOUS atmosphere
 * (src/planet-atmosphere.ts, kept here in spirit) already solved that with a
 * per-pixel ray-sphere raymarch through the shell, tuned against real flight
 * review feedback (night-side visibility floors, orbital vs. surface
 * opacity). That raymarch is GEOMETRY (ray/shell/ground intersection,
 * altitude-based optical depth) and stays; what this module replaces is only
 * the per-sample COLOUR computation, which used to be inline smoothstep/mix
 * calls and is now two lookups into a 2D texture precomputed once per body.
 *
 * The LUT's two axes are chosen so it never needs rebuilding as the sun
 * moves (matching the "built once per body, cached" perf requirement):
 *   u = "twilight" = dot(sampleDirection, sunDirection)*0.5+0.5 -- how lit,
 *       relative to the CURRENT sun, a scattering sample is (0 = the sample
 *       point faces away from the sun / night side, 1 = fully lit, ~0.5 = the
 *       terminator band, which reddens -- this is where "sunset colours"
 *       live). Recomputed live in the shader from the live `sun` uniform; the
 *       LUT only bakes the *appearance* at a given twilight value.
 *   v = altitude fraction through the shell (0 = ground, 1 = shell top):
 *       thinner/darker/bluer-violet high up, and tinted toward the caller's
 *       groundAlbedo hint low down when lit -- this is what gives the bright
 *       grazing-limb glow from orbit (many altitude layers stack visually at
 *       the tangent/limb line) and a warmer ground-level haze underfoot.
 *
 * Pure module: no IWSDK, no app singletons, no Body/catalog types (a caller
 * passes plain radius/atmosphereHeight/groundAlbedo numbers), and no
 * per-frame allocation in update() (two THREE.Vector3 are reused).
 */

export interface AtmosphereShellParams {
  /** Planet surface radius, in whatever unit the caller's scene graph uses
   * (Universe Atlas renders in a unit-sphere-normalised local frame, radius
   * 1; a caller working directly in metres can pass metres instead -- this
   * module never assumes a unit, it only needs radius and atmosphereHeight
   * to share one). */
  radius: number;
  /** Shell thickness above `radius`, in the same unit as `radius`. */
  atmosphereHeight: number;
  /** 0..1 linear-ish RGB hint for the ground-bounce tint low in the shell
   * (blended in only on the lit side). Defaults to a neutral warm grey. */
  groundAlbedo?: [number, number, number];
  /** Seeds the LUT's small deterministic per-body colour jitter. The same
   * (seed, radius, atmosphereHeight, groundAlbedo) always builds a
   * bit-identical LUT. */
  seed?: number;
  lutWidth?: number;
  lutHeight?: number;
  widthSegments?: number;
  heightSegments?: number;
}

export interface AtmosphereShell {
  readonly mesh: THREE.Mesh;
  readonly material: THREE.ShaderMaterial;
  readonly lut: THREE.DataTexture;
  /** Wall-clock milliseconds spent generating the LUT pixels, measured once
   * at construction (the mesh/material/texture object creation around it is
   * not included -- see this port's report for measured numbers). */
  readonly buildCostMs: number;
  /** Eye and sun direction, in the SAME local frame the shell mesh's parent
   * group uses (Universe Atlas: the planet-local unit-sphere frame). No
   * allocation: internal Vector3s are reused every call. */
  update(eyeLocal: THREE.Vector3 | readonly [number, number, number], sunDirectionLocal: THREE.Vector3 | readonly [number, number, number]): void;
  dispose(): void;
}

export const ATMOSPHERE_LUT_WIDTH = 128;
export const ATMOSPHERE_LUT_HEIGHT = 32;
const DEFAULT_GROUND_ALBEDO: [number, number, number] = [0.35, 0.32, 0.28];
const DEFAULT_SEED = 0x4c554d41; // 'LUMA', arbitrary fixed default

/** 32-bit integer hash. Ported from nms/shared/density.ts hashU32 (kept as
 * an independent copy from ocean-gerstner.ts's identical helper so either
 * file can be lifted out and reused on its own -- see the file header). */
function hashU32(value: number, seed: number): number {
  let h = (value | 0) ^ (seed | 0);
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  return (h ^ (h >>> 16)) >>> 0;
}
function rand01(seed: number, salt: number): number {
  return (hashU32(salt >>> 0, seed) >>> 0) / 0x1_0000_0000;
}
function clampByte(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}
function smoothstep(a: number, b: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export interface AtmosphereLutParams {
  atmosphereHeight: number;
  radius: number;
  groundAlbedo: [number, number, number];
  seed: number;
}

/**
 * Fills an RGBA8 sky-view LUT. RGB = precomputed in-scattered colour at this
 * (twilight, altitude) pair; A = the "how lit is this sample" day weight the
 * shell's raymarch accumulates to drive its existing opacity/terminator mix
 * (the same role nms's fillSkyViewLut's RGB-only texture does not need,
 * because nms never separates day-weight from colour).
 *
 * Deterministic and finite for every (x,y): every step is +, -, *, /, exp,
 * sin/cos-free arithmetic on finite inputs, so there is no NaN/Infinity
 * path -- including at the grazing (x near the terminator) and night
 * (x near 0) ends of the twilight axis this is tested against.
 */
export function buildAtmosphereLut(out: Uint8Array, width: number, height: number, params: AtmosphereLutParams): void {
  if (out.length < width * height * 4) throw new RangeError(`sky LUT requires ${width * height * 4} bytes`);
  const [ar, ag, ab] = params.groundAlbedo;
  const seed = params.seed >>> 0;
  for (let y = 0; y < height; y++) {
    const altitude = y / Math.max(1, height - 1); // 0 ground .. 1 shell top
    for (let x = 0; x < width; x++) {
      const twilight = x / Math.max(1, width - 1); // 0 night .. 1 lit
      const litness = twilight;
      // The terminator band (twilight ~0.5) reddens: a long grazing path
      // through the atmosphere scatters blue/green out, leaving warm light.
      const duskBand = Math.exp((-(twilight - 0.5) * (twilight - 0.5)) / 0.02);
      const dayCore: [number, number, number] = [0.3, 0.55, 0.92];
      const duskTint: [number, number, number] = [0.95, 0.42, 0.18];
      const nightTint: [number, number, number] = [0.03, 0.05, 0.09];
      let r = nightTint[0] + (dayCore[0] - nightTint[0]) * litness;
      let g = nightTint[1] + (dayCore[1] - nightTint[1]) * litness;
      let b = nightTint[2] + (dayCore[2] - nightTint[2]) * litness;
      r += duskTint[0] * duskBand * 0.55;
      g += duskTint[1] * duskBand * 0.3;
      b -= duskTint[2] * duskBand * 0.1;
      // Thin upper air: darker and more violet than the dense lower layers.
      const upperTint: [number, number, number] = [0.05, 0.03, 0.1];
      const upperMix = Math.min(1, altitude * 1.15) * 0.55;
      r = r * (1 - upperMix) + upperTint[0] * upperMix;
      g = g * (1 - upperMix) + upperTint[1] * upperMix;
      b = b * (1 - upperMix) + upperTint[2] * upperMix;
      // Ground-bounce tint, low in the shell, only while lit.
      const groundMix = Math.max(0, 1 - altitude * 2.2) * litness * 0.25;
      r = r * (1 - groundMix) + ar * groundMix;
      g = g * (1 - groundMix) + ag * groundMix;
      b = b * (1 - groundMix) + ab * groundMix;
      // Small deterministic per-body jitter, in the spirit of nms's `alien`
      // noise term in fillSkyViewLut, kept subtle.
      const jitter = (rand01(seed, x + y * width) - 0.5) * 0.02;
      r += jitter;
      g += jitter * 0.8;
      b += jitter * 0.6;
      const nightFloor = 0.02 + 0.02 * (1 - altitude);
      r = Math.max(nightFloor, Math.min(1, r));
      g = Math.max(nightFloor * 1.05, Math.min(1, g));
      b = Math.max(nightFloor * 1.3, Math.min(1, b));
      // Matches the terminator band the previous raymarch tuned
      // (smoothstep(-.12,.15,dot(n,sun)) in dot-space === smoothstep(.44,.575,twilight)).
      const day = smoothstep(0.44, 0.575, twilight);
      const i = (y * width + x) * 4;
      out[i] = clampByte(r * 255);
      out[i + 1] = clampByte(g * 255);
      out[i + 2] = clampByte(b * 255);
      out[i + 3] = clampByte(day * 255);
    }
  }
}

/** CPU mirror of the fragment shader's LUT read (nearest-neighbour), for
 * tests and any non-GL caller that wants to sample a built LUT directly. */
export function sampleAtmosphereLut(lutData: Uint8Array, width: number, height: number, twilight: number, altitudeFraction: number) {
  const x = Math.max(0, Math.min(width - 1, Math.round(twilight * (width - 1))));
  const y = Math.max(0, Math.min(height - 1, Math.round(altitudeFraction * (height - 1))));
  const i = (y * width + x) * 4;
  return { r: lutData[i] / 255, g: lutData[i + 1] / 255, b: lutData[i + 2] / 255, day: lutData[i + 3] / 255 };
}

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

/** Builds the shell mesh, material and its once-per-body LUT. Constructing
 * this never touches a GL context (DataTexture/ShaderMaterial/Mesh are plain
 * objects until the renderer uploads them), so it is unit-testable without
 * WebGL. */
export function createAtmosphereShell(params: AtmosphereShellParams): AtmosphereShell {
  const width = params.lutWidth ?? ATMOSPHERE_LUT_WIDTH;
  const height = params.lutHeight ?? ATMOSPHERE_LUT_HEIGHT;
  const seed = params.seed ?? DEFAULT_SEED;
  const groundAlbedo = params.groundAlbedo ?? DEFAULT_GROUND_ALBEDO;
  const data = new Uint8Array(width * height * 4);
  const buildStarted = now();
  buildAtmosphereLut(data, width, height, { atmosphereHeight: params.atmosphereHeight, radius: params.radius, groundAlbedo, seed });
  const buildCostMs = now() - buildStarted;

  const lut = new THREE.DataTexture(data, width, height, THREE.RGBAFormat, THREE.UnsignedByteType);
  lut.name = 'atlas-atmosphere-sky-lut';
  lut.minFilter = THREE.LinearFilter;
  lut.magFilter = THREE.LinearFilter;
  lut.wrapS = THREE.ClampToEdgeWrapping;
  lut.wrapT = THREE.ClampToEdgeWrapping;
  lut.needsUpdate = true;

  const outer = params.radius + params.atmosphereHeight;
  const uniforms = {
    eye: { value: new THREE.Vector3(0, 0, outer * 2) },
    sun: { value: new THREE.Vector3(1, 0, 0) },
    outer: { value: outer },
    inner: { value: params.radius },
    scaleHeight: { value: Math.max(1e-6, params.atmosphereHeight / 8) },
    uSkyLut: { value: lut },
  };
  const material = new THREE.ShaderMaterial({
    name: 'atlas-atmosphere-lut-shell',
    uniforms,
    transparent: true,
    depthWrite: false,
    side: THREE.BackSide,
    vertexShader: `varying vec3 p;
      #include <common>
      #include <logdepthbuf_pars_vertex>
      void main(){ p=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
        #include <logdepthbuf_vertex>
      }`,
    fragmentShader: `uniform vec3 eye; uniform vec3 sun; uniform float outer; uniform float inner; uniform float scaleHeight; uniform sampler2D uSkyLut; varying vec3 p;
      #include <common>
      #include <logdepthbuf_pars_fragment>
      void main(){
        #include <logdepthbuf_fragment>
        vec3 ray=normalize(p-eye); float b=dot(eye,ray);
        float disc=b*b-dot(eye,eye)+outer*outer;
        if(disc<=0.0) discard;
        float start=max(0.0,-b-sqrt(disc)), finish=-b+sqrt(disc);
        float groundDisc=b*b-dot(eye,eye)+inner*inner;
        if(groundDisc>0.0){ float hit=-b-sqrt(groundDisc); if(hit>0.0) finish=min(finish,hit); }
        float stepSize=max(0.0,finish-start)/8.0; float density=0.0; float lit=0.0; vec3 scatter=vec3(0.0);
        for(int i=0;i<8;i++){
          vec3 q=eye+ray*(start+(float(i)+0.5)*stepSize);
          float alt=length(q);
          float weight=exp(-max(0.0,alt-inner)/scaleHeight)*stepSize/scaleHeight;
          density+=weight;
          float twilight=dot(normalize(q),sun)*0.5+0.5;
          float altitudeFrac=clamp((alt-inner)/max(0.0001,outer-inner),0.0,1.0);
          vec4 sky=texture2D(uSkyLut,vec2(twilight,altitudeFrac));
          scatter+=weight*sky.rgb; lit+=weight*sky.a;
        }
        float day=density>0.00001?lit/density:0.0;
        vec3 color=density>0.00001?scatter/density:vec3(0.03,0.05,0.09);
        float opacity=1.0-exp(-density*(length(eye)<outer?2.5:0.14));
        gl_FragColor=vec4(max(color,vec3(.008,.012,.02)),opacity*(length(eye)<outer?mix(.42,.995,day):.88));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  material.toneMapped = true;

  const geometry = new THREE.SphereGeometry(outer, params.widthSegments ?? 64, params.heightSegments ?? 32);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'Atmosphere shell (LUT)';
  mesh.frustumCulled = false;
  mesh.renderOrder = 1;

  const tmpEye = new THREE.Vector3();
  const tmpSun = new THREE.Vector3();
  return {
    mesh,
    material,
    lut,
    buildCostMs,
    update(eyeLocal, sunDirectionLocal) {
      if (Array.isArray(eyeLocal)) tmpEye.set(eyeLocal[0], eyeLocal[1], eyeLocal[2]);
      else tmpEye.copy(eyeLocal as THREE.Vector3);
      if (Array.isArray(sunDirectionLocal)) tmpSun.set(sunDirectionLocal[0], sunDirectionLocal[1], sunDirectionLocal[2]);
      else tmpSun.copy(sunDirectionLocal as THREE.Vector3);
      uniforms.eye.value.copy(tmpEye);
      uniforms.sun.value.copy(tmpSun).normalize();
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      lut.dispose();
    },
  };
}
