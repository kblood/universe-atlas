# Ejerark 2026-10-07 (kun Kasper kan afgoere)

Samlet af lane L6 kun ud fra eksisterende dokumenter; intet er maalt eller koert paany. Intet her er afgjort, foer du siger det. Svar `default` paa et punkt for at tage anbefalingen (lukker kun punktet hvis du siger det udtrykkeligt). `Opus-afgjort` = Opus 5.5 paa din instruks, kan overstyres. Stier er relative til `universe-atlas/` (`docs/...`); `H` = `docs/mountains-handoff-2026-10-06.md`, `P` = `docs/parallel-development-plan-2026-10-07.md`, `O` = `docs/owner-decisions-2026-10-04.md`.

**Foer det stille vindue (GATE-1, ca. 67 min):** start ingen GPU- eller asset-jobs (ComfyUI, Pixal3D/TRELLIS, Blender), ingen andre IWSDK-tests; de tager ikke Atlas-sloten, men forstyrrer tidsmaalingen og kan give TDR-genstart (P, kritikerpunkt).

## 1. Bjerge og T6 (blokerer at L2-terraenarbejdet kobles paa)

| # | Spoergsmaal | Valg | Konsekvens | Anbefaling | Evidens |
|---|---|---|---|---|---|
| 1 | T6 (`aa3a2c7`) er flettet uverificeret. Behold eller rul tilbage, hvis GATE-1 fejler? | (a) behold og ret fremad; (b) `git revert -m 1 aa3a2c7` | Lethuris orbit har mindst margin: CI oevre 4,98 % mod budget 5 %. Rul tilbage fjerner bjergene i appen og flytter versioner/cache-noegler igen | Ingen i kilderne; afgoer efter GATE-1 | H s.0, s.3.1; P "Kasper decisions" 1 |
| 2 | A3 (bjerg-udgave): skal massiv-flisernes farve-/klasse-celler BLOKERE (strikse maal efter relief)? | (a) kun rapport, loftskortet SHIPPED_CEILINGS er gaten, strikse maal er mal (nu); (b) blokerende; (c) afskaf strikse maal | (b) kraever designaendring i LOD-klasser; i dag overskrider Maithea/Lethuris (rgbP99 175,6 og 261,4 mod 12) | (a) (O, A3 standard) | H s.3.3, s.5.1; O A3; `docs/mountains-opus-decisions-2026-10-05.md` Q6 |
| 3 | Genaabn M0 (MTN-1 er lukket "NOT MET"; genaabnings-udloeseren er opfyldt)? | (a) lad lukket; (b) genaabn | (b) betyder sandsynligvis `lod-ladder-4`, ny terraenversion og ny golden-pin. Bedste estimator 0,924 mod krav 0,9 efter 3 runder | Ingen ny; Opus lukkede (Q1) | H s.5.2, s.7; `m0c` -> `docs/evidence/2026-10-07/m0c/` |
| 4 | Oevre graense U1/U2 (Q-B): behold U1 eksakt + U2 maalte UP_ROOM-pins? | (a) behold (nu); (b) loft i stedet | (b) tager `lod-ladder-4` | (a) (Opus-afgjort) | H s.5.3, s.6 |
| 5 | Raiva R1 paa friske frø: 7,72 < 8. Accepter? | (a) accepter (ikke blokker); (b) kraev M2/M3-aendring | (b) er et nyt terraenidentitets-skridt (bump + re-pin) | (a) (Opus-afgjort); ejer-svar mangler | H s.3.3, s.5.5 |
| 6 | Maithea 6 x L0 koldt 1,28 x main (engangs-feltbygning). Accepter? | (a) accepter; (b) kraev hurtigere | Med forudbygget felt 1,002-1,097 | (a) (Opus-afgjort) | H s.3.3, s.5.6 |
| 7 | Aabne bjerg-detaljer: Q3 retention-reference, Q4 gamle aase uden for bælter (standard: behold), 48 km-loft og parallelle kæder over brede bælter (kraever flyttede klasse-pins), M3 lige hovedvandskel (crest-wander ikke valgt), MTN-7 labels, rigtig DEM-download | pr. punkt: behold standard / aendr | Alle kraever pin-/identitets-aendringer eller download (kun efter din tilladelse) | Q4: behold; resten ingen | H s.5.7; `docs/mountains-opus-decisions-2026-10-05.md` Q3, Q4, Q6 |
| 8 | Landing: afskaering (option a implementeret) og **A6** landing uden top, **A7** oversvoemmet jordbogmærke | A6: (1) behold formel + afvis toppe; (2) p99-loft; (3) accepter toppe. A7: (1) svæv over vandet med besked; (2) flyt til naermeste kyst; (3) nuvaerende fallback | Opgave 4 laver (1) bag en navngiven konstant indtil du svarer | A6 (1); A7 (1) | H s.5.4; O A6, A7 |
| 9 | Kun du: headset/Quest-test og quiet-host frametid af den paakoblede bygning | koer / udskyd | Ingen headset- eller rolig-vaert-maaling findes; alle omkostningstal er Node paa travl vaert | - | H s.5.8-9, s.11 |

## 2. Test, gate og infrastruktur

