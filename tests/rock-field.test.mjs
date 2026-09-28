import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {galaxies,refByAddress,system} from '../src/catalog.ts';
import {terrainSampler} from '../src/terrain.ts';
import {biomeClassifier} from '../src/surface-biomes.ts';
import {surfaceCellAt,surfaceCellsWithin} from '../src/surface-cell.ts';
import {generateBiosphere,profileFromPhysicalProperties} from '../src/biosphere-model.ts';
import {
  ROCK_FIELD_VERSION,ROCK_TIERS,ROCK_LOD_RATIOS,ROCK_MAX_SLOPE_DEG,ROCK_SHORE_CLEARANCE_M,
  canonicalCellsWithin,rockCellsNear,rocksForCell,pointInCell,rockLod,rockSuitability,rockFormWeights,
  canonicalRockFamilies,rockFamiliesSignature,rockCensusDigest,
} from '../src/rock-field.ts';

const SEED='LETHRA-001';
const sys=system(refByAddress(galaxies(SEED)[0],'G001/C2128,0,1/0'));
const oceanWorld=sys.planets[1],moon=sys.moons[0];
const familiesFor=body=>generateBiosphere(SEED,profileFromPhysicalProperties(body,'main-sequence'),body.id).rocks;
const unit=v=>{const l=Math.hypot(...v);return v.map(x=>x/l);};
const context=(body,waterLevelM=-1e6)=>({body,radiusM:body.radiusM,families:familiesFor(body),sample:terrainSampler(body,undefined,undefined,undefined,waterLevelM),classify:biomeClassifier(body,waterLevelM),waterLevelM});
const deepFreeze=o=>{if(o&&typeof o==='object'&&!Object.isFrozen(o)){Object.freeze(o);for(const v of Object.values(o))deepFreeze(v);}return o;};
const scatter=ROCK_TIERS.find(t=>t.id==='scatter'),boulder=ROCK_TIERS.find(t=>t.id==='boulder');

test('rock cell enumeration is exactly the canonical surface-cell set and order',()=>{
  for(const raw of [[0,1,0],[1,0,0],[1,1,0],[1,1,1],[-1,1,1],[.97,1,.98],[.3,.8,.52],[-.2,-.9,.1]]){
    const d=unit(raw);
    for(const [radius,range,size] of [[320,65,32],[1e6,76,6],[5.2e6,312,16],[5.2e6,1088,64]]){
      assert.deepEqual(canonicalCellsWithin(d,radius,range,size).map(c=>c.id),surfaceCellsWithin(d,radius,range,size).map(c=>c.id));
    }
  }
  const {cells,truncated}=rockCellsNear(unit([1,1,1]),moon.radiusM,boulder);
  assert.ok(cells.length<=boulder.residentCap);
  assert.equal(truncated,Math.max(0,canonicalCellsWithin(unit([1,1,1]),moon.radiusM,boulder.rangeM+boulder.marginM,boulder.cellSizeM).length-boulder.residentCap));
});

test('each rock lies strictly inside its owning canonical cell, including seams and corners',()=>{
  for(const tier of ROCK_TIERS)for(const raw of [[1,1,1],[1,0,0],[0,-1,0],[.3,.8,.52]]){
    for(const cell of canonicalCellsWithin(unit(raw),moon.radiusM,tier.cellSizeM*3,tier.cellSizeM)){
      for(const [a,b] of [[0,0],[1,1],[.5,.5],[.999,.001]]){
        const {direction,areaFactor}=pointInCell(cell.id,moon.radiusM,tier.cellSizeM,a,b);
        assert.equal(surfaceCellAt(direction,moon.radiusM,tier.cellSizeM).id,cell.id);
        assert.ok(areaFactor>0&&areaFactor<=1);
      }
    }
  }
});

test('placement is a pure function of body, tier and cell: order, focus and repetition do not matter',()=>{
  const ctx=context(moon),a=unit([.3,.8,.52]),b=unit([.30002,.8,.52]);
  for(const tier of ROCK_TIERS){
    const near=canonicalCellsWithin(a,moon.radiusM,tier.cellSizeM*6,tier.cellSizeM),other=canonicalCellsWithin(b,moon.radiusM,tier.cellSizeM*6,tier.cellSizeM);
    const forward=new Map(near.map(c=>[c.id,rocksForCell(ctx,tier,c.id).rocks]));
    // Reverse order, a different focus, and a fresh sampler instance.
    const fresh=context(moon),reversed=new Map([...other].reverse().map(c=>[c.id,rocksForCell(fresh,tier,c.id).rocks]));
    let shared=0;
    for(const [id,rocks] of forward)if(reversed.has(id)){shared++;assert.deepEqual(reversed.get(id),rocks);}
    assert.ok(shared>0);
    for(const rocks of forward.values())for(const r of rocks){
      assert.ok(r.id.startsWith(`${ROCK_FIELD_VERSION}|${moon.seed}|${moon.id}|${tier.id}|`));
      assert.equal(surfaceCellAt(r.direction,moon.radiusM,tier.cellSizeM).id,r.cellId);
    }
  }
});

