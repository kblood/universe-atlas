import {hash64,noise,type Body,type V3} from './catalog.ts';
export const BIOME_VERSION='surface-biomes-1';
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
/** Habitat/material classification of existing geology, not a climate simulation.
 * Never changes the authoritative rock field or assumes all worlds support life. */
export function biomeClassifier(body:Body){
  const seed=Number(hash64(body.seed+'/macro-v1')&0xffffffffn);
  return (direction:V3,height:number,upDot=1)=>{
    const latitude=Math.abs(direction[1]);
    const moisture=noise(direction[0]*5+13,direction[1]*5+37,direction[2]*5+19,seed+30);
    const slope=Math.acos(Math.max(-1,Math.min(1,upDot)))*180/Math.PI;
    const ocean=!!body.water&&height<0;
    const frozen=body.type==='Ice world';
    const snow=frozen?1:body.water?clamp((latitude-.79)*7+Math.max(0,height-2600)/3300):0;
    const rock=clamp((slope-18)/27);
    const sand=body.water?clamp(1-height/160)*clamp(1-slope/30):.3*(1-rock);
    const weights=[sand*(1-snow)*(1-rock),(1-sand)*(1-snow)*(1-rock),rock*(1-snow),snow];
    if(!body.water&&!frozen){weights[0]=.65*(1-rock);weights[1]=0;weights[2]=1-weights[0];weights[3]=0;}
    const name=ocean?'Ocean':frozen?'Ice field':body.type==='Volcanic world'?'Volcanic rock':!body.water?(slope>24?'Rock escarpment':'Regolith plain'):snow>.6?'Alpine / polar snow':slope>30?'Rock escarpment':height<120?'Coastal sand':moisture<.43?'Dry upland':height>2300?'Mountain meadow':'Temperate ground';
    return {version:BIOME_VERSION,name,slopeDeg:slope,moisture,weights,ocean,
      forestPotential:!!body.water&&body.temperatureK>=250&&body.temperatureK<=325&&body.type!=='Volcanic world'&&!ocean&&snow<.2&&height>160&&height<2300&&slope<28&&moisture>.48};
  };
}
export function materialBytes(weights:number[]){
  const bytes=weights.map(x=>Math.floor(x*255));
  const largest=weights.indexOf(Math.max(...weights));
  bytes[largest]+=255-bytes.reduce((a,b)=>a+b,0);
  return bytes;
}
