import {createRequire} from 'node:module';
import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
const root='C:/LLM/IWSDK',require=createRequire(join(root,'tools/assetctl/package.json'));
const {NodeIO}=require('@gltf-transform/core'),{ALL_EXTENSIONS}=require('@gltf-transform/extensions'),sharp=require('sharp');
const rows=[];
for(const [family,source,mips] of [['oak','atlas-ez-family-f/atlas-ez-oak.glb','tree-foliage-mips-oak-max7-e'],['pine','atlas-ez-conifer-family-13977-16m-v1e/atlas-ez-conifer.glb','tree-foliage-mips-conifer-max7-d']]){
  const document=await new NodeIO().registerExtensions(ALL_EXTENSIONS).readBinary(await readFile(join(root,'Assets/_assetctl',source)));
  const png=document.getRoot().listMaterials().find(m=>m.getName()==='MAT_AtlasFoliage').getBaseColorTexture().getImage();
  const rgba=await sharp(Buffer.from(png)).ensureAlpha().raw().toBuffer();
  const manifest=JSON.parse(await readFile(join(root,'Assets/_assetctl',mips,'mip-manifest.json')));
  const raw=await readFile(join(root,'Assets/_assetctl',mips,'foliage-mips.rgba8'));
  for(const level of [{level:0,data:rgba},...manifest.sidecar.levels.map(l=>({level:l.level,data:raw.subarray(l.offset,l.offset+l.byteLength)}))]){
    let meanAlpha=0,mask=0;
    for(let p=3;p<level.data.length;p+=4){meanAlpha+=level.data[p]/255;if(level.data[p]>=128)mask++;}
    meanAlpha/=level.data.length/4;mask/=level.data.length/4;
    rows.push({family,level:level.level,meanAlpha,maskCoverage:mask,hashToMaskRatio:meanAlpha/mask});
  }
}
await writeFile('test-results/family-capture/alpha-distribution.json',JSON.stringify({scope:'CPU texture coverage expectations, not rasterized mesh coverage',rows},null,2)+'\n');
console.log(JSON.stringify(rows));
