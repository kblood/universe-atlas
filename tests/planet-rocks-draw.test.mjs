/** Bounded draw/cull traversal and combined memory accounting for surface
 * rocks (CPU only; no GPU, browser or frame timing). */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {galaxies,refByAddress,system} from '../src/catalog.ts';
import {terrainSampler} from '../src/terrain.ts';
import {biomeClassifier} from '../src/surface-biomes.ts';
import {ROCK_TIERS,ROCK_MAX_ALTITUDE_M,rockLod,canonicalCellsWithin} from '../src/rock-field.ts';
import {buildRockMesh} from '../src/rock-geometry.ts';
import {GROUND_RESOURCE_BYTES,GROUND_PBR_TEXTURE_BYTES,GROUND_ATLAS_BYTES} from '../src/ground-material.ts';
import {rendererMemoryAccounting,RENDERER_MEMORY_BUDGET} from '../src/renderer-memory.ts';
import {
  PlanetRocks,ROCK_LOD_CAPS,ROCK_DRAW_UNITS_PER_FRAME,ROCK_NEAR_UNCULLED_M,ROCK_WORST_CASE_BYTES,ROCK_BUDGET_BYTES,
  ROCK_REF_BYTES,ROCK_DRAW_JOB_BYTES,ROCK_RECORD_BYTES,ROCK_CELL_RECORD_BYTES,ROCK_SURFACE_CELL_BYTES,ROCK_TRANSIENT_BYTES,
  ROCK_MAX_RESCATTER_CANDIDATES,ROCK_ORIGIN_REBASE_M,ROCK_NEAR_MAX,ROCK_PUBLISH_MAX,ROCK_KEY_PLANE_REACH_M,
} from '../src/planet-rocks.ts';
import {moon,moonFamilies,CORNER,unit,saturatedRecords,fixtureCounts,cameraFrustum,eyeAt,injectSaturated,flatSampler,rockClassifier,SEED} from './rock-saturated-fixture.mjs';

const MAX_SLOTS=Math.max(...ROCK_TIERS.map(t=>t.slots));
const ALL=new THREE.Frustum(...Array.from({length:6},()=>new THREE.Plane(new THREE.Vector3(1,0,0),10)));
const NONE=new THREE.Frustum(...Array.from({length:6},()=>new THREE.Plane(new THREE.Vector3(1,0,0),-10)));
const RECORDS=saturatedRecords();
const gate={surfaceSolid:true,families:moonFamilies};
const focus=new THREE.Vector3(...CORNER),eye0=eyeAt(moon,CORNER);

function saturated(drawUnitsPerFrame){
  const rocks=new PlanetRocks({body:moon,sample:()=>flatSampler,classify:()=>rockClassifier,drawUnitsPerFrame});
  rocks.update({eye:eye0,focus,altitudeM:1.7,gate,relief:1,waterLevelM:0,frusta:[]});
  injectSaturated(rocks,RECORDS);
  return rocks;
}
const input=(view,extra={})=>({eye:view.eye??eye0,focus:view.focus??focus,altitudeM:view.altitudeM??1.7,gate,relief:1,waterLevelM:0,
  frusta:view.frusta,shadowFrustum:view.shadow??null,...extra});
/** Per-frame draw bound: the unit budget plus one cell's slots, or a single
 * publish that ran as the frame's first work (at most ROCK_PUBLISH_MAX). */
function assertDrawBound(d){
  const w=d.work.draw;
  assert.ok(w.publishInstances<=ROCK_PUBLISH_MAX,`publish ${w.publishInstances}`);
  assert.ok(w.units<=Math.max(d.caps.drawUnitsPerFrame+MAX_SLOTS,w.publishInstances),`draw units ${w.units} (publish ${w.publishInstances})`);
  if(w.units>d.caps.drawUnitsPerFrame+MAX_SLOTS)assert.equal(w.units,w.publishInstances,'only a lone publish may exceed the unit budget');
}
/** Updates with one view until the published set reflects it. */
function flush(rocks,frame,max=200){
  for(let i=0;i<max;i++){
    rocks.update(frame);const d=rocks.diagnostics();
    assertDrawBound(d);
    if(!d.work.draw.pending&&!d.work.draw.stale)return {frames:i+1,diagnostics:d};
  }
  assert.fail('draw job did not converge');
}
/** Independent flat per-rock traversal: canonical order, THREE frustum tests,
 * the near rule and caps. Geometry comes from rock-geometry directly. */
