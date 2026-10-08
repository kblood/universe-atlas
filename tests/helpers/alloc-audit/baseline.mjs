// Read a pinned pre-optimization revision without modifying a checkout.
import {execFileSync} from 'node:child_process';
import {stripTypeScriptTypes} from 'node:module';
import {fileURLToPath} from 'node:url';
export const BASE = process.env.ALLOC_BASE || 'f2f2c62';
export const root = new URL('../../../', import.meta.url);
export function baselineSource(file) {
  return execFileSync('git', ['show', `${BASE}:src/${file}`], {cwd: fileURLToPath(root), encoding: 'utf8'});
}
export function baselineUrl(file) {
  const js = stripTypeScriptTypes(baselineSource(file)).replace(/from ['"]([^'"]+)['"]/g, (all, spec) => {
    const url = spec === 'three' ? new URL('node_modules/three/build/three.module.js', root) : new URL(spec, new URL('src/', root));
    return `from '${url.href}'`;
  });
  return 'data:text/javascript;base64,' + Buffer.from(js).toString('base64');
}
