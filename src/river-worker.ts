import {buildDrainage} from './drainage.ts';
import {buildRiverRegion} from './river-generation.ts';
self.onmessage=({data})=>{
 try{
  const started=performance.now(),body={...data.body,hydrology:undefined};
  const graph=buildDrainage(body);
  // Discovery favours currently lit, non-polar coastlines. The chosen address,
  // not this viewing preference, is the immutable generator input.
  const score=(c:typeof graph.catchments[number])=>c.mouth.direction.reduce((sum,v,i)=>sum+v*(data.preferredSun?.[i]||0),0)-(Math.abs(c.mouth.direction[1])>.8?.75:0);
  const owners=data.parentId==='auto'?[...graph.catchments].sort((a,b)=>score(b)-score(a)):graph.catchments.filter(c=>c.id===data.parentId);
  if(!owners.length)throw new Error('This river address is not a major catchment on this body.');
  let result,lastError:unknown;
  for(const owner of owners){try{result=buildRiverRegion(body,owner);break;}catch(error){lastError=error;}}
  if(!result)throw lastError||new Error('No suitable coastal region was found within this pilot budget.');
  self.postMessage({result,buildMs:performance.now()-started});
 }catch(error){self.postMessage({error:String(error)});}
};
