import { defineConfig } from "vite";
import { readFileSync } from 'node:fs';
export default defineConfig({
  base: "./",
  plugins: [{name: 'publish-orbit-docs', generateBundle() {
    for (const fileName of ['README.md', 'docs/planetary-orbit-implementation.md', 'docs/planetary-orbit-validation.md', 'docs/exploration-corrections.md', 'docs/living-worlds-and-time-roadmap.md', 'docs/fable-review-brief.md', 'docs/fable-5.1-plan-review.md', 'docs/fable-5.1-plan-review.metadata.json', 'docs/fable-review-assessment.md', 'docs/walking-and-time.md']) {
      this.emitFile({type: 'asset', fileName, source: readFileSync(new URL(fileName, import.meta.url), 'utf8')});
    }
  }}],
  build: { chunkSizeWarningLimit: 800 },
});
