import {defineConfig} from 'vite';
// Dedicated local measurement server. Production Vite/package files are untouched.
export default defineConfig({root: process.cwd(), server: {host:'127.0.0.1', port:5195, strictPort:true, hmr:false,
  fs:{allow:[process.cwd(), 'C:/LLM/IWSDK/creature-kit-wt/planet-composer-integration']},
  headers:{'Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Embedder-Policy':'require-corp'}}});
