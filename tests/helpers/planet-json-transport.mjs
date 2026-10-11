/** QA-only lossless JSON string bridge; numeric tags preserve values that JSON loses. */
export function stringifyTransport(value){
 return JSON.stringify(value,(_key,v)=>{
  if(typeof v==='number'){
   if(Object.is(v,-0))return {__planetQaNumber:'-0'};
   if(!Number.isFinite(v))return {__planetQaNumber:String(v)};
  }
  return v;
 });
}
export function parseTransport(text){
 return JSON.parse(text,(_key,v)=>{
  if(v&&typeof v==='object'&&Object.keys(v).length===1&&Object.hasOwn(v,'__planetQaNumber')){
   const kind=v.__planetQaNumber;
   if(kind==='-0')return -0;
   if(kind==='Infinity')return Infinity;
   if(kind==='-Infinity')return -Infinity;
   if(kind==='NaN')return NaN;
   throw Error('Unknown QA numeric transport tag');
  }
  return v;
 });
}
export async function evaluateJson(page,fn,arg){
 // Playwright receives two strings rather than millions of SerializedValue nodes.
 const expression='Promise.resolve(('+fn.toString()+')(('+parseTransport.toString()+')('+JSON.stringify(stringifyTransport(arg)??'null')+'))).then('+stringifyTransport.toString()+')';
 return parseTransport(await page.evaluate(expression));
}
