import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import {
  BIOME_DEFINITIONS, ELEMENT_RECIPES, generateBiomePatch, biomeBlendAt, recipeFootprintM,
  type BiomeId, type BiomePatch, type BiomePatchConfig, type ElementRecipe,
} from "./biome-ecology.ts";
import "./biome-lab.css";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const seedInput = $("biome-seed") as HTMLInputElement;
const primary = $("primary-biome") as HTMLSelectElement;
const blend = $("blend-biome") as HTMLSelectElement;
const fmt = (value: number, digits = 0) => value.toLocaleString("en-US", { maximumFractionDigits: digits });
const escaped = (value: string) => value.replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]!));

for (const biome of BIOME_DEFINITIONS) primary.add(new Option(biome.name, biome.id));
blend.add(new Option("None (single biome)", ""));
for (const biome of BIOME_DEFINITIONS) blend.add(new Option(biome.name, biome.id));
primary.value = "woodland";

const scene = new THREE.Scene();
scene.background = new THREE.Color("#07110e");
scene.fog = new THREE.FogExp2("#07110e", 0.009);
const camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, 0.1, 450);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.65));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
$("viewport").append(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.07;
controls.minDistance = 9; controls.maxDistance = 220; controls.maxPolarAngle = Math.PI * 0.495;
scene.add(new THREE.HemisphereLight("#b6d7ff", "#24331f", 2.1));
const sun = new THREE.DirectionalLight("#ffe1b1", 3.5); sun.position.set(-60, 90, 35); sun.castShadow = false; scene.add(sun);

const groundCanvas = document.createElement("canvas"); groundCanvas.width = groundCanvas.height = 128;
const groundTexture = new THREE.CanvasTexture(groundCanvas); groundTexture.colorSpace = THREE.SRGBColorSpace;
const bed = new THREE.Mesh(new THREE.PlaneGeometry(128, 128), new THREE.MeshStandardMaterial({map:groundTexture, roughness:1}));
bed.rotation.x = -Math.PI / 2; bed.position.set(0, -0.03, 0); scene.add(bed);
const gridPoints: number[] = [];
for (let metre = -60; metre <= 60; metre += 10) { gridPoints.push(metre,.01,-64, metre,.01,64, -64,.01,metre, 64,.01,metre); }
const gridGeometry = new THREE.BufferGeometry(); gridGeometry.setAttribute("position", new THREE.Float32BufferAttribute(gridPoints, 3));
const boundary = new THREE.LineSegments(gridGeometry, new THREE.LineBasicMaterial({color:"#6d9872", transparent:true, opacity:.24})); scene.add(boundary);
const ecologyRoot = new THREE.Group(); scene.add(ecologyRoot);

function combined(parts: { geometry: THREE.BufferGeometry; position?: THREE.Vector3; scale?: THREE.Vector3; rotation?: THREE.Quaternion; color?: string }[]) {
  const geometries = parts.map(({ geometry, position, scale, rotation }) => {
    const cloned = geometry.clone(), item = cloned.index ? cloned.toNonIndexed() : cloned; if (item !== cloned) cloned.dispose(); item.applyMatrix4(new THREE.Matrix4().compose(position ?? new THREE.Vector3(), rotation ?? new THREE.Quaternion(), scale ?? new THREE.Vector3(1, 1, 1))); geometry.dispose(); return item;
  });
  for (let i=0;i<geometries.length;i++) { const color = new THREE.Color(parts[i].color ?? "#ffffff"), count=geometries[i].getAttribute("position").count; geometries[i].setAttribute("color",new THREE.Float32BufferAttribute(Array.from({length:count},()=>[color.r,color.g,color.b]).flat(),3)); }
  const result = mergeGeometries(geometries, false) ?? geometries[0]; geometries.forEach((g) => { if (g !== result) g.dispose(); }); return result;
}
function pointedRibbon(height: number, width: number, curve: number) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute([
    -width,0,0, width,0,0, -width*.62,height*.55,curve*.36, width*.62,height*.55,curve*.36, 0,height,curve,
  ], 3));
  geometry.setIndex([0,1,2, 1,3,2, 2,3,4]);
  geometry.computeVertexNormals(); return geometry;
}
function bladeClump(recipe: ElementRecipe, count: number, reed = false) {
  const parts: {geometry:THREE.BufferGeometry;position:THREE.Vector3;rotation:THREE.Quaternion;color:string}[]=[];
  for(let i=0;i<count;i++) { const angle=i*2.39996, radius=.08+.9*((i*17)%count)/count, height=(reed?.72:.56)+((i*13)%11)/50; parts.push({geometry:pointedRibbon(height,.018+(i%3)*.006,.12+(i%5)*.025),position:new THREE.Vector3(Math.cos(angle)*radius,0,Math.sin(angle)*radius),rotation:new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),angle),color:recipe.color}); }
  return combined(parts);
}
function recipeGeometry(recipe: ElementRecipe) {
  const f = recipe.form.toLowerCase();
  if (recipe.kind === "tree" && (f.includes("conifer") || f.includes("pine"))) return combined([
    { geometry: new THREE.CylinderGeometry(.035, .055, .34, 6), position:new THREE.Vector3(0,.17,0), color:"#60472c" },
    { geometry: new THREE.ConeGeometry(.24, .62, 7), position:new THREE.Vector3(0,.48,0), color:recipe.color },
    { geometry: new THREE.ConeGeometry(.17, .52, 7), position:new THREE.Vector3(0,.72,0), color:recipe.color },
  ]);
  if (recipe.kind === "tree") return combined([
    { geometry: new THREE.CylinderGeometry(.04, .06, .82, 7), position:new THREE.Vector3(0,.41,0), color:"#60472c" },
    { geometry: new THREE.IcosahedronGeometry(.22, 1), position:new THREE.Vector3(0,.8,0), scale:new THREE.Vector3(1.15,.8,1.15), color:recipe.color },
    { geometry: new THREE.IcosahedronGeometry(.15, 1), position:new THREE.Vector3(.11,.84,.04), color:recipe.color },
  ]);
  if ((recipe.kind === "shrub" || recipe.kind === "grass") && (f.includes("reed") || f.includes("rush"))) return bladeClump(recipe, 24, true);
  if (recipe.kind === "shrub") { const radius=f.includes("low") ? .38 : .55; return combined([{geometry:new THREE.IcosahedronGeometry(radius, 1).scale(1,1/radius,1), color:recipe.color}]); }
  if (recipe.kind === "grass") return bladeClump(recipe, 32);
  if (f.includes("slab")) return combined([{geometry:new THREE.BoxGeometry(1.15,.42,.72, 1,1,1).translate(0,.2,0),color:recipe.color}]);
  if (f.includes("angular")) return combined([{geometry:new THREE.DodecahedronGeometry(.55, 0).scale(1,.7,.9).translate(0,.38,0),color:recipe.color}]);
  return combined([{geometry:new THREE.IcosahedronGeometry(.55, 1).scale(1,.7,.9).translate(0,.38,0),color:recipe.color}]);
}
const geometryCache = new Map<string, THREE.BufferGeometry>();
const materialCache = new Map<string, THREE.MeshStandardMaterial>();
const geometryValidation = { checked: 0, failures: [] as string[] };
function normalizeVegetationGeometry(geometry: THREE.BufferGeometry) {
  const positions = geometry.getAttribute("position") as THREE.BufferAttribute;
  let minY=Infinity, maxY=-Infinity;
  for(let i=0;i<positions.count;i++){const y=positions.getY(i);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
  const height=maxY-minY;
  if(Number.isFinite(height)&&height>0) geometry.applyMatrix4(new THREE.Matrix4().makeScale(1,1/height,1));
  geometry.translate(0,-minY/height,0);
  geometry.computeVertexNormals();
}
function validateGeometry(name: string, geometry: THREE.BufferGeometry) {
  geometryValidation.checked++;
  const positions=geometry.getAttribute("position") as THREE.BufferAttribute|undefined, normals=geometry.getAttribute("normal") as THREE.BufferAttribute|undefined;
  if(!positions || !normals) { geometryValidation.failures.push(`${name}: missing position or normal`); return; }
  for(const attribute of [positions,normals]) for(let i=0;i<attribute.count;i++) for(let c=0;c<attribute.itemSize;c++) if(!Number.isFinite(attribute.getComponent(i,c))) { geometryValidation.failures.push(`${name}: non-finite attribute`); return; }
  const indices=geometry.index ? Array.from(geometry.index.array) : Array.from({length:positions.count},(_,i)=>i);
  if(indices.length%3) { geometryValidation.failures.push(`${name}: incomplete triangle`); return; }
  for(let i=0;i<indices.length;i+=3) { const a=indices[i],b=indices[i+1],c=indices[i+2]; if(a>=positions.count||b>=positions.count||c>=positions.count||a<0||b<0||c<0) { geometryValidation.failures.push(`${name}: invalid triangle index`); return; } const ab=new THREE.Vector3(positions.getX(b)-positions.getX(a),positions.getY(b)-positions.getY(a),positions.getZ(b)-positions.getZ(a)), ac=new THREE.Vector3(positions.getX(c)-positions.getX(a),positions.getY(c)-positions.getY(a),positions.getZ(c)-positions.getZ(a)); if(ab.cross(ac).lengthSq()<1e-12) { geometryValidation.failures.push(`${name}: degenerate triangle`); return; } }
}
const geometryFor = (r: ElementRecipe) => { let geometry=geometryCache.get(r.id); if(!geometry){geometry=recipeGeometry(r); if(r.kind!=="rock") normalizeVegetationGeometry(geometry); validateGeometry(r.id,geometry); geometryCache.set(r.id,geometry);} return geometry; };
const materialFor = (r: ElementRecipe) => materialCache.get(r.id) ?? (materialCache.set(r.id, new THREE.MeshStandardMaterial({ color:"#ffffff", vertexColors:true, side:THREE.DoubleSide, roughness:.88, metalness:0, flatShading:true })), materialCache.get(r.id)!);
let patch: BiomePatch;
let currentConfig: BiomePatchConfig;
let accountedBytes = 0;
let labReady = false, lastError = "";

function setView(mode: "ground" | "overhead") {
  controls.target.set(0, mode === "ground" ? 1.4 : 0, 0);
  if (mode === "overhead") camera.position.set(0, 115, 0.1);
  else camera.position.set(20, 1.7, 24);
  camera.lookAt(controls.target); controls.update();
}
function metric(label: string, value: string, id = "") { return `<div><b${id ? ` id="${id}"` : ""}>${value}</b><span>${label}</span></div>`; }
function geometryBytes(geometry: THREE.BufferGeometry) { let bytes = geometry.index?.array.byteLength ?? 0; for (const attribute of Object.values(geometry.attributes)) bytes += attribute.array.byteLength; return bytes; }
function displayPatch() {
  const one = BIOME_DEFINITIONS.find((b) => b.id === currentConfig.biome)!;
  const two = currentConfig.blendBiome ? BIOME_DEFINITIONS.find((b) => b.id === currentConfig.blendBiome) : undefined;
  $("biome-title").textContent = two ? `${one.name} ↔ ${two.name}` : one.name;
  $("caption-name").textContent = two ? `${one.name} / ${two.name} ecotone` : `${one.name} test plot`;
  $("biome-description").textContent = two ? `${one.description} Transitioning into ${two.description}` : one.description;
  $("patch-digest").textContent = patch.digest;
  $("summary-metrics").innerHTML = [metric("placed elements", fmt(patch.placements.length)), metric("canopy footprint", `${(patch.canopyCoverEstimate * 100).toFixed(1)}%`), metric("ground patch footprint", `${(patch.groundCoverEstimate * 100).toFixed(1)}%`), metric("competition rejects", fmt(patch.rejected.competition)), metric("render calls", String(renderer.info.render.calls), "render-calls"), metric("accounted buffers", `${(accountedBytes / 1024).toFixed(1)} KB`)].join("");
  const recipes = new Map(ELEMENT_RECIPES.map((r) => [r.id, r]));
  $("recipe-counts").innerHTML = Object.entries(patch.recipeCounts).filter(([, count]) => count).sort(([a],[b]) => a.localeCompare(b)).map(([id,count]) => { const recipe=recipes.get(id); return `<div class="recipe-row"><span>${escaped(recipe?.name ?? id)} <small>${recipe?.kind === "grass" ? "patch" : escaped(recipe?.form ?? "")}</small></span><b>${count}</b></div>`; }).join("") || `<span class="subtle">No placed organisms or rocks in this patch.</span>`;
  const fauna = [...one.fauna, ...(two?.fauna ?? [])];
  $("fauna-list").innerHTML = fauna.map((f) => `<div class="fauna-row"><span>${escaped(f.name)} <small>${escaped(f.role)}</small></span><i>PLANNED</i></div>`).join("") || `<span class="subtle">No habitat members declared.</span>`;
}
function rebuild() {
  const nextConfig: BiomePatchConfig = { seed: seedInput.value.trim() || "LETHRA-BIOME-01", biome: primary.value as BiomeId, ...(blend.value ? { blendBiome: blend.value as BiomeId } : {}), sizeM:128, originX:-64, originZ:-64 };
  const nextPatch = generateBiomePatch(nextConfig);
  currentConfig = nextConfig; patch = nextPatch; labReady = true; lastError = "";
  ecologyRoot.children.forEach((child) => (child as unknown as {dispose?:()=>void}).dispose?.()); ecologyRoot.clear();
  const recipes = new Map(ELEMENT_RECIPES.map((recipe) => [recipe.id, recipe]));
  const grouped = new Map<string, typeof patch.placements>();
  for (const placement of patch.placements) { const list = grouped.get(placement.recipeId) ?? []; list.push(placement); grouped.set(placement.recipeId, list); }
  // This is an explicit retained-buffer estimate: CPU canvas and geometry data,
  // their uploaded GPU counterparts, instance matrices, and a mipmapped ground map.
  accountedBytes = groundCanvas.width * groundCanvas.height * 4 + Math.ceil(groundCanvas.width * groundCanvas.height * 4 * 4 / 3);
  const dummy = new THREE.Object3D();
  for (const [recipeId, placements] of grouped) {
    const recipe = recipes.get(recipeId); if (!recipe) continue;
    const mesh = new THREE.InstancedMesh(geometryFor(recipe), materialFor(recipe), placements.length);
    mesh.name = `biome:${recipeId}`; mesh.frustumCulled = false;
    for (let i=0; i<placements.length; i++) { const p=placements[i]; dummy.position.set(p.x, 0, p.z); dummy.rotation.set(0,p.rotation,0); if(p.kind !== "rock"){const radius=recipeFootprintM(recipe,p.sizeM), form=recipe.form.toLowerCase(), base=p.kind === "grass" ? 1 : p.kind === "shrub" ? (form.includes("low") ? .38 : .55) : form.includes("conifer") || form.includes("pine") ? .24 : .25; dummy.scale.set(radius/base,p.sizeM,radius/base);}else dummy.scale.setScalar(p.sizeM); dummy.updateMatrix(); mesh.setMatrixAt(i,dummy.matrix); }
    mesh.instanceMatrix.needsUpdate = true; ecologyRoot.add(mesh);
    accountedBytes += placements.length * 16 * 4 * 2;
  }
  accountedBytes += geometryBytes(bed.geometry) * 2 + geometryBytes(gridGeometry) * 2;
  for (const geometry of geometryCache.values()) accountedBytes += geometryBytes(geometry) * 2;
  const ctx=groundCanvas.getContext("2d")!, image=ctx.createImageData(128,128), a=new THREE.Color(oneColor(currentConfig.biome)), b=new THREE.Color(oneColor(currentConfig.blendBiome ?? currentConfig.biome));
  for(let py=0;py<128;py++) for(let px=0;px<128;px++) { const t=currentConfig.blendBiome ? biomeBlendAt(currentConfig, -64+(px+.5), -64+(py+.5)) : 0, c=a.clone().lerp(b,t).convertLinearToSRGB(), offset=(py*128+px)*4; image.data[offset]=Math.round(c.r*255); image.data[offset+1]=Math.round(c.g*255); image.data[offset+2]=Math.round(c.b*255); image.data[offset+3]=255; } ctx.putImageData(image,0,0); groundTexture.needsUpdate=true;
  displayPatch(); $("status").textContent = `Generated ${patch.placements.length} placed elements · ${patch.digest.slice(0, 16)}`;
}
function oneColor(id: BiomeId) { return BIOME_DEFINITIONS.find((b) => b.id === id)!.groundColor; }
function exportPatch() { const output = { version: patch.version, config: patch.config, digest: patch.digest, counts:patch.counts, recipeCounts:patch.recipeCounts, metrics: { counts:patch.counts, recipeCounts:patch.recipeCounts, areaHa:patch.areaHa, canopyCoverEstimate:patch.canopyCoverEstimate, groundCoverEstimate:patch.groundCoverEstimate, rejected:patch.rejected }, placements:patch.placements }; const url=URL.createObjectURL(new Blob([JSON.stringify(output,null,2)],{type:"application/json"})); const a=document.createElement("a"); a.href=url; a.download=`biome-patch-${patch.digest}.json`; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000); }
function safelyRebuild() { try { rebuild(); } catch (error) { labReady=false; lastError=error instanceof Error ? error.message : String(error); $("status").textContent=`Could not generate biome patch: ${lastError}`; } }
$("regenerate").addEventListener("click", safelyRebuild); seedInput.addEventListener("keydown", (event) => { if (event.key === "Enter") safelyRebuild(); }); $("export-json").addEventListener("click", exportPatch); $("ground-view").addEventListener("click", () => setView("ground")); $("overhead-view").addEventListener("click", () => setView("overhead"));
addEventListener("resize", () => { camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth,innerHeight); });
let lastRender = 0; function animate(time:number) { requestAnimationFrame(animate); controls.update(); renderer.render(scene,camera); if (time-lastRender > 300) { lastRender=time; const calls=$("render-calls"); if(calls) calls.textContent=String(renderer.info.render.calls); } };
rebuild(); setView("ground"); requestAnimationFrame(animate);
Object.defineProperty(window, "__biomeLab", { configurable:false, writable:false, value:{ get ready(){return labReady;}, get lastError(){return lastError || null;}, get config(){return structuredClone(currentConfig);}, get counts(){return {...patch.counts};}, get recipeCounts(){return {...patch.recipeCounts};}, get digest(){return patch.digest;}, get coverage(){return {canopy:patch.canopyCoverEstimate, ground:patch.groundCoverEstimate, canopyEstimate:patch.canopyCoverEstimate, groundEstimate:patch.groundCoverEstimate};}, get renderer(){return {calls:renderer.info.render.calls, triangles:renderer.info.render.triangles, memory:{geometries:renderer.info.memory.geometries, textures:renderer.info.memory.textures}};}, get camera(){return {position:camera.position.toArray(), target:controls.target.toArray()};}, get geometryValidation(){return {checked:geometryValidation.checked, failures:[...geometryValidation.failures]};}, get accountedBytes(){return accountedBytes;} } });
