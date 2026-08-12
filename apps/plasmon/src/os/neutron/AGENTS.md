# Neutron bridge agent instructions

## Authority

This directory adapts **actual vanilla Neutron** behavior for Plasmon. Neutron remains authoritative for installation, AppScope isolation, package execution, tiles, capabilities, and Kernel security.

## Rules

- Expose only APIs/metadata verified in Neutron contracts or implementation.
- Application opening/install requests delegate to the Kernel; do not create local substitutes for authenticated Kernel surfaces.
- Preserve uncertainty when runtime/discovery APIs fail or are incomplete.
- Isolate malformed/unavailable metadata so one application cannot poison unrelated discovery.
- Treat package-provided paths/metadata as untrusted input and bound them before network/resource access.
- Cache for efficiency without turning cache state into a new authority.
- Keep external application projections/presentation separate from installation authority.
- Escalate missing Kernel/security capabilities instead of inventing bridge shims.

Specific MIME corrections, icon fallback filenames, current cache workarounds, or individual projection bugs belong in Issues/tests, not this generic file.

## Refactor direction

Keep parsing/codecs, metadata/icon resolution, cache/lifecycle logic, and public bridge operations separable. Retire compatibility adapters after active consumers have migrated rather than preserving parallel Neutron implementations.

## Validation

Use fake-API adapter tests for discovery/opening/caching/error isolation and browser tests for lifecycle events. Use real installed Neutron verification when the claim depends on Kernel behavior.
