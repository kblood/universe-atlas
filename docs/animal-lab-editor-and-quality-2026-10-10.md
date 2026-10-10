# Canonical Animal Lab editor and anatomy release

Clean live Atlas `9fcc523349d66c51dd633f4f7547430a5a067bd8` consumes creature-kit
0.6.0 at `38215a7eff3d31c637b3e6534fce5672a3693cb1`. The independent Lab remains
`/animal-lab/planet-skin.html`. Two Astra agents with Extra High reasoning restored
the editor and developed the versioned anatomy changes; independent browser
acceptance checked the actual controls, visible edits and production rendering.

The previous canonical Lab was a minimal JSON inspector. Its replacement reuses
the established Lab styling and controls for seeded families and individuals,
young animals, body/head/limb/appendage dimensions, actual coat parameters,
undo/reset and original comparison. Playback, scrubbing, body/head/eye framing,
lighting, skeleton and wireframe are visible controls. JSON is advanced import
and export; it is unnecessary for normal editing. An imported Atlas definition
retains its full genome and identity until an explicit edit. Unsupported Composer
features are not silently substituted into the planetary generator.

`sculpted-v1` runs through the same canonical body builder. It improves chest,
abdomen and haunch contours, planted toe shape, cranium/eyes, ears and tail while
retaining the genome, skeleton and solved poses. Its output is explicitly named
`quadruped-body-sculpted-1`; the library's default body4 remains byte-compatible.
Atlas desktop near skins, worker-derived LODs and both Lab inspectors explicitly
select the same new presentation. `?fauna-body=legacy-v4` restores the prior skin;
XR uses legacy skins and disposes desktop LOD resources. Physical Quest is untested.

Paired review covered ten fixed specimens, adult/juvenile and real planet
genomes, with 70 actual solved pose comparisons and 90 source/LOD images. True
walk evidence includes revolutionS and checks swinging feet; an older labelled
walk corpus without it is not used to establish animation quality. All reviewed
1,500/750 triangle targets were reached. Measured deformed planted-foot gaps were
0.53–9.98 mm. Improved full-body eyes are readable; reduced meshes are assessed
at their intended distances, not promoted as detailed close-up eyes. Existing
surface-net saddle edges remain documented; no manifold export approval is implied.

Independent fresh-built Lab acceptance passed sixteen functional checks plus
normal desktop/mobile, compare and close-up review. Actual Atlas source/derived
draws and visible pixels were established in two worlds; versions, genotypes,
resource bounds and simulated disposal/resume passed. This was functional and
visual acceptance, not a new performance claim.

Kit's 245-test run exposed only a release-version fixture mismatch: 242 passed,
two skipped and one failed. The fixture was corrected and eighteen focused tests
passed, without changing any geometry golden. Atlas affected checks covered 43
files: 259 passed and one existing TODO, zero failures. Final package/provenance
checks passed 21 tests, with one conditional checkout check skipped; the actual
Kit checkout drift command passed separately.

Atomic native promotion verified every old/new file and both preview trees.
All 904 current files matched size and SHA over HTTPS. Native acceptance passed
seven editor workflows, exact Atlas definition import/export, ordinary habitat
flight without landing and visible source/LOD animals with the correct Kit0.6
sculpted source version. Rollback remains at
`/var/www/html/webxr/IWSDK/.backup-universe-atlas-9fcc523-20261010-kit06-lab`.
Evidence and provenance are under
`Assets/_assetctl/animal-lab-quality-20261010/validation.json`.
