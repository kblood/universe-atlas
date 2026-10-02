import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join,dirname} from 'node:path';
import {DETAIL_PERIOD_M,GROUND_ATLAS_BYTES,GROUND_PBR_REPEAT_M,GROUND_PBR_TEXTURE_BYTES,GROUND_RESOURCE_BYTES,groundPbrMaterialWeights,groundColor,groundFragmentHeader,groundNormalCode,groundRoughnessCode} from '../src/ground-material.ts';

const assetRoot=join(dirname(fileURLToPath(import.meta.url)),'..','assets','ground-materials-v1');
const sha256=(bytes)=>createHash('sha256').update(bytes).digest('hex');

test('PBR surface blending follows the existing soil and rock biome weights',()=>{
  assert.deepEqual(groundPbrMaterialWeights(.2,.3),{coverage:.5,rockMix:.6});
  assert.deepEqual(groundPbrMaterialWeights(0,0),{coverage:0,rockMix:0});
  assert.deepEqual(groundPbrMaterialWeights(-2,NaN),{coverage:0,rockMix:0});
  assert.deepEqual(groundPbrMaterialWeights(2,2),{coverage:1,rockMix:.5});
  // Sand (W.x) no longer samples the soil photograph; it keeps the atlas grain.
  assert.match(groundColor,/float groundSoilRockWeight=groundW\.y\+groundW\.z;/);
  assert.doesNotMatch(groundColor,/groundSoilRockWeight=groundW\.x/);
  assert.match(groundColor,/float groundPbrRockMix=groundW\.z\/max\(groundSoilRockWeight/);
  assert.match(groundColor,/min\(1\.0,groundSoilRockWeight\)/);
});

test('PBR texture periods align to the existing rebased local frame',()=>{
  assert.equal(DETAIL_PERIOD_M%GROUND_PBR_REPEAT_M,0);
  for(const anchor of [-8193.25,-4096,-.5,0,1.5,4097.25]){
    const local=(anchor%DETAIL_PERIOD_M+DETAIL_PERIOD_M)%DETAIL_PERIOD_M;
    const pbrPhase=local%GROUND_PBR_REPEAT_M;
    const rebased=((anchor%DETAIL_PERIOD_M+DETAIL_PERIOD_M)%DETAIL_PERIOD_M)%GROUND_PBR_REPEAT_M;
    assert.ok(Math.abs(pbrPhase-rebased)<1e-9);
  }
  assert.equal(GROUND_PBR_TEXTURE_BYTES,5_592_406);
  assert.equal(GROUND_RESOURCE_BYTES,GROUND_ATLAS_BYTES+GROUND_PBR_TEXTURE_BYTES);
  assert.equal(GROUND_ATLAS_BYTES,611_670,'terrain diagnostics retain existing CPU plus GPU mip accounting for the procedural atlas');
});

test('per-renderer terrain accounting includes the shared PBR set once as a conservative reserve',async()=>{
  const renderer=await readFile(join(dirname(fileURLToPath(import.meta.url)),'..','src','planet-renderer.ts'),'utf8');
  // Rock-owned bytes join the combined total, but the shared PBR set stays in GROUND_RESOURCE_BYTES only.
  const memory=await readFile(join(dirname(fileURLToPath(import.meta.url)),'..','src','renderer-memory.ts'),'utf8');
  assert.match(renderer,/accountedBytes:memory\.accountedBytes,/);assert.match(renderer,/reservedCombinedBytes:memory\.reservedCombinedBytes,/);
  assert.match(memory,/accountedBytes:p\.residentBytes\+GROUND_RESOURCE_BYTES\+p\.oceanNormalBytes\+p\.rockOwnedBytes,/);
  assert.match(memory,/reservedCombinedBytes:p\.residentBytes\+GROUND_RESOURCE_BYTES\+/);
  assert.equal(memory.match(/GROUND_RESOURCE_BYTES\+/g).length,2);
  assert.match(renderer,/groundAtlasBytes:GROUND_ATLAS_BYTES,groundPbrTextureBytes:GROUND_PBR_TEXTURE_BYTES/);
  assert.match(renderer,/groundPbrAccounting:'conservative per-renderer reserve; shared textures are loaded once'/);
});

test('PBR detail uses the current palette, surface wetness, and standard normal path',()=>{
  assert.match(groundFragmentHeader,/groundSoilColorRoughness,groundSoilNormal,groundRockColorRoughness,groundRockNormal/);
  assert.match(groundColor,/groundPbrFade=1\.0-smoothstep\(600\.0,1800\.0/);
  // Ratio detail around the photographs' own mean (planet-rocks precedent),
  // never an absolute .68 photo override of the climate palette.
  assert.doesNotMatch(groundColor,/mix\(groundAlbedo,mix\(groundSoilPbr\.rgb/);
  assert.match(groundColor,/groundAlbedo\*=mix\(vec3\(1\.0\),clamp\(groundPbrColor\.rgb\/max\(mix\(groundSoilMean\.rgb,groundRockMean\.rgb,groundPbrRockMix\),vec3\(\.03\)\),vec3\(\.45\),vec3\(1\.7\)\),\.68\*groundPbrMixWeight\);/);
  assert.match(groundRoughnessCode,/groundSurfaceWetness=clamp\(/);
  assert.match(groundRoughnessCode,/mix\(groundPbrDryRoughness,0\.28,groundSurfaceWetness\)/);
  assert.match(groundNormalCode,/normal=normalize\(mix\(normal,groundPbrViewNormal/);
  assert.match(groundColor,/groundPosition\/2\.0/);
});

test('packaged texture inputs and RGBA8 runtime maps match their provenance manifest',async()=>{
  const manifest=JSON.parse(await readFile(join(assetRoot,'ground-pbr-v1.asset.json'),'utf8'));
  const declared=new Map(manifest.content.files.map(file=>[file.path,file]));
  for(const material of manifest.technical.materials){
    for(const input of material.inputs){
      const file=declared.get(input.path),bytes=await readFile(join(assetRoot,input.path));
      assert.ok(file,`manifest includes ${input.path}`);
      assert.equal(bytes.length,file.bytes);
      assert.equal(sha256(bytes),file.sha256);
      assert.deepEqual(input.dimensionsPx,[1024,1024]);
    }
    for(const output of material.outputs){
      const file=declared.get(output.path),bytes=await readFile(join(assetRoot,output.path));
      assert.ok(file,`manifest includes ${output.path}`);
      assert.equal(bytes.length,file.bytes);
      assert.equal(sha256(bytes),file.sha256);
      assert.deepEqual(output.dimensions,[512,512]);
      assert.deepEqual([...bytes.subarray(0,8)],[137,80,78,71,13,10,26,10]);
      assert.equal(bytes.readUInt32BE(16),512);
      assert.equal(bytes.readUInt32BE(20),512);
      assert.equal(bytes[24],8,'runtime maps are 8-bit per channel');
      assert.equal(bytes[25],6,'runtime maps are RGBA');
    }
  }
  assert.equal(declared.size,10,'manifest records all six originals and four runtime maps');
  assert.equal(manifest.asset.license.expression,'CC0-1.0');
});

test('zero-weight ground fetches are skipped with explicit gradients from uniform control flow',()=>{
  // Gradients are computed once, outside every per-fragment branch.
  const gradients=groundColor.indexOf('vec3 groundDx=dFdx(groundPosition),groundDy=dFdy(groundPosition);');
  assert.ok(gradients>0);
  assert.ok(gradients<groundColor.indexOf('if(groundEnabled*groundPatch>.5&&groundFade>0.0)'));
  assert.ok(gradients<groundColor.indexOf('groundPbrMixWeight>0.0){'));
  // No implicit-derivative fetch remains in the ground chunks.
  assert.doesNotMatch(groundFragmentHeader+groundColor,/texture2D\(/);
  assert.equal((groundFragmentHeader.match(/textureGrad\(/g)??[]).length,9);
  // Soil and rock sets are fetched only where their mix weight is non-zero.
  assert.match(groundColor,/if\(groundPbrRockMix<1\.0\)\{\s*groundSoilPbr=/);
  assert.match(groundColor,/if\(groundPbrRockMix>0\.0\)\{\s*groundRockPbr=/);
  // The fine distance fade is exactly zero past 6000 m, and every detail term is scaled by it.
  assert.match(groundColor,/diffuseColor\.rgb=mix\(diffuseColor\.rgb,groundAlbedo\*\(\.82\+groundSignal\*\.32\),groundFade\);/);
  assert.match(groundColor,/\*groundFade;\s*$/);
});
