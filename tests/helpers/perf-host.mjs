/** Host/GPU metadata for the desktop perf harness: nvidia-smi snapshots and a
 * background clock sampler, CPU model and process affinity. Windows-first;
 * every probe degrades to an explicit `error` field instead of throwing. */
import {execFile,spawn} from 'node:child_process';
import {cpus,totalmem,release,platform} from 'node:os';
import {promisify} from 'node:util';
const run=promisify(execFile);

const GPU_FIELDS=['name','driver_version','pstate','power.limit','power.default_limit','power.min_limit','power.draw',
  'clocks.gr','clocks.sm','clocks.mem','clocks.max.gr','clocks.max.mem','utilization.gpu','utilization.memory',
  'memory.used','memory.total','temperature.gpu','clocks_event_reasons.active','clocks_event_reasons.applications_clocks_setting',
  'clocks_event_reasons.sw_power_cap','clocks_event_reasons.hw_slowdown'];
const SAMPLE_FIELDS=['timestamp','clocks.gr','clocks.mem','power.draw','utilization.gpu','memory.used','temperature.gpu','clocks_event_reasons.active'];

/** Processes that WDDM always lists (desktop compositor clients). They are
 * recorded but do not by themselves make a run contended. */
const DESKTOP=/\\(explorer|ShellHost|SearchHost|StartMenuExperienceHost|TextInputHost|ShellExperienceHost|ApplicationFrameHost|SystemSettings|CrossDeviceResume|PhoneExperienceHost|WindowsTerminal|dwm|ctfmon|LockApp|Widgets|msedgewebview2|logioptionsplus_agent|RadeonSoftware|ArmouryCrate|iCUE|QmlRenderer|GalaxyClient|GOG Galaxy Notifications Renderer|steamwebhelper|Discord|Perplexity|NVIDIA (app|Overlay)|nvcontainer)\.exe$/i;
/** GPU-heavy or benchmark-disturbing processes: any of these makes a run contended. */
const HEAVY=/(chrome-headless-shell|\\chrome\.exe|python|pythonw|blender|comfy|ollama|llama|stable|3dmark|furmark|unreal|unity|godot|ffmpeg|handbrake|obs64|node\.exe)/i;
/** User browsers may hold WebGL tabs; recorded as a possible contender. */
const BROWSERS=/\\(brave|opera|msedge|firefox|vivaldi)\.exe$/i;

function parseCsv(text,fields){
  return text.trim().split(/\r?\n/).filter(Boolean).map(line=>{
    const cells=line.split(',').map(x=>x.trim());
    return Object.fromEntries(fields.map((f,i)=>{const v=cells[i];const n=Number(v);return [f,v===undefined?null:(v!==''&&Number.isFinite(n)?n:v)];}));
  });
}

async function queryGpu(fields){
  // Unsupported field names make nvidia-smi fail as a whole; drop them one by one.
  let list=[...fields];
  for(let attempt=0;attempt<fields.length;attempt++){
    try{
      const {stdout}=await run('nvidia-smi',[`--query-gpu=${list.join(',')}`,'--format=csv,noheader,nounits'],{timeout:15000});
      return {fields:list,rows:parseCsv(stdout,list)};
    }catch(error){
      const bad=list.find(f=>String(error.stdout||error.stderr||error.message).includes(f));
      if(!bad)return {error:String(error.message||error)};
      list=list.filter(f=>f!==bad);
    }
  }
  return {error:'no supported fields'};
}

export function classifyProcess(name){
  if(HEAVY.test(name))return 'contender';
  if(BROWSERS.test(name))return 'user-browser';
  if(DESKTOP.test(name))return 'desktop';
  return 'other';
}

/** One nvidia-smi snapshot: GPU state, clock policy, and the process table. */
export async function nvidiaSnapshot(label){
  const at=new Date().toISOString();
  const gpu=await queryGpu(GPU_FIELDS);
  let processes=[];let processError=null;
  try{
    const {stdout}=await run('nvidia-smi',['--query-compute-apps=pid,process_name,used_memory','--format=csv,noheader,nounits'],{timeout:15000});
    processes=parseCsv(stdout,['pid','name','usedMemoryMiB']).map(p=>({...p,class:classifyProcess(String(p.name))}));
  }catch(error){processError=String(error.message||error);}
  // Utilization over ~3 s before the run: a busy idle GPU is contention even
  // when nobody holds the browser lock.
  const util=[];
  for(let i=0;i<3;i++){const q=await queryGpu(['utilization.gpu','clocks.gr','power.draw']);if(q.rows)util.push(q.rows[0]);await new Promise(r=>setTimeout(r,1000));}
  let clockText=null;
  try{clockText=(await run('nvidia-smi',['-q','-d','CLOCK'],{timeout:15000})).stdout;}catch{}
  const contenders=processes.filter(p=>p.class==='contender');
  const idleUtil=util.length?Math.max(...util.map(u=>Number(u['utilization.gpu'])||0)):null;
  return {label,at,gpu:gpu.rows?.[0]??null,gpuFields:gpu.fields??null,gpuError:gpu.error??null,
    processes,processError,contenders:contenders.map(p=>`${p.pid} ${p.name}`),userBrowsers:processes.filter(p=>p.class==='user-browser').map(p=>`${p.pid} ${p.name}`),
    utilizationSamples:util,maxUtilizationPct:idleUtil,
    applicationsClocksActive:gpu.rows?.[0]?.['clocks_event_reasons.applications_clocks_setting']??null,
    clockReport:clockText?.split(/\r?\n/).filter(l=>/Clocks|Graphics|Memory|SM|Locked|Policy/i.test(l)).map(l=>l.trim()).slice(0,40)??null};
}

