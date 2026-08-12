# Plasmon test agent instructions

## Scope

Applies to `apps/plasmon/test/**`. Also follow `apps/plasmon/AGENTS.md`, [`../TESTING.md`](../TESTING.md), and the nearest subsystem instructions for the behavior under test.

## Required lane

Run focused Bun tests while iterating, then run:

```sh
npm --workspace neutron-plasmon test
```

before handoff. Do not use repository-root `npm test` as the normal Plasmon test command.

If Bun is unavailable locally, push the branch and use **Plasmon Fast CI**. Handoffs must report the focused command/result and fast-suite result, whether local or CI.

## Testing rules

- Test the authority that owns the behavior; do not preserve obsolete architecture merely because source text is easy to assert.
- Prefer executable production behavior over broad source-string assertions.
- Put testable user-action semantics in real production models/services/controllers/commands. Tests should invoke the same logic as React adapters.
- When several UI surfaces expose one operation, add cross-surface tests against the shared authority rather than duplicating semantics in each surface.
- Include negative cases for protection, authorization, persistence, projections, and forbidden operations where applicable.
- Keep package/browser tests for claims that actually cross those boundaries.
- Keep browser tests semantic and redesign-resistant; avoid assertions tied to incidental DOM nesting, CSS geometry, or screenshots unless visual fidelity is the contract being tested.

## Failures

When a test and an accepted product/architecture rule disagree, determine which is stale. Do not automatically change production code to satisfy a brittle test, and do not weaken a valid test merely to make CI green.

A green fast suite does not supersede a failing packaged workflow or explicit manual acceptance failure.
