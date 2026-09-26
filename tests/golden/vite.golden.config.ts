import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const root = fileURLToPath(new URL(".", import.meta.url));

// Standalone build config for the cross-engine golden-hash harness only.
// Deliberately separate from the project's own vite.config.ts (owned by
// other agents' work and the main app entries) so this test infrastructure
// never touches or depends on it. Builds tests/golden/golden.html (which
// imports the pure catalog/terrain/world-history modules directly, no
// three.js) into its own dist directory.
export default defineConfig({
  root,
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: { input: { golden: resolve(root, "golden.html") } },
  },
});
