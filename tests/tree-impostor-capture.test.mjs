import test from 'node:test';
import assert from 'node:assert/strict';
import {padCapture,reduceCapture} from '../src/tree-impostor-capture.ts';

function layer(size,pixels){
  const colour=new Float32Array(size*size*4),data=new Float32Array(colour.length),classification=new Float32Array(size*size);
  for(const {x,y,rgb,coverage=1,normal=[0,1,0],depth=0,leaf=0} of pixels){
    const p=(y*size+x)*4;
    colour.set([...rgb,coverage],p);data.set([...normalize(normal),depth],p);classification[p/4]=leaf;
  }
  return {size,colour,data,classification};
}
const close=(a,b,tolerance=1e-6)=>assert.ok(Math.abs(a-b)<=tolerance,`${a} != ${b} within ${tolerance}`);
const sumCoverage=l=>l.colour.reduce((s,v,i)=>s+(i%4===3?v:0),0);

test('reduction computes area coverage, unassociated linear RGB, normal vectors, leaf fraction and frontmost covered depth',()=>{
  const source=layer(2,[
    {x:0,y:0,rgb:[.1,.3,.7],coverage:1,normal:[1,0,0],depth:-.4,leaf:0},
    {x:1,y:0,rgb:[.8,.4,.2],coverage:.5,normal:[0,0,1],depth:.7,leaf:1},
    {x:0,y:1,rgb:[.9,.1,.5],coverage:0,normal:[-1,0,0],depth:1,leaf:1},
    {x:1,y:1,rgb:[.2,.2,.2],coverage:.5,normal:[0,1,0],depth:-.2,leaf:0},
  ]);
  const reduced=reduceCapture(source,2),p=0;
  close(reduced.colour[p+3],.5);
  for(let c=0;c<3;c++)close(reduced.colour[p+c],([.1,.3,.7][c]+.5*[.8,.4,.2][c]+.5*[.2,.2,.2][c])/2);
  close(reduced.data[p+3],.7);close(reduced.classification[p/4],.25);
  const expected=normalize([1,0,0].map((v,c)=>v+.5*[0,0,1][c]+.5*[0,1,0][c]));
  for(let c=0;c<3;c++)close(reduced.data[p+c],expected[c],2e-6);
});

test('normal reduction averages Cartesian object-space vectors directly',()=>{
  const normals=[[1,0,0],[0,1,1]],source=layer(2,normals.map((normal,i)=>({x:i,y:0,rgb:[.5,.5,.5],normal}))),reduced=reduceCapture(source,2);
  const expected=normalize(normalize(normals[0]).map((v,i)=>v+normalize(normals[1])[i]));
  for(let i=0;i<3;i++)close(reduced.data[i],expected[i],2e-6);
  close(Math.hypot(...reduced.data.slice(0,3)),1,2e-6);
});

test('normals straddling an octahedral seam average toward the downward direction in Cartesian space',()=>{
  const epsilon=.001,source=layer(2,[
    {x:0,y:0,rgb:[.5,.5,.5],normal:[epsilon,-1,0]},
    {x:1,y:0,rgb:[.5,.5,.5],normal:[-epsilon,-1,0]},
  ]),reduced=reduceCapture(source,2);
  assert.ok(reduced.data[1]<-.99999,'seam-adjacent normals remain pointed down');
  close(reduced.data[0],0,1e-8);close(reduced.data[2],0,1e-8);
});

test('near-antipodal normal result uses the deepest covered source normal as deterministic fallback',()=>{
  const a=[1,0,0],b=[-1,0,0],source=layer(2,[
    {x:0,y:0,rgb:[1,0,0],normal:a,depth:-.3},
    {x:1,y:0,rgb:[0,1,0],normal:b,depth:.8},
  ]),reduced=reduceCapture(source,2);
  for(let c=0;c<3;c++)close(reduced.data[c],b[c]);
  close(reduced.data[3],.8);
});