/** Background 1 Hz nvidia-smi sampler (clocks, power, utilization) for the
 * duration of one browser run. */
export function startGpuSampler(){
  const samples=[];let buffer='';let child=null;
  try{
    child=spawn('nvidia-smi',[`--query-gpu=${SAMPLE_FIELDS.join(',')}`,'--format=csv,noheader,nounits','-lms','1000'],{stdio:['ignore','pipe','ignore']});
    child.stdout.on('data',chunk=>{buffer+=chunk;const lines=buffer.split(/\r?\n/);buffer=lines.pop();for(const line of lines)if(line.trim())samples.push(parseCsv(line,SAMPLE_FIELDS)[0]);});
    child.on('error',()=>{});
  }catch{}
  return {stop(){try{child?.kill();}catch{}return summarizeSamples(samples);}};
}
function summarizeSamples(samples){
  const col=name=>samples.map(s=>Number(s[name])).filter(Number.isFinite).sort((a,b)=>a-b);
  const stat=name=>{const v=col(name);return v.length?{min:v[0],p50:v[Math.floor(v.length/2)],max:v[v.length-1]}:null;};
  return {count:samples.length,graphicsClockMHz:stat('clocks.gr'),memoryClockMHz:stat('clocks.mem'),powerW:stat('power.draw'),
    utilizationPct:stat('utilization.gpu'),memoryUsedMiB:stat('memory.used'),temperatureC:stat('temperature.gpu'),samples};
}

/** Processor affinity of a process (hex mask), via PowerShell on Windows. */
export async function processAffinity(pid=process.pid){
  if(platform()!=='win32')return {pid,mask:null,note:'affinity probe implemented for Windows only'};
  try{
    const {stdout}=await run('powershell',['-NoProfile','-Command',`[Convert]::ToString([int64](Get-Process -Id ${pid}).ProcessorAffinity,16)`],{timeout:15000});
    const hex=stdout.trim().toUpperCase();
    return {pid,mask:'0x'+hex,logicalProcessors:[...BigInt('0x'+hex).toString(2)].filter(b=>b==='1').length};
  }catch(error){return {pid,mask:null,error:String(error.message||error)};}
}

/** Affinity of browser processes started after `sinceMs` (they inherit the harness mask). */
export async function browserAffinities(sinceMs){
  if(platform()!=='win32')return [];
  const since=new Date(sinceMs).toISOString();
  try{
    const {stdout}=await run('powershell',['-NoProfile','-Command',
      `Get-Process | Where-Object { ($_.ProcessName -like 'chrome*') -and $_.StartTime -ge [datetime]'${since}' } | ForEach-Object { '{0} {1} {2}' -f $_.Id,$_.ProcessName,[Convert]::ToString([int64]$_.ProcessorAffinity,16) }`],{timeout:20000});
    return stdout.trim().split(/\r?\n/).filter(Boolean).map(l=>{const [pid,name,mask]=l.trim().split(/\s+/);return {pid:Number(pid),name,mask:'0x'+String(mask).toUpperCase()};});
  }catch(error){return [{error:String(error.message||error)}];}
}

/** Host CPU load (Win32_Processor LoadPercentage, 3 samples 1 s apart). */
export async function cpuLoad(){
  if(platform()!=='win32')return {samples:[],maxPct:null,note:'Windows only'};
  try{
    const {stdout}=await run('powershell',['-NoProfile','-Command',
      '1..3 | ForEach-Object { (Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average; Start-Sleep -Milliseconds 1000 }'],{timeout:30000});
    const samples=stdout.trim().split(/\s+/).map(Number).filter(Number.isFinite);
    return {samples,maxPct:samples.length?Math.max(...samples):null};
  }catch(error){return {samples:[],maxPct:null,error:String(error.message||error)};}
}

/** Sets the processor affinity of chrome processes started after `sinceMs`
 * (the harness's own browser). Children spawned later inherit it on Windows. */
export async function setBrowserAffinity(sinceMs,mask){
  if(platform()!=='win32')return {applied:[],note:'Windows only'};
  const since=new Date(sinceMs).toISOString();
  try{
    const {stdout}=await run('powershell',['-NoProfile','-Command',
      `Get-Process | Where-Object { ($_.ProcessName -like 'chrome*') -and $_.StartTime -ge [datetime]'${since}' } | ForEach-Object { try { $_.ProcessorAffinity=[IntPtr]${Number(mask)}; '{0} ok' -f $_.Id } catch { '{0} fail' -f $_.Id } }`],{timeout:20000});
    return {mask:'0x'+Number(mask).toString(16).toUpperCase(),applied:stdout.trim().split(/\r?\n/).filter(Boolean)};
  }catch(error){return {applied:[],error:String(error.message||error)};}
}

export function cpuInfo(){
  const list=cpus();
  return {model:list[0]?.model?.trim()??null,logicalProcessors:list.length,totalMemoryBytes:totalmem(),os:`${platform()} ${release()}`,node:process.version};
}
