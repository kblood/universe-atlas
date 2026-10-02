import * as THREE from "three";
import {COMPOSER_CHOICES, COMPOSER_PRESET_IDS, COMPOSER_PRESET_LABELS, COMPOSER_RANGES, COMPOSER_RECIPE_KEYS, composerLegPairRange, composerPreset, composerRecipesEqual, composerSpeciesEqual,
  decodeComposerRecipe, encodeComposerRecipe, isComposerPresetId, normalizeComposerRecipe, randomComposerRecipe,
  type ComposerChoiceKey, type ComposerNumberKey, type ComposerPresetId, type ComposerRecipe} from "./fauna-composer-recipe.ts";
import {coherentComposerSpecies, type ComposerArchetype} from "./fauna-composer-species.ts";
import {COAT_MARK_BITS, COAT_MARK_NAMES, resolveCoatPattern, type CoatMarkName} from "./fauna-coat-vocab.ts";
import {COMPOSER_MOTIONS, type ComposerMotion} from "./fauna-composer-rig.ts";
import {createComposerCreature, type ComposerCreature} from "./fauna-composer.ts";
import {COMPOSER_HERD_SIZES, type ComposerHerdSize, type CreatureLabState} from "./creature-lab-state.ts";

/** Creature Lab panel and actors for the experimental modular composer. The Lab
 * owns time, camera, lights and the frame loop; this module owns the two recipes,
 * their actors (one skinned mesh each plus a scrolling ground track), the herd
 * and the controls.
 *
 * A recipe names a species (anatomy, coat, variation strengths) and one animal of
 * it (individualSeed, sex, maturity, condition). The herd view builds several
 * individuals of the edited species, one per animation frame. */
type Key=typeof COMPOSER_RECIPE_KEYS[number];
type Side="first"|"second";
type View=CreatureLabState["view"];
export interface ComposerLabHost{
 group:THREE.Group;initial:CreatureLabState;inputError:string|null;
 /** Link values that were replaced by defaults (shown with the link adjustments). */
 notices?:string[];
 getTime():number;setTime(time:number):void;
 /** Full rebuild of the Lab view (actors, camera, text). */
 rebuild():void;
 /** Re-pose at the current time and refresh diagnostics. */
 refresh():void;
 fit():void;
 /** Herd build progress: called after each asynchronously built animal; `done` after the last. */
 progress(done:boolean):void;
}
interface Actor{side:Side;index:number;recipe:ComposerRecipe;creature:ComposerCreature;offset:THREE.Vector3;envelope:THREE.Box3;track:Track|null;skinDigest:string;colorDigest:string}
interface Track{group:THREE.Group;cross:THREE.LineSegments;spacing:number;dispose():void}

const $=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]!));
const GROUPS:{title:string;keys:Key[];extra?:string}[]=[
 {title:"Body",keys:["layout","legPairs","bodyLength","girth","posture","torso","armor"]},
 {title:"Head and neck",keys:["neckLength","head","headSize","snoutLength","horns","trunkLength"]},
 {title:"Legs and arms",keys:["legs","legLength","feet","arms","armLength","hands"]},
 {title:"Wings and tail",keys:["wings","wingSpan","tail","tailLength"]},
 {title:"Colour",keys:["palette","colorSeed"]},
 {title:"Coat",keys:["pattern","marks","patternScale","patternContrast","countershade"]},
 {title:"Individual",keys:["individualSeed","sex","maturity","condition","variability","dimorphism","allometry"],
  extra:`<button id="composer-next-individual" type="button">Next individual</button><p class="composer-hint">Individual keys pick one animal of the species; the species controls above stay unchanged, so the starting animal is kept.</p>`},
];
const FIELD:Record<Key,string>={layout:"Body layout",legPairs:"Walking leg pairs",bodyLength:"Body length",girth:"Girth",posture:"Posture (low to upright)",torso:"Torso",armor:"Shell or armour",
 neckLength:"Neck length",head:"Face",headSize:"Head size",snoutLength:"Snout or beak length",horns:"Horns",trunk:"Trunk",trunkLength:"Proboscis length",
 legs:"Leg type",legLength:"Leg length",feet:"Feet",arms:"Arms (not used for walking)",armLength:"Arm length",hands:"Hands",
 wings:"Wings (ground display only)",wingSpan:"Wing span",tail:"Tail",tailLength:"Tail length",palette:"Colours",colorSeed:"Colour variation",
 pattern:"Coat pattern",marks:"Markings",patternScale:"Pattern scale",patternContrast:"Pattern contrast",countershade:"Pale belly (countershading)",
 dimorphism:"Male/female difference",variability:"Individual variation",allometry:"Size scaling (allometry)",
 individualSeed:"Individual (0 = type specimen)",sex:"Sex",maturity:"Age (young to adult)",condition:"Body condition (lean to heavy)",
 eyes:"Eyes",iris:"Iris colour"};