test('frontmost depth ignores uncovered samples and empty output texels stay empty',()=>{
  const source=layer(2,[
    {x:0,y:0,rgb:[.2,.4,.6],normal:[0,1,0],depth:.25},
    {x:1,y:0,rgb:[1,1,1],coverage:0,normal:[1,0,0],depth:1},
  ]),reduced=reduceCapture(source,2);
  close(reduced.colour[3],.25);close(reduced.data[3],.25);
  const empty=reduceCapture(layer(2,[]),2);assert.deepEqual([...empty.colour],[0,0,0,0]);assert.deepEqual([...empty.data],[0,0,0,0]);assert.deepEqual([...empty.classification],[0]);
});

test('mean area coverage is conserved through a complete factor-two mip chain',()=>{
  let current=layer(8,[
    {x:0,y:0,rgb:[.1,.2,.3],coverage:.25},{x:1,y:0,rgb:[.2,.3,.4],coverage:.5},
    {x:5,y:2,rgb:[.8,.5,.2],coverage:1},{x:7,y:7,rgb:[.4,.3,.2],coverage:.75},
  ]);
  const total=sumCoverage(current)/(current.size*current.size);
  while(current.size>1){current=reduceCapture(current,2);close(sumCoverage(current)/(current.size*current.size),total,2e-7);}
});

test('padding copies nearest covered material/data without growing coverage, wrapping tiles or mutating input',()=>{
  const source=layer(5,[
    {x:0,y:2,rgb:[1,.25,.1],normal:[1,0,0],depth:-.2,leaf:0},
    {x:4,y:2,rgb:[.1,.25,1],normal:[0,0,1],depth:.4,leaf:1},
  ]),beforeColour=[...source.colour],beforeData=[...source.data],beforeClassification=[...source.classification],padded=padCapture(source,2);
  assert.notEqual(padded.colour,source.colour);assert.notEqual(padded.data,source.data);
  assert.deepEqual([...source.colour],beforeColour);assert.deepEqual([...source.data],beforeData);assert.deepEqual([...source.classification],beforeClassification);
  for(let i=0;i<source.colour.length;i+=4)close(padded.colour[i+3],source.colour[i+3]);
  const at=(x,y)=>y*5+x;
  for(const [actual,expected] of [[padded.colour.slice(at(1,2)*4,at(1,2)*4+3),[1,.25,.1]],[padded.colour.slice(at(3,2)*4,at(3,2)*4+3),[.1,.25,1]]])for(let c=0;c<3;c++)close(actual[c],expected[c]);
  const leftOnly=padCapture(layer(5,[{x:0,y:2,rgb:[.7,.6,.5],normal:[1,0,0]}]),2);
  assert.deepEqual([...leftOnly.colour.slice(at(4,2)*4,at(4,2)*4+4)],[0,0,0,0],'padding does not wrap from left edge to right edge');
  for(let c=0;c<4;c++)close(padded.data[at(1,2)*4+c],source.data[at(0,2)*4+c]);
  close(padded.classification[at(1,2)],source.classification[at(0,2)]);
});

test('invalid reduction and padding arguments are rejected',()=>{
  const valid=layer(4,[{x:1,y:1,rgb:[.2,.3,.4]}]);
  for(const factor of [0,-1,1.5,5,NaN])assert.throws(()=>reduceCapture(valid,factor),/Invalid capture reduction/);
  assert.throws(()=>reduceCapture({...valid,size:3},1),/Invalid capture reduction/);
  assert.throws(()=>reduceCapture({...valid,colour:new Float32Array(3)},1),/Invalid capture reduction/);
  for(const steps of [-1,1.5,NaN,Infinity,17])assert.throws(()=>padCapture(valid,steps),/Invalid capture padding/);
  assert.throws(()=>padCapture({...valid,data:new Float32Array(4)}),/Invalid capture padding/);
  assert.throws(()=>padCapture({...valid,classification:new Float32Array(4)}),/Invalid capture padding/);
  assert.throws(()=>padCapture({...valid,size:0}),/Invalid capture padding/);
});

function normalize(v){const n=Math.hypot(...v);return v.map(x=>x/n);}
