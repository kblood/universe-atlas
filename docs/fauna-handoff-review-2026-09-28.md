# Fauna representation handoff: source review and lighting correction

Reviewed from integration `8e85650237ac3391349a422256ce629c79ac9f87`.
This is a scoped source correction. Browser visibility and visual continuity
remain unaccepted.

## Concrete lighting mismatch

The four instanced fallback batches used `MeshLambertMaterial`; the nearby
skinned bodies used `MeshStandardMaterial` with roughness 0.86 and metalness 0.
Changing representation therefore changed the lighting model even when the
member's genome colour, position and world lighting were identical. Lambert
diffuse lighting and the standard rough dielectric response are not equivalent.
This is a source-supported discontinuity; it does not establish how much of the
reported darkness was caused by lighting rather than forest shadow or occlusion.

Both paths now create their coat material through `src/fauna-material.ts`:
opaque, roughness 0.86, metalness 0, white base multiplier and black emission.
The fallback still reads per-instance colour; the skin reads normalized linear
vertex colour. Both retain shadow casting and receiving. The fallback's four
batches, instance capacity, geometry, dates and LOD distances are unchanged.
Standard lighting adds fragment shading work compared with Lambert; GPU cost
has not been measured for this correction.

## What matches, and what still differs

- **Outer transform:** `PlanetRenderer.drawFauna` composes the same grounded
  position minus `lifeOrigin`, quaternion and `1 / planet.radiusM` scale for
  both representations. The near group is a child of the fallback group, so
  both receive the same origin. No separate scale or origin jump was found.
- **Membership:** a successfully selected rig replaces that ID's fallback
  submission. The existing near-rig test checks exactly one representation per
  drawn member, equal outer matrices and deterministic date replay. Pool
  pressure can release a rig inside the distance band; that is a representation
  change, not evidence that the animal ceased to exist.
- **Distance:** 80 m acquisition, 95 m retention and six live rig slots remain.
  The observed 94.999 m rig to 97.03 m fallback is consistent with these rules.
- **Shape:** near anatomy is a continuous surface-net body with a segmented
  neck/tail, shaped muzzle and fleshed limbs. The fallback uses spheres,
  cylinders, cones and boxes. A shared torso reference height does not make
  their silhouettes identical. Head, tail and limb profiles differ.
- **Pose:** fallback sine gait uses `rigSeconds * walkSpeed / strideLength`;
  near footfall phase uses the member's actual orbit travel and an integral
  stride schedule. Near IK, slope adaptation, grazing and look-around are not
  reproduced by the fallback. Equal date and canonical root do not imply equal
  visible limb/head pose at a handoff.
- **Coat:** near skin adds procedural coat markings and regional colours;
  fallback parts have uniform genome base/accent colours. Sharing the material
  fixes the lighting model, not this difference in surface colour detail.

A full geometric/pose handoff needs a separate design that derives cheaper
geometry and animation from the same anatomy and dated pose while preserving
the bounded CPU/GPU work. This patch does not claim that continuity.

## Verification

Focused regression in `tests/fauna-near-rig.test.mjs` checks actual materials
constructed by both renderers, opaque/depth/shadow properties, neutral tint and
emission, and unchanged linear instance coat colour after submission.

Validation execution pending the serialized measurement window.

## Next visual check

Use a visible, unobscured individual in ordinary planet flight with a side view,
stable daylight and an unchanged simulation date. Record the member ID and
active rig ownership, then capture 79 m acquisition, 94.9 m retention and 95.1 m
release with the same view direction. Include a walking date and a grazing date;
compare the head, legs, silhouette and coat response. Also force ordinary pool
competition by bringing more than six nearby visible members into view. Show
full-body pixels at the crossing: a `faunaDrawn` entry alone is insufficient.
