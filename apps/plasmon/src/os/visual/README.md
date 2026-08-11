# Plasmon shared visual foundation

This directory is Agent 11's presentation-only foundation for the current Plasmon OS architecture. It does not resolve filesystem semantics, process state, Neutron ownership, protection, hidden state, or shortcut execution.

## Priority correction

The original visual-system handoff classified the `.sys` icon family as **HIGH**. Coordinator A corrected that priority: the `.sys` icon family is **MUST** alongside the default theme, GUI1-derived identity, sizing, folder/text icons, shortcut composition, native `.neutron` icon preservation, and aspect-preserving thumbnails. This correction supersedes the older priority row in `docs/VISUAL_SYSTEM_THEME.md`.

## Public API

Import from `os/visual/index.ts` so the shared presentation stylesheet is included.

- `IconFrame` — fixed context frame/artwork sizing.
- `ResourceIcon` — composes caller-resolved visual presentation; does not inspect resource semantics.
- `NativeAppIcon` — unmodified native developer artwork with `object-fit: contain` and generic application fallback.
- `SystemIcon` — Plasmon-owned `.sys` visual assets.
- `FileTypeIcon` — Plasmon-owned generic file/resource visual assets.
- `ShortcutOverlay` — lower-left overlay only; never replaces target identity.
- `MediaThumbnail` — aspect-preserving image/video-preview presentation with transparent-image matte and fallback.
- `PlasmonWallpaper` — behavior-free GUI1-derived wallpaper/wordmark layer for Agent 6 to mount behind Shell content.

## Context sizes

`visual-tokens.scss` is the single numeric source of truth. `ICON_CONTEXT_SIZE_TOKENS` maps presentation contexts to those semantic variables:

- Desktop `48 / 42`;
- FileManager grid `44 / 38`;
- FileManager list/details `26 / 22`;
- Start `32 / 28`;
- Search `30 / 26`;
- Taskbar `30 / 26`;
- titlebar `18 / 16`;
- context menu `20 / 16`;
- Properties `56 / 46`.

`iconContextCssVariables()` applies the token references rather than copying numeric values into component styles.

## ResourceIcon boundary

Callers resolve semantics first, then pass presentation information. Examples:

```tsx
<ResourceIcon context="desktop" presentation={{ kind: "file-type", icon: "folder" }} />
<ResourceIcon context="taskbar" presentation={{ kind: "native", src: element.icon }} />
<ResourceIcon context="start" shortcut presentation={{ kind: "system", icon: "file-manager" }} />
<ResourceIcon context="search" shortcut presentation={{ kind: "custom", content: gameArtwork }} />
```

The visual layer must never infer `.sys`, `.neutron`, shortcut, hidden, protected, Atom, game/runtime, or other filesystem meanings from a filename or `FsNode`.

## Game/resource visuals

No `DOS.sys` or `Emulator.sys` identities exist in this visual layer. `js-dos` and `EmulatorJS` are runtimes/programs under `/System/Program Files`; if callers expose those folders/resources, they should use ordinary Program Files/folder/resource presentation rather than fake system-app artwork.

Presentation-only assets are provided for caller-resolved game resources:

- `.jsdos` bundle: `jsdos`;
- generic ROM/game cartridge: `rom-game`;
- native game save: `game-save`;
- emulator save-state: `emulator-save-state`;
- DOS changes/save artifact: `dos-changes`.

Runtime-provided screenshots use normal `MediaThumbnail` presentation (`object-fit: contain`). Game shortcuts keep their resolved target identity and use the same lower-left `ShortcutOverlay`; no game/runtime execution semantics live here.

## Integration instructions

### Agent 5

Replace FileManager placeholder glyph rendering with caller-side semantic classification feeding `ResourceIcon`. Use `file-grid`, `file-list`, `desktop`, `context-menu`, and `properties` contexts as appropriate. Reuse existing thumbnail loading; give its resulting object URL to `MediaThumbnail`. Do not change thumbnail loading/storage semantics in this visual integration. A shortcut must resolve its target visual first and then set `shortcut` on `ResourceIcon`. Game/resource categories should be supplied only after Agent 10/other semantic owners resolve them; this layer does not infer extensions itself.

### Agent 6

Use `PlasmonWallpaper` as the single wallpaper layer, then consume `ResourceIcon` for Start/Search/taskbar items. Native Neutron Elements use `presentation={{ kind: "native", src: resolvedIcon }}` unchanged. Replace pin/runtime textual visuals separately in Shell ownership; this foundation does not change taskbar behavior. Do not invent Start/taskbar identities for js-dos or EmulatorJS unless a real caller-provided application identity exists.

### Agent 7

Consume semantic tokens and the same visual primitives where native apps display application/resource identity. Do not duplicate icon sizes or create app-local filesystem icon systems. Runtime-provided game screenshots should use `MediaThumbnail` rather than a separate crop rule.

### Agent 8

No implementation change is required here. Continue resolving/caching native Neutron icon sources. Supply the resolved developer artwork URL; Agent 11 presentation deliberately does not recolor or substitute it unless the source fails.

## Font

No font binary is added. `--plasmon-font-ui` remains Inter-first with complete system fallbacks. If Inter is packaged later, add its license/notice and a local packaged `@font-face`; never require network font loading.
