# OS integration

This directory is the composition boundary. It may wire public subsystem contracts together, but it must not absorb subsystem behavior.

Current bootstrap:

- `services.ts` supplies development fakes for filesystem/process/windowing;
- `legacyNeutronBridge.ts` adapts the existing `src/platform/**` implementation without deleting or altering it;
- `../PlasmonOS.tsx` is the composition root and contains only placeholder presentation until component agents land.

After Agent 0, only the integration agent may change this directory, `../PlasmonOS.tsx`, `../../index.tsx`, or shared build/package entrypoints unless a task explicitly grants an exception.

## Merge order

1. Wave 1: filesystem, associations/Atoms, process, windowing, Neutron bridge.
2. Integrate Wave 1 behind the frozen contracts.
3. Wave 2: desktop/file manager, shell, native apps.
4. Integrate Wave 2.
5. Wave 3: sharing and backup.
6. Final integration/polish/end-to-end testing.

Agents must request contract changes rather than editing `../contracts/**` themselves.
