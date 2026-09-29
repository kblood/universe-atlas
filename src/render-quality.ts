/** Named desktop render-quality profiles (desktop frame cost, task 4).
 * Presentation only: a profile changes pixel counts, ray-march steps and
 * similar sampling rates, never terrain sampling, placements, populations,
 * identities or the simulated clock. `high` is the existing desktop rendering
 * unchanged. `floor` is the 2560x1440 60 FPS profile for the RTX 3060-class
 * hardware floor (docs/desktop-perf-plan-2026-09-29.md). Selected explicitly
 * (URL `quality=`, panel, `__atlas.setRenderQuality`). The default never
 * switches, so a given URL renders the same way; `auto` is an explicit opt-in
 * that picks between the two from measured frame time (presentation only). */
export type RenderQualityName='high'|'floor';
export type CloudStepQuality={resolution:number;steps:number;lightSteps:number};
export type RenderQuality={
  name:RenderQualityName;label:string;
  /** Scene capture scale relative to the drawing buffer (cloud path). The
   * cloud resolve upscales it to the canvas with a Catmull-Rom filter. */
  sceneScale:number;
  /** Desktop cloud integration (immersive keeps its own profile). */
  clouds:CloudStepQuality;
};
export const RENDER_QUALITY:Readonly<Record<RenderQualityName,Readonly<RenderQuality>>>=Object.freeze({
  high:Object.freeze({name:'high',label:'High',sceneScale:1,clouds:Object.freeze({resolution:1,steps:64,lightSteps:5})}),
  floor:Object.freeze({name:'floor',label:'Floor (RTX 3060-class, 1440p)',sceneScale:.75,clouds:Object.freeze({resolution:.5,steps:40,lightSteps:4})}),
});
export const DEFAULT_RENDER_QUALITY:RenderQualityName='high';
export function renderQualityName(value:string|null|undefined):RenderQualityName{
  return value==='floor'||value==='high'?value:DEFAULT_RENDER_QUALITY;
}
export type RenderQualityMode=RenderQualityName|'auto';
export function renderQualityMode(value:string|null|undefined):RenderQualityMode{
  return value==='auto'?'auto':renderQualityName(value);
}

/** Opt-in automatic profile (`quality=auto`): an exponential moving average
 * of frame intervals, with hysteresis. Drops to `floor` after the average has
 * stayed above 95% of the frame budget for `holdMs`, and returns to `high`
 * after it has stayed below 65% for `holdMs` (the floor frame is cheaper, so
 * the lower threshold keeps it from oscillating). Long stalls (loading,
 * tab switches) are ignored rather than averaged in. */
export class AdaptiveRenderQuality{
  current:RenderQualityName='high';
  averageMs=0;
  switches=0;
  private overSince=-1;private underSince=-1;private samples=0;
  constructor(readonly budgetMs=1000/60,readonly holdMs=1000,readonly alpha=.1,readonly stallMs=250){}
  /** Feed one frame interval; returns the profile to use. */
  sample(frameMs:number,nowMs:number):RenderQualityName{
    if(!Number.isFinite(frameMs)||frameMs<=0||frameMs>this.stallMs){this.overSince=this.underSince=-1;return this.current;}
    this.averageMs=this.samples++?this.averageMs+(frameMs-this.averageMs)*this.alpha:frameMs;
    if(this.samples<30)return this.current;
    const over=this.averageMs>this.budgetMs*.95,under=this.averageMs<this.budgetMs*.65;
    this.overSince=over?(this.overSince<0?nowMs:this.overSince):-1;
    this.underSince=under?(this.underSince<0?nowMs:this.underSince):-1;
    const next:RenderQualityName=this.current==='high'&&this.overSince>=0&&nowMs-this.overSince>=this.holdMs?'floor':
      this.current==='floor'&&this.underSince>=0&&nowMs-this.underSince>=this.holdMs?'high':this.current;
    if(next!==this.current){this.current=next;this.switches++;this.overSince=this.underSince=-1;}
    return this.current;
  }
  reset(){this.current='high';this.averageMs=0;this.samples=0;this.overSince=this.underSince=-1;}
  diagnostics(){return {current:this.current,averageMs:this.averageMs,budgetMs:this.budgetMs,switches:this.switches};}
}
