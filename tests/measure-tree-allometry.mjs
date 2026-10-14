// Allometry census over the same fixture as tests/tree-allometry.test.mjs:
// 4 biosphere seeds, every dated tree catalogue, 96 cells each. Reports per
// family/species representation, clamp fractions and drawn-vs-recipe error.
// Usage: node tests/measure-tree-allometry.mjs [out.json]
import {writeFile} from 'node:fs/promises';
import {generateBiosphere,biosphereAt} from '../src/biosphere-model.ts';
import {forestTreeCatalogue} from '../src/forest-tree-catalogue.ts';
import {treeStructuralVariant} from '#tree-kit/v1/recipes';
import {forestTreeDimensions,TREE_ALLOMETRY_VERSION} from '#tree-kit/v1/presentation';
import {familyReference} from './helpers/tree-allometry-profiles.mjs';

const KINDS=['branching','spire'];
const packaged=Object.fromEntries(await Promise.all(KINDS.map(async kind=>[kind,await familyReference(kind)])));
const families=new Map(KINDS.map(kind=>[kind,{allometry:packaged[kind].reference}]));
const cellIds=Array.from({length:96},(_,i)=>`${i%6}/13/${i*37%211}/${i*53%197}`);
const worlds=[['ATLAS-ALLOMETRY-A','temperate'],['ATLAS-ALLOMETRY-B','arid'],['ATLAS-ALLOMETRY-C','cold'],['ATLAS-ALLOMETRY-D','temperate']]
  .map(([seed,profile],i)=>generateBiosphere(seed,profile,`G001/allometry/planet/${i}`));
const dated=worlds.flatMap(world=>{
  const births=[...new Set(world.species.filter(s=>s.kind==='tree').map(s=>s.birthMyr))].sort((a,b)=>a-b);
  return [...births,births.at(-1)+5000].map(date=>({world,date,species:biosphereAt(world,date).species}));
});
const rows=new Map(),total={bindings:0,family:0,legacy:0,reasons:{}};
const stat=()=>({n:0,family:0,legacy:0,reasons:{},maxRelH:0,maxRelW:0,maxRelD:0,sumRelW:0,target:{h:[Infinity,-Infinity],w:[Infinity,-Infinity]},drawn:{w:[Infinity,-Infinity],crown:[Infinity,-Infinity],card:[Infinity,-Infinity]}});
const range=(r,x)=>{r[0]=Math.min(r[0],x);r[1]=Math.max(r[1],x);};
for(const {species} of dated){
  const catalogue=forestTreeCatalogue(species);
  for(const id of cellIds){
    const b=catalogue.resolve(id);if(!b)continue;
    const d=forestTreeDimensions(b,16,families),v=treeStructuralVariant(b.recipe,b.appearance.variant);
    const key=`${b.recipe.family} ${b.recipe.speciesId}`;if(!rows.has(key))rows.set(key,stat());
    for(const s of [rows.get(key)]){
      s.n++;s[d.representation]++;total.bindings++;total[d.representation]++;
      for(const r of d.reasons){s.reasons[r]=(s.reasons[r]??0)+1;total.reasons[r]=(total.reasons[r]??0)+1;}
      const relH=Math.abs(d.heightM-v.heightM)/v.heightM,relW=Math.abs(d.crownWidthM-v.crownWidthM)/v.crownWidthM,relD=Math.abs(d.trunkDiameterM-v.trunkDiameterM)/v.trunkDiameterM;
      s.maxRelH=Math.max(s.maxRelH,relH);s.maxRelW=Math.max(s.maxRelW,relW);s.maxRelD=Math.max(s.maxRelD,relD);s.sumRelW+=relW;
      range(s.target.h,v.heightM);range(s.target.w,v.crownWidthM);range(s.drawn.w,d.crownWidthM);if(d.representation==='family'){range(s.drawn.crown,d.crownRatio);range(s.drawn.card,d.cardScale??1);}
    }
  }
}
const pct=(a,b)=>b?Math.round(1000*a/b)/10:0,r2=x=>Math.round(x*100)/100;
const perSpecies=[...rows].sort(([a],[b])=>a.localeCompare(b)).map(([key,s])=>({key,n:s.n,family:s.family,legacy:s.legacy,
  crownClampPct:pct(s.reasons['crown-ratio-clamped']??0,s.n),trunkClampPct:pct(s.reasons['trunk-ratio-clamped']??0,s.n),
  belowEnvelopePct:pct(s.reasons['height-below-family-envelope']??0,s.n),reasons:s.reasons,
  maxRelErr:{h:r2(100*s.maxRelH),w:r2(100*s.maxRelW),d:r2(100*s.maxRelD)},meanRelErrW:r2(100*s.sumRelW/s.n),
  targetH:s.target.h.map(r2),targetW:s.target.w.map(r2),drawnW:s.drawn.w.map(r2),crownRatio:s.drawn.crown.map(r2),cardScale:s.drawn.card.map(r2)}));
const out={version:TREE_ALLOMETRY_VERSION,references:Object.fromEntries(KINDS.map(k=>[k,packaged[k].reference])),total,perSpecies};
console.log(`${TREE_ALLOMETRY_VERSION}: ${total.bindings} bindings, family ${total.family}, legacy ${total.legacy}`,JSON.stringify(total.reasons));
console.log('family species                         n   fam  leg  crown%  trunk%  <env%  maxErr H/W/D %      targetH        targetW       drawnW');
for(const s of perSpecies)console.log(`${s.key.padEnd(38)} ${String(s.n).padStart(4)} ${String(s.family).padStart(4)} ${String(s.legacy).padStart(4)} ${String(s.crownClampPct).padStart(6)} ${String(s.trunkClampPct).padStart(6)} ${String(s.belowEnvelopePct).padStart(6)}  ${s.maxRelErr.h}/${s.maxRelErr.w}/${s.maxRelErr.d}`.padEnd(100)+`${s.targetH.join('–')}  ${s.targetW.join('–')}  ${s.drawnW.join('–')}`);
if(process.argv[2])await writeFile(process.argv[2],JSON.stringify(out,null,1));
