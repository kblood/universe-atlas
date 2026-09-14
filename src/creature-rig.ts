import * as THREE from 'three';
import type { CreatureGenome } from './creature-model.ts';

/** Rigid-part prototype rig.  Skinning and smooth deformation are deliberately
 * later work: every visible limb here is an inspectable solved rigid segment. */
export type CreatureGait = 'idle' | 'walk' | 'run';
export type TerrainKind = 'flat' | 'slope' | 'steps';

export interface CreaturePoseDiagnostics {
  time: number; gait: CreatureGait; root: [number, number, number];
  feet: { id: string; position: [number, number, number]; stance: boolean; target: [number, number, number] }[];
  maxPenetration: number; maxReachError: number; jointCount: number;
}
export interface CreatureRig {
  group: THREE.Group;
  update(time: number, gait: CreatureGait, terrain: TerrainKind): CreaturePoseDiagnostics;
  setSkeletonVisible(value: boolean): void;
  setNeutral(value: boolean): void;
  dispose(): void;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Number.isFinite(n) ? n : lo));
const V = () => new THREE.Vector3();

/** Shared arena sampler.  Keep this the only terrain definition used by feet and ground. */
export function creatureTerrainHeight(x: number, _z: number, terrain: TerrainKind): number {
  if (terrain === 'flat') return 0;
  if (terrain === 'slope') return clamp(x, -12, 12) * .065;
  if (terrain === 'steps') return clamp(Math.floor((x + .35) / .7), -12, 12) * .085;
  return 0;
}

type Leg = { id: string; hip: THREE.Group; upper: THREE.Group; knee: THREE.Group; lower: THREE.Group; foot: THREE.Group; marker: THREE.Mesh; phase: number; rear: boolean; hipZ: number; z: number; x: number };

function material(hex: string) { return new THREE.MeshStandardMaterial({ color: new THREE.Color(hex || '#778877'), roughness: .78, metalness: 0 }); }
function hexBytes(hex: string): [number, number, number] {
  const hit = /^#?([0-9a-f]{6})$/i.exec(hex || ''); const value = Number.parseInt(hit ? hit[1] : '778877', 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}
/** A compact, deterministic source-sRGB coat.  It is deliberately generated
 * without a canvas so tests and server-side module imports see the same coat. */
function coatTexture(genome: CreatureGenome) {
  const side = 128, pixels = new Uint8Array(side * side * 4), base = hexBytes(genome.color), accent = hexBytes(genome.accentColor);
  for (let y = 0; y < side; y++) for (let x = 0; x < side; x++) {
    const u = x / (side - 1), v = y / (side - 1); let mark = 0;
    if (genome.pattern === 'stripes') mark = Math.max(0, Math.sin((u * 7.5 + v * .65) * Math.PI * 2) - .37) / .63;
    else if (genome.pattern === 'spots') { const gx = u * 7.2, gy = v * 5.4, cx = Math.floor(gx) + .5 + Math.sin(Math.floor(gy) * 19.1) * .17, cy = Math.floor(gy) + .5 + Math.sin(Math.floor(gx) * 11.7) * .16; mark = Math.max(0, 1 - Math.hypot(gx - cx, gy - cy) / .37); }
    const i = (y * side + x) * 4, shade = .91 + .09 * Math.sin((u * 3 + v * 2) * Math.PI);
    for (let c = 0; c < 3; c++) pixels[i + c] = Math.round((base[c] * (1 - mark * .6) + accent[c] * mark * .6) * shade);
    pixels[i + 3] = 255;
  }
  const texture = new THREE.DataTexture(pixels, side, side, THREE.RGBAFormat); texture.colorSpace = THREE.SRGBColorSpace; texture.needsUpdate = true; texture.name = `coat:${genome.pattern}`; return texture;
}
function cylinder(a: number, b: number, length: number, material: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(a, b, length, 7, 1), material); mesh.position.y = length * .5; return mesh;
}
function orientY(object: THREE.Object3D, direction: THREE.Vector3) {
  object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
}

