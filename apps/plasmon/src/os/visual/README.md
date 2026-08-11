# Plasmon shared visual foundation

This directory is Agent 11's presentation-only foundation for the current Plasmon OS architecture. It does not resolve filesystem semantics, process state, Neutron ownership, protection, hidden state, or shortcut execution.

## Priority correction

The original visual-system handoff classified the `.sys` icon family as **HIGH**. Coordinator A corrected that priority: the `.sys` icon family is **MUST** alongside the default theme, GUI1-derived identity, sizing, folder/text icons, shortcut composition, native `.neutron` icon preservation, and aspect-preserving thumbnails.

## Public API

Import from `os/visual/index.ts`.

- `IconFrame` — fixed context frame/artwork sizing.
- `ResourceIcon` — composes caller-resolved visual presentation; does not inspect resource semantics.
- `NativeAppIcon` — unmodified native developer artwork with `object-fit: contain` and generic application fallback.
- `SystemIcon` — Plasmon-owned `.sys` visual assets.
- `FileTypeIcon` — Plasmon-owned generic file visual assets.
- `ShortcutOverlay` — lower-left overlay only; never replaces target identity.
- `MediaThumbnail` — aspect-preserving image/video-preview presentation with transparent-image matte and fallback.
- `PlasmonWallpaper` — behavior-free GUI1-derived wallpaper/wordmark layer for Agent 6 to mount behind Shell content.

## Context sizes

`ICON_CONTEXT_SIZES` is the single TypeScript map for frame/artwork geometry:

- Desktop `48 / 42`;
- FileManager grid `44 / 38`;
- FileManager list/details `26 / 22`;
- Start `32 / 28`;
- Search `30 / 26`;
- Taskbar `30 / 26`;
- titlebar `18 / 16`;
- context menu `20 / 16`;
- Properties `56 / 46`.

The matching CSS custom properties are produced by `iconContextCssVariables()` rather than copied into component styles.

## ResourceIcon boundary

Callers resolve semantics first, then pass presentation information. Examples:

```tsx
<ResourceIcon context="desktop" presentation={{ kind: "file-type", icon: "folder" }} />
<ResourceIcon context="taskbar" presentation={{ kind: "native", src: element.icon }} />
<ResourceIcon context="start" shortcut presentation={{ kind: "system", icon: "file-manager" }} />
<ResourceIcon context="search" shortcut presentation={{ kind: "custom", content: gameArtwork }} />
```

The visual layer must never infer `.sys`, `.neutron`, shortcut, hidden, protected, Atom, or other filesystem meanings from a filename or `FsNode`.

## Integration instructions

### Agent 5

Replace FileManager placeholder glyph rendering with caller-side semantic classification feeding `ResourceIcon`. Use `file-grid`, `file-list`, `desktop`, `context-menu`, and `properties` contexts as appropriate. Reuse existing thumbnail loading; give its resulting object URL to `MediaThumbnail`. Do not change thumbnail loading/storage semantics in this visual integration. A shortcut must resolve its target visual first and then set `shortcut` on `ResourceIcon`.

### Agent 6

Use `PlasmonWallpaper` as the single wallpaper layer, then consume `ResourceIcon` for Start/Search/taskbar items. Native Neutron Elements use `presentation={{ kind: "native", src: resolvedIcon }}` unchanged. Replace pin/runtime textual visuals separately in Shell ownership; this foundation does not change taskbar behavior.

### Agent 7

Consume semantic tokens and the same visual primitives where native apps display application/resource identity. Do not duplicate icon sizes or create app-local filesystem icon systems.

### Agent 8

No implementation change is required here. Continue resolving/caching native Neutron icon sources. Supply the resolved developer artwork URL; Agent 11 presentation deliberately does not recolor or substitute it unless the source fails.

## Font

No font binary is added. `--plasmon-font-ui` remains Inter-first with complete system fallbacks. If Inter is packaged later, add its license/notice and a local packaged `@font-face`; never require network font loading.
