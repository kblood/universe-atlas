# Galaxy animal-world finder

The galaxy explorer now offers **Find planets with animals**. It returns at
most five planets, with system names and living plant/animal species counts,
and opens a selected planet directly. Its planet inspector retains **Find
living habitat** and **Land and walk**. Herds remain local/sparse; a living
species count does not guarantee an animal at every landing point.

The worker checks canonical catalogue references and the existing biosphere
query at the exact selected date. Results require a solid available surface,
complex/suitable life and living animal species with creature payloads.
Each batch scans at most 512 mapped systems; **Search more stars** continues
from the next system. This is a finder, not an exhaustive galaxy census.
Date seeks discard results and obsolete worker responses; visiting rechecks
life at the current date. No terrain scan, seed, model or world data changes.

For LETHRA-001/G001 at the reference date, the first batch finds Daunune,
Anitar, Ceriris, Naytar and Oratis after eight systems (about 21 ms for the
search in a local Node diagnostic). This timing is descriptive, not a budget.

Validation: five focused query tests pass; the affected run has 126 tests,
125 pass, zero fail and one existing continuity TODO. TypeScript/build pass.
The hardware browser test verifies five returned planets, disjoint next-page
results, date-reset invalidation/replay and actual planet navigation with
living-habitat controls, with no browser errors or failed requests.