const MARK_LABEL:Record<CoatMarkName,string>={socks:"Socks (pale lower legs)",mask:"Face mask","blaze":"Blaze (pale face stripe)","tail-tip":"Tail tip","tail-rings":"Tail rings","ear-tips":"Ear tips","rump-patch":"Rump patch","juvenile-spots":"Juvenile spots"};
const VALUE:Record<string,string>={
 "layout:limbless":"Limbless (worm, snake)","layout:biped":"Two legs (bird, ape, dinosaur)","layout:quadruped":"Four upright legs (mammal)","layout:sprawled":"Four sprawling legs (turtle, lizard)","layout:many-legged":"Many legs (centipede)",
 "torso:slim":"Slim","torso:barrel":"Barrel","torso:deep-chest":"Deep chest","torso:flat":"Flat","torso:annulated":"Ringed (worm)","torso:segmented":"Segmented (arthropod)",
 "head:muzzle":"Muzzle (mammal)","head:jaws":"Toothed jaws (reptile)","head:beak":"Beak (bird, turtle)","head:flat-face":"Flat face (ape)","head:blunt":"Blunt (worm)","head:mandibles":"Mandibles (centipede)","head:proboscis":"Proboscis / trunk (elephant, tapir)",
 "horns:none":"None","horns:nasal":"Nose horn (rhino)","horns:paired":"Paired horns","horns:ossicones":"Ossicones (giraffe)","horns:crest":"Crest or casque",
 "legs:pillar":"Pillar (elephant, rhino)","legs:plantigrade":"Flat-footed (bear, ape)","legs:digitigrade":"Toe-walking (dog, bird)","legs:unguligrade":"Tip-toe hooved (deer, giraffe)","legs:arthropod":"Jointed (insect, centipede)",
 "feet:hoof":"Hooves","feet:paw":"Paws","feet:claw":"Clawed toes","feet:pad":"Round pads","feet:hand":"Hand-like feet","feet:spike":"Spiked tips",
 "arms:none":"None","arms:small":"Small arms","arms:grasping":"Long grasping arms","hands:hand":"Hands with fingers","hands:claw":"Claws","hands:pincer":"Pincers",
 "tail:none":"None","tail:stub":"Stub","tail:reptile":"Long reptile tail","tail:tufted":"Tufted (mammal)","tail:feather-fan":"Feather fan","tail:club":"Club",
 "armor:none":"None","armor:dome":"Domed shell (turtle)","armor:plates":"Back plates","armor:osteoderms":"Bony studs","armor:bands":"Banded segments",
 "wings:none":"None","wings:feathered":"Feathered","wings:membrane":"Skin membrane (bat)","trunk:none":"None","trunk:trunk":"Trunk (elephant)",
 "palette:earth":"Earth","palette:savanna":"Savanna","palette:reptile":"Reptile green","palette:plumage":"Bright plumage","palette:slate":"Slate grey","palette:ink":"Dark ink",
 "palette:tawny":"Tawny","palette:rufous":"Rufous (red-brown)","palette:dun":"Dun","palette:fawn":"Fawn","palette:grey":"Grey","palette:sable":"Sable (dark brown)","palette:olive":"Olive","palette:ochre":"Ochre",
 "pattern:auto":"Automatic (from colours)","pattern:plain":"Plain","pattern:spots":"Spots","pattern:rosettes":"Rosettes","pattern:reticulated":"Reticulated (giraffe)","pattern:stripes":"Stripes",
 "pattern:bands":"Bands","pattern:saddle":"Dark saddle","pattern:dorsal-stripe":"Dorsal stripe","pattern:dapple":"Dapple","pattern:piebald":"Piebald","pattern:roan":"Roan","pattern:brindle":"Brindle",
 "sex:auto":"Automatic (from individual)","sex:female":"Female","sex:male":"Male",
};
const ARCHETYPE_LABEL:Record<ComposerArchetype,string>={"ungulate-grazer":"grazing hoofed animal",giraffid:"giraffid",pachyderm:"pachyderm","cursorial-carnivore":"running carnivore",theropod:"theropod",ratite:"ratite",
 bird:"ground bird","sprawler-lizard":"lizard",tortoise:"tortoise",primate:"primate",myriapod:"myriapod",worm:"worm"};
const HERD_LABEL:Record<ComposerHerdSize,string>={1:"1 animal",6:"Herd of 6",9:"Herd of 9",12:"Herd of 12"};
const MOTION_LABEL:Record<ComposerMotion,string>={neutral:"Rest pose (unanimated)",idle:"Standing",walk:"Walking",display:"Display (wings, arms, trunk)"};
const isChoice=(key:Key):key is ComposerChoiceKey=>key in COMPOSER_CHOICES;
const ratioKeys=new Set<Key>(["neckLength","snoutLength","legLength","armLength","tailLength","wingSpan","trunkLength"]);
function formatValue(key:Key,value:number){return key==="bodyLength"?`${value.toFixed(2)} m`:key==="legPairs"||key==="colorSeed"||key==="marks"||key==="individualSeed"?String(value):key==="maturity"?`${value.toFixed(2)}${value<.75?" (juvenile)":value<1?" (subadult)":" (adult)"}`:ratioKeys.has(key)?`${value.toFixed(2)} × body`:value.toFixed(2);}
/** Why a control has no effect on the current recipe (the control is disabled); empty when it applies. */
function why(r:ComposerRecipe,key:Key):string{
 const limbless=r.layout==="limbless";
 if(key==="legPairs"&&r.layout!=="many-legged"){const [lo]=composerLegPairRange(r.layout);return `Set by the body layout (${lo} pair${lo===1?"":"s"}).`;}
 if((key==="legs"||key==="legLength"||key==="feet")&&limbless)return "A limbless body has no legs.";
 if(key==="posture"&&r.layout!=="biped"&&r.layout!=="quadruped")return "Only changes two-legged and four-legged upright bodies.";
 if((key==="armLength"||key==="hands")&&r.arms==="none")return "No arms are selected.";
 if(key==="wingSpan"&&r.wings==="none")return "No wings are selected.";
 if(key==="tailLength"&&r.tail==="none")return "No tail is selected.";
 if(key==="trunkLength"&&r.head!=="proboscis")return "Only a Proboscis face has a trunk.";
 if(key==="sex"&&r.dimorphism===0)return "This species has no sex differences (Male/female difference is 0).";
 if((key==="patternScale"||key==="patternContrast")&&resolveCoatPattern(r.pattern,r.palette)==="plain")return "A plain coat has no pattern to scale or sharpen.";
 return "";
}
/** Information that does not disable the control. */
function note(r:ComposerRecipe,key:Key,herd:number):string{
 if(key==="marks"&&(r.marks&COAT_MARK_BITS["juvenile-spots"])&&r.maturity>=.75)return "Juvenile spots show only on young animals (Age below 0.75); in a herd the young carry them.";
 if((key==="variability"||key==="dimorphism")&&r.individualSeed===0&&herd===1)return "The type specimen (individual 0) shows the species average; choose Next individual or a herd to see this.";
 if(herd>1&&(key==="individualSeed"||key==="sex"||key==="maturity"))return key==="individualSeed"?`The herd shows individuals ${herdSeed(r.individualSeed,0)}–${herdSeed(r.individualSeed,herd-1)}.`:key==="sex"?"In a herd each animal's sex comes from its individual.":"Every fourth animal in a herd is young (age 0.3–0.5).";
 return "";
}
/** Preset whose species this recipe is; individual keys (seed, sex, age, condition) are ignored. */
export function composerPresetOf(r:ComposerRecipe):ComposerPresetId|null{return COMPOSER_PRESET_IDS.find(id=>composerSpeciesEqual(composerPreset(id),r))??null;}
function nextSeed(seed:string){const m=/^(.*?)(\d+)$/.exec(seed);return (m?`${m[1]}${Number(m[2])+1}`:`${seed}-2`).slice(0,160);}
const ANIMAL_PRESETS:ComposerPresetId[]=["dinosaur","turtle","giraffe","bird","ostrich","rhinoceros","ape","worm","centipede"];
/** Order-sensitive checksum of the bind-pose skin, so shape-only edits (girth, head type) are observable. */
function digest(p:Float32Array){let a=0,b=0;for(let i=0;i<p.length;i++){a=(a+Math.round(p[i]!*1e5)*((i%251)+1))%2147483647;b=(b*31+Math.round(p[i]!*1e4))%2147483647;}return `${p.length/3}:${a.toString(36)}:${b.toString(36)}`;}
function viewDirection(view:View){return view==="side"?new THREE.Vector3(0,.12,1).normalize():view==="front"?new THREE.Vector3(1,.15,0).normalize():new THREE.Vector3(1,.42,1).normalize();}

