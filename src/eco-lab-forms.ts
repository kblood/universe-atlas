/**
 * ECO-CLASS-1 Biome Lab forms (BIOME2-ECO). Pure three.js geometry, no DOM, so
 * node tests can measure it.
 *
 * Footprint contract: every non-rock eco form is normalised to unit height and
 * unit horizontal radius (the largest vertex distance from the stem axis), and
 * the lab scales an instance horizontally by recipeFootprintM(recipe, sizeM).
 * The rendered crown radius therefore IS the queryable footprint that
 * biome-ecology's coverage grid uses. A form whose authored proportions differ
 * from its kind's default footprint carries `crownRadiusPerSizeM` in its recipe
 * (data, not geometry). tests/eco-lab-forms.test.mjs fails on a mismatch.
 *
 * Rock forms (lichen-rock, mound) keep their raw geometry: the lab scales rocks
 * uniformly by sizeM and coverage deliberately omits rocks.
 */
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { ElementRecipe } from "./biome-ecology.ts";
import { recipeFootprintM } from "./biome-ecology.ts";

export type FormPart = { geometry: THREE.BufferGeometry; position?: THREE.Vector3; scale?: THREE.Vector3; rotation?: THREE.Quaternion; color?: string };

/** Merge coloured parts into one non-indexed geometry (shared with the original lab forms). */
export function combined(parts: FormPart[]) {
  const geometries = parts.map(({ geometry, position, scale, rotation }) => {
    const cloned = geometry.clone(), item = cloned.index ? cloned.toNonIndexed() : cloned; if (item !== cloned) cloned.dispose(); item.applyMatrix4(new THREE.Matrix4().compose(position ?? new THREE.Vector3(), rotation ?? new THREE.Quaternion(), scale ?? new THREE.Vector3(1, 1, 1))); geometry.dispose(); return item;
  });
  for (let i=0;i<geometries.length;i++) { const color = new THREE.Color(parts[i].color ?? "#ffffff"), count=geometries[i].getAttribute("position").count; geometries[i].setAttribute("color",new THREE.Float32BufferAttribute(Array.from({length:count},()=>[color.r,color.g,color.b]).flat(),3)); }
  const result = mergeGeometries(geometries, false) ?? geometries[0]; geometries.forEach((g) => { if (g !== result) g.dispose(); }); return result;
}
export function pointedRibbon(height: number, width: number, curve: number) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute([
    -width,0,0, width,0,0, -width*.62,height*.55,curve*.36, width*.62,height*.55,curve*.36, 0,height,curve,
  ], 3));
  geometry.setIndex([0,1,2, 1,3,2, 2,3,4]);
  geometry.computeVertexNormals(); return geometry;
}

/** Instance height multiplier per eco form (a cushion is wider than tall). Keys
 * are the exact eco form names, so the nine original biomes keep their geometry. */
export const ECO_FORM_HEIGHT_FACTOR: Readonly<Record<string, number>> = Object.freeze({
  "spire": 1, "umbrella": 1, "buttress": 1, "columnar": 1, "dwarf-shrub": 1, "cushion-dome": .35,
  "fan-palm": 1, "thorn": 1, "tussock": 1, "tall-tuft": 1, "flower-herb": 1, "mat": 1,
});
export const isEcoVegetationForm = (form: string) => Object.hasOwn(ECO_FORM_HEIGHT_FACTOR, form);

// Eco parts mix ribbons (no uv) with three primitives (uv); drop uv so
// mergeGeometries accepts every part instead of falling back to part 0.
function ecoCombined(parts: FormPart[]) { for (const part of parts) part.geometry.deleteAttribute("uv"); return combined(parts); }
const yaw = (angle: number) => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
function tuftClump(colors: string[], count: number, height: number, lean: number, spread: number, heads?: string[]) {
  const parts: FormPart[] = [];
  for (let i = 0; i < count; i++) {
    const angle = i * 2.39996, radius = spread * (.08 + .92 * ((i * 17) % count) / count), h = height * (.78 + ((i * 13) % 11) / 40);
    const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
    parts.push({ geometry: pointedRibbon(h, .016 + (i % 3) * .006, lean * (.6 + (i % 5) * .12)), position: new THREE.Vector3(x, 0, z), rotation: yaw(angle), color: colors[i % colors.length]! });
    if (heads && i % 3 === 0) parts.push({ geometry: new THREE.IcosahedronGeometry(.045, 0), position: new THREE.Vector3(x, h * .97, z + lean * .5), color: heads[(i / 3) % heads.length | 0]! });
  }
  return ecoCombined(parts);
}
function buttressFin() { const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, -.006), new THREE.Vector3(0, 0, .2), new THREE.Vector3(0, .2, 0), new THREE.Vector3(0, 0, .006)]); g.setIndex([0, 1, 2, 3, 2, 1]); g.computeVertexNormals(); return g; }

