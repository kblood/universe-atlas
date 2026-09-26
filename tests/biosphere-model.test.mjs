import test from 'node:test';
import assert from 'node:assert/strict';
import {generateBiosphere,biosphereAt,habitatMembership,communityPlacements,specimenTraits,profileFromPhysicalProperties,MIN_DATE_MYR,MAX_DATE_MYR} from '../src/biosphere-model.ts';
import {YEAR_NS} from '../src/world-time.ts';

// was generateBiosphere(seed, profile): contract §2.4 rekey adds bodyAddress
// as a required third argument (docs/time-and-coordinates-contract.md §2.4,
// §6.2 BIOSPHERE_VERSION bump). 'planet/0' is a stand-in canonical address
// for these seed/profile-only fixtures; the rekey-specific behaviour (two
// different addresses -> different species; same address -> same species) is
// its own test below.
const world=()=>generateBiosphere('BIOSPHERE-TEST','temperate','planet/0');
test('biosphere identities and structural traits replay independently of other requests',()=>{
  const first=world();
  generateBiosphere('different','arid','planet/0');
  assert.deepEqual(world(),first);
  const other=generateBiosphere('BIOSPHERE-OTHER','temperate','planet/0');
  assert.notEqual(first.digest,other.digest);
  const structural=w=>w.species.map(s=>Object.fromEntries(Object.entries(s.traits).filter(([k])=>!k.toLowerCase().includes('color'))));
  assert.notDeepEqual(structural(first),structural(other),'new worlds change structures, not just names and colours');
  assert.notDeepEqual(first.habitats.map(h=>[h.temperatureK,h.moisture,h.slope]),other.habitats.map(h=>[h.temperatureK,h.moisture,h.slope]));
  assert.equal(new Set(first.species.map(s=>s.id)).size,first.species.length);
});
test('lineages inherit bounded structure and retain ancestors alongside descendants',()=>{
  const w=world(),byId=new Map(w.species.map(s=>[s.id,s]));
  assert.ok(w.species.length>=15);
  for(const s of w.species){
    assert.ok(s.birthMyr>=w.surfaceMyr);
    if(!s.parentId)continue;
    const p=byId.get(s.parentId);assert.ok(p,'parent is retained in the archive');
    assert.equal(s.family,p.family);assert.equal(s.lineageId,p.lineageId);
    assert.ok(p.birthMyr<=s.birthMyr);
    assert.ok(p.deathMyr===null||p.deathMyr>=s.birthMyr);
    assert.ok(s.traits.heightM/p.traits.heightM>.4&&s.traits.heightM/p.traits.heightM<2.5);
  }
  const active=biosphereAt(w,0).species;
  assert.ok(active.some(s=>s.parentId&&active.some(p=>p.id===s.parentId)),'budding does not erase every ancestor');
  assert.ok(w.species.some(s=>s.deathMyr!==null),'archive includes an extinction');
});
test('global dates enforce formation, microbial stages, births and half-open extinction',()=>{
  const w=world();
  const absent=biosphereAt(w,w.formationMyr-1);
  assert.equal(absent.stage,'unformed');assert.equal(absent.surfaceAvailable,false);assert.equal(absent.species.length,0);
  assert.equal(communityPlacements(w,w.habitats[0].id,w.formationMyr-1).length,0);
  const earliest=Math.min(...w.species.map(s=>s.birthMyr));
  assert.ok(w.microbialMyr!==null&&w.microbialMyr<earliest);
  const microbial=biosphereAt(w,w.microbialMyr);
  assert.equal(microbial.stage,'microbial');assert.equal(microbial.species.length,0);
  for(const s of w.species){
    assert.ok(!biosphereAt(w,s.birthMyr-1).species.some(x=>x.id===s.id));
    assert.ok(biosphereAt(w,s.birthMyr).species.some(x=>x.id===s.id));
    if(s.deathMyr!==null){
      assert.ok(biosphereAt(w,s.deathMyr-1).species.some(x=>x.id===s.id));
      assert.ok(!biosphereAt(w,s.deathMyr).species.some(x=>x.id===s.id));
    }
  }
  for(const d of [-20000,-123,0,1,20000])assert.equal(biosphereAt(w,d).dateNs,(BigInt(d)*1_000_000n*YEAR_NS).toString());
  const a=biosphereAt(w,-100);biosphereAt(w,100);assert.deepEqual(biosphereAt(w,-100),a);
});
test('shared habitat ranges distinguish suitability from geographic occupancy',()=>{
  const w=world(),active=biosphereAt(w,0).species;
  const reachable=w.habitats.filter(h=>h.reachable),island=w.habitats.find(h=>!h.reachable);
  assert.ok(island);
  const ranges=active.map(s=>({s,m:w.habitats.map(h=>habitatMembership(w,s,h,0))}));
  assert.ok(ranges.some(({s,m})=>s.kind==='animal'&&m.filter(x=>x.occupied).length>=2),'one animal really spans habitats');
  assert.ok(ranges.some(({m})=>m.some(x=>x.occupied)&&m.some(x=>!x.occupied)));
  for(const s of active){
    const m=habitatMembership(w,s,island,0);
    assert.equal(m.occupied,false);assert.ok(m.reasons.length);
    assert.equal(m.speciesId,s.id);
    for(const h of reachable){const membership=habitatMembership(w,s,h,0);assert.ok(membership.suitability>=0&&membership.suitability<=1);}
  }
  assert.ok(active.some(s=>habitatMembership(w,s,island,0).suitability>0),'island exclusion is not disguised as universally bad habitat');
  const s=active.find(s=>s.kind==='tree');
  const lethal={...reachable[0],temperatureK:s.niche.maxTempK+100};
  assert.equal(habitatMembership(w,s,lethal,0).occupied,false);
});
test('community slots are bounded, repeatable and reference living compatible species',()=>{
  for(const profile of ['temperate','arid','cold','airless']){
    const w=generateBiosphere('COMMUNITY',profile,'planet/0'),active=new Map(biosphereAt(w,0).species.map(s=>[s.id,s]));
    for(const h of w.habitats){
      const rows=communityPlacements(w,h.id,0);
      assert.deepEqual(rows,communityPlacements(w,h.id,0));
      assert.ok(rows.length<=700);
      assert.equal(new Set(rows.map(p=>p.id)).size,rows.length);
      for(const p of rows){
        assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.z)&&Math.abs(p.x)<=32&&Math.abs(p.z)<=32);
        assert.ok(Number.isFinite(p.rotation)&&p.scale>0&&Number.isFinite(p.scale));
        assert.ok(Number.isInteger(p.variant)&&p.variant>=0&&p.variant<4);
        assert.ok(Boolean(p.speciesId)!==Boolean(p.rockId));
        if(p.speciesId){assert.ok(active.has(p.speciesId));assert.ok(habitatMembership(w,active.get(p.speciesId),h,0).occupied);}
        else assert.ok(w.rocks.some(r=>r.id===p.rockId));
      }
    }
    if(profile==='airless'){assert.equal(w.species.length,0);assert.equal(biosphereAt(w,0).stage,'sterile');assert.ok(w.rocks.length>=3);}
  }
});
test('individual growth and structural variants preserve species inputs',()=>{
  const w=world(),before=JSON.stringify(w);
  for(const s of w.species){
    const adult=specimenTraits(s,0,'adult'),young=specimenTraits(s,0,'juvenile');
    assert.ok(young.heightM<adult.heightM);
    assert.deepEqual(specimenTraits(s,0,'adult'),adult);
    assert.notDeepEqual(specimenTraits(s,1,'adult'),adult);
  }
  assert.equal(JSON.stringify(w),before,'queries do not mutate canonical species');
});
test('planet identity namespaces species while geological plots have two dimensional scatter',()=>{
  const a=generateBiosphere('IDENTITY','temperate','planet/0'),b=generateBiosphere('IDENTITY','arid','planet/0');
  assert.notEqual(a.planetId,b.planetId);
  assert.equal(a.species.filter(s=>b.species.some(t=>t.id===s.id)).length,0,'different planet records cannot share unrelated species identities');
  assert.equal(a.rocks.filter(s=>b.rocks.some(t=>t.id===s.id)).length,0);
  const bare=generateBiosphere('SCATTER','airless','planet/0');assert.ok(bare.habitats.length>0,'sterile geology remains inspectable');
  assert.ok(bare.events.some(e=>e.dateMyr===bare.formationMyr),'formation is in the event ledger');
  const points=bare.habitats.flatMap(h=>communityPlacements(bare,h.id,0));
  assert.ok(points.length>100);
  const mean=k=>points.reduce((sum,p)=>sum+p[k],0)/points.length;
  const mx=mean('x'),mz=mean('z');let vx=0,vz=0,cov=0;
  for(const p of points){vx+=(p.x-mx)**2;vz+=(p.z-mz)**2;cov+=(p.x-mx)*(p.z-mz);}
  assert.ok(Math.abs(cov/Math.sqrt(vx*vz))<.5,'random x/z channels must not collapse a plot into a diagonal');
  assert.ok(vx/points.length>100&&vz/points.length>100,'scatter spans the plot');
});
test('fauna cannot feed on producers excluded by lethal habitat gates',()=>{
  const w=world(),h={...w.habitats[0],temperatureK:286,moisture:.5,slope:.1,reachable:true};
  for(const s of w.species){
    s.niche={minTempK:s.kind==='animal'?250:10,maxTempK:s.kind==='animal'?330:20,minMoisture:0,maxMoisture:1,maxSlope:1};
  }
  const animal=biosphereAt(w,0).species.find(s=>s.kind==='animal');
  const m=habitatMembership(w,animal,h,0);
  assert.equal(m.occupied,false);assert.ok(m.reasons.some(r=>/resource|food|producer/i.test(r)));
});
test('biosphere public inputs reject invalid or unbounded requests',()=>{
  for(const seed of ['', 'x'.repeat(200),null])assert.throws(()=>generateBiosphere(seed,'temperate','planet/0'));
  assert.throws(()=>generateBiosphere('valid','unknown','planet/0'));
  for(const bodyAddress of ['', 'x'.repeat(200),null,undefined])assert.throws(()=>generateBiosphere('valid','temperate',bodyAddress));
  assert.throws(()=>generateBiosphere('valid','temperate','planet/0',{surfaceMyr:0}),'realClock.surfaceMyr must be positive');
  assert.throws(()=>generateBiosphere('valid','temperate','planet/0',{surfaceMyr:1.5}),'realClock.surfaceMyr must be an integer');
  assert.throws(()=>generateBiosphere('valid','temperate','planet/0',{surfaceMyr:MAX_DATE_MYR+1}),'realClock.surfaceMyr must stay in range');
  const w=world();
  for(const date of [NaN,Infinity,-Infinity,20001,-20001,.5,'0'])assert.throws(()=>biosphereAt(w,date));
  assert.throws(()=>communityPlacements(w,'not-a-habitat',0));
  for(const variant of [-1,4,NaN,1.5])assert.throws(()=>specimenTraits(w.species[0],variant));
});
// Contract §2.4 "rekey correctness" (docs/time-and-coordinates-contract.md
// §6.4 acceptance test 4, applied to Package C's own module): two different
// bodies with the same physical profile must diverge (seeded by address);
// the same (seed, profile, bodyAddress) triple must reproduce identically no
// matter which "lab/profile path" constructs the call (contract's own
// wording) — modelled here as calling generateBiosphere directly vs. via a
// helper that first derives the profile from physical properties, both
// landing on the same 'temperate' classification for these inputs.
test('rekey correctness: bodyAddress differentiates otherwise-identical planets; the same address is call-path independent',()=>{
  const a=generateBiosphere('REKEY-SEED','temperate','G001/C1,2,3/0/planet/0');
  const b=generateBiosphere('REKEY-SEED','temperate','G001/C1,2,3/0/planet/1');
  assert.notEqual(a.digest,b.digest,'two different bodyAddresses with an identical seed+profile must diverge');
  assert.equal(a.species.filter(s=>b.species.some(t=>t.id===s.id)).length,0,'different bodies never share a species id');
  const structural=w=>w.species.map(s=>Object.fromEntries(Object.entries(s.traits).filter(([k])=>!k.toLowerCase().includes('color'))));
  assert.notDeepEqual(structural(a),structural(b),'address alone (not just seed) must change species structure');
  const again=generateBiosphere('REKEY-SEED','temperate','G001/C1,2,3/0/planet/0');
  assert.deepEqual(again,a,'the same (seed, profile, bodyAddress) reproduces identically regardless of call path');
  const derivedProfile=profileFromPhysicalProperties({water:.4,temperatureK:286},'main-sequence');
  assert.equal(derivedProfile,'temperate');
  const viaDerivedPath=generateBiosphere('REKEY-SEED',derivedProfile,'G001/C1,2,3/0/planet/0');
  assert.deepEqual(viaDerivedPath,a,'deriving the profile through profileFromPhysicalProperties reaches the same world as picking it by hand');
});
test('profileFromPhysicalProperties is a deterministic, address-independent classification',()=>{
  assert.equal(profileFromPhysicalProperties({water:0,temperatureK:286},'main-sequence'),'airless','no water -> airless regardless of temperature');
  assert.equal(profileFromPhysicalProperties({water:.4,temperatureK:286},'unformed'),'airless','no active star -> airless even with water');
  assert.equal(profileFromPhysicalProperties({water:.4,temperatureK:286},'remnant'),'airless','a dead star -> airless even with water');
  assert.equal(profileFromPhysicalProperties({water:.4,temperatureK:300},'main-sequence'),'arid');
  assert.equal(profileFromPhysicalProperties({water:.4,temperatureK:270},'giant'),'cold');
  assert.equal(profileFromPhysicalProperties({water:.4,temperatureK:286},'giant'),'temperate');
});
// Contract §2.4: "world.formationMyr/world.surfaceMyr ... become derived
// from the real PlanetLifecycle: formationMyr = 0 ... surfaceMyr =
// round((coolingNs - formationNs) / (1e6 * YEAR_NS))". The realClock
// parameter is world-surface.ts's wiring point for that; this only checks
// biosphere-model.ts's own half of the contract (accepting and using the
// supplied clock instead of drawing its own).
test('a supplied realClock anchors formationMyr at 0 and uses the given surfaceMyr exactly',()=>{
  const demo=generateBiosphere('CLOCK-TEST','temperate','planet/0');
  assert.notEqual(demo.formationMyr,0,'demo/heuristic mode keeps its historical (nonzero) offsets');
  const real=generateBiosphere('CLOCK-TEST','temperate','planet/0',{surfaceMyr:120});
  assert.equal(real.formationMyr,0);
  assert.equal(real.surfaceMyr,120);
  assert.ok(real.microbialMyr>120);
  const absent=biosphereAt(real,-1);
  assert.equal(absent.stage,'unformed');
  const forming=biosphereAt(real,60);
  assert.equal(forming.stage,'forming');
  const eventual=biosphereAt(real,MAX_DATE_MYR);
  assert.ok(eventual.species.length>0,'a species with deathMyr:null started long before MAX_DATE_MYR stays alive at the clamp ceiling');
  assert.ok(MIN_DATE_MYR<0&&MAX_DATE_MYR>0);
});
