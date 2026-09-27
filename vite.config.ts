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
    // Explicit review artifacts linked by the desktop acceptance record.
    // Do not publish arbitrary scratch files from test-results.
    for(const fileName of [
      'docs/desktop-realism-validation-2026-09-28.md',
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
