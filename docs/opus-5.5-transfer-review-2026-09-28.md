# Review: packed forest worker responses (a0dd78a)

**Verdict: no merge blockers.** The ownership model, identity and order preservation, stale-reply handling and recovery all hold up. I would make two small receiver fixes before merge. Everything else is follow-up work. Browser validation should target main-thread blocking, not round-trip time (see Measurement).

## Verified correct

- **Transfer ownership.** Each response gets a fresh `Float64Array`, and only `packed.buffer` is in the transfer list. The resident `ForestSelectionCache` arrays are never transferred or aliased. The test checks both sender detachment and that the cache is still usable afterwards.
- **Bitwise identity.** `Float64Array` stores doubles exactly, including `-0`. The pack-side `parts.join('/')!==c.id` check is strong: it guarantees the reconstructed id is byte-identical, and it rejects non-canonical forms such as `02` or `-0`. Order is preserved because both pack and unpack are linear.
- **Envelope validation.** The version, safe-integer count, cap, `instanceof ArrayBuffer` check (which rejects SAB) and exact `byteLength` together rule out truncation, oversize and detached buffers. A detached buffer with `count=0` decodes to `[]`, which is harmless.
- **Stale replies.** The `this.worker===worker && requestId===selectionRequest` check, plus `failWorker` bumping `selectionRequest`, correctly discards late replies from both the current and the terminated workers. With one job in flight and nothing reset on failure, residents survive recovery as the doc claims.
- **Error paths.** `onerror` covers script load failure, `select` throwing and `pack` throwing. `onmessageerror` covers deserialization failure. Both go through the identity-guarded `failWorker`.

## Fix before merge (small)

1. **The receiver trusts the worker's echoed `direction`, and `data.requestId` is read outside `try`.**
   - A non-finite or short `direction` sets `center` to NaN. Then `distanceTo(...)*r>40` is always false, so selection silently stops forever, and no error is raised.
   - `data===null` throws outside the `try`, which leaves `selecting=true` permanently.
   - Neither can happen with the current worker. Still, the main thread already knows which direction it requested, so it shouldn't depend on the echo.
2. **The `catch` also wraps `applySelection`.** A main-thread bug in apply would be blamed on the worker. It would terminate the worker and burn the restart budget. Only the decode step should be in the `try`.

```ts
private pendingDirection:V3|null=null;
// at post: this.pendingDirection=[...groundDirection] as V3; (copy: caller may reuse the array)
worker.onmessage=({data})=>{
  if(this.worker!==worker||data?.requestId!==this.selectionRequest)return;
  let cells:PopulationCell[];const started=performance.now();
  try{cells=unpackForestSelection(data.packed);}catch{this.failWorker(worker);return;}
  this.selectionTransfer={bytes:data.packed.buffer.byteLength,cells:cells.length,packMs:data.packMs,decodeMs:performance.now()-started};
  this.selectionCacheStats=data.cache??null;
  this.applySelection(this.pendingDirection!,cells,data.selectionMs);
};
```

Add one test for `data:null` and one for a garbage `direction`, both at the current `requestId`.

## Follow-ups

1. **Pack is almost the entire cost.** Packed round-trip is 13.79 ms, of which pack is 11.54 and decode 1.61, so the transfer itself is roughly 0.6 ms. That works out to about 640 ns per cell, spent on:
   - `split('/')`, `map`, `join`
   - the spread into a temporary array for `a.set`
   - the destructuring array and `[-1,0,1]` array allocated in `validRecord`

   Fixes:
   - Keep numeric `face,n,x,y` on cache cells, or parse once per cached cell rather than per response.
   - Write slots directly (`a[k]=…`).
   - On the pack side, keep only the canonical-id check and rely on main-side validation for everything else.

   This should bring round-trip to roughly 3 ms. It runs off the main thread, so it affects selection latency, not frames. That is why it is a follow-up rather than a blocker.
2. **Exceeding the cap burns the whole restart budget.** A deterministic overflow throws, triggers `onerror`, restarts the worker, repeats the same request, fails again, and ends in permanent sync fallback. That costs two lost jobs and a cold worker cache. It would be better for the worker to catch the error and post `{requestId,error:'cell-limit'}`. The main thread can then run one synchronous selection for that request, keep the worker, and leave the restart budget untouched.
3. **The restart budget is per session and never recovers.** Two unrelated transient failures, hours apart, leave the app in main-thread `forestPopulationCells` for the rest of the session. Consider resetting the budget after N successful jobs. Also, the doc's "allow one worker restart" should say "per session".
4. **Failure reasons are discarded.** Record `event.message` or the decode error in a `lastWorkerError` diagnostic.
5. **There is no watchdog for a hung worker.** This predates this change, but `selecting=true` with no timeout still stalls selection indefinitely.
6. **`direction.length!==3` is only guarded by the type.** A wrong length shifts the record layout inside `a.set`. Add an explicit check in pack; it's one comparison.
7. **The tests compare with `JSON.stringify`.** That hides `-0` versus `0` and an explicit `undefined` property versus a missing one. Use `deepStrictEqual`, or compare `Float64Array` views bitwise, so the test actually proves the "every double" claim.

## Measurement

- **Measure main-thread time in the browser.** With the object path, structured-clone deserialization runs on the main thread before `onmessage` fires. For browser validation, capture long tasks, or `performance.mark` around message receipt, for both paths. The comparison that matters for frames is receiver blocking time: object deserialization versus decode plus `selectionApplyMs`. End-to-end latency is secondary.
- **The p95 figures are thin.** With 25 samples, `floor(25*.95)` is index 23, the second-worst sample. Either label it that way or raise the sample count to at least 100 before quoting p95.
