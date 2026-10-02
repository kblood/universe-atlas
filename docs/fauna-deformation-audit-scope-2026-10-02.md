# Actual mesh audit corrections — 2026-10-02

Candidate 022 SHA256:
`6baf9c95195f547f89a37905825b919776961714b0a266016453afe50598533b`.
Original failed reports are preserved under `test-results/fauna-template-022-*`;
corrections do not imply visual or whole-animal acceptance.

## Triangle intersections

The old plane/triangle helper treated every vertex within 1 micrometre of the
other triangle's plane as a plane intersection. Projecting these off-plane
points along the intersection line fabricated positive intervals for nearly
coplanar triangles sharing one vertex. All seven reported candidate 022 pairs
disagreed with independent Three.js edge/ray intersections.

The corrected helper uses `1e-12` metre roundoff to recognize points on the
plane and computes actual edge/plane intersections. The physical overlap gate
remains **1 micrometre**, coplanar area tolerance remains `1e-12 m²`, and source
topology welding remains **1 micrometre**. Shared vertices do not exempt pairs.
Seven actual 022 negative pairs and three independently confirmed 015 positive
pairs are preserved in `tests/fixtures/fauna-topology-intersections.json`, with
source hashes, morphology, pose, triangle identifiers and coordinates. Both
classifiers are asserted on every audit invocation, alongside analytic cases.

Result: 022 passes all 135 neutral/walk control samples with zero connected-skin
crossings in `fauna-template-022-topology-all-controls-walk-exact.json`.
Separate eyes, lids, hooves and other shells remain outside this intersection
gate; it is not a full watertightness or shell-attachment certificate.

## Abdominal section scope

The old area gate used planes at 25%, 40% and 55% of hip-to-shoulder span across
all triangles, while its belly displacement region was 35–60%. On 022 the 25%
plane passes through the proximal thighs. For `bodyCondition=-1`, phase 0.5:

| Signed section integral at X=-0.217500 m | Neutral | Posed |
| --- | ---: | ---: |
| Axial-only triangle contribution | -0.208784745 | -0.208784745 |
| Limb-weighted triangle contribution | 0.109980992 | 0.091920459 |
| Total | -0.098803753 | -0.116864285 |

These group contributions are parts of a signed integral, not individually
enclosed areas. All change comes from 188 limb-weighted triangles; 56 axial
contributions are unchanged. The total ratio 1.182792 describes a moving thigh
entering the plane, rather than evidence that the central abdomen expanded.
The detailed receipt is `fauna-template-022-section-scope.json`.

The audit now retains **all three section measurements** and their signed
limb/axial contributions. X25% is labeled a hind/thigh diagnostic. X40/55% are
the central abdomen gate, using the **unchanged 0.85–1.15 limits**. Every central
section must form closed degree-two intersection loops and contain no triangle
with limb influence above `1e-6`; otherwise the audit fails its scope check.
No triangles are discarded to create an artificial passing section.

All 15 controls × (neutral + 24 walk phases) on 022 satisfy those central scope
checks and have central area ratio exactly 1. The existing belly displacement
checks remain unchanged and report zero. A synthetic closed-box negative
control bulges both transverse axes by 10%, giving ratio 1.21; the unchanged
gate rejects it.

**022 still fails real deformation:** its minimum skin-edge ratio is 0.306611,
below the unchanged 0.45 floor. Maximum stretch is 1.796111 against 1.8. The
new `fauna-template-022-deformation-all-controls-scoped.json` preserves this
failure at the bilateral stifle transition; no anatomy was altered by these
audit corrections.
