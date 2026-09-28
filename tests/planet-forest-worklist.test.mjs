import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createServer} from 'vite';

const vite=await createServer({configFile:false,optimizeDeps:{noDiscovery:true},server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
const {PlanetForest}=await vite.ssrLoadModule('/src/planet-forest.ts');
const {galaxies,refByAddress,system}=await vite.ssrLoadModule('/src/catalog.ts');
const body=system(refByAddress(galaxies('LETHRA-001')[0],'G001/C2128,0,1/0')).planets[1];
after(()=>vite.close());

const makeCell=(face,n,x,y,distanceM)=>{
  const angle=distanceM/body.radiusM;
  return {id:`${face}/${n}/${x}/${y}`,direction:[Math.sin(angle),0,Math.cos(angle)],roll:.2,heightM:16,yaw:.4,distanceM};
};
function fixture(){
  const f=new PlanetForest(body),eye=new THREE.Vector3(0,0,1+20/body.radiusM),notes=[];
  f.water=0;f.center.set(0,0,1);
  const nearGroups=[0,1,2,3].map(face=>Array.from({length:64},(_,i)=>makeCell(face,256,i%8,Math.floor(i/8),50)));
  const far=Array.from({length:64},(_,i)=>makeCell(4,256,i%8,Math.floor(i/8),800));
  const cells=[];
  for(let i=0;i<64;i++)for(let group=0;group<nearGroups.length;group++){
    cells.push(nearGroups[group][i]);if(group===1)cells.push(far[i]);
  }
  f.wanted=cells;
  for(const cell of cells)f.cache.set(cell.id,{cell,height:0,present:true,water:0});
  let valid=true,revision=0;
  f.fullCanopy={group:new THREE.Group(),prepare(){},finish(){},observeClose(){},
    currentPatch:()=>valid,noteNear(id){notes.push(id);},canHandoff:()=>false,own(){},diagnostics(){return{};},
    currentPatchRevision:()=>revision,dispose(){}};
  const step=(water=0,date=0n)=>f.update(eye,[0,0,1],20,true,water,false,[],date);
  return {f,eye,cells,far,nearGroups,notes,step,setValid(value){valid=value;revision++;},bumpRevision(){revision++;}};
}

test('owned far patches reduce per-cell work while preserving canonical capacity winners',()=>{
  const {f,cells,far,nearGroups,notes,step}=fixture();
  const nearIds=nearGroups.flatMap(group=>group.map(cell=>cell.id));
  const canonicalNear=cells.filter(cell=>!far.some(item=>item.id===cell.id)).map(cell=>cell.id);
  try{
    step(0,100n);
    assert.deepEqual(notes,canonicalNear,'near notes retain the input selection order after far-patch omission');
    assert.deepEqual(f.updates[0].residents.map(r=>r.cell.id),canonicalNear.slice(0,192),'near-capacity winners match the unfiltered canonical loop');
    assert.deepEqual(f.updates[1].residents.map(r=>r.cell.id),canonicalNear.slice(192),'overflow residents keep their original middle-batch order');
    assert.equal(f.diagnostics().farOwnedSkipped,far.length);
    assert.equal(f.diagnostics().farWork.activeCells,nearIds.length);
    assert.equal(f.diagnostics().farWork.patchGroups,5);
    const rebuilds=f.diagnostics().farWork.refreshes;
    notes.length=0;step(0,0n);
    assert.equal(f.diagnostics().farWork.refreshes,rebuilds,'date changes do not rebuild the spatial work list');
    assert.deepEqual(notes,canonicalNear,'date replay preserves the exact eligible resident sequence');
  }finally{f.dispose();}
});

test('movement stays safe within the cached 20m margin and crossing it refreshes at the 650m cutoff',()=>{
  const {f,eye,cells,far,notes,step}=fixture();
  try{
    step();assert.equal(f.diagnostics().farOwnedSkipped,far.length);
    eye.x=19/body.radiusM;notes.length=0;step();
    assert.equal(f.diagnostics().farOwnedSkipped,far.length,'the 670m reference bound stays beyond 650m after a sub-margin move');
    assert.equal(f.diagnostics().farWork.refreshes,1);
    eye.x=151/body.radiusM;notes.length=0;step();
    assert.equal(f.diagnostics().farOwnedSkipped,0,'crossing the 20m cache margin recomputes conservative bounds');
    assert.deepEqual(notes,cells.map(cell=>cell.id),'newly near far-band cells rejoin in canonical order');
    assert.ok(f.diagnostics().farWork.refreshes>=2);
    eye.set(0,0,1+20/body.radiusM);notes.length=0;step();
    assert.equal(f.diagnostics().farOwnedSkipped,far.length);
    assert.equal(f.diagnostics().near,192,'near hysteresis/capacity winners recover after returning to the original observer');
  }finally{f.dispose();}
});

test('census loss and stale water reintroduce fallback work immediately',()=>{
  const {f,eye,cells,far,notes,step,setValid}=fixture();
  try{
    step();assert.equal(f.diagnostics().farOwnedSkipped,far.length);
    setValid(false);notes.length=0;step();
    assert.equal(f.diagnostics().farOwnedSkipped,0);assert.deepEqual(notes,cells.map(cell=>cell.id));
    setValid(true);notes.length=0;step();assert.equal(f.diagnostics().farOwnedSkipped,far.length);
    notes.length=0;step(5,1n);
    const rootDistance=cell=>new THREE.Vector3(...cell.direction).multiplyScalar(1+f.cache.get(cell.id).height/body.radiusM).distanceTo(eye)*body.radiusM;
    const freshFar=cells.filter(cell=>f.cache.get(cell.id).water===5&&rootDistance(cell)>=650);
    const expectedNotes=cells.filter(cell=>f.cache.get(cell.id).water!==5||rootDistance(cell)<650).map(cell=>cell.id);
    assert.equal(f.diagnostics().farWork.skippedCells,0,'water invalidation clears the retained patch skip set');
    assert.equal(f.diagnostics().farOwnedSkipped,freshFar.length,'only newly refreshed residents may use the unchanged per-cell ownership gate');
    assert.deepEqual(notes,expectedNotes,'stale residents stay on the immediate fallback path in original selection order');
    assert.equal(f.diagnostics().detailedTrees.dateNs,'1');
  }finally{f.dispose();}
});
