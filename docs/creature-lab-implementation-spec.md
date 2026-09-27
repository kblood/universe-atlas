# Creature Lab implementation contract

## Planetary rendering follow-on — 2026-09-28

The [desktop realism plan](desktop-realism-implementation-plan-2026-09-27.md)
adds a future continuous rigged animal compatible with these genomes and their
proportions. It preserves the existing date/identity contract and will evaluate
bounded paths and foot contact in the main game. This lab remains a separate
implementation; the current planetary renderer still uses four primitive
instance batches. Blender rigs and richer planetary animation remain planned.

Implement the researched diversity gallery, anatomical inspection and walk/run
arena as `creature-lab.html`, linked from Biosphere Lab and the main World Labs
entry. Reuse `generateBiosphere(seed, profile)` and its dated species identities.
This is a bounded kinematic quadruped experiment, not physics-trained animals,
planetary fauna or a scientific evolution simulator. All assets are runtime
procedural TypeScript geometry; no external art/model downloads.

## Data boundary (data agent)

Own `src/creature-model.ts` and `src/biosphere-model.ts`.
Add optional `creature: CreatureGenome` to Species. Generate four quadruped
lineages with three relatives each, alongside the existing 12 plant species.
Use clade-scoped IDs and correlated inherited changes, preserve food/existence
rules, and bump biosphere version because output changes. Animal reference-date
corpus: 12 specimens across browser, runner, low-slung and long-neck archetypes.
Do not create arbitrary extra limbs in this increment. Animal founder/descendant
relationships and genome deltas must be visible and structurally meaningful.

```ts
export type CreatureArchetype = 'browser'|'runner'|'low-slung'|'long-neck';
export interface CreatureGenome {
  version:string; archetype:CreatureArchetype;
  torsoLength:number; torsoHeight:number; torsoWidth:number;
  legLength:number; upperLegFraction:number; stanceWidth:number;
  neckLength:number; neckRise:number; headLength:number; headWidth:number;
  tailLength:number; footLength:number; footWidth:number;
  hornLength:number; earLength:number; armor:number;
  color:string; accentColor:string; pattern:'plain'|'stripes'|'spots';
  walkSpeed:number; runSpeed:number; strideLength:number;
  mutationLog:string[];
}
export function generateCreatureGenome(seed:string, archetype:CreatureArchetype,
  parent?:CreatureGenome):CreatureGenome;
export function individualCreatureGenome(genome:CreatureGenome,id:string,
  variant:number,stage?:'adult'|'juvenile'):CreatureGenome;
export function validateCreatureGenome(genome:CreatureGenome):string[];
```

Dimensions in metres. `legLength` hip-to-floor in neutral stance; torso centre
height = legLength + torsoHeight*0.35. X forward, Y up, Z lateral. `stanceWidth`
is left/right foot separation. Upper/lower limbs must have reachable non-straight
rest stance; rig may use bone reach > neutral hip-floor distance. Geometry and
gait use the same genome. Individuals preserve the archetype; descendants alter
several correlated proportions and/or visible appendages within bounded grammar.

## Rig and motion boundary (motion agent)

Own `src/creature-rig.ts`, optionally `tests/creature-rig.test.mjs`.
Use rigid procedural body parts parented into an articulated group for the first
inspectable rig. It must move legs and feet, not translate a static mesh. State
explicitly that smooth skin deformation is later work. Mesh/material sharing
inside each rig and bounded geometry; dispose all owned resources.

```ts
import type {CreatureGenome} from './creature-model.ts';
import type {Group} from 'three';
export type CreatureGait = 'idle'|'walk'|'run';
export type TerrainKind = 'flat'|'slope'|'steps';
export function creatureTerrainHeight(x:number,z:number,terrain:TerrainKind):number;
export interface CreaturePoseDiagnostics {
  time:number; gait:CreatureGait; root:[number,number,number];
  feet:{id:string;position:[number,number,number];stance:boolean;target:[number,number,number]}[];
  maxPenetration:number; maxReachError:number; jointCount:number;
}
export interface CreatureRig {
  group:Group;
  update(time:number,gait:CreatureGait,terrain:TerrainKind):CreaturePoseDiagnostics;
  setSkeletonVisible(value:boolean):void;
  setNeutral(value:boolean):void;
  dispose():void;
}
export function createCreatureRig(genome:CreatureGenome):CreatureRig;
```

