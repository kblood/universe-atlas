import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseDate,yearsToDate,dateRecord,phaseAt,advanceDate,YEAR_NS} from '../src/world-time.ts';
import {surfaceQuery} from '../src/world-surface.ts';
import {stellarHistory} from '../src/world-history.ts';
import {galaxies,refByAddress,system,bodyPosition} from '../src/catalog.ts';
import {directionTile,tileNeighbour,tileDirection} from '../src/planet-tiles.ts';
import {sweptStarStep} from '../src/travel.ts';
const sys=system(refByAddress(galaxies('LETHRA-001')[0],'G001/C2128,0,1/0'));
test('star approach staging cannot trap flight on a rounded boundary',()=>{
  let distance=.2;
  distance-=sweptStarStep(1,distance,0);
  assert.ok(Math.abs(distance-.03)<1e-15,'fast flight stops before entering a system');
  const rounded=.030000000000002136;
  assert.ok(rounded-sweptStarStep(.001,rounded,0)<.03,'next frame continues inward');
  assert.equal(sweptStarStep(.05,.1,.1),.05,'off-path star does not stop travel');
});
test('precise dates survive huge forward/backward seeks and serialization',()=>{
  const t=yearsToDate('13800000000.123456789');
  assert.equal(parseDate(JSON.parse(JSON.stringify(dateRecord(t))).offsetNs),t);
  assert.equal(advanceDate(advanceDate(t,.016),-.016),t);
  assert.notEqual(phaseAt(t,1),phaseAt(advanceDate(t,.016),1));
  assert.equal(phaseAt(-1n,2*Math.PI),phaseAt(999999999n,2*Math.PI));
  assert.throws(()=>parseDate('1e100'));assert.throws(()=>yearsToDate('Infinity'));
  for(const b of [...sys.stars,...sys.planets,...sys.moons])assert.deepEqual(bodyPosition(b,sys,0),bodyPosition(b,sys,0n));
});
test('water changes leave the baseline rock field unchanged',()=>{
  const body=sys.planets.find(p=>p.water),sample=surfaceQuery(body,[{dateNs:0n,levelM:0},{dateNs:YEAR_NS,levelM:100}]);
  for(const d of [[1,0,0],[0,1,0],[0,0,-1]]){
    const a=sample(d,0n),b=sample(d,YEAR_NS);
    assert.equal(a.rockHeightM,b.rockHeightM);assert.equal(a.waterLevelM,0);assert.equal(b.waterLevelM,100);
    assert.deepEqual(sample(d,0n),a);
  }
});
test('stellar fixture histories are order-independent with distinct remnant lineages',()=>{
  const sun={...sys.stars[0],massKg:1.98847e30},massive={...sun,id:'massive',seed:'massive',massKg:30*1.98847e30};
  const a=stellarHistory(sun),b=stellarHistory(massive);
  assert.equal(a.outcome,'white-dwarf');assert.equal(b.outcome,'black-hole');
  // TIME_VERSION bumped atlas-time-1 -> atlas-time-2 and HISTORY_VERSION bumped
  // atlas-history-fixtures-1 -> atlas-history-3-remnant-cooling (docs/time-and-coordinates-contract.md
  // §6.2, §6.3): the clock origin moved from the catalogue epoch to the Big
  // Bang, so formationNs is now an absolute, always-positive instant
  // (billions of years after t=0n) instead of a negative catalogue-relative
  // offset. giantNs/remnantNs stay ordered strictly after formation.
  assert.ok(BigInt(a.formationNs)>0n&&BigInt(a.giantNs)>BigInt(a.formationNs));
  assert.ok(BigInt(b.remnantNs)>BigInt(b.giantNs));
  stellarHistory(massive);assert.deepEqual(stellarHistory(sun),a);
  assert.notEqual(b.id,b.remnantId);
});
test('cube topology has neighbours across every face edge at walking depth',()=>{
  for(const level of [0,3,18])for(let face=0;face<6;face++)for(let e=0;e<4;e++){
    const n=2**level,t={face,level,x:e===1?n-1:0,y:e===3?n-1:0},other=tileNeighbour(t,e);
    assert.equal(other.level,level);assert.ok(other.x>=0&&other.y>=0&&other.x<n&&other.y<n);
    assert.notDeepEqual(t,other);
    assert.deepEqual(directionTile(tileDirection(t,.5,.5),level),t);
  }
});