export function createCreatureRig(genome: CreatureGenome): CreatureRig {
  if (!genome || !Number.isFinite(genome.legLength) || !Number.isFinite(genome.torsoLength)) throw new Error('Invalid creature genome');
  const g = genome, group = new THREE.Group(); group.name = `Creature rig: ${g.archetype}`;
  const root = new THREE.Group(); root.name = 'animated root'; group.add(root);
  const coat = coatTexture(g), bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, map: coat, roughness: .78, metalness: 0 }), accentMaterial = material(g.accentColor), neutralMaterial = material('#b9b5a9');
  const ownedGeometries: THREE.BufferGeometry[] = [], ownedMaterials: THREE.Material[] = [bodyMaterial, accentMaterial, neutralMaterial];
  const ownedTextures: THREE.Texture[] = [coat];
  const mesh = (geometry: THREE.BufferGeometry, mat: THREE.Material, name: string) => { ownedGeometries.push(geometry); const m = new THREE.Mesh(geometry, mat); m.name = name; return m; };
  const torsoY = g.legLength + g.torsoHeight * .35;
  const torso = new THREE.Group(); torso.name = 'torso'; torso.position.y = torsoY; root.add(torso);
  const body = mesh(new THREE.SphereGeometry(1, 12, 8), bodyMaterial, 'torso body'); body.scale.set(g.torsoLength * .52, g.torsoHeight * .42, g.torsoWidth * .52); torso.add(body);
  if (g.armor > .05) {
    const plates = Math.max(2, Math.min(6, Math.round(2 + g.armor * 4)));
    for (let i = 0; i < plates; i++) { const p = mesh(new THREE.BoxGeometry(g.torsoLength / plates * .75, g.torsoHeight * .09, g.torsoWidth * 1.02), accentMaterial, 'armor plate'); p.position.set(-g.torsoLength * .3 + i * g.torsoLength * .6 / Math.max(1, plates - 1), g.torsoHeight * .38, 0); torso.add(p); }
  }
  const neckBase = new THREE.Vector3(g.torsoLength * .42, g.torsoHeight * .12, 0), neckTip = new THREE.Vector3(g.torsoLength * .42 + g.neckLength * .35, g.torsoHeight * .12 + g.neckRise + g.neckLength * .66, 0);
  const neckDirection = neckTip.clone().sub(neckBase), neckLength = neckDirection.length();
  const neck = mesh(new THREE.CylinderGeometry(g.headWidth * .24, g.headWidth * .33, neckLength, 7), bodyMaterial, 'neck'); neck.position.copy(neckBase).addScaledVector(neckDirection, .5); orientY(neck, neckDirection); torso.add(neck);
  const head = mesh(new THREE.SphereGeometry(1, 10, 7), bodyMaterial, 'distinct head'); head.scale.set(g.headLength * .52, g.headWidth * .48, g.headWidth * .52); head.position.copy(neckTip).add(new THREE.Vector3(g.headLength * .3, 0, 0)); torso.add(head);
  for (const side of [-1, 1]) {
    const eye = mesh(new THREE.SphereGeometry(Math.max(.025, g.headWidth * .08), 7, 5), accentMaterial, 'eye'); eye.position.copy(head.position).add(new THREE.Vector3(g.headLength * .27, g.headWidth * .12, side * g.headWidth * .43)); torso.add(eye);
    if (g.earLength > .01) { const ear = mesh(new THREE.ConeGeometry(Math.max(.015, g.headWidth * .1), g.earLength, 5), accentMaterial, 'ear'); ear.position.copy(head.position).add(new THREE.Vector3(-g.headLength * .15, g.headWidth * .42, side * g.headWidth * .32)); ear.rotation.z = side * -.22; torso.add(ear); }
    if (g.hornLength > .01) { const horn = mesh(new THREE.ConeGeometry(Math.max(.012, g.headWidth * .09), g.hornLength, 6), accentMaterial, 'horn'); horn.position.copy(head.position).add(new THREE.Vector3(g.headLength * .05, g.headWidth * .48 + g.hornLength * .42, side * g.headWidth * .25)); horn.rotation.z = side * .16; torso.add(horn); }
  }
  const tailBase = new THREE.Vector3(-g.torsoLength * .43, g.torsoHeight * .02, 0), tailEnd = tailBase.clone().add(new THREE.Vector3(-g.tailLength * .84, g.tailLength * .12, 0));
  const tailDirection = tailEnd.clone().sub(tailBase), tail = mesh(new THREE.CylinderGeometry(Math.max(.012, g.torsoWidth * .09), Math.max(.006, g.torsoWidth * .025), tailDirection.length(), 7), accentMaterial, 'tail'); tail.position.copy(tailBase).addScaledVector(tailDirection, .5); orientY(tail, tailDirection); torso.add(tail);

  // Slightly longer than the neutral hip-to-floor measure gives the specified
  // bent rest stance enough reach for a shallow slope and a swing arc.
  const upperLength = Math.max(.08, g.legLength * clamp(g.upperLegFraction, .35, .7) * 1.5), lowerLength = Math.max(.08, g.legLength * (1 - clamp(g.upperLegFraction, .35, .7)) * 1.55);
  const legs: Leg[] = [], skeleton = new THREE.Group(); skeleton.name = 'solved joint overlay'; root.add(skeleton);
  const lineGeometry = new THREE.BufferGeometry(); const linePositions = new Float32Array(4 * 2 * 2 * 3); lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3)); const line = new THREE.LineSegments(lineGeometry, new THREE.LineBasicMaterial({ color: 0x59d9ff, depthTest: false, depthWrite: false })); line.renderOrder = 20; skeleton.add(line); ownedGeometries.push(lineGeometry); ownedMaterials.push(line.material);
  const markerMaterial = new THREE.MeshBasicMaterial({ color: 0x59d9ff, depthTest: false, depthWrite: false }); ownedMaterials.push(markerMaterial);
  const footY = Math.max(.025, g.footWidth * .18);
  const supportHeight = (x: number, z: number, terrain: TerrainKind) => {
    const xs = [x + g.footLength * (.28 - .5), x + g.footLength * (.28 + .5)], zs = [z - g.footWidth * .5, z + g.footWidth * .5];
    let height = creatureTerrainHeight(x, z, terrain); for (const px of xs) for (const pz of zs) height = Math.max(height, creatureTerrainHeight(px, pz, terrain)); return height;
  };
  for (const rear of [true, false]) for (const side of [-1, 1]) {
    const id = `${rear ? 'rear' : 'front'}-${side < 0 ? 'left' : 'right'}`, legRoot = new THREE.Group(); legRoot.name = id; root.add(legRoot);
    const upper = new THREE.Group(), knee = new THREE.Group(), lower = new THREE.Group(), foot = new THREE.Group(); legRoot.add(upper); upper.add(knee); knee.add(lower); lower.add(foot);
    const upperPart = cylinder(g.torsoWidth * .095, g.torsoWidth * .07, upperLength, bodyMaterial); ownedGeometries.push(upperPart.geometry); upper.add(upperPart); knee.add(mesh(new THREE.SphereGeometry(g.torsoWidth * .09, 7, 5), accentMaterial, 'knee joint'));
    const lowerPart = cylinder(g.torsoWidth * .07, g.torsoWidth * .045, lowerLength, bodyMaterial); ownedGeometries.push(lowerPart.geometry); lower.add(lowerPart); const fm = mesh(new THREE.BoxGeometry(g.footLength, footY * 1.4, g.footWidth), accentMaterial, 'planted foot'); fm.position.set(g.footLength * .28, -footY * .15, 0); foot.add(fm);
    const marker = mesh(new THREE.SphereGeometry(Math.max(.02, g.footWidth * .2), 6, 4), markerMaterial, 'foot target'); marker.renderOrder = 21; marker.visible = false; root.add(marker);
    legs.push({ id, hip: legRoot, upper, knee, lower, foot, marker, phase: (rear ? 0 : .5) + (side < 0 ? 0 : .5), rear, hipZ: side * g.torsoWidth * .3, z: side * g.stanceWidth * .5, x: rear ? -g.torsoLength * .31 : g.torsoLength * .31 });
  }
  let skeletonVisible = false, neutral = false, disposed = false;
  const setMaterials = () => group.traverse(object => { const m = object as THREE.Mesh; if (!m.isMesh || m.name === 'foot target') return; if (m.name === 'eye' || m.name === 'horn' || m.name === 'armor plate' || m.name === 'tail' || m.name === 'planted foot' || m.name === 'knee joint') m.material = neutral ? neutralMaterial : accentMaterial; else m.material = neutral ? neutralMaterial : bodyMaterial; });

  function update(time: number, gait: CreatureGait, terrain: TerrainKind): CreaturePoseDiagnostics {
    if (disposed) throw new Error('Creature rig has been disposed');
    const t = Number.isFinite(time) ? time : 0, moving = gait !== 'idle', speed = gait === 'run' ? g.runSpeed : gait === 'walk' ? g.walkSpeed : 0;
    const frequency = gait === 'run' ? Math.max(.5, speed / Math.max(.1, g.strideLength)) : Math.max(.35, speed / Math.max(.1, g.strideLength));
    const duty = gait === 'run' ? .42 : gait === 'walk' ? .66 : 1;
    const rootX = moving ? speed * t : 0, rootY = creatureTerrainHeight(rootX, 0, terrain); root.position.set(rootX, rootY, 0);
    const bodyBob = moving ? Math.sin(t * frequency * Math.PI * 2) * (gait === 'run' ? .055 : .022) : 0;
    torso.position.y = torsoY + bodyBob;
    const joints: number[] = [], pending: { leg: Leg; stance: boolean; target: THREE.Vector3 }[] = []; let reachError = 0;
    for (const leg of legs) {
      const cycle = t * frequency + leg.phase, index = Math.floor(cycle), p = cycle - index;
      // Phase belongs to the gait cycle, not the terrain.  Removing it here
      // makes each stance target stay at one fixed world/arena coordinate.
      const contactX = leg.x + (index + duty * .5 - leg.phase) * (speed / Math.max(frequency, 1e-6));
      const nextX = contactX + speed / Math.max(frequency, 1e-6);
      let fx = contactX, lift = 0, stance = true;
      if (moving && p >= duty) { stance = false; const s = (p - duty) / (1 - duty); fx = contactX + (nextX - contactX) * s; lift = Math.sin(s * Math.PI) * (gait === 'run' ? .18 : .105); }
      if (!moving) { fx = leg.x; stance = true; }
      const ground = supportHeight(fx, leg.z, terrain), fy = ground + footY * .85 + lift, footPoint = new THREE.Vector3(fx, fy, leg.z);
      const hipPoint = new THREE.Vector3(rootX + leg.x, rootY + torsoY + bodyBob - g.torsoHeight * .14, leg.hipZ);
      const delta = footPoint.clone().sub(hipPoint), distance = delta.length(), maxD = upperLength + lowerLength - 1e-5, minD = Math.abs(upperLength - lowerLength) + 1e-5, d = clamp(distance, minD, maxD);
      const axis = delta.multiplyScalar(1 / Math.max(distance, 1e-7));
      const along = (upperLength * upperLength - lowerLength * lowerLength + d * d) / (2 * d), bend = Math.sqrt(Math.max(0, upperLength * upperLength - along * along));
      const pole = new THREE.Vector3(-axis.y, axis.x, 0).normalize().multiplyScalar(leg.rear ? -1 : 1);
      const kneePoint = hipPoint.clone().addScaledVector(axis, along).addScaledVector(pole, bend);
      const solvedFoot = hipPoint.clone().addScaledVector(axis, d);
      leg.hip.position.set(leg.x, torsoY + bodyBob - g.torsoHeight * .14, leg.hipZ);
      const upperDir = kneePoint.clone().sub(hipPoint).normalize(); orientY(leg.upper, upperDir); leg.knee.position.set(0, upperLength, 0);
      const lowerDir = solvedFoot.clone().sub(kneePoint).normalize(), lowerWorld = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), lowerDir); leg.lower.quaternion.copy(leg.upper.quaternion.clone().invert().multiply(lowerWorld)); leg.foot.position.set(0, lowerLength, 0);
      // Counter the compound limb rotation so planted sole geometry stays level
      // in the arena's local XZ plane.
      leg.foot.quaternion.copy(leg.upper.quaternion.clone().multiply(leg.lower.quaternion).invert());
      leg.marker.position.copy(solvedFoot).sub(root.position); leg.marker.visible = skeletonVisible;
      // A non-zero diagnostic means the target lay outside the two-bone annulus
      // and was clamped before solving; it is not numerical bone-length noise.
      reachError = Math.max(reachError, Math.abs(d - distance));
      for (const q of [hipPoint, kneePoint, kneePoint, solvedFoot]) joints.push(q.x - rootX, q.y - rootY, q.z);
      pending.push({ leg, stance, target: new THREE.Vector3(fx, ground + footY * .85, leg.z) });
    }
    linePositions.set(joints); (lineGeometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true; line.visible = skeletonVisible;
    root.updateMatrixWorld(true);
    const feet: CreaturePoseDiagnostics['feet'] = []; let penetration = 0;
    for (const item of pending) {
      const actual = item.leg.foot.getWorldPosition(V()); group.worldToLocal(actual);
      // The level box sole extends .85 footY below its ankle pivot.
      const soleY = actual.y - footY * .85;
      for (const px of [actual.x + g.footLength * (.28 - .5), actual.x + g.footLength * (.28 + .5)]) for (const pz of [actual.z - g.footWidth * .5, actual.z + g.footWidth * .5]) penetration = Math.max(penetration, Math.max(0, creatureTerrainHeight(px, pz, terrain) - soleY));
      feet.push({ id: item.leg.id, position: [actual.x, actual.y, actual.z], stance: item.stance, target: [item.target.x, item.target.y, item.target.z] });
    }
    return { time: t, gait, root: [rootX, rootY, 0], feet, maxPenetration: penetration, maxReachError: reachError, jointCount: 12 };
  }
  return { group, update, setSkeletonVisible(value) { skeletonVisible = !!value; skeleton.visible = skeletonVisible; }, setNeutral(value) { neutral = !!value; setMaterials(); }, dispose() { if (disposed) return; disposed = true; group.removeFromParent(); ownedGeometries.forEach(x => x.dispose()); ownedTextures.forEach(x => x.dispose()); ownedMaterials.forEach(x => x.dispose()); group.clear(); } };
}