function reference(rocks,{eye,frusta,shadow=null}){
  const r=rocks.body.radiusM,families=rocks.families,shapes=new Map(),drawn=[0,0,0],counts=new Map(),out=[];
  const shape=(f,v)=>{const k=f*3+v;if(!shapes.has(k))shapes.set(k,buildRockMesh(families[f],v,0));return shapes.get(k);};
  const sphere=new THREE.Sphere();let near=0,culled=0,shadowOnly=0,drops=0,nearDrops=0;
  ROCK_TIERS.forEach((tier,t)=>{
    const state=rocks.tiers[t];
    for(const cell of state.wanted){
      const record=state.residents.get(cell.id);if(!record)continue;
      for(const rock of record.rocks){
        const f=families.findIndex(x=>x.id===rock.familyId),s=shape(f,rock.variant),g=1+rock.groundHeightM/r;
        const centreM=s.boundCenterY*rock.diameterM*rock.aspect[1]-rock.sinkM;
        const c=[0,1,2].map(i=>rock.direction[i]*g+rock.up[i]*centreM/r);
        const dx=c[0]-eye.x,dy=c[1]-eye.y,dz=c[2]-eye.z,distanceM=Math.sqrt(dx*dx+dy*dy+dz*dz)*r;
        const band=rockLod(distanceM,rock.diameterM,tier.rangeM);if(band<0)continue;
        sphere.center.set(...c);sphere.radius=s.boundRadius*rock.diameterM*Math.max(...rock.aspect)/r;
        const close=distanceM<=ROCK_NEAR_UNCULLED_M;
        if(close)near++;
        else if(!frusta.some(fr=>fr.intersectsSphere(sphere))){
          if(band===2||!shadow?.intersectsSphere(sphere)){culled++;continue;}
          shadowOnly++;
        }
        const batch=(f*3+rock.variant)*3+band,capacity=rocks.batches[batch].capacity;
        // Near rocks bypass the LOD caps; batch capacity still applies.
        if((counts.get(batch)??0)>=capacity||(!close&&drawn[band]>=ROCK_LOD_CAPS[band])){drops++;if(close)nearDrops++;continue;}
        counts.set(batch,(counts.get(batch)??0)+1);drawn[band]++;out.push(`${rock.id}@${band}`);
      }
    }
  });
  return {rocks:out.sort(),drawn,near,shadowOnly,drops,nearDrops,culled};
}
function assertParity(rocks,view,label){
  const d=rocks.diagnostics(),ref=reference(rocks,view);
  assert.deepEqual(rocks.publishedRocks(),ref.rocks,`${label}: published set`);
  assert.deepEqual([d.drawn.lod0,d.drawn.lod1,d.drawn.lod2],ref.drawn,`${label}: drawn per LOD`);
  assert.equal(d.nearUnculled,ref.near,`${label}: near`);assert.equal(d.shadowOnly,ref.shadowOnly,`${label}: shadow-only`);
  assert.equal(d.budgetDrops,ref.drops,`${label}: cap drops`);
  assert.equal(d.nearDrops,0,`${label}: no near rock is dropped`);assert.equal(ref.nearDrops,0);
  assert.ok(d.nearUnculled<=ROCK_NEAR_MAX);
  return ref;
}
/** Planet-unit absolute centre of every published instance (matrix + group origin). */
function publishedPositions(rocks){
  const out=[];
  for(const mesh of rocks.group.children)for(let i=0;i<mesh.count;i++){
    const m=new THREE.Matrix4().fromArray(mesh.instanceMatrix.array,i*16);
    out.push(new THREE.Vector3().setFromMatrixPosition(m).add(rocks.group.position));
  }
  return out;
}
const views=[
  {name:'all',eye:eye0,frusta:[ALL],shadow:ALL},
  {name:'perspective+shadow',eye:eye0,frusta:[cameraFrustum(moon,eye0,.4)],shadow:ALL},
  {name:'perspective',eye:eye0,frusta:[cameraFrustum(moon,eye0,2.1)]},
  {name:'stereo',eye:eye0,frusta:[cameraFrustum(moon,eye0,-1.2),cameraFrustum(moon,eye0,-1.14)],shadow:cameraFrustum(moon,eye0,-1.2,{fov:120,far:300})},
  {name:'none+shadow',eye:eye0,frusta:[NONE],shadow:ALL},
];

test('saturated fixture: 7,600 cells and 13,600 rocks at the resident caps',()=>{
  assert.deepEqual(fixtureCounts(RECORDS),{cells:ROCK_TIERS.reduce((a,t)=>a+t.residentCap,0),rocks:ROCK_TIERS.reduce((a,t)=>a+t.residentCap*t.slots,0)});
  const rocks=saturated();
  const d=rocks.diagnostics();
  assert.deepEqual(d.tiers.map(t=>[t.wanted,t.resident,t.rocks]),ROCK_TIERS.map(t=>[t.residentCap,t.residentCap,t.residentCap*t.slots]));
  rocks.dispose();
});

