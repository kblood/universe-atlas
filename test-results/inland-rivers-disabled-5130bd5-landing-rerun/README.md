# Rivers withdrawal browser acceptance

The browser used a clean production preview built from runtime commit `5130bd53e46ba0f882adf6bc22d6fc1628e53b5f` (`dirty: false`, built `2026-09-28T18:58:10.257Z`). Harness source is commit `9fe71de59bfc333e7c829daf74b2013f0efaee58`. The run used an NVIDIA GeForce RTX 5090 through ANGLE / Direct3D11 at 1440×1000.

At Maithea's catalogue reference date (`435084631200000000000000000`), the fixture's independent snapshot and the renderer both report the dated ocean at −4500 m. The old `?river=` address opened the ordinary Maithea body, displayed the unavailable-rivers notice, dropped the retired query parameter from the persisted URL, and exposed no river controls, API diagnostics, river mesh, reflection, or regional environment. The renderer reported 15 visible ocean patches.

The route then entered free flight, descended to under 20 km, and used the ordinary **Land and walk** control. It reached grounded state with contact level 18, `surfaceReady: true`, terrain clearance about 1.64 m, zero terrain failures, and no page or console errors. The settled view reported 25 ocean patches and null river/reflection/environment diagnostics. See [full report](report.json), [legacy-link view](old-river-link-ordinary-body.png), and [grounded view](ordinary-grounded.png).

The first attempt is preserved at `../inland-rivers-disabled-5130bd5/`. Its only failure was a harness assumption: opening a body directly starts outside free flight. The corrected fixture explicitly enters flight and descends before landing. This is a river-withdrawal/navigation smoke test; ocean draw counts establish retained rendering activity, not visual water quality. It does not validate the still-experimental forest or fauna presentation.
