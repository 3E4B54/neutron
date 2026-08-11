# Plasmon backend agent instructions

## Scope

Applies to `apps/plasmon/backend/**`. Also follow `apps/plasmon/AGENTS.md` and
repository-level release/migration rules.

## Rules

- Treat released schema modules under `memory/**` as immutable.
- Add schema versions and explicit migrations; never rewrite released durable
  history.
- Keep `neutron.json` memory declarations consistent with backend schema usage.
- Do not move the browser-local Plasmon filesystem into this backend. Hosted
  filesystem persistence belongs to the persistent background surface.
- Do not introduce sharing/MTN backend code from historical branches without an
  explicit task and security review.
- Do not invent Kernel capabilities from the backend.
- Keep app methods consistent with generated method-schema/package tests.

## Version authority

Do **not** bump the Plasmon manifest release version. It remains owner-frozen at
100 until the owner explicitly authorizes a different version.

## Validation

For backend changes, run package/schema generation plus migration tests
appropriate to the change. A durable schema change requires clean-init and
supported-upgrade-path evidence, not compilation alone.
