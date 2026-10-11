import * as THREE from 'three';
import {composerStorageCodec, type ComposerStoredArray} from './fauna-composer-storage.ts';

export const COMPOSER_ARENA_ATTRIBUTES = [['position',3],['normal',3],['color',3],['skinWeight',4],['composerGloss',1],['coatL0',3],['coatL1',3],['coatL2',3],['coatSample',4],['composerActor',1],['skinIndex',4]] as const;
type ArrayType = typeof Float32Array|typeof Int16Array|typeof Uint16Array|typeof Uint8Array;
export function composerArenaArrayType(name:string,packed:boolean):ArrayType {
  return !packed ? (name==='skinIndex'?Uint16Array:Float32Array) : name==='normal'?Int16Array : name==='composerGloss'||name==='skinIndex'?Uint8Array : composerStorageCodec(name)||name==='composerActor'?Uint16Array:Float32Array;
}
type Attribute = {buffer:WebGLBuffer;attribute:THREE.GLBufferAttribute;ArrayType:ArrayType;width:number;scratch:ComposerStoredArray;bytes:number};

/** WebGL2 owns the full arena. Only bounded upload scratch stays on the CPU.
 * COPY_* bindings deliberately avoid Three's vertex-array binding state. */
export class FaunaComposerGpuBuffers {
  readonly attributes=new Map<string,Attribute>();
  readonly indexScratch=new Uint32Array(768);
  readonly cpuBytes:number;
  readonly gpuBytes:number;
  private indexBuffer!:WebGLBuffer;
  private indexAttribute!:THREE.GLBufferAttribute;
  private disposed=false;
  readonly gl:WebGL2RenderingContext;
  private readonly indices:number;
  private readonly packed:boolean;
  constructor(gl:WebGL2RenderingContext,geometry:THREE.BufferGeometry,vertices:number,indices:number,packed:boolean) {
    this.gl=gl;this.indices=indices;this.packed=packed;
    if(typeof gl.copyBufferSubData!=='function'||typeof gl.getBufferSubData!=='function')throw new Error('GPU-owned Composer arenas require WebGL2');
    let cpu=this.indexScratch.byteLength,gpu=indices*4;
    try {
      for(const [name,width] of COMPOSER_ARENA_ATTRIBUTES){
        const ArrayType=composerArenaArrayType(name,packed),scratch=new ArrayType(128*width),bytes=vertices*width*ArrayType.BYTES_PER_ELEMENT;
        const buffer=this.allocate(bytes),type=ArrayType===Float32Array?gl.FLOAT:ArrayType===Int16Array?gl.SHORT:ArrayType===Uint16Array?gl.UNSIGNED_SHORT:gl.UNSIGNED_BYTE;
        const attribute=new THREE.GLBufferAttribute(buffer,type,width,ArrayType.BYTES_PER_ELEMENT as 1|2|4,vertices,packed&&!!composerStorageCodec(name));
        this.attributes.set(name,{buffer,attribute,ArrayType,width,scratch,bytes});
        // GLBufferAttribute is a supported renderer input but Three's default
        // BufferGeometry attribute map still declares CPU BufferAttribute only.
        geometry.setAttribute(name,attribute as unknown as THREE.BufferAttribute);cpu+=scratch.byteLength;gpu+=bytes;
      }
      this.indexBuffer=this.allocate(indices*4,true);
      this.indexAttribute=new THREE.GLBufferAttribute(this.indexBuffer,gl.UNSIGNED_INT,1,4,indices);
      // Three supports GLBufferAttribute indices at runtime; its index type is narrower.
      geometry.setIndex(this.indexAttribute as unknown as THREE.BufferAttribute);
    }catch(error){this.dispose();throw error;}
    this.cpuBytes=cpu;this.gpuBytes=gpu;
  }
  private allocate(bytes:number,index=false):WebGLBuffer {
    const gl=this.gl,buffer=gl.createBuffer();if(!buffer)throw new Error('Composer GPU buffer allocation failed');
    if(index){
      // WebGL tags an index buffer on its FIRST binding. COPY_WRITE first would
      // tag it as vertex data and reject the later ELEMENT_ARRAY_BUFFER draw.
      // Use the default VAO temporarily without changing Three's bound VAO.
      const vao=gl.getParameter(gl.VERTEX_ARRAY_BINDING);gl.bindVertexArray(null);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,buffer);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,bytes,gl.DYNAMIC_DRAW);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,null);gl.bindVertexArray(vao);
    }else{gl.bindBuffer(gl.COPY_WRITE_BUFFER,buffer);gl.bufferData(gl.COPY_WRITE_BUFFER,bytes,gl.DYNAMIC_DRAW);gl.bindBuffer(gl.COPY_WRITE_BUFFER,null);}
    return buffer;
  }
  scratch(name:string):ComposerStoredArray{return this.attributes.get(name)!.scratch;}
  upload(name:string,vertex:number,count:number):void {
    const gl=this.gl,a=this.attributes.get(name)!;gl.bindBuffer(gl.COPY_WRITE_BUFFER,a.buffer);
    gl.bufferSubData(gl.COPY_WRITE_BUFFER,vertex*a.width*a.ArrayType.BYTES_PER_ELEMENT,a.scratch,0,count*a.width);gl.bindBuffer(gl.COPY_WRITE_BUFFER,null);
  }
  uploadIndices(index:number,count:number):void {
    const gl=this.gl;gl.bindBuffer(gl.COPY_WRITE_BUFFER,this.indexBuffer);gl.bufferSubData(gl.COPY_WRITE_BUFFER,index*4,this.indexScratch,0,count);gl.bindBuffer(gl.COPY_WRITE_BUFFER,null);
  }
  clearIndices(index:number,count:number):void {
    if(this.gl.isContextLost())return;
    this.indexScratch.fill(0);for(let i=0;i<count;i+=this.indexScratch.length)this.uploadIndices(index+i,Math.min(this.indexScratch.length,count-i));
  }
  copyVertices(source:FaunaComposerGpuBuffers,from:number,to:number,count:number):void {
    if(source.gl!==this.gl||source.packed!==this.packed)throw new Error('Composer GPU arena copy context/storage mismatch');
    const gl=this.gl;
    for(const [name,a] of this.attributes){if(name==='composerActor')continue;
      const stride=a.width*a.ArrayType.BYTES_PER_ELEMENT;gl.bindBuffer(gl.COPY_READ_BUFFER,source.attributes.get(name)!.buffer);gl.bindBuffer(gl.COPY_WRITE_BUFFER,a.buffer);
      gl.copyBufferSubData(gl.COPY_READ_BUFFER,gl.COPY_WRITE_BUFFER,from*stride,to*stride,count*stride);
    }
    gl.bindBuffer(gl.COPY_READ_BUFFER,null);gl.bindBuffer(gl.COPY_WRITE_BUFFER,null);
  }
  /** Explicit inspection only. No draw/admission/pose path performs readback. */
  read(name:string,vertex:number,count:number):ComposerStoredArray {
    const gl=this.gl,a=this.attributes.get(name)!,out=new a.ArrayType(count*a.width);
    gl.bindBuffer(gl.COPY_READ_BUFFER,a.buffer);gl.getBufferSubData(gl.COPY_READ_BUFFER,vertex*a.width*a.ArrayType.BYTES_PER_ELEMENT,out);gl.bindBuffer(gl.COPY_READ_BUFFER,null);return out;
  }
  readIndices(index:number,count:number):Uint32Array {
    const gl=this.gl,out=new Uint32Array(count);gl.bindBuffer(gl.COPY_READ_BUFFER,this.indexBuffer);gl.getBufferSubData(gl.COPY_READ_BUFFER,index*4,out);gl.bindBuffer(gl.COPY_READ_BUFFER,null);return out;
  }
  restore():void {
    // Lost-context WebGL objects are already destroyed. Passing those old
    // generation handles to deleteBuffer in a restored context is invalid.
    for(const a of this.attributes.values()){a.buffer=this.allocate(a.bytes);a.attribute.setBuffer(a.buffer);a.attribute.needsUpdate=true;}
    this.indexBuffer=this.allocate(this.indices*4,true);this.indexAttribute.setBuffer(this.indexBuffer);this.indexAttribute.needsUpdate=true;
  }
  dispose():void {
    if(this.disposed)return;this.disposed=true;
    // Also delete buffers never registered by a draw; geometry.dispose alone cannot.
    for(const a of this.attributes.values())this.gl.deleteBuffer(a.buffer);
    if(this.indexBuffer)this.gl.deleteBuffer(this.indexBuffer);
  }
}
