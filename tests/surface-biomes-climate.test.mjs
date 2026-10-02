// W1-A-CLASSIFIER (docs/biome-climate-increment-1-plan-2026-10-02.json):
// classifier v2 reads the shared surface-climate-1 field.
//
// `legacyClassifier` below is a FROZEN copy of surface-biomes-1's
// biomeClassifier (main a9e3654), kept as the oracle for the invariants v2
// must preserve (moisture bit-identity, the body clause, the airless branch).
// Never edit it to follow the live classifier.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {hash64,noise,galaxies,refByAddress,system} from '../src/catalog.ts';
import {biomeClassifier} from '../src/surface-biomes.ts';

const clampL=(x)=>Math.max(0,Math.min(1,x));
export function legacyClassifier(body,waterLevelM=0){
  const seed=Number(hash64(body.seed+'/macro-v1')&0xffffffffn);
  return (direction,height,upDot=1)=>{
    const latitude=Math.abs(direction[1]);
    const moisture=noise(direction[0]*5+13,direction[1]*5+37,direction[2]*5+19,seed+30);
    const slope=Math.acos(Math.max(-1,Math.min(1,upDot)))*180/Math.PI;
    const ocean=!!body.water&&height<waterLevelM;
    const frozen=body.type==='Ice world';
    const snow=frozen?1:body.water?clampL((latitude-.79)*7+Math.max(0,height-2600)/3300):0;
    const rock=clampL((slope-18)/27);
    const sand=body.water?clampL(1-height/160)*clampL(1-slope/30):.3*(1-rock);
    const weights=[sand*(1-snow)*(1-rock),(1-sand)*(1-snow)*(1-rock),rock*(1-snow),snow];
    if(!body.water&&!frozen){weights[0]=.65*(1-rock);weights[1]=0;weights[2]=1-weights[0];weights[3]=0;}
    const name=ocean?'Ocean':frozen?'Ice field':body.type==='Volcanic world'?'Volcanic rock':!body.water?(slope>24?'Rock escarpment':'Regolith plain'):snow>.6?'Alpine / polar snow':slope>30?'Rock escarpment':height<120?'Coastal sand':moisture<.43?'Dry upland':height>2300?'Mountain meadow':'Temperate ground';
    return {version:'surface-biomes-1',name,slopeDeg:slope,moisture,weights,ocean,
      forestPotential:!!body.water&&body.temperatureK>=250&&body.temperatureK<=325&&body.type!=='Volcanic world'&&!ocean&&snow<.2&&height>160&&height<2300&&slope<28&&moisture>.48};
  };
}

const maithea=system(refByAddress(galaxies('LETHRA-001')[0],'G001/C2128,0,1/0')).planets[1];

test('oracle: the frozen legacy copy matches the classifier it was taken from (pre-v2 only)',()=>{
  const live=biomeClassifier(maithea),old=legacyClassifier(maithea);
  for(let i=0;i<2000;i++){
    const y=1-2*(i+.5)/2000,p=i*2.399963229728653,r=Math.sqrt(1-y*y),d=[Math.cos(p)*r,y,Math.sin(p)*r];
    for(const h of [-200,100,1500,4000])assert.deepEqual(live(d,h,.9),old(d,h,.9));
  }
});
