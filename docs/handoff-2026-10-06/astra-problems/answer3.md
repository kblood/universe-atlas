Read-only review. No files changed; no tests, builds, browsers or network used. Simulation numbers below are **recorded results, not independently reproduced**. Confidence is high for the cited code behaviour; external research attribution remains unverified.

**1. Finding — The far-future economy remains a static tier label.**

- **Evidence:** [src/tech.mjs:27](C:/LLM/IWSDK/civilization-lab/src/tech.mjs:27) fixes E5/E6/E7 capture at 1,000,000 / 5,000,000 / 10,000,000 kcal/person/day. [src/planet.mjs:502](C:/LLM/IWSDK/civilization-lab/src/planet.mjs:502) sets energy to population × that constant. Infrastructure depreciates and fuel accumulates, but fuel has no natural consumption or stock cap ([transition table:518](C:/LLM/IWSDK/civilization-lab/docs/transition-table-v1.md:518)). Thus “static economy” is slightly imprecise: stocks move, but productive capability within an era does not evolve. The report explicitly admits this ([plausibility:158](C:/LLM/IWSDK/civilization-lab/docs/m4-plausibility.md:158)).
- **Severity:** high
- **Recommended action:** Add one productive-capacity stock with construction costs, maintenance consumption and resource limits; derive energy output from it.
- **Could NOT verify:** Whether any long-run trajectory achieves a sustainable stock balance; none was executed.

**2. Finding — Failed-target memory delays repetition without establishing whether another launch is useful.**

- **Evidence:** Cooldowns saturate at **1,000 / 2,000 / 4,000 / 8,000 years** ([planet:572](C:/LLM/IWSDK/civilization-lab/src/planet.mjs:572)). After expiry, targeting again uses fixed habitat weights **1000:200**, without destination demand, capacity or improvement since failure ([m2b:17](C:/LLM/IWSDK/civilization-lab/src/m2b.mjs:17), [m2b:67](C:/LLM/IWSDK/civilization-lab/src/m2b.mjs:67)). Recorded lonely runs have **4,376 repeat-target launches / 5,329 launches ≈82.1%**, plus **5,241 reinforcements and 68 new colonies** ([plausibility:45](C:/LLM/IWSDK/civilization-lab/docs/m4-plausibility.md:45)). However, the diagnostic permanently remembers *any* earlier failure, including after subsequent success ([tool:40](C:/LLM/IWSDK/civilization-lab/tools/m4-plausibility.mjs:40)). Calling all 4,376 futile launches would be false.
- **Severity:** high
- **Recommended action:** Distinguish transit loss, temporary colony distress and uninhabitable destinations; require fresh positive evidence or changed capability before retrying a persistently unsuitable target. Count launches after **delivered** failure knowledge separately from successful reinforcement.
- **Could NOT verify:** How many recorded repeats were knowingly futile, useful reinforcement or launches made before news arrived.

**3. Finding — Collapse cycling is reduced, but its mechanism remains repetitive and structurally biased toward decay.**

- **Evidence:** Recorded collapse median/max: **23/54** for high-perils, **12/63** for forager-future, **0/118** for lonely-earthlike ([plausibility:84](C:/LLM/IWSDK/civilization-lab/docs/m4-plausibility.md:84)). These are per-seed event counts, not necessarily repeated collapses of one society. Recovery reduces hazard by at most **fivefold**, retaining complexity overhead ([planet:242](C:/LLM/IWSDK/civilization-lab/src/planet.mjs:242)). Each generic collapse removes **30% population and 70% infrastructure**, plus tier loss ([planet:466](C:/LLM/IWSDK/civilization-lab/src/planet.mjs:466)). Recovery requires only **50% of prior population and 75% of prior infrastructure** ([planet:158](C:/LLM/IWSDK/civilization-lab/src/planet.mjs:158)). Peace reduces asabiya by **2/decade**; elite share receives **1 + maximum Information tier** before stress deductions ([polities:40](C:/LLM/IWSDK/civilization-lab/src/polities.mjs:40)).
- **Severity:** high
- **Recommended action:** Make recovery repair or change the state that generated collapse; measure recurrence intervals per region and cause. Do not restore blanket immunity after four recoveries.
- **Could NOT verify:** Whether the largest counts represent implausibly short recurrence intervals; aggregate totals cannot establish that.

