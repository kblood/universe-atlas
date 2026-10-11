import test from 'node:test';
import assert from 'node:assert/strict';
import {contentDigest,decodeStored,auditStoredSourceMap} from './helpers/planet-composer-collector.mjs';

test('content receipt binds typed-array type and actual view bytes',()=>{
 const a=new Float32Array([1,2,3]),b=new Float32Array([9,1,2,3,9]);
 assert.equal(contentDigest(a),contentDigest(b.subarray(1,4)));
 assert.notEqual(contentDigest(a),contentDigest(new Uint32Array(a.buffer)));
 assert.notEqual(contentDigest(a),contentDigest(new Float32Array([1,2,4])));
 assert.equal(contentDigest({b:a,a:1}),contentDigest({a:1,b:a}));
});
test('packed decoder follows normalized attributes and renormalized weights',()=>{
 const skin={storage:{version:'composer-arena-packed-1'},normals:new Int16Array([-32768,32767]),colors:new Uint16Array([32768]),skinWeight:new Uint16Array([16384,49151,0,0]),gloss:new Uint8Array([255])};
 assert.equal(decodeStored(skin,'normals',0),-1);assert.equal(decodeStored(skin,'normals',1),1);
 assert.equal(decodeStored(skin,'colors',0),32768/65535*2);assert.equal(decodeStored(skin,'skinWeight',0)+decodeStored(skin,'skinWeight',1),1);assert.equal(decodeStored(skin,'gloss',0),1);
});
test('stored LOD evidence checks actual positions, colour, joints and retained source map',()=>{
 const source={positions:new Float32Array([0,0,0,1,2,3]),colors:new Float32Array([0,0,0,1,1,1]),skinIndex:new Uint16Array([0,0,0,0,3,0,0,0]),skinWeight:new Float32Array([1,0,0,0,1,0,0,0]),coatLayers:null};
 const skin={storage:{version:'composer-arena-packed-1'},sourceVertex:[1],positions:[1,2,3],colors:[32768,32768,32768],skinIndex:[3,0,0,0],skinWeight:[65535,0,0,0],coatLayers:null};
 assert.equal(auditStoredSourceMap(skin,source).positionError,0);
 assert.throws(()=>auditStoredSourceMap({...skin,skinIndex:[2,0,0,0]},source),/joint source/);
 assert.throws(()=>auditStoredSourceMap({...skin,sourceVertex:[9]},source));
 assert.equal(auditStoredSourceMap({...skin,positions:[1.02,2,3]},source).positionError,.020000000000000018);
});
