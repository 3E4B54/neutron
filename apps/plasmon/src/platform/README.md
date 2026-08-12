# Legacy platform adapters

`src/platform/` contains an older Plasmon platform/storage abstraction used by pre-canonical frontend work. It defines browser/Neutron/in-memory platform modes and storage adapters such as local storage, IndexedDB, OPFS, and a Neutron-oriented store.

This directory is **not the canonical Plasmon OS architecture**.

The active frontend entrypoint is:

```text
src/index.tsx
  -> src/os/PlasmonOS.tsx
  -> src/os/integration/services.ts
```

Current OS work should use the contracts and services under `src/os/**`, especially `FsService`, the Neutron bridge, associations, process/windowing, and integration composition. Do not introduce new product behavior through `PlatformBridge` or create a second platform/service hierarchy beside the OS layer.

## What may still be useful here

The storage adapters and their tests may contain implementation techniques worth retaining, especially browser capability probing, IndexedDB behavior, OPFS behavior, or compatibility handling. Reuse those ideas deliberately by moving/adapting them behind the current OS contracts when needed; do not make the legacy abstraction authoritative merely because code already exists here.

Browser-local storage can be appropriate for caches or explicitly local implementation details, but it must not silently become the authoritative copy of filesystem resources that Plasmon promises to persist through `FsService`.

## Relationship to `gui2/`

The historical `gui2/DesktopShell2.tsx` consumes these platform types. Neither `gui2/` nor this platform abstraction is the current application entrypoint. They are retained as historical/reference code until deliberately removed or migrated.

## Tests

Existing `storage-*.test.ts` files remain useful evidence for the adapters they cover. New canonical product tests belong with the owning `src/os/**` subsystem or Plasmon integration/browser test lane rather than extending this directory into a parallel architecture.

When removing or migrating legacy code, verify there are no remaining active imports before deletion and preserve any still-required storage semantics in the canonical owner.