**4. Finding — Colony survival now depends on an overgenerous teaching proxy and two hard thresholds.**

- **Evidence:** STATUS combines **total arc population** with **maximum occupied-region tier per domain** ([domain:252](C:/LLM/IWSDK/civilization-lab/src/domain.mjs:252)); maintenance credits **10% of that entire population** whenever the maximum tier qualifies ([tech:17](C:/LLM/IWSDK/civilization-lab/src/tech.mjs:17)). A small advanced enclave therefore qualifies the whole population as potential support. The **1,000-year reserve** ends abruptly; support freshness ends after **300 years plus route delay**. The unsupported zero-growth fixture loses technology at age **1,020** and dies at **1,040**. Recorded M4d deaths remain **175**, including **5 at ages 1,000–1,200** ([plausibility:19](C:/LLM/IWSDK/civilization-lab/docs/m4-plausibility.md:19), [plausibility:32](C:/LLM/IWSDK/civilization-lab/docs/m4-plausibility.md:32)).
- **Severity:** high
- **Recommended action:** Report qualifying population separately for each domain; replace the reserve cliff with a depleting maintenance reserve that local production or shipments can replenish.
- **Could NOT verify:** How much ensemble survival depends on overstated specialist support versus genuine population growth.

**5. Finding — Arrival rules manufacture deaths and prevent capable reinforcements from repairing technology.**

- **Evidence:** A foreign-occupied destination kills **all passengers**, recording “turned-away”; an own-lineage arrival transfers people but no tiers or culture ([domain:186](C:/LLM/IWSDK/civilization-lab/src/domain.mjs:186), [transition table:1096](C:/LLM/IWSDK/civilization-lab/docs/transition-table-v1.md:1096)). This is a modelling restriction presented through a misleading outcome: refusal does not itself explain death. Reinforcement also concentrates passengers into the first positive-capacity region, without checking remaining capacity.
- **Severity:** medium
- **Recommended action:** Represent rejection as an explicit stranded/diverted voyage with bounded survival; let arriving specialists contribute maintenance knowledge and allocate passengers by available capacity.
- **Could NOT verify:** Passenger death totals attributable to rejection or reinforcement-driven overcrowding.

**6. Finding — I found no demonstrated M4 numerical invention passed off as research; the authored-value labels are mostly honest.**

