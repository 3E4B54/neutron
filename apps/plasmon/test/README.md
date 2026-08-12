# Plasmon test lanes

The canonical testing protocol is [`../TESTING.md`](../TESTING.md). This directory contains Plasmon-level contract, integration, packaging, and regression tests that span multiple source subsystems. Focused implementation tests should normally remain colocated with the production code they exercise.

The architectural testing rule is: keep deterministic application/OS semantics in production models, services, controllers, and commands that Bun can exercise directly; reserve package/browser/manual testing for boundaries that genuinely require them.

## Fast development lane

From the repository root:

```sh
npm --workspace neutron-plasmon test
```

This is the required pre-handoff Plasmon fast suite. It is package-independent and intentionally avoids Kernel/Motoko/package/browser work.

Do not use repository-root `npm test` as the ordinary Plasmon edit/test loop; it exercises unrelated Neutron workspaces.

## Focused tests

Run the smallest relevant Bun filter while iterating, for example from `apps/plasmon/`:

```sh
bun test src/os/fs
bun test src/os/file-manager
bun test src/os/shell
bun test src/os/process
bun test src/os/windowing
bun test src/native-apps
```

Prefer executable behavior over source-string assertions. If source inspection is unavoidable, assert the smallest durable relationship rather than local naming or incidental implementation shape.

## Package lane

Use:

```sh
npm --workspace neutron-plasmon run test:package
```

when generated build/package output is part of the acceptance claim. Build-output presence is not installed-runtime proof.

## Browser / Playwright lane

Use real browser/Neutron automation only when the claim depends on browser or installed-package behavior, such as packaged HTTP serving, focus/pointer/hit-testing, workers, media, downloads, fullscreen, iframe/runtime initialization, or other browser-owned boundaries.

Keep Playwright intentionally small and semantic. Stable tests should target user intent and durable roles/identifiers rather than CSS geometry or transient visual structure.

## Cross-surface workflow tests

A major goal of the Plasmon harness is to test the same production authority through every relevant surface. When Desktop, FileManager, Start, Search, or native applications expose the same operation, prefer shared headless workflow tests over duplicating browser scripts.

Tests should call the same production models/controllers/commands that React adapters call; do not create a second fake implementation that merely imitates the UI.

## CI and handoff

`Plasmon Fast CI` executes the same fast command used locally. Agents without Bun must push their branch, use that workflow as the feedback loop, and report the exact CI result.

A green fast suite does not supersede a failing package/browser/manual acceptance path. Escaped repeatable failures should gain the lowest-level reliable automated coverage possible.
