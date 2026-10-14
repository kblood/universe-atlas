import type {ForestAssetSource,LoadedForestAssets} from './forest-asset-source.ts';
import type {ForestTreeFamilyInput} from '#tree-kit/v1/instances';
type Target={loadForestTreeFamilies:(inputs:readonly ForestTreeFamilyInput[])=>Promise<boolean>;clearForestTreeAssets:()=>void};
type Source=Pick<ForestAssetSource,'load'|'clear'>;

/** Connect the shared byte cache to one live planet. All async completions are
 * scoped to that planet and request; disabling or leaving cancels adoption. */
export class ForestAssetAttachment{
  private target:Target|null=null;
  private enabled=false;
  private generation=0;
  private loading=false;
  private ready=false;
  private error='';
  private source:Source;
  private changed:()=>void;
  constructor(source:Source,changed=()=>{}){this.source=source;this.changed=changed;}
  update(target:Target|null,enabled:boolean){
    const next=enabled?target:null;
    if(next===this.target&&enabled===this.enabled)return;
    const wasEnabled=this.enabled;this.enabled=enabled;
    this.generation++;this.target?.clearForestTreeAssets();this.target=next;
    this.loading=false;this.ready=false;this.error='';
    if(wasEnabled&&!enabled)this.source.clear();
    if(next){this.loading=true;void this.attach(next,this.generation);}
    this.changed();
  }
  retry(){const target=this.target;if(!target||!this.enabled)return;this.target=null;target.clearForestTreeAssets();this.update(target,true);}
  diagnostics(){return {enabled:this.enabled,loading:this.loading,ready:this.ready,error:this.error};}
  private async attach(target:Target,generation:number){
    try{
      const bundle:LoadedForestAssets=await this.source.load();
      if(generation!==this.generation||target!==this.target)return;
      const adopted=await target.loadForestTreeFamilies(bundle.inputs);
      if(generation!==this.generation||target!==this.target)return;
      this.ready=adopted;
      if(!adopted)this.error='Tree loading was superseded';
    }catch(error){if(generation===this.generation)this.error=String(error);}
    finally{if(generation===this.generation){this.loading=false;this.changed();}}
  }
  dispose(){this.update(null,false);this.source.clear();}
}
