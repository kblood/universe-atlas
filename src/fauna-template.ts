/** Morph/rig coupling adapted from CharacterCreator web/character.js at
 * d9d72e7628c4a7b4bfa1127627104042fe887e12 (MIT, Kasper Olesen).
 * See docs/third-party/charactercreator-MIT.txt. Animal contracts and local
 * joint-delta evaluation are Atlas-specific; no human assets are included. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';

export const FAUNA_TEMPLATE_VERSION = 'fauna-template-1';
export const FAUNA_TEMPLATE_CONTROLS = ['bodyCondition', 'neckLength', 'legLength', 'muzzleLength', 'earSize', 'juvenile'] as const;
export type FaunaTemplateControl = typeof FAUNA_TEMPLATE_CONTROLS[number];
type V3 = [number, number, number];
type Q4 = [number, number, number, number];
export interface FaunaTemplateSidecar {
  schemaVersion: typeof FAUNA_TEMPLATE_VERSION;
  id: string; mesh: string; runtime: string; source: string;
  units: 'metres'; upAxis: '+Y'; forwardAxis: '+X';
  neutralJoints: Record<string, { parent: string | null; translation: V3; rotation: Q4; scale: V3 }>;
  targets: { name: string; min: number; max: number; default: number; jointDeltas: Record<string, V3> }[];
  controls: Record<FaunaTemplateControl, { min: number; max: number; negative?: string; positive: string }>;
  correctives: { target: string; a: string; b: string }[];
  /** Signed cranial swing about neutral model +Z, measured in the joint's
   * parent coordinates so root placement and parent rotation cancel. */
  poseCorrectives?: { target: string; joint: string; child: string; driver: 'sagittal-flexion'; startRadians: number; fullRadians: number; morphScale?: 'support-edge-projection' }[];
}
export interface FaunaTemplatePoseState { angles: Record<string, number>; influences: Record<string, number>; scales: Record<string, number> }
export type FaunaTemplateValues = Partial<Record<FaunaTemplateControl, number>>;
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const name = (v: unknown): v is string => typeof v === 'string' && /^[A-Za-z][A-Za-z0-9_.-]{0,95}$/.test(v);
const vector = (v: unknown, length: number) => Array.isArray(v) && v.length === length && v.every(n => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= 100);

/** Data only: reject unknown names, cycles, unsupported ranges and nonfinite
 * numbers before constructing a skeleton or allocating its per-instance state. */
