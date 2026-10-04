import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  BIOME_DEFINITIONS, ELEMENT_RECIPES, generateBiomePatch, biomeBlendAt, recipeFootprintM,
} from '../src/biome-ecology.ts';

const living=new Set(['tree','shrub','grass']);
const recipeById=new Map(ELEMENT_RECIPES.map(recipe=>[recipe.id,recipe]));
const fixture={seed:'ecology-fixture-17',biome:'woodland',sizeM:96,originX:-48,originZ:-48};
const placementKey=placement=>({
  id:placement.id, recipeId:placement.recipeId, kind:placement.kind,
  x:placement.x, z:placement.z, sizeM:placement.sizeM,
  rotation:placement.rotation, color:placement.color,
});
function sampledGroundCover(config,placements){
  let covered=0,samples=0;
  for(let z=config.originZ+1;z<config.originZ+config.sizeM;z+=2)for(let x=config.originX+1;x<config.originX+config.sizeM;x+=2){
    samples++;
    if(placements.some(placement=>{
      if(placement.kind!=='shrub'&&placement.kind!=='grass')return false;
      const radius=recipeFootprintM(recipeById.get(placement.recipeId),placement.sizeM);
      return (x-placement.x)**2+(z-placement.z)**2<=radius**2;
    }))covered++;
  }
  return covered/samples;
}

test('patch generation is repeatable, seed-sensitive, and reports a versioned digest',()=>{
  const first=generateBiomePatch(fixture);
  const repeat=generateBiomePatch({...fixture});
  const changed=generateBiomePatch({...fixture,seed:'ecology-fixture-18'});
  assert.deepEqual(repeat,first);
  assert.ok(first.version.length>0);
  assert.match(first.digest,/^[a-z0-9_-]+$/i);
  assert.notEqual(changed.digest,first.digest,'the seed participates in patch identity');
  assert.notDeepEqual(changed.placements.map(placementKey),first.placements.map(placementKey));
});

test('placements are finite, bounded, recipe-valid, and have canonical stable IDs',()=>{
  const patch=generateBiomePatch({...fixture,blendBiome:'conifer'});
  assert.equal(patch.areaHa,fixture.sizeM**2/10000);
  assert.equal(new Set(patch.placements.map(p=>p.id)).size,patch.placements.length);
  for(const placement of patch.placements){
    assert.ok(recipeById.has(placement.recipeId),`unknown recipe ${placement.recipeId}`);
    assert.equal(placement.kind,recipeById.get(placement.recipeId).kind);
    assert.ok(Number.isFinite(placement.x)&&Number.isFinite(placement.z)&&Number.isFinite(placement.sizeM)&&Number.isFinite(placement.rotation));
    assert.ok(placement.x>=fixture.originX&&placement.x<fixture.originX+fixture.sizeM);
    assert.ok(placement.z>=fixture.originZ&&placement.z<fixture.originZ+fixture.sizeM);
    assert.ok(placement.sizeM>=recipeById.get(placement.recipeId).minSizeM);
    assert.ok(placement.sizeM<=recipeById.get(placement.recipeId).maxSizeM);
  }
  for(const [kind,count] of Object.entries(patch.counts))assert.equal(count,patch.placements.filter(p=>p.kind===kind).length);
  assert.equal(Object.values(patch.recipeCounts).reduce((total,count)=>total+count,0),patch.placements.length);
  for(const [recipeId,count] of Object.entries(patch.recipeCounts))assert.equal(count,patch.placements.filter(p=>p.recipeId===recipeId).length);
});

