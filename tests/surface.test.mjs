import {test} from 'node:test';
import assert from 'node:assert/strict';
import {galaxies,refByAddress,system} from '../src/catalog.ts';
import {terrainSampler} from '../src/terrain.ts';
import {cubeDirection,buildTile,PATCH_SEGMENTS,directionTile} from '../src/planet-tiles.ts';
import {biomeClassifier,materialBytes} from '../src/surface-biomes.ts';
import {detailPixels,detailOrigin} from '../src/ground-material.ts';
import {surfaceSurvey} from '../src/surface-survey.ts';
const sys=system(refByAddress(galaxies('LETHRA-001')[0],'G001/C2128,0,1/0')),body=sys.planets[1];
test('biome weights sum to one and distinguish airless ground from living habitat',()=>{
  for(const b of [body,sys.moons[0],{...body,type:'Ice world',water:0},{...body,type:'Volcanic world',water:0},{...body,temperatureK:600},{...body,temperatureK:90}]){
    const classify=biomeClassifier(b);
    for(const d of [[0,1,0],[0,-1,0],[1,0,0],cubeDirection(0,1,1)])for(const height of [-1000,0,50,900,4000])for(const dot of [.3,.8,1]){
      const c=classify(d,height,dot);assert.ok(c.weights.every(x=>x>=0&&x<=1));
      assert.ok(Math.abs(c.weights.reduce((a,b)=>a+b,0)-1)<1e-12);
      const bytes=materialBytes(c.weights);assert.equal(bytes.reduce((a,b)=>a+b,0),255);
      if(!b.water||height<0||b.temperatureK<250||b.temperatureK>325)assert.equal(c.forestPotential,false);
    }
  }
});
test('material coordinates and weights match at poles, cube corners and LOD boundaries',()=>{
  const phase=(t,i)=>{const origin=detailOrigin(t.anchor,body.radiusM);return origin.map((v,j)=>Math.fround(Math.fround(t.positions[i*3+j]*Math.fround(body.radiusM))+Math.fround(v)));};
  const n=PATCH_SEGMENTS,seen=new Map();let shared=0;
  for(const level of [17,18])for(const d of [[0,1,0],[0,-1,0],[1,1,1],[-1,-1,-1]]){
    const center=directionTile(d,level),count=2**level;
    const tiles=[];
    for(let face=0;face<6;face++){
      // Corner fixtures cover each of the three meeting faces; polar fixtures
      // cover the four patches around the pole on its single cube face.
      if(d.every(v=>v!==0)){
        if(Math.sign(d[Math.floor(face/2)])!==(face%2?-1:1))continue;
        for(const x of [0,count-1])for(const y of [0,count-1])tiles.push({face,level,x,y});
      }else if(face===center.face)for(const dx of [-1,0])for(const dy of [-1,0])tiles.push({...center,x:center.x+dx,y:center.y+dy});
    }
    for(const tile of tiles){
      const t=buildTile(body,tile);
      // Surface-centred anchors keep fine geometry local even on high mountains.
      assert.ok(Math.max(...t.positions.slice(0,(n+1)**2*3).map(Math.abs))*body.radiusM<200);
      for(const i of [0,n,n*(n+1),(n+1)**2-1]){
        const absolute=[0,1,2].map(j=>t.positions[i*3+j]+t.anchor[j]);
        const key=absolute.map(v=>v.toFixed(9)).join(',');
        const item={p:phase(t,i),w:Array.from(t.materials.slice(i*4,i*4+4))};
        if(seen.has(key)){
          shared++;const old=seen.get(key);
          for(let j=0;j<3;j++)assert.ok(Math.abs(((item.p[j]-old.p[j])%4096+6144)%4096-2048)<.003);
          assert.deepEqual(item.w,old.w);
        }else seen.set(key,item);
      }
    }
  }
  assert.ok(shared>60,'compared shared cube/polar/LOD vertices');
});
test('ground texture is repeatable and phase agrees between planet-sized tile origins',()=>{
  assert.deepEqual(detailPixels(),detailPixels());
  const a=buildTile(body,{face:2,level:18,x:12000,y:12000}),b=buildTile(body,{face:2,level:18,x:12001,y:12000}),n=PATCH_SEGMENTS;
  const pa=detailOrigin(a.anchor,body.radiusM),pb=detailOrigin(b.anchor,body.radiusM);
  for(let y=0;y<=n;y++)for(let j=0;j<3;j++){
    const av=a.positions[(y*(n+1)+n)*3+j]*body.radiusM+pa[j],bv=b.positions[(y*(n+1))*3+j]*body.radiusM+pb[j];
    const delta=((av-bv)%4096+6144)%4096-2048;
    assert.ok(Math.abs(delta)<.003,'material phase agrees within 3 mm at shared vertices');
  }
});
test('survey sites are repeatable real dry terrain and retain IDs across request order',()=>{
  const before=terrainSampler(body)([1,0,0]),sites=surfaceSurvey(body);
  surfaceSurvey(sys.moons[0]);assert.deepEqual(surfaceSurvey(body),sites);
  assert.deepEqual(terrainSampler(body)([1,0,0]),before);
  assert.ok(sites.length>=3);assert.equal(new Set(sites.map(x=>x.id)).size,sites.length);
  for(const site of sites){const s=terrainSampler(body)(site.direction);assert.equal(s.elevationM,site.elevationM);assert.equal(s.ocean,false);assert.ok(site.slopeDeg<=28);}
  assert.deepEqual(surfaceSurvey({...body,type:'Gas giant'}),[]);
});
