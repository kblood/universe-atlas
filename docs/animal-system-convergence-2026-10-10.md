# Dyresystem: status og samling

Aktuel implementering: Kit 0.3.0 (`8aecf22`) ejer planeternes genomer,
udseende, kropsbygger og bevægelse. Atlas bruger det byggede, versionslåste
bibliotek via `#creature-kit/planet`; en opdateringskommando opdaterer både
bibliotek og den selvstændige Lab med hashes og rollback.

Atlas Lab åbner nu den samme kanoniske kropsbygger og fælles Kit-inspector.
En eksporteret dyredefinition kan åbnes i `animal-lab/planet-skin.html` uden
at ændre genom eller identitet. Tidligere modes og hjorten er eksplicitte
referencer; composer er fortsat eksperimentel. Dette er én fælles nuværende
planet-/inspektionsvej, ikke en påstand om, at alle historiske generatorer er
fjernet. [Pakke, opdatering og kontrol](creature-kit-planet-package-2026-10-10.md).

Den faktiske browserkontrol bevarer 205/406 dyr på Daunune/Anitar, 18 byggede
kropshashes og positurer. Lab-definitioner kan eksporteres og importeres
uændret. LOD-forsøgene nedenfor er fortsat kandidater; flere nåede budgetterne,
men mistede silhuet eller pelsdetaljer. Ingen af disse resultater alene
godkender et skift af planeternes standardrenderer.

## Oprindelig status og migrationskontrakt

Status læst på Atlas `f96a8c1`, 10. oktober 2026. Dette var næste
implementeringskontrakt til review; systemerne er **ikke allerede samlet**.
Brugerens ønske er ét dyresystem, et selvstændigt kit og Lab, presets som
data/reference frem for særskilte dyrefabrikker, og LOD fra det samme dyr.

## Hvad findes faktisk?

| Del | Status og grænse |
|---|---|
| Planeternes dyr | `src/biosphere-model.ts` → `creature-model.ts` → `fauna-runtime.ts`: eksisterende artsgenomer, afstamning, individuelle variationer og dateret aktivitet. `fauna-body-plan.ts`/`fauna-locomotion.ts` bygger og bevæger det sammenhængende quadruped-legeme. |
| Planeternes visning | `planet-renderer.ts` bruger `fauna-near-rig.ts` og `fauna-field-renderer.ts`. Nærskin, instancer og LOD er repræsentationer af samme medlem, ikke nye biologiske generatorer. Loaded-body LOD er fortsat opt-in prototype. |
| Atlas Animal/Creature Lab | `creature-lab.html` og `src/creature-lab.ts` er en egen side, men stadig Atlas-koblet. Standard er Gallery; Gallery/Anatomy/Arena bruger den ældre `createCreatureRig`. Planet skin bruger `fauna-skin-inspector.ts`, som inspicerer den faktiske produktionsrig. Composer er en anden tilstand. |
| Selvstændigt creature-kit | `C:/LLM/IWSDK/creature-kit` har både bibliotek og `apps/creature-lab/`. Appen findes **nu**, men er composer-only; planettilstandene er ikke flyttet. `ComposerRecipe`/`createComposerCreature` er ikke den generator, planeternes `CreatureGenome` bruger. |
| Kit-forbrug i Atlas | SHA-pinnede kildefiler på deres eksisterende `src/fauna-composer*`/`fauna-coat*`-stier. `scripts/sync-creature-kit.mjs` og `vendor/creature-kit/VENDOR.json` håndhæver ejerskabet. Der er endnu ikke én samlet runtime-importgrænse for alle dyr. Coat-hjælpere deles allerede. |
| Hjorte-reference | `fauna-template*.ts` og `public/assets/fauna/deer-doe-v1/` findes stadig. Atlas Lab tilbyder Blender reference med morf-sliders; planet-rendereren loader ikke denne hjort som produktionsdyr. GLB, revisioner og provenance skal bevares. Hjorte-navne i økologiske roller er ikke en særskilt hjorte-meshfabrik. |

