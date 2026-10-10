# Opus 5.5: forslag til planet-optimering

Bestilt af brugeren 2026-10-10. Reviewet blev leveret af Claude Opus 5.5
(`claude-opus-5-5`) via den installerede Claude Code-klient med værktøjer,
plugins og skriveadgang slået fra. Kode og konkrete målinger blev sendt som
en afgrænset tekstpakke. Svaret er rådgivning, ikke verificerede besparelser.
Rå prompt, modelmetadata og svar er bevaret under
`Assets/_assetctl/opus-planet-review-20261010/`.

## Koordinatorens kontrol og prioritering

1. **Shader-opvarmning:** Først udvides den eksisterende
   `ShadowProgramWarmup` til de faktisk manglende sky-/scene-capture-varianter.
   Der findes allerede `compileAsync` til skygger. At slå shader-fejlkontrol
   fra er ikke i sig selv bevis for, at shader-kompileringen er fjernet;
   den kolde forsinkelse skal måles og shader-fejl stadig opdages i QA.
2. **Dynamiske skygger:** Mål signaturtid og invalidation under bevægelse.
   Afprøv derefter en adskillelse af statiske terræn-/skovskygger fra nære
   dyreskygger. Pixelændringer og mindre kasterafstand kræver billedkontrol;
   forslagene er ikke implementeret af dette review.
3. **Palette-streaming:** Afprøv ring-buffer mod nuværende teksturopdatering
   i 128-dyrs scenen. Den nye skinned-LOD-sti forbedrer medianen, men dens
   moving GPU-p95 er dårligere. En upload-hazard er en hypotese, ikke en
   konstateret årsag. Test separat uden upload, med tvungen upload og med ring.
4. **LOD-kvalitet:** Fødder, led og pelsmærker skal have selvstændige kriterier.
   Rest-galleriet viser, at 500-trekant-LOD kan gøre fødder spidse og udvaske
   vertexfarvebaseret pels, også selv om de bevarede attributbytes er identiske.
   Undersøg tekstur-/procedural pelsadskillelse og vægtet bevarelse af led.
5. **Worker og hukommelse:** Prioriter synligt arbejde, afbryd forældede jobs,
   og mål byte-/tidsbudget ved adoption. Reservér samlet RAM/GPU-plads for
   eksisterende fallback, flora, near-skins og nye LOD-puljer; 16 MiB er ikke
   automatisk til rådighed for en ekstra pulje.

Forbehold ved enkelte Opus-påstande:

- Færre draws og færre trekanter blev ændret sammen i GPU-forsøget. Påstanden
  om, at hele gevinsten skyldes trekantreduktion, er ikke isoleret eksperimentelt.
- Skærmbaseret terrænrefinement, geomorph og flere hysterese-mekanismer findes
  allerede. De skal profileres og forbedres konkret, ikke genimplementeres.
- Den foreslåede fejl med shader-uniforms i shadow-cachen er ikke konstateret.
  Main bruger Three's material-properties uniformopslag, og cachen registrerer
  teksturidentitet/version. Et rigtigt moving/paused skyggetestforløb kræves
  før integration af den nye batch.
- Biomtint er allerede en del af overfladen. Far vegetation må kun repræsentere
  eksisterende dateret habitat/population, ikke opfinde liv med grøn maling.
- Quest-påstande og talbesparelser er hypoteser, indtil målt på fysisk enhed.

## Uændret originalt Opus-svar

# Uafhængig performance-review: procedurale planeter

*Kun læst; intet er kørt. Påstande markeret **[H]** er umålte hypoteser.*

## 1) Diagnose og afvejninger

**Hovedpointe:** Gevinsten i den 500-tri flettede prototype kommer fra trekantreduktionen (886 794 → 256 002), ikke fra færre draws (5 → 2). Fem draws er ikke en flaskehals. Prototypen betaler 26,75 MB ved 512 aktører og har en ny GPU-hale (p95 1,013 → 3,015 ms). Det er sandsynligvis for høj en pris for en gevinst, der kan opnås billigere.