/** Individual seed of herd member `i` when the herd starts at `base` (wraps 9999 -> 1). */
export function herdSeed(base:number,i:number){return ((Math.max(1,Math.floor(base))-1+i)%9999)+1;}
/** The recipes of a herd of `n` individuals of `species`: consecutive individual seeds, every fourth
 * animal young (maturity 0.3 / 0.4 / 0.5), sex resolved per individual ('auto'). n = 1 returns the recipe itself. */
export function composerHerdRecipes(species:ComposerRecipe,n:number):ComposerRecipe[]{
 if(n<=1)return [{...species}];
 return Array.from({length:n},(_,i)=>normalizeComposerRecipe({...species,individualSeed:herdSeed(species.individualSeed,i),sex:"auto",maturity:i%4===3?.3+.1*(i%3):species.maturity}).recipe);
}
/** Herd grid: three columns along the body axis (+X), rows across it; odd rows offset by half a column so
 * animals behind show between those in front. Spacing is at least 1.6 body lengths and never closer
 * than the largest motion envelope (necks and tails overrun 1.6 body lengths on long animals). A small fixed
 * per-slot offset (at most 5% of a column, 15% of a row) breaks the parade-ground look without overlaps. */
function herdSlots(n:number,length:number,size:THREE.Vector3){
 const sx=Math.max(1.6*length,size.x*1.12),sz=Math.max(1.6*length,size.z*1.5),rows=Math.ceil(n/3);
 const jitter=(i:number,k:number)=>{const h=Math.sin((i+1)*12.9898+k*78.233)*43758.5453;return 2*(h-Math.floor(h))-1;};
 return Array.from({length:n},(_,i)=>{const col=i%3,row=Math.floor(i/3);return new THREE.Vector3((col-1)*sx+(row%2?sx*.5:0)-sx*.25+(n>1?.05*sx*jitter(i,0):0),0,(row-(rows-1)/2)*sz+(n>1?.15*sz*jitter(i,1):0));});
}

function makeTrack(envelope:THREE.Box3):Track{
 const size=envelope.getSize(new THREE.Vector3()),span=Math.max(size.x,size.z,.2);
 const spacing=[1,.5,.25,.1,.05].find(s=>span/s>=6)??.05,margin=Math.max(.15,span*.12);
 const x0=Math.floor((envelope.min.x-margin)/spacing)*spacing,x1=Math.ceil((envelope.max.x+margin)/spacing)*spacing,z0=envelope.min.z-margin,z1=envelope.max.z+margin,y=.003;
 const cross:number[]=[];for(let x=x0;x<=x1+1e-9;x+=spacing)cross.push(x,y,z0,x,y,z1);
 const crossGeometry=new THREE.BufferGeometry();crossGeometry.setAttribute("position",new THREE.Float32BufferAttribute(cross,3));
 const edgeGeometry=new THREE.BufferGeometry();edgeGeometry.setAttribute("position",new THREE.Float32BufferAttribute([x0,y,z0,x1,y,z0,x0,y,z1,x1,y,z1],3));
 const material=new THREE.LineBasicMaterial({color:"#b9ddd0",transparent:true,opacity:.5});
 const crossLines=new THREE.LineSegments(crossGeometry,material),edges=new THREE.LineSegments(edgeGeometry,material);
 const group=new THREE.Group();group.name="composer-ground-track";group.add(crossLines,edges);
 return {group,cross:crossLines,spacing,dispose(){group.removeFromParent();crossGeometry.dispose();edgeGeometry.dispose();material.dispose();}};
}
/** One draw call for every herd member's ground track: each animal's cross lines scroll with its own
 * travel (individual gaits differ), rewritten on the CPU each frame (12 x ~20 lines). */