test('draw work per frame is bounded; saturated jobs span frames and report their backlog',()=>{
  const rocks=saturated();
  let spans=0,pendingSeen=0,previous=Infinity;
  for(let i=0;i<60;i++){
    rocks.update(input({frusta:[cameraFrustum(moon,eye0,i*Math.PI/90)],shadow:ALL}));
    const d=rocks.diagnostics(),w=d.work.draw;
    assertDrawBound(d);assert.equal(d.caps.drawUnitsPerFrame,ROCK_DRAW_UNITS_PER_FRAME);
    // Process and draw counters are separate: the settled fixture has no canonical work.
    assert.equal(d.work.process.cells,0);assert.equal(d.work.process.pendingCells,0);
    if(w.pending&&w.awaitingPublish){
      // Walked, waiting for a frame whose remaining budget fits the copies.
      assert.equal(w.pendingCells,0);assert.equal(w.pendingUnitsMax,rocks.job.drawn.reduce((a,x)=>a+x,0));
    }else if(w.pending){
      pendingSeen++;assert.ok(w.pendingCells>0&&w.pendingUnitsMax>=w.pendingCells);
      if(w.jobFrames>1)assert.ok(w.pendingCells<previous,'backlog shrinks while a job runs');
      previous=w.pendingCells;
    }else previous=Infinity;
    if(w.published&&w.lastJobFrames>1)spans++;
  }
  assert.ok(spans>0&&pendingSeen>0,'saturated jobs need more than one frame at the default budget');
  // A job's units: every cell, every rock, every copied instance.
  assert.ok(rocks.diagnostics().work.draw.maxJobFrames<=Math.ceil((7600+13600+ROCK_PUBLISH_MAX)/ROCK_DRAW_UNITS_PER_FRAME)+1);
  rocks.dispose();
});

test('published outcomes equal a flat per-rock pass for every view and draw budget',()=>{
  for(const budget of [97,1000,ROCK_DRAW_UNITS_PER_FRAME,Infinity]){
    const rocks=saturated(budget);
    for(const view of views){
      flush(rocks,input(view),budget<200?400:200);
      const ref=assertParity(rocks,view,`${view.name}/${budget}`);
      assert.ok(ref.rocks.length>0);
    }
    rocks.dispose();
  }
});

test('the previous published set stays drawn, at its own origin, while a job is pending',()=>{
  const rocks=saturated(600),r=moon.radiusM;
  flush(rocks,input(views[1]));
  const canonical=new Map();
  for(const state of rocks.tiers)for(const record of state.residents.values())for(let k=0;k<record.rocks.length;k++)
    canonical.set(record.rocks[k].id,record.rocks[k]);
  const expected=id=>{const rock=canonical.get(id.split('@')[0]),g=1+rock.groundHeightM/r;
    return new THREE.Vector3(...rock.direction).multiplyScalar(g).addScaledVector(new THREE.Vector3(...rock.up),-rock.sinkM/r);};
  const checkAbsolute=()=>{
    // Batches are walked in the same order as publishedRocks is built before sorting.
    const ids=[];for(const b of rocks.batches)for(let i=0;i<b.count;i++)ids.push(`${b.published[i].id}@${b.lod}`);
    const positions=publishedPositions(rocks);assert.equal(positions.length,ids.length);
    ids.forEach((id,i)=>assert.ok(positions[i].distanceTo(expected(id))*r<2e-3,`${id} off by ${positions[i].distanceTo(expected(id))*r} m`));
  };
  checkAbsolute();
  // Move past the rebase threshold and turn: the old set must hold still until the new one publishes.
  const east=new THREE.Vector3(-CORNER[1],CORNER[0],0).normalize();
  const eye=eye0.clone().addScaledVector(east,(ROCK_ORIGIN_REBASE_M+5)/r);
  const before=rocks.publishedRocks(),origin=rocks.group.position.clone();
  let pendingFrames=0;
  for(let i=0;i<200;i++){
    rocks.update(input({eye,frusta:[cameraFrustum(moon,eye,1.3)],shadow:ALL}));
    const d=rocks.diagnostics();
    if(i===0)assert.ok(d.originRebased);
    if(!d.work.draw.pending&&!d.work.draw.stale)break;
    if(d.work.draw.published)continue;
    pendingFrames++;
    assert.deepEqual(rocks.publishedRocks(),before);assert.ok(rocks.group.position.equals(origin));
    checkAbsolute();
  }
  assert.ok(pendingFrames>1);
  assert.ok(!rocks.group.position.equals(origin));
  checkAbsolute();
  rocks.dispose();
});

test('near rocks stay submitted every frame while turning with multi-frame jobs',()=>{
  const rocks=saturated();
  flush(rocks,input(views[0]));
  let checked=0,frames=0;
  for(let i=0;i<90;i++){
    // A fast head turn: 7 degrees per frame, alternating direction every 30 frames.
    const yaw=(i%60<30?i:60-i)*7*Math.PI/180,view={eye:eye0,frusta:[cameraFrustum(moon,eye0,yaw)],shadow:null};
    rocks.update(input(view));
    const published=new Set(rocks.publishedRocks().map(id=>id.split('@')[0]));
    // Every rock the near rule draws at this eye is on screen, whatever the job state.
    for(const id of nearRockIds(rocks,eye0)){assert.ok(published.has(id),`near rock ${id} missing at frame ${i}`);checked++;}
    if(rocks.diagnostics().work.draw.pending)frames++;
  }
  assert.ok(checked>1000&&frames>30,`checked ${checked} near rocks over ${frames} pending frames`);
  rocks.dispose();
});
/** Rocks the reference draws by the near rule at `eye` (view-independent). */
function nearRockIds(rocks,eye){
  const ref=reference(rocks,{eye,frusta:[NONE],shadow:null});
  return ref.rocks.map(id=>id.split('@')[0]);
}

