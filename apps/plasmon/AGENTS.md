# Plasmon contributor instructions

## Scope

These instructions apply to `apps/plasmon/**`. Repository-level `AGENTS.md`
remains authoritative for production migration, packaging, and publication
rules. A closer nested `AGENTS.md` further refines implementation behavior.

## Read first

1. `apps/plasmon/README.md`.
2. `apps/plasmon/src/README.md` for frontend/source-layout work.
3. `apps/plasmon/src/os/AGENTS.md` for OS work.
4. The nearest subsystem README and `AGENTS.md`.
5. Relevant accepted documents under `apps/plasmon/docs/`.
6. `/doc/` whenever behavior crosses the Neutron/Kernel boundary.

## Owner-frozen release version

The Plasmon package release version is **100 until the owner explicitly says
otherwise**. Do not bump `apps/plasmon/neutron.json` to force an upgrade,
replace an installed development package, make a test pass, or work around
Neutron's strict-upgrade behavior. Surface the packaging/update issue instead.

This scoped owner instruction is intentionally stricter than the repository-wide
release rule while version 100 development is in progress.

## Product invariants

- Plasmon is the user-facing desktop/application environment on Neutron, not a
  replacement Kernel.
- Use the name **Neutron**. `ntron.net` is a domain, not the runtime name.
- Element = application/package; Isotope = variant/version/runtime profile;
  Atom = app-defined independently addressable logical unit.
- Many Atoms may belong to one physical Element installation. Atom identity is
  not AppScope, window, path, physical app instance, or RevisionId.
- `FsService` and the filesystem core own filesystem semantics. `NodeId` remains
  stable across rename/move and Trash/restore.
- `/Apps/*.neutron` is a Kernel-backed projection, not installation authority.
- `.sys` is reserved for actual Plasmon-native applications/system programs.
  Do not invent `DOS.sys`, `Emulator.sys`, or `Games.sys`.
- js-dos and EmulatorJS are Program Files runtimes/handlers, not `.sys` apps.
- Generic filesystem opening belongs to the shared filesystem-aware dispatcher
  and `AssociationRegistry`, never a Shell/FileManager private launch path.
- MTN owns cross-AppScope authorization; providers own resource semantics.
- Live structured Atoms must support semantic mutation without whole-state
  immutable publication for every edit.

## Review findings are acceptance work

When the owner explicitly calls out a packaged/manual-review failure, treat it
as required next-sprint acceptance work unless the owner explicitly defers it.
Do not silently drop a prior review item because a new sprint started.

Assign and implement fixes as coherent end-to-end product slices rather than
tiny source-only patches. A sprint may contain hours of implementation work if
that is what is required to make the visible workflow complete.

For automatable user-visible regressions, add a packaged Playwright test (or the
closest existing browser harness) before or with the fix. Unit tests remain
useful, but a green unit suite does not supersede a failing packaged workflow.

## Source-of-truth order

1. Current explicit task.
2. Nearest applicable `AGENTS.md`.
3. Canonical Plasmon architecture/design documents.
4. Scoped `README.md`.
5. Existing implementation/tests.

Surface material conflicts instead of silently picking the easiest behavior.

## Implementation rules

- Keep normal Plasmon changes under `apps/plasmon/**`.
- Prefer contracts/services over subsystem-private reach-through.
- Do not create successor-copy trees such as `gui3`; evolve the canonical OS.
- Do not key runtime behavior to demo/game names.
- Keep durable defaults distinct from temporary demo/hackathon content.
- Do not invent Kernel APIs or security behavior.
- Update local documentation when durable ownership, invariants, or acceptance
  behavior changes.

## Validation

Run focused tests while iterating, then the relevant Plasmon test/package lane.
For visible behavior, verify the installed packaged application. Browser-level
tests should cover critical Desktop, FileManager, Start/Search, association,
native-app, and game launch paths as they become automatable.

Typical package command:

```sh
npm --workspace neutron-plasmon run package
```

## Escalate instead of assuming

Escalate unverified Neutron capabilities, shared-contract changes, persistent
schema changes, security-boundary changes, or any request that conflicts with
an accepted architecture or the owner-frozen package version.
