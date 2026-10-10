/** One deterministic hash/half-open interval for colour and all shadow passes.
 * Geometry silhouettes can differ; this guarantees interval ownership only
 * wherever representations rasterize the same pixel. */
export const FAUNA_COVERAGE_VERSION='fauna-screen-interval-1';
export const FAUNA_SCREEN_HASH_GLSL=`float faunaScreenHash(){return fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))));}`;
export const FAUNA_SCREEN_INTERVAL_GLSL=`float faunaCoverageHash=faunaScreenHash();if(faunaCoverageHash<faunaCoverageStart||faunaCoverageHash>=faunaCoverageEnd)discard;`;
export const faunaCoverageEnd=(start:number,length:number)=>Math.fround(Math.min(1,start+length));
