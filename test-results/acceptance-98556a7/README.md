# Canopy acceptance on 98556a7

Built from immutable commit `98556a79df4fde1d1c878bfbd1eda5c97413ecef` with `dirty: false`. Production build and hardware browser acceptance used an RTX 5090 through ANGLE D3D11 at 1440×1000. Tests ran serially. The water/date browser harness is a local validation file linked at [canopy-water-date-seek.browser.mjs](../../tests/canopy-water-date-seek.browser.mjs).

## Date water seek

The life-enabled LETHRA-001 body remained in complex flora/fauna stage while seeking −4500 m → −4475 m → −4500 m. The new level settled at each date; stale water patches and terrain/canopy queues reached zero. The canopy stayed ready with the same canonical family and reused eligible patches; no browser errors occurred. See [date report](../canopy-water-date-seek-98556a7/report.json), [−4500 m baseline](../canopy-water-date-seek-98556a7/water-minus-4500m.png), [−4475 m](../canopy-water-date-seek-98556a7/water--4475m-1.png), and [return to −4500 m](../canopy-water-date-seek-98556a7/water--4500m-2.png).

The pre-fix c02ee95 fixture timed out because 180 visible water patches remained stale after the seek despite matching date and water bucket, zero pending jobs, and a ready canopy. This is preserved as [failure report](../canopy-water-date-seek-c02ee95/failure.json) and [failure screenshot](../canopy-water-date-seek-c02ee95/failure.png). The retained-leaf refresh fix in 98556a7 resolved the issue in the same browser scenario.

## Flight and walking

The flight fixture passed with 321.5 m lateral flight and 323.2 m grounded travel, `systemUnit: 1`, zero browser errors, zero near-census disagreements, and no canopy jobs, queues, restarts, failures, or capacity misses after settling. The final sample reported 153,543 trees in 6,690 patches; 13,948 far-owned candidates were skipped before near selection. Opaque canvas readback passed the fixture's MSAA 0/2/4 checks. See [flight report](../canopy-flight-98556a7/report.json), [near ground](../canopy-flight-98556a7/flight-near-ground.png), [turned flight](../canopy-flight-98556a7/flight-turned.png), [lateral flight](../canopy-flight-98556a7/flight-lateral.png), [close walking](../canopy-flight-98556a7/walking-close.png), [turned walking](../canopy-flight-98556a7/walking-turned.png), [300 m lateral walking](../canopy-flight-98556a7/walking-lateral-300m.png), and [settled result](../canopy-flight-98556a7/settled.png).

## Rendering profile and AA

A separate, CPU-idle profile run passed on the same hardware. At 1440×1000 it captured 465 CPU and 463 completed GPU samples. Planet update CPU p95 was 16.1 ms; frame work p95 was 21.7 ms; instrumented GPU pass sum p95/max was 5.73/8.45 ms. Requested cloud MSAA 0, 2, and 4 resolved to 0, 2, and 4 samples. These measurements describe this run and are not a broad FPS claim. See [profile report](../desktop-rendering-profile-98556a7/report.json), [warmed near-ground view](../desktop-rendering-profile-98556a7/near-ground-warmed.png), and [AA 0/2/4 screenshots](../desktop-rendering-profile-98556a7/cloud-aa-0.png), [2×](../desktop-rendering-profile-98556a7/cloud-aa-2.png), [4×](../desktop-rendering-profile-98556a7/cloud-aa-4.png), [resized 4×](../desktop-rendering-profile-98556a7/cloud-aa-4-2560x1440.png).

An earlier rendering run overlapped CPU-only terrain regression work and is retained as [contended profile output](../desktop-rendering-profile-contended-98556a7/report.json); the metrics above come from the later isolated run.