- **Evidence:** The binding table explicitly labels **every unattributed constant, prior, threshold, probability and equation** as scenario choice ([transition table:7](C:/LLM/IWSDK/civilization-lab/docs/transition-table-v1.md:7)). The relevant inventory is:
  - **Technology:** seven Nstar rows and seven discovery-cost rows, spanning positive thresholds **50–100,000 persons** and costs **2–3,000**; discovery multiplier **400**. Labelled authored scenario, without research backing ([implementation:42](C:/LLM/IWSDK/civilization-lab/docs/m4-implementation.md:42), [transition table:604](C:/LLM/IWSDK/civilization-lab/docs/transition-table-v1.md:604)).
  - **Colony/network:** reserve **1,000 years**, reporting **100 years**, freshness **300 years**, support **100‰**. Explicit scenario labels ([transition table:2864](C:/LLM/IWSDK/civilization-lab/docs/transition-table-v1.md:2864), [transition table:2973](C:/LLM/IWSDK/civilization-lab/docs/transition-table-v1.md:2973)).
  - **Target memory:** cooldowns **1/2/4/8 kyr**, foreign occupancy expiry **2 kyr**. Explicit scenario labels ([implementation:63](C:/LLM/IWSDK/civilization-lab/docs/m4-implementation.md:63), [transition table:2930](C:/LLM/IWSDK/civilization-lab/docs/transition-table-v1.md:2930)).
  - **Collapse/renewal:** recovery cap **4**, divisor **1+min(4,recoveries)**, renewal **4,294,967 Q32/decade**, approximately **10 kyr mean**. Explicit scenario labels ([implementation:70](C:/LLM/IWSDK/civilization-lab/docs/m4-implementation.md:70), [transition table:2933](C:/LLM/IWSDK/civilization-lab/docs/transition-table-v1.md:2933)).
  - **Chronology:** six target duration bands; **120/320 kyr** horizons; **2 Myr** habitability; doom moved from **3 kyr to 25 kyr**. Authored targets/scenario changes, not historical measurements ([implementation:33](C:/LLM/IWSDK/civilization-lab/docs/m4-implementation.md:33), [transition table:2856](C:/LLM/IWSDK/civilization-lab/docs/transition-table-v1.md:2856), [transition table:2950](C:/LLM/IWSDK/civilization-lab/docs/transition-table-v1.md:2950)).
  - **Launch/economy:** **2,000** minimum colonists, **4/8/16 thousand** berths, **10 capital/5 fuel** per passenger; growth rates and future energy ladder. Covered by the blanket scenario label ([transition table:487](C:/LLM/IWSDK/civilization-lab/docs/transition-table-v1.md:487), [transition table:1053](C:/LLM/IWSDK/civilization-lab/docs/transition-table-v1.md:1053)). **4,500** is explicitly a scenario midpoint of a cited **4,000–5,000** range; **230,000** retains Morris attribution ([transition table:26](C:/LLM/IWSDK/civilization-lab/docs/transition-table-v1.md:26)).
- **Severity:** low
- **Recommended action:** Preserve these labels; narrow “Morris energy figures” to the two identified anchors so readers cannot mistake the entire ladder for sourced data.
- **Could NOT verify:** The external Morris and World3 sources, including the separately attributed **14-year** infrastructure lifetime.

**7. Finding — Research authority is overstated for mechanisms, even though the numerical tables are labelled.**

