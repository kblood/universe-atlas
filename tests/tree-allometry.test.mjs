import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {generateBiosphere,biosphereAt} from '../src/biosphere-model.ts';
import {forestTreeCatalogue} from '../src/forest-tree-catalogue.ts';
import {treeStructuralVariant} from '../src/tree-species-recipe.ts';
import {forestStructuralVariants,forestVariantEnvelope,forestVariantPoint,forestVariantTwist} from '../src/tree-structural-variant.ts';
import {deriveVariantFamilyProxyBounds,evaluateFamilyProxyBounds} from '../src/tree-canopy-bounds.ts';
import {ForestImpostors} from '../src/forest-impostor.ts';
import {forestMaterial,forestDepthMaterial} from '../src/forest-material.ts';
import {createLegacyTreeGeometry,LEGACY_TREE_TRUNK} from '../src/tree-shape.ts';
import {treeVertexMeters} from '../src/tree-asset.ts';
import {forestTreeDimensions,forestFamilyBoundRadius,forestFamilyEnvelopeRadius,legacyTreeBoundSphere,packTreeAllometryParameter,
  packTreeAllometryRatios,quantizeTreeAllometryRatio,treeAllometryAtlasStretch,treeAllometryCardScale,treeAllometryCrownHalfWidthM,treeAllometryGLSL,treeAllometryLeafDepthScale,treeAllometryPoint,treeAllometryRadial,treeAllometryRatioFromCode,
  unpackTreeAllometryParameter,unpackTreeAllometryRatios,validateTreeAllometryReference,LEGACY_TREE_ALLOMETRY,TREE_ALLOMETRY_IDENTITY_CODE,
  TREE_ALLOMETRY_CARD,TREE_ALLOMETRY_RATIO,TREE_ALLOMETRY_REASONS,TREE_ALLOMETRY_VERSION,TREE_FAMILY_ALLOMETRY_ENVELOPE,TREE_LEGACY_ALLOMETRY_ENVELOPE} from '../src/tree-allometry.ts';
import {familyGeometries,familyReference} from './helpers/tree-allometry-profiles.mjs';

const KINDS=['branching','spire'];
const packaged=Object.fromEntries(await Promise.all(KINDS.map(async kind=>[kind,await familyReference(kind)])));
const families=new Map(KINDS.map(kind=>[kind,{allometry:packaged[kind].reference}]));
const E=TREE_FAMILY_ALLOMETRY_ENVELOPE,STEP=TREE_ALLOMETRY_RATIO.step;

const species=(id,family='branching',heightM=16,widthRatio=family==='spire'?.25:.65)=>({id,name:id,lineageId:`lineage-${id}`,parentId:null,kind:'tree',family,birthMyr:0,deathMyr:null,
  traits:{heightM,widthRatio,branchCount:8,branchAngle:.7,leafLength:.8,leafWidth:.4,leafDensity:.7,curvature:.2,legRatio:0,bodyLength:0,headRatio:0,tailLength:0,color:'#52743b',woodColor:'#62422d'},
  niche:{minTempK:0,maxTempK:1000,minMoisture:0,maxMoisture:1,maxSlope:90},diet:'producer',dispersal:'land'});
const cellIds=Array.from({length:96},(_,i)=>`${i%6}/13/${i*37%211}/${i*53%197}`);
const bindingsOf=list=>{const catalogue=forestTreeCatalogue(list);return cellIds.map(id=>catalogue.resolve(id)).filter(Boolean);};

/** Dated catalogues from the ordinary biosphere model: every tree birth date plus
 * a late date, across temperate, arid and cold profiles. */
const worlds=[['ATLAS-ALLOMETRY-A','temperate'],['ATLAS-ALLOMETRY-B','arid'],['ATLAS-ALLOMETRY-C','cold'],['ATLAS-ALLOMETRY-D','temperate']]
  .map(([seed,profile],i)=>generateBiosphere(seed,profile,`G001/allometry/planet/${i}`));
const dated=worlds.flatMap(world=>{
  const births=[...new Set(world.species.filter(s=>s.kind==='tree').map(s=>s.birthMyr))].sort((a,b)=>a-b);
  return [...births,births.at(-1)+5000].map(date=>({world,date,species:biosphereAt(world,date).species}));
});

