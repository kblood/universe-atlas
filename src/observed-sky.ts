/** A first past-light-cone query for galaxy glyphs. This is an approximate
 * bolometric sky, not a ray-traced telescope image or a full spectral model. */
import { cosmicBackgroundAt, backgroundLnScaleFactorAt } from './cosmic-background.ts';
import { galaxyStateAt, type GalaxyLifecycle } from './galaxy-history.ts';
import { YEAR_NS, type Ns } from './world-time.ts';

export const OBSERVED_SKY_VERSION='atlas-observed-sky-1';
const MAX_EMISSION_SEARCH_NS=10_000_000_000_000n*YEAR_NS;

export type ObservedGalaxy = {
  visible:boolean;
  emissionNs:Ns|null;
  redshift:number;
  relativeBrightness:number;
  reason:'before-horizon'|'not-yet-formed'|'merged'|'too-dim'|'visible';
};

export function observedGalaxyAt(lifecycle:GalaxyLifecycle,comovingDistanceMpc:number,observerNs:Ns):ObservedGalaxy {
  const dark=(reason:ObservedGalaxy['reason'],emissionNs:Ns|null=null):ObservedGalaxy=>
    ({visible:false,emissionNs,redshift:0,relativeBrightness:0,reason});
  if(!(comovingDistanceMpc>=0)||!Number.isFinite(comovingDistanceMpc)||observerNs<=0n)return dark('before-horizon');
  if(comovingDistanceMpc===0){
    const state=galaxyStateAt(lifecycle,observerNs);
    return state.stage==='active'
      ? {visible:true,emissionNs:observerNs,redshift:0,relativeBrightness:1,reason:'visible'}
      : dark(state.stage==='merged'?'merged':'not-yet-formed',observerNs);
  }
  const observer=cosmicBackgroundAt(observerNs);
  if(comovingDistanceMpc>observer.comovingParticleHorizonMpc)return dark('before-horizon');
  const target=observer.comovingParticleHorizonMpc-comovingDistanceMpc;
  let lo=0n,hi=observerNs<MAX_EMISSION_SEARCH_NS?observerNs:MAX_EMISSION_SEARCH_NS;
  // The cap is above the emission epoch needed for every nonzero local
  // catalogue distance in the baseline scenario. Fall back to the full
  // interval if a future address lies much closer than that domain.
  if(cosmicBackgroundAt(hi).comovingParticleHorizonMpc<target)hi=observerNs;
  for(let i=0;i<112&&hi-lo>1n;i++){
    const mid=(lo+hi)/2n;
    if(cosmicBackgroundAt(mid).comovingParticleHorizonMpc<target)lo=mid;
    else hi=mid;
  }
  const emissionNs=hi;
  const state=galaxyStateAt(lifecycle,emissionNs);
  if(state.stage!=='active')return dark(state.stage==='merged'?'merged':'not-yet-formed',emissionNs);
  const lnRedshiftPlusOne=observer.lnScaleFactor-backgroundLnScaleFactorAt(emissionNs);
  const relativeBrightness=Math.exp(-4*Math.max(0,lnRedshiftPlusOne));
  if(relativeBrightness<1e-6)return dark('too-dim',emissionNs);
  return {visible:true,emissionNs,
    redshift:Math.expm1(Math.min(lnRedshiftPlusOne,700)),
    relativeBrightness,reason:'visible'};
}
