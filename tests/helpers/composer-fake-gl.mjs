/** Byte-accurate buffer test double, not a GPU memory/performance measurement. */
export function composerFakeGl(){
 const buffers=new Map(),bound=new Map(),canvas=new EventTarget();let next=0,reads=0,uploads=0,copies=0,lost=false;
 const gl={canvas,FLOAT:5126,SHORT:5122,UNSIGNED_SHORT:5123,UNSIGNED_BYTE:5121,UNSIGNED_INT:5125,COPY_READ_BUFFER:36662,COPY_WRITE_BUFFER:36663,DYNAMIC_DRAW:35048,ELEMENT_ARRAY_BUFFER:34963,VERTEX_ARRAY_BINDING:34229,
  getParameter(){return null;},bindVertexArray(){},
  createBuffer(){const b={id:++next};buffers.set(b,null);return b;},deleteBuffer(b){buffers.delete(b);},bindBuffer(target,b){bound.set(target,b);},
  bufferData(target,bytes){buffers.set(bound.get(target),new Uint8Array(bytes));},
  bufferSubData(target,offset,data,start=0,count=data.length-start){uploads++;const bytes=new Uint8Array(data.buffer,data.byteOffset+start*data.BYTES_PER_ELEMENT,count*data.BYTES_PER_ELEMENT);buffers.get(bound.get(target)).set(bytes,offset);},
  getBufferSubData(target,offset,out){reads++;new Uint8Array(out.buffer,out.byteOffset,out.byteLength).set(buffers.get(bound.get(target)).subarray(offset,offset+out.byteLength));},
  copyBufferSubData(from,to,read,write,count){copies++;buffers.get(bound.get(to)).set(buffers.get(bound.get(from)).slice(read,read+count),write);},
  inspect(){return {buffers:buffers.size,bytes:[...buffers.values()].reduce((n,b)=>n+(b?.length??0),0),reads,uploads,copies};},
  isContextLost(){return lost;},
  contextLost(){lost=true;buffers.clear();canvas.dispatchEvent(new Event('webglcontextlost',{cancelable:true}));},
  contextRestored(){lost=false;canvas.dispatchEvent(new Event('webglcontextrestored'));},
 };
 return gl;
}