test('packaged Oak and Pine references are measured, valid and distinct',()=>{
  for(const kind of KINDS){
    const r=packaged[kind].reference;
    assert.equal(r.version,TREE_ALLOMETRY_VERSION);assert.equal(validateTreeAllometryReference(r).crownRadiusM,r.crownRadiusM);
    assert.ok(r.trunkRadiusM>.05&&r.trunkRadiusM<1,`${kind} trunk radius ${r.trunkRadiusM}`);
    assert.ok(r.crownRadiusM>r.trunkRadiusM&&r.crownRadiusM<=r.skeletonRadiusM,`${kind} crown radius ${r.crownRadiusM}`);
    assert.ok(r.skeletonHeightM>10&&r.skeletonHeightM<20,`${kind} skeleton height ${r.skeletonHeightM}`);
    assert.ok(r.cardExtentM>0&&r.cardExtentM<=r.maxLeafOffsetM);
    assert.deepEqual([r.variantScale,r.variantLeanFraction],Object.values(forestVariantEnvelope(forestStructuralVariants(kind))));
  }
  assert.ok(packaged.spire.reference.crownRadiusM<packaged.branching.reference.crownRadiusM,'the conifer crown is narrower than the oak crown');
});

test('species dimensions follow the dated recipe across dates and both families',()=>{
  const seen={family:new Set(),speciesByKind:{branching:new Set(),spire:new Set()},heights:new Set(),reasons:{},slenderness:{branching:[],spire:[]}};
  for(const {species:list} of dated)for(const binding of bindingsOf(list)){
    const d=forestTreeDimensions(binding,16,families),individual=treeStructuralVariant(binding.recipe,binding.appearance.variant);
    assert.equal(d.version,TREE_ALLOMETRY_VERSION);assert.ok(Object.isFrozen(d));
    assert.equal(d.speciesId,binding.recipe.speciesId);
    assert.deepEqual([d.targetHeightM,d.targetCrownWidthM,d.targetTrunkDiameterM],[individual.heightM,individual.crownWidthM,individual.trunkDiameterM]);
    for(const reason of d.reasons){assert.ok(TREE_ALLOMETRY_REASONS.includes(reason));seen.reasons[reason]=(seen.reasons[reason]??0)+1;}
    // The canonical population height is not read once a dated species binds.
    assert.deepEqual(forestTreeDimensions(binding,10,families),d);assert.deepEqual(forestTreeDimensions(binding,22,families),d);
    if(d.representation==='family'){
      const r=packaged[d.kind].reference,s=d.heightM/16;
      assert.equal(d.kind,binding.recipe.family);assert.equal(d.heightM,Math.fround(individual.heightM),'drawn height is the individual species height');
      assert.ok(d.heightM>=E.heightM[0]&&d.heightM<=E.heightM[1]);
      assert.equal(d.ratioCode,packTreeAllometryRatios(d.crownRatio,d.trunkRatio));
      if(!d.reasons.includes('trunk-ratio-clamped'))assert.ok(Math.abs(d.trunkDiameterM-individual.trunkDiameterM)<=s*r.trunkRadiusM*STEP+1e-9,'trunk within one half quantization step');
      // Documented crown tolerance: the drawn width (mapped pivots plus scaled
      // cards) is the nearest code, so the error is at most half the width
      // change to an adjacent crown code.
      const width=k=>2*treeAllometryCrownHalfWidthM(r,d.heightM,k,d.trunkRatio);
      assert.ok(Math.abs(width(d.crownRatio)-d.crownWidthM)<1e-9,'crown width is the drawn width');
      const step=Math.max(...[-STEP,STEP].map(x=>d.crownRatio+x).filter(k=>k>=E.crownRatio[0]&&k<=E.crownRatio[1]).map(k=>Math.abs(width(k)-d.crownWidthM)));
      if(!d.reasons.includes('crown-ratio-clamped'))assert.ok(Math.abs(d.crownWidthM-individual.crownWidthM)<=step/2+1e-9,'crown within half an adjacent-code width step');
      assert.equal(d.cardScale,treeAllometryCardScale(r,d.heightM,d.crownRatio,d.trunkRatio));
      assert.ok(d.cardScale>=TREE_ALLOMETRY_CARD.min&&d.cardScale<=TREE_ALLOMETRY_CARD.max);
      // Recipe tolerances measured on this fixture (docs/tree-families-2026-09-28.md).
      assert.ok(Math.abs(d.crownWidthM/individual.crownWidthM-1)<=.02,`${d.speciesId} crown ${d.crownWidthM} vs ${individual.crownWidthM}`);
      assert.ok(Math.abs(d.trunkDiameterM/individual.trunkDiameterM-1)<=.01,`${d.speciesId} trunk ${d.trunkDiameterM} vs ${individual.trunkDiameterM}`);
      assert.deepEqual(d.reasons,[],`${d.speciesId} draws without any clamp`);
      seen.family.add(d.kind);seen.speciesByKind[d.kind].add(d.speciesId);seen.heights.add(d.heightM);
      seen.slenderness[d.kind].push(d.crownWidthM/d.heightM);
    }else{
      assert.ok(d.reasons.some(x=>['height-below-family-envelope','height-above-family-envelope'].includes(x)),`legacy fallback needs a reason: ${d.reasons}`);
      if(!d.reasons.includes('legacy-height-out-of-range'))assert.equal(d.heightM,Math.fround(individual.heightM),'legacy fallback keeps the physical height');
    }
  }
  assert.deepEqual([...seen.family].sort(),KINDS,'both families are drawn from dated species');
  assert.ok(seen.speciesByKind.branching.size>=3&&seen.speciesByKind.spire.size>=3,JSON.stringify([...Object.values(seen.speciesByKind)].map(s=>s.size)));
  assert.ok(seen.heights.size>=12,'heights differ per species and individual variant, not one proxy');
  const mean=a=>a.reduce((n,x)=>n+x,0)/a.length;
  assert.ok(mean(seen.slenderness.spire)<mean(seen.slenderness.branching),'conifer crowns stay narrower per metre of height');
  assert.ok(mean(seen.slenderness.spire)<.3,`conifers are slender, not minimum-crown blobs (${mean(seen.slenderness.spire)})`);
  assert.deepEqual(seen.reasons,{},'no clamp or legacy fallback on the dated fixture');
  test.diagnostic?.(JSON.stringify(seen.reasons));
});