test('family inputs are canonical, read-only and array-order independent',()=>{
  const families=familiesFor(moon),ctx=context(moon),frozen={...ctx,families:deepFreeze(structuredClone(families))};
  const shuffled={...ctx,families:[families[2],families[0],families[1]]};
  const cells=canonicalCellsWithin(unit([0,1,.2]),moon.radiusM,60,scatter.cellSizeM);
  for(const cell of cells)assert.deepEqual(rocksForCell(shuffled,scatter,cell.id),rocksForCell(frozen,scatter,cell.id));
  assert.equal(rockFamiliesSignature(families),rockFamiliesSignature([...families].reverse()));
  // Unknown forms are ignored, never invented.
  assert.deepEqual(canonicalRockFamilies([...families,{...families[0],id:'x',form:'crystal'}]).map(f=>f.id),[...families].map(f=>f.id).sort());
  assert.deepEqual(rocksForCell({...ctx,families:[]},scatter,cells[0].id),{rocks:[],samples:0});
  // Only existing families appear, each keyed by its canonical id.
  const ids=new Set(families.map(f=>f.id));
  for(const cell of cells)for(const r of rocksForCell(ctx,scatter,cell.id).rocks){assert.ok(ids.has(r.familyId));assert.equal(families.find(f=>f.id===r.familyId).form,r.form);}
});

test('rock generation leaves the biosphere catalogue, species and digests untouched',()=>{
  const profile=profileFromPhysicalProperties(oceanWorld,'main-sequence'),before=generateBiosphere(SEED,profile,oceanWorld.id);
  const snapshot=structuredClone(before),ctx={...context(oceanWorld),families:before.rocks};
  for(const cell of canonicalCellsWithin(unit([.3,.8,.52]),oceanWorld.radiusM,400,boulder.cellSizeM))rocksForCell(ctx,boulder,cell.id);
  assert.deepEqual(before,snapshot);
  assert.deepEqual(generateBiosphere(SEED,profile,oceanWorld.id),snapshot);
  // Isolation: the rock layer imports no flora, fauna or forest selection code.
  for(const file of ['rock-field.ts','rock-geometry.ts','planet-rocks.ts']){
    const source=readFileSync(new URL(`../src/${file}`,import.meta.url),'utf8');
    for(const banned of ['flora-field','flora-culling','fauna-','forest-','planet-forest','planet-population','biome-ecology','tree-'])
      assert.ok(!new RegExp(`from '\\./${banned}`).test(source),`${file} must not import ${banned}`);
  }
});

test('barren, life-free ground is rock-bearing without any species or biosphere stage',()=>{
  const world=generateBiosphere(SEED,'airless',moon.id);
  assert.equal(world.species.length,0);assert.equal(world.rocks.length,3);
  const ctx={...context(moon),families:world.rocks},forms=new Set();let rocks=0;
  for(const tier of ROCK_TIERS)for(const cell of canonicalCellsWithin(unit([.3,.8,.52]),moon.radiusM,tier.rangeM,tier.cellSizeM)){
    for(const r of rocksForCell(ctx,tier,cell.id).rocks){rocks++;forms.add(r.form);}
  }
  assert.ok(rocks>200,`expected a boulder field on barren ground, got ${rocks}`);
  assert.deepEqual([...forms].sort(),['angular','layered','rounded']);
});

test('ocean and wet ground never host rocks; shore clearance is enforced',()=>{
  const d=unit([.3,.8,.52]);
  // A sea level above every peak drowns the whole neighbourhood.
  const drowned=context(oceanWorld,1e5);
  for(const tier of ROCK_TIERS)for(const cell of canonicalCellsWithin(d,oceanWorld.radiusM,tier.rangeM,tier.cellSizeM))
    assert.equal(rocksForCell(drowned,tier,cell.id).rocks.length,0);
  // Realistic sea level: every accepted rock sits above the clearance.
  for(const level of [0,-200,150]){
    const ctx=context(oceanWorld,level);
    for(const cell of canonicalCellsWithin(d,oceanWorld.radiusM,300,boulder.cellSizeM))
      for(const r of rocksForCell(ctx,boulder,cell.id).rocks)assert.ok(r.groundHeightM>=level+ROCK_SHORE_CLEARANCE_M);
  }
  // Sampler water flags alone exclude a cell, even on a waterless body.
  const flat=()=>({weights:[0,0,1,0],slopeDeg:5,moisture:.2,ocean:false});
  for(const flag of ['ocean','wet']){
    const ctx={body:moon,radiusM:moon.radiusM,families:familiesFor(moon),waterLevelM:0,classify:flat,sample:()=>({groundHeightM:10,[flag]:true})};
    for(const cell of canonicalCellsWithin(d,moon.radiusM,40,scatter.cellSizeM))assert.equal(rocksForCell(ctx,scatter,cell.id).rocks.length,0);
  }
  assert.equal(rockSuitability({weights:[0,0,1,0],slopeDeg:3,moisture:0,ocean:true},false),0);
});

