// Node-side golden digest computation: `node tests/golden/node-run.mjs` prints
// JSON to stdout. Used both as the reference for the committed golden.json
// and as the "Node" column in the cross-engine comparison.
import { computeGolden } from "./generator.ts";

const result = await computeGolden();
process.stdout.write(JSON.stringify(result, null, 2) + "\n");