test('global addressing makes overlap independent of seed, extent, order, and cell boundaries',()=>{
  for(const seed of ['overlap-a','overlap-b']){
    const common={seed,biome:'woodland',blendBiome:'grassland'};
    const large=generateBiomePatch({...common,originX:-96,originZ:-96,sizeM:192});
    for(const query of [
      {originX:-64,originZ:-64,sizeM:64}, // ordinary interior
      {originX:-8,originZ:-24,sizeM:32},  // crosses 8 m placement cells
      {originX:0,originZ:0,sizeM:32},     // crosses the global ecotone
      {originX:64,originZ:32,sizeM:32},
    ]){
      // A separate neighbouring request first must not change the queried
      // region. Compare full placement records, not merely their count.
      generateBiomePatch({...common,originX:query.originX+query.sizeM,originZ:query.originZ,sizeM:32});
      const small=generateBiomePatch({...common,...query});
      const within=large.placements.filter(p=>p.x>=query.originX&&p.x<query.originX+query.sizeM&&p.z>=query.originZ&&p.z<query.originZ+query.sizeM).map(placementKey);
      assert.deepEqual(small.placements.map(placementKey),within,`${seed} ${JSON.stringify(query)}`);
    }
  }
});

test('definitions only reference valid recipes and fauna remain explicitly planned',()=>{
  assert.ok(BIOME_DEFINITIONS.length>=2);
  for(const biome of BIOME_DEFINITIONS){
    assert.ok(biome.elements.length>0,`${biome.id} has an assemblage`);
    for(const element of biome.elements){
      assert.ok(recipeById.has(element.recipeId),`${biome.id} references a recipe`);
      assert.ok(Number.isFinite(element.densityPerHa)&&element.densityPerHa>=0);
    }
    for(const fauna of biome.fauna)assert.equal(fauna.status,'planned');
  }
});

test('distinct habitats differ and sterile terrain contains no living elements',()=>{
  const common={seed:'habitat-comparison',sizeM:128,originX:-64,originZ:-64};
  const woodland=generateBiomePatch({...common,biome:'woodland'});
  const conifer=generateBiomePatch({...common,biome:'conifer'});
  const grassland=generateBiomePatch({...common,biome:'grassland'});
  const treeRecipeIds=patch=>new Set(patch.placements.filter(p=>p.kind==='tree').map(p=>p.recipeId));
  assert.ok(treeRecipeIds(woodland).size>0,'woodland places trees');
  assert.ok(treeRecipeIds(conifer).size>0,'conifer habitat places trees');
  assert.notDeepEqual(treeRecipeIds(woodland),treeRecipeIds(conifer),'woodland and conifer use distinct tree forms');
  assert.ok(grassland.placements.some(p=>p.kind==='grass'),'grassland places grass');
  for(const biome of ['regolith','volcanic']){
    const patch=generateBiomePatch({...common,biome});
    assert.equal(patch.placements.filter(p=>living.has(p.kind)).length,0,`${biome} is lifeless`);
  }
});

test('global ecotone is smooth across its known 8 m and 24 m noise-cell seams',()=>{
  const config={seed:'ecotone-44',biome:'woodland',blendBiome:'dry-scrub',sizeM:128,originX:-64,originZ:-64};
  const weights=[];
  for(let x=-24;x<=24;x+=1)weights.push(biomeBlendAt(config,x,0));
  for(const weight of weights)assert.ok(weight>=0&&weight<=1&&Number.isFinite(weight));
  for(let i=1;i<weights.length;i++)assert.ok(Math.abs(weights[i]-weights[i-1])<.2,'the blend has no hard one-metre step');
  // Probe both sides of the hash-noise grid boundaries. A smooth ecotone may
  // change direction here, but cannot jump when a coordinate rounds a cell.
  for(const boundary of [-24,-8,0,8,24])for(const [x,z] of [[boundary,0],[0,boundary]]){
    const left=biomeBlendAt(config,x-1e-5,z-1e-5),right=biomeBlendAt(config,x+1e-5,z+1e-5);
    assert.ok(Math.abs(right-left)<.01,`no blend step at ${x},${z}`);
  }
  assert.ok(weights.some(weight=>weight<.1)&&weights.some(weight=>weight>.9),'both sides of X=0 are present');
  assert.equal(biomeBlendAt({...config,blendBiome:undefined},0,0),0);
  const patch=generateBiomePatch(config);
  const primary=new Set(BIOME_DEFINITIONS.find(b=>b.id==='woodland').elements.map(e=>e.recipeId));
  const secondary=new Set(BIOME_DEFINITIONS.find(b=>b.id==='dry-scrub').elements.map(e=>e.recipeId));
  const primaryOnly=new Set([...primary].filter(recipeId=>!secondary.has(recipeId)));
  const secondaryOnly=new Set([...secondary].filter(recipeId=>!primary.has(recipeId)));
  assert.ok(primaryOnly.size&&secondaryOnly.size,'fixture biome definitions have identifiable forms');
  assert.ok(patch.placements.some(p=>primaryOnly.has(p.recipeId)),'primary-only forms survive the ecotone');
  assert.ok(patch.placements.some(p=>secondaryOnly.has(p.recipeId)),'secondary-only forms survive the ecotone');
});