export function validateFaunaTemplateSidecar(value: unknown): string[] {
  if (!record(value)) return ['template sidecar must be an object'];
  const errors: string[] = [];
  if (value.schemaVersion !== FAUNA_TEMPLATE_VERSION) errors.push('unsupported fauna template version');
  if (!name(value.id) || !name(value.mesh)) errors.push('template id and mesh must be deterministic names');
  if (typeof value.runtime !== 'string' || !/^[A-Za-z0-9_.-]+\.glb$/.test(value.runtime) || typeof value.source !== 'string' || !/^[A-Za-z0-9_.-]+\.blend$/.test(value.source)) errors.push('runtime and source must be local asset filenames');
  if (value.units !== 'metres' || value.upAxis !== '+Y' || value.forwardAxis !== '+X') errors.push('template must use metres, +Y up and +X forward');
  const joints = record(value.neutralJoints) ? value.neutralJoints : {};
  if (!Object.keys(joints).length || Object.keys(joints).length > 96) errors.push('template requires 1 to 96 neutral joints');
  for (const [key, joint] of Object.entries(joints)) {
    if (!name(key) || !record(joint)) { errors.push(`invalid joint ${key}`); continue; }
    if (joint.parent !== null && (typeof joint.parent !== 'string' || !(joint.parent in joints) || joint.parent === key)) errors.push(`invalid parent for ${key}`);
    if (!vector(joint.translation, 3) || !vector(joint.rotation, 4) || !vector(joint.scale, 3)) errors.push(`invalid neutral transform for ${key}`);
    else {
      if (Math.abs(Math.hypot(...joint.rotation as Q4) - 1) > 1e-5) errors.push(`nonunit rotation for ${key}`);
      if ((joint.scale as V3).some(s => Math.abs(s - 1) > 1e-6)) errors.push(`unapplied joint scale for ${key}`);
    }
    const seen = new Set([key]); let parent = joint.parent;
    while (typeof parent === 'string' && record(joints[parent])) {
      if (seen.has(parent)) { errors.push(`joint hierarchy cycle at ${key}`); break; }
      seen.add(parent); parent = (joints[parent] as Record<string, unknown>).parent;
    }
  }
  const targets = Array.isArray(value.targets) ? value.targets : [];
  if (!targets.length || targets.length > 32) errors.push('template requires 1 to 32 morph targets');
  const targetNames = new Set<string>();
  for (const t of targets) {
    if (!record(t) || !name(t.name)) { errors.push('invalid morph target'); continue; }
    if (targetNames.has(t.name)) errors.push(`duplicate morph target ${t.name}`);
    targetNames.add(t.name);
    if (t.min !== 0 || t.max !== 1 || t.default !== 0) errors.push(`target ${t.name} must use neutral 0 and range 0..1`);
    if (!record(t.jointDeltas)) errors.push(`invalid joint deltas for ${t.name}`);
    else for (const [bone, delta] of Object.entries(t.jointDeltas)) {
      if (!(bone in joints) || !vector(delta, 3)) errors.push(`invalid ${t.name} joint delta ${bone}`);
    }
  }
  const controls = record(value.controls) ? value.controls : {};
  const driven = new Set<string>();
  for (const id of FAUNA_TEMPLATE_CONTROLS) {
    const c = controls[id];
    if (!record(c)) { errors.push(`missing control ${id}`); continue; }
    if (c.min !== (id === 'juvenile' ? 0 : -1) || c.max !== 1) errors.push(`invalid control range ${id}`);
    for (const target of [c.positive, ...(id === 'juvenile' ? [] : [c.negative])]) {
      if (typeof target !== 'string' || !targetNames.has(target)) errors.push(`unknown ${id} target`);
      else if (driven.has(target)) errors.push(`target driven by multiple controls: ${target}`);
      else driven.add(target);
    }
    if (id === 'juvenile' && c.negative !== undefined) errors.push('juvenile cannot have a negative target');
  }
  if (Object.keys(controls).some(id => !FAUNA_TEMPLATE_CONTROLS.includes(id as FaunaTemplateControl))) errors.push('unknown template control');
  if (!Array.isArray(value.correctives)) errors.push('correctives must be an array');
  else for (const c of value.correctives) {
    if (!record(c) || typeof c.target !== 'string' || !targetNames.has(c.target) || driven.has(c.target) || typeof c.a !== 'string' || typeof c.b !== 'string' || !driven.has(c.a) || !driven.has(c.b)) errors.push('invalid corrective recipe');
  }
  if (Array.isArray(value.correctives)) {
    const correctiveNames = value.correctives.filter(record).map(c => c.target);
    if (new Set(correctiveNames).size !== correctiveNames.length) errors.push('duplicate corrective target');
    const poseNames = new Set<string>();
    if (value.poseCorrectives !== undefined && !Array.isArray(value.poseCorrectives)) errors.push('poseCorrectives must be an array');
    else for (const p of (value.poseCorrectives as unknown[] | undefined) ?? []) {
      if (!record(p)) { errors.push('invalid pose corrective'); continue; }
      if (Object.keys(p).some(k => !['target','joint','child','driver','startRadians','fullRadians','morphScale'].includes(k))) errors.push('unknown pose corrective field');
      if (p.morphScale !== undefined && p.morphScale !== 'support-edge-projection') errors.push('unknown pose morphology scale');
      if (typeof p.target !== 'string' || !targetNames.has(p.target) || driven.has(p.target) || correctiveNames.includes(p.target) || poseNames.has(p.target)) errors.push('invalid or multiply driven pose target');
      else poseNames.add(p.target);
      if (typeof p.joint !== 'string' || !record(joints[p.joint]) || typeof p.child !== 'string' || !record(joints[p.child]) || (joints[p.child] as Record<string,unknown>).parent !== p.joint) errors.push('pose driver requires an existing direct joint/child pair');
      if (p.driver !== 'sagittal-flexion' || typeof p.startRadians !== 'number' || !Number.isFinite(p.startRadians) || typeof p.fullRadians !== 'number' || !Number.isFinite(p.fullRadians) || p.startRadians < 0 || p.fullRadians <= p.startRadians || p.fullRadians > Math.PI / 2) errors.push('invalid bounded pose driver range');
      const target = targets.find(t => record(t) && t.name === p.target);
      if (record(target) && record(target.jointDeltas) && Object.values(target.jointDeltas).some(d => !vector(d,3) || (d as V3).some(n => n !== 0))) errors.push('pose correctives cannot move neutral joints');
    }
    for (const t of targetNames) if (!driven.has(t) && !correctiveNames.includes(t) && !poseNames.has(t)) errors.push(`undriven morph target ${t}`);
  }
  return errors;
}
function checkedSidecar(value: unknown): FaunaTemplateSidecar {
  const errors = validateFaunaTemplateSidecar(value);
  if (errors.length) throw new Error(`Invalid fauna template: ${errors.join('; ')}`);
  return structuredClone(value) as FaunaTemplateSidecar;
}