test('moving on real terrain: bounded frames and parity after every stop, independent of draw budget',()=>{
  const sample=terrainSampler(moon),classify=biomeClassifier(moon);
  const make=drawUnitsPerFrame=>new PlanetRocks({body:moon,sample:()=>sample,classify:()=>classify,drawUnitsPerFrame});
  const small=make(350),large=make(Infinity),start=unit([.3,.8,.52]),east=unit([-start[1],start[0],0]);
  const at=k=>{const d=unit(start.map((x,i)=>x+east[i]*k*1.4/moon.radiusM)),h=sample(d).groundHeightM,g=1+(h+1.7)/moon.radiusM;
    return {eye:new THREE.Vector3(d[0]*g,d[1]*g,d[2]*g),focus:new THREE.Vector3(...d)};};
  const settle=(rocks,frame)=>{for(let i=0;i<3000;i++){rocks.update(frame);const d=rocks.diagnostics();
    if(d.tiers.every(t=>t.pending===0&&t.wanted>0)&&!d.work.draw.pending&&!d.work.draw.stale)return d;}assert.fail('did not settle');};
  let maxJobFrames=0;
  for(const stop of [0,40,120,260]){
    const p=at(stop),view={eye:p.eye,frusta:[cameraFrustum(moon,p.eye,stop*.05)],shadow:cameraFrustum(moon,p.eye,stop*.05,{fov:100,far:400})};
    // Walk to the stop frame by frame (1.4 m per frame), then settle.
    for(let k=Math.max(0,stop-40);k<stop;k++){const q=at(k),v={eye:q.eye,focus:q.focus,frusta:[cameraFrustum(moon,q.eye,k*.05)],shadow:null};
      small.update(input(v));large.update(input(v));
      const d=small.diagnostics();assertDrawBound(d);maxJobFrames=Math.max(maxJobFrames,d.work.draw.maxJobFrames);
      for(const [t,tier] of d.tiers.entries())assert.ok(tier.resident<=ROCK_TIERS[t].residentCap,`${tier.id} residents ${tier.resident}`);}
    const frame=input({...view,focus:p.focus});
    settle(small,frame);settle(large,frame);
    assert.deepEqual(small.census(),large.census(),`census at stop ${stop}`);
    assert.deepEqual(small.publishedRocks(),large.publishedRocks(),`published at stop ${stop}`);
    const ref=assertParity(small,view,`stop ${stop}`);
    assert.ok(ref.rocks.length>0);
  }
  assert.ok(maxJobFrames>1,'the small budget exercised multi-frame jobs');
  small.dispose();large.dispose();
});

test('barren bodies ignore sea level; wet bodies clear drawn rocks at once on a sea-level change',()=>{
  // Barren: the dry signature keeps residents and the published set.
  {
    const rocks=saturated();flush(rocks,input(views[0]));
    const published=rocks.publishedRocks(),residents=rocks.ownedBytes().residentRocks;
    rocks.update(input(views[0],{waterLevelM:5000}));
    assert.deepEqual(rocks.publishedRocks(),published);assert.equal(rocks.ownedBytes().residentRocks,residents);
    rocks.dispose();
  }
  // Wet: a moving sea level clears the job and the published set in the same frame.
  const sys=system(refByAddress(galaxies(SEED)[0],'G001/C2128,0,1/0')),world=sys.planets[1];
  assert.ok(world.water>0);
  const direction=unit([.3,.8,.52]);
  let level=-1e6,sample=terrainSampler(world,undefined,undefined,undefined,level),classify=biomeClassifier(world,level);
  const rocks=new PlanetRocks({body:world,sample:()=>sample,classify:()=>classify,drawUnitsPerFrame:500});
  const families=moonFamilies,h=sample(direction).groundHeightM,g=1+(h+1.7)/world.radiusM;
  const eye=new THREE.Vector3(...direction).multiplyScalar(g),view={eye,focus:new THREE.Vector3(...direction),frusta:[ALL],shadow:null};
  const frame=()=>({...input(view),gate:{surfaceSolid:true,families},waterLevelM:level});
  const settle=()=>{for(let i=0;i<4000;i++){rocks.update(frame());const d=rocks.diagnostics();if(d.tiers.every(t=>t.pending===0&&t.wanted>0)&&!d.work.draw.pending&&!d.work.draw.stale)return d;}assert.fail('did not settle');};
  settle();
  assert.ok(rocks.publishedRocks().length>0);
  // Start a job, then move the sea level before it publishes.
  rocks.update({...frame(),frusta:[cameraFrustum(world,eye,1)]});
  level=h-2;sample=terrainSampler(world,undefined,undefined,undefined,level);classify=biomeClassifier(world,level);
  rocks.update(frame());
  const d=rocks.diagnostics();
  assert.equal(d.work.draw.pending,true,'a new job starts on the cleared residents');
  assert.equal(rocks.publishedRocks().length,0,'nothing from the old sea level stays drawn');
  settle();
  assertParity(rocks,view,'wet after sea-level change');
  for(const state of rocks.tiers)for(const record of state.residents.values())for(const rock of record.rocks)assert.ok(rock.groundHeightM>=level+.3);
  rocks.dispose();
});