test('canonical identity and population are invariant; dimensions are deterministic per individual',()=>{
  const list=dated.at(-1).species,a=forestTreeCatalogue(list),b=forestTreeCatalogue([...list].reverse());
  for(const id of cellIds){
    const x=a.resolve(id),y=b.resolve(id);if(!x){assert.equal(y,null);continue;}
    const before=JSON.stringify(x),d=forestTreeDimensions(x,16,families);
    assert.equal(JSON.stringify(x),before,'dimension decisions never modify the binding');
    assert.deepEqual(forestTreeDimensions(y,16,families),d,'enumeration order does not change dimensions');
    assert.deepEqual(a.resolve(id),x,'binding (species, variant, appearance) is unchanged by allometry');
  }
  // Individuals of one species differ only through their bounded recipe variant.
  const recipes=new Map();
  for(const binding of bindingsOf(list)){
    const key=`${binding.recipe.speciesId}/${binding.appearance.variant}`,d=forestTreeDimensions(binding,16,families);
    if(recipes.has(key))assert.deepEqual(d,recipes.get(key));else recipes.set(key,d);
  }
  // Far instances: the allometry channel never changes root, rotation, ground, roll or ownership.
  const f=new ForestImpostors(8);
  try{
    const q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),.4);
    f.write(3,new THREE.Vector3(10,20,30),17,q,.3,120);f.setOwnership(3,2);
    const snapshot=()=>[f.positions.getX(3),f.positions.getY(3),f.positions.getZ(3),f.rotations.getX(3),f.rotations.getY(3),f.rotations.getZ(3),f.rotations.getW(3),
      f.parameters.getY(3),f.parameters.getW(3),f.ownership.getX(3)];
    const before=snapshot(),code=packTreeAllometryRatios(1.3,.7);
    f.setAllometry(3,21.5,code);
    assert.deepEqual(snapshot(),before);
    assert.deepEqual(f.allometry(3),{heightM:Math.fround(21.5),rollSeed:Math.floor(.3*256),roll:(Math.floor(.3*256)+.5)/256,ratioCode:code,...unpackTreeAllometryRatios(code)});
    f.setAllometry(3,17,TREE_ALLOMETRY_IDENTITY_CODE);assert.equal(f.allometry(3).rollSeed,Math.floor(.3*256));
  }finally{f.dispose();}
});

