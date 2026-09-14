/**
 * A small, deliberately fictional and deterministic biosphere fixture.  Dates
 * are global atlas offsets, rather than planet ages; ecological scores are
 * inspectable heuristics, rather than predictions.
 */
import {YEAR_NS} from './world-time.ts';

export type PlanetProfile = 'temperate' | 'arid' | 'cold' | 'airless';
export type SpeciesKind = 'tree' | 'shrub' | 'grass' | 'animal';
export type PlantFamily = 'branching' | 'spire' | 'bush' | 'blade';
export type Family = PlantFamily | 'quadruped';
export type Traits = {
  heightM:number; widthRatio:number; branchCount:number; branchAngle:number;
  leafLength:number; leafWidth:number; leafDensity:number; curvature:number;
  legRatio:number; bodyLength:number; headRatio:number; tailLength:number;
  color:string; woodColor:string;
};
export type Species = {
  id:string; name:string; lineageId:string; parentId:string|null;
  kind:SpeciesKind; family:Family; birthMyr:number; deathMyr:number|null;
  traits:Traits; niche:{minTempK:number;maxTempK:number;minMoisture:number;
    maxMoisture:number;maxSlope:number};
  diet:'producer'|'browser'|'grazer'; dispersal:'land';
};
export type Habitat = {id:string;name:string;temperatureK:number;moisture:number;slope:number;reachable:boolean;groundColor:string};
export type RockFamily = {id:string;name:string;form:'angular'|'layered'|'rounded';color:string;scaleM:number;elongation:number;layers:number;roughness:number};
export type HistoryEvent = {id:string;dateMyr:number;kind:string;label:string;speciesId?:string};
export type BiosphereWorld = {
  version:string;seed:string;planetId:string;name:string;profile:PlanetProfile;
  formationMyr:number;surfaceMyr:number;microbialMyr:number|null;
  species:Species[];habitats:Habitat[];rocks:RockFamily[];events:HistoryEvent[];digest:string;
};
export type Membership = {speciesId:string;suitability:number;occupied:boolean;reasons:string[]};
export type DatedBiosphere = {dateMyr:number;dateNs:string;stage:'unformed'|'forming'|'sterile'|'microbial'|'complex';surfaceAvailable:boolean;species:Species[];digest:string};
export type Placement = {id:string;speciesId:string|null;rockId:string|null;variant:number;x:number;z:number;rotation:number;scale:number};

export const BIOSPHERE_VERSION = 'biosphere-lab-1';
const MAX_SEED_LENGTH = 160;
const MIN_DATE_MYR = -20_000, MAX_DATE_MYR = 20_000;
const PLOT_M = 64, MAX_PLACEMENTS = 700, VARIANT_COUNT = 4;

const profiles: Record<Exclude<PlanetProfile, 'airless'>, {temp:number; moisture:number; height:number; leaf:number; hue:number}> = {
  temperate: {temp: 286, moisture: .57, height: 1, leaf: 1, hue: 0},
  arid: {temp: 299, moisture: .24, height: .72, leaf: .72, hue: 18},
  cold: {temp: 268, moisture: .46, height: .76, leaf: .64, hue: -16},
};
const familyWords: Record<Family, string[]> = {
  branching: ['Alder', 'Crown', 'Fork', 'Bough'], spire: ['Needle', 'Pillar', 'Spire', 'Lance'],
  bush: ['Mound', 'Thorn', 'Cushion', 'Brush'], blade: ['Reed', 'Blade', 'Tuft', 'Sward'],
  quadruped: ['Grazer', 'Browser', 'Runner', 'Hoof'],
};
const worldWords = ['Aster', 'Boreal', 'Cinder', 'Dawn', 'Elder', 'Fallow', 'Galen', 'Hearth'];
const placeWords = ['Vale', 'Reach', 'Cairn', 'Mere', 'Hollow', 'Crest', 'Fen', 'Rill'];
const colors = ['#547341', '#6e883f', '#8a7540', '#476d58', '#9b633d', '#63834c', '#70783d', '#596f33'];
const woods = ['#5c3925', '#70452b', '#4b3828', '#765137', '#61412a', '#513626'];

/** FNV supplies stable string folding; this finalizer removes its visible
 * neighbouring-key correlation (for example candidate /x versus /z). */
