// Shared fixtures for the W1-B terrain colour tests (no tests in this module):
// Fibonacci directions, Maithea, the golden-generator terrain bodies and the
// four water worlds the W0-CLIMATE report judged (Maithea, Selawyn, Raiva, Lethuris).
import {galaxies,refByAddress,sector,system} from '../src/catalog.ts';

export function fib(i,n){const y=1-2*(i+.5)/n,p=i*2.399963229728653,r=Math.sqrt(1-y*y);return [Math.cos(p)*r,y,Math.sin(p)*r];}

export function maithea(){
  const g0=galaxies('LETHRA-001')[0];
  return system(refByAddress(g0,'G001/C2128,0,1/0')).planets[1];
}
/** Same selection as tests/golden/generator.ts computeGolden(). */
export function goldenTerrainBodies(){
  const refs=[];
  for(const g of galaxies('LETHRA-GOLDEN-001').slice(0,3))
    for(const c of [[266,0,0],[0,0,0],[-2,-1,-2],[12,-4,7]])refs.push(...sector(g,c).refs);
  return refs.slice(0,220).map(system).flatMap(s=>s.planets).filter(p=>p.type!=='Gas giant').slice(0,6);
}

/** The four water worlds the colour work is judged on (W0-CLIMATE report picks). */
export function waterWorlds(){
  const g0=galaxies('LETHRA-001')[0];
  const at=(addr,i)=>system(refByAddress(g0,addr)).planets[i];
  return [maithea(),at('G001/C2142,3,4/0',0),at('G001/C2143,4,3/0',1),at('G001/C2142,6,1/1',1)];
}

