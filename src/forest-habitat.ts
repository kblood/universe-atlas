import {Vector3} from 'three';
import type {V3} from './catalog.ts';
import type {PopulationCell} from './planet-population.ts';
import type {terrainSampler} from './terrain.ts';
import type {biomeClassifier} from './surface-biomes.ts';

/** Preserve the shipped one-axis slope rule. A two-axis gradient would change
 * presence and must be a separate, explicitly versioned habitat migration. */
export const TREE_HABITAT_VERSION='tree-habitat-1';
export function forestHabitat(sample:ReturnType<typeof terrainSampler>,classify:ReturnType<typeof biomeClassifier>,radiusM:number){
  const d=new Vector3(),right=new Vector3(),a=new Vector3(),b=new Vector3();
  const up=new Vector3(0,1,0),pole=new Vector3(1,0,0),ad:V3=[0,0,0],bd:V3=[0,0,0];
  return (cell:PopulationCell)=>{
    const s=sample(cell.direction),biome=classify(cell.direction,s.groundHeightM);
    let present=!s.wet&&biome.forestPotential&&cell.roll<.76;
    if(present){
      d.set(...cell.direction);right.crossVectors(Math.abs(d.y)>.9?pole:up,d).normalize();
      a.copy(d).addScaledVector(right,5/radiusM).normalize();b.copy(d).addScaledVector(right,-5/radiusM).normalize();
      a.toArray(ad);b.toArray(bd);
      const slope=Math.abs(sample(ad).groundHeightM-sample(bd).groundHeightM)/10;
      present=slope<.55;
    }
    return {present,groundHeightM:s.groundHeightM};
  };
}
