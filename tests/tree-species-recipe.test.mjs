import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateBiosphere,biosphereAt} from '../src/biosphere-model.ts';
import {bindTreeSpecies,treeSpeciesRecipe,treeStructuralVariant,treeInstanceAppearance,treeGeometryCacheKey,TREE_VARIANT_COUNT} from '#tree-kit/v1/recipes';
const world=generateBiosphere('ATLAS-TREE-CONTRACT','temperate','G001/tree-recipe/planet/0');
const species=world.species.filter(s=>s.kind==='tree');

test('tree binding uses supplied dated catalogue species and is independent of enumeration order',()=>{
  const living=biosphereAt(world,Math.ceil(world.surfaceMyr+1000)).species;
  for(let i=0;i<100;i++){
    const id=`surface-population-2/face/0/${i}/0`,a=bindTreeSpecies(id,living);
    assert.equal(a?.id,bindTreeSpecies(id,[...living].reverse())?.id);
    assert.ok(a===null||living.includes(a));
    assert.equal(a?.id,bindTreeSpecies(id,living.filter(s=>s.kind==='tree'))?.id);
  }
  assert.equal(bindTreeSpecies('cell',[]),null);
  assert.equal(bindTreeSpecies('cell',world.species.filter(s=>s.kind==='animal')),null);
});

test('recipes and bounded variants preserve species physical relationships and leaf dimensions',()=>{
  for(const s of species){
    const recipe=treeSpeciesRecipe(s);
    assert.equal(recipe.speciesId,s.id);assert.equal(recipe.lineageId,s.lineageId);
    assert.equal(recipe.heightM,s.traits.heightM);
    const variants=[];
    for(let i=0;i<TREE_VARIANT_COUNT;i++){
      const v=treeStructuralVariant(recipe,i);variants.push(v);
      assert.deepEqual(v,treeStructuralVariant(treeSpeciesRecipe(s),i));
      assert.ok(v.heightM>=recipe.heightM*.94&&v.heightM<recipe.heightM*1.06);
      assert.ok(Math.abs(v.trunkDiameterM/v.heightM-recipe.trunkDiameterM/recipe.heightM)<1e-14);
      assert.equal(v.leafLengthM,recipe.leafLengthM);assert.equal(v.leafWidthM,recipe.leafWidthM);
    }
    assert.equal(new Set(variants.map(v=>v.branchSeed)).size,TREE_VARIANT_COUNT);
    assert.throws(()=>treeStructuralVariant(recipe,TREE_VARIANT_COUNT));
    assert.throws(()=>treeStructuralVariant(recipe,-1));
  }
});

test('instance appearance and geometry keys separate individuals from shared structure',()=>{
  const recipe=treeSpeciesRecipe(species[0]),keys=new Set();
  for(let i=0;i<1000;i++){
    const a=treeInstanceAppearance(recipe,`cell/${i}`);
    assert.deepEqual(a,treeInstanceAppearance(recipe,`cell/${i}`));
    assert.ok(a.variant>=0&&a.variant<TREE_VARIANT_COUNT);
    assert.ok(a.foliageBrightness>=.9&&a.foliageBrightness<=1.1);
    keys.add(treeGeometryCacheKey(recipe,a.variant,0));
  }
  assert.equal(keys.size,TREE_VARIANT_COUNT,'1000 instances reference at most eight structural variants');
  assert.notEqual(treeGeometryCacheKey(recipe,0,0),treeGeometryCacheKey(recipe,0,1));
  assert.notEqual(treeGeometryCacheKey(recipe,0,0),treeGeometryCacheKey(recipe,0,0,'next-asset'));
  const changed=treeSpeciesRecipe({...species[0],traits:{...species[0].traits,heightM:species[0].traits.heightM+1}});
  assert.notEqual(treeGeometryCacheKey(recipe,0,0),treeGeometryCacheKey(changed,0,0));
  assert.throws(()=>treeSpeciesRecipe({...species[0],traits:{...species[0].traits,heightM:NaN}}));
  assert.throws(()=>treeSpeciesRecipe(world.species.find(s=>s.kind==='animal')));
});
