# OS contracts

This directory defines the public TypeScript interfaces shared by Plasmon OS
subsystems. It is the vocabulary boundary between filesystem, associations,
process/windowing, Neutron integration, authorization/sharing, backup, and
application metadata.

The files here describe capabilities; they do not implement storage, React UI,
Kernel RPC, or policy-specific orchestration.

## Contract families

- `common.ts` — shared identifiers and cross-cutting value types.
- `fs.ts` — `FsNode`, `FsService`, events, reads/writes, metadata and identity.
- `apps.ts` — native application metadata.
- `associations.ts` — handlers, rules, resolution/open service contracts.
- `process.ts` / `window.ts` — native process and window lifecycle.
- `neutron.ts` — the narrow Plasmon-facing Kernel bridge.
- `authorization.ts` / `sharing.ts` — generic resource authorization/sharing seams.
- `backup.ts` — backup seam; implementation may be unavailable.

Contract changes are cross-subsystem changes. Prefer extending an existing
contract only when multiple consumers genuinely need the new capability.
