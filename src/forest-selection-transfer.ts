import type {PopulationCell} from './planet-population.ts';

/** Address + seven physical/query doubles + a representative flag. Float64
 * avoids moving cell roots or changing distance ordering at a worker boundary.
 * This version belongs to the message format, not the deterministic world. */
export const FOREST_TRANSFER_VERSION=1;
const STRIDE=12;
export const FOREST_TRANSFER_MAX_CELLS=65536;
export type ForestSelectionTransfer={version:number;count:number;buffer:ArrayBuffer};

function validRecord(a:Float64Array,k:number){
  const face=a[k],n=a[k+1],x=a[k+2],y=a[k+3],representative=a[k+11];
  return Number.isInteger(face)&&face>=0&&face<6&&Number.isSafeInteger(n)&&n>0&&
    Number.isInteger(x)&&x>=0&&x<n&&Number.isInteger(y)&&y>=0&&y<n&&
    Number.isFinite(a[k+4])&&Number.isFinite(a[k+5])&&Number.isFinite(a[k+6])&&
    Math.abs(Math.hypot(a[k+4],a[k+5],a[k+6])-1)<1e-10&&
    Number.isFinite(a[k+7])&&a[k+7]>=0&&a[k+7]<1&&
    Number.isFinite(a[k+8])&&a[k+8]>0&&Number.isFinite(a[k+9])&&
    Number.isFinite(a[k+10])&&a[k+10]>=0&&(representative===-1||representative===0||representative===1);
}

export function packForestSelection(cells:PopulationCell[]):ForestSelectionTransfer {
  if(cells.length>FOREST_TRANSFER_MAX_CELLS)throw new Error('Forest transfer cell limit exceeded');
  const a=new Float64Array(cells.length*STRIDE);
  for(let i=0;i<cells.length;i++){
    const c=cells[i],parts=c.id.split('/').map(Number),k=i*STRIDE;
    if(parts.length!==4||parts.join('/')!==c.id||c.direction.length!==3)throw new Error('Invalid forest transfer address');
    a.set([...parts,...c.direction,c.roll,c.heightM,c.yaw,c.distanceM,c.canopyRepresentative===undefined?-1:Number(c.canopyRepresentative)],k);
    if(!validRecord(a,k))throw new Error('Invalid forest transfer record');
  }
  return {version:FOREST_TRANSFER_VERSION,count:cells.length,buffer:a.buffer};
}

export function unpackForestSelection(packet:ForestSelectionTransfer):PopulationCell[]{
  if(!packet||packet.version!==FOREST_TRANSFER_VERSION||!Number.isSafeInteger(packet.count)||
    packet.count<0||packet.count>FOREST_TRANSFER_MAX_CELLS||!(packet.buffer instanceof ArrayBuffer)||
    packet.buffer.byteLength!==packet.count*STRIDE*Float64Array.BYTES_PER_ELEMENT)throw new Error('Invalid forest transfer envelope');
  const a=new Float64Array(packet.buffer),cells:PopulationCell[]=[];
  for(let i=0;i<packet.count;i++){
    const k=i*STRIDE;if(!validRecord(a,k))throw new Error('Invalid forest transfer record');
    const cell:PopulationCell={id:`${a[k]}/${a[k+1]}/${a[k+2]}/${a[k+3]}`,
      direction:[a[k+4],a[k+5],a[k+6]],roll:a[k+7],heightM:a[k+8],yaw:a[k+9],distanceM:a[k+10]};
    if(a[k+11]!==-1)cell.canopyRepresentative=a[k+11]===1;
    cells.push(cell);
  }
  return cells;
}
