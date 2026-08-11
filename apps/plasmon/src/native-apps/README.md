# Plasmon native applications and runtime hosts

This directory contains applications rendered inside Plasmon's native
process/window system plus association-backed runtime hosts.

## Registration

`content-apps.ts` defines the native content application metadata, handlers and
association rules. Integration registers those definitions with the
`NativeApplicationRegistry` and `AssociationRegistry`.

A native process host does **not** automatically mean the program should have a
`.sys` filesystem application. `.sys` is reserved for actual Plasmon-native
system applications. Runtime handlers such as js-dos remain Program Files
runtimes even though they use native windows.

## Applications

- `browser/` — URL/`.url` handling.
- `explorer/` — FileManager.sys/Explorer native wrapper.
- `markdown/` — Monaco editor plus sanitized Markdown preview.
- `photos/` — image viewing.
- `properties/` — native Properties wrapper.
- `settings/` — Settings.
- `text/` — Monaco editor/document session.
- `video/` — browser-native video handling.
- `jsdos/` — `.jsdos` runtime handler; **not** a `.sys` app.

Each first-class directory has a local README. Agent instructions normally
inherit from this directory.

## Persistence and opening

Documents are read/written through `FsService`. Opening and default-handler
selection remain association/filesystem responsibilities. Native apps must not
invent their own persistent browser stores for filesystem content.

## Packaged assets

Monaco CSS/workers and other mature engine assets must be present in the
packaged output. Engine readiness must represent actual runtime initialization,
not merely source import.
