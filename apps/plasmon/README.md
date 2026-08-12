# Plasmon

Plasmon is the user-facing desktop and application environment built on Neutron. It is packaged as a normal `.neutron` application and does not replace or weaken the Neutron Kernel. Neutron remains authoritative for installation, AppScope isolation, capabilities, authorization, package execution, and owner-reviewed security boundaries.

## Mental model

- **Neutron** — Kernel/runtime substrate.
- **Element** — an application/package.
- **Isotope** — a variant, version, or runtime profile of an Element.
- **Atom** — an app-defined, independently addressable logical unit. A physical Element installation may own many Atoms.
- **NodeId** — the stable identity of a filesystem node. Rename and move must not change it.

An Atom is not a Neutron app instance, AppScope, window, path, or revision. Earlier proof-of-concept code that treated `Atom == app_instance_id` is not the current product model.

## Filesystem and application rules

`FsService` and the filesystem core under `src/os/fs/**` are authoritative for Plasmon filesystem behavior.

- Ordinary files open through the shared filesystem-aware open dispatcher and `AssociationRegistry`.
- Shortcuts dereference by stable target identity rather than Shell ownership.
- Dot-prefixed names are hidden by filesystem semantics.
- `/System/Start Menu` is filesystem-backed and user-customizable.
- `/System/.Trash` backs Trash/restore/permanent-delete while preserving `NodeId`.
- `/Apps/*.neutron` entries are projections of Kernel-installed applications; they are not installation authority and do not support generic filesystem Delete.
- `.sys` is reserved for actual Plasmon-native applications/system programs.
- There is no `DOS.sys`, `Emulator.sys`, or `Games.sys`.
- js-dos and EmulatorJS are association-backed runtimes under `/System/Program Files`, not `.sys` applications.

## Architecture

Primary code lives under [`src/os/`](src/os/):

- `contracts/` — shared public interfaces between OS subsystems.
- `fs/` — persistent filesystem, bootstrap/reconciliation, resource policy, projections, Trash, shortcuts, and open dispatch.
- `associations/` — file/type associations and Open With behavior.
- `process/` and `windowing/` — native application process/window lifecycle.
- `desktop/` and `file-manager/` — filesystem presentation and file interactions.
- `shell/` — Start, Search, taskbar, and shell presentation.
- `neutron/` — vanilla-Neutron bridge and Kernel-facing integration.
- `integration/` — composition root and shared service wiring.
- `visual/` — shared Plasmon visual primitives and resource icon system.

Native applications and association-backed runtimes live under [`src/native-apps/`](src/native-apps/).

## Entry points

- [`src/index.tsx`](src/index.tsx) — frontend entry.
- [`src/os/PlasmonOS.tsx`](src/os/PlasmonOS.tsx) — OS composition surface.
- [`src/os/integration/services.ts`](src/os/integration/services.ts) — service composition.
- [`src/os/fs/core.ts`](src/os/fs/core.ts) — filesystem-core composition.
- [`build.ts`](build.ts) — package/frontend build wiring.

## Development and verification

Install repository dependencies once from the repository root:

```sh
npm ci
```

The normal Plasmon edit/test loop is intentionally fast and package-independent:

```sh
npm --workspace neutron-plasmon test
```

That command runs Bun-based source and package-independent Plasmon integration tests. It does not package the Kernel, run Motoko tests, invoke Playwright, or build/package Plasmon.

For a focused unit while iterating, run Bun from `apps/plasmon/`, for example:

```sh
bun test src/os/file-manager
bun test src/os/fs
bun test src/os/shell
```

When the change crosses Plasmon build/package output, run the separate package lane:

```sh
npm --workspace neutron-plasmon run test:package
```

For both fast and package lanes:

```sh
npm --workspace neutron-plasmon run test:all
```

Do not use repository-root `npm test` as the normal Plasmon development command; it runs unrelated Neutron workspaces. If Bun is unavailable locally, push the branch and use the dedicated **Plasmon Fast CI** workflow as the development feedback loop.

See [`TESTING.md`](TESTING.md) for the canonical test matrix, headless-testing design rules, CI behavior, and required agent handoff evidence.

Product acceptance is still based on the relevant boundary. A green fast suite does not prove installed HTTP assets, browser event propagation, packaged Neutron integration, or visual UX. Use package/browser/manual verification when those claims are part of the unit of work.

The expected package is currently:

```text
plasmon.v0.1.0.neutron
```

For standalone UI development, use the app's development script. Standalone mode is a development surface; final behavior must also be verified inside packaged Neutron when the task depends on installed behavior.

## Current product boundaries

Plasmon may adapt generic UI/interaction ideas from daedalOS where licensing and attribution are preserved, but it must not import daedalOS BrowserFS, process ownership, same-origin application assumptions, or other architecture that conflicts with Neutron.

Cross-AppScope sharing and authorization remain security-sensitive. Plasmon providers own resource semantics and publication; MTN authorization owns grants, bearer-secret handling, audience/rights, leases, revocation, authorization epochs, and cross-AppScope routing.

Live structured Atoms must support semantic mutation without requiring whole-Atom snapshot/chunk publication. Immutable snapshots remain appropriate for exports, archives, attachments, backups, and other immutable resources.

## Documentation

Start with:

- [`AGENTS.md`](AGENTS.md) — scoped implementation rules for agents and contributors.
- [`TESTING.md`](TESTING.md) — canonical fast/package/browser test protocol.
- [`docs/README.md`](docs/README.md) — Plasmon architecture/design index.
- [`src/os/README.md`](src/os/README.md) — OS architecture and subsystem map.
- [`src/os/AGENTS.md`](src/os/AGENTS.md) — OS implementation invariants and validation rules.

Repository-level Neutron documentation remains under [`../../doc/`](../../doc/) and is authoritative for Kernel behavior.
