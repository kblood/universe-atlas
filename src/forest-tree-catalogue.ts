import type {Species} from './biosphere-model.ts';
import {bindTreeSpecies,treeSpeciesRecipe,treeInstanceAppearance} from '#tree-kit/v1/recipes';

/** This snapshot receives the already dated catalogue from main. It neither
 * invents species nor evaluates a second date or lifecycle model. */
export function forestTreeCatalogue(species:readonly Species[]){
  const trees=species.filter(s=>s.kind==='tree'&&(s.family==='branching'||s.family==='spire')).slice().sort((a,b)=>a.id.localeCompare(b.id));
  const recipes=new Map(trees.map(s=>[s.id,treeSpeciesRecipe(s)]));
  if(recipes.size!==trees.length)throw new Error('Duplicate dated tree species');
  const signature=JSON.stringify([...recipes.values()]);
  return {signature,count:trees.length,
    resolve(cellId:string){
      const species=bindTreeSpecies(cellId,trees);if(!species)return null;
      const recipe=recipes.get(species.id)!;
      return {recipe,appearance:treeInstanceAppearance(recipe,cellId)};
    },
  };
}
export type ForestTreeBinding=NonNullable<ReturnType<ReturnType<typeof forestTreeCatalogue>['resolve']>>;
