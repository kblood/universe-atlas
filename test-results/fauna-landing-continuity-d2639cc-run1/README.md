# Fauna landing continuity run 1

Runtime/build: `d2639cc177d1716a81b178d741e6687d055e6993`, clean. The browser route successfully restored the exact frozen world epoch `435084631200000038015600000`. The source target was `G001/C2128,0,1/0/planet/1:fauna:d97e5c18`, cell `x+/276493/102196`. At the grounded destination it was still in the 128-member drawn set; its body-local distance from the settled walker was 3.07 m. Terrain reported contact level 18, max level 18, surface ready, and zero failures. One near rig was active and built.

The run stopped after these successful checks because the harness passed two arguments to Playwright `page.evaluate`, which accepts only one. The resulting `Too many arguments` is a test harness error after grounding, not a runtime failure. The full failure dump and screenshot remain alongside this note. No close-up pass is claimed from this attempt; rerun uses the corrected single-object argument and saves rendered screenshots.
