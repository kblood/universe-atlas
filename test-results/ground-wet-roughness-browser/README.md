# Ground PBR browser navigation failures

These files preserve three unsuccessful attempts to reach a grounded terrain view. They are diagnostic records only; they do not show or validate the PBR material. The page reported no JavaScript or console errors in the captured failure JSONs, but the browser flow did not reach a valid on-foot inspection point.

| File | What happened | SHA-256 |
| --- | --- | --- |
| `river-generated.json` | Generated river-bank site record used by the attempted navigation. | `5b93c26abb457f408b76b561ac5c0bc0e650f7e0a63cd6d89398f5ed00e56a9a` |
| `river-generated.png` | Screenshot from the attempted river flight before landing; not a ground-material comparison. | `ea8e71b1f9e289eb29ef52fe6f9e8b8c9e150dac685e33b281772f3fecfe4e5b` |
| `flight-timeout.json` | Waited 180 seconds for the river-flight destination and timed out. | `b6e08c823b7174719cd46fa9a083a6bd4123d99e8e1b6b5c258040cef6a0b57e` |
| `direct-load-timeout.json` | Deep link to a sampled walk location timed out in `page.goto(..., waitUntil: "load")` after 30 seconds. | `c04af65da920864567bfb408db4a73f0f966ccf731ae3cf99a194a82133ebf93` |
| `failure.json` | Screenshot attempt timed out after fonts loaded; no browser console errors were captured. | `c1a9a31974e28c5f494695fb19038dcfbc5a7e8cad8650eed88942ec5f10e5b` |

The next browser attempt should use the repository's current dynamic landing resolver in `tests/surface.mjs`, save its grounded screenshot before any later navigation, then visit the generated river bank through the tested `tests/rivers.mjs` flow. No visual acceptance claim is made here.