test('gates cancel pending jobs: surface loss, altitude and relief leave nothing drawn',()=>{
  const rocks=saturated(500);
  flush(rocks,input(views[0]));
  for(const [k,extra] of [{relief:0},{altitudeM:ROCK_MAX_ALTITUDE_M+1},{frusta:[]},{gate:{surfaceSolid:false,families:[]}}].entries()){
    // Each round starts a job on views[1] while views[0] is the published view.
    const view=views[1];
    rocks.update(input(view));assert.equal(rocks.diagnostics().work.draw.pending,true);
    rocks.update(input(view,extra));
    const d=rocks.diagnostics();
    assert.equal(d.work.draw.pending,false);assert.equal(rocks.publishedRocks().length,0);assert.equal(rocks.group.visible,false);
    assert.equal(d.drawn.total,0);assert.ok(rocks.group.children.every(m=>!m.visible&&m.count===0));
    if(extra.gate){assert.equal(rocks.ownedBytes().residentRocks,0);break;}
    flush(rocks,input(views[0]));assertParity(rocks,views[0],`${k}: ${JSON.stringify(Object.keys(extra))}`);
  }
  rocks.dispose();
});

test('family rebuild releases old batches before building new ones; dispose mid-job releases everything',()=>{
  const log=[];
  const rocks=new PlanetRocks({body:moon,sample:()=>flatSampler,classify:()=>rockClassifier,drawUnitsPerFrame:500,attach:mesh=>log.push(['attach',mesh.name])});
  rocks.update(input({frusta:[]}));injectSaturated(rocks,RECORDS);
  rocks.update(input(views[1]));assert.equal(rocks.diagnostics().work.draw.pending,true);
  const old=[...rocks.group.children],oldRocks=new Set();
  for(const state of rocks.tiers)for(const record of state.residents.values())for(const rock of record.rocks)oldRocks.add(rock);
  for(const mesh of old){mesh.geometry.addEventListener('dispose',()=>log.push(['dispose-geometry',mesh.name]));mesh.material.addEventListener('dispose',()=>log.push(['dispose-material',mesh.name]));}
  log.length=0;
  const changed=moonFamilies.map(f=>({...f,scaleM:f.scaleM*1.1}));
  rocks.update(input(views[1],{gate:{surfaceSolid:true,families:changed}}));
  const firstAttach=log.findIndex(e=>e[0]==='attach'),lastDispose=log.findLastIndex(e=>e[0].startsWith('dispose'));
  assert.equal(log.filter(e=>e[0].startsWith('dispose')).length,2*old.length);
  assert.ok(lastDispose<firstAttach,'every old geometry and material is disposed before the first new mesh exists');
  assert.equal(rocks.group.children.length,old.length);assert.ok(old.every(m=>!rocks.group.children.includes(m)));
  // The same update re-resolves cells under the new families; no old rock survives anywhere.
  for(const state of rocks.tiers)for(const record of state.residents.values())for(const rock of record.rocks)assert.ok(!oldRocks.has(rock),'old resident survived a family change');
  for(const b of rocks.batches){for(let i=0;i<b.count;i++)assert.ok(!oldRocks.has(b.published[i]));for(let i=0;i<b.stagedCount;i++)assert.ok(!oldRocks.has(b.staged[i]));}
  assert.ok(rocks.ownedBytes().residentRocks<oldRocks.size);assert.equal(rocks.ownedBytes().pinnedRocks,0);
  // Dispose while a job is pending.
  const parent=new THREE.Group();parent.add(rocks.group);
  for(let i=0;i<5;i++)rocks.update(input(views[1],{gate:{surfaceSolid:true,families:changed}}));
  rocks.dispose();
  assert.equal(rocks.group.children.length,0);assert.equal(rocks.group.parent,null);
  const bytes=rocks.ownedBytes();
  assert.equal(bytes.total,0);assert.equal(bytes.peak,0);
});

