# Cosmic history: from the hot early universe to a possible far future

This is the original planning record. For the current source status, see
[Temporal universe implementation status](temporal-universe-implementation-2026-09-23.md).

## What Atlas can already do

Atlas stores dates as BigInt nanoseconds since the Big Bang. Its present catalogue
is anchored at 13.787 billion years, and its time control can jump to a
`10^100`-year ceiling. Galaxies, stars, planets, surfaces and biospheres already
have dated existence or stage queries. The recent formation and life work makes
planet accretion, cooling, oceans, plants and animals inspectable at selected
dates. These are procedural histories, not a reconstruction of our own Solar
System or Earth's evolutionary timeline.

The Big Bang checkpoint currently shows an explanatory placeholder. The current
`scaleFactorAt` formula is matter plus a cosmological constant, so its results
in the radiation-dominated early universe are not physical. Its `t = 0` value
must not be read as a rendered singularity. The `10^100`-year checkpoint is a
navigation ceiling and heat-death illustration, not a predicted instant when
the universe ends.

## Time range and useful checkpoints

| Time after the hot Big Bang | Atlas representation | Confidence/limit |
| --- | --- | --- |
| `t = 0` and earlier than 1 ns | Explanatory origin and optional model cards | The current nanosecond clock cannot resolve the earliest physics. Inflation and any singularity require explicit assumptions. |
| 1 ns to about 5 minutes | Expanding, cooling particle/plasma field; light-element formation | A homogeneous thermal model and state labels, not individual-particle simulation. |
| 5 minutes to about 380,000 years | Opaque plasma and growing density fluctuations | No ordinary stars, planets or visible galaxies. |
| About 380,000 years | Recombination and a whole-sky CMB view | First directly observable light from the early universe. |
| About 100 million to 1 billion years | First stars, reionization, early galaxies | Formation dates are ranges and model assumptions, not one universal switch. |
| 1 billion to 13.787 billion years | Galaxy, star, planet and biosphere histories | Existing Atlas content should remain the detailed, explorable part. |
| 13.787 billion to roughly `10^14` years | Star formation declines; long-lived stars and their planets change | Scenario-dependent population evolution; individual systems use their own lifetimes. |
| `10^14` to `10^40` years | Dim remnants and changing galactic populations | Coarse statistical or explanatory representation. |
| `10^40` to `10^100` years | Black-hole-dominated, increasingly dilute future | Highly conditional extrapolation. |
| `10^100` years | UI ceiling labelled **heat-death scenario** | Not a finite physical end or proof that nothing can happen later. |

The first five minutes, the first billion years, the life of a planet, and the
far future cannot share one useful linear slider or playback rate. Use named
checkpoints and logarithmic navigation across orders of magnitude, plus a
local linear control where a process needs detail. A direct seek should compute
the state at its destination; the browser should not replay every intermediate
year or particle interaction.

## Simulation design

1. Add an **early-universe observation mode**. Fill the view with a spatially
   extended hot plasma/radiation field, cooling and changing opacity over time.
   The Big Bang occurred throughout the modeled space; there is no centre,
   explosion shell, planet, or free-flying observer in those epochs. CMB
   anisotropy can be a seeded field after recombination, with its visual scale
   labelled illustrative unless tied to measured power spectra.
2. Give the early era its own calibrated background model: radiation, matter and
   dark energy in the Friedmann expansion history; temperature approximately
   proportional to `1/a` while the thermal-radiation approximation applies.
   Keep visual effects separate from physical quantities and document where
   approximations start. Preserve today's catalogue as an anchor.
3. Connect the cosmic model to the existing dated hierarchy: gas fluctuations
   lead to first stars and galaxies; stellar enrichment permits later rocky
   planets; existing planet formation and life stages then supply local detail.
   Their exact seeded dates are illustrative unless calibrated to an explicit
   formation model. Use stable IDs and direct `stateAt(t)` queries.
4. Split **simulation time** from **observation time**. A direct date view shows
   the modeled state at that date. A later light-cone mode may show what an
   observer would actually see, accounting for light travel and redshift.
   `c/(aH)` is the comoving Hubble radius, not the observable-universe boundary;
   Atlas currently uses it as a galaxy visibility gate and should correct that
   before presenting an observational sky as physically accurate.
5. Keep future fate as a named scenario. The default can be continued expansion
   with constant dark energy, progressive isolation and cooling. Big Crunch and
   Big Rip can be optional parameterized alternatives only when their
   assumptions and uncertainty are visible. Future planet and life histories
   should respond to their star's evolution and local conditions, rather than
   a single universe-wide extinction date.

## First buildable slice

Start with a whole-sky **hot early universe → recombination → dark ages → first
stars** journey. Add these checkpoints to the era UI, a radiation-aware
background curve, and explanatory scene states. Transition into the existing
galaxy view when galaxies exist, then keep the present planet and animal
exploration available. Treat the first sub-nanosecond interval as an annotated
model view until the clock contract gains a separate early-time representation.
After that, build one late-future scenario using the existing lifecycle queries.

## Sources behind the anchors and cautions

- [NASA overview of nucleosynthesis, recombination and first galaxies](https://science.nasa.gov/universe/overview/)
- [NASA Webb Big Bang Q&A: no central explosion; CMB visibility](https://science.nasa.gov/mission/webb/big-bang-q-and-a/)
- [NASA on first-star timing](https://science.nasa.gov/mission/webb/science-overview/science-explainers/what-were-the-first-stars-like/)
- [Planck 2018 cosmological parameters](https://arxiv.org/abs/1807.06209)
- [Davis and Lineweaver on cosmological horizons](https://arxiv.org/abs/astro-ph/0310808)
- [Adams and Laughlin on far-future stellar and black-hole eras](https://arxiv.org/abs/astro-ph/9701131)
- [DESI 2025 results on possible evolving dark energy](https://www.desi.lbl.gov/2025/03/19/more-than-a-hint-of-evolving-dark-energy-new-results-and-data-from-desi/)
