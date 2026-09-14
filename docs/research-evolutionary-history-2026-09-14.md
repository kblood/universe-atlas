# Evolutionary History for a Time-Addressable Universe

## Decision

Add a canonical, forward-written history graph beside the existing world history,
not a biological simulator hidden inside rendering. It must answer, for any
`atlas-time-1` date and branch, whether a body exists, whether it has formed a
surface capable of the relevant scenario, which life/culture lineages exist,
their parents and trait inheritance, and whether a lineage is native or arrived
from elsewhere. It should never claim to reconstruct real evolution, abiogenesis
or intelligence.

The present implementation is a useful time address, not this system:
`atlas-time-1` preserves signed BigInt nanoseconds relative to the catalogue
epoch, while `world-history.ts` exports deterministic stellar fixture sidecars
marked `provenance: heuristic-data-fixture` and `visualEvolution: false`.
Identity/existence are not yet applied to rendered objects, planet formation is
not a gate, and the current date control changes orbital positions only. These
facts must remain explicit until the new contracts and fixtures exist.

## Separate the graphs

Use four related but non-interchangeable records.

| Record | Canonical meaning | It must not be confused with |
|---|---|---|
| Body dependency graph | Star/system/body formation, surface, solvent, climate and habitability intervals | A visible planet or a life-stage decoration |
| Species history graph | Dated origination, extinction, persistence, split, merge/introgression and colonisation events | An individual genetic pedigree |
| Trait provenance graph | A correlated inherited trait package, its mutation/transfer event and policy version | Independent per-species random reseeding |
| Genealogy table (optional) | Fine individual/genome ancestry within a bounded lineage experiment | The species history graph or a browser runtime requirement |

