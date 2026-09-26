import { computeGolden } from "./generator.ts";

declare global {
  interface Window {
    __GOLDEN_RESULT__?: unknown;
    __GOLDEN_ERROR__?: string;
  }
}

computeGolden()
  .then((result) => {
    window.__GOLDEN_RESULT__ = result;
    const pre = document.getElementById("out");
    if (pre) pre.textContent = JSON.stringify(result);
  })
  .catch((err) => {
    window.__GOLDEN_ERROR__ = String((err && err.stack) || err);
    const pre = document.getElementById("out");
    if (pre) pre.textContent = "ERROR: " + window.__GOLDEN_ERROR__;
  });
