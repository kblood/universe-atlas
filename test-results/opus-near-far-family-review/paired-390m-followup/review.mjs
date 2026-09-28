import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawn,execFileSync} from 'node:child_process';
import path from 'node:path';
const out='test-results/opus-near-far-family-review/paired-390m-followup';mkdirSync(out,{recursive:true});
const base='C:/LLM/IWSDK/universe-atlas-acceptance/test-results/offline-foliage-mips/mid-pair-down-390m-rerun/';
const items=[{source:base+'default-mid-down-angle.png',name:'default-mid-down-angle.png',kind:'image'},{source:base+'offline-mid-down-angle.png',name:'offline-mid-down-angle.png',kind:'image'},{source:base+'report.json',name:'report.json',kind:'report'}];
const sha=b=>createHash('sha256').update(b).digest('hex');
const files=items.map(x=>{copyFileSync(x.source,`${out}/${x.name}`);const b=readFileSync(`${out}/${x.name}`);return {source:x.source,path:path.resolve(`${out}/${x.name}`),kind:x.kind,bytes:b.length,sha256:sha(b)};});
const revision=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),status=execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim();
const prior='test-results/opus-near-far-family-review/review.md';
const prompt=`This is a short evidence follow-up to your genuine Claude Opus 5.5 review at test-results/opus-near-far-family-review/review.md. That prior review's exact source snapshots, original prompt, revision and hashes are preserved in the sibling prompt.txt and inputs.json. Read those records and your prior review first; then inspect BOTH new same-pose/date 390 m screenshots and the accompanying acceptance report.

New evidence paths:
${files.filter(x=>x.kind==='image').map(x=>x.path).join('\n')}
Report: ${files.find(x=>x.kind==='report').path}

The acceptance agent says these are a direct default-vs-offline-mip comparison from the same pose/date; both showed the same 250 Oak / 369 Pine middle submissions. Initial visual inspection: the offline-mip image restores foliage on nearby middle trees, but these dark, small family crowns still contrast sharply with the bright bulky rounded far-legacy ring. Verify what is actually visible in the images/report; do not accept that description without inspecting them. Determine whether this changes your earlier minimal recommendation, what it proves about alpha/mip contribution versus remaining geometry/color mismatch, and any correction needed to your prior factual statements. Be precise about capture scope and source/report hash provenance. Keep the follow-up concise (about 300–600 words). No code edits, commands, external research, new proxy system, or unrelated recommendations. Distinguish observed evidence from inference.
`;
writeFileSync(`${out}/prompt.txt`,prompt);
writeFileSync(`${out}/inputs.json`,JSON.stringify({capturedAt:new Date().toISOString(),revision,gitStatus:status,priorReview:prior,priorInputRecord:'test-results/opus-near-far-family-review/inputs.json',priorPrompt:'test-results/opus-near-far-family-review/prompt.txt',files,promptSha256:sha(prompt),model:'claude-opus-5-5',providerExpected:'firstParty'},null,2)+'\n');
const child=spawn('C:/Users/Caldor/.local/bin/claude.exe',['--print','--model','claude-opus-5-5','--effort','high','--output-format','json','--tools','Read','--allowedTools','Read','--strict-mcp-config','--disable-slash-commands','--no-session-persistence','--safe-mode','--permission-mode','dontAsk'],{windowsHide:true,stdio:['pipe','pipe','pipe']});let stdout='',stderr='';child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');child.stdout.on('data',s=>stdout+=s);child.stderr.on('data',s=>stderr+=s);child.stdin.end(prompt);child.on('error',e=>{writeFileSync(`${out}/error.txt`,String(e));process.exitCode=1;});child.on('close',code=>{writeFileSync(`${out}/response.json`,stdout);writeFileSync(`${out}/stderr.txt`,stderr);console.log(JSON.stringify({code,responseBytes:stdout.length,stderrBytes:stderr.length,revision,files}));if(code)process.exitCode=code;});
