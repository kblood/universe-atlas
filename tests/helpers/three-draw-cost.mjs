/** Mirror actual WebGLRenderer submission counts; one invocation means one draw. */
export function threeDrawCost(x){
 const start=Math.max(x.drawStart??0,x.groupStart??0,0),end=Math.min((x.drawStart??0)+(x.drawCount??Infinity),(x.groupStart??0)+(x.groupCount??Infinity),x.indexCount??x.positionCount??0),count=Math.max(0,end-start);
 const instances=x.instancedMesh?x.objectCount:x.instancedGeometry?Math.min(x.geometryInstanceCount,x.maxInstanceCount??Infinity):1;
 const mode=x.points?'POINTS':x.lineSegments?'LINES':x.lineLoop?'LINE_LOOP':x.line?'LINE_STRIP':x.wireframe?'LINES_WIREFRAME':'TRIANGLES';
 return {start,count,instances,mode,triangles:mode==='TRIANGLES'?Math.floor(count/3)*instances:0,submittedVertices:count*instances};
}
