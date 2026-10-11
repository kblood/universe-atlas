import {children,tileKey,tileNeighbour,type Tile} from './planet-tiles.ts';
export const terrainParent=(t:Tile):Tile=>({face:t.face,level:t.level-1,x:Math.floor(t.x/2),y:Math.floor(t.y/2)});
const contains=(a:Tile,b:Tile)=>a.face===b.face&&a.level<=b.level&&Math.floor(b.x/2**(b.level-a.level))===a.x&&Math.floor(b.y/2**(b.level-a.level))===a.y;
/** A logical balanced tree need not retain off-screen GPU meshes. Newly visible
 * missing leaves use a complete resident ancestor, never a hole or an overlapping
 * parent/child pair. Visible shared edges retain the renderer's 2:1 contract. */
export function residentTerrainFrontier(leaves:readonly Tile[],resident:ReadonlyMap<string,unknown>,required:(tile:Tile)=>boolean):Tile[]{
 const cut=new Map(leaves.map(t=>[tileKey(t),t]));
 const coarsen=(tile:Tile)=>{
  let parent=tile;while(parent.level>0&&!resident.has(tileKey(parent)))parent=terrainParent(parent);
  if(!resident.has(tileKey(parent)))return false; // roots still loading
  if([...cut.values()].some(t=>t.level<parent.level&&contains(t,parent)))return false;
  let changed=false;for(const [key,t]of cut)if(contains(parent,t)){if(key!==tileKey(parent))changed=true;cut.delete(key);}
  cut.set(tileKey(parent),parent);return changed;
 };
 for(const tile of leaves)if(required(tile)&&!resident.has(tileKey(tile))&&cut.has(tileKey(tile)))coarsen(tile);
 // Coarsening a visible branch can expose a >2:1 edge. Coarsen its finer
 // visible neighbour too; an edge outside every retained camera/shadow frustum
 // need not upload geometry, but remains balanced in the logical tree.
 for(let pass=0;pass<leaves.length;pass++){
  let changed=false;
  for(const fine of [...cut.values()]){
   if(!cut.has(tileKey(fine))||!required(fine))continue;
   for(let edge=0;edge<4;edge++){
    let neighbour=tileNeighbour(fine,edge);while(neighbour.level&&!cut.has(tileKey(neighbour)))neighbour=terrainParent(neighbour);
    if(!cut.has(tileKey(neighbour))||fine.level<=neighbour.level+1||!required(neighbour))continue;
    let target=fine;while(target.level>neighbour.level+1)target=terrainParent(target);
    if(coarsen(target)){changed=true;break;}
   }
  }
  if(!changed)break;
 }
 return [...cut.values()];
}

/** A resident draw cut moves only one parent/child generation at a time.
 * Missing children retain their resident parent. Coarsening reverses the
 * children's real morph before the parent replaces them, including camera turns
 * whose desired fallback differs from the balanced logical selection. */
export function stepResidentTerrainFrontier(previous:readonly Tile[],target:readonly Tile[],resident:ReadonlyMap<string,unknown>,
 settled:(tile:Tile)=>boolean,reversed:(tile:Tile)=>boolean,required:(tile:Tile)=>boolean){
 const cut=new Map(previous.map(t=>[tileKey(t),t])),desired=new Map(target.map(t=>[tileKey(t),t]));
 const reversing=new Set<string>(),merged=new Set<string>(),split=new Set<string>(),requests=new Map<string,Tile>();
 const needed=new Set<string>();for(const tile of target)if(required(tile)){let p=tile;while(true){needed.add(tileKey(p));if(!p.level)break;p=terrainParent(p);}}
 if(!cut.size)return {tiles:[...target],reversing,merged,split,needed,requests:[...requests.values()]};
 const refine=(tile:Tile)=>needed.has(tileKey(tile))&&!desired.has(tileKey(tile));
 const finerBeside=(parent:Tile)=>[...cut.values()].some(t=>t.level>parent.level+1&&needed.has(tileKey(parent))&&needed.has(tileKey(t))&&[0,1,2,3].some(e=>contains(tileNeighbour(parent,e),t)));
 const parents=new Map(previous.filter(t=>t.level).map(t=>{const p=terrainParent(t);return [tileKey(p),p];}));
 for(const [key,parent]of parents){
  if(refine(parent)||!resident.has(key)||finerBeside(parent))continue;
  const kids=children(parent);if(!kids.every(t=>cut.has(tileKey(t))))continue;
  if(kids.every(reversed)){for(const kid of kids)cut.delete(tileKey(kid));cut.set(key,parent);merged.add(key);}
  else for(const kid of kids)reversing.add(tileKey(kid));
 }
 for(const tile of previous){
  const key=tileKey(tile);if(!cut.has(key)||!refine(tile)||reversing.has(key))continue;
  const kids=children(tile);for(const kid of kids)requests.set(tileKey(kid),kid);
  if(!settled(tile)||!kids.every(t=>resident.has(tileKey(t))))continue;
  // A split must not introduce a new >2:1 edge into the resident cut.
  if([0,1,2,3].some(e=>{let n=tileNeighbour(tile,e);while(n.level&&!cut.has(tileKey(n)))n=terrainParent(n);return cut.has(tileKey(n))&&n.level<tile.level&&needed.has(key)&&needed.has(tileKey(n));}))continue;
  cut.delete(key);for(const kid of kids){cut.set(tileKey(kid),kid);split.add(tileKey(kid));}
 }
 return {tiles:[...cut.values()],reversing,merged,split,needed,requests:[...requests.values()]};
}
