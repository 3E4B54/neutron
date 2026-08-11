# Plasmon backend

This directory contains the Motoko backend that is packaged with the Plasmon
Neutron application.

The current backend is deliberately small: `main.mo` exposes the app method
surface and `memory/hello/v1.mo` is the currently declared managed-memory
schema. The browser-local Plasmon filesystem is **not** implemented here. In
Kernel-hosted Plasmon, filesystem persistence is owned by the app's persistent
background surface and the filesystem RPC/repository code under
`../src/os/fs/`.

## Ownership

This directory owns:

- Plasmon Motoko application methods declared by `../neutron.json`;
- managed-memory schema modules used by the backend;
- backend migrations when a released managed-memory schema must evolve.

It does not own Desktop filesystem semantics, `.neutron` projections, native
application state, or cross-AppScope sharing authorization.

## Persistence

Released managed-memory source is immutable history. If backend durable state
changes, add a new schema version and explicit forward migrations as required
by the repository-level `AGENTS.md` and `/doc/memory-migrations-and-uninstall.md`.

Do not move browser-local filesystem data into managed Motoko memory merely to
avoid the existing background-service contract.

## Related files

- `../neutron.json` — package methods, memory declarations, background surface.
- `../src/os/fs/` — Plasmon filesystem implementation.
- `../../doc/` — Neutron backend/package/migration authority.
