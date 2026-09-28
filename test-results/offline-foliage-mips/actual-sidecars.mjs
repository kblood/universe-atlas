import {readFileSync,writeFileSync} from 'node:fs';
import {prepareTreeLODPair} from '../../src/tree-asset.ts';
import {decodeTreeFoliageSidecar} from '../../src/tree-foliage-sidecar.ts';
const root='C:/LLM/IWSDK/Assets/_assetctl/';
const ab=p=>{const b=readFileSync(p);return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);};
const cases=[['oak','atlas-ez-family-f/atlas-ez-oak','tree-foliage-mips-oak-max7-e'],['pine','atlas-ez-conifer-family-13977-16m-v1e/atlas-ez-conifer','tree-foliage-mips-conifer-max7-d']];
const report=[];
for(const [family,glb,dir] of cases){
 const {foliagePng}=prepareTreeLODPair(ab(root+glb+'.glb'),ab(root+glb+'.lod1.glb'));
 const manifest=JSON.parse(readFileSync(root+dir+'/mip-manifest.json'));
 const decoded=await decodeTreeFoliageSidecar({manifest,data:ab(root+dir+'/foliage-mips.rgba8')},foliagePng,.5);
 report.push({family,source:root+glb,manifest:root+dir+'/mip-manifest.json',basePngSha256:manifest.basePngSha256,payloadSha256:manifest.payloadSha256,payloadBytes:decoded.payloadBytes,levels:decoded.maxLevel,baseCoverage:decoded.baseCoverage,endpointCoverage:decoded.report.at(-1).coverage});
}
writeFileSync(new URL('actual-sidecar-report.json',import.meta.url),JSON.stringify({scope:'CPU actual GLB/sidecar binding; no GPU upload',report},null,2)+'\n');
console.log(JSON.stringify(report));
