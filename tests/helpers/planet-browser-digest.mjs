/** Browser-safe independent implementation of the declared typed-byte receipt.
 * Sorting includes newly constructed typed descriptors, not only source keys. */
export async function browserContentDigest(value){
 const seen=new Set(),hex=b=>Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,'0')).join(''),sha=async b=>hex(await crypto.subtle.digest('SHA-256',b));
 const describe=async v=>{if(!v||typeof v!=='object')return v;if(ArrayBuffer.isView(v))return {typed:v.constructor.name,bytes:v.byteLength,sha256:await sha(new Uint8Array(v.buffer,v.byteOffset,v.byteLength))};if(seen.has(v))throw Error('Cyclic receipt');seen.add(v);let out;if(Array.isArray(v))out=await Promise.all(v.map(describe));else{out={};for(const k of Object.keys(v).sort())out[k]=await describe(v[k]);}seen.delete(v);return out;};
 const sorted=v=>Array.isArray(v)?v.map(sorted):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,sorted(v[k])])):v;
 return sha(new TextEncoder().encode(JSON.stringify(sorted(await describe(value)))));
}
