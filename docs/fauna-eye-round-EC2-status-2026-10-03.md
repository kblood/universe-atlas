# Eye round 2026-10-03, package EC2: honest Luna status

EC2 builds the eye catalogue v2 geometry (`fauna-composer-eye-2`, `fauna-composer-skin-4`).
This note records the appearance verdicts as they stand at merge time (EC2 HEAD 4e030bb).
GPT Luna 6 decides appearance. A specimen counts as passed only when its dedicated runs pass.

## Contested: cat-cat-carnivore (review blocker 2)

EC2 first reported the cat as "fixed, Luna PASS". That is not a clean pass. The review
re-rendered HEAD 4e030bb; the sheet was byte-identical (md5 E776D8C352...). It then ran two
dedicated Luna judgements, and both failed:

| Run | Verdict | Luna's words |
| --- | --- | --- |
| r41 (EC2) | PASS | "gold-green irises with vertical slit pupils read clearly as cat eyes", but "the dark surrounding rims look heavy and uneven" |
| r45 (EC2, batch) | PASS | "The eyes look small and deeply inset for the stated large-eye target" |
| review run A | FAIL | "they sit far out on the sides of the narrow muzzle and bulge noticeably ... more as protruding side eyes than large, frontal cat eyes"; "dark, uneven rims make the eyes look deeply socketed" |
| review run B | FAIL | "look bulging rather than seated in the skull, and the irises do not read as gold-green"; "a large dark shape beside the slit that makes the iris look irregular" |

Status: **contested (2 PASS, 2 FAIL), not fixed.** EC2 applied the same rule to the owl
(dedicated r49 overruled batch r45). By that rule, the dedicated FAILs carry more weight.

Reviewer's reading, not a Luna verdict: in the eye macro, a dark wedge sits inside the iris,
left of the slit. In the top view, the eyes sit on the outer edges of a narrow muzzle and bulge.

Follow-up work:
- seat the cat eye flusher and more frontally;
- remove the dark wedge inside the iris;
- push the iris toward green-gold;
- re-judge at normal size with at least two dedicated Luna runs, and count it as a pass only if both pass.

## Deferred (Luna FAIL at merge time)

- **cat-owl-bird:** the facial disc fails dedicated runs r38-r44 and r49: "broken into angular brow and cheek patches", "eyes protrude", "beak crowds the inner eye edges". The beak crowding comes from head geometry (buildHead).
- **odd-owl-rhino:** fails r48. The eyes are tiny dark dots on a dark coat.
- **odd-cat-centipede:** fails r48, r50 and r51. The eyes are too small and hidden by the head and antennae.
- **eye-cat-juvenile:** the A/B run r51 passes it, but the standalone run r50 fails it. Not a clean pass.
- **cat-raptor-bird:** fails r45. The eyes are too lateral and there is no brow shelf.
- **cat-gecko-lizard:** fails r46. The eyes and slit are too small at normal size.
- **cat-cephalopod-ape:** fails r47. The W pupil is unclear at normal size.
- **cat-crocodile-sprawler:** fails r46 because of a head crest artefact. This is not eye code.
- **Carried over:** worm eyespot legibility (EC3's merged-tree worm sheet failed 2 of 2), compound eyes, spider eyes, stalk eyes, chameleon/gecko legibility, dark coats, and the W pupil.
