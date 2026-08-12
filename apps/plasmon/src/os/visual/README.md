# Plasmon shared visual foundation

`visual/**` is the shared presentation-only foundation for Plasmon OS surfaces. It provides semantic sizing, reusable icon/media/resource presentation, overlays, artwork/fallback composition, and wallpaper primitives.

It does not decide filesystem protection, hidden state, application/runtime identity, association matching, shortcut execution, or Neutron ownership. Callers resolve semantics first and pass presentation information into this layer.

## Main pieces

- `assets.ts` — shared Plasmon-owned visual assets/fallback references.
- `primitives.tsx` — reusable resource/application/icon/media primitives.
- `presentation.ts` — presentation mapping/types.
- `sizing.ts` — shared context sizing.
- `wallpaper.tsx` — wallpaper presentation.
- `visual.scss` plus shared integration tokens — common presentation rules.

Native/developer artwork and media should preserve aspect ratio/identity unless the product explicitly owns the artwork transformation. Shared overlays should compose with the underlying resource identity rather than replacing it.

## Refactor direction

Eliminate per-surface hard-coded glyph, sizing, fallback, and palette systems. Desktop, FileManager, Start/Search, taskbar, Properties, and native apps should converge on shared presentation primitives while semantic classification remains upstream.

If a new visual category is needed, define a semantic presentation capability rather than making this layer inspect filenames or OS internals. Keep numeric density/sizing choices centralized in shared tokens.

Visual design should take inspiration from mature desktop conventions while maintaining a distinct Plasmon identity and consistent behavior across surfaces.

## Testing

Use fast tests for presentation mapping, sizing tokens, fallback composition, and pure/component behavior. Use real-browser or screenshot/manual review for image loading, aspect ratio, layout, focus states, animation, typography, and cross-surface visual consistency. Unit snapshots alone are not visual acceptance.
