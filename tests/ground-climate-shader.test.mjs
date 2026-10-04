// W1-D-GROUND-SHADER: climate becomes visible at walking height through the
// existing ground shader (ratio-detail PBR, sand off the soil photo, turf gated
// by the climate macro colour, cool snow) with no new texture or attribute.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {groundColor,groundFragmentHeader,groundNormalCode,groundRoughnessCode,GROUND_PBR_TEXTURE_BYTES,GROUND_ATLAS_BYTES,GROUND_PBR_REPEAT_M,DETAIL_PERIOD_M,MATERIAL_VERSION} from '../src/ground-material.ts';
import {temperateHabitat} from '../src/surface-climate.ts';

const renderer=readFileSync(new URL('../src/planet-renderer.ts',import.meta.url),'utf8');
const FETCH=/\b(?:texture|textureGrad|textureLod|texture2D|textureLodEXT|texelFetch)\(/g;
const fetches=source=>(source.match(FETCH)??[]).length;

/** Worst-path fragment fetch count read from the GLSL text: every direct
 * fetch in the per-fragment chunks, plus each helper call times the fetches
 * inside that helper's body (all branches taken). */
function worstPathFetches(){
  const helpers=new Map();
  for(const m of groundFragmentHeader.matchAll(/\n(?:vec[34]|float)\s+(\w+)\(([^)]*)\)\{/g)){
    let depth=0,i=groundFragmentHeader.indexOf('{',m.index);const start=i;
    for(;i<groundFragmentHeader.length;i++){const c=groundFragmentHeader[i];if(c==='{')depth++;else if(c==='}'&&--depth===0)break;}
    helpers.set(m[1],fetches(groundFragmentHeader.slice(start,i+1)));
  }
  const chunks=groundColor+groundRoughnessCode+groundNormalCode;
  let total=fetches(chunks);
  for(const [name,count] of helpers){
    const calls=(chunks.match(new RegExp(`\\b${name}\\(`,'g'))??[]).length;
    total+=calls*count;
  }
  return {total,helpers:Object.fromEntries(helpers)};
}

test('worst-path ground fragment fetches stay within the 23-fetch budget',()=>{
  const {total,helpers}=worstPathFetches();
  assert.deepEqual(helpers,{groundTri:3,groundPbrTri:3,groundPbrNormalAxisX:0,groundPbrNormalAxisY:0,groundPbrNormalAxisZ:0,groundPbrTriNormal:3});
  // 3 atlas triplanar sets (9) + soil/rock colour (6) + soil/rock normal (6) = 21 before,
  // + the two 1x1-mip means inside the PBR band = 23.
  assert.equal(total,23);
  assert.ok(total<=23);
  assert.equal((groundColor.match(/textureLod\(/g)??[]).length,2);
});

test('the two mean fetches sit only where their photograph is already sampled',()=>{
  const band=groundColor.indexOf('groundPbrMixWeight>0.0){');
  assert.ok(band>0);
  const soil=/if\(groundPbrRockMix<1\.0\)\{\s*groundSoilPbr=groundPbrTri\(groundSoilColorRoughness[^;]*;\s*groundSoilMean=textureLod\(groundSoilColorRoughness,vec2\(\.5\),16\.0\);/;
  const rock=/if\(groundPbrRockMix>0\.0\)\{\s*groundRockPbr=groundPbrTri\(groundRockColorRoughness[^;]*;\s*groundRockMean=textureLod\(groundRockColorRoughness,vec2\(\.5\),16\.0\);/;
  assert.match(groundColor,soil);assert.match(groundColor,rock);
  for(const m of groundColor.matchAll(/textureLod\(/g))assert.ok(m.index>band,'mean fetch is inside the PBR band branch');
  // Unsampled means keep a neutral default and are weighted out by groundPbrRockMix.
  assert.match(groundColor,/groundSoilMean=vec4\(1\.0\),groundRockMean=vec4\(1\.0\)/);
});

test('PBR is ratio detail around the photograph mean, never an absolute override',()=>{
  assert.match(groundColor,/groundAlbedo\*=mix\(vec3\(1\.0\),clamp\(groundPbrColor\.rgb\/max\(mix\(groundSoilMean\.rgb,groundRockMean\.rgb,groundPbrRockMix\),vec3\(\.03\)\),vec3\(\.45\),vec3\(1\.7\)\),\.68\*groundPbrMixWeight\);/);
  assert.doesNotMatch(groundColor,/groundAlbedo=mix\(groundAlbedo,mix\(groundSoilPbr/);
  // The roughness path is unchanged.
  assert.match(groundRoughnessCode,/groundPbrDryRoughness=mix\(groundBiomeRoughness,groundPbrRoughness,\.68\*groundPbrMixWeight\)/);
  // Ratio of the mean to itself is neutral: a photograph texel equal to its mean leaves the palette untouched.
  const ratio=(c,m)=>Math.min(1.7,Math.max(.45,c/Math.max(m,.03)));
  assert.equal(ratio(.3,.3),1);assert.equal(ratio(0,.3),.45);assert.equal(ratio(.9,.3),1.7);
});

test('sand keeps atlas grain only; turf and dry straw follow the climate macro colour',()=>{
  assert.match(groundColor,/float groundSoilRockWeight=groundW\.y\+groundW\.z;/);
  // Deliberate deviation from the plan's smoothstep(.02,.10): the measured olive
  // dry-upland macro colour (sRGB 100,110,64) has a linear green margin of .19,
  // which the plan's window would have grown into full turf. (.12,.40) keeps it
  // dry while moist lowland/coast colours (.55-.71) still grow full turf.
  assert.match(groundColor,/float greenness=smoothstep\(\.12,\.40,\(diffuseColor\.g-max\(diffuseColor\.r,diffuseColor\.b\)\)\/max\(diffuseColor\.g,\.001\)\);/);
  assert.match(groundColor,/float turf=groundHabitat\*groundW\.y\*smoothstep\(\.40,\.61,groundMacro\.r\)\*greenness;/);
  assert.match(groundColor,/float dryness=groundHabitat\*groundW\.y\*\(1\.0-greenness\)\*smoothstep\(\.25,\.50,/);
  // greenness and dryness read the map colour before the ground chunk rewrites diffuseColor.
  assert.ok(groundColor.indexOf('float greenness=')<groundColor.indexOf('diffuseColor.rgb=mix('));
  assert.ok(groundColor.indexOf('float dryness=')<groundColor.indexOf('diffuseColor.rgb=mix('));
  // Beach sand on habitable worlds only; other worlds keep their macro sand colour.
  assert.match(groundColor,/groundAlbedo=mix\(groundAlbedo,vec3\(\.46,\.38,\.25\)\*mix\(\.90,1\.08,groundMacro\.a\),groundHabitat\*smoothstep\(0\.0,\.6,groundW\.x\)\);/);
  const smooth=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};
  const lin=c=>{c/=255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;};
  const field=srgb=>{const [r,g,b]=srgb.map(lin),mx=Math.max(r,g,b),mn=Math.min(r,g,b);
    const greenness=smooth(.12,.40,(g-Math.max(r,b))/Math.max(g,.001));
    return {greenness,dryness:(1-greenness)*smooth(.25,.50,(mx-mn)/Math.max(mx,.001))};};
  // Macro colours measured at the fixed audit sites (terrain-1.6.0 and W1-B's terrain-1.7.0 agree here).
  const lowland=field([40,89,48]),coast=field([77,114,69]),dry=field([100,110,64]),snow=field([207,218,216]),brown=field([120,95,60]);
  assert.ok(lowland.greenness===1&&lowland.dryness===0,'equator lowland: full turf, no straw');
  assert.ok(coast.greenness===1&&coast.dryness===0,'coast soil: turf (sand covers it by weight)');
  assert.ok(dry.greenness<.2&&dry.dryness>.8,'olive dry upland: dries to straw, little turf');
  assert.ok(snow.greenness===0&&snow.dryness===0,'near-white snow: neither turf nor straw');
  assert.ok(brown.greenness===0&&brown.dryness===1,'saturated brown soil on a habitable world: straw');
});

test('snow is tinted slightly cool and the pebble/sand atlas terms are kept',()=>{
  assert.match(groundColor,/groundAlbedo=mix\(groundAlbedo,groundAlbedo\*vec3\(\.96,\.98,1\.02\),groundW\.w\);/);
  assert.match(groundColor,/float pebble=smoothstep\(\.63,\.84,groundFine\.g\)\*\(groundW\.x\*\.35\+groundW\.y\*\.12\);/);
});

test('renderer habitat uniform uses the shared climate gate and the bumped cache key',()=>{
  assert.match(renderer,/shader\.uniforms\.groundHabitat=\{value:temperateHabitat\(this\.body\)\?1:0\};/);
  assert.match(renderer,/material\.customProgramCacheKey = \(\) => 'planet-patch-ground-bed-v12\/'\+LOCAL_AERIAL_VERSION\+'\/ground-pbr-v2-climate';/);
  assert.doesNotMatch(renderer,/planet-patch-ground-bed-v10/);
  // The previous inline gate, value for value.
  const legacy=b=>b.water>0&&b.temperatureK>=250&&b.temperatureK<=325&&b.type!=='Ice world'&&b.type!=='Volcanic world'?1:0;
  for(const type of ['Oceanic world','Rocky world','Ice world','Volcanic world','Gas giant','Desert world'])
    for(const water of [0,1e-9,.415,1])for(const temperatureK of [100,249.999,250,284,325,325.001,600])
      assert.equal(temperateHabitat({type,water,temperatureK})?1:0,legacy({type,water,temperatureK}));
});

test('byte pins, periods and the atlas seed are unchanged',()=>{
  assert.equal(GROUND_PBR_TEXTURE_BYTES,5_592_406);
  assert.equal(GROUND_ATLAS_BYTES,611_670);
  assert.equal(DETAIL_PERIOD_M%GROUND_PBR_REPEAT_M,0);
  assert.equal(GROUND_PBR_REPEAT_M,2);
  assert.equal(MATERIAL_VERSION,'ground-material-1','MATERIAL_VERSION seeds the procedural atlas and must not move');
  assert.match(groundColor,/groundPbrFade=1\.0-smoothstep\(600\.0,1800\.0/);
  assert.match(groundRoughnessCode,/mix\(groundPbrDryRoughness,0\.28,groundSurfaceWetness\)/);
});