`update` is direct evaluation from absolute seconds, repeatable at A-B-A. Root
travels forward +X at declared speed; viewer positions the rig group as desired
and follows it in arena. Stance targets stay fixed in terrain coordinates, swing
arcs lift feet, analytic two-segment IK connects hip/knee/foot. Distinct walk/run
foot phases and duty factor. No persistent frame-integrated canonical state.
All diagnostic positions in rig-local scene coordinates before outer group
placement. Terrain height is shared by rendered terrain and solver, deterministic
and globally defined (slope gentle bounded ramp, steps low bounded stairs).
Skeleton overlay must reveal actual solved joints. Anatomically readable head,
eyes, ears, torso, appendages, feet; 4 archetypes clearly differ in neutral view.

## Viewer boundary (viewer agent)

Own `creature-lab.html`, `src/creature-lab.ts`, `src/creature-lab.css`.
Reuse biosphere seed/profile/date/species, select animal Species with creature.
Modes gallery, anatomy, arena, ancestry. Gallery shows 12 labelled species with
selection buttons; preserve common metre scale with optional normalized scale.
Anatomy shows selected rig, skeleton toggle, neutral material, individual variant
and juvenile/adult. Arena: idle/walk/run, play/pause/reset and scrub seconds,
flat/slope/steps, 1/8/16 crowd choices, follow camera. Ground geometry uses the
same height sampler and sufficient sample density to represent steps exactly.
Ancestry: follow every `parentId` from selected species to founder and render
the complete oldest-to-selected chain as side profiles, like an illustrated
evolutionary sequence. Label each figure with names, dates, trait deltas/mutation
log and archive status. This row is a selected path through the branching tree,
not an assertion that evolution always progresses toward humans or complexity.
Global date controls existence: pre-surface no creatures, early life no
macroscopic creatures. Archive comparisons must be labelled; arena only extant
species. Accept deep link `?seed=...&profile=...&species=...`.

Three orbit controls; reserve desktop sidebar space, usable narrow UI. Show
rigged actor count, renderer calls/triangles, frame CPU timing, and actual foot
penetration/reach errors. Export complete seed/world/selected genome/date,
motion settings and diagnostics. Read-only `window.__creatureLab` getters:
ready,error,world,dated,mode,selectedSpeciesId,time,gait,playing,terrain,actorCount,
poses,renderer (calls,triangles,memory),cpuMs. Do not update UI by replacing
focused inputs each frame. Dispose all old rigs/geometries/materials on changes.
Suggested IDs seed,profile,regenerate,mode,species,date-myr,gait,terrain,crowd,
play,reset,time,skeleton,neutral,variant,growth,normalize,export-json.

## Root acceptance and integration

Root owns tests for model and real browser actions, package/Vite/links/docs.
Check distinct silhouette/geometry across archetypes, inherited replay, no
unformed life, frame-order-independent poses, actual leg movement, foot slip
and reach on supported terrain. Record animated browser video/screenshots,
species gallery, walk/run phases, 16-agent load, regeneration resources and
narrow viewport. Review actual images before shipping. Existing biome and
biosphere tests must still pass after intentional version/count updates.
No claimed Quest budget until device tested. Publish docs with sources and
honest limits; deploy, verify live, commit and push after validation.

## Implemented scope and interpretation

The catalogue version changes to `biosphere-lab-2`. Each living-profile world
has 12 plant species and 12 quadruped species, distributed across four clades
with three generations each. The plant extinction fixture remains; the reference
date therefore has 23 extant species. Stable IDs include the generator version,
planet and clade. Profile-specific keys alter animal genomes; public seeds up
to 160 characters remain supported. Previous v1 IDs/digests intentionally differ.

Browser, runner, low-slung and long-neck are declared construction envelopes,
not biological predictions. Descendants inherit correlated proportions and
appendages, with a log of actual bounded changes. Juveniles scale anatomy and
stride together and reduce speed. The history remains a finite heuristic fixture;
natural selection, branching populations, inherited behavior and speciation
from an evolving ecology are not simulated by this increment.

