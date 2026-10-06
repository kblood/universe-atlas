Implemented, **not acceptance-ready**:

- Cold builds exceed 50 ms on three worlds.
- Tests: **86/90 pass**. Four untouched switch-tile pins fail because `parents` and `parentHeight` necessarily move; all carved child buffers and sampler pins remain identical.
- Dense ocean checks use exact uncarved samples; the requested full carved-truth scan remains incomplete.

Changed three production files (`mountain-layout.ts`, `mountain-envelope.ts`, `terrain.ts`), package registration, version/coarse pins, and the new test/helper.

The field uses sparse 8×8 blocks, signed Float32 distances, conservative candidate lists, and maximum composition including main. Delta **0.16 H** exceeds twice the densely measured maximum error **0.076815 H**. Cache identities remain valid.

| World | Resolution | Cold ms | Bytes | Active / multi-belt cells |
|---|---:|---:|---:|---:|
| Maithea | 512 | 56.04 | 822,144 | 74,826 / 176 |
| Selawyn | 1024 | 93.02 | 1,624,130 | 133,763 / 33 |
| Raiva | 256 | 16.09 | 145,206 | 13,112 / 0 |
| Lethuris | 1024 | 100.18 | 1,726,504 | 145,451 / 98 |

Checks:

- `npx tsc --noEmit`: exit **0**.
- Requested eight-file `node --test` command: exit **1**, **86 pass / 4 fail**.
- New test alone: exit **0**, **18/18**, approximately **9.7 s**.
- `node test-results/mountains/t6-baked/field-report.mjs`: exit **0**, four fresh processes.
- `node test-results/mountains/t6-baked/main-identity.mjs`: exit **0**, 27,648 sample comparisons plus tiles.
- `git diff --check`: exit **0**.

Every permitted re-pin below is `[0]`; `T` = tile, `S` = sampler:

```text
Maithea T:
05a0aea70e33e2b0c36594f69041d4dbb86bfbd57db25280569ab91a894384af
→ 085218439efd38c5665d61ee7afee713d0f5499bffefa9df912492f669ef44e0
Maithea S:
df801672c445213af1e0822a9ab3d678f52a34b416565f5db2099b270f1fe3a6
→ 0c2e6161119ee629e8f14af0c6441b17cac7dbc877071e7df9c6b640ce93d454
Selawyn T:
565f77b3c215ccc08d22bff6dcadd8988775f63515329e3ed6e98ba1638c321d
→ b787565e7ba4d8ef34ff61de9454e4113300b262ae618271fa7b611be5f78954
Selawyn S:
b335c740d0dd0b80eef5374af73edda3256a91eb052416a3718ad8e2fc5d9f2a
→ c25d73c602fc381f19337c99f9f9b36e71c083f1d146d64401be12e45128d5ec
Raiva T:
fc27a747f83127b7ec7ad5c9d8b5d8cc3684906b1232f74f41c88494aa0a474e
→ 498662db0015231e211c67ebd6b1cd8d0e290e56e9e409740d31325e9b88f570
Raiva S:
35996b0d9fe42f5f5ef89cd6697135746eab82b66d7e4436c2537de53b58df48
→ 733c1c25bc794a3dd4516b073526f6e6ab3b406bdaf4e361e37bf53a67638778
Lethuris T:
2640201199c1f4523b0b8a10a7d148104cc37526298e16f1d4412e468b530557
→ 4f79a66f8cd7020438212ef4602fb736701eb863b61583c0b32c03e3c64880b7
Lethuris S:
f5218c6fb2d262129d3dd4465851d5fc761b17751042a5c5c9f148b498faa42b
→ 3fa308f5d032e47ce1bec0ae209c57729ad22f0bafd5a89939a549f5fd4fc492
```

[Handoff with exact commands and evidence](C:/LLM/IWSDK/universe-atlas-wt/baked/test-results/mountains/t6-baked/implementation-handoff.md).

No git writes, network, GPU/browser work, official benchmarks, `test:full`, or known-failures changes.