| # | Spoergsmaal | Valg | Konsekvens | Anbefaling | Evidens |
|---|---|---|---|---|---|
| 10 | **F4:** flyt 78-105 s inline-prefilter-testen til `fullOnly` | ja / nej | Aendrer almindelig `npm test`: ca. 55-65 s hurtigere (ca. 55 %), men testen kører kun i `test:full` | Ingen ejer-svar; auditten foreslaar en lille variant (1 raster + 1000 retninger) | P "Kasper decisions" 3; `docs/handoff-2026-10-06/test-time-audit.md` F4 |
| 11 | **F1/F2:** forkortet fair-protokol (kraever ny underskrevet praa-registrering) | ja / nej | F1 sparer ca. 30-40 min, F2 ca. 20-25 min pr. koersel; uden svar koerer den fulde 67 min | - | P 4; test-time-audit F1, F2 |
| 12 | Smoke-tier renderer-scenarier: lave mindre scenarier med egne pins for budget-starvation, leaf-loop-digest, water-refresh? | ja (nye pins) / nej | Smoke gaar fra ca. 90 s mod designets 45 s; scenarierne ER det de tester, saa det kraever nye pins (ejerafgoerelse) | - | `docs/test-tiers-2026-10-07.md` s.2, s.5.1 |
| 13 | Valgfrit: proev iGPU som anden browser-bane; flyt test-registret ud af `package.json` | proev / nej; registret: kan gaa til Opus ("Opus-afgjort paa Kaspers instruks") | iGPU er uverificeret og kan give genstart | Registret: Opus | P 6 |

## 3. Projekt, licens og migration

| # | Spoergsmaal | Valg | Konsekvens | Anbefaling | Evidens |
|---|---|---|---|---|---|
| 14 | **A13** projektlicens | privat/ulicenseret (`NOASSERTION`); MIT kode + CC0 skabninger; anden | Oplaases cloud-kodebaner og creature-kit-opdeling; sidecars forbliver `NOASSERTION` | Privat/ulicenseret nu | O A13; `docs/creature-kit-extraction-plan-2026-10-04.md` Q3 |
| 15 | **A14** upload / GitHub-Pi-migration | godkend / ikke godkendt | Intet push, remote-aendring, issues eller upload uden dit ja (AGENTS.md) | Ikke godkendt | O A14; `docs/agent-collaboration-proposal-2026-10-03.md` |
| 16 | **A18** creature-kit Q1-Q7 (omfang, planetfauna-skifte, licens, ens mesh paa tvaers af motorer, forbrugere, placering, pakkenavn/kompatibilitet) | standard for hver | Standardvaerdierne bruges kun for at kunne arbejde; Q6 (egen repo) strider delvist mod dit "ét committet repo" (2026-10-02) | De syv standarder i O A18 | O A18; `docs/creature-kit-extraction-plan-2026-10-04.md` |

## 4. Visuel og biom (A4, A5, A8 blokerer visuelle baner; A15-A17 blokerer BIOME2)

| # | Spoergsmaal | Valg | Konsekvens | Anbefaling | Evidens |
|---|---|---|---|---|---|
| 17 | **A1** Lethuris L6 `name`-loft 6,9 -> 7,0 % | (1) accepter som dokumenteret undtagelse; (2) retun til 6,9 (ny terraenversion + golden); (3) ny raekke efter maaling | Testen baerer 7,0 og skal staa "afventer ejer" | (1) | O A1; `docs/terrain-relief-v1.md` s.8 |
| 18 | **A2** reduceret havbunds-detalje | (1) kun tint/taage/kaustik; (2) mere geometri; (3) tekstur-lag | (2) koster trekanter og roerer LOD-stigen | (1), vurder med Luna | O A2 |
| 19 | **A4** svag sne paa bjerge (D1) | (1) sne-gren i `ground-material.ts`; (2) hældning/eksponering i klasse+farve; (3) tone-mapping | Hver sin versionsbump; opgave 11 kan ikke bestaa "polaromraader laeses som sne" uden renderer-aendring | (1), saa (3) | O A4 |
| 20 | **A5** horisont paa Raiva/Selawyn/Lethuris (D2) | (1) sol-bevidst re-posering; (2) ogsaa terraenaendring | (2) flytter golden-terraen | (1) | O A5 |
| 21 | **A8** skydaek over p99-land | (1) skytop over p99; (2) tyndere/valgfri; (3) skjul ved capture | Uden svar fejler bjerg-frames Luna | (1) | O A8 |
| 22 | **A9** skygge `normalBiasM` .30 | behold / .06 / mellemvaerdi | Fjernede skyggebaand paa sne | Behold .30 | O A9 |
| 23 | **A10** WP6 RMSE-fritagelse (`613e292`) | bekraeft / rul tilbage `613e292` + `d0a9267` | Low-slung 5,34 % og long-neck 5,77 % under 6 % | Bekraeft | O A10 |
| 24 | **A12** geofysik-g mod katalogets `massKg` | (1) behold opdelingen; (2) forlig masser | (2) aendrer maaner, kredsløb, bogmaerker, golden `systems` | (1) | O A12 |
| 25 | **A15** harness-site SITE_A (P6-flytning) | bekraeft / afvis | Svaret er ikke optaget | Bekraeft | O A15 |
| 26 | **A16** dagslaengder (3 timer-200 dage) | behold bælter fast denne runde / gentegn nu | Spin kan ikke bruges til vindbaelter | Behold fast | O A16 |
| 27 | **A17** liv paa tør planet med luft | ja som egen versionsaendring / nej | Nye biom-versioner | Ja, egen ændring | O A17 |

Afgjort tidligere (ikke her): A11 (EC4 +800, 2026-10-04) og punkterne i `O` sektion B.

## 5. Bevis, hvis noget skal efterproeves

Alt ignoreret bevis (T6-fair kørsel afbrudt ved i=19, Luna-ark, route A/margin, M0-v3) er indekseret med sha256 i `docs/evidence-index-2026-10-07.md` og `docs/evidence/2026-10-07/manifest.tsv`; Luna-capture-værktøjet ligger sporet i `scripts/luna-capture/`. Foer worktrees fjernes: `cmd /c rmdir <wt>\node_modules`, aldrig `--force`; `m0c` kan fjernes, naar denne gren er flettet.
