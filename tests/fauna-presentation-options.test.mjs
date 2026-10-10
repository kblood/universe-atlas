import test from 'node:test';
import assert from 'node:assert/strict';
import {faunaPresentationOptions} from '../src/fauna-presentation-options.ts';

test('ordinary desktop options select float source LOD and bark sharing, with experiments disabled',()=>{
  assert.deepEqual(faunaPresentationOptions(''),{lodMode:'float',bodyPresentation:'sculpted-v1',forestBarkSharing:true,profile:false,paletteUploadMode:'full'});
});
test('LOD and bark opt-outs are independent and captured options survive URL normalization',()=>{
  let search='?fauna-lod-prototype=off&forest-bark-sharing=0';const captured=faunaPresentationOptions(search);search='?g=canonical';
  assert.equal(captured.lodMode,'off');assert.equal(captured.forestBarkSharing,false);assert.ok(Object.isFrozen(captured));
  assert.equal(faunaPresentationOptions('?fauna-lod-prototype=off').forestBarkSharing,true);
  assert.equal(faunaPresentationOptions('?forest-bark-sharing=0').lodMode,'float');assert.equal(faunaPresentationOptions('?fauna-lod-prototype=0').lodMode,'off');
});
test('packed/row/profile experiments require explicit diagnostic flags',()=>{
  assert.deepEqual(faunaPresentationOptions('?fauna-lod-prototype=packed&fauna-lod-upload=rows&fauna-lod-profile=1'),{lodMode:'packed',bodyPresentation:'sculpted-v1',forestBarkSharing:true,profile:true,paletteUploadMode:'adaptive-rows'});
  assert.equal(faunaPresentationOptions('?fauna-lod-prototype=unknown').lodMode,'float');
});

test('legacy anatomy opt-out does not disable LOD and remains fixed for the page session',()=>{
  const options=faunaPresentationOptions('?fauna-body=legacy-v4');
  assert.equal(options.bodyPresentation,'legacy-v4');assert.equal(options.lodMode,'float');assert.ok(Object.isFrozen(options));
});
