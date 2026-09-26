import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Color} from 'three';
import {generateBiosphere,specimenTraits} from '../src/biosphere-model.ts';
import {createSpeciesGeometry,createRockGeometry} from '../src/biosphere-geometry.ts';
const shape=g=>{
  const p=g.getAttribute('position');g.computeBoundingBox();
  const height=Math.max(1e-9,g.boundingBox.max.y-g.boundingBox.min.y);
  return createHash('sha256').update(JSON.stringify(Array.from(p.array,x=>Math.round(x/height*10000)))).digest('hex');
};
function validate(g){
  const p=g.getAttribute('position'),n=g.getAttribute('normal'),color=g.getAttribute('color');
  assert.ok(p&&n&&color);
  assert.equal(p.count,n.count);assert.equal(p.count,color.count);
  for(const a of [p,n,color])assert.ok(Array.from(a.array).every(Number.isFinite));
  const indices=g.index?Array.from(g.index.array):Array.from({length:p.count},(_,i)=>i);
  assert.equal(indices.length%3,0);assert.ok(indices.length>0&&indices.length<=30000,'bounded triangles per specimen');
  for(let i=0;i<indices.length;i+=3){
    const [a,b,c]=indices.slice(i,i+3);assert.ok([a,b,c].every(j=>Number.isInteger(j)&&j>=0&&j<p.count));
    const u=[p.getX(b)-p.getX(a),p.getY(b)-p.getY(a),p.getZ(b)-p.getZ(a)];
    const v=[p.getX(c)-p.getX(a),p.getY(c)-p.getY(a),p.getZ(c)-p.getZ(a)];
    const cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
    assert.ok(cross.reduce((a,b)=>a+b*b,0)>1e-16,'nondegenerate actual triangle');
  }
  g.computeBoundingBox();assert.ok(Math.abs(g.boundingBox.min.y)<.002,'specimen sits on ground');
  assert.ok(g.boundingBox.max.y>0);
}
test('every species, growth stage and geological family produces valid bounded geometry',()=>{
  const w=generateBiosphere('GEOMETRY','temperate','planet/0');
  for(const s of w.species)for(const stage of ['adult','juvenile'])for(let v=0;v<4;v++){
    const g=createSpeciesGeometry(s,v,stage);try{validate(g);}catch(e){e.message=`${s.id} variant ${v} ${stage}: ${e.message}`;throw e;}finally{g.dispose();}
  }
  for(const r of w.rocks)for(let v=0;v<4;v++){const g=createRockGeometry(r,v);validate(g);g.dispose();}
});
test('structure varies within and across species without relying on colour or uniform scale',()=>{
  const w=generateBiosphere('GEOMETRY','temperate','planet/0');
  for(const family of ['branching','spire','bush','blade','quadruped']){
    const species=w.species.filter(s=>s.family===family);assert.ok(species.length>=3);
    const hashes=species.map(s=>{const g=createSpeciesGeometry(s,0);const h=shape(g);g.dispose();return h;});
    assert.equal(new Set(hashes).size,hashes.length,`${family} species have distinct normalized shape data`);
    const variants=[0,1,2,3].map(v=>{const g=createSpeciesGeometry(species[0],v);const h=shape(g);g.dispose();return h;});
    assert.ok(new Set(variants).size>=3,`${family} individuals have structural variation`);
    const first=createSpeciesGeometry(species[0],0),second=createSpeciesGeometry(species[0],0);
    assert.equal(shape(first),shape(second));first.dispose();second.dispose();
  }
  for(const r of w.rocks){const hashes=[0,1,2,3].map(v=>{const g=createRockGeometry(r,v);const h=shape(g);g.dispose();return h;});assert.ok(new Set(hashes).size>=3);}
});
test('geometry follows shared specimen growth-stage traits',()=>{
  const w=generateBiosphere('GEOMETRY-STAGE','temperate','planet/0');
  for(const s of w.species)for(let variant=0;variant<4;variant++){
    const adult=createSpeciesGeometry(s,variant,'adult'),juvenile=createSpeciesGeometry(s,variant,'juvenile');
    adult.computeBoundingBox();juvenile.computeBoundingBox();
    const observed=(juvenile.boundingBox.max.y-juvenile.boundingBox.min.y)/(adult.boundingBox.max.y-adult.boundingBox.min.y);
    const expected=specimenTraits(s,variant,'juvenile').heightM/specimenTraits(s,variant,'adult').heightM;
    assert.ok(Math.abs(observed-expected)<.16,`${s.id} variant ${variant} stage geometry follows specimen height`);
    adult.dispose();juvenile.dispose();
  }
});
test('primitive-local windings produce outward normals for lit materials',()=>{
  const w=generateBiosphere('GEOMETRY-NORMALS','temperate','planet/0');
  const face=(g,center)=>{const p=g.getAttribute('position'),n=g.getAttribute('normal');const cx=(p.getX(0)+p.getX(1)+p.getX(2))/3,cy=(p.getY(0)+p.getY(1)+p.getY(2))/3,cz=(p.getZ(0)+p.getZ(1)+p.getZ(2))/3;const nx=n.getX(0)+n.getX(1)+n.getX(2),ny=n.getY(0)+n.getY(1)+n.getY(2),nz=n.getZ(0)+n.getZ(1)+n.getZ(2);assert.ok(nx*(cx-center.x)+ny*(cy-center.y)+nz*(cz-center.z)>0,'first primitive face points away from its own local centre');};
  const tree=w.species.find(s=>s.family==='branching'),treeGeometry=createSpeciesGeometry(tree,0);face(treeGeometry,{x:0,y:tree.traits.heightM*.5,z:0});treeGeometry.dispose();
  const animal=w.species.find(s=>s.family==='quadruped'),animalTraits=specimenTraits(animal,0),animalGeometry=createSpeciesGeometry(animal,0),bodyY=animalTraits.heightM*animalTraits.legRatio+animalTraits.heightM*.22;face(animalGeometry,{x:0,y:bodyY,z:0});animalGeometry.dispose();
  for(const rock of w.rocks){const g=createRockGeometry(rock,0);face(g,{x:0,y:rock.scaleM*.43,z:0});g.dispose();}
});
test('hex trait colours are supplied once in Three linear colour space',()=>{
  const species=generateBiosphere('GEOMETRY-COLOUR','temperate','planet/0').species.find(s=>s.family==='branching');
  const geometry=createSpeciesGeometry(species,0), vertex=geometry.getAttribute('color'), expected=new Color(species.traits.woodColor);
  assert.ok(Math.abs(vertex.getX(0)-expected.r)<1e-6);assert.ok(Math.abs(vertex.getY(0)-expected.g)<1e-6);assert.ok(Math.abs(vertex.getZ(0)-expected.b)<1e-6);
  geometry.dispose();
});