**Mulige falske besparelser:**
- **Fletning for draw-count:** Se ovenfor.
- **Shadow-cachen under bevægelse.** `ShadowMapCache.canSkip` bygger hver frame en signatur af hele scenen, og `contentGeneration` sammenligner instansbuffere element for element. Så snart ét dyr i skyggefrustummet bevæger sig, misser hele kortet. Terræn, skov og sten genrenderes så på grund af dyrene, og signaturen er betalt forgæves. **[H]** Det kan forklare forskellen mellem moving og paused GPU-tid.
- **Mulig korrekthedsfejl, bør verificeres:** Batch'ens `faunaBones` injiceres i `onBeforeCompile`. Hvis `uniformsOf(custom)` ikke returnerer shader-uniforms, skubbes `-5`, og palette-ændringer indgår ikke i signaturen. Det giver risiko for falske cache-hits med forældede skygger. I praksis redder `frustumCulled=false` + `castShadow` det næppe, fordi geometri og matrix er konstante.
- **Fallback-trekanter:** 886 794 trekanter for 512 primitiv-dyr er cirka 1 730 per dyr for fire primitiver. **[H]** Tesselationen er ens på alle afstande. Det er billig gevinst uden nye assets.
- **Global 200-tri eller fuld 512-IK:** Allerede korrekt afvist.

**Warm-tal:** Frame p95 17,87 ms mod CPU p95 3,5 ms og GPU p95 5,1 ms tyder på vsync-pacing eller missede præsentationsvinduer, ikke beregningsmætning. Mål `rAF`-delta mod `performance.now()` i submit og præsentation, før der optimeres på det grundlag.

## 2) Prioriteret tabel (8)

**Små ændringer**

| # | Ændring | Kodeområde | Visuel gevinst | CPU/GPU/hukommelse [H] | Risiko | Falsificerbar måling |
|---|---|---|---|---|---|---|
| S1 | `renderer.debug.checkShaderErrors=false` i prod plus `compileAsync` (KHR_parallel_shader_compile) af sky-, sky-capture- og life-materialer under indflyvning (`forestPrepareAltitudeM`) | clouds/renderer-init | Fjerner ~1,7 s stall | CPU-stall ↓, 0 bytes | Lav; fejl-logs mistes i prod | Længste long-task ved kold planetvisning; antal programmer linket efter første synlige frame = 0 |
| S2 | Afstandsniveauer for fallback-primitivernes segmenter (2–3 tesselationer, bucket per skærmstørrelse) | fauna fallback-batches | Silhuet bevares; ingen pop ved fælles fade | Vertex/shadow ↓, +få KB | Lav | Trekanter og GPU-pass p95; silhuet-IoU ≥ fastsat tærskel ved 60/100/150 m |
| S3 | Dynamiske skyggekastere adskilt: dyr i eget lag; statisk kort cached; dyr > N m kaster ingen shadow-map-skygge | `shadow-map-cache.ts`, `drawFauna` | Stabile skygger; synligt tab af fjerne dyreskygger skal accepteres eksplicit | GPU shadow ↓ under bevægelse | Mellem | `stats.hits/misses` og `lastReason` under bevægelse; GPU shadow-pass p95 |
| S4 | Palette-upload: dirty-rækkeinterval plus ring af 2–3 teksturer | `FaunaSkinnedBatch.endFrame` | Ingen | Upload ↓; **[H]** hale ↓; +2× palette (~190 KB ved 128) | Lav | GPU p95 med og uden ring; `paletteUploadBytes` |
| S5 | Afstandsbaseret, slot-hash-forskudt pose-kadence (fx 1/2 ved 60–95 m) | `FaunaLodPoseWriter.write` (cache findes) | Risiko for hak | CPU og upload ↓ | Lav–mellem | CPU ms; blind A/B af ryk ved 60–95 m |

**Arkitektoniske ændringer**

