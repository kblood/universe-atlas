import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { generateBiosphere } from '../src/biosphere-model.ts';
import { generateCreatureGenome, individualCreatureGenome, realisticIndividualCreatureGenome, validateCreatureGenome } from '../src/creature-model.ts';
import { MORPHOLOGY_FAMILIES, sampleFaunaCoat } from '../src/fauna-appearance.ts';
import { createQuadrupedPlan } from '../src/fauna-body-plan.ts';

const archetypes = ['browser', 'runner', 'low-slung', 'long-neck'];
const world = generateBiosphere('FAUNA-VARIATION-CORPUS', 'temperate', 'planet/0');
const species = world.species.filter(s => s.creature);
const snapshot = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const coatAt = (g, u, v, w) => sampleFaunaCoat(g, u * g.torsoLength, v * g.torsoHeight, w * g.torsoWidth, 0);

test('96-specimen review corpus: inherited identity, deterministic variation, valid coherent anatomy', () => {
  assert.equal(species.length, 12);
  const savedWorld = snapshot(world);
  let count = 0;
  for (const archetype of archetypes) {
    const family = species.filter(s => s.creature.archetype === archetype);
    assert.equal(family.length, 3);
    const speciesShapes = new Set();
    for (const s of family) {
      const individuals = [], seeds = new Set(), palettes = new Set();
      for (let individual = 0; individual < 4; individual++) {
        const adult = realisticIndividualCreatureGenome(s.creature, s.id, individual, 'adult');
        const juvenile = realisticIndividualCreatureGenome(s.creature, s.id, individual, 'juvenile');
        for (const [stage, g] of [['adult', adult], ['juvenile', juvenile]]) {
          count++;
          assert.deepEqual(validateCreatureGenome(g), [], `${s.id}/${individual}/${stage}`);
          assert.equal(g.color,g.appearance.palette.base);assert.equal(g.accentColor,g.appearance.palette.marking);
          assert.deepEqual(g, realisticIndividualCreatureGenome(s.creature, s.id, individual, stage));
          assert.ok(g.footWidth < g.stanceWidth * .56, 'feet remain inside the stance envelope');
          assert.ok(g.strideLength <= g.legLength * .962, 'stride fits the limb reach envelope');
          assert.ok(g.runSpeed > g.walkSpeed && g.walkSpeed > 0);
          const plan = createQuadrupedPlan(g);
          assert.equal(plan.legs.length, 4);
          for (const leg of plan.legs) {
            const distance = Math.hypot(...leg.hip.map((v, i) => v - leg.ankle[i]));
            assert.ok(distance <= leg.upperLength + leg.lowerLength + 1e-6, 'bind foot placement is reachable');
          }
          for (const point of [[0, 0, .4], [.1, .15, .35], [-.35, -.2, .2]]) {
            const color = coatAt(g, ...point);
            assert.ok(color.every(c => Number.isFinite(c) && c >= 0 && c <= 1));
          }
        }
        assert.equal(adult.appearance.markingSeed, juvenile.appearance.markingSeed);
        assert.equal(adult.appearance.individualKey, juvenile.appearance.individualKey);
        assert.deepEqual(adult.appearance.palette, juvenile.appearance.palette);
        assert.deepEqual(adult.appearance.individual, juvenile.appearance.individual);
        assert.deepEqual(adult.appearance.profile, juvenile.appearance.profile);
        assert.equal(adult.morphology.family, juvenile.morphology.family);
        // fauna-appearance-2: the coat genome is the adult's except for the
        // stage channels (juvenile spots, greying); in torso-length space the
        // same markings land on the grown body within a small tolerance (the
        // juvenile trunk is slightly narrower relative to its length).
        assert.deepEqual({...juvenile.appearance.coat,juvenileSpots:0,greying:adult.appearance.coat.greying},{...adult.appearance.coat,juvenileSpots:0});
        const stageless={...juvenile,appearance:{...juvenile.appearance,coat:adult.appearance.coat}};
        let matching=0,points=0;
        for(let u=-.4;u<=.41;u+=.1)for(const v of [-.3,-.1,.1,.3])for(const w of [-.35,.31]){
          const adultCoat=coatAt(adult,u,v,w),youngCoat=coatAt(stageless,u,v,w);points++;
          if(adultCoat.every((value,i)=>Math.abs(value-youngCoat[i])<.04))matching++;
        }
        assert.ok(matching>=points*.85, `normalized growth coordinates preserve coat markings (${matching}/${points})`);
        assert.ok(juvenile.torsoLength < adult.torsoLength);
        assert.ok(juvenile.legLength < adult.legLength);
        assert.ok(juvenile.headLength / juvenile.torsoLength > adult.headLength / adult.torsoLength * 1.1, 'young head is proportionally larger');
        assert.ok(juvenile.footLength / juvenile.torsoLength > adult.footLength / adult.torsoLength * 1.1, 'feet develop ahead of trunk');
        assert.ok(juvenile.walkSpeed < adult.walkSpeed && juvenile.runSpeed < adult.runSpeed);
        assert.ok(juvenile.strideLength < adult.strideLength);
        assert.ok(juvenile.hornLength <= adult.hornLength * .2 + .001);
        if (archetype === 'long-neck') assert.ok(juvenile.neckLength / juvenile.torsoLength < adult.neckLength / adult.torsoLength * .9);
        seeds.add(adult.appearance.markingSeed); palettes.add(JSON.stringify(adult.appearance.palette));
        individuals.push([adult.torsoWidth, adult.headLength, adult.earLength]);
        speciesShapes.add([adult.legLength / adult.torsoLength, adult.neckLength / adult.torsoLength].join('/'));
      }
      assert.equal(seeds.size, 4);
      assert.ok(palettes.size >= 3);
      assert.equal(new Set(individuals.map(JSON.stringify)).size, 4, 'individuals differ in anatomy as well as color');
    }
    assert.ok(speciesShapes.size >= 3, 'species retain distinct proportion profiles');
  }
  assert.equal(count, 96);
  assert.equal(snapshot(world), savedWorld, 'appearance evaluation cannot mutate canonical species or catalogue');
});

