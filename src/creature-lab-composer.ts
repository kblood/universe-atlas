import * as THREE from "three";
import {COMPOSER_CHOICES, COMPOSER_PRESET_IDS, COMPOSER_PRESET_LABELS, COMPOSER_RANGES, COMPOSER_RECIPE_KEYS, composerLegPairRange, composerPreset, composerRecipesEqual,
  decodeComposerRecipe, encodeComposerRecipe, isComposerPresetId, normalizeComposerRecipe, randomComposerRecipe,
  type ComposerChoiceKey, type ComposerNumberKey, type ComposerPresetId, type ComposerRecipe} from "./fauna-composer-recipe.ts";
import {COMPOSER_MOTIONS, type ComposerMotion} from "./fauna-composer-rig.ts";
import {createComposerCreature, type ComposerCreature} from "./fauna-composer.ts";
import type {CreatureLabState} from "./creature-lab-state.ts";

/** Creature Lab panel and actors for the experimental modular composer. The Lab
 * owns time, camera and the frame loop; this module owns the two recipes, their
 * actors (one skinned mesh each plus a scrolling ground track) and the controls. */
type Key=typeof COMPOSER_RECIPE_KEYS[number];
type Side="first"|"second";
type View=CreatureLabState["view"];
export interface ComposerLabHost{
 group:THREE.Group;initial:CreatureLabState;inputError:string|null;
 getTime():number;setTime(time:number):void;
 /** Full rebuild of the Lab view (actors, camera, text). */
 rebuild():void;
 /** Re-pose at the current time and refresh diagnostics. */
 refresh():void;
 fit():void;
}
interface Actor{side:Side;recipe:ComposerRecipe;creature:ComposerCreature;offset:THREE.Vector3;envelope:THREE.Box3;track:Track;skinDigest:string}
interface Track{group:THREE.Group;cross:THREE.LineSegments;spacing:number;dispose():void}

const $=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]!));
const GROUPS:{title:string;keys:Key[]}[]=[
 {title:"Body",keys:["layout","legPairs","bodyLength","girth","posture","torso","armor"]},
 {title:"Head and neck",keys:["neckLength","head","headSize","snoutLength","horns","trunk","trunkLength"]},
 {title:"Legs and arms",keys:["legs","legLength","feet","arms","armLength","hands"]},
 {title:"Wings and tail",keys:["wings","wingSpan","tail","tailLength"]},
 {title:"Colour",keys:["palette","colorSeed"]},
];
const FIELD:Record<Key,string>={layout:"Body layout",legPairs:"Walking leg pairs",bodyLength:"Body length",girth:"Girth",posture:"Posture (low to upright)",torso:"Torso",armor:"Shell or armour",
 neckLength:"Neck length",head:"Head",headSize:"Head size",snoutLength:"Snout or beak length",horns:"Horns",trunk:"Trunk",trunkLength:"Trunk length",
 legs:"Leg type",legLength:"Leg length",feet:"Feet",arms:"Arms (not used for walking)",armLength:"Arm length",hands:"Hands",
 wings:"Wings (ground display only)",wingSpan:"Wing span",tail:"Tail",tailLength:"Tail length",palette:"Colours",colorSeed:"Colour variation"};
