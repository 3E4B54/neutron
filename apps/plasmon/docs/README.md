# Plasmon documentation index

This directory is the durable design/architecture record for Plasmon. Chat handoffs and agent conversations are temporary coordination; accepted product rules should be reflected here, in scoped README/AGENTS files, or in executable tests/code.

## Filesystem and desktop architecture

- [`FILESYSTEM_DESKTOP_UX_ARCHITECTURE.md`](FILESYSTEM_DESKTOP_UX_ARCHITECTURE.md) — authoritative filesystem/application resource model, protected operations, open dispatch, shortcuts, hidden semantics, bootstrap/reconciliation, Start Menu, Trash, Program Files, and `/Apps` projections.
- [`FILESYSTEM_DESKTOP_UX_GAMES_CORRECTION.md`](FILESYSTEM_DESKTOP_UX_GAMES_CORRECTION.md) — Games correction: no `DOS.sys`/`Emulator.sys`/`Games.sys`; js-dos and EmulatorJS are association-backed Program Files runtimes.

## Games

- [`GAMES_DAEDALOS_ARCHITECTURE.md`](GAMES_DAEDALOS_ARCHITECTURE.md) — game association/runtime architecture, daedalOS implementation research, save model, runtime packaging, and format parity direction.

The current first playable implementation proves `.jsdos -> AssociationRegistry -> js-dos -> /System/Program Files/js-dos` with temporary Doom shareware seed content. Demo content must remain separate from generic launch semantics.

## Visual system

- [`VISUAL_SYSTEM_THEME.md`](VISUAL_SYSTEM_THEME.md) — shared Plasmon theme, icon family, visual primitives, and downstream consumption rules.

## Atoms and collaboration

- [`atoms/FIRST_COLLABORATIVE_ATOM_DESIGN.md`](atoms/FIRST_COLLABORATIVE_ATOM_DESIGN.md) — collaborative Atom architecture and Review model.
- [`atoms/FIRST_COLLABORATIVE_ATOM_MVP.md`](atoms/FIRST_COLLABORATIVE_ATOM_MVP.md) — contracted MVP scope, including logical revision semantics and the separation between live structured state and immutable snapshot publication.

Related MTN/Plasmon authorization reconciliation is in [`../src/os/integration/MTN_0_2_CONTRACT_RECONCILIATION.md`](../src/os/integration/MTN_0_2_CONTRACT_RECONCILIATION.md).

## Source-of-truth rules

Use this order when guidance conflicts:

1. Current explicit task.
2. Nearest applicable `AGENTS.md`.
3. Accepted canonical design/architecture documents in this directory.
4. Scoped README files.
5. Current implementation and tests.

Do not silently keep obsolete design text authoritative after implementation contracts change; update or clearly supersede it.

## Neutron documentation

Plasmon does not redefine the Kernel. Repository-level Neutron documentation under [`../../../doc/`](../../../doc/) remains authoritative for Kernel capabilities, AppScope isolation, installation, package/runtime behavior, persistent-memory release rules, and security boundaries.
