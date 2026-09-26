# Star visibility and approach transitions — 26 September 2026

This correction supersedes the density and photometry experiment described in
the September 25 visual-continuity update. The published state before this
correction is preserved in commit `75eb074`.

## What caused the regression

The galaxy interior had gained a dense, diffuse point field, distance-dependent
dust attenuation, and a narrow stellar core with strong flux attenuation. In
combination these obscured the addressable stars. Exterior galaxies also had an
extra central glow sprite. At system entry, a separate fixed-size stellar
navigation beacon and overlapping planetary beacons could enlarge the glow.

## Current rendering

- Remove the interior density field, dust attenuation and exterior core sprites.
  Keep the deterministic catalogue points and streamed nearby stars, with their
  dated existence gates. Distant galaxies retain their point-cloud silhouettes.
- Use a shared, bounded optical diameter for galaxy stars and unresolved system
  stars: `(2.6 + 9 / (1 + sqrt(distanceLy / 0.12))) * sqrt(luminosity)` CSS pixels.
  The per-ID display luminosity ranges from 0.8 to 1.2. This is a readability
  choice, not calibrated stellar photometry. The distant map uses smaller
  projection-based points; the local curve takes over gradually from 256 to
  32 light-years.
- Use the same soft point profile across the galaxy/system boundary. As the
  stellar disk resolves, fade out the optical point and retain the actual star.
- In physical desktop views, suppress the duplicate star beacon. Fade planetary
  and moon beacons in as their projected separation from their parent grows
  from 12 to 30 pixels. Overview and immersive navigation retain their beacons.

## Preparing the next scale earlier

Selecting or flying to a galaxy starts preparing its catalogue. Proximity also
starts preparation within 64 galaxy radii. Only the nearest exterior galaxy
holds a detailed preview. Its actual catalogue points replace the coarse
silhouette gradually between 20 and 8 radii, before entry at 6 radii. Exit is
at 8 radii, providing hysteresis. Preparation is asynchronous; a slow worker
can still delay the appearance of detail.

Systems prepare within 0.4 light-years. Their entry radius is the larger of
6,000 AU and eight times the largest planetary apocentre. Exit uses twice that
radius. This moves the handoff farther out while the primary is unresolved.
Physical desktop crossings retain aligned outgoing geometry for a 1.4-second
blend; ordinary menu transitions retain their existing behavior.

## Acceptance checks

`tests/visual-continuity.mjs` flies through galaxy entry, then approaches an
actual selectable single-star system. It inspects rendered PNG pixels as well
as read-only diagnostics. It checks:

- Actual catalogue stars are fully visible before galaxy entry.
- Entry happens outside the galaxy disk.
- The selected star's visible footprint grows on approach.
- The same system ID and a comparable point footprint survive system entry.
- Physical system entry has no duplicate stellar beacon or browser errors.

The local Chromium/D3D11 run measured approximately 3.2, 4.9 and 6.9 pixel
diameters at 25.3, 1.0 and 0.15 light-years. At system entry it measured 7.4
pixels. The bright connected footprint grew from 4 to 12 screenshot pixels
and remained 12 at entry. These figures are for one deterministic route;
subpixel placement, display resolution and other systems change exact results.

The travel regression also covers both outward crossings and a second galaxy.
This is desktop browser acceptance; fresh in-headset visual review remains
outstanding.
