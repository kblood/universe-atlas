# Independent architecture review brief — Fable 5.1

Prepared 2026-09-13. Submitted through the installed Claude Code CLI with
`--model claude-fable-5-1 --effort high`. This file is the input brief; the
response is preserved in [the complete review](fable-5.1-plan-review.md), with
[actual CLI model metadata](fable-5.1-plan-review.metadata.json). The invocation
completed successfully; the caller's assessment is recorded separately.

## Review material

Read the complete [walkable worlds and traversable history proposal](living-worlds-and-time-roadmap.md).
Use [exploration corrections](exploration-corrections.md) for the implemented
baseline and its measured limitations. The root repository's
`docs/procedural-universe-research-2026-09-12.md` and
`docs/universe-atlas-v1-spec.md` provide earlier research and catalogue contracts;
the newer roadmap and user requirements below take precedence.

If the reviewer cannot access local files, supply these documents in full with
this brief. Do not review only the preceding conversational summary.

## User requirements

- A deterministic Three.js universe with physically meaningful positions and
  connected exploration from galaxies to planetary ground.
- Detailed walkable solid planets and moons: mountains, oceans viewed from land
  or air, beaches, forests, rivers and ponds where appropriate.
- Future extensibility for plants, grass, volcanoes, islands, cities, animals
  and people. Underwater exploration is deferred.
- Time traversal is universal, at every spatial scale: the Big Bang/early
  universe, galaxies and systems forming, planets forming, life appearing and
  disappearing, stars dying, black-hole formation and system consequences.
- Future civilizations may spread across stars and galaxies throughout the
  simulated universe. Their history must drive the cities and ruins on worlds.
- Determinism must survive different visit orders, time-seeking, LOD changes,
  worker schedules and cache state. Preserve existing identities and explicitly
  version any changes to generated geography.
- Desktop performance first, with a separately validated WebXR profile.

## Requested assessment

Give an independent, critical review. Identify what should change before
implementation; do not merely restate the proposal or endorse its ambition.

1. Does the proposed history model support random access to a universal date
   without simulating all preceding time? Where does it conceal unbounded work?
2. Can interacting civilizations and environmental events remain causal and
   deterministic when regions are generated lazily? Specify concrete ownership,
   boundary and ordering rules, or recommend a simpler achievable model.
3. Assess identity/lineage, precise time representation, generator versioning,
   checkpoints, migration and preservation of the current reference-date world.
4. Assess stellar lifecycles, planetary formation, remnants, galaxy evolution,
   early/future cosmic representations and the separation of science from
   configurable fiction. Identify dependencies missing from system outcomes.
5. Assess cube-sphere walking, collision/visual agreement, terrain seams,
   hydrology, material detail, vegetation placement and ocean extensibility.
6. Assess the proposed memory/frame budgets and streaming strategy. Distinguish
   measured evidence from targets; identify likely CPU, GPU and storage limits.
7. Is the milestone order sensible? Identify unnecessary early complexity and
   expensive future rewrites. Propose the smallest next release that validates
   both walking and the necessary universal-history contracts.

Return:

- An overall verdict and the five most consequential findings.
- A table of findings with severity, affected proposal section, concrete failure
  example, recommended change and an acceptance test.
- A revised milestone order if warranted.
- Explicit disagreements and unresolved decisions for the user.
- Primary-source links for new factual or technical claims, clearly separating
  evidence from inference and speculative design.

Do not modify runtime code or deploy anything. Record the actual responding model
and review date; disclose missing context. Do not claim tests or benchmarks that
were not performed.
