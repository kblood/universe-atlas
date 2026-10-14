import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createServer} from 'vite';
import {ForestTreeFamilyLibrary} from '#tree-kit/v1/instances';

const vite=await createServer({configFile:false,optimizeDeps:{noDiscovery:true},server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
const {PlanetForest}=await vite.ssrLoadModule('/src/planet-forest.ts');
const {galaxies,refByAddress,system}=await vite.ssrLoadModule('/src/catalog.ts');
const body=system(refByAddress(galaxies('LETHRA-001')[0],'G001/C2128,0,1/0')).planets[1];
after(()=>vite.close());

test('the game family library enables the mip-aware foliage cutoff only for sidecar MASK foliage',async()=>{
  const received=[];
  const loader=async(_a,_b,options)=>{received.push(options);return {forestCoverage:true,maxRadiusM:10,setDate(){},
    createBatch(){return {group:new THREE.Group(),dispose(){}};},dispose(){}};};
  const library=new ForestTreeFamilyLibrary(new THREE.Group(),loader,x=>x,[2,2]);
  const input=(foliageMipSidecar)=>[{kind:'spire',lod0:new ArrayBuffer(0),lod1:new ArrayBuffer(0),foliageMipSidecar}];
  try{
    await library.replace(input({manifest:{},data:new ArrayBuffer(0)}));
    await library.replace(input(undefined));
    await library.replace(input({manifest:{},data:new ArrayBuffer(0)}),{foliageCoverage:'hash'});
    await library.replace(input({manifest:{},data:new ArrayBuffer(0)}),{foliageLodCutoff:false});
    assert.deepEqual(received.map(o=>o.foliageLodCutoff),[true,false,false,false]);
  }finally{library.dispose();}
});

test('forest hand-off probe validates its radius and restores material writes',()=>{
  const f=new PlanetForest(body);
  try{
    assert.deepEqual(f.setDebug({}),{middleHandoffM:null,hideColour:false});
    for(const bad of [109,651,Number.NaN,Infinity])assert.throws(()=>f.setDebug({middleHandoffM:bad}),/hand-off/);
    assert.equal(f.setDebug({middleHandoffM:250}).middleHandoffM,250);
    assert.equal(f.setDebug({middleHandoffM:null}).middleHandoffM,null);
    const material=new THREE.MeshBasicMaterial();material.depthWrite=false;
    const mesh=new THREE.Mesh(new THREE.BufferGeometry(),material);f.group.add(mesh);
    assert.equal(f.setDebug({hideColour:true}).hideColour,true);
    assert.equal(material.colorWrite,false);assert.equal(material.depthWrite,false);
    f.setDebug({hideColour:false});
    assert.equal(material.colorWrite,true);assert.equal(material.depthWrite,false,'restores the original flags, not true');
    mesh.removeFromParent();
  }finally{f.dispose();}
});
