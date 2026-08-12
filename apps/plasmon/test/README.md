# Plasmon test lanes

`apps/plasmon/test/` contains Plasmon-level contract, integration, packaging, and regression tests that span multiple source subsystems. Most focused implementation tests remain colocated with the code they exercise under `src/**`.

No single test lane is sufficient for a user-visible Plasmon feature. The expected evidence becomes broader as the behavior crosses more boundaries.

## 1. Focused subsystem tests

Use colocated tests under `src/os/**`, `src/native-apps/**`, and other owners for deterministic service/model/component behavior. These are the fast development loop and should prove local invariants precisely.

## 2. Plasmon integration and contract tests

Tests in this directory cover cross-cutting promises such as OS contract shape, composition/wiring, persistence/security regressions, and release/package expectations.

Current files include:

- `os-contracts.test.ts` — shared OS contract expectations.
- `platform.test.ts` — compatibility/regression coverage around historical platform behavior.
- `storage-security-regression.test.ts` — persistence/security wiring regressions.
- `wave2-integration.test.ts` — cross-subsystem integration expectations.
- `package.test.ts` — Plasmon manifest/package/build-output expectations.

Prefer behavioral assertions over brittle source-string matching when the behavior can be exercised directly. Source-shape assertions are appropriate only when the source relationship itself is the contract and should be written narrowly enough to survive harmless variable renames/refactors.

## 3. Packaging tests

Packaging tests verify archive/manifest/build-output structure. The Plasmon release version is currently owner-frozen at **100**; tests should not be changed to excuse an unauthorized manifest bump.

A packaging test that proves a file exists in build output does **not** prove Neutron serves it from the installed package. The Doom review demonstrated this distinction: build output contained a proof asset while the installed browser request returned HTTP 503.

## 4. Packaged browser / Playwright tests

Critical visible workflows should be exercised in the repository's shared Neutron browser/E2E harness under `test/e2e/**` (or its current successor), not by inventing a Plasmon-only fake runtime. Plasmon-specific instructions remain here; the root E2E directory is shared infrastructure.

Browser tests should increasingly cover the workflows that manual review has shown can regress despite green source tests, including:

- boot without fatal errors;
- Desktop/FileManager shortcuts and generic open dispatch;
- `.sys` launching the represented native application rather than Text;
- `.neutron` launching the Kernel-installed Element and preserving app identity/icon presentation;
- Start/Search inventory and extension/presentation rules;
- Open With one-off/default persistence;
- FileManager navigation and context-menu actions;
- taskbar invalidation after process close;
- Monaco Text/Markdown readiness and visible editor chrome;
- a packaged game asset being served, opened through associations, and becoming playable.

## 5. Manual packaged review

Manual testing remains necessary for interaction/visual details that are not yet automated, but a repeatable regression found manually should become Playwright/browser coverage when practical.

An owner-reported packaged failure remains required acceptance work in the next implementation sprint unless explicitly deferred. Do not close it because a lower-level test happens to pass.

## Typical commands

From the repository root, use the workspace's current test and package scripts rather than ad-hoc generated copies. The normal package command is:

```sh
npm --workspace neutron-plasmon run package
```

Run focused tests first, then relevant integration/package/browser lanes for the surface changed.
