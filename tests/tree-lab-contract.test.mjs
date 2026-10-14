// Tree Kit owns this test; keep the Atlas suite path as a thin forwarder.
import '../external/tree-kit/tests/tree-lab-contract.test.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const kitSource=resolve(root,'external/tree-kit/src');
test('Atlas uses the pinned Tree Kit implementation without editable source copies',()=>{
  const visit=dir=>{
    for(const entry of readdirSync(dir,{withFileTypes:true})){
      const path=resolve(dir,entry.name);
      if(entry.isDirectory())visit(path);
      else if(entry.isFile()&&entry.name.endsWith('.ts')){
        const relative=path.slice(kitSource.length+1);
        // RenderProfile is a shared diagnostics helper used independently by
        // Atlas and the standalone Lab, not a Tree Kit runtime module.
        if(relative==='render-profile.ts')continue;
        assert.equal(existsSync(resolve(root,'src',relative)),false,`duplicate Atlas source: src/${relative}`);
      }
    }
  };
  visit(kitSource);
});