test('coverage is overlap-aware bounded data and malformed requests are rejected',()=>{
  const patch=generateBiomePatch({...fixture,blendBiome:'wetland'});
  for(const value of [patch.canopyCoverEstimate,patch.groundCoverEstimate])assert.ok(Number.isFinite(value)&&value>=0&&value<=1);
  assert.ok(Number.isInteger(patch.rejected.competition)&&patch.rejected.competition>=0);
  for(const invalid of [
    {}, {seed:'x',biome:'missing'}, {seed:'',biome:'woodland'},
    {seed:'x'.repeat(1025),biome:'woodland'}, {seed:'x',biome:'woodland',sizeM:31},
    {seed:'x',biome:'woodland',sizeM:257}, {seed:'x',biome:'woodland',originX:Infinity},
    {seed:'x',biome:'woodland',originZ:NaN}, {seed:'x',biome:'woodland',blendBiome:'missing'},
    // Finite but non-canonical origins would otherwise lose metre precision
    // and make a bounded patch request allocate/identify the wrong cells.
    {seed:'x',biome:'woodland',originX:1e16}, {seed:'x',biome:'woodland',originZ:-1e16},
  ])assert.throws(()=>generateBiomePatch(invalid));
});

// Pinned on biome-ecology-2 BEFORE the eco-class biomes were appended
// (BIOME2-ECO, 2026-10-04): the 9 original biomes and the lab's ecotone must
// keep these exact digests, placement counts and coverage estimates.
const PINNED_BIOMES={
  woodland:['56318e604ac8475b',500,0.096435546875,0.175537109375],
  conifer:['9f410fcecac0ca42',310,0.1337890625,0.09375],
  grassland:['0f56bf81596587e3',536,0,0.297119140625],
  'dry-scrub':['9b56c32556ea74f9',558,0,0.155029296875],
  wetland:['28dcf8795dce3794',650,0.022216796875,0.710693359375],
  coast:['69d3319f32a41613',543,0,0.208984375],
  alpine:['e50908a0cee78d22',483,0,0.127197265625],
  volcanic:['d2e247d694bfe7ce',375,0,0],
  regolith:['ec9ff840ea5232f2',248,0,0],
};
test('the 9 original biome digests are unchanged (append-only rule)',()=>{
  for(const [biome,[digest,count,canopy,ground]] of Object.entries(PINNED_BIOMES)){
    const p=generateBiomePatch({seed:'LETHRA-BIOME-01',biome,sizeM:128,originX:-64,originZ:-64});
    assert.deepEqual([p.digest,p.placements.length,p.canopyCoverEstimate,p.groundCoverEstimate],[digest,count,canopy,ground],biome);
  }
  const e=generateBiomePatch({seed:'browser-seed-ecotone',biome:'woodland',blendBiome:'dry-scrub',sizeM:128,originX:-64,originZ:-64});
  assert.deepEqual([e.digest,e.placements.length,e.canopyCoverEstimate,e.groundCoverEstimate],['6f7835626051be9c',514,0.057373046875,0.1630859375],'ecotone');
});

