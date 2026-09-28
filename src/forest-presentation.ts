import type {ForestTreeBinding} from './forest-tree-catalogue.ts';
import type {ForestTreeKind} from './forest-tree-family-library.ts';

export const FOREST_PRESENTATION_VERSION='forest-presentation-1';
const LOW=.8,RANGE=.4;
/** Shared eligibility for detailed and family-aware distant presentation.
 * The caller supplies the binding from the one already dated catalogue. */
export function forestPresentationFamily(binding:ForestTreeBinding|null,heightM:number,
  available:{has:(kind:ForestTreeKind)=>boolean}):ForestTreeKind|null{
  if(!binding||!Number.isFinite(heightM)||heightM<10||heightM>22)return null;
  const kind=binding.recipe.family;
  return available.has(kind)?kind:null;
}

/** Fits family and two bounded brightness values into the unused float channel
 * of the existing far instance buffer. Every encoded integer is exact in f32.
 * Code zero retains the legacy shape/roll tint. No identity or date is encoded. */
export function packForestPresentation(kind:ForestTreeKind,bark:number,foliage:number){
  if(!['branching','spire'].includes(kind)||![bark,foliage].every(x=>Number.isFinite(x)&&x>=LOW&&x<=LOW+RANGE))
    throw new Error('Invalid forest family presentation');
  const quantize=(x:number)=>Math.round((x-LOW)*255/RANGE);
  return (kind==='branching'?1:2)+4*quantize(foliage)+1024*quantize(bark);
}
export function unpackForestPresentation(code:number){
  if(!Number.isSafeInteger(code)||code<0||code>262142||code!==0&&![1,2].includes(code%4))
    throw new Error('Invalid packed forest presentation');
  if(code===0)return {kind:null,bark:1,foliage:1};
  return {kind:(code%4===1?'branching':'spire') as ForestTreeKind,
    foliage:LOW+(Math.floor(code/4)%256)*RANGE/255,bark:LOW+Math.floor(code/1024)*RANGE/255};
}

export const forestPresentationGLSL=`
float forestFamilyCode(float packed){return mod(packed,4.0);}
vec2 forestFamilyBrightness(float packed){
  return vec2(.8)+vec2(floor(packed/1024.0),mod(floor(packed/4.0),256.0))*(.4/255.0);
}
`;