test('six authored morphology families have coherent feet and distinct structural appendages', () => {
  for (const archetype of archetypes) for (const family of MORPHOLOGY_FAMILIES) {
    const g = generateCreatureGenome('MORPHOLOGY-EXTREMES', archetype);
    const specimens = ['adult', 'juvenile'].map(stage => realisticIndividualCreatureGenome(g, 'morphology', 3, stage, family));
    for (const specimen of specimens) {
      assert.deepEqual(validateCreatureGenome(specimen), [], `${archetype}/${family}`);
      assert.equal(specimen.morphology.family, family);
      assert.equal(specimen.morphology.trunkLength > 0, family === 'proboscidean');
      assert.equal(specimen.morphology.wingSpan > 0, family === 'winged');
      assert.equal(specimen.morphology.wingState, family === 'winged' ? 'folded' : 'none');
      assert.equal(specimen.morphology.footType, ['ungulate', 'long-neck'].includes(family) ? 'hoof' : ['padded', 'proboscidean'].includes(family) ? 'broad-pad' : 'paw');
      if (family === 'long-neck') assert.ok(specimen.neckLength / specimen.torsoLength > .59);
      if (family === 'padded') assert.ok(specimen.legLength / specimen.torsoLength < .45);
    }
    assert.equal(specimens[0].appearance.markingSeed, specimens[1].appearance.markingSeed);
  }
});

