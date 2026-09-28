import test from 'node:test';
import assert from 'node:assert/strict';
import {ForestAssetAttachment} from '../src/forest-asset-attachment.ts';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
function target(){return {loads:[],clears:0,async loadForestTreeFamilies(inputs){this.loads.push(inputs);return true;},clearForestTreeAssets(){this.clears++;}};}
const bundle={version:'one',bytes:10,inputs:[{kind:'branching'},{kind:'spire'}]};
test('one planet loads once and leaving retains the shared byte source',async()=>{
  let loads=0,clears=0;const source={async load(){loads++;return bundle;},clear(){clears++;}},view=target(),attachment=new ForestAssetAttachment(source);
  attachment.update(view,true);attachment.update(view,true);await tick();
  assert.equal(loads,1);assert.equal(view.loads[0],bundle.inputs);assert.equal(attachment.diagnostics().ready,true);
  attachment.update(null,true);assert.equal(clears,0);assert.equal(view.clears,1);
  attachment.update(view,true);await tick();assert.equal(view.loads.length,2);
  attachment.update(view,false);assert.equal(clears,1);assert.equal(attachment.diagnostics().ready,false);
});
test('changing planets during transfer cannot install into the departed planet',async()=>{
  const pending=deferred(),a=target(),b=target(),attachment=new ForestAssetAttachment({load:()=>pending.promise,clear(){}});
  attachment.update(a,true);attachment.update(b,true);pending.resolve(bundle);await tick();
  assert.equal(a.loads.length,0);assert.equal(b.loads.length,1);assert.equal(a.clears,1);
});
test('disabling during parse clears staged adoption and ignores its completion',async()=>{
  const parse=deferred(),view=target();view.loadForestTreeFamilies=()=>parse.promise;
  const attachment=new ForestAssetAttachment({load:async()=>bundle,clear(){}});
  attachment.update(view,true);await tick();attachment.update(view,false);parse.resolve(true);await tick();
  assert.equal(view.clears,1);assert.deepEqual(attachment.diagnostics(),{enabled:false,loading:false,ready:false,error:''});
});
test('failure keeps the fallback active and explicit retry may succeed',async()=>{
  let attempts=0;const view=target(),attachment=new ForestAssetAttachment({async load(){if(++attempts===1)throw new Error('network');return bundle;},clear(){}});
  attachment.update(view,true);await tick();assert.match(attachment.diagnostics().error,/network/);assert.equal(view.loads.length,0);
  attachment.retry();await tick();assert.equal(attachment.diagnostics().ready,true);assert.equal(attachment.diagnostics().error,'');
});
