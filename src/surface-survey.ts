import {hash64,type Body,type V3} from './catalog.ts';
import {terrainSampler} from './terrain.ts';
import {surfaceNormal} from './planet-tiles.ts';
import {biomeClassifier} from './surface-biomes.ts';
export const SURVEY_VERSION='surface-survey-1';
export type SurfaceSite={id:string;name:string;direction:V3;elevationM:number;biome:string;slopeDeg:number;category:string};
/** Fixed global candidates keep site identity independent of view/LOD or requests.
 * A reconnaissance list, not a claim to have sampled every beach or mountain. */
export function surfaceSurvey(body:Body):SurfaceSite[]{
  if(body.kind==='star'||body.type==='Gas giant')return [];
  const sample=terrainSampler(body),classify=biomeClassifier(body),chosen=new Map<string,{site:SurfaceSite;score:number}>();
  for(let i=0;i<1536;i++){
    const y=1-2*(i+.5)/1536,phi=i*2.399963229728653,r=Math.sqrt(1-y*y),d:V3=[Math.cos(phi)*r,y,Math.sin(phi)*r];
    const s=sample(d);if(s.ocean)continue;
    const normal=surfaceNormal(body,d,sample),biome=classify(d,s.elevationM,d.reduce((a,x,j)=>a+x*normal[j],0));
    if(biome.slopeDeg>28)continue;
    const categories:[string,number][]=[['Highlands',s.elevationM],['Plains',-Math.abs(s.elevationM-400)-biome.slopeDeg*120]];
    if(body.water&&s.elevationM>2&&s.elevationM<160)categories.push(['Coast',-Math.abs(s.elevationM-35)-biome.slopeDeg*5]);
    if(biome.forestPotential)categories.push(['Temperate',biome.moisture*1000-biome.slopeDeg*10]);
    if(biome.weights[3]>.7)categories.push(['Ice / snow',-biome.slopeDeg*10]);
    for(const [category,score] of categories){
      if((chosen.get(category)?.score??-Infinity)>=score)continue;
      const key=hash64(body.seed+'/site/'+i),names=['Aster','Bracken','Cairn','Dun','Ember','Flint','Gale','Hollow','Iris','Jasper','Kestrel','Larch','Morrow','Nacre','Ochre','Pale'];
      chosen.set(category,{score,site:{id:body.id+'/site/'+i,name:names[Number(key%16n)]+' '+(category==='Highlands'?'Heights':category==='Coast'?'Shore':category==='Ice / snow'?'Reach':category==='Plains'?'Plain':'Vale'),direction:d,elevationM:s.elevationM,biome:biome.name,slopeDeg:biome.slopeDeg,category}});
    }
  }
  return [...chosen.values()].map(x=>x.site).filter((x,i,a)=>a.findIndex(y=>y.id===x.id)===i);
}
