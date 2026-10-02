import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const renderer = await readFile(new URL('../src/planet-renderer.ts', import.meta.url), 'utf8');

test('flora resident cache invalidates on water and habitat gate changes', () => {
  const signature = renderer.match(/const signature=`([^`]+)`/);
  assert.ok(signature, 'life context has a cache signature');
  for (const field of [
    '${this.waterBucket}',
    '${life.floraStage}',
    '${life.floraAvailableKinds?.join(\',\')}',
  ]) assert.ok(signature[1].includes(field), `signature includes ${field}`);

  assert.match(renderer,
    /if\(signature!==this\.lifeSignature\)\{this\.lifeSignature=signature;this\.lifeScatterValid=false;this\.lifeResidents\.clear\(\);this\.faunaGenomes\.clear\(\);(?:this\.faunaNear\.clear\(\);)?this\.faunaGroundQueue=\[\];(?:this\.faunaFrameKeyValid=false;)?\}/,
    'a changed signature evicts residents and invalidates their recipes');
  assert.match(renderer,
    /type LifeResident=\{[^}]*floraRecipe\?:FloraRecipe[;}]/,
    'recipe cache is owned by the resident whose habitat inputs produced it');
});

test('canonical resident recipes survive packed slot reorder and are released on eviction', () => {
  assert.match(renderer,
    /private readonly lifeResidents=new Map<string,LifeResident>\(\)/,
    'residents are keyed by canonical cell identity');
  assert.match(renderer,
    /this\.lifeQueue=cells\.filter\(c=>!this\.lifeResidents\.has\(c\.id\)\)/,
    'reordered demand reuses residents by cell id');
  assert.match(renderer,
    /for\(const \[id,record\] of this\.lifeResidents\)[\s\S]*?this\.lifeResidents\.delete\(id\)/,
    'out-of-range resident eviction also releases its cached recipe');
  assert.match(renderer,
    /this\.floraSlotResidents\[flora\]=record[\s\S]*?this\.floraSlotResidents\.length=flora/,
    'transient packed slots carry resident references through reordering');
  assert.match(renderer,
    /\bresident=this\.floraSlotResidents\[i\][\s\S]*?if\(!resident\.floraRecipe\)\{[\s\S]*?resident\.floraRecipe=prepareFlora/,
    'date evaluation reads and fills the recipe on that resident, not on its slot');
  assert.doesNotMatch(renderer, /floraRecipes?\s*=\s*new Map<number,/,
    'recipe ownership is not attached to a transient numeric slot');
});