/** Raw authored eco form geometry (not normalised), or null for a non-eco form. */
export function ecoFormGeometry(recipe: ElementRecipe): THREE.BufferGeometry | null {
  const c = recipe.color, V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  switch (recipe.form) {
    case "spire": return ecoCombined([
      { geometry: new THREE.CylinderGeometry(.03, .045, .3, 6), position: V(0, .15, 0), color: "#4f3c28" },
      { geometry: new THREE.ConeGeometry(.13, .38, 7), position: V(0, .38, 0), color: c },
      { geometry: new THREE.ConeGeometry(.105, .34, 7), position: V(0, .58, 0), color: c },
      { geometry: new THREE.ConeGeometry(.08, .3, 7), position: V(0, .76, 0), color: c },
      { geometry: new THREE.ConeGeometry(.05, .22, 6), position: V(0, .92, 0), color: c },
    ]);
    case "umbrella": return ecoCombined([
      { geometry: new THREE.CylinderGeometry(.026, .04, .58, 6), position: V(0, .29, 0), color: "#5a4632" },
      { geometry: new THREE.CylinderGeometry(.015, .022, .26, 5), position: V(.07, .64, 0), rotation: new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), -.6), color: "#5a4632" },
      { geometry: new THREE.CylinderGeometry(.015, .022, .26, 5), position: V(-.06, .63, .03), rotation: new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), .55), color: "#5a4632" },
      { geometry: new THREE.CylinderGeometry(.5, .4, .09, 12), position: V(0, .76, 0), color: c },
      { geometry: new THREE.CylinderGeometry(.34, .3, .07, 10), position: V(.08, .82, -.04), color: c },
    ]);
    case "buttress": {
      const parts: FormPart[] = [
        { geometry: new THREE.CylinderGeometry(.045, .07, .8, 8), position: V(0, .4, 0), color: "#6e5d47" },
        { geometry: new THREE.IcosahedronGeometry(.34, 1), position: V(0, .88, 0), scale: V(1.35, .42, 1.35), color: c },
        { geometry: new THREE.IcosahedronGeometry(.2, 1), position: V(.2, .8, .1), color: "#3a6a30" },
        { geometry: new THREE.IcosahedronGeometry(.19, 1), position: V(-.18, .83, -.12), color: "#28502a" },
      ];
      for (let i = 0; i < 5; i++) { const a = i * 1.2566 + .3; parts.push({ geometry: buttressFin(), position: V(Math.cos(a) * .03, 0, Math.sin(a) * .03), rotation: yaw(Math.PI / 2 - a), color: "#6e5d47" }); }
      return ecoCombined(parts);
    }
    case "columnar": return ecoCombined([
      { geometry: new THREE.CylinderGeometry(.07, .08, .9, 9), position: V(0, .45, 0), color: c },
      { geometry: new THREE.SphereGeometry(.07, 9, 5, 0, Math.PI * 2, 0, Math.PI / 2), position: V(0, .9, 0), color: c },
      { geometry: new THREE.CylinderGeometry(.04, .04, .16, 7), position: V(.11, .4, 0), rotation: new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), Math.PI / 2), color: c },
      { geometry: new THREE.CylinderGeometry(.04, .045, .3, 7), position: V(.2, .53, 0), color: c },
      { geometry: new THREE.CylinderGeometry(.04, .04, .14, 7), position: V(-.1, .3, 0), rotation: new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), Math.PI / 2), color: c },
      { geometry: new THREE.CylinderGeometry(.038, .04, .24, 7), position: V(-.18, .4, 0), color: c },
    ]);
    case "dwarf-shrub": return ecoCombined([0, 1, 2, 3, 4, 5].map(i => ({ geometry: new THREE.IcosahedronGeometry(.17 + (i % 3) * .03, 0), position: V(Math.cos(i * 2.1) * .24 * (i % 2 ? 1 : .55), .14 + (i % 3) * .07, Math.sin(i * 2.1) * .24 * (i % 2 ? 1 : .55)), color: i % 2 ? c : "#6f6a3c" })));
    case "cushion-dome": return ecoCombined([{ geometry: new THREE.SphereGeometry(.5, 12, 5, 0, Math.PI * 2, 0, Math.PI / 2), color: c }]);
    case "fan-palm": {
      const parts: FormPart[] = [{ geometry: new THREE.CylinderGeometry(.025, .035, .35, 6), position: V(0, .17, 0), color: "#5b4a33" }];
      for (let i = 0; i < 9; i++) parts.push({ geometry: pointedRibbon(.55, .085, .2), position: V(0, .33, 0), rotation: yaw(i * .698).multiply(new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), .95 + (i % 3) * .15)), color: i % 2 ? c : "#4f8a3c" });
      return ecoCombined(parts);
    }
    case "thorn": return ecoCombined([
      { geometry: new THREE.CylinderGeometry(.018, .03, .3, 5), position: V(0, .15, 0), color: "#5a4a34" },
      { geometry: new THREE.IcosahedronGeometry(.45, 0), position: V(0, .4, 0), scale: V(1, .38, 1), color: c },
      { geometry: new THREE.IcosahedronGeometry(.25, 0), position: V(.2, .3, .1), scale: V(1, .45, 1), color: "#6b6338" },
    ]);
    case "tussock": return tuftClump([c, "#c0ae74", c, "#86794a"], 44, .62, .26, .9);
    case "tall-tuft": return tuftClump([c, "#dcc274", "#b39648"], 40, .95, .2, .75, ["#e6d08a"]);
    case "flower-herb": return tuftClump([c, "#6a8a3e"], 18, .5, .1, .7, ["#efd84a", "#d96fb4", "#f3f1ea", "#8f7ee2"]);
    case "mat": return ecoCombined([0, 1, 2, 3, 4, 5, 6].map(i => ({ geometry: new THREE.IcosahedronGeometry(.17 + (i % 3) * .04, 0), position: V(Math.cos(i * 2.6) * .36 * ((i * 5) % 7) / 6, 0, Math.sin(i * 2.6) * .36 * ((i * 5) % 7) / 6), scale: V(1, .45 + (i % 2) * .25, 1), color: ["#5f6a3e", "#8e8f6e", "#6f7a46", "#a3a283"][i % 4]! })));
    case "lichen-rock": return ecoCombined([
      { geometry: new THREE.DodecahedronGeometry(.55, 0).scale(1, .7, .9).translate(0, .38, 0), color: c },
      { geometry: new THREE.IcosahedronGeometry(.16, 1), position: V(.1, .72, .05), scale: V(1, .22, 1), color: "#c8c17a" },
      { geometry: new THREE.IcosahedronGeometry(.13, 1), position: V(-.16, .68, -.1), scale: V(1, .22, 1), color: "#d4d0ae" },
      { geometry: new THREE.IcosahedronGeometry(.11, 1), position: V(-.02, .7, .2), scale: V(1, .22, 1), color: "#a4ad7e" },
    ]);
    case "mound": return ecoCombined([
      { geometry: new THREE.ConeGeometry(.32, 1, 9), position: V(0, .5, 0), color: c },
      { geometry: new THREE.IcosahedronGeometry(.36, 1), position: V(0, .12, 0), scale: V(1, .45, 1), color: c },
      { geometry: new THREE.ConeGeometry(.12, .45, 7), position: V(.18, .3, .06), color: "#8a5838" },
    ]);
    default: return null;
  }
}

