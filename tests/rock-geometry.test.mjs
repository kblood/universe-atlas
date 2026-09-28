import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateBiosphere} from '../src/biosphere-model.ts';
import {buildRockMesh,icosphere,ROCK_MAX_TRIANGLES,ROCK_LOD_COUNT,rockMeshBytes} from '../src/rock-geometry.ts';

const worlds=['temperate','arid','cold','airless'].map((profile,i)=>generateBiosphere('LETHRA-001',profile,`body/${i}`));
const families=worlds.flatMap(w=>w.rocks);
const byForm=form=>families.filter(f=>f.form===form);
const faces=m=>{const out=[];for(let t=0;t<m.triangles;t++){const v=[0,1,2].map(k=>[...m.positions.slice((t*3+k)*3,(t*3+k)*3+3)]),n=[0,1,2].map(k=>[...m.normals.slice((t*3+k)*3,(t*3+k)*3+3)]);out.push({v,n});}return out;};
const sub=(a,b)=>a.map((x,i)=>x-b[i]),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];

test('meshes are deterministic per family, variant and LOD and differ between variants',()=>{
  for(const f of families)for(let lod=0;lod<ROCK_LOD_COUNT;lod++){
    const a=buildRockMesh(f,0,lod),b=buildRockMesh(structuredClone(f),0,lod);
    assert.deepEqual(Buffer.from(a.positions.buffer),Buffer.from(b.positions.buffer));
    assert.deepEqual(Buffer.from(a.colors.buffer),Buffer.from(b.colors.buffer));
    assert.notDeepEqual(Buffer.from(buildRockMesh(f,1,lod).positions.buffer),Buffer.from(a.positions.buffer));
  }
  assert.throws(()=>buildRockMesh(families[0],3,0));assert.throws(()=>buildRockMesh(families[0],0,3));
  assert.throws(()=>buildRockMesh({...families[0],form:'crystal'},0,0));
});

test('triangle budgets, unit normalisation, bounds and normals hold at every LOD',()=>{
  assert.deepEqual([0,1,2].map(l=>icosphere(l).faces.length),[20,80,320]);
  for(const f of families)for(let v=0;v<3;v++){
    let previous=Infinity;
    for(let lod=0;lod<ROCK_LOD_COUNT;lod++){
      const m=buildRockMesh(f,v,lod);
      assert.ok(m.triangles>0&&m.triangles<=ROCK_MAX_TRIANGLES[lod]);assert.ok(m.triangles<=previous);previous=m.triangles;
      assert.equal(rockMeshBytes(m),m.triangles*3*36);
      let maxR=0,minY=Infinity;
      for(let i=0;i<m.positions.length;i+=3){
        const [x,y,z]=[m.positions[i],m.positions[i+1],m.positions[i+2]];maxR=Math.max(maxR,Math.hypot(x,z));minY=Math.min(minY,y);
        assert.ok(Math.hypot(x,y-m.boundCenterY,z)<=m.boundRadius+1e-6);
        assert.ok(Math.abs(Math.hypot(m.normals[i],m.normals[i+1],m.normals[i+2])-1)<1e-5);
        for(let j=0;j<3;j++)assert.ok(m.colors[i+j]>0&&m.colors[i+j]<=1);
      }
      assert.ok(Math.abs(maxR-.5)<1e-6);assert.ok(Math.abs(minY)<1e-6);
      assert.ok(m.height>.3&&m.height<1.1,`${f.form} height ${m.height}`);
    }
  }
});

test('winding and normals face outward so FrontSide lighting and shadows are correct',()=>{
  for(const f of families)for(let lod=0;lod<ROCK_LOD_COUNT;lod++){
    const m=buildRockMesh(f,1,lod);let outward=0,agree=0;const all=faces(m);
    for(const {v,n} of all){
      const face=cross(sub(v[1],v[0]),sub(v[2],v[0])),centre=v[0].map((_,i)=>(v[0][i]+v[1][i]+v[2][i])/3);
      const avg=[0,1,2].map(i=>n[0][i]+n[1][i]+n[2][i]);
      if(dot(face,avg)>0)agree++;
      if(dot(face,[centre[0],centre[1]-m.boundCenterY,centre[2]])>0)outward++;
    }
    assert.equal(agree,all.length,`${f.form} lod${lod}: winding agrees with shading normals`);
    // Convex forms are strictly outward; stepped strata expose some inward-sloping ledge faces relative to the centroid.
    assert.ok(outward/all.length>(f.form==='layered'?.7:.97),`${f.form} lod${lod} outward ${outward}/${all.length}`);
  }
});

test('the three canonical forms read distinctly: faceted, smooth and stratified',()=>{
  // Share of flat-shaded triangles on the exposed surface (the buried underside of a boulder is deliberately flat).
  const flatShare=m=>{let flat=0,exposed=0;for(const {v,n} of faces(m)){if((v[0][1]+v[1][1]+v[2][1])/3<.15*m.height)continue;exposed++;if(dot(n[0],n[1])>.9999&&dot(n[0],n[2])>.9999)flat++;}return flat/exposed;};
  for(const f of byForm('angular')){const m=buildRockMesh(f,0,0);assert.equal(flatShare(m),1);
    const planes=new Set(faces(m).map(({n})=>n[0].map(x=>x.toFixed(3)).join(',')));assert.ok(planes.size>=8&&planes.size<=32&&planes.size*1.5<=m.triangles,`angular facets ${planes.size}`);}
  for(const f of byForm('rounded'))assert.ok(flatShare(buildRockMesh(f,0,0))<.05);
  for(const f of byForm('layered')){
    // One exposed, horizontal ledge per stratum at LOD0; merged strata at LOD1; one slab at LOD2.
    const ledges=lod=>new Set(faces(buildRockMesh(f,2,lod)).filter(({n})=>n[0][1]>.999).map(({v})=>v[0][1].toFixed(4))).size;
    assert.equal(ledges(0),Math.max(2,f.layers));assert.equal(ledges(1),Math.ceil(Math.max(2,f.layers)/2));assert.equal(ledges(2),1);
  }
  // Family roughness drives shape irregularity (more facets for rougher angular stone).
  const [smooth,rough]=[{...byForm('angular')[0],roughness:.25},{...byForm('angular')[0],roughness:.85}];
  const facets=f=>new Set(faces(buildRockMesh(f,0,0)).map(({n})=>n[0].map(x=>x.toFixed(3)).join(','))).size;
  assert.ok(facets(rough)>facets(smooth));
});