/** Bipolar controls and product correctives, as in CharacterCreator; the
 * catalogue is the validated animal sidecar rather than human slider constants. */
export function faunaTemplateInfluences(sidecar: FaunaTemplateSidecar, values: FaunaTemplateValues = {}): Record<string, number> {
  const out: Record<string, number> = Object.fromEntries(sidecar.targets.map(t => [t.name, 0]));
  for (const [key, value] of Object.entries(values)) if (!FAUNA_TEMPLATE_CONTROLS.includes(key as FaunaTemplateControl) || !Number.isFinite(value)) throw new Error(`Invalid fauna template control ${key}`);
  for (const id of FAUNA_TEMPLATE_CONTROLS) {
    const c = sidecar.controls[id], v = Math.max(c.min, Math.min(c.max, values[id] ?? 0));
    out[c.positive] = Math.max(0, v);
    if (c.negative) out[c.negative] = Math.max(0, -v);
  }
  for (const c of sidecar.correctives) out[c.target] = out[c.a]! * out[c.b]!;
  return out;
}

function meshesIn(root: THREE.Object3D): THREE.SkinnedMesh[] {
  const meshes: THREE.SkinnedMesh[] = [];
  root.traverse(o => { if ((o as THREE.SkinnedMesh).isSkinnedMesh) meshes.push(o as THREE.SkinnedMesh); });
  return meshes;
}
function primaryMesh(root: THREE.Object3D, s: FaunaTemplateSidecar): THREE.SkinnedMesh {
  const matches: THREE.Object3D[] = []; root.traverse(o => { if (o.name === s.mesh) matches.push(o); });
  if (matches.length !== 1) throw new Error(`Missing or ambiguous skinned template mesh ${s.mesh}`);
  // GLTFLoader represents a glTF mesh with several material primitives as a
  // named Group containing SkinnedMeshes. Keep the authored glTF node name.
  const parts = meshesIn(matches[0]!);
  if (!parts.length) throw new Error(`Missing skinned template primitives ${s.mesh}`);
  return parts[0]!;
}
function validateSource(root: THREE.Object3D, s: FaunaTemplateSidecar) {
  const mesh = primaryMesh(root, s);
  for (const t of s.targets) {
    const i = mesh.morphTargetDictionary?.[t.name];
    const attr = i === undefined ? undefined : mesh.geometry.morphAttributes.position?.[i];
    if (i === undefined || !attr || attr.count !== mesh.geometry.attributes.position?.count) throw new Error(`Missing or invalid morph target ${t.name}`);
  }
  const bones = mesh.skeleton.bones, names = new Set(bones.map(b => b.name));
  if (names.size !== bones.length || bones.length !== Object.keys(s.neutralJoints).length) throw new Error('Template skeleton joint count/names do not match sidecar');
  for (const b of bones) {
    const j = s.neutralJoints[b.name];
    if (!j) throw new Error(`Sidecar missing joint ${b.name}`);
    const actualParent = (b.parent as THREE.Bone | null)?.isBone ? b.parent!.name : null;
    if (j.parent !== actualParent || b.position.distanceTo(new THREE.Vector3(...j.translation)) > 1e-4 || b.quaternion.clone().normalize().angleTo(new THREE.Quaternion(...j.rotation).normalize()) > 1e-4 || b.scale.distanceTo(new THREE.Vector3(...j.scale)) > 1e-5) throw new Error(`Sidecar rest transform mismatch for ${b.name}`);
  }
  for (const part of meshesIn(root)) {
    for (const b of part.skeleton.bones) if (!names.has(b.name)) throw new Error(`Attachment has unknown joint ${b.name}`);
    // Every moving attachment carries the same target set, even zero deltas.
    for (const t of s.targets) if (part.morphTargetDictionary?.[t.name] === undefined) throw new Error(`Attachment ${part.name} missing morph target ${t.name}`);
  }
}

