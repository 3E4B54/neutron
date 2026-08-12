# Legacy platform agent instructions

## Status

`src/platform/**` is legacy/supporting code, not the canonical Plasmon OS platform layer. Read `src/README.md` before editing here.

## Rules

- Do not add new first-class Plasmon features to `PlatformBridge` or grow a parallel platform API beside `src/os/contracts/**`.
- New filesystem behavior belongs behind `FsService`/`src/os/fs/**`.
- New Neutron boundary behavior belongs in the canonical Neutron/integration services and must reflect actual Kernel capabilities.
- Browser storage adapters must not silently become authoritative persistence for canonical Plasmon filesystem resources.
- If useful behavior exists here, migrate or adapt it into the current owner rather than making new OS code depend on the legacy layer.
- Keep compatibility tests while code remains in use; remove legacy code only after verifying active imports and preserving needed semantics.
- Do not create a successor `platform2`, `platform3`, or similar copy. Evolve canonical services instead.

## Validation

For a migration away from this directory, test both the old behavior being preserved and the canonical subsystem receiving it. For deletion, verify the current production entrypoint/build no longer imports the removed code.

## Escalate

Surface any case where this legacy layer appears to provide a capability that the canonical OS needs but does not currently expose. Do not resolve that mismatch by silently reinstating this directory as product authority.
