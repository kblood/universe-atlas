import {test} from 'node:test';
import assert from 'node:assert/strict';
import {planetSurface,terrainSampler,waterWorldLandColour,ORBIT_FOREST_COLOUR} from '../src/terrain.ts';
import {createClimateSample} from '../src/surface-climate.ts';
import {waterWorlds,fib,goldenTerrainBodies} from './terrain-climate-fixtures.mjs';

test('orbit forest contrast follows suitability; treeless and snow endpoints remain exact',()=>{
  const c={...createClimateSample(),aridity01:0,forestSuitability01:1,treeline01:1,warmestMonthK:290};
  const old=waterWorldLandColour(c,500,undefined,false),next=waterWorldLandColour(c,500);
  assert.ok(old[1]-next[1]>20,'forested pixels are visibly darker than the previous humid green');
  assert.ok(next[1]>next[0]+25&&next[1]>next[2]+25,'forest remains green');
  for(const special of [{forestSuitability01:0},{snowFraction:1},{treeline01:0},{forestSuitability01:0,aridity01:1}]){
    assert.deepEqual(waterWorldLandColour({...c,...special},500),waterWorldLandColour({...c,...special},500,undefined,false));
  }
});

test('forest palette changes colour only; non-colour queries and dry-world bakes keep their existing identity',()=>{
  let changed=0;
  for(const body of waterWorlds()){
    const off=terrainSampler(body,undefined,undefined,false,0,undefined,false,{lodLevel:0,orbitForestTint:false});
    const on=terrainSampler(body,undefined,undefined,false,0,undefined,false,{lodLevel:0});
    for(let i=0;i<1024;i++){
      const d=fib(i,1024),a=off(d),b=on(d),{color:ac,...af}=a,{color:bc,...bf}=b;
      assert.deepEqual(bf,af,body.name);
      if(a.ocean)assert.deepEqual(bc,ac);
      if(ac.some((v,k)=>v!==bc[k]))changed++;
    }
    const a=planetSurface(body,64,16,undefined,false,false),b=planetSurface(body,64,16);
    for(const k of ['relief','roughness','elevations','landFraction','reliefMinM','reliefMaxM','version'])assert.deepEqual(b[k],a[k],`${body.name} ${k}`);
    assert.equal(b.colourVersion,ORBIT_FOREST_COLOUR.version);
  }
  assert.ok(changed>0,'real forest-bearing worlds receive the presentation change');
  for(const body of goldenTerrainBodies().filter(b=>!b.water)){
    assert.deepEqual(planetSurface(body,32,8).data,planetSurface(body,32,8,undefined,false,false).data);
  }
});
