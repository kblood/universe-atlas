import {inflateSync} from 'node:zlib';

/** Minimal non-interlaced 8-bit RGBA/RGB PNG decoder for asset tests. */
export function decodePngRgba(bytes){
  const buffer=Buffer.from(bytes.buffer??bytes,bytes.byteOffset??0,bytes.byteLength??bytes.length);
  if(buffer.readUInt32BE(0)!==0x89504e47)throw new Error('Not a PNG');
  let offset=8,width=0,height=0,type=0;const idat=[];
  while(offset<buffer.length){
    const length=buffer.readUInt32BE(offset),name=buffer.toString('ascii',offset+4,offset+8),data=buffer.subarray(offset+8,offset+8+length);
    if(name==='IHDR'){
      width=data.readUInt32BE(0);height=data.readUInt32BE(4);type=data[9];
      if(data[8]!==8||![2,6].includes(type)||data[12]!==0)throw new Error('Unsupported PNG layout');
    }else if(name==='IDAT')idat.push(data);else if(name==='IEND')break;
    offset+=12+length;
  }
  const channels=type===6?4:3,stride=width*channels,raw=inflateSync(Buffer.concat(idat)),out=new Uint8ClampedArray(width*height*4);
  let previous=new Uint8Array(stride),row=new Uint8Array(stride);
  for(let y=0;y<height;y++){
    const filter=raw[y*(stride+1)],line=raw.subarray(y*(stride+1)+1,(y+1)*(stride+1));
    for(let i=0;i<stride;i++){
      const a=i>=channels?row[i-channels]:0,b=previous[i],c=i>=channels?previous[i-channels]:0;
      let predictor=0;
      if(filter===1)predictor=a;else if(filter===2)predictor=b;else if(filter===3)predictor=(a+b)>>1;
      else if(filter===4){const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);predictor=pa<=pb&&pa<=pc?a:pb<=pc?b:c;}
      row[i]=(line[i]+predictor)&255;
    }
    for(let x=0;x<width;x++){
      const o=(y*width+x)*4;out[o]=row[x*channels];out[o+1]=row[x*channels+1];out[o+2]=row[x*channels+2];out[o+3]=channels===4?row[x*channels+3]:255;
    }
    [previous,row]=[row,previous];
  }
  return {width,height,data:out};
}
