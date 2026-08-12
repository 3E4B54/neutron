# Plasmon test lanes

The canonical agent testing protocol is [`../TESTING.md`](../TESTING.md). This directory contains Plasmon-level contract, integration, packaging, and regression tests that span multiple source subsystems. Most focused implementation tests remain colocated with the production code they exercise under `src/**`.

The development rule is simple: keep deterministic OS/application semantics in production models, services, controllers, and commands that Bun can exercise directly; reserve package/browser/manual testing for boundaries that actually require them.

## Fast development lane

From the repository root:

```sh
npm --workspace neutron-plasmon test
```

This is the required pre-handoff Plasmon fast suite. It runs colocated `src/**` tests plus the package-independent tests in this directory:

- `os-contracts.test.ts` — shared OS contract expectations.
- `platform.test.ts` — compatibility/regression coverage around historical platform behavior.
- `storage-security-regression.test.ts` — persistence/security wiring regressions.
- `wave2-integration.test.ts` — cross-subsystem integration expectations.

It deliberately excludes `package.test.ts` because that file reads generated build output.

Do not use repository-root `npm test` as the ordinary Plasmon edit/test loop. It exercises unrelated Neutron workspaces.

## Focused subsystem tests

Run the smallest relevant Bun filter while iterating. From `apps/plasmon/`, examples include:

```sh
bun test src/os/fs
bun test src/os/file-manager
bun test src/os/shell
bun test src/os/process
bun test src/os/windowing
bun test src/native-apps
```

Specific files may be run directly, for example:

```sh
bun test ./src/os/file-manager/model.test.ts
```

Prefer executable behavior over source-string assertions. If source inspection is unavoidable, assert the smallest durable relationship rather than variable names or obsolete call spelling.

## Package lane

`package.test.ts` verifies manifest/package/build-output relationships and therefore belongs to the separate package lane:

```sh
npm --workspace neutron-plasmon run test:package
```

The Plasmon release version remains owner-frozen at **100** until explicitly changed. Tests must not be weakened to excuse an unauthorized manifest bump.

Build-output presence is not installed-runtime proof. A file can exist in `dist/` and still fail to be served by Neutron.

## Browser / Playwright lane

Use the repository's real Neutron E2E/Playwright infrastructure when the acceptance claim depends on an installed package or browser behavior. Do not create a mock-only browser test and describe it as packaged acceptance.

Browser coverage is appropriate for boundaries such as:

- booting the installed package;
- packaged HTTP asset serving;
- Desktop/FileManager event propagation that depends on the DOM;
- `.sys` / `.neutron` launch wiring across the installed environment;
- taskbar/window pointer and focus behavior;
- Monaco browser workers/runtime readiness;
- a packaged game asset being served and becoming playable.

Ordinary filesystem, selection, navigation, association policy, process state, and command semantics should be proven headlessly when practical and then connected to React through thin adapters.

## Cross-surface tests

When one shared service affects Desktop, FileManager, Start, Search, or multiple native apps, test the affected entry surfaces against the same production authority. A major Plasmon regression class has been identical resources behaving differently depending on which UI surface invoked them.

Negative cases also matter: protected resources, projections, authorization boundaries, persistence rules, and forbidden operations should prove what must **not** happen.

## CI

`Plasmon Fast CI` runs on relevant branch pushes and pull requests and executes exactly:

```sh
npm --workspace neutron-plasmon test
```

It intentionally does not install Nix, run Kernel/Motoko tests, package Plasmon, or run Playwright. Agents without local Bun must use this workflow as their development feedback loop and report the CI result.

## Manual packaged review

Manual review remains necessary for interaction and visual details not represented by stable automation. A repeatable escaped regression should gain the lowest-level reliable automated coverage possible, plus browser coverage when the failure truly depends on that boundary.

A green fast suite does not supersede a failing packaged workflow or owner review finding.