function hash32(value:string):number { let h = 2166136261 >>> 0; for (let i=0;i<value.length;i++) { h ^= value.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 16; h = Math.imul(h, 0x7feb352d); h ^= h >>> 15; h = Math.imul(h, 0x846ca68b); return (h ^ (h >>> 16)) >>> 0; }
function random01(key:string):number { return hash32(key) / 0x1_0000_0000; }
function pick<T>(items:readonly T[], key:string):T { return items[Math.floor(random01(key) * items.length)]!; }
function between(key:string, low:number, high:number):number { return low + (high-low)*random01(key); }
function clamp(value:number, low:number, high:number):number { return Math.max(low, Math.min(high, value)); }
function round(value:number, places=3):number { const k=10**places; return Math.round(value*k)/k; }
function digest(value:string):string { return hash32(value).toString(16).padStart(8, '0') + hash32(value + '/digest').toString(16).padStart(8, '0'); }
function dateNs(dateMyr:number):string { return (BigInt(dateMyr) * 1_000_000n * YEAR_NS).toString(); }
function requireSeed(seed:string):void { if (typeof seed !== 'string' || !seed.trim() || seed.length > MAX_SEED_LENGTH) throw new Error(`seed must be a non-empty string up to ${MAX_SEED_LENGTH} characters`); }
function requireProfile(profile:PlanetProfile):void { if (profile !== 'temperate' && profile !== 'arid' && profile !== 'cold' && profile !== 'airless') throw new Error(`Unknown planet profile: ${String(profile)}`); }
function requireDate(dateMyr:number):void { if (!Number.isFinite(dateMyr) || !Number.isInteger(dateMyr) || dateMyr < MIN_DATE_MYR || dateMyr > MAX_DATE_MYR) throw new Error(`dateMyr must be a finite integer between ${MIN_DATE_MYR} and ${MAX_DATE_MYR}`); }
function requireVariant(variant:number):void { if (!Number.isFinite(variant) || !Number.isInteger(variant) || variant < 0 || variant >= VARIANT_COUNT) throw new Error(`variant must be an integer from 0 to ${VARIANT_COUNT-1}`); }

function profileHabitat(seed:string, profile:Exclude<PlanetProfile, 'airless'>, id:string, tempDelta:number, moistureDelta:number, slope:number, reachable:boolean, color:string):Habitat {
  const p=profiles[profile], wobble=between(`${seed}/habitat/${id}`, -3, 3);
  return {id, name:`${pick(placeWords, `${seed}/${id}/name`)} ${id.replace('-', ' ')}`, temperatureK:round(p.temp+tempDelta+wobble,1), moisture:round(clamp(p.moisture+moistureDelta+between(`${seed}/${id}/wet`,-.035,.035),0.03,.97),3), slope, reachable, groundColor:color};
}
function makeHabitats(seed:string, profile:Exclude<PlanetProfile, 'airless'>):Habitat[] { return [
  profileHabitat(seed,profile,'sheltered-upland',-2,.06,.22,true,'#665d43'),
  profileHabitat(seed,profile,'river-corridor',1,.27,.08,true,'#4f6244'),
  profileHabitat(seed,profile,'dry-slope',4,-.27,.68,true,'#806444'),
  profileHabitat(seed,profile,'cold-ridge',-15,-.12,.79,true,'#70716a'),
  profileHabitat(seed,profile,'isolated-island',0,.13,.16,false,'#6b7354'),
]; }
function airlessHabitats(seed:string):Habitat[] { return [
  {id:'sheltered-upland',name:`${pick(placeWords,`${seed}/sterile/0`)} sheltered upland`,temperatureK:196,moisture:0,slope:.22,reachable:true,groundColor:'#4d4c49'},
  {id:'river-corridor',name:`${pick(placeWords,`${seed}/sterile/1`)} dry channel`,temperatureK:201,moisture:0,slope:.08,reachable:true,groundColor:'#55504a'},
  {id:'dry-slope',name:`${pick(placeWords,`${seed}/sterile/2`)} dry slope`,temperatureK:207,moisture:0,slope:.68,reachable:true,groundColor:'#62544a'},
  {id:'cold-ridge',name:`${pick(placeWords,`${seed}/sterile/3`)} cold ridge`,temperatureK:173,moisture:0,slope:.79,reachable:true,groundColor:'#45484b'},
  {id:'isolated-island',name:`${pick(placeWords,`${seed}/sterile/4`)} isolated basin`,temperatureK:199,moisture:0,slope:.16,reachable:false,groundColor:'#50514d'},
]; }

function baseTraits(seed:string, profile:Exclude<PlanetProfile,'airless'>, family:Family):Traits {
  const p=profiles[profile], r=(channel:string, a:number,b:number)=>between(`${seed}/${family}/${channel}`,a,b);
  const plant=family !== 'quadruped';
  const heightBase = family==='branching'?r('height',7,14):family==='spire'?r('height',9,18):family==='bush'?r('height',.8,2.8):family==='blade'?r('height',.35,1.35):r('height',.7,1.25);
  return {
    heightM:round(heightBase*p.height), widthRatio:round(family==='spire'?r('width',.16,.35):family==='blade'?r('width',.18,.42):family==='quadruped'?r('width',.36,.55):r('width',.48,.9)),
    branchCount:plant?Math.round(family==='blade'?r('branches',10,25):family==='bush'?r('branches',12,28):family==='spire'?r('branches',10,22):r('branches',7,16)):0,
    branchAngle:plant?round(family==='spire'?r('angle',.22,.48):family==='blade'?r('angle',.18,.65):r('angle',.45,1.05)):0,
    leafLength:round(r('leafLength',.05,.34)*p.leaf), leafWidth:round(r('leafWidth',.01,.12)*p.leaf), leafDensity:round(r('leafDensity',.45,.9)*p.leaf), curvature:round(r('curvature',-.45,.55)),
    legRatio:family==='quadruped'?round(r('leg',.62,1.04)):0, bodyLength:family==='quadruped'?round(r('body',.75,1.7)):0,
    headRatio:family==='quadruped'?round(r('head',.2,.42)):0, tailLength:family==='quadruped'?round(r('tail',.2,1.05)):0,
    color:pick(colors,`${seed}/${family}/color/${p.hue}`), woodColor:pick(woods,`${seed}/${family}/wood`),
  };
}
function inheritedTraits(parent:Traits, seed:string, family:Family, ordinal:number):Traits {
  const delta=(key:string, amount:number)=>1+between(`${seed}/mutation/${ordinal}/${key}`,-amount,amount);
  const plant=family!=='quadruped';
  const height=delta('height',.16), crown=delta('crown',.12);
  return {
    ...parent, heightM:round(clamp(parent.heightM*height,.12,25)), widthRatio:round(clamp(parent.widthRatio*crown,.12,1.1)),
    branchCount:plant?Math.round(clamp(parent.branchCount*delta('branches',.22),3,36)):0,
    branchAngle:plant?round(clamp(parent.branchAngle+between(`${seed}/mutation/${ordinal}/angle`,-.14,.14),.08,1.25)):0,
    leafLength:round(clamp(parent.leafLength*height,.015,.7)), leafWidth:round(clamp(parent.leafWidth*crown,.006,.25)), leafDensity:round(clamp(parent.leafDensity/delta('density',.13),.18,1)), curvature:round(clamp(parent.curvature+between(`${seed}/mutation/${ordinal}/curve`,-.16,.16),-.8,.8)),
    legRatio:family==='quadruped'?round(clamp(parent.legRatio*height,.4,1.3)):0, bodyLength:family==='quadruped'?round(clamp(parent.bodyLength*height,.45,2.5)):0,
    headRatio:family==='quadruped'?round(clamp(parent.headRatio*crown,.15,.55)):0, tailLength:family==='quadruped'?round(clamp(parent.tailLength*delta('tail',.22),.1,1.4)):0,
    color:parent.color, woodColor:parent.woodColor,
  };
}
function nicheFor(profile:Exclude<PlanetProfile,'airless'>, family:Family, ordinal:number, seed:string):Species['niche'] {
  const p=profiles[profile];
  // The first living branching descendant is the documented generalist. The
  // blade family is deliberately moisture-bound, making it a useful specialist.
  if (family==='branching') return {minTempK:p.temp-11,maxTempK:p.temp+10,minMoisture:clamp(p.moisture-.12,.03,.9),maxMoisture:clamp(p.moisture+.3,.1,.98),maxSlope:.48};
  if (family==='blade') return {minTempK:p.temp-7,maxTempK:p.temp+9,minMoisture:clamp(p.moisture+.08,.08,.93),maxMoisture:.98,maxSlope:.34};
  // The terrestrial-inspired quadruped fixture deliberately overlaps the
  // sheltered upland and river corridor, so shared-range/resource behaviour is
  // visible without relying on a random redraw of its habitat envelope.
  if (family==='quadruped') return {minTempK:p.temp-18,maxTempK:p.temp+18,minMoisture:clamp(p.moisture-.3,.03,.75),maxMoisture:.95,maxSlope:.75};
  const centre=p.temp+between(`${seed}/niche/${family}/${ordinal}/temp`,-6,6), spread=11;
  const moisture=clamp(p.moisture+between(`${seed}/niche/${family}/${ordinal}/moisture`,-.14,.14),.06,.9);
  return {minTempK:round(centre-spread,1),maxTempK:round(centre+spread,1),minMoisture:round(clamp(moisture-.2,.02,.88),3),maxMoisture:round(clamp(moisture+.25,.1,.98),3),maxSlope:round(clamp((family==='bush'?.82:.62)+between(`${seed}/niche/${family}/${ordinal}/slope`,-.12,.12),.18,.92),3)};
}
function inheritedNiche(parent:Species['niche'], seed:string, ordinal:number):Species['niche'] {
  const centre=(parent.minTempK+parent.maxTempK)/2, half=(parent.maxTempK-parent.minTempK)/2;
  const moistureCentre=(parent.minMoisture+parent.maxMoisture)/2, moistureHalf=(parent.maxMoisture-parent.minMoisture)/2;
  const thermalShift=between(`${seed}/niche-mutation/${ordinal}/temperature`,-3,3), moistureShift=between(`${seed}/niche-mutation/${ordinal}/moisture`,-.055,.055);
  const nextHalf=clamp(half*(1+between(`${seed}/niche-mutation/${ordinal}/spread`,-.12,.12)),4,25), nextMoistureHalf=clamp(moistureHalf*(1+between(`${seed}/niche-mutation/${ordinal}/wetspread`,-.14,.14)),.08,.46);
  const nextCentre=centre+thermalShift, nextMoistureCentre=clamp(moistureCentre+moistureShift,.08,.92);
  return {minTempK:round(nextCentre-nextHalf,1),maxTempK:round(nextCentre+nextHalf,1),minMoisture:round(clamp(nextMoistureCentre-nextMoistureHalf,.01,.9),3),maxMoisture:round(clamp(nextMoistureCentre+nextMoistureHalf,.1,.99),3),maxSlope:round(clamp(parent.maxSlope+between(`${seed}/niche-mutation/${ordinal}/slope`,-.08,.08),.12,.96),3)};
}
function makeSpecies(seed:string, planetId:string, profile:Exclude<PlanetProfile,'airless'>, family:Family, lineageIndex:number, baseBirth:number):Species[] {
  const lineageId=`${planetId}/lineage/${family}`, kind:SpeciesKind=family==='bush'?'shrub':family==='blade'?'grass':family==='quadruped'?'animal':'tree';
  const founderId=`${lineageId}/0`, child1Id=`${lineageId}/1`, child2Id=`${lineageId}/2`;
  const firstBirth=baseBirth+lineageIndex*13+Math.floor(random01(`${seed}/${family}/birth`)*11), split1=firstBirth+90+Math.floor(random01(`${seed}/${family}/split1`)*75), split2=split1+65+Math.floor(random01(`${seed}/${family}/split2`)*65);
  const founder=baseTraits(`${seed}/lineage/${family}`,profile,family), child1=inheritedTraits(founder,`${seed}/lineage/${family}`,family,1), child2=inheritedTraits(child1,`${seed}/lineage/${family}`,family,2);
  const name=(ordinal:number)=>`${pick(familyWords[family],`${seed}/${family}/name/${ordinal}`)} ${pick(placeWords,`${seed}/${family}/epithet/${ordinal}`)}`;
  const diet:Species['diet']=family==='quadruped'?'browser':'producer';
  const extinctFounder=family==='branching';
  const founderNiche=nicheFor(profile,family,0,seed), child1Niche=inheritedNiche(founderNiche,`${seed}/${family}`,1), child2Niche=inheritedNiche(child1Niche,`${seed}/${family}`,2);
  return [
    {id:founderId,name:name(0),lineageId,parentId:null,kind,family,birthMyr:firstBirth,deathMyr:extinctFounder?split1+35:null,traits:founder,niche:founderNiche,diet,dispersal:'land'},
    {id:child1Id,name:name(1),lineageId,parentId:founderId,kind,family,birthMyr:split1,deathMyr:null,traits:child1,niche:child1Niche,diet,dispersal:'land'},
    {id:child2Id,name:name(2),lineageId,parentId:child1Id,kind,family,birthMyr:split2,deathMyr:null,traits:child2,niche:child2Niche,diet,dispersal:'land'},
  ];
}
function makeRocks(seed:string, planetId:string, profile:PlanetProfile):RockFamily[] { const palette=profile==='arid'?['#8b6544','#a58a60','#715443']:profile==='cold'?['#69717a','#8a8f8a','#596269']:['#6b6254','#82765e','#59675e']; return (['angular','layered','rounded'] as const).map((form,index)=>({
  id:`${planetId}/rock/${form}`,name:`${pick(placeWords,`${seed}/rock/${form}`)} ${form} stone`,form,color:palette[index]!,scaleM:round(between(`${seed}/rock/${form}/scale`,.45,1.65)),elongation:round(between(`${seed}/rock/${form}/elongation`,form==='layered'?1.5:0.7,form==='layered'?2.7:1.5)),layers:form==='layered'?Math.floor(between(`${seed}/rock/${form}/layers`,3,8)):0,roughness:round(between(`${seed}/rock/${form}/roughness`,.25,.85)),
})); }

export function generateBiosphere(seed:string, profile:PlanetProfile):BiosphereWorld {
  requireSeed(seed); requireProfile(profile);
  const formationMyr=-12_000+Math.floor(random01(`${seed}/formation`)*1_000), surfaceMyr=formationMyr+80+Math.floor(random01(`${seed}/surface`)*140);
  const planetId=`${BIOSPHERE_VERSION}/planet/${digest(`${profile}/${seed}`)}`, name=`${pick(worldWords,`${seed}/world`)} ${pick(placeWords,`${seed}/world-place`)}`;
  const rocks=makeRocks(seed,planetId,profile);
  const formationEvent:HistoryEvent={id:`${planetId}/formation`,dateMyr:formationMyr,kind:'formation',label:'Planet formation scenario begins'};
  if (profile==='airless') { const bare={version:BIOSPHERE_VERSION,seed,planetId,name,profile,formationMyr,surfaceMyr,microbialMyr:null,species:[],habitats:airlessHabitats(seed),rocks,events:[formationEvent,{id:`${planetId}/surface`,dateMyr:surfaceMyr,kind:'surface',label:'Bare surface scenario begins'}],digest:''}; return {...bare,digest:digest(JSON.stringify(bare))}; }
  const microbialMyr=surfaceMyr+95+Math.floor(random01(`${seed}/microbial`)*110), speciesBase=microbialMyr+420+Math.floor(random01(`${seed}/complex`)*150);
  const families:Family[]=['branching','spire','bush','blade','quadruped'];
  const species=families.flatMap((family,index)=>makeSpecies(seed,planetId,profile,family,index,speciesBase));
  const events:HistoryEvent[]=[
    formationEvent,
    {id:`${planetId}/surface`,dateMyr:surfaceMyr,kind:'surface',label:'Stable surface scenario begins'},
    {id:`${planetId}/microbial`,dateMyr:microbialMyr,kind:'microbial-origin',label:'Microbial scenario begins'},
  ];
  for (const s of species) { events.push({id:`${s.id}/origin`,dateMyr:s.birthMyr,kind:s.parentId?'budding-speciation':'lineage-origin',label:`${s.name} begins`,speciesId:s.id}); if(s.deathMyr!==null) events.push({id:`${s.id}/extinction`,dateMyr:s.deathMyr,kind:'extinction',label:`${s.name} ends`,speciesId:s.id}); }
  events.sort((a,b)=>a.dateMyr-b.dateMyr || (a.id<b.id?-1:a.id>b.id?1:0));
  const world={version:BIOSPHERE_VERSION,seed,planetId,name,profile,formationMyr,surfaceMyr,microbialMyr,species,habitats:makeHabitats(seed,profile),rocks,events,digest:''};
  return {...world,digest:digest(JSON.stringify(world))};
}

function worldLooksValid(world:BiosphereWorld):void { if (!world || typeof world!=='object' || typeof world.seed!=='string' || !Array.isArray(world.species) || !Array.isArray(world.habitats) || !Number.isInteger(world.formationMyr) || !Number.isInteger(world.surfaceMyr)) throw new Error('Invalid biosphere world'); }
function exists(s:Species, dateMyr:number):boolean { return dateMyr>=s.birthMyr && (s.deathMyr===null || dateMyr<s.deathMyr); }
export function biosphereAt(world:BiosphereWorld,dateMyr:number):DatedBiosphere {
  worldLooksValid(world); requireDate(dateMyr);
  const surfaceAvailable=dateMyr>=world.surfaceMyr;
  const stage:DatedBiosphere['stage']=dateMyr<world.formationMyr?'unformed':!surfaceAvailable?'forming':world.microbialMyr===null||dateMyr<world.microbialMyr?'sterile':world.species.some(s=>exists(s,dateMyr))?'complex':'microbial';
  const species=surfaceAvailable&&stage==='complex'?world.species.filter(s=>exists(s,dateMyr)):[];
  return {dateMyr,dateNs:dateNs(dateMyr),stage,surfaceAvailable,species,digest:digest(`${world.digest}/dated/${dateMyr}/${species.map(s=>s.id).join(',')}`)};
}

function baseMembership(world:BiosphereWorld,species:Species,habitat:Habitat,dateMyr:number):Membership {
  const reasons:string[]=[];
  if (!exists(species,dateMyr)) reasons.push(dateMyr<species.birthMyr?'species has not originated':'species is extinct');
  if (dateMyr<world.surfaceMyr) reasons.push('surface is unavailable');
  const n=species.niche;
  const temp=habitat.temperatureK<n.minTempK||habitat.temperatureK>n.maxTempK?0:1-Math.abs(habitat.temperatureK-(n.minTempK+n.maxTempK)/2)/((n.maxTempK-n.minTempK)/2||1);
  const moist=habitat.moisture<n.minMoisture||habitat.moisture>n.maxMoisture?0:1-Math.abs(habitat.moisture-(n.minMoisture+n.maxMoisture)/2)/((n.maxMoisture-n.minMoisture)/2||1);
  const slope=habitat.slope>n.maxSlope?0:1-habitat.slope/n.maxSlope*.35;
  if (!temp) reasons.push('temperature lies outside tolerance'); if (!moist) reasons.push('moisture lies outside tolerance'); if (!slope) reasons.push('slope exceeds tolerance');
  const suitability=round(clamp(.45*temp+.4*moist+.15*slope,0,1),3);
  return {speciesId:species.id,suitability,occupied:false,reasons};
}
export function habitatMembership(world:BiosphereWorld,species:Species,habitat:Habitat,dateMyr:number):Membership {
  worldLooksValid(world); requireDate(dateMyr);
  if (!species || !habitat || !Number.isFinite(habitat.temperatureK) || !Number.isFinite(habitat.moisture) || !Number.isFinite(habitat.slope)) throw new Error('Invalid species or habitat');
  const result=baseMembership(world,species,habitat,dateMyr);
  if (result.suitability<=0 || result.reasons.some(r=>r==='species has not originated'||r==='species is extinct'||r==='surface is unavailable'||r==='temperature lies outside tolerance'||r==='moisture lies outside tolerance'||r==='slope exceeds tolerance')) return result;
  if (!habitat.reachable) { result.reasons.push('suitable but unoccupied: no land dispersal route to island'); return result; }
  if (species.kind==='animal') {
    const requiredKind=species.diet==='browser'?'tree':'grass';
    const producers=world.species.filter(s=>s.diet==='producer' && (requiredKind==='tree' ? (s.kind==='tree'||s.kind==='shrub') : s.kind==='grass')).filter(s=>{
      const candidate=baseMembership(world,s,habitat,dateMyr);
      return candidate.suitability>=.28 && !candidate.reasons.some(reason=>reason==='species has not originated'||reason==='species is extinct'||reason==='surface is unavailable'||reason==='temperature lies outside tolerance'||reason==='moisture lies outside tolerance'||reason==='slope exceeds tolerance');
    });
    if (!producers.length) { result.reasons.push('no eligible producer resource'); return result; }
    result.reasons.push(`resource eligible: ${producers.length} producer species`);
  }
  if (result.suitability<.28) { result.reasons.push('suitability below occupancy threshold'); return result; }
  result.occupied=true; result.reasons.push('reachable land habitat and suitability threshold pass'); return result;
}

export function specimenTraits(species:Species,variant:number,stage:'juvenile'|'adult'='adult'):Traits {
  if (!species || typeof species.id!=='string' || !species.traits) throw new Error('Invalid species'); requireVariant(variant); if(stage!=='juvenile'&&stage!=='adult') throw new Error('stage must be juvenile or adult');
  const factor=stage==='juvenile'?.52:.94+random01(`${species.id}/variant/${variant}/size`)*.12, spread=.93+random01(`${species.id}/variant/${variant}/spread`)*.14, animal=species.family==='quadruped';
  const t=species.traits;
  return {...t,heightM:round(t.heightM*factor),widthRatio:round(t.widthRatio*spread),branchCount:animal?0:Math.max(3,Math.round(t.branchCount*(stage==='juvenile'?.55:1)*( .9+random01(`${species.id}/variant/${variant}/branches`)*.18))),branchAngle:round(clamp(t.branchAngle+between(`${species.id}/variant/${variant}/angle`,-.07,.07),0,1.4)),leafLength:round(t.leafLength*factor),leafWidth:round(t.leafWidth*spread),leafDensity:round(clamp(t.leafDensity*(.9+random01(`${species.id}/variant/${variant}/density`)*.18),.1,1)),curvature:round(clamp(t.curvature+between(`${species.id}/variant/${variant}/curve`,-.08,.08),-.9,.9)),legRatio:animal?round(t.legRatio*factor):0,bodyLength:animal?round(t.bodyLength*factor):0,headRatio:animal?round(t.headRatio*spread):0,tailLength:animal?round(t.tailLength*factor):0};
}

export function communityPlacements(world:BiosphereWorld,habitatId:string,dateMyr:number):Placement[] {
  worldLooksValid(world); requireDate(dateMyr); if(typeof habitatId!=='string' || !habitatId) throw new Error('habitatId is required');
  const habitat=world.habitats.find(h=>h.id===habitatId); if(!habitat) throw new Error(`Unknown habitat: ${habitatId}`);
  if (!biosphereAt(world,dateMyr).surfaceAvailable) return [];
  const candidates: (Placement & {priority:number})[]=[];
  for (const rock of world.rocks) for(let slot=0;slot<14;slot++) { const key=`${world.seed}/plot/${habitatId}/rock/${rock.id}/${slot}`; candidates.push({id:key,speciesId:null,rockId:rock.id,variant:slot%VARIANT_COUNT,x:round(random01(`${key}/x`)*PLOT_M-PLOT_M/2,3),z:round(random01(`${key}/z`)*PLOT_M-PLOT_M/2,3),rotation:round(random01(`${key}/r`)*Math.PI*2,4),scale:round(.65+random01(`${key}/s`)*.8,3),priority:random01(`${key}/p`)}); }
  for (const species of world.species) { const membership=habitatMembership(world,species,habitat,dateMyr); if(!membership.occupied) continue; const slots=species.kind==='grass'?100:species.kind==='shrub'?34:species.kind==='tree'?18:5; for(let slot=0;slot<slots;slot++) { const key=`${world.seed}/plot/${habitatId}/species/${species.id}/${slot}`; if(random01(`${key}/presence`)>membership.suitability) continue; candidates.push({id:key,speciesId:species.id,rockId:null,variant:slot%VARIANT_COUNT,x:round(random01(`${key}/x`)*PLOT_M-PLOT_M/2,3),z:round(random01(`${key}/z`)*PLOT_M-PLOT_M/2,3),rotation:round(random01(`${key}/r`)*Math.PI*2,4),scale:round(.72+random01(`${key}/s`)*.55,3),priority:random01(`${key}/p`)}); } }
  return candidates.sort((a,b)=>a.priority-b.priority||(a.id<b.id?-1:a.id>b.id?1:0)).slice(0,MAX_PLACEMENTS).map(({priority: _priority,...placement})=>placement).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
}