interface HerdTrack{lines:THREE.LineSegments;update(travels:number[]):void;dispose():void}
function makeHerdTrack(actors:Actor[]):HerdTrack{
 const tracks=actors.map(a=>{const size=a.envelope.getSize(new THREE.Vector3()),span=Math.max(size.x,size.z,.2);
  const spacing=[1,.5,.25,.1,.05].find(s=>span/s>=6)??.05,margin=Math.max(.15,span*.12);
  const x0=Math.floor((a.envelope.min.x-margin)/spacing)*spacing,x1=Math.ceil((a.envelope.max.x+margin)/spacing)*spacing;
  return {spacing,x0,count:Math.max(1,Math.round((x1-x0)/spacing)),z0:a.envelope.min.z-margin,z1:a.envelope.max.z+margin,offset:a.offset.clone()};});
 const segments=tracks.reduce((n,t)=>n+t.count+2,0),positions=new Float32Array(segments*6),y=.003;
 const geometry=new THREE.BufferGeometry();geometry.setAttribute("position",new THREE.BufferAttribute(positions,3));
 const material=new THREE.LineBasicMaterial({color:"#b9ddd0",transparent:true,opacity:.5});
 const lines=new THREE.LineSegments(geometry,material);lines.name="composer-herd-tracks";lines.frustumCulled=false;
 const update=(travels:number[])=>{let o=0;
  tracks.forEach((t,i)=>{const s=t.spacing,phase=(((travels[i]??0)%s)+s)%s,width=t.count*s,ox=t.offset.x,oz=t.offset.z;
   for(let k=0;k<t.count;k++){const x=ox+t.x0+(((k*s-phase)%width)+width)%width;positions.set([x,y,oz+t.z0,x,y,oz+t.z1],o);o+=6;}
   positions.set([ox+t.x0,y,oz+t.z0,ox+t.x0+width,y,oz+t.z0,ox+t.x0,y,oz+t.z1,ox+t.x0+width,y,oz+t.z1],o);o+=12;});
  geometry.attributes.position!.needsUpdate=true;};
 update([]);
 return {lines,update,dispose(){lines.removeFromParent();geometry.dispose();material.dispose();}};
}

export interface ComposerLab{
 readonly playing:boolean;readonly error:string|null;
 /** True while a herd is still being built (one animal per frame). */
 readonly building:boolean;
 setPlaying(value:boolean):void;
 setActive(active:boolean):void;
 build(options:{skeleton:boolean;neutral:boolean}):void;
 disposeActors():void;
 update(time:number):void;
 syncTime(time:number):void;
 envelope():THREE.Box3;
 viewDirection():THREE.Vector3;
 state():Pick<CreatureLabState,"recipe"|"compareRecipe"|"composerSeed"|"motion"|"compare"|"view"|"herd">;
 text():{title:string;description:string;captionTitle:string;captionCopy:string;detail:string};
 metrics():string;
 /** Footer status line; `drawCalls` is the last frame's renderer count. */
 status(drawCalls?:number):string;
 /** Number of shadow-casting meshes (each costs one shadow-pass draw call). */
 shadowCasters():number;
 details():unknown;
}

