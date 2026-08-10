# Downstream agent handoffs

These mission deltas supplement the design package and `../README.md`. Contracts under `../contracts/**` are frozen; agents request amendments through integration rather than editing them directly.

Every subsystem that needs a shared package/build change records it in an owned `DEPENDENCIES.md`. Integration applies shared package/lock/build changes centrally, except for explicitly assigned filesystem background/manifest wiring.

## Agent 1 — Filesystem (`agent/filesystem`)

Own `src/os/fs/**` and only explicitly assigned filesystem background/build entry changes. Implement the persistent browser-local `FsService`, single filesystem authority, SQLite-WASM/OPFS direction with fallback, ranged/chunked I/O, stable `NodeId`, revisions/events and tests. Do not implement Explorer/Desktop UI.

If background/service wiring requires `neutron.json`, storage capability or build changes, keep the edit minimal and document it as integration-affecting.

## Agent 2 — Associations/Atoms (`agent/associations`)

Own `src/os/associations/**`. Implement handler registration/resolution, user defaults, Atom serialization/metadata, compound `.atom` handling, `.url` parsing/writing and Open With service models. `HandlerDefinition` is metadata; dispatch execution through the public open/runtime boundaries.

## Agent 3 — Native process runtime (`agent/process`)

Own `src/os/process/**`. Implement native app registry, process store/controller, singleton/multi-instance behavior and the React native-process host behind the React-independent public app metadata contract. Consume `WindowManager`; do not implement geometry/window chrome.

## Agent 4 — Windowing (`agent/windowing`)

Own `src/os/windowing/**`. Implement polished native windows, z-order, focus, constraints, minimize/maximize/restore, drag/resize and tests.

You are explicitly encouraged to adapt generic MIT-licensed daedalOS implementation patterns/code from its `components/system/Window/RndWindow/**` and related `useRnd` logic rather than reimplementing mature interactions from scratch. Preserve required attribution for directly copied/substantially adapted code and record source paths locally.

Use the shared `--plasmon-*` visual tokens. Do not import filesystem implementation details.

## Agent 5 — Desktop/File Manager (`agent/desktop`)

Own `src/os/file-manager/**`, `src/os/desktop/**`, `src/native-apps/explorer/**`, and `src/native-apps/properties/**`. Desktop is a FileManager view rooted at `/Desktop`; consume `FsService`, associations/open services, process and window contracts only.

You are explicitly encouraged to adapt generic MIT-licensed daedalOS code/patterns for FileManager drag/drop, multi-entry drag, marquee selection, icon placement, inline rename, Properties/Open With, context menus and related interaction details. Relevant research paths include `components/system/Files/FileManager/**`, `components/system/Files/FileEntry/**`, and `components/system/Dialogs/Properties/**`. Preserve attribution and do not transplant BrowserFS.

Use the shared `--plasmon-*` visual tokens.

## Agent 6 — Shell (`agent/shell`)

Own `src/os/shell/**`. Implement taskbar, Start, Search, calendar, themes and tray presentation from service/registry contracts only.

You are explicitly encouraged to adapt generic MIT-licensed daedalOS code/patterns for Start/Search/taskbar/calendar/menu behavior and animation polish, especially `components/system/StartMenu/**` and `components/system/Taskbar/**`. Preserve attribution. Do not create duplicate app/file databases; consume existing registries/services.

Use the shared `--plasmon-*` visual tokens.

## Agent 7 — Native apps (`agent/native-apps`)

Own `src/native-apps/text/**`, `markdown/**`, `video/**`, `browser/**`, and `settings/**`. All document identity is `NodeId`; read/write through `FsService`; keep handlers replaceable.

You are explicitly encouraged to adapt generic MIT-licensed daedalOS editor/media/URL behavior where useful, including its TinyMCE/text patterns, VideoPlayer local-byte/URL handling and `.url` shortcut behavior. Preserve attribution. Do not import daedalOS process architecture or BrowserFS.

Use the shared `--plasmon-*` visual tokens.

## Agent 8 — Neutron bridge (`agent/neutron`)

Own `src/os/neutron/**`. Preserve existing `src/platform/**` vanilla discovery/open/install/running-state behavior behind `NeutronBridge`; do not alter Kernel source or embed authenticated Neutron Elements inside Plasmon.

Vanilla-Neutron work may proceed immediately after the Agent 0 build/test gate. The MTN-backed `ResourceAuthorizationService` adapter must wait for the actual MTN 0.2 authorization API freeze. Do not invent a parallel Plasmon grant/token system while waiting.

## Agent 9 — Sharing (`agent/sharing`)

Own `src/os/sharing/**` plus explicitly assigned Plasmon backend stable-memory methods.

Your publication provider owns:

- explicit local Atom/file snapshot publication;
- shared resource versions/revisions;
- stable-memory chunking and content-hash dedupe;
- integrity verification;
- provider-side resource storage/read/write;
- import/copy of a published `ResourceRef`;
- mapping persistent Atom identity to published resource references.

It does **not** own grant creation, bearer-secret generation/hashing, audience, rights policy, lease issuance, revocation semantics, reshare policy, authorization epochs, cross-AppScope routing or trusted authorization context. Those belong to MTN through `ResourceAuthorizationService`.

The high-level `ShareService` may orchestrate publication plus authorization, including delegating a user-facing revoke action to `ResourceAuthorizationService.revoke()`, but must not implement those authorization semantics itself.

Final share orchestration waits for:

1. filesystem snapshot/import behavior to stabilize;
2. MTN 0.2 authorization API freeze;
3. Agent 8's MTN `ResourceAuthorizationService` adapter.

Stable-memory publication/chunking can be developed and tested against fakes before those three gates are complete.

## Agent 10 — Backup (`agent/backup`)

Own `src/os/backup/**`. Implement portable complete filesystem export/inspection/import with replace/merge behavior and optional raw SQLite export. Archive format must be independent of the concrete filesystem repository implementation. Wait for filesystem representation/import semantics to stabilize; backup does not need to wait for Sharing/MTN.
