/** Public cosmology helpers and exact BigInt era checkpoints. The background
 * is a radiation + matter + constant-dark-energy scenario; early inflation
 * and the far-future fate are outside its physical validity. */
import {YEAR_NS,NS,CATALOGUE_EPOCH_NS,UNIVERSE_END_NS,tenToThe,type Ns} from './world-time.ts';
import {backgroundLnScaleFactorAt,backgroundLnScaleRatio,cosmicBackgroundAt,RECOMBINATION_NS} from './cosmic-background.ts';

export const COSMOLOGY_VERSION='atlas-cosmology-2-radiation';
/** Finite adapter for position APIs. Use lnScaleFactorAt for physical
 * distances once a double-precision linear scale can no longer hold them. */
export function scaleFactorAt(t:Ns):number {return Math.exp(Math.min(600,backgroundLnScaleFactorAt(t)));}
export function lnScaleFactorAt(t:Ns):number {return backgroundLnScaleFactorAt(t);}
export function scaleRatio(t1:Ns,t2:Ns):number {return Math.exp(Math.min(600,backgroundLnScaleRatio(t1,t2)));}
export function properDistanceLn(comovingMpc:number,t:Ns):number {
  return comovingMpc>0?Math.log(comovingMpc)+lnScaleFactorAt(t):-Infinity;
}
/** The comoving Hubble radius c/(aH), a useful expansion diagnostic. It is
 * not the observable-universe boundary; observed-sky.ts uses a light cone. */
export function hubbleHorizonComovingMpc(t:Ns):number {
  if(t<=0n)return 0;
  const bg=cosmicBackgroundAt(t);
  const cMpcPerSecond=299792.458/3.0856775814913673e19;
  return Math.max(Number.MIN_VALUE,Math.exp(Math.log(cMpcPerSecond)-bg.lnScaleFactor-Math.log(bg.hubblePerSecond)));
}

export type EraCheckpoint={id:string;label:string;tNs:Ns;representation:string};
/** Coarse navigation and exact event boundaries. Ages of first stars and
 * late population transitions are illustrative ranges, not global switches. */
export const ERA_CHECKPOINTS:EraCheckpoint[]=[
  {id:'big-bang',label:'Big Bang',tNs:0n,
    representation:'explanatory origin; no central explosion or singularity is rendered'},
  {id:'nucleosynthesis',label:'Hot plasma & first nuclei',tNs:NS,
    representation:'radiation-dominated expansion and cooling; light nuclei form during the following minutes'},
  {id:'recombination',label:'Recombination / CMB',tNs:RECOMBINATION_NS,
    representation:'atoms form; the whole-sky CMB field is illustrative'},
  {id:'first-stars',label:'First stars',tNs:100_000_000n*YEAR_NS,
    representation:'procedural first-star cohort before the reference catalogue'},
  {id:'galaxy-assembly',label:'Galaxy assembly',tNs:500_000_000n*YEAR_NS,
    representation:'dated galaxy lineages and historical stellar population proxies'},
  {id:'catalogue-epoch',label:'Catalogue reference ("now")',tNs:CATALOGUE_EPOCH_NS,
    representation:'preserved reference catalogue with explorable planets and life'},
  {id:'stelliferous-ends',label:'Stelliferous era ends',tNs:tenToThe(14)*YEAR_NS,
    representation:'illustrative end of ordinary starlight in the baseline scenario'},
  {id:'degenerate-era',label:'Degenerate era',tNs:tenToThe(15)*YEAR_NS,
    representation:'cooling stellar remnants; population history is coarse'},
  {id:'black-hole-era',label:'Black-hole era',tNs:tenToThe(40)*YEAR_NS,
    representation:'conditional black-hole-dominated scenario; matter stability is unknown'},
  {id:'heat-death',label:'Heat death proxy',tNs:UNIVERSE_END_NS,
    representation:'navigation ceiling, never a claimed prediction of a finite end'},
];
export function eraAt(t:Ns):{id:string;label:string} {
  let current=ERA_CHECKPOINTS[0];
  for(const checkpoint of ERA_CHECKPOINTS){if(t>=checkpoint.tNs)current=checkpoint;else break;}
  return {id:current.id,label:current.label};
}
