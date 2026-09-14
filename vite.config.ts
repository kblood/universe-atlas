import { defineConfig } from "vite";
import { readFileSync } from 'node:fs';
export default defineConfig({
  base: "./",
  plugins: [{name: 'publish-orbit-docs', generateBundle() {
    for(const fileName of ['docs/biosphere-lab-implementation-spec.md','docs/procedural-biospheres-next-plan-2026-09-14.md','docs/research-planet-biome-generation-2026-09-14.md','docs/research-procedural-flora-geology-2026-09-14.md','docs/research-procedural-fauna-habitats-2026-09-14.md','docs/research-evolutionary-history-2026-09-14.md'])
      this.emitFile({type:'asset',fileName,source:readFileSync(new URL(fileName,import.meta.url),'utf8')});
    for(const fileName of ['docs/terrain-research-2026-09-13.md','docs/terrain-v2-first-slice-spec.md','docs/stable-shores.md','docs/planet-realism-goal.md','docs/planet-validation-labs-2026-09-14.md','docs/research-terrain-river-validation-2026-09-14.md','docs/research-vegetation-rocks-2026-09-14.md','docs/research-species-and-simulation-2026-09-14.md','docs/biome-lab-spec.md'])
      this.emitFile({type:'asset',fileName,source:readFileSync(new URL(fileName,import.meta.url),'utf8')});
    for (const fileName of ['README.md', 'docs/planetary-orbit-implementation.md', 'docs/planetary-orbit-validation.md', 'docs/exploration-corrections.md', 'docs/living-worlds-and-time-roadmap.md', 'docs/fable-review-brief.md', 'docs/fable-5.1-plan-review.md', 'docs/fable-5.1-plan-review.metadata.json', 'docs/fable-review-assessment.md', 'docs/walking-and-time.md', 'docs/surface-materials-and-survey.md', 'docs/drainage-and-atmospheric-flight.md', 'docs/physical-river-pilot-spec.md', 'docs/physical-rivers-and-ground-detail.md', 'docs/ground-realism-spec.md', 'docs/ground-realism.md']) {
      this.emitFile({type: 'asset', fileName, source: readFileSync(new URL(fileName, import.meta.url), 'utf8')});
    }
  }}],
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: { input: { atlas: 'index.html', biomes: 'biome-lab.html', biosphere: 'biosphere-lab.html' } },
  },
});
