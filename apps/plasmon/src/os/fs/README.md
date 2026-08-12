# Plasmon filesystem

`fs/**` implements the filesystem authority behind the public `FsService`/`FsEventSource` contracts. Higher layers consume those services; they do not own repository or storage semantics.

## Architecture

The implementation is deliberately layered:

```text
foreground consumers
      -> FsService / FsEventSource
      -> hosted RPC client or local service
      -> persistent filesystem service
      -> repository/storage adapter
```

Hosted Plasmon keeps durable browser filesystem ownership behind the application's persistent background/RPC boundary. Standalone preview may use a local browser repository. Repository choice is an implementation detail behind the filesystem service.

`core.ts` composes the higher-level filesystem policy layer around the raw service: bootstrap/reconciliation, protected managed resources, Trash operations, external application projections, and the shared filesystem-aware open dispatcher. Durable seeds and demo/fixture seeds are intentionally separate inputs.

## Durable semantics

- A node has stable identity independent of path and display name.
- Rename/move change presentation/location, not identity.
- Public mutations advance filesystem revision only after successful commit.
- Repository commits must not expose partially applied metadata/content state.
- Event streams are invalidation/change signals; consumers re-read authoritative state rather than treating events as a second database.
- Resource classification/protection policy is centralized rather than duplicated in Desktop/FileManager/Shell.
- Generic resource opening and shortcut dereference are shared OS behavior rather than UI-owned dispatch.
- Bootstrap/reconciliation must be versionable and idempotent so upgrades can repair expected managed state without destroying user state.

## Refactor direction

Keep storage mechanics, managed-resource policy, projection reconciliation, Trash, and open dispatch as separable responsibilities even when composed by one filesystem core. Avoid growing `FsService` into a catch-all for unrelated desktop/application state.

When `managed.ts` or other policy modules become difficult to reason about, split them by durable responsibility rather than by historical feature wave. Preserve one public filesystem authority and one repository transaction boundary.

## Testing

Use fast tests for identity, naming, revisions, atomic mutations, copy/move/remove semantics, bootstrap/reconciliation, protection/classification, projections, Trash, and shared open dispatch. Repository/RPC tests should prove persistence and transport boundaries without duplicating service logic.

Use browser/package tests only for behavior that genuinely crosses browser persistence/background surfaces or packaged user-visible opening. A UI regression caused by filesystem policy should normally receive a production service/model regression first.