test('rock-owned bytes are exact sums of real buffers plus labelled estimates; textures are never rock-owned',()=>{
  const texture=new THREE.Texture(),lease={ready:{value:1},rockColor:texture,rockNormal:texture};
  const withLease=new PlanetRocks({body:moon,sample:()=>flatSampler,classify:()=>rockClassifier,textures:lease});
  const without=saturated();
  withLease.update(input({frusta:[]}));injectSaturated(withLease,RECORDS);
  flush(withLease,input(views[1]));flush(without,input(views[1]));
  const a=withLease.ownedBytes(),b=without.ownedBytes();
  assert.equal(a.textures,0);assert.deepEqual(a,b,'the shared PBR lease adds no rock-owned bytes');
  let geometry=0,instances=0,slots=0;
  for(const mesh of without.group.children){
    for(const [name,attribute] of Object.entries(mesh.geometry.attributes))
      if(attribute.isInstancedBufferAttribute)instances+=attribute.array.byteLength;else{assert.ok(['position','normal','color'].includes(name));geometry+=attribute.array.byteLength;}
    instances+=mesh.instanceMatrix.array.byteLength+mesh.instanceColor.array.byteLength;
  }
  for(const batch of without.batches)slots+=batch.staged.length+batch.published.length;
  const {cells,rocks}=fixtureCounts(RECORDS);
  assert.equal(b.geometry,2*geometry,'geometry: CPU arrays + equal GPU buffers');
  assert.equal(b.instances,2*instances,'instances: CPU arrays + equal GPU buffers');
  assert.equal(b.staging,slots*ROCK_REF_BYTES);
  assert.equal(b.records,cells*ROCK_CELL_RECORD_BYTES+rocks*ROCK_RECORD_BYTES);
  assert.equal(b.surfaceCells,(cells+cells)*ROCK_SURFACE_CELL_BYTES);
  assert.equal(b.job,0);assert.equal(b.pinned,0);assert.equal(b.pinnedRocks,0);
  assert.equal(b.total,b.geometry+b.instances+b.staging+b.job+b.surfaceCells+b.records+b.pinned);
  assert.equal(b.peak,b.total+ROCK_TRANSIENT_BYTES);
  // Saturated = the theoretical maximum of residents; the peak stays inside the worst case.
  assert.ok(b.peak<=ROCK_WORST_CASE_BYTES,`${b.peak} > ${ROCK_WORST_CASE_BYTES}`);
  without.update(input(views[2]));assert.equal(without.ownedBytes().job,without.diagnostics().work.draw.pending?ROCK_DRAW_JOB_BYTES:0);
  withLease.dispose();without.dispose();
});

test('the worst case includes rescatter transients and leaves headroom under the declared budget',()=>{
  assert.ok(ROCK_WORST_CASE_BYTES<=.9*ROCK_BUDGET_BYTES,`${ROCK_WORST_CASE_BYTES} vs ${ROCK_BUDGET_BYTES}`);
  // The analytic candidate bound covers the densest real enumeration (a cube corner).
  for(const tier of ROCK_TIERS){
    const n=canonicalCellsWithin(unit([1,1,1]),moon.radiusM,tier.rangeM+tier.marginM,tier.cellSizeM).length;
    assert.ok(n<=ROCK_MAX_RESCATTER_CANDIDATES,`${tier.id} ${n}`);
  }
});

test('combined renderer accounting adds rock-owned bytes once, never the shared PBR set twice, and keeps headroom',()=>{
  const rocks=saturated();flush(rocks,input(views[1]));
  const owned=rocks.ownedBytes();
  const parts={residentBytes:123_456_789,oceanNormalBytes:4096,rockOwnedBytes:owned.total,cloudAllocatedBytes:7_000_000,pendingTiles:3};
  const m=rendererMemoryAccounting(parts);
  assert.equal(GROUND_RESOURCE_BYTES,GROUND_ATLAS_BYTES+GROUND_PBR_TEXTURE_BYTES);
  assert.equal(m.accountedBytes,parts.residentBytes+GROUND_ATLAS_BYTES+GROUND_PBR_TEXTURE_BYTES+parts.oceanNormalBytes+owned.total);
  assert.equal(m.accountedBytes-rendererMemoryAccounting({...parts,rockOwnedBytes:0}).accountedBytes,owned.total,'rock subtotal is added exactly once');
  const B=RENDERER_MEMORY_BUDGET;
  assert.equal(B.rockReserveBytes,ROCK_BUDGET_BYTES);
  assert.equal(m.reservedCombinedBytes,parts.residentBytes+B.groundResourceBytes+B.waterEnvironmentReserveBytes+B.lifeReserveBytes+B.rockReserveBytes+parts.cloudAllocatedBytes+3*B.pendingTileBytes);
  // Terrain admission keeps resident + (pending + 1) worst-case tiles within its budget;
  // at that limit the combined reservation still fits the core budget.
  assert.equal(B.terrainBytes,B.coreBytes-B.waterEnvironmentReserveBytes-B.lifeReserveBytes-B.rockReserveBytes-B.groundResourceBytes);
  for(const pending of [0,4,16]){
    const limit=rendererMemoryAccounting({residentBytes:B.terrainBytes-(pending+1)*B.pendingTileBytes,oceanNormalBytes:0,rockOwnedBytes:ROCK_WORST_CASE_BYTES,cloudAllocatedBytes:0,pendingTiles:pending});
    assert.ok(limit.reservedCombinedBytes<=B.coreBytes);
  }
  // The rock reserve covers the rock peak, so live rock bytes never exceed what was reserved.
  assert.ok(owned.peak<=B.rockReserveBytes);
  rocks.dispose();
});

