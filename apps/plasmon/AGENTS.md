# Plasmon contributor instructions

## Scope

These instructions apply to `apps/plasmon/**`. Repository-level `AGENTS.md` remains authoritative for production release, migration, packaging, and publication rules. A closer nested `AGENTS.md` may further refine implementation behavior.

## Read first

Before changing Plasmon, read:

1. `apps/plasmon/README.md`.
2. `apps/plasmon/src/os/AGENTS.md` for OS work.
3. The nearest subsystem README and applicable design document under `apps/plasmon/docs/`.
4. Neutron documentation under `/doc/` whenever behavior crosses the Kernel boundary.

## Product invariants

- Plasmon is a user-facing desktop/application environment on Neutron, not a replacement Kernel.
- Use the name **Neutron** for the Kernel/runtime. `ntron.net` is a domain, not the runtime name.
- An **Element** is an application/package; an **Isotope** is a variant/version/runtime profile; an **Atom** is an app-defined independently addressable logical unit.
- Many Atoms may belong to one physical Element installation. Atom identity must not be equated with AppScope, a window, a filesystem path, a physical Neutron app instance, or a RevisionId.
- `FsService` is the filesystem authority. `NodeId` remains stable across rename/move and through Trash/restore.
- `/Apps/*.neutron` is a stable projection of Kernel-installed applications. It must not become installation authority and generic filesystem Delete must not uninstall applications.
- `.sys` is reserved for actual Plasmon-native applications/system programs.
- Do not introduce `DOS.sys`, `Emulator.sys`, or `Games.sys`.
- js-dos and EmulatorJS are association-backed Program Files runtimes/programs.
- Ordinary file opening belongs to the shared filesystem-aware dispatcher and `AssociationRegistry`, not to Shell-specific dispatch.
- Cross-AppScope authorization remains MTN-owned. Plasmon providers may own resource semantics, versions, snapshots, and storage, but must not invent bearer-grant security.
- Live structured Atoms are not required to serialize/hash/publish their complete state for every semantic mutation.

## Source-of-truth order

When guidance conflicts, use this order:

1. The current explicit task.
2. The nearest applicable `AGENTS.md`.
3. Canonical Plasmon architecture/design documents.
4. Scoped README files.
5. Existing implementation/tests.

Surface a real conflict rather than silently choosing an incompatible interpretation.

## Implementation rules

- Keep normal Plasmon changes under `apps/plasmon/**`. Do not modify Kernel code unless a task explicitly requires and justifies it.
- Prefer shared contracts/services over subsystem-private reach-through.
- Do not duplicate a subsystem just to preserve an older UI implementation. Successor work replaces or evolves the existing implementation unless parallel versions are an explicit product requirement.
- Do not create behavior keyed to demo/game names. Temporary demo content must remain data/seed content, not launch semantics.
- Durable seeded defaults and temporary hackathon/demo seeds must remain distinguishable.
- Do not add speculative Kernel APIs. If vanilla Neutron lacks a capability, document/escalate the dependency.
- Keep docs updated when a durable architecture, invariant, or integration contract changes.

## Validation

For implementation work, run focused tests first and then the relevant Plasmon package/integration checks. Final acceptance requires packaged behavior where the feature is user-visible.

Typical package command from repository root:

```sh
npm --workspace neutron-plasmon run package
```

Do not treat typechecking, unit tests, or a browser mock alone as proof that a packaged desktop interaction works.

## Known traps

- Shell-owned shortcut/open dispatch.
- Treating `/Apps` as a mutable normal folder.
- Treating a `.neutron` projection as the installed application itself.
- Reusing `.sys` for third-party runtimes.
- Losing `NodeId` on rename, move, Trash, or restore.
- Persisting legacy hidden metadata instead of dot-hidden semantics.
- Reintroducing GUI-version folders/files such as `gui2` rather than evolving the canonical implementation.
- Letting immutable snapshot/chunk publication become the persistence model for live collaborative Atom state.
- Passing security decisions from Plasmon providers into MTN by convention rather than through explicit authorization contracts.

## Escalate instead of assuming

Stop and surface the dependency when a change requires an unverified Neutron capability, changes a shared OS contract, weakens a security boundary, changes persistent schema semantics, or conflicts with an accepted architecture document.
