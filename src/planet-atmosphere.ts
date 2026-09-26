import * as THREE from 'three';
import {type Body} from './catalog.ts';
import {atmosphereHeightM} from './planet-flight.ts';
import {createAtmosphereShell, type AtmosphereShell} from './sky-atmosphere.ts';

/**
 * Adapts sky-atmosphere.ts's pure lookup-texture shell (see that file's
 * header for the full nms provenance/design note) to Universe Atlas's Body
 * type and planet-renderer.ts's existing call contract
 * (`new PlanetAtmosphere(body)`, `.mesh`, `.update(eye,sun)`, `.dispose()`)
 * so every existing caller compiles and runs unchanged.
 *
 * Ground-albedo hint: Body carries no explicit albedo, so this derives a
 * reasonable per-type tint (ice worlds bright/blue-white, volcanic worlds
 * dark/warm, everything else a mid warm grey) -- a hint only, not read back
 * anywhere else.
 */
function groundAlbedoHint(body: Body): [number, number, number] {
  if (body.type === 'Ice world') return [0.75, 0.8, 0.86];
  if (body.type === 'Volcanic world') return [0.22, 0.16, 0.14];
  if (body.water > 0) return [0.4, 0.42, 0.34];
  return [0.35, 0.32, 0.28];
}

export class PlanetAtmosphere {
  readonly mesh: THREE.Mesh;
  readonly uniforms: { [key: string]: {value: any} };
  /** Milliseconds spent building this body's sky-view LUT (see
   * sky-atmosphere.ts's AtmosphereShell.buildCostMs). */
  readonly lutBuildCostMs: number;
  private shell: AtmosphereShell;
  constructor(body: Body) {
    const depth = atmosphereHeightM(body) / body.radiusM;
    this.shell = createAtmosphereShell({
      radius: 1,
      atmosphereHeight: depth,
      groundAlbedo: groundAlbedoHint(body),
      // Deterministic per-body LUT: same body always bakes the same sky.
      seed: Number(BigInt.asUintN(32, BigInt(Math.round(body.radiusM)) ^ hashString(body.seed + '/' + body.id))),
    });
    this.mesh = this.shell.mesh;
    this.mesh.name = 'Orbital atmosphere';
    this.uniforms = (this.shell.material as THREE.ShaderMaterial).uniforms as { [key: string]: {value: any} };
    this.lutBuildCostMs = this.shell.buildCostMs;
  }
  update(eye: THREE.Vector3, sun: THREE.Vector3) {
    this.shell.update(eye, sun);
  }
  dispose() { this.shell.dispose(); }
}

function hashString(s: string): bigint {
  let h = 0x811c9dc5n;
  for (let i = 0; i < s.length; i++) {
    h ^= BigInt(s.charCodeAt(i));
    h = BigInt.asUintN(32, h * 0x01000193n);
  }
  return h;
}
