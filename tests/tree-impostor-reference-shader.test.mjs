import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {ShaderLib} from 'three';
import {adaptImpostorShader,auditImpostorShader,liveGlsl} from '../src/tree-impostor-reference-shader.ts';

const appBundlePath=new URL('../src/vendor/three-ez-impostor/impostor-reference.js',import.meta.url);
const appManifestPath=new URL('../src/vendor/three-ez-impostor/reference-manifest.json',import.meta.url);
const baseShader=()=>({
  vertexShader:'uniform mat4 impostorTransform;\nvoid main() {\n  gl_Position = impostorTransform * vec4(0.0);\n}',
  fragmentShader:'void main() {\n  vec4 blendedColor = vec4(1.0);\n  #include <map_fragment>\n  // #include <normal_fragment_maps>\n}',
});

test('audits a pinned Three MeshStandard shader and repairs only live hooks',async()=>{
  const bundledSource=await readFile(appBundlePath,'utf8'),manifest=JSON.parse(await readFile(appManifestPath,'utf8'));
  const bundledShader=name=>{
    const prefix=`var ${name} = `,start=bundledSource.indexOf(prefix)+prefix.length;
    assert.ok(start>=prefix.length,`committed app bundle contains ${name} as a JSON string`);
    let end=start+1,escaped=false;
    for(;end<bundledSource.length;end++){
      const char=bundledSource[end];
      if(escaped){escaped=false;continue;}
      if(char==='\\'){escaped=true;continue;}
      if(char==='"')break;
    }
    assert.ok(end<bundledSource.length,`${name} JSON string is terminated`);
    // The generated JavaScript string contains literal GLSL indentation tabs,
    // which JS permits but JSON requires escaped. Escape raw control bytes
    // before parsing; this decodes data without executing the bundled module.
    const literal=bundledSource.slice(start,end+1).replace(/[\u0000-\u001f]/g,char=>JSON.stringify(char).slice(1,-1));
    return JSON.parse(literal);
  };
  const vendorMap=bundledShader('octahedral_impostor_shader_map_fragment_default');
  const paramsVertex=bundledShader('octahedral_impostor_shader_params_vertex_default');
  const customVertex=bundledShader('octahedral_impostor_shader_vertex_default');
  const paramsFragment=bundledShader('octahedral_impostor_shader_params_fragment_default');
  const normalBegin=bundledShader('octahedral_impostor_shader_normal_fragment_begin_default');
  assert.equal(manifest.revision,'ca0046a49fef8f8c75745a6e49e52752ef3cf8e3');
  assert.equal(manifest.artifacts.find(item=>item.path==='impostor-reference.js').sha256,createHash('sha256').update(bundledSource).digest('hex'),'actual shader fixture is the verified committed app bundle');
  assert.match(vendorMap,/^\/\/#include <map_fragment>/,'pinned upstream map chunk begins with a commented map include');
  assert.match(vendorMap,/\/\/ diffuseColor \*= blendedColor;/,'pinned upstream chunk also contains a commented-out diffuse multiplication');

  const shader={vertexShader:ShaderLib.standard.vertexShader,fragmentShader:ShaderLib.standard.fragmentShader};
  shader.vertexShader=shader.vertexShader.replace('#include <clipping_planes_pars_vertex>',paramsVertex).replace('#include <project_vertex>',customVertex);
  // The pinned callback inserts its map chunk before diffuseColor initialization.
  // Compose the pinned callback up to, but not including, its final raw String.replace.
  shader.fragmentShader=shader.fragmentShader.replace('vec4 diffuseColor = vec4( diffuse, opacity );',`${vendorMap}\nvec4 diffuseColor = vec4( diffuse, opacity );`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_pars_fragment>',paramsFragment).replace('#include <normal_fragment_begin>',normalBegin).replace('#include <normal_fragment_maps>','// #include <normal_fragment_maps>');
  const sourceAudit=auditImpostorShader(shader);
  assert.equal(sourceAudit.impostorTransform,true);
  assert.equal(sourceAudit.blendedColor,true);
  assert.equal(sourceAudit.impostorTransformDeclarations,1);
  assert.equal(sourceAudit.blendedColorDeclarations,1);
  assert.equal(sourceAudit.liveProjectIncludes,0,'upstream replacement consumes the project hook');
  assert.equal(sourceAudit.liveNormalMapIncludes,0);
  assert.equal(sourceAudit.liveMapIncludes,1,'commented vendor include is ignored; the standard map include is live');
  assert.equal(sourceAudit.blendedColorApplied,0,'the actual pinned shader chunk only comments out its multiplication');
  assert.ok(shader.fragmentShader.indexOf('vec4 diffuseColor')>shader.fragmentShader.indexOf('vec4 blendedColor'),'pinned callback injects blendedColor before diffuseColor initialization');
  const rawPinned={...shader,fragmentShader:shader.fragmentShader.replace('#include <map_fragment>','diffuseColor *= blendedColor;')};
  const rawPinnedAudit=auditImpostorShader(rawPinned);
  assert.equal(rawPinnedAudit.liveMapIncludes,1,'pinned raw replace matches its comment-first directive, leaving MeshStandard map hook live');
  assert.equal(rawPinnedAudit.blendedColorApplied,0,'pinned raw replace is still commented out by the source line comment');
  const rawPinnedRepair=adaptImpostorShader(rawPinned,true);
  assert.equal(rawPinnedRepair.after.liveMapIncludes,0);
  assert.equal(rawPinnedRepair.after.blendedColorApplied,1,'comment-first upstream mutation is repaired at the active MeshStandard hook');

  // Simulate the upstream first-string-match behavior with a comment-first hook:
  // JS replace alters the comment and leaves Three’s live include in place.
  const rawUpstream=baseShader();
  rawUpstream.fragmentShader=rawUpstream.fragmentShader.replace('#include <map_fragment>','// #include <map_fragment>\n#include <map_fragment>');
  const incorrectlyReplaced=rawUpstream.fragmentShader.replace('#include <map_fragment>','diffuseColor *= blendedColor;');
  const badAudit=auditImpostorShader({...rawUpstream,fragmentShader:incorrectlyReplaced});
  assert.equal(badAudit.liveMapIncludes,1,'upstream first-match replacement leaves the real map include live');
  assert.equal(badAudit.blendedColorApplied,0,'upstream first-match replacement edits only the commented directive');

  const repaired=auditImpostorShader(shader);
  assert.equal(repaired.liveMapIncludes,1);
  const actualRepair=adaptImpostorShader(shader,true);
  assert.equal(actualRepair.after.liveMapIncludes,0);
  assert.equal(actualRepair.after.blendedColorApplied,1);
  const repairedLive=liveGlsl(shader.fragmentShader);
  assert.ok(repairedLive.indexOf('diffuseColor *= blendedColor;')>repairedLive.indexOf('vec4 diffuseColor = vec4( diffuse, opacity );'),'repair applies the blended color after diffuseColor is initialized');

  const commentFirst=baseShader();
  commentFirst.fragmentShader=commentFirst.fragmentShader.replace('#include <map_fragment>','// #include <map_fragment>\n/*\n#include <map_fragment>\n*/\n  #include <map_fragment>');
  const commentBefore=commentFirst.fragmentShader;
  const result=adaptImpostorShader(commentFirst,true);
  assert.equal(result.before.liveMapIncludes,1);
  assert.equal(result.after.liveMapIncludes,0);
  assert.equal(result.after.blendedColorApplied,1);
  assert.ok(commentFirst.fragmentShader.includes('// #include <map_fragment>'),'line comment is preserved');
  assert.ok(commentFirst.fragmentShader.includes('/*\n#include <map_fragment>\n*/'),'block comment is preserved');
  assert.equal(commentFirst.fragmentShader.indexOf('diffuseColor *= blendedColor;'),commentBefore.indexOf('  #include <map_fragment>'),'replacement uses source offsets and only targets the live include');

  const noRepair=baseShader();
  const noRepairResult=adaptImpostorShader(noRepair,false);
  assert.equal(noRepairResult.before.liveMapIncludes,1);
  assert.deepEqual(noRepairResult.after,noRepairResult.before);
});

test('liveGlsl masks line and block comments without shifting shader offsets',()=>{
  const source='a // hidden #include <map_fragment>\r\nb /*\n#include <map_fragment>\n*/ c\n#include <map_fragment>\n';
  const live=liveGlsl(source);
  assert.equal(live.length,source.length);
  assert.equal((live.match(/#include <map_fragment>/g)??[]).length,1);
  assert.equal(live.indexOf('#include <map_fragment>'),source.lastIndexOf('#include <map_fragment>'));
  assert.equal((live.match(/\r\n/g)??[]).length,1);
});

test('rejects missing, duplicate and changed structural shader hooks',()=>{
  const variants=[];
  let shader=baseShader();shader.vertexShader=shader.vertexShader.replace('impostorTransform','ordinaryTransform');variants.push(['missing transform',shader]);
  shader=baseShader();shader.fragmentShader=shader.fragmentShader.replace('vec4 blendedColor','vec4 ordinaryColor');variants.push(['missing blended color',shader]);
  shader=baseShader();shader.vertexShader+='\n#include <project_vertex>\n#include <project_vertex>';variants.push(['duplicate project hook',shader]);
  shader=baseShader();shader.vertexShader=shader.vertexShader.replace('uniform mat4 impostorTransform;','uniform mat4 impostorTransform;\nuniform mat4 impostorTransform;');variants.push(['duplicate impostor transform uniform',shader]);
  shader=baseShader();shader.fragmentShader=shader.fragmentShader.replace('vec4 blendedColor = vec4(1.0);','vec4 blendedColor = vec4(1.0);\nvec4 blendedColor = vec4(0.0);');variants.push(['duplicate blended color declaration',shader]);
  shader=baseShader();shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','');variants.push(['missing map hook',shader]);
  shader=baseShader();shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n#include <map_fragment>');variants.push(['duplicate map hook',shader]);
  shader=baseShader();shader.fragmentShader=shader.fragmentShader.replace('  // #include <normal_fragment_maps>','  #include <normal_fragment_maps>');variants.push(['unexpected normal-map hook',shader]);
  shader=baseShader();shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','diffuseColor *= blendedColor;');variants.push(['already-applied multiplication',shader]);
  for(const [name,candidate] of variants)assert.throws(()=>adaptImpostorShader(candidate,true),undefined,name);
});
