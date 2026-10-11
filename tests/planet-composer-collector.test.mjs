import test from 'node:test';
import assert from 'node:assert/strict';
import {browserContentDigest} from './helpers/planet-browser-digest.mjs';
import {existsSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const localReceipt=new URL('../src/fauna-composer-build-receipt.ts',import.meta.url),receiptModule=existsSync(localReceipt)?localReceipt:pathToFileURL(resolve(process.env.PLANET_COMPOSER_PRODUCTION_ROOT??'C:/LLM/IWSDK/universe-atlas-wt/planet-composer-integration','src/fauna-composer-build-receipt.ts'));
const {composerContentDigest}=await import(receiptModule.href);
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

test('packed crisp coat preserves the 0â€“2 domain and exact sample coordinates',()=>{
 const source={positions:[0,0,0],colors:[1.6,1.6,1.6],skinIndex:[0,0,0,0],skinWeight:[1,0,0,0],gloss:[.5],coatLayers:{c0:[1.6,1.6,1.6],c1:[1.6,1.6,1.6],c2:[1.6,1.6,1.6],sample:[1.2,-.4,.7,0]}};
 const skin={...source,storage:{version:'composer-arena-packed-1'},colors:[52428,52428,52428],skinWeight:[65535,0,0,0],gloss:[128],coatLayers:{c0:[52428,52428,52428],c1:[52428,52428,52428],c2:[52428,52428,52428],sample:[1.2,-.4,.7,0]}};
 assert.equal(auditStoredSourceMap(skin,source).coatLayerError,0);
 const layer=structuredClone(skin);layer.coatLayers.c1[0]=50000;assert.throws(()=>auditStoredSourceMap(layer,source));
 const sample=structuredClone(skin);sample.coatLayers.sample[0]+=1e-6;assert.throws(()=>auditStoredSourceMap(sample,source));
});

test('browser typed descriptor hashing matches recursively canonical receipt',async()=>{const payload={z:new Float32Array([1,2,3]),a:{weights:new Uint16Array([32768,32767])}};assert.equal(await browserContentDigest(payload),contentDigest(payload));});
test('declared production digest ignores key order and detects one changed byte',async()=>{
 const buffer=new Uint8Array([9,1,2,3,4,9]),payload={z:buffer.subarray(1,5),a:new Float32Array([1,2,3])},reordered={a:payload.a,z:payload.z};
 const expected=await composerContentDigest(payload);assert.equal(expected,contentDigest(payload));assert.equal(await browserContentDigest(payload),expected);assert.equal(await browserContentDigest(reordered),expected);
 const changed={...payload,z:Uint8Array.from(payload.z)};changed.z[2]^=1;assert.notEqual(await browserContentDigest(changed),expected);assert.equal(await browserContentDigest(changed),await composerContentDigest(changed));
});

test('receipt accepts repeated plain references without classifying them as cycles',async()=>{const shared={coefficient:2,view:new Uint8Array([1,2])},payload=[shared,shared];assert.equal(await browserContentDigest(payload),await composerContentDigest(payload));});

import {stringifyTransport,parseTransport,evaluateJson} from './helpers/planet-json-transport.mjs';
test('JSON string bridge preserves source bytes, graph numbers and text',async()=>{
 const original=new Float32Array([-0,1.8e-15,Math.PI,0]),input={graph:{root:[-0,Infinity,-Infinity,NaN],text:'DNA\n\u00e6\ud83d\udc3e'},source:Array.from(original.subarray(0,3))};
 const restored=parseTransport(stringifyTransport(input));assert.deepEqual(restored,input);
 assert.equal(contentDigest(new Float32Array(restored.source)),contentDigest(original.subarray(0,3)));
 const fakePage={evaluate:async expression=>(0,eval)(expression)};
 const result=await evaluateJson(fakePage,x=>({graph:x.graph,source:x.source}),input);assert.deepEqual(result,input);
 assert.equal(contentDigest(new Float32Array(result.source)),contentDigest(original.subarray(0,3)));
});

import {observerMoveIntent} from './helpers/planet-composer-collector.mjs';
test('observer movement preserves actual near-camera clearance instead of lifting80m',()=>{const camera={position:[100,200,300],heading:[0,0,0,1],clearanceM:8.000007};const intent=observerMoveIntent(camera);assert.deepEqual(intent,{position:[110,200,300],heading:[0,0,0,1],clearanceM:8.000007});assert.deepEqual(camera.position,[100,200,300]);assert.throws(()=>observerMoveIntent({...camera,clearanceM:undefined}));});

import {chooseProjectedSource} from './helpers/planet-composer-collector.mjs';
test('source hero uses actual posed projection and rejects wholly offscreen near set',()=>{const off={id:'off',x:0,right:-100,y:0,bottom:100},small={id:'small',x:0,right:20,y:0,bottom:20},body={id:'body',x:600,right:900,y:300,bottom:600};assert.equal(chooseProjectedSource([off,small,body]).id,'body');assert.throws(()=>chooseProjectedSource([off]));});

import {openOrdinaryAnimalFinder} from './helpers/planet-composer-collector.mjs';
test('planet revisit reaches galaxy breadcrumb before ordinary Finder',async()=>{
 const events=[],page={locator:selector=>({isVisible:async()=>false,click:async()=>events.push(selector)}),waitForFunction:async()=>events.push('wait')};
 await openOrdinaryAnimalFinder(page);assert.deepEqual(events,['#breadcrumbs [data-level="galaxy"]','wait','#find-animal-worlds','wait']);
});

import {waitOrdinaryNavigation} from './helpers/planet-composer-collector.mjs';
test('ordinary navigation waits for selected body and finished asynchronous transition',async()=>{
 const prior=globalThis.window;globalThis.window={__atlas:{ready:true,state:{level:'body',body:{id:'other'}},transition:{active:true,retainedViews:0}}};
 try{const page={waitForFunction:async(fn,arg)=>{assert.equal(fn(arg),false);window.__atlas.transition.active=false;assert.equal(fn(arg),true);window.__atlas.state.body.id='late-old';assert.equal(fn(arg),false);}};await waitOrdinaryNavigation(page,'body','other');}finally{globalThis.window=prior;}
});