test('ratio and far parameter channels are exact in Float32 and the GLSL decode matches',()=>{
  for(let q=0;q<TREE_ALLOMETRY_RATIO.levels;q++){
    const k=treeAllometryRatioFromCode(q);assert.equal(Math.fround(k),k);assert.equal(quantizeTreeAllometryRatio(k),q);
  }
  assert.equal(treeAllometryRatioFromCode(TREE_ALLOMETRY_IDENTITY_CODE%256),1);assert.equal(TREE_ALLOMETRY_IDENTITY_CODE,112+256*112);
  for(const roll of [0,.2,.5,.999999])for(const code of [0,TREE_ALLOMETRY_IDENTITY_CODE,65535,packTreeAllometryRatios(1.62,.55)]){
    const value=packTreeAllometryParameter(roll,code);
    assert.ok(value<2**24);assert.equal(Math.fround(value),value);
    const decoded=unpackTreeAllometryParameter(value);
    assert.equal(decoded.rollSeed,Math.min(255,Math.floor(roll*256)));assert.equal(decoded.ratioCode,code);
    // Same arithmetic as treeAllometryRatios()/treeAllometryRoll() in GLSL.
    assert.equal(TREE_ALLOMETRY_RATIO.min+(Math.floor(value/256)%256)*STEP,decoded.crownRatio);
    assert.equal(TREE_ALLOMETRY_RATIO.min+Math.floor(value/65536)*STEP,decoded.trunkRatio);
  }
  assert.match(treeAllometryGLSL,new RegExp(`vec2\\(${TREE_ALLOMETRY_RATIO.min}\\)\\+vec2\\(mod\\(floor\\(packed/256\\.0\\),256\\.0\\),floor\\(packed/65536\\.0\\)\\)\\*${STEP}`));
});

