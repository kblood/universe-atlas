/** Frozen canonical source and palettes; reducers consume these exact bodies. */
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {generateCreatureGenome,realisticIndividualCreatureGenome,CREATURE_GENOME_VERSION} from '../src/creature-model.ts';
import {buildQuadrupedBody,QUADRUPED_BODY_VERSION} from '../src/fauna-body-plan.ts';
import {quadrupedPoseAt} from '../src/fauna-locomotion.ts';
import {FaunaBonePaletteWriter} from '../src/fauna-skinned-batch.ts';
const out=process.env.ATLAS_RESULTS||'test-results/fauna-lod-review-corpus';await mkdir(out,{recursive:true});
const seed='ANIMAL-SYSTEM-20261010-CANONICAL-REVIEW';
const sourceCommit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const modules={};for(const file of ['creature-model.ts','fauna-body-plan.ts','fauna-locomotion.ts','fauna-skinned-batch.ts'])modules[file]=createHash('sha256').update(await readFile('src/'+file)).digest('hex');
const fields=['positions','normals','colors','skinIndex','skinWeight','index'];
const writer=new FaunaBonePaletteWriter();
const rows=[];
const specimens=[];
for(const [archetype,family]of [['browser','ungulate'],['runner','cursorial'],['low-slung','padded'],['long-neck','long-neck']])for(const stage of ['adult','juvenile']){
  const id=seed+'/'+archetype+'/'+stage,genome=realisticIndividualCreatureGenome(generateCreatureGenome(seed,archetype),id,0,stage,family);
  specimens.push({id,genome,archetype,family,stage,seed});
}
const fixturePath='C:/LLM/IWSDK/Assets/_assetctl/life-presentation-20261009/baseline-flight/replay.json',fixture=JSON.parse(await readFile(fixturePath,'utf8'));
for(const world of fixture.worlds)specimens.push({id:world.target.id,genome:world.target.genome,archetype:world.target.genome.archetype,family:world.target.genome.morphology?.family,
  stage:'actual-planet-individual',seed:null,worldId:world.bodyId,date:world.date,fixturePath});
for(const specimen of specimens){
  const {id,genome}=specimen;
  const body=buildQuadrupedBody(genome),hash=createHash('sha256');for(const field of fields)hash.update(new Uint8Array(body[field].buffer,body[field].byteOffset,body[field].byteLength));
  const member={id,anchorOffsetX:0,anchorOffsetZ:0,orbitRadiusM:5,orbitAngularSpeed:.15,orbitPhase:0,gaitPeriodS:12};
  const poses=[];
  for(const [name,phase,behaviour]of [['rest',0,'alert'],['walk',.18,'alert'],['feed',0,'feed']]){
    const activity={pose:{x:0,z:0,yaw:0,gait:name==='walk'?'walk':'idle'},travel:phase,stateS:3};
    const pose=quadrupedPoseAt(body.plan,member,activity,()=>0,phase*10,{behaviour}),palette=new Float32Array(22*16);
    writer.write(body.plan,pose,palette);
    poses.push({name,phase,behaviour,member,activity,palette:Array.from(palette),pose});
  }
  rows.push({...specimen,sourceDigest:hash.digest('hex'),plan:body.plan,vertexCount:body.vertexCount,triangleCount:body.triangleCount,
    bodyVertexCount:body.bodyVertexCount,bodyTriangleCount:body.bodyTriangleCount,structuralVertexCount:body.structuralVertexCount,
    structuralTriangleCount:body.structuralTriangleCount,cellM:body.cellM,grid:body.grid,sourceIndexType:body.index.constructor.name,faceFeatures:body.faceFeatures,
    source:Object.fromEntries(fields.map(f=>[f,Array.from(body[f])])),poses});
}
await writeFile(out+'/corpus.json',JSON.stringify({sourceCommit,modules,seed,versions:{genome:CREATURE_GENOME_VERSION,body:QUADRUPED_BODY_VERSION},
  contract:'same exact body and 22-bone Float32 palette for every candidate; flat ground review only, never separate LOD animation',rows}));
console.log(JSON.stringify(rows.map(r=>({id:r.id,triangles:r.triangleCount,digest:r.sourceDigest})),null,2));
