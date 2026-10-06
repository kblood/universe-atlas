import {setup,EST,metric,tiles,quantile} from '../../M0-v2/harness/exp.mjs';
import * as draft from '../../../../src/planet-tiles.ts';
const worlds=await setup();
const W=130, N=W*W;
const pack=a=>{const b=new Uint8Array(N*4);for(let p=0;p<N;p++){for(let c=0;c<3;c++)b[4*p+c]=Math.floor(Math.max(0,Math.min(255,a[3*p+c])));b[4*p+3]=255;}return b;};
for(const [name,w] of Object.entries(worlds)){
 let bad=0,n=0;
 for(const d of w.dirs.slice(0,3))for(const L of [6,7]){const t=tiles.directionTile(d,L),a=draft.buildTile(w.body,t).color,b=EST.corner((u,v)=>w.colourOf(tiles.tileDirection(t,u,v)),128);n+=a.length;for(let i=0;i<a.length;i++)bad+=a[i]!==b[i];}
 console.log(name,'draft corner byte mismatches',bad,'/',n);
 const cache=new Map();
 function data(t){const k=tiles.tileKey(t);if(cache.has(k))return cache.get(k);
 const a=new Float64Array(N*3),g=new Float64Array(N).fill(1);
 for(let y=0;y<W;y++)for(let x=0;x<W;x++){const p=y*W+x,d=tiles.tileDirection(t,(x-.5)/128,(y-.5)/128),s=w.ts(d),c=s.wet?w.colourOf(d):s.color;a.set(c,p*3);if(!s.ocean&&!s.wet)g[p]=w.localGrain(d);}
 const rank=[];for(let y=1;y<W-1;y++)for(let x=1;x<W-1;x++){const p=y*W+x;let score=0;for(let c=0;c<3;c++){const v=4*a[p*3+c]-a[(p-1)*3+c]-a[(p+1)*3+c]-a[(p-W)*3+c]-a[(p+W)*3+c];score+=v*v;}rank.push([score,p]);}rank.sort((a,b)=>b[0]-a[0]);
 const ad=a.slice();for(const [,p] of rank.slice(0,Math.floor(N*.05))){const x=p%W,y=Math.floor(p/W),v=[0,0,0];for(const dx of [-.25,.25])for(const dy of [-.25,.25]){const c=w.colourOf(tiles.tileDirection(t,(x-.5+dx)/128,(y-.5+dy)/128));for(let ch=0;ch<3;ch++)v[ch]+=c[ch]/4;}ad.set(v,p*3);}
 const r={a,g,ad};cache.set(k,r);return r;}
 const configs=[['adaptive6','ad',[6]],['adaptiveAll','ad',[5,6,7,8,9]],['grain0All',0,[5,6,7,8,9]],['grain025All',.25,[5,6,7,8,9]],['grain0L67',0,[6,7]],['grain0L678',0,[6,7,8]],['grain0L6',0,[6]]];
 for(const [label,mode,levels] of configs){const tc=new Map();function tex(t){const k=tiles.tileKey(t);if(tc.has(k))return tc.get(k);const {a,g,ad}=data(t);let b=a;if(levels.includes(t.level)){if(mode==='ad')b=ad;else{b=a.slice();for(let p=0;p<N;p++)for(let c=0;c<3;c++)b[p*3+c]*=(1+mode*(g[p]-1))/g[p];}}const out=pack(b);tc.set(k,out);return out;}
 const res=[];for(const L of [5,6,7,8]){const all=[];for(const d of w.dirs){const P=tiles.directionTile(d,L),C=tiles.directionTile(d,L+1);all.push(...metric(tex(P),tex(C),P,C));}res.push(quantile(all,.99).toFixed(5));}console.log(name,label,res.join(' / '));}
}
