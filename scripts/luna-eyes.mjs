#!/usr/bin/env node
// "Eyes" for visual review: ask GPT Luna 6 (Codex CLI, model gpt-6-luna) whether
// rendered images look right. Read-only: no tools, no repo access, images only.
//
//   node scripts/luna-eyes.mjs --prompt "Does this eye read as a cat eye?" a.png b.png
//   node scripts/luna-eyes.mjs --prompt-file q.txt --out verdict.txt sheet.png
//
// Prints the model's answer on stdout. Exit 2 = Luna unavailable/failed (callers
// must say the visual check was NOT done, never invent a verdict).
// Only send generated review renders: AGENTS.md forbids uploading private assets.
import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const MODEL = process.env.LUNA_MODEL || 'gpt-6-luna';
const args = process.argv.slice(2);
let prompt = '', out = '';
const images = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--prompt') prompt = args[++i];
  else if (a === '--prompt-file') prompt = readFileSync(args[++i], 'utf8');
  else if (a === '--out') out = args[++i];
  else images.push(resolve(a));
}
if (!prompt || !images.length) {
  console.error('usage: luna-eyes.mjs --prompt "<question>" [--out file] image.png [more.png]');
  process.exit(64);
}
for (const f of images) if (!existsSync(f)) { console.error(`missing image: ${f}`); process.exit(64); }

const dir = mkdtempSync(join(tmpdir(), 'luna-eyes-'));
const lastMsg = out ? resolve(out) : join(dir, 'last.txt');
const framing = 'You are a demanding visual reviewer. Look ONLY at the attached image(s); do not run commands or read files. ' +
  'Answer concretely about what you can actually see (shapes, proportions, colours, artefacts), say what looks wrong, ' +
  'and say "cannot tell" where the image is too small or unclear. Do not praise by default.\n\n';
const r = spawnSync('codex', ['exec', '-m', MODEL, '-s', 'read-only', '--skip-git-repo-check',
  '--ephemeral', '-o', lastMsg, ...images.flatMap((f) => ['-i', f]), '-'],
  { input: framing + prompt, encoding: 'utf8', shell: process.platform === 'win32', timeout: 10 * 60 * 1000, maxBuffer: 32 * 1024 * 1024 });
if (r.status !== 0 || !existsSync(lastMsg)) {
  console.error(`luna-eyes: Codex/${MODEL} failed (status ${r.status}): ${(r.stderr || '').slice(-600)}`);
  process.exit(2);
}
process.stdout.write(readFileSync(lastMsg, 'utf8').trim() + '\n');