Det korte svar er derfor: **ja, der findes et separat kit og en selvstændig
Lab-app; nej, hele dyresystemet er endnu ikke trukket ud eller samlet**.
Man kan arbejde separat på composer i kittet og synkronisere det til Atlas.
Ændringer dér ændrer ikke automatisk planeternes anatomiske generator.
Ældre art/reference-tilstande er heller ikke fjernet.

Aktuel verifikation fra koordinatoren: kit-Lab/boundary/paritet 60/60;
Atlas composer-boundary 3/3; vendor-check mod den faktiske kit-checkout 3/3.
Det beviser de eksisterende grænser, ikke fuld runtime-udtrækning.
`docs/creature-kit-consumption.md` beskriver dele af Lab-flytningen som fremtid;
det skal læses sammen med kittets nyere README og eksisterende `apps/`.

## Konkret plan mod ét system

1. **Fast grænse og fælles data.** Atlas beholder katalog, arts-/individ-ID,
   afstamning, population, habitat, præcis dato, rute og jordkontakter. Kittet
   skal eje én fælles anatomisk generator, rig, udseende og body/LOD-resultat;
   både Lab og spil bliver forbrugere. Gamle Lab-prototyper og hjorten mærkes
   som reference/arkiv. En facade over to generatorer tæller ikke som samling.

2. **Versionsstyret adapter først.** Kortlæg eksisterende `CreatureGenome`
   til kittets fælles dyredefinition: mål i meter, ben-/fodtype, torso/hals/hoved,
   ørerne/hornene/trunken/vingerne, coat/paletter, køn, vækst og individvariation.
   Brug eksisterende artsgenom og identitet; vælg ikke et hjorte/giraffe-preset
   og rul et nyt dyr. `ComposerRecipe` har en anden betydning/parameterisering,
   så adapteren kræver mål- og udseendeparitet. Planet-generatoren forbliver
   produktionssandheden, indtil det er bevist. Bevar gamle links; ingen stille
   genome-rekey. Tilsigtet drift kræver versionsvalg og gammel→ny ledger.

3. **Rig- og udseendegates før skift.** Samme arter/individer/datoer skal
   bevare population, afstamning og aktivitet. Test alle kropsfamilier, voksne/
   unger, stå/gå/føde, fodkontakt og terræn samt source/skin/eksport-paritet.
   Accepter ikke kun torsoens gennemsnitsfejl: fødder/ankler, primære appendager,
   coat-mærker og ansigt skal kunne læses i samme-pose browserbilleder. Nuværende
   source har tynde runner-ben; QEM 500 skærper fødder/spidser, og 1500/500
   udvisker vertexfarvede coat-mærker trods bevarede bytes. Det er reelle åbne
   fidelitetsgrænser, ikke allerede bestået kvalitet.

4. **Samme loaded body til alle afstande.** Afled LOD fra det allerede byggede
   dyr, med samme identitet, rig og udseende; ingen anden fjern-genotype.
   Worker-job skal klone source, bevare originalbuffers og serialisere kolde
   jobs. Cache efter source/genome/geometry-identitet, ikke kun artsnavn.
   Budgetter, silhouette og coat/joint-gates bestemmer gyldige niveauer;
   utilstrækkelig eller ikke nået LOD afvises. 200 trekanter er ikke universelt
   acceptabelt. Mål samlet browser/GPU/CPU og hukommelse mod den aktuelle
   instanced fallback før rollout; færre trekanter alene er ikke en sejr.

Når disse gates består, flyttes fælles authoring/inspektion til kit-Lab og
Atlas forbruger den samme kerne. Presets bliver navngivne parameterdata og
referenceeksempler. Gamle factories kan først pensioneres efter en dokumenteret
kompatibilitets-/migrationsplan; kildeassets og provenance slettes ikke.