/** Distinct evicted rocks still referenced by staged or published slots. */
function pinnedRocks(rocks){
  const resident=new Set();
  for(const state of rocks.tiers)for(const record of state.residents.values())for(const rock of record.rocks)resident.add(rock);
  const pinned=new Set();
  for(const b of rocks.batches){
    for(let i=0;i<b.count;i++)if(!resident.has(b.published[i]))pinned.add(b.published[i]);
    for(let i=0;i<b.stagedCount;i++)if(!resident.has(b.staged[i]))pinned.add(b.staged[i]);
  }
  return pinned.size;
}
test('rescatter during a pending job: residents stay capped, the job drops evicted records, pinned rocks are counted once',()=>{
  const rocks=saturated(600),r=moon.radiusM,east=new THREE.Vector3(-CORNER[1],CORNER[0],0).normalize();
  flush(rocks,input(views[0]));
  let sawPinned=0,sawRescatterMidJob=0,peak=0;
  // Walk 3 m per frame away from the fixture's focus, looking back at it:
  // every tier rescatters, evicts saturated residents and resolves real cells.
  for(let i=1;i<=160;i++){
    const f=focus.clone().addScaledVector(east,3*i/r).normalize(),eye=f.clone().multiplyScalar(1+1.7/r);
    const pending=rocks.diagnostics().work.draw.pending,before=rocks.diagnostics().work.process.rescatters;
    rocks.update(input({eye,focus:f,frusta:[cameraFrustum(moon,eye,Math.PI)],shadow:ALL}));
    const d=rocks.diagnostics(),bytes=rocks.ownedBytes();
    assertDrawBound(d);
    d.tiers.forEach((t,k)=>assert.ok(t.resident<=ROCK_TIERS[k].residentCap,`${t.id} residents ${t.resident} at step ${i}`));
    if(pending&&d.work.process.rescatters>before)sawRescatterMidJob++;
    // A running job references only resident records.
    const job=rocks.job;
    if(job)job.records.forEach((list,t)=>{for(const rec of list)if(rec)assert.equal(rocks.tiers[t].residents.get(rec.cell.id),rec,`job holds an evicted record at step ${i}`);});
    const expected=pinnedRocks(rocks);
    assert.equal(bytes.pinnedRocks,expected,`pinned rocks at step ${i}`);
    assert.equal(bytes.pinned,expected*ROCK_RECORD_BYTES);
    assert.equal(bytes.total,bytes.geometry+bytes.instances+bytes.staging+bytes.job+bytes.surfaceCells+bytes.records+bytes.pinned);
    assert.ok(bytes.peak<=ROCK_WORST_CASE_BYTES,`peak ${bytes.peak} at step ${i}`);
    sawPinned=Math.max(sawPinned,expected);peak=Math.max(peak,bytes.peak);
  }
  assert.ok(sawRescatterMidJob>0,'rescatters happened while a job was pending');
  assert.ok(sawPinned>0,'evicted rocks were pinned by slots at some point');
  // Once the view holds still, the next publishes release every pinned rock.
  const f=focus.clone().addScaledVector(east,480/r).normalize(),eye=f.clone().multiplyScalar(1+1.7/r);
  const still=input({eye,focus:f,frusta:[cameraFrustum(moon,eye,Math.PI)],shadow:ALL});
  for(let i=0;i<4000;i++){rocks.update(still);const d=rocks.diagnostics();if(d.tiers.every(t=>t.pending===0)&&!d.work.draw.pending&&!d.work.draw.stale)break;}
  rocks.update(still);
  assert.equal(rocks.ownedBytes().pinnedRocks,0);assert.equal(pinnedRocks(rocks),0);
  assertParity(rocks,{eye,frusta:[cameraFrustum(moon,eye,Math.PI)],shadow:ALL},'after walking off the fixture');
  rocks.dispose();
});

test('near bound covers the densest canonical neighbourhood',()=>{
  // Cells whose rocks can lie within the near radius, at a cube corner (smallest cells).
  let n=0;
  for(const tier of ROCK_TIERS)n+=tier.slots*canonicalCellsWithin(unit([1,1,1]),moon.radiusM,ROCK_NEAR_UNCULLED_M+tier.cellSizeM,tier.cellSizeM).length;
  assert.ok(n<=ROCK_NEAR_MAX,`${n} > ${ROCK_NEAR_MAX}`);
  assert.equal(ROCK_PUBLISH_MAX,ROCK_LOD_CAPS.reduce((a,c)=>a+c,0)+ROCK_NEAR_MAX);
});