test('near, mid, far and legacy paths receive the same height and proportions',()=>{
  const list=dated.at(-1).species,bindings=bindingsOf(list);
  const decisions=bindings.map(b=>forestTreeDimensions(b,16,families)).filter(d=>d.representation==='family');
  assert.ok(decisions.length>0);
  for(const d of decisions.slice(0,24)){
    const r=packaged[d.kind].reference,allometry={crownRatio:d.crownRatio,trunkRatio:d.trunkRatio,trunkRadiusM:r.trunkRadiusM,crownRadiusM:r.crownRadiusM,cardExtentM:r.cardExtentM};
    // Detailed near/mid CPU oracle: bark follows the radial map; leaf cards follow the card scale.
    const bark=new THREE.Vector3(1.1,6,-.4),pivot=new THREE.Vector3(2.5,11,1.2),corner=pivot.clone().add(new THREE.Vector3(.3,-.2,.25));
    assert.deepEqual(treeVertexMeters(bark,bark,false,d.heightM,0,0,0,allometry).toArray().map(x=>+x.toFixed(9)),treeAllometryPoint(bark.toArray(),r,d).map(x=>+x.toFixed(9)));
    const leaf=treeVertexMeters(corner,pivot,true,d.heightM,0,0,0,allometry);
    assert.ok(Math.abs(leaf.distanceTo(new THREE.Vector3(...treeAllometryPoint(pivot.toArray(),r,d)))-corner.distanceTo(pivot)*d.cardScale)<1e-9,'card offsets follow the card scale');
    // Far atlas: the stretched capture has the detailed crown width, and its
    // leaf optical depth equals the detailed card density (scale 1 unless clamped).
    const s=d.heightM/16,stretch=treeAllometryAtlasStretch(r,d.heightM,d.crownRatio,d.trunkRatio);
    assert.ok(Math.abs(2*stretch*s*(r.crownRadiusM+r.cardExtentM)-d.crownWidthM)<1e-9,'far atlas width equals the detailed width');
    const depth=treeAllometryLeafDepthScale(r,d.heightM,d.crownRatio,d.trunkRatio);
    if(d.cardScale>TREE_ALLOMETRY_CARD.min&&d.cardScale<TREE_ALLOMETRY_CARD.max)assert.ok(Math.abs(depth-1)<1e-9,`leaf density preserved (${depth})`);
    else assert.ok(Math.abs(depth-d.cardScale**2/(s*s*stretch))<1e-12);
    // Legacy stand-in draws the same physical crown width and trunk diameter.
    const legacy=unpackTreeAllometryRatios(d.legacyRatioCode),L=LEGACY_TREE_ALLOMETRY;
    if(!d.reasons.includes('legacy-crown-ratio-clamped'))assert.ok(Math.abs(legacy.crownRatio*d.heightM*L.crownDiameterPerHeight-d.crownWidthM)<=d.heightM*L.crownDiameterPerHeight*STEP/2+1e-9);
    if(!d.reasons.includes('legacy-trunk-ratio-clamped'))assert.ok(Math.abs(legacy.trunkRatio*d.heightM*L.trunkDiameterPerHeight-d.trunkDiameterM)<=d.heightM*L.trunkDiameterPerHeight*STEP/2+1e-9);
  }
  // Far analytic box equals the shared CPU evaluation for the same ratios.
  for(const kind of KINDS){
    const {profiles:[p0,p1],reference}=packaged[kind],pool=forestStructuralVariants(kind),f=new ForestImpostors(8);
    try{
      f.setFamilyPresentation(kind,{enabled:true,lod1Profile:p1.profile,conservativeBounds:{radiusM:forestFamilyEnvelopeRadius(reference)},
        barkLinearRgb:[.1,.08,.06],foliageLinearRgb:[.03,.08,.02],trunk:p0.profile.trunk,structuralVariants:pool,allometry:reference});
      assert.ok(Math.abs(f.uniforms.treeFamilyTrunk.value[kind==='branching'?0:1].y*16-reference.trunkRadiusM)<1e-12,'far and near split trunk and crown at one radius');
      const proxy=deriveVariantFamilyProxyBounds(p1.profile,forestVariantEnvelope(pool),p0.profile.trunk);
      for(const d of [{heightM:8,crownRatio:.5,trunkRatio:1.5},{heightM:8,crownRatio:.5,trunkRatio:.5},{heightM:4,crownRatio:.125,trunkRatio:1},
        {heightM:17.25,crownRatio:1.25,trunkRatio:.75},{heightM:24,crownRatio:1.75,trunkRatio:1.5}]){
        f.write(0,new THREE.Vector3(),16,new THREE.Quaternion(),.5,0);f.setPresentation(0,kind==='branching'?1:2);
        f.setAllometry(0,d.heightM,packTreeAllometryRatios(d.crownRatio,d.trunkRatio));
        const centre=new THREE.Vector3(),extent=new THREE.Vector3();f.proxyBounds(0,centre,extent);
        // The box grows by the larger of the crown ratio and the atlas stretch.
        const stretch=treeAllometryAtlasStretch(reference,d.heightM,d.crownRatio,d.trunkRatio);
        const expected=evaluateFamilyProxyBounds(proxy,d.heightM,{crownRatio:Math.max(d.crownRatio,stretch),trunkRatio:d.trunkRatio});
        if(d.trunkRatio<1&&d.heightM<16)assert.ok(stretch>d.crownRatio,'small slender trees need the stretch term');
        centre.toArray().forEach((x,i)=>assert.ok(Math.abs(x-expected.centerM[i])<1e-5,`${kind} centre`));
        extent.toArray().forEach((x,i)=>assert.ok(Math.abs(x-expected.extentM[i])<1e-5,`${kind} extent`));
      }
    }finally{f.dispose();}
  }
  // Legacy colour and shadow programs both apply the same instanced ratios.
  for(const material of [forestMaterial(true),forestDepthMaterial()]){
    const shader={uniforms:{},vertexShader:THREE.ShaderLib[material.isMeshDepthMaterial?'depth':'lambert'].vertexShader,fragmentShader:''};
    material.onBeforeCompile(shader,{});
    assert.match(shader.vertexShader,/attribute float instanceTreeAllometry;/);
    assert.match(shader.vertexShader,new RegExp(`transformed=treeAllometryPoint\\(transformed,${LEGACY_TREE_TRUNK.baseRadius},legacyTreeAllometry\\(\\)\\);`));
    assert.ok(material.customProgramCacheKey().includes(TREE_ALLOMETRY_VERSION));material.dispose();
  }
});

