/** Deterministic, metre-based quadruped anatomy shared by the lab data and rig. */
export type CreatureArchetype = 'browser'|'runner'|'low-slung'|'long-neck';
export interface CreatureGenome {
  version:string; archetype:CreatureArchetype;
  torsoLength:number; torsoHeight:number; torsoWidth:number;
  legLength:number; upperLegFraction:number; stanceWidth:number;
  neckLength:number; neckRise:number; headLength:number; headWidth:number;
  tailLength:number; footLength:number; footWidth:number;
  hornLength:number; earLength:number; armor:number;
  color:string; accentColor:string; pattern:'plain'|'stripes'|'spots';
  walkSpeed:number; runSpeed:number; strideLength:number;
  mutationLog:string[];
}

export const CREATURE_GENOME_VERSION = 'creature-genome-1';
const ARCHETYPES: readonly CreatureArchetype[] = ['browser','runner','low-slung','long-neck'];
const COLORS = ['#8d633e','#657a4b','#5f6d78','#9a7650','#78654a','#596f65'];
const ACCENTS = ['#e1c58a','#c98757','#a9bec3','#d6a56d','#b9a675','#d1d6c8'];

function hash32(value:string):number { let h=2166136261>>>0; for(let i=0;i<value.length;i++){h^=value.charCodeAt(i);h=Math.imul(h,16777619);} h^=h>>>16;h=Math.imul(h,0x7feb352d);h^=h>>>15;h=Math.imul(h,0x846ca68b);return(h^(h>>>16))>>>0; }
function unit(key:string):number { return hash32(key)/0x1_0000_0000; }
function between(key:string,low:number,high:number):number { return low+(high-low)*unit(key); }
function clamp(value:number,low:number,high:number):number { return Math.max(low,Math.min(high,value)); }
function round(value:number):number { return Math.round(value*1000)/1000; }
function requireSeed(seed:string):void { if(typeof seed!=='string'||!seed.trim()||seed.length>160) throw new Error('seed must be a non-empty string up to 160 characters'); }
function requireArchetype(archetype:CreatureArchetype):void { if(!ARCHETYPES.includes(archetype)) throw new Error(`Unknown creature archetype: ${String(archetype)}`); }
function copy(g:CreatureGenome):CreatureGenome { return {...g,mutationLog:[...g.mutationLog]}; }

type Shape = Omit<CreatureGenome,'version'|'archetype'|'color'|'accentColor'|'pattern'|'mutationLog'>;
const BASE:Record<CreatureArchetype,Shape> = {
  browser: {torsoLength:1.72,torsoHeight:.82,torsoWidth:.68,legLength:1.08,upperLegFraction:.53,stanceWidth:.76,neckLength:.58,neckRise:.34,headLength:.48,headWidth:.32,tailLength:.48,footLength:.25,footWidth:.15,hornLength:.22,earLength:.18,armor:.08,walkSpeed:1.05,runSpeed:3.15,strideLength:.9},
  runner: {torsoLength:1.94,torsoHeight:.66,torsoWidth:.48,legLength:1.46,upperLegFraction:.52,stanceWidth:.58,neckLength:.38,neckRise:.2,headLength:.44,headWidth:.25,tailLength:1.05,footLength:.3,footWidth:.11,hornLength:0,earLength:.24,armor:.02,walkSpeed:1.55,runSpeed:5.6,strideLength:1.35},
  'low-slung': {torsoLength:1.8,torsoHeight:.48,torsoWidth:.82,legLength:.62,upperLegFraction:.49,stanceWidth:.92,neckLength:.31,neckRise:.1,headLength:.52,headWidth:.42,tailLength:.3,footLength:.28,footWidth:.23,hornLength:.08,earLength:.12,armor:.58,walkSpeed:.72,runSpeed:2.25,strideLength:.58},
  'long-neck': {torsoLength:1.66,torsoHeight:.76,torsoWidth:.57,legLength:1.35,upperLegFraction:.54,stanceWidth:.68,neckLength:1.42,neckRise:.82,headLength:.43,headWidth:.27,tailLength:.72,footLength:.27,footWidth:.14,hornLength:0,earLength:.2,armor:.05,walkSpeed:1.12,runSpeed:3.45,strideLength:1.08},
};
const BOUNDS:Record<keyof Shape,[number,number]>={torsoLength:[.7,3.2],torsoHeight:[.25,1.5],torsoWidth:[.25,1.5],legLength:[.35,2.5],upperLegFraction:[.4,.62],stanceWidth:[.35,1.5],neckLength:[.15,2.8],neckRise:[0,1.8],headLength:[.2,1],headWidth:[.12,.7],tailLength:[0,1.8],footLength:[.1,.65],footWidth:[.06,.45],hornLength:[0,.9],earLength:[0,.45],armor:[0,1],walkSpeed:[.4,2.4],runSpeed:[1.2,7.5],strideLength:[.18,1.9]};

