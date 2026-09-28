import {galaxies,refByAddress,system} from '../src/catalog.ts';
import {buildCanonicalHydrology} from '../src/hydrology-registry.ts';
import {createForestCensus,FOREST_CENSUS_STRIDE} from '../src/forest-census.ts';
import {forestPatchAddresses} from '../src/forest-patch-selection.ts';
import {terrainSampler} from '../src/terrain.ts';
const started=performance.now();
try{
  const body=system(refByAddress(galaxies('LETHRA-001')[0],'G001/C2128,0,1/0')).planets[1];
  body.canonicalRivers=buildCanonicalHydrology(body).regions;
  const raw=[.7830496262,-.2907992331,.5497900408],center=raw.map(v=>v/Math.hypot(...raw));
  const addresses=forestPatchAddresses(center,body.radiusM,4500),census=await createForestCensus(body,0),values=[];
  for(const address of addresses){
    let patch=census.start(address);while(!patch)patch=census.step(64);
    for(let i=0;i<patch.records.length;i+=FOREST_CENSUS_STRIDE){
      const p=patch.records.subarray(i,i+FOREST_CENSUS_STRIDE);
      if(Math.hypot(p[1]-center[0],p[2]-center[1],p[3]-center[2])*body.radiusM<=4500)values.push(...p);
    }
  }
  const records=new Float64Array(values),sample=terrainSampler(body),ground=sample(center).groundHeightM,size=129,extent=5000,terrain=new Float32Array(size*size*3);
  // A tangent basis whose columns are east/up/north; use the identical frame
  // in the renderer below. Sphere positions stay double until local subtraction.
  const up=center,east=[-up[2],0,up[0]],el=Math.hypot(...east);for(let i=0;i<3;i++)east[i]/=el;
  const north=[east[1]*up[2]-east[2]*up[1],east[2]*up[0]-east[0]*up[2],east[0]*up[1]-east[1]*up[0]];
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const u=(x/(size-1)*2-1)*extent,v=(y/(size-1)*2-1)*extent;
    const direction=up.map((n,i)=>n*body.radiusM+east[i]*u+north[i]*v),l=Math.hypot(...direction);for(let i=0;i<3;i++)direction[i]/=l;
    const h=sample(direction).groundHeightM,p=direction.map((n,i)=>n*(body.radiusM+h)-up[i]*(body.radiusM+ground));
    terrain.set([p.reduce((s,n,i)=>s+n*east[i],0),p.reduce((s,n,i)=>s+n*up[i],0),p.reduce((s,n,i)=>s+n*north[i],0)],(y*size+x)*3);
  }
  postMessage({bodyId:body.id,radiusM:body.radiusM,center,ground,east,north,records,terrain,size,patches:addresses.length,workerMs:performance.now()-started,cache:census.diagnostics()},[records.buffer,terrain.buffer]);
}catch(error){postMessage({error:String(error)});}