export function createComposerLab(host:ComposerLabHost):ComposerLab{
 const init=host.initial;
 const presetSelect=$<HTMLSelectElement>("composer-preset"),seedInput=$<HTMLInputElement>("composer-seed"),compareBox=$<HTMLInputElement>("composer-compare"),target=$<HTMLSelectElement>("composer-edit-target");
 const motionSelect=$<HTMLSelectElement>("composer-motion"),timeInput=$<HTMLInputElement>("composer-time"),phaseInput=$<HTMLInputElement>("composer-phase"),viewSelect=$<HTMLSelectElement>("composer-view"),playButton=$<HTMLButtonElement>("composer-play");
 const herdSelect=$<HTMLSelectElement>("composer-herd");
 let error:string|null=host.inputError,issues:string[]=[...(init.mode==="composer"?host.notices??[]:[])],playing=false,actors:Actor[]=[];
 let herdTrack:HerdTrack|null=null,buildToken=0,building=false,herdTarget=1,buildStarted=0,buildFinished=0,provisional:{slots:THREE.Vector3[];box:THREE.Box3}|null=null;
 /** Which generator 'New seed' repeats: the last random button used (wild hybrid by default). */
 let generator:"wild"|"plausible"="wild";
 /** Plausible species generated in this session (or recovered from a link's seed), by seed. */
 const plausible=new Map<string,{recipe:ComposerRecipe;archetype:ComposerArchetype}>();
 const recipes:Record<Side,ComposerRecipe>={first:composerPreset("dinosaur"),second:composerPreset("giraffe")};
 const decode=(text:string,side:Side)=>{
  if(!text)return;const result=decodeComposerRecipe(text);
  if(result.error){error??=`${side==="first"?"Recipe":"Second recipe"}: ${result.error}`;return;}
  recipes[side]=result.recipe!;issues.push(...result.issues.map(i=>side==="first"?i:`Second animal: ${i}`));
 };
 if(init.mode==="composer"){decode(init.recipe,"first");if(init.compare)decode(init.compareRecipe,"second");}
 // A shared animal opens paused at its captured time; a fresh composer page starts walking.
 playing=!(init.mode==="composer"&&init.recipe);
 seedInput.value=init.composerSeed;compareBox.checked=init.mode==="composer"&&init.compare;viewSelect.value=init.view;
 herdSelect.innerHTML=COMPOSER_HERD_SIZES.map(n=>`<option value="${n}">${HERD_LABEL[n]}</option>`).join("");
 herdSelect.value=String(init.mode==="composer"&&!compareBox.checked?init.herd:1);

 presetSelect.innerHTML=`<option value="custom" disabled>Custom combination</option>`+COMPOSER_PRESET_IDS.map(id=>`<option value="${id}">${esc(COMPOSER_PRESET_LABELS[id])}</option>`).join("");
 motionSelect.innerHTML=COMPOSER_MOTIONS.map(m=>`<option value="${m}">${esc(MOTION_LABEL[m])}</option>`).join("");motionSelect.value=init.motion;
 $("composer-parts").innerHTML=GROUPS.map(g=>`<fieldset class="composer-group"><legend>${esc(g.title)}</legend>${g.keys.map(key=>{
  const id=`composer-${key}`,whyEl=`<small id="${id}-why" class="composer-why" hidden></small>`;
  if(key==="marks")return `<div id="${id}" class="composer-marks" role="group" aria-label="${esc(FIELD.marks)}"><span>${esc(FIELD.marks)}</span>${COAT_MARK_NAMES.map(name=>`<label class="check"><input id="composer-mark-${name}" type="checkbox" data-mark="${name}"> ${esc(MARK_LABEL[name])}</label>`).join("")}${whyEl}</div>`;
  if(isChoice(key))return `<label>${esc(FIELD[key])} <select id="${id}">${(COMPOSER_CHOICES[key] as readonly string[]).map(v=>`<option value="${v}">${esc(VALUE[`${key}:${v}`]??v)}</option>`).join("")}</select>${whyEl}</label>`;
  const [min,max,step]=COMPOSER_RANGES[key as ComposerNumberKey];
  return `<label class="composer-range">${esc(FIELD[key])} <output id="${id}-value"></output><input id="${id}" type="range" min="${min}" max="${max}" step="${step}" aria-label="${esc(FIELD[key])}">${whyEl}</label>`;
 }).join("")}${g.extra??""}</fieldset>`).join("");
 const field=(key:Exclude<Key,"marks">)=>$<HTMLInputElement|HTMLSelectElement>(`composer-${key}`);
 const markBoxes=COAT_MARK_NAMES.map(name=>({name,el:$<HTMLInputElement>(`composer-mark-${name}`)}));
 const editing=():Side=>compareBox.checked&&target.value==="second"?"second":"first";
 const herd=():ComposerHerdSize=>compareBox.checked?1:(COMPOSER_HERD_SIZES.find(n=>String(n)===herdSelect.value)??1);

 /** Species label: preset, plausible random species of a known seed, or a custom combination. */
 function speciesLabel(r:ComposerRecipe){
  const id=composerPresetOf(r);if(id)return COMPOSER_PRESET_LABELS[id];
  for(const [seed,p] of plausible)if(composerSpeciesEqual(p.recipe,r))return `Plausible ${ARCHETYPE_LABEL[p.archetype]} (seed ${seed})`;
  return "Custom combination";
 }
 // A shared plausible species keeps its name: its seed travels in the link.
 if(init.mode==="composer"&&init.recipe&&!error&&!composerPresetOf(recipes.first)){
  try{const s=coherentComposerSpecies(init.composerSeed);if(composerSpeciesEqual(s.recipe,recipes.first)){plausible.set(init.composerSeed,{recipe:s.recipe,archetype:s.archetype});generator="plausible";}}catch{/* label only */}
 }
 function individualPhrase(a:Actor){
  const t=a.creature.individual.traits,parts:string[]=[];
  if(t.individualSeed>0)parts.push(`individual ${t.individualSeed}`);
  const age=t.maturity<.75?"juvenile":t.maturity<1?"subadult":"adult",sex=t.sex==="none"?"":t.sex;
  if(sex||t.maturity<1)parts.push([age,sex].filter(Boolean).join(" "));
  return parts;
 }
 function herdSummary(){
  const n=actors.length,young=actors.filter(a=>a.creature.individual.traits.maturity<.75).length;
  const female=actors.filter(a=>a.creature.individual.traits.sex==="female").length,male=actors.filter(a=>a.creature.individual.traits.sex==="male").length;
  return [`herd of ${building?`${n}/${herdTarget}`:n}`,young?`${young} young`:"",female?`${female} female`:"",male?`${male} male`:""].filter(Boolean).join(" · ");
 }

 function showControls(){
  const r=recipes[editing()],id=composerPresetOf(r),h=herd();presetSelect.value=id??"custom";
  // The skin clamps a pattern finer than its mesh can draw (spots would break into triangles): say so, since
  // pattern scales above the limit then look the same. Read from the edited animal's built skin.
  const coat=actors.find(a=>a.side===editing())?.creature.skin.coatScale;
  const clampNote=(key:Key)=>{
   if(key!=="patternScale"||!coat||coat.effective>=coat.requested*(1-1e-6))return "";
   const limit=r.patternScale*coat.effective/coat.requested;
   return `This body's mesh can draw this ${coat.pattern} pattern only up to scale ${limit.toFixed(2)}`+(limit<COMPOSER_RANGES.patternScale[0]?" (below this range, so every setting looks the same here).":"; finer settings look the same.");
  };
  for(const key of COMPOSER_RECIPE_KEYS){
   const reason=why(r,key),info=reason?"":note(r,key,h)||clampNote(key),noteEl=$(`composer-${key}-why`);
   noteEl.hidden=!(reason||info);noteEl.textContent=reason||info;noteEl.classList.toggle("composer-info",!reason&&!!info);
   if(key==="marks"){for(const m of markBoxes){m.el.checked=!!(r.marks&COAT_MARK_BITS[m.name]);m.el.disabled=!!reason;}continue;}
   const el=field(key);
   el.value=String(r[key]);el.disabled=!!reason;el.title=reason;
   if(!isChoice(key))$(`composer-${key}-value`).textContent=formatValue(key,r[key] as number);
  }
  target.closest("label")!.hidden=!compareBox.checked;
  herdSelect.disabled=compareBox.checked;herdSelect.title=compareBox.checked?"Comparison shows one animal per recipe.":"";
  $("composer-herd-why").hidden=!compareBox.checked;
  $("composer-edit-hint").textContent=compareBox.checked?`Part controls edit the ${editing()==="first"?"first (left)":"second (right)"} animal.`:"";
  playButton.textContent=playing?"Pause":"Play";
  const list=$("composer-issues");list.hidden=!issues.length;list.innerHTML=issues.length?`<b>This link was adjusted:</b><ul>${issues.slice(0,12).map(i=>`<li>${esc(i)}</li>`).join("")}</ul>`:"";
 }
 function edit(side:Side,next:ComposerRecipe){recipes[side]=normalizeComposerRecipe(next).recipe;error=null;issues=[];host.rebuild();}
 for(const key of COMPOSER_RECIPE_KEYS){
  if(key==="marks")continue;
  const el=field(key);
  if(!isChoice(key))el.addEventListener("input",()=>{$(`composer-${key}-value`).textContent=formatValue(key,Number(el.value));});
  el.addEventListener("change",()=>{const side=editing();edit(side,{...recipes[side],[key]:isChoice(key)?el.value:Number(el.value)});});
 }
 for(const m of markBoxes)m.el.addEventListener("change",()=>{const side=editing(),bit=COAT_MARK_BITS[m.name];edit(side,{...recipes[side],marks:m.el.checked?recipes[side].marks|bit:recipes[side].marks&~bit});});
 $("composer-next-individual").onclick=()=>{const side=editing(),seed=recipes[side].individualSeed;edit(side,{...recipes[side],individualSeed:seed>=9999?1:seed+1});};
 presetSelect.onchange=()=>{if(isComposerPresetId(presetSelect.value))edit(editing(),composerPreset(presetSelect.value));};
 const seedValue=()=>seedInput.value.trim().slice(0,160)||"composer-1";
 const wild=()=>{generator="wild";edit(editing(),randomComposerRecipe(seedInput.value));};
 const plausibleSpecies=()=>{generator="plausible";const s=coherentComposerSpecies(seedInput.value);plausible.set(seedInput.value,{recipe:s.recipe,archetype:s.archetype});edit(editing(),s.recipe);};
 $("composer-randomize").onclick=()=>{seedInput.value=seedValue();wild();};
 $("composer-random-species").onclick=()=>{seedInput.value=seedValue();plausibleSpecies();};
 $("composer-next-seed").onclick=()=>{seedInput.value=nextSeed(seedInput.value.trim()||"composer-1");if(generator==="plausible")plausibleSpecies();else wild();};
 seedInput.onkeydown=e=>{if(e.key==="Enter")(generator==="plausible"?$("composer-random-species"):$("composer-randomize")).click();};
 compareBox.onchange=()=>{
  if(compareBox.checked){const id=composerPresetOf(recipes.first),next=ANIMAL_PRESETS[(ANIMAL_PRESETS.indexOf(id as ComposerPresetId)+1)%ANIMAL_PRESETS.length]!;
   if(composerRecipesEqual(recipes.first,recipes.second))recipes.second=composerPreset(id===null?"giraffe":next);
   herdSelect.value="1";}
  else target.value="first";
  host.rebuild();
 };
 herdSelect.onchange=()=>{issues=issues.filter(i=>!/^Herd size/.test(i));host.rebuild();};
 target.onchange=showControls;
 motionSelect.onchange=()=>host.rebuild();
 viewSelect.onchange=()=>{arrange();host.fit();};
 $("composer-frame").onclick=()=>host.fit();
 const setPlaying=(value:boolean)=>{playing=value;playButton.textContent=playing?"Pause":"Play";};
 playButton.onclick=()=>setPlaying(!playing);
 const seek=(time:number)=>{setPlaying(false);host.setTime(Math.max(0,Math.min(120,time)));host.refresh();};
 timeInput.oninput=()=>{const v=Number(timeInput.value);if(timeInput.value.trim()&&Number.isFinite(v))seek(v);};
 phaseInput.oninput=()=>{const period=actors[0]?.creature.graph.locomotion.period??1,time=host.getTime(),start=Math.floor(time/period)*period;seek(Math.min(120,start+Number(phaseInput.value)*period));};

 const motion=()=>(COMPOSER_MOTIONS as readonly string[]).includes(motionSelect.value)?motionSelect.value as ComposerMotion:"walk";
 function disposeActors(){buildToken++;building=false;provisional=null;for(const a of actors){a.creature.dispose();a.track?.dispose();}actors=[];herdTrack?.dispose();herdTrack=null;}
 /** Local bounds over a full motion cycle so framing does not crop wings, tails or swinging feet. */
 function sampleEnvelope(creature:ComposerCreature){
  const box=new THREE.Box3(),m=motion(),span=m==="neutral"?0:Math.max(creature.graph.locomotion.period,4.8);
  creature.group.position.set(0,0,0);
  for(let k=0;k<=(m==="neutral"?0:12);k++){creature.update(m,span*k/12);box.union(creature.bounds());}
  return box;
 }
 function makeActor(side:Side,index:number,recipe:ComposerRecipe,options:{skeleton:boolean;neutral:boolean},track:boolean):Actor{
  const creature=createComposerCreature(recipe),envelope=sampleEnvelope(creature);
  creature.setSkeletonVisible(options.skeleton);creature.setNeutral(options.neutral);
  const actor:Actor={side,index,recipe,creature,offset:new THREE.Vector3(),envelope,track:track?makeTrack(envelope):null,skinDigest:digest(creature.skin.positions),colorDigest:digest(creature.skin.colors)};
  if(actor.track)host.group.add(actor.track.group);host.group.add(creature.group);
  return actor;
 }
 function place(a:Actor,slot:THREE.Vector3){
  const c=a.envelope.getCenter(new THREE.Vector3());a.offset.set(slot.x-c.x,0,slot.z-c.z);a.creature.group.position.copy(a.offset);a.track?.group.position.copy(a.offset);
 }
 function arrange(){
  if(actors.length>1&&!compareBox.checked){arrangeHerd();return;}
  if(actors.length!==2)return;
  const direction=viewDirection(viewSelect.value as View),right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),direction).normalize(),depth=direction.clone().setY(0).normalize();
  const widths=actors.map(a=>{const s=a.envelope.getSize(new THREE.Vector3());return Math.abs(right.x)*s.x+Math.abs(right.z)*s.z;});
  const gap=Math.max(.25,.15*Math.max(...widths)),centres=[-(widths[1]!+gap)/2,(widths[0]!+gap)/2];
  actors.forEach((a,i)=>{const c=a.envelope.getCenter(new THREE.Vector3());a.offset.set(0,0,0).addScaledVector(right,centres[i]!-c.dot(right)).addScaledVector(depth,-c.dot(depth));a.offset.y=0;a.creature.group.position.copy(a.offset);a.track?.group.position.copy(a.offset);});
 }
 /** Final herd layout from the exact largest envelope and effective body length. */
 function arrangeHerd(){
  const size=new THREE.Vector3();for(const a of actors)size.max(a.envelope.getSize(new THREE.Vector3()));
  const length=Math.max(...actors.map(a=>a.creature.individual.effectiveRecipe.bodyLength));
  herdSlots(actors.length,length,size).forEach((slot,i)=>place(actors[i]!,slot));
 }
 function finishHerd(){
  building=false;provisional=null;arrangeHerd();
  herdTrack=makeHerdTrack(actors);host.group.add(herdTrack.lines);
  buildFinished=performance.now();renderConstraints();showControls();update(host.getTime());host.progress(true);
 }
 function build(options:{skeleton:boolean;neutral:boolean}){
  disposeActors();
  if(error)throw new Error(error);
  const token=buildToken;buildStarted=performance.now();buildFinished=0;herdTarget=herd();
  const sides:Side[]=compareBox.checked?["first","second"]:["first"];
  try{
   if(herdTarget>1){
    const members=composerHerdRecipes(recipes.first,herdTarget),first=makeActor("first",0,members[0]!,options,false);actors.push(first);
    // Provisional slots from the first animal (adults vary about 5%, young are smaller), so the camera frames the whole herd at once.
    const size=first.envelope.getSize(new THREE.Vector3()).multiplyScalar(1.12),slots=herdSlots(herdTarget,first.creature.individual.effectiveRecipe.bodyLength*1.12,size);
    const box=new THREE.Box3();for(const s of slots)box.union(new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(s.x,size.y/2,s.z),size));
    provisional={slots,box};place(first,slots[0]!);building=true;
    const next=(i:number)=>requestAnimationFrame(()=>{
     if(token!==buildToken)return;
     try{const a=makeActor("first",i,members[i]!,options,false);if(token!==buildToken){a.creature.dispose();return;}actors.push(a);place(a,provisional!.slots[i]!);}
     catch(e){disposeActors();error=e instanceof Error?e.message:String(e);host.rebuild();return;}
     if(i+1<members.length){host.progress(false);next(i+1);}else finishHerd();
    });
    next(1);
   }else for(const side of sides)actors.push(makeActor(side,0,recipes[side],options,true));
  }catch(e){disposeActors();throw e;}
  arrange();update(host.getTime());showControls();renderConstraints();syncTime(host.getTime());
  if(herdTarget===1)buildFinished=performance.now();
 }
 function update(time:number){
  const travels:number[]=[];
  for(const a of actors){const pose=a.creature.update(motion(),time);travels.push(pose.travel);if(a.track){const s=a.track.spacing;a.track.cross.position.x=-(((pose.travel%s)+s)%s);}}
  herdTrack?.update(travels);
 }
 function syncTime(time:number){
  if(document.activeElement!==timeInput)timeInput.value=time.toFixed(2);
  const period=actors[0]?.creature.graph.locomotion.period??1;if(document.activeElement!==phaseInput)phaseInput.value=((time%period)/period).toFixed(3);
 }
 function actorTitle(a:Actor){
  if(compareBox.checked)return a.side==="first"?"First (left)":"Second (right)";
  const phrase=individualPhrase(a);return actors.length>1?`Animal ${a.index+1}${phrase.length?`: ${phrase.join(", ")}`:""}`:"";
 }
 function deltaList(a:Actor){
  const deltas=a.creature.individual.deltas;
  return deltas.length?`<ul class="composer-deltas">${deltas.map(d=>`<li>${esc(d)}</li>`).join("")}</ul>`:"<p>Type specimen: built exactly as the species recipe.</p>";
 }
 function renderConstraints(){
  const herdView=actors.length>1&&!compareBox.checked;
  const out=actors.map((a,i)=>{const list=a.creature.graph.constraints;const title=actorTitle(a);
   const fit=list.length?`<ul>${list.map(c=>`<li><b>${esc(c.part)}</b> (${esc(c.chosen)}): ${esc(c.effect)}</li>`).join("")}</ul>`:"<p>No adjustments: every chosen part is built as selected.</p>";
   if(herdView)return `${i===0?fit:""}<details class="composer-individual"><summary>${esc(title)} · ${a.creature.individual.deltas.length} differences</summary>${deltaList(a)}</details>`;
   return `${title?`<b>${esc(title)}</b>`:""}${fit}<div class="composer-individual"><b>This individual</b>${deltaList(a)}</div>`;}).join("");
  $("composer-constraints").innerHTML=out;
 }
 function envelope(){
  if(building&&provisional)return provisional.box.clone();
  const box=new THREE.Box3();for(const a of actors)box.union(a.envelope.clone().translate(a.offset));return box;
 }
 const v3=(v:THREE.Vector3)=>v.toArray();
 const totals=()=>actors.reduce((t,a)=>{const d=a.creature.details();return {vertices:t.vertices+d.vertices,triangles:t.triangles+d.triangles,buildMs:t.buildMs+d.buildMs,maxBuildMs:Math.max(t.maxBuildMs,d.buildMs)};},{vertices:0,triangles:0,buildMs:0,maxBuildMs:0});
 const thousands=(n:number)=>n.toLocaleString("en-GB");
 return {
  get playing(){return playing;},get error(){return error;},get building(){return building;},
  setPlaying,
  setActive(active){$("composer-controls").hidden=!active;if(active)showControls();},
  build,disposeActors,update,syncTime,envelope,
  viewDirection:()=>viewDirection(viewSelect.value as View),
  state:()=>({recipe:encodeComposerRecipe(recipes.first),compareRecipe:compareBox.checked?encodeComposerRecipe(recipes.second):"",composerSeed:seedValue(),motion:motion(),compare:compareBox.checked,view:viewSelect.value as View,herd:herd()}),
  text(){
   const cmp=compareBox.checked,herdView=herd()>1&&!cmp;
   const caption=(a:Actor|undefined,r:ComposerRecipe)=>[speciesLabel(r),...(a?individualPhrase(a):[])].join(" · ");
   const firstActor=actors.find(a=>a.side==="first"),secondActor=actors.find(a=>a.side==="second");
   const detail=herdView?(()=>{const t=totals(),size=envelope().getSize(new THREE.Vector3());
    return `<div><b>${esc(speciesLabel(recipes.first))}</b><br>${esc(herdSummary())}<br>Herd spread ${size.x.toFixed(1)} × ${size.z.toFixed(1)} m · ${thousands(t.triangles)} triangles (desktop preview)</div>`;})():
    actors.map(a=>{const d=a.creature.details(),s=d.structure,size=a.envelope.getSize(new THREE.Vector3());
    const limbs=[s.legs?`${s.legs} legs`:"no legs",s.arms?`${s.arms} arms`:"",s.wings?`${s.wings} wings`:"",s.trunkBones?"trunk":"",s.tailBones?"tail":""].filter(Boolean).join(" · ");
    return `<div><b>${cmp?(a.side==="first"?"First (left): ":"Second (right): "):""}${esc(caption(a,a.recipe))}</b><br>${esc(VALUE[`layout:${s.layout}`]??s.layout)} · ${esc(limbs)}<br>${size.x.toFixed(2)} m long · ${size.y.toFixed(2)} m tall · ${s.bones} joints</div>`;}).join("");
   return {title:"Modular creature composer",
    description:"Build a creature from independent parts: start from an animal, swap body layout, head, neck, legs, feet, arms, tail, shell, wings or trunk, set its coat, then step through individuals or show a herd. Random plausible species follow real body plans; wild hybrids mix anything.",
    captionTitle:cmp?`${caption(firstActor,recipes.first)} | ${caption(secondActor,recipes.second)}`:herdView?`${speciesLabel(recipes.first)} · ${herdSummary()}`:caption(firstActor,recipes.first),
    captionCopy:cmp?"Left: first animal. Right: second animal. Same metre scale, light and pose time. Each ground track scrolls with its own walk.":herdView?"Individuals of one species at true metre scale, sharing light and clock; each walks with its own gait and scrolls its own ground track. Desktop preview, not a headset scene.":"Experimental procedural shapes at true metre scale. The animal stays centred while the ground track scrolls under its feet.",
    detail};
  },
  metrics(){
   if(actors.length>1&&!compareBox.checked){const t=totals();
    return `<div><b>Herd</b> ${actors.length}${building?`/${herdTarget} (building)`:""} animals · ${thousands(t.vertices)} vertices · ${thousands(t.triangles)} triangles · built in ${t.buildMs.toFixed(0)} ms (slowest animal ${t.maxBuildMs.toFixed(0)} ms${buildFinished?`, ${(buildFinished-buildStarted).toFixed(0)} ms wall clock at one animal per frame`:""})</div>`;}
   return actors.map(a=>{const d=a.creature.details(),p=a.creature.lastPose;const label=actors.length>1?(a.side==="first"?"First":"Second"):"Animal";
    return `<div><b>${label}</b> ${d.vertices} vertices · ${d.triangles} triangles · ${d.bones} joints · built in ${d.buildMs.toFixed(0)} ms</div><div><b>${label} contacts</b> ${p?`${p.contacts.filter(c=>c.stance).length}/${p.contacts.length} feet planted · reach error ${(p.diagnostics.maxReachError*1000).toFixed(2)} mm`:"–"}</div>`;}).join("");
  },
  status(drawCalls){
   const base=`Modular composer (experimental) | ${compareBox.checked?"2 animals":herdTarget>1?`herd of ${herdTarget}`:"1 animal"}`;
   if(building)return `${base} | Building ${actors.length}/${herdTarget}…`;
   if(herdTarget<=1||compareBox.checked)return base;
   const t=totals();return `${base} | ${thousands(t.triangles)} triangles · ${thousands(t.vertices)} vertices${drawCalls?` · ${drawCalls} draw calls`:""} | desktop preview`;
  },
  shadowCasters:()=>actors.filter(a=>a.creature.mesh.castShadow&&a.creature.group.visible).length,
  details(){
   const box=envelope(),t=totals();
   return {version:"creature-lab-composer-2",error,issues:[...issues],playing,motion:motion(),time:host.getTime(),view:viewSelect.value,compare:compareBox.checked,editTarget:editing(),seed:seedInput.value,
    herd:herd(),building,herdBuilt:actors.length,generator,species:speciesLabel(recipes.first),
    herdStats:{animals:actors.length,vertices:t.vertices,triangles:t.triangles,buildMs:t.buildMs,maxBuildMs:t.maxBuildMs,wallMs:buildFinished?buildFinished-buildStarted:null},
    envelope:box.isEmpty()?null:{min:v3(box.min),max:v3(box.max)},
    actors:actors.map(a=>{const p=a.creature.lastPose,b=a.creature.bounds(),ind=a.creature.individual;return {side:a.side,index:a.index,encoded:encodeComposerRecipe(a.recipe),recipe:{...a.recipe},preset:composerPresetOf(a.recipe),offset:v3(a.offset),envelope:{min:v3(a.envelope.min),max:v3(a.envelope.max)},skinDigest:a.skinDigest,colorDigest:a.colorDigest,details:a.creature.details(),
     individual:{seed:ind.traits.individualSeed,sex:ind.traits.sex,maturity:ind.traits.maturity,condition:ind.traits.condition,neutral:ind.traits.neutral,deltas:ind.deltas,effectiveBodyLength:ind.effectiveRecipe.bodyLength,effectiveHeadSize:ind.effectiveRecipe.headSize,phrase:individualPhrase(a)},
     pose:p?{time:p.time,travel:p.travel,positions:Array.from(p.positions),contacts:structuredClone(p.contacts),diagnostics:{...p.diagnostics}}:null,bounds:{min:v3(b.min),max:v3(b.max)}};})};
  },
 };
}