const VALUE:Record<string,string>={
 "layout:limbless":"Limbless (worm, snake)","layout:biped":"Two legs (bird, ape, dinosaur)","layout:quadruped":"Four upright legs (mammal)","layout:sprawled":"Four sprawling legs (turtle, lizard)","layout:many-legged":"Many legs (centipede)",
 "torso:slim":"Slim","torso:barrel":"Barrel","torso:deep-chest":"Deep chest","torso:flat":"Flat","torso:annulated":"Ringed (worm)","torso:segmented":"Segmented (arthropod)",
 "head:muzzle":"Muzzle (mammal)","head:jaws":"Toothed jaws (reptile)","head:beak":"Beak (bird, turtle)","head:flat-face":"Flat face (ape)","head:blunt":"Blunt (worm)","head:mandibles":"Mandibles (centipede)",
 "horns:none":"None","horns:nasal":"Nose horn (rhino)","horns:paired":"Paired horns","horns:ossicones":"Ossicones (giraffe)","horns:crest":"Head crest",
 "legs:pillar":"Pillar (elephant, rhino)","legs:plantigrade":"Flat-footed (bear, ape)","legs:digitigrade":"Toe-walking (dog, bird)","legs:unguligrade":"Tip-toe hooved (deer, giraffe)","legs:arthropod":"Jointed (insect, centipede)",
 "feet:hoof":"Hooves","feet:paw":"Paws","feet:claw":"Clawed toes","feet:pad":"Round pads","feet:hand":"Hand-like feet","feet:spike":"Spiked tips",
 "arms:none":"None","arms:small":"Small arms","arms:grasping":"Long grasping arms","hands:hand":"Hands with fingers","hands:claw":"Claws","hands:pincer":"Pincers",
 "tail:none":"None","tail:stub":"Stub","tail:reptile":"Long reptile tail","tail:tufted":"Tufted (mammal)","tail:feather-fan":"Feather fan","tail:club":"Club",
 "armor:none":"None","armor:dome":"Domed shell (turtle)","armor:plates":"Back plates","armor:osteoderms":"Bony studs","armor:bands":"Banded segments",
 "wings:none":"None","wings:feathered":"Feathered","wings:membrane":"Skin membrane (bat)","trunk:none":"None","trunk:trunk":"Trunk (elephant)",
 "palette:earth":"Earth","palette:savanna":"Savanna","palette:reptile":"Reptile green","palette:plumage":"Bright plumage","palette:slate":"Slate grey","palette:ink":"Dark ink",
};
const MOTION_LABEL:Record<ComposerMotion,string>={neutral:"Rest pose (unanimated)",idle:"Standing",walk:"Walking",display:"Display (wings, arms, trunk)"};
const isChoice=(key:Key):key is ComposerChoiceKey=>key in COMPOSER_CHOICES;
const ratioKeys=new Set<Key>(["neckLength","snoutLength","legLength","armLength","tailLength","wingSpan","trunkLength"]);
function formatValue(key:Key,value:number){return key==="bodyLength"?`${value.toFixed(2)} m`:key==="legPairs"||key==="colorSeed"?String(value):ratioKeys.has(key)?`${value.toFixed(2)} × body`:value.toFixed(2);}
/** Why a control has no effect on the current recipe; empty when it applies. */
function why(r:ComposerRecipe,key:Key):string{
 const limbless=r.layout==="limbless";
 if(key==="legPairs"&&r.layout!=="many-legged"){const [lo]=composerLegPairRange(r.layout);return `Set by the body layout (${lo} pair${lo===1?"":"s"}).`;}
 if((key==="legs"||key==="legLength"||key==="feet")&&limbless)return "A limbless body has no legs.";
 if(key==="posture"&&r.layout!=="biped"&&r.layout!=="quadruped")return "Only changes two-legged and four-legged upright bodies.";
 if((key==="armLength"||key==="hands")&&r.arms==="none")return "No arms are selected.";
 if(key==="wingSpan"&&r.wings==="none")return "No wings are selected.";
 if(key==="tailLength"&&r.tail==="none")return "No tail is selected.";
 if(key==="trunkLength"&&r.trunk==="none")return "No trunk is selected.";
 return "";
}
function presetOf(r:ComposerRecipe):ComposerPresetId|null{return COMPOSER_PRESET_IDS.find(id=>composerRecipesEqual(composerPreset(id),r))??null;}
function recipeLabel(r:ComposerRecipe){const id=presetOf(r);return id?COMPOSER_PRESET_LABELS[id]:"Custom combination";}
function nextSeed(seed:string){const m=/^(.*?)(\d+)$/.exec(seed);return (m?`${m[1]}${Number(m[2])+1}`:`${seed}-2`).slice(0,160);}
const ANIMAL_PRESETS:ComposerPresetId[]=["dinosaur","turtle","giraffe","bird","ostrich","rhinoceros","ape","worm","centipede"];
/** Order-sensitive checksum of the bind-pose skin, so shape-only edits (girth, head type) are observable. */
function skinDigest(creature:ComposerCreature){const p=creature.skin.positions;let a=0,b=0;for(let i=0;i<p.length;i++){a=(a+Math.round(p[i]!*1e5)*((i%251)+1))%2147483647;b=(b*31+Math.round(p[i]!*1e4))%2147483647;}return `${p.length/3}:${a.toString(36)}:${b.toString(36)}`;}
function viewDirection(view:View){return view==="side"?new THREE.Vector3(0,.12,1).normalize():view==="front"?new THREE.Vector3(1,.15,0).normalize():new THREE.Vector3(1,.42,1).normalize();}

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