function disposeSource(source: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>(), skeletons = new Set<THREE.Skeleton>();
  source.traverse(o => {
    const m = o as THREE.Mesh; if (!m.isMesh) return;
    geometries.add(m.geometry); for (const material of Array.isArray(m.material) ? m.material : [m.material]) materials.add(material);
    if ((m as THREE.SkinnedMesh).isSkinnedMesh) skeletons.add((m as THREE.SkinnedMesh).skeleton);
  });
  for (const material of materials) for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
  for (const g of geometries) g.dispose(); for (const m of materials) m.dispose(); for (const t of textures) t.dispose(); for (const s of skeletons) s.dispose();
}

export interface FaunaTemplateInstance {
  root: THREE.Object3D;
  mesh: THREE.SkinnedMesh;
  bones: ReadonlyMap<string, THREE.Bone>;
  apply(values?: FaunaTemplateValues): void;
  resetPose(): void;
  /** Replaces pose-only weights from the current actual joint rotations. */
  updatePoseCorrectives(): FaunaTemplatePoseState;
  controls(): FaunaTemplateValues;
  influences(): Record<string, number>;
  dispose(): void;
}

/** A loaded CPU/GPU asset shared by instances. Each instance owns its skeleton,
 * inverse bind matrices, influence arrays and material copies. Mesh buffers and
 * texture maps belong to the template and are released only with that owner. */
