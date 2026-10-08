# Continuation golden ledger

The strict combined golden run passes in Node, Chromium 149, Firefox 151,
and WebKit 26.5: `GOLDEN CROSS-ENGINE GATE: PASS (all four engines equal)`.
It includes creature-kit `5e4265f` and `terrain-1.10.1-forest-colour`.
No known-mismatch exception is added.

| Key | Previous prefix | New prefix | Verified cause |
|---|---|---|---|
| placeQuery | ae5b7337 | 52aadfbd | terrain version strings only |
| census | bceff683 | 69137b0b | cache provenance context only |
| fauna | 75a59833 | f0d8a400 | two named catalogue specimens added |

Fauna records increase from 655 to 716. Comparing complete canonical records
against the unmodified Atlas main at `f2f2c62` proves all 655 existing fauna
records identical. The worm mouth and cephalopod horse contribute 61 records.
Replacing the old terrain-version string makes placeQuery records exactly
equal; replacing each census context makes all census records exactly equal,
including population fields. The context is cache provenance; population
selection remains seeded by the body seed.

All other digests and counts stay identical: catalogue, terrain, combined,
history, hierarchy, geophysics, climate, biomes, ocean volume, and rocks.
The small legacy terrain golden sample contains no changed forest colours;
forest colour changes are covered by the four-world colour and assembly pins.
The assembly height, ocean and selection-count pins stay identical.

Inspect the local receipts under
`Assets/_assetctl/atlas-continuation-2026-10-08/` at the IWSDK root:
`golden-cross-engine.json`, `golden-cross-engine.log`,
`golden-delta-proof.json` and its reproducible comparison script. The script
accepts a baseline checkout at `f2f2c62` and a candidate checkout; it asserts
record identity before writing the ledger. Browser/device appearance and
desktop performance acceptance are separate gates.
