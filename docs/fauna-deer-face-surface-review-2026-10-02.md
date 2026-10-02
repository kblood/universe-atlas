# Candidate027: nose, eyelid and lip surface conflicts

**Diagnosis saved for a later head task.** The active priority has moved to
combinable animal body plans. No authoring source or GPU job was changed here.

## Evidence

Actual027 GLB SHA-256:
`757f6c47b7cd769c86b5e1159637119a567bd66a8af2a4f173a5af1dda5c30b6`.
Its head geometry matches025. Inspected screenshots include
`test-results/fauna-template-027-browse-browser-001/adult-textured-lowered-head.png`
and the neutral-material lowered/returning throat images in
`test-results/fauna-template-027-browse-throat-002/`.

The nose boundary has speckled, partly occluded-looking dark patches; the eyelid
outline breaks into fine surface artifacts. No gross detached ear or freely
floating mouth strip was visible in the inspected frames. The 120 captures are
preserved, with unchanged source-file hashes, zero measured hoof displacement
and maximum measured muzzle residual3.33e-6m. This is not realism approval.

CPU receipt: `test-results/fauna-template-027-face-surfaces.json`; reproducible
read-only script: `test-results/face-surface-027.mjs`. It examines adult and
juvenile+long-neck, neutral and lowered poses. Components are reconstructed
across material boundaries: the connected head includes **48 keratin nose-cap
triangles** beneath the separate rhinarium.

Distances below are triangle-centroid distances to the nearest connected head
surface, signed along that surface normal. Negative means locally behind it.
“Front” selects detail normals aligned with the local body normal (>0.25 dot).

| Adult neutral detail | Median front distance | Front centroids within0.1mm | Front centroids behind skin by>0.1mm |
| --- | --- | --- | --- |
| Rhinarium | +0.209mm | 22 | 70 |
| Left/right eyelid | +0.066/+0.035mm | 32/32 | 32/32 |
| Left/right lip | +0.357/+0.398mm | 6/3 | 4/3 |
| Left/right nostril | +0.800/+0.846mm | 0/0 | 0/0 |

Some buried faces are intentional roots. The decisive extra finding is **21
outward-facing rhinarium triangles whose three corners are all >0.1mm outside
the skin, but whose centroids fall inside it**. Example triangle12922 is0.719mm
behind coat triangle3292; triangle12921 is0.170mm behind the connected keratin
cap. These interior faces cannot be explained solely by the deliberately
buried outer rim. The unrelated tessellations cross between ray-projected
vertices. Adult neutral/lowered counts are identical; juvenile+long-neck still
has18 such interior faces.

Ray-based triangle tests also find358 rhinarium/body crossing pairs in the
adult, including230 pairs on front faces with all corners outside. Rhinarium
and nostril shells cross each other55/48 times. Eyelid/globe crossings233/232
include expected attachment overlap and are **not individually classified as
defects**. Eye front surfaces sit roughly2mm above the skin; their embedded
perimeters differ from the rhinarium's demonstrated interior-face intrusion.

## Source cause and later structural repair

Anchors: immutable `Assets/_assetctl/deer-doe-candidate-027/fauna-authoring-source.py`.

- Lines473–509: the separate rhinarium ray-projects its vertices, lifts front
  rings only0.4–0.6mm, buries the perimeter3mm and back4mm. Projection of vertices
  does not make the connecting faces conform to the underlying triangulation.
- Lines528–562: a separate globe and closed lid ribbon sit over intact facial
  skin. Lid front offsets0.3–0.7mm, outer rim−0.5mm and back−1.3mm create an
  extended near-coplanar transition.
- Lines563–599: lips are thin tubes partly buried in the skin; nostril shells
  are projected against skin, despite the intervening rhinarium plate.

For the later head increment, author **one external muzzle surface**: select and
reshape its bare-nose region within the connected skin, or remove the covered
faces and stitch a replacement patch to their perimeter. Use material regions
on that surface; eliminate the hidden competing keratin cap/coat underneath.
Build nostril wings and recessed openings into that same patch with explicit
inner surfaces. Keep the current material budget and shared deformation data.

Likewise, make the upper/lower eyelid loops part of the facial topology around
an actual orbital opening; retain the globe as a recessed separate object with
controlled rim coverage. Form the mouth edge as a connected crease/lip surface,
with any dark oral interior behind it. Avoid covering intact skin with another
thin visible tube or annulus. Increasing polygon offset, darkening the material,
or simply pushing every shell outward would conceal symptoms without resolving
the competing external surfaces.

## Limits and future validation

The local normal distance is not a global signed-distance field. Front/back
classification is geometric, not a camera visibility proof. Near-coplanarity
and real crossings support an occlusion mechanism; this CPU study does not
prove the exact GPU depth-buffer contribution to every speckle. Crossings at
deliberately buried roots remain distinguishable from exposed interior-face
intrusion; do not loosen attachment gates or declare every overlap invalid.

Future exported assets need explicit exterior-surface ownership, attachment
checks, neutral/browse/morph cross-surface diagnostics, unchanged rig/strain/
contact gates, and matched close browser views. Preserve these027 measurements
as the regression evidence when that deferred head task resumes.