function visibleMutation(parent:CreatureGenome,seed:string):CreatureGenome {
  const g=copy(parent), swing=between(`${seed}/direction`,-1,1)>=0?1:-1;
  const n=(field:keyof Shape,amount:number,label:string)=>{ const before=g[field] as number,[low,high]=BOUNDS[field],after=round(clamp(before*(1+swing*amount),low,high)),suffix=field==='armor'?' coverage':'m'; (g as unknown as Record<string,number>)[field]=after; if(after!==before) g.mutationLog.push(`${label} ${after>before?'increased':'decreased'}: ${before}${suffix} → ${after}${suffix}`); };
  // Each clade changes an anatomical package, so ancestry is readable from a neutral pose.
  if(g.archetype==='browser'){ n('neckLength',.24,'browsing neck');n('headLength',.18,'muzzle');n('hornLength',.42,'horn development');n('torsoWidth',.14,'barrel torso'); }
  else if(g.archetype==='runner'){ n('legLength',.19,'cursorial legs');n('tailLength',.27,'balancing tail');n('torsoWidth',.14,'narrow torso');n('strideLength',.18,'stride length'); }
  else if(g.archetype==='low-slung'){ n('torsoLength',.16,'long low torso');n('torsoWidth',.22,'broad low torso');n('stanceWidth',.16,'wide stance');n('armor',.34,'armor plates');n('footWidth',.22,'broad feet'); }
  else { n('neckLength',.28,'towering neck');n('neckRise',.25,'upright neck');n('legLength',.16,'stilt legs');n('headLength',.16,'reaching head'); }
  g.walkSpeed=round(clamp(g.walkSpeed*(1+swing*.08),.45,2.2));
  g.runSpeed=round(clamp(g.runSpeed*(1+swing*.1),1.3,7));
  return normalized(g);
}

function normalized(g:CreatureGenome):CreatureGenome {
  for(const [field,[low,high]] of Object.entries(BOUNDS)) (g as unknown as Record<string,number>)[field]=round(clamp((g as unknown as Record<string,number>)[field]!,low,high));
  g.runSpeed=round(Math.max(g.runSpeed,g.walkSpeed*1.75));
  return g;
}

export function generateCreatureGenome(seed:string,archetype:CreatureArchetype,parent?:CreatureGenome):CreatureGenome {
  requireSeed(seed);requireArchetype(archetype);
  // Public seeds may be 160 characters; fold them before adding generation channels.
  const key=hash32(seed).toString(16);
  if(parent){ if(parent.archetype!==archetype) throw new Error('A descendant must retain its parent archetype'); if(validateCreatureGenome(parent).length) throw new Error('Invalid parent creature genome'); return visibleMutation(parent,key); }
  const base=BASE[archetype], g={version:CREATURE_GENOME_VERSION,archetype,...base,color:COLORS[Math.floor(unit(`${key}/color`)*COLORS.length)]!,accentColor:ACCENTS[Math.floor(unit(`${key}/accent`)*ACCENTS.length)]!,pattern:(['plain','stripes','spots'] as const)[Math.floor(unit(`${key}/pattern`)*3)]!,mutationLog:[`${archetype} founder anatomy`]} as CreatureGenome;
  // A founder has bounded variation, but retains its deliberately distinct clade silhouette.
  for(const field of ['torsoLength','torsoHeight','torsoWidth','legLength','neckLength','headLength','tailLength','footLength','earLength'] as const) g[field]=round(g[field]*(1+between(`${key}/${field}`,-.07,.07)));
  return normalized(g);
}

