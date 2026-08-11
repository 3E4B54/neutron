# Plasmon OS implementation instructions

## Scope

These instructions apply to `apps/plasmon/src/os/**`. Also follow
`apps/plasmon/src/AGENTS.md`, `apps/plasmon/AGENTS.md`, and repository rules.
Read the nearest nested `AGENTS.md` before modifying a subsystem.

## Read first

- `apps/plasmon/src/os/README.md`
- nearest subsystem `README.md` and `AGENTS.md`
- applicable accepted documents under `apps/plasmon/docs/`

## Core invariants

- Shared concepts come from `contracts/**`; consumers must not create
  incompatible local versions.
- `FsService`/`fs/**` are authoritative for filesystem semantics and mutation.
- Preserve `NodeId` across rename/move and Trash/restore.
- Dot-prefixed names define hidden semantics.
- Use the shared filesystem-aware open dispatcher. Desktop, FileManager, Start,
  and Search must not implement private generic launch paths.
- Ordinary files resolve through `AssociationRegistry`.
- `/Apps/*.neutron` is a Kernel-backed projection, not a mutable install store.
- `.sys` is only for actual Plasmon-native apps/system programs.
- No `DOS.sys`, `Emulator.sys`, or `Games.sys`.
- Program Files runtimes may use native process windows without becoming `.sys`.
- Desktop/FileManager are filesystem presentations, not storage authorities.
- Shell owns shell presentation, not generic resource dispatch.
- Neutron bridge code may expose only real Kernel behavior.

## Integration boundaries

Prefer contracts and composed services over imports into another subsystem's
repository/store internals. Cross-cutting construction belongs in
`integration/**` and `PlasmonOS.tsx`.

The visual system under `visual/**` is shared vocabulary. Do not create
per-surface replacement icon/palette/density systems.

## Packaged regression policy

A user-visible failure from packaged review remains next-sprint acceptance work
unless explicitly deferred. Add Playwright/browser coverage for automatable
cross-surface regressions, especially resource opening, shortcuts, `.sys`,
`.neutron`, Start/Search, and taskbar invalidation.

## Atom/sharing security

- Atom is logical resource identity, not AppScope/process/window/path/install.
- One accepted semantic transaction maps to one logical revision.
- Revision encoding is not frozen to snapshots/hashes/chunks.
- MTN owns grant/bearer/rights/lease/revocation/reshare/authorization-epoch and
  cross-AppScope routing.

## Escalate

Escalate shared-contract, persistence, Kernel-capability, security, or
release-version changes rather than inventing shims.
