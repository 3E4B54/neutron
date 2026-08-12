# Plasmon test agent instructions

## Scope

These instructions apply to `apps/plasmon/test/**`. Also follow `apps/plasmon/AGENTS.md`, [`../TESTING.md`](../TESTING.md), and the nearest subsystem instructions for the production behavior under test.

## Required development lane

The canonical fast suite is:

```sh
npm --workspace neutron-plasmon test
```

Run focused Bun tests while iterating, then require the fast suite before handoff. Do not use repository-root `npm test` as the normal Plasmon test command.

If Bun is unavailable locally, push the branch and use **Plasmon Fast CI**. A handoff must report the exact focused command/result and the fast-suite result, whether local or CI.

## Testing policy

- Test the authority boundary that actually owns the behavior; do not encode an obsolete architecture merely because old source text is easy to assert.
- Prefer executable production behavior over broad source-string assertions. If source inspection is unavoidable, assert the smallest durable relationship.
- Put testable user-action semantics in real production models/services/controllers/commands when practical. Tests should call the same production logic as React; do not create a second implementation that only mimics the UI.
- Keep manifest/package version expectations at **100** until the owner explicitly authorizes a release-version change.
- When one shared service affects Desktop, FileManager, Start, Search, or multiple native apps, test the affected entry surfaces rather than proving only the service in isolation.
- Negative security/protection cases matter: projections, protected resources, authorization, persistence, and forbidden operations should prove what must not happen.

## Package and browser boundaries

Run the package lane when build/package output is part of the acceptance claim:

```sh
npm --workspace neutron-plasmon run test:package
```

Packaging/build-output presence is not packaged-runtime proof. Add browser/Playwright coverage when HTTP serving, Neutron installation, browser event propagation, window/process interaction, Monaco runtime loading, downloads/fullscreen, or another genuinely browser-owned behavior is part of the acceptance path.

Use the repository's shared Neutron E2E/Playwright infrastructure for packaged Plasmon workflows. Do not create a mock-only browser test and describe it as packaged acceptance.

## Failures

When a test and the approved product rule disagree, determine which is stale. Do not automatically change production code to satisfy a brittle test, and do not weaken a test merely to make CI green. Record the contract being protected.

A green fast suite does not supersede a failing packaged workflow or an explicit owner manual-review failure.