test('suitability and form choice follow geology: cliffs are bare, forms respond to slope and ground',()=>{
  assert.equal(rockSuitability({weights:[0,0,1,0],slopeDeg:ROCK_MAX_SLOPE_DEG+1,moisture:0,ocean:false},true),0);
  assert.ok(rockSuitability({weights:[0,1,0,0],slopeDeg:5,moisture:.5,ocean:false},false)<rockSuitability({weights:[0,0,1,0],slopeDeg:5,moisture:.5,ocean:false},false));
  assert.ok(rockSuitability({weights:[.65,0,.35,0],slopeDeg:5,moisture:0,ocean:false},true)>=.55);
  const steep=rockFormWeights({weights:[0,0,1,0],slopeDeg:40,moisture:.2,ocean:false},false);
  const beach=rockFormWeights({weights:[1,0,0,0],slopeDeg:2,moisture:.8,ocean:false},false);
  assert.ok(steep.angular>steep.rounded);assert.ok(beach.rounded>beach.angular&&beach.rounded>beach.layered);
});

test('physical sizes, partial embedding and orientation are bounded per tier and family',()=>{
  const families=familiesFor(moon),ctx=context(moon),d=unit([-.4,.2,.9]);
  for(const tier of ROCK_TIERS)for(const cell of canonicalCellsWithin(d,moon.radiusM,tier.cellSizeM*8,tier.cellSizeM))for(const r of rocksForCell(ctx,tier,cell.id).rocks){
    const f=families.find(x=>x.id===r.familyId);
    assert.ok(r.diameterM>=f.scaleM*tier.sizeMin-1e-9&&r.diameterM<=f.scaleM*tier.sizeMax+1e-9);
    assert.ok(r.sinkM>0&&r.sinkM<r.diameterM*r.aspect[1]*.75,'partially, never fully, embedded');
    assert.ok(Math.abs(Math.hypot(...r.up)-1)<1e-12&&Math.abs(Math.hypot(...r.direction)-1)<1e-12);
    assert.ok(r.up[0]*r.direction[0]+r.up[1]*r.direction[1]+r.up[2]*r.direction[2]>Math.cos((ROCK_MAX_SLOPE_DEG+10)*Math.PI/180));
    assert.ok(Number.isInteger(r.variant)&&r.variant>=0&&r.variant<3);
  }
});

test('density per square metre is uniform across the cube (cell area compensation)',()=>{
  const flat=()=>({weights:[0,0,1,0],slopeDeg:0,moisture:0,ocean:false}),sample=()=>({groundHeightM:100});
  const ctx={body:moon,radiusM:moon.radiusM,families:familiesFor(moon),sample,classify:flat,waterLevelM:0};
  const density=raw=>{const cells=canonicalCellsWithin(unit(raw),moon.radiusM,260,scatter.cellSizeM);let n=0;for(const c of cells)n+=rocksForCell(ctx,scatter,c.id).rocks.length;return n/(Math.PI*260*260);};
  const centre=density([0,0,1]),corner=density([1,1,1]),edge=density([1,0,1]);
  assert.ok(Math.abs(corner/centre-1)<.15,`corner ${corner} centre ${centre}`);
  assert.ok(Math.abs(edge/centre-1)<.15,`edge ${edge} centre ${centre}`);
});

test('LOD bands use physical distance over diameter and never exceed the tier range',()=>{
  assert.equal(rockLod(1,1,100),0);assert.equal(rockLod(ROCK_LOD_RATIOS[0]+1,1,1000),1);
  assert.equal(rockLod(ROCK_LOD_RATIOS[1]+1,1,1000),2);assert.equal(rockLod(ROCK_LOD_RATIOS[2]+1,1,1000),-1);
  assert.equal(rockLod(101,5,100),-1);assert.equal(rockLod(NaN,1,100),-1);
  for(let i=1;i<ROCK_TIERS.length;i++)assert.ok(ROCK_TIERS[i].rangeM>ROCK_TIERS[i-1].rangeM&&ROCK_TIERS[i].sizeMin>ROCK_TIERS[i-1].sizeMin);
});

test('census digest is order independent and sensitive to canonical content',()=>{
  const ctx=context(moon),rocks=[];
  for(const cell of canonicalCellsWithin(unit([.3,.8,.52]),moon.radiusM,120,boulder.cellSizeM))rocks.push(...rocksForCell(ctx,boulder,cell.id).rocks);
  const a=rockCensusDigest(rocks),b=rockCensusDigest([...rocks].reverse());
  assert.deepEqual(a,b);assert.equal(a.count,rocks.length);
  assert.notEqual(rockCensusDigest(rocks.slice(1)).digest,a.digest);
});
