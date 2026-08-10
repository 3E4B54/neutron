# OS integration

This directory is the composition boundary. It wires public subsystem contracts together, but must not absorb subsystem behavior.

Current Wave 2 composition:

- `services.ts` routes Kernel-hosted Plasmon filesystem calls through the existing `FsRpcClient` to `app:plasmon:background`, while standalone preview uses a browser-selected local repository with safe fallback; it also creates the association registry/default store, native process runtime, native window manager, Neutron bridge, OpenService router, and one shared FileManager clipboard;
- the persistent background surface owns the browser-local filesystem repository declared by `neutron.json`'s `persistent_browser_storage` capability; the foreground tile does not open IndexedDB directly when hosted by Neutron;
- built-in Text, Markdown, Video, Browser, Settings, Explorer, and Properties applications are registered with the existing `NativeApplicationRegistry` and lazy loaders;
- native content handlers and association rules are registered with the existing association subsystem;
- `openService.ts` executes resolved handlers through `ProcessController`, safe external browser-tab routing, or `NeutronBridge` without embedding authenticated Neutron surfaces;
- `authorizationFakes.ts` remains the contract fake plus fail-closed vanilla placeholder; it does not model MTN internals;
- `visual-tokens.scss` defines shared tokens and the Desktop/native-window composition layout;
- `../PlasmonOS.tsx` mounts `Shell`, `/Desktop`, `WindowLayer`, and `NativeProcessHost` using those shared services.

The security/runtime boundary remains:

```text
Plasmon native app -> Plasmon-managed native window
Neutron Element    -> Kernel-owned sibling tile
```

Plasmon never obtains or embeds an authenticated Neutron Element iframe.

Normal filesystem, shell, and native-app state remains browser-local. MTN/sharing and backup are not part of Wave 2 composition.

After Agent 0, only the integration agent may change this directory, `../PlasmonOS.tsx`, `../../index.tsx`, shared visual-token entrypoints, or shared build/package entrypoints unless a task explicitly grants an exception.

## Integration sequence

1. Foundation gate.
2. Wave 1 filesystem, associations/Atoms, process, windowing, and vanilla-Neutron bridge.
3. Wave 1 integration and functional gate.
4. Wave 2 Desktop/FileManager, Shell, native apps, and approved tray metadata.
5. Wave 2 composition and complete automated/manual gate.
6. Sharing final orchestration only after Coordinator C's MTN 0.2 freeze/adapter gate.
7. Backup after filesystem representation/import semantics are stable.
8. Final integration/polish/end-to-end testing.

Agents must request contract changes rather than editing `../contracts/**` themselves.

## Shared dependencies

Subsystem agents record requested third-party packages/build capabilities in an owned `DEPENDENCIES.md`. Integration applies shared `package.json`, lockfile and common build changes centrally. The current Wave 2 gate does not require Monaco, marked, DOMPurify, or a media-player dependency; those remain future polish candidates.