export function createFaunaTemplate(source: THREE.Object3D, rawSidecar: unknown, options: { ownsSource?: boolean; sourceHash?: string; sourceUrl?: string; sidecarHash?: string } = {}) {
  const sidecar = checkedSidecar(rawSidecar); validateSource(source, sidecar);
  const instances = new Set<FaunaTemplateInstance>(); let disposed = false;
  return {
    sidecar,
    sourceHash: options.sourceHash ?? null,
    sidecarHash: options.sidecarHash ?? null,
    sourceUrl: options.sourceUrl ?? null,
    instantiate(): FaunaTemplateInstance {
      if (disposed) throw new Error('Fauna template has been disposed');
      const root = cloneSkeleton(source), meshes = meshesIn(root), mesh = primaryMesh(root, sidecar);
      const bones = new Map(mesh.skeleton.bones.map(b => [b.name, b]));
      const materials = new Map<THREE.Material, THREE.Material>();
      for (const m of meshes) {
        m.material = Array.isArray(m.material) ? m.material.map(copyMaterial) : copyMaterial(m.material);
        if (m.morphTargetInfluences) m.morphTargetInfluences = [...m.morphTargetInfluences];
      }
      function copyMaterial(material: THREE.Material) { let copy = materials.get(material); if (!copy) { copy = material.clone(); materials.set(material, copy); } return copy; }
      const skeletons = [...new Set(meshes.map(m => m.skeleton))];
      // SkeletonUtils clones bones but Skeleton.clone keeps inverse Matrix4
      // objects shared. Rebinding one individual must never alter its siblings
      // or the reusable source skeleton.
      for (const skeleton of skeletons) skeleton.boneInverses = skeleton.boneInverses.map(matrix => matrix.clone());
      const rest = new Map<THREE.Object3D, { position: THREE.Vector3; rotation: THREE.Quaternion; scale: THREE.Vector3; relative: THREE.Matrix4 }>();
      const capture = (o: THREE.Object3D, parent: THREE.Matrix4) => {
        const relative = o === root ? new THREE.Matrix4() : parent.clone().multiply(new THREE.Matrix4().compose(o.position, o.quaternion, o.scale));
        rest.set(o, { position: o.position.clone(), rotation: o.quaternion.clone(), scale: o.scale.clone(), relative });
        for (const child of o.children) capture(child, relative);
      };
      capture(root, new THREE.Matrix4());
      const originalInverses = new Map(skeletons.map(s => [s, s.boneInverses.map(m => m.clone())]));
      const poseDrivers = (sidecar.poseCorrectives ?? []).map(recipe => {
        const joint = bones.get(recipe.joint)!, child = bones.get(recipe.child)!;
        const parentRotation = new THREE.Quaternion().setFromRotationMatrix(rest.get(joint.parent!)!.relative);
        const axis = new THREE.Vector3(0,0,1).applyQuaternion(parentRotation.invert()).normalize();
        const support: { mesh: THREE.SkinnedMesh; a: number; b: number; axis: THREE.Vector3; projection: number; importance: number }[] = [];
        if (recipe.morphScale) {
          const sources = meshes.map(m => {
            const base = m.geometry.attributes.position!, attribute = m.geometry.morphAttributes.position![m.morphTargetDictionary![recipe.target]!]!;
            const vectors = Array.from({length:base.count},(_,i)=>{const v=new THREE.Vector3().fromBufferAttribute(attribute,i);if(!m.geometry.morphTargetsRelative)v.sub(new THREE.Vector3().fromBufferAttribute(base,i));return v;});
            return { mesh:m, vectors, magnitudes:vectors.map(v=>v.length()) };
          });
          const maximum = Math.max(0,...sources.flatMap(s=>s.magnitudes));
          for (const source of sources) {
            const m=source.mesh,position=m.geometry.attributes.position!,index=m.geometry.index,seen=new Set<string>();
            const count=index?.count??position.count;
            for(let t=0;t<count;t+=3)for(let k=0;k<3;k++){
              const a=index?index.getX(t+k):t+k,b=index?index.getX(t+(k+1)%3):t+(k+1)%3,key=`${Math.min(a,b)}/${Math.max(a,b)}`;
              if(seen.has(key))continue;seen.add(key);
              const importance=Math.max(source.magnitudes[a]!,source.magnitudes[b]!);if(!maximum||importance<maximum*.1)continue;
              const direction=source.vectors[a]!.clone().add(source.vectors[b]!).normalize();
              const edge=new THREE.Vector3().fromBufferAttribute(position,b).sub(new THREE.Vector3().fromBufferAttribute(position,a)),projection=edge.dot(direction);
              if(Math.abs(projection)<.0005)continue;
              support.push({mesh:m,a,b,axis:direction,projection,importance});
            }
          }
          if(!support.length)throw new Error(`Pose corrective ${recipe.target} has no measurable directional support edges`);
        }
        return { recipe, joint, child, axis, support, scale:1 };
      });
      // A skinned point is a convex combination of transformed bone-local
      // points. Bone-local AABBs containing the complete 0..1 pose-morph
      // envelope therefore give conservative bounds using O(bones) work/frame.
      // Build the O(vertices) envelopes only when static morphology changes.
      const poseBounds=new Map<THREE.SkinnedMesh,{boxes:THREE.Box3[];normalizationError:number}>();
      function refreshPoseBounds(){
        const scratch=new THREE.Box3();
        for(const[m,{boxes,normalizationError}]of poseBounds){
          m.boundingBox??=new THREE.Box3();m.boundingBox.makeEmpty();
          for(let i=0;i<boxes.length;i++)if(!boxes[i]!.isEmpty())m.boundingBox.union(scratch.copy(boxes[i]!).applyMatrix4(m.skeleton.bones[i]!.matrixWorld).applyMatrix4(m.bindMatrixInverse));
          const magnitude=Math.max(1,...m.boundingBox.min.toArray().map(Math.abs),...m.boundingBox.max.toArray().map(Math.abs));
          m.boundingBox.expandByScalar(magnitude*normalizationError+1e-7);
          m.boundingSphere??=new THREE.Sphere();m.boundingBox.getBoundingSphere(m.boundingSphere);
        }
      }
      function rebuildPoseBounds(){
        const positions=new Map<THREE.SkinnedMesh,THREE.Vector3[]>();
        for(const m of meshes){
          const g=m.geometry,p=g.attributes.position!,skin=g.attributes.skinIndex!,skinWeights=g.attributes.skinWeight!;
          const boxes=m.skeleton.bones.map(()=>new THREE.Box3()),transforms=m.skeleton.boneInverses.map(inverse=>inverse.clone().multiply(m.bindMatrix));
          const staticPositions:THREE.Vector3[]=[],delta=new THREE.Vector3(),envelope=new THREE.Box3(),local=new THREE.Box3();let normalizationError=0;
          for(let i=0;i<p.count;i++){
            const base=new THREE.Vector3().fromBufferAttribute(p,i),point=base.clone();
            for(const[name,weight]of Object.entries(weights))if(weight){delta.fromBufferAttribute(g.morphAttributes.position![m.morphTargetDictionary![name]!]!,i);if(!g.morphTargetsRelative)delta.sub(base);point.addScaledVector(delta,weight);}
            staticPositions.push(point);envelope.min.copy(point);envelope.max.copy(point);
            for(const driver of poseDrivers){delta.fromBufferAttribute(g.morphAttributes.position![m.morphTargetDictionary![driver.recipe.target]!]!,i);if(!g.morphTargetsRelative)delta.sub(base);for(let a=0;a<3;a++){const d=delta.getComponent(a);envelope.min.setComponent(a,envelope.min.getComponent(a)+Math.min(0,d));envelope.max.setComponent(a,envelope.max.getComponent(a)+Math.max(0,d));}}
            let total=0;for(let k=0;k<4;k++){const weight=skinWeights.getComponent(i,k);total+=weight;if(weight>0){const bone=skin.getComponent(i,k);boxes[bone]!.union(local.copy(envelope).applyMatrix4(transforms[bone]!));}}
            normalizationError=Math.max(normalizationError,Math.abs(total-1));
          }
          positions.set(m,staticPositions);poseBounds.set(m,{boxes,normalizationError});
        }
        for(const driver of poseDrivers)if(driver.support.length){
          const ratios=driver.support.map(e=>({value:Math.abs(positions.get(e.mesh)![e.b]!.clone().sub(positions.get(e.mesh)![e.a]!).dot(e.axis)/e.projection),weight:e.importance})).sort((a,b)=>a.value-b.value);
          const half=ratios.reduce((sum,r)=>sum+r.weight,0)*.5;let sum=0;
          for(const r of ratios){sum+=r.weight;if(sum>=half){driver.scale=THREE.MathUtils.clamp(r.value,0,1);break;}}
        }
        refreshPoseBounds();
      }
      let state: FaunaTemplateValues = {}, weights = faunaTemplateInfluences(sidecar), instanceDisposed = false;
      const alive = () => { if (instanceDisposed) throw new Error('Fauna template instance has been disposed'); };
      const instance: FaunaTemplateInstance = {
        root, mesh, bones,
        apply(values = {}) {
          alive(); weights = faunaTemplateInfluences(sidecar, values);
          state = Object.fromEntries(FAUNA_TEMPLATE_CONTROLS.map(id => [id, Math.max(sidecar.controls[id].min, Math.min(sidecar.controls[id].max, values[id] ?? 0))]));
          const deltas = new Map([...bones].map(([id]) => [id, new THREE.Vector3()]));
          for (const t of sidecar.targets) if (weights[t.name]) for (const [id, d] of Object.entries(t.jointDeltas)) deltas.get(id)!.addScaledVector(new THREE.Vector3(...d), weights[t.name]!);
          for (const [id, b] of bones) b.position.copy(rest.get(b)!.position).add(deltas.get(id)!);
          for (const m of meshes) for (const [name, weight] of Object.entries(weights)) m.morphTargetInfluences![m.morphTargetDictionary![name]!] = weight;
          // Build new REST matrices independently of live animation rotations.
          // As in CharacterCreator: new inverse = inverse(new rest) * old rest
          // * old inverse. Morph displacement is therefore never skinned twice.
          const newRest = new Map<THREE.Object3D, THREE.Matrix4>();
          const evaluate = (o: THREE.Object3D, parent: THREE.Matrix4) => {
            const r = rest.get(o)!, p = r.position.clone();
            if ((o as THREE.Bone).isBone && deltas.has(o.name)) p.add(deltas.get(o.name)!);
            const matrix = o === root ? new THREE.Matrix4() : parent.clone().multiply(new THREE.Matrix4().compose(p, r.rotation, r.scale));
            newRest.set(o, matrix); for (const child of o.children) evaluate(child, matrix);
          };
          evaluate(root, new THREE.Matrix4());
          for (const s of skeletons) s.bones.forEach((b, i) => s.boneInverses[i]!.copy(newRest.get(b)!).invert().multiply(rest.get(b)!.relative).multiply(originalInverses.get(s)![i]!));
          root.updateMatrixWorld(true); for (const s of skeletons) s.update();
          // Every animated skin needs bone envelopes, including templates with
          // no pose-corrective targets. Static morph changes rebuild them once;
          // the motion update refreshes their transforms after posing bones.
          rebuildPoseBounds();
        },
        resetPose() { alive(); for (const b of bones.values()) { b.quaternion.copy(rest.get(b)!.rotation); b.scale.copy(rest.get(b)!.scale); } instance.apply(state); },
        updatePoseCorrectives() {
          alive(); const result: FaunaTemplatePoseState = { angles: {}, influences: {}, scales: {} };
          for (const { recipe, joint, child, axis, scale } of poseDrivers) {
            // Current morphology changes the child translation. Use that same
            // vector with neutral/current joint rotations to isolate flexion.
            const neutral = child.position.clone().applyQuaternion(rest.get(joint)!.rotation);
            const current = child.position.clone().applyQuaternion(joint.quaternion);
            neutral.addScaledVector(axis,-neutral.dot(axis)); current.addScaledVector(axis,-current.dot(axis));
            if (neutral.lengthSq()<1e-16 || current.lengthSq()<1e-16) throw new Error(`Degenerate pose driver plane for ${recipe.target}`);
            neutral.normalize(); current.normalize();
            const measured = Math.atan2(axis.dot(new THREE.Vector3().crossVectors(neutral,current)),neutral.dot(current));
            const angle = Math.abs(measured)<1e-12 ? 0 : measured;
            const t = THREE.MathUtils.clamp((angle-recipe.startRadians)/(recipe.fullRadians-recipe.startRadians),0,1), weight = t*t*(3-2*t)*scale;
            result.angles[recipe.joint]=angle; result.influences[recipe.target]=weight;result.scales[recipe.target]=scale;
            weights[recipe.target]=weight;
            for (const m of meshes) m.morphTargetInfluences![m.morphTargetDictionary![recipe.target]!] = weight;
          }
          // Bone animation changes the cull bounds independently of whether
          // any optional pose morph is present or currently active.
          root.updateMatrixWorld(true);for(const s of skeletons)s.update();refreshPoseBounds();
          return result;
        },
        controls: () => ({ ...state }), influences: () => ({ ...weights }),
        dispose() {
          if (instanceDisposed) return; instanceDisposed = true;
          root.removeFromParent(); for (const m of materials.values()) m.dispose(); for (const s of skeletons) s.dispose();
          instances.delete(instance);
        },
      };
      instances.add(instance); instance.apply(); return instance;
    },
    dispose() {
      if (disposed) return; disposed = true; for (const instance of [...instances]) instance.dispose();
      if (options.ownsSource) disposeSource(source);
    },
  };
}