test('legacy genome and individual channels remain unchanged and appearance is additive', () => {
  const g = generateCreatureGenome('LEGACY-PHENOTYPE', 'browser');
  assert.deepEqual([g.torsoLength, g.torsoHeight, g.torsoWidth, g.legLength, g.neckLength, g.color, g.pattern], [1.704, .834, .71, 1.137, .569, '#657a4b', 'stripes']);
  const adult = individualCreatureGenome(g, 'legacy-id', 2), young = individualCreatureGenome(g, 'legacy-id', 2, 'juvenile');
  assert.deepEqual([g,adult,young].map(snapshot),[
    '2fc0e777259de7829d570f0f0da63741d37aa5720aec6b80287cdbd7578a560f',
    '0008ba888ed9197b88174c77cb6374b78f226880eac10eb3e893218572b101e3',
    '11da36431bc4f252a52d606de547028be28e6f6c66dab95901955ddd933da504',
  ],'all legacy fields retain their original values');
  assert.deepEqual([adult.torsoLength, adult.headWidth, adult.strideLength, adult.walkSpeed], [1.635, .289, .864, 1.05]);
  assert.deepEqual([young.torsoLength, young.headWidth, young.strideLength, young.walkSpeed], [.971, .182, .513, .793]);
  assert.equal('appearance' in g, false); assert.equal('morphology' in g, false);
  assert.equal(sampleFaunaCoat(g, 0, 0, 0, 0), undefined);
  const before = snapshot(g);
  realisticIndividualCreatureGenome(g, 'legacy-id', 2);
  assert.equal(snapshot(g), before);
});

test('optional metadata is deeply copied and rejects invalid or incompatible anatomy', () => {
  const g = realisticIndividualCreatureGenome(generateCreatureGenome('META', 'runner'), 'meta', 0);
  const copied = individualCreatureGenome(g, 'meta-copy', 1);
  copied.appearance.palette.base = '#ffffff'; copied.appearance.profile.mass = .8;
  copied.appearance.individual.ears = .9; copied.appearance.growth.maturity = .2;
  copied.morphology.footType = 'hoof';
  assert.notDeepEqual(copied.appearance.palette, g.appearance.palette);
  assert.notDeepEqual(copied.appearance.profile, g.appearance.profile);
  assert.notDeepEqual(copied.appearance.individual, g.appearance.individual);
  assert.notDeepEqual(copied.appearance.growth, g.appearance.growth);
  assert.notDeepEqual(copied.morphology, g.morphology);
  const descendant=generateCreatureGenome('META-DESCENDANT','runner',g),original=snapshot(g);
  descendant.appearance.palette.base='#000000';descendant.appearance.profile.mass=-1;
  descendant.appearance.individual.ears=-1;descendant.appearance.growth.maturity=.1;
  descendant.morphology.wingState='folded';
  assert.equal(snapshot(g),original,'descendants never alias optional parent metadata');
  for (const invalid of [
    { ...g, appearance: { ...g.appearance, markingSeed: NaN } },
    { ...g, appearance: { ...g.appearance, palette: undefined } },
    { ...g, appearance: null },
    { ...g, appearance: { ...g.appearance, roughness: NaN } },
    { ...g, appearance: { ...g.appearance, growth: { stage:'adult',maturity:NaN } } },
    { ...g, appearance: { ...g.appearance, profile: { ...g.appearance.profile, mass: 2 } } },
    { ...g, morphology: { ...g.morphology, trunkLength: 1 } },
    { ...g, morphology: { ...g.morphology, wingState: 'flying' } },
    { ...g, morphology: { ...g.morphology, footType: 'hoof' } },
  ]) assert.ok(validateCreatureGenome(invalid).length > 0);
  assert.throws(() => realisticIndividualCreatureGenome(g, 's', 0, 'adult', 'unknown'));
});

test('markings change with individual identity and replay at normalized growth coordinates', () => {
  for (const pattern of ['plain', 'stripes', 'spots']) {
    const g = { ...generateCreatureGenome('COAT', 'browser'), pattern };
    const samples = [];
    for (let variant = 0; variant < 4; variant++) {
      const specimen = realisticIndividualCreatureGenome(g, 'coat', variant);
      samples.push(Array.from({ length: 21 }, (_, i) => coatAt(specimen, (i - 10) / 24, .13, .43)));
    }
    assert.equal(new Set(samples.map(JSON.stringify)).size, 4, `${pattern} individual coat identity`);
  }
});
