import {buildDrainage} from './drainage.ts';
self.onmessage=({data})=>{
  try{
    const started=performance.now(),result=buildDrainage(data.body);
    const transfers=Object.values(result).filter(ArrayBuffer.isView).map(v=>(v as ArrayBufferView).buffer as ArrayBuffer);
    self.postMessage({result,buildMs:performance.now()-started},transfers);
  }catch(error){self.postMessage({error:String(error)});}
};