export function individualCreatureGenome(genome:CreatureGenome,id:string,variant:number,stage:'adult'|'juvenile'='adult'):CreatureGenome {
  if(validateCreatureGenome(genome).length) throw new Error('Invalid creature genome');
  if(typeof id!=='string'||!id||!Number.isInteger(variant)||variant<0||variant>3||(stage!=='adult'&&stage!=='juvenile')) throw new Error('Invalid creature specimen request');
  const g=copy(genome), growth=stage==='juvenile'?.57:between(`${id}/${variant}/adult-size`,.95,1.06);
  for(const field of ['torsoLength','torsoHeight','torsoWidth','legLength','neckLength','neckRise','headLength','headWidth','tailLength','footLength','footWidth','hornLength','earLength','stanceWidth','strideLength'] as const) g[field]=round(g[field]*growth);
  if(stage==='juvenile'){const speedFactor=Math.sqrt(growth);g.walkSpeed=round(g.walkSpeed*speedFactor);g.runSpeed=round(g.runSpeed*speedFactor);g.hornLength=round(g.hornLength*.45);g.armor=round(g.armor*.7);g.mutationLog.push('juvenile proportions and locomotion');}
  else {
    const direction=unit(`${id}/${variant}/shape`)>.5?1:-1;
    if(g.archetype==='runner'){g.legLength=round(g.legLength*(1+direction*.06));g.tailLength=round(g.tailLength*(1-direction*.08));}
    if(g.archetype==='long-neck') g.neckLength=round(g.neckLength*(1+direction*.07));
    if(g.archetype==='low-slung') g.torsoWidth=round(g.torsoWidth*(1+direction*.06));
    if(g.archetype==='browser') g.headWidth=round(g.headWidth*(1+direction*.06));
  }
  return normalized(g);
}

export function validateCreatureGenome(genome:CreatureGenome):string[] {
  const errors:string[]=[]; if(!genome||typeof genome!=='object'){return ['genome must be an object'];}
  if(genome.version!==CREATURE_GENOME_VERSION) errors.push('unsupported genome version');
  if(!ARCHETYPES.includes(genome.archetype)) errors.push('unknown archetype');
  const numeric=['torsoLength','torsoHeight','torsoWidth','legLength','upperLegFraction','stanceWidth','neckLength','neckRise','headLength','headWidth','tailLength','footLength','footWidth','hornLength','earLength','armor','walkSpeed','runSpeed','strideLength'] as const;
  for(const field of numeric) { const value=genome[field],[low,high]=BOUNDS[field]; if(!Number.isFinite(value)||value<low||value>high) errors.push(`${field} must be a finite number from ${low} to ${high}`); }
  if(genome.upperLegFraction<.35||genome.upperLegFraction>.7) errors.push('upperLegFraction must permit a two-segment leg');
  if(genome.legLength<=0||genome.torsoLength<=0||genome.torsoHeight<=0||genome.torsoWidth<=0||genome.stanceWidth<=0||genome.headLength<=0||genome.footWidth<=0) errors.push('core body dimensions must be positive');
  if(genome.runSpeed<=genome.walkSpeed) errors.push('runSpeed must exceed walkSpeed');
  if(!/^#[0-9a-f]{6}$/i.test(genome.color)||!/^#[0-9a-f]{6}$/i.test(genome.accentColor)) errors.push('colors must be #RRGGBB');
  if(!['plain','stripes','spots'].includes(genome.pattern)) errors.push('unknown pattern');
  if(!Array.isArray(genome.mutationLog)||!genome.mutationLog.every(x=>typeof x==='string')) errors.push('mutationLog must be string[]');
  return errors;
}
