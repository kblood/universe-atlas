# Forest selection cache validation — 66c7728

- Source: 66c7728eff825bf25d547e70ed2034568054d53b (detached checkout)
- Build: pass; npm run build; Vite emitted only its chunk size advisory.
- Focused source suites: 57 passed, 0 failed across 12 files.
- Hardware: NVIDIA GeForce RTX 5090 via ANGLE and D3D11; ATLAS_HARDWARE=1.
- Desktop acceptance: pass; browser errors 0; clearance 99.97 m; trees 2033, flora 1623, fauna 128; local aerial hooks 19 of 19, failures 0; flora recipe builds 0; worker failures/restarts 0/0.
- AA: at 1440 by 1000, requested/effective samples were 0/0, 2/2, and 4/4. At 2560 by 1440, a request for 4 resolved to 2 at full resolution; restore to 0 passed.
- Warm profile with 476 samples: frame interval p50/p95 16.6/19.1 ms; GPU pass sum p50/p95 4.11/6.19 ms; CPU planet update p50/p95 9.6/13 ms. This is one hardware run, not a general performance claim.
- Lateral movement and cache reuse: pass; measured ground surface displacement 110.14 m; worker requests after movement 2; latest selection hits/misses 6655/32; estimated bytes 17,348,174 of 33,554,432; evictions 0; worker failures/restarts 0/0; trees 2030, flora 1624, fauna 128, surface ready; browser errors 0.

Reports and screenshots are in the desktop-rendering-hardware and browser-movement-lateral-hardware folders. The earlier SwiftShader attempt timed before ground arrival and is excluded from pass evidence.

The first hardware movement attempt used 60 m total 3D displacement and timed while the flight was still approaching; the revised lateral ground-surface movement run is the passing evidence.

