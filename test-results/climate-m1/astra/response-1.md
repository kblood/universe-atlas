Astra review-1 (codex exec -m gpt-6-astra -s read-only, review-1.txt): VERDICT APPROVE-WITH-FIXES.

MF1 fell colour (tests/terrain-climate-colour.test.mjs): CLOSED. Live and substrate coverage are now separate. Every
fell column first asserts that its live sample is snow-covered (snowFraction > 0, i.e. no melt season), and the test
requires more than 20 such columns. Only after that is the under-snow substrate colour added to the fell-zone colour
assertion. The semantic change is flagged to the test owner in the package report.

MF2 tests/surface-biomes-climate.test.mjs out of scope: ANSWERED, no change. The brief's files_owned lists
tests/surface-biomes-climate.test.mjs. The reviewer prompt left it out by mistake.

S1 calibration provenance: FIXED in docs/surface-climate-v2.md section 2. Round 2 coarse varied P_REF over 400-1000.
The doc now says finite grids do not prove infeasibility.

S2 SITE_A baseline label: FIXED in section 4. The original SITE_RULE and the Q2(a) extension are separate rows; the
extension already fails on main (Tc margin 0.549 K).

S3 half-range floor: FIXED. The new test 'half-range floor ...' in tests/surface-climate.test.mjs uses anchor 460 K at
three obliquities and asserts half 0, warmest = coldest = annual, finite pdd/PET/P/effM, and no forest or snow.