test('coverage fixtures have distinct canopy and grass-patch footprints without crown-as-ground inflation',()=>{
  const config={seed:'coverage-fixture',sizeM:256,originX:-128,originZ:-128};
  const woodland=generateBiomePatch({...config,biome:'woodland'});
  const grassland=generateBiomePatch({...config,biome:'grassland'});
  assert.ok(woodland.canopyCoverEstimate>=.04,'woodland has measurable projected canopy');
  assert.ok(grassland.groundCoverEstimate>=.20,'the lab grassland has an explicit 20% projected patch-footprint floor, not a visible-pixel coverage claim');
  assert.equal(grassland.canopyCoverEstimate,0,'tree crowns are not reported as grassland ground cover');
  assert.ok(grassland.groundCoverEstimate>grassland.canopyCoverEstimate);
  assert.ok(woodland.canopyCoverEstimate>0,'woodland canopy remains a distinct coverage channel');
  // Recalculate an interior controlled patch from public placements and the
  // shared render/coverage footprint. Trees deliberately do not enter this
  // independent ground-channel calculation.
  const wide=generateBiomePatch({seed:'coverage-fixture',biome:'woodland',sizeM:192,originX:-96,originZ:-96});
  const interior={seed:'coverage-fixture',biome:'woodland',sizeM:128,originX:-64,originZ:-64};
  const inner=generateBiomePatch(interior);
  assert.equal(inner.groundCoverEstimate,sampledGroundCover(interior,wide.placements),'ground coverage is shrub/grass footprints only');
});

// ---- ECO-CLASS-1 lab biomes (BIOME2-ECO) -------------------------------
import {BIOME_ECO_LINKS} from '../src/biome-ecology.ts';
import {ecoRole} from '../src/eco-assemblages.ts';

const NEW_BIOMES=['tundra','alpine-meadow','boreal-taiga','savanna','rainforest','hot-desert','ice-margin'];
/** Problems with the lab <-> planet link: a class 0-11 without a lab biome, a
 * biome without a link, or a lab fauna entry without a planet role. */
function ecoLinkProblems(definitions,links){
  const problems=[];
  for(const b of definitions){
    const link=links[b.id];
    if(!link){problems.push(`${b.id}: no eco link`);continue;}
    if(link.faunaRoleIds.length!==b.fauna.length)problems.push(`${b.id}: ${b.fauna.length} fauna but ${link.faunaRoleIds.length} role ids`);
    for(const id of link.faunaRoleIds)if(!ecoRole(id))problems.push(`${b.id}: unknown planet role ${id}`);
  }
  for(let c=0;c<=11;c++)if(!definitions.some(b=>links[b.id]?.ecoClasses.includes(c)))problems.push(`class ${c}: no lab biome`);
  return problems;
}

test('every eco class 0-11 has a lab biome and every lab fauna entry has a planet role',()=>{
  assert.deepEqual(ecoLinkProblems(BIOME_DEFINITIONS,BIOME_ECO_LINKS),[]);
  assert.deepEqual(Object.keys(BIOME_ECO_LINKS).sort(),BIOME_DEFINITIONS.map(b=>b.id).sort());
  for(const id of NEW_BIOMES)assert.ok(BIOME_DEFINITIONS.some(b=>b.id===id),id);
  assert.deepEqual(BIOME_DEFINITIONS.slice(0,9).map(b=>b.id),['woodland','conifer','grassland','dry-scrub','wetland','coast','alpine','volcanic','regolith'],'original biomes keep their order');
});

test('negative: a missing lab biome for a class, or a lab fauna role without a planet role, is reported',()=>{
  const withoutTundra=BIOME_DEFINITIONS.filter(b=>b.id!=='tundra');
  assert.deepEqual(ecoLinkProblems(withoutTundra,BIOME_ECO_LINKS),['class 1: no lab biome']);
  const badRole={...BIOME_ECO_LINKS,savanna:{...BIOME_ECO_LINKS.savanna,faunaRoleIds:['savanna.giraffe-long-neck','savanna.unicorn-runner','savanna.zebra-browser','savanna.elephant-low-slung']}};
  assert.deepEqual(ecoLinkProblems(BIOME_DEFINITIONS,badRole),['savanna: unknown planet role savanna.unicorn-runner']);
});

