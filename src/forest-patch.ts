import {POPULATION_VERSION,populationCellAt,type PopulationCell} from './planet-population.ts';

/** Bounded census units for future canopy streaming. Eight cells per side is
 * ~144m at a cube face centre; physical patch area varies over the sphere.
 * This is an address partition, not a new population or a render primitive. */
export const FOREST_PATCH_SIDE=8;
export const FOREST_PATCH_VERSION='forest-patch-1';
export type ForestPatchAddress=Readonly<{face:number;n:number;x:number;y:number}>;
export type ForestPatch=Readonly<{key:string;address:ForestPatchAddress;testedCells:number;cells:readonly PopulationCell[]}>;

export function validateForestPatchAddress(address:ForestPatchAddress){
  const {face,n,x,y}=address,side=FOREST_PATCH_SIDE;
  if(!Number.isInteger(face)||face<0||face>5||!Number.isSafeInteger(n)||n<1||
    !Number.isSafeInteger(x)||!Number.isSafeInteger(y)||x<0||y<0||x>=Math.ceil(n/side)||y>=Math.ceil(n/side))throw new Error('Invalid forest patch address');
}
export function forestPatch(seed:string,address:ForestPatchAddress):ForestPatch {
  validateForestPatchAddress(address);
  const {face,n,x,y}=address,side=FOREST_PATCH_SIDE;
  const cells:PopulationCell[]=[];
  const x0=x*side,y0=y*side,x1=Math.min(n,x0+side),y1=Math.min(n,y0+side);
  for(let iy=y0;iy<y1;iy++)for(let ix=x0;ix<x1;ix++){
    const cell=populationCellAt(seed,face,n,ix,iy);if(cell)cells.push(cell);
  }
  return {key:JSON.stringify([seed,POPULATION_VERSION,FOREST_PATCH_VERSION,face,n,x,y]),
    address:{face,n,x,y},testedCells:(x1-x0)*(y1-y0),cells};
}

/** Summaries consume authoritative habitat results for every candidate. No
 * sparse 6.5% far sample is inflated into an invented dense forest. Heights
 * are absolute metres above the same terrain datum; the canopy never enters
 * the collision surface. Unknown candidates keep the patch incomplete. */
export type ForestHabitat=Readonly<{present:boolean;groundHeightM:number}>;
export function summarizeForestPatch(patch:ForestPatch,habitat:ReadonlyMap<string,ForestHabitat>){
  let resolved=0,trees=0,minGroundM=Infinity,maxNominalTopM=-Infinity,totalHeightM=0;
  for(const cell of patch.cells){
    const sample=habitat.get(cell.id);if(!sample)continue;
    if(!Number.isFinite(sample.groundHeightM))throw new Error('Non-finite forest ground height');
    resolved++;
    if(!sample.present)continue;
    trees++;minGroundM=Math.min(minGroundM,sample.groundHeightM);
    maxNominalTopM=Math.max(maxNominalTopM,sample.groundHeightM+cell.heightM);totalHeightM+=cell.heightM;
  }
  return {key:patch.key,complete:resolved===patch.cells.length,candidates:patch.cells.length,resolved,trees,
    minGroundM:trees?minGroundM:null,maxNominalTopM:trees?maxNominalTopM:null,meanTreeHeightM:trees?totalHeightM/trees:null};
}
