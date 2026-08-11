# Plasmon OS implementation instructions

## Scope

These instructions apply to `apps/plasmon/src/os/**`. Also follow `apps/plasmon/AGENTS.md` and repository-level `AGENTS.md`.

## Read first

- `apps/plasmon/src/os/README.md`
- `apps/plasmon/README.md`
- The nearest subsystem README.
- Applicable accepted design documents under `apps/plasmon/docs/`.

## Core invariants

- Shared concepts come from `contracts/**`; consumers must not create incompatible local versions.
- `FsService` and `fs/**` are authoritative for filesystem state and mutation.
- Preserve `NodeId` across rename/move and Trash/restore.
- Use dot-prefixed names for hidden semantics; do not reintroduce legacy hidden metadata as the canonical model.
- Use the shared filesystem-aware open dispatcher for filesystem resources. Shell, Desktop, FileManager, and Search must not each implement their own generic launch logic.
- Ordinary files resolve through `AssociationRegistry`.
- `/Apps/*.neutron` is a Kernel-backed projection and must reject generic filesystem Delete.
- `.sys` is only for actual Plasmon-native applications/system programs.
- Do not introduce `DOS.sys`, `Emulator.sys`, or `Games.sys`.
- Program Files runtimes such as js-dos/EmulatorJS remain association-backed handlers even when they use `NativeProcessController` for a window host.
- Desktop and FileManager are filesystem presentations, not filesystem/storage authorities.
- Shell owns shell presentation and interactions, not generic resource dispatch.
- Neutron bridge code may expose only behavior supported by the actual Kernel contract.

## Integration boundaries

Prefer contracts and composed services over importing another subsystem's repository, reducer, internal store, or private helpers.

Cross-cutting wiring belongs in `integration/**` and `PlasmonOS.tsx`. When multiple accepted branches modify the same integration surface, preserve all compatible behaviors rather than selecting one subsystem's whole file by default.

The visual system under `visual/**` and shared tokens are the common vocabulary for Desktop, FileManager, Shell, Search, and native apps. Consumers should not create independent replacement palette/density/icon systems.

## Atom/sharing security

- Atom is an app-defined logical unit; do not bind it to AppScope, a process, a window, a path, or a physical app installation.
- One accepted semantic application transaction maps to one logical revision; do not freeze physical revision encoding.
- Live structured state should support changes proportional to changed records plus small revision bookkeeping.
- MTN authorization, not Plasmon provider code, owns grants, bearer-secret security, audience/rights, leases, revocation, reshare policy, authorization epochs, and cross-AppScope routing.

## Validation

Run the smallest focused tests that prove the subsystem change, then the relevant Plasmon integration/package checks. For user-visible interactions, verify the packaged application.

When touching shared open/filesystem behavior, include regression coverage for every affected entry surface (for example Desktop, FileManager, Start, Search) rather than proving only one caller.

When touching Trash, projections, or protected resources, include negative tests proving forbidden generic operations remain forbidden.

## Known traps

- Calling repository/storage internals from UI code.
- Shell-specific shortcut execution.
- FileManager-specific ordinary-file dispatch that bypasses associations.
- Recreating `/Apps` entries as mutable files.
- Changing a node's identity during rename/move/restore.
- Versioned copy directories such as `gui2` instead of evolving the canonical implementation.
- Whole-Atom snapshot publication on every small collaborative edit.
- Treating process-host metadata as proof that something should exist as `.sys`.

## Escalate instead of assuming

Escalate changes to shared contracts, persistence semantics, Kernel capabilities, cross-AppScope security, or release/migration behavior. Do not silently invent compatibility shims that change the intended authority boundary.