/** Fetches a packaged GLB and adjacent sidecar. GLTFLoader handles standard
 * morph attributes/skins; no generated code or remote provider is executed. */
export async function loadFaunaTemplate(glbUrl: string, sidecarUrl: string) {
  const response = await fetch(sidecarUrl);
  if (!response.ok) throw new Error(`Fauna template sidecar HTTP ${response.status}`);
  // Hash the exact response bytes: JSON reformatting also changes this revision.
  // Do not reconstruct a hash from the parsed/validated object.
  const sidecarBytes = await response.arrayBuffer();
  const sidecarHash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', sidecarBytes))].map(n => n.toString(16).padStart(2, '0')).join('');
  const sidecar = checkedSidecar(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(sidecarBytes)));
  const assetResponse = await fetch(glbUrl);
  if (!assetResponse.ok) throw new Error(`Fauna template GLB HTTP ${assetResponse.status}`);
  const bytes = await assetResponse.arrayBuffer();
  const sourceHash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(n => n.toString(16).padStart(2, '0')).join('');
  const sourceUrl = new URL(glbUrl, typeof location !== 'undefined' ? location.href : import.meta.url).href;
  const gltf = await new GLTFLoader().parseAsync(bytes, new URL('.', sourceUrl).href);
  try { return createFaunaTemplate(gltf.scene, sidecar, { ownsSource: true, sourceHash, sourceUrl, sidecarHash }); }
  catch (error) { disposeSource(gltf.scene); throw error; }
}