The ancestry display follows the selected species' complete parent chain in
oldest-to-selected order. Figures are generated from those actual species,
including persistent ancestors, and carry names/dates. A parent-chain display
is one path through the stored history; no humanoid endpoint is assumed.
Archive display is separated from arena eligibility. Formation and early-life
queries exclude inappropriate creatures. Exact date conversion remains the
existing Myr-to-BigInt-nanoseconds contract.

Each articulated creature uses rigid ellipsoids, tapered limbs, a head, eyes,
ears, tail, and optional horns or plates. A deterministic 128-square coat texture
implements plain, stripe and spot patterns. Neutral view bypasses the coat.
These are procedural anatomy prototypes with visible joints, not smooth skinned
production animals. Meshes, coat textures and materials are disposed with rigs.

Motion evaluates from absolute lab seconds independently of the universal date.
Walk and run use different timing/contact policies, real articulated leg solves,
planted foot targets and terrain-aware support. Diagnostics read the solved
rendered joints and test sole support rather than reporting intended targets as
successful contacts. Terrain has flat, bounded-ramp and explicit stair fixtures.
Gaits remain kinematic: root travel is prescribed, not driven by simulated joint
torques. Turning/navigation, obstacle avoidance, behavioral AI, soft deformation,
physics balance, flying/swimming body plans and planetary agent integration are
not implemented. End-of-loop/reset is a lab replay operation, not a history event.

## Research and provenance

The implementation follows the [diversity and motion plan](creature-diversity-and-motion-plan-2026-09-14.md),
[anatomy sources](research-creature-anatomy-references-2026-09-14.md) and
[locomotion sources](research-creature-locomotion-references-2026-09-14.md).
Spore informs semantic part identities; Infinigen informs paired geometry/rig
construction; grammar research informs constrained families; locomotion work
informs contact phases and terrain adaptation. This is our own bounded
TypeScript implementation, not a port of those engines or learned controllers.
No paper figures, external meshes, clips, model weights or generated art services
were used. JSON exports preserve the world seed/version, species genomes,
mutation logs, dates and selected movement scenario for reproduction.

## Validation record — 2026-09-14

`npm test`: 145 passing checks. Creature coverage includes all 12 animals,
adult/juvenile proportions, actual rendered foot soles, stance slip, reachable
contacts across flat/ramp/stair fixtures, absolute-time A-B-A replay, connected
hips/tails, invalid genomes and disposal of every owned geometry. These tests
check spatial results as well as target diagnostics.

`npm run test:creatures`: Chromium gallery selection, all four actual ancestry
chains, anatomical overlays, six terrain/gait scenarios, live walk/run playback,
16 moving specimens, exports, formation/airless exclusion, repeated regeneration
and a 390 × 844 mobile ancestry view. Screenshots and recorded motion frames
were visually reviewed. Earlier review caught clipped figures, detached tail/hip
attachments, invisible skeleton lines and mismatched mobile labels; these were
corrected before release. Local artifacts are under `test-results/creature-review/`.

Existing `test:biosphere`, `test:biomes` and `test:browser` also pass. The main
universe smoke run retained its expected catalogue digest, with 66 geometries
and two textures at its final checkpoint. TypeScript and the Vite production
build pass; the existing shared-chunk size warning remains.

Browser runs used desktop Chromium through ANGLE/D3D11 on an RTX 5090.
CPU figures shown by the lab time JavaScript updates and render submission,
not GPU completion. Crowd tests are a small prototype benchmark, not proof of
planet-wide population capacity. No Quest/headset performance or deformation
quality claim is made. Walk/run videos demonstrate articulation; they do not
establish animal-like balance or biomechanical accuracy.

The final local 16-animal flat-arena checkpoint submitted 386 draw calls and
23,472 triangles, with 17 textures. Four world regenerations retained the same
450-geometry/17-texture resource count for that selected fixture. Draw-call
reduction through instancing or shared skeletal rendering remains necessary
before large populations or a Quest deployment.
