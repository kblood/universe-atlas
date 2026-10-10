import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as THREE from 'three';
import {ExplorationClockStep} from '../src/exploration-clock-step.ts';
import {advanceDate,CATALOGUE_EPOCH_NS,UNIVERSE_END_NS} from '../src/world-time.ts';
import {galaxies,sector,system,bodyPosition} from '../src/catalog.ts';
const main=readFileSync(new URL('../src/main.ts',import.meta.url),'utf8');
const source=main.slice(main.indexOf('function updateExplorationClock('),main.indexOf('function updateFlight('));
const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext}}).outputText;
const sys=system(sector(galaxies('LETHRA-001')[0],[266,0,0]).refs[0]),body=sys.planets[0];
function fixture(){
  const context={ready:true,flight:true,explorationPaused:false,playing:false,renderer:{xr:{isPresenting:false}},epoch:CATALOGUE_EPOCH_NS,
    state:{body,sys},residentSystem:true,explorationClockStep:new ExplorationClockStep(),advanceDate,UNIVERSE_END_NS,
    alternateFuture:()=>null,vec:a=>new THREE.Vector3().fromArray(a),bodyPosition,systemOrigin:new THREE.Vector3(),positions:0,seeks:0,
    lifecycleFor:()=>({kind:'planet',lc:{},starLc:{}}),planetStateAt:()=>({stage:'current'}),
    positionSystem(){context.positions++;},seekDate(date){context.seeks++;context.epoch=date;}};
  vm.createContext(context);vm.runInContext(code,context);return context;
}
test('absent hook preserves normal date arithmetic and body-orbit translation',()=>{
  const f=fixture();
  for(const dt of [.016,0,.023456789,.1]){const before=f.epoch,old=bodyPosition(body,sys,before),origin=f.systemOrigin.clone(),expected=advanceDate(before,dt);f.updateExplorationClock(dt);
    assert.equal(f.epoch,expected);const translated=origin.add(new THREE.Vector3().fromArray(bodyPosition(body,sys,expected)).sub(new THREE.Vector3().fromArray(old)));assert.deepEqual(f.systemOrigin.toArray(),translated.toArray());}
  assert.equal(f.explorationClockStep.snapshot().ticks,0);
});
test('180 bounded exact simulation ticks keep real dt untouched and then hold, without public seeking',()=>{
  const f=fixture(),start=f.epoch;f.explorationClockStep.configure('1000000');
  for(let i=1;i<=180;i++){const old=f.epoch,origin=f.systemOrigin.clone();f.updateExplorationClock(i%2?.2:.005);assert.equal(f.epoch,start+BigInt(i)*1000000n);
    const shift=new THREE.Vector3().fromArray(bodyPosition(body,sys,f.epoch)).sub(new THREE.Vector3().fromArray(bodyPosition(body,sys,old)));assert.deepEqual(f.systemOrigin.toArray(),origin.add(shift).toArray());}
  assert.equal(f.seeks,0);assert.equal(f.positions,180);assert.equal(f.explorationPaused,false);
  const snapshot=f.explorationClockStep.snapshot();assert.deepEqual(snapshot,{stepNs:'1000000',ticks:180,maxTicks:180,startEpochNs:start.toString(),endEpochNs:f.epoch.toString(),held:true});
  for(let i=0;i<4;i++)f.updateExplorationClock(.1);assert.equal(f.epoch,start+180000000n);assert.equal(f.positions,180);
});
test('pause/XR guards do not consume ticks; null reset restores normal clock; lifecycle boundary still uses existing seek path',()=>{
  const f=fixture();f.explorationClockStep.configure('1000000');f.explorationPaused=true;f.updateExplorationClock(.2);assert.equal(f.explorationClockStep.snapshot().ticks,0);
  f.explorationPaused=false;f.renderer.xr.isPresenting=true;f.updateExplorationClock(.2);assert.equal(f.explorationClockStep.snapshot().ticks,0);f.renderer.xr.isPresenting=false;
  const before=f.epoch;f.planetStateAt=(_lc,_star,date)=>({stage:date===before?'before':'after'});f.updateExplorationClock(.2);assert.equal(f.seeks,1);assert.equal(f.epoch,before+1000000n);assert.equal(f.explorationClockStep.snapshot().ticks,1);
  f.planetStateAt=()=>({stage:'current'});f.explorationPaused=true;f.explorationClockStep.configure(null);assert.equal(f.explorationClockStep.snapshot().ticks,0);const date=f.epoch;f.updateExplorationClock(.02);assert.equal(f.epoch,date,'null reset preserves explicit user pause');f.explorationPaused=false;f.updateExplorationClock(.02);assert.equal(f.epoch,advanceDate(date,.02));
});
test('invalid diagnostic inputs fail without changing the configured clock',()=>{
  const clock=new ExplorationClockStep();clock.configure('1000000');const before=clock.snapshot();
  for(const step of ['-1','1.5','1000000001',' 1','x',1])assert.throws(()=>clock.configure(step));
  for(const maxTicks of [0,1.5,10001,Infinity])assert.throws(()=>clock.configure('1',maxTicks));assert.deepEqual(clock.snapshot(),before);
});