- **Evidence:** The synthesis calls `λ = a·effective_pop·contact_factor` a **“Kremer hazard,” confidence high**, and states population below `N*(complexity)` **cannot** maintain technology, also confidence high ([research:877](C:/LLM/IWSDK/civilization-lab/docs/research-2026-10-04.md:877)). Its own earlier Kremer entry instead reports `dA/dt=gNA`; its following entry admits the demography–complexity link is contested. The cited [Kremer paper](https://www.steveambler.uqam.ca/511/readings/kremer.1993.pdf) and [Henrich/Powell review](https://pmc.ncbi.nlm.nih.gov/articles/PMC3404092) were **not independently checked here**. Confidence: high that the synthesis blurs model adaptation with research; unverified whether those sources support its stronger wording.
- **Severity:** medium
- **Recommended action:** Relabel these as “Kremer-inspired authored hazard” and “contested maintenance hypothesis”; separate confidence in the source from confidence in the simulation rule.
- **Could NOT verify:** Original-paper support for either exact formulation.

**8. Finding — The arithmetic is substantially disciplined; one exponentiation site and the determinism policy still need correction.**

- **Evidence:** Source search found **zero direct Math transcendental calls, zero localeCompare/Intl uses and zero Date uses**. Hazard thresholds use the fixed-operation logarithm at [fixed:12–33](C:/LLM/IWSDK/civilization-lab/src/fixed.mjs:12), called at [rng:79](C:/LLM/IWSDK/civilization-lab/src/rng.mjs:79); its accumulation order is fixed. Population/support sums use BigInt. Canonical object keys are sorted ([canonical:59](C:/LLM/IWSDK/civilization-lab/src/canonical.mjs:59)); region/adjacency order is validated ([environment:60](C:/LLM/IWSDK/civilization-lab/src/environment.mjs:60)). I found no demonstrated float-reduction or sort-stability defect.
  
  The one Number exponentiation site is **`2**(count-1)`**, with exponent **0–3**, at [planet:572](C:/LLM/IWSDK/civilization-lab/src/planet.mjs:572). Practical divergence risk is low, but it is unnecessary. The other two exponentiation sites use exact BigInt: [fixed:3](C:/LLM/IWSDK/civilization-lab/src/fixed.mjs:3), [time:1](C:/LLM/IWSDK/civilization-lab/src/time.mjs:1). The lint misses `**` and exempts `fixed.mjs` from its transcendental ban ([lint:27](C:/LLM/IWSDK/civilization-lab/tests/determinism-lint.test.mjs:27)). README’s “quantised first” exception is insufficient: quantisation cannot guarantee that differing approximations land in the same bin.
- **Severity:** medium
- **Recommended action:** Replace the cooldown power with four integer constants; tighten the lint and require fixed arithmetic algorithms, not quantisation alone.
- **Could NOT verify:** Actual V8/SpiderMonkey/JSC bit identity or every possible comparator tie.

**9. Finding — The claimed runtime guarantee exceeds the recorded evidence.**

- **Evidence:** [spec:1124](C:/LLM/IWSDK/civilization-lab/docs/spec.md:1124) guarantees “pinned Node 22”; [package.json:9](C:/LLM/IWSDK/civilization-lab/package.json:9) permits **all Node ≥22**; the M4 runner used **Node 24.7.0** ([implementation:827](C:/LLM/IWSDK/civilization-lab/docs/m4-implementation.md:827)). No Node 22-versus-24 or browser-engine comparison was located. Node-specific Buffer and crypto APIs also require a harness or port before browser-engine identity can even be assessed.
- **Severity:** medium
- **Recommended action:** State the actually verified runtime, then have the runner compare identical RNG, hazard and complete-history vectors on exact Node 22 and 24 versions; add engine-independent core vectors before Atlas integration.
- **Could NOT verify:** Compatibility or digest equality on any runtime.

**10. Finding — Minimum M5 must establish causal credibility, not merely move duration medians into authored bands.**

- **Evidence:** Only **6/30 forager-future runs reach E7**, while **28/30 reach E3**; the observed E3→E7 median is **44,070 years** ([plausibility:119](C:/LLM/IWSDK/civilization-lab/docs/m4-plausibility.md:119)). This demonstrates reachability, not credible economics or colony sustainability. Cross-revision RNG namespaces change, so existing before/after comparisons do not isolate fixes ([implementation:682](C:/LLM/IWSDK/civilization-lab/docs/m4-implementation.md:682)).
- **Severity:** high
- **Recommended action:** Keep M5 to five deliverables:
  1. One resource-constrained production/maintenance model that supports growth, saturation and decline beyond E4.
  2. Domain-qualified colony support, replenishable reserves and useful reinforcement.
  3. Failure-reason-aware targeting with explicit retry conditions.
  4. Recovery that changes collapse drivers, evaluated through per-region recurrence and healthy exposure time.
  5. A frozen E0-start panel plus controlled interventions: disconnect support, restore it, exhaust resources, improve a failed destination. Report censoring, passenger outcomes, simultaneous colony survival and economic trajectories; complete the runtime comparisons.
  
  Full trade markets, megaproject catalogues and Atlas integration are unnecessary for this minimum.
- **Could NOT verify:** Whether these changes alone suffice; that requires the controlled runs above.

## VERDICT:

VERDICT (1): M4 produces stone-to-space histories, but static productive capability, weak launch decisions, artificial colony maintenance and repetitive collapse still undermine their plausibility.

VERDICT (2): No M4 numerical fabrication masquerading as research was demonstrated; mechanism attribution in the research synthesis is materially less honest than the parameter labels.

VERDICT (3): The core looks carefully deterministic, but cross-engine and Node 22/24 identity are unverified, and the exponentiation/lint/quantisation gaps should be closed.

VERDICT (4): Minimum M5 is a small causal economy, sustainable colony maintenance, informed targeting, meaningful recovery and controlled validation before any Atlas integration.