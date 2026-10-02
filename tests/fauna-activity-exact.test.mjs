// The small-integer activity path must equal the BigInt reference bit for
// bit at every date: realtime steps, seeks either way, jumps that force a
// rebase, dates far before and after the catalogue epoch, and interleaved
// members (docs/life-cpu-2026-09-29.md).
import test from 'node:test';
import assert from 'node:assert/strict';
import { faunaHerdAt, faunaMemberActivityAtWorldNs, faunaMemberActivityExactAtWorldNs, toSeconds } from '../src/fauna-runtime.ts';

const BIOME = { weights: [.05, .8, .1, .05], forestPotential: false, moisture: .9, slopeDeg: 6, ocean: false };
import { CATALOGUE_EPOCH_NS, NS } from '../src/world-time.ts';

function members() {
  const out = [];
  for (let i = 0; out.length < 60 && i < 4000; i++) {
    const a = i * 0.37, herd = faunaHerdAt('ACT-EXACT', 'G1/C0,0,0/0/planet/1', [Math.cos(a) * .6, .5, Math.sin(a) * .6], BIOME, { stage: 'complex' }, toSeconds(0), `cell${i}`);
    if (herd.present) out.push(...herd.members);
  }
  return out;
}

function same(a, b, label) {
  assert.ok(Object.is(a.pose.x, b.pose.x) && Object.is(a.pose.z, b.pose.z) && Object.is(a.pose.yaw, b.pose.yaw), `${label}: pose`);
  assert.equal(a.pose.gait, b.pose.gait, `${label}: gait`);
  assert.ok(Object.is(a.travel, b.travel), `${label}: travel ${a.travel} vs ${b.travel}`);
  assert.ok(Object.is(a.revolutionS, b.revolutionS), `${label}: revolutionS`);
  assert.ok(Object.is(a.stateS, b.stateS), `${label}: stateS ${a.stateS} vs ${b.stateS}`);
}

test('small-integer fauna activity equals the BigInt reference at every date', () => {
  const herdMembers = members();
  assert.ok(herdMembers.length >= 20, `enough members (${herdMembers.length})`);
  // A deterministic LCG for date steps.
  let s = 0x2545f491n;
  const next = () => (s = (s * 6364136223846793005n + 1442695040888963407n) & ((1n << 64n) - 1n));
  const dates = [];
  let t = 435084631200000032044300000n;
  for (let i = 0; i < 600; i++) {
    const r = next() % 100n;
    if (r < 60n) t += NS / 60n;                                // realtime frame
    else if (r < 70n) t -= next() % (40n * NS);                 // short seek back
    else if (r < 80n) t += next() % (3600n * NS);               // seek forward
    else if (r < 88n) t += (next() % 2n ? 1n : -1n) * ((1n << 50n) + next() % (1n << 52n)); // forces a rebase
    else if (r < 94n) t = CATALOGUE_EPOCH_NS - next() % (1n << 70n); // before the epoch
    else t = CATALOGUE_EPOCH_NS + (next() << 40n);              // ~10^30 ns after it
    dates.push(t);
  }
  let checks = 0;
  for (const date of dates) for (let m = 0; m < herdMembers.length; m += 3) {
    const member = herdMembers[m];
    same(faunaMemberActivityAtWorldNs(member, date), faunaMemberActivityExactAtWorldNs(member, date), `${member.id} @ ${date}`);
    checks++;
  }
  // Revisiting earlier dates in reverse order hits bases set by later dates.
  for (const date of dates.slice().reverse().slice(0, 120)) for (const member of herdMembers) {
    same(faunaMemberActivityAtWorldNs(member, date), faunaMemberActivityExactAtWorldNs(member, date), `${member.id} @ ${date} (reverse)`);
    checks++;
  }
  assert.ok(checks > 10000);
});

test('window boundaries: idle ends exactly at gaitPeriod on both paths', () => {
  const member = members()[0];
  const base = 435084631200000032044300000n;
  const probe = faunaMemberActivityExactAtWorldNs(member, base);
  // Walk the date across several idle/walk boundaries one nanosecond at a time around each.
  const gaitNs = BigInt(Math.max(1, Math.round(member.gaitPeriodS * Number(NS))));
  const start = base - BigInt(Math.round(probe.stateS * Number(NS)));
  for (let w = 0; w < 7; w++) for (const d of [-2n, -1n, 0n, 1n, 2n]) {
    const date = start + BigInt(w) * gaitNs + d;
    same(faunaMemberActivityAtWorldNs(member, date), faunaMemberActivityExactAtWorldNs(member, date), `boundary ${w}${d}`);
  }
});
