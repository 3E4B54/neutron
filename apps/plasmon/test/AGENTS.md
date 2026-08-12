# Plasmon test agent instructions

## Scope

These instructions apply to `apps/plasmon/test/**`. Also follow `apps/plasmon/AGENTS.md` and the nearest subsystem instructions for behavior under test.

## Testing policy

- Test the authority boundary that actually owns the behavior; do not make integration tests encode an obsolete architecture merely because old source text is convenient to assert.
- Prefer executable behavior over broad source-string assertions. If source inspection is unavoidable, assert the smallest durable relationship.
- Keep manifest/package version expectations at **100** until the owner explicitly authorizes a release-version change.
- Packaging/build-output presence is not packaged-runtime proof. Add browser/Playwright coverage when HTTP serving, Neutron installation, window/process behavior, or user interaction is part of the acceptance path.
- An explicit owner manual-review failure remains required regression coverage/fix work unless explicitly deferred.
- When one shared service affects Desktop, FileManager, Start, Search, or multiple native apps, test the affected entry surfaces rather than proving only the service in isolation.
- Negative security/protection cases matter: projections, protected resources, authorization, persistence, and forbidden operations should have tests proving what must not happen.

## Browser/Playwright direction

Use the repository's shared Neutron E2E/Playwright infrastructure for packaged Plasmon workflows. Do not create a mock-only browser test and describe it as packaged acceptance.

Prioritize regressions that have already escaped source/unit coverage: shortcut opening, `.sys`/`.neutron` launch, Start/Search filtering, FileManager navigation/context actions, taskbar invalidation, Monaco runtime/UI readiness, and playable game launch including packaged asset serving.

## Failures

When a test and the approved product rule disagree, determine which is stale. Do not automatically change production code to satisfy a brittle test, and do not weaken a test merely to make CI green. Record the contract being protected.
