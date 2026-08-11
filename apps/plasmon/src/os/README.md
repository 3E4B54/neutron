# Plasmon OS architecture

`apps/plasmon/src/os/` contains the shared desktop-OS layer for Plasmon. It composes filesystem, associations, process/window management, desktop/FileManager, Shell, Neutron integration, and shared visual primitives without taking ownership away from the Neutron Kernel.

## Boundaries

- Neutron remains authoritative for installation, AppScope isolation, capabilities, and Kernel security.
- `src/os/contracts/**` contains shared subsystem interfaces. Do not redefine those concepts inside consumers.
- `FsService` is the filesystem authority; higher layers operate through filesystem/core services rather than repositories or storage internals.
- `src/os/integration/**` is the central composition layer for shared services and cross-subsystem wiring.

## Filesystem model

The managed Plasmon filesystem includes user-visible roots plus system-managed resources such as:

```text
/
├── Desktop/
├── Documents/
├── Games/
├── Music/
├── Pictures/
├── Videos/
├── Apps/
└── System/
    ├── Start Menu/
    ├── .Trash/
    └── Program Files/
```

Key invariants:

- `NodeId` is stable across rename/move and Trash/restore.
- Dot-prefixed names define hidden semantics.
- `/Apps/*.neutron` entries are Kernel-backed projections and cannot be generically deleted.
- `/System/Start Menu` is filesystem-backed and intentionally user-customizable.
- `/System/.Trash` implements Trash/restore/permanent-delete core behavior.
- `.sys` resources are only actual Plasmon-native applications/system programs.

## Opening resources

Filesystem-aware opening is shared infrastructure, not Shell behavior.

Conceptually:

```text
filesystem node
  -> shared open dispatcher
  -> directory / shortcut / .sys / .neutron classification
  -> AssociationRegistry for ordinary files
  -> OpenService / ProcessController / NeutronBridge as appropriate
```

Shortcuts dereference stable node identity and support cycle protection. Association-backed Program Files runtimes such as js-dos do not become `.sys` applications merely because they use the native process host.

## Subsystems

### `contracts/`
Shared interfaces for filesystem, applications, associations, process, windowing, Neutron, sharing, authorization, backup, and common identifiers.

### `fs/`
Persistent filesystem service, bootstrap/reconciliation, resource classification/protection, stable Neutron projections, dot-hidden behavior, Trash, shortcuts, and the shared open dispatcher.

### `associations/`
Handler registry, matching/default rules, Open With service model, shortcut association helpers, and Atom package matching where applicable.

### `process/` and `windowing/`
Native application process lifecycle and Plasmon window management. These are local application-host mechanics, not Kernel AppScope ownership.

### `desktop/` and `file-manager/`
Filesystem presentation, selection, drag/drop, rename, clipboard, shortcuts, properties, download, thumbnails, and FileManager behavior. Desktop is a filesystem view, not filesystem authority.

### `shell/`
Start, Search, taskbar, calendar, preferences, and shell presentation. Shell consumes shared open/filesystem services; it does not own generic launch semantics.

### `neutron/`
The bridge to actual vanilla-Neutron behavior. Do not invent capabilities here that the Kernel does not expose.

### `integration/`
Service composition and shared adapters. Cross-cutting changes to `PlasmonOS.tsx`, service construction, or build/package wiring belong here unless a task explicitly grants another owner.

### `visual/`
Shared visual tokens, resource/native-app/system/file-type icons, shortcut overlays, media presentation, sizing, and wallpaper primitives.

## Native applications and runtimes

Native app implementations live under `../../native-apps/`. Association-backed runtimes can be hosted through the native process/window system without becoming filesystem `.sys` applications.

Games currently use the same generic open path as other resources. `.jsdos` resolves through `AssociationRegistry` to the js-dos runtime under `/System/Program Files/js-dos`; there is no game-name dispatcher and no `DOS.sys`/`Games.sys`.

## Atom and sharing boundary

An Atom is an app-defined logical unit, not a physical Neutron app instance or filesystem path. One accepted semantic transaction produces one logical `RevisionId`; the revision identifier does not prescribe a snapshot, Git-like commit, hash tree, chunk manifest, or provider publication.

Live structured Atom state must be capable of record-level semantic mutation. Immutable snapshots/chunks remain appropriate for exports, files/blobs, attachments, archives/backups, and immutable publications.

Plasmon resource providers own resource semantics and publication. MTN authorization owns grants, bearer-secret handling, rights/audience, leases, revocation, authorization epochs, reshare policy, and cross-AppScope routing.

## Validation

Use focused subsystem tests while iterating, then run the relevant Plasmon package/integration checks. User-visible work is complete only when it works in packaged Plasmon/Neutron.

## Further reading

- [`AGENTS.md`](AGENTS.md) — scoped OS implementation instructions.
- [`../../docs/README.md`](../../docs/README.md) — architecture/design document index.
- [`fs/README.md`](fs/README.md) — filesystem details.
- [`file-manager/README.md`](file-manager/README.md) — FileManager behavior.
- [`associations/README.md`](associations/README.md) — association model.
- [`neutron/README.md`](neutron/README.md) — Neutron bridge.
- [`integration/README.md`](integration/README.md) — integration layer.
- [`visual/README.md`](visual/README.md) — visual primitives.
