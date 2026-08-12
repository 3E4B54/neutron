# Visual system agent instructions

## Authority

`visual/**` defines shared visual tokens, sizing, resource/application/media presentation, overlays, fallback artwork, and wallpaper primitives. It is presentation-only.

## Rules

- Use shared semantic tokens/sizing; do not create competing numeric systems per surface.
- Semantic resource/application classification happens before the visual layer. Do not infer product meaning from filenames or private subsystem state here.
- Preserve native/developer artwork and media aspect ratio unless a product-owned transformation explicitly says otherwise.
- Compose overlays/fallbacks without erasing the underlying resource identity.
- Consumers should reuse shared primitives instead of hard-coding parallel glyph/fallback/palette logic.
- Keep presentation behavior independent of filesystem, process, association, and Kernel authority.

Specific icon-family priorities, individual application artwork bugs, historic agent handoffs, or one-off color fixes belong in Issues/design records/tests rather than generic instructions.

## Refactor direction

Converge Desktop/FileManager/Shell/native-app presentation on this shared vocabulary. Keep semantic mapping upstream and visual composition reusable.

## Validation

Use component/token tests for deterministic presentation and browser/screenshot/manual review for actual image loading, layout, animation, focus, typography, and visual consistency.
