import {readFileSync,writeFileSync} from 'node:fs';
const r=JSON.parse(readFileSync('test-results/opus-near-far-family-review/response.json','utf8'));
const md=`# Opus 5.5 near/far family review

Model: ${r.modelUsage['claude-opus-5-5'].canonicalModel}
Provider: ${r.modelUsage['claude-opus-5-5'].provider}
Review run ID: ${r.uuid}

${r.result}
`;
writeFileSync('test-results/opus-near-far-family-review/review.md',md);
