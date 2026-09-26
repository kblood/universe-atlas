# Temporal universe implementation status

The current source implements a navigable, deterministic **baseline scenario**
on the existing BigInt nanosecond clock. The reference catalogue remains
anchored at 13.787 billion years. This record distinguishes working queries
and scenes from scientific or ecological models that still need development.

## Connected production path

- `cosmic-background.ts` tabulates a homogeneous radiation, matter and
  constant-dark-energy expansion history. `cosmology.ts` exposes exact era
  checkpoints from the explanatory origin to the `10^100`-year UI ceiling.
  The temperature approximation is explicitly unavailable before one second.
- `primordial-population.ts` generates a seeded first-star cohort. Each
  first-star ID names a descendant reference galaxy, and
  `stellar-cohorts.ts` gives that galaxy an extinct historical cohort whose
  stars are born after a named precursor ends. These are procedural lineage
  points and an enrichment *proxy*, not a calibrated chemical-evolution or
  gravitational-collapse calculation. A small post-reference cohort follows
  the galaxy's own quenching and merger dates. A galaxy merger redirects
  surviving population IDs into the successor display; a bounded enrichment
  proxy changes the later cohort's illustrative lifetime and color mix.
  Cohort and lineage queries now accept a canonical galaxy address. A
  generated galaxy outside the root group gets its own precursor IDs, cache
  entries and host address even when its local `G###` label matches a root
  galaxy. Historical births stop at quenching or merger, as later births do.
- The main universe scene shows opaque plasma, an illustrative seeded CMB
  fluctuation field, dark ages and first stars. Galaxies only appear after
  their dated formation. Inside a galaxy, reference stars are gated by their
  lifecycles and older and later population points appear at their own dates.
  Living first-star markers can now be selected for an illustrative close
  visit. Dated stellar cohort points inside formed galaxies can be selected,
  flown to and bookmarked. When no cohort star is currently alive, the galaxy
  panel can seek to its next birth. The future map keeps surviving galaxy
  locations selectable as dim proxies even after ordinary starlight fades.
- A body's canonical ID now seeds both its species history and runtime life.
  `planetSnapshotAt` composes its planet stage, host-star environment, dated
  ocean, biosphere and surface sampler. The inspector, water adapter and local
  life gate share the cached dated snapshot. The global ocean is distinct
  from inland rivers and lakes.
  Flight, terrain exploration, river visits, landing, launch and walking now
  sample the same date-matched snapshot. Unformed, accreting and engulfed
  bodies provide no terrain sample; molten terrain is visible but cannot be
  walked on. Molten bodies also report a molten biosphere stage.
  A planet can be followed from its formation date through dated milestones.
  The target stays selected when the view falls back to the system before
  formation or after engulfment. Playback pauses at major surface and
  existence transitions so the next stage can be inspected.
- Living animal species IDs and genomes drive local herds. Integer cubemap
  cells give herds stable anchors and identities; their poses use absolute
  world time with bounded modular periods. A direct seek therefore resolves
  the same herd at the same date without replaying animation frames.
- The default far future is a labelled continued-expansion scenario. Stellar
  remnants cool, galaxy light becomes a coarse proxy, and life beyond the
  biosphere model's 20-billion-year local-age range reaches a labelled
  procedural extinction policy.
  The `10^100`-year date is only a navigation ceiling.
- Separately parameterized Big Crunch and Big Rip selections have exact
  scenario limits and explanatory universe-scale states. Their transition
  dates are chosen illustration parameters; the baseline world history is
  retained before each transition.
- The universe map defaults to a simultaneous-date view. An optional
  **approximate observed sky** uses a particle horizon and a past-light-cone
  emission date for galaxy glyphs. Bookmark restoration checks model and
  build identities and displays compatibility differences.

## Limits that remain

The early field is explanatory art, not a simulation of inflation,
nucleosynthesis, recombination microphysics, measured CMB anisotropy or
structure formation. The lineage bridge preserves causal birth order but does
not derive the later catalogue's star masses, rocky planets or biospheres from
gas dynamics and metallicity. Catalogue bodies are still procedural scenarios,
not reconstructed Solar System histories.
First-star visits use illustrative screen positions, and dated cohort visits
have no resolved planetary systems. Planet histories that never reach an
engulfment event have no modeled destruction date.

The biosphere has dated species and habitats, but no planet-wide population
ecology, food web, migration or evolution after its supported local-age range.
Animal gait is a deterministic local presentation model, not a physical
behavior simulation. The observed sky uses approximate bolometric dimming,
not calibrated spectral transport. The alternate fates currently provide
scenario-aware timeline bounds and explanatory states, not alternative
Friedmann solutions or detailed contraction/disruption physics.
Very late intergalactic distances are retained in logarithmic form for
readouts; finite renderer position adapters saturate.

The interactive galaxy scene still traverses the root 32-galaxy catalogue.
The address-aware lineage queries can resolve generated groups, but the
scene has no navigation path into those groups yet. Local `G###` labels are
therefore never sufficient as global identifiers outside the root group.

The repository build compiles successfully. Automated and in-headset
verification were not requested for this implementation turn and are not
claimed here.
