import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
  TREE_KIT_API_VERSION,
  TREE_RECIPE_VERSION,
  bindTreeSpecies,
  treeGeometryCacheKey,
  treeInstanceAppearance,
  treeSpeciesRecipe,
} from '#tree-kit/v1/recipes';
import {
  FOREST_VARIANT_COUNT,
  TREE_ALLOMETRY_VERSION,
  forestStructuralVariants,
  forestVariantUniformData,
  treeAllometryBox,
} from '#tree-kit/v1/presentation';

test('Tree Kit v1 public import paths expose deterministic recipes and presentation contracts',()=>{
  assert.equal(TREE_KIT_API_VERSION,'1.0.0');
  assert.equal(TREE_RECIPE_VERSION,'tree-recipe-1');
  assert.equal(TREE_ALLOMETRY_VERSION,'tree-allometry-2');
  const species=[
    {id:'oak-a',lineageId:'oak-lineage',kind:'tree',family:'branching',traits:{heightM:18,widthRatio:.78,branchCount:9,branchAngle:.62,curvature:.12,leafLength:.19,leafWidth:.11,leafDensity:.78,color:'#426b37',woodColor:'#574536'}},
    {id:'pine-a',lineageId:'pine-lineage',kind:'tree',family:'spire',traits:{heightM:21,widthRatio:.44,branchCount:7,branchAngle:.7,curvature:.06,leafLength:.12,leafWidth:.05,leafDensity:.66,color:'#335a3d',woodColor:'#554637'}},
  ];
  const binding=bindTreeSpecies('body/cell/42',species);
  assert.ok(binding);
  assert.equal(binding.id,bindTreeSpecies('body/cell/42',[...species].reverse())?.id);
  const recipe=treeSpeciesRecipe(binding);
  const appearance=treeInstanceAppearance(recipe,'body/cell/42');
  assert.equal(appearance.variant>=0&&appearance.variant<FOREST_VARIANT_COUNT,true);
  assert.equal(treeGeometryCacheKey(recipe,appearance.variant,1),treeGeometryCacheKey(recipe,appearance.variant,1));
  assert.equal(forestStructuralVariants(recipe.family).length,FOREST_VARIANT_COUNT);
  assert.equal(forestVariantUniformData(forestStructuralVariants(recipe.family)).length,FOREST_VARIANT_COUNT*8);
  const box=treeAllometryBox([0,0,0],[1,2,1],1,1);
  assert.ok([...box.center,...box.extent].every(Number.isFinite));
});

test('Tree Kit v1 entrypoints do not depend on Atlas catalogue, planet, habitat or clock adapters',async()=>{
  for(const path of ['src/tree-kit-v1/recipes.ts','src/tree-kit-v1/presentation.ts']){
    const source=await readFile(new URL(`../${path}`,import.meta.url),'utf8');
    assert.doesNotMatch(source,/from ['"]\.\/(?:forest-tree-catalogue|planet-forest|biosphere-model|world-time)\.ts['"]/);
  }
});