test('moving: rocks within the near radius, less the distance moved since the published view, are always drawn',()=>{
  const rocks=saturated(),r=moon.radiusM,east=new THREE.Vector3(-CORNER[1],CORNER[0],0).normalize(),north=new THREE.Vector3().crossVectors(focus,east).normalize();
  flush(rocks,input(views[0]));
  // 5 cm per frame (3 m/s at 60 Hz) along a curve while turning 3 degrees per frame.
  const STEP=.05,eyes=[];let checked=0,maxAge=0;
  for(let i=0;i<240;i++){
    const a=i*STEP/r,eye=eye0.clone().addScaledVector(east,a*Math.cos(i/80)).addScaledVector(north,a*Math.sin(i/80));eyes.push(eye);
    rocks.update(input({eye,frusta:[cameraFrustum(moon,eye,i*3*Math.PI/180)],shadow:null}));
    const w=rocks.diagnostics().work.draw,age=w.publishedAgeFrames;maxAge=Math.max(maxAge,age);
    // The published set was built at the eye `age` draw frames ago (frame 0 is the flush).
    const moved=age>i?Infinity:eye.distanceTo(eyes[i-age])*r,radius=ROCK_NEAR_UNCULLED_M-moved;
    if(!(radius>0))continue;
    const published=new Set(rocks.publishedRocks().map(id=>id.split('@')[0]));
    for(const state of rocks.tiers)for(const record of state.residents.values())for(let k=0;k<record.rocks.length;k++){
      const o=k*6,d=Math.hypot(record.cull[o]-eye.x,record.cull[o+1]-eye.y,record.cull[o+2]-eye.z)*r;
      if(d<=radius){assert.ok(published.has(record.rocks[k].id),`rock ${record.rocks[k].id} at ${d.toFixed(2)} m missing at frame ${i}`);checked++;}
    }
  }
  assert.ok(maxAge>1&&checked>1000,`max age ${maxAge}, checked ${checked}`);
  rocks.dispose();
});

test('a still view is not re-traversed when only an out-of-reach frustum plane changes (astronomical far plane noise)',()=>{
  const rocks=saturated(),r=moon.radiusM;
  const base=cameraFrustum(moon,eye0,.4,{far:600});
  const withFar=(normal,distanceM)=>{
    const f=base.clone(),n=normal.clone().normalize();
    // Plane 4 is THREE's far plane; place it `distanceM` beyond the eye along `n`.
    f.planes[4].set(n,-n.dot(eye0)+distanceM/r);
    return f;
  };
  // The far distance of the page camera is ~1e15 m; its extracted normal jitters frame to frame.
  const noisy=[new THREE.Vector3(-.4465,-.0558,.893),new THREE.Vector3(-.7064,-.0442,.7064),new THREE.Vector3(-.7044,-.088,.7044)];
  flush(rocks,input({frusta:[withFar(noisy[0],1e15)]}));
  const before=rocks.publishedRocks();
  for(let i=0;i<30;i++){
    rocks.update(input({frusta:[withFar(noisy[i%3],1e15*(1+i*1e-9))]}));
    const w=rocks.diagnostics().work.draw;
    assert.equal(w.jobsStarted,0,`frame ${i}: no job for a noise-only far plane`);
    assert.equal(w.units,0,`frame ${i}: no draw units`);
    assert.equal(w.stale,false);
  }
  assert.deepEqual(rocks.publishedRocks(),before);
  // A plane within reach still keys the view: moving it starts a job, and the result matches the reference pass.
  assert.ok(ROCK_KEY_PLANE_REACH_M>ROCK_TIERS.at(-1).rangeM&&ROCK_KEY_PLANE_REACH_M<2*ROCK_TIERS.at(-1).rangeM);
  const near=withFar(noisy[0],ROCK_KEY_PLANE_REACH_M*.25);
  rocks.update(input({frusta:[near]}));
  assert.equal(rocks.diagnostics().work.draw.jobsStarted,1,'an in-reach plane change starts a job');
  flush(rocks,input({frusta:[near]}));
  assertParity(rocks,{name:'far-in-reach',eye:eye0,frusta:[near],shadow:null},'far-in-reach');
  rocks.dispose();
});

test('a settling camera turn (micro-radian drift per frame) does not restart the draw traversal every frame',()=>{
  const rocks=saturated();
  // Yaw and pitch both drift: pitch changes each plane's constant about the
  // planet centre by ~radius x angle, which the draw key must not see.
  const view=(yaw,pitch=-.25)=>({frusta:[cameraFrustum(moon,eye0,yaw,{far:1e12,pitch})]});
  flush(rocks,input(view(.7)));
  let jobs=0,units=0;
  // The tail of a settling turn: 1e-7 rad per frame, halving every 20 frames.
  let yaw=.7,pitch=-.25;
  for(let i=0;i<60;i++){
    yaw+=1e-7*Math.pow(.5,i/20);pitch+=1e-7*Math.pow(.5,i/20);
    rocks.update(input(view(yaw,pitch)));
    const w=rocks.diagnostics().work.draw;jobs+=w.jobsStarted;units+=w.units;
  }
  assert.ok(jobs<=1,`${jobs} draw jobs started over 60 near-still frames`);
  // A real turn still re-keys: 0.01 rad starts a job and converges to the reference pass.
  const turned=view(yaw+.01,pitch);
  rocks.update(input(turned));
  assert.equal(rocks.diagnostics().work.draw.jobsStarted,1);
  flush(rocks,input(turned));
  assertParity(rocks,{name:'turned',eye:eye0,frusta:turned.frusta,shadow:null},'turned');
  rocks.dispose();
});
