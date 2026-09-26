import {test} from 'node:test';
import assert from 'node:assert/strict';
import {populationCells} from '../src/planet-population.ts';
import {PLANET_DETAIL} from '../src/planet-detail.ts';
import {planetLandforms} from '../src/planet-landforms.ts';
import {terrainSampler} from '../src/terrain.ts';
import {galaxies,refByAddress,system} from '../src/catalog.ts';
const body=system(refByAddress(galaxies('LETHRA-001')[0],'G001/C2128,0,1/0')).planets[1];
const normalize=p=>{const r=Math.hypot(...p);return p.map(v=>v/r);};
test('forest cells retain position, dimensions and identity when the observer moves and returns',()=>{
  const a=populationCells(body.seed,[0,0,1],body.radiusM,180,18);
  const b=populationCells(body.seed,normalize([40/body.radiusM,0,1]),body.radiusM,180,18);
  const shared=new Map(b.map(c=>[c.id,c]));let matches=0;
  for(const c of a){const other=shared.get(c.id);if(!other)continue;matches++;
    assert.deepEqual({...c,distanceM:0},{...other,distanceM:0});assert.ok(c.heightM>=10&&c.heightM<=22);}
  assert.ok(matches>100);assert.deepEqual(a,populationCells(body.seed,[0,0,1],body.radiusM,180,18));
});
test('forest working sets span cube seams with unique addresses',()=>{
  const cells=populationCells(body.seed,normalize([1,0,1]),body.radiusM,180,18);
  assert.equal(new Set(cells.map(c=>c.id)).size,cells.length);
  assert.equal(new Set(cells.map(c=>c.id.split('/')[0])).size,2);
  assert.ok(cells.length>150&&cells.length<600);
});
test('landforms have metre-scale regional relief while preserving coastal lowlands',()=>{
  const field=planetLandforms(body),center=normalize([.7,.2,.4]);let min=Infinity,max=-Infinity;
  for(let x=0;x<30000;x+=100){const d=normalize([center[0]+x/body.radiusM,center[1],center[2]]);
    const h=field(d,1800);min=Math.min(min,h);max=Math.max(max,h);assert.equal(field(d,100),0);assert.equal(h,field(d,1800));}
  assert.ok(max-min>700,'a regional transect contains substantial ridges and valleys');
  assert.equal(field(center,20000),0,'terrain keeps its established upper safety bound');
  assert.ok(PLANET_DETAIL.placementSamplesPerFrame<=48);
});
test('regional rock relief does not disappear when the dated ocean floods it',()=>{
  const dry=terrainSampler(body,[],undefined,false,-12000),wet=terrainSampler(body,[],undefined,false,12000);
  for(let i=0;i<100;i++){
    const d=normalize([Math.sin(i),Math.cos(i*2),.5]);
    assert.equal(dry(d).rockHeightM,wet(d).rockHeightM);
  }
});
