import {test} from 'node:test';
import assert from 'node:assert/strict';
import {galaxies,refByAddress,system} from '../src/catalog.ts';
import {buildDrainage} from '../src/drainage.ts';
import {terrainSampler} from '../src/terrain.ts';
import {buildRiverRegion,riverCoordinates,riverDirection} from '../src/river-generation.ts';
import {sampleLegacyRiverRegion,sampleRiverRegion} from '../src/river-sample.ts';

const body=system(refByAddress(galaxies('LETHRA-001')[0],'G001/C2128,0,1/0')).planets[1];
const drainage=buildDrainage(body),baseline=terrainSampler(body);
const feasible=()=>drainage.catchments.flatMap(c=>{try{return [[c,buildRiverRegion(body,c)]]}catch{return []}});

test('physical regional rivers are deterministic, bounded, and retain the baseline',()=>{
  const before=baseline([1,0,0]),regions=feasible();
  assert.ok(regions.length>=3,'fixture has several feasible coastal regions');
  for(const [catchment,region] of regions){
    assert.equal(region.id,catchment.id+'/river-region-1');assert.equal(region.bodySeed,body.seed);assert.ok(region.stats.samples<=257**2);assert.ok(region.stats.lengthM<100000);assert.equal(JSON.stringify(buildRiverRegion(body,catchment)),JSON.stringify(region));
    assert.deepEqual(baseline([1,0,0]),before);
    for(const channel of region.channels){assert.ok(channel.points.length>2);for(let i=1;i<channel.points.length;i++){assert.ok(channel.points[i].waterM<=channel.points[i-1].waterM);assert.ok(channel.points[i].distanceM>channel.points[i-1].distanceM);assert.ok(Math.hypot(channel.points[i].x-channel.points[i-1].x,channel.points[i].z-channel.points[i-1].z)<=100);}}
    const main=region.channels[0],trib=region.channels[1];assert.equal(main.points.at(-1).waterM,0);assert.ok(baseline(riverDirection(region,main.points.at(-1).x,main.points.at(-1).z)).ocean);const join=main.points.reduce((best,p)=>Math.hypot(p.x-trib.points.at(-1).x,p.z-trib.points.at(-1).z)<Math.hypot(best.x-trib.points.at(-1).x,best.z-trib.points.at(-1).z)?p:best,main.points[0]);assert.equal(trib.points.at(-1).waterM,join.waterM);
    const lake=region.lakes[0];assert.ok(main.points.some(p=>Math.hypot(p.x-lake.x,p.z-lake.z)<lake.radiusXM));
    for(const site of region.sites){const s=sampleRiverRegion(region,site.direction,baseline(site.direction).elevationM),legacy=sampleLegacyRiverRegion(region,site.direction,baseline(site.direction).elevationM),[x,z]=riverCoordinates(region,site.direction),h=(a,b)=>{const d=riverDirection(region,a,b);return sampleRiverRegion(region,d,baseline(d).elevationM).rockHeightM;},slope=Math.atan(Math.hypot(h(x+5,z)-h(x-5,z),h(x,z+5)-h(x,z-5))/10)*180/Math.PI;assert.equal(s.wet,false,site.name+' is a dry arrival site');assert.ok(slope<=28,site.name+' has walkable final slope');assert.ok(Math.abs(site.elevationM-legacy.rockHeightM)<1e-7,'stored river-region-1 site height uses the legacy construction sampler');assert.ok(Math.abs(Math.hypot(...site.lookDirection)-1)<1e-12);}
  }
});

test('sampler shares wet beds, banks, lake and tangent coordinates',()=>{
  const [,region]=feasible()[0],main=region.channels[0],lake=region.lakes[0];
  for(const channel of region.channels)for(const p of channel.points.filter((_,i)=>i%23===0)){
    const d=riverDirection(region,p.x,p.z),s=sampleRiverRegion(region,d,baseline(d).elevationM);assert.ok(s.wet);assert.ok(['river','lake'].includes(s.waterKind));assert.ok(s.rockHeightM<=s.waterLevelM);assert.ok(Math.abs(s.waterLevelM-p.waterM)<1e-7);const [x,z]=riverCoordinates(region,d);assert.ok(Math.hypot(x-p.x,z-p.z)<.01);
  }
  const ld=riverDirection(region,lake.x,lake.z),ls=sampleRiverRegion(region,ld,baseline(ld).elevationM);assert.ok(ls.wet);assert.equal(ls.waterKind,'lake');assert.equal(ls.waterLevelM,lake.waterM);assert.ok(ls.rockHeightM<ls.waterLevelM);
  for(let i=0;i<24;i++){const a=i*Math.PI*2/24,ca=Math.cos(lake.angle),sa=Math.sin(lake.angle),x=lake.x+(lake.radiusXM-.1)*Math.cos(a)*ca-(lake.radiusZM-.1)*Math.sin(a)*sa,z=lake.z+(lake.radiusXM-.1)*Math.cos(a)*sa+(lake.radiusZM-.1)*Math.sin(a)*ca,d=riverDirection(region,x,z),s=sampleRiverRegion(region,d,baseline(d).elevationM);assert.ok(s.wet);assert.ok(Math.abs(s.waterLevelM-lake.waterM)<1e-7);assert.ok(s.rockHeightM<=s.waterLevelM);}
  for(const p of main.points){const ca=Math.cos(lake.angle),sa=Math.sin(lake.angle),u=((p.x-lake.x)*ca+(p.z-lake.z)*sa)/lake.radiusXM,v=(-(p.x-lake.x)*sa+(p.z-lake.z)*ca)/lake.radiusZM;if(u*u+v*v<=1.02)assert.equal(p.waterM,lake.waterM);}
  const far=riverDirection(region,90000,90000),outside=sampleRiverRegion(region,far,123);assert.deepEqual(outside,{rockHeightM:123,waterLevelM:null,wet:false,bank:0,channelId:null,waterKind:null,flow:[0,0],influence:0});
});
