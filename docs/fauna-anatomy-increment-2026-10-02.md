# Procedural anatomy increment: body version 3

The skin remains one surface-net body on the existing 22-bone quadruped rig.
This revision adds an oval abdominal volume, limb-aligned shoulder and haunch
muscle volumes, joined mandible and nasal shaping, and broader toe contacts.
The browser, runner and long-neck families no longer inherit incidental dorsal
plates from their small legacy `armor` values. The authored low-bodied armored
family retains them.

Optional morphology now selects genuinely different foot geometry: two joined
forward toes for a split hoof, a central pad plus three simplified toe lobes for
a paw, or a single broad pad. These are bounded visual recipes, not full digit
skeletons. Feet retain their original ground anchors and IK chain. Proboscidean
profiles receive a broader and deeper cranium with broad lateral ear leaves;
trunk and wing geometry is a
separate bounded appendage pass, sharing the existing material and skeleton.

## Reference rationale and limits

- The Smithsonian National Zoo describes elephant feet as toe-supported with
  a thick fibrous pad. The broad-pad recipe uses that load-bearing silhouette
  as a reference; it does not simulate internal foot anatomy. Their account
  also describes the muscular trunk: a head-bound mesh in this increment is
  consequently a shape study, not a completed trunk rig.
  [Asian elephant](https://nationalzoo.si.edu/animals/asian-elephant)
- The Open University describes bat wings as modified forelimbs with elongated
  finger bones supporting a membrane. A chest-bound membrane on a four-legged
  generated animal must be presented as a speculative grounded morphology,
  rather than a validated bat or flying mammal. Articulated wings and a flight
  locomotion/contact model remain separate work.
  [Bat anatomy](https://www.open.edu/openlearn/nature-environment/natural-history/studying-mammals-the-insect-hunters/content-section-3.5)
- Existing [anatomy research](research-creature-anatomy-references-2026-09-14.md)
  remains the provenance for common semantic skeleton roles and bounded
  family variation. Shoulder/haunch ellipsoids are authored approximations;
  they are not fitted to a measured specimen or medical anatomy atlas.

These references were consulted on 2026-10-02. No images, figures, models,
external code, or training data were downloaded or incorporated. Reference
page rights are not claimed as asset rights.

## Acceptance

Retain the existing connected-body, closed-edge, outward-volume, 40,000-triangle,
ground-contact, skeleton-weight, facial-attachment and deformation thresholds.
Additional anatomy checks cover the soft tissue volumes, foot topology recipes
and absence of dorsal armor in the three unarmored families. Visual review is
still required: a passing geometry check does not establish anatomical realism.

Focused CPU validation passed 24/24 tests across `fauna-anatomy`,
`fauna-body-plan`, `fauna-face`, `fauna-near-rig` and `fauna-locomotion`.
The added profile corpus covers all six morphology families at adult and
juvenile stages; their core skins are connected, facial landmarks build, and
geometry and weights remain bounded. Existing deformation and foot-contact
limits were retained. The legacy four-family body corpus measured about
9,500–16,100 triangles per animal. These figures are CPU geometry checks,
not Quest qualification or a flight/prehensile-trunk acceptance result.

`tests/fauna-corpus.test.mjs` additionally passes the fixed **96-specimen**
corpus (four archetypes, three species, four individuals, two stages) and
**180 production-skinned boundary poses** (six morphology families, two
stages, idle/walk/feed, five times). Its ignored machine-readable receipt is
`test-results/fauna-variation-2026-10-02/cpu-corpus.json`.

Measured on this CPU run: maximum 9,229 vertices, 18,332 triangles, 199,723 grid
points and 433,007 bytes of typed body attributes/indices per specimen; mean
build time 37.4 ms and maximum 95.2 ms. These memory figures exclude temporary
build buffers, JS object overhead and GPU copies. Timing varies with hardware
and concurrent work. Maximum deformed edge stretch was 3.253 (limit 3.5), with
zero sampled skin penetration and minimum trunk clearance 0.4773 m after the
nasal attachment and ear refinements. Existing
foot-gap, solver-contact and reach gates pass. This corpus uses a flat floor;
the existing locomotion regressions provide the terrain-contact checks.