| # | Ændring | Kodeområde | Visuel gevinst | CPU/GPU/hukommelse [H] | Risiko | Måling |
|---|---|---|---|---|---|---|
| A1 | Kompakt vertexformat: Int16-positioner med per-genom skala i root-meta `w`, oct-normaler, `gl_VertexID/maxVerts` i stedet for `faunaActor`, ingen CPU-atlasspejling | `fauna-skinned-batch.ts` | Ingen, hvis præcision holder | 37 → ~20–24 B/vertex; vigtigst på Quest (båndbredde) | Mellem | Max positionsafvigelse < 0,1 mm; bytes; GPU p95 |
| A2 | Indholdsadresseret geometricache: hash af producerede arrays; senere persistent worker-cache nøglet på genom-digest + LOD-version | worker/LOD-adapter | Mindre pop-in ved genbesøg | Kold 119–266 ms/genom → læsning | Mellem | Unikke nøgler / synlige dyr; byte-ens output |
| A3 | GPU-palettepass: aktør-skalarer (phase, locomotion, breath, head, tail, lift) og statiske rest-offsets → render-to-texture af paletten | ny pass + `fauna-lod-pose.ts` | Ingen, hvis paritet holder | CPU ~0, upload ~32 B/aktør | Høj | Palette-diff mod CPU-writer ≤ ε; CPU og GPU ms |

## 3) Top 3 eksperimenter

**E1: Shader-prewarm (S1). Ingen assets.**
1. Instrumentér `renderer.info.programs.length` og long-tasks.
2. Slå `checkShaderErrors` fra bag et build-flag.
3. Kør `renderer.compileAsync(scene, camera)` for sky-capture-scenen og life-materialerne, når højden krydser `forestPrepareAltitudeM`. Inkludér begge `RENDER_QUALITY`-profiler, hvis de giver forskellige defines.
4. Revidér `customProgramCacheKey` for variant-eksplosion.

*Accept:* Pixel-identiske frames i warm-test, fordi kun timingen ændres. Kold stall reduceret målbart på RTX og et svagere GPU-mål. Ingen programmer kompileret efter første frame.
*Rollback:* Flaget.

**E2: Skyggesplit (S3).**
1. Log `lastReason` og `lastChange.object` per frame under bevægelse. Korrelér hale-frames med misses.
2. Læg fauna på et separat lag, der ekskluderes fra den cachede kaskade.
3. Desktop: tegn dyr i et lille dynamisk shadow-map omkring nære dyr.
4. Quest: undgå at kopiere statisk dybde ind i et arbejdskort. Load/store er dyrt på tile-GPU'er; brug et separat kort eller kontaktskygge.

*Accept:* Hit-rate stiger under bevægelse. Skygger fra terræn og skov er pixel-identiske. Ændringen for dyr er dokumenteret med screenshots. Fauna-digest-testene (`tests/life-cpu-digest.test.mjs`) er uændrede.

**E3: Diagnose af halen i 128-casen (S4 + korrelation).** Kør fire varianter:
- (a) Tving upload med uændrede data.
- (b) Lad være med at uploade.
- (c) Ring på 3 teksturer.
- (d) Log `geometryUploads` per frame.

`prepareAnimal` laver `bufferSubData` med flere ranges på buffere, der er i brug. **[H]** Det er lige så sandsynligt som palette-uploadet som årsag til ANGLE/D3D11-renaming eller stall.

*Accept:* p95 ≤ nuværende kropssti på samme maskine. Ellers forbliver prototypen opt-in.

## 4) Kritik af body-derived LOD

- **Hukommelse:** Ved 128/500/1500 giver formlen cirka 2×(2,75 + 0,19) MB + 3,0 MB cache ≈ 8,9 MB. Det er over halvdelen af en 16 MiB life-reserve, som også skal dække fallback (2,81 MB) og flora. Atlas-CPU-kopien duplikerer cache-records for aktive slots.
  - Behold kun cache for frigivne-men-genbrugelige nøgler.
  - Upload fra record via et lille staging-buffer.
  - Kombinér med A1 og `gl_VertexID`. Det fjerner `faunaActor` og `fill` og reducerer `estimatedBufferBytes` uden at ændre geometrien.
