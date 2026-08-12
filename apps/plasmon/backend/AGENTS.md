# Plasmon backend agent instructions

## Scope

Applies to `apps/plasmon/backend/**`. Also follow `apps/plasmon/AGENTS.md` and repository-level release, package, and migration rules.

## Authority

This directory owns Plasmon's Motoko backend methods, managed-memory schema modules, and explicit durable-state migrations. It does not own Desktop/filesystem semantics, native application state, resource-opening policy, Neutron installation/runtime authority, or cross-AppScope authorization policy.

## Rules

- Treat released managed-memory schema modules as immutable history.
- Evolve durable state by adding schema versions and explicit forward migrations.
- Keep `neutron.json` method and memory declarations aligned with backend implementation.
- Do not move canonical Plasmon filesystem authority into Motoko merely to simplify frontend code; follow the filesystem/integration contracts.
- Do not invent Kernel capabilities or security semantics here. Escalate required Neutron capability changes to the owning boundary.
- Keep backend APIs narrow and domain-oriented. Avoid turning the backend into a catch-all coordinator for UI/application concerns.

## Validation

Use the smallest applicable package/schema/migration checks for the change. Durable-state changes require evidence for clean initialization and every supported upgrade path, not compilation alone.

Run the Plasmon fast suite when backend-facing TypeScript/contracts are affected:

```sh
npm --workspace neutron-plasmon test
```

Use package-level verification when generated method schemas, package metadata, or packaged backend behavior are part of the acceptance claim.
