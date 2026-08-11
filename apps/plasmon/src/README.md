# Plasmon frontend source

`apps/plasmon/src/` contains the browser frontend and the active Plasmon OS
implementation.

## Active entrypoint

`index.tsx` is the packaged frontend entrypoint. It renders
`os/PlasmonOS.tsx`, installs app-icon fallbacks, and imports the shared styling
entrypoints.

The canonical product path is therefore:

```text
index.tsx
  -> os/PlasmonOS.tsx
  -> os/integration/services.ts
  -> Desktop + Shell + native process/window host
```

Do not infer active ownership from file age or size. `DesktopShell.tsx`,
`gui2/`, and `platform/` remain in the tree for historical/reference reasons;
they are not the active OS entrypoint.

## Directory map

- `os/` — canonical desktop OS services and UI composition.
- `native-apps/` — Plasmon-native apps and association-backed runtime hosts.
- `games/` — game/demo content integration; runtime dispatch remains generic.
- `platform/` — legacy launcher-era Neutron adapter; reference only for new OS work.
- `gui2/` — archived GUI experiment; not a successor architecture.
- `components/` and top-level styles — shared/legacy presentation helpers used by
  the active frontend where imported.

## Rule for new work

New desktop behavior should normally land in `os/**` or `native-apps/**`.
Do not create `gui3`, a second process model, a second filesystem, or another
launcher stack to avoid integrating with the canonical services.

See `AGENTS.md` here and the nearest nested `AGENTS.md` before editing.