test('new lab biomes have their defining structure',()=>{
  const common={seed:'eco-lab-structure',sizeM:128,originX:-64,originZ:-64};
  const p=Object.fromEntries(NEW_BIOMES.map(biome=>[biome,generateBiomePatch({...common,biome})]));
  const woodland=generateBiomePatch({...common,biome:'woodland'});
  for(const id of ['tundra','alpine-meadow','ice-margin'])assert.equal(p[id].counts.tree,0,`${id} is treeless`);
  for(const id of NEW_BIOMES)assert.ok(p[id].placements.some(x=>living.has(x.kind)),`${id} has living elements`);
  // Taiga is denser in stems; its projected canopy is the narrow rendered spire
  // crowns (visibleRadiusScale .5), so it is not required to exceed the woodland.
  assert.ok(p['boreal-taiga'].counts.tree>woodland.counts.tree,'taiga has more stems than the woodland');
  assert.ok(p['boreal-taiga'].canopyCoverEstimate>.04,'taiga spires still give measurable canopy');
  assert.ok(p.rainforest.canopyCoverEstimate>woodland.canopyCoverEstimate,'rainforest canopy exceeds the woodland');
  assert.ok(p.savanna.canopyCoverEstimate>0&&p.savanna.canopyCoverEstimate<.06,'savanna has scattered trees only');
  assert.ok(p.savanna.groundCoverEstimate>.6,'savanna is a grass sea');
  assert.ok(p['hot-desert'].groundCoverEstimate<.06,'hot desert is mostly bare');
  assert.ok(p['ice-margin'].counts.rock>p['ice-margin'].counts.grass+p['ice-margin'].counts.shrub,'ice margin is mostly bare stone');
  const treeIds=patch=>new Set(patch.placements.filter(x=>x.kind==='tree').map(x=>x.recipeId));
  assert.deepEqual([...treeIds(p.savanna)],['acacia-umbrella']);
  assert.deepEqual([...treeIds(p['hot-desert'])],['columnar-succulent']);
  assert.ok(treeIds(p['boreal-taiga']).has('taiga-spruce'));
  assert.deepEqual([...treeIds(p.rainforest)],['buttress-broadleaf']);
});

test('new recipes stay inside the competition halo and footprint bound',()=>{
  const fresh=ELEMENT_RECIPES.slice(19);
  assert.equal(fresh.length,15);
  for(const r of fresh){
    assert.ok(r.minSizeM>0&&r.maxSizeM>=r.minSizeM,r.id);
    // footprintM (tree .25, shrub .34, rock .38, grass max(.16,.28) x size) must stay <= 4 m.
    const f=r.kind==='tree'?.25:r.kind==='shrub'?.34:r.kind==='rock'?.38:.28;
    assert.ok(r.maxSizeM*f<=4,`${r.id} footprint ${r.maxSizeM*f}`);
  }
});

test('new biomes keep global addressing: overlap independent of extent and order',()=>{
  for(const biome of ['rainforest','savanna']){
    const common={seed:'eco-overlap',biome,blendBiome:biome==='rainforest'?'savanna':'hot-desert'};
    const large=generateBiomePatch({...common,originX:-96,originZ:-96,sizeM:192});
    for(const q of [{originX:-8,originZ:-24,sizeM:32},{originX:0,originZ:0,sizeM:32}]){
      const small=generateBiomePatch({...common,...q});
      const within=large.placements.filter(x=>x.x>=q.originX&&x.x<q.originX+q.sizeM&&x.z>=q.originZ&&x.z<q.originZ+q.sizeM).map(placementKey);
      assert.deepEqual(small.placements.map(placementKey),within,`${biome} ${JSON.stringify(q)}`);
    }
  }
});
