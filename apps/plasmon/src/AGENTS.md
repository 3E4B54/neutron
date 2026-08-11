# Plasmon frontend source instructions

## Scope

Applies to `apps/plasmon/src/**`.

## Canonical path

The active entrypoint is `index.tsx -> os/PlasmonOS.tsx`. Treat `os/**` and
`native-apps/**` as the canonical implementation unless a current task states
otherwise.

`DesktopShell.tsx`, `gui2/**`, and `platform/**` are legacy/reference code.
Do not add new product behavior there merely because an older feature already
exists there. Migrate useful behavior into canonical services deliberately.

## Boundaries

- OS-wide state/services belong under `os/**`.
- Native application UI/domain behavior belongs under `native-apps/**`.
- Generic resource opening must use the filesystem/association path.
- Shared visual primitives belong under `os/visual/**`.
- Kernel-facing application discovery/opening belongs under `os/neutron/**`.
- Cross-subsystem wiring belongs under `os/integration/**`.

## Packaged acceptance

When a user-visible review failure is automatable, add a browser/Playwright
regression around the real packaged path. Avoid source-shape assertions when a
behavioral assertion is available.

Do not declare a UI migration complete merely because the new component is in
the source graph; prove the active packaged entrypoint renders and exercises it.

## Version

Do not change the Plasmon manifest release version. It remains 100 until owner
authorization.
