import {Vector3} from 'three';
import type {V3} from './catalog.ts';
import type {PopulationCell} from './planet-population.ts';
import type {terrainSampler} from './terrain.ts';
import type {biomeClassifier} from './surface-biomes.ts';

/** Preserve the shipped one-axis slope rule. A two-axis gradient would change
 * presence and must be a separate, explicitly versioned habitat migration.
 *
 * tree-habitat-2-climate (docs/biome-climate-increment-1-plan-2026-10-02.json,
 * W2-C C1): presence is nested thinning on the existing population roll,
 * `roll < .76 * forestSuitability01`, where forestSuitability01 is the
 * classifier's (surface-biomes-2-climate) warmest-month treeline x effective
 * moisture x snow window, 0 wherever forestPotential is false. It never
 * exceeds the shipped 76% cover, needs no population migration (cells, rolls
 * and POPULATION_VERSION are unchanged) and forms ecotones: cover thins
 * continuously toward the treeline, the dry belt and the snow edge. The result
 * also carries the cell's annual climateCode (presence/kind read only annual
 * statistics, never a season phase). */
export const TREE_HABITAT_VERSION='tree-habitat-2-climate';
/** Maximum tree cover (fraction of population cells) at full suitability. */
export const TREE_FULL_COVER=.76;
export function forestHabitat(sample:ReturnType<typeof terrainSampler>,classify:ReturnType<typeof biomeClassifier>,radiusM:number,strict=false){
  const d=new Vector3(),right=new Vector3(),a=new Vector3(),b=new Vector3();
  const up=new Vector3(0,1,0),pole=new Vector3(1,0,0),ad:V3=[0,0,0],bd:V3=[0,0,0];
  return (cell:PopulationCell)=>{
    const s=sample(cell.direction);
    if(strict&&!Number.isFinite(s.groundHeightM))throw new Error('Non-finite forest habitat height');
    const biome=classify(cell.direction,s.groundHeightM);
    let present=!s.wet&&biome.forestPotential&&cell.roll<TREE_FULL_COVER*biome.forestSuitability01;
    if(present){
      d.set(...cell.direction);right.crossVectors(Math.abs(d.y)>.9?pole:up,d).normalize();
      a.copy(d).addScaledVector(right,5/radiusM).normalize();b.copy(d).addScaledVector(right,-5/radiusM).normalize();
      a.toArray(ad);b.toArray(bd);
      const ah=sample(ad).groundHeightM,bh=sample(bd).groundHeightM;
      if(strict&&(!Number.isFinite(ah)||!Number.isFinite(bh)))throw new Error('Non-finite forest habitat slope');
      const slope=Math.abs(ah-bh)/10;
      present=slope<.55;
    }
    return {present,groundHeightM:s.groundHeightM,climateCode:biome.climateCode};
  };
}