/** Largest horizontal distance of any vertex from the stem (Y) axis. */
export function horizontalRadius(geometry: THREE.BufferGeometry): number {
  const p = geometry.getAttribute("position"); let r2 = 0;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); r2 = Math.max(r2, x * x + z * z); }
  return Math.sqrt(r2);
}
/** Vertical extent (max Y - min Y). */
export function verticalExtent(geometry: THREE.BufferGeometry): number {
  const p = geometry.getAttribute("position"); let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); lo = Math.min(lo, y); hi = Math.max(hi, y); }
  return hi - lo;
}

/** Eco vegetation geometry normalised to base y=0, unit height and unit
 * horizontal radius; null for a rock or non-eco form. */
export function ecoVegetationGeometry(recipe: ElementRecipe): THREE.BufferGeometry | null {
  if (recipe.kind === "rock" || !isEcoVegetationForm(recipe.form)) return null;
  const geometry = ecoFormGeometry(recipe); if (!geometry) return null;
  geometry.computeBoundingBox(); const minY = geometry.boundingBox!.min.y, height = verticalExtent(geometry), radius = horizontalRadius(geometry);
  geometry.translate(0, -minY, 0); geometry.scale(1 / radius, 1 / height, 1 / radius); geometry.computeVertexNormals();
  return geometry;
}

/** Instance scale for a normalised eco vegetation form: horizontal = the
 * queryable footprint radius, vertical = sizeM x the form's height factor. */
export function ecoInstanceScale(recipe: ElementRecipe, sizeM: number): [number, number, number] {
  const r = recipeFootprintM(recipe, sizeM); return [r, sizeM * (ECO_FORM_HEIGHT_FACTOR[recipe.form] ?? 1), r];
}

/** Rendered crown radius / queryable footprint radius for a geometry scaled by
 * ecoInstanceScale. 1 means the visible crown and the coverage disc agree. */
export function renderedFootprintRatio(recipe: ElementRecipe, geometry: THREE.BufferGeometry, sizeM: number): number {
  return horizontalRadius(geometry) * ecoInstanceScale(recipe, sizeM)[0] / recipeFootprintM(recipe, sizeM);
}
