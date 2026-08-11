# Neutron bridge agent instructions

## Boundary

This directory is Plasmon's adapter to **actual vanilla Neutron** behavior.
Neutron remains authoritative for installation, AppScope isolation, package
execution, tiles, capabilities and Kernel security.

## Rules

- Expose only APIs/metadata verified in the Kernel contract or implementation.
- `openElement()` delegates opening to Kernel and preserves established reuse
  semantics.
- Installed application projections in `/Apps` are filesystem views, not install
  authority.
- Runtime state may be tri-state internally; do not turn `yes`/`no` diagnostic
  values into unwanted user-facing app labels.
- Descriptor icon paths are package-local and safety-bounded. Never probe
  arbitrary external URLs from untrusted metadata.
- Preserve descriptor-first icon resolution and bounded compatibility fallback.
- Cache metadata/icons until actual app description changes; runtime refresh
  alone must not cause repeated icon probing.
- If a `.neutron` MIME is exposed by Plasmon, use the owner-approved
  `application/x-neutron`, not a Plasmon-invented package MIME.
- Do not add Kernel capabilities or installation methods because a Plasmon UX
  wants them; escalate missing Kernel behavior.

## Validation

Cover malformed discovery isolation, icon safety/bounds, lifecycle refresh,
runtime-state uncertainty, and packaged Element projection/open behavior.
