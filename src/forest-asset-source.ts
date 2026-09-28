import type {ForestTreeFamilyInput,ForestTreeKind} from './forest-tree-family-library.ts';

export const FOREST_BUNDLE_BYTE_LIMIT=64*1024*1024;
const MANIFEST_LIMIT=1024*1024;
type Resource={path:string;bytes:number;sha256:string};
type Family={kind:ForestTreeKind;lod0:Resource;lod1:Resource;mipManifest:Resource;mipPayload:Resource};
type Bundle={schemaVersion:1;version:string;families:Family[]};
export type LoadedForestAssets={version:string;bytes:number;inputs:ForestTreeFamilyInput[]};
const roles=['lod0','lod1','mipManifest','mipPayload'] as const;

/** Only package-local resources; neither redirects nor manifest paths may move
 * the asset fetch to another origin or outside the package directory. */
export function validateForestBundle(value:unknown):Bundle{
  const m=value as Bundle;
  if(!m||m.schemaVersion!==1||typeof m.version!=='string'||!m.version||m.version.length>128||
    !Array.isArray(m.families)||m.families.length!==2||new Set(m.families.map(x=>x?.kind)).size!==2)
    throw new Error('Invalid forest bundle manifest');
  const paths=new Set<string>();let bytes=0;
  for(const family of m.families){
    if(!family||!['branching','spire'].includes(family.kind))throw new Error('Unsupported forest family');
    for(const role of roles){
      const r=family[role];
      if(!r||typeof r.path!=='string'||!r.path||r.path.length>240||!/^[-a-zA-Z0-9_./]+$/.test(r.path)||
        r.path.split('/').some(part=>!part||part==='.'||part==='..')||paths.has(r.path)||
        !Number.isSafeInteger(r.bytes)||r.bytes<1||r.bytes>(role==='mipManifest'?MANIFEST_LIMIT:32*1024*1024)||
        typeof r.sha256!=='string'||!(/^[a-f0-9]{64}$/).test(r.sha256))throw new Error(`Invalid forest ${role} resource`);
      paths.add(r.path);bytes+=r.bytes;
    }
  }
  if(bytes>FOREST_BUNDLE_BYTE_LIMIT)throw new Error('Forest bundle exceeds retained byte budget');
  return m;
}
const hash=async(data:ArrayBuffer)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data)))
  .map(x=>x.toString(16).padStart(2,'0')).join('');

/** One bounded, shared byte cache. GPU resources belong to each PlanetForest
 * and are disposed there. Re-entering a planet reuses verified input bytes.
 * Clear aborts pending requests and prevents stale completions from caching. */
export class ForestAssetSource{
  private cached:LoadedForestAssets|null=null;
  private pending:Promise<LoadedForestAssets>|null=null;
  private controller:AbortController|null=null;
  private generation=0;
  private error='';
  private manifestUrl:URL;
  private fetcher:typeof fetch;
  constructor(manifestUrl:URL,fetcher:typeof fetch=fetch){
    if(!['http:','https:'].includes(manifestUrl.protocol))throw new Error('Forest assets require HTTP(S)');
    this.manifestUrl=new URL(manifestUrl);this.fetcher=fetcher;
  }
  load():Promise<LoadedForestAssets>{
    if(this.cached)return Promise.resolve(this.cached);
    if(this.pending)return this.pending;
    const generation=++this.generation,controller=new AbortController();this.controller=controller;this.error='';
    const timeout=setTimeout(()=>controller.abort(new Error('Forest asset loading timed out')),90000);
    const task=this.fetchBundle(controller.signal).then(bundle=>{
      if(generation!==this.generation||controller.signal.aborted)throw new Error('Forest asset loading cancelled');
      this.cached=bundle;return bundle;
    }).catch(error=>{controller.abort();if(generation===this.generation)this.error=String(error);throw error;})
      .finally(()=>{clearTimeout(timeout);if(generation===this.generation){this.pending=null;this.controller=null;}});
    this.pending=task;return task;
  }
  clear(){this.generation++;this.controller?.abort();this.controller=null;this.pending=null;this.cached=null;this.error='';}
  diagnostics(){return {loading:!!this.pending,ready:!!this.cached,version:this.cached?.version??null,
    retainedBytes:this.cached?.bytes??0,byteLimit:FOREST_BUNDLE_BYTE_LIMIT,error:this.error};}
  private async read(url:URL,limit:number,signal:AbortSignal){
    // Browser fetch is a Window method. A stored callback invoked as
    // this.fetcher(...) receives this class instead and can fail before I/O.
    const response=await this.fetcher.call(globalThis,url,{signal,redirect:'error',credentials:'same-origin'});
    if(!response.ok)throw new Error(`Forest asset HTTP ${response.status}: ${url.pathname}`);
    const declared=Number(response.headers.get('content-length'));
    if(Number.isFinite(declared)&&declared>limit)throw new Error('Forest asset exceeds byte limit');
    if(!response.body)throw new Error('Forest asset response has no body');
    const reader=response.body.getReader(),chunks:Uint8Array[]=[];let length=0;
    try{
      for(;;){
        signal.throwIfAborted();const {done,value}=await reader.read();if(done)break;
        length+=value.byteLength;if(length>limit)throw new Error('Forest asset exceeds byte limit');chunks.push(value);
      }
    }catch(error){await reader.cancel().catch(()=>{});throw error;}
    finally{reader.releaseLock();}
    const bytes=new Uint8Array(length);let offset=0;
    for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return bytes.buffer;
  }
  private async fetchBundle(signal:AbortSignal):Promise<LoadedForestAssets>{
    const manifest=validateForestBundle(JSON.parse(new TextDecoder().decode(await this.read(this.manifestUrl,MANIFEST_LIMIT,signal))));
    const directory=new URL('.',this.manifestUrl);let bytes=0;
    const inputs:ForestTreeFamilyInput[]=[];
    // Sequential resource reads bound temporary copies and avoid decoding or
    // generating geometry while the transfer is underway.
    for(const family of manifest.families){
      const files={} as Record<typeof roles[number],ArrayBuffer>;
      for(const role of roles){
        const resource=family[role],url=new URL(resource.path,directory);
        const data=await this.read(url,resource.bytes,signal);
        if(data.byteLength!==resource.bytes||await hash(data)!==resource.sha256)throw new Error(`Forest ${role} integrity mismatch`);
        files[role]=data;bytes+=data.byteLength;
      }
      inputs.push({kind:family.kind,lod0:files.lod0,lod1:files.lod1,
        foliageMipSidecar:{manifest:JSON.parse(new TextDecoder().decode(files.mipManifest)),data:files.mipPayload}});
    }
    return {version:manifest.version,bytes,inputs};
  }
}