export interface ComposerLab{
 readonly playing:boolean;readonly error:string|null;
 setPlaying(value:boolean):void;
 setActive(active:boolean):void;
 build(options:{skeleton:boolean;neutral:boolean}):void;
 disposeActors():void;
 update(time:number):void;
 syncTime(time:number):void;
 envelope():THREE.Box3;
 viewDirection():THREE.Vector3;
 state():Pick<CreatureLabState,"recipe"|"compareRecipe"|"composerSeed"|"motion"|"compare"|"view">;
 text():{title:string;description:string;captionTitle:string;captionCopy:string;detail:string};
 metrics():string;
 details():unknown;
}

export function createComposerLab(host:ComposerLabHost):ComposerLab{
 const init=host.initial;
 const presetSelect=$<HTMLSelectElement>("composer-preset"),seedInput=$<HTMLInputElement>("composer-seed"),compareBox=$<HTMLInputElement>("composer-compare"),target=$<HTMLSelectElement>("composer-edit-target");
 const motionSelect=$<HTMLSelectElement>("composer-motion"),timeInput=$<HTMLInputElement>("composer-time"),phaseInput=$<HTMLInputElement>("composer-phase"),viewSelect=$<HTMLSelectElement>("composer-view"),playButton=$<HTMLButtonElement>("composer-play");
 let error:string|null=host.inputError,issues:string[]=[],playing=false,actors:Actor[]=[];
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

 presetSelect.innerHTML=`<option value="custom" disabled>Custom combination</option>`+COMPOSER_PRESET_IDS.map(id=>`<option value="${id}">${esc(COMPOSER_PRESET_LABELS[id])}</option>`).join("");
 motionSelect.innerHTML=COMPOSER_MOTIONS.map(m=>`<option value="${m}">${esc(MOTION_LABEL[m])}</option>`).join("");motionSelect.value=init.motion;
 $("composer-parts").innerHTML=GROUPS.map(g=>`<fieldset class="composer-group"><legend>${esc(g.title)}</legend>${g.keys.map(key=>{
  const id=`composer-${key}`,whyEl=`<small id="${id}-why" class="composer-why" hidden></small>`;
  if(isChoice(key))return `<label>${esc(FIELD[key])} <select id="${id}">${(COMPOSER_CHOICES[key] as readonly string[]).map(v=>`<option value="${v}">${esc(VALUE[`${key}:${v}`]??v)}</option>`).join("")}</select>${whyEl}</label>`;
  const [min,max,step]=COMPOSER_RANGES[key as ComposerNumberKey];
  return `<label class="composer-range">${esc(FIELD[key])} <output id="${id}-value"></output><input id="${id}" type="range" min="${min}" max="${max}" step="${step}" aria-label="${esc(FIELD[key])}">${whyEl}</label>`;
 }).join("")}</fieldset>`).join("");
 const field=(key:Key)=>$<HTMLInputElement|HTMLSelectElement>(`composer-${key}`);
 const editing=():Side=>compareBox.checked&&target.value==="second"?"second":"first";

 function showControls(){
  const r=recipes[editing()],id=presetOf(r);presetSelect.value=id??"custom";
  for(const key of COMPOSER_RECIPE_KEYS){
   const el=field(key),reason=why(r,key),note=$(`composer-${key}-why`);
   el.value=String(r[key]);el.disabled=!!reason;el.title=reason;note.hidden=!reason;note.textContent=reason;
   if(!isChoice(key))$(`composer-${key}-value`).textContent=formatValue(key,r[key] as number);
  }
  target.closest("label")!.hidden=!compareBox.checked;
  $("composer-edit-hint").textContent=compareBox.checked?`Part controls edit the ${editing()==="first"?"first (left)":"second (right)"} animal.`:"";
  playButton.textContent=playing?"Pause":"Play";
  const list=$("composer-issues");list.hidden=!issues.length;list.innerHTML=issues.length?`<b>This link was adjusted:</b><ul>${issues.slice(0,12).map(i=>`<li>${esc(i)}</li>`).join("")}</ul>`:"";
 }
 function edit(side:Side,next:ComposerRecipe){recipes[side]=normalizeComposerRecipe(next).recipe;error=null;issues=[];host.rebuild();}
 for(const key of COMPOSER_RECIPE_KEYS){
  const el=field(key);
  if(!isChoice(key))el.addEventListener("input",()=>{$(`composer-${key}-value`).textContent=formatValue(key,Number(el.value));});
  el.addEventListener("change",()=>{const side=editing();edit(side,{...recipes[side],[key]:isChoice(key)?el.value:Number(el.value)});});
 }
 presetSelect.onchange=()=>{if(isComposerPresetId(presetSelect.value))edit(editing(),composerPreset(presetSelect.value));};
 $("composer-randomize").onclick=()=>{seedInput.value=seedInput.value.trim().slice(0,160)||"composer-1";edit(editing(),randomComposerRecipe(seedInput.value));};
 $("composer-next-seed").onclick=()=>{seedInput.value=nextSeed(seedInput.value.trim()||"composer-1");edit(editing(),randomComposerRecipe(seedInput.value));};
 seedInput.onkeydown=e=>{if(e.key==="Enter")$("composer-randomize").click();};
 compareBox.onchange=()=>{
  if(compareBox.checked){const id=presetOf(recipes.first),next=ANIMAL_PRESETS[(ANIMAL_PRESETS.indexOf(id as ComposerPresetId)+1)%ANIMAL_PRESETS.length]!;
   if(composerRecipesEqual(recipes.first,recipes.second))recipes.second=composerPreset(id===null?"giraffe":next);}
  else target.value="first";
  host.rebuild();
 };
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
 function disposeActors(){for(const a of actors){a.creature.dispose();a.track.dispose();}actors=[];}
 /** Local bounds over a full motion cycle so framing does not crop wings, tails or swinging feet. */
 function sampleEnvelope(creature:ComposerCreature){
  const box=new THREE.Box3(),m=motion(),span=m==="neutral"?0:Math.max(creature.graph.locomotion.period,4.8);
  creature.group.position.set(0,0,0);
  for(let k=0;k<=(m==="neutral"?0:12);k++){creature.update(m,span*k/12);box.union(creature.bounds());}
  return box;
 }
 function arrange(){
  if(actors.length!==2)return;
  const direction=viewDirection(viewSelect.value as View),right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),direction).normalize(),depth=direction.clone().setY(0).normalize();
  const widths=actors.map(a=>{const s=a.envelope.getSize(new THREE.Vector3());return Math.abs(right.x)*s.x+Math.abs(right.z)*s.z;});
  const gap=Math.max(.25,.15*Math.max(...widths)),centres=[-(widths[1]!+gap)/2,(widths[0]!+gap)/2];
  actors.forEach((a,i)=>{const c=a.envelope.getCenter(new THREE.Vector3());a.offset.set(0,0,0).addScaledVector(right,centres[i]!-c.dot(right)).addScaledVector(depth,-c.dot(depth));a.offset.y=0;a.creature.group.position.copy(a.offset);a.track.group.position.copy(a.offset);});
 }
 function build(options:{skeleton:boolean;neutral:boolean}){
  disposeActors();
  if(error)throw new Error(error);
  const sides:Side[]=compareBox.checked?["first","second"]:["first"];
  try{
   for(const side of sides){
    const recipe=recipes[side],creature=createComposerCreature(recipe),envelope=sampleEnvelope(creature),track=makeTrack(envelope);
    creature.setSkeletonVisible(options.skeleton);creature.setNeutral(options.neutral);
    host.group.add(track.group,creature.group);actors.push({side,recipe,creature,offset:new THREE.Vector3(),envelope,track,skinDigest:skinDigest(creature)});
   }
  }catch(e){disposeActors();throw e;}
  arrange();update(host.getTime());showControls();renderConstraints();syncTime(host.getTime());
 }
 function update(time:number){
  for(const a of actors){const pose=a.creature.update(motion(),time);const s=a.track.spacing;a.track.cross.position.x=-(((pose.travel%s)+s)%s);}
 }
 function syncTime(time:number){
  if(document.activeElement!==timeInput)timeInput.value=time.toFixed(2);
  const period=actors[0]?.creature.graph.locomotion.period??1;if(document.activeElement!==phaseInput)phaseInput.value=((time%period)/period).toFixed(3);
 }
 function renderConstraints(){
  const out=actors.map(a=>{const list=a.creature.graph.constraints;const head=actors.length>1?`<b>${a.side==="first"?"First (left)":"Second (right)"}</b>`:"";
   return head+(list.length?`<ul>${list.map(c=>`<li><b>${esc(c.part)}</b> (${esc(c.chosen)}): ${esc(c.effect)}</li>`).join("")}</ul>`:"<p>No adjustments: every chosen part is built as selected.</p>");}).join("");
  $("composer-constraints").innerHTML=out;
 }
 function envelope(){const box=new THREE.Box3();for(const a of actors)box.union(a.envelope.clone().translate(a.offset));return box;}
 const v3=(v:THREE.Vector3)=>v.toArray();
 return {
  get playing(){return playing;},get error(){return error;},
  setPlaying,
  setActive(active){$("composer-controls").hidden=!active;if(active)showControls();},
  build,disposeActors,update,syncTime,envelope,
  viewDirection:()=>viewDirection(viewSelect.value as View),
  state:()=>({recipe:encodeComposerRecipe(recipes.first),compareRecipe:compareBox.checked?encodeComposerRecipe(recipes.second):"",composerSeed:seedInput.value.trim().slice(0,160)||"composer-1",motion:motion(),compare:compareBox.checked,view:viewSelect.value as View}),
  text(){
   const first=recipeLabel(recipes.first),second=recipeLabel(recipes.second),cmp=compareBox.checked;
   const detail=actors.map(a=>{const d=a.creature.details(),s=d.structure,size=a.envelope.getSize(new THREE.Vector3());
    const limbs=[s.legs?`${s.legs} legs`:"no legs",s.arms?`${s.arms} arms`:"",s.wings?`${s.wings} wings`:"",s.trunkBones?"trunk":"",s.tailBones?"tail":""].filter(Boolean).join(" · ");
    return `<div><b>${cmp?(a.side==="first"?"First (left): ":"Second (right): "):""}${esc(recipeLabel(a.recipe))}</b><br>${esc(VALUE[`layout:${s.layout}`]??s.layout)} · ${esc(limbs)}<br>${size.x.toFixed(2)} m long · ${size.y.toFixed(2)} m tall · ${s.bones} joints</div>`;}).join("");
   return {title:"Modular creature composer",
    description:"Build a creature from independent parts: start from an animal, then swap body layout, head, neck, legs, feet, arms, tail, shell, wings or trunk, or roll a random combination.",
    captionTitle:cmp?`${first} | ${second}`:first,
    captionCopy:cmp?"Left: first animal. Right: second animal. Same metre scale, light and pose time. Each ground track scrolls with its own walk.":"Experimental procedural shapes at true metre scale. The animal stays centred while the ground track scrolls under its feet.",
    detail};
  },
  metrics(){
   return actors.map(a=>{const d=a.creature.details(),p=a.creature.lastPose;const label=actors.length>1?(a.side==="first"?"First":"Second"):"Animal";
    return `<div><b>${label}</b> ${d.vertices} vertices · ${d.triangles} triangles · ${d.bones} joints · built in ${d.buildMs.toFixed(0)} ms</div><div><b>${label} contacts</b> ${p?`${p.contacts.filter(c=>c.stance).length}/${p.contacts.length} feet planted · reach error ${(p.diagnostics.maxReachError*1000).toFixed(2)} mm`:"–"}</div>`;}).join("");
  },
  details(){
   const box=envelope();
   return {version:"creature-lab-composer-1",error,issues:[...issues],playing,motion:motion(),time:host.getTime(),view:viewSelect.value,compare:compareBox.checked,editTarget:editing(),seed:seedInput.value,
    envelope:box.isEmpty()?null:{min:v3(box.min),max:v3(box.max)},
    actors:actors.map(a=>{const p=a.creature.lastPose,b=a.creature.bounds();return {side:a.side,encoded:encodeComposerRecipe(a.recipe),recipe:{...a.recipe},preset:presetOf(a.recipe),offset:v3(a.offset),skinDigest:a.skinDigest,details:a.creature.details(),
     pose:p?{time:p.time,travel:p.travel,positions:Array.from(p.positions),contacts:structuredClone(p.contacts),diagnostics:{...p.diagnostics}}:null,bounds:{min:v3(b.min),max:v3(b.max)}};})};
  },
 };
}
