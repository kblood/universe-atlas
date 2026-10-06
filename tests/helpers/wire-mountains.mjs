// `node --import ./tests/helpers/wire-mountains.mjs <script>`: run <script> with the mountains wired (see the hook).
import {register} from 'node:module';
register('./wire-mountains-hook.mjs', import.meta.url);
