/** Byte-accurate buffer test double, not a GPU memory/performance measurement. */
export function composerFakeGl(options={}){
 const buffers=new Map(),bound=new Map(),elements=new Map(),canvas=new EventTarget();let next=0,reads=0,uploads=0,copies=0,lost=false,vao=null,allocations=0;
 const binding=target=>target===34963?elements.get(vao):bound.get(target);
 const gl={canvas,FLOAT:5126,SHORT:5122,UNSIGNED_SHORT:5123,UNSIGNED_BYTE:5121,UNSIGNED_INT:5125,COPY_READ_BUFFER:36662,COPY_WRITE_BUFFER:36663,COPY_WRITE_BUFFER_BINDING:36663,DYNAMIC_DRAW:35048,ELEMENT_ARRAY_BUFFER:34963,ELEMENT_ARRAY_BUFFER_BINDING:34965,VERTEX_ARRAY_BINDING:34229,BUFFER_SIZE:34660,
  getParameter(name){return name===34229?vao:name===34965?elements.get(vao)??null:bound.get(name)??null;},bindVertexArray(value){vao=value;},
  createBuffer(){const b={id:++next};buffers.set(b,null);return b;},deleteBuffer(b){buffers.delete(b);for(const state of [bound,elements])for(const[key,value]of state)if(value===b)state.set(key,null);},bindBuffer(target,b){if(target===34963)elements.set(vao,b);else bound.set(target,b);},
  bufferData(target,bytes){allocations++;buffers.set(binding(target),new Uint8Array(options.allocate?options.allocate(bytes,allocations):bytes));},
  getBufferParameter(target,name){if(name!==34660)throw new Error('Unexpected buffer query');return buffers.get(binding(target))?.byteLength??0;},
  bufferSubData(target,offset,data,start=0,count=data.length-start){uploads++;const bytes=new Uint8Array(data.buffer,data.byteOffset+start*data.BYTES_PER_ELEMENT,count*data.BYTES_PER_ELEMENT);buffers.get(binding(target)).set(bytes,offset);},
  getBufferSubData(target,offset,out){reads++;new Uint8Array(out.buffer,out.byteOffset,out.byteLength).set(buffers.get(binding(target)).subarray(offset,offset+out.byteLength));},
  copyBufferSubData(from,to,read,write,count){copies++;buffers.get(binding(to)).set(buffers.get(binding(from)).slice(read,read+count),write);},
  inspect(){return {buffers:buffers.size,bytes:[...buffers.values()].reduce((n,b)=>n+(b?.length??0),0),reads,uploads,copies};},
  isContextLost(){return lost;},
  contextLost(){lost=true;buffers.clear();bound.clear();elements.clear();vao=null;canvas.dispatchEvent(new Event('webglcontextlost',{cancelable:true}));},
  contextRestored(){lost=false;canvas.dispatchEvent(new Event('webglcontextrestored'));},
 };
 return gl;
}
