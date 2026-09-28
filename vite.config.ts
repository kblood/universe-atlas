import { defineConfig } from "vite";
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
export default defineConfig({
  base: "./",
  plugins: [{name: 'publish-orbit-docs', generateBundle() {
    this.emitFile({type:'asset',fileName:'build-info.json',source:JSON.stringify({
      commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
      dirty:execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim().length>0,
      builtAt:new Date().toISOString(),
    },null,2)});
    for(const fileName of [
      'docs/desktop-rendering-stage-c-2026-09-28.md',
      'docs/desktop-rendering-validation-2026-09-28.md',
      'docs/background-hydrology-travel-2026-09-28.md',
      'docs/canopy-foundation-2026-09-28.md',
      'docs/forest-selection-cache-2026-09-28.md',
      'docs/forest-selection-transfer-2026-09-28.md',
      'docs/opus-5.5-transfer-review-2026-09-28.md',
      'docs/opus-5.5-transfer-review-2026-09-28.metadata.json',
      'test-results/forest-selection-transfer/benchmark.json',
      'docs/opus-5.5-selection-cache-review-2026-09-28.md',
      'docs/opus-5.5-selection-cache-review-2026-09-28.metadata.json',
      'test-results/forest-selection-cache/benchmark.json',
      'tests/forest-selection-cache.browser.mjs',
      'test-results/forest-selection-66c7728/README.md',
      'test-results/forest-selection-66c7728/desktop-rendering-hardware/report.json',
      'test-results/forest-selection-66c7728/browser-movement-lateral-hardware/report.json',
      'test-results/forest-selection-66c7728/browser-movement-lateral-hardware/after-move.png',
      'docs/opus-5.5-canopy-review-2026-09-28.md',
      'docs/opus-5.5-canopy-review-2026-09-28.metadata.json',
      'tests/background-hydrology-flight.browser.mjs',
      'test-results/background-hydrology-regression/background-hydrology-flight.browser.mjs',
      'test-results/background-hydrology-regression/baseline-37f0e89-failure.png',
      'test-results/background-hydrology-regression/README.md',
      'test-results/background-hydrology-regression/baseline-37f0e89-failure.json',
      'test-results/background-hydrology-regression/fixed-cb03169-life-report.json',
      'test-results/background-hydrology-regression/fixed-cb03169-land-report.json',
      'docs/flora-recipe-cache-2026-09-28.md',
      'docs/tree-species-asset-contract-2026-09-28.md',
      'docs/tree-asset-candidate-2026-09-28.md',
      'docs/opus-5.5-rendering-review-2026-09-28.md',
      'docs/opus-5.5-rendering-review-2026-09-28.metadata.json',
      'assets/briefs/temperate-branching-tree-v1.json',
      'tests/desktop-rendering-acceptance.browser.mjs',
      'test-results/desktop-rendering-stage-c-absolute-date/report.json',
      'test-results/desktop-rendering-921de57/report.json',
      'test-results/desktop-rendering-6b87e13/report.json',
      'test-results/fauna-closeup-6b87e13/report.json',
    ])this.emitFile({type:'asset',fileName,source:readFileSync(new URL(fileName,import.meta.url),'utf8')});
    for(const fileName of [
      'test-results/desktop-rendering-6b87e13/near-ground-warmed.png',
      'test-results/desktop-rendering-6b87e13/cloud-aa-0.png',
      'test-results/desktop-rendering-6b87e13/cloud-aa-2.png',
      'test-results/desktop-rendering-6b87e13/cloud-aa-4.png',
      'test-results/desktop-rendering-6b87e13/cloud-aa-4-2560x1440.png',
      'test-results/desktop-rendering-6b87e13/near-ground-resized-2560x1440.png',
      'test-results/desktop-rendering-6b87e13/forest-turned.png',
      'test-results/fauna-closeup-6b87e13/01-fauna-closeup.png',
      'test-results/fauna-closeup-6b87e13/02-fauna-paused-repeat.png',
    ])this.emitFile({type:'asset',fileName,source:readFileSync(new URL(fileName,import.meta.url))});
    // Explicit review artifacts linked by the desktop acceptance record.
    // Do not publish arbitrary scratch files from test-results.
    for(const fileName of [
      'docs/desktop-realism-validation-2026-09-28.md',
      'test-results/deploy-a58ad07/live-deployment.json',
      'test-results/deploy-37f0e89/live-deployment.json',
      'test-results/deploy-114a16e/live-deployment.json',
      'test-results/deploy-6f7cb21/live-deployment.json',
      'test-results/deploy-6f7cb21/forest-selection-cache-browser/report.json',
      'test-results/deploy-6f7cb21/desktop-rendering-acceptance/report.json',
      'test-results/deploy-6f7cb21/forest-selection-cache-browser/after-move.png',
      'test-results/deploy-6f7cb21/desktop-rendering-acceptance/near-ground-warmed.png',
      'test-results/deploy-6f7cb21/desktop-rendering-acceptance/forest-turned.png',
      'test-results/deploy-6f7cb21/desktop-rendering-acceptance/cloud-aa-0.png',
      'test-results/deploy-6f7cb21/desktop-rendering-acceptance/cloud-aa-2.png',
      'test-results/deploy-6f7cb21/desktop-rendering-acceptance/cloud-aa-4.png',
      'test-results/deploy-6f7cb21/desktop-rendering-acceptance/cloud-aa-4-2560x1440.png',
      'test-results/deploy-6f7cb21/desktop-rendering-acceptance/near-ground-resized-2560x1440.png',
      'test-results/deploy-114a16e/background-hydrology-life/report.json',
      'test-results/deploy-114a16e/background-hydrology-land/report.json',
      'test-results/deploy-114a16e/desktop-rendering-acceptance/report.json',
      'test-results/deploy-114a16e/desktop-rendering-acceptance/near-ground-warmed.png',
      'test-results/deploy-114a16e/desktop-rendering-acceptance/forest-turned.png',
      'test-results/deploy-114a16e/desktop-rendering-acceptance/cloud-aa-0.png',
      'test-results/deploy-114a16e/desktop-rendering-acceptance/cloud-aa-2.png',
      'test-results/deploy-114a16e/desktop-rendering-acceptance/cloud-aa-4.png',
      'test-results/deploy-114a16e/desktop-rendering-acceptance/cloud-aa-4-2560x1440.png',
      'test-results/deploy-114a16e/desktop-rendering-acceptance/near-ground-resized-2560x1440.png',
      'tests/desktop-forest-acceptance.browser.mjs',
      'test-results/desktop-realism-26b41f5/forest-hardware/report.json',
      'test-results/desktop-realism-26b41f5/forest-hardware/forest-warmed.png',
      'test-results/desktop-realism-26b41f5/forest-hardware/forest-turned.png',
      'test-results/desktop-realism-26b41f5/population-flight/report.json',
      'test-results/desktop-realism-26b41f5/population-flight/01-contact.png',
      'test-results/desktop-realism-26b41f5/population-flight/02-fauna-low-flight.png',
    ])this.emitFile({type:'asset',fileName,source:readFileSync(new URL(fileName,import.meta.url))});
    for(const fileName of ['docs/opus-5.5-forest-implementation-review-2026-09-28.md','docs/opus-5.5-forest-implementation-review-2026-09-28.metadata.json','docs/desktop-render-profiling.md','docs/desktop-realism-implementation-plan-2026-09-27.md','docs/desktop-realism-proposal-2026-09-27.md','docs/desktop-realism-assessment-2026-09-27.md','docs/opus-5.5-desktop-realism-review-2026-09-27.md','docs/opus-5.5-desktop-realism-review-2026-09-27.metadata.json'])
      this.emitFile({type:'asset',fileName,source:readFileSync(new URL(fileName,import.meta.url),'utf8')});
    for(const fileName of ['docs/planet-rendering-validation-2026-09-27.md','docs/realistic-clouds-research-2026-09-27.md','docs/planet-local-rendering-design.md','docs/population-continuity-review-2026-09-27.md','docs/population-continuity-implementation-2026-09-27.md'])
      this.emitFile({type:'asset',fileName,source:readFileSync(new URL(fileName,import.meta.url),'utf8')});
    this.emitFile({type:'asset',fileName:'docs/star-visibility-and-transitions.md',
      source:readFileSync(new URL('docs/star-visibility-and-transitions.md',import.meta.url),'utf8')});
    for(const fileName of ['docs/creature-lab-implementation-spec.md','docs/creature-diversity-and-motion-plan-2026-09-14.md','docs/research-creature-anatomy-references-2026-09-14.md','docs/research-creature-locomotion-references-2026-09-14.md'])
      this.emitFile({type:'asset',fileName,source:readFileSync(new URL(fileName,import.meta.url),'utf8')});
    for(const fileName of ['docs/biosphere-lab-implementation-spec.md','docs/procedural-biospheres-next-plan-2026-09-14.md','docs/research-planet-biome-generation-2026-09-14.md','docs/research-procedural-flora-geology-2026-09-14.md','docs/research-procedural-fauna-habitats-2026-09-14.md','docs/research-evolutionary-history-2026-09-14.md'])
      this.emitFile({type:'asset',fileName,source:readFileSync(new URL(fileName,import.meta.url),'utf8')});
    for(const fileName of ['docs/continuous-planet-detail.md','docs/terrain-research-2026-09-13.md','docs/terrain-v2-first-slice-spec.md','docs/stable-shores.md','docs/planet-realism-goal.md','docs/planet-validation-labs-2026-09-14.md','docs/research-terrain-river-validation-2026-09-14.md','docs/research-vegetation-rocks-2026-09-14.md','docs/research-species-and-simulation-2026-09-14.md','docs/biome-lab-spec.md'])
      this.emitFile({type:'asset',fileName,source:readFileSync(new URL(fileName,import.meta.url),'utf8')});
    for(const fileName of ['docs/cosmic-history-simulation-plan-2026-09-23.md','docs/deterministic-temporal-universe-design-2026-09-23.md','docs/formation-and-life-integration-2026-09-23.md','docs/temporal-universe-implementation-2026-09-23.md','docs/time-and-coordinates-contract.md'])
      this.emitFile({type:'asset',fileName,source:readFileSync(new URL(fileName,import.meta.url),'utf8')});
    for (const fileName of ['README.md', 'docs/planetary-orbit-implementation.md', 'docs/planetary-orbit-validation.md', 'docs/exploration-corrections.md', 'docs/living-worlds-and-time-roadmap.md', 'docs/fable-review-brief.md', 'docs/fable-5.1-plan-review.md', 'docs/fable-5.1-plan-review.metadata.json', 'docs/fable-review-assessment.md', 'docs/walking-and-time.md', 'docs/surface-materials-and-survey.md', 'docs/drainage-and-atmospheric-flight.md', 'docs/physical-river-pilot-spec.md', 'docs/physical-rivers-and-ground-detail.md', 'docs/ground-realism-spec.md', 'docs/ground-realism.md']) {
      this.emitFile({type: 'asset', fileName, source: readFileSync(new URL(fileName, import.meta.url), 'utf8')});
    }
  }}],
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      input: {
        atlas: 'index.html', biomes: 'biome-lab.html', biosphere: 'biosphere-lab.html', creatures: 'creature-lab.html', clouds: 'tests/cloud-comparison.html',
        ...Object.fromEntries(['index', 'determinism', 'time', 'universe', 'terrain', 'water-atmosphere', 'life', 'travel', 'publishing']
          .map(chapter => [`guide-${chapter}`, `guide/${chapter}.html`])),
      },
      output: {
        // The Rapier physics engine embeds its ~2 MB WASM module as base64 in
        // its own bundle (@dimforge/rapier3d-compat ships no separate .wasm
        // asset). It is already dynamically imported only when walking starts
        // (see ground-walker.ts / prepareLanding), but isolating it in its own
        // chunk keeps that large, rarely-changing vendor payload independently
        // cacheable across deploys instead of being re-fingerprinted whenever
        // ground-walker.ts's own (small) logic changes.
        manualChunks(id) {
          if (id.includes('@dimforge/rapier3d-compat')) return 'rapier-physics';
        },
      },
    },
  },
});