- **Fænotype-genbrug:** Nøglen `JSON.stringify(genome)` er korrekt, men giver **[H]** næsten intet genbrug. Mål unikke nøgler blandt synlige dyr; er de ≈ antal dyr, er cachen blot en kopi.
  - Indholdshash (A2) er eksakt per konstruktion.
  - En input-delmængde må kun bruges, hvis en test beviser byte-ens output på tværs af hele genomrummet.
  - Type-navn er udelukket.
  - `registerGeometry` laver `JSON.stringify(plan)` og fuld array-sammenligning på main thread. Flyt det eller hash det.
- **Moving GPU-hale:** Se E3. Fejlkilderne er i rækkefølge: upload-synkronisering, geometriuploads, shadow-misses, timer-støj. Gentag med disjoint-timer per pass.
- **Palette:**
  - Affine 3×4 (3 texels per knogle) sparer 25 % fetch og upload.
  - RGBA16F er risikabelt for translationer. Mål afvigelse og pas på frosne pins (kun præsentation).
  - Delvise rækkeopdateringer hjælper kun paused/delvis bevægelse. Når alle bevæger sig, er alle rækker dirty.
  - Three r181's `texture.updateRanges`-understøttelse for DataTexture skal verificeres; antag den ikke.
  - UBO er udelukket: 128×22×64 B overstiger typiske grænser.
- **Kvantisering og poolede klip:** Gangcyklus kan bages per genom (fx 32 faser × 22 × 48 B ≈ 34 KB). Breath, head og tail er ikke periodisk koblet og skal derfor være additive. Ved 128 genomer er det ~4,3 MB, så kun med budgetkonto. Fasesnap kan give fodglidning; mål toe-drift mod root-travel.
- **Clustered/meshlet-alternativer:** WebGL2 mangler multi-draw-indirect, så cluster-culling bliver CPU-drevet. **[H]** Det giver næppe gevinst ved 256k trekanter. Nedprioritér.

## 5) Terræn, vegetation, skyer og skygger

- **Terræn:**
  - Split-kriterium som skærmfejl i pixels (`pixels`-faktoren findes allerede i `update`) med separat split/merge-tærskel. Pressure-hysteresen .94/.90 er god; brug samme mønster på fejlen.
  - Geomorph i vertexshaderen over 0,5–1 s fjerner pop uden ekstra bytes.
  - Clipmaps er ikke anbefalet: det er et stort skift, og quadtree plus budget fungerer.
- **Workers:**
  - Prioritér efter skærmfejl × frustum-synlighed.
  - Annullér jobs, hvis nøgle forlader `wanted`, før resultatet overføres.
  - `inbox.splice(0,2)` bør være byte- og tidsbudgetteret frem for et fast antal.
- **Skov:**
  - Mål overdraw med en heatmap før indgreb.
  - Alpha-to-coverage med MSAA på desktop.
  - Quest: alpha-test med tidlig depth-prepass kun for canopy, fordi tile-GPU'er straffer `discard`.
  - Impostorer kun per art, hvis morfologi er art-deterministisk; ellers ville de slette fænotype. Atlas-hukommelse skal konteres.
- **Flora:** 195/102 planter ved 55–120 m er tyndt. Et terrænshader-tint fra den eksisterende biomvægt kan dække hullet visuelt uden ny population. Mål det med A/B-screenshots.
- **Skygger:**
  - Kasterafstand per lag: græs aldrig, flora < 40 m, dyr som S3.
  - Fjern kaskade med lav kadens (hver N. frame, forskudt), når solretningen ændres langsomt.
  - Mål signaturomkostningen i ms mod hit-rate. Deaktivér cachen automatisk efter en miss-serie.
- **Quest:** Prioritér båndbredde (A1, S3 uden dybdekopi, ingen fuld-palette-upload) over draw-count. 256 MiB-målet bør revalideres separat; alle tal her er desktop-beskrivende.