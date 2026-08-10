# OS integration

This directory is the composition boundary. It may wire public subsystem contracts together, but it must not absorb subsystem behavior.

Current bootstrap:

- `services.ts` supplies development fakes for filesystem/process/windowing and selects preview versus unavailable resource authorization;
- `authorizationFakes.ts` provides the contract fake plus fail-closed vanilla placeholder; it does not model MTN internals;
- `legacyNeutronBridge.ts` adapts the existing `src/platform/**` implementation without deleting or altering it;
- `visual-tokens.scss` defines the shared cross-subsystem visual vocabulary for Wave 2;
- `../PlasmonOS.tsx` is the composition root and contains only placeholder presentation until component agents land.

After Agent 0, only the integration agent may change this directory, `../PlasmonOS.tsx`, `../../index.tsx`, shared visual-token entrypoints, or shared build/package entrypoints unless a task explicitly grants an exception.

## Merge order

1. Foundation gate: build `neutron-design-system` and run `neutron-plasmon` tests.
2. Wave 1: filesystem, associations/Atoms, process, windowing, and vanilla-Neutron bridge work.
3. Integrate Wave 1 behind the frozen contracts.
4. Wave 2: desktop/file manager, shell, native apps; these consume the shared visual tokens.
5. Integrate Wave 2.
6. Sharing publication may be developed against fakes, but final orchestration waits for filesystem stability, the MTN 0.2 authorization API freeze, and Agent 8's MTN authorization adapter.
7. Backup begins once filesystem representation/import semantics are stable; it does not need to wait for sharing.
8. Final integration/polish/end-to-end testing.

Agents must request contract changes rather than editing `../contracts/**` themselves.

## Shared dependencies

Subsystem agents record requested third-party packages/build capabilities in an owned `DEPENDENCIES.md`. Integration applies shared `package.json`, lockfile and common build changes centrally. Agent 1 may make only explicitly assigned filesystem background/manifest/build edits and must document them as integration-affecting.
