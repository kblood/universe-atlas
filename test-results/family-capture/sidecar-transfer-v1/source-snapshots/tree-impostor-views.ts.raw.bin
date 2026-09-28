/** Pure capture/view contract for the authored-tree distance experiment.
 * Coordinates are object-space, right-handed, Y-up. Directions point from the
 * capture centre towards the camera. This module does not render impostors. */
export type TreeViewVector=readonly [number,number,number];
export const TREE_VIEW_VERSION='tree-full-octahedral-1';
export const TREE_VIEW_GRID=9;
const sign=(x:number)=>x<0?-1:1;
function unit(v:TreeViewVector):TreeViewVector {
  if(v.length!==3||v.some(x=>!Number.isFinite(x)))throw new Error('View direction must contain three finite components');
  // Avoid overflow/underflow for otherwise valid nonzero directions.
  const scale=Math.max(...v.map(Math.abs));
  if(scale===0)throw new Error('View direction must be nonzero');
  const a=v.map(x=>x/scale),length=Math.hypot(...a);
  return [a[0]/length,a[1]/length,a[2]/length];
}
export function encodeTreeView(direction:TreeViewVector):readonly [number,number] {
  const [x,y,z]=unit(direction),sum=Math.abs(x)+Math.abs(y)+Math.abs(z);
  const a=x/sum,b=z/sum;
  return y>=0?[(a+1)/2,(b+1)/2]:[((1-Math.abs(b))*sign(a)+1)/2,((1-Math.abs(a))*sign(b)+1)/2];
}
export function decodeTreeView(u:number,v:number):TreeViewVector {
  if(!Number.isFinite(u)||!Number.isFinite(v)||u<0||u>1||v<0||v>1)throw new Error('Octahedral coordinates must lie in [0,1]');
  let x=2*u-1,z=2*v-1;
  const y=1-Math.abs(x)-Math.abs(z),fold=Math.max(0,-y);
  x-=sign(x)*fold;z-=sign(z)*fold;
  return unit([x,y,z]);
}
function checkGrid(grid:number){
  // An odd vertex count places equator folds and axes on cell edges/diagonals.
  if(!Number.isInteger(grid)||grid<3||grid>33||grid%2!==1)throw new Error('Tree view grid must be odd and between 3 and 33');
}
export function treeViewBlend(direction:TreeViewVector,grid=TREE_VIEW_GRID){
  checkGrid(grid);
  const [u,v]=encodeTreeView(direction),n=grid-1;
  const gx=u*n,gy=v*n,x=Math.min(n-1,Math.floor(gx)),y=Math.min(n-1,Math.floor(gy));
  const a=gx-x,b=gy-y;
  const at=(dx:number,dy:number)=>({index:(y+dy)*grid+x+dx,x:x+dx,y:y+dy});
  // Choose diagonals that follow the octahedron's equator folds. A single
  // diagonal orientation throughout the square crosses faces in two quadrants.
  const sameQuadrant=(x<n/2)===(y<n/2);
  const vertices=sameQuadrant
    ? a+b<=1?[at(0,0),at(1,0),at(0,1)]:[at(1,1),at(0,1),at(1,0)]
    : a>=b?[at(0,0),at(1,0),at(1,1)]:[at(0,0),at(1,1),at(0,1)];
  // Barycentric weights are in the unfolded octahedron plane. Reconstructing
  // the original ray requires L1-normalized capture vectors, not unit vectors.
  const weights=sameQuadrant
    ? a+b<=1?[1-a-b,a,b]:[a+b-1,1-a,1-b]
    : a>=b?[1-a,a-b,b]:[1-b,a,b-a];
  return {uv:[u,v] as const,vertices,weights};
}
function cross(a:TreeViewVector,b:TreeViewVector):TreeViewVector {
  return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
}
export function treeCaptureBasis(direction:TreeViewVector){
  const towardCamera=unit(direction);
  const reference:TreeViewVector=Math.abs(towardCamera[1])>.999?[0,0,1]:[0,1,0];
  const right=unit(cross(reference,towardCamera)),up=unit(cross(towardCamera,right));
  // Each view stores its own basis; bases must not be interpolated at runtime.
  return {towardCamera,right,up};
}
export function treeCaptureViews(grid=TREE_VIEW_GRID){
  checkGrid(grid);
  return Array.from({length:grid*grid},(_,index)=>{
    const x=index%grid,y=Math.floor(index/grid),uv=[x/(grid-1),y/(grid-1)] as const;
    return {index,x,y,uv,...treeCaptureBasis(decodeTreeView(...uv))};
  });
}