/** Rendered tree-frame vertex, exactly as the detailed vertex shader composes it. */
function renderedVertex(p,q,leaf,wind,d,reference,variant,windSign,cardScale){
  const base=forestVariantPoint(variant,treeAllometryPoint(leaf?q:p,reference,d),d.heightM);
  if(!leaf)return base;
  const a=windSign*.12*wind,c=Math.cos(a),s=Math.sin(a),t=forestVariantTwist(variant,q[1],16),ct=Math.cos(t),st=Math.sin(t);
  let o=[p[0]-q[0],p[1]-q[1],p[2]-q[2]];o=[c*o[0]-s*o[1],s*o[0]+c*o[1],o[2]];o=[ct*o[0]+st*o[2],o[1],-st*o[0]+ct*o[2]];
  return [base[0]+o[0]*cardScale,base[1]+o[1]*cardScale,base[2]+o[2]*cardScale];
}
test('culling and shadow spheres contain the tallest and widest packaged trees with variants, wind and card growth',async()=>{
  const corners=[];
  for(const heightM of E.heightM)for(const [crownRatio,trunkRatio] of [[E.crownRatio[0],E.trunkRatio[1]],[E.crownRatio[1],E.trunkRatio[0]],[E.crownRatio[1],E.trunkRatio[1]],[1,1]])
    corners.push({heightM,crownRatio,trunkRatio});
  for(const kind of KINDS){
    const reference=packaged[kind].reference,envelope=forestFamilyEnvelopeRadius(reference),variants=[null,...forestStructuralVariants(kind)];
    let worst=0;
    for(const lod of [0,1])for(const geometry of await familyGeometries(kind,lod)){
      const P=geometry.getAttribute('position').array,Q=geometry.getAttribute('_leaf_pivot').array,B=geometry.getAttribute('_branch_level').array,W=geometry.getAttribute('_wind').array;
      for(const d of corners){
        const bound=forestFamilyBoundRadius(reference,d);assert.ok(bound<=envelope+1e-9);
        for(const variant of variants)for(const windSign of [-1,0,1])for(let i=0;i<B.length;i++){
          const v=renderedVertex([P[i*3],P[i*3+1],P[i*3+2]],[Q[i*3],Q[i*3+1],Q[i*3+2]],B[i]>3.5,W[i],d,reference,variant,windSign,reference.cardScaleMax);
          const radius=Math.hypot(...v);worst=Math.max(worst,radius/bound);
          if(radius>bound+1e-6)assert.fail(`${kind} LOD${lod} vertex ${i} radius ${radius} exceeds ${bound} for ${JSON.stringify(d)}`);
        }
      }
    }
    assert.ok(worst>.6,`${kind} bound is not vacuous (${worst})`);
    // The tallest eligible tree is 24 m; its envelope must at least reach that crown top.
    assert.ok(envelope>=24*reference.skeletonHeightM/16);
  }
  // Legacy primitive: the offset sphere contains every mapped vertex.
  const legacy=createLegacyTreeGeometry(1).getAttribute('position').array;
  for(const heightM of [.5,16,40])for(const [crownRatio,trunkRatio] of [[.25,2.24],[2.24,.25],[2.24,2.24],[1,1]]){
    const sphere=legacyTreeBoundSphere({heightM,crownRatio,trunkRatio});
    for(let i=0;i<legacy.length;i+=3){
      const [x,z]=treeAllometryRadial(legacy[i],legacy[i+2],LEGACY_TREE_TRUNK.baseRadius,crownRatio,trunkRatio);
      assert.ok(Math.hypot(x*heightM,legacy[i+1]*heightM-sphere.centerHeightM,z*heightM)<=sphere.radiusM+1e-9);
    }
  }
});

