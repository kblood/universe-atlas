import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import * as THREE from 'three';

// Node's built-in TS stripping intentionally rejects TS parameter properties.
// Load through Vite's TypeScript transform, the same compiler used by the app.
const vite = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true }, appType: 'custom' });
const {
  CLOUD_QUALITY,
  cloudLayerHeights,
  cloudTransmittance,
  createCloudNoise,
  VolumetricClouds,
  supportedCloudSceneSamples, cloudTargetBytesPerPixel,cloudSceneSampleChoice,CLOUD_TARGET_BUDGET_BYTES,
} = await vite.ssrLoadModule('/src/volumetric-clouds.ts');
after(async () => { await vite.close(); });

test('scene AA requires matching colour/depth support and budgets sample storage',()=>{
  assert.deepEqual(supportedCloudSceneSamples([8,4,2,4],[4,2],4),[4,2]);
  assert.deepEqual(supportedCloudSceneSamples([4],[2],4),[]);
  assert.deepEqual(supportedCloudSceneSamples([8,4],[8,4],2),[]);
  assert.equal(cloudTargetBytesPerPixel(0,1),20);
  assert.equal(cloudTargetBytesPerPixel(4,1),68);
  assert.equal(cloudTargetBytesPerPixel(0,.5),14);
});

test('AA reduces sample count before sacrificing native scene detail',()=>{
  for(const [w,h] of [[1440,1000],[1920,1080],[2560,1440],[3840,2160]]){
    const baseline=cloudSceneSampleChoice(0,[4,2],w*h,1,CLOUD_TARGET_BUDGET_BYTES);
    for(const requested of [2,4]){
      const choice=cloudSceneSampleChoice(requested,[4,2],w*h,1,CLOUD_TARGET_BUDGET_BYTES);
      assert.equal(choice.scale,baseline.scale);
      assert.ok(w*h*choice.scale**2*cloudTargetBytesPerPixel(choice.samples,1)<=CLOUD_TARGET_BUDGET_BYTES);
    }
  }
  assert.equal(cloudSceneSampleChoice(4,[4,2],2560*1440,1,CLOUD_TARGET_BUDGET_BYTES).samples,2);
  assert.equal(cloudSceneSampleChoice(4,[4],2560*1440,1,CLOUD_TARGET_BUDGET_BYTES).limit,'budget');
  assert.equal(cloudSceneSampleChoice(4,[],1440*1000,1,CLOUD_TARGET_BUDGET_BYTES).limit,'format');
  assert.equal(cloudSceneSampleChoice(4,[4],1440*1000,.5,CLOUD_TARGET_BUDGET_BYTES,true).limit,'xr');
});

const terrestrial = { hasAtmosphere: true, hasOcean: true, temperatureK: 285, radiusM: 6_200_000, spinPeriodS: 86_400 };

test('Beer-Lambert cloud extinction is bounded, monotonic and composable', () => {
  const sigma = 0.00018;
  assert.equal(cloudTransmittance(sigma, 0), 1);
  assert.equal(cloudTransmittance(-sigma, 1000), 1, 'negative extinction clamps to zero');
  assert.equal(cloudTransmittance(sigma, -1000), 1, 'negative path length clamps to zero');
  const near = cloudTransmittance(sigma, 100);
  const far = cloudTransmittance(sigma, 1000);
  assert.ok(near < 1 && near > far && far > 0);
  assert.ok(Math.abs(cloudTransmittance(sigma, 300) * cloudTransmittance(sigma, 700) - far) < 1e-15);
});

test('cloud layer heights remain ordered and scale sensibly across body classes', () => {
  const earthLike = cloudLayerHeights(terrestrial);
  assert.deepEqual(earthLike, { baseM: 800, lowTopM: 4200, highBaseM: 6500, topM: 8500 });
  for (const h of [earthLike, cloudLayerHeights({ ...terrestrial, radiusM: 500_000 }), cloudLayerHeights({ ...terrestrial, gasGiant: true })]) {
    assert.ok(0 < h.baseM && h.baseM < h.lowTopM && h.lowTopM < h.highBaseM && h.highBaseM < h.topM);
  }
  const small = cloudLayerHeights({ ...terrestrial, radiusM: 500_000 });
  assert.ok(small.topM < earthLike.topM, 'small worlds use a proportionally thinner deck');
  const giant = cloudLayerHeights({ ...terrestrial, gasGiant: true });
  assert.ok(giant.topM > earthLike.topM);
});

test('seeded 3D cloud shape texture is deterministic and has resolved spatial variation', () => {
  const a = createCloudNoise(12);
  const b = createCloudNoise(12);
  try {
    assert.equal(a.isData3DTexture, true);
    assert.equal(a.image.width, 12);
    assert.deepEqual(a.image.data, b.image.data);
    const red = [];
    for (let i = 0; i < a.image.data.length; i += 4) red.push(a.image.data[i]);
    assert.ok(Math.min(...red) < Math.max(...red), 'shape channel is not a constant field');
    assert.ok(a.wrapS > 0 && a.wrapT > 0 && a.wrapR > 0, 'all volume axes wrap for periodic sampling');
  } finally {
    a.dispose();
    b.dispose();
  }
});

test('desktop and immersive cloud budgets expose a cheaper headset path', () => {
  assert.ok(CLOUD_QUALITY.desktop.steps > CLOUD_QUALITY.immersive.steps);
  assert.ok(CLOUD_QUALITY.desktop.lightSteps > CLOUD_QUALITY.immersive.lightSteps);
  assert.equal(CLOUD_QUALITY.immersive.steps, 32);
});

test('weather texture is seed/address-specific, exact-date replayable, and finite at signed far-future dates', () => {
  const params={...terrestrial};
  const make=()=>new VolumetricClouds(params,new THREE.Group());
  const sun=new THREE.Vector3(1,.2,.3).normalize();
  const a=make(),b=make(),different=make();
  try {
    a.update('seed-a','planet/a',3700n*1_000_000_000n,sun);
    b.update('seed-a','planet/a',3700n*1_000_000_000n,sun);
    different.update('seed-b','planet/b',3700n*1_000_000_000n,sun);
    const expected=Uint8Array.from(a.weather.image.data);
    assert.deepEqual(b.weather.image.data,expected,'identical body and exact date reproduce weather bytes');
    assert.notDeepEqual(different.weather.image.data,expected,'seed/address changes the weather field');
    for(const t of [-(10n**100n),10n**100n]){
      a.update('seed-a','planet/a',t,sun);
      const first=Uint8Array.from(a.weather.image.data);
      b.update('seed-a','planet/a',t,sun);
      assert.deepEqual(b.weather.image.data,first,`weather replay is stable at ${t.toString()} ns`);
      assert.ok(first.every(Number.isFinite));
    }
  } finally { a.dispose();b.dispose();different.dispose(); }
});
