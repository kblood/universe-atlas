/** Shared test helper (not itself a *.test.mjs): a canonical-JSON digest for
 * the determinism/order-independence acceptance tests in
 * docs/time-and-coordinates-contract.md §6.4. BigInt-safe, sorts object keys
 * so field insertion order never affects the digest. */
export function canonicalJSON(value) {
  const sortKeys = (v) => {
    if (typeof v === 'bigint') return v.toString() + 'n';
    if (Array.isArray(v)) return v.map(sortKeys);
    if (v && typeof v === 'object') {
      const out = {};
      for (const k of Object.keys(v).sort()) out[k] = sortKeys(v[k]);
      return out;
    }
    return v;
  };
  return JSON.stringify(sortKeys(value));
}