test('species allometry reuses one far atlas and one uniform set per family',async()=>{
  const f=new ForestImpostors(64),texture=new THREE.DataArrayTexture(new Uint8Array(4),1,1,1);
  try{
    const atlas={colour:{texture},data:{texture},sphere:new THREE.Vector4(0,.5,0,.6)};
    f.setFamilyAtlas('branching',atlas);
    const uniforms=Object.keys(f.uniforms).sort(),colour=f.uniforms.treeAtlasColour0.value;
    const list=dated.at(-1).species,decisions=bindingsOf(list).map(b=>forestTreeDimensions(b,16,families));
    decisions.slice(0,64).forEach((d,i)=>{f.write(i,new THREE.Vector3(i,0,0),16,new THREE.Quaternion(),.5,0);f.setAllometry(i,d.heightM,d.ratioCode);});
    assert.ok(new Set(decisions.map(d=>d.speciesId)).size>1);
    assert.deepEqual(Object.keys(f.uniforms).sort(),uniforms,'no per-species uniform');
    assert.equal(f.uniforms.treeAtlasColour0.value,colour);assert.equal(f.familyAtlas('branching'),atlas);
  }finally{f.dispose();texture.dispose();}
  // Atlas members are captured once per family at the 16 m reference with authored proportions.
  const source=await readFile(new URL('../src/tree-asset.ts',import.meta.url),'utf8');
  assert.match(source,/for\(let i=0;i<count;i\+\+\)\{tree\.setXYZW\(i,1,0,1,1\);/);
  // Detailed cards use the same shared card scale from the measured family reference.
  assert.ok(source.includes('float allometryCard=treeAllometryCardScale(instanceTree.x*${TREE_REFERENCE_HEIGHT_M}.0,instanceTree.zw,atlasTreeAllometry);'));
  assert.ok(source.includes('shaderState.allometry.value.set(allometry?.trunkRadiusM??0,allometry?.crownRadiusM??0,allometry?.cardExtentM??0);'));
});

test('fallbacks are explicit, counted by reason, and invalid channels are rejected',()=>{
  const one=(s,map=families)=>forestTreeDimensions(bindingsOf([s])[0],16,map);
  const unbound=forestTreeDimensions(null,17.5,families);
  assert.deepEqual([unbound.representation,unbound.heightM,unbound.ratioCode,unbound.reasons],['legacy',17.5,TREE_ALLOMETRY_IDENTITY_CODE,['no-dated-species']]);
  assert.throws(()=>forestTreeDimensions(null,NaN,families),/Canonical tree height/);
  assert.deepEqual(one(species('oak'),new Map()).reasons,['family-not-presented']);
  assert.deepEqual(one(species('oak'),new Map([['branching',{allometry:null}]])).reasons,['family-missing-allometry-reference']);
  const broken={...packaged.branching.reference,crownRadiusM:NaN};
  assert.deepEqual(one(species('oak'),new Map([['branching',{allometry:broken}]])).reasons,['family-missing-allometry-reference']);
  // tree-allometry-2 draws 4-8 m trees as the family; only shrub-sized trees fall back.
  const small=one(species('small-oak','branching',5));
  assert.deepEqual([small.representation,small.reasons],['family',[]]);
  const short=one(species('shrubby-oak','branching',3));
  assert.deepEqual([short.representation,short.reasons],['legacy',['height-below-family-envelope']]);
  assert.ok(short.heightM>=3*.94&&short.heightM<3*1.06,'below-envelope species draws at its physical height');
  const tall=one(species('giant-pine','spire',26));
  assert.deepEqual([tall.representation,tall.reasons],['legacy',['height-above-family-envelope']]);
  assert.ok(tall.heightM>24&&tall.heightM<=TREE_LEGACY_ALLOMETRY_ENVELOPE.heightM[1]);
  const huge=one(species('huge','branching',60));
  assert.deepEqual([huge.heightM,huge.reasons],[TREE_LEGACY_ALLOMETRY_ENVELOPE.heightM[1],['height-above-family-envelope','legacy-height-out-of-range']]);
  const wide=one(species('wide','branching',16,3));
  assert.equal(wide.representation,'family');assert.ok(wide.reasons.includes('crown-ratio-clamped'));assert.equal(wide.crownRatio,E.crownRatio[1]);
  const narrow=one(species('narrow','spire',16,.02));
  assert.ok(narrow.reasons.includes('crown-ratio-clamped'));assert.equal(narrow.crownRatio,E.crownRatio[0]);
  const thinTrunk=one(species('oak'),new Map([['branching',{allometry:{...packaged.branching.reference,trunkRadiusM:.02}}]]));
  assert.ok(thinTrunk.reasons.includes('trunk-ratio-clamped'));assert.equal(thinTrunk.trunkRatio,E.trunkRatio[1]);
  assert.throws(()=>validateTreeAllometryReference({...packaged.branching.reference,crownRadiusM:packaged.branching.reference.trunkRadiusM}),/Invalid tree allometry reference/);
  for(const bad of [()=>quantizeTreeAllometryRatio(NaN),()=>treeAllometryRatioFromCode(256),()=>unpackTreeAllometryRatios(65536),
    ()=>packTreeAllometryParameter(1,0),()=>unpackTreeAllometryParameter(2**24),()=>unpackTreeAllometryParameter(1.5)])assert.throws(bad);
  const f=new ForestImpostors(4);
  try{
    f.write(0,new THREE.Vector3(),16,new THREE.Quaternion(),.5,0);
    for(const [h,code] of [[0,TREE_ALLOMETRY_IDENTITY_CODE],[41,TREE_ALLOMETRY_IDENTITY_CODE],[NaN,TREE_ALLOMETRY_IDENTITY_CODE],[16,65536],[16,1.5]])
      assert.throws(()=>f.setAllometry(0,h,code));
    assert.throws(()=>f.setAllometry(1,16,TREE_ALLOMETRY_IDENTITY_CODE),/Retired/);
  }finally{f.dispose();}
  const p=new THREE.Vector3(1,2,3);
  for(const h of [E.heightM[0]-.01,E.heightM[1]+.01])assert.throws(()=>treeVertexMeters(p,p,false,h,0,0),/rendered heights/);
  assert.throws(()=>treeVertexMeters(p,p,false,16,0,0,0,{crownRatio:2,trunkRatio:1,trunkRadiusM:.3}),/Invalid tree allometry/);
});

test('card scale, atlas stretch and leaf depth scale: GLSL matches the CPU twins',()=>{
  // Transliterate the three shared GLSL functions to JavaScript and evaluate them.
  const names=['treeAllometryCardScale','treeAllometryAtlasStretch','treeAllometryLeafDepthScale'];
  const source=names.map(name=>{
    const start=treeAllometryGLSL.indexOf(`float ${name}(`);assert.ok(start>=0,name);
    return treeAllometryGLSL.slice(start,treeAllometryGLSL.indexOf('\n}',start)+2);
  }).join('\n')
    .replace(/float (\w+)\((?:float|vec2|vec3) (\w+),(?:float|vec2|vec3) (\w+),(?:float|vec2|vec3) (\w+)\)\{/g,'function $1($2,$3,$4){')
    .replace(/\bfloat /g,'let ').replace(/\bsqrt\(/g,'Math.sqrt(');
  const glsl=new Function('clamp',`${source}\nreturn {${names.join(',')}};`)((x,a,b)=>Math.min(b,Math.max(a,x)));
  const f32=Math.fround;
  for(const kind of KINDS){
    const r=packaged[kind].reference,family={x:r.trunkRadiusM,y:r.crownRadiusM,z:r.cardExtentM};
    for(const heightM of [4,6.5,8,12.3,16,20,24])for(const crownRatio of [E.crownRatio[0],.3,.62,1,1.5,E.crownRatio[1]])for(const trunkRatio of [.5,1,1.5]){
      const ratios={x:crownRatio,y:trunkRatio},close=(a,b,what)=>assert.ok(Math.abs(a-b)<=1e-9*Math.max(1,Math.abs(b)),`${kind} ${what} ${a} vs ${b}`);
      close(glsl.treeAllometryCardScale(heightM,ratios,family),treeAllometryCardScale(r,heightM,crownRatio,trunkRatio),'card');
      close(glsl.treeAllometryAtlasStretch(heightM,ratios,family),treeAllometryAtlasStretch(r,heightM,crownRatio,trunkRatio),'stretch');
      close(glsl.treeAllometryLeafDepthScale(heightM,ratios,family),treeAllometryLeafDepthScale(r,heightM,crownRatio,trunkRatio),'depth');
    }
    // Identity ratios at 16 m reproduce the capture: unit cards, no stretch, unit depth.
    assert.equal(f32(treeAllometryCardScale(r,16,1,1)),1);assert.ok(Math.abs(treeAllometryAtlasStretch(r,16,1,1)-1)<1e-12);
    // Monotonic drawn half-width in the crown ratio (the bisection's premise).
    for(const heightM of [4,10,24]){let previous=-Infinity;
      for(let q=0;q<TREE_ALLOMETRY_RATIO.levels;q++){const k=treeAllometryRatioFromCode(q);if(k>E.crownRatio[1])break;
        const w=treeAllometryCrownHalfWidthM(r,heightM,k,1);assert.ok(w>previous,`${kind} ${heightM} m half-width is monotonic`);previous=w;}
    }
  }
  // Without a family reference (legacy / unpresented) cards keep their authored size.
  assert.equal(treeAllometryCardScale(null,8,.5,1),1);assert.equal(treeAllometryAtlasStretch(null,8,.5,1),.5);
  assert.equal(glsl.treeAllometryCardScale(8,{x:.5,y:1},{x:0,y:0,z:0}),1);
  assert.throws(()=>treeAllometryCardScale(packaged.spire.reference,0,1,1));
});