`tskit` is a useful data-design precedent for the last row: its tree sequence
stores an ancestral recombination graph in tables for nodes, edges, individuals,
sites, mutations, migrations, populations and provenance. The output is a
sequence of correlated *genetic* trees along a genome. That does not make it a
species tree, a world-history schema or a feasible browser-wide simulation.
([tskit data model](https://tskit.dev/tskit/docs/latest/data-model.html))

## Forward deterministic history

Generate a finite sequence of canonical events from a world seed and versioned
scenario policy, in increasing global cosmic time. Every event has
`(timeNs, priority, stableEventId, historyVersion, branchId)`, a canonical sort,
parents/targets, preconditions, effects and provenance. Address stochastic
decisions with domain-separated hashes of stable identities, event namespace and
policy version; never consume a global PRNG stream or depend on traversal,
worker or camera order. A seed specifies a reproducible *policy result*, not a
claim that the result is scientifically predicted.

Use date fields in signed BigInt nanoseconds relative to the existing reference
epoch. Each local query derives `localAgeNs = cosmicTimeNs - formationTimeNs`
only after the relevant body exists. UI formatting may use years, but persistence,
sorting, checkpoint keys and hashes use the lossless representation. A query
before formation returns an explicit `absent` state, never a mature body with
hidden life. Required dependency intervals are:

```ts
bodyAt({ bodyId, cosmicTime, branchId, bodyHistoryVersion })
lifeAt({ bodyId, cosmicTime, branchId, evolutionVersion })
lineageAt({ lineageId, cosmicTime, branchId, evolutionVersion })
```

`BodyRecord` has formation, destruction and surface-availability intervals, plus
versioned physical scenario outputs. `LifeEligibility` references them with
preconditions such as stable surface/substrate, solvent regime, energy/productivity
and a continuous allowable interval. A first-life event must occur while all
declared necessary conditions hold. Later impacts, atmospheric loss, sterilisation or stellar transitions can
close the interval and cause extinction, dormancy or migration only through
named events. This makes pre-planet absence, formation and local age visible
facts rather than a renderer switch. It follows the existing roadmap's rule that
planet formation, cooling and water availability constrain life, while leaving
the physical model to future versioned tracks.

## Lineages, species and traits

Make the default macro-history a directed acyclic **species history graph**.
`LineageRecord` holds a stable ID, clade, origin event, existence interval,
home/body/range history, parent edges, trait-package revision and extinction
reason. `SpeciationEvent` may be bifurcating (ancestor ends and two descendants
start), or budding/asymmetric (ancestor persists while a child starts).
Anagenetic species replacement continues an unbranched lineage but closes one
species interval and starts another. Ordinary within-species trait change is
a separate revision event and must not automatically count as speciation. The distinction
matters: fossil/diversification work explicitly treats budding, bifurcating and
anagenetic speciation as different modes, and a phylogeny normally cannot tell
whether the pre-branch species is identical to one post-branch species.
([Stadler et al. 2018](https://arxiv.org/abs/1706.10106))

`ExtinctionEvent` closes a lineage's existence interval and preserves it for
history queries; it never deletes the record. A descendant may outlive its
ancestor. `ColonizationEvent` adds an occupied range to an already-existing
lineage and has source population, pathway, arrival time, propagule/mission
policy and destination prerequisites. It is not speciation by default.

An ordinary display can project this graph to a simple rooted tree. Keep the
canonical form capable of a second parent edge, however. Hybridisation,
introgression and horizontal transfer create reticulate genetic histories, while
incomplete lineage sorting can make gene trees disagree without a reticulate
species event. ([Mallet, Besansky & Hahn 2016](https://pmc.ncbi.nlm.nih.gov/articles/PMC4813508/))
For the first prototype, allow an explicit `GeneFlowEvent` only between existing,
temporally overlapping compatible lineages and make it transfer a named bounded
trait fragment. Attach transfer edges to dated trait-state/event nodes, so
later transfer in the reverse direction does not create a cycle in a static
species-ID graph. Do not silently turn every species tree into a network; project
gene flow in a separate overlay and keep its evidence as scenario fiction.

Traits need correlation. A `TraitPackage` is an immutable vector or grammar of
body-plan family, segment ratios, material/metabolism, reproduction, diet,
locomotion capabilities, tolerances and behavioural policy. A child begins by
copying its parent package, then applies one deterministic, named mutation
operator within clade limits. Pairs of traits can share a latent module or a
constraint rule, so, for example, changed limb count also updates skeleton and
gait eligibility. Independent fresh random draws at each speciation create
visual variety but erase ancestry. Store each package's parent revision,
operator, random domain and compiler version so the phenotype/lab system can
replay it.

This schema is inspired by evolutionary simulation tooling without adopting it
as a runtime dependency. SLiM 3 supports forward, non-Wright–Fisher population
models and can record ancestry with tree-sequence methods; that makes it useful
for offline experiments on a small lineage, migration or selection scenario.
It does not supply alien biology, a species-level history policy, deterministic
cross-device browser replay or assets. ([Haller & Messer 2019](https://doi.org/10.1093/molbev/msy228);
[tskit introduction](https://tskit.dev/tskit/docs/stable/))

## Scenario phases and colonisation

Define versioned **scenario phases**, not an evolutionary ladder:
`sterile`, `prebiotic-eligible`, `microbial`, `complex-multicellular-eligible`,
`complex`, `technological-policy-eligible`, `settled`, and `post-extinction`.
Each phase has entry preconditions, possible exits and a probability/selection
policy recorded in the event; no phase requires a later one. “Microbial” and
“complex” are fictional ecological states informed by Earth-like priors, not
scientific diagnoses of an alien world. Multiple independent origins, stasis,
extinction, recurring microbial life and permanently sterile worlds must all
remain valid outcomes. Multicellularity has evolved independently in multiple
lineages on Earth, which supports treating complexity as contingent transitions,
not a guaranteed destination. ([Knoll 2011](https://doi.org/10.1146/annurev.earth.031208.100209))

Intelligence, language, civilisation and expansion require an independently
authored social/technology scenario. A biological trait must not automatically
schedule settlement. Conversely, a settlement/biocontamination event must carry
an actor, transport mechanism and scenario policy, source and
destination IDs, travel interval and survival/establishment gate. Natural
lithopanspermia and directed transport are hypotheses with severe transfer and
establishment filters; they do not explain life's original origin. Treat
interplanetary colonisation as a rare, named event with versioned assumptions,
never as an automatic adjacency spread. ([Worth et al. 2013](https://arxiv.org/abs/1311.2558))

## Random access, validation and first slice

Do not replay the universe from its first event for every seek. Partition events
by body/system and coarse cosmic era. Store immutable checkpoints containing the
canonical state digest, highest event key and dependency-version digest. To query
a date, load the latest valid checkpoint before it, replay its bounded suffix in
total order and verify the resulting digest. Changing a history/trait/body-policy
version requires an explicit migration or a new scenario branch; it must not
silently rewrite a saved world. A local nearby-animal simulation is not an
evolution source.

The first acceptance slice should use three bodies: an unformed/protoplanetary
body, a formed but sterile airless moon, and a rocky wet world. Give the wet
world one microbial lineage, a budding descendant that coexists with its
ancestor, one extinction, one colonisation attempt rejected by a destination
gate, and one successful transfer only after its named prerequisites. Include
one gene-flow overlay event without changing the displayed species tree.

Automated gates: same seed/version gives the same sorted events and IDs; shuffled
generation/cell/worker order is identical; all lineage and parent intervals are
valid; no life or settlement precedes body/surface eligibility; global date and
local age convert exactly; a child inherits correlated traits; extinct records
remain queryable; a checkpoint query equals origin replay; and a pre-formation
query returns `absent`. Human review reads the event ledger and tree/overlay:
dates and causes must be intelligible, ancestor persistence must be visible,
the colonisation gate must explain rejection, and no visual visit changes a
lineage. Passing proves deterministic scenario history, not scientific evolution
or browser-scale genealogy simulation.

## Sources and access notes

1. tskit developers. [Data model](https://tskit.dev/tskit/docs/latest/data-model.html) and [introduction](https://tskit.dev/tskit/docs/stable/), accessed 2026-09-14. Official documentation for tree-sequence tables; documentation describes ancestry representation, not a species-tree or runtime licence. Verify the installed package version and its own licence before use.
2. Tanja Stadler, Alexandra Gavryushkina, Rachel C. M. Warnock, Alexei J. Drummond and Tracy A. Heath. [“The fossilized birth-death model for the analysis of stratigraphic range data under different speciation concepts”](https://arxiv.org/abs/1706.10106), preprint submitted 2017, revised 2018. Public author preprint and abstract; supports the distinction between budding, bifurcation and anagenesis, not generated alien histories. Inspect code/data separately.
3. James Mallet, Nora J. Besansky and Matthew W. Hahn. [“How reticulated are species?”](https://pmc.ncbi.nlm.nih.gov/articles/PMC4813508/), *BioEssays*, 2016. Public PMC article; article access does not license datasets or implementations.
4. Benjamin C. Haller and Philipp W. Messer. [“SLiM 3: Forward Genetic Simulations Beyond the Wright–Fisher Model”](https://doi.org/10.1093/molbev/msy228), *Molecular Biology and Evolution* 36(3), 632–637, 2019. Publisher access may vary; SLiM software and examples have separate repository licence terms.
5. Andrew H. Knoll. [“The Multiple Origins of Complex Multicellularity”](https://doi.org/10.1146/annurev.earth.031208.100209), *Annual Review of Earth and Planetary Sciences* 39, 217–239, 2011. Publisher access may vary; no code/data licence is implied.
6. R. J. Worth, Steinn Sigurdsson and Christopher H. House. [“Seeding Life on the Moons of the Outer Planets via Lithopanspermia”](https://doi.org/10.1089/ast.2013.1028), *Astrobiology* 13(12), 1155–1165, 2013; [arXiv preprint](https://arxiv.org/abs/1311.2558). Publisher access may vary; it is a specific transfer analysis, not proof that panspermia occurred or a general colonisation model.
